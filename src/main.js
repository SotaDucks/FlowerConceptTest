import '@fontsource/noto-sans-sc/300.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/jetbrains-mono/300.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/chakra-petch/300.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import './styles/base.css';
import './styles/shots.css';
import './styles/plate.css';
import './styles/shot23.css';
import './styles/shot45.css';
import './styles/shot56.css';
import './styles/shot7.css';
import './styles/player.css';

import { Engine } from './core/engine.js';
import { GlobalHud } from './components/globalHud.js';
import { Player } from './player/player.js';
import { loadPlate } from './core/plate.js';
import { loopVideo, setVideoClock } from './core/loopVideo.js';
import { PLATE, S7 } from './content.js';
import { Calib, loadCalibOverride } from './player/calib.js';
import Shot1 from './shots/shot1.js';
import Shot2 from './shots/shot2.js';
import Shot3 from './shots/shot3.js';
import Shot4 from './shots/shot4.js';
import Shot5 from './shots/shot5.js';
import Shot6 from './shots/shot6.js';
import Shot7 from './shots/shot7.js';

const FONT_SPECS = [
  '300 20px "Noto Sans SC"', '400 20px "Noto Sans SC"', '500 20px "Noto Sans SC"', '700 20px "Noto Sans SC"',
  '500 20px Rajdhani', '600 20px Rajdhani', '700 20px Rajdhani',
  '300 20px "JetBrains Mono"', '400 20px "JetBrains Mono"',
  '300 20px "Chakra Petch"', '500 20px "Chakra Petch"', '600 20px "Chakra Petch"',
];

const bootEl = document.getElementById('boot');
const bootMsg = bootEl.querySelector('.msg');
const bootBar = bootEl.querySelector('.bar i');
const step = (msg, p) => {
  bootMsg.textContent = msg;
  bootBar.style.width = `${p * 100}%`;
};

async function boot() {
  const stage = document.getElementById('stage');
  step('LOADING PLATE', 0.1);
  if (loadCalibOverride()) console.info('[NR] plate calibration override loaded from localStorage');
  const plate = await loadPlate(PLATE);
  step('LOADING FOOTAGE', 0.2);
  // the plate footage is drawn into canvases; keep its <video> in the document so it decodes
  const footage = loopVideo(PLATE.video.src);
  footage.el.className = 'footage-src';
  document.body.appendChild(footage.el);
  await Promise.all([footage.ready(), loopVideo(S7.video).ready()]);

  step('BUILDING SHOTS', 0.35);
  const shots = [new Shot1(), new Shot2(), new Shot3(), new Shot4(), new Shot5(), new Shot6(), new Shot7()];
  for (const sh of shots) {
    stage.appendChild(sh.root);
    await sh.init({ plate, shots });
    await new Promise((r) => setTimeout(r, 0));
  }
  const hud = new GlobalHud(stage);

  step('LOADING TYPE', 0.7);
  const glyphs = stage.textContent + '0123456789/\\<>_=+#*ABCDEFHKMNRSTXZ░▒▓■□▣▤▥▦▧▨▩▪▌✓—·／：（）';
  await Promise.all(FONT_SPECS.map((f) => document.fonts.load(f, glyphs).catch(() => null)));
  await document.fonts.ready;

  const params = new URLSearchParams(location.search);
  const engine = new Engine({ stage, shots, hud, fps: Number(params.get('fps')) || 25 });
  setVideoClock(engine);
  let calib = null;
  const player = new Player(document.getElementById('player'), engine, {
    onCalib: () => (calib ||= new Calib(stage, engine)).toggle(),
  });

  // fit stage to viewport
  const viewport = document.getElementById('viewport');
  let inspect = null; // dev: NR.inspect(x, y, zoom) magnifies a stage region
  const fit = () => {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    if (inspect) {
      const [x, y, z] = inspect;
      stage.style.transform = `translate(${-x * z}px, ${-y * z}px) scale(${z})`;
      return;
    }
    const sc = Math.min(vw / 1920, vh / 1080);
    const ox = (vw - 1920 * sc) / 2, oy = (vh - 1080 * sc) / 2;
    stage.style.transform = `translate(${ox}px, ${oy}px) scale(${sc})`;
  };
  window.addEventListener('resize', fit);
  new ResizeObserver(fit).observe(viewport);
  fit();

  // URL control: ?shot=3&t=4.2&clean=1&play=1&layers=ui,fx&loop=1
  if (params.has('shot')) engine.seekShot(Number(params.get('shot')) - 1, Number(params.get('t') || 0));
  else if (params.has('t')) engine.seek(Number(params.get('t')));
  else engine.seek(0);
  if (params.get('clean') === '1') player.clean(true);
  if (params.get('loop') === '1') engine.loopShot = true;
  if (params.has('layers')) {
    const on = params.get('layers').split(',');
    for (const k of Object.keys(player.layers)) player.layers[k] = on.includes(k);
    player.applyLayers();
  }

  // capture API for frame-accurate export (e.g. Playwright/Puppeteer screenshots)
  window.NR = {
    engine,
    duration: engine.duration,
    fps: engine.fps,
    shots: shots.map((s, i) => ({ index: i + 1, title: s.title, start: engine.starts[i], duration: s.duration })),
    seek: (t) => engine.seek(t),
    inspect: (x, y, z) => {
      inspect = x == null ? null : [x, y, z];
      fit();
    },
    frame: (n) => engine.seek(n / engine.fps),
    layers: (list) => {
      for (const k of Object.keys(player.layers)) player.layers[k] = list.includes(k);
      player.applyLayers();
      engine.render();
    },
  };

  bootEl.remove();
  if (params.get('play') !== '0') engine.play();
}

boot().catch((err) => {
  console.error(err);
  bootEl.querySelector('.err').textContent = `ASSET ERROR (production, not story): ${err.message}`;
});
