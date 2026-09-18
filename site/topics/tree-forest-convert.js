/* 树、森林与二叉树的转换 — 第6章
 * 树的孩子个数不定，存起来别扭；二叉树只有左右两个指针，好办得多。
 * 「左孩子右兄弟」：左指针指长子、右指针指右兄弟 —— 任意树就唯一对应一棵二叉树。
 * 场景一：树 → 二叉树（加线、抹线、旋转三步）。
 * 场景二：二叉树 → 树（逆着来，把右链上的结点提回同一层）。
 * 场景三：森林 → 二叉树（各棵树的根互为兄弟）。
 * 场景四：遍历的对应 —— 树的先根 ↔ 二叉树先序，树的后根 ↔ 二叉树中序。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /*  示例树（孩子数 3 / 2 / 0 / 1，够一般了）
   *        A
   *     /  |  \
   *    B   C   D
   *   / \      |
   *  E   F     G          */
  var TP = { A: { x: 250, y: 146 }, B: { x: 120, y: 196 },
             C: { x: 250, y: 196 }, D: { x: 380, y: 196 },
             E: { x: 70, y: 246 }, F: { x: 170, y: 246 },
             G: { x: 380, y: 246 } };
  var TE = [['A', 'B'], ['A', 'C'], ['A', 'D'],
            ['B', 'E'], ['B', 'F'], ['D', 'G']];
  var TSIB = [['B', 'C'], ['C', 'D'], ['E', 'F']];
  var CHILD = { A: ['B', 'C', 'D'], B: ['E', 'F'], C: [],
                D: ['G'], E: [], F: [], G: [] };

  /* 转换后的二叉树：左指针 = 长子，右指针 = 右兄弟。
   * 层高 44，最深的 G 落在 y=316（+r=331，不压 y=352 的旁白）。 */
  var BP = { A: { x: 600, y: 140 }, B: { x: 556, y: 184 },
             E: { x: 514, y: 228 }, F: { x: 556, y: 272 },
             C: { x: 632, y: 228 }, D: { x: 700, y: 272 },
             G: { x: 662, y: 316 } };
  var BE = [['A', 'B', 'L'], ['B', 'E', 'L'], ['E', 'F', 'R'],
            ['B', 'C', 'R'], ['C', 'D', 'R'], ['D', 'G', 'L']];

  /* 森林：三棵树 A(B,C)、D(E)、F —— 根 A D F 视为兄弟 */
  var FP = { A: { x: 140, y: 152 }, B: { x: 100, y: 204 },
             C: { x: 182, y: 204 }, D: { x: 286, y: 152 },
             E: { x: 286, y: 204 }, F: { x: 392, y: 152 } };
  var FE = [['A', 'B'], ['A', 'C'], ['D', 'E']];
  var FSIB = [['A', 'D'], ['D', 'F'], ['B', 'C']];
  var FBP = { A: { x: 596, y: 148 }, B: { x: 548, y: 196 },
              C: { x: 596, y: 244 }, D: { x: 668, y: 196 },
              E: { x: 620, y: 244 }, F: { x: 716, y: 244 } };
  var FBE = [['A', 'B', 'L'], ['B', 'C', 'R'], ['A', 'D', 'R'],
             ['D', 'E', 'L'], ['D', 'F', 'R']];

  var R = 15;
  /* 场景四的四排序列 */
  var SQX = 452, SQW = 38, SQG = 4, SQH = 28;
  var SQY = [140, 192, 244, 296];

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  function seqRow(g, y, title, items, hi) {
    g.appendChild(D.text(title,
      { x: SQX, y: y - 9, 'class': 'vz-tag', fill: '#9fb4dc',
        'text-anchor': 'start' }));
    var i, x, c;
    for (i = 0; i < 7; i++) {
      x = SQX + i * (SQW + SQG);
      var on = i < items.length;
      c = D.C[on ? (hi === i ? 'hot' : 'done') : 'mute'];
      g.appendChild(D.el('rect', { x: x, y: y, width: SQW, height: SQH,
        rx: 5, fill: c.fill, stroke: c.stroke,
        'stroke-width': hi === i ? 2.6 : 1.5 }));
      if (on) {
        g.appendChild(D.text(items[i],
          { x: x + SQW / 2, y: y + 20, 'class': 'vz-cellval' }));
      }
    }
  }

  /* 画一组结点 + 连线。pos 是坐标表，edges 是 [父,子] 或 [父,子,'L'/'R']。
   * kinds: 'tree' 实线树枝 | 'sib' 虚线兄弟连线 | 'bin' 二叉树左右链 */
  function drawTree(g, pos, edges, st, opt) {
    opt = opt || {};
    var i, e, a, b;
    for (i = 0; i < edges.length; i++) {
      e = edges[i]; a = pos[e[0]]; b = pos[e[1]];
      if (!a || !b) continue;
      var side = e[2];
      var hot = opt.hotE && opt.hotE[e[0] + e[1]];
      D.link(g, { x1: a.x, y1: a.y + R - 2, x2: b.x, y2: b.y - R + 2,
        kind: hot ? 'hot' : (side === 'R' ? 'prev' : 'next'),
        arrow: false, width: hot ? 2.6 : 1.7,
        dash: opt.dashAll ? true : false });
    }
    for (i in pos) {
      if (opt.only && !opt.only[i]) continue;
      D.circleNode(g, { x: pos[i].x, y: pos[i].y, r: R,
        state: (st && st[i]) || 'idle', value: i });
    }
  }

  /* 兄弟虚线：同层结点之间横着连一道，「加线」那一步用 */
  function drawSib(g, pos, sibs, hot) {
    var i, a, b;
    for (i = 0; i < sibs.length; i++) {
      a = pos[sibs[i][0]]; b = pos[sibs[i][1]];
      if (!a || !b) continue;
      var on = !hot || hot[sibs[i][0] + sibs[i][1]];
      D.link(g, { x1: a.x + R, y1: a.y, x2: b.x - R, y2: b.y,
        kind: on ? 'hot' : 'mute', arrow: false, dash: true,
        width: on ? 2.4 : 1.4 });
    }
  }

  function render(ctx, f) {
    D.clear(ctx.stage);
    var j;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    if (f.left) {
      ctx.stage.appendChild(D.text(f.leftTitle || '',
        { x: 44, y: 142, 'class': 'vz-tag', fill: '#9fb4dc',
          'text-anchor': 'start' }));
      drawTree(ctx.stage, f.left.pos, f.left.edges, f.left.st,
        { hotE: f.left.hotE, only: f.left.only });
      if (f.left.sibs) drawSib(ctx.stage, f.left.pos, f.left.sibs, f.left.hotS);
    }
    if (f.right) {
      ctx.stage.appendChild(D.text(f.rightTitle || '',
        { x: 496, y: 142, 'class': 'vz-tag', fill: '#6ceaa5',
          'text-anchor': 'start' }));
      drawTree(ctx.stage, f.right.pos, f.right.edges, f.right.st,
        { hotE: f.right.hotE, only: f.right.only });
    }
    if (f.rows) {
      for (j = 0; j < f.rows.length && j < 4; j++) {
        seqRow(ctx.stage, SQY[j], f.rows[j].title, f.rows[j].items,
          f.rows[j].hi === undefined ? -1 : f.rows[j].hi);
      }
    }

    for (j = 0; j < (f.notes || []).length && j < 3; j++) {
      ctx.stage.appendChild(D.text(f.notes[j],
        { x: 44, y: 274 + j * 20, 'class': 'vz-info' }));
    }
    if (f.legend) {
      ctx.stage.appendChild(D.text(f.legend,
        { x: 44, y: 336, 'class': 'vz-info', fill: '#6ceaa5' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* 抹线之后留下的树枝：只保留「父 → 长子」这一条 */
  var TKEEP = [['A', 'B'], ['B', 'E'], ['D', 'G']];
  var TCUT = [['A', 'C'], ['A', 'D'], ['B', 'F']];

  /* ---------- 场景一：树 → 二叉树 ----------
   * 加线：所有兄弟之间连一条；抹线：每个结点只留与长子的那条；
   * 旋转：把兄弟线摆成右斜，长子线摆成左斜 —— 就是一棵二叉树。 */
  function buildT2B() {
    var steps = [];
    var snap = function (o) {
      return { hdr: o.hdr || '树 → 二叉树：加线、抹线、旋转',
               cap: o.cap || null,
               leftTitle: o.leftTitle || '原来的树（孩子个数不定）',
               rightTitle: o.rightTitle || null,
               left: o.left || null, right: o.right || null,
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    };
    var ALL = {}, i;
    for (i in TP) ALL[i] = 1;

    steps.push(step(snap({
      cap: '树的孩子个数不定，指针域开几个都别扭；二叉树只有左右两个指针，好办得多',
      left: { pos: TP, edges: TE, st: {} },
      stats: { '难处': '孩子数不定', 'A 有': '3 个孩子',
               'C 有': '0 个', '想要的': '每结点固定 2 个指针' },
      notes: ['若按最大孩子数开指针域，空指针太多',
        '若按实际个数开，结点大小不一，不好管',
        '出路：换一种连法，把「孩子数不定」化成「左右两个」'] }), 0,
      '树的麻烦在于孩子个数不定：A 有三个孩子，C 一个也没有。指针域开多了浪费，' +
      '开少了不够，结点大小不一又难管理。二叉树就规矩得多 —— 左右各一个指针，永远如此。',
      ['孩子数不定是麻烦', 'A 三个、C 零个',
       '二叉树固定两个指针']));

    steps.push(step(snap({
      hdr: '换一种连法：左孩子右兄弟',
      cap: '每个结点只连两个人：它的长子，和它右边紧邻的那个兄弟',
      left: { pos: TP, edges: TE, st: {}, sibs: TSIB },
      stats: { '左指针': '指向长子 firstChild', '右指针': '指向右兄弟 nextSibling',
               '关系数': '每结点至多 2 条', '别名': '孩子兄弟表示法' },
      notes: ['原本的「父 → 每个孩子」改成「父 → 长子」',
        '同层兄弟之间横着串成一条链（图中虚线）',
        '两种关系加起来，一个结点最多牵出两条线'] }), 1,
      '关键的一招是换个连法：每个结点只连两个人 —— 它的长子，和它右边紧邻的兄弟。' +
      '原来「父指向所有孩子」变成「父只指长子」，剩下的孩子由长子横着串起来（图中虚线）。' +
      '这样一来每个结点牵出的线最多两条，正好塞进二叉树的左右指针。',
      ['左指针 → 长子', '右指针 → 右兄弟',
       '每结点至多两条线']));

    steps.push(step(snap({
      hdr: '第一步 加线：兄弟之间连起来',
      cap: '凡是同一个双亲的孩子，从左到右两两相连 —— B–C、C–D、E–F',
      left: { pos: TP, edges: TE, st: { B: 'hot', C: 'hot', D: 'hot',
                                       E: 'hot', F: 'hot' }, sibs: TSIB },
      stats: { '加线规则': '同双亲的相邻兄弟相连', '本例加了': '3 条',
               'A 的孩子': 'B–C–D', 'B 的孩子': 'E–F' },
      notes: ['B C D 是 A 的三个孩子 → 加 B–C、C–D',
        'E F 是 B 的两个孩子 → 加 E–F',
        'C 与 E 不是兄弟（双亲不同），不能连'] }), 2,
      '第一步加线：同一个双亲的孩子，从左到右两两连起来。A 的孩子 B C D 得到 B–C、C–D；' +
      'B 的孩子 E F 得到 E–F。注意 C 与 E 双亲不同，不是兄弟，不能连 —— ' +
      '兄弟的定义就是「同一个双亲」。',
      ['同双亲的相邻孩子相连', '加了 B–C、C–D、E–F',
       '共 3 条兄弟线']));

    steps.push(step(snap({
      hdr: '第二步 抹线：每个结点只留与长子的那条',
      cap: '抹掉 A–C、A–D、B–F —— 有了兄弟线，这些孩子仍然连得通',
      left: { pos: TP, edges: TKEEP, st: { B: 'good', E: 'good', G: 'good' },
              sibs: TSIB },
      stats: { '抹掉': 'A–C、A–D、B–F', '留下': 'A–B、B–E、D–G',
               '为什么能抹': 'C D 经 B 的兄弟线仍可达', '留下的含义': '父 → 长子' },
      notes: ['A 的三条枝只留 A–B（B 是长子）',
        'C 和 D 并没有失联 —— 顺着 B–C–D 的兄弟线仍能到',
        '每个结点向下只剩一条枝，指向自己的长子'] }), 3,
      '第二步抹线：每个结点只保留与长子相连的那一条，其余抹掉。A 的三条枝只留 A–B，' +
      'C 和 D 并没有失联 —— 顺着 B–C–D 这条兄弟线照样能找到它们。抹完之后，' +
      '每个结点向下只剩一条枝，指向自己的长子。',
      ['只留父 → 长子', '抹掉 A–C、A–D、B–F',
       'C D 走兄弟线仍可达']));

    steps.push(step(snap({
      hdr: '第三步 旋转：长子线摆左，兄弟线摆右',
      cap: '两类线换个方向画 —— 长子线左斜、兄弟线右斜，一棵二叉树就出来了',
      left: { pos: TP, edges: TKEEP, st: {}, sibs: TSIB },
      right: { pos: BP, edges: BE, st: { A: 'active' } },
      rightTitle: '转换后的二叉树（蓝=左孩子 紫=右兄弟）',
      stats: { '长子线': '画成左斜 → 左孩子', '兄弟线': '画成右斜 → 右兄弟',
               '结点数': '7 个，一个不多不少', '结构': '唯一确定' },
      notes: ['旋转只是换个画法，连接关系一点没变',
        '左斜的线读作「左孩子」，右斜的读作「右兄弟」',
        '根 A 没有兄弟，所以二叉树的根没有右子树'] }), 4,
      '第三步旋转：把长子线一律画成左斜、兄弟线一律画成右斜。这一步只是换个画法，' +
      '连接关系分毫未变，但看上去已经是一棵规规矩矩的二叉树了。' +
      '注意根 A 没有兄弟，所以转换出来的二叉树根结点必定没有右子树。',
      ['长子线 → 左斜', '兄弟线 → 右斜',
       '根的右子树必空']));

    steps.push(step(snap({
      hdr: '对照着看：同一批关系，两种画法',
      cap: 'B 的左孩子是 E（长子），右孩子是 C（右兄弟）—— 左右含义完全不同',
      left: { pos: TP, edges: TKEEP, st: { B: 'active', E: 'hot', C: 'hot' },
              sibs: TSIB, hotS: { BC: 1 } },
      right: { pos: BP, edges: BE, st: { B: 'active', E: 'hot', C: 'hot' },
               hotE: { BE: 1, BC: 1 } },
      rightTitle: '转换后的二叉树',
      stats: { 'B 的左孩子': 'E（B 的长子）', 'B 的右孩子': 'C（B 的右兄弟）',
               '注意': '左右两个指针含义不同', '树里 B 与 C': '是兄弟，不是父子' },
      notes: ['二叉树里 C 挂在 B 的右边，但树里它们是兄弟',
        '看二叉树时必须记住：右链上的结点都是同辈',
        '这也是为什么转换是可逆的 —— 信息一点没丢'] }), 4,
      '拿 B 来对照：它在二叉树里的左孩子是 E，那是它的长子；右孩子是 C，那是它的兄弟。' +
      '同一个「右指针」在树里读作同辈，千万别当成父子。正因为左右两条边含义分得清，' +
      '这个转换才是可逆的 —— 信息一点没丢。',
      ['B 左孩子 = 长子 E', 'B 右孩子 = 兄弟 C',
       '右链上都是同辈']));

    steps.push(step(snap({
      hdr: '转换完成：任意树 ↔ 唯一一棵二叉树',
      cap: '存储上就是「孩子兄弟链表」：两个指针，一个指长子，一个指右兄弟',
      left: { pos: TP, edges: TE, st: {}, sibs: TSIB },
      right: { pos: BP, edges: BE, st: { A: 'done', B: 'done', C: 'done',
        D: 'done', E: 'done', F: 'done', G: 'done' } },
      rightTitle: '转换后的二叉树',
      stats: { '对应关系': '一一对应，可逆', '存储结构': '孩子兄弟链表',
               '结点结构': 'firstChild | data | nextSibling', '空指针': 'n+1 个' },
      notes: ['树的运算于是可以借二叉树的算法来做',
        '结点结构：firstChild | data | nextSibling',
        '根的右指针恒为空，这是「一棵树」的标志'],
      legend: '记住三个字：加线、抹线、旋转；记住六个字：左孩子、右兄弟' }), 5,
      '转换完成。任意一棵树都唯一对应一棵二叉树，反过来也成立，所以树的问题都能搬到' +
      '二叉树上去解。存储上这就是「孩子兄弟链表」：结点里两个指针，firstChild 指长子，' +
      'nextSibling 指右兄弟。根的右指针恒为空，正是「只有一棵树」的标志。',
      ['一一对应且可逆', '孩子兄弟链表',
       '根的右指针恒空']));

    return steps;
  }

  /* ---------- 场景二：二叉树 → 树 ----------
   * 逆着来：某结点是双亲的左孩子，就把它右链上的一串全部连到这个双亲；
   * 然后抹掉所有右链，把同一条右链上的结点摆回同一层。 */
  function buildB2T() {
    var steps = [];
    var snap = function (o) {
      return { hdr: o.hdr || '二叉树 → 树：右链上的结点提回同一层',
               cap: o.cap || null,
               leftTitle: o.leftTitle || null,
               rightTitle: o.rightTitle || null,
               left: o.left || null, right: o.right || null,
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    };

    steps.push(step(snap({
      cap: '给一棵根没有右子树的二叉树，怎么把它还原成树？逆着三步走',
      right: { pos: BP, edges: BE, st: {} },
      rightTitle: '待还原的二叉树',
      stats: { '前提': '根没有右子树', '第一步': '加线：左孩子的右链全连到双亲',
               '第二步': '抹线：删掉所有右链', '第三步': '调整：右链上的摆回同层' },
      notes: ['判断依据：一棵树对应的二叉树，根必无右子树',
        '还原的钥匙是「右链上的结点都是同辈」',
        '三步与正向转换恰好互逆'] }), 0,
      '反过来：给一棵二叉树，怎么还原成树？先看根 —— 它没有右子树，说明原来只有一棵树。' +
      '还原的钥匙是那句话：右链上的结点都是同辈。顺着这条线索，三步逆着走一遍就行。',
      ['根无右子树 → 一棵树', '钥匙：右链上都是同辈',
       '三步与正向互逆']));

    steps.push(step(snap({
      hdr: '第一步 加线：把右链上的一串接到双亲',
      cap: 'B 是 A 的左孩子，那么 B 右链上的 C、D 也都是 A 的孩子 —— 连 A–C、A–D',
      right: { pos: BP, edges: BE, st: { A: 'active', B: 'hot', C: 'hot', D: 'hot' },
               hotE: { AB: 1, BC: 1, CD: 1 } },
      rightTitle: '二叉树：沿 B 的右链走一遍',
      stats: { '规则': '若 p 是双亲的左孩子', '则': 'p 右链上的全是该双亲的孩子',
               'B 的右链': 'B → C → D', '加线': 'A–C、A–D' },
      notes: ['B 是 A 的左孩子 → B 是 A 的长子',
        'C 是 B 的右孩子 → C 与 B 同辈 → C 也是 A 的孩子',
        'D 是 C 的右孩子 → 同理，D 还是 A 的孩子'] }), 1,
      '第一步加线。B 是 A 的左孩子，说明 B 是 A 的长子；C 挂在 B 的右边，说明 C 与 B 同辈，' +
      '于是 C 也是 A 的孩子；D 挂在 C 右边，同理还是 A 的孩子。' +
      '沿着右链一路走下去，把 A–C、A–D 都补上。',
      ['B 是 A 的长子', '右链上 C D 与 B 同辈',
       '补 A–C、A–D']));

    steps.push(step(snap({
      hdr: '第一步（续）：每条右链都这么处理一遍',
      cap: 'E 是 B 的左孩子，E 右链上的 F 也是 B 的孩子 —— 连 B–F',
      right: { pos: BP, edges: BE, st: { B: 'active', E: 'hot', F: 'hot',
        A: 'good', C: 'good', D: 'good' }, hotE: { BE: 1, EF: 1 } },
      rightTitle: '二叉树：再看 E 的右链',
      stats: { 'E 是': 'B 的左孩子 → B 的长子', 'F 在': 'E 的右链上 → 与 E 同辈',
               '加线': 'B–F', 'D 的左孩子 G': 'G 右链为空，无需加线' },
      notes: ['E 是 B 的左孩子，F 是 E 的右孩子 → F 也是 B 的孩子',
        'D 的左孩子是 G，G 没有右孩子 → D 只有一个孩子',
        '所有左孩子都这样处理完，加线就结束了'] }), 1,
      '同样的规则再用一遍：E 是 B 的左孩子，F 挂在 E 的右边，所以 F 也是 B 的孩子，补上 B–F。' +
      'D 的左孩子是 G，而 G 没有右孩子，说明 D 只有一个孩子，不必加线。' +
      '把每个左孩子都这么处理一遍，加线就完了。',
      ['F 与 E 同辈 → 补 B–F', 'G 无右孩子 → D 只一个孩子',
       '加线结束']));

    steps.push(step(snap({
      hdr: '第二步 抹线：所有右链一律删掉',
      cap: '右链的信息已经转成「同辈」关系补进去了，线本身可以撤了',
      right: { pos: BP, edges: [['A', 'B', 'L'], ['B', 'E', 'L'], ['D', 'G', 'L']],
               st: { A: 'good', B: 'good', E: 'good', G: 'good' } },
      rightTitle: '抹掉右链，只剩左孩子的枝',
      stats: { '删掉': 'E–F、B–C、C–D 三条右链', '留下': 'A–B、B–E、D–G',
               '为什么可删': '同辈关系已补成父子边', '剩下的': '全是「父 → 长子」' },
      notes: ['右链存的是「同辈」，这层信息刚才已经用掉了',
        '删完之后每个结点向下只有一条左枝',
        'F C D 暂时悬着，第三步把它们摆回去'] }), 2,
      '第二步抹线：把所有右链一律删掉。右链存的是「同辈」这层信息，刚才加线时已经把它' +
      '转成父子边补进去了，线本身留着反而碍事。删完之后每个结点向下只剩一条左枝，' +
      'F C D 暂时悬着，下一步把它们摆回原位。',
      ['删掉三条右链', '同辈信息已转成父子边',
       '只剩父 → 长子']));

    steps.push(step(snap({
      hdr: '第三步 调整：同一条右链上的结点摆回同一层',
      cap: 'C D 与 B 同辈，摆到 B 那一层；F 与 E 同辈，摆到 E 那一层 —— 树就出来了',
      left: { pos: TP, edges: TE, st: { A: 'done', B: 'done', C: 'done',
        D: 'done', E: 'done', F: 'done', G: 'done' } },
      leftTitle: '还原出的树',
      right: { pos: BP, edges: [['A', 'B', 'L'], ['B', 'E', 'L'], ['D', 'G', 'L']],
               st: {} },
      rightTitle: '（对照：抹线后的二叉树）',
      stats: { 'C D': '提到 B 那一层', 'F': '提到 E 那一层',
               '结果': '与场景一的原树完全一致', '结论': '转换可逆' },
      notes: ['右链在二叉树里是纵向的，在树里是横向的',
        '所以「摆回同层」正是把纵向的右链拍平成横向的兄弟',
        '还原出的树与场景一的原树一模一样'],
      legend: '两个方向合起来说明：树与二叉树之间是一一对应，谁也没有多余的信息' }), 3,
      '第三步调整：把同一条右链上的结点摆回同一层。C D 与 B 同辈就提到 B 那层，F 与 E 同辈' +
      '就提到 E 那层。右链在二叉树里画成纵向，在树里本该是横向，这一步就是把它拍平。' +
      '还原出来的树与场景一的原树一模一样，可见转换确实可逆。',
      ['右链拍平成兄弟', 'C D 上提、F 上提',
       '还原结果与原树一致']));

    return steps;
  }

  /* ---------- 场景三：森林 → 二叉树 ----------
   * 只多一条约定：各棵树的根互相视为兄弟。
   * 于是第一棵树的根成为二叉树的根，第二棵挂在它的右子树上，依次类推。 */
  function buildF2B() {
    var steps = [];
    var snap = function (o) {
      return { hdr: o.hdr || '森林 → 二叉树：各棵树的根互为兄弟',
               cap: o.cap || null,
               leftTitle: o.leftTitle || '森林（三棵树）',
               rightTitle: o.rightTitle || null,
               left: o.left || null, right: o.right || null,
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    };

    steps.push(step(snap({
      cap: '森林是 m 棵互不相交的树；只要把各棵树的根也看成兄弟，就化归到上一场景',
      left: { pos: FP, edges: FE, st: {} },
      stats: { '森林': '3 棵树', '第一棵': 'A(B, C)',
               '第二棵': 'D(E)', '第三棵': 'F（单结点）' },
      notes: ['森林 = m 棵互不相交的树',
        '各棵树的根 A、D、F 本来毫无关系',
        '约定它们互为兄弟 —— 这一句就把森林变成了「一棵树的孩子」'] }), 0,
      '森林是 m 棵互不相交的树，本例三棵：A(B,C)、D(E)、还有光棍一根的 F。' +
      '转换只多一条约定：把各棵树的根 A、D、F 也看成兄弟。' +
      '这一句话下去，森林就跟上一场景的树没区别了。',
      ['森林 = m 棵树', '约定各根互为兄弟',
       '化归到树的情形']));

    steps.push(step(snap({
      hdr: '加线：根与根之间也连起来',
      cap: 'A–D、D–F 连上，再加上各棵树内部的兄弟线 B–C',
      left: { pos: FP, edges: FE, st: { A: 'hot', D: 'hot', F: 'hot' },
              sibs: FSIB },
      stats: { '根之间': 'A–D、D–F', '树内兄弟': 'B–C',
               '共加': '3 条', '此后': '与场景一的三步完全相同' },
      notes: ['先把三个根横着串成 A–D–F',
        '各棵树内部照旧：同双亲的孩子两两相连',
        '接下来抹线、旋转，一步不差'] }), 1,
      '加线时把三个根也横着串起来：A–D、D–F。各棵树内部照旧处理，B 与 C 是兄弟，连 B–C。' +
      '至此森林里所有的兄弟关系都连全了，剩下的抹线、旋转两步与场景一一模一样。',
      ['根串成 A–D–F', '树内兄弟照旧连',
       '后两步与树相同']));

    steps.push(step(snap({
      hdr: '抹线、旋转之后：第一棵树的根成了二叉树的根',
      cap: 'A 当根，第二棵树 D 挂在 A 的右子树上，第三棵 F 再挂在 D 的右子树上',
      left: { pos: FP, edges: FE, st: {}, sibs: FSIB },
      right: { pos: FBP, edges: FBE, st: { A: 'active', D: 'hot', F: 'hot' },
               hotE: { AD: 1, DF: 1 } },
      rightTitle: '转换后的二叉树',
      stats: { '二叉树的根': 'A（第一棵树的根）', 'A 的右子树': '第二棵树 D 起',
               'D 的右子树': '第三棵树 F', '右链长度': '3 = 森林里树的棵数' },
      notes: ['根 A 的右子树不再为空 —— 这是森林与树的分水岭',
        '从根出发的右链有几个结点，森林里就有几棵树',
        '本例右链 A → D → F，正好 3 棵'] }), 2,
      '抹线旋转之后，第一棵树的根 A 成了二叉树的根，第二棵树整个挂在 A 的右子树上，' +
      '第三棵又挂在 D 的右子树上。要紧的是：根 A 这回有右子树了 —— ' +
      '从根出发的右链有几个结点，森林里就有几棵树，本例 A → D → F 正好 3 棵。',
      ['A 当二叉树的根', '第 k 棵挂在前一棵的右子树',
       '右链长度 = 树的棵数']));

    steps.push(step(snap({
      hdr: '逆过来：二叉树 → 森林，看根有没有右子树',
      cap: '根有右子树 → 沿右链把它劈开，每一段就是一棵树',
      left: { pos: FP, edges: FE, st: { A: 'done', B: 'done', C: 'done',
        D: 'done', E: 'done', F: 'done' } },
      leftTitle: '还原出的森林',
      right: { pos: FBP, edges: FBE, st: { A: 'good', D: 'good', F: 'good' } },
      rightTitle: '（对照：二叉树）',
      stats: { '根无右子树': '还原成一棵树', '根有右子树': '还原成森林',
               '劈的位置': '从根出发的整条右链', '本例劈成': '3 段' },
      notes: ['把根的右子树摘下来，它就是「剩下的森林」',
        '递归地摘，摘几次就得几棵树',
        '这就是森林与二叉树互相转换的全部内容'],
      legend: '一句话记牢：根的右子树为空 ↔ 一棵树；非空 ↔ 森林，右链几个结点就几棵树' }), 3,
      '反过来还原时，看根有没有右子树就够了：没有就是一棵树，有就是森林，' +
      '沿着根出发的右链把它劈开，每一段连着它的左子树就是一棵树。本例劈成 3 段，' +
      '正是原来的 A(B,C)、D(E)、F。',
      ['看根有无右子树', '沿右链劈开',
       '劈几段就几棵树']));

    return steps;
  }

  /* ---------- 场景四：遍历的对应 ----------
   * 树的先根遍历 ↔ 二叉树的先序遍历；树的后根遍历 ↔ 二叉树的中序遍历。
   * 用场景一那棵树核对：先根 A B E F C D G，后根 E F B C G D A。 */
  var PRE_T = ['A', 'B', 'E', 'F', 'C', 'D', 'G'];
  var POST_T = ['E', 'F', 'B', 'C', 'G', 'D', 'A'];
  var PRE_B = ['A', 'B', 'E', 'F', 'C', 'D', 'G'];
  var IN_B = ['E', 'F', 'B', 'C', 'G', 'D', 'A'];

  function buildOrder() {
    var steps = [];
    var snap = function (o) {
      return { hdr: o.hdr || '遍历的对应：先根 ↔ 先序，后根 ↔ 中序',
               cap: o.cap || null, leftTitle: null, rightTitle: null,
               left: null, right: null, rows: o.rows || null,
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    };
    var ROWS = function (n, hi) {
      var r = [
        { title: '树的先根遍历', items: n >= 1 ? PRE_T : [], hi: n === 1 ? hi : -1 },
        { title: '二叉树的先序遍历 DLR', items: n >= 2 ? PRE_B : [], hi: n === 2 ? hi : -1 },
        { title: '树的后根遍历', items: n >= 3 ? POST_T : [], hi: n === 3 ? hi : -1 },
        { title: '二叉树的中序遍历 LDR', items: n >= 4 ? IN_B : [], hi: n === 4 ? hi : -1 }
      ];
      return r;
    };

    steps.push(step(snap({
      cap: '树没有「中根遍历」—— 孩子有好几个，根该插在哪两个之间？说不清',
      rows: ROWS(0, -1),
      stats: { '树的遍历': '先根、后根、层次', '为什么没有中根': '孩子多于两个，位置不唯一',
               '二叉树': '先序、中序、后序、层次', '要问的': '两边怎么对应' },
      notes: ['树的先根：先访问根，再依次先根遍历每棵子树',
        '树的后根：先依次后根遍历每棵子树，最后访问根',
        '没有中根遍历 —— 根插在哪儿都没道理'] }), 0,
      '树只有先根、后根两种深度遍历，没有「中根」—— 孩子有好几棵子树，' +
      '根该插在第几棵和第几棵之间？说不清。而二叉树有先序中序后序三种。' +
      '既然树与二叉树一一对应，遍历之间也该有对应关系，这就是要弄清的事。',
      ['树：先根、后根', '没有中根遍历',
       '两边遍历如何对应']));

    steps.push(step(snap({
      hdr: '树的先根遍历：A B E F C D G',
      cap: '访问根 A，再依次先根遍历 B、C、D 三棵子树',
      rows: ROWS(1, -1),
      stats: { '序列': 'A B E F C D G', '规则': '先根，再从左到右遍历各子树',
               'A 的子树': 'B(E,F) → C → D(G)', '首元素': '必为根' },
      notes: ['A → 子树 B：B E F → 子树 C：C → 子树 D：D G',
        '每棵子树内部照同样的规则递归',
        '序列第一个必定是根'] }), 1,
      '树的先根遍历：先访问根 A，然后从左到右依次先根遍历每棵子树。' +
      'B 的子树给出 B E F，C 只有自己，D 的子树给出 D G，' +
      '连起来就是 A B E F C D G。序列的第一个必定是根。',
      ['先访问根 A', '再左到右遍历各子树',
       'A B E F C D G']));

    steps.push(step(snap({
      hdr: '对照一：树的先根 = 二叉树的先序',
      cap: '两行一字不差 —— 因为「访问根、再走长子、再走兄弟」两边是同一个顺序',
      rows: ROWS(2, -1),
      stats: { '树的先根': 'A B E F C D G', '二叉树先序': 'A B E F C D G',
               '是否相同': '完全一致', '原因': '两边都是「根 → 长子 → 兄弟」' },
      notes: ['二叉树先序：根 → 左子树 → 右子树',
        '而左 = 长子、右 = 右兄弟',
        '所以先序就是「根 → 长子那支 → 兄弟那支」，与先根同序'] }), 2,
      '两行一字不差。道理在于二叉树的先序是「根 → 左子树 → 右子树」，' +
      '而左指长子、右指兄弟，所以它实际走的是「根 → 长子那一支 → 兄弟那一支」，' +
      '这与树的先根遍历「根 → 各棵子树从左到右」正是同一个顺序。',
      ['两个序列完全一致', '左=长子、右=兄弟',
       '先根 ↔ 先序']));

    steps.push(step(snap({
      hdr: '树的后根遍历：E F B C G D A',
      cap: '先依次后根遍历 B、C、D 三棵子树，最后才访问根 A',
      rows: ROWS(3, 6),
      stats: { '序列': 'E F B C G D A', '规则': '先各子树，最后访问根',
               '末元素': '必为根 A', '注意': '不是二叉树的后序' },
      notes: ['子树 B：E F B → 子树 C：C → 子树 D：G D → 最后 A',
        '序列最后一个必定是根',
        '这个序列要去和二叉树的中序比，不是后序'] }), 3,
      '树的后根遍历反过来：先从左到右依次后根遍历每棵子树，最后才访问根。' +
      '得到 E F B C G D A，最后一个必定是根 A。' +
      '要留意的是，这个序列该去和二叉树的中序比，而不是后序。',
      ['先各子树，最后根', 'E F B C G D A',
       '末元素必为根']));

    steps.push(step(snap({
      hdr: '对照二：树的后根 = 二叉树的中序',
      cap: '又是一字不差 —— 中序「左 → 根 → 右」读成「长子那支 → 根 → 兄弟那支」',
      rows: ROWS(4, -1),
      stats: { '树的后根': 'E F B C G D A', '二叉树中序': 'E F B C G D A',
               '是否相同': '完全一致', '不是': '二叉树的后序（E F B C G D A 才对应中序）' },
      notes: ['中序：左子树 → 根 → 右子树',
        '即：长子那一支 → 根 → 兄弟那一支',
        '「根排在自己的子树之后、兄弟之前」，恰是后根遍历'],
      legend: '两条对应记牢：树的先根 ↔ 二叉树先序；树的后根 ↔ 二叉树中序（不是后序）' }), 4,
      '又是一字不差。中序是「左子树 → 根 → 右子树」，翻译过来就是' +
      '「长子那一支 → 根 → 兄弟那一支」—— 根排在自己的子树之后、兄弟之前，' +
      '这正是后根遍历的位置。所以对应的是中序，不是后序，考试最爱在这里出错。',
      ['两个序列完全一致', '后根 ↔ 中序',
       '不是后序，别记错']));

    steps.push(step(snap({
      hdr: '用途：树的遍历都可以借二叉树的算法来做',
      cap: '森林同理 —— 森林的先序 ↔ 二叉树先序，森林的中序 ↔ 二叉树中序',
      rows: ROWS(4, -1),
      stats: { '树先根': '= 二叉树先序', '树后根': '= 二叉树中序',
               '森林先序': '= 二叉树先序', '森林中序': '= 二叉树中序' },
      notes: ['树和森林的遍历不必另写算法，转成二叉树即可',
        '森林的中序遍历：中序遍历第一棵树的子树森林 → 访问根 → 中序遍历其余树',
        '这两条对应是「化归」思想最干净的一个例子'],
      legend: '一句话收束：左孩子右兄弟把树化归成二叉树，遍历也随之化归 —— 一套算法两用' }), 5,
      '这两条对应的用处很实在：树和森林的遍历不必另写算法，转成二叉树再用先序中序即可。' +
      '森林也一样 —— 森林的先序对应二叉树先序，森林的中序对应二叉树中序。' +
      '一个「左孩子右兄弟」的连法，把树的问题整体化归到了二叉树上。',
      ['树的遍历可借二叉树算法', '森林同样两条对应',
       '化归：一套算法两用']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['tree-forest-convert'] = {
    title: '树、森林与二叉树的转换 Conversion',
    subtitle: '树的孩子个数不定，二叉树只有左右两个指针。「左孩子右兄弟」这一招把任意树、' +
      '任意森林都唯一对应到一棵二叉树上 —— 存储与遍历于是都能借二叉树的现成办法。',
    height: 700,
    code: [
      'typedef struct CSNode {      // 孩子兄弟链表',
      '    ElemType data;',
      '    struct CSNode *firstChild;   // 左：指向长子',
      '    struct CSNode *nextSibling;  // 右：指向右兄弟',
      '} CSNode, *CSTree;',
      '// 加线、抹线、旋转；根无右子树 ↔ 一棵树，有 ↔ 森林'
    ],
    scenes: [
      { name: '树 → 二叉树', build: buildT2B,
        codeTag: '加线、抹线、旋转',
        code: [
          '// 一 加线：同一双亲的孩子，从左到右两两相连',
          '// 二 抹线：每个结点只留与长子相连的那一条',
          '// 三 旋转：长子线画左斜，兄弟线画右斜',
          '',
          'typedef struct CSNode {',
          '    ElemType data;',
          '    struct CSNode *firstChild;   // 左 = 长子',
          '    struct CSNode *nextSibling;  // 右 = 右兄弟',
          '} CSNode, *CSTree;   // 根的 nextSibling 恒为 NULL'
        ] },
      { name: '二叉树 → 树', build: buildB2T,
        codeTag: '右链上的都是同辈',
        code: [
          '// 前提：根没有右子树（否则还原出来是森林）',
          '// 一 加线：若 p 是双亲的左孩子，则 p 右链上的',
          '//          结点全都是该双亲的孩子，一律连上',
          '// 二 抹线：删掉所有右链',
          '// 三 调整：同一条右链上的结点摆回同一层',
          '',
          '// 记住：二叉树的右链 = 树里的一排兄弟'
        ] },
      { name: '森林 → 二叉树', build: buildF2B,
        codeTag: '各棵树的根互为兄弟',
        code: [
          '// 只多一条约定：各棵树的根也视为兄弟',
          '// 于是 第一棵树的根 → 二叉树的根',
          '//      第二棵树 → 挂在它的右子树',
          '//      第三棵树 → 再挂在第二棵的右子树 …',
          '',
          '// 反向判断：根的右子树为空 → 一棵树',
          '//           根的右子树非空 → 森林',
          '// 从根出发的右链有几个结点，就有几棵树'
        ] },
      { name: '遍历的对应', build: buildOrder,
        codeTag: '先根↔先序，后根↔中序',
        code: [
          '// 树的先根遍历：访问根，再依次先根遍历各子树',
          '// 树的后根遍历：先依次后根遍历各子树，最后访问根',
          '// 树没有「中根遍历」—— 根插在哪儿都没道理',
          '',
          '// 对应关系（考点）：',
          '//   树/森林的 先根(先序) == 二叉树的 先序 DLR',
          '//   树/森林的 后根(中序) == 二叉树的 中序 LDR',
          '// 注意后根对应中序，不是后序'
        ] }
    ]
  };
})();
