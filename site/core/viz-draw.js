/* viz-draw.js — 通用 SVG 图元库
 * 所有主题共用的绘制原语：节点盒、数组格、柱子、箭头、指针标记。
 * 约定：所有函数只负责画，不持有状态；坐标一律绝对坐标。
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function text(str, attrs) {
    var t = el('text', attrs);
    t.textContent = str;
    return t;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /* ---------- 调色板：主题里用语义名，不写死色值 ---------- */
  var C = {
    idle:   { fill: '#1d2b49', stroke: '#3f5580' },
    hot:    { fill: '#4a3c14', stroke: '#ffd166' },
    active: { fill: '#123a5c', stroke: '#4aa3e0' },
    good:   { fill: '#12492f', stroke: '#1fa268' },
    bad:    { fill: '#4a1717', stroke: '#dd3b3b' },
    done:   { fill: '#143d2a', stroke: '#2ecc71' },
    mute:   { fill: '#1a2338', stroke: '#2b3a5c' }
  };
  var LINE = {
    next: '#5b8cff', prev: '#ff9f6b', hot: '#ffd166',
    cut: '#ff6b6b', ptr: '#6ceaa5', mute: '#4a5c82'
  };

  function paint(rect, state) {
    var c = C[state] || C.idle;
    rect.setAttribute('fill', c.fill);
    rect.setAttribute('stroke', c.stroke);
  }

  /* ---------- 数组格子：排序/查找类主题的主力图元 ---------- */
  function cellRow(g, opts) {
    var vals = opts.values, x0 = opts.x, y = opts.y;
    var w = opts.w || 52, h = opts.h || 46, gap = opts.gap || 6;
    var out = [];
    for (var i = 0; i < vals.length; i++) {
      var cx = x0 + i * (w + gap);
      var box = el('rect', { x: cx, y: y, width: w, height: h, rx: 7,
        'stroke-width': 2, filter: 'url(#vzGlow)' });
      paint(box, (opts.states && opts.states[i]) || 'idle');
      g.appendChild(box);
      var tv = text(vals[i], { x: cx + w / 2, y: y + h / 2 + 7, 'class': 'vz-cellval' });
      g.appendChild(tv);
      if (opts.index !== false) {
        g.appendChild(text(i, { x: cx + w / 2, y: y + h + 17, 'class': 'vz-idx' }));
      }
      out.push({ box: box, val: tv, x: cx, y: y, w: w, h: h, cx: cx + w / 2 });
    }
    return out;
  }

  /* ---------- 柱状图：排序类主题 ---------- */
  function barRow(g, opts) {
    var vals = opts.values, base = opts.baseY, maxv = opts.maxValue || Math.max.apply(null, vals);
    var x0 = opts.x, w = opts.w || 44, gap = opts.gap || 14, maxh = opts.maxH || 240;
    var out = [];
    for (var i = 0; i < vals.length; i++) {
      var h = Math.max(8, Math.round(vals[i] / maxv * maxh));
      var cx = x0 + i * (w + gap);
      var box = el('rect', { x: cx, y: base - h, width: w, height: h, rx: 6,
        'stroke-width': 2, filter: 'url(#vzGlow)' });
      paint(box, (opts.states && opts.states[i]) || 'idle');
      g.appendChild(box);
      g.appendChild(text(vals[i], { x: cx + w / 2, y: base - h - 9, 'class': 'vz-cellval' }));
      if (opts.index !== false) {
        g.appendChild(text(i, { x: cx + w / 2, y: base + 18, 'class': 'vz-idx' }));
      }
      out.push({ box: box, x: cx, w: w, cx: cx + w / 2, top: base - h });
    }
    return out;
  }

  /* ---------- 链式节点盒：链表/树/图类主题 ---------- */
  function nodeBox(g, opts) {
    var x = opts.x, y = opts.y, w = opts.w || 120, h = opts.h || 66;
    var slots = opts.slots || ['data'];      // 例 ['prev','data','next']
    var box = el('rect', { x: x, y: y, width: w, height: h, rx: 9,
      'stroke-width': 2, filter: 'url(#vzGlow)' });
    paint(box, opts.state || 'idle');
    g.appendChild(box);
    var sw = w / slots.length, di = slots.indexOf('data');
    if (di < 0) di = 0;
    for (var i = 1; i < slots.length; i++) {
      g.appendChild(el('line', { x1: x + i * sw, y1: y, x2: x + i * sw, y2: y + h,
        stroke: '#33456b', 'stroke-width': 1.5 }));
    }
    for (var j = 0; j < slots.length; j++) {
      if (slots[j] === 'data') continue;
      g.appendChild(el('rect', { x: x + j * sw + 1, y: y + 1, width: sw - 2, height: 15,
        fill: '#24314f' }));
      g.appendChild(text(slots[j], { x: x + j * sw + sw / 2, y: y + 12, 'class': 'vz-slot' }));
    }
    var vy = slots.length > 1 ? y + h / 2 + 8 : y + h / 2 + 8;
    var tv = text(opts.value, { x: x + di * sw + sw / 2, y: vy, 'class': 'vz-nodeval' });
    g.appendChild(tv);
    return { box: box, val: tv, x: x, y: y, w: w, h: h,
             cx: x + w / 2, cy: y + h / 2,
             slotX: function (name) {
               var k = slots.indexOf(name);
               return k < 0 ? x + w / 2 : x + k * sw + sw / 2;
             } };
  }

  /* ---------- 圆形节点：树/图类主题 ---------- */
  function circleNode(g, opts) {
    var r = opts.r || 22;
    var c = el('circle', { cx: opts.x, cy: opts.y, r: r,
      'stroke-width': 2.5, filter: 'url(#vzGlow)' });
    paint(c, opts.state || 'idle');
    g.appendChild(c);
    var tv = text(opts.value, { x: opts.x, y: opts.y + 6, 'class': 'vz-circval' });
    g.appendChild(tv);
    if (opts.tag) {
      g.appendChild(text(opts.tag, { x: opts.x, y: opts.y - r - 8, 'class': 'vz-tag' }));
    }
    return { circle: c, val: tv, x: opts.x, y: opts.y, r: r };
  }

  /* ---------- 连线：直线 / 曲线 / 带箭头 ---------- */
  function link(g, opts) {
    var col = LINE[opts.kind] || opts.kind || LINE.next;
    var d;
    if (opts.curve) {
      var mx = (opts.x1 + opts.x2) / 2;
      var cy = (opts.y1 + opts.y2) / 2 + (opts.curve || 0);
      d = 'M' + opts.x1 + ' ' + opts.y1 + ' C ' + opts.x1 + ' ' + cy +
          ' ' + opts.x2 + ' ' + cy + ' ' + opts.x2 + ' ' + opts.y2;
    } else {
      d = 'M' + opts.x1 + ' ' + opts.y1 + ' L ' + opts.x2 + ' ' + opts.y2;
    }
    var mk = opts.arrow === false ? null :
      (opts.kind === 'cut' ? 'vzCut' : opts.kind === 'prev' ? 'vzPrev' :
       opts.kind === 'hot' ? 'vzHot' : opts.kind === 'ptr' ? 'vzPtr' : 'vzNext');
    var p = el('path', { d: d, fill: 'none', stroke: col,
      'stroke-width': opts.width || (opts.kind === 'hot' || opts.kind === 'cut' ? 3 : 2.2),
      'stroke-linecap': 'round' });
    if (mk) p.setAttribute('marker-end', 'url(#' + mk + ')');
    if (opts.dash || opts.kind === 'cut') p.setAttribute('stroke-dasharray', '7 6');
    g.appendChild(p);
    if (opts.cross) {
      var pt = p.getPointAtLength(p.getTotalLength() * (opts.crossAt || 0.5));
      cross(g, pt.x, pt.y);
    }
    if (opts.label) {
      var lp = p.getPointAtLength(p.getTotalLength() * 0.5);
      g.appendChild(text(opts.label, { x: lp.x, y: lp.y - 6, 'class': 'vz-elab' }));
    }
    return p;
  }

  function cross(g, x, y, size) {
    var s = size || 9;
    g.appendChild(el('line', { x1: x - s, y1: y - s, x2: x + s, y2: y + s,
      stroke: LINE.cut, 'stroke-width': 3, 'stroke-linecap': 'round' }));
    g.appendChild(el('line', { x1: x + s, y1: y - s, x2: x - s, y2: y + s,
      stroke: LINE.cut, 'stroke-width': 3, 'stroke-linecap': 'round' }));
  }

  /* ---------- 指针标记：head / p / i / j 之类的游标 ---------- */
  function pointer(g, opts) {
    var col = opts.color || LINE.ptr;
    var above = opts.above !== false;
    var x = opts.x, ty = opts.y;
    var lblY = above ? ty - 24 : ty + 34;
    var t = text(opts.name, { x: x, y: lblY, 'class': 'vz-ptr', fill: col });
    g.appendChild(t);
    g.appendChild(el('line', { x1: x, y1: above ? lblY + 6 : lblY - 16,
      x2: x, y2: above ? ty - 4 : ty + 4,
      stroke: col, 'stroke-width': 2.2, 'stroke-linecap': 'round',
      'marker-end': 'url(#vzPtr)' }));
    return t;
  }

  /* ---------- 花括号：标注区间（如「已排序区」） ---------- */
  function brace(g, opts) {
    var x1 = opts.x1, x2 = opts.x2, y = opts.y, dep = opts.depth || 10;
    var mid = (x1 + x2) / 2;
    var d = 'M' + x1 + ' ' + y + ' q 0 ' + dep + ' ' + dep + ' ' + dep +
            ' L ' + (mid - dep) + ' ' + (y + dep) +
            ' q ' + dep + ' 0 ' + dep + ' ' + dep +
            ' q 0 -' + dep + ' ' + dep + ' -' + dep +
            ' L ' + (x2 - dep) + ' ' + (y + dep) +
            ' q ' + dep + ' 0 ' + dep + ' -' + dep;
    g.appendChild(el('path', { d: d, fill: 'none',
      stroke: opts.color || '#6d82ab', 'stroke-width': 1.8 }));
    if (opts.label) {
      g.appendChild(text(opts.label, { x: mid, y: y + dep * 2 + 16,
        'class': 'vz-brace', fill: opts.color || '#8ea3c9' }));
    }
  }

  /* ---------- 区域底色：标注「未排序区」等范围 ---------- */
  function zone(g, opts) {
    var r = el('rect', { x: opts.x, y: opts.y, width: opts.w, height: opts.h,
      rx: opts.rx || 8, fill: opts.color || '#2ecc71', opacity: opts.opacity || 0.09 });
    g.insertBefore(r, g.firstChild);
    if (opts.label) {
      g.appendChild(text(opts.label, { x: opts.x + opts.w / 2, y: opts.y - 8,
        'class': 'vz-brace', fill: opts.color || '#8ea3c9' }));
    }
    return r;
  }

  global.VizDraw = {
    NS: NS, el: el, text: text, clear: clear,
    C: C, LINE: LINE, paint: paint,
    cellRow: cellRow, barRow: barRow,
    nodeBox: nodeBox, circleNode: circleNode,
    link: link, cross: cross, pointer: pointer,
    brace: brace, zone: zone
  };
})(window);
