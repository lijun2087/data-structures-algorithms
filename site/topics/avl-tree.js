/* AVL 平衡二叉树 — 第9章
 * 场景一：平衡因子与为什么要平衡（承接 BST 退化）
 * 场景二：LL 与 RR 单旋转
 * 场景三：LR 与 RL 双旋转
 * 场景四：结论——树高稳定在 O(log n)
 */
(function () {
  var D = window.VizDraw;

  var X0 = 50, SPAN = 900, Y0 = 160, DY = 44, R = 16;

  function levelOf(i) { var L = 1, f = 1; while (f * 2 <= i) { f *= 2; L++; } return L; }
  function xOf(i) {
    var L = levelOf(i), k = 1, f = 1, q;
    for (q = 1; q < L; q++) { k *= 2; f *= 2; }
    return X0 + SPAN * (i - f + 0.5) / k;
  }
  function yOf(i) { return Y0 + (levelOf(i) - 1) * DY; }
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* 画树：V={id:val}，st={id:state}，bf={id:平衡因子字符串} */
  function drawAVL(g, V, st, bf) {
    var ids = [], i;
    for (i in V) ids.push(+i);
    for (var j = 0; j < ids.length; j++) {
      i = ids[j];
      if (i === 1) continue;
      var par = i >> 1;
      if (V[par] === undefined) continue;
      D.link(g, { x1: xOf(par), y1: yOf(par) + R,
        x2: xOf(i), y2: yOf(i) - R - 2,
        kind: (st && st[i] === 'hot') ? 'hot' : 'next',
        arrow: false, width: (st && st[i] === 'hot') ? 2.4 : 1.6 });
    }
    for (var k = 0; k < ids.length; k++) {
      i = ids[k];
      D.circleNode(g, { x: xOf(i), y: yOf(i), r: R,
        state: (st && st[i]) || 'idle', value: V[i] });
      if (bf && bf[i] !== undefined) {
        g.appendChild(D.text(bf[i],
          { x: xOf(i) + R + 4, y: yOf(i) - R - 2,
            'class': 'vz-tag', fill: bf[i] === '0' ? '#6ceaa5' : '#ffd166',
            'font-size': 11, 'text-anchor': 'start' }));
      }
    }
  }

  function render(ctx, f) {
    D.clear(ctx.stage);
    if (f.hdr) ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) ctx.stage.appendChild(D.text(f.cap,
      { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    if (f.V) drawAVL(ctx.stage, f.V, f.st, f.bf);
    if (f.V2) drawAVL(ctx.stage, f.V2, f.st2, f.bf2);
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

  /* ===== 场景一：平衡因子的定义 ===== */
  function buildBalance() {
    var steps = [];
    /* 平衡树：1=45,2=20,3=70,4=12,5=35,6=55,7=80 */
    var BAL = { 1: 45, 2: 20, 3: 70, 4: 12, 5: 35, 6: 55, 7: 80 };
    /* 退化树（升序插入 12 20 35 45）：1=12,3=20,7=35,15=45 */
    var DEG = { 1: 12, 3: 20, 7: 35, 15: 45 };
    var BF_BAL = { 1: '0', 2: '0', 3: '0', 4: '0', 5: '0', 6: '0', 7: '0' };
    var BF_DEG = { 1: '-2', 3: '-2', 7: '-2', 15: '0' };

    function snap(o) {
      return { hdr: o.hdr || 'AVL 树：平衡因子 = 左子树高 − 右子树高',
               cap: o.cap || null, V: o.V, st: o.st || {}, bf: o.bf || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap({
      V: BAL, bf: BF_BAL,
      cap: '平衡二叉树（AVL）：每个结点的左右子树高度差（平衡因子）绝对值 ≤ 1',
      stats: { '平衡因子': '左高−右高', '合法值': '-1 / 0 / 1', '结点数': 7, '树高': 3 },
      notes: ['平衡因子 = 左子树高度 − 右子树高度',
        '|平衡因子| ≤ 1 才算平衡结点',
        '每个结点都平衡，整棵树才是 AVL 树'] }), 0,
      'AVL 树在 BST 的基础上加了一条约束：每个结点的左右子树高度差不超过 1。' +
      '这个差值叫「平衡因子」。图中每个结点旁边的数字就是它的平衡因子——这棵树每个都是 0，完全平衡。',
      ['平衡因子 = 左高 − 右高', '合法值：-1、0、1', '每个结点都需满足']));

    steps.push(step(snap({
      V: DEG, bf: BF_DEG,
      cap: '升序插入后退化成右单支链：根平衡因子 = 0−3 = −3，严重失衡',
      stats: { '退化树高': 4, '根平衡因子': -3, '查找时间': 'O(n)', '问题': '失去平衡' },
      notes: ['12→20→35→45 升序插入，每次都往右',
        '根 12 的左高=0，右高=3，差值=−3',
        '查找 45 要比较 4 次，退化成链表'] }), 1,
      'BST 按升序 12 20 35 45 插入，每次新结点都比已有的大，所以一路向右，变成一条链。' +
      '根结点 12 的平衡因子是 0−3=−3，远超允许的 ±1。这正是为什么需要 AVL 树——要在插入时检测并修复失衡。',
      ['升序插入 → 单支链', '平衡因子 = −3', '引出旋转修复']));

    steps.push(step(snap({
      V: BAL, bf: BF_BAL,
      legend: 'AVL 保证树高 ≤ 1.44 log₂(n+2)，查找最多 O(log n) 次比较',
      stats: { 'BST 最坏': 'O(n)', 'AVL 保证': 'O(log n)', '修复手段': '旋转', '旋转种类': '4种' },
      notes: ['AVL 每次插入后从插入点向上检查平衡因子',
        '若某结点失衡，用旋转操作恢复',
        '旋转分 LL、RR、LR、RL 四种'] }), 2,
      '均衡插入的 AVL 树，所有平衡因子都是 0。AVL 树的高度严格不超过 1.44 log n，' +
      '查找始终是 O(log n)。失衡时用旋转来修复，旋转分 4 种：LL、RR、LR、RL。',
      ['AVL 高度 ≤ 1.44 log n', '旋转修复失衡', '4 种旋转覆盖所有情况']));

    return steps;
  }

  /* ===== 场景二：LL 与 RR 单旋转 =====
   * LL：在结点 A 的左孩子 B 的左子树插入，A 失衡。
   *      右旋：B 升为根，A 降为 B 的右孩子，B 原来的右子树挂到 A 左边。
   *          A(bf=-2)           B(bf=0)
   *         /                  / \
   *        B(bf=-1)   →       C   A
   *       /
   *      C(新插)
   * 用具体数值：插入前 A=30,B=20,A无右; 插入 C=10 后失衡
   */
  function buildLLRR() {
    var steps = [];

    /* LL 旋转演示 */
    /* 初始: 1=30, 2=20, 无右子树 */
    var LLbefore = { 1: 30, 2: 20 };
    /* 插入 10(id=4) 后失衡 */
    var LLunbal  = { 1: 30, 2: 20, 4: 10 };
    /* LL 右旋后: 以20为新根，30为右孩子，10为左孩子 */
    /* 新编号: 1=20, 2=10, 3=30 */
    var LLafter  = { 1: 20, 2: 10, 3: 30 };
    var BF_LLunbal = { 1: '-2', 2: '-1', 4: '0' };
    var BF_LLafter = { 1: '0',  2: '0',  3: '0'  };

    function snap2(o) {
      return { hdr: o.hdr || 'LL 单旋转：在左孩子的左子树插入，右旋一次解决',
               cap: o.cap || null, V: o.V, st: o.st || {}, bf: o.bf || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap2({
      V: LLbefore, bf: { 1: '0', 2: '0' },
      cap: '初始两结点树：30 为根，20 为左孩子，平衡因子均为 0',
      stats: { '根': 30, '左孩子': 20, '平衡': '是', '树高': 2 },
      notes: ['目前平衡因子均为 0', '即将在 20 的左边插入 10', 'LL 情形：在左孩子的左子树插入'] }), 0,
      'LL 情形演示。起始树：30 是根，20 是左孩子，两个结点都平衡。即将在 20 的左边插入 10，' +
      '这是「在根 30 的左孩子 20 的左子树插入」，即 LL 情形。',
      ['初始平衡', '即将 LL 插入', '观察平衡因子变化']));

    steps.push(step(snap2({
      V: LLunbal, st: { 1: 'bad', 2: 'hot', 4: 'good' }, bf: BF_LLunbal,
      cap: '插入 10 后：20 的平衡因子 = −1，30 的平衡因子 = −2，30 失衡！',
      stats: { '插入': 10, '失衡结点': 30, '平衡因子': -2, '失衡类型': 'LL' },
      notes: ['30 的左高=2，右高=0，差=−2，失衡', '最近失衡祖先是 30', 'LL：失衡结点的左孩子的左子树插入'] }), 1,
      '插入 10 后，往上更新平衡因子：20 变成 −1，继续向上，30 变成 −2，超过了允许的范围。' +
      '30 是最近的失衡结点，失衡类型是 LL（在 30 的左孩子 20 的左子树插入）。需要做右旋。',
      ['30 失衡，bf=−2', 'LL 类型', '需要右旋']));

    steps.push(step(snap2({
      V: LLafter, st: { 1: 'good', 2: 'done', 3: 'done' }, bf: BF_LLafter,
      cap: 'LL 右旋完成：20 升为新根，10 仍是左孩子，30 降为右孩子，三者平衡因子全为 0',
      stats: { '新根': 20, '左孩子': 10, '右孩子': 30, '旋转后平衡': '是' },
      notes: ['20 升为根，30 降为 20 的右孩子', '若 20 原有右子树，挂到 30 左边', 'BST 性质：10<20<30，正确'],
      legend: 'LL 右旋口诀：左孩子升为根，原根降为其右孩子，左孩子的右子树改挂原根的左边' }), 2,
      '右旋：20 升为新根，原根 30 降为 20 的右孩子，20 原来的右子树（本例为空）挂到 30 的左边。' +
      '旋转后三个结点平衡因子全归零，BST 性质也保持（10<20<30）。旋转只改三条指针，O(1) 完成。',
      ['右旋：20 升为根', '30 降为右孩子', '平衡恢复，O(1)']));

    /* RR 旋转演示 */
    var RRbefore = { 1: 10, 3: 20 };
    var RRunbal  = { 1: 10, 3: 20, 7: 30 };
    var RRafter  = { 1: 20, 2: 10, 3: 30 };
    var BF_RRunbal = { 1: '2', 3: '1', 7: '0' };
    var BF_RRafter = { 1: '0', 2: '0', 3: '0' };

    function snap2r(o) {
      return { hdr: o.hdr || 'RR 单旋转：在右孩子的右子树插入，左旋一次解决',
               cap: o.cap || null, V: o.V, st: o.st || {}, bf: o.bf || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap2r({
      V: RRunbal, st: { 1: 'bad', 3: 'hot', 7: 'good' }, bf: BF_RRunbal,
      cap: '插入 30 后：10 的平衡因子 = 2，失衡！RR 情形——在右孩子的右子树插入',
      stats: { '插入': 30, '失衡结点': 10, '平衡因子': 2, '失衡类型': 'RR' },
      notes: ['10 的左高=0，右高=2，差=2，失衡', 'RR：失衡结点右孩子的右子树插入', '做左旋解决'] }), 3,
      'RR 情形：在根 10 的右孩子 20 的右子树插入了 30，10 的平衡因子变成 2，失衡。' +
      'RR 是 LL 的镜像，解法是左旋——20 升为根，10 降为 20 的左孩子。',
      ['RR：右孩子右子树', '10 失衡，bf=2', '需要左旋']));

    steps.push(step(snap2r({
      V: RRafter, st: { 1: 'good', 2: 'done', 3: 'done' }, bf: BF_RRafter,
      cap: 'RR 左旋完成：20 升为根，10 降为左孩子，30 仍是右孩子，平衡恢复',
      stats: { '新根': 20, '左孩子': 10, '右孩子': 30, '旋转后平衡': '是' },
      notes: ['20 升为根，10 降为左孩子', '若 20 原有左子树，挂到 10 右边', 'LL 右旋与 RR 左旋完全对称'],
      legend: 'RR 左旋口诀：右孩子升为根，原根降为其左孩子，右孩子的左子树改挂原根的右边' }), 4,
      '左旋完成，20 升为新根，10 降为左孩子，平衡因子全部归零。' +
      'LL 和 RR 都只需一次旋转，代价是 O(1)，不影响查找的 O(log n) 性能。',
      ['左旋：20 升为根', '10 降为左孩子', 'LL/RR 各一次旋转']));

    return steps;
  }

  /* ===== 场景三：LR 与 RL 双旋转 =====
   * LR：在结点 A 的左孩子 B 的右子树插入。
   *     先对 B 左旋，再对 A 右旋。
   * RL：LR 的镜像，先对右孩子右旋，再对 A 左旋。
   */
  function buildLRRL() {
    var steps = [];
    var LRunbal  = { 1: 30, 2: 10, 5: 20 };
    var LRmid    = { 1: 30, 2: 20, 4: 10 };
    var LRafter  = { 1: 20, 2: 10, 3: 30 };
    var BF_LRunbal = { 1: '-2', 2: '1', 5: '0' };
    var BF_LRmid   = { 1: '-2', 2: '0', 4: '0' };
    var BF_LRafter = { 1: '0', 2: '0', 3: '0' };

    function snap3(o) {
      return { hdr: o.hdr || 'LR 双旋转：在左孩子的右子树插入，先左旋后右旋',
               cap: o.cap || null, V: o.V, st: o.st || {}, bf: o.bf || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap3({
      V: LRunbal, st: { 1: 'bad', 2: 'hot', 5: 'good' }, bf: BF_LRunbal,
      cap: '插入 20 后：30 的平衡因子 = −2，LR 情形——在左孩子 10 的右子树插入',
      stats: { '失衡结点': 30, '失衡类型': 'LR', '左孩子': 10, '新结点': 20 },
      notes: ['30 左高=2，右高=0，差=−2', '新结点 20 在 10 的右边：LR', '一次右旋解决不了'] }), 0,
      'LR 情形：30 失衡，新结点 20 插在 30 的左孩子 10 的右边。' +
      '直接对 30 右旋不能解决问题，需要先对 10 左旋，把 20 提上来变成 LL 形状，再对 30 右旋。',
      ['LR：左孩子右子树', '30 失衡 bf=−2', '两次旋转']));

    steps.push(step(snap3({
      V: LRmid, st: { 1: 'hot', 2: 'good', 4: 'done' }, bf: BF_LRmid,
      cap: '第一步：对 10 做左旋，20 升为 30 的左孩子，10 降为 20 的左孩子，变成 LL 形',
      stats: { '第一次旋转': '10 左旋', '结果形状': 'LL', '30 bf': -2, '下一步': '30 右旋' },
      notes: ['20 升为 30 的左孩子', '10 降为 20 的左孩子', '现在是 LL 形状，再右旋一次'] }), 1,
      '第一步对 10 做左旋：20 升为 30 的左孩子，10 降为 20 的左孩子。' +
      '现在 30 的左子树变成了 LL 的形状（左孩子 20，20 的左孩子 10），再对 30 做右旋就搞定了。',
      ['第一旋：10 左旋', '变成 LL 形状', '准备对 30 右旋']));

    steps.push(step(snap3({
      V: LRafter, st: { 1: 'good', 2: 'done', 3: 'done' }, bf: BF_LRafter,
      cap: 'LR 双旋完成：20 升为新根，10 在左，30 在右，平衡因子全为 0',
      stats: { '新根': 20, '左孩子': 10, '右孩子': 30, '旋转次数': 2 },
      notes: ['20 升为根，10/30 分居两侧', 'BST 性质：10<20<30，正确', 'LR 双旋 = 先左后右'],
      legend: 'LR 双旋口诀：先对失衡结点的左孩子做 RR 左旋，再对失衡结点做 LL 右旋' }), 2,
      '第二步对 30 右旋：20 升为新根，10 在左，30 在右。LR 双旋完成，三个结点平衡因子全为 0。' +
      'LR 双旋口诀：先对左孩子左旋，再对失衡结点右旋。总共改 4~6 条指针，仍然 O(1)。',
      ['双旋完成：20 为根', 'BST 性质保持', 'LR = 先左后右']));

    /* RL 演示 */
    var RLunbal = { 1: 10, 3: 30, 6: 20 };
    var RLmid   = { 1: 10, 3: 20, 7: 30 };
    var RLafter2 = { 1: 20, 2: 10, 3: 30 };
    var BF_RLunbal = { 1: '2', 3: '-1', 6: '0' };
    var BF_RLafter = { 1: '0', 2: '0', 3: '0' };

    function snap3r(o) {
      return { hdr: o.hdr || 'RL 双旋转：在右孩子的左子树插入，先右旋后左旋',
               cap: o.cap || null, V: o.V, st: o.st || {}, bf: o.bf || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap3r({
      V: RLunbal, st: { 1: 'bad', 3: 'hot', 6: 'good' }, bf: BF_RLunbal,
      cap: '插入 20 后：10 的平衡因子 = 2，RL 情形——在右孩子 30 的左子树插入',
      stats: { '失衡结点': 10, '失衡类型': 'RL', '右孩子': 30, '新结点': 20 },
      notes: ['10 左高=0，右高=2，差=2', 'RL：失衡结点右孩子的左子树插入', 'LR 的镜像，先右旋后左旋'] }), 3,
      'RL 情形：10 失衡，新结点 20 插在 10 的右孩子 30 的左边。这是 LR 的镜像。' +
      '先对 30 做右旋，把 20 提上来变成 RR 形状，再对 10 做左旋。',
      ['RL：右孩子左子树', '10 失衡 bf=2', 'LR 的镜像']));

    steps.push(step(snap3r({
      V: RLafter2, st: { 1: 'good', 2: 'done', 3: 'done' }, bf: BF_RLafter,
      cap: 'RL 双旋完成：先右旋 30，再左旋 10，20 升为根，10/30 分居两侧',
      stats: { '新根': 20, '左孩子': 10, '右孩子': 30, '旋转次数': 2 },
      notes: ['RL = 先对右孩子右旋，再对失衡结点左旋', 'LR/RL 各需两次旋转', '四种情形覆盖所有失衡类型'],
      legend: 'RL 口诀：先对右孩子做 LL 右旋，再对失衡结点做 RR 左旋（与 LR 完全对称）' }), 4,
      'RL 双旋：先对 30 右旋，20 升为 10 的右孩子；再对 10 左旋，20 升为新根。' +
      '四种旋转（LL、RR、LR、RL）覆盖了所有失衡情形，每种旋转代价均为 O(1)。',
      ['RL = 先右后左', 'LR/RL 各两次旋转', '四种覆盖所有失衡']));

    return steps;
  }

  /* ===== 场景四：结论——树高 O(log n) ===== */
  function buildConclusion() {
    var steps = [];
    /* 完整演示插入 10,20,30,40,50 进 AVL 树的过程结果 */
    /* 最终均衡树形：以 20 为根，10 左，40 右，30/50 为 40 子 */
    var AVL5 = { 1: 20, 2: 10, 3: 40, 6: 30, 7: 50 };
    var BST5 = { 1: 10, 3: 20, 7: 30, 15: 40, 31: 50 };
    var BF5  = { 1: '0', 2: '0', 3: '0', 6: '0', 7: '0' };

    function snap4(o) {
      return { hdr: o.hdr || 'AVL 结论：树高始终稳定在 O(log n)',
               cap: o.cap || null, V: o.V, st: o.st || {}, bf: o.bf || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap4({
      V: BST5, st: { 1: 'bad', 3: 'bad', 7: 'bad', 15: 'bad', 31: 'bad' },
      bf: { 1: '-4', 3: '-3', 7: '-2', 15: '-1', 31: '0' },
      cap: '普通 BST 按升序插入 10→20→30→40→50，退化成右单支链，树高 5，查找 O(n)',
      stats: { '结点数': 5, 'BST 树高': 5, '查找最坏': 'O(n)', '问题': '插入顺序决定树形' },
      notes: ['升序插入，每个新结点都是最右', '树高 = 结点数，查找退化为 O(n)', 'AVL 通过旋转解决此问题'] }), 0,
      '同样的五个数按升序插入普通 BST，结果是高度 5 的单支链，查找最坏要比较 5 次。' +
      'AVL 树每次插入后检测平衡因子，若失衡就旋转修复，使树高始终保持在 O(log n)。',
      ['BST 退化 → 高度 5', '查找 O(n)', 'AVL 通过旋转修复']));

    steps.push(step(snap4({
      V: AVL5, bf: BF5,
      cap: '同样的五个数插入 AVL 树后（经过旋转修复），树高 3，查找最多 3 次',
      stats: { '结点数': 5, 'AVL 树高': 3, '查找最坏': 'O(log n)', '旋转': '2次（RR+LL）' },
      notes: ['AVL 树高 ≤ 1.44 log₂(n+2)', '同样 5 个数，AVL 高 3，BST 退化高 5', '旋转次数每次插入最多 O(log n) 次'] }), 1,
      '同样五个数，AVL 树高仅 3，查找最多 3 次；BST 退化树高 5，查找最多 5 次。' +
      '结点更多时差距更显著：10000 个结点，AVL 约 20 层，退化 BST 可能 10000 层。',
      ['AVL 高 3 vs BST 高 5', '高度差随 n 增大', '大数据时差距巨大']));

    steps.push(step(snap4({
      V: AVL5, bf: BF5,
      legend: 'AVL 查找 O(log n)，插入/删除 O(log n)（包含最多 O(log n) 次旋转）',
      stats: { '查找': 'O(log n)', '插入': 'O(log n)', '删除': 'O(log n)', '旋转代价': 'O(1) 每次' },
      notes: ['旋转只改有限条指针，O(1) 完成一次旋转', '插入最多触发 O(log n) 次旋转，总代价 O(log n)', '删除可能需要向上逐层旋转修复'] }), 2,
      'AVL 树的三种操作都是 O(log n)：查找沿路比较，插入后最多沿路回溯并旋转，删除同理。' +
      '每次旋转只改 O(1) 条指针，总代价不超过 O(log n)。这是 BST 做不到的性能保证。',
      ['查找/插入/删除均 O(log n)', '旋转 O(1) 一次', '性能有保证']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['avl-tree'] = {
    title: 'AVL 平衡二叉树',
    subtitle: '在 BST 基础上加一条约束：每个结点的左右子树高度差（平衡因子）绝对值 ≤ 1。' +
      '插入后若失衡，用 LL/RR/LR/RL 四种旋转修复，保证树高始终在 O(log n)。',
    height: 700,
    code: [
      '// 平衡因子 bf = 左子树高 − 右子树高，|bf| ≤ 1',
      '// 插入后向上更新 bf，若某结点 |bf| > 1 则旋转',
      '// LL：右旋一次  RR：左旋一次',
      '// LR：先左旋左孩子，再右旋失衡结点',
      '// RL：先右旋右孩子，再左旋失衡结点',
      '// 旋转 O(1)，插入 O(log n)'
    ],
    scenes: [
      { name: '平衡因子与动机', build: buildBalance,
        codeTag: '平衡因子定义',
        code: [
          '// 平衡因子 bf(T) = height(T->lchild) - height(T->rchild)',
          '// AVL 性质：每个结点 |bf| ≤ 1',
          '// BST 有序插入 → 退化成链，查找 O(n)',
          '// AVL 通过旋转保持平衡，查找 O(log n)'
        ] },
      { name: 'LL 与 RR 单旋转', build: buildLLRR,
        codeTag: 'LL 右旋 / RR 左旋',
        code: [
          '// LL 右旋（在左孩子左子树插入导致失衡）：',
          'B = A->lchild;',
          'A->lchild = B->rchild;  // B 的右子树挂到 A 左边',
          'B->rchild = A;          // A 降为 B 的右孩子',
          '// RR 左旋与 LL 完全对称',
          '// 旋转后平衡因子自动归零'
        ] },
      { name: 'LR 与 RL 双旋转', build: buildLRRL,
        codeTag: 'LR 先左后右 / RL 先右后左',
        code: [
          '// LR 双旋（在左孩子右子树插入）：',
          '// 第一步：对 A->lchild 做 RR 左旋',
          '// 第二步：对 A 做 LL 右旋',
          '// RL 双旋（在右孩子左子树插入）：',
          '// 第一步：对 A->rchild 做 LL 右旋',
          '// 第二步：对 A 做 RR 左旋'
        ] },
      { name: '结论与复杂度', build: buildConclusion,
        codeTag: 'AVL 树高 O(log n)',
        code: [
          '// AVL 树高 h ≤ 1.44 log₂(n+2)',
          '// 查找：O(log n)（与 BST 相同逻辑，但高度受控）',
          '// 插入：O(log n)（查找路径 + 最多 O(log n) 次旋转）',
          '// 删除：O(log n)（类似，可能需沿路逐层旋转）',
          '// 每次旋转改 O(1) 条指针',
          '// 代价：代码复杂，需维护每个结点的平衡因子'
        ] }
    ]
  };
})();