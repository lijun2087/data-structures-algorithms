/* 层次遍历 — 第6章
 * 前三种遍历靠栈（递归栈也是栈），层次遍历靠队列 —— 这是两类遍历的分水岭。
 * 场景一：队列驱动的层次遍历，出队即访问、孩子随即入队。
 * 场景二：怎么按层分组（记住每轮开始时的队长），以及顺带求树的宽度与高度。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /*           A
   *        /     \
   *       B       C
   *      / \       \
   *     D   E       G
   *        /
   *       H
   * 下标按完全二叉树编号，H 在 10 号位。3 层宽度为 3，第 4 层只有 H。 */
  var V = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 7: 'G', 10: 'H' };
  var IDS = [1, 2, 3, 4, 5, 7, 10];
  var NN = IDS.length;

  function has(i) { return V[i] !== undefined; }
  function lch(i) { return has(i * 2) ? i * 2 : 0; }
  function rch(i) { return has(i * 2 + 1) ? i * 2 + 1 : 0; }

  /* 布局：树在左 x∈[70,438]，队列在右上，序列在右下。
   * 竖直：标题 104 / 说明 126 / 树 152…284 / 队列 168…200 / 序列 244…276 */
  var X0 = 30, SPAN = 450, Y0 = 152, DY = 44, R = 15;
  var QX = 520, QW = 40, QG = 5, QY = 168, QH = 32;   // 队列
  var OX = 520, OW = 40, OG = 5, OY = 250, OH = 32;   // 访问序列

  function levelOf(i) {
    var L = 1, f = 1;
    while (f * 2 <= i) { f *= 2; L++; }
    return L;
  }
  function xOf(i) {
    var L = levelOf(i), k = 1, f = 1, q;
    for (q = 1; q < L; q++) { k *= 2; f *= 2; }
    return X0 + SPAN * (i - f + 0.5) / k;
  }
  function yOf(i) { return Y0 + (levelOf(i) - 1) * DY; }

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  function row(g, opt) {
    g.appendChild(D.text(opt.title,
      { x: opt.x, y: opt.y - 11, 'class': 'vz-tag', fill: '#9fb4dc',
        'text-anchor': 'start' }));
    var i, x, c, cap = opt.cap || 7;
    for (i = 0; i < cap; i++) {
      x = opt.x + i * (opt.w + opt.g);
      var on = i < opt.items.length;
      c = D.C[on ? opt.state : 'mute'];
      g.appendChild(D.el('rect', { x: x, y: opt.y, width: opt.w,
        height: opt.h, rx: 5, fill: c.fill, stroke: c.stroke,
        'stroke-width': on && i === opt.hot ? 2.6 : 1.5 }));
      if (on) {
        g.appendChild(D.text(opt.items[i],
          { x: x + opt.w / 2, y: opt.y + 22, 'class': 'vz-cellval' }));
      }
    }
    if (opt.items.length > cap) {
      g.appendChild(D.text('…还有 ' + (opt.items.length - cap) + ' 个',
        { x: opt.x + cap * (opt.w + opt.g) + 6, y: opt.y + 21,
          'class': 'vz-idx', 'text-anchor': 'start' }));
    }
  }

  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, j;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 126, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    // 分层的横向底纹：让「按层推进」这件事一眼看出来
    if (f.zones) {
      for (i = 1; i <= 4; i++) {
        D.zone(ctx.stage, { x: 36, y: Y0 + (i - 1) * DY - 20, w: 438, h: 40,
          rx: 8, color: i === f.litLevel ? '#ffd166' : '#4a5c82',
          opacity: i === f.litLevel ? 0.13 : 0.05 });
      }
    }

    for (j = 0; j < NN; j++) {
      i = IDS[j];
      if (i === 1) continue;
      D.link(ctx.stage, { x1: xOf(i >> 1), y1: yOf(i >> 1) + R,
        x2: xOf(i), y2: yOf(i) - R - 2, kind: 'next', arrow: false });
    }
    for (j = 0; j < NN; j++) {
      i = IDS[j];
      D.circleNode(ctx.stage, { x: xOf(i), y: yOf(i), r: R,
        state: f.st[i] || 'idle', value: V[i] });
    }

    row(ctx.stage, { title: f.qTitle || '队列 Q（左端出队，右端入队）',
      items: f.q, x: QX, y: QY, w: QW, g: QG, h: QH,
      state: 'active', hot: f.qHot === undefined ? -1 : f.qHot, cap: 7 });
    row(ctx.stage, { title: '访问序列', items: f.out, x: OX, y: OY,
      w: OW, g: OG, h: OH, state: 'done',
      hot: f.out.length - 1, cap: 7 });

    // 备注排在两排格子下方，最多两条（第三条就要压到旁白了）
    for (j = 0; j < f.notes.length && j < 2; j++) {
      ctx.stage.appendChild(D.text(f.notes[j],
        { x: 520, y: 304 + j * 20, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---------- 场景一：队列驱动的层次遍历 ---------- */
  function buildBFS() {
    var steps = [];
    var out = [], st = {}, q = [];

    var snap = function (o) {
      return { st: cp(st), q: q.slice(), out: out.slice(),
               qHot: o.qHot === undefined ? -1 : o.qHot,
               zones: false, litLevel: 0,
               hdr: o.hdr || '层次遍历：自上而下、每层自左至右',
               cap: o.cap || null, qTitle: o.qTitle || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '队内': q.length + ' 个', '已访问': out.length + ' / ' + NN,
               '序列': out.join('') || '（空）',
               '队列内容': q.join(' ') || '（空）' };
    };

    steps.push(step(snap({
      cap: '前三种遍历用栈（递归栈也是栈），层次遍历用队列 —— 这是两类遍历的分水岭',
      stats: { '辅助结构': '队列', '访问顺序': '按层，从左到右',
               '结点数': NN, '时间': 'O(n)' },
      notes: ['栈是后进先出：越深的先处理 → 纵向深入',
        '队是先进先出：越早入队的先处理 → 横向铺开'] }), 0,
      '先序中序后序都靠栈，层次遍历靠队列 —— 这是两类遍历真正的分水岭。' +
      '栈后进先出，谁最深就先处理它，所以纵向深入；队先进先出，谁先入队就先处理，所以横向铺开。',
      ['前三种用栈', '层次遍历用队列',
       'FIFO 决定了横向铺开']));

    q.push('A'); st[1] = 'active';
    steps.push(step(snap({
      cap: '根 A 先入队 —— 队列非空就是循环继续的条件',
      qHot: 0, stats: base(),
      notes: ['EnQueue(Q, T)：根入队',
        'while (队非空) 循环处理'] }), 1,
      '先把根 A 入队。之后的循环条件就是「队列非空」：只要队里还有结点，' +
      '就取一个出来访问，再把它的孩子接到队尾。',
      ['EnQueue(A)', '循环条件：队非空',
       '队内 1 个']));

    while (q.length) {
      var t = q.shift(), id = 0, k;
      for (k = 0; k < NN; k++) if (V[IDS[k]] === t) id = IDS[k];
      out.push(t);
      st[id] = 'done';
      var lc = lch(id), rc = rch(id);
      steps.push(step(snap({
        cap: '出队 ' + t + ' 并访问 —— 出队的顺序就是层次遍历的顺序',
        stats: base(),
        notes: ['DeQueue(Q, p) → ' + t + '，visit(' + t + ')',
          '序列：' + out.join(' ')] }), 2,
        '出队 ' + t + ' 并立刻访问。层次遍历里「出队」和「访问」是同一件事 —— ' +
        '因为队列保证了先入队的先出队，而入队顺序正是按层从左到右的。',
        ['DeQueue → ' + t, 'visit(' + t + ')',
         '第 ' + out.length + ' 个输出']));

      if (lc) {
        q.push(V[lc]); st[lc] = 'hot';
        steps.push(step(snap({
          cap: t + ' 的左孩子 ' + V[lc] + ' 入队，排在队尾等着',
          qHot: q.length - 1, stats: base(),
          notes: ['左孩子非空 → EnQueue(' + V[lc] + ')',
            '它要等本层剩下的都访问完才轮到'] }), 3,
          t + ' 的左孩子 ' + V[lc] + ' 入队，排到队尾。它属于下一层，' +
          '而队尾意味着要等本层剩下的结点全访问完才轮到它 —— 层与层的先后就是这样保证的。',
          ['EnQueue(' + V[lc] + ')', '排在队尾',
           '队内 ' + q.length + ' 个']));
      }
      if (rc) {
        q.push(V[rc]); st[rc] = 'hot';
        steps.push(step(snap({
          cap: t + ' 的右孩子 ' + V[rc] + ' 入队 —— 先左后右，同层的左右次序就定下来了',
          qHot: q.length - 1, stats: base(),
          notes: ['右孩子非空 → EnQueue(' + V[rc] + ')',
            '先压左再压右，所以同层从左到右'] }), 4,
          t + ' 的右孩子 ' + V[rc] + ' 入队。注意入队一定是先左后右 —— ' +
          '正因为如此，同一层的结点在队里就是从左到右排列的，出队顺序自然也是从左到右。',
          ['EnQueue(' + V[rc] + ')', '先左后右入队',
           '队内 ' + q.length + ' 个']));
      }
      if (!lc && !rc) {
        steps.push(step(snap({
          cap: t + ' 是叶子，没有孩子可入队 —— 队列就此少一个',
          stats: base(),
          notes: ['左右孩子都为空，不入队',
            q.length ? '队里还有 ' + q.length + ' 个' : '队空了，循环即将结束'] }), 5,
          t + ' 是叶子，没有孩子要入队，队列净少一个。' +
          (q.length ? '队里还剩 ' + q.length + ' 个，循环继续。'
                    : '队列空了，循环结束 —— 每个结点恰好入队出队一次。'),
          [t + ' 是叶子', '无孩子入队',
           '队内 ' + q.length + ' 个']));
      }
    }

    steps.push(step(snap({
      hdr: '层次遍历完成：' + out.join(' '),
      cap: '每个结点恰好入队、出队一次 —— 时间 O(n)，队列最大长度是树的最大宽度',
      stats: { '序列': out.join(''), '时间': 'O(n)',
               '空间': 'O(最大宽度)', '辅助结构': '队列' },
      notes: ['入队出队各 n 次，时间 O(n)',
        '空间取决于最宽那一层，不是树高'] }), -1,
      '层次遍历完成：' + out.join(' ') + '。每个结点入队出队各一次，时间 O(n)。' +
      '空间上和前三种不同 —— 栈的深度取决于树高，队列的长度取决于最宽那一层。',
      ['序列 ' + out.join(''), '时间 O(n)',
       '空间 O(最大宽度)']));

    return steps;
  }

  /* ---------- 场景二：按层分组，顺带求宽度与高度 ----------
   * 关键一招：每轮循环开始时先记住队列当前长度 sz，
   * 那 sz 个就恰好是同一层的全部结点 —— 后面入队的属于下一层，不会混进来。 */
  function buildByLevel() {
    var steps = [];
    var out = [], st = {}, q = [];
    var level = 0, width = 0, wideLevel = 0;

    var snap = function (o) {
      return { st: cp(st), q: q.slice(), out: out.slice(),
               qHot: o.qHot === undefined ? -1 : o.qHot,
               zones: true, litLevel: o.litLevel || 0,
               hdr: o.hdr || '按层分组：记住每轮开始时的队长',
               cap: o.cap || null,
               qTitle: o.qTitle || '队列 Q　（本层 ' + (o.sz || 0) + ' 个）',
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '当前层': level, '本层结点': q.length + ' 个待出',
               '最大宽度': width + '（第 ' + wideLevel + ' 层）',
               '已访问': out.length + ' / ' + NN };
    };

    steps.push(step(snap({
      cap: '难点在于「怎么知道一层结束了」—— 队列里前后两层是混在一起的',
      stats: { '问题': '如何切分层', '办法': '循环开始先记 sz = 队长',
               '那 sz 个': '恰好是同一层', '顺带得到': '宽度与高度' },
      notes: ['队列里可能同时有第 k 层和第 k+1 层的结点',
        '但循环开始那一刻，队里恰好只有第 k 层的'] }), 0,
      '光有队列还不够：出队时队里可能同时躺着两层的结点，分不出层界。' +
      '办法很巧 —— 每轮循环一开始先记下队列长度 sz，那一刻队里恰好只有本层的结点，' +
      '接下来连着出 sz 个就是一整层。',
      ['队里前后两层会混', '循环开始先记 sz = 队长',
       '连出 sz 个即一层']));

    q.push('A'); st[1] = 'active';
    while (q.length) {
      var sz = q.length;
      level++;
      if (sz > width) { width = sz; wideLevel = level; }
      steps.push(step(snap({
        sz: sz, litLevel: level,
        cap: '第 ' + level + ' 层开始：此刻队长 sz = ' + sz +
             '，这 ' + sz + ' 个就是本层全部结点',
        stats: base(),
        notes: ['sz = QueueLength(Q) = ' + sz,
          '本层 ' + sz + ' 个，最大宽度暂为 ' + width] }), 2,
        '第 ' + level + ' 层开始。此刻队长 sz = ' + sz + '，这 ' + sz +
        ' 个正是本层的全部结点 —— 后面入队的孩子都属于第 ' + (level + 1) +
        ' 层，不会混进本轮。层数每进一轮加一，所以循环轮数就是树的高度。',
        ['第 ' + level + ' 层，sz = ' + sz, '本层结点已框定',
         '最大宽度 ' + width]));

      var got = [];
      for (var c = 0; c < sz; c++) {
        var t = q.shift(), id = 0, k;
        for (k = 0; k < NN; k++) if (V[IDS[k]] === t) id = IDS[k];
        out.push(t); got.push(t); st[id] = 'done';
        var lc = lch(id), rc = rch(id);
        if (lc) { q.push(V[lc]); st[lc] = 'hot'; }
        if (rc) { q.push(V[rc]); st[rc] = 'hot'; }
      }
      steps.push(step(snap({
        sz: q.length, litLevel: level,
        cap: '第 ' + level + ' 层出完：' + got.join(' ') +
             '　同时它们的孩子已全部入队（' + q.length + ' 个）',
        stats: base(),
        notes: ['本层序列：' + got.join(' '),
          q.length ? '队里剩下的 ' + q.length + ' 个全属第 ' + (level + 1) + ' 层'
                   : '队空 —— 没有下一层了'] }), 4,
        '连出 ' + sz + ' 个，第 ' + level + ' 层是 ' + got.join(' ') +
        '。它们的孩子已经全进了队尾，' +
        (q.length ? '此刻队里的 ' + q.length + ' 个全属第 ' + (level + 1) +
                    ' 层，下一轮的 sz 就是它。'
                  : '队列空了，说明这是最后一层。'),
        ['本层：' + got.join(''),
         q.length ? '下一层 ' + q.length + ' 个' : '队空，遍历结束',
         '层数 ' + level]));
    }

    steps.push(step(snap({
      litLevel: 0,
      hdr: '一趟层次遍历，三样东西一起拿到',
      cap: '序列 ' + out.join(' ') + '　高度 = 循环轮数 = ' + level +
           '　宽度 = 各轮 sz 的最大值 = ' + width,
      stats: { '序列': out.join(''), '树的高度': level,
               '最大宽度': width, '时间': 'O(n)' },
      notes: ['高度：循环执行了几轮就是几层',
        '宽度：各轮 sz 取最大，本例第 ' + wideLevel + ' 层最宽'] }), -1,
      '一趟层次遍历同时拿到三样东西：访问序列、树的高度（循环轮数 ' + level +
      '）、最大宽度（各轮 sz 的最大值 ' + width + '，出现在第 ' + wideLevel +
      ' 层）。判断完全二叉树、按层打印、求每层最值，都是这个套路。',
      ['高度 = ' + level + ' 轮', '宽度 = ' + width,
       '一趟遍历全拿到']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['level-order-traversal'] = {
    title: '层次遍历 Level Order',
    subtitle: '前三种遍历靠栈，层次遍历靠队列：出队即访问，孩子随即入队。队列的先进先出保证了自上而下、每层自左至右。',
    height: 700,
    code: [
      'void LevelOrder(BiTree T) {',
      '    if (!T) return;  InitQueue(Q);',
      '    EnQueue(Q, T);                    // 根先入队',
      '    while (!QueueEmpty(Q)) {',
      '        DeQueue(Q, p);  visit(p);      // 出队即访问',
      '        if (p->lchild) EnQueue(Q, p->lchild);   // 先左',
      '        if (p->rchild) EnQueue(Q, p->rchild);   // 后右',
      '    }',
      '}'
    ],
    scenes: [
      { name: '队列驱动', build: buildBFS,
        codeTag: '出队即访问，孩子入队',
        code: [
          'void LevelOrder(BiTree T) {',
          '    if (!T) return;  InitQueue(Q);',
          '    EnQueue(Q, T);                 // 根先入队',
          '    while (!QueueEmpty(Q)) {',
          '        DeQueue(Q, p);  visit(p);   // 出队即访问',
          '        if (p->lchild) EnQueue(Q, p->lchild);',
          '        if (p->rchild) EnQueue(Q, p->rchild);',
          '        // 叶子不入队，队列净减一',
          '    }',
          '}'
        ] },
      { name: '按层分组', build: buildByLevel,
        codeTag: '记住每轮的 sz',
        code: [
          'while (!QueueEmpty(Q)) {',
          '    sz = QueueLength(Q);       // ← 关键：此刻队里全是本层',
          '    level++;',
          '    if (sz > width) width = sz;    // 顺带求最大宽度',
          '    for (c = 0; c < sz; c++) {     // 连出 sz 个 = 一整层',
          '        DeQueue(Q, p);  visit(p);',
          '        if (p->lchild) EnQueue(Q, p->lchild);',
          '        if (p->rchild) EnQueue(Q, p->rchild);',
          '    }',
          '}   // 循环轮数 level 就是树的高度'
        ] }
    ]
  };
})();
