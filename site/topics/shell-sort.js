/* 希尔排序 — 第10章
 * 核心直觉：直接插入对「基本有序」的数组极快，但对乱序数组每次只能挪一格。
 * 希尔用大增量先让远处的元素跨大步就位，最后增量为 1 时数组已基本有序。
 * 快照模板同 insertion-sort.js。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  var CY = 206, CX = 96, CW = 52, GAP = 9, CH = 44;
  var GC = ['#5b8cff', '#ffd166', '#6ceaa5', '#ff9f6b', '#c78bff'];

  function xOf(i) { return CX + i * (CW + GAP); }

  function render(ctx, f) {
    D.clear(ctx.stage);
    // 同组元素用同色小横条串起来，肉眼就能看出「隔 gap 取一个」
    if (f.gap) {
      for (var g = 0; g < f.gap; g++) {
        var col = GC[g % GC.length];
        var xs = [];
        for (var k = g; k < f.a.length; k += f.gap) xs.push(xOf(k) + CW / 2);
        if (xs.length < 2) continue;
        var y = CY + CH + 34 + g * 9;
        ctx.stage.appendChild(D.el('path', {
          d: 'M' + xs[0] + ' ' + y + ' L ' + xs[xs.length - 1] + ' ' + y,
          stroke: col, 'stroke-width': 2, opacity: 0.5 }));
        for (var q = 0; q < xs.length; q++) {
          ctx.stage.appendChild(D.el('circle', { cx: xs[q], cy: y, r: 3.2,
            fill: col, opacity: 0.9 }));
        }
      }
    }
    if (f.group !== null && f.gap) {
      var lo = null, hi = null;
      for (var m = f.group; m < f.a.length; m += f.gap) {
        if (lo === null) lo = m;
        hi = m;
      }
      D.zone(ctx.stage, { x: xOf(lo) - 5, y: CY - 6, rx: 8,
        w: xOf(hi) - xOf(lo) + CW + 10, h: CH + 12,
        color: GC[f.group % GC.length], opacity: 0.13,
        label: '当前子序列（下标 ' + f.group + ' 起，步长 ' + f.gap + '）' });
    }
    var cells = D.cellRow(ctx.stage, { values: f.a, states: f.st,
      x: CX, y: CY, w: CW, gap: GAP, h: CH });
    if (f.hold !== null) {
      var hx = xOf(f.holdAt);
      D.cellRow(ctx.stage, { values: [f.hold], states: ['active'],
        x: hx, y: CY - 88, w: CW, gap: GAP, h: CH, index: false });
      ctx.stage.appendChild(D.text('tmp',
        { x: hx + CW / 2, y: CY - 98, 'class': 'vz-brace', fill: '#4aa3e0' }));
      D.link(ctx.stage, { x1: hx + CW / 2, y1: CY - 88 + CH + 4,
        x2: hx + CW / 2, y2: CY - 6, kind: 'ptr', dash: true });
    }
    ctx.stats = { '当前增量 gap': f.gap || '—', '本轮比较': f.cmp,
                  '累计移动': f.mov };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function build() {
    var a = SRC.slice(), n = a.length, cmp = 0, mov = 0, steps = [];
    var base = function (extra) {
      var s = a.map(function () { return 'idle'; });
      if (extra) for (var q in extra) s[q] = extra[q];
      return s;
    };
    // 把某个子序列的成员标成 mute，突出「这一轮只看这些格子」
    var groupSt = function (grp, gap, extra) {
      var s = a.map(function () { return 'mute'; });
      for (var k = grp; k < n; k += gap) s[k] = 'idle';
      if (extra) for (var q in extra) s[q] = extra[q];
      return s;
    };
    var snap = function (o) {
      return { a: a.slice(), st: o.st,
               gap: o.gap === undefined ? 0 : o.gap,
               group: o.group === undefined ? null : o.group,
               hold: o.hold === undefined ? null : o.hold,
               holdAt: o.holdAt || 0, cmp: cmp, mov: mov };
    };

    // 同一组数据先用直接插入跑一遍，只为拿到移动次数做对照
    var plainMov = (function () {
      var b = SRC.slice(), c = 0;
      for (var p = 1; p < b.length; p++) {
        var t = b[p], q = p - 1;
        while (q >= 0 && b[q] > t) { b[q + 1] = b[q]; q--; c++; }
        b[q + 1] = t; c++;
      }
      return c;
    })();

    steps.push(step(snap({ st: base() }), -1,
      '完全逆序的 9 个数，这是插入排序最难受的情况：每个元素都要从最右一路挪到最左，' +
      '直接插入要移动 ' + plainMov + ' 次。希尔的办法是先让元素跨大步走。',
      ['原始序列（完全逆序）', 'n = ' + n,
       '直接插入需移动 ' + plainMov + ' 次']));

    var gaps = [4, 2, 1], roundMov = [];
    for (var gi = 0; gi < gaps.length; gi++) {
      var gap = gaps[gi];
      cmp = 0;
      var movAtRoundStart = mov;
      steps.push(step(snap({ st: base(), gap: gap }), 0,
        '增量 gap = ' + gap + '。下方彩色连线把「相隔 ' + gap +
        ' 格」的元素串成一个子序列，一共 ' + gap + ' 组，每组各自做插入排序。',
        ['gap = ' + gap, '共 ' + gap + ' 个子序列',
         '组内间隔 ' + gap + ' 格']));

      for (var i = gap; i < n; i++) {
        var grp = i % gap;
        var tmp = a[i];
        // 注意用变量作键必须写成计算属性，写 { i: ... } 得到的是字符串键 "i"
        var cur = {}; cur[i] = 'hot';
        steps.push(step(snap({ st: groupSt(grp, gap, cur), gap: gap,
          group: grp, hold: tmp, holdAt: i }), 1,
          '轮到 a[' + i + '] = ' + tmp + '，它属于下标 ' + grp +
          ' 那一组。取出暂存，在同组左边找它的位置。',
          ['tmp = a[' + i + '] = ' + tmp, '所属组：下标 ' + grp + ' 起']));

        var j = i - gap;
        while (j >= 0 && a[j] > tmp) {
          cmp++; mov++;
          var moved = a[j];
          a[j + gap] = a[j];
          var stm = groupSt(grp, gap, {});
          stm[j + gap] = 'hot'; stm[j] = 'mute';
          steps.push(step(snap({ st: stm, gap: gap, group: grp,
            hold: tmp, holdAt: j }), 3,
            'a[' + j + '] = ' + moved + ' 比 tmp = ' + tmp + ' 大，把它往右挪 ' +
            gap + ' 格（不是 1 格，这就是跨大步）。',
            ['a[' + j + '] > tmp',
             'a[' + (j + gap) + '] = a[' + j + ']',
             '一次跨 ' + gap + ' 格']));
          j -= gap;
        }
        if (j >= 0) cmp++;
        mov++;
        a[j + gap] = tmp;
        var stf = groupSt(grp, gap, {});
        stf[j + gap] = 'good';
        steps.push(step(snap({ st: stf, gap: gap, group: grp }), 4,
          'tmp = ' + tmp + ' 落在位置 ' + (j + gap) + '，这一组的前半段又有序了。',
          ['a[' + (j + gap) + '] = tmp',
           j < 0 ? '已到组内最左端' : 'a[' + j + '] <= tmp，停止']));
      }

      roundMov.push(mov - movAtRoundStart);
      var isSorted = a.every(function (v, k) { return k === 0 || a[k - 1] <= v; });
      steps.push(step(snap({ st: base(), gap: gap }), 5,
        'gap = ' + gap + ' 这一轮走完，序列变成 [' + a.join(', ') + ']，本轮移动 ' +
        (mov - movAtRoundStart) + ' 次。' +
        (gap === 1
          ? '增量降到 1，这一轮就是普通的直接插入排序，收尾用的。'
          : isSorted
            ? '碰巧已经全局有序了，但算法不知道，后面的轮次照走——只是几乎不用再挪。'
            : '还不是全局有序，但小的都往左靠、大的都往右靠了。'),
        ['gap = ' + gap + ' 轮结束',
         '本轮比较 ' + cmp + ' 次 / 移动 ' + (mov - movAtRoundStart) + ' 次',
         gap > 1 ? '下一轮 gap = ' + gaps[gi + 1] : '全部结束']));
    }

    steps.push(step(snap({ st: a.map(function () { return 'done'; }) }), -1,
      '排序完成，三轮移动 ' + roundMov.join(' / ') + ' 次，合计 ' + mov +
      ' 次；直接插入处理同一组数据要 ' + plainMov +
      ' 次。大增量让元素一步跨 4 格，省下的正是那些一格一格的挪动。',
      ['希尔共移动 ' + mov + ' 次',
       '直接插入需 ' + plainMov + ' 次',
       '各轮移动：' + roundMov.join(' / ')]));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['shell-sort'] = {
    title: '希尔排序 Shell Sort',
    subtitle: '按增量把数组拆成若干个「隔着取」的子序列分别插入排序，增量逐步缩到 1。先粗调再精调，避免元素一格一格地挪。',
    height: 730,
    code: [
      'for gap in [4, 2, 1]:              // 增量逐步缩小',
      '    for i = gap to n-1:',
      '        tmp = a[i]; j = i - gap',
      '        while j >= 0 and a[j] > tmp:',
      '            a[j+gap] = a[j]; j -= gap   // 一次跨 gap 格',
      '        a[j+gap] = tmp'
    ],
    scenes: [
      { name: '完整流程', build: build }
    ]
  };
})();
