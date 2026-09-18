/* 线索二叉树 — 第6章
 * 二叉链表有 n+1 个空指针域闲着，而遍历序列的前驱后继又求不出来 ——
 * 线索二叉树就是拿这批空指针去存前驱后继，代价是每个结点多两个标志位。
 * 场景一：数清空指针，说明为什么要加 LTag / RTag。
 * 场景二：中序线索化 —— 一趟中序遍历，用 pre 回填。
 * 场景三：线索树上遍历 —— 不用栈、不用递归，也不必回到根。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /*        A
   *      /   \
   *     B     C
   *    / \   /
   *   D   E F
   * 中序序列：D B E A F C（记在 ORD 里，线索就是照它连的） */
  var V = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' };
  var IDS = [1, 2, 3, 4, 5, 6];
  var NN = 6;
  var ORD = [4, 2, 5, 1, 6, 3];        // 中序序列的结点编号
  var ORDV = ['D', 'B', 'E', 'A', 'F', 'C'];

  function has(i) { return V[i] !== undefined; }
  function lch(i) { return has(i * 2) ? i * 2 : 0; }
  function rch(i) { return has(i * 2 + 1) ? i * 2 + 1 : 0; }

  /* 布局：树在左 x∈[122,472]，右侧 x=536 起放中序序列与标志表。
   * 竖直：标题 100 / 说明 122 / 树 158 · 204 · 250（r=16，底 266）/
   *       线索弧下探到 300 / 备注 312。 */
  var X0 = 60, SPAN = 620, Y0 = 158, DY = 46, R = 16;
  var SQX = 536, SQW = 38, SQG = 6, SQY = 170, SQH = 32;

  function levelOf(i) { var L = 1, f = 1; while (f * 2 <= i) { f *= 2; L++; } return L; }
  function xOf(i) {
    var L = levelOf(i), k = 1, f = 1, q;
    for (q = 1; q < L; q++) { k *= 2; f *= 2; }
    return X0 + SPAN * (i - f + 0.5) / k;
  }
  function yOf(i) { return Y0 + (levelOf(i) - 1) * DY; }
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* f = { st:{}, ltag:{}, rtag:{}, thr:[{from,side,to}], showTag, ord:已定序数,
   *       hdr, cap, notes, stats, hi:{} } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, j, t;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    // 实线孩子指针
    for (j = 0; j < NN; j++) {
      i = IDS[j];
      if (i === 1) continue;
      D.link(ctx.stage, { x1: xOf(i >> 1), y1: yOf(i >> 1) + R,
        x2: xOf(i), y2: yOf(i) - R - 2, kind: 'next', arrow: false,
        width: 1.8 });
    }

    // 线索：虚线绿弧，从空指针那一侧的下角出发，绕到目标结点侧面
    for (j = 0; j < (f.thr || []).length; j++) {
      t = f.thr[j];
      var sx = xOf(t.from) + (t.side === 'L' ? -10 : 10);
      var sy = yOf(t.from) + R - 2;
      if (t.to === 0) {
        // 指向头结点（序列首尾）：画一小段落到空处
        D.link(ctx.stage, { x1: sx, y1: sy,
          x2: sx + (t.side === 'L' ? -26 : 26), y2: sy + 26,
          kind: 'ptr', dash: true, width: 1.6 });
        continue;
      }
      D.link(ctx.stage, { x1: sx, y1: sy,
        x2: xOf(t.to) + (t.side === 'L' ? 12 : -12), y2: yOf(t.to) + R - 4,
        kind: 'ptr', dash: true, curve: 34,
        width: t.hot ? 2.6 : 1.5 });
    }

    // 结点，以及左右标志位
    for (j = 0; j < NN; j++) {
      i = IDS[j];
      D.circleNode(ctx.stage, { x: xOf(i), y: yOf(i), r: R,
        state: f.st[i] || 'idle', value: V[i] });
      if (f.showTag) {
        ctx.stage.appendChild(D.text(f.ltag[i] === 1 ? '1' : '0',
          { x: xOf(i) - R - 8, y: yOf(i) + 4, 'class': 'vz-idx',
            fill: f.ltag[i] === 1 ? '#6ceaa5' : '#5f739b' }));
        ctx.stage.appendChild(D.text(f.rtag[i] === 1 ? '1' : '0',
          { x: xOf(i) + R + 8, y: yOf(i) + 4, 'class': 'vz-idx',
            fill: f.rtag[i] === 1 ? '#6ceaa5' : '#5f739b' }));
      }
    }

    // 右侧：中序序列，线索就是把它串起来
    ctx.stage.appendChild(D.text('中序序列（线索照它连）',
      { x: SQX, y: SQY - 12, 'class': 'vz-tag', fill: '#9fb4dc',
        'text-anchor': 'start' }));
    for (j = 0; j < NN; j++) {
      var x = SQX + j * (SQW + SQG);
      var on = j < (f.ord === undefined ? NN : f.ord);
      var c = D.C[f.hi && f.hi[ORD[j]] ? f.hi[ORD[j]] : (on ? 'done' : 'mute')];
      ctx.stage.appendChild(D.el('rect', { x: x, y: SQY, width: SQW,
        height: SQH, rx: 5, fill: c.fill, stroke: c.stroke,
        'stroke-width': f.hi && f.hi[ORD[j]] ? 2.6 : 1.5 }));
      ctx.stage.appendChild(D.text(ORDV[j],
        { x: x + SQW / 2, y: SQY + 22, 'class': 'vz-cellval',
          fill: on || (f.hi && f.hi[ORD[j]]) ? '#eef3ff' : '#4a5c82' }));
      ctx.stage.appendChild(D.text(j + 1,
        { x: x + SQW / 2, y: SQY + SQH + 14, 'class': 'vz-idx' }));
    }

    for (j = 0; j < f.notes.length && j < 3; j++) {
      ctx.stage.appendChild(D.text(f.notes[j],
        { x: SQX, y: 250 + j * 22, 'class': 'vz-info' }));
    }
    if (f.legend) {
      ctx.stage.appendChild(D.text(f.legend,
        { x: SQX, y: 322, 'class': 'vz-info', fill: '#6ceaa5' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function zeros() { var o = {}, i; for (i = 1; i <= 7; i++) o[i] = 0; return o; }

  /* ---------- 场景一：空指针有多少，标志位为什么必要 ---------- */
  function buildWhy() {
    var steps = [];
    var snap = function (o) {
      return { st: o.st || {}, ltag: o.ltag || zeros(), rtag: o.rtag || zeros(),
               thr: o.thr || [], showTag: !!o.showTag, ord: o.ord,
               hi: o.hi || null, hdr: o.hdr, cap: o.cap || null,
               legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      ord: 0,
      hdr: '毛病一：二叉链表有一半指针域是空的',
      cap: '6 个结点共 12 个指针域，实际用掉的只有 5 条分支 —— 空着 7 个',
      stats: { '结点数 n': 6, '指针域 2n': 12,
               '分支 n−1': 5, '空指针 n+1': 7 },
      notes: ['每条分支恰好占用一个指针域',
        '树只有 n − 1 条分支',
        '空指针数 = 2n − (n − 1) = n + 1 = 7'] }), 0,
      '二叉链表的第一个毛病：指针域一半是空的。6 个结点共 12 个指针域，' +
      '而树只有 5 条分支，于是有 7 个指针域闲着 —— 一般地，n 个结点空 n + 1 个。',
      ['指针域 12 个', '分支只有 5 条', '空指针 7 个']));

    steps.push(step(snap({
      ord: NN, hi: { 5: 'hot' },
      hdr: '毛病二：遍历序列的前驱后继求不出来',
      cap: '中序序列是 D B E A F C；可光看链表，E 的后继是谁？只能从根重新遍历一遍',
      stats: { '中序序列': 'D B E A F C', 'E 的前驱': 'B',
               'E 的后继': 'A', '现在求它': 'O(n) 重新遍历' },
      notes: ['前驱后继是「遍历序列」上的概念',
        '链表里只存了孩子关系，没存这层关系',
        '每次求都要 O(n) 重新遍历，太贵'] }), 1,
      '第二个毛病：前驱后继求不出来。中序序列是 D B E A F C，E 的后继是 A —— ' +
      '可链表里只存了孩子关系，要知道这一点就得从根重新中序遍历一遍，代价 O(n)。',
      ['前驱后继是序列上的概念', '链表只存孩子关系',
       '每次求都要 O(n)']));

    steps.push(step(snap({
      ord: NN,
      thr: [{ from: 4, side: 'L', to: 0 }, { from: 4, side: 'R', to: 2, hot: 1 },
            { from: 5, side: 'L', to: 2 }, { from: 5, side: 'R', to: 1 }],
      hdr: '一举两得：用空指针存前驱后继',
      cap: '左孩子空就让它指中序前驱，右孩子空就让它指中序后继 —— 这种指针叫「线索」',
      stats: { '空指针': '7 个', '改存': '前驱 / 后继',
               '新名字': '线索 thread', '省下': '不必额外开空间' },
      notes: ['lchild 空 → 指向中序前驱',
        'rchild 空 → 指向中序后继',
        '闲着的指针刚好够用，不必新开空间'],
      legend: '绿色虚线就是线索：D 的右线索指 B，E 的左线索指 B、右线索指 A' }), 2,
      '两个毛病凑在一起，反倒有了办法：左孩子空的就让它指中序前驱，右孩子空的就让它指中序后继。' +
      '这样指来指去的指针叫「线索」，加了线索的树就叫线索二叉树 —— 一分额外空间都不用花。',
      ['空 lchild → 前驱', '空 rchild → 后继',
       '这种指针叫线索']));

    steps.push(step(snap({
      ord: NN, showTag: true,
      ltag: (function () { var o = zeros(); o[4] = 1; o[5] = 1; o[6] = 1; return o; })(),
      rtag: (function () { var o = zeros(); o[4] = 1; o[5] = 1; o[6] = 1; o[3] = 1; return o; })(),
      thr: [{ from: 4, side: 'L', to: 0 }, { from: 4, side: 'R', to: 2 },
            { from: 5, side: 'L', to: 2 }, { from: 5, side: 'R', to: 1 },
            { from: 6, side: 'L', to: 1 }, { from: 6, side: 'R', to: 3 },
            { from: 3, side: 'R', to: 0 }],
      hdr: '新问题：怎么分清一个指针是孩子还是线索',
      cap: '加两个标志位：Tag = 0 表示指向孩子，Tag = 1 表示这是线索',
      stats: { 'LTag = 0': 'lchild 指左孩子', 'LTag = 1': 'lchild 是前驱线索',
               'RTag = 0': 'rchild 指右孩子', 'RTag = 1': 'rchild 是后继线索' },
      notes: ['结点两侧的 0 / 1 就是 LTag 与 RTag',
        '一个标志位只占 1 bit，代价极小',
        '结点结构：lchild | LTag | data | RTag | rchild'],
      legend: '至此每个空指针都被用上：7 条线索，其中 D 的左、C 的右指向头结点' }), 3,
      '但指针本身看不出是孩子还是线索，所以要加两个标志位：Tag = 0 说明指的是孩子，' +
      'Tag = 1 说明这是线索。结点结构变成 lchild | LTag | data | RTag | rchild，' +
      '两个 bit 换来 O(1) 找前驱后继。',
      ['LTag / RTag 各 1 bit', '0 → 孩子，1 → 线索',
       '两个 bit 换 O(1)']));

    return steps;
  }

  /* ---------- 场景二：中序线索化 ----------
   * 线索化就是一趟中序遍历：访问到 p 时，用一个全局 pre 记住刚才访问过谁。
   * p 的左空 → 左线索指 pre；pre 的右空 → 右线索指 p。
   * 要紧的是「pre 的右线索必须等 p 出现才能填」—— 后继要往后看一步。 */
  function buildThread() {
    var steps = [];
    var ltag = zeros(), rtag = zeros(), thr = [], st = {};
    var pre = 0, done = 0;

    var snap = function (o) {
      return { st: cp(st), ltag: cp(ltag), rtag: cp(rtag),
               thr: thr.slice(), showTag: true, ord: done,
               hi: o.hi || null,
               hdr: o.hdr || '中序线索化：一趟中序遍历，用 pre 回填',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function (p) {
      return { '当前 p': p ? V[p] : 'NULL', 'pre（刚访问过）': pre ? V[pre] : 'NULL',
               '已线索化': done + ' / ' + NN,
               '已建线索': thr.length + ' 条' };
    };

    steps.push(step(snap({
      cap: '线索化本身就是一趟中序遍历 —— 边遍历边把空指针填上',
      stats: { '做法': '中序遍历 + 全局 pre', 'pre 的含义': '刚访问过的结点',
               '前驱': '当场能填', '后继': '要等下一个出现' },
      notes: ['pre 始终指向中序序列里 p 的前一个',
        'p 左空 → 左线索指 pre，当场就能填',
        'pre 右空 → 右线索指 p，得等 p 出现才填'] }), 0,
      '线索化就是一趟中序遍历，边走边把空指针填上。诀窍是拿一个全局的 pre 记住刚访问过谁：' +
      'p 的左指针空就让它指 pre（前驱当场可得），而 pre 的右指针空只能等 p 出现才填（后继要往后看一步）。',
      ['本质是中序遍历', 'pre 记住前一个结点',
       '后继要等下一个出现']));

    for (var k = 0; k < ORD.length; k++) {
      var p = ORD[k];
      st = {}; st[p] = 'active';
      if (pre) st[pre] = 'good';
      done = k + 1;

      var didL = false, didR = false;
      if (!lch(p)) {
        ltag[p] = 1;
        thr.push({ from: p, side: 'L', to: pre, hot: 1 });
        didL = true;
      }
      if (pre && !rch(pre)) {
        rtag[pre] = 1;
        thr.push({ from: pre, side: 'R', to: p, hot: 1 });
        didR = true;
      }

      var hi = {}; hi[p] = 'hot'; if (pre) hi[pre] = 'active';
      var msg;
      if (didL && didR) {
        msg = 'p = ' + V[p] + ' 左空 → 左线索指前驱 ' + (pre ? V[pre] : '头结点') +
              '；同时 ' + V[pre] + ' 右空 → 右线索指后继 ' + V[p];
      } else if (didL) {
        msg = 'p = ' + V[p] + ' 左空 → 左线索指前驱 ' + (pre ? V[pre] : '头结点') +
              '；' + (pre ? V[pre] + ' 有右孩子，不必线索化' : '它是序列首元素');
      } else if (didR) {
        msg = 'p = ' + V[p] + ' 有左孩子，左边不动；' + V[pre] +
              ' 右空 → 右线索指后继 ' + V[p];
      } else {
        msg = 'p = ' + V[p] + ' 左右都有孩子，' +
              (pre ? V[pre] + ' 的右边也占着 —— 这一步没有空指针可填' : '它是序列首元素');
      }

      steps.push(step(snap({
        cap: msg, hi: hi,
        stats: base(p),
        notes: [(didL ? 'LTag[' + V[p] + '] = 1，指向 ' + (pre ? V[pre] : '头结点')
                      : 'LTag[' + V[p] + '] = 0（有左孩子）'),
          (didR ? 'RTag[' + V[pre] + '] = 1，指向 ' + V[p]
                : (pre ? 'RTag[' + V[pre] + '] = 0（有右孩子）' : 'pre 为空，跳过')),
          'pre 随后前移到 ' + V[p]],
        legend: '已建 ' + thr.length + ' 条线索；结点两侧数字是 LTag / RTag' }),
        didL ? 2 : (didR ? 4 : 6),
        '中序访问到 ' + V[p] + '（序列第 ' + done + ' 个）。' + msg + '。' +
        '处理完这两句，pre 就前移到 ' + V[p] + '，等下一个结点出现时再回来填它的右线索。',
        ['p = ' + V[p] + '，pre = ' + (pre ? V[pre] : 'NULL'),
         didL ? '左线索 → ' + (pre ? V[pre] : '头结点') : '左边是孩子',
         didR ? '右线索 → ' + V[p] : (pre ? '右边是孩子' : '序列首元素')]));

      pre = p;
    }

    // 收尾：最后一个结点的右线索指向头结点
    rtag[pre] = 1;
    thr.push({ from: pre, side: 'R', to: 0, hot: 1 });
    st = {}; st[pre] = 'done';
    steps.push(step(snap({
      hdr: '收尾：最后一个结点的右线索指向头结点',
      cap: '遍历结束时 pre 停在序列末元素 C —— 它没有后继，右线索指向头结点',
      stats: { '线索总数': thr.length, '空指针': 7,
               '首元素 D 的左线索': '头结点', '末元素 C 的右线索': '头结点' },
      notes: ['循环外还要补一句：pre->RTag = 1',
        '首尾两个线索指向头结点，遍历就有了明确的起止',
        '7 个空指针全部用上，一个不剩'],
      legend: '线索化完毕：7 个空指针变成 7 条线索，时间 O(n)、额外空间 O(1)' }), 7,
      '循环结束后还要补一句：pre 此时停在序列末元素 C，它没有后继，右线索指向头结点。' +
      '至此 7 个空指针全部变成线索。整个线索化就是一趟中序遍历，时间 O(n)，额外空间只多两个标志位。',
      ['补 pre->RTag = 1', '7 个空指针全用上',
       '时间 O(n)']));

    return steps;
  }

  /* ---------- 场景三：在线索树上遍历 ----------
   * 两条规则就够：
   *   求后继：RTag==1 直接跟着线索走；RTag==0 就到右子树里找最左下的结点。
   *   起点：从根一路沿 LTag==0 的左指针下去，到最左下的结点。
   * 全程不用栈、不用递归，空间 O(1)。 */
  function buildWalk() {
    var steps = [];
    var LT = zeros(), RT = zeros();
    LT[4] = 1; LT[5] = 1; LT[6] = 1;
    RT[4] = 1; RT[5] = 1; RT[6] = 1; RT[3] = 1;
    var THR = [{ from: 4, side: 'L', to: 0 }, { from: 4, side: 'R', to: 2 },
               { from: 5, side: 'L', to: 2 }, { from: 5, side: 'R', to: 1 },
               { from: 6, side: 'L', to: 1 }, { from: 6, side: 'R', to: 3 },
               { from: 3, side: 'R', to: 0 }];

    var out = [];
    var snap = function (o) {
      var t = [], i;
      for (i = 0; i < THR.length; i++) {
        t.push({ from: THR[i].from, side: THR[i].side, to: THR[i].to,
                 hot: o.hotThr === i ? 1 : 0 });
      }
      return { st: o.st || {}, ltag: LT, rtag: RT, thr: t, showTag: true,
               ord: out.length, hi: o.hi || null,
               hdr: o.hdr || '线索树上的遍历：不用栈、不用递归',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function (p, how) {
      return { '当前 p': p ? V[p] : '头结点', '已输出': out.length + ' / ' + NN,
               '序列': out.join('') || '（空）', '走法': how };
    };

    steps.push(step(snap({
      st: {},
      cap: '有了线索，遍历就只剩两件事：找起点，然后反复求后继',
      stats: { '辅助空间': 'O(1)', '不需要': '栈 / 递归',
               '找后继': 'RTag=1 跟线索走', 'RTag=0 时': '右子树的最左下' },
      notes: ['起点：从根沿 LTag=0 的左指针一路到底',
        '求后继：RTag=1 直接跟线索；RTag=0 找右子树最左下',
        '反复求后继直到回到头结点'] }), 0,
      '线索树上的遍历只剩两件事：找到起点，然后反复求后继。既不用栈也不用递归 —— ' +
      '辅助空间从 O(树高) 降到 O(1)，这是线索化最实在的好处。',
      ['不用栈不用递归', '空间 O(1)',
       '找起点 + 反复求后继']));

    // 找起点：从根一路向左
    var p = 1, chain = [1];
    while (LT[p] === 0 && lch(p)) { p = lch(p); chain.push(p); }
    var stStart = {}, ci;
    for (ci = 0; ci < chain.length; ci++) stStart[chain[ci]] = 'hot';
    stStart[p] = 'active';
    steps.push(step(snap({
      st: stStart,
      cap: '找起点：从根 A 沿 LTag = 0 的左指针一路下去 —— A → B → D，D 的 LTag = 1，到了',
      stats: base(p, '一路向左'),
      notes: ['while (p->LTag == 0) p = p->lchild;',
        'LTag = 1 说明左边是线索，不是孩子 —— 已到最左下',
        '最左下的结点正是中序序列的第一个'] }), 1,
      '先找起点：从根 A 沿着左指针往下，只要 LTag = 0 就说明那还是真孩子，继续走。' +
      'A → B → D，到 D 时 LTag = 1，左边已经是线索了，说明 D 就是最左下的结点 —— 中序序列的第一个。',
      ['沿 LTag=0 向左到底', 'A → B → D',
       'D 是中序首元素']));

    var guard = 0;
    while (p && guard++ < 20) {
      out.push(V[p]);
      var stv = {}; stv[p] = 'done';
      var hiv = {}; hiv[p] = 'hot';
      steps.push(step(snap({
        st: stv, hi: hiv,
        cap: '访问 ' + V[p] + '：序列第 ' + out.length + ' 个',
        stats: base(p, '访问'),
        notes: ['visit(' + V[p] + ')',
          '序列：' + out.join(' '),
          '接着求它的后继'] }), 2,
        '访问 ' + V[p] + '，它是序列的第 ' + out.length + ' 个。接下来求它的后继 —— ' +
        '看 RTag 就知道该走哪条路。',
        ['visit(' + V[p] + ')', '第 ' + out.length + ' 个',
         '下面求后继']));

      if (RT[p] === 1) {
        // 跟着右线索走
        var ti = -1, q2;
        for (q2 = 0; q2 < THR.length; q2++) {
          if (THR[q2].from === p && THR[q2].side === 'R') ti = q2;
        }
        var nx = ti >= 0 ? THR[ti].to : 0;
        var stt = {}; stt[p] = 'good'; if (nx) stt[nx] = 'active';
        steps.push(step(snap({
          st: stt, hotThr: ti,
          cap: V[p] + ' 的 RTag = 1：右边就是后继线索，一步跟过去 → ' +
               (nx ? V[nx] : '头结点，遍历结束'),
          stats: base(nx, 'RTag=1，跟线索'),
          notes: ['RTag = 1 → p = p->rchild 直接就是后继',
            '这一步是 O(1)，线索化省下的就是这个',
            nx ? '后继是 ' + V[nx] : '回到头结点，遍历结束'] }), 3,
          V[p] + ' 的 RTag = 1，说明右指针存的是后继线索，一步跟过去就到 ' +
          (nx ? V[nx] : '头结点') + '。' +
          (nx ? '这一步只花 O(1)，换成普通二叉链表就得从根重新遍历。'
              : '回到头结点，说明序列走完了 —— 这就是循环的终止条件。'),
          ['RTag = 1', '跟线索 → ' + (nx ? V[nx] : '头结点'),
           nx ? 'O(1) 到位' : '遍历结束']));
        p = nx;
      } else {
        // 转右子树，再一路向左到最左下
        var r = rch(p), ch2 = [r], w = r;
        while (LT[w] === 0 && lch(w)) { w = lch(w); ch2.push(w); }
        var st3 = {}, cj;
        st3[p] = 'good';
        for (cj = 0; cj < ch2.length; cj++) st3[ch2[cj]] = 'hot';
        st3[w] = 'active';
        steps.push(step(snap({
          st: st3,
          cap: V[p] + ' 的 RTag = 0：右边是真孩子 ' + V[r] +
               '，进去再一路向左到最左下 → ' + V[w],
          stats: base(w, 'RTag=0，右子树最左下'),
          notes: ['RTag = 0 → p = p->rchild，进入右子树',
            '再 while (p->LTag == 0) p = p->lchild',
            '中序里根的后继是右子树最左下的结点'] }), 4,
          V[p] + ' 的 RTag = 0，右边是真孩子 ' + V[r] +
          '。中序序列里一个结点的后继是它右子树中最左下的那个，所以进去之后再沿 LTag = 0 向左到底，得到 ' +
          V[w] + '。这一段最多走树高步。',
          ['RTag = 0，进右子树', '再向左到底 → ' + V[w],
           '中序后继 = 右子树最左下']));
        p = w;
      }
    }

    steps.push(step(snap({
      st: {},
      hdr: '遍历完成：' + out.join(' '),
      cap: '整趟只用了 p 一个指针 —— 空间 O(1)，时间仍是 O(n)',
      stats: { '序列': out.join(''), '时间': 'O(n)',
               '空间': 'O(1)', '对比递归': '省掉 O(树高) 的栈' },
      notes: ['与递归中序结果完全一致',
        '省掉了递归栈，适合空间紧张或需要频繁求前驱后继的场合',
        '代价：每结点两个标志位，且插入删除时要维护线索'],
      legend: '线索化的取舍：省下栈空间、前驱后继 O(1)，代价是插删要多维护线索' }), -1,
      '遍历完成，序列 ' + out.join(' ') + '，与递归中序一字不差，但全程只用了 p 一个指针。' +
      '代价是每结点多两个标志位，而且插入删除结点时必须顺手把相关线索改对 —— 这是它不常用于动态树的原因。',
      ['序列 ' + out.join(''), '空间 O(1)',
       '代价：插删要维护线索']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['threaded-binary-tree'] = {
    title: '线索二叉树 Threaded Binary Tree',
    subtitle: '二叉链表有 n+1 个指针域闲着，而遍历序列的前驱后继又求不出来 —— ' +
      '线索二叉树拿空指针去存前驱后继，代价是每个结点多两个标志位，换来 O(1) 求后继、O(1) 空间遍历。',
    height: 700,
    code: [
      'typedef struct BiThrNode {',
      '    ElemType data;',
      '    struct BiThrNode *lchild, *rchild;',
      '    int LTag, RTag;      // 0 → 指向孩子；1 → 指向线索',
      '} BiThrNode, *BiThrTree;',
      '// 空指针 n+1 个，恰好够存 n+1 条前驱/后继线索'
    ],
    scenes: [
      { name: '为什么要线索', build: buildWhy,
        codeTag: '空指针与标志位',
        code: [
          '// 毛病一：n 个结点的二叉链表有 2n 个指针域',
          '//         而树只有 n-1 条分支 → 空指针 n+1 个',
          '// 毛病二：中序前驱/后继在链表里没存，求一次要 O(n)',
          '// 办法：lchild 空 → 指中序前驱；rchild 空 → 指中序后继',
          '// 新问题：指针看不出是孩子还是线索 → 加标志位',
          'lchild | LTag | data | RTag | rchild',
          '// LTag = 0 孩子，1 线索；RTag 同理，各占 1 bit'
        ] },
      { name: '中序线索化', build: buildThread,
        codeTag: '一趟中序遍历 + 全局 pre',
        code: [
          'void InThreading(BiThrTree p) {',
          '    if (!p) return;',
          '    InThreading(p->lchild);            // 左',
          '    if (!p->lchild) { p->LTag = 1; p->lchild = pre; }   // 前驱',
          '    if (pre && !pre->rchild)',
          '        { pre->RTag = 1; pre->rchild = p; }             // 后继',
          '    pre = p;                           // pre 前移',
          '    InThreading(p->rchild);            // 右',
          '}   // 循环外补：pre->RTag = 1, pre->rchild = 头结点'
        ] },
      { name: '线索树上遍历', build: buildWalk,
        codeTag: '找起点 + 反复求后继',
        code: [
          'void InOrderThr(BiThrTree T) {',
          '    p = T;',
          '    while (p->LTag == 0) p = p->lchild;    // 找最左下',
          '    while (p) {',
          '        visit(p);',
          '        if (p->RTag == 1) p = p->rchild;   // 跟线索，O(1)',
          '        else { p = p->rchild;              // 右子树最左下',
          '               while (p->LTag == 0) p = p->lchild; }',
          '    }',
          '}   // 不用栈、不用递归，辅助空间 O(1)'
        ] }
    ]
  };
})();
