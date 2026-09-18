/* 归并排序 — 第10章
 * 用自底向上的两路归并展示：先把相邻的 1 个 1 个合成 2 个，再 2 合 4、4 合 8。
 * 归并的关键是「两个都已有序」，所以只需两个指针各扫一遍，天然稳定。
 * 快照模板同 insertion-sort.js。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [5, 3, 8, 1, 9, 2, 7, 6];
  var TY = 150, BY = 268, CX = 126, CW = 56, GAP = 10, CH = 44;

  function xOf(i) { return CX + i * (CW + GAP); }

  function render(ctx, f) {
    D.clear(ctx.stage);
    // 上排：源数组（本轮的输入，每 len 个一组已有序）
    if (f.seg) {
      D.zone(ctx.stage, { x: xOf(f.seg[0]) - 5, y: TY - 6, rx: 8,
        w: (f.seg[1] - f.seg[0] + 1) * (CW + GAP) - GAP + 10, h: CH + 12,
        color: '#5b8cff', opacity: 0.13,
        label: '本次归并的两段：[' + f.seg[0] + ', ' + f.mid + '] 与 [' +
               (f.mid + 1) + ', ' + f.seg[1] + ']' });
    }
    var top = D.cellRow(ctx.stage, { values: f.a, states: f.st,
      x: CX, y: TY, w: CW, gap: GAP, h: CH, index: false });
    ctx.stage.appendChild(D.text('源数组 a',
      { x: CX - 16, y: TY + CH / 2 + 5, 'class': 'vz-lab',
        'text-anchor': 'end' }));
    // 下排：辅助数组（归并的输出）
    var bot = D.cellRow(ctx.stage, { values: f.b, states: f.bst,
      x: CX, y: BY, w: CW, gap: GAP, h: CH });
    ctx.stage.appendChild(D.text('辅助数组 tmp',
      { x: CX - 16, y: BY + CH / 2 + 5, 'class': 'vz-lab',
        'text-anchor': 'end' }));
    // 分界竖线：让「左段 / 右段」一目了然
    if (f.mid !== null && f.mid + 1 < f.a.length) {
      var dx = xOf(f.mid + 1) - GAP / 2;
      ctx.stage.appendChild(D.el('line', { x1: dx, y1: TY - 10,
        x2: dx, y2: TY + CH + 10, stroke: '#ffd166', 'stroke-width': 2,
        'stroke-dasharray': '5 4' }));
    }
    var pt = [['i', f.i, '#6ceaa5', TY], ['j', f.j, '#ff9f6b', TY]];
    for (var q = 0; q < pt.length; q++) {
      if (pt[q][1] === null || !top[pt[q][1]]) continue;
      D.pointer(ctx.stage, { x: top[pt[q][1]].cx, y: pt[q][3] + CH,
        name: pt[q][0], above: false, color: pt[q][2] });
    }
    if (f.k !== null && bot[f.k]) {
      D.pointer(ctx.stage, { x: bot[f.k].cx, y: BY,
        name: 'k', above: true, color: '#4aa3e0' });
    }
    // 取谁写谁：画一条从源格子指向辅助格子的箭头
    if (f.from !== null && top[f.from] && bot[f.to]) {
      D.link(ctx.stage, { x1: top[f.from].cx, y1: TY + CH + 6,
        x2: bot[f.to].cx, y2: BY - 6, kind: 'hot' });
    }
    ctx.stats = { '当前子段长度': f.len, '比较次数': f.cmp, '写入次数': f.wr };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function build() {
    var a = SRC.slice(), n = a.length, cmp = 0, wr = 0, steps = [];
    var b = a.map(function () { return ''; });
    var blank = function () { return a.map(function () { return ''; }); };
    var mkSt = function (marks, dim) {
      var s = a.map(function () { return dim ? 'mute' : 'idle'; });
      if (marks) for (var q = 0; q < marks.length; q++) s[marks[q][0]] = marks[q][1];
      return s;
    };
    var bSt = function () {
      return b.map(function (v) { return v === '' ? 'mute' : 'good'; });
    };
    var snap = function (o) {
      return { a: a.slice(), b: b.slice(), st: o.st, bst: bSt(),
               seg: o.seg || null,
               mid: o.mid === undefined ? null : o.mid,
               i: o.i === undefined ? null : o.i,
               j: o.j === undefined ? null : o.j,
               k: o.k === undefined ? null : o.k,
               from: o.from === undefined ? null : o.from,
               to: o.to === undefined ? null : o.to,
               len: o.len, cmp: cmp, wr: wr };
    };

    steps.push(step(snap({ st: mkSt(), len: 1 }), -1,
      '归并排序的前提是「两段各自有序」。单个元素天然有序，' +
      '所以从长度 1 开始，两两合并成长度 2、再合成 4、8……',
      ['原始序列', 'n = ' + n, '子段长度从 1 起翻倍']));

    for (var len = 1; len < n; len *= 2) {
      steps.push(step(snap({ st: mkSt(), len: len }), 0,
        '新一轮：把每相邻的两个长度 ' + len + ' 的有序段合并成长度 ' +
        (len * 2) + ' 的有序段。',
        ['当前段长 len = ' + len,
         '合并后段长 ' + (len * 2)]));

      for (var lo = 0; lo < n; lo += len * 2) {
        var mid = Math.min(lo + len - 1, n - 1);
        var hi = Math.min(lo + len * 2 - 1, n - 1);
        if (mid >= hi) {
          // 落单的尾段：没有配对对象，原样搬下去
          for (var c = lo; c <= hi; c++) { b[c] = a[c]; wr++; }
          steps.push(step(snap({ st: mkSt([[lo, 'done']]), len: len,
            seg: [lo, hi], mid: mid }), 1,
            '区间 [' + lo + ', ' + hi + '] 没有配对的右段（元素个数不是 2 的幂时会出现），' +
            '原样抄到辅助数组。',
            ['无右段可配', '直接复制 [' + lo + ', ' + hi + ']']));
          continue;
        }

        var i = lo, j = mid + 1, k = lo;
        steps.push(step(snap({ st: mkSt([[lo, 'active'], [mid + 1, 'active']]),
          len: len, seg: [lo, hi], mid: mid, i: i, j: j, k: k }), 2,
          '准备合并 [' + lo + ', ' + mid + '] 和 [' + (mid + 1) + ', ' + hi +
          ']。i 指左段头、j 指右段头、k 指辅助数组的写入位置。',
          ['i = ' + i + ', j = ' + j, 'k = ' + k,
           '两段各自都已有序']));

        while (i <= mid && j <= hi) {
          cmp++;
          var takeLeft = a[i] <= a[j];
          var src = takeLeft ? i : j;
          b[k] = a[src];
          wr++;
          steps.push(step(snap({ st: mkSt([[i, takeLeft ? 'good' : 'idle'],
                                           [j, takeLeft ? 'idle' : 'good']]),
            len: len, seg: [lo, hi], mid: mid, i: i, j: j, k: k,
            from: src, to: k }), 4,
            'a[' + i + '] = ' + a[i] + ' 与 a[' + j + '] = ' + a[j] + ' 比，' +
            (takeLeft ? '左段的不大，取左段' : '右段的更小，取右段') +
            '，写进 tmp[' + k + ']。' +
            (takeLeft && a[i] === a[j] ? '相等时取左段，这就是归并稳定的原因。' : ''),
            ['a[' + i + '] ' + (takeLeft ? '<= ' : '> ') + 'a[' + j + ']',
             'tmp[' + k + '] = ' + a[src],
             (takeLeft ? 'i++' : 'j++') + '，k++']));
          if (takeLeft) i++; else j++;
          k++;
        }
        while (i <= mid) {
          b[k] = a[i]; wr++;
          steps.push(step(snap({ st: mkSt([[i, 'good']]), len: len,
            seg: [lo, hi], mid: mid, i: i, k: k, from: i, to: k }), 5,
            '右段已取完，左段剩下的 ' + a[i] + ' 一定都比已写入的大，直接顺次搬过去。',
            ['右段耗尽', 'tmp[' + k + '] = a[' + i + '] = ' + a[i]]));
          i++; k++;
        }
        while (j <= hi) {
          b[k] = a[j]; wr++;
          steps.push(step(snap({ st: mkSt([[j, 'good']]), len: len,
            seg: [lo, hi], mid: mid, j: j, k: k, from: j, to: k }), 6,
            '左段已取完，右段剩下的 ' + a[j] + ' 直接顺次搬过去。',
            ['左段耗尽', 'tmp[' + k + '] = a[' + j + '] = ' + a[j]]));
          j++; k++;
        }

        steps.push(step(snap({ st: mkSt(), len: len, seg: [lo, hi],
          mid: mid }), 7,
          '[' + lo + ', ' + hi + '] 合并完成，tmp 里这一段已经有序：[' +
          b.slice(lo, hi + 1).join(', ') + ']。',
          ['本段合并完成',
           '结果 [' + b.slice(lo, hi + 1).join(', ') + ']']));
      }

      // 一轮结束：辅助数组整体回写源数组，为下一轮做输入
      a = b.slice();
      b = blank();
      steps.push(step(snap({ st: mkSt(), len: len }), 8,
        '本轮所有段都合并好了，把 tmp 整体拷回 a：[' + a.join(', ') +
        ']。清空 tmp，进入下一轮。',
        ['tmp 回写到 a', '段长 ' + len + ' → ' + (len * 2),
         len * 2 < n ? '继续下一轮' : '已覆盖整个数组']));
    }

    steps.push(step(snap({ st: a.map(function () { return 'done'; }),
      len: n }), -1,
      '排序完成。共比较 ' + cmp + ' 次、写入 ' + wr + ' 次。' +
      '每轮把段长翻倍，所以只需 log₂' + n + ' = ' + Math.ceil(Math.log2(n)) +
      ' 轮，每轮扫一遍 n 个元素 —— 稳定的 O(n log n)，代价是要额外一个长度 n 的数组。',
      ['排序完成', '比较 ' + cmp + ' 次 / 写入 ' + wr + ' 次',
       'O(n log n)，稳定，空间 O(n)']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['merge-sort'] = {
    title: '归并排序 Merge Sort',
    subtitle: '自底向上两两合并：段长从 1 开始翻倍，每次把两个已有序的段用双指针合成一个更长的有序段。稳定的 O(n log n)，代价是额外 O(n) 空间。',
    height: 730,
    code: [
      'for len = 1; len < n; len *= 2:      // 段长翻倍',
      '    for lo = 0; lo < n; lo += 2*len:',
      '        i = lo; j = mid+1; k = lo',
      '        while i <= mid and j <= hi:',
      '            tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++]',
      '        while i <= mid: tmp[k++] = a[i++]   // 左段余下',
      '        while j <= hi:  tmp[k++] = a[j++]   // 右段余下',
      '        // 本段合并完成',
      '    a = tmp                          // 回写，进入下一轮'
    ],
    scenes: [
      { name: '完整流程', build: build }
    ]
  };
})();
