// Single film timeline. Every shot renders as a pure function of its local time,
// so play / pause / scrub / jump / frame-step all land on identical frames.
import { clamp } from './util.js';
import { css } from './dom.js';

export class Engine {
  constructor({ stage, shots, hud, fps = 25 }) {
    this.stage = stage;
    this.shots = shots;
    this.hud = hud;
    this.fps = fps;
    this.t = 0;
    this.rate = 1;
    this.playing = false;
    this.loopShot = false;
    this.listeners = new Set();
    this.layout();
    this._last = null;
    this._raf = this._raf.bind(this);
    requestAnimationFrame(this._raf);
  }

  layout() {
    let acc = 0;
    this.starts = this.shots.map((sh) => {
      const s0 = acc;
      acc += sh.duration;
      return s0;
    });
    this.duration = acc;
  }

  locate(t) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      if (t >= this.starts[i]) return { i, lt: t - this.starts[i] };
    }
    return { i: 0, lt: t };
  }

  get shotIndex() {
    return this.locate(this.t).i;
  }

  seek(t) {
    this.t = clamp(t, 0, this.duration - 1e-4);
    this.render();
  }
  seekShot(i, lt = 0) {
    i = clamp(i, 0, this.shots.length - 1);
    this.seek(this.starts[i] + lt);
  }
  step(frames) {
    const f = Math.round(this.t * this.fps) + frames;
    this.seek(f / this.fps);
  }
  play() {
    if (this.t >= this.duration - 0.01) this.t = 0;
    this.playing = true;
    this._last = null;
    this.emit();
  }
  pause() {
    this.playing = false;
    this.emit();
  }
  toggle() {
    this.playing ? this.pause() : this.play();
  }

  on(fn) {
    this.listeners.add(fn);
  }
  emit() {
    for (const fn of this.listeners) fn(this);
  }

  _raf(now) {
    requestAnimationFrame(this._raf);
    if (this.playing) {
      if (this._last != null) {
        const dt = Math.min(0.1, (now - this._last) / 1000) * this.rate;
        const { i } = this.locate(this.t);
        let nt = this.t + dt;
        if (this.loopShot) {
          const end = this.starts[i] + this.shots[i].duration;
          if (nt >= end) nt = this.starts[i] + (nt - end);
        } else if (nt >= this.duration) {
          nt = this.duration - 1e-4;
          this.playing = false;
        }
        this.t = nt;
      }
      this._last = now;
      this.render();
    } else if (this.dirty) {
      this.render();
    }
  }

  render() {
    this.dirty = false;
    const { i, lt } = this.locate(this.t);
    const visible = new Set([i]);
    // reset styles a previous borrower may have left on roots
    for (const sh of this.shots) {
      if (sh._borrowed) {
        css(sh.root, { transform: '', filter: '', opacity: '1', clipPath: '' });
        sh._borrowed = false;
      }
    }
    const ctx = {
      t: this.t,
      shot: i,
      engine: this,
      borrow: (k, at) => {
        const other = this.shots[k];
        visible.add(k);
        other._borrowed = true;
        other.render(at, { ...ctx, borrowed: true, shot: k });
        return other;
      },
    };
    const shot = this.shots[i];
    const hudState = shot.render(lt, ctx) || {};
    this.shots.forEach((sh, k) => css(sh.root, { display: visible.has(k) ? '' : 'none' }));
    this.hud.render({
      top: true,
      rails: true,
      phase: shot.phase,
      clockIdx: i,
      shot: i,
      lt,
      t: this.t,
      ...hudState,
    });
    this.emit();
  }
}
