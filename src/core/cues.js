// Declarative, time-pure reveal system. Each cue maps time -> visual state,
// so seeking anywhere in a shot restores the exact frame.
import { clamp, seg, ease, lerp, hash } from './util.js';
import { css, txt, attr } from './dom.js';

const GL_LAT = '/\\<>_=+#*01ABEFHKMNRSTXZ░▒▓';
const GL_CJK = '■□▣▤▥▦▧▨▩▪';
const isCJK = (c) => /[　-鿿＀-￯]/.test(c);

export function decode(text, p, t, seed = 0) {
  if (p >= 1) return text;
  if (p <= 0) return '';
  const len = text.length;
  const tail = Math.min(5, Math.max(2, len * 0.25));
  const head = p * (len + tail);
  const fr = Math.floor(t * 24);
  let out = '';
  for (let i = 0; i < len; i++) {
    const ch = text[i];
    if (i < head - tail) out += ch;
    else if (i < head) {
      if (ch === ' ') out += ' ';
      else {
        const set = isCJK(ch) ? GL_CJK : GL_LAT;
        out += set[Math.floor(hash(i * 7.13 + fr * 1.71 + seed) * set.length)];
      }
    } else break;
  }
  return out;
}

export function typed(text, p, t, cursor = true) {
  if (p >= 1) return text;
  if (p <= 0) return '';
  const n = Math.ceil(p * text.length);
  const blink = Math.floor(t * 4) % 2 === 0;
  return text.slice(0, n) + (cursor && blink ? '▌' : '');
}

export class Cues {
  constructor() {
    this.list = [];
  }

  // el: element; at: start time (s); o: { dur, mode, ease, out, outDur, dim, dimTo, text, from, to, fmt, fn }
  add(el, at, o = {}) {
    const mode = o.mode || 'fade';
    const c = {
      el,
      at,
      dur: o.dur ?? (mode === 'decode' || mode === 'type' ? 0.6 : 0.45),
      mode,
      ease: o.ease || (mode === 'decode' || mode === 'type' || mode === 'draw' ? ease.linear : ease.outCubic),
      out: o.out,
      outDur: o.outDur ?? 0.35,
      dim: o.dim,
      dimTo: o.dimTo ?? 0.32,
      dimDur: o.dimDur ?? 0.6,
      undim: o.undim,
      text: o.text ?? ((mode === 'decode' || mode === 'type') ? el.textContent : null),
      seed: o.seed ?? this.list.length * 3.7,
      from: o.from ?? 0,
      to: o.to ?? 1,
      fmt: o.fmt || ((v) => v.toFixed(0)),
      fn: o.fn,
      dist: o.dist ?? 14,
    };
    if (c.mode === 'draw') attr(el, { pathLength: 1 });
    this.list.push(c);
    return el;
  }

  render(t) {
    for (const c of this.list) {
      const raw = seg(t, c.at, c.dur);
      const p = c.ease(raw);
      let k = 1;
      if (c.out != null) k *= 1 - seg(t, c.out, c.outDur);
      if (c.dim != null) {
        let d = seg(t, c.dim, c.dimDur);
        if (c.undim != null) d *= 1 - seg(t, c.undim, c.dimDur);
        k *= lerp(1, c.dimTo, d);
      }
      const el = c.el;
      const before = t < c.at;
      switch (c.mode) {
        case 'fade':
          css(el, { opacity: o3(p * k) });
          break;
        case 'up':
          css(el, { opacity: o3(p * k), transform: `translateY(${((1 - p) * c.dist).toFixed(2)}px)` });
          break;
        case 'down':
          css(el, { opacity: o3(p * k), transform: `translateY(${(-(1 - p) * c.dist).toFixed(2)}px)` });
          break;
        case 'left':
          css(el, { opacity: o3(p * k), transform: `translateX(${(-(1 - p) * c.dist).toFixed(2)}px)` });
          break;
        case 'right':
          css(el, { opacity: o3(p * k), transform: `translateX(${((1 - p) * c.dist).toFixed(2)}px)` });
          break;
        case 'wipe':
          css(el, { opacity: o3(before ? 0 : k), clipPath: `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)` });
          break;
        case 'wipeDown':
          css(el, { opacity: o3(before ? 0 : k), clipPath: `inset(0 0 ${((1 - p) * 100).toFixed(2)}% 0)` });
          break;
        case 'scaleX':
          css(el, { opacity: o3(before ? 0 : k), transform: `scaleX(${p.toFixed(4)})` });
          break;
        case 'scaleY':
          css(el, { opacity: o3(before ? 0 : k), transform: `scaleY(${p.toFixed(4)})` });
          break;
        case 'decode':
          txt(el, decode(c.text, raw, t, c.seed));
          css(el, { opacity: o3(before ? 0 : k) });
          break;
        case 'type':
          txt(el, typed(c.text, raw, t));
          css(el, { opacity: o3(before ? 0 : k) });
          break;
        case 'count':
          txt(el, c.fmt(lerp(c.from, c.to, p)));
          css(el, { opacity: o3(before ? 0 : k) });
          break;
        case 'draw':
          attr(el, { 'stroke-dasharray': '1 2', 'stroke-dashoffset': (1 - p).toFixed(4) });
          css(el, { opacity: o3(before ? 0 : k) });
          break;
        case 'flash': {
          const f = raw > 0 && raw < 1 ? (hash(Math.floor(t * 30) + c.seed) > 0.45 ? 1 : 0.15) : raw >= 1 ? 1 : 0;
          css(el, { opacity: o3(f * k) });
          break;
        }
        case 'fn':
          c.fn(el, p, t, k, raw);
          break;
      }
    }
  }
}

function o3(v) {
  v = clamp(v);
  return v <= 0.001 ? '0' : v >= 0.999 ? '1' : v.toFixed(3);
}
