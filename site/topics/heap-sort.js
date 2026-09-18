/* 堆排序 — 第10章
 * 两个阶段：先把无序数组整理成大顶堆（从最后一个非叶子结点起逐个筛选），
 * 再反复「堆顶换末尾、堆长度减一、对新堆顶重新筛选」。
 * 树和数组是同一份数据的两种画法：a[i] 的孩子就是 a[2i+1] 与 a[2i+2]。
 * 快照模板同 insertion-sort.js。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [4, 1, 7, 3, 9, 2, 6];
  var R = 20, TOP = 126, LV = 56;
  var AY = 272, AX = 151, AW = 52, AGAP = 9, AH = 34;
  var IX = 646;

  // 完全二叉树的坐标：靠层号推算，避免 log 的浮点误差
  function pos(i) {
    var L = 0, cnt = 1, first = 0;
    while (i >= first + cnt) { first += cnt; cnt *= 2; L++; }
    var sp = 480 / cnt;
    return { x: 180 + sp / 2 - 60 + (i - first) * sp, y: TOP + L * LV };
  }

  function render(ctx, f) {
    D.clear(ctx.stage);
    // 先画边，再画结点，结点才能压在边上面
    for (var i = 1; i < f.heap; i++) {
      var par = (i - 1) >> 1, p = pos(par), c = pos(i);
      var on = f.edge && f.edge[0] === par && f.edge[1] === i;
      ctx.stage.appendChild(D.el('line', { x1: p.x, y1: p.y + R - 2,
        x2: c.x, y2: c.y - R + 2,
        stroke: on ? '#ffd166' : '#33456b',
        'stroke-width': on ? 2.8 : 1.6 }));
    }
    if (!f.heap) {
      ctx.stage.appendChild(D.text('堆已取空，所有元素都回到了数组里的最终位置',
        { x: 360, y: TOP + LV, 'class': 'vz-brace', fill: '#2ecc71',
          'text-anchor': 'middle' }));
    }
    for (var k = 0; k < f.heap; k++) {
      var q = pos(k);
      D.circleNode(ctx.stage, { x: q.x, y: q.y, r: R, value: f.a[k],
        state: f.nst[k], tag: String(k) });
    }
    if (f.heap < f.a.length) {
      D.zone(ctx.stage, { x: AX + f.heap * (AW + AGAP) - 5, y: AY - 6, rx: 7,
        w: (f.a.length - f.heap) * (AW + AGAP) - AGAP + 10, h: AH + 12,
        color: '#2ecc71', label: '已出堆（最终位置）' });
    }
    var cells = D.cellRow(ctx.stage, { values: f.a, states: f.st,
      x: AX, y: AY, w: AW, gap: AGAP, h: AH });
    ctx.stage.appendChild(D.text('数组 a',
      { x: AX - 14, y: AY + AH / 2 + 5, 'class': 'vz-lab',
        'text-anchor': 'end' }));
    // 堆顶换末尾：在数组行上画一条弧线
    if (f.swap && cells[f.swap[0]] && cells[f.swap[1]]) {
      D.link(ctx.stage, { x1: cells[f.swap[0]].cx, y1: AY + AH + 6,
        x2: cells[f.swap[1]].cx, y2: AY + AH + 6,
        kind: 'hot', curve: 22, arrow: false });
    }
    ctx.stage.appendChild(D.text('下标关系',
      { x: IX, y: 132, 'class': 'vz-hdr' }));
    var rel = f.rel || ['结点 i 的左孩子是 2i+1', '右孩子是 2i+2',
                        '父结点是 (i-1)/2 取整'];
    for (var m = 0; m < rel.length && m < 5; m++) {
      ctx.stage.appendChild(D.text(rel[m],
        { x: IX, y: 158 + m * 21, 'class': 'vz-info' }));
    }
    ctx.stats = { '堆的大小': f.heap, '比较次数': f.cmp, '交换次数': f.swp };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function make(phase) {
    return function () {
      var a = SRC.slice(), n = a.length, cmp = 0, swp = 0, steps = [];
      var heap = n;
      var nst = function (marks) {
        var s = a.map(function () { return 'idle'; });
        if (marks) for (var q = 0; q < marks.length; q++) s[marks[q][0]] = marks[q][1];
        return s;
      };
      var ast = function (marks) {
        var s = a.map(function (_, k) { return k >= heap ? 'done' : 'idle'; });
        if (marks) for (var q = 0; q < marks.length; q++) s[marks[q][0]] = marks[q][1];
        return s;
      };
      var snap = function (o) {
        o = o || {};
        return { a: a.slice(), heap: heap,
                 nst: o.nst || nst(), st: o.st || ast(),
                 edge: o.edge || null, swap: o.swap || null,
                 rel: o.rel || null, cmp: cmp, swp: swp };
      };

      // 筛选（下沉）：把 a[s] 一路与「较大的孩子」比较，不满足堆序就换下去
      var sift = function (s, size) {
        while (true) {
          var l = 2 * s + 1, r = l + 1;
          if (l >= size) {
            steps.push(step(snap({ nst: nst([[s, 'good']]),
              st: ast([[s, 'good']]),
              rel: ['左孩子下标 2·' + s + '+1 = ' + l,
                    '已超出堆范围 ' + size,
                    '结点 ' + s + ' 是叶子'] }), 7,
              '结点 ' + s + ' 的左孩子下标 ' + l + ' 已经 ≥ 堆的大小 ' + size +
              '，说明它是叶子，没得再往下沉了，本次筛选结束。',
              ['2s+1 = ' + l + ' >= ' + size, '到达叶子，停止']));
            return;
          }
          var c = l;
          if (r < size) {
            cmp++;
            c = a[r] > a[l] ? r : l;
            steps.push(step(snap({
              nst: nst([[s, 'active'], [l, c === l ? 'hot' : 'idle'],
                        [r, c === r ? 'hot' : 'idle']]),
              st: ast([[s, 'active'], [c, 'hot']]), edge: [s, c],
              rel: ['左孩子 a[' + l + '] = ' + a[l],
                    '右孩子 a[' + r + '] = ' + a[r],
                    '较大者 a[' + c + '] = ' + a[c]] }), 8,
              '结点 ' + s + ' 有两个孩子 a[' + l + '] = ' + a[l] + ' 与 a[' + r +
              '] = ' + a[r] + '。大顶堆只要求「父不小于孩子」，' +
              '所以只用跟其中较大的 a[' + c + '] = ' + a[c] + ' 比就够了。',
              ['两个孩子先比一次', 'c = ' + c + '（值 ' + a[c] + '）']));
          } else {
            steps.push(step(snap({
              nst: nst([[s, 'active'], [l, 'hot']]),
              st: ast([[s, 'active'], [l, 'hot']]), edge: [s, l],
              rel: ['只有左孩子 a[' + l + '] = ' + a[l],
                    '右孩子下标 ' + r + ' 超出堆范围'] }), 8,
              '结点 ' + s + ' 只有左孩子 a[' + l + '] = ' + a[l] +
              '（完全二叉树只可能缺右孩子），那它就是唯一的比较对象。',
              ['只有左孩子', 'c = ' + l + '（值 ' + a[l] + '）']));
          }

          cmp++;
          if (a[s] >= a[c]) {
            steps.push(step(snap({
              nst: nst([[s, 'good'], [c, 'idle']]),
              st: ast([[s, 'good']]), edge: [s, c],
              rel: ['a[' + s + '] = ' + a[s] + ' >= a[' + c + '] = ' + a[c],
                    '已满足堆序，无需下沉'] }), 9,
              'a[' + s + '] = ' + a[s] + ' 不小于最大的孩子 ' + a[c] +
              '，这里已经满足大顶堆的要求。它下面的子树本来就是堆，' +
              '所以整棵子树都合格了，筛选可以提前停下。',
              ['a[s] >= a[c]', '就地停止', '下方子树无需再看']));
            return;
          }

          swp++;
          var vs = a[s], vc = a[c];
          var t = a[s]; a[s] = a[c]; a[c] = t;
          steps.push(step(snap({
            nst: nst([[s, 'good'], [c, 'active']]),
            st: ast([[s, 'good'], [c, 'active']]),
            edge: [s, c], swap: [s, c],
            rel: ['a[' + s + '] = ' + vs + ' < a[' + c + '] = ' + vc,
                  '交换后父结点变成 ' + vc,
                  '继续从下标 ' + c + ' 往下筛'] }), 10,
            '父结点 ' + vs + ' 比孩子 ' + vc + ' 小，违反了大顶堆，两者交换。' +
            '交换后 ' + vs + ' 落到下标 ' + c +
            '，它在那棵子树里可能还是太小，所以要接着往下筛。',
            ['交换 a[' + s + '] 与 a[' + c + ']',
             's = ' + c + '，继续下沉', '交换次数 ' + swp]));
          s = c;
        }
      };

      steps.push(step(snap({ rel: ['n = ' + n,
        '最后一个非叶子结点 = (n-2)/2 = ' + ((n - 2) >> 1),
        '下标 ' + (((n - 2) >> 1) + 1) + ' 及以后全是叶子'] }), -1,
        '上面的树和下面的数组是同一份数据：把数组按层从左到右填进完全二叉树，' +
        'a[i] 的左右孩子就是 a[2i+1] 和 a[2i+2]。现在这棵树还不是堆。',
        ['原始序列', '树与数组是一体两面', 'n = ' + n]));

      // 阶段一：建堆。叶子本身就是合法的堆，所以从最后一个非叶子结点往前筛
      steps.push(step(snap({
        nst: nst(), st: ast(),
        rel: ['叶子结点单独看就是堆',
              '所以从下标 ' + ((n - 2) >> 1) + ' 往前筛即可'] }), 0,
        '第一阶段：建大顶堆。单个叶子结点本身就是合法的堆，不用管；' +
        '所以从最后一个非叶子结点 (n-2)/2 = ' + ((n - 2) >> 1) +
        ' 开始，逐个往前做筛选。',
        ['阶段一：建堆', '起点 s = ' + ((n - 2) >> 1), '倒序处理到 0']));

      for (var s0 = (n - 2) >> 1; s0 >= 0; s0--) {
        steps.push(step(snap({
          nst: nst([[s0, 'active']]), st: ast([[s0, 'active']]),
          rel: ['当前筛选起点 s = ' + s0,
                '它的两棵子树已经是堆'] }), 1,
          '对结点 ' + s0 + '（值 ' + a[s0] + '）做筛选。' +
          '它下面的两棵子树都已经处理过、都是堆了，' +
          '所以只需让它自己一路下沉到合适的位置。',
          ['s = ' + s0, '子树已成堆', '只需下沉当前结点']));
        sift(s0, n);
      }

      steps.push(step(snap({
        nst: nst(), st: ast(),
        rel: ['堆顶 a[0] = ' + a[0] + ' 是全局最大',
              '任一父结点都不小于其孩子'] }), 2,
        '建堆完成：' + a.join(', ') + '。现在每个父结点都不小于它的孩子，' +
        '所以堆顶 a[0] = ' + a[0] + ' 一定是整个序列的最大值。',
        ['大顶堆建成', '堆顶即最大值 ' + a[0],
         '建堆共比较 ' + cmp + ' 次']));

      if (phase === 'heapify') {
        steps.push(step(snap({
          nst: nst(), st: ast(),
          rel: ['建堆自底向上，只用 O(n)',
                '越靠下的结点越多但下沉越浅'] }), -1,
          '这一场只看建堆。值得注意的是：建堆并不是 O(n log n)。' +
          '越靠底层的结点数量越多，但它们能下沉的层数越少，' +
          '把两者相乘再求和，总代价其实是 O(n)。',
          ['建堆完成', '比较 ' + cmp + ' 次 / 交换 ' + swp + ' 次',
           '建堆整体只需 O(n)']));
        return steps;
      }

      // 阶段二：反复取走堆顶
      steps.push(step(snap({
        nst: nst([[0, 'hot']]), st: ast([[0, 'hot']]),
        rel: ['堆顶是最大值',
              '数组末尾正是最大值该去的位置'] }), 3,
        '第二阶段：排序。堆顶是最大值，而升序数组里最大值该待在最末尾 —— ' +
        '那就把这两个位置换一下，最大值一步到位。',
        ['阶段二：出堆', '堆顶换到末尾', '然后缩小堆']));

      for (var m = n - 1; m > 0; m--) {
        var v0 = a[0], vm = a[m];
        swp++;
        var tt = a[0]; a[0] = a[m]; a[m] = tt;
        steps.push(step(snap({
          nst: nst([[0, 'active'], [m, 'good']]),
          st: ast([[0, 'active'], [m, 'good']]), swap: [0, m],
          rel: ['a[0] = ' + v0 + ' 是当前堆最大值',
                '换到 a[' + m + ']，即当前堆末尾',
                '它从此不再参与'] }), 5,
          '把堆顶 ' + v0 + ' 与堆末尾 a[' + m + '] = ' + vm +
          ' 交换。' + v0 + ' 是当前堆里最大的，换到 ' + m +
          ' 号位后就是它的最终位置了。',
          ['交换 a[0] 与 a[' + m + ']',
           'a[' + m + '] = ' + v0 + ' 已定位', '交换次数 ' + swp]));

        heap = m;
        steps.push(step(snap({
          nst: nst([[0, 'hot']]), st: ast([[0, 'hot']]),
          rel: ['堆的大小 ' + (m + 1) + ' → ' + m,
                '新堆顶 a[0] = ' + a[0] + ' 来自末尾',
                '除堆顶外仍满足堆序'] }), 6,
          '堆的大小减到 ' + m + '，已出堆的部分变绿、不再参与。' +
          '新堆顶 ' + a[0] + ' 是刚从末尾换上来的，很可能太小，' +
          '但除了它以外堆序都没被破坏，所以只需对堆顶做一次筛选。',
          ['heap = ' + m, '只有堆顶可能违规', '对 s = 0 重新筛选']));

        if (m > 1) sift(0, m);
      }

      heap = 0;
      steps.push(step(snap({
        nst: nst(), st: a.map(function () { return 'done'; }),
        rel: ['建堆 O(n)',
              'n-1 次筛选，每次 O(log n)',
              '总计 O(n log n)'] }), -1,
        '排序完成：' + a.join(', ') + '。共比较 ' + cmp + ' 次、交换 ' + swp +
        ' 次。建堆只要 O(n)，之后 n-1 次出堆每次筛选 O(log n)，' +
        '所以总体是 O(n log n)，而且只用了常数额外空间。' +
        '代价是元素会跨层跳跃，因此它不稳定。',
        ['排序完成', '比较 ' + cmp + ' 次 / 交换 ' + swp + ' 次',
         'O(n log n)，原地，不稳定']));

      return steps;
    };
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['heap-sort'] = {
    title: '堆排序 Heap Sort',
    subtitle: '把数组看成完全二叉树，先自底向上筛成大顶堆；再反复「堆顶换末尾、堆长度减一、对新堆顶重新筛选」。原地的 O(n log n)。',
    height: 740,
    code: [
      '// 阶段一：建大顶堆',
      'for s = (n-2)/2 downto 0: sift(s, n)',
      '// 建堆完成，a[0] 是最大值',
      '// 阶段二：反复取走堆顶',
      'for m = n-1 downto 1:',
      '    swap(a[0], a[m])              // 最大值送到末尾',
      '    sift(0, m)                    // 堆缩小到 m，重筛堆顶',
      'sift(s, size):                    // 让 a[s] 一路下沉',
      '    c = 较大的那个孩子',
      '    if a[s] >= a[c]: return       // 已满足堆序',
      '    swap(a[s], a[c]); s = c       // 换下去，继续'
    ],
    scenes: [
      { name: '完整流程', build: make('all') },
      { name: '只看建堆', build: make('heapify') }
    ]
  };
})();
