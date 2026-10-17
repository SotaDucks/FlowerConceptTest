// Three.js reconstruction view of the orchid: point cloud -> contour wire -> surface.
import * as THREE from 'three';
import { buildPlant, tessellate, samplePoints, wireLines, groundPoints } from './orchidGeometry.js';

const GLSL_COMMON = /* glsl */ `
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
  float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
    return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
  float voroEdge(vec2 x){
    vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.0;
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
      vec2 g = vec2(float(i),float(j)); vec2 o = h22(n+g); vec2 r = g+o-f; float d = dot(r,r);
      if(d<md){ md=d; mr=r; mg=g; } }
    md = 8.0;
    for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){
      vec2 g = mg+vec2(float(i),float(j)); vec2 o = h22(n+g); vec2 r = g+o-f;
      if(dot(mr-r,mr-r)>0.00001) md = min(md, dot(0.5*(mr+r), normalize(r-mr))); }
    return md;
  }
  vec3 partColor(float part, vec2 uv, vec2 aux){
    if(part < 0.5){ // leaf: tessellated dark / light green network
      vec2 p = aux * vec2(1.15, 1.8);
      float e = voroEdge(p + vec2(vnoise(p*0.7)*0.7, vnoise(p*0.5+7.0)*0.4));
      float m = smoothstep(0.025, 0.11, e);
      float pz = vnoise(p*0.38 + 3.0);
      m = mix(m, 0.0, smoothstep(0.62, 0.8, pz)*0.85);
      vec3 light = vec3(0.40, 0.55, 0.32), dark = vec3(0.05, 0.15, 0.08);
      vec3 c = mix(light, dark, m);
      c *= 1.0 - 0.35*smoothstep(0.08, 0.0, abs(uv.y));
      c = mix(c, light*0.7, smoothstep(0.92, 1.0, abs(uv.y))*0.5);
      return c;
    } else if(part < 1.5){ // dorsal sepal: white with converging green->purple veins
      float line = 1.0 - smoothstep(0.0, 0.42, abs(sin(uv.y*6.5*3.14159)));
      vec3 white = vec3(0.8, 0.86, 0.75), green = vec3(0.12, 0.3, 0.1), purple = vec3(0.27, 0.03, 0.2);
      vec3 vein = mix(green, purple, smoothstep(0.15, 0.6, uv.x + 0.25*abs(uv.y)));
      vec3 c = mix(white, vein, line*0.95);
      c = mix(c, mix(white, purple, 0.3), smoothstep(0.55, 1.0, uv.x)*0.3);
      c = mix(c, green*1.4, 0.45*smoothstep(0.4, 0.0, uv.x)*(1.0-abs(uv.y)));
      c = mix(c, white*1.05, smoothstep(0.9, 1.0, abs(uv.y)));
      return c;
    } else if(part < 2.5){ // petals: green base -> purple-red tip, dark warts on upper margin
      vec3 c = mix(vec3(0.55, 0.62, 0.45), vec3(0.42, 0.1, 0.2), smoothstep(0.12, 0.65, uv.x));
      float line = 1.0 - smoothstep(0.0, 0.25, abs(sin(uv.y*5.0*3.14159)));
      c = mix(c, c*0.55 + vec3(0.1,0.0,0.05), line*0.5);
      vec2 g = vec2(uv.x*20.0, uv.y*3.2);
      vec2 id = floor(g); vec2 f = fract(g)-0.5;
      vec2 off = (h22(id+3.1)-0.5)*0.45;
      float spot = smoothstep(0.3, 0.12, length(f-off)) * step(0.35, h21(id)) * step(0.0, uv.y) * smoothstep(0.85, 0.3, uv.x);
      return mix(c, vec3(0.1, 0.015, 0.05), spot);
    } else if(part < 3.5){ // pouch: purple-red / chestnut, fine net veins, greener rim
      vec3 c = mix(vec3(0.44, 0.1, 0.17), vec3(0.34, 0.15, 0.11), 0.5 + 0.5*sin(uv.y*6.283*3.0 + uv.x*3.0));
      float line = 1.0 - smoothstep(0.0, 0.14, abs(sin(uv.y*6.283*8.0 + uv.x*1.5)));
      float l2 = 1.0 - smoothstep(0.0, 0.1, abs(sin(uv.x*22.0)));
      c *= 1.0 - 0.32*max(line, l2*0.6);
      c = mix(c, vec3(0.5, 0.55, 0.32), smoothstep(0.25, 0.0, uv.x)*0.5);
      return c;
    } else if(part < 4.5){ // staminode
      return mix(vec3(0.82, 0.86, 0.68), vec3(0.4, 0.52, 0.25), smoothstep(0.3, 1.0, uv.x)) * (0.85 + 0.15*sin(uv.y*40.0));
    } else if(part < 5.5){ // scape / ovary
      return mix(vec3(0.2, 0.09, 0.12), vec3(0.3, 0.36, 0.2), smoothstep(0.4, 1.0, uv.x));
    } else if(part < 6.5){ // synsepal
      return mix(vec3(0.72, 0.8, 0.6), vec3(0.32, 0.48, 0.22), 1.0 - smoothstep(0.0, 0.22, abs(sin(uv.y*5.0*3.14159))));
    }
    return vec3(0.13, 0.2, 0.13);
  }
`;

export class OrchidScene {
  constructor(w = 1920, h = 1080) {
    this.w = w;
    this.h = h;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(w, h, false);
    r.setClearColor(0x000000, 0);
    this.renderer = r;
    this.canvas = r.domElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, w / h, 1, 600);
    this.target = new THREE.Vector3(0.6, 11.8, 0);

    const plant = buildPlant();
    this.plant = plant;
    const mesh = tessellate(plant.parts);

    this.U = {
      uScanY: { value: -2 },
      uDensity: { value: 0 },
      uPtsAlpha: { value: 1 },
      uColorMix: { value: 0 },
      uSize: { value: 1.6 },
      uWireY: { value: -2 },
      uWireAlpha: { value: 0 },
      uSurf: { value: 0 },
      uContour: { value: 0.4 },
      uGrade: { value: 0.35 },
      uTime: { value: 0 },
      uGround: { value: 0 },
    };

    // --- surface
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    g.setAttribute('aUv', new THREE.BufferAttribute(mesh.uvs, 2));
    g.setAttribute('aAux', new THREE.BufferAttribute(mesh.aux, 2));
    g.setAttribute('aPart', new THREE.BufferAttribute(mesh.parts, 1));
    g.setIndex(mesh.index);
    g.computeVertexNormals();
    this.surface = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.U,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          attribute vec2 aUv; attribute vec2 aAux; attribute float aPart;
          varying vec2 vUv; varying vec2 vAux; varying float vPart; varying vec3 vPos; varying vec3 vN; varying vec3 vV;
          void main(){
            vUv = aUv; vAux = aAux; vPart = aPart; vPos = position;
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uSurf, uContour, uGrade, uTime, uScanY;
          varying vec2 vUv; varying vec2 vAux; varying float vPart; varying vec3 vPos; varying vec3 vN; varying vec3 vV;
          ${GLSL_COMMON}
          void main(){
            float n = h31(floor(vPos*1.6));
            float r = 0.72*(vPos.y+1.0)/27.0 + 0.28*n;
            if(r > uSurf) discard;
            float edge = smoothstep(0.06, 0.0, uSurf - r);
            vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
            vec3 L = normalize(vec3(-0.45, 0.75, 0.55));
            vec3 L2 = normalize(vec3(0.7, 0.2, -0.6));
            float lam = max(dot(N, L), 0.0);
            float back = max(dot(N, L2), 0.0);
            float rim = pow(1.0 - max(dot(N, vV), 0.0), 2.5);
            vec3 H = normalize(L + vV);
            float glossy = (vPart > 2.5 && vPart < 3.5) ? 1.0 : (vPart < 0.5 ? 0.55 : 0.25);
            float spec = pow(max(dot(N, H), 0.0), 36.0) * glossy;
            vec3 base = partColor(vPart, vUv, vAux);
            vec3 col = base * (0.16 + 0.9*lam + 0.22*back) + spec*vec3(0.85, 0.95, 1.0)*0.55;
            if(vPart > 2.5 && vPart < 3.5 && gl_FrontFacing) col = base * 0.22;
            col += rim * vec3(0.3, 0.8, 1.0) * 0.45;
            float lum = dot(col, vec3(0.299, 0.587, 0.114));
            float grade = (vPart > 0.5 && vPart < 4.5) ? uGrade*0.3 : uGrade*0.6;
            col = mix(col, vec3(lum)*vec3(0.72, 0.96, 1.08), grade);
            float sl = abs(fract(vPos.y*0.85) - 0.5);
            col += vec3(0.3, 0.85, 1.0) * smoothstep(0.035, 0.0, abs(sl-0.48)) * uContour * 0.5;
            col += edge * vec3(0.55, 0.95, 1.0) * 1.6;
            gl_FragColor = vec4(col, 1.0);
          }`,
      })
    );
    this.scene.add(this.surface);

    // --- points
    const pts = samplePoints(mesh, 72000, 17);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pts.pos, 3));
    pg.setAttribute('aUv', new THREE.BufferAttribute(pts.uv, 2));
    pg.setAttribute('aAux', new THREE.BufferAttribute(pts.aux, 2));
    pg.setAttribute('aPart', new THREE.BufferAttribute(pts.part, 1));
    pg.setAttribute('aRnd', new THREE.BufferAttribute(pts.rnd, 1));
    const additive = {
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    };
    this.points = new THREE.Points(
      pg,
      new THREE.ShaderMaterial({
        uniforms: this.U,
        ...additive,
        vertexShader: /* glsl */ `
          attribute vec2 aUv; attribute vec2 aAux; attribute float aPart; attribute float aRnd;
          uniform float uScanY, uDensity, uSize, uColorMix, uPtsAlpha, uTime;
          varying vec3 vCol; varying float vA;
          ${GLSL_COMMON}
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float vis = step(aRnd, uDensity) * step(position.y, uScanY);
            float band = exp(-abs(position.y - uScanY) * 0.9) * step(position.y, uScanY + 0.5);
            vec3 base = partColor(aPart, aUv, aAux);
            vCol = mix(vec3(0.42, 0.86, 1.0), base*1.7 + 0.05, uColorMix) + band*vec3(0.6, 0.95, 1.0)*1.4;
            float tw = 0.75 + 0.25*sin(uTime*3.0 + aRnd*60.0);
            vA = vis * uPtsAlpha * (0.5 + 0.5*band) * tw;
            gl_PointSize = uSize * (1.0 + band*1.6) * (260.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vCol; varying float vA;
          void main(){
            vec2 c = gl_PointCoord - 0.5; float d = length(c);
            float a = smoothstep(0.5, 0.1, d) * vA;
            if(a < 0.003) discard;
            gl_FragColor = vec4(vCol * a, a);
          }`,
      })
    );
    this.scene.add(this.points);

    // --- wire
    const wl = wireLines(plant.parts, mesh, 6, 2);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.BufferAttribute(wl, 3));
    this.wire = new THREE.LineSegments(
      wg,
      new THREE.ShaderMaterial({
        uniforms: this.U,
        ...additive,
        vertexShader: /* glsl */ `
          varying float vY;
          void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uWireY, uWireAlpha; varying float vY;
          void main(){
            if(vY > uWireY) discard;
            float front = exp(-abs(vY - uWireY)*0.8);
            float a = uWireAlpha * (0.35 + 0.65*front);
            gl_FragColor = vec4(vec3(0.4, 0.88, 1.0)*a, a);
          }`,
      })
    );
    this.scene.add(this.wire);

    // --- ground mound points
    const gp = groundPoints(16000, 23);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gp.pos, 3));
    gg.setAttribute('aRnd', new THREE.BufferAttribute(gp.rnd, 1));
    this.ground = new THREE.Points(
      gg,
      new THREE.ShaderMaterial({
        uniforms: this.U,
        ...additive,
        vertexShader: /* glsl */ `
          attribute float aRnd; uniform float uScanY, uGround, uTime; varying float vA; varying float vR;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float r = length(position.xz);
            vA = uGround * step(aRnd, 0.9) * smoothstep(15.0, 6.0, r) * step(position.y, uScanY + 1.0);
            vR = aRnd;
            gl_PointSize = 1.4 * (260.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vA; varying float vR;
          void main(){
            float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA * 0.55;
            if(a < 0.003) discard;
            vec3 c = mix(vec3(0.2, 0.42, 0.3), vec3(0.4, 0.8, 0.9), vR*0.6);
            gl_FragColor = vec4(c*a, a);
          }`,
      })
    );
    this.scene.add(this.ground);

    // --- pedestal rings + sweep
    this.pedestal = new THREE.Group();
    const ringMat = new THREE.LineBasicMaterial({ color: 0x6fe7ff, transparent: true, opacity: 0.35, depthWrite: false });
    for (const [rr, seg, dash] of [[7, 128, false], [11.5, 160, true], [16, 200, false], [17.2, 220, true]]) {
      const pts2 = [];
      for (let i = 0; i < seg; i++) {
        if (dash && i % 4 > 1) continue;
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        pts2.push(new THREE.Vector3(Math.cos(a0) * rr, 0, Math.sin(a0) * rr), new THREE.Vector3(Math.cos(a1) * rr, 0, Math.sin(a1) * rr));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts2);
      this.pedestal.add(new THREE.LineSegments(geo, ringMat));
    }
    const tick = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const L = i % 10 === 0 ? 1.6 : 0.6;
      tick.push(new THREE.Vector3(Math.cos(a) * 17.2, 0, Math.sin(a) * 17.2), new THREE.Vector3(Math.cos(a) * (17.2 + L), 0, Math.sin(a) * (17.2 + L)));
    }
    this.pedestal.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tick), ringMat));
    const sweepGeo = new THREE.CircleGeometry(16, 64, 0, Math.PI / 3);
    sweepGeo.rotateX(-Math.PI / 2);
    this.sweep = new THREE.Mesh(
      sweepGeo,
      new THREE.ShaderMaterial({
        ...additive,
        uniforms: { uA: { value: 0.5 } },
        side: THREE.DoubleSide,
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uA; varying vec3 vP;
          void main(){ float ang = atan(-vP.z, vP.x); float a = smoothstep(1.047, 0.0, ang) * uA * 0.22 * smoothstep(16.0, 4.0, length(vP.xz));
          gl_FragColor = vec4(vec3(0.4,0.9,1.0)*a, a); }`,
      })
    );
    this.pedestal.add(this.sweep);
    this.pedestal.position.y = -1.1;
    this.scene.add(this.pedestal);

    // --- scan plane
    const disc = new THREE.CircleGeometry(19, 96);
    disc.rotateX(-Math.PI / 2);
    this.scanPlane = new THREE.Mesh(
      disc,
      new THREE.ShaderMaterial({
        ...additive,
        side: THREE.DoubleSide,
        uniforms: { uA: { value: 0 } },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uA; varying vec3 vP;
          void main(){
            float r = length(vP.xz);
            float ring = smoothstep(0.35, 0.0, abs(r - 18.6));
            float grid = max(smoothstep(0.06, 0.0, abs(fract(vP.x*0.5)-0.5)-0.44), smoothstep(0.06, 0.0, abs(fract(vP.z*0.5)-0.5)-0.44));
            float a = uA * (ring*0.9 + 0.05 + grid*0.06*smoothstep(19.0, 8.0, r));
            gl_FragColor = vec4(vec3(0.45,0.92,1.0)*a, a);
          }`,
      })
    );
    this.scene.add(this.scanPlane);

    // silhouette samples for tight 2D framing
    this.silhouette = [];
    for (let i = 0; i < mesh.positions.length / 3; i += 37) {
      this.silhouette.push([mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]]);
    }
    let yMax = 0;
    for (let i = 1; i < mesh.positions.length; i += 3) yMax = Math.max(yMax, mesh.positions[i]);
    this.height = yMax;
    this._v = new THREE.Vector3();
    this.viewShiftX = 0;
  }

  setView({ az, el = 0.2, dist = 88, shiftX = 0 }) {
    const c = this.camera;
    c.position.set(
      this.target.x + Math.sin(az) * Math.cos(el) * dist,
      this.target.y + Math.sin(el) * dist,
      this.target.z + Math.cos(az) * Math.cos(el) * dist
    );
    c.lookAt(this.target);
    if (shiftX !== this.viewShiftX) {
      this.viewShiftX = shiftX;
      c.setViewOffset(this.w, this.h, -shiftX, 0, this.w, this.h);
    }
    c.updateMatrixWorld();
  }

  // world -> stage px
  project(p) {
    const v = this._v.set(p[0], p[1], p[2]).project(this.camera);
    return [(v.x * 0.5 + 0.5) * this.w, (-v.y * 0.5 + 0.5) * this.h];
  }

  screenBox() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of this.silhouette) {
      const q = this.project(b);
      x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]);
      x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  render(s) {
    const U = this.U;
    U.uScanY.value = s.scanY;
    U.uDensity.value = s.density;
    U.uPtsAlpha.value = s.ptsAlpha;
    U.uColorMix.value = s.colorMix;
    U.uWireY.value = s.wireY;
    U.uWireAlpha.value = s.wireAlpha;
    U.uSurf.value = s.surf;
    U.uContour.value = s.contour ?? 0.4;
    U.uGround.value = s.ground ?? 1;
    U.uTime.value = s.time;
    this.surface.visible = s.surf > 0.001;
    this.wire.visible = s.wireAlpha > 0.001;
    this.scanPlane.position.y = s.scanY;
    this.scanPlane.material.uniforms.uA.value = s.scanA;
    this.scanPlane.visible = s.scanA > 0.001;
    this.sweep.rotation.y = -s.time * 0.9;
    this.sweep.material.uniforms.uA.value = s.pedestal ?? 1;
    this.pedestal.children.forEach((c) => c.material && c.material.opacity !== undefined && c !== this.sweep && (c.material.opacity = 0.35 * (s.pedestal ?? 1)));
    this.renderer.render(this.scene, this.camera);
  }
}
