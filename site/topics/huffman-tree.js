/* 哈夫曼树与哈夫曼编码 — 第6章
 * 等长编码浪费：常用字和罕见字占一样多的位。让常用字短、罕见字长就能省 ——
 * 但短码不能是别的码的前缀，否则解不开。哈夫曼树同时解决这两件事。
 * 场景一：为什么要变长编码，以及前缀码的必要性。
 * 场景二：哈夫曼算法构造最优树（每次取两个最小的合并）。
 * 场景三：从树上读出编码，算 WPL，与等长编码比压缩率。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 六个字符及其频度（权值）。刻意让频度差得开，压缩效果才明显。 */
  var CH = ['A', 'B', 'C', 'D', 'E', 'F'];
  var WT = { A: 45, B: 13, C: 12, D: 16, E: 9, F: 5 };
  var TOTW = 100;

  var R = 16;
  /* 森林横排：6 个初始结点摊在 x∈[70,470]，合并时新结点往上走。
   * 竖直：标题 100 / 说明 122 / 森林基线 y=300，每合并一层往上 46。 */
  var FX0 = 70, FGAP = 80, FBASE = 300, FDY = 46;
  /* 右侧：权值表与编码表 */
  var TBX = 556, TBY = 156, TBW = 62, TBH = 26;

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* 一行标签 + 数值的小表格，画在右侧 */
  function tbl(g, x, y, title, rows, hi) {
    g.appendChild(D.text(title,
      { x: x, y: y - 10, 'class': 'vz-tag', fill: '#9fb4dc',
        'text-anchor': 'start' }));
    var i, c, ry;
    for (i = 0; i < rows.length && i < 7; i++) {
      ry = y + i * (TBH + 2);
      c = D.C[hi && hi[rows[i][0]] ? hi[rows[i][0]] : 'idle'];
      g.appendChild(D.el('rect', { x: x, y: ry, width: TBW, height: TBH,
        rx: 4, fill: c.fill, stroke: c.stroke,
        'stroke-width': hi && hi[rows[i][0]] ? 2.4 : 1.3 }));
      g.appendChild(D.text(rows[i][0],
        { x: x + 16, y: ry + 18, 'class': 'vz-idx', fill: '#dfe8ff',
          'font-size': 12.5 }));
      g.appendChild(D.text(rows[i][1],
        { x: x + 46, y: ry + 18, 'class': 'vz-idx', fill: '#9fb4dc',
          'font-size': 12 }));
    }
  }

  /* 画一片森林。nodes: {id: {x,y,w,label,st}}；edges: [父,子,'0'/'1'] */
  function drawForest(g, nodes, edges, hotE) {
    var i, e, a, b;
    for (i = 0; i < edges.length; i++) {
      e = edges[i]; a = nodes[e[0]]; b = nodes[e[1]];
      if (!a || !b) continue;
      var hot = hotE && hotE[e[0] + '-' + e[1]];
      D.link(g, { x1: a.x, y1: a.y + R - 2, x2: b.x, y2: b.y - R + 2,
        kind: hot ? 'hot' : 'next', arrow: false, width: hot ? 2.6 : 1.7 });
      // 0/1 标在边的中点旁，不用 D.link 的 label（假 DOM 会算成 (0,0)）
      if (e[2]) {
        g.appendChild(D.text(e[2],
          { x: (a.x + b.x) / 2 + (e[2] === '0' ? -10 : 10),
            y: (a.y + b.y) / 2 + 4, 'class': 'vz-idx',
            fill: e[2] === '0' ? '#7fb6ff' : '#ffb46c', 'font-size': 12.5 }));
      }
    }
    for (i in nodes) {
      D.circleNode(g, { x: nodes[i].x, y: nodes[i].y, r: R,
        state: nodes[i].st || 'idle', value: nodes[i].label });
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

    if (f.nodes) drawForest(ctx.stage, f.nodes, f.edges || [], f.hotE);
    if (f.tables) {
      for (j = 0; j < f.tables.length && j < 3; j++) {
        tbl(ctx.stage, TBX + j * (TBW + 34), TBY, f.tables[j].title,
          f.tables[j].rows, f.tables[j].hi);
      }
    }
    if (f.bars) {
      for (j = 0; j < f.bars.length && j < 3; j++) {
        ctx.stage.appendChild(D.text(f.bars[j],
          { x: 556, y: 146 + j * 22, 'class': 'vz-info' }));
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

  /* ---------- 场景一：为什么要变长编码，前缀码为什么必要 ---------- */
  function buildWhy() {
    var steps = [];
    var snap = function (o) {
      return { hdr: o.hdr || '为什么要变长编码',
               cap: o.cap || null, nodes: o.nodes || null,
               edges: o.edges || null, hotE: o.hotE || null,
               tables: o.tables || null, bars: o.bars || null,
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    };
    var WROWS = [];
    for (var i = 0; i < CH.length; i++) WROWS.push([CH[i], WT[CH[i]]]);

    steps.push(step(snap({
      cap: '六个字符出现 100 次，A 占了 45 次而 F 只有 5 次 —— 凭什么给它们一样长的码',
      tables: [{ title: '频度（权值）', rows: WROWS }],
      bars: ['等长编码：6 个字符需 3 位（2³ = 8 ≥ 6）',
        '总长 = 100 × 3 = 300 位',
        'F 只出现 5 次，也照样占 3 位 × 5 = 15 位'],
      stats: { '字符数': 6, '总频度': TOTW,
               '等长码长': '3 位', '等长总长': '300 位' },
      notes: ['等长编码简单，但没利用「频度不均」这个事实',
        '直觉：让 A 短一点，F 长一点，总长就能降下来',
        '问题是「长短不一」之后，怎么知道一个码在哪结束'] }), 0,
      '六个字符共出现 100 次，A 独占 45 次而 F 只有 5 次。等长编码给每个字符 3 位，' +
      '总长 300 位 —— 可 F 那么罕见也照样占 3 位，明显浪费。' +
      '直觉是让常用的短、罕见的长，但码长不一之后就有新麻烦：怎么知道一个码在哪儿结束。',
      ['A 占 45 次，F 只 5 次', '等长 3 位、总长 300 位',
       '想让常用字更短']));

    steps.push(step(snap({
      hdr: '变长编码的陷阱：解不开',
      cap: '设 A=0、B=1、C=01，那么收到 01 —— 是 AB 还是 C？没法判断',
      bars: ['A = 0　B = 1　C = 01',
        '收到「01」：可以读成 A B，也可以读成 C',
        '毛病在于 A 的码 0 是 C 的码 01 的前缀'],
      stats: { 'A': '0', 'B': '1', 'C': '01',
               '收到 01': '歧义：AB 还是 C' },
      notes: ['译码时没有分隔符，只能一位一位往下读',
        '若某个码是另一个码的前缀，读到它就不知该停还是该继续',
        '所以要求：任一编码都不是另一编码的前缀 —— 前缀码'] }), 1,
      '变长编码有个陷阱。设 A=0、B=1、C=01，收到「01」你没法判断是 AB 还是 C。' +
      '毛病出在 A 的码 0 恰好是 C 的码 01 的前缀 —— 读到 0 时不知该停下还是接着读。' +
      '于是有了硬要求：任何一个编码都不能是另一个编码的前缀，这叫前缀码。',
      ['A=0、C=01 就有歧义', '0 是 01 的前缀',
       '必须是前缀码']));

    /* 一棵小示范树：字符全挂叶子，前缀码就自动成立 */
    var DN = { r: { x: 250, y: 160, label: '·' },
               x: { x: 180, y: 212, label: '·' },
               A: { x: 340, y: 212, label: 'A', st: 'done' },
               B: { x: 130, y: 264, label: 'B', st: 'done' },
               C: { x: 232, y: 264, label: 'C', st: 'done' } };
    var DE = [['r', 'x', '0'], ['r', 'A', '1'],
              ['x', 'B', '0'], ['x', 'C', '1']];

    steps.push(step(snap({
      hdr: '前缀码的做法：把字符全挂在叶子上',
      cap: '左分支记 0、右分支记 1，根到叶子的路径就是编码 —— 叶子之间互不为前缀',
      nodes: DN, edges: DE,
      bars: ['A = 1　B = 00　C = 01',
        '任一编码对应一条根到叶的路径',
        '叶子不在别的叶子的路径上 → 天然是前缀码'],
      stats: { 'A': '1（右）', 'B': '00（左左）', 'C': '01（左右）',
               '前缀码': '自动满足' },
      notes: ['编码 = 根到该叶子的路径，左 0 右 1',
        '一个叶子的路径不可能是另一个叶子路径的开头',
        '所以「字符只放叶子」这一条就保证了前缀码'] }), 2,
      '前缀码有个漂亮的做法：把所有字符都挂在叶子上，左分支记 0、右分支记 1，' +
      '根到叶子的路径就是它的编码。叶子不会长在别的叶子的路径上，' +
      '所以一个码绝不可能是另一个码的开头 —— 前缀码自动成立。',
      ['字符只放叶子', '左 0 右 1，路径即编码',
       '前缀码自动满足']));

    steps.push(step(snap({
      hdr: '剩下的问题：哪棵树最省',
      cap: 'WPL = Σ(权值 × 路径长度)，也就是编码后的总位数 —— 要找 WPL 最小的那棵树',
      nodes: DN, edges: DE,
      tables: [{ title: '频度（权值）', rows: WROWS }],
      stats: { '目标函数': 'WPL = Σ wᵢ × lᵢ', 'wᵢ': '字符频度',
               'lᵢ': '根到叶的路径长 = 码长', 'WPL 的含义': '编码后的总位数' },
      notes: ['权值大的字符应当离根近（路径短）',
        '权值小的字符可以放远一点',
        'WPL 最小的二叉树就叫哈夫曼树，也叫最优二叉树'],
      legend: '两件事都归到一处：前缀码要求字符在叶子，省位数要求 WPL 最小' }), 3,
      '于是问题变成：哪棵树最省？衡量的指标是 WPL，即每个字符的权值乘以它的路径长度再求和 ——' +
      '恰好就是编码后的总位数。权值大的该离根近，权值小的放远些。' +
      'WPL 最小的那棵二叉树就叫哈夫曼树，也叫最优二叉树。',
      ['WPL = Σ 权值 × 路径长', 'WPL 就是总位数',
       'WPL 最小 = 哈夫曼树']));

    return steps;
  }

  /* ---------- 场景二：哈夫曼算法 ----------
   * 每次从森林里挑权值最小的两棵，合成一棵新树（根权 = 两者之和），
   * 放回森林；重复 n−1 次，剩下的那棵就是哈夫曼树。 */

  /* 构造过程算一遍，把每一轮的森林状态记下来。
   * 结点用对象表示：{ id, w, label, l, r, lv }，lv 是它在图上的层（0 = 最底） */
  function huffman() {
    var nodes = {}, order = [], i, seq = 0;
    var forest = [];
    for (i = 0; i < CH.length; i++) {
      var id = CH[i];
      nodes[id] = { id: id, w: WT[id], label: CH[i], l: 0, r: 0, lv: 0,
                    leaf: 1, slot: i };
      forest.push(id);
    }
    var merges = [];
    while (forest.length > 1) {
      // 挑两个最小的：权值相同时取先入森林的，结果才稳定
      var a = -1, b = -1, k;
      for (k = 0; k < forest.length; k++) {
        if (a < 0 || nodes[forest[k]].w < nodes[forest[a]].w) a = k;
      }
      for (k = 0; k < forest.length; k++) {
        if (k === a) continue;
        if (b < 0 || nodes[forest[k]].w < nodes[forest[b]].w) b = k;
      }
      var ia = forest[a], ib = forest[b];
      // 让权小的当左孩子，画出来整齐些
      if (nodes[ia].w > nodes[ib].w) { var t = ia; ia = ib; ib = t; }
      var nid = 'N' + (++seq);
      nodes[nid] = { id: nid, w: nodes[ia].w + nodes[ib].w,
                     label: '' + (nodes[ia].w + nodes[ib].w),
                     l: ia, r: ib, lv: Math.max(nodes[ia].lv, nodes[ib].lv) + 1,
                     leaf: 0 };
      merges.push({ id: nid, l: ia, r: ib, w: nodes[nid].w,
                    before: forest.slice() });
      var nf = [], q;
      for (q = 0; q < forest.length; q++) {
        if (forest[q] !== ia && forest[q] !== ib) nf.push(forest[q]);
      }
      nf.push(nid);
      forest = nf;
      merges[merges.length - 1].after = forest.slice();
      order.push(nid);
    }
    return { nodes: nodes, merges: merges, root: forest[0] };
  }

  var H = huffman();

  /* 布局：叶子按从左到右的次序占格，内部结点取两个孩子的中点；
   * 竖直按 lv（离最底层的高度）往上排，叶子一律落在基线上。 */
  function layout(forest, x0, gap) {
    var pos = {}, slot = 0;
    function place(id) {
      var n = H.nodes[id], x;
      if (n.leaf) { x = x0 + slot * gap; slot += 1; }
      else { x = (place(n.l) + place(n.r)) / 2; }
      pos[id] = { x: x, y: FBASE - n.lv * FDY };
      return x;
    }
    for (var i = 0; i < forest.length; i++) { place(forest[i]); slot += 0.55; }
    return pos;
  }

  /* 把森林摊成绘图用的 nodes / edges */
  function frame(forest, x0, gap, st) {
    var pos = layout(forest, x0, gap);
    var nodes = {}, edges = [], i;
    for (i in pos) {
      nodes[i] = { x: pos[i].x, y: pos[i].y,
                   label: H.nodes[i].leaf ? H.nodes[i].label
                                          : H.nodes[i].w,
                   st: (st && st[i]) || (H.nodes[i].leaf ? 'done' : 'idle') };
    }
    for (i in pos) {
      var n = H.nodes[i];
      if (!n.leaf) {
        edges.push([i, n.l, '0']);
        edges.push([i, n.r, '1']);
      }
    }
    return { nodes: nodes, edges: edges };
  }

  function wlist(forest) {
    var s = [], i;
    for (i = 0; i < forest.length; i++) s.push(H.nodes[forest[i]].w);
    return s.join(' ');
  }

  function buildMake() {
    var steps = [];
    var snap = function (o) {
      return { hdr: o.hdr || '哈夫曼算法：每次取两个最小的合并',
               cap: o.cap || null, nodes: o.nodes || null,
               edges: o.edges || null, hotE: o.hotE || null,
               tables: null, bars: null,
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    };

    var init = CH.slice();
    var f0 = frame(init, FX0, 100, null);
    steps.push(step(snap({
      cap: '起手：n 个字符各自成一棵单结点的树，凑成一片森林 —— 权值就写在结点里',
      nodes: f0.nodes, edges: f0.edges,
      stats: { '森林': '6 棵单结点树', '权值': wlist(init),
               '要合并': 'n − 1 = 5 次', '每次': '取两个最小的' },
      notes: ['算法只有一句话：反复取权值最小的两棵合并',
        '新结点的权 = 两个孩子的权之和，放回森林',
        '合并 n − 1 = 5 次，森林里就只剩一棵 —— 那就是哈夫曼树'] }), 0,
      '起手把 6 个字符各自当成一棵单结点的树，凑成森林。算法只有一句话：' +
      '反复从森林里取权值最小的两棵，合成一棵新树，新根的权是两个孩子之和，再放回森林。' +
      '合并 5 次之后森林里只剩一棵，那就是哈夫曼树。',
      ['6 棵单结点树', '取两个最小的合并',
       '合并 n−1 = 5 次']));

    for (var m = 0; m < H.merges.length; m++) {
      var mg = H.merges[m];
      var la = H.nodes[mg.l], lb = H.nodes[mg.r];

      // 先高亮选中的两棵
      var stA = {}; stA[mg.l] = 'hot'; stA[mg.r] = 'hot';
      var fA = frame(mg.before, FX0, 100, stA);
      steps.push(step(snap({
        cap: '第 ' + (m + 1) + ' 次：森林里权值最小的两棵是 ' + la.w + ' 和 ' + lb.w,
        nodes: fA.nodes, edges: fA.edges,
        stats: { '第几次合并': (m + 1) + ' / 5', '森林权值': wlist(mg.before),
                 '选中': la.w + ' 与 ' + lb.w,
                 '新权值': la.w + ' + ' + lb.w + ' = ' + mg.w },
        notes: ['从 ' + mg.before.length + ' 棵树里挑权值最小的两棵',
          '选中 ' + la.w + ' 和 ' + lb.w + '（不论它们是叶子还是已合并的子树）',
          '权小的当左孩子，图上看着整齐些'] }), 2,
        '第 ' + (m + 1) + ' 次合并。此刻森林的权值是 ' + wlist(mg.before) +
        '，最小的两个是 ' + la.w + ' 和 ' + lb.w +
        '。注意挑的时候不分叶子还是已合并的子树，一律只看根的权值。',
        ['森林 ' + mg.before.length + ' 棵', '最小两个：' + la.w + ' 和 ' + lb.w,
         '准备合并']));

      // 再画合并后的样子
      var stB = {}; stB[mg.id] = 'active';
      var fB = frame(mg.after, FX0, 100, stB);
      var hotE = {}; hotE[mg.id + '-' + mg.l] = 1; hotE[mg.id + '-' + mg.r] = 1;
      steps.push(step(snap({
        cap: '合成新树：根权 ' + mg.w + '，森林从 ' + mg.before.length +
             ' 棵减到 ' + mg.after.length + ' 棵',
        nodes: fB.nodes, edges: fB.edges, hotE: hotE,
        stats: { '新结点权': mg.w, '森林剩': mg.after.length + ' 棵',
                 '现在的权值': wlist(mg.after),
                 '还要合并': (5 - m - 1) + ' 次' },
        notes: ['新结点权 = ' + la.w + ' + ' + lb.w + ' = ' + mg.w,
          '它替下那两棵，放回森林参与下一轮的比较',
          mg.after.length > 1 ? '森林还有 ' + mg.after.length + ' 棵，继续'
                              : '只剩一棵 —— 哈夫曼树成了'] }), 4,
        '两棵合成一棵，新根的权是 ' + la.w + ' + ' + lb.w + ' = ' + mg.w +
        '。它替下那两棵放回森林，下一轮照样参与比较。' +
        (mg.after.length > 1 ? '森林现在 ' + mg.after.length + ' 棵，权值 ' +
            wlist(mg.after) + '，继续。'
          : '森林只剩一棵，哈夫曼树构造完毕。'),
        ['新权 ' + mg.w, '森林剩 ' + mg.after.length + ' 棵',
         mg.after.length > 1 ? '继续下一轮' : '构造完毕']));
    }

    var fz = frame([H.root], FX0, 100, null);
    steps.push(step(snap({
      hdr: '哈夫曼树构造完毕：根权 100 = 总频度',
      cap: '权值大的 A 离根最近（1 层），权值小的 F 最远（4 层）—— 这正是 WPL 最小的排法',
      nodes: fz.nodes, edges: fz.edges,
      stats: { '根权': H.nodes[H.root].w, '结点总数': '2n − 1 = 11',
               '合并次数': 5, '时间': 'O(n log n)（用堆挑最小）' },
      notes: ['n 个叶子的哈夫曼树共 2n − 1 个结点，没有度为 1 的结点',
        '每次挑最小用堆，n − 1 轮 → O(n log n)',
        '权大的自然离根近：它越晚被合并，路径就越短'],
      legend: '哈夫曼树不唯一（权值相同时选谁都行），但 WPL 一定相同' }), 6,
      '构造完毕，根权 100 恰好是总频度。看结果：权值最大的 A 离根只有 1 层，' +
      '最小的 F 在第 4 层 —— 权大的越晚被合并，路径就越短，这正是 WPL 最小的排法。' +
      'n 个叶子的哈夫曼树共 2n−1 个结点，一个度为 1 的结点都没有。',
      ['根权 = 总频度 100', '结点总数 2n−1 = 11',
       '权大者离根近']));

    return steps;
  }

  /* ---------- 场景三：读出编码、算 WPL、比压缩率 ----------
   * 编码 = 根到叶子的路径，左 0 右 1。WPL 就是编码后的总位数。 */

  /* 父指针与每个字符的编码，从 H 里推出来 */
  var PAR = {}, BIT = {};
  (function () {
    var i, n;
    for (i in H.nodes) {
      n = H.nodes[i];
      if (n.leaf) continue;
      PAR[n.l] = i; BIT[n.l] = '0';
      PAR[n.r] = i; BIT[n.r] = '1';
    }
  })();

  /* 从叶子往上回溯，再倒过来 —— 就是它的编码 */
  function codeOf(ch) {
    var s = '', p = ch;
    while (PAR[p]) { s = BIT[p] + s; p = PAR[p]; }
    return s;
  }
  /* 路径上的结点与边，供高亮用 */
  function pathOf(ch) {
    var st = {}, he = {}, p = ch;
    st[ch] = 'hot';
    while (PAR[p]) { he[PAR[p] + '-' + p] = 1; p = PAR[p]; st[p] = 'active'; }
    return { st: st, hotE: he };
  }

  var CODE = {}, CLEN = {}, WPL = 0;
  (function () {
    var i, c;
    for (i = 0; i < CH.length; i++) {
      c = codeOf(CH[i]);
      CODE[CH[i]] = c; CLEN[CH[i]] = c.length;
      WPL += WT[CH[i]] * c.length;
    }
  })();
  var FIXED = TOTW * 3;                 // 等长编码总位数 300
  var SAVE = FIXED - WPL;               // 省下的位数
  var RATE = Math.round(WPL * 1000 / FIXED) / 10;   // 压缩到百分之几

  var GAP3 = 74;                        // 场景三树窄一些，给右侧表格腾地方

  function buildCode() {
    var steps = [];
    var snap = function (o) {
      return { hdr: o.hdr || '从树上读出编码：左 0 右 1',
               cap: o.cap || null, nodes: o.nodes || null,
               edges: o.edges || null, hotE: o.hotE || null,
               tables: o.tables || null, bars: o.bars || null,
               notes: o.notes || [], legend: o.legend || null,
               stats: o.stats || {} };
    };
    /* 编码表：只列已经读出来的那几个 */
    var crows = function (upto, hi) {
      var r = [], i;
      for (i = 0; i < upto.length; i++) r.push([upto[i], CODE[upto[i]]]);
      return { title: '编码表', rows: r, hi: hi || null };
    };
    var wrows = (function () {
      var r = [], i;
      for (i = 0; i < CH.length; i++) r.push([CH[i], WT[CH[i]]]);
      return r;
    })();

    var f0 = frame([H.root], FX0, GAP3, null);
    steps.push(step(snap({
      cap: '规矩只有一条：往左走记 0，往右走记 1 —— 根到叶子这一路的 0/1 就是该字符的编码',
      nodes: f0.nodes, edges: f0.edges,
      tables: [{ title: '频度（权值）', rows: wrows }],
      stats: { '编码规则': '左 0 右 1', '编码': '根 → 叶的路径',
               '码长': '= 根到叶的边数', '字符': '全在叶子上' },
      notes: ['边上的 0 / 1 就是走这一步该记的位',
        '字符全在叶子，所以没有一个编码是另一个的前缀',
        '码长等于路径长度：离根越近越短'] }), 0,
      '树成了，编码就直接读得出来：往左记 0，往右记 1，根到某个叶子这一路的 0/1 串' +
      '就是那个字符的编码。字符全挂在叶子上，所以谁也不是谁的前缀 —— 前缀码自动成立。',
      ['左 0 右 1', '根到叶的路径就是编码',
       '码长 = 路径长']));

    /* 逐个字符沿路径读码。按码长从短到长走，"权大码短"看得最清楚 */
    var SEQ = ['A', 'C', 'B', 'D', 'F', 'E'];
    var got = [];
    for (var s = 0; s < SEQ.length; s++) {
      var ch = SEQ[s], pv = pathOf(ch);
      var fc = frame([H.root], FX0, GAP3, pv.st);
      got.push(ch);
      var hiC = {}; hiC[ch] = 'hot';
      steps.push(step(snap({
        cap: '读 ' + ch + '：从根走到它要 ' + CLEN[ch] + ' 步，一路记下来是 ' +
             CODE[ch] + '　（频度 ' + WT[ch] + '）',
        nodes: fc.nodes, edges: fc.edges, hotE: pv.hotE,
        tables: [crows(got.slice(), hiC)],
        stats: { '字符': ch, '频度': WT[ch], '编码': CODE[ch],
                 '码长': CLEN[ch] + ' 位' },
        notes: [ch + ' 的路径长 ' + CLEN[ch] + ' → 码长 ' + CLEN[ch] + ' 位',
          '这一项对总位数的贡献 = ' + WT[ch] + ' × ' + CLEN[ch] +
            ' = ' + (WT[ch] * CLEN[ch]),
          CLEN[ch] <= 2 ? '频度大的果然码短' : '频度小的码长一点，但它出现得少'],
        legend: '实际实现里是从叶子往上回溯到根，再把 0/1 串倒过来' }), 2,
        '读 ' + ch + ' 的编码：从根出发走 ' + CLEN[ch] + ' 步到它，把每步的 0/1 连起来就是 ' +
        CODE[ch] + '。它的频度是 ' + WT[ch] + '，所以对总位数的贡献是 ' +
        WT[ch] + ' × ' + CLEN[ch] + ' = ' + (WT[ch] * CLEN[ch]) + ' 位。',
        [ch + ' = ' + CODE[ch], '码长 ' + CLEN[ch] + ' 位',
         WT[ch] + ' × ' + CLEN[ch] + ' = ' + (WT[ch] * CLEN[ch])]));
    }

    var fz = frame([H.root], FX0, GAP3, null);
    var allC = crows(CH.slice(), null);
    steps.push(step(snap({
      hdr: 'WPL = 224 位：这就是编码后的总长度',
      cap: '把六项 权值 × 码长 加起来 —— 45×1 + 12×3 + 13×3 + 16×3 + 5×4 + 9×4 = ' + WPL,
      nodes: fz.nodes, edges: fz.edges,
      tables: [allC],
      stats: { 'WPL': WPL + ' 位', 'A 贡献最大': '45 × 1 = 45',
               'F 只贡献': '5 × 4 = 20', '含义': '编码后的总位数' },
      notes: ['WPL = Σ 权值 × 码长，逐项相加得 ' + WPL,
        'A 出现 45 次却只占 1 位，省得最多',
        'F 的码有 4 位，但它只出现 5 次，吃亏有限'],
      legend: 'WPL 既是树的加权路径长度，也正好是这段文本编码后的总位数' }), 4,
      '把六项加起来：45×1 + 12×3 + 13×3 + 16×3 + 5×4 + 9×4 = ' + WPL + ' 位。' +
      '这个数既是树的加权路径长度 WPL，也正是这 100 个字符编码后的实际长度 —— ' +
      '哈夫曼树最小化 WPL，就是最小化编码总长。',
      ['WPL = ' + WPL + ' 位', 'A：45 × 1 = 45',
       'WPL 就是总位数']));

    steps.push(step(snap({
      hdr: '与等长编码比：300 位 → ' + WPL + ' 位',
      cap: '省下 ' + SAVE + ' 位，压到原来的 ' + RATE + '% —— 频度越不均匀，省得越多',
      nodes: fz.nodes, edges: fz.edges,
      tables: [allC],
      bars: ['等长编码：100 × 3 = ' + FIXED + ' 位',
        '哈夫曼编码：WPL = ' + WPL + ' 位',
        '省下 ' + SAVE + ' 位，压缩到 ' + RATE + '%'],
      stats: { '等长': FIXED + ' 位', '哈夫曼': WPL + ' 位',
               '省下': SAVE + ' 位', '压缩到': RATE + '%' },
      notes: ['等长码给每个字符 3 位，不管它出现几次',
        '哈夫曼把 3 位让给了 A，代价是 E、F 各多背 1 位',
        '若六个字符频度相同，哈夫曼就退化成等长码，一位也省不下'] }), 6,
      '和等长编码比一比：300 位压到 ' + WPL + ' 位，省下 ' + SAVE + ' 位，只剩原来的 ' +
      RATE + '%。省下来的钱出自频度不均 —— 若六个字符出现次数一样多，' +
      '哈夫曼树就退化成一棵满树，跟等长编码分毫不差。',
      ['300 → ' + WPL + ' 位', '省 ' + SAVE + ' 位',
       '压到 ' + RATE + '%']));

    /* 译码：拿 A C E 三个字符的码串连起来当例子，从根往下读 */
    var MSG = CODE.A + CODE.C + CODE.E;      // 0 100 1101
    var pE = pathOf('E');
    var fd = frame([H.root], FX0, GAP3, pE.st);
    steps.push(step(snap({
      hdr: '译码：拿着码串从根往下走，到叶子就吐一个字符',
      cap: '收到 ' + MSG + '：读 0 到 A（回根），读 100 到 C（回根），读 1101 到 E —— 得 ACE',
      nodes: fd.nodes, edges: fd.edges, hotE: pE.hotE,
      tables: [allC],
      bars: ['码串 ' + MSG,
        '0 → A　100 → C　1101 → E',
        '每到一个叶子就输出并回到根'],
      stats: { '码串': MSG, '译出': 'A C E',
               '做法': '从根按位下行', '到叶子': '输出并回根' },
      notes: ['0 往左、1 往右，一位一位地走',
        '走到叶子就输出该字符，指针回到根重新开始',
        '前缀码保证了这样读绝不会有歧义'],
      legend: '译码不需要分隔符：走到叶子就是一个码的结束，这正是前缀码的价值' }), 8,
      '译码就是拿码串在树上走：0 往左、1 往右，走到叶子就输出那个字符并回到根。' +
      '收到 ' + MSG + ' 依次译出 A、C、E。因为是前缀码，走到叶子就必然是一个码的末尾，' +
      '不会读多也不会读少 —— 全程不需要任何分隔符。',
      ['0 往左，1 往右', '到叶子输出并回根',
       MSG + ' → ACE']));

    steps.push(step(snap({
      hdr: '小结：哈夫曼编码为什么最优',
      cap: '前缀码保证能译，WPL 最小保证最省 —— 两件事各由一个约定完成',
      nodes: fz.nodes, edges: fz.edges,
      tables: [allC],
      stats: { '能译': '字符全在叶子 → 前缀码', '最省': 'WPL 最小 → 总位数最少',
               '构造': 'O(n log n)', '本例': FIXED + ' → ' + WPL + ' 位' },
      notes: ['"字符只放叶子"换来前缀码，译码无歧义',
        '"每次合并两个最小的"换来 WPL 最小，编码最短',
        '哈夫曼树可以不唯一，但 WPL 和压缩率一定相同'],
      legend: '同一批频度可能得出形状不同的哈夫曼树，但 WPL 必然相等' }), 8,
      '整件事就两个约定：字符只放叶子，于是编码是前缀码，译码不会有歧义；' +
      '每次合并权值最小的两棵，于是 WPL 最小，编码总长最短。' +
      '权值相同时选谁都行，所以树的形状可能不同，但 WPL 一定相等。',
      ['叶子 → 前缀码，能译', 'WPL 最小 → 最省',
       '树不唯一，WPL 唯一']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['huffman-tree'] = {
    title: '哈夫曼树与哈夫曼编码 Huffman',
    subtitle: '等长编码让罕见字和常用字占一样多的位。哈夫曼树把字符全挂在叶子上（保证前缀码可译），' +
      '再靠"每次合并两个最小的"把 WPL 压到最小（保证省位）—— 本例 300 位压到 ' + WPL + ' 位。',
    height: 700,
    code: [
      '// 哈夫曼算法：n 个权值 → WPL 最小的二叉树',
      'for (i = 0; i < n; i++) 每个权值建一棵单结点树，放入森林;',
      'while (森林中树的棵数 > 1) {',
      '    取权值最小的两棵 s1、s2;',
      '    新建结点 r，r->w = s1->w + s2->w;',
      '    r->lchild = s1;  r->rchild = s2;   // 权小者当左孩子',
      '    把 r 放回森林;                       // 森林棵数减一',
      '}   // 合并 n-1 次，剩下的那棵就是哈夫曼树'
    ],
    scenes: [
      { name: '为什么变长', build: buildWhy,
        codeTag: '前缀码的必要性',
        code: [
          '// 等长：6 个字符各 3 位 → 100 × 3 = 300 位',
          '// 想让 A(45 次) 短、F(5 次) 长，但码长不一有麻烦：',
          '//   设 A=0, B=1, C=01 → 收到 "01" 是 AB 还是 C？',
          '// 病根：A 的码 0 是 C 的码 01 的前缀',
          '// 要求：任一编码都不是另一编码的前缀  ← 前缀码',
          '// 做法：字符全挂叶子，左 0 右 1，路径即编码',
          '//   叶子不在别的叶子的路径上 → 天然前缀码',
          '// 剩下的问题：WPL = Σ wi × li 最小的是哪棵树'
        ] },
      { name: '构造哈夫曼树', build: buildMake,
        codeTag: '每次取两个最小的合并',
        code: [
          'while (森林中树的棵数 > 1) {',
          '    s1 = 取出权值最小的一棵;',
          '    s2 = 取出权值次小的一棵;',
          '    r = 新结点;  r->w = s1->w + s2->w;',
          '    r->lchild = s1;  r->rchild = s2;',
          '    EnForest(r);                  // 放回森林',
          '}   // 用小顶堆取最小 → 每轮 O(log n)',
          '// n-1 轮 → 总时间 O(n log n)，结点共 2n-1 个'
        ] },
      { name: '编码与压缩率', build: buildCode,
        codeTag: '叶子回溯到根，倒序即编码',
        code: [
          '// 求编码：从叶子往上回溯，再把 0/1 串倒过来',
          'for (每个叶子 c) {',
          '    s = ""; p = c;',
          '    while (p->parent) {',
          '        s = (p == p->parent->lchild ? "0" : "1") + s;',
          '        p = p->parent;',
          '    }',
          '}   // WPL = Σ wi × li = 编码后的总位数',
          '// 译码：0 往左 1 往右，到叶子输出并回根'
        ] }
    ]
  };
})();
