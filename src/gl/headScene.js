// Shot 7: holographic head-and-shoulders scan rendered with an SDF raymarcher.
// Same reconstruction language as the orchid: points -> contour lines -> surface.
import * as THREE from 'three';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform mat4 uCamWorld;
uniform mat4 uProjInv;
uniform vec3 uCamPos;
uniform float uYaw, uPitch, uTime;
uniform float uScanY, uPts, uLines, uSurf, uAlpha, uFocus;
varying vec2 vUv;

float sdE(vec3 p, vec3 r){ float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0-1.0)/k1; }
float sdC(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h)-r; }
float smin(float a, float b, float k){ float h = clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h) - k*h*(1.0-h); }
float smax(float a, float b, float k){ return -smin(-a,-b,k); }
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }

float gHair;
float body(vec3 p){
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float d = sdE(p - vec3(0.0, 0.3, -0.1), vec3(0.72, 0.84, 0.88));
  d = smin(d, sdE(p - vec3(0.0, -0.3, 0.12), vec3(0.61, 0.62, 0.64)), 0.25);
  d = smin(d, sdE(p - vec3(0.0, -0.8, 0.38), vec3(0.24, 0.16, 0.2)), 0.18);
  d = smin(d, sdC(q, vec3(0.52, -0.32, -0.02), vec3(0.26, -0.8, 0.3), 0.13), 0.2);
  d = smin(d, sdE(q - vec3(0.39, -0.07, 0.44), vec3(0.19, 0.14, 0.17)), 0.14);
  d = smin(d, sdC(q, vec3(0.0, 0.21, 0.66), vec3(0.37, 0.22, 0.55), 0.085), 0.12);
  d = smax(d, -sdE(q - vec3(0.245, 0.05, 0.73), vec3(0.15, 0.085, 0.13)), 0.07);
  d = smin(d, length(q - vec3(0.245, 0.045, 0.6)) - 0.105, 0.02);
  d = smin(d, sdC(p, vec3(0.0, 0.12, 0.72), vec3(0.0, -0.19, 0.9), 0.062), 0.08);
  d = smin(d, length(p - vec3(0.0, -0.23, 0.86)) - 0.095, 0.06);
  d = smin(d, length(q - vec3(0.085, -0.27, 0.79)) - 0.07, 0.05);
  d = smin(d, sdE(p - vec3(0.0, -0.44, 0.77), vec3(0.19, 0.05, 0.075)), 0.05);
  d = smin(d, sdE(p - vec3(0.0, -0.545, 0.75), vec3(0.16, 0.055, 0.075)), 0.05);
  d = smax(d, -sdE(p - vec3(0.0, -0.495, 0.84), vec3(0.16, 0.01, 0.09)), 0.012);
  d = smin(d, sdE(q - vec3(0.72, -0.02, -0.04), vec3(0.07, 0.21, 0.13)), 0.05);
  d = smin(d, sdC(p, vec3(0.0, -0.7, -0.14), vec3(0.0, -1.55, -0.1), 0.39), 0.2);
  d = smin(d, sdC(q, vec3(0.0, -1.6, -0.12), vec3(1.3, -1.82, -0.16), 0.32), 0.35);
  d = smin(d, sdE(p - vec3(0.0, -2.35, -0.02), vec3(1.4, 0.75, 0.5)), 0.3);
  // short hair cap above a hairline
  float hair = sdE(p - vec3(0.0, 0.36, -0.13), vec3(0.775, 0.885, 0.93));
  float line = mix(0.0, 0.52, smoothstep(-0.1, 0.55, p.z));
  hair = smax(hair, line - p.y, 0.06);
  hair += (h31(floor(p*60.0))-0.5)*0.004;
  gHair = hair;
  return smin(d, hair, 0.03);
}
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1,0,0, 0,c,s, 0,-s,c); }

float map(vec3 p){
  // only the head turns; shoulders stay put
  float k = smoothstep(-1.3, -0.95, p.y);
  vec3 ph = rotY(uYaw*k) * rotX(uPitch*k) * p;
  return body(ph);
}
vec3 nrm(vec3 p){
  vec2 e = vec2(0.002, -0.002);
  return normalize(e.xyy*map(p+e.xyy) + e.yyx*map(p+e.yyx) + e.yxy*map(p+e.yxy) + e.xxx*map(p+e.xxx));
}
void main(){
  vec2 ndc = vUv*2.0 - 1.0;
  vec4 v = uProjInv * vec4(ndc, 1.0, 1.0);
  vec3 rd = normalize((uCamWorld * vec4(normalize(v.xyz/v.w), 0.0)).xyz);
  vec3 ro = uCamPos;
  // bounding sphere
  vec3 oc = ro - vec3(0.0, -0.7, 0.0);
  float b = dot(oc, rd), c = dot(oc, oc) - 3.1*3.1, h = b*b - c;
  if(h < 0.0){ gl_FragColor = vec4(0.0); return; }
  float t = max(0.0, -b - sqrt(h)), tmax = -b + sqrt(h);
  float d; bool hit = false;
  for(int i = 0; i < 96; i++){
    vec3 p = ro + rd*t; d = map(p);
    if(d < 0.0015){ hit = true; break; }
    t += d*0.9;
    if(t > tmax) break;
  }
  if(!hit){ gl_FragColor = vec4(0.0); return; }
  vec3 p = ro + rd*t;
  float revealed = step(uScanY, p.y);
  if(revealed < 0.5){ gl_FragColor = vec4(0.0); return; }
  vec3 n = nrm(p);
  float k = smoothstep(-1.3, -0.95, p.y);
  vec3 ph = rotY(uYaw*k) * rotX(uPitch*k) * p;
  float isHair = step(gHair, 0.004);
  vec3 L = normalize(vec3(-0.5, 0.6, 0.7));
  float lam = max(dot(n, L), 0.0);
  float fill = max(dot(n, normalize(vec3(0.6, 0.1, 0.5))), 0.0);
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.2);
  // surface: cool grey bust
  vec3 skin = vec3(0.62, 0.7, 0.74);
  vec3 hairC = vec3(0.16, 0.2, 0.23);
  vec3 base = mix(skin, hairC, isHair);
  vec3 surf = base * (0.1 + 0.72*lam + 0.2*fill);
  surf = mix(surf, vec3(dot(surf, vec3(0.33)))*vec3(0.55, 0.9, 1.05), 0.7);
  // contour slices + meridians
  float sl = abs(fract(ph.y*26.0) - 0.5);
  float lineY = smoothstep(0.08, 0.0, abs(sl - 0.47));
  float ang = atan(ph.x, ph.z);
  float ml = abs(fract(ang*7.0) - 0.5);
  float lineM = smoothstep(0.05, 0.0, abs(ml - 0.48)) * smoothstep(-1.0, -0.6, ph.y);
  // lattice points
  vec3 cell = floor(ph*34.0);
  vec3 f = fract(ph*34.0) - 0.5;
  float dotp = smoothstep(0.2, 0.05, length(f.xy)) * step(0.45, h31(cell));
  vec3 cyan = vec3(0.42, 0.9, 1.0);
  vec3 col = surf * uSurf;
  col += cyan * lineY * uLines * (0.35 + 0.65*lam) * 0.9;
  col += cyan * lineM * uLines * 0.35;
  col += vec3(0.8, 0.97, 1.0) * dotp * uPts * (0.4 + 0.6*lam);
  col += cyan * rim * (0.45 + 0.4*uSurf);
  float front = exp(-abs(p.y - uScanY)*14.0) * step(uScanY, 1.3) * step(-2.6, uScanY);
  col += vec3(0.7, 0.98, 1.0) * front * 1.4;
  float a = clamp(uSurf*0.95 + uLines*0.6 + uPts*0.5 + rim*0.5 + front, 0.0, 1.0) * uAlpha;
  gl_FragColor = vec4(col * uAlpha, a);
}
`;

export class HeadScene {
  constructor(w = 846, h = 720) {
    this.w = w;
    this.h = h;
    const r = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(w, h, false);
    r.setClearColor(0, 0);
    this.renderer = r;
    this.canvas = r.domElement;
    this.camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
    this.camera.position.set(0, 0.05, 6.3);
    this.camera.lookAt(0, -0.45, 0);
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    this.U = {
      uRes: { value: new THREE.Vector2(w, h) },
      uCamWorld: { value: this.camera.matrixWorld },
      uProjInv: { value: this.camera.projectionMatrixInverse },
      uCamPos: { value: this.camera.position },
      uYaw: { value: 0 },
      uPitch: { value: 0 },
      uTime: { value: 0 },
      uScanY: { value: 2 },
      uPts: { value: 0 },
      uLines: { value: 0 },
      uSurf: { value: 0 },
      uAlpha: { value: 1 },
      uFocus: { value: 0 },
    };
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: this.U,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: FRAG,
        transparent: true,
        premultipliedAlpha: true,
      })
    );
    quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(quad);
    this.orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._v = new THREE.Vector3();
    // facial landmarks in head space
    this.landmarks = {
      eyeL: [-0.245, 0.05, 0.72], eyeR: [0.245, 0.05, 0.72], brow: [0, 0.22, 0.74],
      nose: [0, -0.24, 0.96], mouthL: [-0.18, -0.5, 0.78], mouthR: [0.18, -0.5, 0.78],
      chin: [0, -0.9, 0.5], cheekL: [-0.48, -0.12, 0.5], cheekR: [0.48, -0.12, 0.5],
      jawL: [-0.5, -0.55, 0.25], jawR: [0.5, -0.55, 0.25], top: [0, 1.12, 0.1],
    };
  }

  // landmark (head space) -> canvas px, applying the same head rotation as the shader
  project(name) {
    const [x, y, z] = this.landmarks[name];
    const yaw = this.U.uYaw.value, pitch = this.U.uPitch.value;
    // shader applies R = rotY(yaw)*rotX(pitch) to world p to get head-space; invert here
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    // inverse rotY(yaw) (GLSL column-major mat3 above equals rotation by -yaw around Y in row form)
    let px = x * cy - z * sy, pz = x * sy + z * cy, py = y;
    // inverse rotX(pitch)
    const py2 = py * cp + pz * sp, pz2 = -py * sp + pz * cp;
    const v = this._v.set(px, py2, pz2).project(this.camera);
    return [(v.x * 0.5 + 0.5) * this.w, (-v.y * 0.5 + 0.5) * this.h, v.z];
  }

  render(s) {
    const U = this.U;
    U.uYaw.value = s.yaw;
    U.uPitch.value = s.pitch;
    U.uTime.value = s.time;
    U.uScanY.value = s.scanY;
    U.uPts.value = s.pts;
    U.uLines.value = s.lines;
    U.uSurf.value = s.surf;
    U.uAlpha.value = s.alpha ?? 1;
    this.renderer.render(this.scene, this.orthoCam);
  }
}
