// SHOT 2 — RECONSTRUCTION COMPLETE / 重构完成
// Minimal: loading line stops, locator frame closes, completion holds, enter VR.
import { h, s, css, txt, attr, stageSvg } from '../core/dom.js';
import { Cues } from '../core/cues.js';
import { clamp, lerp, seg, ease, smooth } from '../core/util.js';
import { Brackets, lerpRect } from '../components/hud.js';
import { PlateView } from '../components/plateView.js';
import { S2, S1 } from '../content.js';
import { plateCam3 } from './shot3.js';

export default class Shot2 {
  constructor() {
    this.title = '重构完成';
    this.duration = 4.6;
    this.phase = { en: 'PHASE 02 · COMPLETE', cn: '重构完成' };
    this.root = h('div', { class: 'shot s2' });
  }

  init({ plate }) {
    const R = this.root;
    const cues = (this.cues = new Cues());
    this.bg = h('div', { class: 'bg-grid s2-bg L-bg' });
    R.appendChild(this.bg);

    // VR environment behind the expanding frame
    this.plate = new PlateView(plate);
    this.plateWrap = h('div', { class: 's2-plate' }, [this.plate.el]);
    R.appendChild(this.plateWrap);

    const svg = stageSvg('L-ui');
    R.appendChild(svg);
    this.brk = new Brackets(svg, { arm: 26 });
    this.line = s('path', { class: 's2-line', d: 'M360,760H1560' });
    this.lineFill = s('path', { class: 's2-line-fill' });
    this.lineHead = s('path', { class: 's2-line-head' });
    svg.append(this.line, this.lineFill, this.lineHead);

    this.group = h('div', { class: 's2-group L-ui' });
    const en = h('div', { class: 's2-en disp', text: S2.en });
    const cn = h('div', { class: 's2-cn', text: S2.cn });
    const scope = h('div', { class: 's2-scope' }, [h('span', { text: S2.scopeCn }), h('i'), h('span', { class: 'en', text: S2.scopeEn })]);
    this.group.append(en, cn, scope);
    R.appendChild(this.group);
    cues.add(en, 1.25, { mode: 'decode', dur: 0.75 });
    cues.add(cn, 1.45, { mode: 'wipe', dur: 0.55 });
    cues.add(scope, 2.15, { mode: 'fade', dur: 0.6 });

    this.pct = h('div', { class: 's2-pct mono L-ui' });
    this.sample = h('div', { class: 's2-sample mono L-ui', text: `${S1.sampleEn} · ${S1.sampleCn}` });
    R.append(this.pct, this.sample);
  }

  render(t) {
    // 1. loading line completes and stops (continues from shot 1 at 96.4%)
    const lp = lerp(0.964, 1, ease.outCubic(seg(t, 0, 0.8)));
    const x1 = lerp(360, 1560, lp);
    attr(this.lineFill, { d: `M360,760H${x1.toFixed(1)}` });
    attr(this.lineHead, { d: `M${x1.toFixed(1)},752V768` });
    const done = t >= 0.8;
    const lineA = 1 - seg(t, 3.5, 0.3);
    css(this.lineHead, { opacity: String((done ? (Math.floor(t * 6) % 2 ? 1 : 0.3) * (t < 1.3 ? 1 : 0) : 1) * lineA) });
    css(this.line, { opacity: String(0.5 * lineA) });
    css(this.lineFill, { opacity: String(lineA) });
    txt(this.pct, `${(lp * 100).toFixed(1)}%`);
    css(this.pct, { opacity: String(lineA), transform: `translate(${(x1 + 12).toFixed(1)}px, 750px)` });

    // 2. locator frame closes onto the message group, 4. then opens into VR
    const loose = { x: 300, y: 250, w: 1320, h: 580 };
    const tight = { x: 560, y: 382, w: 800, h: 290 };
    const full = { x: -40, y: -40, w: 2000, h: 1160 };
    const cp = ease.inOutCubic(seg(t, 0.6, 0.8));
    const close = ease.outCubic(seg(t, 1.0, 0.5));
    const open = ease.inOutCubic(seg(t, 3.5, 0.9));
    let r = lerpRect(loose, tight, cp);
    r = lerpRect(r, full, open);
    this.brk.set(r, { close: close * (1 - open), alpha: seg(t, 0.1, 0.3), inner: close * 0.5 * (1 - open) });

    // VR plate revealed inside the opening frame
    const reveal = open;
    css(this.plateWrap, {
      clipPath: `inset(${r.y.toFixed(1)}px ${(1920 - r.x - r.w).toFixed(1)}px ${(1080 - r.y - r.h).toFixed(1)}px ${r.x.toFixed(1)}px)`,
      opacity: String(reveal > 0 ? 1 : 0),
    });
    const cam = plateCam3(0, this.plate.plate.aspect);
    this.plate.set(cam.x, cam.y, cam.w);
    this.plate.grade({ sat: lerp(0.2, 0.35, reveal), bri: lerp(0.3, 0.66, reveal), blur: lerp(14, 3, reveal), tint: 1 });
    this.plate.spot(0);
    css(this.bg, { opacity: String(1 - open) });

    // 3. message holds, then dissolves as we enter
    css(this.group, { opacity: String(1 - seg(t, 3.55, 0.35)), transform: `scale(${lerp(1, 1.08, open).toFixed(4)})` });
    css(this.sample, { opacity: String(seg(t, 0.4, 0.4) * (1 - open)), transform: `translate(${r.x.toFixed(1)}px, ${(r.y - 24).toFixed(1)}px)` });

    this.cues.render(t);
    const flash = seg(t, 3.85, 0.45) * (1 - seg(t, 4.3, 0.3)) * 0.85;
    return { top: false, rails: false, bottom: false, flash, alpha: 1 };
  }
}
