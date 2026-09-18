/* 二叉排序树 BST — 第9章
 * 场景一：定义与查找（左小右大，查找路径就是从根到目标的一条路）
 * 场景二：插入（新结点一定插在叶子位置，查找失败停在哪就插在哪）
 * 场景三：删除的三种情形（叶子直接删；单孩子用孩子顶替；双孩子用中序前驱替换）
 * 场景四：中序遍历得递增序列，有序序列插入退化成单支树引出 AVL 动机
 * 快照模板：build() 算完存快照，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局参数：4 层完全二叉树编号，x∈[50,950]，y 第1层=160 */
  var X0 = 50, SPAN = 900, Y0 = 160, DY = 44, R = 16;

  function levelOf(i) { var L = 1, f = 1; while (f * 2 <= i) { f *= 2; L++; } return L; }
  function xOf(i) {
    var L = levelOf(i), k = 1, f = 1, q;
    for (q = 1; q < L; q++) { k *= 2; f *= 2; }
    return X0 + SPAN * (i - f + 0.5) / k;
  }
  function yOf(i) { return Y0 + (levelOf(i) - 1) * DY; }

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* 画树：V={id:val}，st={id:state}，edges 按完全二叉树编号自动生成 */
  function drawBST(g, V, st) {
    var ids = [], i;
    for (i in V) ids.push(+i);
    /* 先画边，再画结点（结点压边） */
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
    }
  }

  function render(ctx, f) {
    D.clear(ctx.stage);
    if (f.hdr) {
      ctx.stage.appendChild(D.text(f.hdr,
        { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    }
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.V) drawBST(ctx.stage, f.V, f.st);
    for (var j = 0; j < (f.notes || []).length && j < 3; j++) {
      ctx.stage.appendChild(D.text(f.notes[j],
        { x: 44, y: 272 + j * 22, 'class': 'vz-info' }));
    }
    if (f.legend) {
      ctx.stage.appendChild(D.text(f.legend,
        { x: 44, y: 338, 'class': 'vz-info', fill: '#6ceaa5' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ===================== 场景一：定义与查找 =====================
   * 演示树：
   *          45
   *        /    \
   *      20      70
   *     /  \    /  \
   *   12   35  55   80
   * 编号：1=45, 2=20, 3=70, 4=12, 5=35, 6=55, 7=80
   * 查找 35：45→20→35，比较 3 次
   */
  var TREE1 = { 1: 45, 2: 20, 3: 70, 4: 12, 5: 35, 6: 55, 7: 80 };

  function buildSearch() {
    var steps = [];
    function snap(o) {
      return { hdr: o.hdr || '二叉排序树：左小右大，查找沿路比较',
               cap: o.cap || null, V: cp(TREE1), st: o.st || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap({
      cap: '每个结点：左子树所有值 < 结点值 < 右子树所有值',
      stats: { '根': 45, '结点数': 7, '树高': 3, '中序序列': '12 20 35 45 55 70 80' },
      notes: ['这个性质递归地对每棵子树成立',
        '查找时像猜数：大了往左，小了往右',
        '中序遍历自然得到递增序列'] }), 0,
      '二叉排序树的定义只有一句话：每个结点的左子树全小于它，右子树全大于它，递归地成立。' +
      '这使得查找可以每步排除一半——像猜数字游戏，大了往左，小了往右。',
      ['左子树 < 根 < 右子树', '查找像猜数字', '中序得递增序列']));

    /* 查找 35 的过程：路径 1→2→5 */
    var path = [1, 2, 5];
    var target = 35;
    var cmp = 0;
    for (var pi = 0; pi < path.length; pi++) {
      cmp++;
      var cur = path[pi];
      var curVal = TREE1[cur];
      var st1 = {};
      for (var qi = 0; qi < pi; qi++) { st1[path[qi]] = 'done'; }
      st1[cur] = 'hot';
      var narr1;
      if (curVal === target) {
        narr1 = '在结点 ' + curVal + ' 处命中！查找成功，共比较 ' + cmp + ' 次，路径长度就是查找结点所在的层数。';
      } else if (target < curVal) {
        narr1 = '目标 ' + target + ' < 当前结点 ' + curVal + '，往左走。左子树所有值都小于 ' + curVal + '，右子树不用碰。';
      } else {
        narr1 = '目标 ' + target + ' > 当前结点 ' + curVal + '，往右走。右子树所有值都大于 ' + curVal + '，左子树不用碰。';
      }
      steps.push(step(snap({
        st: st1,
        cap: '查找 ' + target + '：到结点 ' + curVal + '，第 ' + cmp + ' 次比较',
        stats: { '查找目标': target, '当前结点': curVal,
                 '比较次数': cmp, '比较结果': curVal === target ? '命中' : (target < curVal ? target + '<' + curVal + '→左' : target + '>' + curVal + '→右') },
        notes: ['当前：' + curVal,
          target < curVal ? target + ' < ' + curVal + '，转向左孩子' :
          (target > curVal ? target + ' > ' + curVal + '，转向右孩子' : '找到了！'),
          '每次比较排除一棵子树'] }), pi === 0 ? 1 : (pi === path.length - 1 ? 3 : 2), narr1,
        ['比较 ' + curVal + ' 与 ' + target,
         curVal === target ? '命中！' : (target < curVal ? '往左' : '往右'),
         '第 ' + cmp + ' 次比较']));
    }

    /* 查找失败：找 40 */
    var failPath = [1, 2, 5];
    var failTarget = 40;
    var fcmp = 0;
    for (var fi = 0; fi < failPath.length; fi++) {
      fcmp++;
      var fc = failPath[fi];
      var fcv = TREE1[fc];
      var fst = {};
      for (var fq = 0; fq < fi; fq++) { fst[failPath[fq]] = 'done'; }
      fst[fc] = 'hot';
      steps.push(step(snap({
        st: fst,
        cap: '查找 ' + failTarget + '：到结点 ' + fcv + '，第 ' + fcmp + ' 次比较',
        stats: { '查找目标': failTarget, '当前结点': fcv,
                 '比较次数': fcmp,
                 '方向': failTarget < fcv ? '→左' : (failTarget > fcv ? '→右' : '命中') },
        notes: [failTarget + (failTarget < fcv ? ' < ' : ' > ') + fcv + '，' + (failTarget < fcv ? '往左' : '往右'),
          '接着走向 ' + (failTarget < fcv ? '左孩子' : '右孩子'),
          '若走到空指针还没找到，就是查找失败'] }), fi === 0 ? 1 : 2,
        '查找 ' + failTarget + '：到结点 ' + fcv + '，' + failTarget + (failTarget < fcv ? '<' : '>') + fcv + '，往' + (failTarget < fcv ? '左' : '右') + '走。',
        ['查找 ' + failTarget, (failTarget < fcv ? failTarget + '<' + fcv : failTarget + '>' + fcv), '第 ' + fcmp + ' 次比较']));
    }
    steps.push(step(snap({
      st: { 1: 'done', 2: 'done', 5: 'bad' },
      cap: '结点 35 右孩子为空，查找失败 —— 停在这里就是将来插入 40 的位置',
      stats: { '查找目标': failTarget, '比较次数': fcmp + 1,
               '结果': '查找失败', '插入点': '35 的右孩子' },
      notes: ['35 的右孩子为空，' + failTarget + ' 应在这里',
        '查找失败的终点 = 新结点的插入位置',
        '这正是 BST 插入算法的依据'],
      legend: '查找比较次数 = 结点所在层数；失败时最多比较树高次' }), 4,
      '到结点 35，发现 40 > 35 应往右走，但右孩子是空的。查找失败。' +
      '注意这个空位 —— 如果要插入 40，它就该放在这里。BST 插入就是这个思路。',
      ['右孩子为空，失败', '最多比较 ' + (fcmp + 1) + ' 次', '失败点 = 插入点']));

    return steps;
  }

  /* ===================== 场景二：插入 ===================== */
  function buildInsert() {
    var steps = [];
    /* 从空树依次插入：45, 20, 70, 12, 35 */
    var insertSeq = [45, 20, 70, 12, 35];

    /* BST 插入算法：返回 {V, id} */
    function bstInsert(V, val) {
      if (Object.keys(V).length === 0) {
        var r = {}; r[1] = val; return { V: r, id: 1 };
      }
      var cur = 1;
      while (true) {
        if (val < V[cur]) {
          if (V[cur * 2] === undefined) {
            V[cur * 2] = val; return { V: V, id: cur * 2 };
          }
          cur = cur * 2;
        } else {
          if (V[cur * 2 + 1] === undefined) {
            V[cur * 2 + 1] = val; return { V: V, id: cur * 2 + 1 };
          }
          cur = cur * 2 + 1;
        }
      }
    }

    var V2 = {};
    function snap2(o) {
      return { hdr: o.hdr || 'BST 插入：查找失败在哪，新结点就插在哪',
               cap: o.cap || null, V: cp(V2), st: o.st || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap2({
      cap: '从空树开始，依次插入 45 20 70 12 35',
      stats: { '插入序列': '45 20 70 12 35', '结点数': 0,
               '规律': '新结点一定是叶子', '原因': '查找失败才插入' },
      notes: ['BST 插入不改变已有结点的位置',
        '新结点总是插在某个叶子的空孩子处',
        '查找成功 → 已有该值；查找失败 → 插入'] }), 0,
      'BST 插入的思路很简单：先查找这个值，如果没找到，' +
      '查找最后停在哪个空指针处，就把新结点挂在那里。所以新结点一定是叶子。',
      ['从空树开始', '新结点 = 叶子', '查找失败位置就是插入点']));

    for (var ii = 0; ii < insertSeq.length; ii++) {
      var val = insertSeq[ii];
      var res = bstInsert(V2, val);
      V2 = res.V;
      var newId = res.id;
      var stI = {};
      stI[newId] = 'good';
      steps.push(step(snap2({
        st: stI,
        cap: '插入 ' + val + '：查找失败，挂在编号 ' + newId + ' 处（' + (newId === 1 ? '根' : (newId % 2 === 0 ? '父结点 ' + (newId >> 1) + ' 的左孩子' : '父结点 ' + (newId >> 1) + ' 的右孩子')) + '）',
        stats: { '插入值': val, '位置': newId === 1 ? '根' : (newId % 2 === 0 ? V2[newId >> 1] + ' 左孩子' : V2[newId >> 1] + ' 右孩子'),
                 '结点数': ii + 1, '树高': levelOf(newId) },
        notes: ['插入 ' + val + ' → 查找路径终点是空位',
          newId === 1 ? '树为空，直接成为根' : val + (newId % 2 === 0 ? ' < ' : ' > ') + V2[newId >> 1] + '，挂在其' + (newId % 2 === 0 ? '左' : '右'),
          '已有结点位置不变'] }), newId === 1 ? 1 : 3,
        '插入 ' + val + '：先按 BST 性质查找，查到空指针时停下，' +
        (newId === 1 ? '树为空所以 ' + val + ' 直接成为根。' :
          val + (newId % 2 === 0 ? ' < ' : ' > ') + V2[newId >> 1] + '，挂在结点 ' + V2[newId >> 1] + ' 的' + (newId % 2 === 0 ? '左' : '右') + '孩子处。'),
        ['插入 ' + val, newId === 1 ? '成为根' : '挂在 ' + V2[newId >> 1] + (newId % 2 === 0 ? ' 左' : ' 右'), '结点数 ' + (ii + 1)]));
    }

    steps.push(step(snap2({
      legend: '插入顺序决定树形：同一批数字，顺序不同得到不同的 BST',
      stats: { '结点数': 5, '树高': 3, '插入次序': '45 20 70 12 35', '时间': 'O(树高)' },
      notes: ['每次插入 = 一次查找 + 一次连接，O(h)',
        '树高平均 O(log n)，最坏 O(n)',
        '插入顺序决定树形 —— 有序序列插入会退化'] }), -1,
      '5 个结点插完。每次插入的代价就是一次查找，O(h)。' +
      '这棵树比较均衡因为我们先插了中间值 45。如果换成按 12 20 35 45 70 的升序插入，树就会退化成一条链。',
      ['5 次插入完成', 'O(h) = O(树高)', '顺序影响树形']));

    return steps;
  }

  /* ===================== 场景三：删除 ===================== */
  /* 演示树同场景一：TREE1 = {1:45, 2:20, 3:70, 4:12, 5:35, 6:55, 7:80}
   * 依次演示三种情形：
   *   情形1：删叶子 12（直接摘掉）
   *   情形2：删单孩子 70（用孩子 55 或 80 顶替）—— 演示删 55，它是叶子但先演示删 70 用一个孩子顶替
   *   情形3：删双孩子 20（用中序前驱 12 或后继 35 替换值，再删那个前驱/后继）
   * 为了清晰演示三种，设计稍微复杂的树：
   *          45
   *        /    \
   *      20      70
   *     /  \      \
   *   12   35      80
   * id: 1=45, 2=20, 3=70, 5=35, 4=12, 7=80 (3的右孩子7=80, 3无左孩子)
   */
  var DEL_TREE = { 1: 45, 2: 20, 3: 70, 4: 12, 5: 35, 7: 80 };

  function buildDelete() {
    var steps = [];
    var V3 = cp(DEL_TREE);

    function snap3(o) {
      return { hdr: o.hdr || 'BST 删除：三种情形',
               cap: o.cap || null, V: cp(V3), st: o.st || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    steps.push(step(snap3({
      cap: '删除分三种情形，难度依次递增。叶子最简单，单孩子次之，双孩子最麻烦',
      stats: { '情形1': '叶子—直接删', '情形2': '单孩子—顶替',
               '情形3': '双孩子—前驱/后继替换', '关键': '删后仍是合法 BST' },
      notes: ['删除要保持 BST 性质', '三种情形覆盖所有可能', '双孩子情形最容易考'] }), 0,
      'BST 删除要保持「左小右大」性质不变。按被删结点有几个孩子分三种情形：' +
      '叶子（0 个孩子）直接删；只有一个孩子就让孩子顶上来；有两个孩子需要借助中序前驱或后继。',
      ['三种情形', '难度依次递增', '删后仍合法 BST']));

    /* 情形1：删叶子 12（编号 4） */
    steps.push(step(snap3({
      st: { 4: 'bad' },
      cap: '情形1：删叶子 12 —— 它没有孩子，直接把父结点 20 的左指针置空即可',
      stats: { '删除目标': 12, '情形': '叶子（0 个孩子）', '操作': '父指针置空', '难度': '最简单' },
      notes: ['12 是叶子，没有孩子', '只需父结点 20 的左指针 = NULL', '树的其他部分完全不变'] }), 2,
      '情形1：删叶子。12 没有任何孩子，只需把它的父结点 20 的左指针置为空，再释放 12 的存储空间即可。这是最简单的情形。',
      ['删叶子 12', '父指针置 NULL', '最简单']));

    delete V3[4];
    steps.push(step(snap3({
      st: { 2: 'good' },
      cap: '删除 12 完成。20 的左孩子指针已置空，BST 性质保持。',
      stats: { '删除': '12 完成', '结点数': 5, '20 的左孩子': 'NULL', '树高': 3 },
      notes: ['12 已删除', '20 左指针 = NULL', 'BST 性质未被破坏'] }), 2,
      '12 删除完毕。20 的左子树现在是空的，但 20 仍然在正确的位置上，BST 性质完好。',
      ['12 已删除', '结点数减为 5', '性质完好']));

    /* 情形2：删单孩子结点 70（编号 3，只有右孩子 80） */
    steps.push(step(snap3({
      st: { 3: 'hot', 7: 'active' },
      cap: '情形2：删单孩子结点 70 —— 它只有右孩子 80，让 80 直接顶上来',
      stats: { '删除目标': 70, '情形': '单孩子（只有右孩子）', '操作': '孩子顶替', '父结点': '45' },
      notes: ['70 只有右孩子 80，没有左孩子', '让 80 接管 70 的位置', '45 的右指针改指向 80'] }), 3,
      '情形2：删有单孩子的结点 70。它只有右孩子 80。处理方法是让 80 直接顶上 70 的位置：' +
      '把 45 的右指针从指向 70 改为指向 80，再释放 70 即可。',
      ['删 70，只有右孩子 80', '让 80 顶替 70', '45 右指针改指 80']));

    delete V3[3]; V3[3] = 80; delete V3[7];
    steps.push(step(snap3({
      st: { 3: 'good' },
      cap: '删除 70 完成，80 已顶上来。若只有左孩子，做法完全对称。',
      stats: { '删除': '70 完成', '结点数': 4, '80 顶替位置': '编号3', '树高': 3 },
      notes: ['80 顶替了 70 的位置', '45 右孩子现在是 80', 'BST 性质：45<80，正确'],
      legend: '单孩子情形：孩子顶替父，等于跳过了父结点，链接关系缩短一步' }), 3,
      '80 顶上来了，删除完成。单孩子情形本质上是把孩子「提升」一层，父结点被跨过去，就像链表里删一个中间结点。',
      ['80 顶替 70', '结点数减为 4', '链接缩短一步']));

    /* 情形3：删双孩子结点 20（用中序前驱替换）
     * 此时树：1=45, 2=20, 3=80, 5=35
     * 20 的左子树已空（12 删了），演示目的性不够强，重置树 */
    V3 = { 1: 45, 2: 20, 3: 80, 5: 35, 10: 28 };
    /* 树形：45 根，20 左孩子（有左孩子35的左10=28，有右孩子35），80 右孩子
     * 20 的左孩子 = 编号4空，改为编号10=28
     * 实际: 1=45, 2=20, 3=80, 5=35, 10=28 (10是5的左孩子，即35的左子)
     * 这样 20 有左孩子(10=28)和右孩子(5=35) */
    V3 = { 1: 45, 2: 20, 3: 80, 4: 10, 5: 35 };
    steps.push(step(snap3({
      st: { 2: 'hot', 4: 'active', 5: 'active' },
      cap: '情形3：删双孩子结点 20 —— 它既有左孩子 10 又有右孩子 35，不能直接删',
      stats: { '删除目标': 20, '情形': '双孩子', '左孩子': 10, '右孩子': 35 },
      notes: ['20 有左孩子 10、右孩子 35', '不能直接删，否则两棵子树没处放', '用中序前驱（左子树最大值）替换'] }), 4,
      '情形3：删有两个孩子的结点 20。不能简单地把它摘掉，因为左右两棵子树都没处安放。' +
      '经典做法：用 20 的中序前驱（左子树里最大的那个，这里是 10）的值替换 20，再去删那个前驱结点。',
      ['双孩子，不能直接删', '用中序前驱值替换', '再删那个前驱']));

    /* 中序前驱是左子树的最右结点：从 4（值10）往右走，10 无右孩子，它就是前驱 */
    steps.push(step(snap3({
      st: { 2: 'hot', 4: 'good' },
      cap: '中序前驱 = 左子树最右结点 = 10（从 20 的左孩子一路往右，直到无右孩子）',
      stats: { '中序前驱': 10, '位置': '20 左子树最右', '中序后继': 35, '选哪个': '前驱后继均可' },
      notes: ['从 20 左孩子 10 一路往右', '10 没有右孩子，它就是前驱', '中序后继同理：右子树最左结点'] }), 5,
      '中序前驱是左子树里最大的结点，找法是从左孩子出发一路向右直到头。' +
      '这里 20 的左孩子是 10，10 没有右孩子，所以它就是前驱。' +
      '用 10 替换 20 的值，再去删结点 10。',
      ['前驱 = 左子树最右 = 10', '10 没有右孩子', '替换后再删 10']));

    V3[2] = 10; delete V3[4];
    steps.push(step(snap3({
      st: { 2: 'good' },
      cap: '将 20 的值替换为 10，再删原来的结点 10（它是叶子，用情形1处理）',
      stats: { '操作': '20 → 10 替换', '再删': '原 10 结点', '10 情形': '叶子', '结点数': 4 },
      notes: ['结点 2 的值改为 10', '原结点 4（值10）是叶子，直接删', 'BST 性质：10<45，10<35，正确'],
      legend: '双孩子删除转化为「改值 + 删叶子/单孩子」，后面的删除必然是情形1或情形2' }), 6,
      '替换完成，结点 2 的值由 20 变成了 10，原来存放 10 的结点 4 是叶子，用情形 1 直接删掉。' +
      '注意：替换只改值，不动指针，所以删完之后 BST 性质依然成立。',
      ['值改为 10', '原叶子直接删', '双孩子转化为情形1/2']));

    return steps;
  }

  /* ===================== 场景四：中序序列与退化 ===================== */
  function buildDegrade() {
    var steps = [];

    function snap4(o) {
      return { hdr: o.hdr || 'BST 中序序列 & 退化',
               cap: o.cap || null, V: o.V || {}, st: o.st || {},
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    }

    /* 演示中序遍历得递增序列 */
    var TV = { 1: 45, 2: 20, 3: 70, 4: 12, 5: 35, 6: 55, 7: 80 };
    var inOrder = [4, 2, 5, 1, 6, 3, 7];
    steps.push(step(snap4({
      V: TV, st: {},
      cap: '中序遍历（左-根-右）这棵 BST，输出顺序是 12 20 35 45 55 70 80——恰好递增',
      stats: { '中序序列': '12 20 35 45 55 70 80', '是否有序': '是，递增',
               'BST 性质': '左<根<右', '推论': '中序 = 排序' },
      notes: ['左子树 < 根 < 右子树，递归成立', '中序遍历按 左-根-右 输出，恰好从小到大', 'BST 本质上就是二叉搜索树，中序就是它的排序输出'],
      legend: '中序遍历 BST = 排序输出。这是 BST 最核心的性质。' }), 0,
      'BST 定义里「左子树全小于根、右子树全大于根」递归成立，这恰好就是中序遍历的顺序。' +
      '所以中序遍历任何一棵 BST，输出必然是递增序列。反过来，可以用中序遍历来验证一棵树是不是 BST。',
      ['中序 = 12 20 35 45 55 70 80', '恰好递增', '中序验证 BST']));

    /* 演示退化：按升序 12 20 35 45 插入变成右单支 */
    var dV = {};
    var dSeq = [12, 20, 35, 45];
    for (var di = 0; di < dSeq.length; di++) {
      var cur = 1;
      if (Object.keys(dV).length === 0) {
        dV[1] = dSeq[0]; continue;
      }
      cur = 1;
      while (true) {
        if (dSeq[di] > dV[cur]) {
          if (dV[cur * 2 + 1] === undefined) { dV[cur * 2 + 1] = dSeq[di]; break; }
          cur = cur * 2 + 1;
        } else {
          if (dV[cur * 2] === undefined) { dV[cur * 2] = dSeq[di]; break; }
          cur = cur * 2;
        }
      }
    }
    steps.push(step(snap4({
      V: cp(dV), st: { 1: 'bad', 3: 'bad', 7: 'bad', 15: 'bad' },
      cap: '按升序 12→20→35→45 插入：每个新结点都是上一个的右孩子，树退化成单支链',
      stats: { '插入顺序': '12 20 35 45', '树形': '右单支', '树高': 4, '查找时间': 'O(n)' },
      notes: ['有序序列插入：每次都插到最右侧', '树高 = 结点数 n，退化成链表', '查找时间从 O(log n) 退化到 O(n)'],
      legend: '这就是引入 AVL 树的动机：限制树高，保持查找在 O(log n)' }), 3,
      '把 12 20 35 45 按升序插入，每个新来的数都比所有已有的数大，于是每次都插到最右侧，' +
      '树退化成一条向右的链。查找最坏要比较 n 次，BST 的优势荡然无存。' +
      '这就是为什么要发明 AVL 树——通过旋转来保持树的平衡，把高度控制在 O(log n)。',
      ['有序插入 → 单支链', '查找 O(n)', '引出 AVL 树']));

    steps.push(step(snap4({
      V: TV, st: {},
      cap: '相比之下，同样的数据先插 45，再插 20 和 70，树形均衡，查找 O(log n)',
      stats: { '均衡树高': 3, '退化树高': 4, '查找均衡': 'O(log n)', '查找退化': 'O(n)' },
      notes: ['平衡与退化的差别只在插入顺序', 'AVL 树通过旋转自动保持平衡', '不管插入什么顺序，AVL 树高始终 O(log n)'],
      legend: 'BST 查找效率取决于树高；AVL 树把高度保持在 O(log n) 无论插入顺序' }), -1,
      '同样是 7 个结点，均衡插入树高 3、查找最多 3 次；退化后树高 7、查找最多 7 次。' +
      'AVL 树的思路是：每次插入后如果某个结点的左右子树高度差超过 1，就用旋转操作把它调平，' +
      '从而保证任何时候树高都在 O(log n)。',
      ['均衡高 3 vs 退化高 n', 'AVL 限制高度差 ≤1', '旋转保持 O(log n)']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['bst'] = {
    title: '二叉排序树 BST',
    subtitle: '左子树全小于根，右子树全大于根——这一条递归地成立。查找像猜数字，中序输出恰好递增。插入新结点一定是叶子；删除分三种情形；有序插入会退化成链，引出 AVL。',
    height: 700,
    code: [
      '// 查找：',
      'while (T && T->data != key)',
      '    T = (key < T->data) ? T->lchild : T->rchild;',
      '// 插入：查找失败处挂新结点',
      '// 删除情形1：叶子 → 父指针置空',
      '// 删除情形2：单孩子 → 孩子顶替',
      '// 删除情形3：双孩子 → 前驱/后继替换值，再删那个结点'
    ],
    scenes: [
      { name: '定义与查找', build: buildSearch,
        codeTag: '查找沿路比较',
        code: [
          '// BST 性质：左子树 < 根 < 右子树（递归）',
          'BiTree Search(T, key) {',
          '    while (T && T->data != key)',
          '        if (key < T->data) T = T->lchild;',
          '        else               T = T->rchild;',
          '    return T;  // 命中返回结点，失败返回 NULL',
          '}  // 比较次数 = 结点层数；最多 = 树高'
        ] },
      { name: '插入', build: buildInsert,
        codeTag: '查找失败在哪就插在哪',
        code: [
          'void Insert(BST *T, int key) {',
          '    if (!*T) { *T = NewNode(key); return; }',
          '    if (key == (*T)->data) return; // 已有，不重复插',
          '    if (key < (*T)->data) Insert(&(*T)->lchild, key);',
          '    else                  Insert(&(*T)->rchild, key);',
          '}  // 新结点一定插在叶子位置'
        ] },
      { name: '删除三种情形', build: buildDelete,
        codeTag: '叶子/单孩子/双孩子三种情形',
        code: [
          '// 情形1：叶子 → 直接摘掉',
          '// 情形2：单孩子 → 孩子顶替父结点位置',
          '// 情形3：双孩子 →',
          '    p = 中序前驱(结点);    // 左子树最右结点',
          '    结点->data = p->data;  // 用前驱值覆盖',
          '    Delete(前驱结点);      // 递归删前驱（情形1或2）',
          '// 后继（右子树最左结点）同理，效果一样'
        ] },
      { name: '中序序列与退化', build: buildDegrade,
        codeTag: '中序有序，有序插入退化',
        code: [
          '// 中序遍历 BST → 递增序列（BST 核心性质）',
          '// 有序序列插入 → 退化成单支链',
          '//   树高 = n，查找 O(n)，失去 BST 优势',
          '// 解决方法：AVL 树（平衡二叉排序树）',
          '//   每次插入后旋转调平，树高始终 O(log n)',
          '// 代价：插入/删除需沿路回溯，更新平衡因子并旋转'
        ] }
    ]
  };
})();
