/* B+ 树 — 第9章
 * 场景一：B+ 树与 B 树的区别（内部结点只索引，所有关键字在叶子）
 * 场景二：单点查找（必须走到叶子）
 * 场景三：范围查询（定位 + 沿叶子链表扫描）
 */
(function () {
  var D = window.VizDraw;

  var W = 36, H = 32;

  /* 画 B+ 树结点：与 B 树类似，但区分内部结点（只有关键字，无数据）和叶结点（有数据） */
  function drawBPNode(g, keys, cx, y, isLeaf, st) {
    var n = keys.length;
    var slotW = isLeaf ? W : W * 0.6;
    var total = isLeaf ? n * W : (n + 1) * slotW + n * W;
    var x0 = cx - total / 2;
    if (!isLeaf) {
      for (var i = 0; i <= n; i++) {
        var px = x0 + i * (W + slotW);
        var fill = D.C['mute'].fill;
        g.appendChild(D.el('rect', { x: px, y: y, width: slotW, height: H,
          rx: 3, fill: fill, stroke: '#3a4d6e', 'stroke-width': 1 }));
      }
    }
    for (var j = 0; j < n; j++) {
      var kx = isLeaf ? x0 + j * W : x0 + (j + 1) * slotW + j * W;
      var sc = D.C[st || 'idle'];
      g.appendChild(D.el('rect', { x: kx, y: y, width: W, height: H,
        rx: 3, fill: sc.fill, stroke: sc.stroke, 'stroke-width': 1.6 }));
      g.appendChild(D.text(keys[j],
        { x: kx + W / 2, y: y + H / 2 + 6, 'class': 'vz-cellval',
          fill: '#eef3ff', 'text-anchor': 'middle' }));
    }
    return { x0: x0, total: total };
  }

  function drawEdge(g, px, py, cx, cy) {
    D.link(g, { x1: px, y1: py, x2: cx, y2: cy,
      kind: 'next', arrow: false, width: 1.5 });
  }

  /* 叶结点之间的横向链接箭头 */
  function drawChain(g, x1, x2, y) {
    D.link(g, { x1: x1, y1: y + H / 2, x2: x2, y2: y + H / 2,
      kind: 'hot', arrow: true, width: 1.8 });
  }

  function render(ctx, f) {
    D.clear(ctx.stage);
    if (f.hdr) ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) ctx.stage.appendChild(D.text(f.cap,
      { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    var i;
    for (i = 0; i < (f.edges || []).length; i++) {
      var e = f.edges[i];
      drawEdge(ctx.stage, e.px, e.py, e.cx, e.cy);
    }
    for (i = 0; i < (f.chains || []).length; i++) {
      var c = f.chains[i];
      drawChain(ctx.stage, c.x1, c.x2, c.y);
    }
    for (i = 0; i < (f.nodes || []).length; i++) {
      var nd = f.nodes[i];
      drawBPNode(ctx.stage, nd.keys, nd.cx, nd.y, nd.isLeaf, nd.st);
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

  /* B+ 树示例（3 阶）：
   *      内部: [20, 40]
   *      /        |       \
   *  叶[10,20]  叶[30,40]  叶[50,60]
   *  叶之间用链接串联 */
  var Y1 = 155, Y2 = 215;
  /* 内部结点：cx=500，叶结点：cx=200,500,800 */
  var INT = { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false };
  var L1  = { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true };
  var L2  = { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true };
  var L3  = { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true };
  /* 内部结点的三个指针槽位置（近似）：slotW=W*0.6≈22, 22+36+22=80间隔 */
  /* 内部结点 total=(3*22)+(2*36)=66+72=138, x0=500-69=431 */
  /* 指针槽中心：431+11=442, 431+22+36+11=500, 431+22+36+22+36+11=558 */
  var EDGES = [
    { px: 442, py: Y1+H, cx: 200, cy: Y2 },
    { px: 500, py: Y1+H, cx: 500, cy: Y2 },
    { px: 558, py: Y1+H, cx: 800, cy: Y2 }
  ];
  /* 叶链：L1右边 → L2左边, L2右边 → L3左边 */
  /* L1: total=2*36=72, x0=200-36=164, 右边=164+72=236 */
  /* L2: x0=500-36=464, 右边=464+72=536, 左边=464 */
  /* L3: x0=800-36=764, 左边=764 */
  var CHAINS = [
    { x1: 236, x2: 464, y: Y2 },
    { x1: 536, x2: 764, y: Y2 }
  ];

  /* ===== 场景一：B+ 树与 B 树的区别 ===== */
  function buildDiff() {
    var steps = [];
    function snap(o) {
      return { hdr: o.hdr || 'B+ 树：内部结点只做索引，所有数据在叶子',
               cap: o.cap || null, nodes: o.nodes || [], edges: o.edges || [],
               chains: o.chains || [],
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'active' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true, st: 'idle' },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true, st: 'idle' },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true, st: 'idle' }
      ], edges: EDGES, chains: CHAINS,
      cap: 'B+ 树：内部结点只存关键字（索引），所有记录只在叶结点；叶结点通过链表串联',
      stats: { '内部结点': '只存索引关键字', '叶结点': '存全部关键字+数据', '叶间': '链表相连', '树高': 2 },
      notes: ['内部结点关键字只用于引路，不代表实际记录', '所有关键字都在叶层，叶层是数据的全集', '叶结点之间有前后指针，支持顺序扫描'] }), 0,
      'B+ 树与 B 树最大的区别：内部结点的关键字只是索引（引路牌），不携带实际数据；' +
      '所有关键字（含数据指针）只在叶子结点存放。叶结点之间还有链表指针，串成有序链。',
      ['内部只索引', '所有数据在叶子', '叶子串成链表']));

    steps.push(step(snap({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'hot' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true, st: 'idle' },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true, st: 'idle' },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true, st: 'idle' }
      ], edges: EDGES, chains: CHAINS,
      cap: 'B+ 树内部结点的关键字是叶结点最大值（或最小值）的副本，用于引导查找走向正确的叶结点',
      stats: { '20 含义': '左子树最大值 ≤ 20', '40 含义': '中子树最大值 ≤ 40', '查找规则': 'key≤20→左 20<key≤40→中 key>40→右', '内部关键字': '副本，不是原始记录' },
      notes: ['内部关键字 20：左叶子关键字都 ≤ 20', '内部关键字 40：中叶子关键字都 ≤ 40', '和 B 树不同：内部关键字只引路，叶子才是真实记录'] }), 1,
      '内部结点的 20 和 40 是叶子的边界副本，作用是告诉你：' +
      '小于等于 20 去左叶，20 到 40 之间去中叶，大于 40 去右叶。' +
      '叶子里才是真正的记录。',
      ['内部关键字是副本', '只用于引路', '叶子是真实记录']));

    steps.push(step(snap({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'idle' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true, st: 'done' },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true, st: 'done' },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true, st: 'done' }
      ], edges: EDGES, chains: CHAINS,
      cap: '叶结点之间的链表让 B+ 树天然支持范围查询：找到起点，沿链扫即可',
      stats: { 'B 树范围查询': '需反复回溯', 'B+ 树范围查询': '定位+顺序扫链', '优势': '范围查询高效', '数据库': '广泛使用 B+ 树' },
      notes: ['B 树范围查询需要反复在树上回溯', 'B+ 树只需找到起始叶结点，然后沿链向右扫', '数据库索引普遍用 B+ 树，原因就在于此'],
      legend: 'B+ 树 vs B 树：B+ 更适合范围查询和顺序访问；B 树每个结点都有数据，单点访问稍快' }), 2,
      '叶结点链表是 B+ 树的核心优势：范围查询 [a, b] 只需先定位到 a，然后顺着链表向右扫到 b，' +
      '不需要回溯树结构。这正是关系数据库普遍选用 B+ 树作为索引结构的原因。',
      ['链表支持范围查询', '扫链不需回溯', '数据库首选']));

    return steps;
  }

  /* ===== 场景二：单点查找 ===== */
  function buildPointSearch() {
    var steps = [];
    function snap2(o) {
      return { hdr: o.hdr || 'B+ 树单点查找：必须走到叶结点',
               cap: o.cap || null, nodes: o.nodes || [], edges: o.edges || [],
               chains: o.chains || [],
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    /* 查找 30 */
    steps.push(step(snap2({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'hot' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true }
      ], edges: EDGES, chains: CHAINS,
      cap: '查找 30：读入根（内部结点 [20,40]）。30 > 20，转向 20~40 之间的指针',
      stats: { '查找目标': 30, '当前': '[20,40]', '比较': '20<30≤40', '方向': '中间指针' },
      notes: ['读入内部结点 [20,40]（第 1 次 I/O）', '30 > 20 且 30 ≤ 40', '走 20 和 40 之间的指针'] }), 0,
      '查找 30。第 1 次 I/O 读入内部结点 [20,40]。' +
      '20 < 30 ≤ 40，走 20 和 40 之间的指针（中间指针）。',
      ['第 1 次 I/O', '20<30≤40 → 中间', '']));

    steps.push(step(snap2({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'done' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true, st: 'good' },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true }
      ], edges: EDGES, chains: CHAINS,
      cap: '第 2 次 I/O 读入叶结点 [30,40]，在叶子里找到 30 = 30，查找成功',
      stats: { '查找目标': 30, '叶结点': '[30,40]', 'I/O 次数': 2, '结果': '命中' },
      notes: ['读入叶结点 [30,40]（第 2 次 I/O）', '在叶子里顺序找到 30，命中', 'B+ 查找必须走到叶子，即使内部结点有相同关键字'] }), 1,
      '第 2 次 I/O 读入叶结点 [30,40]，找到 30，查找成功。' +
      '注意：B+ 树查找必须走到叶子——即使内部结点中恰好也有 30 这个关键字（如果有的话），' +
      '也不能在内部结点停下来，必须继续到叶子，因为实际数据只在叶子里。',
      ['必须走到叶子', '叶子才有真实数据', '2 次 I/O 命中']));

    steps.push(step(snap2({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'done' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true, st: 'bad' },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true }
      ], edges: EDGES, chains: CHAINS,
      cap: '若查找 35：叶结点 [30,40] 里找不到 35（30<35<40），返回查找失败',
      stats: { '查找目标': 35, '叶结点': '[30,40]', 'I/O 次数': 2, '结果': '失败' },
      notes: ['到达叶结点后在叶子里顺序查找', '30 < 35 < 40，叶里没有 35', '查找失败，不需要回溯'],
      legend: 'B+ 树单点查找：沿内部结点引路，到叶结点查找，失败则在叶子里确定，无需回溯' }), 2,
      '查找 35：同样经过 2 次 I/O 到达叶结点 [30,40]，在叶子里查找 35，' +
      '发现 30 < 35 < 40，叶里没有 35，查找失败。失败确定在叶子，不需要回溯。',
      ['失败在叶子确定', '无需回溯', '2 次 I/O']));

    return steps;
  }

  /* ===== 场景三：范围查询 ===== */
  function buildRangeSearch() {
    var steps = [];
    function snap3(o) {
      return { hdr: o.hdr || 'B+ 树范围查询：定位起点，顺链扫描',
               cap: o.cap || null, nodes: o.nodes || [], edges: o.edges || [],
               chains: o.chains || [],
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    /* 范围查询 [20, 50] */
    steps.push(step(snap3({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'hot' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true }
      ], edges: EDGES, chains: CHAINS,
      cap: '范围查询 [20, 50]：第一步与单点查找相同——先定位到下界 20 所在的叶结点',
      stats: { '范围下界': 20, '范围上界': 50, 'I/O 次数': 1, '操作': '定位下界' },
      notes: ['范围查询第一步：按单点查找定位 20', '20 ≤ 20，走左指针', '找到 20 所在的叶结点后开始扫描'] }), 0,
      '范围查询 [20, 50]，即找所有满足 20 ≤ key ≤ 50 的记录。' +
      '第一步和单点查找一样：从根出发定位到下界 20 所在的叶结点。' +
      '20 ≤ 20，走左指针，到第一个叶结点。',
      ['定位下界 20', '走左指针', '']));

    steps.push(step(snap3({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'done' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true, st: 'active' },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true }
      ], edges: EDGES, chains: CHAINS,
      cap: '到达叶结点 [10,20]：在叶子里找 20，找到了！收集 20，然后沿链向右',
      stats: { '当前叶': '[10,20]', '收集': 20, '下一叶': '[30,40]', '扫描': '沿链向右' },
      notes: ['读入叶结点 [10,20]（第 2 次 I/O）', '10 < 20，跳过；20 ≤ 50，收集 20', '沿链指针读下一个叶结点'] }), 1,
      '到达叶结点 [10,20]，在叶子里找 20：10 < 20，跳过；20 满足条件，收集。' +
      '继续看这个叶的后续——已到末尾，沿链指针到下一个叶结点 [30,40]。',
      ['收集 20', '叶内扫完', '沿链向右']));

    steps.push(step(snap3({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'done' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true, st: 'done' },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true, st: 'active' },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true }
      ], edges: EDGES, chains: CHAINS,
      cap: '顺链到叶结点 [30,40]：30 和 40 都 ≤ 50，全部收集，再沿链到下一叶',
      stats: { '当前叶': '[30,40]', '收集': '30, 40', '下一叶': '[50,60]', '已收集': '20,30,40' },
      notes: ['沿链读 [30,40]（第 3 次 I/O）', '30 ≤ 50，收集；40 ≤ 50，收集', '沿链到 [50,60]'] }), 2,
      '沿链到叶结点 [30,40]，30 ≤ 50 收集，40 ≤ 50 收集。继续沿链到 [50,60]。',
      ['收集 30, 40', '沿链继续', '累计 3 个']));

    steps.push(step(snap3({
      nodes: [
        { keys: ['20', '40'], cx: 500, y: Y1, isLeaf: false, st: 'done' },
        { keys: ['10', '20'], cx: 200, y: Y2, isLeaf: true, st: 'done' },
        { keys: ['30', '40'], cx: 500, y: Y2, isLeaf: true, st: 'done' },
        { keys: ['50', '60'], cx: 800, y: Y2, isLeaf: true, st: 'active' }
      ], edges: EDGES, chains: CHAINS,
      cap: '顺链到叶结点 [50,60]：50 ≤ 50 收集；60 > 50 停止。范围查询结束，共收集 20,30,40,50',
      stats: { '当前叶': '[50,60]', '收集': 50, '停止': '60>50', '最终结果': '20,30,40,50' },
      notes: ['沿链读 [50,60]（第 4 次 I/O）', '50 ≤ 50，收集；60 > 50，停止扫描', '总共 4 次 I/O，收集了 4 个关键字'],
      legend: 'B+ 树范围查询只需「一次定位 + 顺序扫链」，比 B 树的「反复回溯」快得多' }), 3,
      '到叶结点 [50,60]：50 满足收集，60 > 50 停止。' +
      '整个范围查询 [20,50] 共 4 次磁盘 I/O，结果是 20,30,40,50。' +
      '关键：找到起点后只需顺链扫描，不需要回到树上，这是 B+ 树相比 B 树的最大优势。',
      ['收集 50，60>50 停止', '共 4 次 I/O', '顺链扫描，高效']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['b-plus-tree'] = {
    title: 'B+ 树',
    subtitle: 'B 树的变体：内部结点只存索引关键字，所有数据在叶结点；叶结点串成有序链表。' +
      '单点查找必须到达叶子；范围查询只需定位起点，沿链扫描，无需回溯。',
    height: 700,
    code: [
      '// B+ 树 vs B 树：',
      '// B 树：内部结点既索引又存数据',
      '// B+ 树：内部结点只存关键字（索引）',
      '//        所有记录 + 数据指针只在叶结点',
      '//        叶结点串成双向（或单向）链表',
      '// 范围查询：定位下界叶结点，顺链扫描'
    ],
    scenes: [
      { name: 'B+ 树的结构特点', build: buildDiff,
        codeTag: '内部只索引，叶子存数据',
        code: [
          '// B+ 树特点：',
          '// 1. 内部结点：只存关键字，不存数据，仅用于引路',
          '// 2. 叶结点：存所有关键字+数据（或数据指针）',
          '// 3. 叶结点之间有前后指针，串成有序链表',
          '// 4. 内部关键字是叶子的副本（边界值）'
        ] },
      { name: '单点查找', build: buildPointSearch,
        codeTag: '必须走到叶结点',
        code: [
          '// 单点查找 key：',
          '// 1. 从根出发，按关键字引路向下',
          '// 2. 到达叶结点（I/O 次数 = 树高）',
          '// 3. 在叶结点内顺序查找',
          '// 注意：即使内部结点有相同关键字也不能停'
        ] },
      { name: '范围查询', build: buildRangeSearch,
        codeTag: '定位起点+顺链扫描',
        code: [
          '// 范围查询 [lo, hi]：',
          '// 1. 按单点查找定位 lo 所在的叶结点',
          '// 2. 在叶结点内找到 lo，开始收集',
          '// 3. 沿叶链向右顺序扫描',
          '// 4. 遇到 key > hi 停止',
          '// 代价：O(log n) 定位 + O(k) 扫描（k=结果数）'
        ] }
    ]
  };
})();

