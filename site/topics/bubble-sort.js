/* 冒泡排序 — 第10章
 * 场景一：一轮怎么把最大值「冒」到末尾 —— 只看第 1 轮，把「相邻比较、大的往后换」
 *         这件事讲透，末尾一个元素就位。
 * 场景二：完整排序 —— 一轮轮收缩未排序区，已就位区从右往左长。
 * 场景三：swapped 提前退出 —— 换一组近乎有序的数据，一轮无交换即收工，
 *         这是冒泡最好情形 O(n) 的由来。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var SRC = [5, 2, 9, 1, 7, 3, 8, 4];       // 主数据，8 个元素
  var NEAR = [2, 3, 5, 7, 8, 9];            // 近乎有序，给提前退出场景用

  /* 柱状图几何：舞台 y ∈ [84,384]，基线放 300，柱高上限 150，
   * 顶上留给数值标签与图例，底下留给下标与旁白（旁白基线 352）。 */
  var BASE = 300, MAXH = 150;

  /* 柱宽与间隙按元素个数算，让 8 根与 6 根都居中且不越界 */
  function geo(n) {
    var w = n > 6 ? 46 : 56, gap = n > 6 ? 16 : 20;
    var total = n * w + (n - 1) * gap;
    return { w: w, gap: gap, x0: Math.round((1000 - total) / 2) };
  }

  function cp(a) { return a.slice(); }

  /* 顶部图例：四种状态各一格，说明颜色含义 */
  function legend(ctx) {
    var items = [['idle', '未排序'], ['hot', '正在比较'],
                 ['bad', '交换中'], ['done', '已就位']];
    var x = 96;
    for (var i = 0; i < items.length; i++) {
      var c = D.C[items[i][0]];
      ctx.stage.appendChild(D.el('rect', { x: x, y: 104, width: 12, height: 12,
        rx: 3, fill: c.fill, stroke: c.stroke, 'stroke-width': 1.5 }));
      ctx.stage.appendChild(D.text(items[i][1],
        { x: x + 18, y: 114, 'class': 'vz-lab' }));
      x += items[i][1].length * 13 + 40;
    }
  }

  /* f = { a:[值…], st:[状态…], sortedFrom:下标, j:比较左端或 null,
   *       pass:轮次, cmp:次数, sw:次数, done:已就位个数, hdr:标题, note:提示 } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var n = f.a.length, g = geo(n), i;
    legend(ctx);

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 96, y: 140, 'class': 'vz-hdr', fill: '#8fa6d8' }));

    // 已就位区底色：从 sortedFrom 一直到末尾
    if (f.sortedFrom < n) {
      var zx = g.x0 + f.sortedFrom * (g.w + g.gap) - 8;
      D.zone(ctx.stage, { x: zx, y: 150,
        w: (n - f.sortedFrom) * (g.w + g.gap) - g.gap + 16, h: BASE - 150 + 12,
        rx: 9, color: '#2ecc71', label: '已就位（最大值已冒到末尾）' });
    }

    var bars = D.barRow(ctx.stage, { values: f.a, states: f.st, x: g.x0,
      baseY: BASE, w: g.w, gap: g.gap, maxH: MAXH, maxValue: 9 });

    // 比较框：把当前比较的两根柱子圈起来，视线不会跑丢
    if (f.j !== null && bars[f.j] && bars[f.j + 1]) {
      ctx.stage.appendChild(D.el('rect', { x: bars[f.j].x - 8, y: 150,
        width: (g.w + g.gap) + g.w + 16, height: BASE - 150 + 12, rx: 10,
        fill: 'none', stroke: '#ffd166', 'stroke-width': 2,
        'stroke-dasharray': '6 5' }));
      D.pointer(ctx.stage, { name: 'j', x: bars[f.j].cx, y: BASE + 24,
        above: false, color: '#ffd166' });
    }

    if (f.note) {
      ctx.stage.appendChild(D.text(f.note,
        { x: 96, y: BASE + 52, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    ctx.stats = { '第几轮 pass': f.pass, '比较次数': f.cmp,
                  '交换次数': f.sw, '已就位': f.done };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* 通用的一轮扫描生成器。
   * full=false 只走第 1 轮；early=true 时数据近乎有序，会命中提前退出。 */
  function makeSteps(src, opts) {
    var a = cp(src), n = a.length, steps = [];
    var cmp = 0, sw = 0, done = 0, sortedFrom = n;
    var rounds = opts.onlyFirst ? 1 : n - 1;
    var hdr = opts.hdr;

    var states = function (extra) {
      var s = [], k;
      for (k = 0; k < n; k++) s.push(k >= sortedFrom ? 'done' : 'idle');
      if (extra) for (k in extra) s[k] = extra[k];
      return s;
    };
    var snap = function (o) {
      return { a: cp(a), st: o.st, sortedFrom: sortedFrom, j: o.j == null ? null : o.j,
               pass: o.pass, cmp: cmp, sw: sw, done: done, hdr: hdr, note: o.note };
    };

    steps.push(step(snap({ st: states(), pass: 0,
      note: '未排序区 = 全部 ' + n + ' 个元素' }), -1,
      '初始状态：' + n + ' 个元素全部未排序。冒泡的做法是让相邻两个比一比，大的往后换。',
      ['数据 = [' + a.join(', ') + ']', '准备进入第 1 轮']));

    for (var i = 0; i < rounds; i++) {
      var swapped = false;
      var scanTo = n - 2 - i;
      steps.push(step(snap({ st: states(), pass: i + 1,
        note: '本轮只扫 a[0..' + (scanTo + 1) + ']，右边已就位的不用再看' }), 0,
        '第 ' + (i + 1) + ' 轮开始。在前 ' + (n - i) +
        ' 个元素里两两比较，把这一段的最大值送到 a[' + (scanTo + 1) + ']。',
        ['轮次 i = ' + i, '扫描范围 j = 0…' + scanTo]));

      for (var j = 0; j <= scanTo; j++) {
        cmp++;
        var gt = a[j] > a[j + 1];
        var stc = {}; stc[j] = 'hot'; stc[j + 1] = 'hot';
        steps.push(step(snap({ st: states(stc), j: j, pass: i + 1 }), 3,
          '比较 a[' + j + ']=' + a[j] + ' 与 a[' + (j + 1) + ']=' + a[j + 1] +
          (gt ? '，左边更大，要交换。' : '，顺序已经对了，不动。'),
          ['a[' + j + '] ' + (gt ? '>' : '<=') + ' a[' + (j + 1) + ']',
           gt ? '需要交换' : '保持原样', '比较次数 ' + cmp]));

        if (gt) {
          var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
          sw++; swapped = true;
          var sts = {}; sts[j] = 'bad'; sts[j + 1] = 'bad';
          steps.push(step(snap({ st: states(sts), j: j, pass: i + 1 }), 3,
            '交换完成，' + a[j + 1] + ' 挪到了右边，继续往后冒。' +
            '大的元素就这样一格一格往末尾走。',
            ['swap(a[' + j + '], a[' + (j + 1) + '])',
             '交换次数 ' + sw, 'swapped = true']));
        }
      }

      sortedFrom = scanTo + 1;
      done++;
      var stf = {}; stf[sortedFrom] = 'done';
      steps.push(step(snap({ st: states(stf), pass: i + 1,
        note: '已就位 ' + done + ' 个，未排序区缩到 a[0..' + (sortedFrom - 1) + ']' }), 4,
        '本轮结束，a[' + sortedFrom + ']=' + a[sortedFrom] +
        ' 就位。下一轮的扫描范围可以少一格。',
        ['a[' + sortedFrom + '] 已确定', '未排序区长度 ' + sortedFrom]));

      if (!swapped) {
        sortedFrom = 0; done = n;
        steps.push(step(snap({ st: states(), pass: i + 1,
          note: '一次交换都没有 → 整体已有序' }), 4,
          '这一轮扫下来一次交换都没发生，说明数据已经有序，不必再扫后面几轮，' +
          '直接收工。这就是最好情形 O(n) 的来源。',
          ['swapped == false', 'break 提前退出',
           '只用了 ' + cmp + ' 次比较']));
        return steps;
      }
      if (opts.onlyFirst) {
        steps.push(step(snap({ st: states(), pass: 1,
          note: '第 1 轮做完，最大值已在末尾' }), -1,
          '一轮的效果就是这样：最大的 ' + a[n - 1] +
          ' 被送到了末尾。剩下的 ' + (n - 1) + ' 个元素重复同样的动作即可。',
          ['第 1 轮比较 ' + cmp + ' 次', '交换 ' + sw + ' 次',
           '切到「完整排序」看后续']));
        return steps;
      }
    }

    sortedFrom = 0; done = n;
    steps.push(step(snap({ st: states(), pass: n - 1,
      note: '全部有序' }), -1,
      '排序完成，共比较 ' + cmp + ' 次、交换 ' + sw +
      ' 次。比较次数固定在 n(n-1)/2 量级，所以最坏和平均都是 O(n²)。',
      ['结果 = [' + a.join(', ') + ']',
       '比较 ' + cmp + ' 次 / 交换 ' + sw + ' 次']));
    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['bubble-sort'] = {
    title: '冒泡排序 Bubble Sort',
    subtitle: '相邻元素两两比较，大的往后换。每完成一轮，未排序区的最大值就「冒」到了末尾；' +
      '若某轮一次交换都没有，说明已经有序，可以提前收工。',
    height: 700,
    code: [
      'for i = 0 to n-2:                  // 每轮固定一个最大值',
      '    swapped = false',
      '    for j = 0 to n-2-i:            // 只扫未排序区',
      '        if a[j] > a[j+1]:',
      '            swap(a[j], a[j+1]); swapped = true',
      '    if not swapped: break          // 已有序，提前收工'
    ],
    scenes: [
      { name: '一轮怎么冒', codeTag: '第 1 轮',
        build: function () {
          return makeSteps(SRC, { onlyFirst: true, hdr: '只看第 1 轮：最大值如何走到末尾' });
        } },
      { name: '完整排序', codeTag: '全过程',
        build: function () {
          return makeSteps(SRC, { hdr: '完整过程：未排序区逐轮收缩' });
        } },
      { name: '提前退出 O(n)', codeTag: 'swapped 的作用',
        build: function () {
          return makeSteps(NEAR, { hdr: '近乎有序的数据：一轮无交换即收工' });
        } }
    ]
  };
})();
