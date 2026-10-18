// Looping footage slaved to the film clock. Each source has one shared
// <video>; while playing it runs freely (re-synced only on drift), while
// paused / scrubbing it is seeked to the film time so frames stay repeatable.

let clock = null;
const cache = new Map();

export function setVideoClock(engine) {
  clock = engine;
}

export function loopVideo(src) {
  if (!cache.has(src)) cache.set(src, new LoopVideo(src));
  return cache.get(src);
}

class LoopVideo {
  constructor(src) {
    const v = (this.el = document.createElement('video'));
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = src;
    // a seek lands asynchronously: ask the engine for one more render
    v.addEventListener('seeked', () => {
      if (clock) clock.dirty = true;
    });
  }

  ready() {
    const v = this.el;
    if (v.readyState >= 2) return Promise.resolve(this);
    return new Promise((res, rej) => {
      v.addEventListener('loadeddata', () => res(this), { once: true });
      v.addEventListener('error', () => rej(new Error(`Video failed to load: ${v.src}`)), { once: true });
    });
  }

  get hasFrame() {
    return this.el.readyState >= 2;
  }

  sync() {
    const v = this.el, d = v.duration;
    if (!clock || !d || !isFinite(d)) return;
    const tv = clock.t % d;
    if (clock.playing) {
      if (v.playbackRate !== clock.rate) v.playbackRate = clock.rate;
      const drift = Math.abs(v.currentTime - tv);
      if (Math.min(drift, d - drift) > 0.25 && !v.seeking) v.currentTime = tv;
      if (v.paused) v.play().catch(() => {});
    } else {
      if (!v.paused) v.pause();
      if (Math.abs(v.currentTime - tv) > 0.02 && !v.seeking) v.currentTime = tv;
    }
  }
}
