/* viz-core.js — 通用动画播放器
 * 主题只需提供 { title, subtitle, code, scenes }，播放/单步/重置/高亮全由这里驱动。
 * 主题的每一步是 { line, narr, act:[], run(ctx) }，run 里用 VizDraw 画当前帧。
 */
(function (global) {
  'use strict';

  var D = global.VizDraw;

  /* 舞台尺寸：所有主题统一，保证切换时布局不跳 */
  var W = 1000, STAGE = { x: 24, y: 84, w: 952, h: 300 };
  var CODE_PANEL = { x: 24, y: 400, w: 596, h: 236 };
  var INFO_PANEL = { x: 636, y: 400, w: 340, h: 236 };

  function defs() {
    return [
      '<linearGradient id="vzBg" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#0e1626"/><stop offset="100%" stop-color="#141d33"/>',
      '</linearGradient>',
      mk('vzNext', '#5b8cff'), mk('vzPrev', '#ff9f6b'), mk('vzHot', '#ffd166'),
      mk('vzPtr', '#6ceaa5'), mk('vzCut', '#ff6b6b'), mk('vzMute', '#4a5c82'),
      '<filter id="vzGlow" x="-40%" y="-40%" width="180%" height="180%">',
      '<feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.45"/>',
      '</filter>'
    ].join('');
  }
  function mk(id, color) {
    return '<marker id="' + id + '" viewBox="0 0 10 8" refX="9" refY="4" ' +
           'markerWidth="7" markerHeight="6" orient="auto">' +
           '<path d="M0 0 L10 4 L0 8 z" fill="' + color + '"/></marker>';
  }

  var CSS = [
    'text{font-family:"Segoe UI","Microsoft YaHei",sans-serif}',
    '.vz-title{fill:#eef3ff;font-size:22px;font-weight:700}',
    '.vz-sub{fill:#8ea3c9;font-size:12.5px}',
    '.vz-panel{fill:#172138;stroke:#2b3a5c;stroke-width:1.5}',
    '.vz-hdr{fill:#9fb4dc;font-size:12.5px;font-weight:700;letter-spacing:1px}',
    '.vz-lab{fill:#8ea3c9;font-size:12px}',
    '.vz-info{fill:#b9c8e6;font-size:12px}',
    '.vz-narr{fill:#ffd98a;font-size:13.5px}',
    '.vz-stat{fill:#eef3ff;font-size:14px;font-weight:700}',
    // white-space:pre 保住伪代码的缩进；只靠 xml:space 属性不行，见 renderCode
    '.vz-code{fill:#cfdcf8;font-size:12.5px;font-family:Consolas,"Courier New",monospace;white-space:pre}',
    '.vz-cmt{fill:#6d82ab}',
    '.vz-cellval{fill:#eef3ff;font-size:15px;font-weight:700;text-anchor:middle}',
    '.vz-nodeval{fill:#eef3ff;font-size:17px;font-weight:700;text-anchor:middle}',
    '.vz-circval{fill:#eef3ff;font-size:14px;font-weight:700;text-anchor:middle}',
    '.vz-idx{fill:#6d82ab;font-size:10.5px;text-anchor:middle}',
    '.vz-slot{fill:#7d93bd;font-size:9.5px;text-anchor:middle}',
    '.vz-ptr{fill:#6ceaa5;font-size:11.5px;font-weight:700;text-anchor:middle}',
    '.vz-tag{fill:#9fb4dc;font-size:10.5px;text-anchor:middle}',
    '.vz-elab{fill:#9fb4dc;font-size:10.5px;text-anchor:middle}',
    '.vz-brace{fill:#8ea3c9;font-size:11px;text-anchor:middle}',
    '.vz-btn{cursor:pointer}',
    '.vz-btn text{fill:#dfe8ff;font-size:12.5px;text-anchor:middle;pointer-events:none}',
    '.vz-btn:hover rect{filter:brightness(1.25)}',
    '#vzStage rect,#vzStage circle{transition:fill .2s linear,stroke .2s linear}',
    '#vzStage g.mv{transition:transform .35s cubic-bezier(.4,0,.2,1)}'
  ].join('');

  /* ---------- 骨架：一次性搭好面板与按钮，之后只换内容 ---------- */
  function skeleton(root, H) {
    root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    root.setAttribute('width', W);
    root.setAttribute('height', H);
    root.innerHTML =
      '<defs>' + defs() + '<style>' + CSS + '</style></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#vzBg)"/>' +
      '<text class="vz-title" id="vzTitle" x="24" y="40"></text>' +
      '<text class="vz-sub" id="vzSub" x="24" y="64"></text>' +
      panel(STAGE) +
      '<g id="vzStage"></g>' +
      '<text class="vz-narr" id="vzNarr" x="' + (STAGE.x + 18) + '" y="' +
        (STAGE.y + STAGE.h - 32) + '"></text>' +
      panel(CODE_PANEL) +
      '<text class="vz-hdr" x="' + (CODE_PANEL.x + 18) + '" y="' + (CODE_PANEL.y + 26) +
        '">伪代码</text>' +
      '<text class="vz-lab" id="vzCodeTag" x="' + (CODE_PANEL.x + CODE_PANEL.w - 18) +
        '" y="' + (CODE_PANEL.y + 26) + '" text-anchor="end"></text>' +
      '<g id="vzCodeHl"></g><g id="vzCodeTxt"></g>' +
      panel(INFO_PANEL) +
      '<text class="vz-hdr" x="' + (INFO_PANEL.x + 20) + '" y="' + (INFO_PANEL.y + 26) +
        '">运行状态</text>' +
      '<g id="vzStats"></g>' +
      '<rect x="' + (INFO_PANEL.x + 20) + '" y="' + (INFO_PANEL.y + 132) +
        '" width="' + (INFO_PANEL.w - 40) + '" height="82" rx="10" ' +
        'fill="#101a2e" stroke="#2b3a5c"/>' +
      '<g id="vzAct"></g>' +
      ctrls(H);
    return root;
  }
  function panel(p) {
    return '<rect class="vz-panel" x="' + p.x + '" y="' + p.y + '" width="' + p.w +
           '" height="' + p.h + '" rx="13"/>';
  }
  function btn(id, x, y, w, label, primary) {
    return '<g class="vz-btn" id="' + id + '"><rect x="' + x + '" y="' + y +
      '" width="' + w + '" height="34" rx="9" fill="' + (primary ? '#2f52bd' : '#233457') +
      '" stroke="' + (primary ? '#5b8cff' : '#3a4a6d') + '"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + 22) + '" id="' + id + 'Txt">' +
      label + '</text></g>';
  }
  function ctrls(H) {
    var y = H - 44;
    return btn('vzPlay', 24, y, 86, '播放', true) +
           btn('vzStep', 118, y, 76, '单步') +
           btn('vzBack', 202, y, 76, '后退') +
           btn('vzReset', 286, y, 76, '重置') +
           '<text class="vz-lab" x="378" y="' + (y + 22) + '">速度</text>' +
           btn('vzSpeed', 412, y, 76, '1.0x') +
           '<g id="vzScenes"></g>';
  }

  /* ---------- 播放器 ---------- */
  function Player(root) {
    this.root = root;
    this.H = 0;
    this.topic = null;
    this.steps = [];
    this.ptr = 0;
    this.timer = null;
    this.speed = 1;
    this.sceneIdx = 0;
    this.ctx = null;
  }

  Player.prototype.mount = function (H) {
    this.H = H || 690;
    skeleton(this.root, this.H);
    var self = this;
    this.$('vzPlay').addEventListener('click', function () {
      self.timer ? self.pause() : self.play();
    });
    this.$('vzStep').addEventListener('click', function () { self.pause(); self.next(); });
    this.$('vzBack').addEventListener('click', function () { self.pause(); self.prev(); });
    this.$('vzReset').addEventListener('click', function () { self.loadScene(self.sceneIdx); });
    this.$('vzSpeed').addEventListener('click', function () { self.cycleSpeed(); });
    return this;
  };

  Player.prototype.$ = function (id) { return this.root.querySelector('#' + id); };

  Player.prototype.load = function (topic) {
    this.pause();
    this.topic = topic;
    this.$('vzTitle').textContent = topic.title;
    this.$('vzSub').textContent = topic.subtitle || '';
    this.renderSceneBtns();
    this.loadScene(0);
    return this;
  };

  Player.prototype.renderSceneBtns = function () {
    var g = this.$('vzScenes'), self = this;
    D.clear(g);
    var scenes = this.topic.scenes, y = this.H - 44, x = 512;
    for (var i = 0; i < scenes.length; i++) {
      var label = scenes[i].name;
      var w = Math.max(78, label.replace(/[^\x00-\xff]/g, 'xx').length * 7 + 22);
      if (x + w > W - 24) break;
      var wrap = D.el('g', { 'class': 'vz-btn', id: 'vzSc' + i });
      wrap.appendChild(D.el('rect', { x: x, y: y, width: w, height: 34, rx: 9,
        fill: i === 0 ? '#2f52bd' : '#233457',
        stroke: i === 0 ? '#5b8cff' : '#3a4a6d' }));
      var t = D.text(label, { x: x + w / 2, y: y + 22 });
      t.setAttribute('fill', '#dfe8ff');
      t.setAttribute('font-size', '12.5');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('pointer-events', 'none');
      wrap.appendChild(t);
      g.appendChild(wrap);
      (function (k) {
        wrap.addEventListener('click', function () { self.loadScene(k); });
      })(i);
      x += w + 8;
    }
  };

  Player.prototype.loadScene = function (i) {
    this.pause();
    this.sceneIdx = i;
    this.ptr = 0;
    var scene = this.topic.scenes[i];
    this.renderCode(scene.code || this.topic.code || []);
    this.$('vzCodeTag').textContent = scene.codeTag || scene.name;
    // ctx 是主题与播放器之间的桥：主题在 run() 里往里写状态
    this.ctx = { stage: this.$('vzStage'), draw: D, stats: {}, root: this.root,
                 W: W, S: STAGE };
    D.clear(this.ctx.stage);
    this.steps = scene.build(this.ctx) || [];
    this.hl(-1);
    this.setNarr('场景「' + scene.name + '」已就绪，点击播放或单步。');
    this.setAct(['等待开始']);
    this.setStats(this.ctx.stats);
    for (var k = 0; k < this.topic.scenes.length; k++) {
      var b = this.$('vzSc' + k);
      if (!b) continue;
      var r = b.querySelector('rect');
      r.setAttribute('fill', k === i ? '#2f52bd' : '#233457');
      r.setAttribute('stroke', k === i ? '#5b8cff' : '#3a4a6d');
    }
    // 先把第 0 步画出来当静态预览，但不消耗 ptr，也不显示它的旁白
    if (this.steps.length) {
      this.steps[0].run(this.ctx);
      this.setStats(this.ctx.stats);
    }
  };

  /* ---------- 伪代码渲染与高亮 ---------- */
  Player.prototype.renderCode = function (lines) {
    var hl = this.$('vzCodeHl'), tx = this.$('vzCodeTxt');
    D.clear(hl); D.clear(tx);
    this.codeLen = lines.length;
    var y0 = CODE_PANEL.y + 48, lh = Math.min(21, (CODE_PANEL.h - 60) / Math.max(1, lines.length));
    this.codeY0 = y0; this.codeLH = lh;
    for (var i = 0; i < lines.length; i++) {
      // 高亮带以字形中线（基线上方约 4px）为准居中；写死的偏移在行距被压到
      // 13 行时会整条浮到字上面去
      hl.appendChild(D.el('rect', { id: 'vzCl' + i, x: CODE_PANEL.x + 12,
        y: y0 + i * lh - 4 - (lh - 2) / 2, width: CODE_PANEL.w - 24,
        height: lh - 2, rx: 5, fill: '#ffd166', opacity: 0 }));
      var raw = lines[i];
      var t = D.el('text', { 'class': 'vz-code', x: CODE_PANEL.x + 22, y: y0 + i * lh });
      // setAttribute('xml:space',…) 只会造出一个普通属性、不带命名空间，浏览器不认；
      // 缩进实际是靠 .vz-code 的 white-space:pre 保住的，这里只做兜底。
      t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
      var ci = raw.indexOf('//');
      if (ci >= 0) {
        t.appendChild(document.createTextNode(raw.slice(0, ci)));
        var s = D.el('tspan', { 'class': 'vz-cmt' });
        s.textContent = raw.slice(ci);
        t.appendChild(s);
      } else {
        t.textContent = raw;
      }
      tx.appendChild(t);
    }
  };

  Player.prototype.hl = function (n) {
    for (var i = 0; i < this.codeLen; i++) {
      var r = this.$('vzCl' + i);
      if (r) r.setAttribute('opacity', i === n ? 0.15 : 0);
    }
  };

  /* 旁白折行：SVG 的 <text> 不会自动换行，得自己按实测宽度切成 tspan。
   * 中文没有空格可断，所以逐字累加、超宽就断行，最多两行（舞台底部只留得下两行）。 */
  Player.prototype.setNarr = function (s) {
    var t = this.$('vzNarr');
    while (t.firstChild) t.removeChild(t.firstChild);
    s = s || '';
    var x = STAGE.x + 18, limit = STAGE.w - 36, maxLines = 2, lh = 18;
    var probe = D.el('tspan', {});
    t.appendChild(probe);
    var lines = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      probe.textContent = cur + s[i];
      if (probe.getComputedTextLength() > limit && cur) {
        lines.push(cur); cur = s[i];
        if (lines.length === maxLines) break;
      } else {
        cur += s[i];
      }
    }
    if (lines.length < maxLines && cur) lines.push(cur);
    t.removeChild(probe);
    // 两行装不下就在末行收尾加省略号，宁可截断也不越出面板
    if (lines.length === maxLines) {
      var used = lines.join('').length;
      if (used < s.length) lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
    }
    for (var k = 0; k < lines.length; k++) {
      var sp = D.el('tspan', { x: x, dy: k === 0 ? 0 : lh });
      sp.textContent = lines[k];
      t.appendChild(sp);
    }
  };

  /* ---------- 状态面板 ---------- */
  Player.prototype.setStats = function (obj) {
    var g = this.$('vzStats');
    D.clear(g);
    var keys = Object.keys(obj || {}), y = INFO_PANEL.y + 54;
    for (var i = 0; i < keys.length && i < 4; i++) {
      g.appendChild(D.text(keys[i], { 'class': 'vz-lab', x: INFO_PANEL.x + 20, y: y }));
      var v = D.text(obj[keys[i]], { 'class': 'vz-stat',
        x: INFO_PANEL.x + INFO_PANEL.w - 20, y: y });
      v.setAttribute('text-anchor', 'end');
      g.appendChild(v);
      y += 25;
    }
  };

  Player.prototype.setAct = function (arr) {
    var g = this.$('vzAct');
    D.clear(g);
    arr = arr || [];
    for (var i = 0; i < arr.length && i < 3; i++) {
      g.appendChild(D.text(arr[i], { 'class': 'vz-info',
        x: INFO_PANEL.x + 34, y: INFO_PANEL.y + 156 + i * 20 }));
    }
  };

  /* ---------- 步进 ---------- */
  Player.prototype.apply = function (i) {
    var s = this.steps[i];
    if (!s) return;
    s.run(this.ctx);
    this.hl(typeof s.line === 'number' ? s.line : -1);
    this.setNarr(s.narr);
    this.setAct(s.act);
    this.setStats(this.ctx.stats);
  };

  Player.prototype.next = function () {
    if (this.ptr >= this.steps.length) { this.pause(); return false; }
    this.apply(this.ptr++);
    return true;
  };

  // 后退用「从头重放到目标步」实现：主题的 run() 只依赖 ctx，重放是安全的
  Player.prototype.prev = function () {
    if (this.ptr <= 1) { this.loadScene(this.sceneIdx); return false; }
    var target = this.ptr - 1;
    var scene = this.topic.scenes[this.sceneIdx];
    D.clear(this.ctx.stage);
    this.ctx.stats = {};
    this.steps = scene.build(this.ctx) || [];
    for (var i = 0; i < target; i++) this.apply(i);
    this.ptr = target;
    return true;
  };

  Player.prototype.play = function () {
    if (this.ptr >= this.steps.length) this.loadScene(this.sceneIdx);
    var self = this;
    this.timer = setInterval(function () {
      if (!self.next()) self.pause();
    }, Math.round(1400 / this.speed));
    this.$('vzPlayTxt').textContent = '暂停';
  };

  Player.prototype.pause = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    var t = this.$('vzPlayTxt');
    if (t) t.textContent = '播放';
  };

  Player.prototype.cycleSpeed = function () {
    var opts = [1, 1.5, 2, 0.5];
    this.speed = opts[(opts.indexOf(this.speed) + 1) % opts.length];
    this.$('vzSpeedTxt').textContent = this.speed.toFixed(1) + 'x';
    if (this.timer) { this.pause(); this.play(); }
  };

  global.VizCore = { W: W, STAGE: STAGE, CODE: CODE_PANEL, INFO: INFO_PANEL,
                     defs: defs, CSS: CSS, skeleton: skeleton, Player: Player };
})(window);
