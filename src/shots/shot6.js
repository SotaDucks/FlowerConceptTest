// SHOT 6 — SYSTEM CLOSE FAILED / 系统关闭失败
// The operator exits; on a pure black screen the close stalls and the failure holds.
import { h, css } from '../core/dom.js';
import { Cues } from '../core/cues.js';
import { seg, ease, hash } from '../core/util.js';
import { icon } from '../components/hud.js';
import { S6 } from '../content.js';

export default class Shot6 {
  constructor() {
    this.title = '系统关闭失败';
    this.duration = 5;
    this.phase = { en: 'PHASE 05 · DATA INTEGRITY', cn: '数据完整性' };
    this.root = h('div', { class: 'shot s6' });
  }

  init() {
    const R = this.root;
    const cues = (this.cues = new Cues());
    R.appendChild(h('div', { class: 's6-dark' }));

    // exit command
    this.cmd = h('div', { class: 's6-cmd L-ui' }, [
      icon('power', 's6-cmd-ic'),
      h('span', { class: 's6-cmd-t mono', text: `> ${S6.cmd}()` }),
      h('span', { class: 's6-cmd-cn', text: '退出 VR 会话' }),
    ]);
    R.appendChild(this.cmd);
    cues.add(this.cmd, 0.05, { mode: 'up', dur: 0.3, out: 1.5, outDur: 0.3 });

    this.closing = h('div', { class: 's6-closing mono L-ui' }, [h('span', { class: 's6-closing-t', text: 'CLOSING SESSION · 正在关闭' }), h('div', { class: 's6-bar' }, [h('i')])]);
    R.appendChild(this.closing);
    this.bar = this.closing.querySelector('i');

    // result
    this.result = h('div', { class: 's6-result L-ui' }, [
      h('div', { class: 's6-res-h' }, [h('span', { class: 's6-mark' }), h('span', { class: 'mono', text: 'ERR · SESSION.EXIT' })]),
      h('div', { class: 's6-en disp', text: S6.en }),
      h('div', { class: 's6-cn', text: S6.cn }),
    ]);
    R.appendChild(this.result);
    this.resEn = this.result.querySelector('.s6-en');
    this.resCn = this.result.querySelector('.s6-cn');
    cues.add(this.result, 2.9, { mode: 'fade', dur: 0.2 });
    cues.add(this.resEn, 2.95, { mode: 'decode', dur: 0.5 });
    cues.add(this.resCn, 3.1, { mode: 'wipe', dur: 0.35 });
  }

  render(t) {
    const stall = t >= 1.45 && t < 2.1;

    // closing indicator stalls at a fixed point
    const prog = Math.min(0.87, ease.outCubic(seg(t, 0.6, 0.85)) * 0.87);
    css(this.bar, { width: (prog * 100).toFixed(1) + '%' });
    css(this.closing, { opacity: String(seg(t, 0.6, 0.2) * (1 - seg(t, 2.1, 0.2))) });
    this.closing.classList.toggle('stuck', stall);

    this.cues.render(t);
    // the failure flicker on the result text is brief, then it holds
    const fl = t > 2.9 && t < 3.25 && hash(Math.floor(t * 30)) > 0.5 ? 0.4 : 1;
    css(this.result, { filter: `brightness(${fl})` });
    // pure black: no system chrome either
    return { top: false, rails: false, bottom: false };
  }
}
