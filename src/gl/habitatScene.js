// Shot 4: understory habitat block diagram (qualitative, not measured data).
// Terrain with a mossy stream valley, a cut-away soil section (litter / humus /
// rocky soil / bedrock with crevices), rocks, trunks + canopy, the specimen as a
// node, relation lines, habitat patches with connectivity, and a population.
import * as THREE from 'three';
import { rng, fbm1 } from '../core/util.js';

const X0 = -40, X1 = 40, Z0 = -24, Z1 = 24, BOTTOM = -12;

function vnoise2(x, z) {
  const s = (a, b) => {
    const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = s(ix, iz), b = s(ix + 1, iz), c = s(ix, iz + 1), d = s(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbm2(x, z) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < 4; i++) {
    s += a * vnoise2(x * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}

export const valleyX = (z) => 4 * Math.sin(z * 0.085) - 2;
export function heightAt(x, z) {
  const d = x - valleyX(z);
  let y = 1.2 + 0.0105 * d * d * (d < 0 ? 1.25 : 0.9);
  y = Math.min(y, 15 + d * 0.02);
  y += (fbm2(x * 0.09 + 3, z * 0.09) - 0.5) * 3.2;
  y -= 1.4 * Math.exp(-(d * d) / 5);
  return y;
}

const ADD = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
};

export class HabitatScene {
  constructor(w = 1920, h = 1080) {
    this.w = w;
    this.h = h;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(w, h, false);
    r.setClearColor(0, 0);
    this.renderer = r;
    this.canvas = r.domElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, w / h, 1, 800);
    this.target = new THREE.Vector3(0, 3, 0);
    this._v = new THREE.Vector3();

    const plantZ = 7;
    const plantX = valleyX(plantZ) + 8.5;
    this.plant = new THREE.Vector3(plantX, heightAt(plantX, plantZ), plantZ);

    this.U = {
      uReveal: { value: 0 },
      uCenter: { value: this.plant },
      uTime: { value: 0 },
      uTrees: { value: 0 },
      uStrata: { value: 1 },
      uMist: { value: 1 },
      uMistShift: { value: 0 },
      uPatch: { value: [] },
      uPatchA: { value: 0 },
      uStream: { value: 1 },
    };
    // habitat patches (x, z, r, alive)
    const patchDefs = [
      [plantX, plantZ, 7, 1],
      [valleyX(-12) + 7, -12, 6, 1],
      [valleyX(-2) - 10, -2, 5.5, 1],
      [valleyX(18) - 6, 18, 5, 1],
      [valleyX(-20) - 8, -19, 4.5, 1],
      [valleyX(14) + 20, 13, 4.5, 1],
    ];
    this.patches = patchDefs.map((p) => new THREE.Vector4(...p));
    this.U.uPatch.value = this.patches;

    this.buildTerrain();
    this.buildSection();
    this.buildStream();
    this.buildRocks();
    this.buildTrees();
    this.buildMist();
    this.buildLinks();
    this.buildPopulation();
    this.buildRelations();
    this.buildNode();
  }

  // ------------------------------------------------------------------ terrain
  buildTerrain() {
    const NX = 160, NZ = 96;
    const g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, NX, NZ);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const moss = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = heightAt(x, z);
      pos.setY(i, y);
      const d = x - valleyX(z);
      moss[i] = Math.exp(-(d * d) / 60) * (0.6 + 0.4 * fbm2(x * 0.2, z * 0.2));
    }
    g.setAttribute('aMoss', new THREE.BufferAttribute(moss, 1));
    g.computeVertexNormals();
    const U = this.U;
    this.terrain = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: U,
        vertexShader: /* glsl */ `
          attribute float aMoss; varying float vMoss; varying vec3 vP; varying vec3 vN;
          void main(){ vMoss = aMoss; vP = position; vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uReveal, uTime, uPatchA; uniform vec3 uCenter; uniform vec4 uPatch[6];
          varying float vMoss; varying vec3 vP; varying vec3 vN;
          void main(){
            float dist = length(vP.xz - uCenter.xz);
            if(dist > uReveal) discard;
            float edge = smoothstep(2.5, 0.0, uReveal - dist);
            vec3 N = normalize(vN);
            float lam = max(dot(N, normalize(vec3(-0.4, 0.85, 0.35))), 0.0);
            vec3 col = vec3(0.018, 0.04, 0.05) + vec3(0.03, 0.07, 0.08)*lam;
            col = mix(col, vec3(0.04, 0.13, 0.08) + vec3(0.03,0.08,0.04)*lam, clamp(vMoss,0.0,1.0)*0.9);
            float rocky = smoothstep(0.55, 0.85, 1.0 - N.y);
            col = mix(col, vec3(0.07, 0.08, 0.09)*(0.6+lam), rocky*0.7);
            float c = abs(fract(vP.y*0.7) - 0.5);
            col += vec3(0.25, 0.7, 0.85) * smoothstep(0.05, 0.0, abs(c - 0.47)) * 0.28;
            vec2 gg = abs(fract(vP.xz/4.0) - 0.5);
            col += vec3(0.2, 0.6, 0.75) * smoothstep(0.015, 0.0, min(abs(gg.x-0.485), abs(gg.y-0.485))) * 0.18;
            for(int i=0;i<6;i++){
              vec4 P = uPatch[i];
              float d = length(vP.xz - P.xy);
              float inside = smoothstep(P.z, P.z - 0.8, d);
              float ring = smoothstep(0.28, 0.0, abs(d - P.z));
              float alive = P.w;
              float hatch = step(0.5, fract((vP.x + vP.z)*0.9));
              vec3 live = vec3(0.25, 0.85, 1.0);
              vec3 lost = vec3(1.0, 0.62, 0.2);
              float dash = step(0.5, fract(atan(vP.z-P.y, vP.x-P.x)*6.0));
              col += uPatchA * (live*(inside*0.07 + ring*0.75)*alive + lost*(inside*hatch*0.08 + ring*dash*0.5)*(1.0-alive));
            }
            col += edge * vec3(0.4, 0.9, 1.0) * 0.9;
            gl_FragColor = vec4(col, 1.0);
          }`,
      })
    );
    this.scene.add(this.terrain);
  }

  // ------------------------------------------------------------------ cut-away soil section
  buildSection() {
    const faces = [];
    const N = 160;
    // front face (z = Z1) and right face (x = X1)
    const mk = (pts) => {
      const pos = [], top = [], idx = [];
      pts.forEach(([x, z], i) => {
        const y = heightAt(x, z);
        pos.push(x, y, z, x, BOTTOM, z);
        top.push(y, y);
        if (i > 0) {
          const a = (i - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
      g.setIndex(idx);
      return g;
    };
    const front = [], right = [];
    for (let i = 0; i <= N; i++) front.push([X0 + ((X1 - X0) * i) / N, Z1]);
    for (let i = 0; i <= 96; i++) right.push([X1, Z1 - ((Z1 - Z0) * i) / 96]);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.U,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        attribute float aTop; varying float vTop; varying vec3 vP;
        void main(){ vTop = aTop; vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uReveal, uStrata; uniform vec3 uCenter;
        varying float vTop; varying vec3 vP;
        vec2 h22(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
        float voro(vec2 x){ vec2 n=floor(x), f=fract(x); float m1=8.0, m2=8.0;
          for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 r=g+h22(n+g)-f; float d=dot(r,r);
            if(d<m1){ m2=m1; m1=d; } else if(d<m2) m2=d; }
          return sqrt(m2)-sqrt(m1); }
        void main(){
          float dist = length(vP.xz - uCenter.xz);
          if(dist > uReveal + 6.0) discard;
          float depth = vTop - vP.y;
          float s = vP.x + vP.z;
          vec3 col; float hatch;
          vec3 line = vec3(0.25, 0.75, 0.9);
          if(depth < 0.6){ col = vec3(0.07, 0.2, 0.1); hatch = step(0.6, fract(s*3.0)); }
          else if(depth < 3.0){ col = vec3(0.16, 0.09, 0.04); hatch = step(0.75, fract((s + vP.y)*1.6)); line = vec3(1.0, 0.7, 0.35); }
          else if(depth < 7.5){
            float v = voro(vec2(s, vP.y)*0.7);
            col = vec3(0.06, 0.065, 0.07) + vec3(0.07)*smoothstep(0.05, 0.25, v);
            hatch = smoothstep(0.06, 0.0, v);
          } else {
            float v = voro(vec2(s*0.25, vP.y*0.5));
            col = vec3(0.03, 0.035, 0.045);
            hatch = smoothstep(0.035, 0.0, v);
            line = vec3(0.4, 0.85, 1.0);
          }
          col += line * hatch * 0.16;
          float b = min(min(abs(depth-0.6), abs(depth-3.0)), abs(depth-7.5));
          col += vec3(0.35, 0.85, 1.0) * smoothstep(0.08, 0.0, b) * 0.6;
          col += vec3(0.35, 0.85, 1.0) * smoothstep(0.12, 0.0, depth) * 0.9;
          gl_FragColor = vec4(col * uStrata, 1.0);
        }`,
    });
    this.section = new THREE.Group();
    this.section.add(new THREE.Mesh(mk(front), mat), new THREE.Mesh(mk(right), mat));
    // block outline
    const ol = [];
    const corner = (x, z) => [x, heightAt(x, z), z];
    for (const [x, z] of [[X0, Z1], [X1, Z1], [X1, Z0]]) ol.push(new THREE.Vector3(x, BOTTOM, z), new THREE.Vector3(...corner(x, z)));
    ol.push(new THREE.Vector3(X0, BOTTOM, Z1), new THREE.Vector3(X1, BOTTOM, Z1), new THREE.Vector3(X1, BOTTOM, Z1), new THREE.Vector3(X1, BOTTOM, Z0));
    this.outline = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ol), new THREE.LineBasicMaterial({ color: 0x6fe7ff, transparent: true, opacity: 0.5 }));
    this.section.add(this.outline);
    this.scene.add(this.section);
  }

  // ------------------------------------------------------------------ stream
  buildStream() {
    const R = rng(5);
    const n = 2600;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      seed[i] = R();
      pos[i * 3] = (R() - 0.5) * 2.4; // lateral offset
      pos[i * 3 + 1] = R();
      pos[i * 3 + 2] = R();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    // valley path baked into a texture-free uniform polyline: sample 64 points
    const path = [];
    for (let i = 0; i <= 63; i++) {
      const z = Z0 + ((Z1 - Z0) * i) / 63;
      const x = valleyX(z);
      path.push(new THREE.Vector3(x, heightAt(x, z) + 0.15, z));
    }
    this.streamPath = path;
    this.stream = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: { ...this.U, uPath: { value: path } },
        ...ADD,
        vertexShader: /* glsl */ `
          uniform vec3 uPath[64]; uniform float uTime, uReveal, uStream; uniform vec3 uCenter;
          attribute float aSeed; varying float vA;
          void main(){
            float t = fract(position.z + uTime*0.035*(0.7+aSeed*0.6));
            float fi = t*63.0; int i0 = int(floor(fi)); float f = fract(fi);
            vec3 p = mix(uPath[i0], uPath[min(i0+1,63)], f);
            p.x += position.x * (0.8 + 0.4*sin(t*20.0));
            p.y += position.y*0.15;
            float dist = length(p.xz - uCenter.xz);
            vA = step(dist, uReveal) * uStream * (0.35 + 0.65*aSeed);
            vec4 mv = modelViewMatrix*vec4(p,1.0);
            gl_PointSize = (1.2 + aSeed*1.6) * (240.0 / -mv.z);
            gl_Position = projectionMatrix*mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vA; if(a<0.01) discard;
            gl_FragColor = vec4(vec3(0.45, 0.85, 1.0)*a, a); }`,
      })
    );
    this.scene.add(this.stream);
  }

  // ------------------------------------------------------------------ rocks
  buildRocks() {
    const R = rng(9);
    this.rocks = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9fdff0, transparent: true, opacity: 0.55 });
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x0a1218 });
    const place = [];
    // two rocks forming the crevice the specimen grows in
    const p = this.plant;
    place.push([p.x - 2.2, p.z - 0.6, 1.9], [p.x + 2.4, p.z - 1.2, 2.2]);
    for (let i = 0; i < 30; i++) {
      const z = Z0 + 2 + R() * (Z1 - Z0 - 4);
      const side = R() < 0.5 ? -1 : 1;
      const x = valleyX(z) + side * (3 + R() * 22);
      if (x < X0 + 2 || x > X1 - 2) continue;
      place.push([x, z, 0.8 + R() * 2.4]);
    }
    this.rockPlaces = place;
    for (const [x, z, s] of place) {
      const geo = new THREE.IcosahedronGeometry(1, 0);
      geo.scale(s * (0.9 + R() * 0.5), s * (0.55 + R() * 0.3), s * (0.8 + R() * 0.5));
      geo.rotateY(R() * 6);
      const m = new THREE.Mesh(geo, fillMat);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat);
      const gr = new THREE.Group();
      gr.add(m, e);
      gr.position.set(x, heightAt(x, z) + s * 0.15, z);
      gr.userData.d = Math.hypot(x - p.x, z - p.z);
      this.rocks.add(gr);
    }
    this.scene.add(this.rocks);
  }

  // ------------------------------------------------------------------ trees & canopy
  buildTrees() {
    const R = rng(21);
    const trunks = [], tH = [];
    const cpos = [], cseed = [];
    const p = this.plant;
    for (let i = 0; i < 18; i++) {
      const z = Z0 + 3 + R() * (Z1 - Z0 - 6);
      const x = X0 + 4 + R() * (X1 - X0 - 8);
      if (Math.hypot(x - p.x, z - p.z) < 6 || Math.abs(x - valleyX(z)) < 3) continue;
      const y0 = heightAt(x, z);
      const top = 21 + R() * 8;
      const lean = [(R() - 0.5) * 3, (R() - 0.5) * 3];
      trunks.push(x, y0, z, x + lean[0], top, z + lean[1]);
      tH.push(0, 1);
      // canopy cluster
      const n = 260 + Math.floor(R() * 200);
      const rx = 4.5 + R() * 3.5, ry = 2.4 + R() * 1.6;
      for (let k = 0; k < n; k++) {
        const a = R() * Math.PI * 2, b = Math.acos(2 * R() - 1), rr = Math.cbrt(R());
        cpos.push(x + lean[0] + Math.sin(b) * Math.cos(a) * rx * rr, top + Math.cos(b) * ry * rr, z + lean[1] + Math.sin(b) * Math.sin(a) * rx * rr);
        cseed.push(R());
      }
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(trunks, 3));
    tg.setAttribute('aH', new THREE.Float32BufferAttribute(tH, 1));
    this.trunks = new THREE.LineSegments(
      tg,
      new THREE.ShaderMaterial({
        uniforms: this.U,
        ...ADD,
        vertexShader: `attribute float aH; varying float vH; void main(){ vH = aH; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uTrees; varying float vH; void main(){ if(vH > uTrees) discard; float a = 0.4*(1.0 - vH*0.5); gl_FragColor = vec4(vec3(0.5,0.85,0.95)*a, a); }`,
      })
    );
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
    cg.setAttribute('aSeed', new THREE.Float32BufferAttribute(cseed, 1));
    this.canopy = new THREE.Points(
      cg,
      new THREE.ShaderMaterial({
        uniforms: this.U,
        ...ADD,
        vertexShader: /* glsl */ `
          attribute float aSeed; uniform float uTrees, uTime; varying float vA;
          void main(){
            vec3 p = position; p.x += sin(uTime*0.5 + aSeed*20.0)*0.15;
            vec4 mv = modelViewMatrix*vec4(p,1.0);
            vA = smoothstep(aSeed, aSeed + 0.2, uTrees*1.2 - 0.2) * 0.45;
            gl_PointSize = (1.2 + aSeed) * (240.0 / -mv.z);
            gl_Position = projectionMatrix*mv;
          }`,
        fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vA; if(a<0.01) discard; gl_FragColor = vec4(vec3(0.35,0.75,0.6)*a, a); }`,
      })
    );
    this.scene.add(this.trunks, this.canopy);
  }

  // ------------------------------------------------------------------ microclimate mist
  buildMist() {
    const R = rng(33);
    const n = 3000;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const z = Z0 + R() * (Z1 - Z0);
      const x = valleyX(z) + (R() - 0.5) * 34;
      pos[i * 3] = x;
      pos[i * 3 + 1] = heightAt(x, z) + 0.5 + R() * 5;
      pos[i * 3 + 2] = z;
      seed[i] = R();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.mist = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.U,
        ...ADD,
        vertexShader: /* glsl */ `
          attribute float aSeed; uniform float uTime, uMist, uMistShift, uReveal; uniform vec3 uCenter; varying float vA; varying float vS;
          void main(){
            vec3 p = position;
            p.z += fract(uTime*0.01 + aSeed) * 3.0;
            p.y += sin(uTime*0.6 + aSeed*30.0)*0.3 + uMistShift*aSeed*3.0;
            float dist = length(p.xz - uCenter.xz);
            vA = step(dist, uReveal) * uMist * 0.22 * step(aSeed, 1.0 - uMistShift*0.6);
            vS = aSeed;
            vec4 mv = modelViewMatrix*vec4(p,1.0);
            gl_PointSize = (3.0 + aSeed*4.0) * (240.0 / -mv.z);
            gl_Position = projectionMatrix*mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uMistShift; varying float vA; varying float vS;
          void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*vA; if(a<0.004) discard;
            vec3 c = mix(vec3(0.4,0.8,0.95), vec3(1.0,0.7,0.35), uMistShift*0.7);
            gl_FragColor = vec4(c*a, a); }`,
      })
    );
    this.scene.add(this.mist);
  }

  // ------------------------------------------------------------------ patch connectivity
  drape(a, b, n = 60, lift = 0.4, arc = 0) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      pts.push(new THREE.Vector3(x, heightAt(x, z) + lift + Math.sin(Math.PI * t) * arc, z));
    }
    return pts;
  }

  flowLine(pts, color, o = {}) {
    const n = pts.length;
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const at = new Float32Array(n);
    for (let i = 0; i < n; i++) at[i] = i / (n - 1);
    g.setAttribute('aT', new THREE.BufferAttribute(at, 1));
    const U = {
      uDraw: { value: 0 },
      uA: { value: 1 },
      uBreak: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uTime: this.U.uTime,
      uDash: { value: o.dash ?? 0 },
      uSpeed: { value: o.speed ?? 1 },
    };
    const line = new THREE.Line(
      g,
      new THREE.ShaderMaterial({
        uniforms: U,
        ...ADD,
        depthTest: o.depthTest ?? true,
        vertexShader: `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uDraw, uA, uBreak, uTime, uDash, uSpeed; uniform vec3 uColor; varying float vT;
          void main(){
            if(vT > uDraw) discard;
            if(abs(vT - 0.5) < uBreak*0.18) discard;
            float flow = 0.55 + 0.45*smoothstep(0.7, 1.0, fract(vT*8.0 - uTime*0.8*uSpeed));
            if(uDash > 0.5 && fract(vT*40.0) > 0.55) discard;
            float a = uA * flow;
            gl_FragColor = vec4(uColor*a, a);
          }`,
      })
    );
    line.userData.U = U;
    return line;
  }

  buildLinks() {
    const P = this.patches;
    const pairs = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 5], [0, 5]];
    this.links = pairs.map(([a, b]) => {
      const A = new THREE.Vector3(P[a].x, 0, P[a].y), B = new THREE.Vector3(P[b].x, 0, P[b].y);
      const l = this.flowLine(this.drape(A, B, 80, 0.5), 0x6fe7ff);
      l.userData.pair = [a, b];
      this.scene.add(l);
      return l;
    });
  }

  buildPopulation() {
    const R = rng(77);
    const p = this.plant;
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + R() * 0.4;
      const rr = 3 + R() * 4.5;
      const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr * 0.8;
      pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.35, z));
    }
    this.population = pts;
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const state = new Float32Array(pts.length).fill(1);
    g.setAttribute('aState', new THREE.BufferAttribute(state, 1));
    this.popState = g.attributes.aState;
    this.pop = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: { ...this.U, uPopA: { value: 0 } },
        ...ADD,
        depthTest: false,
        vertexShader: `attribute float aState; uniform float uPopA; varying float vA; void main(){ vA = uPopA*aState; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = 9.0; gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord-0.5; float d = max(abs(c.x),abs(c.y)); float a = (smoothstep(0.5,0.4,d) - smoothstep(0.32,0.22,d)*0.7)*vA; if(a<0.01) discard; gl_FragColor = vec4(vec3(0.45,0.9,1.0)*a, a); }`,
      })
    );
    this.scene.add(this.pop);
  }

  buildRelations() {
    const p = this.plant;
    const node = p.clone().add(new THREE.Vector3(0, 1.2, 0));
    const curve = (arr, n = 90) => new THREE.CatmullRomCurve3(arr.map((a) => new THREE.Vector3(...a))).getPoints(n);
    const sz = 2;
    const sx = valleyX(sz);
    const defs = {
      canopy: { pts: curve([[p.x - 7, 26, p.z - 3], [p.x - 4, 17, p.z - 1], [p.x - 1, 8, p.z], [node.x, node.y + 0.5, node.z]]), color: 0xd8f6ff, dash: 1 },
      water: { pts: curve([[sx, heightAt(sx, sz) + 0.3, sz], [sx + 3, heightAt(sx + 3, sz + 2) + 0.6, sz + 2], [p.x - 3, heightAt(p.x - 3, p.z) + 0.8, p.z - 0.5], [node.x, node.y, node.z]]), color: 0x6fe7ff },
      humus: { pts: curve([[p.x + 0.5, p.y - 2.6, p.z + 1.5], [p.x + 0.3, p.y - 1.3, p.z + 0.8], [node.x, node.y - 0.2, node.z]]), color: 0xffc070, depthTest: false },
      moss: { pts: curve([[p.x - 5, heightAt(p.x - 5, p.z + 4) + 0.4, p.z + 4], [p.x - 3, heightAt(p.x - 3, p.z + 2) + 1.5, p.z + 2], [node.x, node.y, node.z]]), color: 0x8ff0b8 },
      pollen: { pts: curve([[p.x - 26, 20, p.z - 16], [p.x - 16, 15, p.z - 4], [p.x - 6, 12, p.z + 6], [p.x - 1, 6, p.z + 3], [node.x, node.y + 1.2, node.z]], 160), color: 0xe9fbff, dash: 1, speed: 2 },
    };
    this.rel = {};
    for (const [k, d] of Object.entries(defs)) {
      const l = this.flowLine(d.pts, d.color, { dash: d.dash, speed: d.speed, depthTest: d.depthTest });
      l.userData.pts = d.pts;
      this.rel[k] = l;
      this.scene.add(l);
    }
    this.nodePos = node;
  }

  buildNode() {
    const p = this.plant;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 48),
      new THREE.MeshBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(p).add(new THREE.Vector3(0, 0.2, 0));
    const ring2 = ring.clone();
    ring2.material = ring.material.clone();
    const pin = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([p.clone(), p.clone().add(new THREE.Vector3(0, 7, 0))]),
      new THREE.LineBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.8, depthTest: false })
    );
    this.nodeGroup = new THREE.Group();
    this.nodeGroup.add(ring, ring2, pin);
    this.nodeRing2 = ring2;
    this.scene.add(this.nodeGroup);
  }

  // ------------------------------------------------------------------ view
  setView({ az, el, dist, shiftX = 0, shiftY = 0 }) {
    const c = this.camera;
    c.position.set(
      this.target.x + Math.sin(az) * Math.cos(el) * dist,
      this.target.y + Math.sin(el) * dist,
      this.target.z + Math.cos(az) * Math.cos(el) * dist
    );
    c.lookAt(this.target);
    const key = shiftX + ',' + shiftY;
    if (key !== this._shift) {
      this._shift = key;
      c.setViewOffset(this.w, this.h, -shiftX, -shiftY, this.w, this.h);
    }
    c.updateMatrixWorld();
  }

  project(p) {
    const v = this._v.set(p.x ?? p[0], p.y ?? p[1], p.z ?? p[2]).project(this.camera);
    return [(v.x * 0.5 + 0.5) * this.w, (-v.y * 0.5 + 0.5) * this.h];
  }

  // relation draw progress; patches alive; population removed etc
  render(s) {
    const U = this.U;
    U.uReveal.value = s.reveal;
    U.uTime.value = s.time;
    U.uTrees.value = s.trees;
    U.uMist.value = s.mist;
    U.uMistShift.value = s.mistShift;
    U.uPatchA.value = s.patchA;
    U.uStream.value = s.stream ?? 1;
    this.patches.forEach((p, i) => (p.w = s.patchAlive[i]));
    this.links.forEach((l, i) => {
      const u = l.userData.U;
      u.uDraw.value = s.linkDraw;
      u.uBreak.value = s.linkBreak[i];
      u.uA.value = s.patchA * (0.75 - 0.55 * s.linkBreak[i]);
      u.uColor.value.set(s.linkBreak[i] > 0.05 ? 0xffb340 : 0x6fe7ff);
    });
    for (const [k, l] of Object.entries(this.rel)) {
      const r = s.rel[k] || { draw: 0, a: 0 };
      l.userData.U.uDraw.value = r.draw;
      l.userData.U.uA.value = r.a;
      l.userData.U.uBreak.value = r.brk ?? 0;
      if (r.color) l.userData.U.uColor.value.set(r.color);
    }
    this.pop.material.uniforms.uPopA.value = s.popA;
    for (let i = 0; i < this.population.length; i++) this.popState.array[i] = s.popAlive[i];
    this.popState.needsUpdate = true;
    this.rocks.children.forEach((r) => (r.visible = r.userData.d < s.reveal));
    this.section.visible = s.reveal > 1;
    this.outline.material.opacity = 0.5 * Math.min(1, Math.max(0, (s.reveal - 35) / 30));
    const pulse = (s.time * 0.6) % 1;
    this.nodeRing2.scale.setScalar(1 + pulse * 2.5);
    this.nodeRing2.material.opacity = (1 - pulse) * 0.7 * s.nodeA;
    this.nodeGroup.children[0].material.opacity = 0.9 * s.nodeA;
    this.nodeGroup.children[2].material.opacity = 0.8 * s.nodeA;
    this.renderer.render(this.scene, this.camera);
  }
}
