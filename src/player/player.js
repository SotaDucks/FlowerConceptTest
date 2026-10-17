// Production player: shot select, scrub, play/pause, frame step, loop, speed,
// layer toggles for compositing passes, clean (UI-free) mode and fullscreen.
import { h } from '../core/dom.js';

const fmtT = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
};

export class Player {
  constructor(root, engine, opts = {}) {
    this.e = engine;
    this.root = root;
    this.layers = { bg: true, plate: true, ui: true, fx: true };
    this.onCalib = opts.onCalib;

    const btn = (label, title, fn, cls = '') => {
      const b = h('button', { class: `pb-btn ${cls}`, title, html: label });
      b.addEventListener('click', fn);
      return b;
    };

    this.playBtn = btn('▶', 'Play / Pause  [Space]', () => engine.toggle(), 'pb-play');
    const transport = h('div', { class: 'pb-group' }, [
      btn('⏮', 'Previous shot  [PgUp]', () => this.jump(-1)),
      btn('◂', 'Back 1 frame  [←]', () => { engine.pause(); engine.step(-1); }),
      this.playBtn,
      btn('▸', 'Forward 1 frame  [→]', () => { engine.pause(); engine.step(1); }),
      btn('⏭', 'Next shot  [PgDn]', () => this.jump(1)),
    ]);

    this.chips = engine.shots.map((sh, i) => {
      const c = h('button', { class: 'pb-chip', title: `Shot ${i + 1}  [${i + 1}]` }, [
        h('span', { class: 'pb-chip-n', text: String(i + 1).padStart(2, '0') }),
        h('span', { class: 'pb-chip-t', text: sh.title }),
      ]);
      c.addEventListener('click', () => engine.seekShot(i));
      return c;
    });
    const chips = h('div', { class: 'pb-chips' }, this.chips);

    this.loopBtn = btn('LOOP', 'Loop current shot  [L]', () => { engine.loopShot = !engine.loopShot; this.sync(); }, 'pb-tog');
    this.rateBtns = [0.25, 0.5, 1, 2].map((r) =>
      btn(`${r}×`, `Playback speed ${r}×`, () => { engine.rate = r; this.sync(); }, 'pb-tog pb-rate')
    );
    this.layerBtns = Object.keys(this.layers).map((k) =>
      btn(k.toUpperCase(), `Toggle ${k} layer (compositing pass)`, () => { this.layers[k] = !this.layers[k]; this.applyLayers(); }, 'pb-tog pb-layer')
    );
    this.calibBtn = btn('CAL', 'Plate calibration overlay  [C]', () => this.onCalib && this.onCalib(), 'pb-tog');
    const right = h('div', { class: 'pb-group' }, [
      this.loopBtn,
      h('span', { class: 'pb-sep' }),
      ...this.rateBtns,
      h('span', { class: 'pb-sep' }),
      h('span', { class: 'pb-lbl', text: 'LAYERS' }),
      ...this.layerBtns,
      h('span', { class: 'pb-sep' }),
      this.calibBtn,
      btn('CLEAN', 'Hide player for clean output  [H]', () => this.clean(true), 'pb-tog'),
      btn('⛶', 'Fullscreen  [F]', () => this.fullscreen()),
    ]);

    // scrubber
    this.track = h('div', { class: 'pb-track' });
    this.segs = engine.shots.map((sh, i) => {
      const sgm = h('div', { class: 'pb-seg' }, [h('span', { text: `${String(i + 1).padStart(2, '0')} ${sh.title}` })]);
      sgm.style.left = (engine.starts[i] / engine.duration) * 100 + '%';
      sgm.style.width = (sh.duration / engine.duration) * 100 + '%';
      this.track.appendChild(sgm);
      return sgm;
    });
    this.fill = h('div', { class: 'pb-fill' });
    this.head = h('div', { class: 'pb-head' });
    this.track.append(this.fill, this.head);
    this.bindScrub();

    this.readout = h('div', { class: 'pb-readout' });

    root.append(
      h('div', { class: 'pb-row' }, [transport, chips, right]),
      h('div', { class: 'pb-row pb-row2' }, [this.track]),
      h('div', { class: 'pb-row pb-row3' }, [this.readout, h('div', { class: 'pb-keys', text: 'SPACE play · ←/→ frame · SHIFT+←/→ 1s · 1–7 shot · L loop · H clean · F fullscreen · C calibrate' })])
    );

    engine.on(() => this.sync());
    this.bindKeys();
    this.applyLayers();
    this.sync();
  }

  jump(d) {
    const { i, lt } = this.e.locate(this.e.t);
    if (d < 0 && lt > 0.5) this.e.seekShot(i);
    else this.e.seekShot(i + d);
  }

  bindScrub() {
    let dragging = false;
    const at = (ev) => {
      const r = this.track.getBoundingClientRect();
      const x = Math.min(Math.max(0, ev.clientX - r.left), r.width);
      this.e.seek((x / r.width) * this.e.duration);
    };
    this.track.addEventListener('pointerdown', (ev) => {
      dragging = true;
      this.wasPlaying = this.e.playing;
      this.e.pause();
      this.track.setPointerCapture(ev.pointerId);
      at(ev);
    });
    this.track.addEventListener('pointermove', (ev) => dragging && at(ev));
    this.track.addEventListener('pointerup', () => {
      dragging = false;
      if (this.wasPlaying) this.e.play();
    });
  }

  bindKeys() {
    window.addEventListener('keydown', (ev) => {
      if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
      const e = this.e;
      const k = ev.key;
      if (k === ' ') { e.toggle(); ev.preventDefault(); }
      else if (k === 'ArrowRight') { e.pause(); ev.shiftKey ? e.seek(e.t + 1) : e.step(1); ev.preventDefault(); }
      else if (k === 'ArrowLeft') { e.pause(); ev.shiftKey ? e.seek(e.t - 1) : e.step(-1); ev.preventDefault(); }
      else if (k === 'PageDown') this.jump(1);
      else if (k === 'PageUp') this.jump(-1);
      else if (k === 'Home') e.seek(0);
      else if (k === 'End') e.seek(e.duration);
      else if (/^[1-9]$/.test(k) && Number(k) <= e.shots.length) e.seekShot(Number(k) - 1);
      else if (k === 'l' || k === 'L') { e.loopShot = !e.loopShot; this.sync(); }
      else if (k === 'h' || k === 'H') this.clean(!document.body.classList.contains('clean'));
      else if (k === 'f' || k === 'F') this.fullscreen();
      else if (k === 'c' || k === 'C') this.onCalib && this.onCalib();
      else if (k === 'Escape') this.clean(false);
    });
  }

  clean(on) {
    document.body.classList.toggle('clean', on);
    window.dispatchEvent(new Event('resize'));
  }

  fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  applyLayers() {
    const st = this.e.stage;
    for (const k of Object.keys(this.layers)) st.classList.toggle(`no-${k}`, !this.layers[k]);
    document.getElementById('viewport').classList.toggle('checker', !this.layers.bg);
    this.layerBtns.forEach((b, i) => b.classList.toggle('on', this.layers[Object.keys(this.layers)[i]]));
    this.e.dirty = true;
  }

  sync() {
    const e = this.e;
    const { i, lt } = e.locate(e.t);
    this.playBtn.innerHTML = e.playing ? '❚❚' : '▶';
    this.chips.forEach((c, k) => c.classList.toggle('on', k === i));
    this.segs.forEach((c, k) => c.classList.toggle('on', k === i));
    this.loopBtn.classList.toggle('on', e.loopShot);
    this.rateBtns.forEach((b, k) => b.classList.toggle('on', [0.25, 0.5, 1, 2][k] === e.rate));
    const pct = (e.t / e.duration) * 100;
    this.fill.style.width = pct + '%';
    this.head.style.left = pct + '%';
    const frame = Math.round(e.t * e.fps);
    this.readout.innerHTML =
      `<b>${fmtT(e.t)}</b> / ${fmtT(e.duration)}` +
      `<span>SHOT <b>${String(i + 1).padStart(2, '0')}</b> ${lt.toFixed(2)}s / ${e.shots[i].duration.toFixed(2)}s</span>` +
      `<span>FRAME <b>${String(frame).padStart(5, '0')}</b> @ ${e.fps} fps</span>`;
  }
}
