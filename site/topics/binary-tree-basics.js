/* 二叉树的性质与存储 — 第6章
 * 场景一：五种基本形态 —— 空、仅根、仅左、仅右、左右都有；二叉树严格区分左右。
 * 场景二：三条基本性质 —— 第 i 层最多 2^(i-1) 个、深度 k 最多 2^k-1 个、n0 = n2 + 1。
 * 场景三：完全二叉树的编号 —— 双亲 ⌊i/2⌋、左孩子 2i、右孩子 2i+1。
 * 场景四：两种存储 —— 顺序存储在单支树上浪费得有多厉害，二叉链表怎么省。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* ---------- 场景一：五种基本形态 ----------
   * 五个形态横排，中心 x 见 FX；每个形态占 176 宽，最左 110-85=25、
   * 最右 814+85=899，都在舞台 [24,976] 之内。
   * 竖直：标题 108 / 说明 132 / 形态名 164 / 根 196 / 子树三角 234…282。 */
  var FX = [110, 286, 462, 638, 814];
  var FR = 18;

  var FORMS = [
    { name: '① 空树', root: false },
    { name: '② 只有根结点', root: true },
    { name: '③ 根 + 左子树', root: true, left: true },
    { name: '④ 根 + 右子树', root: true, right: true },
    { name: '⑤ 左右子树都有', root: true, left: true, right: true }
  ];

  // 子树画成三角形，和书上的画法一致：它代表一整棵子树，不是单个结点
  function subtree(g, cx, dir, on, tag) {
    var tx = cx + dir * 42;
    D.link(g, { x1: cx + dir * 12, y1: 212, x2: tx, y2: 230,
      kind: on ? 'next' : 'mute' });
    g.appendChild(D.el('path', {
      d: 'M ' + tx + ' 234 L ' + (tx - 28) + ' 282 L ' + (tx + 28) + ' 282 Z',
      fill: on ? '#123a5c' : '#1a2338',
      stroke: on ? '#4aa3e0' : '#2b3a5c', 'stroke-width': 2 }));
    g.appendChild(D.text(tag, { x: tx, y: 274, 'class': 'vz-cellval',
      fill: on ? '#eef3ff' : '#4a5c82' }));
  }

  function drawForm(g, cx, form, on) {
    g.appendChild(D.text(form.name,
      { x: cx, y: 164, 'class': 'vz-tag',
        fill: on ? '#6ceaa5' : '#4a5c82' }));
    if (!form.root) {
      g.appendChild(D.el('rect', { x: cx - 32, y: 174, width: 64, height: 44,
        rx: 8, fill: 'none', stroke: on ? '#4aa3e0' : '#2b3a5c',
        'stroke-width': 2, 'stroke-dasharray': '5 4' }));
      g.appendChild(D.text('∅', { x: cx, y: 203, 'class': 'vz-cellval',
        fill: on ? '#eef3ff' : '#4a5c82' }));
      return;
    }
    D.circleNode(g, { x: cx, y: 196, r: FR,
      state: on ? 'good' : 'mute', value: 'A' });
    if (form.left) subtree(g, cx, -1, on, '左');
    if (form.right) subtree(g, cx, 1, on, '右');
  }

  function renderForms(ctx, f) {
    D.clear(ctx.stage);
    ctx.stage.appendChild(D.text(f.hdr || '二叉树的五种基本形态',
      { x: 44, y: 108, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 132, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    for (var i = 0; i < FORMS.length; i++) {
      drawForm(ctx.stage, FX[i], FORMS[i], i < f.upto);
    }
    if (f.tip) {
      ctx.stage.appendChild(D.text(f.tip,
        { x: 462, y: 312, 'class': 'vz-info', fill: '#b9c8e6',
          'text-anchor': 'middle' }));
    }
    ctx.stats = f.stats || {};
  }

  function stepF(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { renderForms(c, f); } };
  }

  function buildForms() {
    var steps = [];
    var snap = function (upto, o) {
      return { upto: upto, hdr: o.hdr || null, cap: o.cap || null,
               tip: o.tip || null, stats: o.stats || {} };
    };

    steps.push(stepF(snap(0, {
      cap: '二叉树的定义是递归的：要么空，要么「根 + 左子树 + 右子树」',
      tip: '两棵子树互不相交，而且本身也都是二叉树',
      stats: { '定义方式': '递归', '子树棵数': '至多 2',
               '左右': '严格区分', '基本形态': '5 种' } }), 0,
      '二叉树的定义是递归的：或者是空树，或者由一个根结点加两棵互不相交的子树组成，' +
      '而这两棵子树本身也都是二叉树。每个结点最多两个孩子，且必须分清左右。',
      ['或为空树', '或为「根 + 左子树 + 右子树」', '子树本身也是二叉树']));

    var caps = [
      '① 空树：一个结点也没有，n = 0 —— 它也算一棵合法的二叉树',
      '② 只有根结点：左右子树都空，这是最小的非空二叉树',
      '③ 根 + 左子树：右子树为空',
      '④ 根 + 右子树：左子树为空 —— 注意它和 ③ 是两棵不同的树',
      '⑤ 左右子树都有：这才是「满打满算」的两个分支'
    ];
    var tips = [
      '空树不是「没有树」，而是结点数为 0 的那棵树',
      '深度 1，结点数 1，是递归的终止情形',
      '左右子树都是二叉树，可以继续往下递归',
      '③ 与 ④ 形状不同 —— 二叉树的左右是有序的，不能互换',
      '五种形态穷尽了所有可能：0 棵、1 棵（左/右）、2 棵子树'
    ];
    var narrs = [
      '第一种形态是空树。它容易被忽略，但按定义空树确实是二叉树，而且是递归定义的终止情形 —— ' +
        '后面写遍历、求深度这些递归函数，第一句判的都是「树空吗」。',
      '第二种是只有一个根结点，左右子树都为空。深度 1、结点数 1，这是最小的非空二叉树。',
      '第三种是根加一棵左子树，右子树为空。这里的左子树画成三角形，表示它是一整棵子树，' +
        '里面可以有任意多个结点。',
      '第四种是根加一棵右子树。要紧的是它和第三种是两棵不同的树 —— 二叉树严格区分左右，' +
        '这一点和「树」不同：树的孩子之间没有次序，二叉树的左右孩子不能互换。',
      '第五种是左右子树都存在。至此五种形态穷尽了所有可能：子树 0 棵、1 棵（在左或在右）、2 棵。' +
        '注意「至多两棵子树」和「左右有序」是二叉树的两条硬性规定。'
    ];
    var acts = [
      ['形态 ①：空树', 'n = 0', '递归定义的终止情形'],
      ['形态 ②：只有根', '深度 1，结点数 1', '左右子树皆空'],
      ['形态 ③：只有左子树', '右子树为空', '三角形代表一整棵子树'],
      ['形态 ④：只有右子树', '与 ③ 是不同的树', '二叉树左右有序'],
      ['形态 ⑤：左右都有', '子树棵数至多 2', '五种形态已穷尽']
    ];

    for (var i = 0; i < 5; i++) {
      steps.push(stepF(snap(i + 1, {
        cap: caps[i], tip: tips[i],
        stats: { '当前形态': i + 1, '已列出': (i + 1) + ' / 5',
                 '子树棵数': i === 0 ? '—' : (i === 4 ? 2 : (i === 1 ? 0 : 1)),
                 '左右有序': '是' } }), i === 0 ? 1 : 2,
        narrs[i], acts[i]));
    }

    steps.push(stepF(snap(5, {
      hdr: '与「树」的区别：二叉树的左右不能互换',
      cap: '树的孩子无次序，二叉树的左右孩子有次序 —— 形态 ③ 与 ④ 就是证据',
      tip: '所以二叉树不是「度不超过 2 的树」，它是一种独立定义的结构',
      stats: { '树': '孩子无序', '二叉树': '左右有序',
               '③ 与 ④': '不同的树', '结论': '两种不同结构' } }), 3,
      '最后强调一句：二叉树并不是「每个结点度都不超过 2 的树」。差别就在形态 ③ 和 ④ —— ' +
      '在树里它们是同一棵，在二叉树里是两棵。二叉树的左右孩子有固定次序，缺一个也要占位。',
      ['二叉树 ≠ 度 ≤ 2 的树', '左右孩子有固定次序', '缺一边也要占位']));

    return steps;
  }

  /* ---------- 场景二：三条基本性质 ----------
   * 结点按完全二叉树编号（1 起）摆位：第 L 层有 2^(L-1) 个槽位，
   * 横向把 span=448 等分，纵向每层 50。深度 4 时最下层 8 个结点，
   * x 落在 [324, 716]，y 落在 [132, 282]，都在舞台内。 */
  var TX0 = 296, TSPAN = 448, TY0 = 132, TDY = 50, TR = 16;

  // 不用 Math.log 求层号：逐层数过去，整数运算不会有浮点误差
  function levelOf(i) {
    var L = 1, first = 1;
    while (first * 2 <= i) { first *= 2; L++; }
    return L;
  }
  function txOf(i) {
    var L = levelOf(i), k = 1, f = 1, q;
    for (q = 1; q < L; q++) { k *= 2; f *= 2; }
    return TX0 + TSPAN * (i - f + 0.5) / k;
  }
  function tyOf(i) { return TY0 + (levelOf(i) - 1) * TDY; }

  function renderProp(ctx, f) {
    D.clear(ctx.stage);
    var i, id, has = {}, L;
    for (i = 0; i < f.nodes.length; i++) has[f.nodes[i]] = 1;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 126, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    // 层号与每层的容量标在左侧，容量正是性质一要说的 2^(i-1)
    for (L = 1; L <= (f.depth || 4); L++) {
      ctx.stage.appendChild(D.text('第 ' + L + ' 层',
        { x: 78, y: tyOf(Math.pow(2, L - 1)) + 4, 'class': 'vz-lab',
          fill: L <= (f.litLevel || 0) ? '#ffd166' : '#5f739b',
          'text-anchor': 'middle' }));
      if (f.showCap) {
        ctx.stage.appendChild(D.text('至多 2^' + (L - 1) + ' = ' +
          Math.pow(2, L - 1) + ' 个',
          { x: 176, y: tyOf(Math.pow(2, L - 1)) + 4, 'class': 'vz-info',
            fill: L <= (f.litLevel || 0) ? '#ffd166' : '#5f739b',
            'text-anchor': 'middle' }));
      }
    }

    // 先画连线，再画结点，结点才不会被线压住
    for (i = 2; i <= f.maxIdx; i++) {
      if (!has[i] || !has[i >> 1]) continue;
      D.link(ctx.stage, { x1: txOf(i >> 1), y1: tyOf(i >> 1) + TR,
        x2: txOf(i), y2: tyOf(i) - TR - 2, kind: 'next', arrow: false });
    }
    for (i = 1; i <= f.maxIdx; i++) {
      if (!has[i]) continue;
      D.circleNode(ctx.stage, { x: txOf(i), y: tyOf(i), r: TR,
        state: (f.st && f.st[i]) || 'idle',
        value: f.labels ? f.labels[i] : i });
    }

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: 756, y: 138 + i * 26, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function stepP(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { renderProp(c, f); } };
  }

  function seq(a, b) { var r = [], i; for (i = a; i <= b; i++) r.push(i); return r; }

  function buildProp() {
    var steps = [];
    var snap = function (o) {
      return { nodes: o.nodes, maxIdx: o.maxIdx, depth: o.depth || 4,
               st: o.st || {}, labels: o.labels || null,
               showCap: !!o.showCap, litLevel: o.litLevel || 0,
               hdr: o.hdr, cap: o.cap || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    /* 性质一：第 i 层至多 2^(i-1) 个结点 —— 逐层点亮满二叉树 */
    var full = seq(1, 15), L;
    for (L = 1; L <= 4; L++) {
      var st = {}, i;
      for (i = Math.pow(2, L - 1); i < Math.pow(2, L); i++) st[i] = 'hot';
      for (i = 1; i < Math.pow(2, L - 1); i++) st[i] = 'done';
      steps.push(stepP(snap({
        nodes: full, maxIdx: 15, st: st, showCap: true, litLevel: L,
        hdr: '性质一：第 i 层至多 2^(i-1) 个结点',
        cap: '第 ' + L + ' 层最多 2^' + (L - 1) + ' = ' + Math.pow(2, L - 1) +
             ' 个 —— 上一层每个结点最多分出两个孩子，所以逐层翻倍',
        stats: { '当前层 i': L, '本层上限': Math.pow(2, L - 1),
                 '累计上限': Math.pow(2, L) - 1, '规律': '逐层翻倍' },
        notes: ['第 1 层只有根，1 个',
          '每个结点至多 2 个孩子',
          '所以下一层上限是本层的 2 倍',
          '第 i 层上限 = 2^(i-1)'] }), 0,
        L === 1
          ? '性质一从根开始数：第 1 层只有根结点，上限 1 个，也就是 2^0。'
          : '第 ' + L + ' 层由第 ' + (L - 1) + ' 层每个结点各分出两个孩子而来，' +
            '所以上限从 ' + Math.pow(2, L - 2) + ' 翻到 ' + Math.pow(2, L - 1) +
            '，正是 2^' + (L - 1) + '。',
        ['第 ' + L + ' 层', '上限 2^' + (L - 1) + ' = ' + Math.pow(2, L - 1),
         '来自上一层的 2 倍']));
    }

    /* 性质二：深度 k 至多 2^k - 1 个结点，即满二叉树 */
    var allDone = {};
    for (L = 1; L <= 15; L++) allDone[L] = 'done';
    steps.push(stepP(snap({
      nodes: full, maxIdx: 15, st: allDone, showCap: true, litLevel: 4,
      hdr: '性质二：深度 k 的二叉树至多 2^k − 1 个结点',
      cap: '把各层上限加起来：1 + 2 + 4 + 8 = 15 = 2^4 − 1',
      stats: { '深度 k': 4, '结点数 n': 15, '2^k − 1': 15,
               '这棵树': '满二叉树' },
      notes: ['把性质一逐层求和即得',
        '1 + 2 + … + 2^(k-1) = 2^k − 1',
        '每层都放满时取到上限',
        '这种树叫满二叉树'] }), 1,
      '把性质一各层的上限加起来就是性质二：1 + 2 + 4 + 8 = 15 = 2^4 − 1。' +
      '每一层都放满、取到这个上限的树，叫满二叉树。反过来，n 个结点的二叉树深度至少 ⌊log₂n⌋ + 1。',
      ['逐层求和 = 2^k − 1', '每层放满 → 满二叉树',
       '深度至少 ⌊log₂n⌋ + 1']));

    /* 性质三：n0 = n2 + 1 —— 换一棵具体的树数一数 */
    var tree = [1, 2, 3, 4, 5, 7];
    var deg = { 1: 2, 2: 2, 3: 1, 4: 0, 5: 0, 7: 0 };
    var stA = {};
    steps.push(stepP(snap({
      nodes: tree, maxIdx: 7, depth: 3, st: stA,
      hdr: '性质三：叶子数 n0 = 度为 2 的结点数 n2 + 1',
      cap: '换一棵普通的二叉树来数：6 个结点，先看每个结点的度',
      stats: { '结点数 n': 6, '深度': 3, '待数': 'n0 与 n2',
               '待验': 'n0 = n2 + 1' },
      notes: ['度 = 孩子个数，只能是 0、1、2',
        'n = n0 + n1 + n2',
        '下面把 n0 和 n2 分别标出来',
        '再验证它们差 1'] }), 2,
      '性质三换一棵普通的二叉树来看。二叉树里结点的度只能是 0、1、2，所以 n = n0 + n1 + n2。' +
      '下面把叶子和度为 2 的结点分别标出来数一数。',
      ['度只能是 0、1、2', 'n = n0 + n1 + n2', '先数 n0 和 n2']));

    var st0 = {}, k;
    for (k in deg) if (deg[k] === 0) st0[k] = 'good';
    steps.push(stepP(snap({
      nodes: tree, maxIdx: 7, depth: 3, st: st0,
      hdr: '数叶子：度为 0 的结点',
      cap: '4、5、7 三个结点没有孩子 —— n0 = 3',
      stats: { 'n0（叶子）': 3, 'n1': '待数', 'n2': '待数', 'n': 6 },
      notes: ['4 号：无孩子',
        '5 号：无孩子',
        '7 号：无孩子',
        'n0 = 3'] }), 3,
      '绿色的 4、5、7 都没有孩子，是叶子，所以 n0 = 3。注意 6 号位置是空的，' +
      '3 号只有右孩子 7，它的度是 1，不算叶子。',
      ['4、5、7 无孩子', 'n0 = 3', '3 号度为 1，不是叶子']));

    var st2 = {};
    for (k in deg) st2[k] = deg[k] === 2 ? 'bad' : (deg[k] === 0 ? 'good' : 'hot');
    steps.push(stepP(snap({
      nodes: tree, maxIdx: 7, depth: 3, st: st2,
      hdr: '数分支：红色度为 2，黄色度为 1',
      cap: 'n0 = 3，n1 = 1（3 号），n2 = 2（1、2 号）—— 恰好 n0 = n2 + 1',
      stats: { 'n0': 3, 'n1': 1, 'n2': 2, 'n0 = n2 + 1': '3 = 2 + 1 ✓' },
      notes: ['1、2 号各有两个孩子 → n2 = 2',
        '3 号只有一个孩子 → n1 = 1',
        '3 + 1 + 2 = 6 = n，对得上',
        'n0 = 3 = n2 + 1 ✓'] }), 4,
      '红色的 1、2 号各有两个孩子，n2 = 2；黄色的 3 号只有一个孩子，n1 = 1。' +
      '于是 3 + 1 + 2 = 6 = n 对得上，而 n0 = 3 = n2 + 1，性质三成立。',
      ['n2 = 2，n1 = 1', 'n0 + n1 + n2 = 6 = n',
       'n0 = 3 = n2 + 1 ✓']));

    steps.push(stepP(snap({
      nodes: tree, maxIdx: 7, depth: 3, st: st2,
      hdr: '为什么必然成立：数一数「边」',
      cap: '从结点数看：n = n0+n1+n2；从边数看：n = 边数 + 1 = n1 + 2·n2 + 1',
      stats: { '按结点': 'n = n0+n1+n2', '按边': 'n = n1+2n2+1',
               '两式相减': 'n0 = n2 + 1', '结论': '恒成立' },
      notes: ['每条边对应一个非根结点',
        '边数 = n1 + 2·n2',
        '故 n = n1 + 2·n2 + 1',
        '与 n = n0+n1+n2 相减即得'] }), 5,
      '这不是巧合。除根以外每个结点都恰有一条入边，所以 n = 边数 + 1 = n1 + 2·n2 + 1；' +
      '又有 n = n0 + n1 + n2。两式相减，n1 和 n 都消掉，剩下 n0 = n2 + 1。',
      ['边数 = n1 + 2·n2', 'n = 边数 + 1',
       '两式相减 → n0 = n2 + 1']));

    return steps;
  }

  /* ---------- 场景三：完全二叉树的编号性质 ---------- */
  /* 复用场景二的坐标：满二叉树 15 个结点，逐个演示
   * 双亲 ⌊i/2⌋、左孩子 2i、右孩子 2i+1 —— 编号是顺序存储的根据。 */
  function buildIndex() {
    var steps = [];
    var full = seq(1, 15);
    var snap = function (o) {
      return { nodes: full, maxIdx: 15, depth: 4, st: o.st || {},
               showCap: false, litLevel: 0,
               hdr: o.hdr, cap: o.cap || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(stepP(snap({
      hdr: '完全二叉树的编号：从根起自上而下、每层自左至右，编号 1…n',
      cap: '编号一旦定下，结点之间的亲子关系就能直接算出来，不必存指针',
      stats: { '编号起点': 1, '顺序': '层序，从左到右',
               '结点数': 15, '深度': 4 },
      notes: ['根编号 1',
        '同一层从左到右连续编号',
        '这是完全二叉树独有的规整性',
        '下面看三条换算公式'] }), 0,
      '完全二叉树的结点从根开始、自上而下、每层自左至右连续编号 1…n。' +
      '正因为编号这样规整，亲子关系可以直接用算术算出来，根本不用存指针 —— 顺序存储就是这么来的。',
      ['层序连续编号 1…n', '亲子关系可算', '顺序存储的根据']));

    // 逐个演示 4、5、6、7 号结点的三条换算
    var demo = [5, 6, 3];
    for (var d = 0; d < demo.length; d++) {
      var i = demo[d], st = {};
      st[i] = 'hot';
      if (i > 1) st[i >> 1] = 'active';
      if (i * 2 <= 15) st[i * 2] = 'good';
      if (i * 2 + 1 <= 15) st[i * 2 + 1] = 'done';
      steps.push(stepP(snap({
        hdr: '以 ' + i + ' 号结点为例（黄=自己，蓝=双亲，绿=左孩子，深绿=右孩子）',
        cap: '双亲 ⌊' + i + '/2⌋ = ' + (i >> 1) + '　左孩子 2×' + i + ' = ' +
             (i * 2) + '　右孩子 2×' + i + '+1 = ' + (i * 2 + 1),
        st: st,
        stats: { '结点 i': i, '双亲 ⌊i/2⌋': i >> 1,
                 '左孩子 2i': i * 2, '右孩子 2i+1': i * 2 + 1 },
        notes: ['双亲：⌊i / 2⌋ = ' + (i >> 1),
          '左孩子：2i = ' + (i * 2),
          '右孩子：2i + 1 = ' + (i * 2 + 1),
          '下标 > n 就说明该孩子不存在'] }), d === 0 ? 1 : (d === 1 ? 2 : 3),
        '看 ' + i + ' 号：它的双亲是 ⌊' + i + '/2⌋ = ' + (i >> 1) +
        '（蓝色），左孩子 2×' + i + ' = ' + (i * 2) + '（绿色），右孩子 ' +
        (i * 2 + 1) + '（深绿）。' +
        (d === 1 ? '注意 6 号是偶数、5 号是奇数，⌊i/2⌋ 对两者都成立 —— 整除自动抹掉那个 +1。'
                 : '三个公式都只用整数乘除，代价 O(1)。'),
        ['i = ' + i, '双亲 ' + (i >> 1) + '，左 ' + (i * 2) + '，右 ' + (i * 2 + 1),
         '全是 O(1) 的算术']));
    }

    var stEdge = {};
    stEdge[1] = 'active'; stEdge[8] = 'good'; stEdge[15] = 'done';
    steps.push(stepP(snap({
      hdr: '边界：根没有双亲，下标越过 n 的孩子不存在',
      cap: 'i == 1 时无双亲；2i > n 说明没有左孩子，2i+1 > n 说明没有右孩子',
      st: stEdge,
      stats: { 'i = 1': '无双亲', '2i > n': '无左孩子',
               '2i+1 > n': '无右孩子', '判断代价': 'O(1)' },
      notes: ['根的编号是 1，它没有双亲',
        '8 号：2×8 = 16 > 15，无左孩子',
        '15 号：同理，是叶子',
        '所有判断都只需一次比较'] }), 4,
      '用公式时要记住两处边界：i == 1 是根，没有双亲；算出的孩子下标一旦超过 n，' +
      '就说明那个孩子不存在。比如 8 号，2×8 = 16 > 15，所以它是叶子。判断只需一次比较。',
      ['i == 1 → 无双亲', '2i > n → 无左孩子',
       '2i+1 > n → 无右孩子']));

    steps.push(stepP(snap({
      hdr: '推论：n 个结点的完全二叉树，深度为 ⌊log₂n⌋ + 1',
      cap: '前 k−1 层放满是 2^(k-1) − 1 个，放满 k 层是 2^k − 1 个，n 夹在中间',
      st: (function () { var s = {}, q; for (q = 1; q <= 15; q++) s[q] = 'done'; return s; })(),
      stats: { 'n': 15, '⌊log₂15⌋': 3, '深度': 4,
               '编号 1…n': '无空隙' },
      notes: ['完全二叉树编号连续，中间没有空号',
        '前 k−1 层满：2^(k-1) − 1 < n',
        '前 k 层满：n ≤ 2^k − 1',
        '两边取对数即得 k = ⌊log₂n⌋ + 1'] }), 5,
      '还有一条推论：n 个结点的完全二叉树深度是 ⌊log₂n⌋ + 1。因为编号连续没有空隙，' +
      'n 必然夹在 2^(k-1) − 1 与 2^k − 1 之间，取对数就得到 k。这也是堆的各种操作是 O(log n) 的根据。',
      ['编号连续无空号', '深度 = ⌊log₂n⌋ + 1',
       '堆操作 O(log n) 的来源']));

    return steps;
  }

  /* ---------- 场景四：顺序存储与二叉链表 ----------
   * 左半边画树（x 68…431），右半边画存储（x 470…950）。
   * 树：TY0=156，每层 42，r=15，最深第 4 层落在 282，加 r 到 297，未越 330。 */
  var SX0 = 56, SSPAN = 368, SY0 = 156, SDY = 42, SR = 15;
  var AX = 470, AW = 30, AG = 2, AY = 188, AH = 38, ANUM = 15;

  function sxOf(i) {
    var L = levelOf(i), k = 1, f = 1, q;
    for (q = 1; q < L; q++) { k *= 2; f *= 2; }
    return SX0 + SSPAN * (i - f + 0.5) / k;
  }
  function syOf(i) { return SY0 + (levelOf(i) - 1) * SDY; }

  function renderStore(ctx, f) {
    D.clear(ctx.stage);
    var i, has = {}, x, c;
    for (i = 0; i < f.nodes.length; i++) has[f.nodes[i]] = 1;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 126, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    for (i = 2; i <= f.maxIdx; i++) {
      if (!has[i] || !has[i >> 1]) continue;
      D.link(ctx.stage, { x1: sxOf(i >> 1), y1: syOf(i >> 1) + SR,
        x2: sxOf(i), y2: syOf(i) - SR - 2, kind: 'next', arrow: false });
    }
    for (i = 1; i <= f.maxIdx; i++) {
      if (!has[i]) continue;
      D.circleNode(ctx.stage, { x: sxOf(i), y: syOf(i), r: SR,
        state: has[i] ? 'good' : 'mute', value: f.labels[i] || i });
    }

    if (f.mode === 'array') {
      for (i = 1; i <= ANUM; i++) {
        x = AX + (i - 1) * (AW + AG);
        c = D.C[has[i] ? 'good' : 'mute'];
        ctx.stage.appendChild(D.el('rect', { x: x, y: AY, width: AW,
          height: AH, rx: 5, fill: c.fill, stroke: c.stroke,
          'stroke-width': 1.5 }));
        if (has[i]) {
          ctx.stage.appendChild(D.text(f.labels[i] || i,
            { x: x + AW / 2, y: AY + 25, 'class': 'vz-idx',
              fill: '#eef3ff', 'font-size': 13 }));
        } else {
          ctx.stage.appendChild(D.text('∅',
            { x: x + AW / 2, y: AY + 25, 'class': 'vz-idx', fill: '#4a5c82' }));
        }
        ctx.stage.appendChild(D.text(i,
          { x: x + AW / 2, y: AY + AH + 14, 'class': 'vz-idx' }));
      }
      ctx.stage.appendChild(D.text('顺序存储：按编号 1…' + ANUM + ' 逐格对应',
        { x: AX, y: AY - 16, 'class': 'vz-tag', fill: '#9fb4dc',
          'text-anchor': 'start' }));
    } else if (f.mode === 'link') {
      // 三个示意结点：lchild | data | rchild，宽 132、间隙 16，止于 890
      for (i = 0; i < f.boxes.length; i++) {
        var b = f.boxes[i];
        D.nodeBox(ctx.stage, { x: 490 + i * 148, y: 176, w: 132, h: 60,
          slots: ['lchild', 'data', 'rchild'], state: b.st || 'good',
          value: b.v });
      }
      ctx.stage.appendChild(D.text('二叉链表结点：两个指针域 + 一个数据域',
        { x: 490, y: 160, 'class': 'vz-tag', fill: '#9fb4dc',
          'text-anchor': 'start' }));
    }

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: 470, y: 262 + i * 22, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function stepS(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { renderStore(c, f); } };
  }

  function buildStore() {
    var steps = [];
    var LB = {};
    var letters = 'ABCDEFGHIJKLMNO';
    for (var q = 1; q <= 15; q++) LB[q] = letters[q - 1];

    var snap = function (o) {
      return { nodes: o.nodes, maxIdx: 15, labels: LB, mode: o.mode,
               boxes: o.boxes || [], hdr: o.hdr, cap: o.cap || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    /* 完全二叉树：顺序存储正好，一格不浪费 */
    steps.push(stepS(snap({
      nodes: seq(1, 12), mode: 'array',
      hdr: '顺序存储：把编号当数组下标',
      cap: '完全二叉树的编号 1…n 连续，直接照编号填进数组，一格不浪费',
      stats: { '结点数 n': 12, '数组长度': 12,
               '浪费': '0 格', '取双亲/孩子': 'O(1)' },
      notes: ['编号 i 的结点存在 a[i]',
        '双亲 a[⌊i/2⌋]，孩子 a[2i]、a[2i+1]',
        '完全二叉树前 12 格填满，无空隙',
        '这是最省的情形'] }), 0,
      '顺序存储的做法就是把编号当数组下标：编号 i 的结点放进 a[i]。' +
      '完全二叉树编号连续没有空号，12 个结点占前 12 格，一格不浪费，取双亲取孩子都是 O(1)。',
      ['a[i] 存编号 i 的结点', '完全二叉树无空隙',
       '亲子访问 O(1)']));

    /* 单支树：顺序存储的最坏情形 */
    steps.push(stepS(snap({
      nodes: [1, 3, 7, 15], mode: 'array',
      hdr: '最坏情形：右单支树',
      cap: '只有 4 个结点，却要 15 格数组 —— 深度 k 的单支树要 2^k − 1 格',
      stats: { '结点数 n': 4, '数组长度': 15,
               '浪费': '11 格', '空间利用率': '27%' },
      notes: ['编号 1 → 3 → 7 → 15，中间全空',
        '空号也必须占位，否则算不出亲子关系',
        'n = 4，却要开 2^4 − 1 = 15 格',
        '深度越大浪费越离谱'] }), 1,
      '换成一棵右单支树就露馅了：只有 A、C、G、O 四个结点，编号却是 1、3、7、15，' +
      '中间的空号必须留着占位 —— 不然 ⌊i/2⌋、2i 这套公式就失效了。4 个结点开 15 格，浪费 11 格。',
      ['编号 1→3→7→15', '空号必须占位',
       '4 个结点占 15 格']));

    steps.push(stepS(snap({
      nodes: [1, 3, 7, 15], mode: 'array',
      hdr: '结论：顺序存储只适合完全二叉树',
      cap: '一般二叉树深度 k 时最坏要 2^k − 1 格，n 个结点最坏浪费到 2^n − 1',
      stats: { '适合': '完全/满二叉树', '不适合': '一般二叉树',
               '最坏空间': '2^n − 1', '出路': '链式存储' },
      notes: ['完全二叉树：顺序存储最优',
        '一般二叉树：可能指数级浪费',
        '省空间就得改用指针',
        '下一步看二叉链表'] }), 2,
      '所以顺序存储只适合完全二叉树和满二叉树。一般的二叉树用它，最坏情况下 n 个结点要开 ' +
      '2^n − 1 格，是指数级的浪费。要按实际结点数付费，就得改用指针 —— 二叉链表。',
      ['顺序存储适合完全二叉树', '一般二叉树浪费可达指数级',
       '改用链式存储']));

    /* 二叉链表 */
    steps.push(stepS(snap({
      nodes: [1, 2, 3, 4, 5, 7], mode: 'link',
      boxes: [{ v: 'A' }, { v: 'B' }, { v: 'C' }],
      hdr: '二叉链表：每个结点两个指针域',
      cap: 'lchild | data | rchild —— 有几个结点就分配几个结点，不为空号付费',
      stats: { '每结点': '2 指针 + 1 数据', '结点数 n': 6,
               '指针域总数': 12, '空指针数': 7 },
      notes: ['lchild 指左孩子，rchild 指右孩子',
        '孩子不存在就置 NULL',
        '按需分配，与树形无关',
        'n 个结点共 2n 个指针域'] }), 3,
      '二叉链表给每个结点配两个指针域：lchild 指左孩子、rchild 指右孩子，孩子不存在就置 NULL。' +
      '有几个结点分配几个，跟树长得歪不歪没关系 —— 这就是它比顺序存储通用的地方。',
      ['lchild | data | rchild', '按结点数分配',
       '空孩子置 NULL']));

    steps.push(stepS(snap({
      nodes: [1, 2, 3, 4, 5, 7], mode: 'link',
      boxes: [{ v: 'A' }, { v: 'B' }, { v: 'C', st: 'hot' }],
      hdr: '空指针有多少：n 个结点的二叉链表有 n + 1 个空指针域',
      cap: '总指针域 2n，被用掉的是分支数 n − 1，剩下 2n − (n − 1) = n + 1 个空着',
      stats: { 'n': 6, '指针域 2n': 12, '用掉 n−1': 5,
               '空指针 n+1': 7 },
      notes: ['每条分支恰好用掉一个指针域',
        '树有 n − 1 条分支',
        '空指针 = 2n − (n − 1) = n + 1',
        '这批空指针后面被线索二叉树利用'] }), 4,
      '数一下空指针：总共 2n 个指针域，而树只有 n − 1 条分支，所以空着的正好 n + 1 个 —— ' +
      '这里 n = 6，空指针 7 个。将近一半的指针域是浪费的，线索二叉树就是拿它们来存遍历前驱后继的。',
      ['指针域共 2n 个', '分支只有 n − 1 条',
       '空指针 n + 1 个']));

    steps.push(stepS(snap({
      nodes: [1, 2, 3, 4, 5, 7], mode: 'link',
      boxes: [{ v: 'A' }, { v: 'B', st: 'active' }, { v: 'C' }],
      hdr: '三叉链表：再加一个 parent 域',
      cap: '二叉链表只能自上而下走；要频繁找双亲，就再加一个指向双亲的指针',
      stats: { '二叉链表': '2 指针', '三叉链表': '3 指针',
               '找双亲': 'O(1)', '代价': '多 n 个指针域' },
      notes: ['二叉链表找双亲要从根重新遍历',
        '加一个 parent 域就能 O(1) 找到',
        '代价是每结点多一个指针',
        '按访问需要取舍'] }), 5,
      '二叉链表有个短处：只能自上而下走，要找某个结点的双亲得从根重新遍历一遍。' +
      '如果这种操作很频繁，就再加一个 parent 域变成三叉链表，找双亲降到 O(1)，代价是多 n 个指针。',
      ['二叉链表找双亲要重新遍历', '三叉链表加 parent 域',
       '空间换时间，按需取舍']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['binary-tree-basics'] = {
    title: '二叉树的性质与存储 Binary Tree',
    subtitle: '二叉树每个结点至多两个孩子，且左右有序。三条性质刻画了它的规模，完全二叉树的编号让顺序存储成为可能，一般二叉树则要靠二叉链表。',
    height: 700,
    code: [
      '定义: 空树，或「根 + 左子树 + 右子树」（左右有序）',
      '性质1: 第 i 层至多 2^(i-1) 个结点',
      '性质2: 深度 k 至多 2^k - 1 个结点   // 取等即满二叉树',
      '性质3: n0 = n2 + 1                  // 叶子比双分支结点多一个',
      '编号: 双亲 i/2，左孩子 2i，右孩子 2i+1  // 完全二叉树才成立',
      '深度: n 个结点的完全二叉树深度 = log2(n) + 1'
    ],
    scenes: [
      { name: '五种形态', build: buildForms,
        codeTag: '递归定义',
        code: [
          '二叉树 ::= 空树',
          '        |  根结点 + 左子树 + 右子树',
          '',
          '// 左右子树本身也是二叉树，且互不相交',
          '// 五种形态：空 / 仅根 / 仅左 / 仅右 / 左右都有',
          '',
          '// 与树的区别：二叉树的左右孩子有次序，不能互换',
          '// 所以「仅左」和「仅右」是两棵不同的二叉树'
        ] },
      { name: '三条性质', build: buildProp,
        codeTag: '性质与推导',
        code: [
          '性质1: 第 i 层至多 2^(i-1) 个结点',
          '性质2: 深度 k 至多 2^k - 1 = 1+2+4+...+2^(k-1)',
          '性质3: n0 = n2 + 1',
          '',
          '  推导: n = n0 + n1 + n2         // 按度分类',
          '        n = 分支数 + 1 = n1 + 2*n2 + 1',
          '  两式相减: n0 = n2 + 1'
        ] },
      { name: '完全二叉树编号', build: buildIndex,
        codeTag: '编号换算',
        code: [
          '编号: 自上而下、每层自左至右，从 1 开始',
          '双亲: parent(i) = i / 2      // 整除，i > 1',
          '左孩子: lchild(i) = 2 * i    // 2i > n 则不存在',
          '右孩子: rchild(i) = 2*i + 1  // 2i+1 > n 则不存在',
          '边界: i == 1 时为根，无双亲',
          '深度: k = log2(n) + 1        // 向下取整'
        ] },
      { name: '两种存储', build: buildStore,
        codeTag: '顺序 vs 链式',
        code: [
          '// 顺序存储：编号即下标',
          'SqBiTree: ElemType a[MAXSIZE]   // a[i] 存编号 i 的结点',
          '  完全二叉树: 一格不浪费，亲子访问 O(1)',
          '  单支树: n 个结点最坏要 2^n - 1 格',
          '',
          '// 二叉链表：按结点数分配',
          'BiTNode: { data; *lchild; *rchild }',
          '  指针域共 2n 个，空指针 n+1 个',
          '  三叉链表再加 *parent，找双亲 O(1)'
        ] }
    ]
  };
})();
