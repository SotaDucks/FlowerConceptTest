// Plate preprocessing: loads the shot 3/4/5 base image, extracts edge feature
// points inside the plant silhouette and samples leaf texture colours.
// Runs once before playback, so the result is identical every run.
import { hash2 } from './util.js';

export function pointInPoly(u, v, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export async function loadPlate(cfg) {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error(`Plate image failed to load: ${cfg.src}`));
    img.src = cfg.src;
  });
  const aspect = img.naturalWidth / img.naturalHeight;
  const W = 640, H = Math.round(W / aspect);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const data = g.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;

  // Sobel edges inside the plant polygon
  const cand = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const u = x / W, v = y / H;
      if (!pointInPoly(u, v, cfg.plantPoly)) continue;
      const L = (dx, dy) => lum[(y + dy) * W + x + dx];
      const gx = -L(-1, -1) - 2 * L(-1, 0) - L(-1, 1) + L(1, -1) + 2 * L(1, 0) + L(1, 1);
      const gy = -L(-1, -1) - 2 * L(0, -1) - L(1, -1) + L(-1, 1) + 2 * L(0, 1) + L(1, 1);
      const m = Math.hypot(gx, gy);
      if (m > 0.22) cand.push({ u, v, m, l: lum[y * W + x] });
    }
  }
  // deterministic thinning to a target count
  const target = 3200;
  const keep = Math.min(1, target / Math.max(1, cand.length));
  const points = cand.filter((p) => hash2(p.u * 977.1, p.v * 613.7) < keep * (0.6 + Math.min(1, p.m) * 0.6));

  // texture swatches from the texture frame
  const [fu, fv, fw, fh] = cfg.frames.texture;
  const px = [];
  for (let y = Math.floor(fv * H); y < (fv + fh) * H; y++)
    for (let x = Math.floor(fu * W); x < (fu + fw) * W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i], gg = data[i + 1], b = data[i + 2];
      if (gg >= r && gg >= b * 0.9) px.push([r, gg, b, lum[y * W + x]]);
    }
  px.sort((a, b) => a[3] - b[3]);
  const avg = (a0, a1) => {
    const s = [0, 0, 0];
    const lo = Math.floor(px.length * a0), hi = Math.max(lo + 1, Math.floor(px.length * a1));
    for (let i = lo; i < hi; i++) for (let k = 0; k < 3; k++) s[k] += px[i][k];
    return s.map((v) => Math.round(v / (hi - lo)));
  };
  const swatches = px.length ? { dark: avg(0.12, 0.32), light: avg(0.7, 0.92) } : { dark: [26, 54, 34], light: [110, 140, 100] };

  return { img, src: cfg.src, aspect, points, swatches, cfg, edgeCount: cand.length };
}
