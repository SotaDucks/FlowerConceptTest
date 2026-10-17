// Procedural Paphiopedilum purpuratum built from parametric surfaces (units ≈ cm).
// Identification features modelled: basal distichous leaves with tessellated
// mottling, solitary flower on a scape, broad striped dorsal sepal, spreading
// warty petals, saccate "slipper" lip, staminode.
import { rng } from '../core/util.js';

// part ids (must match GLSL partColor)
export const PART = { LEAF: 0, DORSAL: 1, PETAL: 2, POUCH: 3, STAMINODE: 4, STEM: 5, SYNSEPAL: 6, GROUND: 7 };

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
const rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
const rad = (d) => (d * Math.PI) / 180;

function bezier(p0, p1, p2, p3, t) {
  const it = 1 - t;
  return add(add(mul(p0, it * it * it), mul(p1, 3 * it * it * t)), add(mul(p2, 3 * it * t * t), mul(p3, t * t * t)));
}

// ---------------------------------------------------------------- leaves
function leafFn(o) {
  const az = rad(o.az);
  const dir = [Math.cos(az), 0, Math.sin(az)];
  const side = [-Math.sin(az), 0, Math.cos(az)];
  const up = [0, 1, 0];
  const N = 96;
  // integrate centreline
  const C = [], T = [], Nn = [];
  let p = add([0, o.y0 ?? 0.4, 0], mul(dir, 0.35));
  const e0 = rad(o.e0), bend = rad(o.bend);
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = e0 - bend * Math.pow(u, 1.45);
    const t = add(mul(dir, Math.cos(a)), mul(up, Math.sin(a)));
    const n = add(mul(dir, -Math.sin(a)), mul(up, Math.cos(a)));
    C.push(p);
    T.push(t);
    Nn.push(n);
    p = add(p, mul(t, o.L / N));
  }
  const W = o.W / 2;
  const width = (u) => W * Math.max(Math.pow(Math.sin(Math.PI * Math.min(1, u)), 0.62) * (1 - 0.22 * u), 0.32 * (1 - u) ** 3);
  return {
    part: PART.LEAF,
    nu: 80,
    nv: 14,
    fn(u, v) {
      const k = Math.min(N, Math.round(u * N));
      const w = width(u);
      const tw = rad(o.twist ?? 0) * u;
      const s2 = add(mul(side, Math.cos(tw)), mul(Nn[k], Math.sin(tw)));
      const n2 = add(mul(Nn[k], Math.cos(tw)), mul(side, -Math.sin(tw)));
      const fold = 0.42 * (1 - 0.55 * u);
      const pos = add(add(C[k], mul(s2, v * w)), mul(n2, Math.pow(Math.abs(v), 1.6) * w * fold));
      return { p: pos, uv: [u, v], aux: [u * o.L, v * w] };
    },
  };
}

// ---------------------------------------------------------------- flower frame
export function buildPlant() {
  const parts = [];
  const leaves = [
    { az: 174, L: 16.5, W: 3.5, e0: 58, bend: 105, twist: 14 },
    { az: 4, L: 15.5, W: 3.4, e0: 55, bend: 98, twist: -12 },
    { az: 146, L: 13.5, W: 3.2, e0: 70, bend: 110, twist: 10 },
    { az: 34, L: 12.8, W: 3.1, e0: 72, bend: 112, twist: -10 },
    { az: 214, L: 12.0, W: 2.9, e0: 76, bend: 112, twist: 6 },
    { az: 322, L: 11.4, W: 2.8, e0: 78, bend: 118, twist: -6 },
    { az: 100, L: 10.5, W: 2.9, e0: 52, bend: 88, twist: 6 },
    { az: 262, L: 9.5, W: 2.6, e0: 74, bend: 100, twist: 0 },
  ];
  for (const l of leaves) parts.push(leafFn(l));

  // scape
  const S0 = [0, 0.3, 0], S1 = [0.3, 7, -0.5], S2 = [1.6, 13.5, 0.3], S3 = [1.3, 17.6, 0.1];
  parts.push(tube((t) => bezier(S0, S1, S2, S3, t), (t) => 0.26 - 0.05 * t, PART.STEM, 60, 10, 0));

  // flower origin and orientation (slightly enlarged for screen legibility)
  const O = [1.5, 19.3, 1.6];
  const yaw = rad(8), pitch = rad(6), FS = 1.3;
  const F = (q) => add(O, rotY(rotX(mul(q, FS), pitch), yaw));

  // ovary / pedicel (green-purple, hairy)
  const ov0 = S3, ov3 = F([0, -0.1, -0.55]);
  parts.push(tube((t) => bezier(ov0, add(ov0, [0, 0.8, 0.1]), add(ov3, [0, -0.6, -0.5]), ov3, t), () => 0.2, PART.STEM, 16, 8, 0.55));

  // dorsal sepal
  parts.push({
    part: PART.DORSAL,
    nu: 40,
    nv: 30,
    fn(u, v) {
      // broadly ovate-cordate, acuminate apex, top recurved backwards
      const sU = u < 0.36 ? (0.36 - u) / 0.4 : (u - 0.36) / 0.64;
      const w = 2.05 * (u < 0.36 ? Math.sqrt(1 - sU * sU) : Math.pow(1 - Math.pow(sU, 1.7), 0.85));
      const x = v * w;
      const y = 0.25 + 4.1 * u;
      const z = -0.3 + 0.18 * v * v * (0.3 + 0.7 * Math.sin(Math.PI * u)) - 0.45 * u * u - 0.12 * (1 - Math.abs(v)) * Math.sin(Math.PI * u);
      return { p: F([x, y, z]), uv: [u, v], aux: [u, v] };
    },
  });

  // petals (spreading, slightly drooping, warty upper margins)
  for (const sgn of [-1, 1]) {
    const start = [0.42 * sgn, -0.02, 0.06];
    const d = norm([sgn, -0.42, 0.26]);
    const upv = [0, 1, 0];
    const b0 = norm(sub(upv, mul(d, dot(upv, d))));
    const L = 4.1;
    parts.push({
      part: PART.PETAL,
      nu: 44,
      nv: 10,
      fn(u, v) {
        const c = add(add(start, mul(d, L * u)), [0, -0.75 * u * u, -0.35 * u * u]);
        const tw = 0.5 * u * sgn;
        const dc = cross(d, b0);
        const b = add(mul(b0, Math.cos(tw)), mul(dc, Math.sin(tw)));
        const n = cross(d, b);
        const w = 0.7 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * u)), 0.42);
        const p = add(add(c, mul(b, v * w)), mul(n, 0.1 * v * v * sgn));
        return { p: F(p), uv: [u, v], aux: [u, v] };
      },
    });
  }

  // synsepal (behind the lip)
  {
    const d = norm([0, -1, -0.3]);
    parts.push({
      part: PART.SYNSEPAL,
      nu: 22,
      nv: 12,
      fn(u, v) {
        const w = 0.72 * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * u)), 0.5);
        const p = add(add([0, -0.35, -0.42], mul(d, 2.5 * u)), [v * w, 0, -0.18 * v * v]);
        return { p: F(p), uv: [u, v], aux: [u, v] };
      },
    });
  }

  // pouch (saccate lip) — ellipsoid with an opening on top, larger toward the back
  {
    const c = [0, -1.95, 0.55], R = [1.15, 1.25, 1.75];
    const tilt = rad(-16);
    parts.push({
      part: PART.POUCH,
      nu: 44,
      nv: 52,
      fn(u, v) {
        const ph = v * Math.PI * 2;
        const cmin = 0.32 + 0.36 * Math.sin(ph);
        const thMin = Math.acos(Math.max(-0.99, Math.min(0.99, cmin)));
        const th = thMin + u * (Math.PI - thMin) * 0.999;
        const inc = 1 - 0.12 * Math.pow(1 - u, 6);
        let q = [Math.sin(th) * Math.cos(ph) * R[0] * inc, Math.cos(th) * R[1], Math.sin(th) * Math.sin(ph) * R[2] * inc];
        q = rotX(q, tilt);
        return { p: F(add(c, q)), uv: [u, v], aux: [u, v] };
      },
    });
  }

  // staminode
  parts.push({
    part: PART.STAMINODE,
    nu: 14,
    nv: 28,
    fn(u, v) {
      const a = v * Math.PI * 2;
      const r = u;
      const x = 0.56 * r * Math.cos(a);
      const y = 0.44 * r * Math.sin(a) - 0.12 * (r * Math.cos(a)) ** 2;
      const z = 0.66 + 0.2 * (1 - r * r);
      return { p: F([x, y - 0.3, z]), uv: [u, v], aux: [u, v] };
    },
  });

  return { parts, flowerOrigin: O, flowerFn: F };
}

function tube(path, radius, part, nu, nv, uvOffset) {
  return {
    part,
    nu,
    nv,
    fn(u, v) {
      const e = 0.002;
      const p = path(u);
      const t = norm(sub(path(Math.min(1, u + e)), path(Math.max(0, u - e))));
      let a = norm(cross(t, [0, 0, 1]));
      if (!isFinite(a[0])) a = [1, 0, 0];
      const b = cross(t, a);
      const ang = v * Math.PI * 2;
      const r = radius(u);
      const pos = add(p, add(mul(a, Math.cos(ang) * r), mul(b, Math.sin(ang) * r)));
      return { p: pos, uv: [Math.min(1, u + uvOffset), v], aux: [u, v] };
    },
  };
}

// ---------------------------------------------------------------- tessellation
// -> { positions, uvs, parts, aux, index } for the surface mesh
export function tessellate(parts) {
  const pos = [], uv = [], pid = [], aux = [], idx = [];
  const tris = []; // for sampling: [i0,i1,i2,area]
  let base = 0;
  for (const P of parts) {
    const { nu, nv } = P;
    for (let i = 0; i <= nu; i++) {
      for (let j = 0; j <= nv; j++) {
        const u = i / nu;
        const v = P.part === PART.POUCH || P.part === PART.STAMINODE || P.part === PART.STEM ? j / nv : -1 + (2 * j) / nv;
        const r = P.fn(u, v);
        pos.push(...r.p);
        uv.push(...r.uv);
        aux.push(...r.aux);
        pid.push(P.part);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = base + i * (nv + 1) + j;
        const b = a + nv + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
        tris.push([a, b, a + 1], [b, b + 1, a + 1]);
      }
    }
    P._base = base;
    base += (nu + 1) * (nv + 1);
  }
  return {
    positions: new Float32Array(pos),
    uvs: new Float32Array(uv),
    parts: new Float32Array(pid),
    aux: new Float32Array(aux),
    index: idx,
    tris,
  };
}

// area-weighted random surface samples (deterministic)
export function samplePoints(mesh, count, seed = 7) {
  const R = rng(seed);
  const P = mesh.positions, U = mesh.uvs, A = mesh.aux, ID = mesh.parts;
  const areas = [];
  let total = 0;
  for (const [a, b, c] of mesh.tris) {
    const ab = sub(P.slice(b * 3, b * 3 + 3), P.slice(a * 3, a * 3 + 3));
    const ac = sub(P.slice(c * 3, c * 3 + 3), P.slice(a * 3, a * 3 + 3));
    const cr = cross(ab, ac);
    const ar = 0.5 * Math.hypot(cr[0], cr[1], cr[2]);
    total += ar;
    areas.push(total);
  }
  const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2), ax = new Float32Array(count * 2);
  const part = new Float32Array(count), rnd = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const x = R() * total;
    let lo = 0, hi = areas.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (areas[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    const [a, b, c] = mesh.tris[lo];
    let r1 = R(), r2 = R();
    if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
    const w0 = 1 - r1 - r2;
    for (let d = 0; d < 3; d++) pos[k * 3 + d] = P[a * 3 + d] * w0 + P[b * 3 + d] * r1 + P[c * 3 + d] * r2;
    for (let d = 0; d < 2; d++) {
      uv[k * 2 + d] = U[a * 2 + d] * w0 + U[b * 2 + d] * r1 + U[c * 2 + d] * r2;
      ax[k * 2 + d] = A[a * 2 + d] * w0 + A[b * 2 + d] * r1 + A[c * 2 + d] * r2;
    }
    part[k] = ID[a];
    rnd[k] = R();
  }
  return { pos, uv, aux: ax, part, rnd };
}

// iso-parameter wire lines
export function wireLines(parts, mesh, stepU = 4, stepV = 2) {
  const P = mesh.positions;
  const out = [];
  for (const part of parts) {
    const { nu, nv, _base } = part;
    const at = (i, j) => _base + i * (nv + 1) + j;
    const push = (a, b) => out.push(P[a * 3], P[a * 3 + 1], P[a * 3 + 2], P[b * 3], P[b * 3 + 1], P[b * 3 + 2]);
    for (let j = 0; j <= nv; j += stepV) for (let i = 0; i < nu; i++) push(at(i, j), at(i + 1, j));
    for (let i = 0; i <= nu; i += stepU) for (let j = 0; j < nv; j++) push(at(i, j), at(i, j + 1));
  }
  return new Float32Array(out);
}

// mossy mound under the plant (points only)
export function groundPoints(count, seed = 11) {
  const R = rng(seed);
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const r = 15 * Math.sqrt(R());
    const a = R() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const hgt = 1.5 * Math.exp(-(r * r) / 45) - 0.9 + 0.35 * Math.sin(x * 0.9 + z * 0.4) * Math.cos(z * 0.7) + (R() - 0.5) * 0.35;
    pos[k * 3] = x;
    pos[k * 3 + 1] = hgt;
    pos[k * 3 + 2] = z;
    rnd[k] = R();
  }
  return { pos, rnd };
}
