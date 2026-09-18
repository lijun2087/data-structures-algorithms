/* app.js — 网站外壳：目录树、路由、主题按需加载 */
(function () {
  'use strict';

  var host = document.getElementById('host');
  var crumb = document.getElementById('crumb');
  var tree = document.getElementById('tree');
  var player = null, loaded = {}, current = null;

  /* ---------- 目录树 ---------- */
  function buildTree(filter) {
    tree.innerHTML = '';
    var kw = (filter || '').trim().toLowerCase();
    var shown = 0;
    window.VizCatalog.forEach(function (chap) {
      var hits = chap.items.filter(function (it) {
        return !kw || it.name.toLowerCase().indexOf(kw) >= 0 ||
               it.id.indexOf(kw) >= 0;
      });
      if (!hits.length) return;
      var det = document.createElement('details');
      det.className = 'chap';
      if (kw || chap.ch <= 2) det.open = true;
      var sum = document.createElement('summary');
      var done = chap.items.filter(isDone).length;
      sum.innerHTML = '<span>' + chap.title + '</span>' +
        '<span class="cnt">' + done + '/' + chap.items.length + '</span>';
      det.appendChild(sum);
      hits.forEach(function (it) {
        var d = document.createElement('div');
        d.className = 'item ' + it.status;
        d.dataset.id = it.id;
        d.innerHTML = '<span class="dot"></span><span>' + it.name + '</span>';
        d.addEventListener('click', function () { go(it.id); });
        det.appendChild(d);
        shown++;
      });
      tree.appendChild(det);
    });
    if (!shown) {
      tree.innerHTML = '<div style="padding:14px;color:#6d82ab;font-size:12.5px">' +
        '没有匹配的知识点</div>';
    }
    markActive();
  }

  function isDone(it) { return it.status === 'ready'; }

  function markActive() {
    [].forEach.call(tree.querySelectorAll('.item'), function (d) {
      d.classList.toggle('on', d.dataset.id === current);
    });
  }

  function progress() {
    var all = 0, done = 0;
    window.VizCatalog.forEach(function (c) {
      all += c.items.length;
      done += c.items.filter(isDone).length;
    });
    document.getElementById('progTxt').textContent = done + ' / ' + all;
    document.getElementById('progBar').style.width = (done / all * 100).toFixed(1) + '%';
  }

  /* ---------- 查找条目 ---------- */
  function find(id) {
    for (var i = 0; i < window.VizCatalog.length; i++) {
      var c = window.VizCatalog[i];
      for (var j = 0; j < c.items.length; j++) {
        if (c.items[j].id === id) return { chap: c, item: c.items[j] };
      }
    }
    return null;
  }

  /* ---------- 路由 ---------- */
  function go(id) {
    var hit = find(id);
    if (!hit) { showWelcome(); return; }
    current = id;
    location.hash = id;
    markActive();
    crumb.innerHTML = '<b>' + hit.chap.title + '</b> &nbsp;›&nbsp; ' + hit.item.name;

    if (hit.item.status === 'todo') {
      host.innerHTML = '<div class="todoCard"><h2>' + hit.item.name + '</h2>' +
        '<p>这个知识点的动画还在制作队列里。</p>' +
        '<p style="margin-top:14px;color:#6d82ab">对应模块：' +
        '<code style="background:#16203a;padding:2px 6px;border-radius:5px">' +
        'topics/' + id + '.js</code></p></div>';
      return;
    }
    mountTopic(id);
  }

  /* 按需加载主题模块，加载后交给播放器 */
  function mountTopic(id) {
    if (loaded[id]) { render(loaded[id]); return; }
    host.innerHTML = '<div class="empty"><h2>正在加载…</h2></div>';
    var s = document.createElement('script');
    s.src = 'topics/' + id + '.js';
    s.onload = function () {
      var t = window.VizTopics && window.VizTopics[id];
      if (!t) {
        host.innerHTML = '<div class="todoCard"><h2>模块未注册</h2>' +
          '<p><code>topics/' + id + '.js</code> 加载了，' +
          '但没有向 <code>VizTopics</code> 注册主题。</p></div>';
        return;
      }
      loaded[id] = t;
      render(t);
    };
    s.onerror = function () {
      host.innerHTML = '<div class="todoCard"><h2>模块缺失</h2>' +
        '<p>找不到 <code>topics/' + id + '.js</code></p></div>';
    };
    document.head.appendChild(s);
  }

  function render(topic) {
    host.innerHTML = '';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', topic.title);
    host.appendChild(svg);
    player = new window.VizCore.Player(svg).mount(topic.height || 690);
    player.load(topic);
  }

  function showWelcome() {
    current = null;
    crumb.textContent = '';
    markActive();
    var all = 0, done = 0;
    window.VizCatalog.forEach(function (c) {
      all += c.items.length; done += c.items.filter(isDone).length;
    });
    host.innerHTML = '<div class="empty"><h2>从左侧选一个知识点开始</h2>' +
      '<p>全书 ' + window.VizCatalog.length + ' 章、' + all + ' 个知识点，' +
      '已完成 ' + done + ' 个。</p>' +
      '<p style="margin-top:18px;font-size:12.5px;color:#6d82ab">' +
      '每个动画都支持播放、单步、后退和倍速，配套伪代码逐行高亮。</p></div>';
  }

  /* ---------- 启动 ---------- */
  document.getElementById('q').addEventListener('input', function (e) {
    buildTree(e.target.value);
  });
  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1);
    if (id && id !== current) go(id);
  });

  window.VizTopics = window.VizTopics || {};
  progress();
  buildTree('');
  var initial = location.hash.slice(1);
  if (initial && find(initial)) go(initial); else showWelcome();
})();