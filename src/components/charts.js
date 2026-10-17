// Data-display widgets. All are pure functions of (time, data).
import { h, s, attr, css, txt, canvas2d } from '../core/dom.js';
import { clamp, lerp, hash, noise1, fbm1 } from '../core/util.js';

export const COL = {
  cyan: '#6fe7ff',
  cyanD: 'rgba(111,231,255,0.35)',
  cyanF: 'rgba(111,231,255,0.12)',
  ink: '#c5d1d8',
  dim: 'rgba(197,209,216,0.35)',
  amber: '#ffb340',
  red: '#ff3b30',
};

// ---- scrolling trace (canvas) -----------------------------------------------
// fn(x) -> value in [0,1]; x is an absolute sample coordinate (time-like)
export class Trace {
  constructor(w, hh, o = {}) {
    const c = canvas2d(w, hh, `trace ${o.cls || ''}`, o.ratio ?? 1.5);
    Object.assign(this, c);
    this.color = o.color || COL.cyan;
    this.grid = o.grid ?? true;
    this.fill = o.fill ?? false;
    this.lw = o.lw ?? 1.2;
  }
  draw(fn, x0, span, o = {}) {
    const { ctx, w, h: hh } = this;
    ctx.clearRect(0, 0, w, hh);
    if (this.grid) {
      ctx.strokeStyle = 'rgba(111,231,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        const y = Math.round((hh * i) / 4) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      for (let i = 1; i < 12; i++) {
        const x = Math.round((w * i) / 12) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, hh);
      }
      ctx.stroke();
    }
    const reveal = o.reveal ?? 1;
    const n = Math.max(2, Math.floor(w * reveal));
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = i;
      const v = fn(x0 + (i / w) * span);
      const y = hh - 3 - clamp(v) * (hh - 6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = o.color || this.color;
    ctx.lineWidth = this.lw;
    ctx.shadowColor = o.color || this.color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (this.fill) {
      ctx.lineTo(n, hh);
      ctx.lineTo(0, hh);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, hh);
      g.addColorStop(0, 'rgba(111,231,255,0.18)');
      g.addColorStop(1, 'rgba(111,231,255,0)');
      ctx.fillStyle = g;
      ctx.fill();
    }
    if (reveal < 1) {
      const x = n;
      ctx.fillStyle = '#eaffff';
      const v = fn(x0 + (n / w) * span);
      ctx.beginPath();
      ctx.arc(x, hh - 3 - clamp(v) * (hh - 6), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ECG-like beat shape, period 1
export function ecg(x) {
  const f = x - Math.floor(x);
  const g = (c, w, a) => a * Math.exp(-((f - c) ** 2) / (2 * w * w));
  return 0.42 + g(0.18, 0.025, 0.06) - g(0.285, 0.008, 0.08) + g(0.31, 0.01, 0.48) - g(0.335, 0.01, 0.14) + g(0.55, 0.045, 0.1);
}

// ---- spectrum / bar cluster (canvas) -------------------------------------------
export class Spectrum {
  constructor(w, hh, n = 32, o = {}) {
    Object.assign(this, canvas2d(w, hh, `spec ${o.cls || ''}`, 1.5));
    this.n = n;
    this.seed = o.seed ?? 1;
  }
  draw(t, amp = 1) {
    const { ctx, w, h: hh, n } = this;
    ctx.clearRect(0, 0, w, hh);
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = clamp(fbm1(i * 0.31 + t * 1.3, this.seed + i * 0.17, 3) * 1.25 - 0.1) * amp;
      const bh = Math.max(1, v * hh);
      ctx.fillStyle = i % 7 === 3 ? 'rgba(234,255,255,0.85)' : 'rgba(111,231,255,0.55)';
      ctx.fillRect(i * bw + 1, hh - bh, Math.max(1, bw - 2), bh);
    }
  }
}

// ---- dot matrix noise block (canvas) --------------------------------------------
export class DotMatrix {
  constructor(cols, rows, cell = 6, o = {}) {
    Object.assign(this, canvas2d(cols * cell, rows * cell, `dotm ${o.cls || ''}`, 1));
    this.cols = cols;
    this.rows = rows;
    this.cell = cell;
    this.seed = o.seed ?? 3;
  }
  draw(t, density = 0.5) {
    const { ctx, cols, rows, cell } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const fr = Math.floor(t * 6);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = hash(x * 31.7 + y * 7.1 + this.seed + fr * 0.013 * ((x + y) % 5));
        if (v < density) {
          ctx.fillStyle = v < density * 0.15 ? 'rgba(234,255,255,0.9)' : 'rgba(111,231,255,0.45)';
          ctx.fillRect(x * cell + 1, y * cell + 1, cell - 3, cell - 3);
        }
      }
  }
}

// ---- rotating dial (svg) ------------------------------------------------------
export function dial(r = 46, o = {}) {
  const g = s('g', { class: `dial ${o.cls || ''}` });
  const ticks = s('path', { class: 'dial-ticks' });
  let d = '';
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const L = i % 6 === 0 ? 7 : 3;
    d += `M${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}L${(Math.cos(a) * (r - L)).toFixed(1)},${(Math.sin(a) * (r - L)).toFixed(1)}`;
  }
  attr(ticks, { d });
  const ring = s('circle', { r: r - 12, class: 'dial-ring' });
  const arc = s('path', { class: 'dial-arc', d: arcPath(r - 18, -0.6, 0.9) });
  const arc2 = s('path', { class: 'dial-arc2', d: arcPath(r - 18, 2.2, 3.4) });
  const needle = s('path', { class: 'dial-needle', d: `M0,0L${r - 14},0` });
  const rot1 = s('g', {}, [ticks]);
  const rot2 = s('g', {}, [arc, arc2]);
  const rot3 = s('g', {}, [needle]);
  g.append(rot1, ring, rot2, rot3, s('circle', { r: 2.5, class: 'dial-hub' }));
  g.update = (t, needleA = null) => {
    attr(rot1, { transform: `rotate(${(t * 6).toFixed(2)})` });
    attr(rot2, { transform: `rotate(${(-t * 14).toFixed(2)})` });
    attr(rot3, { transform: `rotate(${(needleA ?? t * 40).toFixed(2)})` });
  };
  return g;
}

export function arcPath(r, a0, a1) {
  const x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r;
  const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

// ---- radar chart (svg) 0..1 scale -----------------------------------------------
export class Radar {
  constructor(parent, items, r = 120, o = {}) {
    this.items = items;
    this.r = r;
    this.g = s('g', { class: 'radar' });
    const n = items.length;
    const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
    this.ang = ang;
    // rings at 0.25 .. 1.0
    for (let k = 1; k <= 4; k++) {
      const rr = (r * k) / 4;
      const pts = items.map((_, i) => `${(Math.cos(ang(i)) * rr).toFixed(1)},${(Math.sin(ang(i)) * rr).toFixed(1)}`).join(' ');
      this.g.append(s('polygon', { class: `radar-ring ${k === 4 ? 'outer' : ''}`, points: pts }));
      if (k < 4) this.g.append(s('text', { class: 'radar-scale', x: 3, y: (-rr + 10).toFixed(1), text: (k / 4).toFixed(2) }));
    }
    this.g.append(s('text', { class: 'radar-scale', x: 3, y: (-r + 10).toFixed(1), text: '1.00' }));
    this.g.append(s('text', { class: 'radar-scale', x: 4, y: 12, text: '0' }));
    for (let i = 0; i < n; i++) {
      this.g.append(s('line', { class: 'radar-axis', x1: 0, y1: 0, x2: (Math.cos(ang(i)) * r).toFixed(1), y2: (Math.sin(ang(i)) * r).toFixed(1) }));
    }
    this.shape = s('polygon', { class: 'radar-shape' });
    this.g.append(this.shape);
    this.dots = items.map(() => {
      const c = s('circle', { r: 3.2, class: 'radar-dot' });
      this.g.append(c);
      return c;
    });
    this.labels = items.map((it, i) => {
      const a = ang(i);
      const lx = Math.cos(a) * (r + 30), ly = Math.sin(a) * (r + 24);
      const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
      const t = s('text', { class: 'radar-lbl', x: lx.toFixed(1), y: (ly - 4).toFixed(1), 'text-anchor': anchor });
      t.append(s('tspan', { class: 'radar-lbl-cn', text: it.cn }));
      const v = s('tspan', { class: 'radar-lbl-v', x: lx.toFixed(1), dy: 18, text: it.v.toFixed(2) });
      t.append(v);
      this.g.append(t);
      return t;
    });
    parent.appendChild(this.g);
  }
  set(p, sweep = 1) {
    const n = this.items.length;
    const pts = this.items.map((it, i) => {
      const local = clamp(p * n - i * 0.6);
      const v = it.v * clamp(local);
      const a = this.ang(i);
      return [Math.cos(a) * v * this.r, Math.sin(a) * v * this.r];
    });
    attr(this.shape, { points: pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ') });
    pts.forEach((q, i) => attr(this.dots[i], { cx: q[0].toFixed(1), cy: q[1].toFixed(1) }));
    this.labels.forEach((l, i) => css(l, { opacity: String(clamp(sweep * n - i)) }));
  }
}

// ---- tick bar (html) -----------------------------------------------------------
export function tickBar(o = {}) {
  const fill = h('div', { class: 'tb-fill' });
  const head = h('div', { class: 'tb-head' });
  const el = h('div', { class: `tickbar ${o.cls || ''}` }, [h('div', { class: 'tb-ticks' }), fill, head]);
  el.set = (v) => {
    const pct = (clamp(v) * 100).toFixed(2) + '%';
    css(fill, { width: pct });
    css(head, { left: pct });
  };
  return el;
}
