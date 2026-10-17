// System chrome shared by every shot: top info bar, side rails, bottom strip, film FX.
import { h, s, css, txt, attr, stageSvg, canvas2d } from '../core/dom.js';
import { clamp, hash, clockAdd, pad } from '../core/util.js';
import { rulerPath } from './hud.js';
import { SYSTEM, STORY } from '../content.js';

export function logoSvg(size = 34) {
  return s('svg', { class: 'logo', viewBox: '-20 -20 40 40', width: size, height: size }, [
    s('polygon', { points: '0,-18 15.6,-9 15.6,9 0,18 -15.6,9 -15.6,-9', class: 'logo-hex' }),
    s('path', { d: 'M0,10 C-7,4 -7,-5 0,-11 C7,-5 7,4 0,10 Z M0,10 V-6', class: 'logo-leaf' }),
    s('circle', { r: 2, cy: 10, class: 'logo-dot' }),
  ]);
}

export class GlobalHud {
  constructor(stage) {
    this.root = h('div', { class: 'ghud L-ui' });
    // top bar
    this.phaseEn = h('span', { class: 'tb-phase-en' });
    this.phaseCn = h('span', { class: 'tb-phase-cn' });
    this.clock = h('span', { class: 'tb-clock' });
    this.date = h('span', { class: 'tb-date', text: STORY.date });
    this.link = h('span', { class: 'tb-link' }, [h('i'), 'LINK']);
    this.sync = h('span', { class: 'tb-sync' });
    this.top = h('div', { class: 'topbar' }, [
      h('div', { class: 'tb-left' }, [
        logoSvg(),
        h('div', { class: 'tb-brand' }, [
          h('div', { class: 'tb-name' }, [h('b', { text: SYSTEM.short }), ' ', SYSTEM.name]),
          h('div', { class: 'tb-sub', text: `${SYSTEM.version} // ${SYSTEM.node} // ${SYSTEM.project}` }),
        ]),
      ]),
      h('div', { class: 'tb-center' }, [this.phaseEn, this.phaseCn]),
      h('div', { class: 'tb-right' }, [this.date, this.clock, this.sync, this.link]),
    ]);
    // svg chrome: rule under top bar, rails, bottom strip
    this.svg = stageSvg('ghud-svg');
    this.topRule = s('g', { class: 'g-toprule' }, [
      s('path', { d: 'M48,80H1872', class: 'g-base' }),
      s('path', { d: rulerPath(1824, 12, 10, 3, 7).replace(/M(\d+(\.\d+)?),0/g, (m, a) => `M${48 + Number(a)},80`), class: 'g-ticks' }),
    ]);
    this.topMark = s('path', { class: 'g-mark', d: 'M-6,74L0,80L6,74' });
    this.railL = this.rail(28, 'L');
    this.railR = this.rail(1892, 'R');
    this.bottom = s('g', { class: 'g-bottom' }, [
      s('path', { d: 'M48,1046H760M1160,1046H1872', class: 'g-base' }),
      s('path', { d: 'M760,1046l8,-6h384l8,6', class: 'g-base' }),
    ]);
    this.svg.append(this.topRule, this.topMark, this.railL.g, this.railR.g, this.bottom);
    this.bottomTxtL = h('div', { class: 'g-btxt g-btxt-l' });
    this.bottomTxtR = h('div', { class: 'g-btxt g-btxt-r' });
    this.root.append(this.svg, this.top, this.bottomTxtL, this.bottomTxtR);
    stage.appendChild(this.root);

    // FX layer
    this.fx = h('div', { class: 'gfx L-fx' });
    this.grain = canvas2d(480, 270, 'grain', 1);
    this.fx.append(this.grain.el, h('div', { class: 'scanlines' }), h('div', { class: 'vignette' }));
    this.flash = h('div', { class: 'flash' });
    this.fx.append(this.flash);
    stage.appendChild(this.fx);
    this.grainImg = this.grain.ctx.createImageData(480, 270);
  }

  rail(x, side) {
    const g = s('g', { class: `g-rail rail-${side}`, transform: `translate(${x},0)` });
    const dir = side === 'L' ? 1 : -1;
    let d = '';
    for (let y = 120, k = 0; y <= 1000; y += 10, k++) d += `M0,${y}h${dir * (k % 5 === 0 ? 9 : 4)}`;
    g.append(s('path', { d, class: 'g-ticks' }), s('path', { d: 'M0,110V1010', class: 'g-base' }));
    g.append(s('path', { d: `M${dir * 2},528l${dir * 10},12l${-dir * 10},12z`, class: 'g-arrow' }));
    const mark = s('path', { class: 'g-mark', d: `M${dir * 14},-5l${-dir * 8},5l${dir * 8},5` });
    g.append(mark);
    return { g, mark };
  }

  // o: { top, rails, bottom, phase:{en,cn}, clockIdx, lt, t, alpha, fx }
  render(o) {
    const a = clamp(o.alpha ?? 1);
    css(this.top, { opacity: String((o.top ? 1 : 0) * a) });
    css(this.topRule, { opacity: String((o.top ? 1 : 0) * a) });
    css(this.topMark, { opacity: String((o.top ? 1 : 0) * a) });
    css(this.railL.g, { opacity: String((o.rails ? 0.9 : 0) * a) });
    css(this.railR.g, { opacity: String((o.rails ? 0.9 : 0) * a) });
    const bo = (o.bottom ?? o.rails ? 1 : 0) * a;
    css(this.bottom, { opacity: String(bo) });
    css(this.bottomTxtL, { opacity: String(bo) });
    css(this.bottomTxtR, { opacity: String(bo) });

    if (o.phase) {
      txt(this.phaseEn, o.phase.en);
      txt(this.phaseCn, o.phase.cn);
    }
    const clock = clockAdd(STORY.clock[o.clockIdx ?? 0], o.clockOffset ?? o.lt);
    txt(this.clock, clock);
    const sy = 99.1 + Math.sin(o.t * 0.7) * 0.3 + hash(Math.floor(o.t * 4)) * 0.2;
    txt(this.sync, `SYNC ${sy.toFixed(1)}%`);

    const mx = 48 + ((o.t * 23) % 1824);
    attr(this.topMark, { transform: `translate(${mx.toFixed(1)},0)` });
    attr(this.railL.mark, { transform: `translate(0,${(560 + Math.sin(o.t * 0.31) * 380).toFixed(1)})` });
    attr(this.railR.mark, { transform: `translate(0,${(560 + Math.cos(o.t * 0.27) * 380).toFixed(1)})` });
    txt(this.bottomTxtL, `SESSION 3F2A-${pad(o.shot + 1, 2)} // ${o.phase ? o.phase.en : ''}`);
    txt(this.bottomTxtR, `T+${o.lt.toFixed(2).padStart(6, '0')}  //  REC ●`);

    // film grain: deterministic per frame index
    const fxOn = o.fx ?? 1;
    css(this.fx, { opacity: String(fxOn) });
    if (fxOn > 0) this.drawGrain(Math.floor(o.t * 24));
    css(this.flash, { opacity: String(clamp(o.flash ?? 0)) });
  }

  drawGrain(frame) {
    if (frame === this._lastGrain) return;
    this._lastGrain = frame;
    const d = this.grainImg.data;
    let seed = (frame * 2654435761) >>> 0;
    for (let i = 0; i < d.length; i += 4) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const v = (seed >>> 0) & 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 20;
    }
    this.grain.ctx.putImageData(this.grainImg, 0, 0);
  }
}
