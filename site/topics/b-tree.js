/* B- 树（多路平衡查找树）— 第9章
 * 场景一：为什么需要 B 树（磁盘 I/O 与树高的关系）
 * 场景二：3 阶 B 树的定义与结构
 * 场景三：插入与分裂（含根分裂，演示树从下往上生长）
 * 场景四：查找过程
 */
(function () {
  var D = window.VizDraw;

  /* B 树结点用矩形格子表示，关键字之间有指针槽。
   * 每个结点画成一行格子：[ptr][key][ptr][key]…[ptr]
   * 布局：结点中心 x，顶部 y，格宽 W，格高 H */
  var W = 36, H = 32, R = 14;

  /* 在 g 里画一个 B 树结点
   * keys: 关键字数组，cx: 中心 x，y: 顶部 y，st: 状态
   * 返回每个关键字的中心 x（用于连线）*/
  function drawBNode(g, keys, cx, y, st) {
    var n = keys.length;
    var total = (n + 1) * W / 2 + n * W;
    var x0 = cx - total / 2;
    var xs = [];
    /* 指针槽（窄格）和关键字槽交替 */
    for (var i = 0; i <= n; i++) {
      var px = x0 + i * (W + W / 2);
      var fill = D.C['mute'].fill;
      g.appendChild(D.el('rect', { x: px, y: y, width: W / 2, height: H,
        rx: 3, fill: fill, stroke: '#3a4d6e', 'stroke-width': 1 }));
    }
    for (var j = 0; j < n; j++) {
      var kx = x0 + (j + 1) * (W / 2) + j * W + 1;
      var sc = D.C[st || 'idle'];
      g.appendChild(D.el('rect', { x: kx, y: y, width: W, height: H,
        rx: 3, fill: sc.fill, stroke: sc.stroke, 'stroke-width': 1.6 }));
      g.appendChild(D.text(keys[j],
        { x: kx + W / 2, y: y + H / 2 + 6, 'class': 'vz-cellval',
          fill: '#eef3ff', 'text-anchor': 'middle' }));
      xs.push(kx + W / 2);
    }
    return { xs: xs, x0: x0, total: total };
  }

  /* 画连线：从父结点某指针槽底部连到子结点顶部中心 */
  function drawEdge(g, px, py, cx, cy) {
    D.link(g, { x1: px, y1: py, x2: cx, y2: cy,
      kind: 'next', arrow: false, width: 1.5 });
  }

  function render(ctx, f) {
    D.clear(ctx.stage);
    if (f.hdr) ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) ctx.stage.appendChild(D.text(f.cap,
      { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    /* 绘制 f.nodes: [{keys, cx, y, st}] 和 f.edges: [{px,py,cx,cy}] */
    var i;
    for (i = 0; i < (f.edges || []).length; i++) {
      var e = f.edges[i];
      drawEdge(ctx.stage, e.px, e.py, e.cx, e.cy);
    }
    for (i = 0; i < (f.nodes || []).length; i++) {
      var nd = f.nodes[i];
      drawBNode(ctx.stage, nd.keys, nd.cx, nd.y, nd.st);
    }
    for (var j = 0; j < (f.notes || []).length && j < 3; j++) {
      ctx.stage.appendChild(D.text(f.notes[j],
        { x: 44, y: 272 + j * 22, 'class': 'vz-info' }));
    }
    if (f.legend) ctx.stage.appendChild(D.text(f.legend,
      { x: 44, y: 338, 'class': 'vz-info', fill: '#6ceaa5' }));
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ===== 场景一：为什么需要 B 树 ===== */
  function buildWhy() {
    var steps = [];

    function snap(o) {
      return { hdr: o.hdr || 'B 树的动机：减少磁盘 I/O 次数',
               cap: o.cap || null, nodes: o.nodes || [], edges: o.edges || [],
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    /* 画一棵高度为 4 的二叉树轮廓（5 层，表示 16 个叶子）*/
    var BIN_NODES = [];
    var Y0 = 148, DY = 34;
    /* 只画前 4 层 15 个结点的圆 */
    function bxOf(i) {
      var L = 1, f = 1, q;
      while (f * 2 <= i) { f *= 2; L++; }
      var k = f;
      return 500 + 400 * (i - f + 0.5) / k - 200;
    }
    function byOf(i) {
      var L = 1, f = 1; while (f * 2 <= i) { f *= 2; L++; } return Y0 + (L - 1) * DY;
    }

    steps.push(step(snap({
      cap: '内存中用二叉树，每次比较代价 ≈ 0；磁盘上每访问一个结点就是一次 I/O，代价极高',
      stats: { '内存访问': '纳秒级', '磁盘访问': '毫秒级', '差距': '约 10 万倍', '目标': '减少 I/O 次数' },
      notes: ['内存比较代价极小，树高无所谓', '磁盘每读一个块 ≈ 5~10ms，100 亿条记录', '二叉树高度 log₂(n)，每层一次 I/O，太慢'],
      legend: '100 亿条记录：二叉树高约 33 层（33 次 I/O）；1000 阶 B 树只需 3~4 层（3~4 次 I/O）' }), 0,
      '当数据存在磁盘上，每访问一个树结点就要一次磁盘 I/O。磁盘 I/O 比内存操作慢约 10 万倍，' +
      '所以减少 I/O 次数（即减少树的高度）才是关键。B 树的思路是：一个结点存多个关键字，' +
      '每次 I/O 读进来一整块，用「宽」换「矮」。',
      ['磁盘 I/O 极慢', '要减少树高', '一个结点存多个关键字']));

    steps.push(step(snap({
      nodes: [{ keys: ['20', '40', '60', '80'], cx: 500, y: 155, st: 'active' }],
      cap: '阶为 m 的 B 树：每个结点最多存 m−1 个关键字，最少存 ⌈m/2⌉−1 个（根至少 1 个）',
      stats: { '阶 m': 5, '最多关键字': 'm−1=4', '最少关键字': '⌈m/2⌉−1=2', '最多孩子': 'm=5' },
      notes: ['结点就是磁盘一页（块），存 m−1 个关键字', '顺序查找：比 m 个关键字找到下一步', '一次 I/O 读一个结点，减少 I/O 次数'],
      legend: '实际系统中 m 可以几百甚至上千，树高仅 3~4 层就能覆盖数十亿条记录' }), 1,
      '5 阶 B 树：每个结点存 1~4 个关键字，对应 2~5 个孩子指针。' +
      '一个结点的大小等于磁盘一页，一次 I/O 读完。相比二叉树，每层可以排除更多数据。',
      ['一结点 = 磁盘一页', '最多 m-1 个关键字', '树高 = I/O 次数']));

    return steps;
  }

  /* ===== 场景二：3 阶 B 树的结构 ===== */
  function buildStructure() {
    var steps = [];
    /* 3 阶 B 树：每结点 1~2 个关键字，2~3 个孩子
     * 示例树：
     *         [35]
     *        /    \
     *    [20]    [45 60]
     *   /   \   /  |   \
     * [12] [28] [40][50][70]
     */
    var Y1 = 152, Y2 = 196, Y3 = 240;
    function snap2(o) {
      return { hdr: o.hdr || '3 阶 B 树：每结点 1~2 个关键字',
               cap: o.cap || null, nodes: o.nodes || [], edges: o.edges || [],
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    var rootN  = { keys: ['35'],        cx: 500, y: Y1, st: 'idle' };
    var lN     = { keys: ['20'],        cx: 300, y: Y2, st: 'idle' };
    var rN     = { keys: ['45', '60'],  cx: 700, y: Y2, st: 'idle' };
    var ll     = { keys: ['12'],        cx: 180, y: Y3, st: 'idle' };
    var lm     = { keys: ['28'],        cx: 360, y: Y3, st: 'idle' };
    var rl     = { keys: ['40'],        cx: 560, y: Y3, st: 'idle' };
    var rm     = { keys: ['50'],        cx: 700, y: Y3, st: 'idle' };
    var rr     = { keys: ['70'],        cx: 840, y: Y3, st: 'idle' };
    var allN   = [rootN, lN, rN, ll, lm, rl, rm, rr];
    /* 边：父指针槽底→子结点顶中 */
    var EDGES = [
      { px: 475, py: Y1+H, cx: 300, cy: Y2 },
      { px: 525, py: Y1+H, cx: 700, cy: Y2 },
      { px: 270, py: Y2+H, cx: 180, cy: Y3 },
      { px: 318, py: Y2+H, cx: 360, cy: Y3 },
      { px: 648, py: Y2+H, cx: 560, cy: Y3 },
      { px: 700, py: Y2+H, cx: 700, cy: Y3 },
      { px: 754, py: Y2+H, cx: 840, cy: Y3 }
    ];

    steps.push(step(snap2({
      nodes: allN, edges: EDGES,
      cap: '3 阶 B 树：根结点有 1 个关键字 35，非叶结点关键字数在 1~2 之间',
      stats: { '阶': 3, '树高': 3, '结点数': 8, '关键字总数': 11 },
      notes: ['每个内部结点：1~2 个关键字，2~3 个孩子', '左子树所有键 < 父关键字 < 右子树', '叶结点在同一层（B 树高度平衡）'] }), 0,
      '3 阶 B 树示例。根有 1 个关键字，把整棵树分成左右两半。' +
      '每个结点的关键字把指针槽分开：最左指针指向所有比第一个关键字小的结点，以此类推。' +
      '关键是叶子都在同一层，树是高度平衡的。',
      ['叶子同层（高度平衡）', '左<关键字<右', '一结点多关键字']));

    steps.push(step(snap2({
      nodes: [{ keys: ['35'], cx: 500, y: Y1, st: 'hot' },
              { keys: ['20'], cx: 300, y: Y2, st: 'idle' },
              { keys: ['45','60'], cx: 700, y: Y2, st: 'idle' },
              ll, lm, rl, rm, rr], edges: EDGES,
      cap: '3 阶 B 树关键字数约束：⌈m/2⌉−1 ≤ n ≤ m−1，3 阶即 1≤n≤2（根可以只有 1 个）',
      stats: { '⌈m/2⌉': 2, '非根最少': 1, '最多': 2, '根最少': 1 },
      notes: ['非根结点：⌈3/2⌉−1=1 到 2 个关键字', '根结点：至少 1 个关键字', '超过 2 个则需分裂'] }), 1,
      '3 阶 B 树每个非根结点至少有 1 个关键字（⌈3/2⌉−1），最多 2 个（3−1=2）。' +
      '一旦插入后关键字数超过 2，就需要分裂：把中间那个关键字提升到父结点，左右各一个关键字留在两个新结点里。',
      ['非根：1~2 个关键字', '超过 2 → 分裂', '中间关键字上移']));

    return steps;
  }

  /* ===== 场景三：插入与分裂 ===== */
  function buildInsert() {
    var steps = [];
    /* 从空树依次插入 30, 20, 10 演示根分裂 */
    var Y1 = 152, Y2 = 196, Y3 = 240;
    function snap3(o) {
      return { hdr: o.hdr || 'B 树插入：满了就分裂，中键上移',
               cap: o.cap || null, nodes: o.nodes || [], edges: o.edges || [],
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    /* 步骤1：插入 30，树只有根 [30] */
    steps.push(step(snap3({
      nodes: [{ keys: ['30'], cx: 500, y: Y1, st: 'good' }],
      cap: '插入 30：树为空，30 成为根，此时根只有 1 个关键字，合法',
      stats: { '插入': 30, '根关键字': 1, '树高': 1, '状态': '合法' },
      notes: ['B 树从空插入，先构造只有根的树', '根只需至少 1 个关键字', '还可以再插一个'] }), 1,
      '插入第一个关键字 30，构成只有根的一棵树。根结点至少 1 个关键字，现在恰好满足。',
      ['插入 30', '成为根', '树高 1']));

    /* 步骤2：插入 20，根变为 [20, 30] */
    steps.push(step(snap3({
      nodes: [{ keys: ['20', '30'], cx: 500, y: Y1, st: 'active' }],
      cap: '插入 20：20 < 30，插入根结点中 30 的左边，根变为 [20, 30]，仍合法（≤2 个）',
      stats: { '插入': 20, '根关键字': 2, '树高': 1, '状态': '合法' },
      notes: ['3 阶 B 树根最多 2 个关键字', '20 插到 30 左边，保持有序', '再插一个就会超限，需要分裂'] }), 2,
      '插入 20：在根结点内部查找位置，20 < 30，插到 30 左边。根结点变成 [20, 30]，' +
      '关键字数 = 2 = m−1，恰好满了但还合法。再插一个就需要分裂。',
      ['插入 20', '根变为 [20, 30]', '恰好满了']));

    /* 步骤3：插入 10，根溢出 [10,20,30]，需分裂 */
    steps.push(step(snap3({
      nodes: [{ keys: ['10', '20', '30'], cx: 500, y: Y1, st: 'bad' }],
      cap: '插入 10：临时变成 [10, 20, 30]，有 3 个关键字超出上限 2，必须分裂！',
      stats: { '临时关键字数': 3, '上限': 2, '状态': '溢出', '操作': '分裂' },
      notes: ['超出 m−1=2，必须分裂', '找中间关键字 20 上移', '20 左边和右边各成一个新结点'] }), 3,
      '插入 10 后根结点临时有 3 个关键字，超过了 3 阶 B 树的上限 2。必须分裂：' +
      '找到中间关键字 20，把它提升到父结点；10 留在左结点，30 留在右结点。' +
      '因为根没有父结点，所以创建一个新根来接收 20。',
      ['3 个关键字溢出', '中间 20 上移', '根分裂，树长高一层']));

    /* 步骤4：分裂完成，新根 [20]，左孩子 [10]，右孩子 [30] */
    steps.push(step(snap3({
      nodes: [{ keys: ['20'], cx: 500, y: Y1, st: 'good' },
              { keys: ['10'], cx: 300, y: Y2, st: 'done' },
              { keys: ['30'], cx: 700, y: Y2, st: 'done' }],
      edges: [{ px: 475, py: Y1+H, cx: 300, cy: Y2 },
              { px: 525, py: Y1+H, cx: 700, cy: Y2 }],
      cap: '根分裂完成：20 成为新根，[10] 为左孩子，[30] 为右孩子，树高增加 1',
      stats: { '新根': 20, '左孩子': '[10]', '右孩子': '[30]', '树高': 2 },
      notes: ['B 树从根分裂处长高——树从下往上生长', '所有叶子仍在同一层', '分裂最多沿路向上传播到根'],
      legend: 'B 树只有根分裂时才增高，这保证了所有叶子始终在同一层（高度平衡）' }), 4,
      '分裂完成：20 成为新根，10 和 30 分别成为左右孩子。树高从 1 增加到 2。' +
      'B 树增高只在根分裂时发生，从根往上长，所以所有叶子始终保持在同一层。',
      ['根分裂 → 树增高', '叶子始终同层', '从下往上生长']));

    /* 步骤5：继续插入 40,50 演示非根分裂：插入后 [30,40,50] 分裂 */
    steps.push(step(snap3({
      nodes: [{ keys: ['20'], cx: 500, y: Y1, st: 'idle' },
              { keys: ['10'], cx: 300, y: Y2, st: 'idle' },
              { keys: ['30', '40', '50'], cx: 700, y: Y2, st: 'bad' }],
      edges: [{ px: 475, py: Y1+H, cx: 300, cy: Y2 },
              { px: 525, py: Y1+H, cx: 700, cy: Y2 }],
      cap: '插入 40、50 后右孩子溢出：[30,40,50] 有 3 个关键字，中间 40 上移到父结点',
      stats: { '溢出结点': '[30,40,50]', '中间键': 40, '上移到': '根结点', '操作': '非根分裂' },
      notes: ['非根分裂：中间关键字 40 上移到父结点', '30 留在左，50 留在右', '父结点变成 [20,40]'] }), 3,
      '继续插入 40 和 50，右孩子结点变成 [30,40,50]，再次溢出。非根分裂：' +
      '中间关键字 40 上移到父结点（根）；30 和 50 分别留在两个新结点里。',
      ['非根分裂', '40 上移到根', '30/50 各留一侧']));

    steps.push(step(snap3({
      nodes: [{ keys: ['20', '40'], cx: 500, y: Y1, st: 'good' },
              { keys: ['10'], cx: 250, y: Y2, st: 'idle' },
              { keys: ['30'], cx: 500, y: Y2, st: 'done' },
              { keys: ['50'], cx: 750, y: Y2, st: 'done' }],
      edges: [{ px: 458, py: Y1+H, cx: 250, cy: Y2 },
              { px: 500, py: Y1+H, cx: 500, cy: Y2 },
              { px: 542, py: Y1+H, cx: 750, cy: Y2 }],
      cap: '分裂后：根变为 [20,40]，有 3 个孩子，树保持高度平衡',
      stats: { '根': '[20,40]', '孩子数': 3, '树高': 2, '关键字总数': 5 },
      notes: ['根现在有 2 个关键字，3 个孩子，合法', 'B 树高度平衡维持', '插入代价 O(log n)'],
      legend: '分裂沿路向上传播；若传播到根，根分裂，树增高一层，否则高度不变' }), 4,
      '分裂完成，根变为 [20,40]，三个叶子在同一层。B 树高度仍为 2，完全平衡。' +
      '插入的代价是 O(log n)——沿路查找加上最多 O(log n) 次分裂。',
      ['根变为 [20,40]', '高度平衡维持', '插入 O(log n)']));

    return steps;
  }

  /* ===== 场景四：B 树查找 ===== */
  function buildSearch() {
    var steps = [];
    /* 使用场景二的 3 阶 B 树：
     *         [35]
     *        /    \
     *    [20]    [45,60]
     *   /   \   /  |   \
     * [12] [28] [40][50][70]
     * 查找 50 */
    var Y1 = 152, Y2 = 196, Y3 = 240;
    var rootN = { keys: ['35'], cx: 500, y: Y1 };
    var lN    = { keys: ['20'], cx: 300, y: Y2 };
    var rN    = { keys: ['45','60'], cx: 700, y: Y2 };
    var ll    = { keys: ['12'], cx: 180, y: Y3 };
    var lm    = { keys: ['28'], cx: 360, y: Y3 };
    var rl    = { keys: ['40'], cx: 560, y: Y3 };
    var rm    = { keys: ['50'], cx: 700, y: Y3 };
    var rr    = { keys: ['70'], cx: 840, y: Y3 };
    var EDGES = [
      { px: 475, py: Y1+H, cx: 300, cy: Y2 },
      { px: 525, py: Y1+H, cx: 700, cy: Y2 },
      { px: 270, py: Y2+H, cx: 180, cy: Y3 },
      { px: 318, py: Y2+H, cx: 360, cy: Y3 },
      { px: 648, py: Y2+H, cx: 560, cy: Y3 },
      { px: 700, py: Y2+H, cx: 700, cy: Y3 },
      { px: 754, py: Y2+H, cx: 840, cy: Y3 }
    ];
    function mkNode(n, st) { return { keys: n.keys, cx: n.cx, y: n.y, st: st || 'idle' }; }
    function snap4(o) {
      return { hdr: o.hdr || 'B 树查找：每层一次 I/O，比较后选路',
               cap: o.cap || null, nodes: o.nodes, edges: EDGES,
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap4({
      nodes: [mkNode(rootN,'hot'),mkNode(lN),mkNode(rN),mkNode(ll),mkNode(lm),mkNode(rl),mkNode(rm),mkNode(rr)],
      cap: '查找 50：第 1 次 I/O 读入根结点 [35]，50 > 35，走右指针',
      stats: { '查找目标': 50, '当前结点': '[35]', 'I/O 次数': 1, '比较结果': '50>35→右' },
      notes: ['读入根结点（一次磁盘 I/O）', '与 35 比较：50 > 35', '走最右边的指针'] }), 1,
      '查找 50，从根开始。第 1 次 I/O 读入根结点 [35]。' +
      '在结点内顺序比较：50 > 35，应走 35 右边的指针，到下一层右孩子。',
      ['第 1 次 I/O', '50 > 35 → 走右', '']));

    steps.push(step(snap4({
      nodes: [mkNode(rootN,'done'),mkNode(lN),mkNode(rN,'hot'),mkNode(ll),mkNode(lm),mkNode(rl),mkNode(rm),mkNode(rr)],
      cap: '第 2 次 I/O 读入 [45,60]，50 在 45 和 60 之间，走中间指针',
      stats: { '当前结点': '[45,60]', 'I/O 次数': 2, '比较': '45<50<60', '选路': '中间指针' },
      notes: ['读入 [45,60]（第二次 I/O）', '45 < 50 < 60，走 45~60 之间的指针', '指向叶结点 [50]'] }), 2,
      '第 2 次 I/O 读入 [45, 60]。在结点内比较：45 < 50 < 60，走 45 和 60 之间的指针，指向叶结点。',
      ['第 2 次 I/O', '45<50<60 → 中间', '指向叶结点']));

    steps.push(step(snap4({
      nodes: [mkNode(rootN,'done'),mkNode(lN),mkNode(rN,'done'),mkNode(ll),mkNode(lm),mkNode(rl),mkNode(rm,'good'),mkNode(rr)],
      cap: '第 3 次 I/O 读入叶结点 [50]，50 = 50，查找成功！共 3 次 I/O，与树高相同',
      stats: { '查找目标': 50, '结果': '成功', 'I/O 次数': 3, '比较': '命中' },
      notes: ['读入叶结点 [50]（第三次 I/O）', '50 = 50，命中！', '总 I/O 次数 = 树高 = 3'],
      legend: 'B 树查找：最多 I/O 次数 = 树高 h = O(log_m n)；结点内查找代价可忽略' }), 4,
      '第 3 次 I/O 读入叶结点 [50]，命中。总共 3 次磁盘 I/O，等于树的高度。' +
      'B 树的高度是 O(log_m n)，m 越大树越矮，I/O 次数越少。这就是 B 树的核心价值。',
      ['第 3 次 I/O 命中', 'I/O 次数 = 树高', '树越宽越矮']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['b-tree'] = {
    title: 'B- 树（多路平衡查找树）',
    subtitle: '一个结点存 m−1 个关键字，减少磁盘 I/O 次数。插入满了就分裂，中间关键字上移；' +
      '树从下往上长，叶子始终在同一层。查找代价 = 树高 = O(log_m n)。',
    height: 700,
    code: [
      '// m 阶 B 树：每结点 ⌈m/2⌉-1 ~ m-1 个关键字',
      '// 插入：找到叶层位置插入；若结点满则分裂',
      '// 分裂：取中间关键字上移到父结点',
      '//       左半留原结点，右半给新结点',
      '// 若上移后父满，则父也分裂，直到根',
      '// 根分裂时创建新根，树高加 1'
    ],
    scenes: [
      { name: 'B 树的动机', build: buildWhy,
        codeTag: '磁盘 I/O 是瓶颈',
        code: [
          '// 磁盘 I/O ≈ 10ms，内存访问 ≈ 100ns，差 10 万倍',
          '// 二叉树高 log₂(n)，每层一次 I/O，太高',
          '// B 树：一结点存 m-1 个关键字，高度 log_m(n)',
          '// m = 1000 时，10 亿条记录树高约 3 层'
        ] },
      { name: '3 阶 B 树结构', build: buildStructure,
        codeTag: 'B 树定义与性质',
        code: [
          '// m 阶 B 树性质：',
          '// 1. 根 1 ~ m-1 个关键字',
          '// 2. 非根 ⌈m/2⌉-1 ~ m-1 个关键字',
          '// 3. 所有叶结点在同一层（高度平衡）',
          '// 4. 结点内关键字有序，指针夹在关键字之间'
        ] },
      { name: '插入与分裂', build: buildInsert,
        codeTag: '满则分裂，中键上移',
        code: [
          '// 插入步骤：',
          '// 1. 查找到叶层的适当位置',
          '// 2. 将关键字插入结点（保持有序）',
          '// 3. 若结点关键字数 > m-1，则分裂：',
          '//    取第 ⌈m/2⌉ 个关键字上移父结点',
          '//    左右各成一个新结点；若父满则继续分裂'
        ] },
      { name: 'B 树查找', build: buildSearch,
        codeTag: '每层一次 I/O',
        code: [
          '// 从根开始，每层读入一个结点（一次 I/O）',
          '// 结点内顺序比较（或二分）找到下一层',
          '// 找到关键字则返回；到叶层未找到则失败',
          '// 最多 I/O 次数 = 树高 h = O(log_m n)',
          '// 结点内比较代价远小于一次 I/O，可忽略'
        ] }
    ]
  };
})();