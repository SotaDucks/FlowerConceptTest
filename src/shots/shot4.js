// SHOT 4 — HABITAT & THREATS / 生存环境与威胁
// The plant shrinks into a node; build environment -> relations -> threats -> hold.
import { h, s, css, txt, attr, stageSvg } from '../core/dom.js';
import { Cues } from '../core/cues.js';
import { clamp, lerp, seg, ease, smooth, env } from '../core/util.js';
import { panel, icon, Leader } from '../components/hud.js';
import { PlateView } from '../components/plateView.js';
import { RangeMap, RANGE_ZONES } from '../components/rangeMap.js';
import { HabitatScene, heightAt, valleyX } from '../gl/habitatScene.js';
import { plateCam3 } from './shot3.js';
import { S4, SPECIES } from '../content.js';

const T = { env: 1.6, rel: 6.2, thr: 10.6, hold: 16.4 };
const REL_AT = { water: 6.3, canopy: 6.9, humus: 7.5, moss: 8.1, pollen: 8.7 };
const LOST = [3, 4];
const LINK_BREAK_AT = { '0,3': 11.3, '1,4': 11.7, '2,4': 11.8, '3,5': 11.4 };
const REMOVED = [[1, 14.6], [4, 15.0], [7, 15.4]];

export default class Shot4 {
  constructor() {
    this.title = '生存环境';
    this.duration = 20;
    this.phase = { en: 'PHASE 04 · HABITAT CONTEXT', cn: '生境关系' };
    this.root = h('div', { class: 'shot s4' });
  }

  init({ plate }) {
    const R = this.root;
    const cues = (this.cues = new Cues());
    R.appendChild(h('div', { class: 'bg-grid L-bg' }));
    this.gl = new HabitatScene(1920, 1080);
    this.gl.canvas.classList.add('gl-canvas', 'L-plate');
    R.appendChild(this.gl.canvas);

    // plate shrinking into a live-feed card
    this.plate = new PlateView(plate);
    this.plateWrap = h('div', { class: 's4-plate' }, [this.plate.el]);
    R.appendChild(this.plateWrap);
    this.card = h('div', { class: 's4-card L-ui' }, [
      h('div', { class: 's4-card-h' }, [h('span', { class: 'en', text: 'VR FEED' }), h('span', { text: 'SPECIMEN 017' }), h('i')]),
    ]);
    R.appendChild(this.card);

    const svg = (this.svg = stageSvg('L-ui'));
    R.appendChild(svg);
    this.cardLead = new Leader(svg);
    this.labelLayer = h('div', { class: 's4-labels L-ui' });
    R.appendChild(this.labelLayer);

    // environment labels anchored to 3D features
    const g = this.gl;
    const p = g.plant;
    const sz = -6, sx = valleyX(sz);
    const rp = g.rockPlaces[5] || [p.x + 10, p.z - 6];
    this.envLabels = [
      { cn: '林冠', en: 'CANOPY', at: 2.0, pos: [p.x - 8, 28, p.z - 4], dx: -40, dy: -40 },
      { cn: '林下', en: 'UNDERSTORY', at: 2.5, pos: [p.x - 16, 11, p.z - 8], dx: -60, dy: -24 },
      { cn: '溪谷苔藓', en: 'MOSSY STREAM VALLEY', at: 3.0, pos: [sx, heightAt(sx, sz) + 0.4, sz], dx: -30, dy: 50 },
      { cn: '多石地面', en: 'ROCKY GROUND', at: 3.5, pos: [rp[0], heightAt(rp[0], rp[1]) + 1, rp[1]], dx: 30, dy: -40 },
      { cn: '岩缝', en: 'ROCK CREVICE', at: 4.0, pos: [p.x + 1.2, p.y + 0.6, p.z - 0.8], dx: 60, dy: -60 },
      { cn: '腐殖质', en: 'HUMUS LAYER', at: 4.5, pos: [p.x + 2, heightAt(p.x + 2, 24) - 1.8, 24], dx: 40, dy: 50 },
    ].map((d) => this.mkLabel(d, 'env'));
    this.relLabels = S4.relations.map((r) => {
      const l = g.rel[r.key];
      const pts = l.userData.pts;
      const mid = pts[Math.floor(pts.length * (r.key === 'pollen' ? 0.35 : 0.45))];
      return this.mkLabel({ cn: r.cn, en: r.en, at: REL_AT[r.key] + 0.4, pos: [mid.x, mid.y, mid.z], dx: r.key === 'humus' ? 40 : -20, dy: r.key === 'humus' ? 40 : -30, cls: `rel rel-${r.key}` }, 'rel');
    });
    this.nodeLabel = this.mkLabel({ cn: '紫纹兜兰', en: 'SPECIMEN 017', at: 1.4, pos: [g.nodePos.x, g.nodePos.y + 6.5, g.nodePos.z], dx: 18, dy: -12, cls: 'node' }, 'node');
    // threat markers
    const P = g.patches;
    const lostP = P[LOST[0]];
    this.thrLabels = [
      this.mkLabel({ cn: '生境斑块丧失', en: 'PATCH LOST', at: T.thr + 0.9, pos: [lostP.x, heightAt(lostP.x, lostP.y) + 0.5, lostP.y], dx: -90, dy: 80, cls: 'amber' }, 'thr'),
      this.mkLabel({ cn: '连通断开', en: 'CONNECTIVITY BROKEN', at: T.thr + 1.4, pos: this.linkMid(1, 4), dx: -70, dy: -50, cls: 'amber' }, 'thr'),
      this.mkLabel({ cn: '水分 · 微气候改变', en: 'MOISTURE · MICROCLIMATE SHIFT', at: T.thr + 2.4, pos: [sx + 2, heightAt(sx + 2, 12) + 4, 12], dx: -120, dy: 40, cls: 'amber' }, 'thr'),
      this.mkLabel({ cn: '野生个体被移除', en: 'INDIVIDUALS REMOVED', at: T.thr + 4.1, pos: g.population[4], dx: 110, dy: 70, cls: 'amber' }, 'thr'),
    ];
    this.crosses = REMOVED.map(() => {
      const c = s('path', { class: 's4-x', d: 'M-7,-7L7,7M7,-7L-7,7' });
      svg.appendChild(c);
      return c;
    });

    // ---- left panel: habitat + distribution
    const L = panel({ x: 48, y: 100, w: 420, title: { en: 'SUITABLE HABITAT', cn: '适宜生境' }, idx: 'D', cls: 'L-ui s4-left' });
    const icons = ['tree', 'layers', 'rock', 'cut', 'wave'];
    this.habRows = S4.habitat.map((r, i) => {
      const row = h('div', { class: 's4-hab' }, [icon(icons[i], 's4-hab-ic'), h('span', { class: 's4-hab-cn', text: r.cn }), h('span', { class: 's4-hab-en en', text: r.en })]);
      L._body.appendChild(row);
      cues.add(row, 1.8 + i * 0.5, { mode: 'left', dur: 0.45 });
      return row;
    });
    const dh = h('div', { class: 'ph s4-subh' }, [h('span', { class: 'ph-en', text: 'DISTRIBUTION' }), h('span', { class: 'ph-cn', text: '分布' }), h('span', { class: 'ph-fill' }), h('span', { class: 'ph-tag', text: 'SCHEMATIC · 示意' })]);
    this.map = new RangeMap(384, 236);
    const mapWrap = h('div', { class: 's4-map' }, [this.map.el]);
    this.mapLabels = RANGE_ZONES.map(([lon, lat, , name, dx, dy]) => {
      const [x, y] = this.map.toXY(lon, lat);
      const el = h('span', { class: 's4-map-l', text: name });
      css(el, { left: x + dx + 'px', top: y + dy + 'px' });
      mapWrap.appendChild(el);
      return el;
    });
    const rangeTxt = h('div', { class: 's4-range' }, [h('span', { text: SPECIES.range.cn }), h('span', { class: 'en', text: SPECIES.range.en })]);
    L._body.append(dh, mapWrap, rangeTxt);
    R.appendChild(L);
    cues.add(L, 1.4, { mode: 'left', dur: 0.6 });
    cues.add(dh, 4.4, { mode: 'fade', dur: 0.4 });
    cues.add(rangeTxt, 5.6, { mode: 'up', dur: 0.4 });
    this.mapLabels.forEach((el, i) => cues.add(el, 5.2 + i * 0.12, { mode: 'fade', dur: 0.3 }));

    // ---- right panel: threats
    const Rp = panel({ x: 1452, y: 100, w: 420, title: { en: 'THREATS', cn: '威胁因素' }, idx: 'E', cls: 'L-ui s4-right' });
    this.thrCards = S4.threats.map((th, i) => {
      const dia = this.threatDiagram(i);
      const card = h('div', { class: 's4-thr' }, [
        h('div', { class: 's4-thr-h' }, [icon('warn', 's4-thr-ic'), h('span', { class: 's4-thr-n mono', text: `T-0${i + 1}` })]),
        h('div', { class: 's4-thr-cn', text: th.cn }),
        h('div', { class: 's4-thr-en en', text: th.en }),
        h('div', { class: 's4-thr-sub' }, [h('span', { text: th.sub }), h('span', { class: 'en', text: th.subEn })]),
        dia.el,
      ]);
      card._dia = dia;
      Rp._body.appendChild(card);
      return card;
    });
    this.thrWait = h('div', { class: 's4-thr-wait mono', text: 'MONITORING · 监测中' });
    Rp._body.prepend(this.thrWait);
    R.appendChild(Rp);
    cues.add(Rp, 1.7, { mode: 'right', dur: 0.6 });
    const thrAt = [T.thr + 0.2, T.thr + 2.0, T.thr + 3.6];
    this.thrCards.forEach((c, i) => cues.add(c, 2.3 + i * 0.25, { mode: 'right', dur: 0.5 }));
    this.thrAt = thrAt;
    cues.add(this.thrWait, 2.2, { mode: 'fade', dur: 0.4 });

    // ---- summary
    this.summary = h('div', { class: 's4-sum L-ui' }, [h('div', { class: 's4-sum-cn', text: S4.summaryCn }), h('div', { class: 's4-sum-en en', text: S4.summaryEn })]);
    R.appendChild(this.summary);
    cues.add(this.summary, T.hold, { mode: 'up', dur: 0.7 });
    cues.add(this.summary.firstChild, T.hold + 0.1, { mode: 'wipe', dur: 0.8 });
    this.stageTag = h('div', { class: 's4-stage mono L-ui' });
    R.appendChild(this.stageTag);
  }

  linkMid(a, b) {
    const P = this.gl.patches;
    const x = (P[a].x + P[b].x) / 2, z = (P[a].y + P[b].y) / 2;
    return [x, heightAt(x, z) + 0.5, z];
  }

  mkLabel(d, kind) {
    const el = h('div', { class: `s4-lbl ${kind} ${d.cls || ''}` }, [h('span', { class: 'lbl-cn', text: d.cn }), h('span', { class: 'lbl-en', text: d.en })]);
    const dot = s('circle', { r: 3, class: `s4-dot ${d.cls || ''}` });
    const stem = s('path', { class: `s4-stem ${d.cls || ''}` });
    this.svg.append(stem, dot);
    this.labelLayer.appendChild(el);
    return { ...d, el, dot, stem, kind };
  }

  placeLabel(L, t, alpha = 1) {
    const [x, y] = this.gl.project(L.pos);
    const a = seg(t, L.at, 0.4) * alpha;
    const lx = x + L.dx, ly = y + L.dy;
    attr(L.dot, { cx: x.toFixed(1), cy: y.toFixed(1) });
    attr(L.stem, { d: `M${x.toFixed(1)},${y.toFixed(1)}L${lx.toFixed(1)},${ly.toFixed(1)}H${(lx + (L.dx < 0 ? -12 : 12)).toFixed(1)}` });
    const left = L.dx < 0;
    css(L.el, { opacity: a.toFixed(3), transform: `translate(${(left ? lx - 12 : lx + 14).toFixed(1)}px, ${(ly - 20).toFixed(1)}px) translateX(${left ? '-100%' : '0'})` });
    css(L.dot, { opacity: a.toFixed(3) });
    css(L.stem, { opacity: (a * 0.8).toFixed(3) });
  }

  threatDiagram(i) {
    const el = s('svg', { class: 's4-dia', viewBox: '0 0 380 64', width: 380, height: 64 });
    const parts = {};
    if (i === 0) {
      const nodes = [[30, 32], [110, 14], [110, 50], [200, 32], [280, 16], [350, 40]];
      const links = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5], [3, 5]];
      parts.links = links.map(([a, b]) => {
        const l = s('line', { x1: nodes[a][0], y1: nodes[a][1], x2: nodes[b][0], y2: nodes[b][1], class: 'dia-l' });
        el.append(l);
        return l;
      });
      parts.nodes = nodes.map(([x, y]) => {
        const c = s('circle', { cx: x, cy: y, r: 9, class: 'dia-n' });
        el.append(c);
        return c;
      });
    } else if (i === 1) {
      parts.a = s('path', { class: 'dia-w' });
      parts.b = s('path', { class: 'dia-w2' });
      el.append(parts.a, parts.b, s('text', { x: 4, y: 12, class: 'dia-t', text: '水分 MOISTURE' }), s('text', { x: 4, y: 62, class: 'dia-t', text: '微气候 MICROCLIMATE' }));
    } else {
      parts.dots = [];
      for (let k = 0; k < 12; k++) {
        const g = s('g', { transform: `translate(${20 + k * 30},34)` }, [s('rect', { x: -6, y: -6, width: 12, height: 12, class: 'dia-p' }), s('path', { d: 'M-8,-8L8,8M8,-8L-8,8', class: 'dia-x' })]);
        el.append(g);
        parts.dots.push(g);
      }
    }
    return { el, parts };
  }

  render(t) {
    const g = this.gl;
    const az = lerp(-0.62, -0.36, ease.inOutSine(t / this.duration));
    g.setView({ az, el: 0.5, dist: 168, shiftX: -10, shiftY: 70 });

    const patchAlive = g.patches.map((_, i) => (LOST.includes(i) ? 1 - seg(t, T.thr + 0.7 + LOST.indexOf(i) * 0.4, 0.5) : 1));
    const pairs = g.links.map((l) => l.userData.pair.join(','));
    const linkBreak = pairs.map((k) => (LINK_BREAK_AT[k] ? ease.outCubic(seg(t, LINK_BREAK_AT[k], 0.6)) : 0));
    const popAlive = g.population.map((_, i) => {
      const r = REMOVED.find((q) => q[0] === i);
      return r ? 1 - seg(t, r[1], 0.4) : 1;
    });
    const mistShift = smooth(seg(t, T.thr + 2.2, 2.0));
    const rel = {};
    for (const [k, at] of Object.entries(REL_AT)) {
      const draw = ease.inOutCubic(seg(t, at, 1.1));
      let a = seg(t, at, 0.2) * lerp(1, 0.6, seg(t, T.thr, 0.8));
      let color = null;
      if (k === 'water') {
        a *= lerp(1, 0.55, mistShift);
        if (mistShift > 0.3) color = 0xffb340;
      }
      if (t > T.hold) a = Math.max(a, 0.6 + 0.4 * Math.sin((t - T.hold) * 3 + at));
      rel[k] = { draw, a, color };
    }
    const reveal = lerp(0, 70, ease.inOutCubic(seg(t, 0.4, 2.6)));
    g.render({
      reveal,
      time: t,
      trees: smooth(seg(t, 1.6, 2.2)),
      mist: seg(t, 2.6, 1.5),
      mistShift,
      patchA: seg(t, T.rel - 0.6, 0.8),
      patchAlive,
      linkDraw: ease.inOutCubic(seg(t, T.rel - 0.4, 1.4)),
      linkBreak,
      rel,
      popA: seg(t, T.rel + 2.6, 0.6),
      popAlive,
      nodeA: seg(t, 0.8, 0.6),
    });

    // plate -> card
    const node = g.project(g.nodePos);
    const card = { x: 560, y: 150, w: 300, h: 169 };
    const shrink = ease.inOutCubic(seg(t, 0.15, 1.5));
    const asp = this.plate.plate.aspect;
    const c3 = plateCam3(20, asp);
    const fullR = { x: 0, y: 0, w: 1920, h: 1080 };
    const r = {
      x: lerp(fullR.x, card.x, shrink),
      y: lerp(fullR.y, card.y, shrink),
      w: lerp(fullR.w, card.w, shrink),
      h: lerp(fullR.h, card.h, shrink),
    };
    // interpolate the visible image region together with the clip rect so the image always covers it
    const a0 = { u0: -c3.x / c3.w, v0: -c3.y / (c3.w / asp), u1: (1920 - c3.x) / c3.w };
    const a1 = { u0: 0.12, v0: 0.1, u1: 0.72 };
    const u0 = lerp(a0.u0, a1.u0, shrink), v0 = lerp(a0.v0, a1.v0, shrink), u1 = lerp(a0.u1, a1.u1, shrink);
    const imgW = r.w / (u1 - u0);
    this.plate.set(r.x - u0 * imgW, r.y - v0 * (imgW / asp), imgW);
    this.plate.grade({ sat: lerp(0.42, 0.5, shrink), bri: 0.84, blur: 0, con: 1.1, tint: 1 - shrink * 0.5 });
    this.plate.spot(1 - shrink, 0.48, 0.33, 0.17, 0.26);
    css(this.plateWrap, { clipPath: `inset(${r.y.toFixed(1)}px ${(1920 - r.x - r.w).toFixed(1)}px ${(1080 - r.y - r.h).toFixed(1)}px ${r.x.toFixed(1)}px)` });
    css(this.card, { opacity: String(seg(t, 1.4, 0.4)), transform: `translate(${card.x - 1}px, ${card.y - 26}px)` });
    this.cardLead.set([[card.x + card.w / 2, card.y + card.h], [card.x + card.w / 2, node[1] - 40], [node[0], node[1] - 40], [node[0], node[1] - 8]], ease.inOutCubic(seg(t, 1.6, 0.8)), 0.9);

    // labels
    const envDim = lerp(1, 0.2, seg(t, T.rel - 0.3, 0.6));
    this.envLabels.forEach((L) => this.placeLabel(L, t, envDim));
    const relDim = lerp(1, 0.3, seg(t, T.thr, 0.8));
    this.relLabels.forEach((L) => this.placeLabel(L, t, relDim * (L.en === 'MOISTURE' ? lerp(1, 0.6, mistShift) : 1)));
    this.placeLabel(this.nodeLabel, t);
    this.thrLabels.forEach((L) => this.placeLabel(L, t));
    REMOVED.forEach(([idx, at], k) => {
      const [x, y] = g.project(g.population[idx]);
      attr(this.crosses[k], { transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${lerp(1.8, 1, ease.outCubic(seg(t, at, 0.4))).toFixed(3)})` });
      css(this.crosses[k], { opacity: String(seg(t, at, 0.2)) });
    });

    // left rows highlight in sync with 3D labels
    this.habRows.forEach((row, i) => row.classList.toggle('on', t > 1.8 + i * 0.5 && t < T.rel));
    this.map.draw(t, seg(t, 4.4, 0.8), seg(t, 5.0, 1.2));

    // threat diagrams
    this.thrCards.forEach((c, i) => c.classList.toggle('active', t >= this.thrAt[i]));
    txt(this.thrWait, t < T.thr ? 'STANDBY · 监测中' : t < T.hold ? 'ALERT · 威胁评估中' : 'ASSESSED · 已评估');
    this.thrWait.classList.toggle('alert', t >= T.thr);
    const d0 = this.thrCards[0]._dia.parts;
    const lostN = [3, 4];
    d0.nodes.forEach((n, i) => n.classList.toggle('lost', lostN.includes(i) && t > T.thr + 0.9 + lostN.indexOf(i) * 0.4));
    d0.links.forEach((l, i) => l.classList.toggle('broken', [2, 4, 5, 6].includes(i) && t > T.thr + 1.2));
    const d1 = this.thrCards[1]._dia.parts;
    const sh = mistShift;
    const wave = (yy, amp, ph, shift) => {
      let d = '';
      for (let x = 0; x <= 380; x += 6) {
        const y = yy + Math.sin(x * 0.045 + ph + t * 1.2) * amp * (1 + shift * (x / 380) * 1.6) - shift * (x / 380) * 8;
        d += (x ? 'L' : 'M') + x + ',' + y.toFixed(1);
      }
      return d;
    };
    attr(d1.a, { d: wave(26, 4, 0, sh) });
    attr(d1.b, { d: wave(44, 3, 1.4, sh * 0.8) });
    this.thrCards[1].classList.toggle('shift', sh > 0.4);
    const d2 = this.thrCards[2]._dia.parts;
    d2.dots.forEach((dd, k) => {
      const removed = [2, 5, 9].indexOf(k);
      dd.classList.toggle('removed', removed >= 0 && t > this.thrAt[2] + 0.6 + removed * 0.4);
    });

    const stage = t < T.rel ? ['01', '建立环境', 'ENVIRONMENT'] : t < T.thr ? ['02', '展开关联', 'RELATIONS'] : t < T.hold ? ['03', '引入威胁', 'THREATS'] : ['04', '关系支撑', 'DEPENDENCY'];
    txt(this.stageTag, `STAGE ${stage[0]} / 04  ·  ${stage[2]}  ·  ${stage[1]}`);
    css(this.stageTag, { opacity: String(seg(t, 1.6, 0.5)) });

    this.cues.render(t);
    return { top: true, rails: true, alpha: 1 };
  }
}
