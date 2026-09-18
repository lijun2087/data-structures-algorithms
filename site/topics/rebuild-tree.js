/* 由遍历序列重建二叉树 — 第6章
 * 一个序列不够：先序只告诉你谁是根，中序才告诉你左右的分界线 ——
 * 两样凑在一起，树才唯一。
 * 场景一：先序 + 中序 → 递归定根、切段、再定根。
 * 场景二：后序 + 中序 → 换成从末尾取根，其余一样。
 * 场景三：为什么先序 + 后序不行 —— 一个反例就够。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /*        A
   *      /   \
   *     B     C
   *    / \   /
   *   D   E F
   *      /
   *     G
   * 先序 A B D E G C F　中序 D B G E A F C　后序 D G E B F C A
   * 刻意做得不对称：三个序列互不相同，切段时左右长度也不相等。 */
  var V = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 10: 'G' };
  var IDS = [1, 2, 3, 4, 5, 6, 10];
  var ID = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 10 };
  var PRE = ['A', 'B', 'D', 'E', 'G', 'C', 'F'];
  var IN = ['D', 'B', 'G', 'E', 'A', 'F', 'C'];
  var POST = ['D', 'G', 'E', 'B', 'F', 'C', 'A'];
  var NN = 7;

  /* 布局：树在左 x∈[58,290]，序列在右 x=512 起 7 格。
   * 竖直：标题 100 / 说明 122 / 树 162·206·250·294（r=15，底 309）/
   *       序列 146…176 与 208…238 / 备注 272…312 / 结语 336。 */
  var X0 = 20, SPAN = 430, Y0 = 162, DY = 44, R = 15;
  var SX = 512, SW = 40, SG = 5, SH = 30;
  var RY = [146, 208];

  // 逐层数过去求层号，整数运算不会有浮点误差
  function levelOf(i) { var L = 1, f = 1; while (f * 2 <= i) { f *= 2; L++; } return L; }
  function xOf(i) {
    var L = levelOf(i), k = 1, f = 1, q;
    for (q = 1; q < L; q++) { k *= 2; f *= 2; }
    return X0 + SPAN * (i - f + 0.5) / k;
  }
  function yOf(i) { return Y0 + (levelOf(i) - 1) * DY; }

  /* 只画 only 里点到的结点；边的两端都在才连 */
  function treeFrame(only, st) {
    var nodes = {}, edges = [], j, i;
    for (j = 0; j < IDS.length; j++) {
      i = IDS[j];
      if (only && !only[i]) continue;
      nodes[i] = { x: xOf(i), y: yOf(i), label: V[i],
                   st: (st && st[i]) || 'idle' };
    }
    for (j = 0; j < IDS.length; j++) {
      i = IDS[j];
      if (i === 1) continue;
      if (nodes[i] && nodes[i >> 1]) edges.push(['' + (i >> 1), '' + i]);
    }
    return { nodes: nodes, edges: edges };
  }

  function drawTree(g, nodes, edges, hotE) {
    var i, e, a, b, hot;
    for (i = 0; i < edges.length; i++) {
      e = edges[i]; a = nodes[e[0]]; b = nodes[e[1]];
      if (!a || !b) continue;
      hot = hotE && hotE[e[0] + '-' + e[1]];
      D.link(g, { x1: a.x, y1: a.y + R - 2, x2: b.x, y2: b.y - R + 2,
        kind: hot ? 'hot' : 'next', arrow: false, width: hot ? 2.6 : 1.7 });
    }
    for (i in nodes) {
      D.circleNode(g, { x: nodes[i].x, y: nodes[i].y, r: R,
        state: nodes[i].st || 'idle', value: nodes[i].label });
    }
  }

  /* 一行序列格子。sts[i] 给每格上色：hot=当前根，active=左段，good=右段 */
  function seqRow(g, x, y, title, items, sts) {
    g.appendChild(D.text(title,
      { x: x, y: y - 11, 'class': 'vz-tag', fill: '#9fb4dc',
        'text-anchor': 'start' }));
    var i, cx, c, s;
    for (i = 0; i < items.length && i < 7; i++) {
      cx = x + i * (SW + SG);
      s = (sts && sts[i]) || 'mute';
      c = D.C[s];
      g.appendChild(D.el('rect', { x: cx, y: y, width: SW, height: SH,
        rx: 5, fill: c.fill, stroke: c.stroke,
        'stroke-width': s === 'hot' ? 2.8 : 1.5 }));
      g.appendChild(D.text(items[i],
        { x: cx + SW / 2, y: y + 21, 'class': 'vz-cellval',
          fill: s === 'mute' ? '#4a5c82' : '#eef3ff' }));
      g.appendChild(D.text(i,
        { x: cx + SW / 2, y: y + SH + 13, 'class': 'vz-idx' }));
    }
  }

  /* f = { trees:[{nodes,edges,hotE,label,lx,ly}], rows:[{title,items,sts}],
   *       hdr, cap, notes, legend, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var j, t;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    for (j = 0; j < (f.trees || []).length; j++) {
      t = f.trees[j];
      drawTree(ctx.stage, t.nodes, t.edges, t.hotE);
      if (t.label) {
        ctx.stage.appendChild(D.text(t.label,
          { x: t.lx, y: t.ly, 'class': 'vz-tag', fill: '#9fb4dc' }));
      }
    }

    for (j = 0; j < (f.rows || []).length && j < 2; j++) {
      seqRow(ctx.stage, SX, RY[j], f.rows[j].title, f.rows[j].items,
        f.rows[j].sts);
    }

    for (j = 0; j < (f.notes || []).length && j < 3; j++) {
      ctx.stage.appendChild(D.text(f.notes[j],
        { x: SX, y: 272 + j * 20, 'class': 'vz-info' }));
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

  function mk() { var a = [], i; for (i = 0; i < NN; i++) a.push('mute'); return a; }
  function allDone(only, cur, kind) {
    var st = {}, q;
    for (q in only) st[q] = 'done';
    if (cur) st[cur] = kind || 'hot';
    return st;
  }

  /* ---------- 场景一：先序 + 中序 ----------
   * 先序的首元素是根，拿它去中序里一切两段：左边是左子树，右边是右子树。
   * 两段的长度同时也把先序剩下的部分切开 —— 递归下去即可。 */
  function buildPreIn() {
    var steps = [];
    var only = {};

    var snap = function (o) {
      var fr = treeFrame(only, o.st || {});
      return { trees: [{ nodes: fr.nodes, edges: fr.edges, hotE: o.hotE || null }],
               rows: [{ title: '先序 preorder（首元素是根）', items: PRE,
                        sts: o.ps || mk() },
                      { title: '中序 inorder（根把它切成左右两段）', items: IN,
                        sts: o.is || mk() }],
               hdr: o.hdr || '先序 + 中序：定根、切段、再定根',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      hdr: '一个序列不够：它定不下唯一的树',
      cap: '只给先序 A B D E G C F，能画出的树不止一棵 —— 缺的是「左右从哪里分」这个信息',
      ps: (function () { var a = mk(); a[0] = 'hot'; return a; })(),
      stats: { '先序告诉你': '谁是根', '先序没告诉你': '左右的分界',
               '中序告诉你': '根左边是左子树', '两个合起来': '树唯一' },
      notes: ['先序首元素 A 一定是根，这点确定',
        '但 B D E G C F 里哪些属于左子树？先序说不出',
        '中序序列里根的左边恰好是左子树，右边是右子树'] }), 0,
      '光有先序定不出树：先序只说了 A 是根，可剩下六个字母里哪些归左子树、哪些归右子树，' +
      '它一个字也没提。中序序列正好补上这一点 —— 中序里根的左边全是左子树，右边全是右子树。',
      ['先序 → 谁是根', '中序 → 左右分界',
       '两个合起来树才唯一']));

    function rec(pl, pr, il, ir, tag) {
      if (pl > pr) return;
      var root = PRE[pl], k, q;
      for (q = il; q <= ir; q++) if (IN[q] === root) k = q;
      var nl = k - il, nr = ir - k;

      var ps = mk(), is = mk();
      ps[pl] = 'hot';
      for (q = pl + 1; q <= pl + nl; q++) ps[q] = 'active';
      for (q = pl + nl + 1; q <= pr; q++) ps[q] = 'good';
      is[k] = 'hot';
      for (q = il; q < k; q++) is[q] = 'active';
      for (q = k + 1; q <= ir; q++) is[q] = 'good';

      only[ID[root]] = 1;
      var he = null;
      if (ID[root] !== 1) { he = {}; he[(ID[root] >> 1) + '-' + ID[root]] = 1; }

      steps.push(step(snap({
        st: allDone(only, ID[root]), hotE: he, ps: ps, is: is,
        cap: tag + '取先序首元素 ' + root + ' 作根；中序里 ' + root +
             ' 左边 ' + nl + ' 个是左子树，右边 ' + nr + ' 个是右子树',
        stats: { '当前根': root, '先序区间': '[' + pl + ', ' + pr + ']',
                 '中序区间': '[' + il + ', ' + ir + ']',
                 '左 / 右规模': nl + ' / ' + nr },
        notes: ['根 = pre[' + pl + '] = ' + root,
          '在中序里找到它：in[' + k + ']',
          '左子树 ' + nl + ' 个 → 先序紧跟着的 ' + nl + ' 个也是它'],
        legend: '黄格是当前根，蓝格是左子树那一段，绿格是右子树那一段' }), 2,
        tag + '先序区间的首元素 ' + root + ' 就是这棵子树的根。到中序里找到 ' + root +
        '，它左边 ' + nl + ' 个字母构成左子树，右边 ' + nr + ' 个构成右子树；' +
        '知道了左子树有 ' + nl + ' 个，先序里紧跟根的那 ' + nl + ' 个也就是它。',
        ['根 = ' + root, '中序切成 ' + nl + ' | ' + nr,
         '先序同步切开']));

      rec(pl + 1, pl + nl, il, k - 1, root + ' 的左子树：');
      rec(pl + nl + 1, pr, k + 1, ir, root + ' 的右子树：');
    }
    rec(0, NN - 1, 0, NN - 1, '整棵树：');

    var fs = mk(), fq;
    for (fq = 0; fq < NN; fq++) fs[fq] = 'done';
    steps.push(step(snap({
      st: allDone(only, 0), ps: fs, is: fs,
      hdr: '重建完成：先序 + 中序 唯一确定一棵二叉树',
      cap: '每个结点被定为根恰好一次 —— 递归 n 层，用哈希表在中序里查根可做到 O(n)',
      stats: { '结点数': NN, '递归次数': NN,
               '朴素查根': 'O(n²)', '哈希查根': 'O(n)' },
      notes: ['每次递归定下一个结点，共 n 次',
        '瓶颈是「在中序里找根」这一步',
        '先把中序的 值 → 下标 存进哈希表，整体降到 O(n)'],
      legend: '中序序列里根的位置就是分界线 —— 这是整个算法唯一用到的性质' }), -1,
      '重建完成。整个过程里每个结点恰好被定为根一次，所以递归 n 次；' +
      '唯一的开销在「到中序里找根」，朴素扫描是 O(n²)，事先把中序的值到下标存成哈希表就是 O(n)。',
      ['递归 n 次', '瓶颈是查根',
       '哈希查根 → O(n)']));

    return steps;
  }

  /* ---------- 场景二：后序 + 中序 ----------
   * 后序的末元素是根，其余一模一样。要留意后序里左右两段的先后：
   * 左段在前、右段在后，而根被挤到了最末。 */
  function buildPostIn() {
    var steps = [];
    var only = {};

    var snap = function (o) {
      var fr = treeFrame(only, o.st || {});
      return { trees: [{ nodes: fr.nodes, edges: fr.edges, hotE: o.hotE || null }],
               rows: [{ title: '后序 postorder（末元素是根）', items: POST,
                        sts: o.ps || mk() },
                      { title: '中序 inorder（根把它切成左右两段）', items: IN,
                        sts: o.is || mk() }],
               hdr: o.hdr || '后序 + 中序：从末尾取根，其余照旧',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      ps: (function () { var a = mk(); a[NN - 1] = 'hot'; return a; })(),
      cap: '后序是「左 右 根」，所以根被挤到了最末 —— 换成从末尾取根，别的一步不改',
      stats: { '先序': '根 左 右 → 取首', '后序': '左 右 根 → 取末',
               '中序的作用': '照旧切分左右', '算法差别': '只差一个下标' },
      notes: ['后序末元素 A 一定是根',
        '中序仍然负责切分左右子树',
        '后序里左段在前、右段在后，根在最末'] }), 0,
      '后序是「左 右 根」，根被挤到了序列最末。所以整个算法只改一处：从取首元素变成取末元素，' +
      '中序照旧负责切分左右。这也说明重建靠的不是先序或后序本身，而是「有一个序列能指出根」。',
      ['后序末元素是根', '中序照旧切分',
       '只差一个下标']));

    function rec(pl, pr, il, ir, tag) {
      if (pl > pr) return;
      var root = POST[pr], k, q;
      for (q = il; q <= ir; q++) if (IN[q] === root) k = q;
      var nl = k - il, nr = ir - k;

      var ps = mk(), is = mk();
      ps[pr] = 'hot';
      for (q = pl; q < pl + nl; q++) ps[q] = 'active';
      for (q = pl + nl; q < pr; q++) ps[q] = 'good';
      is[k] = 'hot';
      for (q = il; q < k; q++) is[q] = 'active';
      for (q = k + 1; q <= ir; q++) is[q] = 'good';

      only[ID[root]] = 1;
      var he = null;
      if (ID[root] !== 1) { he = {}; he[(ID[root] >> 1) + '-' + ID[root]] = 1; }

      steps.push(step(snap({
        st: allDone(only, ID[root]), hotE: he, ps: ps, is: is,
        cap: tag + '取后序末元素 ' + root + ' 作根；中序切出左 ' + nl +
             ' 个、右 ' + nr + ' 个，后序里也照这个长度切',
        stats: { '当前根': root, '后序区间': '[' + pl + ', ' + pr + ']',
                 '中序区间': '[' + il + ', ' + ir + ']',
                 '左 / 右规模': nl + ' / ' + nr },
        notes: ['根 = post[' + pr + '] = ' + root,
          '中序里找到它：in[' + k + ']',
          '后序前 ' + nl + ' 个是左子树，接着 ' + nr + ' 个是右子树'],
        legend: '注意后序的切法：左段贴着区间头，右段紧随其后，根单独在末尾' }), 2,
        tag + '后序区间的末元素 ' + root + ' 是这棵子树的根。中序里 ' + root +
        ' 左边 ' + nl + ' 个是左子树、右边 ' + nr + ' 个是右子树；' +
        '回到后序，区间开头 ' + nl + ' 个就是左子树，紧接着 ' + nr + ' 个是右子树，根落在最末。',
        ['根 = ' + root + '（末元素）', '中序切成 ' + nl + ' | ' + nr,
         '后序左段在前']));

      rec(pl, pl + nl - 1, il, k - 1, root + ' 的左子树：');
      rec(pl + nl, pr - 1, k + 1, ir, root + ' 的右子树：');
    }
    rec(0, NN - 1, 0, NN - 1, '整棵树：');

    var fs = mk(), fq;
    for (fq = 0; fq < NN; fq++) fs[fq] = 'done';
    steps.push(step(snap({
      st: allDone(only, 0), ps: fs, is: fs,
      hdr: '重建完成：后序 + 中序 同样唯一确定一棵二叉树',
      cap: '与场景一得到的是同一棵树 —— 两种组合互相印证',
      stats: { '结点数': NN, '与场景一': '结果相同',
               '时间': 'O(n)（哈希查根）', '关键': '有序列能定根' },
      notes: ['先序 + 中序、后序 + 中序，两种组合都能唯一重建',
        '共同点：一个定根，一个切分左右',
        '层次序列 + 中序也行，道理完全一样'],
      legend: '重建的必要条件：一个序列指出根，另一个序列划出左右的界' }), -1,
      '结果与场景一完全一致。可以看出重建需要的是两件事：一个序列指出根，另一个序列划出左右的界。' +
      '按这个道理，层次遍历序列加中序也能重建 —— 层次序列的首元素同样是根。',
      ['与场景一同一棵树', '一个定根 + 一个分界',
       '层次 + 中序也可以']));

    return steps;
  }

  /* ---------- 场景三：为什么先序 + 后序不行 ----------
   * 先序说根在最前，后序说根在最末 —— 两个都在说根，谁也不说左右的界。
   * 一个两结点的反例就够：B 挂左边还是挂右边，两个序列完全一样。 */
  function nodeAt(x, y, label, st) {
    return { x: x, y: y, label: label, st: st || 'idle' };
  }

  function buildWhyNot() {
    var steps = [];

    var snap = function (o) {
      return { trees: o.trees || [], rows: o.rows || [],
               hdr: o.hdr || '先序 + 后序：定不下唯一的树',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var seq = function (pre, post, ps, qs) {
      return [{ title: '先序（根在最前）', items: pre, sts: ps },
              { title: '后序（根在最末）', items: post, sts: qs }];
    };

    // 两结点反例的两棵候选树
    var t1 = { nodes: { a: nodeAt(152, 186, 'A', 'hot'),
                        b: nodeAt(112, 232, 'B', 'active') },
               edges: [['a', 'b']],
               label: '候选一：B 是左孩子', lx: 132, ly: 152 };
    var t2 = { nodes: { a: nodeAt(392, 186, 'A', 'hot'),
                        b: nodeAt(432, 232, 'B', 'active') },
               edges: [['a', 'b']],
               label: '候选二：B 是右孩子', lx: 412, ly: 152 };

    steps.push(step(snap({
      trees: [{ nodes: { a: nodeAt(272, 186, 'A', 'hot') }, edges: [] }],
      rows: seq(['A', 'B'], ['B', 'A'], ['hot', 'mute'], ['mute', 'hot']),
      cap: '先序说根在最前，后序说根在最末 —— 两句话都在说根，谁也没说左右的界',
      stats: { '先序给出': '根', '后序给出': '根',
               '缺的是': '左右分界', '结论': '不能唯一重建' },
      notes: ['能重建的组合必须一个定根、一个分界',
        '中序的价值就在于「根左边是左子树」',
        '先序 + 后序 里根出现两次，分界一次也没有'] }), 0,
      '先序告诉你根在最前，后序告诉你根在最末 —— 两句话说的是同一件事。' +
      '重建需要的另一半信息「左右从哪里分」，两个序列都没给。只有中序才有这个本事。',
      ['两个都只定根', '没有一个划界',
       '所以不能唯一重建']));

    steps.push(step(snap({
      trees: [t1, t2],
      rows: seq(['A', 'B'], ['B', 'A'], ['hot', 'active'], ['active', 'hot']),
      cap: '一个两结点的反例就够：B 挂在左边还是右边，先序都是 A B、后序都是 B A',
      stats: { '先序': 'A B', '后序': 'B A',
               '符合的树': '2 棵', '能区分吗': '不能' },
      notes: ['候选一：A 的左孩子是 B',
        '候选二：A 的右孩子是 B',
        '两棵树的先序、后序一字不差 —— 反例成立'],
      legend: '只要有结点只带一个孩子，就分不清这个孩子挂在左边还是右边' }), 1,
      '一个两结点的例子就足以推翻：B 当左孩子和当右孩子，先序都是 A B，后序都是 B A。' +
      '根子只有一个孩子时，先序里它紧跟着根、后序里它紧挨着根 —— 挂左挂右完全看不出来。',
      ['先序 A B，后序 B A', '两棵树都符合',
       '反例成立']));

    var c1 = { nodes: { a: nodeAt(152, 172, 'A', 'hot'),
                        b: nodeAt(112, 218, 'B', 'active'),
                        c: nodeAt(72, 264, 'C', 'good') },
               edges: [['a', 'b'], ['b', 'c']],
               label: '左 左', lx: 112, ly: 148 };
    var c2 = { nodes: { a: nodeAt(392, 172, 'A', 'hot'),
                        b: nodeAt(352, 218, 'B', 'active'),
                        c: nodeAt(392, 264, 'C', 'good') },
               edges: [['a', 'b'], ['b', 'c']],
               label: '左 右', lx: 372, ly: 148 };

    steps.push(step(snap({
      trees: [c1, c2],
      rows: seq(['A', 'B', 'C'], ['C', 'B', 'A'],
        ['hot', 'active', 'good'], ['good', 'active', 'hot']),
      hdr: '反例可以有多少个：单支树全都长一个样',
      cap: 'n 个结点的单支树共 2^(n−1) 种形态，先序全是 A B C…、后序全是倒过来',
      stats: { '先序': 'A B C', '后序': 'C B A',
               '3 结点单支树': '4 种', 'n 结点': '2^(n−1) 种' },
      notes: ['每一层往左拐还是往右拐，都有两种选择',
        '这些选择不影响先序，也不影响后序',
        '所以歧义不是偶然，而是成片出现'],
      legend: '图上只画了两种；把 B 也挂到右边，还有「右左」「右右」两种' }), 1,
      '歧义不是个别巧合。单支树每往下一层都可以选左或选右，' +
      'n 个结点共 2^(n−1) 种形态，而它们的先序一律是 A B C…、后序一律是倒序 —— ' +
      '3 个结点就有 4 棵树对应同一对序列。',
      ['单支树 2^(n−1) 种', '先序后序完全相同',
       '3 结点就有 4 棵']));

    var fr = treeFrame(null, (function () {
      var o = {}, q;
      for (q = 0; q < IDS.length; q++) o[IDS[q]] = 'done';
      return o;
    })());
    steps.push(step(snap({
      trees: [{ nodes: fr.nodes, edges: fr.edges }],
      rows: [{ title: '先序 + 后序：都在指根，✗',
               items: PRE, sts: (function () {
                 var a = mk(); a[0] = 'bad'; return a; })() },
             { title: '中序：唯一能划出左右界的序列，✓',
               items: IN, sts: (function () {
                 var a = mk(), q;
                 for (q = 0; q < NN; q++) a[q] = q === 4 ? 'hot' : (q < 4 ? 'active' : 'good');
                 return a; })() }],
      hdr: '小结：能重建的组合，中序必须在场',
      cap: '先序 + 中序 ✓　后序 + 中序 ✓　层次 + 中序 ✓　先序 + 后序 ✗',
      stats: { '先序 + 中序': '可以', '后序 + 中序': '可以',
               '层次 + 中序': '可以', '先序 + 后序': '不可以' },
      notes: ['中序提供分界，另一个序列提供根',
        '缺了中序，左右子树的归属就没有依据',
        '例外：若已知是满二叉树，先序 + 后序也能重建'],
      legend: '中序序列里根的位置把它劈成两半 —— 这条性质是重建算法的全部依据' }), -1,
      '归纳一句：能唯一重建的组合里中序必须在场，它提供分界，另一个序列提供根。' +
      '先序加后序缺了分界所以不行 —— 除非事先知道这是满二叉树，' +
      '那时每个结点要么没孩子要么有两个，歧义自然消失。',
      ['中序必须在场', '它提供左右分界',
       '满二叉树是例外']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['rebuild-tree'] = {
    title: '由遍历序列重建二叉树 Rebuild',
    subtitle: '一个序列不够：先序只告诉你谁是根，中序才告诉你左右的分界。' +
      '两样凑在一起树才唯一 —— 而先序加后序说的都是根，定不下一棵树。',
    height: 700,
    code: [
      'BiTree Build(pre, pl, pr, in, il, ir) {',
      '    if (pl > pr) return NULL;',
      '    root = NewNode(pre[pl]);          // 先序首元素是根',
      '    k = IndexIn(in, il, ir, pre[pl]); // 中序里找根的位置',
      '    nl = k - il;                      // 左子树规模',
      '    root->lchild = Build(pre, pl+1,    pl+nl, in, il,  k-1);',
      '    root->rchild = Build(pre, pl+nl+1, pr,    in, k+1, ir);',
      '    return root;',
      '}'
    ],
    scenes: [
      { name: '先序 + 中序', build: buildPreIn,
        codeTag: '取首元素定根，中序切段',
        code: [
          'BiTree Build(pre, pl, pr, in, il, ir) {',
          '    if (pl > pr) return NULL;         // 区间空 → 空树',
          '    root = NewNode(pre[pl]);          // ← 先序首元素是根',
          '    k = IndexIn(in, il, ir, pre[pl]); // 中序里定位根',
          '    nl = k - il;                      // 左子树 nl 个',
          '    root->lchild = Build(pre, pl+1,    pl+nl, in, il,  k-1);',
          '    root->rchild = Build(pre, pl+nl+1, pr,    in, k+1, ir);',
          '    return root;',
          '}   // 中序预存哈希表 → O(n)'
        ] },
      { name: '后序 + 中序', build: buildPostIn,
        codeTag: '取末元素定根，其余照旧',
        code: [
          'BiTree Build2(post, pl, pr, in, il, ir) {',
          '    if (pl > pr) return NULL;',
          '    root = NewNode(post[pr]);          // ← 后序末元素是根',
          '    k = IndexIn(in, il, ir, post[pr]);',
          '    nl = k - il;',
          '    root->lchild = Build2(post, pl,    pl+nl-1, in, il,  k-1);',
          '    root->rchild = Build2(post, pl+nl, pr-1,    in, k+1, ir);',
          '    return root;',
          '}   // 后序：左段在前，右段紧随，根在末'
        ] },
      { name: '先序 + 后序为何不行', build: buildWhyNot,
        codeTag: '一个反例就够',
        code: [
          '// 先序 A B   后序 B A',
          '//   A          A',
          '//  /            \\',
          '// B              B',
          '// 两棵树的先序、后序完全相同 → 无法区分',
          '// 单支树共 2^(n-1) 种形态，序列全都一样',
          '// 根因：先序与后序都只指出根，没有一个划出左右界',
          '// 例外：已知是满二叉树时，先序 + 后序可以重建'
        ] }
    ]
  };
})();
