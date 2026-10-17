// SHOT 1 — NATURE RECONSTRUCTION / 自然重建
// Establish the system and the object: locate -> scan -> sparse points -> contour -> surface.
import { h, s, css, txt, attr, stageSvg } from '../core/dom.js';
import { Cues } from '../core/cues.js';
import { clamp, lerp, seg, ease, smooth, hash, fmt } from '../core/util.js';
import { Brackets, lockRect, ruler, icon, panel } from '../components/hud.js';
import { Spectrum, dial, tickBar } from '../components/charts.js';
import { OrchidScene } from '../gl/orchidScene.js';
import { S1, SPECIES } from '../content.js';

export default class Shot1 {
  constructor() {
    this.title = '自然重建';
    this.duration = 9;
    this.phase = { en: 'PHASE 01 · RECONSTRUCTION', cn: '样本重建' };
    this.root = h('div', { class: 'shot s1' });
  }

  init() {
    const R = this.root;
    const cues = (this.cues = new Cues());
    R.appendChild(h('div', { class: 'bg-grid L-bg' }));

    // 3D plate
    this.gl = new OrchidScene(1920, 1080);
    this.gl.canvas.classList.add('gl-canvas', 'L-plate');
    R.appendChild(this.gl.canvas);

    // overlay svg
    const svg = (this.svg = stageSvg('L-ui'));
    R.appendChild(svg);
    this.brk = new Brackets(svg, { arm: 34, ticks: true });
    this.scanRuler = s('g', { class: 's1-hruler' });
    svg.appendChild(this.scanRuler);
    this.hrLine = s('path', { class: 's1-hr-base' });
    this.hrTicks = s('path', { class: 's1-hr-ticks' });
    this.hrMark = s('path', { class: 's1-hr-mark', d: 'M0,0L-12,-6V6Z' });
    this.hrScan = s('path', { class: 's1-hr-scan' });
    this.scanRuler.append(this.hrLine, this.hrTicks, this.hrScan, this.hrMark);

    // ---- title block (left)
    const tb = h('div', { class: 's1-title L-ui' });
    const proj = h('div', { class: 's1-proj mono', text: S1.project });
    const en = h('div', { class: 's1-en disp', text: S1.titleEn });
    const cn = h('div', { class: 's1-cn', text: S1.titleCn });
    const rule = h('div', { class: 's1-rule' });
    const sampleLbl = h('div', { class: 's1-sample-lbl en', text: 'SAMPLE' });
    const sampleNo = h('div', { class: 's1-sample-no disp', text: '017' });
    const sampleCn = h('div', { class: 's1-sample-cn', text: S1.sampleCn });
    const sample = h('div', { class: 's1-sample' }, [
      h('div', { class: 's1-sample-l' }, [sampleLbl, sampleCn]),
      sampleNo,
    ]);
    this.statusTxt = h('span', { class: 's1-status-t' });
    const status = h('div', { class: 's1-status' }, [h('span', { class: 's1-status-dot' }), this.statusTxt]);
    tb.append(proj, en, cn, rule, sample, status);
    R.appendChild(tb);
    cues.add(proj, 0.9, { mode: 'type', dur: 0.8 });
    cues.add(en, 1.2, { mode: 'decode', dur: 0.9 });
    cues.add(cn, 1.65, { mode: 'wipe', dur: 0.75, ease: ease.outCubic });
    cues.add(rule, 2.1, { mode: 'scaleX', dur: 0.6 });
    cues.add(sampleLbl, 2.35, { mode: 'decode', dur: 0.4 });
    cues.add(sampleNo, 2.4, { mode: 'decode', dur: 0.5 });
    cues.add(sampleCn, 2.55, { mode: 'up', dur: 0.5 });
    cues.add(status, 2.8, { mode: 'fade', dur: 0.4 });

    // bracket tag (locator id)
    this.tag = h('div', { class: 's1-tag L-ui' }, [
      h('span', { class: 's1-tag-k en', text: S1.sampleEn }),
      h('span', { class: 's1-tag-v mono', text: 'LOCK' }),
    ]);
    R.appendChild(this.tag);
    this.hrLabel = h('div', { class: 's1-hr-lbl mono L-ui' });
    R.appendChild(this.hrLabel);

    // ---- species strip (bottom)
    const strip = h('div', { class: 's1-strip L-ui' });
    const sk = h('div', { class: 's1-strip-k' }, [h('span', { class: 'en', text: 'SPECIES' }), h('span', { text: '物种' })]);
    const scn = h('div', { class: 's1-strip-cn', text: SPECIES.cn });
    const ssci = h('div', { class: 's1-strip-sci disp', text: SPECIES.sciUpper });
    const sfam = h('div', { class: 's1-strip-fam' }, [
      h('span', { class: 'en', text: `${SPECIES.family.en.toUpperCase()} · ${SPECIES.genus.en.toUpperCase()}` }),
      h('span', { text: `${SPECIES.family.cn} · ${SPECIES.genus.cn}` }),
    ]);
    const sticks = h('div', { class: 's1-strip-ticks' });
    strip.append(sk, scn, h('div', { class: 's1-strip-sep' }), ssci, sticks, sfam);
    R.appendChild(strip);
    cues.add(strip, 5.0, { mode: 'wipe', dur: 0.9, ease: ease.inOutCubic });
    cues.add(scn, 5.2, { mode: 'up', dur: 0.6 });
    cues.add(ssci, 5.35, { mode: 'decode', dur: 1.1 });
    cues.add(sfam, 5.9, { mode: 'fade', dur: 0.5 });

    // ---- right gauges
    const g1 = panel({ x: 1652, y: 150, w: 220, title: { en: 'ACQUISITION', cn: '采集' }, cls: 'gauge' });
    this.ptCount = h('div', { class: 'g-big mono', text: '0' });
    this.spec = new Spectrum(184, 38, 30, { seed: 4 });
    g1._body.append(h('div', { class: 'g-k' }, [h('span', { text: 'POINTS' }), h('span', { text: '点云' })]), this.ptCount, this.spec.el);
    const g2 = panel({ x: 1652, y: 336, w: 220, title: { en: 'RECONSTRUCTION', cn: '重建' }, cls: 'gauge' });
    this.stages = [
      ['01', 'POINT CLOUD', '点云'],
      ['02', 'CONTOUR', '轮廓'],
      ['03', 'SURFACE', '表面'],
    ].map(([n, e, c]) => {
      const st = h('span', { class: 'g-st-s mono' });
      const row = h('div', { class: 'g-st' }, [h('span', { class: 'g-st-n mono', text: n }), h('span', { class: 'g-st-e en', text: e }), h('span', { class: 'g-st-c', text: c }), st]);
      row._s = st;
      return row;
    });
    this.prog = h('div', { class: 'g-prog mono' });
    this.progBar = tickBar();
    g2._body.append(...this.stages, this.progBar, this.prog);
    const g3 = panel({ x: 1652, y: 576, w: 220, title: { en: 'LOCATOR', cn: '定位' }, cls: 'gauge' });
    const dsvg = s('svg', { width: 184, height: 104, viewBox: '-92 -52 184 104', class: 'g-dial' });
    this.dial = dial(46);
    dsvg.append(this.dial);
    this.xyz = h('div', { class: 'g-xyz mono' });
    g3._body.append(dsvg, this.xyz);
    for (const [g, at] of [[g1, 1.1], [g2, 1.35], [g3, 1.6]]) {
      g.classList.add('L-ui');
      R.appendChild(g);
      cues.add(g, at, { mode: 'right', dur: 0.6 });
    }
    // left lower small readout
    this.readout = h('div', { class: 's1-readout mono L-ui' });
    R.appendChild(this.readout);
    cues.add(this.readout, 3.2, { mode: 'fade', dur: 0.6 });
  }

  render(t, ctx) {
    const gl = this.gl;
    // camera: slow orbit, never fast spin
    const az = lerp(-0.62, 0.12, ease.inOutSine(t / this.duration));
    gl.setView({ az, el: 0.2, dist: 80, shiftX: 300 });

    const scanP = ease.inOutCubic(seg(t, 0.9, 3.4));
    const scanY = lerp(-1.5, 26.5, scanP);
    const density = lerp(0.22, 1, ease.inOutCubic(seg(t, 2.6, 2.6)));
    const surf = lerp(0, 1.06, ease.inOutCubic(seg(t, 4.1, 2.6)));
    const wireP = seg(t, 2.8, 2.0);
    const settle = seg(t, 5.6, 1.6);
    gl.render({
      scanY: t < 0.9 ? -2 : scanY,
      density,
      ptsAlpha: lerp(1, 0.14, settle),
      colorMix: smooth(seg(t, 4.4, 2.2)),
      wireY: lerp(-1.5, 27, ease.inOutCubic(wireP)),
      wireAlpha: Math.min(seg(t, 2.8, 0.5), 1) * lerp(0.75, 0.035, smooth(seg(t, 5.0, 1.8))),
      surf,
      contour: lerp(1, 0.35, settle),
      scanA: scanP > 0 && scanP < 1 ? Math.min(1, Math.min(scanP, 1 - scanP) * 10) : 0,
      ground: smooth(seg(t, 1.0, 1.5)),
      pedestal: smooth(seg(t, 0.2, 1.0)),
      time: t,
    });

    // locator brackets
    const box = gl.screenBox();
    const pad = 26;
    const target = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
    const lp = ease.outExpo(seg(t, 0.25, 0.9));
    const r = lockRect(target, lp, 0.4);
    this.brk.set(r, { alpha: seg(t, 0.25, 0.2) * (0.6 + 0.4 * lp), inner: lp * 0.6 });
    css(this.tag, {
      transform: `translate(${r.x.toFixed(1)}px, ${(r.y - 30).toFixed(1)}px)`,
      opacity: String(seg(t, 0.6, 0.3) * (hash(Math.floor(t * 20)) > 0.3 || t > 1.2 ? 1 : 0.2)),
    });

    // scan height ruler (left of plant)
    const top = gl.project([gl.target.x, 26, 0]);
    const bot = gl.project([gl.target.x, -1, 0]);
    const rx = r.x - 26;
    const y0 = bot[1], y1 = top[1];
    attr(this.hrLine, { d: `M${rx},${y0.toFixed(1)}V${y1.toFixed(1)}` });
    let d = '';
    for (let k = 0; k <= 27; k++) {
      const yy = lerp(y0, y1, k / 27);
      d += `M${rx},${yy.toFixed(1)}h${k % 5 === 0 ? -10 : -5}`;
    }
    attr(this.hrTicks, { d });
    const sy = lerp(y0, y1, clamp((scanY + 1) / 27));
    attr(this.hrMark, { transform: `translate(${rx - 12},${sy.toFixed(1)})` });
    const scanning = scanP > 0 && scanP < 1;
    attr(this.hrScan, { d: `M${rx + 4},${sy.toFixed(1)}H${(r.x + r.w).toFixed(1)}` });
    css(this.hrScan, { opacity: scanning ? '0.55' : '0' });
    css(this.scanRuler, { opacity: String(seg(t, 0.6, 0.4) * lerp(1, 0.45, settle)) });
    txt(this.hrLabel, `H ${fmt(Math.max(0, scanY + 1) * 1.0, 1).padStart(4, '0')} cm`);
    css(this.hrLabel, { transform: `translate(${(rx - 112).toFixed(1)}px, ${(sy - 9).toFixed(1)}px)`, opacity: String(seg(t, 0.9, 0.3) * lerp(1, 0.5, settle)) });

    // gauges
    const pts = Math.floor(1284566 * ease.outCubic(seg(t, 1.0, 4.6)));
    txt(this.ptCount, pts.toLocaleString('en-US'));
    this.spec.draw(t, 0.4 + 0.6 * (scanning ? 1 : 0.45));
    const stState = [
      [0.9, 3.4],
      [2.8, 5.0],
      [4.1, 99],
    ];
    this.stages.forEach((row, i) => {
      const [a, b] = stState[i];
      const state = t < a ? 'WAIT' : t < b ? 'RUN' : 'DONE';
      row.className = `g-st st-${state.toLowerCase()}`;
      txt(row._s, state === 'RUN' ? ['▖', '▘', '▝', '▗'][Math.floor(t * 8) % 4] + ' RUN' : state === 'DONE' ? '✓ OK' : '— —');
    });
    const prog = 96.4 * ease.inOutSine(seg(t, 0.9, this.duration - 0.9));
    txt(this.prog, `${prog.toFixed(1)}%`);
    this.progBar.set(prog / 100);
    this.dial.update(t, (az * 180) / Math.PI * 3);
    const j = (k) => ((hash(Math.floor(t * 10) + k) - 0.5) * 0.004).toFixed(3);
    this.xyz.innerHTML = `<div><b>AZ</b> ${((az * 180) / Math.PI).toFixed(2)}°</div><div><b>EL</b> 11.46°</div><div><b>X</b> +0.60${j(1).slice(-1)} <b>Y</b> +13.6${j(2).slice(-1)}</div><div class="cy">● TARGET LOCKED</div>`;

    // status line
    const dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
    const stage = t < 2.8 ? ['ACQUIRING POINT CLOUD', '采集点云'] : t < 4.4 ? ['BUILDING CONTOUR', '建立轮廓'] : ['RECONSTRUCTING SURFACE', '重建表面'];
    txt(this.statusTxt, `${stage[0]} / ${stage[1]}${dots}`);
    txt(this.readout, `SRC  VR-NODE 04 / SCAN ARRAY 6×\nRES  0.18 mm   FRAME ${String(Math.floor(t * 25)).padStart(4, '0')}\nOBJ  ${S1.sampleEn}  ·  ${SPECIES.sciUpper}`);

    this.cues.render(t);
    return { top: true, rails: true, alpha: seg(t, 0.0, 0.8) };
  }
}
