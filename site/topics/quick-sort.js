/* 快速排序 — 第10章
 * 教材写法：取区间首元素作枢轴存进 pivot，low/high 两头向中间「挖坑填数」，
 * 相遇处就是枢轴的最终位置，然后递归处理左右两段。
 * 快照模板同 insertion-sort.js。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [5, 3, 8, 1, 9, 2, 7, 6];
  var CY = 200, CX = 108, CW = 56, GAP = 10, CH = 46;
  var STK = { x: 700, y: 118 };

  function xOf(i) { return CX + i * (CW + GAP); }

  function render(ctx, f) {
    D.clear(ctx.stage);
    if (f.lo !== null) {
      D.zone(ctx.stage, { x: xOf(f.lo) - 6, y: CY - 8, rx: 8,
        w: (f.hi - f.lo + 1) * (CW + GAP) - GAP + 12, h: CH + 16,
        color: '#5b8cff', opacity: 0.12,
        label: '当前处理区间 [' + f.lo + ', ' + f.hi + ']' });
    }
    var cells = D.cellRow(ctx.stage, { values: f.a, states: f.st,
      x: CX, y: CY, w: CW, gap: GAP, h: CH });
    // 枢轴悬在上方：它的值已被取出，原格子是个「坑」
    if (f.pivot !== null) {
      var px = xOf(f.pivAt);
      D.cellRow(ctx.stage, { values: [f.pivot], states: ['hot'],
        x: px, y: CY - 86, w: CW, gap: GAP, h: CH, index: false });
      ctx.stage.appendChild(D.text('枢轴 pivot',
        { x: px + CW / 2, y: CY - 96, 'class': 'vz-brace', fill: '#ffd166' }));
      D.link(ctx.stage, { x1: px + CW / 2, y1: CY - 86 + CH + 4,
        x2: px + CW / 2, y2: CY - 6, kind: 'hot', dash: true });
    }
    if (f.i !== null && cells[f.i]) {
      D.pointer(ctx.stage, { x: cells[f.i].cx, y: CY + CH,
        name: 'low', above: false, color: '#6ceaa5' });
    }
    if (f.j !== null && cells[f.j]) {
      D.pointer(ctx.stage, { x: cells[f.j].cx, y: CY + CH + 30,
        name: 'high', above: false, color: '#ff9f6b' });
    }
    // 右上角画待处理区间栈，说明递归在做什么
    ctx.stage.appendChild(D.text('待处理区间',
      { x: STK.x, y: STK.y - 8, 'class': 'vz-hdr' }));
    if (!f.stack.length) {
      ctx.stage.appendChild(D.text('（空，递归结束）',
        { x: STK.x, y: STK.y + 14, 'class': 'vz-lab' }));
    }
    for (var k = 0; k < f.stack.length && k < 5; k++) {
      var s = f.stack[k];
      ctx.stage.appendChild(D.el('rect', { x: STK.x, y: STK.y + k * 26,
        width: 118, height: 21, rx: 5,
        fill: k === 0 ? '#123a5c' : '#1a2338',
        stroke: k === 0 ? '#4aa3e0' : '#2b3a5c' }));
      ctx.stage.appendChild(D.text('[' + s[0] + ', ' + s[1] + ']  ' +
        (s[1] - s[0] + 1) + ' 个元素',
        { x: STK.x + 9, y: STK.y + k * 26 + 15, 'class': 'vz-info' }));
    }
    ctx.stats = { '已定位枢轴': f.fixed, '比较次数': f.cmp, '移动次数': f.mov };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function build() {
    var a = SRC.slice(), n = a.length, cmp = 0, mov = 0, fixed = 0, steps = [];
    var settled = {};                       // 已经就位的枢轴下标
    var queue = [[0, n - 1]];               // 显式栈模拟递归调用，顺序与真实递归一致

    var mkSt = function (lo, hi, marks) {
      var s = a.map(function (_, k) {
        if (settled[k]) return 'done';
        return (lo !== null && k >= lo && k <= hi) ? 'idle' : 'mute';
      });
      if (marks) for (var q = 0; q < marks.length; q++) s[marks[q][0]] = marks[q][1];
      return s;
    };
    var snap = function (o) {
      return { a: a.slice(), st: o.st,
               lo: o.lo === undefined ? null : o.lo,
               hi: o.hi === undefined ? null : o.hi,
               i: o.i === undefined ? null : o.i,
               j: o.j === undefined ? null : o.j,
               pivot: o.pivot === undefined ? null : o.pivot,
               pivAt: o.pivAt || 0,
               stack: queue.map(function (x) { return x.slice(); }),
               fixed: fixed, cmp: cmp, mov: mov };
    };

    steps.push(step(snap({ st: mkSt(null, null) }), -1,
      '快排的思路是分治：选一个枢轴，一趟就把「比它小的」全甩到左边、' +
      '「比它大的」全甩到右边，枢轴自己落到最终位置，再对左右两段各自重复。',
      ['原始序列', 'n = ' + n, '待处理区间 [0, ' + (n - 1) + ']']));

    while (queue.length) {
      var seg = queue.shift(), lo = seg[0], hi = seg[1];
      if (lo >= hi) {
        if (lo === hi) {
          settled[lo] = true; fixed++;
          steps.push(step(snap({ st: mkSt(lo, hi, [[lo, 'done']]),
            lo: lo, hi: hi }), 0,
            '区间 [' + lo + ', ' + hi + '] 只剩 1 个元素，天然有序，直接就位。',
            ['lo == hi', '单元素区间无需分区']));
        }
        continue;
      }

      var pivot = a[lo], i = lo, j = hi;
      steps.push(step(snap({ st: mkSt(lo, hi, [[lo, 'mute']]), lo: lo, hi: hi,
        i: i, j: j, pivot: pivot, pivAt: lo }), 1,
        '取区间首元素 a[' + lo + '] = ' + pivot + ' 作枢轴并暂存，' +
        '它的格子就变成一个「坑」，等着被填。',
        ['pivot = a[' + lo + '] = ' + pivot,
         'low = ' + i + ', high = ' + j]));

      while (i < j) {
        // 从右往左找第一个小于 pivot 的，填到左边的坑里
        while (i < j && a[j] >= pivot) {
          cmp++;
          steps.push(step(snap({ st: mkSt(lo, hi, [[i, 'mute'], [j, 'bad']]),
            lo: lo, hi: hi, i: i, j: j, pivot: pivot, pivAt: i }), 3,
            'high 侧：a[' + j + '] = ' + a[j] + ' ≥ 枢轴 ' + pivot +
            '，该留在右边，high 左移一格。',
            ['a[' + j + '] >= pivot', 'high-- → ' + (j - 1)]));
          j--;
        }
        if (i < j) {
          cmp++; mov++;
          var vj = a[j];
          a[i] = a[j];
          steps.push(step(snap({ st: mkSt(lo, hi, [[i, 'good'], [j, 'mute']]),
            lo: lo, hi: hi, i: i, j: j, pivot: pivot, pivAt: j }), 4,
            'a[' + j + '] = ' + vj + ' < 枢轴 ' + pivot + '，把它搬到左边的坑 a[' +
            i + ']。现在坑移到了 ' + j + '。',
            ['a[' + j + '] < pivot', 'a[' + i + '] = a[' + j + ']',
             '坑移到下标 ' + j]));
        }
        // 从左往右找第一个大于 pivot 的，填到右边的坑里
        while (i < j && a[i] <= pivot) {
          cmp++;
          steps.push(step(snap({ st: mkSt(lo, hi, [[i, 'bad'], [j, 'mute']]),
            lo: lo, hi: hi, i: i, j: j, pivot: pivot, pivAt: j }), 5,
            'low 侧：a[' + i + '] = ' + a[i] + ' ≤ 枢轴 ' + pivot +
            '，该留在左边，low 右移一格。',
            ['a[' + i + '] <= pivot', 'low++ → ' + (i + 1)]));
          i++;
        }
        if (i < j) {
          cmp++; mov++;
          var vi = a[i];
          a[j] = a[i];
          steps.push(step(snap({ st: mkSt(lo, hi, [[j, 'good'], [i, 'mute']]),
            lo: lo, hi: hi, i: i, j: j, pivot: pivot, pivAt: i }), 6,
            'a[' + i + '] = ' + vi + ' > 枢轴 ' + pivot + '，把它搬到右边的坑 a[' +
            j + ']。坑又回到了 ' + i + '。',
            ['a[' + i + '] > pivot', 'a[' + j + '] = a[' + i + ']',
             '坑移到下标 ' + i]));
        }
      }

      mov++;
      a[i] = pivot;
      settled[i] = true; fixed++;
      // 插到队首，且右段先插、左段后插，取出顺序就是左→右，与真实递归一致
      if (i + 1 <= hi) queue.unshift([i + 1, hi]);
      if (lo <= i - 1) queue.unshift([lo, i - 1]);

      steps.push(step(snap({ st: mkSt(lo, hi, [[i, 'done']]), lo: lo, hi: hi }), 7,
        'low 与 high 相遇在 ' + i + '，把枢轴 ' + pivot +
        ' 填进这个坑。它左边全 ≤ ' + pivot + '，右边全 ≥ ' + pivot +
        '，所以这个位置就是它的终点，再也不用动。',
        ['a[' + i + '] = pivot = ' + pivot,
         '左段 [' + lo + ', ' + (i - 1) + ']',
         '右段 [' + (i + 1) + ', ' + hi + ']']));
    }

    steps.push(step(snap({ st: a.map(function () { return 'done'; }) }), -1,
      '所有区间处理完毕，数组有序。共比较 ' + cmp + ' 次、移动 ' + mov +
      ' 次。平均 O(n log n)；但若每次枢轴都选到最大或最小值，' +
      '区间只缩小 1，就退化成 O(n²)。',
      ['排序完成', '比较 ' + cmp + ' 次 / 移动 ' + mov + ' 次',
       '平均 O(n log n)，最坏 O(n²)']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['quick-sort'] = {
    title: '快速排序 Quick Sort',
    subtitle: '取枢轴，两头向中间「挖坑填数」，一趟把小的甩到左、大的甩到右，枢轴落到最终位置，再分别递归左右两段。',
    height: 720,
    code: [
      'quickSort(a, lo, hi):',
      '    pivot = a[lo]                     // 首元素作枢轴，留下一个坑',
      '    while lo < hi:',
      '        while lo < hi and a[hi] >= pivot: hi--',
      '        a[lo] = a[hi]                 // 小的填到左边的坑',
      '        while lo < hi and a[lo] <= pivot: lo++',
      '        a[hi] = a[lo]                 // 大的填到右边的坑',
      '    a[lo] = pivot                     // 相遇处即枢轴终点'
    ],
    scenes: [
      { name: '完整流程', build: build }
    ]
  };
})();
