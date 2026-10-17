// The VR-environment plate (shots 2–5): graded base image, natural-colour
// spotlight for the organ under analysis, mirrored edge fill, and a mapping
// from normalised image coords to stage px for anchoring UI to real features.
import { h, css, canvas2d } from '../core/dom.js';
import { clamp, hash } from '../core/util.js';

export class PlateView {
  constructor(plate, o = {}) {
    this.plate = plate;
    this.iw = 1920;
    this.ih = 1920 / plate.aspect;
    this.el = h('div', { class: `plate L-plate ${o.cls || ''}` });
    this.inner = h('div', { class: 'plate-inner' });
    css(this.inner, { width: this.iw + 'px', height: this.ih + 'px' });
    const img = (cls) => h('img', { src: plate.src, class: `plate-img ${cls}`, draggable: false });
    this.mirrorL = img('plate-mirror plate-mirror-l');
    this.mirrorR = img('plate-mirror plate-mirror-r');
    this.graded = img('plate-graded');
    this.natural = img('plate-natural');
    this.inner.append(this.mirrorL, this.mirrorR, this.graded, this.natural);
    this.tint = h('div', { class: 'plate-tint' });
    this.el.append(this.inner, this.tint);
    this.set(0, 0, 1920);
  }

  set(x, y, w) {
    this.view = { x, y, w, h: w / this.plate.aspect };
    css(this.inner, { transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${(w / this.iw).toFixed(5)})` });
  }

  toStage(u, v) {
    const V = this.view;
    return [V.x + u * V.w, V.y + v * V.h];
  }

  rect(f) {
    const [x, y] = this.toStage(f[0], f[1]);
    return { x, y, w: f[2] * this.view.w, h: f[3] * this.view.h };
  }

  grade({ sat = 0.3, bri = 0.62, con = 1.12, blur = 0, tint = 1 } = {}) {
    css(this.graded, { filter: `saturate(${sat.toFixed(3)}) brightness(${bri.toFixed(3)}) contrast(${con.toFixed(3)})${blur > 0.05 ? ` blur(${blur.toFixed(2)}px)` : ''}` });
    css(this.mirrorL, { filter: `saturate(${sat * 0.6}) brightness(${bri * 0.55}) blur(3px)` });
    css(this.mirrorR, { filter: `saturate(${sat * 0.6}) brightness(${bri * 0.55}) blur(3px)` });
    css(this.tint, { opacity: String(clamp(tint)) });
  }

  // natural-colour spotlight: centre (u,v), radii (ru,rv) in image-normalised units
  spot(a, u = 0.5, v = 0.5, ru = 0.1, rv = 0.1, bri = 0.95) {
    if (a <= 0.001) {
      css(this.natural, { opacity: '0' });
      return;
    }
    const cx = u * this.iw, cy = v * this.ih, rx = ru * this.iw, ry = rv * this.ih;
    const m = `radial-gradient(ellipse ${rx.toFixed(1)}px ${ry.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, #000 0%, #000 45%, rgba(0,0,0,0) 100%)`;
    css(this.natural, { opacity: clamp(a).toFixed(3), maskImage: m, webkitMaskImage: m, filter: `brightness(${bri}) saturate(1.05)` });
  }
}

// zoomed crop of the plate for analysis insets
export class PlateInset {
  constructor(plate, w, hh, o = {}) {
    this.plate = plate;
    this.w = w;
    this.h = hh;
    this.el = h('div', { class: `inset ${o.cls || ''}` });
    css(this.el, { width: w + 'px', height: hh + 'px' });
    this.img = h('div', { class: 'inset-img' });
    css(this.img, { backgroundImage: `url("${plate.src}")` });
    this.el.append(this.img, h('div', { class: 'inset-grid' }), h('div', { class: 'inset-scan' }));
  }
  // show image region centred at (u,v) with normalised width fw (height from aspect)
  show(u, v, fw, o = {}) {
    const scale = this.w / (fw * 1); // px per unit-u
    const bw = scale, bh = scale / this.plate.aspect; // background size in px for full image
    const x = -(u * bw - this.w / 2), y = -(v * bh - this.h / 2);
    css(this.img, {
      backgroundSize: `${bw.toFixed(1)}px ${bh.toFixed(1)}px`,
      backgroundPosition: `${x.toFixed(1)}px ${y.toFixed(1)}px`,
      filter: `saturate(${o.sat ?? 0.85}) brightness(${o.bri ?? 1.05}) contrast(1.08)`,
    });
    css(this.el, { '--scan': `${((o.scan ?? 0) * 100).toFixed(1)}%` });
  }
}

// feature-point overlay drawn from the plate's edge analysis
export class FeatureLayer {
  constructor() {
    Object.assign(this, canvas2d(1920, 1080, 'feat L-ui', 1));
  }
  draw(points, toStage, o = {}) {
    const { ctx } = this;
    ctx.clearRect(0, 0, 1920, 1080);
    const { scanV = 2, alpha = 1, t = 0, hiFn = null } = o;
    if (alpha <= 0.001) return;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.v > scanV) continue;
      const age = scanV - p.v;
      const front = Math.exp(-age * 18);
      const hi = hiFn ? hiFn(p) : 0;
      const tw = 0.6 + 0.4 * Math.sin(t * 2 + i);
      const a = alpha * clamp(0.16 + front * 0.84 + hi * 0.6) * tw;
      if (a < 0.02) continue;
      const [x, y] = toStage(p.u, p.v);
      const r = 1 + front * 1.4 + hi * 0.6;
      ctx.fillStyle = hi > 0.2 ? `rgba(234,255,255,${a.toFixed(3)})` : `rgba(111,231,255,${a.toFixed(3)})`;
      ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
    // occasional triangulation links near the scan front
    if (scanV < 1.05) {
      ctx.strokeStyle = `rgba(111,231,255,${(0.25 * alpha).toFixed(3)})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      let prev = null;
      for (let i = 0; i < points.length; i += 3) {
        const p = points[i];
        if (Math.abs(p.v - scanV) > 0.025) continue;
        const q = toStage(p.u, p.v);
        if (prev && Math.hypot(q[0] - prev[0], q[1] - prev[1]) < 70) {
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(q[0], q[1]);
        }
        prev = q;
      }
      ctx.stroke();
    }
  }
}
