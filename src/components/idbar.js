// Archive identity strip. Shot 3 (SPECIMEN 017 / PLANT) and shot 7
// (SPECIMEN 000 / HUMAN) use this at the identical stage position, so the
// human record visibly re-uses the plant record.
import { h } from '../core/dom.js';
import { statusTag } from './hud.js';

export function idBar(o) {
  const kind = h('div', { class: 'idb-kind en', text: o.kind });
  const no = h('div', { class: 'idb-no disp', text: o.no });
  const cn = h('div', { class: 'idb-cn', text: o.cn });
  const cls = h('div', { class: 'idb-cls' }, [
    h('div', { class: 'idb-k' }, [h('span', { class: 'en', text: 'CLASS' }), h('span', { text: '类别' })]),
    h('div', { class: 'idb-cv' }, [h('span', { class: 'idb-cv-en en', text: o.classEn }), h('span', { class: 'idb-cv-cn', text: o.classCn })]),
  ]);
  const status = statusTag(o.statusEn, o.statusCn, o.tone || 'cyan', { cls: 'idb-status' });
  const el = h('div', { class: 'idbar L-ui' }, [
    h('div', { class: 'idb-id' }, [kind, no, cn]),
    h('div', { class: 'idb-sep' }),
    cls,
    h('div', { class: 'idb-sep' }),
    status,
  ]);
  return { el, kind, no, cn, cls, status, classEn: cls.querySelector('.idb-cv-en'), classCn: cls.querySelector('.idb-cv-cn') };
}
