/* 折半插入排序 — 第10章
 * 与直接插入排序唯一的区别：找插入点从「边比边挪」换成「折半查找」。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [5, 2, 9, 1, 7, 3];
  var CY = 190, CX = 168, CW = 62, GAP = 10, CH = 44;

  function xOf(i) { return CX + i * (CW + GAP); }

  function render(ctx, f) {
    D.clear(ctx.stage);
    if (f.sortedTo >= 0) {
      D.zone(ctx.stage, { x: CX - 7, y: CY - 9, rx: 9,
        w: (f.sortedTo + 1) * (CW + GAP) - GAP + 14, h: CH + 18,
        color: '#2ecc71', label: '已排序区' });
    }
    if (f.lo !== null && f.hi !== null && f.lo <= f.hi) {
      D.zone(ctx.stage, { x: xOf(f.lo) - 4, y: CY - 4, rx: 7,
        w: (f.hi - f.lo + 1) * (CW + GAP) - GAP + 8, h: CH + 8,
        color: '#ffd166', opacity: 0.16 });
    }
    var cells = D.cellRow(ctx.stage, { values: f.a, states: f.st,
      x: CX, y: CY, w: CW, gap: GAP, h: CH });
    if (f.hold !== null) {
      var hx = xOf(f.holdAt);
      D.cellRow(ctx.stage, { values: [f.hold], states: ['active'],
        x: hx, y: CY - 78, w: CW, gap: GAP, h: CH, index: false });
      ctx.stage.appendChild(D.text('哨兵 tmp',
        { x: hx + CW / 2, y: CY - 88, 'class': 'vz-brace', fill: '#4aa3e0' }));
      D.link(ctx.stage, { x1: hx + CW / 2, y1: CY - 78 + CH + 4,
        x2: hx + CW / 2, y2: CY - 8, kind: 'ptr', dash: true });
    }
    var marks = [['low', f.lo, '#6ceaa5'], ['high', f.hi, '#ff9f6b'],
                 ['mid', f.mid, '#ffd166']];
    var lane = 0;
    for (var k = 0; k < marks.length; k++) {
      var m = marks[k];
      if (m[1] === null || m[1] < 0 || m[1] >= f.a.length) continue;
      D.pointer(ctx.stage, { x: cells[m[1]].cx, y: CY + CH + 14 + lane * 24,
        name: m[0], above: false, color: m[2] });
      lane++;
    }
    ctx.stats = { '有序区长度': f.len, '比较次数': f.cmp, '移动次数': f.mov };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function build() {
    var a = SRC.slice(), n = a.length, cmp = 0, mov = 0, steps = [];
    var base = function () { return a.map(function () { return 'idle'; }); };
    var sorted = function (upto, extra) {
      var s = base();
      for (var k = 0; k <= upto; k++) s[k] = 'done';
      if (extra) for (var q in extra) s[q] = extra[q];
      return s;
    };
    var snap = function (o) {
      return { a: a.slice(), st: o.st, sortedTo: o.sortedTo,
               hold: o.hold === undefined ? null : o.hold,
               holdAt: o.holdAt || 0,
               lo: o.lo === undefined ? null : o.lo,
               hi: o.hi === undefined ? null : o.hi,
               mid: o.mid === undefined ? null : o.mid,
               len: o.len, cmp: cmp, mov: mov };
    };

    steps.push(step(snap({ st: sorted(0), sortedTo: 0, len: 1 }), 0,
      '有序区仍从 a[0] 开始。不同的是：既然左边已经有序，找插入点就不必逐个比，可以折半。',
      ['初始有序区 = [' + a[0] + ']', '从 i = 1 开始']));

    for (var i = 1; i < n; i++) {
      var tmp = a[i];
      // 注意用变量作键必须写成计算属性，写 { i: ... } 得到的是字符串键 "i"
      var hole = {}; hole[i] = 'mute';
      steps.push(step(snap({ st: sorted(i - 1, hole), sortedTo: i - 1,
        hold: tmp, holdAt: i, len: i }), 1,
        '取出 a[' + i + '] = ' + tmp + ' 暂存到 tmp，接下来在 [0, ' + (i - 1) + '] 里折半找它该去哪。',
        ['tmp = a[' + i + ']', '查找区间 [0, ' + (i - 1) + ']']));

      var low = 0, high = i - 1;
      steps.push(step(snap({ st: sorted(i - 1, hole), sortedTo: i - 1,
        hold: tmp, holdAt: i, lo: low, hi: high, len: i }), 2,
        'low 指向区间左端，high 指向右端，黄色底色就是当前还需要考虑的范围。',
        ['low = 0', 'high = ' + high]));

      while (low <= high) {
        var mid = (low + high) >> 1;
        cmp++;
        var stm = sorted(i - 1, hole);
        stm[mid] = 'hot';
        var bigger = a[mid] > tmp;
        steps.push(step(snap({ st: stm, sortedTo: i - 1, hold: tmp, holdAt: i,
          lo: low, hi: high, mid: mid, len: i }), 4,
          'mid = ' + mid + '，a[' + mid + '] = ' + a[mid] +
          (bigger ? ' 比 tmp 大，插入点一定在 mid 左边，high 收到 ' + (mid - 1) + '。'
                  : ' 不大于 tmp，插入点一定在 mid 右边，low 提到 ' + (mid + 1) + '。'),
          ['mid = (low+high)/2 = ' + mid,
           'a[' + mid + '] ' + (bigger ? '> ' : '<= ') + 'tmp',
           (bigger ? 'high = ' + (mid - 1) : 'low = ' + (mid + 1))]));
        if (bigger) high = mid - 1; else low = mid + 1;
      }

      steps.push(step(snap({ st: sorted(i - 1, hole), sortedTo: i - 1,
        hold: tmp, holdAt: i, lo: low, hi: high, len: i }), 5,
        'low 越过 high，区间空了。折半查找的结论：插入点就是 low = ' + low + '。',
        ['low > high，查找结束', '插入点 = ' + low,
         '本轮只比较了 log 级次数']));

      for (var j = i - 1; j >= low; j--) {
        mov++;
        a[j + 1] = a[j];
        var sts = sorted(i, {});
        sts[j + 1] = 'hot'; sts[j] = 'mute';
        steps.push(step(snap({ st: sts, sortedTo: i - 1, hold: tmp,
          holdAt: j, lo: low, len: i }), 6,
          '插入点已定，把 a[' + j + '] = ' + a[j] + ' 及其右边的元素整体右移一格腾出空位。',
          ['a[' + (j + 1) + '] = a[' + j + ']', '移动次数 +1']));
      }

      mov++;
      a[low] = tmp;
      var stf = sorted(i, {});
      stf[low] = 'good';
      steps.push(step(snap({ st: stf, sortedTo: i, len: i + 1 }), 7,
        '把 tmp = ' + tmp + ' 写进位置 ' + low + '，有序区扩大到 ' + (i + 1) + ' 个元素。',
        ['a[' + low + '] = tmp', '有序区长度 ' + (i + 1)]));
    }

    steps.push(step(snap({ st: a.map(function () { return 'done'; }),
      sortedTo: n - 1, len: n }), -1,
      '排序完成，比较 ' + cmp + ' 次、移动 ' + mov + ' 次。关键是这 ' + cmp +
      ' 次只由 n 决定，换任何一组 ' + n + ' 个数都还是 ' + cmp +
      ' 次；直接插入在最坏情况下要比 ' + (n * (n - 1) / 2) + ' 次。',
      ['比较 ' + cmp + ' 次（与数据无关）',
       '移动 ' + mov + ' 次（一点没省）',
       '仍是 O(n²)，瓶颈在移动']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['binary-insertion-sort'] = {
    title: '折半插入排序 Binary Insertion Sort',
    subtitle: '有序区既然有序，就该用折半查找定位插入点。比较次数降到 O(n log n)，但元素移动量丝毫不减。',
    height: 720,
    code: [
      'for i = 1 to n-1:',
      '    tmp = a[i]',
      '    low = 0; high = i - 1',
      '    while low <= high:            // 折半查找插入点',
      '        mid = (low + high) / 2',
      '        if a[mid] > tmp: high = mid - 1 else: low = mid + 1',
      '    for j = i-1 down to low: a[j+1] = a[j]   // 整体右移',
      '    a[low] = tmp'
    ],
    scenes: [
      { name: '完整流程', build: build }
    ]
  };
})();
