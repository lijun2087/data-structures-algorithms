/* 简单选择排序 — 第10章
 * 与插入排序的对偶：插入排序「拿一个元素去找位置」，选择排序「守着一个位置去找元素」。
 * 卖点是移动次数极少（每轮最多一次交换），代价是比较次数固定 n(n-1)/2。
 * 快照模板同 insertion-sort.js。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [5, 2, 9, 1, 7, 3, 8];
  var CY = 208, CX = 132, CW = 58, GAP = 10, CH = 46;

  function xOf(i) { return CX + i * (CW + GAP); }

  function render(ctx, f) {
    D.clear(ctx.stage);
    if (f.sortedTo >= 0) {
      D.zone(ctx.stage, { x: CX - 7, y: CY - 9, rx: 9,
        w: (f.sortedTo + 1) * (CW + GAP) - GAP + 14, h: CH + 18,
        color: '#2ecc71', label: '已排序区（都是最终位置）' });
    }
    if (f.i !== null && f.i < f.a.length) {
      D.zone(ctx.stage, { x: xOf(f.i) - 7, y: CY - 9, rx: 9,
        w: (f.a.length - f.i) * (CW + GAP) - GAP + 14, h: CH + 18,
        color: '#5b8cff', opacity: 0.1, label: '待选区' });
    }
    var cells = D.cellRow(ctx.stage, { values: f.a, states: f.st,
      x: CX, y: CY, w: CW, gap: GAP, h: CH });
    // min 记在上方，i/j 记在下方，互不遮挡
    if (f.min !== null && cells[f.min]) {
      D.pointer(ctx.stage, { x: cells[f.min].cx, y: CY,
        name: 'min = ' + f.a[f.min], above: true, color: '#ffd166' });
    }
    if (f.i !== null && cells[f.i]) {
      D.pointer(ctx.stage, { x: cells[f.i].cx, y: CY + CH,
        name: 'i', above: false, color: '#6ceaa5' });
    }
    if (f.j !== null && cells[f.j]) {
      D.pointer(ctx.stage, { x: cells[f.j].cx, y: CY + CH + 30,
        name: 'j', above: false, color: '#4aa3e0' });
    }
    if (f.swap) {
      var c1 = cells[f.swap[0]], c2 = cells[f.swap[1]];
      D.link(ctx.stage, { x1: c1.cx, y1: CY + CH + 8,
        x2: c2.cx, y2: CY + CH + 8, kind: 'hot', curve: 44, arrow: false });
      ctx.stage.appendChild(D.text('交换',
        { x: (c1.cx + c2.cx) / 2, y: CY + CH + 46, 'class': 'vz-brace',
          fill: '#ffd166' }));
    }
    ctx.stats = { '已定位元素': f.sortedTo + 1, '比较次数': f.cmp,
                  '交换次数': f.swp };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function build() {
    var a = SRC.slice(), n = a.length, cmp = 0, swp = 0, steps = [];
    // 注意：这里必须传下标数组对，不能写成 { i: 'x' } —— 那样键是字符串 "i"
    var mkSt = function (upto, marks) {
      var s = a.map(function (_, k) { return k <= upto ? 'done' : 'idle'; });
      if (marks) for (var q = 0; q < marks.length; q++) s[marks[q][0]] = marks[q][1];
      return s;
    };
    var snap = function (o) {
      return { a: a.slice(), st: o.st,
               sortedTo: o.sortedTo === undefined ? -1 : o.sortedTo,
               i: o.i === undefined ? null : o.i,
               j: o.j === undefined ? null : o.j,
               min: o.min === undefined ? null : o.min,
               swap: o.swap || null, cmp: cmp, swp: swp };
    };

    steps.push(step(snap({ st: mkSt(-1), i: 0, sortedTo: -1 }), -1,
      '思路和插入排序正好相反：不是拿元素去找位置，而是守着位置 i，' +
      '在右边的待选区里挑出最小的那个搬过来。',
      ['原始序列', 'n = ' + n, '从 i = 0 开始']));

    for (var i = 0; i < n - 1; i++) {
      var min = i;
      steps.push(step(snap({ st: mkSt(i - 1, [[i, 'active']]), sortedTo: i - 1,
        i: i, min: min }), 1,
        '新一轮开始，目标是把 a[' + i + '] 填成正确的值。先假设待选区第一个 a[' +
        i + '] = ' + a[i] + ' 就是最小的。',
        ['min = ' + i, '待选区 [' + i + ', ' + (n - 1) + ']']));

      for (var j = i + 1; j < n; j++) {
        cmp++;
        var better = a[j] < a[min];
        var st = mkSt(i - 1);
        st[min] = 'hot'; st[j] = better ? 'good' : 'bad';
        steps.push(step(snap({ st: st, sortedTo: i - 1, i: i, j: j,
          min: min }), 3,
          'a[' + j + '] = ' + a[j] + ' 与当前最小值 ' + a[min] + ' 比：' +
          (better ? '更小，min 改指向 ' + j + '。' : '不更小，min 不动。'),
          ['a[' + j + '] ' + (better ? '< ' : '>= ') + 'a[min]',
           better ? 'min = ' + j : 'min 保持 ' + min,
           '比较次数 ' + cmp]));
        if (better) min = j;
      }

      if (min !== i) {
        steps.push(step(snap({ st: mkSt(i - 1, [[i, 'active'], [min, 'hot']]),
          sortedTo: i - 1, i: i, min: min, swap: [i, min] }), 4,
          '待选区扫完，最小的是 a[' + min + '] = ' + a[min] +
          '。把它和 a[' + i + '] = ' + a[i] + ' 交换。',
          ['min = ' + min + ' ≠ i', '交换 a[' + i + '] 与 a[' + min + ']']));
        swp++;
        var t = a[i]; a[i] = a[min]; a[min] = t;
      } else {
        steps.push(step(snap({ st: mkSt(i - 1, [[i, 'good']]),
          sortedTo: i - 1, i: i, min: min }), 4,
          '最小的本来就是 a[' + i + '] = ' + a[i] + '，不用交换，直接就位。',
          ['min == i', '省下一次交换']));
      }

      steps.push(step(snap({ st: mkSt(i), sortedTo: i, i: i + 1 }), 5,
        'a[' + i + '] = ' + a[i] + ' 已经是它的最终位置，永远不会再动。' +
        '已排序区长到 ' + (i + 1) + ' 个。',
        ['a[' + i + '] 定位完成', '已排序区 ' + (i + 1) + ' 个',
         '交换次数 ' + swp]));
    }

    steps.push(step(snap({ st: a.map(function () { return 'done'; }),
      sortedTo: n - 1 }), -1,
      '排序完成。比较了 ' + cmp + ' 次（等于 n(n-1)/2 = ' + (n * (n - 1) / 2) +
      '，与数据无关），但只交换了 ' + swp + ' 次——数据搬运量小是它唯一的长处。',
      ['比较 ' + cmp + ' 次（恒定）',
       '交换 ' + swp + ' 次（至多 n-1）',
       'O(n²)，不稳定']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['selection-sort'] = {
    title: '简单选择排序 Selection Sort',
    subtitle: '每一轮在未排序区里选出最小的元素，与该区第一个位置交换。比较次数固定不变，但交换次数至多 n-1 次。',
    height: 720,
    code: [
      'for i = 0 to n-2:',
      '    min = i                      // 假设待选区首元素最小',
      '    for j = i+1 to n-1:',
      '        if a[j] < a[min]: min = j    // 记住更小的下标',
      '    if min != i: swap(a[i], a[min])  // 一轮最多一次交换',
      '    // a[i] 此时已是最终位置'
    ],
    scenes: [
      { name: '完整流程', build: build }
    ]
  };
})();
