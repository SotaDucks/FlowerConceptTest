// SHOT 3 — PLANT SCAN & SPECIES FILE / 植株扫描与物种介绍
// whole plant -> leaf form -> leaf texture -> flower & lip; one organ lit at a time.
import { h, s, css, txt, attr, stageSvg } from '../core/dom.js';
import { Cues } from '../core/cues.js';
import { clamp, lerp, seg, ease, smooth, hash } from '../core/util.js';
import { Brackets, Reticle, Leader, lockRect, panel, field, statusTag, icon } from '../components/hud.js';
import { tickBar } from '../components/charts.js';
import { PlateView, PhotoInset, FeatureLayer } from '../components/plateView.js';
import { idBar } from '../components/idbar.js';
import { SPECIES, S3, PLATE } from '../content.js';

// stage windows (s)
const ST = [1.0, 5.2, 9.4, 13.6];
const END = 18.4;

// plate camera for shots 3–4: plant centred between side panels
export function plateCam3(t, aspect = 16 / 9) {
  const sc = 1 + 0.025 * smooth(t / 20);
  const w = 1940 * sc, hh = w / aspect;
  // keep image point (0.45, 0.45) fixed on stage
  return { x: 1069 - 0.45 * w, y: 491 - 0.45 * hh, w };
}

export default class Shot3 {
  constructor() {
    this.title = '植株扫描';
    this.duration = 20;
    this.phase = { en: 'PHASE 03 · SPECIES ARCHIVE', cn: '物种建档' };
    this.root = h('div', { class: 'shot s3' });
  }

  init({ plate }) {
    const R = this.root;
    this.plateData = plate;
    const cues = (this.cues = new Cues());
    R.appendChild(h('div', { class: 'bg-grid L-bg' }));
    this.plate = new PlateView(plate, { video: true });
    R.appendChild(this.plate.el);
    R.appendChild(h('div', { class: 's3-sideshade L-ui' }));
    this.feat = new FeatureLayer();
    R.appendChild(this.feat.el);

    const svg = (this.svg = stageSvg('L-ui'));
    R.appendChild(svg);
    this.outline = s('path', { class: 's3-outline' });
    svg.appendChild(this.outline);
    this.brk = ['plant', 'leaf', 'texture', 'flower'].map((k) => new Brackets(svg, { arm: k === 'texture' ? 12 : 24, ticks: k === 'plant' }));
    this.texGrid = s('path', { class: 's3-texgrid' });
    svg.appendChild(this.texGrid);
    this.dim = s('g', { class: 's3-dim' });
    this.dimLine = s('path', { class: 's3-dimline' });
    this.dim.append(this.dimLine);
    svg.appendChild(this.dim);
    this.lead = [0, 1, 2, 3].map(() => new Leader(svg));
    this.ret = [0, 1, 2, 3].map(() => new Reticle(svg));
    this.flowerRets = ['dorsal', 'lip', 'petalR'].map(() => new Reticle(svg, { cls: 'small' }));

    // ---- identity bar
    this.id = idBar({ kind: 'SAMPLE', no: '017', cn: '样本 017 号', classEn: 'PLANT', classCn: '植物', statusEn: 'STATUS: SCANNING', statusCn: '状态：扫描中' });
    css(this.id.el, { left: '48px', top: '100px' });
    R.appendChild(this.id.el);
    cues.add(this.id.el, 0.5, { mode: 'wipe', dur: 0.8 });

    // ---- left: species identity
    const L = panel({ x: 48, y: 196, w: 412, title: { en: 'SPECIES IDENTITY', cn: '物种身份' }, idx: 'A', tag: 'NRS-PP-017', cls: 'L-ui s3-left' });
    const name = h('div', { class: 's3-name', text: SPECIES.cn });
    const sci = h('div', { class: 's3-sci', text: SPECIES.sci });
    const f1 = field('科', 'FAMILY', `${SPECIES.family.cn}  ${SPECIES.family.en}`);
    const f2 = field('属', 'GENUS', `${SPECIES.genus.cn}  ${SPECIES.genus.en}`);
    const f3 = field('生活型', 'HABIT', SPECIES.habit.cn);
    const prot = h('div', { class: 's3-prot' }, [icon('lock'), h('span', { text: SPECIES.protection.cn }), h('span', { class: 'en', text: SPECIES.protection.en })]);
    const f4 = h('div', { class: 'field' }, [h('div', { class: 'fl' }, [h('span', { class: 'fl-cn', text: '保护级别' }), h('span', { class: 'fl-en', text: 'PROTECTION' })]), prot]);
    const f5 = field('分布', 'RANGE', SPECIES.range.cn);
    f5._v.appendChild(h('span', { class: 's3-see en', text: '→ HABITAT MODULE' }));
    this.matchBar = tickBar();
    this.matchVal = h('span', { class: 'mono s3-match-v' });
    const match = h('div', { class: 's3-match' }, [
      h('div', { class: 's3-match-k' }, [h('span', { text: '物种匹配' }), h('span', { class: 'en', text: 'SPECIES MATCH' }), this.matchVal]),
      this.matchBar,
    ]);
    L._body.append(name, sci, f1, f2, f3, f4, f5, match);
    R.appendChild(L);
    cues.add(L, 1.0, { mode: 'left', dur: 0.6 });
    cues.add(name, 1.5, { mode: 'wipe', dur: 0.6 });
    cues.add(sci, 1.8, { mode: 'decode', dur: 0.8 });
    [f1, f2, f3, f4, f5].forEach((f, i) => cues.add(f, 2.2 + i * 0.22, { mode: 'up', dur: 0.4 }));
    cues.add(match, 3.4, { mode: 'fade', dur: 0.5 });

    // ---- left bottom: organ index
    const idx = panel({ x: 48, y: 808, w: 412, title: { en: 'SCAN SEQUENCE', cn: '分析序列' }, idx: 'B', cls: 'L-ui s3-idx' });
    this.idxRows = S3.stages.map((st, i) => {
      const mark = h('span', { class: 'si-mark mono' });
      const row = h('div', { class: 'si-row' }, [
        h('span', { class: 'si-n mono', text: `0${i + 1}` }),
        h('span', { class: 'si-cn', text: st.cn }),
        h('span', { class: 'si-en en', text: st.en }),
        mark,
      ]);
      row._m = mark;
      idx._body.appendChild(row);
      return row;
    });
    R.appendChild(idx);
    cues.add(idx, 1.3, { mode: 'left', dur: 0.6 });

    // ---- right: organ analysis
    const P = (this.rp = panel({ x: 1462, y: 100, w: 410, title: { en: 'ORGAN ANALYSIS', cn: '器官分析' }, idx: 'C', cls: 'L-ui s3-right' }));
    this.stageNo = h('span', { class: 'ph-tag' });
    P._head.appendChild(this.stageNo);
    this.inset = new PhotoInset(S3.scans, 374, 226);
    this.insetCap = h('div', { class: 's3-inset-cap mono' });
    const insetWrap = h('div', { class: 's3-inset' }, [this.inset.el, h('div', { class: 's3-inset-x' }), this.insetCap]);
    P._body.appendChild(insetWrap);
    this.groups = [];
    const body = h('div', { class: 's3-groups' });
    P._body.appendChild(body);
    // group 1: whole plant
    {
      const g = this.group(body, S3.stages[0]);
      const pts = plate.points.length;
      g.append(
        this.fact('特征点', 'FEATURE POINTS', pts.toLocaleString('en-US'), true),
        this.fact('器官分区', 'ORGAN SEGMENTS', '叶 · 叶纹 · 花 · 唇瓣', false),
        this.fact('识别结果', 'RESULT', SPECIES.cn, false)
      );
    }
    // group 2: leaf form
    {
      const g = this.group(body, S3.stages[1]);
      S3.leaf.forEach((f) => g.append(this.fact(f.cn, f.en, null, false, 'check')));
      const shapes = s('svg', { class: 's3-shapes', viewBox: '0 0 360 90', width: 360, height: 90 });
      shapes.append(
        s('path', { class: 's3-shape on', d: 'M20,45 C70,8 150,8 175,45 C150,82 70,82 20,45 Z' }),
        s('path', { class: 's3-shape on', d: 'M195,45 C210,14 320,14 340,45 C320,76 210,76 195,45 Z' }),
        s('path', { class: 's3-shape-axis', d: 'M20,45H175M195,45H340' }),
        s('text', { x: 97, y: 88, 'text-anchor': 'middle', class: 's3-shape-t', text: '狭椭圆形' }),
        s('text', { x: 267, y: 88, 'text-anchor': 'middle', class: 's3-shape-t', text: '长圆状椭圆形' })
      );
      g.append(shapes);
    }
    // group 3: leaf texture
    {
      const g = this.group(body, S3.stages[2]);
      const sw = plate.swatches;
      const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
      g.append(this.fact(S3.texture[0].cn, S3.texture[0].en, null, false, 'check'));
      g.append(
        h('div', { class: 's3-swatches' }, [
          h('div', { class: 's3-sw' }, [h('i', { style: { background: rgb(sw.dark) } }), h('span', { text: '深绿 DARK' }), h('b', { class: 'mono', text: `#${sw.dark.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}` })]),
          h('div', { class: 's3-sw' }, [h('i', { style: { background: rgb(sw.light) } }), h('span', { text: '浅绿 LIGHT' }), h('b', { class: 'mono', text: `#${sw.light.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}` })]),
        ])
      );
      const back = this.fact(S3.texture[1].cn, S3.texture[1].en, null, false, 'check');
      back.appendChild(h('span', { class: 's3-ref en', text: 'ARCHIVE REF · 非本次扫描' }));
      g.append(back);
    }
    // group 4: flower
    {
      const g = this.group(body, S3.stages[3]);
      S3.flower.forEach((f) => g.append(this.fact(f.cn, f.en, null, false, 'check')));
    }
    R.appendChild(P);
    cues.add(P, 2.0, { mode: 'right', dur: 0.6 });
    this.groups.forEach((g, i) => {
      const at = ST[i] + 0.7;
      const out = i < 3 ? ST[i + 1] + 0.1 : null;
      cues.add(g, at, { mode: 'fade', dur: 0.4, out, outDur: 0.3 });
      g.querySelectorAll('.s3-fact, .s3-shapes, .s3-swatches').forEach((el, k) => cues.add(el, at + 0.25 + k * 0.28, { mode: 'up', dur: 0.4 }));
      cues.add(g.querySelector('.s3-g-cn'), at, { mode: 'wipe', dur: 0.5 });
    });

    // floating organ labels for the flower stage
    this.flLabels = [
      ['dorsal', '中萼片', 'DORSAL SEPAL', -210, -10],
      ['lip', '唇瓣 · 囊状', 'SACCATE LIP', 60, 70],
      ['petalR', '花瓣', 'PETAL', 40, -70],
    ].map(([k, cn, en, dx, dy]) => {
      const el = h('div', { class: 's3-flabel L-ui' }, [h('span', { class: 'lbl-cn', text: cn }), h('span', { class: 'lbl-en', text: en })]);
      el._k = k;
      el._d = [dx, dy];
      R.appendChild(el);
      return el;
    });
    this.dimLabel = h('div', { class: 's3-dimlabel mono L-ui', text: '花径 Ø 7—8 cm' });
    R.appendChild(this.dimLabel);
    this.objTag = h('div', { class: 's3-objtag mono L-ui', text: 'OBJ-01 · PLANT' });
    R.appendChild(this.objTag);
  }

  group(parent, st) {
    const g = h('div', { class: 's3-g' }, [
      h('div', { class: 's3-g-h' }, [h('span', { class: 's3-g-cn', text: st.cn }), h('span', { class: 's3-g-en en', text: st.en })]),
    ]);
    parent.appendChild(g);
    this.groups.push(g);
    return g;
  }

  fact(cn, en, v, mono, ic) {
    return h('div', { class: 's3-fact' }, [
      ic ? icon(ic, 's3-fact-ic') : h('span', { class: 's3-fact-dot' }),
      h('div', { class: 's3-fact-t' }, [h('span', { class: 's3-fact-cn', text: cn }), h('span', { class: 's3-fact-en en', text: en })]),
      v ? h('span', { class: `s3-fact-v ${mono ? 'mono' : ''}`, text: v }) : null,
    ]);
  }

  render(t) {
    const P = this.plate;
    const cam = plateCam3(t, this.plateData.aspect);
    P.set(cam.x, cam.y, cam.w);
    const enter = ease.outCubic(seg(t, 0, 0.9));
    P.grade({ sat: 0.45, bri: lerp(1.0, 0.93, enter), blur: lerp(3, 0, enter), con: 1.1 });
    const A = PLATE.anchors, F = PLATE.frames;
    const toStage = (u, v) => P.toStage(u, v);

    // which stage
    let k = -1;
    for (let i = 0; i < 4; i++) if (t >= ST[i]) k = i;
    const kInto = k >= 0 ? t - ST[k] : 0;

    // natural-colour spotlight on current organ
    const spots = [
      [0.4, 0.42, 0.26, 0.5],
      [A.leaf[0], A.leaf[1], 0.08, 0.2],
      [A.texture[0], A.texture[1], 0.045, 0.07],
      [0.48, 0.33, 0.17, 0.26],
    ];
    if (k >= 0) {
      const sp = spots[k];
      const prev = spots[Math.max(0, k - 1)];
      const m = ease.inOutCubic(seg(kInto, 0, 0.9));
      const a = k === 0 ? smooth(seg(t, ST[0], 0.8)) * 0.6 : 1;
      P.spot(a, lerp(prev[0], sp[0], m), lerp(prev[1], sp[1], m), lerp(prev[2], sp[2], m), lerp(prev[3], sp[3], m));
    } else P.spot(0);

    // feature scan
    const scanV = lerp(0.05, 1.03, ease.inOutSine(seg(t, 0.3, 2.6)));
    const featA = lerp(1, 0.45, seg(t, ST[1], 1));
    const hiBox = k >= 1 ? [F.plant, F.leaf, F.texture, F.flower][k] : null;
    this.feat.draw(this.plateData.points, toStage, {
      scanV,
      alpha: featA,
      t,
      hiFn: hiBox ? (p) => (p.u > hiBox[0] && p.u < hiBox[0] + hiBox[2] && p.v > hiBox[1] && p.v < hiBox[1] + hiBox[3] ? 0.8 : 0) : null,
    });

    // plant outline
    const poly = PLATE.plantPoly.map(([u, v]) => toStage(u, v));
    attr(this.outline, { d: 'M' + poly.map((q) => q.map((n) => n.toFixed(1)).join(',')).join('L') + 'Z', pathLength: 1, 'stroke-dasharray': '1 2', 'stroke-dashoffset': (1 - ease.inOutCubic(seg(t, 1.6, 1.6))).toFixed(4) });
    css(this.outline, { opacity: String(lerp(0.9, 0.18, seg(t, ST[1], 0.8))) });

    // brackets per organ
    const frames = [F.plant, F.leaf, F.texture, F.flower].map((f) => P.rect(f));
    this.brk.forEach((b, i) => {
      if (t < ST[i]) return b.set(frames[i], { alpha: 0 });
      const lp = ease.outExpo(seg(t, ST[i], 0.8));
      const active = i === k;
      const al = active ? 1 : i === 0 ? 0.28 : 0.22;
      b.set(lockRect(frames[i], lp, 0.3), { alpha: seg(t, ST[i], 0.2) * al, inner: active ? lp * 0.5 : 0 });
    });
    css(this.objTag, {
      opacity: String(seg(t, ST[0] + 0.4, 0.3) * (k === 0 ? 1 : 0.3)),
      transform: `translate(${frames[0].x.toFixed(1)}px, ${(frames[0].y - 26).toFixed(1)}px)`,
    });

    // texture grid
    const tr = frames[2];
    let gd = '';
    for (let i = 1; i < 6; i++) gd += `M${(tr.x + (tr.w * i) / 6).toFixed(1)},${tr.y.toFixed(1)}v${tr.h.toFixed(1)}M${tr.x.toFixed(1)},${(tr.y + (tr.h * i) / 6).toFixed(1)}h${tr.w.toFixed(1)}`;
    attr(this.texGrid, { d: gd });
    css(this.texGrid, { opacity: String(seg(t, ST[2] + 0.5, 0.5) * (k === 2 ? 0.8 : 0.15)) });

    // reticles + leaders to the inset in the right panel
    const anchors = [[0.42, 0.62], A.leaf, A.texture, A.lip].map(([u, v]) => toStage(u, v));
    const insetY = 268, busX = 1430, panelX = 1462;
    const viaY = [null, 760, 760, null];
    this.ret.forEach((r, i) => {
      const [x, y] = anchors[i];
      const show = i >= 1 && t >= ST[i];
      const p = ease.outBack(seg(t, ST[i] + 0.25, 0.5));
      const active = i === k;
      r.set(x, y, { alpha: show ? p * (active ? 1 : 0.3) : 0, scale: 0.6 + 0.4 * p, rot: t * 40 });
      const L = this.lead[i];
      if (!show) return L.set([[x, y], [x, y]], 0, 0);
      const pts = viaY[i]
        ? [[x, y], [x, viaY[i]], [busX, viaY[i]], [busX, insetY], [panelX, insetY]]
        : [[x, y], [busX, y], [busX, insetY], [panelX, insetY]];
      L.set(pts, ease.inOutCubic(seg(t, ST[i] + 0.5, 0.8)), active ? 1 : 1 - seg(t, ST[i + 1] ?? 99, 0.4));
    });

    // flower stage: organ reticles, labels, diameter line
    const fk = seg(t, ST[3] + 1.4, 0.5);
    ['dorsal', 'lip', 'petalR'].forEach((key, i) => {
      const [x, y] = toStage(A[key][0], A[key][1]);
      const p = ease.outBack(seg(t, ST[3] + 1.2 + i * 0.35, 0.5));
      if (key !== 'lip') this.flowerRets[i].set(x, y, { alpha: p * 0.9, scale: 0.55, rot: -t * 30 });
      else this.flowerRets[i].set(x, y, { alpha: 0 });
      const el = this.flLabels[i];
      css(el, { opacity: String(seg(t, ST[3] + 1.4 + i * 0.35, 0.4)), transform: `translate(${(x + el._d[0]).toFixed(1)}px, ${(y + el._d[1]).toFixed(1)}px)` });
    });
    const tl = toStage(...A.petalTipL), trr = toStage(...A.petalTipR);
    const dy = Math.max(tl[1], trr[1]) + 70;
    const dp = ease.inOutCubic(seg(t, ST[3] + 2.6, 0.8));
    const mx = (tl[0] + trr[0]) / 2;
    attr(this.dimLine, {
      d: `M${tl[0].toFixed(1)},${(tl[1] + 10).toFixed(1)}V${(dy + 8).toFixed(1)}M${trr[0].toFixed(1)},${(trr[1] + 10).toFixed(1)}V${(dy + 8).toFixed(1)}M${lerp(mx, tl[0], dp).toFixed(1)},${dy.toFixed(1)}H${lerp(mx, trr[0], dp).toFixed(1)}M${tl[0].toFixed(1)},${(dy - 5).toFixed(1)}v10M${trr[0].toFixed(1)},${(dy - 5).toFixed(1)}v10`,
    });
    css(this.dim, { opacity: String(seg(t, ST[3] + 2.6, 0.3)) });
    css(this.dimLabel, { opacity: String(seg(t, ST[3] + 3.0, 0.4)), transform: `translate(${(mx - 70).toFixed(1)}px, ${(dy + 6).toFixed(1)}px)` });

    // inset: one real scan photo per stage, cross-faded, slow push-in
    const ki = Math.max(0, k);
    const pi = Math.max(0, ki - 1);
    const m = ease.inOutCubic(seg(t, ST[ki] + 0.5, 0.9));
    const push = 1 + 0.08 * ease.inOutSine(seg(t, ST[ki] + 0.5, (ST[ki + 1] ?? END) - ST[ki]));
    this.inset.show(ki, pi, m, { zoom: push, scan: seg(t, ST[ki] + 0.5, 1.2) });
    this.inset.el.classList.toggle('mono-mode', ki === 0 && t < ST[0] + 1.6);
    const mag = [1.0, 2.6, 4.2, 3.0][ki] * push;
    txt(this.insetCap, `MAG ×${mag.toFixed(1)}   SRC SCAN-0${ki + 1}   ${['WHOLE PLANT', 'LEAF', 'TEXTURE', 'FLOWER'][ki]}`);
    txt(this.stageNo, `${String(ki + 1).padStart(2, '0')} / 04`);

    // sequence index
    this.idxRows.forEach((row, i) => {
      const state = t < ST[i] ? 'wait' : i === k && t < END ? 'run' : 'done';
      row.className = `si-row si-${state}`;
      txt(row._m, state === 'run' ? ['▖', '▘', '▝', '▗'][Math.floor(t * 8) % 4] + ' ANALYSING' : state === 'done' ? '✓ INDEXED' : '— —');
    });

    // identity: SAMPLE -> SPECIMEN (archive created), status
    const arch = t >= 4.4;
    const flick = t >= 4.4 && t < 4.75 && hash(Math.floor(t * 30)) > 0.5;
    txt(this.id.kind, arch && !flick ? 'SPECIMEN' : 'SAMPLE');
    this.id.el.classList.toggle('flash', t >= 4.4 && t < 5.2);
    const statusTxt = t < 4.4 ? ['STATUS: SCANNING', '状态：扫描中'] : t < END ? ['STATUS: INDEXING', '状态：建档中'] : ['STATUS: ARCHIVED', '状态：已归档'];
    txt(this.id.status.querySelector('.stag-en'), statusTxt[0]);
    txt(this.id.status.querySelector('.stag-cn'), statusTxt[1]);

    const mv = 0.986 * ease.outCubic(seg(t, 3.4, 1.2));
    txt(this.matchVal, mv.toFixed(3));
    this.matchBar.set(mv);

    this.cues.render(t);
    return { top: true, rails: true, alpha: seg(t, 0.2, 0.8), flash: (1 - seg(t, 0, 0.5)) * 0.35 };
  }
}
