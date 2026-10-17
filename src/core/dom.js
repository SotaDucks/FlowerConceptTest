// Tiny DOM helpers + write-if-changed setters (renders run every frame).

const SVGNS = 'http://www.w3.org/2000/svg';

function apply(el, attrs, isSvg) {
  if (!attrs) return;
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (isSvg) el.setAttribute(k, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v);
  }
}

function append(el, children) {
  if (children == null) return;
  if (!Array.isArray(children)) children = [children];
  for (const c of children) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}

export function h(tag, attrs, children) {
  const el = document.createElement(tag);
  apply(el, attrs, false);
  append(el, children);
  return el;
}

export function s(tag, attrs, children) {
  const el = document.createElementNS(SVGNS, tag);
  apply(el, attrs, true);
  append(el, children);
  return el;
}

// full-stage SVG overlay (1920x1080 user units)
export function stageSvg(cls = '') {
  return s('svg', { class: `stage-svg ${cls}`, viewBox: '0 0 1920 1080', width: 1920, height: 1080 });
}

const cache = new WeakMap();
function slot(el) {
  let c = cache.get(el);
  if (!c) cache.set(el, (c = {}));
  return c;
}

export function css(el, props) {
  const c = slot(el);
  for (const k in props) {
    const v = props[k];
    if (c[k] !== v) {
      c[k] = v;
      if (k.startsWith('--')) el.style.setProperty(k, v);
      else el.style[k] = v;
    }
  }
}

export function attr(el, props) {
  const c = slot(el);
  for (const k in props) {
    const v = props[k];
    const key = '@' + k;
    if (c[key] !== v) {
      c[key] = v;
      el.setAttribute(k, v);
    }
  }
}

export function txt(el, str) {
  const c = slot(el);
  if (c.$t !== str) {
    c.$t = str;
    el.textContent = str;
  }
}

export function show(el, on) {
  css(el, { display: on ? '' : 'none' });
}

export function opacity(el, o) {
  css(el, { opacity: o <= 0.001 ? '0' : o >= 0.999 ? '1' : o.toFixed(3) });
}

// a 2D canvas that keeps its backing store at a given pixel ratio
export function canvas2d(w, h, cls = '', ratio = 1) {
  const c = h_canvas(w, h, ratio);
  c.className = cls;
  const ctx = c.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { el: c, ctx, w, h };
}
function h_canvas(w, h, ratio) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * ratio);
  c.height = Math.round(h * ratio);
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  return c;
}
