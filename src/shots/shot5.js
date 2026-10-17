// SHOT 5 — DATA INCOMPLETE, SPECIMEN STABLE / 数据残缺与样本稳定
// Missing data is drawn as gaps, dashes and unfinished boundaries — never as zero.
import { h, s, css, txt, attr, stageSvg } from '../core/dom.js';
import { Cues } from '../core/cues.js';
import { clamp, lerp, seg, ease, smooth, hash2 } from '../core/util.js';
import { Brackets, Reticle, icon, statusTag } from '../components/hud.js';
import { Trace } from '../components/charts.js';
import { PlateView } from '../components/plateView.js';
import { pointInPoly } from '../core/plate.js';
import { S5, PLATE } from '../content.js';

const VP = { x: 48, y: 100, w: 1240, h: 640 }; // plate viewport
const UG = { x: 48, y: 756, w: 1240, h: 274 }; // underground panel
const CELL = 62;
const COLS = 20, ROWS = 10;
const BOUND_COL = 15; // habitat scan halts here

export default class Shot5 {
  constructor() {
    this.title = '数据残缺';
    this.duration = 9;
    this.phase = { en: 'PHASE 05 · DATA INTEGRITY', cn: '数据完整性' };
    this.root = h('div', { class: 'shot s5' });
  }

  init({ plate }) {
    const R = this.root;
    const cues = (this.cues = new Cues());
    R.appendChild(h('div', { class: 'bg-grid L-bg' }));
    this.plate = new PlateView(plate);
    this.plateWrap = h('div', { class: 's5-plate' }, [this.plate.el]);
    css(this.plateWrap, { clipPath: `inset(${VP.y}px ${1920 - VP.x - VP.w}px ${1080 - VP.y - VP.h}px ${VP.x}px)` });
    R.appendChild(this.plateWrap);
    this.plate.set(VP.x, VP.y - 8, VP.w);

    const svg = (this.svg = stageSvg('L-ui'));
    R.appendChild(svg);
    // viewport frame
    this.vpFrame = new Brackets(svg, { arm: 30, ticks: true });
    // tiles: plant mask to keep holes off the specimen
    const toStage = (u, v) => this.plate.toStage(u, v);
    const poly = PLATE.plantPoly;
    this.tiles = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const x = VP.x + c * CELL, y = VP.y + 10 + r * CELL;
        const u = (x + CELL / 2 - VP.x) / VP.w, v = (y + CELL / 2 - (VP.y - 8)) / (VP.w / plate.aspect);
        const onPlant = pointInPoly(u, v, poly);
        const hole = !onPlant && c < BOUND_COL && hash2(c * 3.1, r * 7.7) < 0.17;
        this.tiles.push({ x, y, c, r, state: c >= BOUND_COL ? 'out' : hole ? 'hole' : 'data' });
      }
    this.tData = s('path', { class: 's5-tile-data' });
    this.tHole = s('path', { class: 's5-tile-hole' });
    this.tOut = s('path', { class: 's5-tile-out' });
    this.scanLine = s('path', { class: 's5-scanline' });
    this.boundLine = s('path', { class: 's5-boundary' });
    svg.append(this.tData, this.tHole, this.tOut, this.boundLine, this.scanLine);

    // relation lines from the specimen base, breaking at the data boundary
    const base = toStage(...PLATE.anchors.base);
    const bx = VP.x + BOUND_COL * CELL;
    this.bx = bx;
    this.rels = [
      { to: [VP.x + 90, 360], brk: false },
      { to: [VP.x + VP.w - 30, 610], brk: true },
      { to: [VP.x + VP.w - 60, 300], brk: true },
    ].map((d, i) => {
      const solid = s('path', { class: 's5-rel' });
      const stub = s('path', { class: 's5-rel-stub' });
      const end = s('g', { class: 's5-rel-end' }, [s('path', { d: 'M-6,-6L6,6M6,-6L-6,6' })]);
      svg.append(solid, stub, end);
      return { ...d, from: base, solid, stub, end, at: 1.2 + i * 0.3 };
    });

    // pollination network from the lip
    const lip = toStage(...PLATE.anchors.lip);
    this.lip = lip;
    this.poll = [
      { to: [870, 196], known: true, at: 3.0, lbl: 'OBS-01' },
      { to: [575, 150], known: true, at: 3.3, lbl: 'OBS-02' },
      { to: [VP.x + VP.w - 20, 150], known: false, at: 3.8 },
      { to: [VP.x + VP.w - 10, 455], known: false, at: 4.05 },
      { to: [1150, 108], known: false, at: 4.3 },
    ].map((d) => {
      const path = s('path', { class: d.known ? 's5-poll' : 's5-poll-unk' });
      const node = s('g', { class: d.known ? 's5-pnode' : 's5-punk' }, [s('circle', { r: d.known ? 8 : 11 }), d.known ? s('circle', { r: 3, class: 'core' }) : s('text', { y: 5, 'text-anchor': 'middle', text: '?' })]);
      svg.append(path, node);
      const lab = h('div', { class: `s5-plbl mono L-ui ${d.known ? '' : 'unk'}`, text: d.known ? `${d.lbl} · 已获取` : 'UNKNOWN · 未获取' });
      R.appendChild(lab);
      return { ...d, path, node, lab };
    });
    this.lipRet = new Reticle(svg);
    this.pollTag = h('div', { class: 's5-ptag L-ui' }, [h('span', { class: 'en', text: 'POLLINATION PATHS' }), h('span', { text: '传粉路径' })]);
    R.appendChild(this.pollTag);
    this.habTag = h('div', { class: 's5-htag L-ui' }, [h('span', { class: 'en', text: 'HABITAT LAYER' }), h('span', { text: '栖息地图层' })]);
    R.appendChild(this.habTag);
    this.haltTag = h('div', { class: 's5-halt mono L-ui', text: 'SCAN HALTED · 采集边界' });
    R.appendChild(this.haltTag);
    this.stableTag = h('div', { class: 's5-stabletag L-ui' }, [h('span', { class: 'en', text: 'SPECIMEN 017' }), h('span', { text: '形态完整' })]);
    R.appendChild(this.stableTag);

    // ---- underground panel
    const ug = s('g', { class: 's5-ug' });
    svg.appendChild(ug);
    let gd = '';
    for (let x = UG.x; x <= UG.x + UG.w; x += 31) gd += `M${x},${UG.y + 20}V${UG.y + UG.h}`;
    for (let y = UG.y + 20; y <= UG.y + UG.h; y += 31) gd += `M${UG.x},${y}H${UG.x + UG.w}`;
    this.ugGrid = s('path', { class: 's5-ug-grid', d: gd });
    this.surface = s('path', { class: 's5-surface', d: `M${UG.x},${UG.y + 20}H${UG.x + UG.w}` });
    let dt = '';
    for (let k = 0; k <= 8; k++) dt += `M${UG.x - 2},${UG.y + 20 + k * 31}h-8`;
    this.ugTicks = s('path', { class: 's5-ug-ticks', d: dt });
    // unfinished sampling boundary (amber dashed, deliberately open)
    const bxs = base[0];
    this.ugBound = s('path', {
      class: 's5-ug-bound',
      d: `M${bxs - 260},${UG.y + 20} C${bxs - 300},${UG.y + 120} ${bxs - 220},${UG.y + 230} ${bxs - 40},${UG.y + 240} S${bxs + 260},${UG.y + 200} ${bxs + 330},${UG.y + 120}`,
      pathLength: 1,
    });
    this.probes = [-150, 0, 150].map((dx, i) => {
      const x = bxs + dx;
      const p = s('path', { class: 's5-probe', d: `M${x},${UG.y + 20}V${UG.y + 200}` , pathLength: 1 });
      const tip = s('g', { class: 's5-probe-tip' }, [s('rect', { x: -26, y: 4, width: 52, height: 20 }), s('text', { y: 18, 'text-anchor': 'middle', text: '— —' })]);
      attr(tip, { transform: `translate(${x},${UG.y + 200})` });
      ug.append(p, tip);
      return { p, tip, at: 1.3 + i * 0.25 };
    });
    ug.prepend(this.ugGrid, this.surface, this.ugTicks, this.ugBound);
    this.ugLabel = h('div', { class: 's5-ug-lbl L-ui' }, [
      icon('layers', 's5-ug-ic'),
      h('div', {}, [h('div', { class: 's5-ug-cn' }, [h('span', { text: S5.underground.cn }), h('span', { class: 'sep', text: '／' }), h('b', { text: S5.underground.stateCn })]), h('div', { class: 's5-ug-en en', text: `${S5.underground.en} / ${S5.underground.state}` })]),
    ]);
    R.appendChild(this.ugLabel);
    this.surfLbl = h('div', { class: 's5-surf-lbl mono L-ui', text: 'SURFACE · 地表' });
    this.boundLbl = h('div', { class: 's5-bound-lbl mono L-ui', text: 'BOUNDARY INCOMPLETE · 采集边界未闭合' });
    R.append(this.surfLbl, this.boundLbl);
    cues.add(this.ugLabel, 2.6, { mode: 'left', dur: 0.6 });
    cues.add(this.surfLbl, 0.8, { mode: 'fade', dur: 0.4 });
    cues.add(this.boundLbl, 2.6, { mode: 'fade', dur: 0.5 });

    // ---- status column
    const col = h('div', { class: 's5-col L-ui' });
    this.rows = S5.rows.map((r, i) => {
      const graphic = h('div', { class: 's5-g' });
      const row = h('div', { class: `s5-row tone-${r.tone}` }, [
        h('div', { class: 's5-row-h' }, [h('span', { class: 's5-row-n mono', text: `0${i + 1}` }), h('span', { class: 's5-row-en en', text: r.en }), h('span', { class: 's5-row-state en', text: r.state })]),
        h('div', { class: 's5-row-cn' }, [h('span', { text: r.cn }), h('span', { class: 'sep', text: '／' }), h('b', { text: r.stateCn })]),
        graphic,
      ]);
      row._g = graphic;
      col.appendChild(row);
      return row;
    });
    R.appendChild(col);
    // graphics
    this.mosaic = s('svg', { viewBox: '0 0 480 76', width: 480, height: 76 });
    this.mosaicTiles = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 16; c++) {
        const miss = c >= 12 || hash2(c * 1.7, r * 9.1) < 0.2;
        const el = s('rect', { x: c * 30 + 1, y: r * 25 + 1, width: 27, height: 22, class: miss ? 'mz-miss' : 'mz-ok' });
        this.mosaic.appendChild(el);
        this.mosaicTiles.push({ el, c, miss });
      }
    this.rows[0]._g.appendChild(this.mosaic);
    this.net = s('svg', { viewBox: '0 0 480 76', width: 480, height: 76 });
    this.net.append(
      s('path', { class: 'nt-ok', d: 'M30,38L120,18M30,38L120,58' }),
      s('path', { class: 'nt-unk', d: 'M120,18L260,10M120,58L260,66M30,38L300,38M260,10L420,14M300,38L460,38' }),
      s('circle', { cx: 30, cy: 38, r: 7, class: 'nt-root' }),
      s('circle', { cx: 120, cy: 18, r: 6, class: 'nt-n' }),
      s('circle', { cx: 120, cy: 58, r: 6, class: 'nt-n' }),
      s('circle', { cx: 260, cy: 10, r: 7, class: 'nt-q' }),
      s('circle', { cx: 260, cy: 66, r: 7, class: 'nt-q' }),
      s('circle', { cx: 300, cy: 38, r: 7, class: 'nt-q' }),
      s('text', { x: 430, y: 66, class: 'nt-t', text: '? UNKNOWN' })
    );
    this.rows[1]._g.appendChild(this.net);
    this.trace = new Trace(480, 70, { fill: true });
    this.rows[2]._g.appendChild(this.trace.el);
    this.rows[2]._g.appendChild(h('div', { class: 's5-morph mono', text: 'MORPHOLOGY 形态 · COMPLETE   SURFACE INTEGRITY · OK' }));
    const at = [2.5, 4.6, 5.6];
    this.rows.forEach((r, i) => cues.add(r, at[i], { mode: 'right', dur: 0.6, dist: 30 }));
    this.rowAt = at;
  }

  render(t) {
    const P = this.plate;
    P.set(VP.x, VP.y - 8, VP.w);
    P.grade({ sat: 0.4, bri: lerp(0.4, 0.84, seg(t, 0, 0.7)), con: 1.1 });
    P.spot(0.65 * seg(t, 5.4, 1.0), 0.4, 0.45, 0.28, 0.55, 0.92);
    this.vpFrame.set(VP, { alpha: seg(t, 0, 0.4), inner: 0.4 });

    // habitat scan: sweeps, halts at the boundary
    const sx = lerp(VP.x, this.bx, ease.inOutSine(seg(t, 0.5, 1.9)));
    let dD = '', dH = '', dO = '';
    for (const tl of this.tiles) {
      const r = `M${tl.x + 2},${tl.y + 2}h${CELL - 4}v${CELL - 4}h${-(CELL - 4)}Z`;
      if (tl.state === 'out') {
        if (t > 2.3) dO += r;
      } else if (tl.x + CELL <= sx + 1) {
        if (tl.state === 'data') dD += r;
        else dH += r;
      }
    }
    attr(this.tData, { d: dD || 'M0,0' });
    attr(this.tHole, { d: dH || 'M0,0' });
    attr(this.tOut, { d: dO || 'M0,0' });
    css(this.tOut, { opacity: String(seg(t, 2.3, 0.6)) });
    const scanning = t > 0.5 && t < 2.5;
    const halted = t >= 2.4;
    attr(this.scanLine, { d: `M${sx.toFixed(1)},${VP.y}V${VP.y + VP.h}` });
    css(this.scanLine, { opacity: scanning ? '1' : halted ? String(0.35 + 0.25 * Math.sin(t * 6)) : '0' });
    attr(this.boundLine, { d: `M${this.bx},${VP.y}V${VP.y + VP.h}` });
    css(this.boundLine, { opacity: String(seg(t, 2.4, 0.4)) });
    css(this.haltTag, { opacity: String(seg(t, 2.4, 0.3)), transform: `translate(${this.bx + 10}px, ${VP.y + VP.h - 30}px)` });
    css(this.habTag, { opacity: String(seg(t, 0.5, 0.4)), transform: `translate(${VP.x + 14}px, ${VP.y + 14}px)` });

    // relation lines break at the boundary
    for (const r of this.rels) {
      const [x0, y0] = r.from, [x1, y1] = r.to;
      const p = ease.inOutCubic(seg(t, r.at, 1.0));
      const k = r.brk ? (this.bx - x0) / (x1 - x0) : 1;
      const cut = Math.min(p, k);
      attr(r.solid, { d: `M${x0},${y0}L${lerp(x0, x1, cut).toFixed(1)},${lerp(y0, y1, cut).toFixed(1)}` });
      css(r.solid, { opacity: String(seg(t, r.at, 0.1)) });
      if (r.brk) {
        const bxp = lerp(x0, x1, k), byp = lerp(y0, y1, k);
        const sp = seg(t, r.at + 0.9, 0.5);
        attr(r.stub, { d: `M${bxp.toFixed(1)},${byp.toFixed(1)}L${lerp(bxp, x1, 0.35 * sp).toFixed(1)},${lerp(byp, y1, 0.35 * sp).toFixed(1)}` });
        css(r.stub, { opacity: String(sp * 0.8) });
        attr(r.end, { transform: `translate(${bxp.toFixed(1)},${byp.toFixed(1)})` });
        css(r.end, { opacity: String(seg(t, r.at + 0.8, 0.2)) });
      } else {
        css(r.stub, { opacity: '0' });
        css(r.end, { opacity: '0' });
      }
    }

    // pollination: two known nodes, the rest dashed into unknown
    const [lx, ly] = this.lip;
    this.lipRet.set(lx, ly, { alpha: seg(t, 2.8, 0.3), scale: 0.7, rot: t * 30 });
    css(this.pollTag, { opacity: String(seg(t, 2.9, 0.4)), transform: `translate(${lx + 30}px, ${ly + 18}px)` });
    for (const q of this.poll) {
      const [x1, y1] = q.to;
      const p = ease.inOutCubic(seg(t, q.at, 0.9));
      const reach = q.known ? p : p * 0.82;
      const mx = (lx + x1) / 2, my = Math.min(ly, y1) - 40;
      // quadratic bezier sampled up to reach
      let d = '';
      for (let i = 0; i <= 24; i++) {
        const u = (i / 24) * reach;
        const x = (1 - u) * (1 - u) * lx + 2 * (1 - u) * u * mx + u * u * x1;
        const y = (1 - u) * (1 - u) * ly + 2 * (1 - u) * u * my + u * u * y1;
        d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
      }
      attr(q.path, { d });
      css(q.path, { opacity: String(seg(t, q.at, 0.1)) });
      const e = 0.82;
      const ex = q.known ? x1 : (1 - e) * (1 - e) * lx + 2 * (1 - e) * e * mx + e * e * x1;
      const ey = q.known ? y1 : (1 - e) * (1 - e) * ly + 2 * (1 - e) * e * my + e * e * y1;
      attr(q.node, { transform: `translate(${ex.toFixed(1)},${ey.toFixed(1)})` });
      const na = seg(t, q.at + 0.85, 0.3);
      css(q.node, { opacity: String(na) });
      css(q.lab, { opacity: String(na), transform: `translate(${(ex + 14).toFixed(1)}px, ${(ey - 22).toFixed(1)}px)` });
    }

    // underground: probes return nothing, boundary drawn but left open
    this.probes.forEach((pr) => {
      const p = ease.inOutCubic(seg(t, pr.at, 0.8));
      attr(pr.p, { 'stroke-dasharray': '1 2', 'stroke-dashoffset': (1 - p).toFixed(4) });
      css(pr.tip, { opacity: String(seg(t, pr.at + 0.8, 0.3)) });
    });
    const bp = 0.72 * ease.inOutCubic(seg(t, 1.2, 1.4));
    attr(this.ugBound, { 'stroke-dasharray': '1 2', 'stroke-dashoffset': (1 - bp).toFixed(4) });
    css(this.surfLbl, { transform: `translate(${UG.x + 8}px, ${UG.y}px)` });
    css(this.boundLbl, { transform: `translate(${UG.x + UG.w - 360}px, ${UG.y + UG.h - 30}px)` });
    css(this.ugGrid, { opacity: String(seg(t, 0.3, 0.6) * 0.9) });
    this.stableTag.classList.toggle('on', t > 5.6);
    css(this.stableTag, { opacity: String(seg(t, 5.6, 0.5)), transform: `translate(${this.plate.toStage(0.2, 0.14)[0]}px, ${this.plate.toStage(0.2, 0.14)[1]}px)` });

    // status graphics
    this.mosaicTiles.forEach((m) => css(m.el, { opacity: String(m.miss ? seg(t, this.rowAt[0] + 0.5 + m.c * 0.02, 0.3) : seg(t, this.rowAt[0] + 0.2 + m.c * 0.03, 0.2)) }));
    this.trace.draw((x) => 0.5 + 0.06 * Math.sin(x * 6.283) * Math.exp(-40 * ((x % 1) - 0.3) ** 2) + 0.01 * Math.sin(x * 40), t * 0.5, 4, { reveal: seg(t, this.rowAt[2] + 0.2, 0.8) });

    this.cues.render(t);
    return { top: true, rails: true, alpha: 1 };
  }
}
