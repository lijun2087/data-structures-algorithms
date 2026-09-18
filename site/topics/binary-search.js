/* 折半查找与判定树 — 第9章
 * 场景一：折半查找过程（演示找到和找不到两种情形）
 * 场景二：判定树（每次 mid 是树结点，查找长度 = 结点层数）
 * 场景三：前提分析（有序 + 顺序存储，链表上无法折半）
 */
(function () {
  var D = window.VizDraw;

  // 有序表：11个元素，下标1..11
  var ARR = [0, 5, 12, 18, 25, 33, 40, 48, 56, 63, 71, 80];
  var N = 11;
  var TARGET_FOUND = 33; // 在位置5
  var TARGET_MISS  = 37; // 不存在

  var CX = 65, CY = 130, CW = 78, GAP = 5, CH = 46;
  function cellX(i) { return CX + (i - 1) * (CW + GAP); }

  /* 渲染折半查找帧 */
  function renderBin(ctx, f) {
    D.clear(ctx.stage);
    var a = f.a;
    for (var i = 1; i <= N; i++) {
      var x = cellX(i);
      var c = D.C[f.st[i] || 'idle'];
      ctx.stage.appendChild(D.el('rect', {
        x: x, y: CY, width: CW, height: CH, rx: 7,
        fill: c.fill, stroke: c.stroke, 'stroke-width': 2
      }));
      ctx.stage.appendChild(D.text(a[i], {
        x: x + CW / 2, y: CY + CH / 2 + 7, 'class': 'vz-cellval'
      }));
      ctx.stage.appendChild(D.text(i, {
        x: x + CW / 2, y: CY + CH + 17, 'class': 'vz-idx'
      }));
    }
    // low / mid / high 指针
    if (f.low !== null && f.low >= 1 && f.low <= N) {
      D.pointer(ctx.stage, { x: cellX(f.low) + CW/2, y: CY + CH + 30,
        name: 'low', above: false, color: '#6ceaa5' });
    }
    if (f.high !== null && f.high >= 1 && f.high <= N) {
      D.pointer(ctx.stage, { x: cellX(f.high) + CW/2, y: CY + CH + 50,
        name: 'high', above: false, color: '#ff9f6b' });
    }
    if (f.mid !== null && f.mid >= 1 && f.mid <= N) {
      D.pointer(ctx.stage, { x: cellX(f.mid) + CW/2, y: CY - 2,
        name: 'mid', above: true, color: '#ffd166' });
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { renderBin(c, f); } };
  }

  function makeSnap(low, high, mid, stObj, cmp, target, resultKey, resultVal) {
    var stats = { '目标': target, '比较次数': cmp, 'low': low !== null ? low : '-', 'high': high !== null ? high : '-' };
    if (resultKey) stats[resultKey] = resultVal; // 替换最后一项（超4则被截断，但最多恰好4）
    // 保持最多4项：有 resultKey 时去掉 high
    if (resultKey) {
      delete stats['high'];
      stats[resultKey] = resultVal;
    }
    return { a: ARR.slice(), st: stObj || {}, low: low, high: high, mid: mid,
             stats: stats };
  }

  /* ---- 场景一：折半查找（找到 + 找不到） ---- */
  function buildBinary() {
    var steps = [];
    var cmp = 0;

    function buildSearch(target, label) {
      var low = 1, high = N;
      steps.push(step(makeSnap(low, high, null, {}, cmp, target),
        0, label + '：初始 low=1, high=' + N + '。每次取中点 mid=(low+high)/2，这正是"折半"的含义。',
        ['目标 key = ' + target, 'low=1, high=' + N, '开始折半']));

      while (low <= high) {
        var mid = Math.floor((low + high) / 2);
        cmp++;
        var stObj = {};
        stObj[mid] = 'hot';
        for (var k = 1; k < low; k++) stObj[k] = 'mute';
        for (var k = high + 1; k <= N; k++) stObj[k] = 'mute';

        if (ARR[mid] === target) {
          stObj[mid] = 'good';
          steps.push(step(makeSnap(low, high, mid, stObj, cmp, target, '结果', '找到['+mid+']'),
            2, 'mid=' + mid + '，a[mid]=' + ARR[mid] + ' 等于目标 ' + target + '！第 ' + cmp + ' 次比较命中，查找成功。',
            ['a[' + mid + '] == ' + target, '找到，返回 ' + mid]));
          break;
        } else if (ARR[mid] < target) {
          steps.push(step(makeSnap(low, high, mid, stObj, cmp, target, null, null),
            3, 'a[mid]=' + ARR[mid] + ' < ' + target + '，目标在右半段，low 移到 mid+1=' + (mid+1) + '，右半被丢掉。',
            ['a[' + mid + '] < key', 'low = mid+1 = ' + (mid+1)]));
          low = mid + 1;
        } else {
          steps.push(step(makeSnap(low, high, mid, stObj, cmp, target, null, null),
            4, 'a[mid]=' + ARR[mid] + ' > ' + target + '，目标在左半段，high 移到 mid-1=' + (mid-1) + '，左半被丢掉。',
            ['a[' + mid + '] > key', 'high = mid-1 = ' + (mid-1)]));
          high = mid - 1;
        }
      }

      if (low > high) {
        var mst = {};
        for (var k = 1; k <= N; k++) mst[k] = 'mute';
        steps.push(step(makeSnap(low, high, null, mst, cmp, target, '结果', '未找到'),
          5, 'low > high，区间空了仍未找到 ' + target + '，查找失败。共比较 ' + cmp + ' 次，最多 ⌈log₂(n+1)⌉ 次。',
          ['low > high', '查找失败', '最坏 ⌈log₂(n+1)⌉ 次']));
      }
    }

    buildSearch(TARGET_FOUND, '查找 ' + TARGET_FOUND);
    cmp = 0;
    buildSearch(TARGET_MISS,  '查找不存在的 ' + TARGET_MISS);
    return steps;
  }

  /* ---- 场景二：判定树 ---- */
  function buildTree() {
    var steps = [];
    var R = 18;
    var nodes = [
      { idx: 6,  val: 40, x: 500, y: 110, level: 1 },
      { idx: 3,  val: 18, x: 270, y: 170, level: 2 },
      { idx: 9,  val: 63, x: 730, y: 170, level: 2 },
      { idx: 1,  val: 5,  x: 156, y: 230, level: 3 },
      { idx: 5,  val: 33, x: 384, y: 230, level: 3 },
      { idx: 7,  val: 48, x: 616, y: 230, level: 3 },
      { idx: 11, val: 80, x: 844, y: 230, level: 3 },
      { idx: 2,  val: 12, x: 99,  y: 295, level: 4 },
      { idx: 4,  val: 25, x: 213, y: 295, level: 4 },
      { idx: 8,  val: 56, x: 557, y: 295, level: 4 },
      { idx: 10, val: 71, x: 787, y: 295, level: 4 }
    ];
    var parent = { 3: 6, 9: 6, 1: 3, 5: 3, 7: 9, 11: 9, 2: 1, 4: 5, 8: 7, 10: 9 };

    function renderTree(ctx, f) {
      D.clear(ctx.stage);
      var i, j, nd, pa;
      for (i = 0; i < nodes.length; i++) {
        nd = nodes[i];
        if (parent[nd.idx] !== undefined) {
          pa = null;
          for (j = 0; j < nodes.length; j++) if (nodes[j].idx === parent[nd.idx]) pa = nodes[j];
          if (pa) {
            D.link(ctx.stage, { x1: pa.x, y1: pa.y + R, x2: nd.x, y2: nd.y - R - 2,
              kind: 'mute', arrow: false, width: 1.5 });
          }
        }
      }
      for (i = 0; i < nodes.length; i++) {
        nd = nodes[i];
        var st = (f.hot === nd.idx) ? 'hot' : (f.done && f.done[nd.idx]) ? 'done' : 'idle';
        D.circleNode(ctx.stage, { x: nd.x, y: nd.y, r: R, state: st, value: nd.val });
      }
      for (i = 1; i <= 4; i++) {
        ctx.stage.appendChild(D.text('第' + i + '层', {
          x: 40, y: (i === 1 ? 116 : i === 2 ? 176 : i === 3 ? 236 : 301),
          'class': 'vz-idx', fill: '#6d82ab'
        }));
      }
      ctx.stats = f.stats || {};
    }

    function treeStep(hot, done, line, narr, act, stats) {
      var f = { hot: hot, done: done, stats: stats || {} };
      return { line: line, narr: narr, act: act, run: function (c) { renderTree(c, f); } };
    }

    steps.push(treeStep(null, {}, 0,
      '把折半过程的每个 mid 结点按比较顺序排成树，就是判定树。查找路径 = 从根走到命中结点的路。',
      ['mid 结点 = 树结点', '层数 = 查找长度', 'n=11 树高=4'],
      { 'n': 11, '树高': 4, '最坏查找': 4, 'ASL': '≈log₂(n+1)-1' }));

    // 模拟查找 33：路径 6→3→5（索引），每步高亮
    var path = [6, 3, 5];
    var done = {};
    for (var pi = 0; pi < path.length; pi++) {
      done[path[pi]] = true;
      var nd2 = null;
      for (var j2 = 0; j2 < nodes.length; j2++) if (nodes[j2].idx === path[pi]) nd2 = nodes[j2];
      var isLast = pi === path.length - 1;
      var n33 = isLast
        ? '命中！33 在第3层，比较3次。树的层数直接告诉我们这次查找花了多少次比较。'
        : 'a[mid]=' + nd2.val + (nd2.val > 33 ? '> 33，走左子树' : '< 33，走右子树') + '。层数' + nd2.level + '代表第' + nd2.level + '次比较。';
      var doneCopy = {};
      for (var dk in done) doneCopy[dk] = done[dk];
      steps.push(treeStep(path[pi], doneCopy, 1, n33,
        ['第' + nd2.level + '层', '比较 a[' + nd2.idx + ']=' + nd2.val, isLast ? '命中' : '继续下探'],
        { '查找33': '路径长' + (pi+1), '当前层': nd2.level, '树高': 4, 'ASL': '约log₂12' }));
    }

    steps.push(treeStep(null, {}, -1,
      '判定树高 = ⌈log₂(n+1)⌉，这是折半查找最坏情况。成功 ASL ≈ log₂(n+1)-1，失败也在 log 量级。',
      ['最坏 O(log n)', 'ASL ≈ log₂(n+1)-1', '前提：有序+顺序存储'],
      { 'n': 11, '树高': 4, '成功ASL': '≈3.0', '时间复杂度': 'O(log n)' }));

    return steps;
  }

  /* ---- 场景三：前提条件 ---- */
  function buildPrecond() {
    var steps = [];

    function renderPre(ctx, f) {
      D.clear(ctx.stage);
      // 画有序数组
      var ox = 100, oy = 130, ow = 68, og = 4, oh = 44;
      ctx.stage.appendChild(D.text('有序顺序表（可折半）', {
        x: ox, y: oy - 14, 'class': 'vz-tag', fill: '#2ecc71', 'text-anchor': 'start'
      }));
      for (var i = 1; i <= 7; i++) {
        var x = ox + (i-1)*(ow+og);
        var col = (f.hlArr && f.hlArr[i]) ? D.C.good : D.C.idle;
        ctx.stage.appendChild(D.el('rect', { x: x, y: oy, width: ow, height: oh, rx: 7,
          fill: col.fill, stroke: col.stroke, 'stroke-width': 2 }));
        ctx.stage.appendChild(D.text([0,10,20,30,40,50,60,70][i], {
          x: x+ow/2, y: oy+oh/2+7, 'class': 'vz-cellval' }));
      }
      // 标注 mid 可以用下标直接跳到
      if (f.showMid) {
        var mx = ox + 3*(ow+og);
        D.pointer(ctx.stage, { x: mx+ow/2, y: oy-2, name: 'mid', above: true, color: '#ffd166' });
        ctx.stage.appendChild(D.text('O(1) 随机访问', {
          x: mx+ow/2, y: oy-36, 'class': 'vz-tag', fill: '#ffd166'
        }));
      }
      // 画链表（不能折半）
      var loy = 248;
      ctx.stage.appendChild(D.text('链表（无法折半，取不到中点）', {
        x: ox, y: loy - 14, 'class': 'vz-tag', fill: '#dd3b3b', 'text-anchor': 'start'
      }));
      var nodeW = 80, nodeH = 40, nodeG = 30;
      for (var j = 0; j < 5; j++) {
        var lx = ox + j*(nodeW+nodeG);
        var lc = D.C[f.hlLink === j ? 'bad' : 'idle'];
        ctx.stage.appendChild(D.el('rect', { x: lx, y: loy, width: nodeW, height: nodeH, rx: 7,
          fill: lc.fill, stroke: lc.stroke, 'stroke-width': 2 }));
        ctx.stage.appendChild(D.text(j*10 + 10, { x: lx+nodeW/2, y: loy+nodeH/2+6, 'class': 'vz-cellval' }));
        if (j < 4) {
          D.link(ctx.stage, { x1: lx+nodeW, y1: loy+nodeH/2,
            x2: lx+nodeW+nodeG, y2: loy+nodeH/2, kind: 'next' });
        }
      }
      if (f.showX) {
        ctx.stage.appendChild(D.text('要找中间结点必须从头遍历，O(n/2) 开销！', {
          x: ox, y: loy + nodeH + 22, 'class': 'vz-info', fill: '#dd3b3b', 'text-anchor': 'start'
        }));
      }
      ctx.stats = f.stats || {};
    }

    steps.push({ line: 0, narr: '折半查找有两个硬性前提：① 数据有序；② 顺序存储（数组），才能用下标 O(1) 访问任意位置。',
      act: ['前提①：有序', '前提②：顺序存储', '两者缺一不可'],
      run: function (c) { renderPre(c, { showMid: false, showX: false, hlArr: null, hlLink: -1,
        stats: { '前提①': '有序', '前提②': '顺序存储', '不适用': '链表/无序' } }); } });

    steps.push({ line: 1, narr: '顺序表可以用下标直接跳到中间位置 mid，这一步是 O(1) 的，这是折半的基础。',
      act: ['a[mid] 直接访问', 'O(1) 随机访问', '下标计算即可'],
      run: function (c) { renderPre(c, { showMid: true, showX: false, hlArr: { 4: true },
        stats: { '随机访问': 'O(1)', 'mid计算': '(low+high)/2', '无需遍历': '是' } }); } });

    steps.push({ line: 2, narr: '链表无法直接访问中点：要找第 n/2 个结点，必须从头一路跟指针，代价 O(n/2)。折半就没意义了。',
      act: ['链表取中点 O(n/2)', '每次折半代价太高', '不如顺序查找'],
      run: function (c) { renderPre(c, { showMid: false, showX: true, hlArr: null, hlLink: 2,
        stats: { '链表取中': 'O(n/2)', '折半意义': '丧失', '只能用': '顺序查找' } }); } });

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['binary-search'] = {
    title: '折半查找 Binary Search',
    subtitle: '每次比较把搜索区间减半，O(log n) 次比较就能找到目标。前提：有序 + 顺序存储。',
    height: 700,
    code: [
      'int BinSearch(ST a, int n, KeyType key) {',
      '    low=1; high=n;',
      '    while (low <= high) {',
      '        mid = (low+high)/2;',
      '        if (a[mid]==key) return mid;  // 找到',
      '        else if (a[mid]<key) low=mid+1; // 右半',
      '        else high = mid-1;              // 左半',
      '    }',
      '    return 0;',
      '}'
    ],
    scenes: [
      { name: '折半过程', build: buildBinary,
        codeTag: '找到 + 找不到',
        code: [
          'int BinSearch(ST a, int n, KeyType key) {',
          '    low=1; high=n;',
          '    while (low <= high) {',
          '        mid = (low+high)/2;',
          '        if (a[mid]==key) return mid;',
          '        else if (a[mid]<key) low=mid+1;',
          '        else high = mid-1;',
          '    }',
          '    return 0;',
          '}'
        ] },
      { name: '判定树', build: buildTree,
        codeTag: 'ASL = O(log n)',
        code: [
          '// 判定树：每层 = 一次比较',
          '// 树高 = ⌈log₂(n+1)⌉',
          '// 成功 ASL ≈ log₂(n+1) - 1',
          '// 必须有序 + 顺序存储'
        ] },
      { name: '前提分析', build: buildPrecond,
        codeTag: '有序 + 顺序存储',
        code: [
          '// 前提① 有序：才能判断目标在左或右',
          '// 前提② 顺序存储：a[mid] 是 O(1)',
          '// 链表：取中点要 O(n/2)，代价太高',
          '// 不满足前提 → 只能顺序查找'
        ] }
    ]
  };
})();
