/* 斐波那契查找 — 第9章
 * 场景一：斐波那契分割原理（为什么用 F 数列分割，加减法代替除法）
 * 场景二：查找过程（F[k]-1 个元素的表，mid = low + F[k-1] - 1）
 * 场景三：与折半查找对比（平均性能相近，最坏略差，但分割更"均匀"）
 */
(function () {
  var D = window.VizDraw;

  // 斐波那契数列（预先算好，避免运行期递归）
  var FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  // 查找表：用 F[6]-1 = 7 个元素（下标1..7），方便演示斐波那契分割
  // 补足时不需要：F[6]=8，表长7 = F[6]-1，分割 F[5]-1=4 和 F[4]-1=2
  var ARR = [0, 8, 16, 24, 35, 48, 59, 72];  // 下标0占位，1..7有效
  var N = 7;
  var TARGET_FOUND = 35; // 在位置4
  var TARGET_MISS  = 30; // 不存在

  var CX = 110, CY = 140, CW = 72, GAP = 8, CH = 46;
  function cellX(i) { return CX + (i - 1) * (CW + GAP); }

  function renderRow(ctx, f) {
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
    // 指针
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
    // 显示 k 值（斐波那契阶数）
    if (f.kval !== null) {
      ctx.stage.appendChild(D.text('k=' + f.kval + '  F[k]-1=' + (FIB[f.kval]-1),
        { x: 100, y: 260, 'class': 'vz-info', 'text-anchor': 'start', fill: '#ffd166' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { renderRow(c, f); } };
  }

  function snap(low, high, mid, stObj, k, stats) {
    return { a: ARR.slice(), st: stObj || {}, low: low, high: high, mid: mid,
             kval: k !== undefined ? k : null, stats: stats || {} };
  }

  /* ---- 场景一：斐波那契分割原理 ---- */
  function buildPrinciple() {
    var steps = [];

    function renderFib(ctx, f) {
      D.clear(ctx.stage);
      var fx = 60, fy = 120, fw = 52, fh = 38, fg = 6;
      ctx.stage.appendChild(D.text('斐波那契数列 F[k]:', {
        x: fx, y: fy - 16, 'class': 'vz-info', 'text-anchor': 'start'
      }));
      for (var i = 1; i <= 8; i++) {
        var x = fx + (i-1)*(fw+fg);
        var col = (f.hlK && f.hlK === i) ? D.C.hot : D.C.idle;
        ctx.stage.appendChild(D.el('rect', { x: x, y: fy, width: fw, height: fh, rx: 7,
          fill: col.fill, stroke: col.stroke, 'stroke-width': 2 }));
        ctx.stage.appendChild(D.text(FIB[i], { x: x+fw/2, y: fy+fh/2+6, 'class': 'vz-cellval' }));
        ctx.stage.appendChild(D.text('F['+i+']', { x: x+fw/2, y: fy+fh+16, 'class': 'vz-idx' }));
      }
      if (f.showSplit) {
        var sy = 228, sw = 600, sx = 100;
        ctx.stage.appendChild(D.el('rect', { x: sx, y: sy, width: sw, height: 36, rx: 8,
          fill: '#1d2b49', stroke: '#3f5580', 'stroke-width': 2 }));
        var midX = sx + Math.round(sw * 5 / 8);
        ctx.stage.appendChild(D.el('line', { x1: midX, y1: sy, x2: midX, y2: sy+36,
          stroke: '#ffd166', 'stroke-width': 2 }));
        ctx.stage.appendChild(D.text('F[k-1]-1 个', {
          x: Math.round((sx + midX)/2), y: sy+22, 'class': 'vz-tag', fill: '#6ceaa5'
        }));
        ctx.stage.appendChild(D.text('F[k-2]-1 个', {
          x: Math.round((midX + sx+sw)/2), y: sy+22, 'class': 'vz-tag', fill: '#ff9f6b'
        }));
        ctx.stage.appendChild(D.text('mid=low+F[k-1]-1', {
          x: midX, y: sy-10, 'class': 'vz-tag', fill: '#ffd166'
        }));
      }
      ctx.stats = f.stats || {};
    }

    steps.push({ line: 0, narr: 'F[k] 满足 F[k]=F[k-1]+F[k-2]。把 F[k]-1 个元素的表分两段，mid=low+F[k-1]-1 只需加法！',
      act: ['F[k]=F[k-1]+F[k-2]', 'mid = low+F[k-1]-1', '只需加减法'],
      run: function (c) { renderFib(c, { hlK: 6, showSplit: false,
        stats: { 'F[6]': 8, 'F[5]': 5, 'F[4]': 3, '分割无需除法': '是' } }); } });

    steps.push({ line: 1, narr: '折半查找 mid=(low+high)/2 需要除法。斐波那契查找 mid=low+F[k-1]-1 只用加减，历史上节省时钟周期。',
      act: ['折半：除以2', '斐波那契：只加减', '硬件无除法时优势大'],
      run: function (c) { renderFib(c, { hlK: 6, showSplit: true,
        stats: { 'F[k-1]-1': 4, 'F[k-2]-1': 2, 'mid': 'low+F[k-1]-1', '除法': '不需要' } }); } });

    steps.push({ line: 2, narr: '表长 n 不是 F[k]-1 时，补元素凑成最近的 F[k]-1。补入值取 a[n]，查找结束若结果>n 则视为失败。',
      act: ['补凑 F[k]-1', '补入值 = a[n]', '结果>n → 失败'],
      run: function (c) { renderFib(c, { hlK: null, showSplit: false,
        stats: { '表长 n': N, '补成': 'F[6]-1=7', '补入值': 'a[n]', '结果>n': '失败' } }); } });

    return steps;
  }

  /* ---- 场景二：斐波那契查找过程 ---- */
  function buildSearch() {
    var steps = [];
    // 演示查找 TARGET_FOUND=35（位置4）
    // 表长 N=7 = F[6]-1，k=6
    var k = 6, low = 1, high = N, cmp = 0;

    function makeState(hot, done, mute) {
      var s = {};
      for (var i = 1; i <= N; i++) {
        if (hot && i === hot) s[i] = 'hot';
        else if (done && done[i]) s[i] = 'done';
        else if (mute && i < mute) s[i] = 'mute';
        else s[i] = 'idle';
      }
      return s;
    }

    steps.push(step(snap(1, N, null, {}, k,
      { '目标': TARGET_FOUND, 'k': k, 'F[k]-1': FIB[k]-1, '表长': N }),
      0, '表长 N=' + N + '=F[6]-1=7，取 k=6。mid=low+F[k-1]-1=1+F[5]-1=1+4=5，先比较 a[5]。',
      ['k=6, F[6]-1=7', 'mid=low+F[5]-1', 'mid=1+4=5']));

    // 第一次：mid=5, a[5]=48 > 35, 走左
    var mid1 = low + FIB[k-1] - 1; // =5
    cmp++;
    steps.push(step(snap(low, high, mid1, makeState(mid1, null, null), k,
      { '目标': TARGET_FOUND, 'k': k, 'mid': mid1, '比较次数': cmp }),
      1, 'a[' + mid1 + ']=' + ARR[mid1] + ' > ' + TARGET_FOUND + '，目标在左半 [low..mid-1]，k 减1变 ' + (k-1) + '，下次分割更小。',
      ['a[' + mid1 + ']=' + ARR[mid1] + '>' + TARGET_FOUND, 'high=mid-1=' + (mid1-1), 'k=' + (k-1)]));
    high = mid1 - 1; k--;

    // 第二次：mid=1+F[4]-1=1+2=3
    var mid2 = low + FIB[k-1] - 1; // k=5→F[4]=3→mid=3
    cmp++;
    steps.push(step(snap(low, high, mid2, makeState(mid2, null, null), k,
      { '目标': TARGET_FOUND, 'k': k, 'mid': mid2, '比较次数': cmp }),
      1, 'a[' + mid2 + ']=' + ARR[mid2] + ' < ' + TARGET_FOUND + '，目标在右半 [mid+1..high]，low=mid+1=' + (mid2+1) + '，k 减1变 ' + (k-1) + '。',
      ['a[' + mid2 + ']=' + ARR[mid2] + '<' + TARGET_FOUND, 'low=mid+1=' + (mid2+1), 'k=' + (k-1)]));
    low = mid2 + 1; k--;

    // 第三次：mid=4+F[3]-1=4+1=4（k=4→F[3]=2→F[k-1]=F[3]=2）
    var mid3 = low + FIB[k-1] - 1;
    cmp++;
    var st3 = makeState(null, null, null);
    for (var i = 1; i < low; i++) st3[i] = 'mute';
    for (var i = high+1; i <= N; i++) st3[i] = 'mute';
    st3[mid3] = 'good';
    steps.push(step(snap(low, high, mid3, st3, k,
      { '目标': TARGET_FOUND, 'k': k, 'mid': mid3, '比较次数': cmp }),
      2, 'a[' + mid3 + ']=' + ARR[mid3] + ' 等于目标 ' + TARGET_FOUND + '！斐波那契查找命中，共比较 ' + cmp + ' 次。',
      ['a[' + mid3 + ']==' + TARGET_FOUND, '查找成功！返回 ' + mid3]));

    steps.push(step(snap(null, null, null, {}, null,
      { '目标': TARGET_FOUND, '位置': mid3, '比较次数': cmp, '时间': 'O(log n)' }),
      -1, '斐波那契查找过程：每次用 F 数列分割区间，命中结点在 F[k-1]-1 的左段；未命中则在右段，k 递减直至为 0。',
      ['O(log n)', '只用加减法', '分割不均匀但仍 log']));

    return steps;
  }

  /* ---- 场景三：与折半查找对比 ---- */
  function buildCompare() {
    var steps = [];

    function renderCmp(ctx, f) {
      D.clear(ctx.stage);
      var ly = 108, ry = 228, bx = 90, bw = 340, bh = 56;
      ctx.stage.appendChild(D.el('rect', { x: bx, y: ly, width: bw, height: bh, rx: 10,
        fill: D.C.idle.fill, stroke: D.C[f.hlBin ? 'active' : 'idle'].stroke, 'stroke-width': f.hlBin ? 2.5 : 1.5 }));
      ctx.stage.appendChild(D.text('折半查找', { x: bx+bw/2, y: ly+22, 'class': 'vz-cellval', fill: '#4aa3e0' }));
      ctx.stage.appendChild(D.text('mid = (low+high)/2', { x: bx+bw/2, y: ly+44, 'class': 'vz-tag' }));
      ctx.stage.appendChild(D.el('rect', { x: bx+bw+80, y: ly, width: bw, height: bh, rx: 10,
        fill: D.C.idle.fill, stroke: D.C[f.hlFib ? 'active' : 'idle'].stroke, 'stroke-width': f.hlFib ? 2.5 : 1.5 }));
      ctx.stage.appendChild(D.text('斐波那契查找', { x: bx+bw+80+bw/2, y: ly+22, 'class': 'vz-cellval', fill: '#ffd166' }));
      ctx.stage.appendChild(D.text('mid = low+F[k-1]-1', { x: bx+bw+80+bw/2, y: ly+44, 'class': 'vz-tag' }));
      var rows = [['平均ASL','O(log n)','O(log n)'],['最坏ASL','O(log n)','略大'],['运算','需除法','只加减'],['分割比','=1/2','≈0.618']];
      for (var i = 0; i < rows.length; i++) {
        var ty = ry + i * 28;
        ctx.stage.appendChild(D.text(rows[i][0], { x: bx-10, y: ty+16, 'class': 'vz-info', 'text-anchor': 'end' }));
        ctx.stage.appendChild(D.text(rows[i][1], { x: bx+bw/2, y: ty+16, 'class': 'vz-tag', fill: f.hlRow===i?'#4aa3e0':'#9fb4dc' }));
        ctx.stage.appendChild(D.text(rows[i][2], { x: bx+bw+80+bw/2, y: ty+16, 'class': 'vz-tag', fill: f.hlRow===i?'#ffd166':'#9fb4dc' }));
      }
      ctx.stats = f.stats || {};
    }

    steps.push({ line: 0, narr: '平均性能：两者都是 O(log n)，差别不大。斐波那契的优势是历史意义——省去除法运算。',
      act: ['平均 ASL 相近', '都是 O(log n)', '斐波那契省除法'],
      run: function (c) { renderCmp(c, { hlBin: false, hlFib: false, hlRow: 0,
        stats: { '折半ASL': 'O(log n)', '斐波ASL': 'O(log n)', '平均': '相近', '优势': '加减法' } }); } });

    steps.push({ line: 1, narr: '最坏情况：斐波那契分割不均匀（黄金比约 0.618），可能比折半多比较几次，最坏略差。',
      act: ['斐波最坏略大', '分割比≈0.618', '不如折半的0.5均匀'],
      run: function (c) { renderCmp(c, { hlBin: false, hlFib: true, hlRow: 1,
        stats: { '折半分割': '1/2', '斐波分割': '≈0.618', '最坏': '斐波略差', '现代硬件': '差距微小' } }); } });

    steps.push({ line: 2, narr: '现代 CPU 除法极快，斐波那契查找的硬件优势已消失，但它仍是理解分割查找思想的好例子。',
      act: ['历史意义大于实用', '现代折半更常用', '思想价值高'],
      run: function (c) { renderCmp(c, { hlBin: true, hlFib: true, hlRow: -1,
        stats: { '现代应用': '较少', '学习价值': '高', '思想': '分割查找', '前提': '有序+顺序' } }); } });

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['fibonacci-search'] = {
    title: '斐波那契查找 Fibonacci Search',
    subtitle: '用黄金分割比分割区间，mid = low + F[k-1] - 1，只需加减法，不用除以 2。',
    height: 700,
    code: [
      'while (low <= high) {',
      '    mid = low + F[k-1] - 1;  // 加法分割',
      '    if (a[mid]==key) return mid;',
      '    else if (a[mid]<key) { low=mid+1; k--; }',
      '    else { high=mid-1; k--; }',
      '}'
    ],
    scenes: [
      { name: '分割原理', build: buildPrinciple,
        codeTag: '斐波那契分割',
        code: [
          '// F[k] = F[k-1] + F[k-2]',
          '// 表长 = F[k]-1 时可完美分割',
          '// mid = low + F[k-1] - 1（加法）',
          '// 不是 F[k]-1 时，补末尾值'
        ] },
      { name: '查找过程', build: buildSearch,
        codeTag: 'k 递减直至命中',
        code: [
          'while (low <= high) {',
          '    mid = low + F[k-1] - 1;',
          '    if (a[mid]==key) return mid;',
          '    else if (a[mid]<key) { low=mid+1; k--; }',
          '    else { high=mid-1; k--; }',
          '}'
        ] },
      { name: '与折半对比', build: buildCompare,
        codeTag: '性能对比分析',
        code: [
          '// 折半：mid=(low+high)/2，均匀二分',
          '// 斐波那契：mid=low+F[k-1]-1，黄金比',
          '// 平均 ASL 相近，都是 O(log n)',
          '// 现代 CPU 下折半更常用'
        ] }
    ]
  };
})();
