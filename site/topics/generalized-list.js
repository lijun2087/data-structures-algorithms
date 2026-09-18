/* 广义表的存储结构 — 第5章
 * 全篇只用一个例子：L = (a, (b, c, (d)), e)。
 * 场景一「层次结构」：广义表是递归定义的 —— 元素既可以是原子也可以是表。
 *         长度只数最外层的元素，深度数括号的嵌套层数，两件事别混。
 * 场景二「头尾链表」：元素类型不统一，所以结点要用 tag 区分：
 *         表结点 tag=1 带 hp/tp，原子结点 tag=0 带 atom。
 * 场景三「取表头表尾」：GetTail 的结果永远是一个表，这是最容易错的地方。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：舞台 x∈[24,976]、y∈[84,384]，图形不低于 330（旁白占 352）。
   * 两种版式，由 f.mode 决定：
   *   mode='tree'  左边一棵大层次树（x 104…476、y 108…322），
   *                右边 x=560 起竖排若干条短说明（y 130 起，行距 22）。
   *   mode='list'  上半是头尾链表图（x 56…530、y 108…284），
   *                右边 x 679…931 放同一棵树的缩小版（y 111…263），
   *                底部两行说明 y=304 / 324。
   * 链表图纵向四层：116 / 164 / 212 / 260，结点高 24，层距 48。 */
  var LW = 60, LH = 24, AW = 48;           // 表结点宽 60、原子结点宽 48、高 24

  /* 十二个结点的位置。k=1 表结点（tag|hp|tp 三格），k=0 原子结点（tag|atom 两格）。
   * 原子结点的横坐标 = 父结点 hp 格中心 − 24，这样竖直连线正好落在它中间。 */
  var LN = {
    N1: { x: 56, y: 116, k: 1, v: 'L 的第 1 个表结点' },
    N2: { x: 136, y: 116, k: 1, v: 'L 的第 2 个表结点' },
    N3: { x: 216, y: 116, k: 1, v: 'L 的第 3 个表结点' },
    A: { x: 62, y: 164, k: 0, v: 'a' },
    E: { x: 222, y: 164, k: 0, v: 'e' },
    M1: { x: 310, y: 164, k: 1, v: '子表 B 的第 1 个' },
    M2: { x: 390, y: 164, k: 1, v: '子表 B 的第 2 个' },
    M3: { x: 470, y: 164, k: 1, v: '子表 B 的第 3 个' },
    B: { x: 316, y: 212, k: 0, v: 'b' },
    C: { x: 396, y: 212, k: 0, v: 'c' },
    D1: { x: 470, y: 212, k: 1, v: '子表 D 的唯一结点' },
    Dd: { x: 476, y: 260, k: 0, v: 'd' }
  };
  var NIL = ['N3', 'M3', 'D1'];             // tp 为空的三个表结点

  /* 指针连线。tp 走水平（同层的兄弟），hp 走竖直（下一层）；
   * 只有 N2.hp 要跨到右边的子表，走一条斜线。 */
  var LINKS = [
    { k: 'N1.tp', x1: 106, y1: 128, x2: 136, y2: 128 },
    { k: 'N2.tp', x1: 186, y1: 128, x2: 216, y2: 128 },
    { k: 'M1.tp', x1: 360, y1: 176, x2: 390, y2: 176 },
    { k: 'M2.tp', x1: 440, y1: 176, x2: 470, y2: 176 },
    { k: 'N1.hp', x1: 86, y1: 140, x2: 86, y2: 164 },
    { k: 'N3.hp', x1: 246, y1: 140, x2: 246, y2: 164 },
    { k: 'N2.hp', x1: 166, y1: 140, x2: 310, y2: 176 },
    { k: 'M1.hp', x1: 340, y1: 188, x2: 340, y2: 212 },
    { k: 'M2.hp', x1: 420, y1: 188, x2: 420, y2: 212 },
    { k: 'M3.hp', x1: 500, y1: 188, x2: 500, y2: 212 },
    { k: 'D1.hp', x1: 500, y1: 236, x2: 500, y2: 260 }
  ];

  /* 层次树。同一套 id 在大小两版里通用，状态表因此可以共享。 */
  var BIG = {
    L: { x: 290, y: 124 }, a: { x: 120, y: 186 }, B: { x: 290, y: 186 },
    e: { x: 460, y: 186 }, b: { x: 200, y: 248 }, c: { x: 290, y: 248 },
    D: { x: 380, y: 248 }, d: { x: 380, y: 306 }
  };
  var SML = {
    L: { x: 805, y: 122 }, a: { x: 690, y: 166 }, B: { x: 805, y: 166 },
    e: { x: 920, y: 166 }, b: { x: 745, y: 210 }, c: { x: 805, y: 210 },
    D: { x: 865, y: 210 }, d: { x: 865, y: 252 }
  };
  var EDGES = [['L', 'a'], ['L', 'B'], ['L', 'e'],
               ['B', 'b'], ['B', 'c'], ['B', 'D'], ['D', 'd']];
  var ATOM = { a: 1, b: 1, c: 1, d: 1, e: 1 };   // 哪些树结点是原子

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }
  // 键是结点名或 "父-子"，必须逐个赋值；字面量 { id: … } 只会得到字符串键 "id"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* 结点自己画，不用 D.nodeBox —— 高只有 24，nodeBox 的 15px 槽头会把字挤没。
   * 表结点三格各 20 宽，槽心 x+10 / x+30 / x+50；原子结点两格各 24，槽心 x+12 / x+36。
   * LINKS 里的横坐标就是按这两套槽心算的，改宽度必须同步改 LINKS。 */
  function slotCx(id) {
    var n = LN[id];
    return n.k ? [n.x + 10, n.x + 30, n.x + 50] : [n.x + 12, n.x + 36];
  }

  function drawNode(g, id, st) {
    var n = LN[id], c = D.C[st || 'idle'];
    var w = n.k ? LW : AW, cs = slotCx(id), i;
    g.appendChild(D.el('rect', { x: n.x, y: n.y, width: w, height: LH, rx: 4,
      fill: c.fill, stroke: c.stroke, 'stroke-width': 1.8 }));
    for (i = 1; i < cs.length; i++) {
      g.appendChild(D.el('line', { x1: n.x + i * (w / cs.length), y1: n.y,
        x2: n.x + i * (w / cs.length), y2: n.y + LH,
        stroke: '#33456b', 'stroke-width': 1.2 }));
    }
    // 第一格永远是 tag：1 表示表结点，0 表示原子结点
    g.appendChild(D.text(n.k ? '1' : '0',
      { x: cs[0], y: n.y + 16, 'class': 'vz-cellval', 'font-size': 11 }));
    if (n.k) {
      g.appendChild(D.text('hp', { x: cs[1], y: n.y + 16, 'class': 'vz-slot' }));
      g.appendChild(D.text('tp', { x: cs[2], y: n.y + 16, 'class': 'vz-slot' }));
    } else {
      g.appendChild(D.text(n.v,
        { x: cs[1], y: n.y + 16, 'class': 'vz-cellval', 'font-size': 12 }));
    }
  }

  /* 链表图整体。nst 给结点上色，lst 给指针上色（键同 LINKS.k）。 */
  function drawList(g, nst, lst) {
    var id, i, lk, n, cs;
    g.appendChild(D.text('头尾链表表示：表结点 tag=1｜hp｜tp　　原子结点 tag=0｜atom',
      { x: 44, y: 104, 'class': 'vz-lab', fill: '#8fd0ff', 'font-size': 11.5 }));
    for (i = 0; i < LINKS.length; i++) {
      lk = LINKS[i];
      D.link(g, { x1: lk.x1, y1: lk.y1, x2: lk.x2, y2: lk.y2,
        kind: lst[lk.k] || 'next', width: lst[lk.k] ? 3 : 2 });
    }
    // tp 为空的结点，在 tp 格里划一道斜杠表示 NIL
    for (i = 0; i < NIL.length; i++) {
      n = LN[NIL[i]]; cs = slotCx(NIL[i]);
      g.appendChild(D.el('line', { x1: cs[2] - 8, y1: n.y + LH - 3,
        x2: cs[2] + 8, y2: n.y + 3, stroke: '#7d8bab', 'stroke-width': 1.6 }));
    }
    for (id in LN) drawNode(g, id, nst[id]);
    g.appendChild(D.text('L', { x: 40, y: 132, 'class': 'vz-ptr', fill: '#ffd166' }));
    D.link(g, { x1: 44, y1: 128, x2: 56, y2: 128, kind: 'ptr', width: 2 });
  }

  /* 层次树。P 传 BIG 或 SML，r 是结点半径；边先画，圆压在上面。 */
  function drawTree(g, P, r, st, est) {
    var i, e, a, b, id;
    for (i = 0; i < EDGES.length; i++) {
      e = EDGES[i]; a = P[e[0]]; b = P[e[1]];
      D.link(g, { x1: a.x, y1: a.y + r, x2: b.x, y2: b.y - r,
        kind: est[e[0] + '-' + e[1]] || 'mute', arrow: false,
        width: est[e[0] + '-' + e[1]] ? 2.6 : 1.6 });
    }
    for (id in P) {
      D.circleNode(g, { x: P[id].x, y: P[id].y, r: r,
        state: st[id] || (ATOM[id] ? 'good' : 'idle'), value: id });
    }
  }

  /* f = { mode:'tree'|'list', hdr, tst, est, nst, lst,
   *       notes:[右侧短句], t1, t2, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i;
    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));

    if (f.mode === 'tree') {
      drawTree(ctx.stage, BIG, 22, f.tst || {}, f.est || {});
      // 右侧竖排说明：一行一个要点，比塞进旁白里好读
      for (i = 0; i < (f.notes || []).length; i++) {
        ctx.stage.appendChild(D.text(f.notes[i],
          { x: 560, y: 130 + i * 22, 'class': 'vz-info',
            fill: i === 0 ? '#ffd166' : '#b9c8e6', 'font-size': 12 }));
      }
    } else {
      drawList(ctx.stage, f.nst || {}, f.lst || {});
      drawTree(ctx.stage, SML, 15, f.tst || {}, f.est || {});
      if (f.t1) {
        ctx.stage.appendChild(D.text(f.t1,
          { x: 44, y: 304, 'class': 'vz-lab', fill: '#ffd166' }));
      }
      if (f.t2) {
        ctx.stage.appendChild(D.text(f.t2,
          { x: 44, y: 326, 'class': 'vz-info', fill: '#8ea3c9' }));
      }
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ========== 场景一：层次结构、长度与深度 ========== */
  function buildTree() {
    var steps = [];
    var tf = function (o) {
      return { mode: 'tree', hdr: o.hdr || 'L = (a, (b, c, (d)), e)　广义表的层次结构',
               tst: o.tst || {}, est: o.est || {}, notes: o.notes || [],
               stats: o.stats || {} };
    };

    steps.push(step(tf({
      notes: ['广义表：元素可以是原子，也可以是表',
              '原子 —— 不可再分的单个数据（图中绿色圆）',
              '子表 —— 本身又是一个广义表（图中蓝色圆）',
              'L = (a, (b, c, (d)), e)',
              '线性表要求元素同类型，广义表放开了这一条',
              '放开之后它就不再「线性」，而是一棵层次树'] }), 0,
      '线性表要求所有元素同一类型；广义表把这条放开：元素既可以是原子，也可以是另一个表。' +
      '一放开，结构就从一条线变成了一棵树。',
      ['元素可以是原子或表', '递归定义', '结构从线变成树']));

    steps.push(step(tf({
      hdr: '递归定义：LS = (α₁, α₂, …, αₙ)，每个 αᵢ 或原子或子表',
      tst: mark('L', 'hot'),
      est: mark('L-a', 'next', 'L-B', 'next', 'L-e', 'next'),
      notes: ['定义里出现了「表」自己 —— 这就是递归定义',
              'n = 0 时是空表 ()，它是递归的终点',
              '正因为递归，画出来才是一层套一层',
              '任何递归定义的结构，都能画成一棵树',
              'L 的三个元素：a、(b,c,(d))、e'],
      stats: { '定义': 'LS = (α₁ … αₙ)', 'αᵢ 可以是': '原子 或 子表',
               '递归终点': '空表 ()' } }), 1,
      '定义里又出现了「表」这个词，这叫递归定义。递归定义的结构画出来必然是一层套一层，' +
      '也就是一棵树，空表 () 是递归的终点。',
      ['定义中含自身 → 递归', '空表是递归终点', '递归结构画成树']));

    // 逐个点亮最外层三个元素 —— 长度只数这一层
    var seen = ['a', '(b,c,(d))', 'e'], kids = ['a', 'B', 'e'];
    var tst = { L: 'active' }, est = {};
    for (var q = 0; q < 3; q++) {
      tst = cp(tst); est = cp(est);
      tst[kids[q]] = 'hot';
      est['L-' + kids[q]] = 'hot';
      var isL = kids[q] === 'B';
      steps.push(step(tf({
        hdr: '数长度：只数最外层，一个元素算一个，不管它内部多复杂',
        tst: tst, est: est,
        notes: ['第 ' + (q + 1) + ' 个元素：' + seen[q] +
                (isL ? '　← 它是一个子表' : '　← 它是一个原子'),
                isL ? '子表内部有 3 个元素，但对 L 来说它只算 1 个'
                    : '原子不可再分，算 1 个',
                '已数到 ' + (q + 1) + ' 个',
                '长度 = 最外层元素个数，不往里钻'],
        stats: { '当前元素': seen[q], '它是': isL ? '子表' : '原子',
                 '已数': (q + 1) + ' 个' } }), 2,
        '第 ' + (q + 1) + ' 个元素是 ' + seen[q] + '，' +
        (isL ? '它是一个子表 —— 内部有 3 个元素，但对 L 来说整个子表只算 1 个。'
             : '它是原子，算 1 个。') + '数长度不往括号里钻。',
        [seen[q] + ' 算 1 个', isL ? '子表整体算一个' : '原子算一个',
         '已数 ' + (q + 1) + ' 个']));
    }

    steps.push(step(tf({
      hdr: 'Length(L) = 3',
      tst: mark('L', 'done', 'a', 'good', 'B', 'active', 'e', 'good'),
      est: mark('L-a', 'next', 'L-B', 'next', 'L-e', 'next'),
      notes: ['Length(L) = 3　—— a、(b,c,(d))、e',
              '常见错误：把里面的 b、c、d 也数进去，得 5',
              '长度只看最外层那一圈括号里有几个逗号分段',
              '子表再复杂，对外也只是「一个元素」'],
      stats: { 'Length(L)': 3, '数的是': '最外层元素',
               '常见错误': '连子表内部一起数' } }), 3,
      'Length(L) = 3。最常见的错是把 b、c、d 也数进去得 5 —— 长度只看最外层括号里分了几段，' +
      '子表再复杂，对外都只是一个元素。',
      ['Length(L) = 3', '只看最外层分段', '别把子表内部数进去']));

    return steps.concat(buildDepth(tf));
  }

  /* 深度：一层一层往下剥括号。tf 复用场景一的快照工厂。 */
  function buildDepth(tf) {
    var steps = [];

    steps.push(step(tf({
      hdr: '数深度：换个数法 —— 数括号套了几层',
      tst: mark('L', 'hot'),
      notes: ['深度 = 括号的最大嵌套层数',
              'L = ( a, ( b, c, ( d ) ), e )',
              '　　　↑第1层  ↑第2层  ↑第3层',
              '长度和深度是两件事，别混：',
              '长度横着数（一层里几个），深度竖着数（套了几层）'],
      stats: { '长度': '横着数', '深度': '竖着数', '两者': '互不相干' } }), 4,
      '深度换个数法：数括号套了几层。长度是横着数一层里有几个，深度是竖着数套了几层，' +
      '两个方向，别混在一起。',
      ['深度 = 括号嵌套层数', '长度横着数', '深度竖着数']));

    var lv = [
      { t: mark('L', 'hot', 'a', 'good', 'B', 'idle', 'e', 'good'),
        e: mark('L-a', 'hot', 'L-B', 'hot', 'L-e', 'hot'),
        n: '第 1 层：L 本身的那对括号',
        m: 'a 和 e 到这层就见底了，但 (b,c,(d)) 还能往下剥' },
      { t: mark('B', 'hot', 'b', 'good', 'c', 'good', 'D', 'idle'),
        e: mark('B-b', 'hot', 'B-c', 'hot', 'B-D', 'hot'),
        n: '第 2 层：子表 (b, c, (d)) 的括号',
        m: 'b、c 见底，(d) 里还有一层' },
      { t: mark('D', 'hot', 'd', 'good'),
        e: mark('D-d', 'hot'),
        n: '第 3 层：最内层的 (d)',
        m: 'd 是原子，剥不动了 —— 到底了' }
    ];
    for (var i = 0; i < lv.length; i++) {
      steps.push(step(tf({
        hdr: '剥第 ' + (i + 1) + ' 层括号',
        tst: lv[i].t, est: lv[i].e,
        notes: [lv[i].n, lv[i].m, '当前深度至少 ' + (i + 1),
                i === 2 ? '再往下没有括号了，深度就停在 3' : '继续往里剥'],
        stats: { '当前层': i + 1, '还能剥': i === 2 ? '不能' : '能',
                 '深度至少': i + 1 } }), 5,
        lv[i].n + '。' + lv[i].m + '。深度取所有分支里最深的那条，所以现在至少是 ' + (i + 1) + '。',
        ['第 ' + (i + 1) + ' 层括号', i === 2 ? '剥到底了' : '还能往里剥',
         '深度 ≥ ' + (i + 1)]));
    }

    steps.push(step(tf({
      hdr: 'Depth(L) = 3　长度 3、深度 3 —— 数值撞巧，含义无关',
      tst: mark('L', 'done', 'B', 'done', 'D', 'active', 'd', 'hot'),
      est: mark('L-B', 'hot', 'B-D', 'hot', 'D-d', 'hot'),
      notes: ['Depth(L) = 3　最长的一条路：L → B → D → d',
              '深度取最深的分支，不是平均，也不是最浅',
              'a 那条只有 1 层，但深度看的是最深的 (d)',
              '递归求法：空表深度 1，原子深度 0，',
              '　　表的深度 = 1 + 各元素深度的最大值'],
      stats: { 'Depth(L)': 3, '最深路径': 'L→B→D→d',
               '原子深度': 0, '空表深度': 1 } }), 6,
      'Depth(L) = 3，取的是最深那条路 L→B→D→d。递归求法：原子深度 0，空表深度 1，' +
      '表的深度是 1 加上各元素深度的最大值。',
      ['Depth(L) = 3', '取最深分支', '原子 0、空表 1']));

    steps.push(step(tf({
      hdr: '两个易错点：空表和「表里只有一个空表」',
      tst: mark('L', 'mute', 'a', 'mute', 'B', 'mute', 'e', 'mute',
                'b', 'mute', 'c', 'mute', 'D', 'mute', 'd', 'mute'),
      notes: ['A = ()　　　长度 0，深度 1 —— 空表也有一对括号',
              'B = (())　　长度 1，深度 2 —— 那个元素是空表',
              'B 里没有任何原子，但长度不是 0',
              '判空看的是「有没有元素」，不是「有没有原子」',
              '所以 (()) 非空：它有 1 个元素，只是那元素恰好是空表'],
      stats: { '()': '长 0 深 1', '(())': '长 1 深 2',
               '判空看': '有无元素', '不看': '有无原子' } }), -1,
      '两个坑：() 长度 0 深度 1；(()) 长度 1 深度 2 —— 它有一个元素，只是那元素恰好是空表。' +
      '判空看有没有元素，不看有没有原子。',
      ['() 长 0 深 1', '(()) 长 1 深 2', '判空看元素不看原子']));

    return steps;
  }

  /* ========== 场景二：头尾链表表示法 ========== */
  // 三个层次的结点分组，逐层点亮时用
  var G1 = ['N1', 'N2', 'N3'], G2 = ['M1', 'M2', 'M3'];
  function setAll(o, ids, s) { for (var i = 0; i < ids.length; i++) o[ids[i]] = s; return o; }

  function buildLink() {
    var steps = [];
    var lf = function (o) {
      return { mode: 'list', hdr: o.hdr || 'L = (a, (b, c, (d)), e) 的头尾链表存储',
               nst: o.nst || {}, lst: o.lst || {}, tst: o.tst || {}, est: o.est || {},
               t1: o.t1 || null, t2: o.t2 || null, stats: o.stats || {} };
    };
    var muteAll = function () {
      var o = {}, id;
      for (id in LN) o[id] = 'mute';
      return o;
    };

    steps.push(step(lf({
      hdr: '难点在哪：一个表里的元素类型不统一',
      nst: muteAll(),
      t1: '元素可能是原子（只需存值），也可能是子表（需要存一个指针）—— 两种东西大小和含义都不同',
      t2: '链表结点必须长得一样才能串起来，所以要加一个标志位 tag，用它区分这个结点装的是哪种',
      stats: { '原子需要': '存值', '子表需要': '存指针',
               '解决办法': '加 tag 区分', 'tag': '1=表 0=原子' } }), 0,
      '广义表的元素类型不统一：原子要存值，子表要存指针。结点却必须长得一样才能串起来，' +
      '于是加一个标志位 tag，用它说明这个结点装的是哪种。',
      ['元素类型不统一', '结点必须同构', '加 tag 区分两种']));

    steps.push(step(lf({
      nst: setAll(setAll(muteAll(), ['N1'], 'hot'), ['A'], 'good'),
      hdr: '两种结点：表结点 tag=1｜hp｜tp，原子结点 tag=0｜atom',
      t1: '表结点（tag=1）：hp 指向表头这个元素，tp 指向「去掉表头后剩下的那个表」',
      t2: '原子结点（tag=0）：atom 直接放值，没有指针 —— 它是链的末端，不再往下分',
      stats: { '表结点': 'tag｜hp｜tp', '原子结点': 'tag｜atom',
               'hp': '指向表头元素', 'tp': '指向剩余的表' } }), 1,
      '表结点有 hp 和 tp 两个指针：hp 指向表头那个元素，tp 指向去掉表头后剩下的表。' +
      '原子结点只有一个 atom 放值，不再往下分。',
      ['表结点带 hp、tp', '原子结点只带值', 'tp 指剩余的表']));

    /* 三层逐个铺开：先第一层 L 的三个表结点，再子表 B，最后 (d)。
     * 每一步同时点亮树上对应结点，两幅图对着看才不会脱节。 */
    var lay = [
      { ids: G1, ls: ['N1.tp', 'N2.tp'], hs: ['N1.hp', 'N3.hp'],
        at: ['A', 'E'], tst: mark('L', 'hot', 'a', 'good', 'e', 'good'),
        h: '第一层：L 有 3 个元素，就串 3 个表结点',
        a: 'L 长度 3 → 3 个表结点，靠 tp 一个接一个串成横向的链',
        b: '第 1 个的 hp 指原子 a，第 3 个的 hp 指原子 e；最后一个的 tp 为空（斜杠）',
        n: 'L 长度 3，就串 3 个表结点，靠 tp 连成横向一条链。第 1 个的 hp 指向原子 a，' +
           '第 3 个的 hp 指向原子 e，最后一个的 tp 为空，画一道斜杠。' },
      { ids: G2, ls: ['M1.tp', 'M2.tp'], hs: ['N2.hp', 'M1.hp', 'M2.hp'],
        at: ['B', 'C'], tst: mark('B', 'hot', 'b', 'good', 'c', 'good'),
        h: '第二层：第 2 个元素是子表 (b, c, (d))，hp 拐到它自己的链上',
        a: '子表也长度 3 → 又是 3 个表结点串成一条链，挂在上一层的 hp 下面',
        b: 'hp 指过去而不是把内容抄进来 —— 这样嵌套多深都不用改结点格式',
        n: '第 2 个元素是子表，它自己也长度 3，于是又串出 3 个表结点，挂在上一层的 hp 下面。' +
           'hp 是指过去而不是把内容抄进来，所以嵌套多深都不用改结点格式。' },
      { ids: ['D1'], ls: [], hs: ['M3.hp', 'D1.hp'],
        at: ['Dd'], tst: mark('D', 'hot', 'd', 'good'),
        h: '第三层：(d) 只有 1 个元素，1 个表结点就够',
        a: '(d) 是表不是原子，所以还要一个表结点，它的 hp 才指向原子 d',
        b: '这也是 (d) 和 d 的区别：多一层括号，就多一个表结点',
        n: '(d) 是表不是原子，所以还得先有一个表结点，它的 hp 才指向原子 d。这就是 (d) 和 d 的' +
           '区别：多一层括号，图上就多一个表结点。' }
    ];
    var nst = muteAll(), lst = {}, tst = {};
    for (var i = 0; i < lay.length; i++) {
      var L2 = lay[i], j;
      nst = cp(nst); lst = cp(lst); tst = cp(tst);
      setAll(nst, L2.ids, 'hot');
      setAll(nst, L2.at, 'good');
      for (j = 0; j < L2.ls.length; j++) lst[L2.ls[j]] = 'next';
      for (j = 0; j < L2.hs.length; j++) lst[L2.hs[j]] = 'hot';
      for (j in L2.tst) tst[j] = L2.tst[j];
      steps.push(step(lf({
        hdr: L2.h, nst: nst, lst: lst, tst: tst, t1: L2.a, t2: L2.b,
        stats: { '本层元素数': L2.ids.length, '表结点': L2.ids.length + ' 个',
                 '原子结点': L2.at.length + ' 个', '嵌套层': i + 1 } }), 2 + i,
        L2.n,
        [L2.ids.length + ' 个表结点', L2.at.length + ' 个原子结点',
         '第 ' + (i + 1) + ' 层铺好']));
    }

    return steps.concat(buildLinkTail(lf, muteAll));
  }

  // 场景二收尾：整体成图 + 结点数怎么算 + 深度在图上长什么样
  function buildLinkTail(lf, muteAll) {
    var steps = [], id, all = {}, allL = {};
    for (id in LN) all[id] = LN[id].k ? 'active' : 'good';
    for (var i = 0; i < LINKS.length; i++) allL[LINKS[i].k] = 'next';

    steps.push(step(lf({
      hdr: '整幅图：7 个表结点 + 5 个原子结点',
      nst: all, lst: allL,
      t1: '横向看是 tp 链（同一层的兄弟），纵向看是 hp 链（往下钻一层）—— 两个方向别看混',
      t2: '表结点个数 = 各层元素个数之和 = 3 + 3 + 1 = 7；原子结点个数 = 原子个数 = 5',
      stats: { '表结点': '7 个', '原子结点': '5 个',
               'tp 方向': '同层兄弟', 'hp 方向': '往下一层' } }), 5,
      '横向的 tp 链串同一层的兄弟，纵向的 hp 链往下钻一层。表结点数等于各层元素个数之和 3+3+1=7，' +
      '原子结点数就是原子个数 5。',
      ['tp 横向串兄弟', 'hp 纵向钻下层', '7 表结点 + 5 原子结点']));

    steps.push(step(lf({
      hdr: '在图上认长度和深度',
      nst: setAll(setAll(muteAll(), G1, 'hot'), ['A', 'E'], 'good'),
      lst: mark('N1.tp', 'hot', 'N2.tp', 'hot'),
      tst: mark('L', 'hot'),
      t1: '长度 = 最上面这条 tp 链上有几个表结点 = 3　—— 横着数一条链',
      t2: '深度 = 沿 hp 最多能往下走几层表结点 = 3　—— 竖着数 hp 的层数',
      stats: { '长度': '数 tp 链长', '深度': '数 hp 层数',
               'Length(L)': 3, 'Depth(L)': 3 } }), -1,
      '在图上，长度就是最上面那条 tp 链上的表结点个数，深度就是沿 hp 最多能往下走几层。' +
      '一个横着数，一个竖着数。',
      ['长度数 tp 链', '深度数 hp 层', '两个方向']));

    steps.push(step(lf({
      hdr: '为什么要用「表头 + 表尾」这种拆法',
      nst: all, lst: allL,
      t1: '任何非空表都能唯一拆成「一个表头 + 一个表尾」，拆完剩下的表尾还是同类问题',
      t2: '于是求长度、求深度、复制、比较全都能写成递归 —— 结构配合算法，这是这种表示法的用意',
      stats: { '拆法': '表头 + 表尾', '表尾': '仍是广义表',
               '好处': '算法可写成递归', '代价': '取第 i 个要走 i 步' } }), -1,
      '这种拆法的用意是：任何非空表都能唯一拆成表头加表尾，而表尾还是个广义表 —— 同类问题。' +
      '于是求长度、深度、复制全都能写成递归。',
      ['拆成表头 + 表尾', '表尾仍是广义表', '算法自然成递归']));

    return steps;
  }

  /* ========== 场景三：取表头 GetHead 与取表尾 GetTail ========== */
  function buildHT() {
    var steps = [];
    var hf = function (o) {
      return { mode: 'list', hdr: o.hdr || '取表头与取表尾',
               nst: o.nst || {}, lst: o.lst || {}, tst: o.tst || {}, est: o.est || {},
               t1: o.t1 || null, t2: o.t2 || null, stats: o.stats || {} };
    };
    var muteAll = function () {
      var o = {}, id;
      for (id in LN) o[id] = 'mute';
      return o;
    };

    steps.push(step(hf({
      hdr: '两个基本操作：GetHead 取表头，GetTail 取表尾',
      nst: muteAll(),
      t1: 'GetHead(L)：取出第 1 个元素本身。它可能是原子，也可能是子表 —— 看第 1 个元素是什么',
      t2: 'GetTail(L)：取出「去掉第 1 个元素之后剩下的部分」，并且把它当作一个表 —— 永远带括号',
      stats: { 'GetHead': '第 1 个元素本身', 'GetTail': '剩下的部分当作表',
               '前提': 'L 非空', 'GetHead 结果': '原子或表' } }), 0,
      'GetHead 取第 1 个元素本身，可能是原子也可能是子表。GetTail 取去掉第 1 个之后剩下的部分，' +
      '并且把它当作一个表 —— 这一句是全章最容易错的地方。',
      ['GetHead 取第一个', 'GetTail 取剩下的', 'GetTail 结果是表']));

    steps.push(step(hf({
      hdr: 'GetHead(L)：沿 L 的第 1 个表结点的 hp 走一步',
      nst: setAll(setAll(muteAll(), ['N1'], 'hot'), ['A'], 'good'),
      lst: mark('N1.hp', 'hot'),
      tst: mark('a', 'hot'),
      t1: 'GetHead(L) = a　—— 第 1 个元素是原子 a，取出来就是原子 a，没有括号',
      t2: '注意不是 (a)。表头是「那个元素本身」，元素是原子就得原子，是子表才得表',
      stats: { 'GetHead(L)': 'a', '结果类型': '原子',
               '实现': '取 N1 的 hp', '不是': '(a)' } }), 1,
      'GetHead(L) 就是沿第 1 个表结点的 hp 走一步，得到原子 a。注意结果是 a 而不是 (a)：' +
      '表头是那个元素本身，是原子就得原子。',
      ['GetHead(L) = a', '走一步 hp', '结果不带括号']));

    var n2 = setAll(muteAll(), ['N2', 'N3', 'E'], 'hot');
    n2.A = 'mute'; n2.N1 = 'active';
    steps.push(step(hf({
      hdr: 'GetTail(L)：沿 L 的第 1 个表结点的 tp 走一步',
      nst: n2, lst: mark('N1.tp', 'hot', 'N2.tp', 'next'),
      tst: mark('B', 'hot', 'e', 'hot'),
      t1: 'GetTail(L) = ((b, c, (d)), e)　—— 去掉 a 之后剩下两个元素，用一对括号括起来',
      t2: '为什么是两层括号：外层那对是「表尾这个表」的括号，里层那对属于子表 (b,c,(d)) 自己',
      stats: { 'GetTail(L)': '((b,c,(d)), e)', '长度': 2,
               '实现': '取 N1 的 tp', '结果类型': '表（必然）' } }), 2,
      'GetTail(L) 沿第 1 个表结点的 tp 走一步，得 ((b,c,(d)), e)。外层括号是表尾自己的，' +
      '里层那对属于子表 —— 两层括号各有来历。',
      ['GetTail(L)=((b,c,(d)),e)', '走一步 tp', '外层括号是表尾的']));

    steps.push(step(hf({
      hdr: '最容易错的一点：表尾即使只剩一个元素，也还是表',
      nst: setAll(setAll(muteAll(), ['N3'], 'hot'), ['E'], 'good'),
      lst: mark('N2.tp', 'hot'),
      tst: mark('e', 'hot'),
      t1: '设 T = GetTail(L) = ((b,c,(d)), e)，那么 GetTail(T) = (e)　—— 带括号，不是 e',
      t2: 'e 是原子，(e) 是长度 1 的表。GetTail 的结果按定义必须是表，所以那对括号必须写上',
      stats: { 'GetTail(T)': '(e)', '不是': 'e',
               '(e) 是': '长度 1 的表', 'e 是': '原子' } }), 3,
      '这是最容易错的一步：GetTail 再取一次得到的是 (e) 而不是 e。GetTail 的结果按定义必须是表，' +
      '所以哪怕只剩一个元素，括号也必须写上。',
      ['GetTail(T) = (e)', '不是 e', '结果按定义必须是表']));

    return steps.concat(buildHTTail(hf, muteAll));
  }

  /* 场景三收尾：反复取头尾把 d 抠出来 —— 这是考试的典型题型。 */
  function buildHTTail(hf, muteAll) {
    var steps = [];

    var seq = [
      { h: 'GetTail(L) = ((b,c,(d)), e)',
        nst: setAll(muteAll(), ['N2', 'N3', 'E'], 'hot'),
        lst: mark('N1.tp', 'hot'), tst: mark('B', 'hot', 'e', 'hot'),
        a: '第 1 步：先甩掉 a，得到 ((b,c,(d)), e)',
        b: '目标是把最里层的 d 取出来 —— 一步一步剥' },
      { h: 'GetHead(…) = (b, c, (d))',
        nst: setAll(setAll(muteAll(), ['M1', 'M2', 'M3'], 'hot'), ['B', 'C', 'D1'], 'active'),
        lst: mark('N2.hp', 'hot', 'M1.tp', 'next', 'M2.tp', 'next'),
        tst: mark('B', 'hot'),
        a: '第 2 步：取表头，得到子表 (b, c, (d))',
        b: '这回表头是个子表，所以结果带括号 —— 因为那个元素本身就是表' },
      { h: 'GetTail(GetTail((b,c,(d)))) = ((d))',
        nst: setAll(setAll(muteAll(), ['M3'], 'hot'), ['D1'], 'active'),
        lst: mark('M2.tp', 'hot', 'M3.hp', 'hot'), tst: mark('D', 'hot'),
        a: '第 3 步：连取两次表尾甩掉 b 和 c，得到 ((d))',
        b: '两层括号：外层是表尾自己的，内层是 (d) 的 —— 数括号要数清' },
      { h: 'GetHead(((d))) = (d)',
        nst: setAll(setAll(muteAll(), ['D1'], 'hot'), ['Dd'], 'active'),
        lst: mark('M3.hp', 'hot'), tst: mark('D', 'hot'),
        a: '第 4 步：取表头剥掉一层，得到 (d)',
        b: '还差一层括号 —— (d) 是表，d 才是原子，别在这里停手' },
      { h: 'GetHead((d)) = d　拿到了',
        nst: setAll(muteAll(), ['Dd'], 'hot'),
        lst: mark('D1.hp', 'hot'), tst: mark('d', 'hot'),
        a: '第 5 步：再取一次表头，终于得到原子 d',
        b: '整条路：Head(Head(Tail(Tail(Head(Tail(L))))))　—— 括号有几层就得剥几次' }
    ];
    for (var i = 0; i < seq.length; i++) {
      var s = seq[i];
      steps.push(step(hf({
        hdr: '把 d 取出来 · 第 ' + (i + 1) + ' 步　' + s.h,
        nst: s.nst, lst: s.lst, tst: s.tst, t1: s.a, t2: s.b,
        stats: { '第几步': i + 1, '本步操作': i === 0 ? 'GetTail' :
                 i === 1 ? 'GetHead' : i === 2 ? 'GetTail ×2' : 'GetHead',
                 '当前结果': s.h.split('= ')[1] } }), 4,
        s.a + '。' + s.b,
        ['第 ' + (i + 1) + ' 步', s.h, i === 4 ? '拿到原子 d' : '继续剥']));
    }

    steps.push(step(hf({
      hdr: '记住这一条就不会错：Head 可能得原子，Tail 一定得表',
      nst: muteAll(),
      t1: 'GetHead 的结果取决于第 1 个元素是什么：原子就得原子，子表就得表',
      t2: 'GetTail 的结果与元素是什么无关，按定义永远是表 —— 剩一个元素就是 (x)，剩零个就是 ()',
      stats: { 'GetHead': '原子 或 表', 'GetTail': '永远是表',
               '剩 1 个': '(x)', '剩 0 个': '()' } }), -1,
      '一句话收尾：GetHead 的结果看第 1 个元素是什么，可能是原子；GetTail 的结果与元素无关，' +
      '按定义永远是表，剩一个就是 (x)，剩零个就是 ()。',
      ['Head 可能得原子', 'Tail 一定得表', '剩 0 个就是空表 ()']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['generalized-list'] = {
    title: '广义表的存储结构',
    subtitle: '广义表把「元素必须同类型」这条放开，元素既可以是原子也可以是表 —— 于是结构从一条线变成一棵树。元素类型不统一，结点就得靠 tag 区分：表结点带 hp 和 tp，原子结点带值。全篇只用一个例子 L = (a, (b, c, (d)), e)。',
    height: 730,
    scenes: [
      { name: '层次结构', build: buildTree, codeTag: '递归定义 · 长度与深度',
        code: [
          '// 广义表：LS = (α₁, α₂, …, αₙ)，n = 0 时为空表',
          '// 每个 αᵢ 要么是原子，要么本身又是一个广义表（递归）',
          '长度 Length(LS) = n        // 只数最外层元素个数',
          '// L = (a, (b,c,(d)), e) 长度 3：a、(b,c,(d))、e',
          '',
          '深度 Depth(原子) = 0       // 原子不带括号',
          'Depth(LS) = 1 + max(Depth(αᵢ))   // 空表深度为 1',
          '// L 的深度 3：最深一条 L → (b,c,(d)) → (d) → d'
        ] },
      { name: '头尾链表', build: buildLink, codeTag: '表结点 tag=1｜hp｜tp',
        code: [
          '// 元素类型不统一，用 tag 区分两种结点',
          'typedef struct GLNode {',
          '  int tag;                    // 1 表结点，0 原子结点',
          '  union {',
          '    AtomType atom;            // tag=0：直接存值',
          '    struct { struct GLNode *hp, *tp; } ptr;',
          '  };                          // tag=1：hp 表头，tp 表尾',
          '} *GList;',
          '// hp 指向本元素，tp 指向去掉本元素后剩下的那个表',
          '// L 共 7 个表结点（3+3+1）+ 5 个原子结点'
        ] },
      { name: '取表头表尾', build: buildHT, codeTag: 'GetHead / GetTail',
        code: [
          '// 前提：L 非空。空表取表头表尾无定义',
          'GetHead(L) = L->ptr.hp      // 第 1 个元素本身',
          'GetTail(L) = L->ptr.tp      // 剩下的部分，仍是一个表',
          '',
          '// L = (a, (b,c,(d)), e)',
          '// GetHead(L) = a            原子，不带括号',
          '// GetTail(L) = ((b,c,(d)), e)   永远带括号',
          '// GetTail(((b,c,(d)), e)) = (e) ← 不是 e，这里最容易错'
        ] }
    ]
  };
})();
