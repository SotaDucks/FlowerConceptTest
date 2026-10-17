// Plate calibration overlay (press C). Drag the plant outline vertices, organ
// anchors and frame corners onto the real plate; the JSON can be pasted into
// PLATE in src/content.js. "Apply" also stores it in localStorage and reloads.
import { h, s, attr } from '../core/dom.js';
import { PLATE } from '../content.js';

const KEY = 'nr-plate-calib';

export function loadCalibOverride() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const o = JSON.parse(raw);
    if (o.plantPoly) PLATE.plantPoly = o.plantPoly;
    if (o.frames) Object.assign(PLATE.frames, o.frames);
    if (o.anchors) Object.assign(PLATE.anchors, o.anchors);
    return true;
  } catch {
    return false;
  }
}

const r3 = (v) => Math.round(v * 1000) / 1000;

export class Calib {
  constructor(stage, engine, shot3Index = 2) {
    this.stage = stage;
    this.e = engine;
    this.shotIndex = shot3Index;
    this.on = false;
    this.svg = s('svg', { class: 'calib-svg', viewBox: '0 0 1920 1080', width: 1920, height: 1080 });
    this.panel = h('div', { class: 'calib-panel' });
    this.root = h('div', { class: 'calib' }, [this.svg]);
    stage.appendChild(this.root);
    document.body.appendChild(this.panel);
    this.json = h('textarea', { class: 'calib-json', spellcheck: false });
    const copy = h('button', { text: 'COPY JSON' });
    copy.onclick = () => navigator.clipboard?.writeText(this.json.value);
    const apply = h('button', { text: 'APPLY + RELOAD' });
    apply.onclick = () => {
      localStorage.setItem(KEY, this.json.value);
      location.reload();
    };
    const reset = h('button', { text: 'RESET' });
    reset.onclick = () => {
      localStorage.removeItem(KEY);
      location.reload();
    };
    this.panel.append(
      h('div', { class: 'calib-h', text: 'PLATE CALIBRATION · 底图标定' }),
      h('div', { class: 'calib-note', text: '拖动：青色圆点 = 植株轮廓，白色方块 = 器官锚点，琥珀色角点 = 器官框。将 JSON 粘贴到 src/content.js 的 PLATE 中。' }),
      this.json,
      h('div', { class: 'calib-btns' }, [copy, apply, reset])
    );
    this.root.style.display = 'none';
    this.panel.style.display = 'none';
    this.bindDrag();
  }

  get view() {
    return this.e.shots[this.shotIndex].plate;
  }

  toggle() {
    this.on = !this.on;
    this.root.style.display = this.on ? '' : 'none';
    this.panel.style.display = this.on ? '' : 'none';
    if (this.on) {
      this.e.pause();
      this.e.seekShot(this.shotIndex, 17.5);
      this.draw();
    }
  }

  toUV(x, y) {
    const V = this.view.view;
    return [(x - V.x) / V.w, (y - V.y) / V.h];
  }

  handles() {
    const list = [];
    PLATE.plantPoly.forEach((p, i) => list.push({ kind: 'poly', i, get: () => p, set: (u, v) => ((p[0] = u), (p[1] = v)) }));
    for (const [k, a] of Object.entries(PLATE.anchors)) list.push({ kind: 'anchor', k, get: () => a, set: (u, v) => ((a[0] = u), (a[1] = v)) });
    for (const [k, f] of Object.entries(PLATE.frames)) {
      list.push({ kind: 'frame0', k, get: () => [f[0], f[1]], set: (u, v) => ((f[0] = u), (f[1] = v)) });
      list.push({ kind: 'frame1', k, get: () => [f[0] + f[2], f[1] + f[3]], set: (u, v) => ((f[2] = Math.max(0.01, u - f[0])), (f[3] = Math.max(0.01, v - f[1]))) });
    }
    return list;
  }

  draw() {
    const svg = this.svg;
    svg.innerHTML = '';
    const P = this.view;
    const poly = PLATE.plantPoly.map(([u, v]) => P.toStage(u, v));
    svg.appendChild(s('path', { class: 'calib-poly', d: 'M' + poly.map((q) => q.join(',')).join('L') + 'Z' }));
    for (const [k, f] of Object.entries(PLATE.frames)) {
      const r = P.rect(f);
      svg.appendChild(s('rect', { class: 'calib-frame', x: r.x, y: r.y, width: r.w, height: r.h }));
      svg.appendChild(s('text', { class: 'calib-t amber', x: r.x + 4, y: r.y - 6, text: `frame.${k}` }));
    }
    this.hs = this.handles();
    this.hs.forEach((hd, idx) => {
      const [x, y] = P.toStage(...hd.get());
      let el;
      if (hd.kind === 'poly') el = s('circle', { cx: x, cy: y, r: 7, class: 'calib-h-poly' });
      else if (hd.kind === 'anchor') {
        el = s('rect', { x: x - 7, y: y - 7, width: 14, height: 14, class: 'calib-h-anchor' });
        svg.appendChild(s('text', { class: 'calib-t', x: x + 10, y: y + 4, text: hd.k }));
      } else el = s('rect', { x: x - 6, y: y - 6, width: 12, height: 12, class: 'calib-h-frame' });
      el.dataset.idx = idx;
      svg.appendChild(el);
    });
    const out = {
      plantPoly: PLATE.plantPoly.map((p) => p.map(r3)),
      frames: Object.fromEntries(Object.entries(PLATE.frames).map(([k, f]) => [k, f.map(r3)])),
      anchors: Object.fromEntries(Object.entries(PLATE.anchors).map(([k, a]) => [k, a.map(r3)])),
    };
    if (document.activeElement !== this.json) this.json.value = JSON.stringify(out, null, 1);
  }

  bindDrag() {
    let drag = null;
    const toStage = (ev) => {
      const r = this.stage.getBoundingClientRect();
      return [((ev.clientX - r.left) / r.width) * 1920, ((ev.clientY - r.top) / r.height) * 1080];
    };
    this.svg.addEventListener('pointerdown', (ev) => {
      const idx = ev.target.dataset && ev.target.dataset.idx;
      if (idx == null) return;
      drag = this.hs[Number(idx)];
      this.svg.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    this.svg.addEventListener('pointermove', (ev) => {
      if (!drag) return;
      const [x, y] = toStage(ev);
      const [u, v] = this.toUV(x, y);
      drag.set(r3(u), r3(v));
      this.e.render();
      this.draw();
    });
    this.svg.addEventListener('pointerup', () => (drag = null));
  }
}
