// Deterministic math helpers. Nothing in render paths may use Math.random():
// the same time value must always produce the same frame.

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const fract = (x) => x - Math.floor(x);
export const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};

export const ease = {
  linear: (x) => clamp(x),
  inQuad: (x) => clamp(x) ** 2,
  outQuad: (x) => 1 - (1 - clamp(x)) ** 2,
  inCubic: (x) => clamp(x) ** 3,
  outCubic: (x) => 1 - (1 - clamp(x)) ** 3,
  inOutCubic: (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  },
  outExpo: (x) => {
    x = clamp(x);
    return x === 1 ? 1 : 1 - 2 ** (-10 * x);
  },
  inOutSine: (x) => -(Math.cos(Math.PI * clamp(x)) - 1) / 2,
  outBack: (x) => {
    x = clamp(x);
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
};

// progress of t inside [start, start + dur]
export const seg = (t, start, dur) => clamp((t - start) / dur);

// envelope: 0 before a, ramps to 1 over fi, holds, ramps down to 0 ending at b
export function env(t, a, b, fi = 0.3, fo = 0.3) {
  if (t < a || t > b) return 0;
  return Math.min(clamp((t - a) / fi), clamp((b - t) / fo));
}

export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
export function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u);
}
export function fbm1(x, seed = 0, oct = 4) {
  let a = 0.5, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise1(x, seed + i * 13.1);
    n += a;
    x *= 2.03;
    a *= 0.5;
  }
  return s / n;
}

export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pad = (n, w = 2) => String(Math.floor(n)).padStart(w, '0');
export const fmt = (n, d = 1) => n.toFixed(d);

// story clock: base "HH:MM:SS" + seconds -> "HH:MM:SS"
export function clockAdd(base, sec) {
  const [h, m, s] = base.split(':').map(Number);
  let tot = h * 3600 + m * 60 + s + Math.floor(sec);
  tot = ((tot % 86400) + 86400) % 86400;
  return `${pad(tot / 3600)}:${pad((tot % 3600) / 60)}:${pad(tot % 60)}`;
}
