// SHOT 7 — THE OBSERVER IS REGISTERED AS A SPECIMEN / 主角被登记为样本
// Re-uses shot 3's archive grammar: same identity strip position, same scan
// brackets, same reconstruction stages. Reveal: image -> SPECIMEN 000 -> HUMAN -> ACTIVE.
import { h, s, css, txt, attr, stageSvg, canvas2d } from '../core/dom.js';
import { Cues } from '../core/cues.js';
import { clamp, lerp, seg, ease, smooth, hash, hash2, fbm1 } from '../core/util.js';
import { Brackets, lerpRect, lockRect, panel, field, icon, statusTag } from '../components/hud.js';
import { Trace, Radar, tickBar, ecg } from '../components/charts.js';
import { idBar } from '../components/idbar.js';
import { loopVideo } from '../core/loopVideo.js';
import { S7 } from '../content.js';

const HW = 846, HH = 720;
// face landmarks in HumanMovement.mp4 source px (834 × 1112); the clip is
// width-fitted and top-aligned in the portrait, so px scale by HW / 834.
const VID_W = 834;
const LANDMARKS = {
  top: [415, 60], brow: [415, 195], eyeL: [375, 215], eyeR: [455, 215], nose: [415, 268],
  cheekL: [325, 265], cheekR: [505, 265], mouthL: [385, 305], mouthR: [448, 305],
  jawL: [335, 315], jawR: [497, 315], chin: [415, 345],
};
const PORTRAIT_CENTER = { x: 490, y: 190, w: 940, h: 800 };
const PORTRAIT_LEFT = { x: 48, y: 196, w: 552, h: 470 };
const T = { id: 2.7, human: 3.5, active: 4.3, move: 5.4, left: 6.6, bio: 7.4, tag: 10.4, match: 12.4, radar: 14.0, log: 15.8, footer: 18.4 };

function fingerprint(w, hh) {
  const c = canvas2d(w, hh, 's7-fp', 1);
  const img = c.ctx.createImageData(w, hh);
  for (let y = 0; y < hh; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x - w / 2) / (w * 0.42), ny = (y - hh * 0.56) / (hh * 0.46);
      const inside = nx * nx + ny * ny * (ny < 0 ? 0.85 : 1.1) < 1;
      if (!inside) continue;
      const cx = (x - w * 0.5) / w, cy = (y - hh * 0.5) / hh;
      // loop pattern: distorted concentric field
      const r = Math.sqrt(cx * cx * 1.4 + (cy + 0.05) * (cy + 0.05) * (cy < -0.05 ? 0.6 : 1.6));
      const warp = 0.035 * Math.sin(cx * 9 + cy * 4) + 0.02 * fbm1(cx * 12 + cy * 7, 3);
      const v = (r + warp) * 38;
      const ridge = Math.abs(Math.sin(v * Math.PI));
      const brk = hash2(Math.floor(v), Math.floor(Math.atan2(cy, cx) * 6)) < 0.08;
      if (ridge > 0.55 && !brk) {
        const edge = 1 - Math.max(0, nx * nx + ny * ny - 0.75) * 4;
        const i = (y * w + x) * 4;
        img.data[i] = 150;
        img.data[i + 1] = 230;
        img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(255 * clamp(edge) * (ridge - 0.55) * 2.2);
      }
    }
  c.ctx.putImageData(img, 0, 0);
  return c;
}

export default class Shot7 {
  constructor() {
    this.title = '样本登记';
    this.duration = 22;
    this.phase = { en: 'PHASE 06 · SPECIMEN REGISTRY', cn: '样本登记' };
    this.root = h('div', { class: 'shot s7' });
  }

  init() {
    const R = this.root;
    const cues = (this.cues = new Cues());
    R.appendChild(h('div', { class: 'bg-grid L-bg' }));

    // ---- portrait (looping footage, scanned in) with face overlay, inside one transformed wrapper
    this.vid = loopVideo(S7.video);
    this.vid.el.classList.add('s7-video');
    this.portrait = h('div', { class: 's7-portrait L-plate' });
    css(this.portrait, { width: HW + 'px', height: HH + 'px' });
    this.vidTint = h('div', { class: 's7-video-tint' });
    this.vidScan = h('div', { class: 's7-video-scan' });
    this.faceSvg = s('svg', { class: 's7-face', viewBox: `0 0 ${HW} ${HH}`, width: HW, height: HH });
    this.faceWire = s('path', { class: 's7-face-wire' });
    this.faceDots = s('g', { class: 's7-face-dots' });
    this.faceSvg.append(this.faceWire, this.faceDots);
    this.portrait.append(h('div', { class: 's7-portrait-bg' }), this.vid.el, this.vidTint, this.vidScan, this.faceSvg);
    R.appendChild(this.portrait);
    this.lmNames = Object.keys(LANDMARKS);
    this.lmDots = this.lmNames.map(() => {
      const c = s('rect', { width: 6, height: 6, x: -3, y: -3 });
      this.faceDots.appendChild(c);
      return c;
    });
    this.faceLbl = h('div', { class: 's7-face-lbl mono L-ui', text: 'FACE MESH · 面部扫描' });
    R.appendChild(this.faceLbl);

    const svg = (this.svg = stageSvg('L-ui'));
    R.appendChild(svg);
    this.brk = new Brackets(svg, { arm: 34, ticks: true });
    this.objTag = h('div', { class: 's3-objtag mono L-ui' });
    R.appendChild(this.objTag);

    // ---- identity strip (same position as SPECIMEN 017 in shot 3)
    this.id = idBar({ kind: 'SPECIMEN', no: '000', cn: S7.specimenCn, classEn: S7.humanEn, classCn: S7.humanCn, statusEn: S7.statusEn, statusCn: S7.statusCn });
    css(this.id.el, { left: '48px', top: '100px' });
    R.appendChild(this.id.el);
    cues.add(this.id.el, T.id - 0.2, { mode: 'wipe', dur: 0.5 });
    cues.add(this.id.kind, T.id, { mode: 'decode', dur: 0.4 });
    cues.add(this.id.no, T.id + 0.1, { mode: 'decode', dur: 0.6 });
    cues.add(this.id.cn, T.id + 0.4, { mode: 'up', dur: 0.4 });
    cues.add(this.id.cls, T.human, { mode: 'flash', dur: 0.4 });
    cues.add(this.id.status, T.active, { mode: 'left', dur: 0.4 });
    this.tagTime = h('div', { class: 's7-tagtime mono L-ui' }, [h('span', { text: 'TAG TIME · 标记时间' }), h('b', { text: '2026-10-08 14:32:17' })]);
    R.appendChild(this.tagTime);
    cues.add(this.tagTime, T.active + 0.3, { mode: 'fade', dur: 0.5 });

    // ---- left: basic profile
    const P = panel({ x: 48, y: 678, w: 552, title: { en: 'ID REGISTRY', cn: '身份档案' }, idx: 'A', tag: 'SRC · REGISTRY', cls: 'L-ui s7-prof' });
    const pr = S7.profile;
    const mk = (f, cls = '') => {
      const el = h('div', { class: `s7-f ${cls}` }, [h('span', { class: 's7-f-k' }, [h('i', { text: f.cn }), h('em', { class: 'en', text: f.en })]), h('span', { class: 's7-f-v', text: f.v })]);
      return el;
    };
    const rows = [
      h('div', { class: 's7-frow' }, [mk(pr[0], 'unknown wide')]),
      h('div', { class: 's7-frow three' }, [mk(pr[1]), mk(pr[2]), mk(pr[3])]),
      h('div', { class: 's7-frow' }, [mk(pr[4], 'wide')]),
      h('div', { class: 's7-frow' }, [mk(pr[5], 'wide')]),
      h('div', { class: 's7-frow' }, [mk(pr[6], 'wide sys')]),
    ];
    P._body.append(...rows);
    R.appendChild(P);
    cues.add(P, T.left, { mode: 'left', dur: 0.5 });
    rows.forEach((r, i) => cues.add(r, T.left + 0.3 + i * 0.3, { mode: 'up', dur: 0.4 }));
    rows.forEach((r) => r.querySelectorAll('.s7-f-v').forEach((v, k) => cues.add(v, T.left + 0.35 + rows.indexOf(r) * 0.3 + k * 0.1, { mode: 'decode', dur: 0.5 })));

    // ---- middle top: biometrics
    const B = panel({ x: 624, y: 196, w: 666, title: { en: 'BIOMETRICS', cn: '生物特征' }, idx: 'B', tag: 'SRC · VR HEADSET SENSORS', cls: 'L-ui s7-bio' });
    this.extract = h('div', { class: 's7-extract' }, [h('span', { class: 's7-extract-dot' }), h('span', { class: 's7-extract-t', text: '生物特征提取中……' }), h('span', { class: 's7-extract-en en', text: 'EXTRACTING BIOMETRICS' })]);
    this.fp = fingerprint(132, 172);
    const fpWrap = h('div', { class: 's7-fpwrap' }, [this.fp.el, h('div', { class: 's7-fp-scan' }), h('div', { class: 's7-fp-lbl mono', text: 'FINGERPRINT · 指纹' })]);
    this.fpWrap = fpWrap;
    this.metrics = S7.bio.map((b, i) => {
      const tr = new Trace(230, 40, { grid: false, lw: 1.3 });
      const val = h('span', { class: 's7-m-v mono', text: b.v });
      const row = h('div', { class: 's7-m' }, [
        h('div', { class: 's7-m-k' }, [h('span', { text: b.cn }), h('span', { class: 'en', text: b.en })]),
        h('div', { class: 's7-m-val' }, [val, h('span', { class: 's7-m-u', text: b.unit })]),
        tr.el,
      ]);
      row._tr = tr;
      return row;
    });
    const mcol = h('div', { class: 's7-mcol' }, this.metrics);
    this.trend = canvas2d(620, 74, 's7-trend', 1.5);
    const trendBox = h('div', { class: 's7-trendbox' }, [
      h('div', { class: 's7-trend-h' }, [h('span', { text: '长期监测趋势' }), h('span', { class: 'en', text: 'LONG-TERM TREND · HR / TEMP / EEG' }), h('span', { class: 's7-legend' }, [h('i', { class: 'ref' }), '常规波动 REF', h('i', { class: 'spc' }), 'SPECIMEN 000'])]),
      this.trend.el,
    ]);
    B._body.append(this.extract, h('div', { class: 's7-biorow' }, [fpWrap, mcol]), trendBox);
    R.appendChild(B);
    cues.add(B, T.left + 0.1, { mode: 'down', dur: 0.5 });
    cues.add(this.extract, T.bio, { mode: 'fade', dur: 0.3 });
    cues.add(fpWrap, T.bio + 0.2, { mode: 'fade', dur: 0.4 });
    this.metrics.forEach((m, i) => cues.add(m, T.bio + 0.6 + i * 0.35, { mode: 'left', dur: 0.4 }));
    cues.add(trendBox, T.bio + 2.0, { mode: 'up', dur: 0.5 });

    // ---- middle bottom: tag result + reason
    const G = panel({ x: 624, y: 612, w: 666, title: { en: 'TAG RESULT', cn: '标记结果' }, idx: 'C', cls: 'L-ui s7-tag' });
    const line = h('div', { class: 's7-tagline' }, [h('span', { class: 's7-tl-pre', text: S7.tagLine.pre }), h('span', { class: 's7-tl-id', text: S7.tagLine.id + '。' })]);
    const reason = h('div', { class: 's7-reason' }, [
      icon('warn', 's7-warn'),
      h('div', {}, [h('div', { class: 's7-reason-k' }, [h('span', { text: '标记原因' }), h('span', { class: 'en', text: 'REASON' })]), h('div', { class: 's7-reason-t', text: S7.reason })]),
    ]);
    G._body.append(line, reason);
    R.appendChild(G);
    cues.add(G, T.left + 0.2, { mode: 'up', dur: 0.5 });
    cues.add(line.firstChild, T.tag, { mode: 'type', dur: 0.6 });
    cues.add(line.lastChild, T.tag + 0.6, { mode: 'decode', dur: 0.8 });
    cues.add(reason, T.tag + 1.4, { mode: 'fade', dur: 0.3 });
    cues.add(reason.querySelector('.s7-reason-t'), T.tag + 1.5, { mode: 'type', dur: 1.4 });

    // ---- right top: specimen-likeness bars
    const M = panel({ x: 1314, y: 196, w: 558, title: { en: 'SPECIMEN FEATURES', cn: '样本化特征' }, idx: 'D', cls: 'L-ui s7-match' });
    M._body.appendChild(h('div', { class: 's7-match-sub' }, [h('span', { text: '与系统样本库判定模型的匹配度' }), h('span', { class: 'en', text: 'MATCH VS. SPECIMEN-LIBRARY MODEL' })]));
    this.matchRows = S7.match.map((m) => {
      const bar = tickBar();
      const v = h('span', { class: 's7-mt-v mono' });
      const row = h('div', { class: 's7-mt' }, [h('div', { class: 's7-mt-k' }, [h('span', { class: 's7-mt-cn', text: m.cn }), h('span', { class: 'en', text: m.en }), v]), bar]);
      row._bar = bar;
      row._v = v;
      row._m = m;
      M._body.appendChild(row);
      return row;
    });
    R.appendChild(M);
    cues.add(M, T.left + 0.3, { mode: 'right', dur: 0.5 });

    // ---- right bottom: radar
    const D = panel({ x: 1314, y: 520, w: 558, title: { en: 'MULTIDIMENSIONAL ANALYSIS', cn: '多维特征分析' }, idx: 'E', tag: 'SCALE 0—1', cls: 'L-ui s7-radar' });
    const rsvg = s('svg', { viewBox: '-260 -136 520 272', width: 520, height: 272, class: 's7-radar-svg' });
    this.radar = new Radar(rsvg, S7.radar, 92);
    D._body.appendChild(rsvg);
    R.appendChild(D);
    cues.add(D, T.left + 0.4, { mode: 'right', dur: 0.5 });

    // ---- bottom: activity timeline
    const A = panel({ x: 48, y: 870, w: 1242, title: { en: 'RECENT ACTIVITY', cn: '近期行为记录' }, idx: 'F', tag: 'TRACKED SINCE 2026-10-07', cls: 'L-ui s7-act' });
    const items = [...S7.activity].reverse();
    const axis = h('div', { class: 's7-axis' });
    this.actItems = items.map((a, i) => {
      const el = h('div', { class: `s7-ev ${a.key ? 'key' : ''}` }, [
        h('span', { class: 's7-ev-dot' }),
        h('div', { class: 's7-ev-t mono', text: a.t.replace('2026-', '') }),
        h('div', { class: 's7-ev-x', text: a.cn }),
      ]);
      axis.appendChild(el);
      return el;
    });
    const nowMark = h('div', { class: 's7-ev now' }, [h('span', { class: 's7-ev-dot' }), h('div', { class: 's7-ev-t mono', text: '10-08 14:32' }), h('div', { class: 's7-ev-x', text: '标记为 SPECIMEN 000' })]);
    axis.appendChild(nowMark);
    A._body.appendChild(axis);
    R.appendChild(A);
    cues.add(A, T.log - 0.4, { mode: 'up', dur: 0.5 });
    this.actItems.forEach((el, i) => cues.add(el, T.log + i * 0.22, { mode: 'up', dur: 0.35, dim: el.classList.contains('key') ? null : T.log + 1.8, dimTo: 0.55 }));
    cues.add(nowMark, T.log + 1.5, { mode: 'up', dur: 0.35 });

    // ---- bottom right: data log
    const L = panel({ x: 1314, y: 870, w: 558, title: { en: 'DATA LOG', cn: '数据日志' }, idx: 'G', cls: 'L-ui s7-log' });
    this.logRows = S7.dataLog.map((d) => {
      const v = h('span', { class: 's7-lg-v mono' });
      const row = h('div', { class: `s7-lg ${d.kind}` }, [h('span', { class: 's7-lg-k', text: d.cn }), d.kind === 'text' ? null : h('div', { class: 's7-lg-bar' }, [h('i')]), v]);
      row._v = v;
      row._d = d;
      row._bar = row.querySelector('.s7-lg-bar i');
      L._body.appendChild(row);
      return row;
    });
    R.appendChild(L);
    cues.add(L, T.log - 0.3, { mode: 'up', dur: 0.5 });

    this.footer = h('div', { class: 's7-footer L-ui', text: S7.footer });
    R.appendChild(this.footer);
    cues.add(this.footer, T.footer, { mode: 'fade', dur: 0.8 });
  }

  render(t) {
    // ---- portrait scan (same stages as the plant: sweep -> contour -> natural surface)
    this.vid.sync();
    const sweep = ease.inOutSine(seg(t, 0.35, 2.3));
    const surf = smooth(seg(t, 1.6, 1.4));
    css(this.vid.el, {
      clipPath: `inset(0 0 ${((1 - sweep) * 100).toFixed(2)}% 0)`,
      filter: `grayscale(${(1 - surf).toFixed(3)}) brightness(${lerp(1.25, 1, surf).toFixed(3)}) contrast(${lerp(1.3, 1.02, surf).toFixed(3)})`,
    });
    css(this.vidTint, { opacity: ((1 - surf) * 0.75).toFixed(3) });
    css(this.vidScan, { opacity: String(seg(t, 0.35, 0.2) * (1 - seg(t, 2.6, 0.3))), transform: `translateY(${(sweep * HH).toFixed(1)}px)` });
    const mv = ease.inOutCubic(seg(t, T.move, T.left - T.move));
    const pr = lerpRect(PORTRAIT_CENTER, PORTRAIT_LEFT, mv);
    css(this.portrait, { transform: `translate(${pr.x.toFixed(1)}px, ${pr.y.toFixed(1)}px) scale(${(pr.w / HW).toFixed(5)})` });

    // brackets: lock on like the plant scan, then follow the portrait
    const lp = ease.outExpo(seg(t, 0.1, 0.8));
    this.brk.set(lockRect({ x: pr.x - 8, y: pr.y - 8, w: pr.w + 16, h: pr.h + 16 }, lp, 0.3), { alpha: seg(t, 0.1, 0.2), inner: 0.5 * lp });
    txt(this.objTag, t < T.human ? 'OBJ-01 · SCANNING' : 'OBJ-01 · HUMAN');
    css(this.objTag, { opacity: String(seg(t, 0.5, 0.3)), transform: `translate(${(pr.x - 8).toFixed(1)}px, ${(pr.y - 34).toFixed(1)}px)` });

    // face landmarks + wire (in canvas px, inside the portrait wrapper)
    const P = {};
    this.lmNames.forEach((n, i) => {
      const [x, y] = LANDMARKS[n].map((c) => (c * HW) / VID_W);
      P[n] = [x, y];
      attr(this.lmDots[i], { transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` });
    });
    const edges = [['eyeL', 'eyeR'], ['eyeL', 'brow'], ['eyeR', 'brow'], ['eyeL', 'nose'], ['eyeR', 'nose'], ['nose', 'mouthL'], ['nose', 'mouthR'], ['mouthL', 'mouthR'], ['mouthL', 'chin'], ['mouthR', 'chin'], ['eyeL', 'cheekL'], ['eyeR', 'cheekR'], ['cheekL', 'jawL'], ['cheekR', 'jawR'], ['jawL', 'chin'], ['jawR', 'chin'], ['cheekL', 'mouthL'], ['cheekR', 'mouthR'], ['brow', 'top']];
    attr(this.faceWire, { d: edges.map(([a, b]) => `M${P[a][0].toFixed(1)},${P[a][1].toFixed(1)}L${P[b][0].toFixed(1)},${P[b][1].toFixed(1)}`).join('') });
    const fa = seg(t, 1.9, 0.6) * lerp(1, 0.35, seg(t, 4.2, 1.2));
    css(this.faceSvg, { opacity: fa.toFixed(3) });
    const nose = P.cheekR;
    const sc = pr.w / HW;
    css(this.faceLbl, { opacity: String(fa), transform: `translate(${(pr.x + (nose[0] + 40) * sc).toFixed(1)}px, ${(pr.y + nose[1] * sc - 10).toFixed(1)}px)` });

    // ---- biometrics
    const fps = seg(t, T.bio + 0.2, 1.6);
    css(this.fpWrap, { '--scan': (fps * 100).toFixed(1) + '%' });
    this.fpWrap.classList.toggle('done', fps >= 1);
    const extracting = t < T.bio + 2.6;
    txt(this.extract.querySelector('.s7-extract-t'), extracting ? '生物特征提取中' + '……'.slice(0, 1 + (Math.floor(t * 3) % 2)) : '生物特征提取完成');
    this.extract.classList.toggle('done', !extracting);
    const fns = [
      (x) => ecg(x * 1.2),
      (x) => 0.5 + 0.02 * Math.sin(x * 0.7),
      (x) => 0.5 + 0.05 * (fbm1(x * 3.0, 11) - 0.5) + 0.02 * Math.sin(x * 9),
      (x) => 0.32 + 0.025 * (fbm1(x * 1.5, 23) - 0.5),
    ];
    this.metrics.forEach((m, i) => m._tr.draw(fns[i], t * 0.9 - 2, 2.5, { reveal: seg(t, T.bio + 0.7 + i * 0.35, 0.8) }));
    this.drawTrend(t, seg(t, T.bio + 2.1, 1.4));

    // ---- matching bars
    this.matchRows.forEach((row, i) => {
      const p = ease.outCubic(seg(t, T.match + i * 0.3, 1.0));
      const v = row._m.v * p;
      row._bar.set(v / 100);
      txt(row._v, t < T.match + i * 0.3 ? '—' : `${v.toFixed(0)}%`);
    });
    this.radar.set(ease.outCubic(seg(t, T.radar, 1.6)), seg(t, T.radar, 1.6));

    // ---- data log: different tasks, different rates
    const rates = [[T.log, 1.4], [T.log + 0.3, 2.6], [T.log + 0.6, 3.6]];
    this.logRows.forEach((row, i) => {
      const d = row._d;
      if (d.kind === 'text') {
        txt(row._v, t < T.log + 1.0 + i * 0.2 ? '' : d.v);
        return;
      }
      const [a, dur] = rates[i];
      const p = ease.inOutSine(seg(t, a, dur));
      const v = Math.floor(d.v * p);
      const frac = d.kind === 'ratio' ? v / d.of : v / 100;
      css(row._bar, { width: (frac * 100).toFixed(2) + '%' });
      txt(row._v, d.kind === 'ratio' ? `${v} / ${d.of}` : `${v}%`);
    });

    this.cues.render(t);
    return { top: true, rails: true, bottom: false, alpha: seg(t, 0, 0.6) };
  }

  drawTrend(t, reveal) {
    const { ctx, w, h: hh } = this.trend;
    ctx.clearRect(0, 0, w, hh);
    ctx.strokeStyle = 'rgba(111,231,255,0.08)';
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const x = Math.round((w * i) / 6) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hh - 12);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(197,209,216,0.35)';
    ctx.font = '9px JetBrains Mono';
    ['T-90D', 'T-75D', 'T-60D', 'T-45D', 'T-30D', 'T-15D', 'NOW'].forEach((l, i) => ctx.fillText(l, Math.min(w - 26, (w * i) / 6 + 2), hh - 2));
    const n = Math.floor(w * reveal);
    // reference band: ordinary day-to-day variability (qualitative)
    ctx.fillStyle = 'rgba(160,180,190,0.08)';
    ctx.beginPath();
    for (let x = 0; x <= n; x += 2) ctx.lineTo(x, 12 + 10 * fbm1(x * 0.05, 5));
    for (let x = n; x >= 0; x -= 2) ctx.lineTo(x, 50 + 8 * fbm1(x * 0.05, 9));
    ctx.closePath();
    ctx.fill();
    // three specimen series: unnaturally flat
    const ys = [26, 32, 38];
    const cols = ['#6fe7ff', 'rgba(234,255,255,0.8)', 'rgba(111,231,255,0.6)'];
    ys.forEach((y0, k) => {
      ctx.strokeStyle = cols[k];
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= n; x += 2) {
        const y = y0 + 0.6 * Math.sin(x * 0.21 + k) * (hash(x * 0.37 + k) * 0.5 + 0.5);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
  }
}
