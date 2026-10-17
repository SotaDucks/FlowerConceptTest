// Shared HUD primitives reused across all seven shots:
// scan brackets, reticles, leader lines, rulers, panels, fields, status tags, icons.
import { h, s, attr, css } from '../core/dom.js';
import { clamp, lerp } from '../core/util.js';

// ---- brackets ---------------------------------------------------------------
// close: 0 = only corner arms, 1 = fully closed rectangle
export function bracketPath(x, y, w, hh, arm = 22, close = 0) {
  const ax = Math.min(lerp(arm, w / 2, close), w / 2);
  const ay = Math.min(lerp(arm, hh / 2, close), hh / 2);
  return (
    `M${x},${y + ay}V${y}H${x + ax}` +
    `M${x + w - ax},${y}H${x + w}V${y + ay}` +
    `M${x + w},${y + hh - ay}V${y + hh}H${x + w - ax}` +
    `M${x + ax},${y + hh}H${x}V${y + hh - ay}`
  );
}

export class Brackets {
  constructor(parent, o = {}) {
    this.g = s('g', { class: `brk ${o.cls || ''}` });
    this.p = s('path', { class: 'brk-arm' });
    this.inner = s('path', { class: 'brk-inner' });
    this.g.append(this.inner, this.p);
    if (o.ticks) {
      this.ticks = s('path', { class: 'brk-ticks' });
      this.g.append(this.ticks);
    }
    parent.appendChild(this.g);
    this.arm = o.arm ?? 22;
  }
  // r: {x,y,w,h}
  set(r, o = {}) {
    const { x, y, w, h: hh } = r;
    attr(this.p, { d: bracketPath(x, y, w, hh, o.arm ?? this.arm, o.close ?? 0) });
    const ia = o.inner ?? 0;
    if (ia > 0) {
      const g = 7;
      attr(this.inner, { d: bracketPath(x + g, y + g, w - 2 * g, hh - 2 * g, 8, 0) });
    }
    css(this.inner, { opacity: String(ia) });
    if (this.ticks) {
      let d = '';
      const n = 9;
      for (let i = 1; i < n; i++) {
        const tx = x + (w * i) / n, ty = y + (hh * i) / n;
        d += `M${tx},${y}v${i % 4 === 0 ? 7 : 4}M${tx},${y + hh}v${i % 4 === 0 ? -7 : -4}`;
        d += `M${x},${ty}h${i % 4 === 0 ? 7 : 4}M${x + w},${ty}h${i % 4 === 0 ? -7 : -4}`;
      }
      attr(this.ticks, { d });
    }
    css(this.g, { opacity: String(clamp(o.alpha ?? 1)) });
  }
}

// a "locking" rect: starts large and loose, snaps to target
export function lockRect(r, p, grow = 0.35) {
  const k = 1 + grow * (1 - p);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const w = r.w * k, hh = r.h * k;
  return { x: cx - w / 2, y: cy - hh / 2, w, h: hh };
}

export function lerpRect(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
}

// ---- reticle -----------------------------------------------------------------
export class Reticle {
  constructor(parent, o = {}) {
    this.g = s('g', { class: `ret ${o.cls || ''}` });
    this.ring = s('circle', { r: 10, class: 'ret-ring' });
    this.ring2 = s('circle', { r: 18, class: 'ret-ring2' });
    this.cross = s('path', { class: 'ret-cross', d: 'M-26,0h8M18,0h8M0,-26v8M0,18v8' });
    this.dot = s('circle', { r: 2.2, class: 'ret-dot' });
    this.g.append(this.ring2, this.ring, this.cross, this.dot);
    parent.appendChild(this.g);
  }
  set(x, y, o = {}) {
    const sc = o.scale ?? 1;
    attr(this.g, { transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${sc.toFixed(3)})` });
    attr(this.ring2, { transform: `rotate(${(o.rot ?? 0).toFixed(1)})` });
    css(this.g, { opacity: String(clamp(o.alpha ?? 1)) });
  }
}

// ---- leader line -------------------------------------------------------------
export class Leader {
  constructor(parent, o = {}) {
    this.g = s('g', { class: `lead ${o.cls || ''}` });
    this.path = s('path', { class: 'lead-line', pathLength: 1 });
    this.end = s('circle', { r: 3, class: 'lead-end' });
    this.g.append(this.path, this.end);
    parent.appendChild(this.g);
  }
  // pts: [[x,y],...]; p = draw progress
  set(pts, p = 1, alpha = 1) {
    const d = 'M' + pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L');
    attr(this.path, { d, 'stroke-dasharray': '1 2', 'stroke-dashoffset': (1 - clamp(p)).toFixed(4) });
    const last = pts[pts.length - 1];
    attr(this.end, { cx: last[0].toFixed(1), cy: last[1].toFixed(1) });
    css(this.end, { opacity: p >= 0.999 ? '1' : '0' });
    css(this.g, { opacity: String(clamp(alpha)) });
  }
}

// ---- rulers ------------------------------------------------------------------
export function rulerPath(len, step = 8, major = 5, minorLen = 4, majorLen = 10, vertical = false) {
  let d = '';
  for (let i = 0, k = 0; i <= len + 0.01; i += step, k++) {
    const L = k % major === 0 ? majorLen : minorLen;
    d += vertical ? `M0,${i}h${L}` : `M${i},0v${L}`;
  }
  return d;
}

export function ruler(parent, x, y, len, o = {}) {
  const g = s('g', { class: `ruler ${o.cls || ''}`, transform: `translate(${x},${y})${o.flip ? ' scale(1,-1)' : ''}` });
  g.append(
    s('path', { d: rulerPath(len, o.step ?? 8, o.major ?? 5, o.minor ?? 4, o.majorLen ?? 10, o.vertical) }),
    s('path', { class: 'ruler-base', d: o.vertical ? `M0,0V${len}` : `M0,0H${len}` })
  );
  parent.appendChild(g);
  return g;
}

// ---- HTML blocks ---------------------------------------------------------------
export function panel(o = {}) {
  const el = h('div', { class: `panel ${o.cls || ''}` });
  if (o.x != null) css(el, { left: o.x + 'px', top: o.y + 'px', width: o.w + 'px', height: o.h ? o.h + 'px' : 'auto' });
  if (o.title) {
    const head = h('div', { class: 'ph' }, [
      o.idx ? h('span', { class: 'ph-idx', text: o.idx }) : null,
      h('span', { class: 'ph-en', text: o.title.en }),
      h('span', { class: 'ph-cn', text: o.title.cn }),
      h('span', { class: 'ph-fill' }),
      o.tag ? h('span', { class: 'ph-tag', text: o.tag }) : null,
    ]);
    el.appendChild(head);
    el._head = head;
  }
  const body = h('div', { class: 'pb' });
  el.appendChild(body);
  el._body = body;
  return el;
}

export function field(cn, en, value, o = {}) {
  const v = h('div', { class: `fv ${o.vcls || ''}`, text: value });
  const el = h('div', { class: `field ${o.cls || ''}` }, [
    h('div', { class: 'fl' }, [h('span', { class: 'fl-cn', text: cn }), h('span', { class: 'fl-en', text: en })]),
    v,
  ]);
  el._v = v;
  return el;
}

export function statusTag(en, cn, tone = 'cyan', o = {}) {
  return h('div', { class: `stag tone-${tone} ${o.cls || ''}` }, [
    h('span', { class: 'stag-dot' }),
    h('span', { class: 'stag-en', text: en }),
    cn ? h('span', { class: 'stag-sep', text: '／' }) : null,
    cn ? h('span', { class: 'stag-cn', text: cn }) : null,
  ]);
}

export function label(x, y, cn, en, o = {}) {
  const el = h('div', { class: `lbl ${o.cls || ''}` }, [
    cn ? h('span', { class: 'lbl-cn', text: cn }) : null,
    en ? h('span', { class: 'lbl-en', text: en }) : null,
  ]);
  css(el, { left: x + 'px', top: y + 'px' });
  return el;
}

// ---- linear icons (24x24 viewBox) ---------------------------------------------
const ICONS = {
  warn: 'M12 3 L22 20 H2 Z M12 9 V14 M12 16.5 V17.5',
  check: 'M4 12.5 L9.5 18 L20 6',
  cross: 'M6 6 L18 18 M18 6 L6 18',
  lock: 'M6 11 H18 V20 H6 Z M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11',
  drop: 'M12 3 C12 3 5.5 10.5 5.5 14.5 A6.5 6.5 0 0 0 18.5 14.5 C18.5 10.5 12 3 12 3 Z',
  leaf: 'M5 19 C5 9 11 4 20 4 C20 13 15 19 5 19 Z M5 19 L14 10',
  tree: 'M12 3 L18 12 H14.5 L19 18 H5 L9.5 12 H6 Z M12 18 V22',
  rock: 'M3 18 L7 9 L12 7 L17 10 L21 18 Z M7 9 L11 13 L17 10 M11 13 L12 18',
  layers: 'M12 4 L21 9 L12 14 L3 9 Z M3 13 L12 18 L21 13',
  wave: 'M2 12 C5 6 7 6 10 12 S15 18 18 12 S21 9 22 10',
  node: 'M12 9 A3 3 0 1 1 12 15 A3 3 0 1 1 12 9 M12 3 V9 M12 15 V21 M3 12 H9 M15 12 H21',
  cut: 'M4 12 H9 M15 12 H20 M10 9 L14 15 M14 9 L10 15',
  hand: 'M8 13 V5.5 A1.5 1.5 0 0 1 11 5.5 V11 M11 10 V4 A1.5 1.5 0 0 1 14 4 V11 M14 10 V5.5 A1.5 1.5 0 0 1 17 5.5 V14 C17 18 15 21 11.5 21 C8.5 21 7 19 5 15.5 L4 13.5 A1.4 1.4 0 0 1 6.4 12 L8 14',
  bug: 'M12 6 A3 4 0 0 1 12 18 A3 4 0 0 1 12 6 M9 9 L4 6 M15 9 L20 6 M9 13 H4 M15 13 H20 M9 16 L5 19 M15 16 L19 19',
  eye: 'M2 12 C6 5 18 5 22 12 C18 19 6 19 2 12 Z M12 9 A3 3 0 1 1 12 15 A3 3 0 1 1 12 9',
  scan: 'M3 8 V3 H8 M16 3 H21 V8 M21 16 V21 H16 M8 21 H3 V16 M3 12 H21',
  power: 'M12 3 V12 M7 6 A8 8 0 1 0 17 6',
};
export function icon(name, cls = '') {
  return s('svg', { class: `ico ${cls}`, viewBox: '0 0 24 24', width: 24, height: 24 }, [s('path', { d: ICONS[name] || '' })]);
}
