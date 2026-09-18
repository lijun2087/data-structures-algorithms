/* 稀疏矩阵三元组与转置 — 第5章
 * 场景一：三元组表示 —— 非零元远少于 m·n 时，只记 (i, j, e)，
 *         零元一个不存；代价是随机存取没了，只能顺着表扫。
 * 场景二：普通转置 —— 按列序扫三元组，每一列都要把整表扫一遍，O(n·t)。
 *         t 接近 m·n 时反而比 O(m·n) 的朴素转置更慢。
 * 场景三：快速转置 —— 先统计每列非零元个数 num[]，再累加出每列在转置表中的
 *         起始位置 cpot[]，然后一趟扫描直接归位，O(m + t)。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：舞台 x∈[24,976]、y∈[84,384]，图形不低于 330（旁白占 352）。
   * 纵向：标题 102、说明两行 124 / 144，之后才是图形。
   * 横向分三块：
   *   矩阵     行号 x=44，格子 20 见方步长 22 自 x=62 起 → 右边界 214；
   *            列号 y=166，6 行自 y=172 起 → 下边界 302。
   *   三元组   行标 i/j/e 在 x=222，格子 38×20 步长 40 自 x=240 起 → 右边界 558；
   *            源表序号 y=166、三行 172…232；目标表序号 y=250、三行 256…316。
   *   辅助数组 说明 y=166 / 214，格子 38×22 步长 40 自 x=580 起 → 右边界 858；
   *            num 行 172…194，cpot 行 220…242，列号 y=258。
   * 最右 870…976 留给三条短提示（y=180 起，行距 22）。 */
  var MR = 6, MC = 7;                      // 原矩阵 6 行 7 列
  var MX0 = 62, MSZ = 20, MST = 22, MY0 = 172;
  var TX0 = 240, TW = 38, TH = 20, TST = 40;
  var SRCY = 172, DSTY = 256;
  var NX0 = 580, NW = 38, NH = 22, NST = 40;
  var HX = 870;

  function mx(j) { return MX0 + j * MST; }
  function my(i) { return MY0 + i * MST; }
  function tx(k) { return TX0 + k * TST; }
  function tcx(k) { return tx(k) + TW / 2; }
  function nx(c) { return NX0 + c * NST; }
  function ncx(c) { return nx(c) + NW / 2; }

  // 键是下标或 "i,j"，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }
  // 三元组表存的是对象，逐个浅拷贝，免得后退重放时串味
  function cpList(a) {
    return a.map(function (t) {
      return t == null ? null : { i: t.i, j: t.j, e: t.e };
    });
  }

  /* 画一张三元组表：三行分别是 i、j、e，列数固定 CNT，空位画 mute。
   * st 是列下标 → 状态。 */
  function triTable(g, y0, list, cnt, st, label) {
    var k, r, c, t, rows = ['i', 'j', 'e'], names = ['行 i', '列 j', '值 e'];
    g.appendChild(D.text(label, { x: 222, y: y0 - 8, 'class': 'vz-lab',
      fill: '#8fd0ff', 'font-size': 11 }));
    for (r = 0; r < 3; r++) {
      g.appendChild(D.text(names[r], { x: 222, y: y0 + r * TH + 14,
        'class': 'vz-slot', 'font-size': 10 }));
    }
    for (k = 0; k < cnt; k++) {
      t = list[k];
      c = D.C[st[k] || (t == null ? 'mute' : 'good')];
      for (r = 0; r < 3; r++) {
        g.appendChild(D.el('rect', { x: tx(k), y: y0 + r * TH, width: TW,
          height: TH, rx: 4, fill: c.fill, stroke: c.stroke,
          'stroke-width': 1.6 }));
        if (t != null) {
          g.appendChild(D.text(t[rows[r]], { x: tcx(k), y: y0 + r * TH + 14,
            'class': 'vz-cellval', 'font-size': 11.5 }));
        }
      }
      g.appendChild(D.text(k, { x: tcx(k), y: y0 - 8, 'class': 'vz-idx' }));
    }
  }

  /* 画矩阵本体：非零元亮起来写值，零元画成 mute 只写一个淡淡的 0，
   * 一眼就能看出「零元占了绝大多数」。mst 的键是 "i,j"。 */
  function matBody(g, A, mst, label) {
    var i, j, c, key, v;
    g.appendChild(D.text(label, { x: 44, y: 152, 'class': 'vz-lab',
      fill: '#8fd0ff', 'font-size': 11 }));
    for (j = 0; j < MC; j++) {
      g.appendChild(D.text(j, { x: mx(j) + MSZ / 2, y: 166, 'class': 'vz-idx' }));
    }
    for (i = 0; i < MR; i++) {
      g.appendChild(D.text(i, { x: 48, y: my(i) + 14, 'class': 'vz-idx' }));
      for (j = 0; j < MC; j++) {
        key = i + ',' + j;
        v = A[i][j];
        c = D.C[mst[key] || (v === 0 ? 'mute' : 'good')];
        g.appendChild(D.el('rect', { x: mx(j), y: my(i), width: MSZ,
          height: MSZ, rx: 4, fill: c.fill, stroke: c.stroke,
          'stroke-width': 1.5 }));
        g.appendChild(D.text(v, { x: mx(j) + MSZ / 2, y: my(i) + 14,
          'class': v === 0 ? 'vz-idx' : 'vz-cellval', 'font-size': 10.5 }));
      }
    }
  }

  /* 画 num[] 与 cpot[]：两排格子共用一套列号，列号写在下面。
   * nst / cst 的键是列下标；值为 null 的格子留白。 */
  function auxRows(g, num, cpot, nst, cst) {
    var c, k, y;
    g.appendChild(D.text('num[col]　该列有几个非零元',
      { x: NX0, y: 166, 'class': 'vz-lab', fill: '#ffd166', 'font-size': 10.5 }));
    g.appendChild(D.text('cpot[col]　该列第一个元素落在哪',
      { x: NX0, y: 214, 'class': 'vz-lab', fill: '#6ceaa5', 'font-size': 10.5 }));
    for (k = 0; k < MC; k++) {
      for (y = 0; y < 2; y++) {
        var arr = y === 0 ? num : cpot, stm = y === 0 ? nst : cst;
        c = D.C[stm[k] || (arr[k] == null ? 'mute' : (y === 0 ? 'hot' : 'good'))];
        g.appendChild(D.el('rect', { x: nx(k), y: 172 + y * 48, width: NW,
          height: NH, rx: 4, fill: c.fill, stroke: c.stroke,
          'stroke-width': 1.6 }));
        if (arr[k] != null) {
          g.appendChild(D.text(arr[k], { x: ncx(k), y: 172 + y * 48 + 15,
            'class': 'vz-cellval', 'font-size': 11.5 }));
        }
      }
      g.appendChild(D.text('col ' + k,
        { x: ncx(k), y: 258, 'class': 'vz-idx', 'font-size': 9.5 }));
    }
  }

  /* f = { hdr, t1, t2, t3, A, mst, src, srcSt, dst, dstSt, dstLab,
   *       num, cpot, nst, cst, hints:[至多三条], stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 102, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.t1) {
      ctx.stage.appendChild(D.text(f.t1,
        { x: 44, y: 124, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.t2) {
      ctx.stage.appendChild(D.text(f.t2,
        { x: 44, y: 144, 'class': 'vz-info', fill: '#b9c8e6' }));
    }
    matBody(ctx.stage, f.A, f.mst || {}, f.matLab || 'M：6 × 7，只有 8 个非零元');
    triTable(ctx.stage, SRCY, f.src, f.src.length, f.srcSt || {},
      f.srcLab || 'a[]　源三元组表（按行序）');
    if (f.dst) {
      triTable(ctx.stage, DSTY, f.dst, f.dst.length, f.dstSt || {},
        f.dstLab || 'b[]　转置结果表');
    }
    if (f.num) auxRows(ctx.stage, f.num, f.cpot, f.nst || {}, f.cst || {});
    (f.hints || []).forEach(function (h, q) {
      ctx.stage.appendChild(D.text(h, { x: HX, y: 180 + q * 22,
        'class': 'vz-info', fill: '#8ea3c9', 'font-size': 10.5 }));
    });
    if (f.t3) {
      ctx.stage.appendChild(D.text(f.t3,
        { x: 44, y: 330, 'class': 'vz-info', fill: '#8ea3c9' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* 教材里的经典例子：6×7 只有 8 个非零元，零元占 42−8 = 34 格。 */
  var MAT = [
    [0, 12, 9, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [-3, 0, 0, 0, 0, 14, 0],
    [0, 0, 24, 0, 0, 0, 0],
    [0, 18, 0, 0, 0, 0, 0],
    [15, 0, 0, -7, 0, 0, 0]
  ];
  var TN = 8;                              // 非零元个数 t
  // 按行序扫出来的三元组表，也就是教材中的 a.data
  var SRC = [];
  (function () {
    for (var i = 0; i < MR; i++) {
      for (var j = 0; j < MC; j++) {
        if (MAT[i][j] !== 0) SRC.push({ i: i, j: j, e: MAT[i][j] });
      }
    }
  })();
  function blank(n) { var a = [], q; for (q = 0; q < n; q++) a.push(null); return a; }

  /* ---------- 场景一：三元组表示 ---------- */
  function buildTriple() {
    var steps = [], list = blank(TN), fill = 0;
    var snap = function (o) {
      return { hdr: o.hdr || '三元组表示：零元一个不存，只记 (行, 列, 值)',
               t1: o.t1 || null, t2: o.t2 || null, t3: o.t3 || null,
               A: MAT, mst: o.mst || {},
               src: cpList(list), srcSt: o.srcSt || {},
               matLab: o.matLab || 'M：6 × 7 = 42 格，非零元只有 8 个',
               srcLab: o.srcLab || 'a[]　三元组表（按行序，行内按列序）',
               hints: o.hints || null, stats: o.stats || {} };
    };

    steps.push(step(snap({
      t1: '42 个格子里 34 个是零 —— 零元占了 81%，却和非零元一样占内存',
      t2: '稀疏矩阵的定义并不严格：非零元远少于 m×n 时就叫稀疏',
      t3: '既然零元没有信息量，那就干脆不存它 —— 但省下来的空间要付代价',
      hints: ['42 格', '零元 34', '非零 8'],
      stats: { '矩阵规模': MR + ' × ' + MC, '总格数': MR * MC,
               '非零元 t': TN, '零元占比': '81%' } }), 0,
      '这张 6×7 的矩阵一共 42 格，其中 34 格是零。零元没有信息量，可它在二维数组里照样占一个单元。' +
      '稀疏矩阵压缩的出发点就是：把零元丢掉。',
      ['42 格里 34 格是零', '零元没有信息量', '丢掉零元只存非零元']));

    steps.push(step(snap({
      hdr: '一个非零元要记三样东西',
      t1: '只存值不行 —— 值离开了位置就没有意义，必须把行号列号一起带上',
      t2: '所以每个非零元记成一个三元组 (i, j, e)：行下标、列下标、元素值',
      t3: '整个矩阵就是一张三元组表，外加 m、n、t 三个数说明它原本多大',
      hints: ['(i, j, e)', '行 列 值', '外加 m n t'],
      stats: { '一个三元组': '(i, j, e)', '表长': 't = ' + TN,
               '附加信息': 'm, n, t', '结构': '顺序表' } }), 1,
      '为什么必须记三样？因为零元一旦不存，元素的位置就不能靠「排第几个」推出来了。' +
      '值必须和它的行号列号绑在一起，这就是三元组 (i, j, e)。',
      ['值离开位置没意义', '行号列号必须带上', '(i, j, e) 是一个三元组']));

    /* 按行序把非零元一个个抓进表里。次序很关键：行序（行内按列序）
     * 是后面转置算法的前提，所以这里每一步都点明「先看完这一行」。 */
    for (var q = 0; q < TN; q++) {
      var t = SRC[q];
      list[fill++] = t;
      var ms = {}; ms[t.i + ',' + t.j] = 'hot';
      var ss = {}; ss[q] = 'hot';
      steps.push(step(snap({
        hdr: '按行序扫一遍矩阵，遇到非零元就往表里追一项',
        mst: ms, srcSt: ss,
        t1: 'M[' + t.i + '][' + t.j + '] = ' + t.e + ' 不是零 → 记成 (' +
            t.i + ', ' + t.j + ', ' + t.e + ') 放进 a[' + q + ']',
        t2: '扫描次序是「先扫完第 ' + t.i + ' 行再往下」，所以表里 i 不减、同 i 内 j 递增',
        t3: '这个「行序有序」不是顺手排的，是后面转置算法能成立的前提',
        hints: ['已记 ' + fill + ' / ' + TN, '行 i=' + t.i, '列 j=' + t.j],
        stats: { '当前元素': 'M[' + t.i + '][' + t.j + ']', '值 e': t.e,
                 '存入': 'a[' + q + ']', '已记': fill + ' / ' + TN } }), 2,
        'M[' + t.i + '][' + t.j + '] = ' + t.e + '，非零，记成三元组放进 a[' + q + ']。' +
        '扫描是一行一行来的，所以表里的 i 只增不减、同一行内 j 递增 —— 这叫行序有序。',
        ['非零 → 追加一项', '存入 a[' + q + ']', '行序有序：i 不减']));
    }

    steps.push(step(snap({
      hdr: '压缩的账：省了多少，又亏了什么',
      t1: '二维数组要 42 个单元；三元组表要 8×3 = 24 个 —— 省了将近一半',
      t2: '但每个非零元的开销从 1 个单元涨到 3 个：t 超过 m×n/3 时压缩就白做了',
      t3: '更麻烦的是随机存取没了 —— 想取 M[3][2] 只能顺着表找，O(t)',
      hints: ['42 → 24', 't < mn/3 才值', '存取降为 O(t)'],
      stats: { '二维数组': MR * MC + ' 单元', '三元组表': TN * 3 + ' 单元',
               '划算条件': 't < m×n/3', '随机存取': 'O(t)' } }), 3,
      '算笔账：二维数组 42 个单元，三元组表 8×3 = 24 个。省了，但每个非零元的开销涨到 3 倍，' +
      't 大于 m×n/3 就不划算。而且下标到地址的公式没了，取一个元素只能扫表。',
      ['42 单元 → 24 单元', 't < m×n/3 才划算', '随机存取变成 O(t)']));

    return steps;
  }

  // 每一列的非零元个数与起始位置，两个场景都要用
  var NUM = [], CPOT = [];
  (function () {
    var c, s = 0;
    for (c = 0; c < MC; c++) NUM.push(0);
    for (c = 0; c < TN; c++) NUM[SRC[c].j]++;
    for (c = 0; c < MC; c++) { CPOT.push(s); s += NUM[c]; }
  })();
  // 把 (i,j,e) 行列互换
  function swap(t) { return { i: t.j, j: t.i, e: t.e }; }
  // 全表标成同一个状态，用来表示「这一趟把整张表都扫了」
  function allSt(s) { var o = {}, k; for (k = 0; k < TN; k++) o[k] = s; return o; }

  /* ---------- 场景二：普通转置 O(n·t) ---------- */
  function buildTranspose() {
    var steps = [], dst = blank(TN), q = 0, scans = 0;
    var snap = function (o) {
      return { hdr: o.hdr || '普通转置：按列序扫表，每一列都要把整表扫一遍',
               t1: o.t1 || null, t2: o.t2 || null, t3: o.t3 || null,
               A: MAT, mst: o.mst || {},
               src: cpList(SRC), srcSt: o.srcSt || {},
               dst: cpList(dst), dstSt: o.dstSt || {},
               matLab: o.matLab || 'M：6 × 7，转置后是 7 × 6',
               srcLab: 'a[]　源表（行序有序）',
               dstLab: o.dstLab || 'b[]　结果表（要求也行序有序）',
               hints: o.hints || null, stats: o.stats || {} };
    };

    steps.push(step(snap({
      t1: '转置就是把 M[i][j] 搬到 T[j][i] —— 三元组里只要把 i 和 j 对调',
      t2: '难点不在对调，在于对调之后表还得保持「行序有序」这个约定',
      t3: '结果表 b 的 i 必须不减 —— 也就是要按源表的列号从小到大输出',
      hints: ['i 与 j 对调', '值不变', '但次序要重排'],
      stats: { '原矩阵': MR + ' × ' + MC, '转置后': MC + ' × ' + MR,
               '非零元': TN + ' 个不变', '要求': 'b 也行序有序' } }), 0,
      '转置本身很简单：每个三元组把 i 和 j 对调就行。真正的麻烦是次序 —— 三元组表按约定必须行序有序，' +
      '而对调之后原来的次序就乱了。',
      ['转置 = i 与 j 对调', '值和个数都不变', '难点是重排次序']));

    var bad = SRC.map(swap);
    steps.push(step({
      hdr: '为什么不能原地对调就完事',
      t1: '就地互换每一项的 i、j，得到 (1,0) (2,0) (0,2) (5,2) (2,3) (1,4) (0,5) (3,5)',
      t2: '第 0 项 i=1，第 2 项 i=0 —— i 一会儿大一会儿小，行序全乱了',
      t3: '这样的表已经不算合法的三元组表：后续算法全都指望它是有序的',
      A: MAT, mst: {},
      src: cpList(bad), srcSt: allSt('bad'),
      matLab: 'M：6 × 7，转置后是 7 × 6',
      srcLab: 'a[]　把每一项的 i、j 就地对调的结果',
      hints: ['i 不再递增', '表已失序', '必须重新排'],
      stats: { '就地对调': '一趟就能做完', '问题': 'i 不再有序',
               '后果': '不是合法三元组表', '所以': '要按列序输出' }
    }, 1,
      '如果只是原地把每一项的 i、j 对调，表就变成了 (1,0)(2,0)(0,2)… i 一会儿 1 一会儿 0，' +
      '完全失序。三元组表失序就等于作废，所以必须换个办法：按列号从小到大重新输出。',
      ['原地对调会失序', 'i 不再单调', '要按列序重排']));

    /* 外层跑列号，内层把整张表扫一遍 —— 这一趟扫描是代价的来源，
     * 所以每一列都把全表标成 active，让「又扫了一遍」看得见。 */
    for (var col = 0; col < MC; col++) {
      var st = allSt('active'), hit = [], p;
      for (p = 0; p < TN; p++) {
        if (SRC[p].j === col) { st[p] = 'hot'; hit.push(p); dst[q++] = swap(SRC[p]); }
      }
      scans += TN;
      var ds = {}, w;
      for (w = q - hit.length; w < q; w++) ds[w] = 'hot';
      var ms = {};
      hit.forEach(function (z) { ms[SRC[z].i + ',' + SRC[z].j] = 'hot'; });
      steps.push(step(snap({
        mst: ms, srcSt: st, dstSt: ds,
        t1: 'col = ' + col + '：从头到尾扫一遍 a[]，挑出 j = ' + col + ' 的项' +
            (hit.length ? '，找到 ' + hit.length + ' 个' : '，一个也没有'),
        t2: hit.length ? '按扫到的先后追加到 b[]，它们的 i 都等于 ' + col + ' —— 所以 b 自然有序'
                       : '这一列全是零，白扫了 ' + TN + ' 次比较 —— 代价却照样算',
        t3: '不管这一列有几个元素，全表 ' + TN + ' 项都要过一遍，累计比较 ' + scans + ' 次',
        hints: ['col = ' + col, '命中 ' + hit.length + ' 个', '累计扫 ' + scans],
        stats: { '当前列 col': col, '本列非零元': hit.length,
                 '已输出': q + ' / ' + TN, '累计比较': scans } }), 2,
        '轮到 col = ' + col + '，把整张表从头扫到尾，挑出 j = ' + col + ' 的项' +
        (hit.length ? '，共 ' + hit.length + ' 个，依次追加到 b。'
                    : '。这一列没有非零元，' + TN + ' 次比较全白费。') +
        '累计比较已经 ' + scans + ' 次。',
        ['扫全表找 j = ' + col, hit.length ? '追加 ' + hit.length + ' 项' : '本列为空',
         '累计比较 ' + scans]));
    }

    steps.push(step(snap({
      hdr: '算法对了，代价却不划算',
      dstSt: allSt('done'),
      t1: 'b[] 行序有序，转置完成 —— 但外层 n = 7 趟，每趟扫 t = 8 项，共 ' + scans + ' 次比较',
      t2: '时间复杂度 O(n·t)。当 t 接近 m×n 时，n·t ≈ n·m·n，比朴素的 O(m×n) 还慢',
      t3: '问题出在「不知道每一项该放哪」，只好靠一遍遍扫描把它们按列凑出来',
      hints: ['O(n·t)', scans + ' 次比较', 't 大时更慢'],
      stats: { '外层趟数': 'n = ' + MC, '每趟扫描': 't = ' + TN,
               '总比较': scans, '复杂度': 'O(n·t)' } }), 10,
      '结果是对的，代价却不划算：7 趟 × 8 项 = ' + scans + ' 次比较，O(n·t)。' +
      't 接近 m×n 时甚至比朴素的双重循环还慢。根源是我们不知道每一项该落在哪，只能靠反复扫描凑次序。',
      ['O(n·t) = ' + scans + ' 次', 't 大时不如朴素法',
       '根源：不知道该放哪']));

    return steps;
  }

  /* ---------- 场景三：快速转置 O(m+t) ---------- */
  function buildFast() {
    var steps = [], dst = blank(TN);
    var num = blank(MC), cpot = blank(MC), ops = 0;
    var snap = function (o) {
      return { hdr: o.hdr || '快速转置：先算出每一项该落在哪，再一趟归位',
               t1: o.t1 || null, t2: o.t2 || null, t3: o.t3 || null,
               A: MAT, mst: o.mst || {},
               src: cpList(SRC), srcSt: o.srcSt || {},
               dst: cpList(dst), dstSt: o.dstSt || {},
               num: num.slice(), cpot: cpot.slice(),
               nst: o.nst || {}, cst: o.cst || {},
               matLab: 'M：6 × 7',
               dstLab: o.dstLab || 'b[]　结果表（一趟直接归位）',
               hints: o.hints || null, stats: o.stats || {} };
    };

    steps.push(step(snap({
      t1: '普通转置慢，是因为每处理一列都要重新找一遍「这一列有哪些元素」',
      t2: '换个思路：如果事先就知道每一项该放进 b[] 的第几格，一趟扫描就够了',
      t3: '要知道位置，只需要两个信息：每列有几个非零元、每列从第几格开始',
      hints: ['慢在反复找', '想一趟做完', '先算出位置'],
      stats: { '目标': '一趟扫描完成', '需要': '每项的目标位置',
               '辅助一': 'num[col]', '辅助二': 'cpot[col]' } }), 0,
      '普通转置慢在反复扫描。换个思路：要是扫源表之前就知道每一项该落进 b 的第几格，' +
      '那一趟就能做完。而算出这个位置，只需要两个辅助数组。',
      ['慢在反复扫描', '若知目标位置只需一趟', '为此要两个辅助数组']));

    /* 第一步：统计 num[]。这里逐项累加，num 格子从 mute 变亮，
     * 让「一趟扫描就能统计完」变得可见。 */
    var c;
    for (c = 0; c < MC; c++) num[c] = 0;
    steps.push(step(snap({
      hdr: 'num[col]：先把每一列的非零元个数数出来',
      nst: allColSt('active'),
      t1: 'num 全部清零，然后扫一遍源表：见到一项 j = col，就让 num[col] 加一',
      t2: '这一趟只跟 t 有关 —— 扫 ' + TN + ' 项，做 ' + TN + ' 次加一',
      t3: '注意：清零的代价是 O(n)，统计的代价是 O(t)，加起来 O(n+t)',
      hints: ['先清零', '扫一遍源表', 'j = col 就加一'],
      stats: { '数组': 'num[0..' + (MC - 1) + ']', '初值': '全 0',
               '统计代价': 'O(t) = ' + TN, '清零代价': 'O(n) = ' + MC } }), 1,
      '第一件事是统计每列有几个非零元。num 先全部清零，然后把源表扫一遍，' +
      '每见到一项就给它所在的列加一。只扫一遍，代价 O(t)。',
      ['num 先清零', '扫一遍源表', '每项给自己的列加一']));

    for (var p = 0; p < TN; p++) {
      num[SRC[p].j]++;
      ops++;
      var ns = {}; ns[SRC[p].j] = 'active';
      var ss = {}; ss[p] = 'hot';
      var ms = {}; ms[SRC[p].i + ',' + SRC[p].j] = 'hot';
      steps.push(step(snap({
        hdr: 'num[col]：扫源表，第 ' + p + ' 项落在第 ' + SRC[p].j + ' 列',
        mst: ms, srcSt: ss, nst: ns,
        t1: 'a[' + p + '] 的列号 j = ' + SRC[p].j + ' → num[' + SRC[p].j +
            '] 加一，变成 ' + num[SRC[p].j],
        t2: '不用管它是第几行、值是多少 —— 这一趟只关心列号',
        t3: '扫完全表 num 就齐了，总共只做了 ' + TN + ' 次加一',
        hints: ['a[' + p + '] → col ' + SRC[p].j, 'num 变 ' + num[SRC[p].j],
                '已扫 ' + ops + ' / ' + TN],
        stats: { '当前项': 'a[' + p + ']', '列号 j': SRC[p].j,
                 'num[j]': num[SRC[p].j], '已扫': ops + ' / ' + TN } }), 2,
        'a[' + p + '] 的列号是 ' + SRC[p].j + '，于是 num[' + SRC[p].j + '] 加一变成 ' +
        num[SRC[p].j] + '。这一趟只看列号，行号和值都不用管。',
        ['只看列号 j = ' + SRC[p].j, 'num[' + SRC[p].j + '] = ' + num[SRC[p].j],
         '已扫 ' + ops + ' / ' + TN]));
    }

    return steps.concat(buildFastTail(snap, num, cpot, dst));
  }

  function allColSt(s) { var o = {}, k; for (k = 0; k < MC; k++) o[k] = s; return o; }

  /* 快速转置的后半段：累加出 cpot[]，再一趟归位。
   * 拆成单独一个函数只为了让每次写入的行数不至于太长，
   * num / cpot / dst 都是传引用进来的同一批数组，snap 里照样能看到更新。 */
  function buildFastTail(snap, num, cpot, dst) {
    var steps = [], c, s = 0;

    steps.push(step(snap({
      hdr: 'cpot[col]：把个数累加成起始位置',
      nst: allColSt('done'),
      t1: 'num 已经齐了：' + num.join('  ') + ' —— 每列有几个非零元一目了然',
      t2: '转置后第 col 行的元素在 b[] 里是连着放的，长度就是 num[col]',
      t3: '那么第 col 行从第几格开始？把前面所有行的长度加起来就是',
      hints: ['num 统计完毕', '每行长度已知', '起点 = 前缀和'],
      stats: { 'num[]': num.join(','), '含义': '转置后每行的长度',
               '下一步': '前缀和 → 起点', '公式': 'cpot[c]=cpot[c-1]+num[c-1]' } }), 3,
      'num 数完了。转置后第 col 行的元素在 b 里是连着放的，长度正好是 num[col]。' +
      '那它从第几格开始？把前面所有行的长度加起来 —— 这就是前缀和。',
      ['num 就是每行长度', '起点 = 前面长度之和', '一次前缀和即可']));

    for (c = 0; c < MC; c++) {
      cpot[c] = s;
      var cs = {}; cs[c] = 'active';
      var ns = {}; if (c > 0) ns[c - 1] = 'hot';
      var expr = c === 0 ? '第 0 行当然从 0 开始'
                         : 'cpot[' + c + '] = cpot[' + (c - 1) + '] + num[' +
                           (c - 1) + '] = ' + cpot[c - 1] + ' + ' + num[c - 1] +
                           ' = ' + s;
      steps.push(step(snap({
        hdr: 'cpot[' + c + ']：第 ' + c + ' 列的元素从 b[' + s + '] 开始放',
        nst: ns, cst: cs,
        t1: expr,
        t2: '也就是说前面 ' + c + ' 列一共占了 ' + s + ' 格，第 ' + c + ' 列接着往下写',
        t3: num[c] === 0 ? '这一列没有非零元，num[' + c + '] = 0，所以下一列的起点和它一样'
                         : '这一列有 ' + num[c] + ' 个，占 b[' + s + '] 到 b[' + (s + num[c] - 1) + ']',
        hints: ['cpot[' + c + '] = ' + s, 'num[' + c + '] = ' + num[c],
                num[c] === 0 ? '本列为空' : '占 ' + num[c] + ' 格'],
        stats: { '列 col': c, 'num[col]': num[c], 'cpot[col]': s,
                 '前面已占': s + ' 格' } }), 4,
        expr + '。含义很直白：前面 ' + c + ' 列总共占掉 ' + s + ' 格，' +
        '所以第 ' + c + ' 列的第一个元素就该写在 b[' + s + ']。',
        ['cpot[' + c + '] = ' + s, '= 前面各列长度之和',
         num[c] === 0 ? '本列为空，起点不动' : '本列占 ' + num[c] + ' 格']));
      s += num[c];
    }

    steps.push(step(snap({
      hdr: 'cpot 就是「每一列在结果表里的门牌号」',
      nst: allColSt('done'), cst: allColSt('done'),
      t1: 'cpot = ' + cpot.join('  ') + ' —— 第 col 列的第一个元素落在 b[cpot[col]]',
      t2: '有了它，扫源表时每遇到一项就知道该往哪写：写在 b[cpot[j]]，然后 cpot[j] 加一',
      t3: 'cpot[j] 加一是关键：它自动指向该列的下一个空位，同列多个元素也不会撞',
      hints: ['cpot 已就绪', '写 b[cpot[j]]', '写完 cpot[j]++'],
      stats: { 'cpot[]': cpot.join(','), '用法': 'b[cpot[j]] = a[p]',
               '写完': 'cpot[j]++', '准备代价': 'O(n+t)' } }), 5,
      'cpot 就是每一列在结果表里的门牌号。接下来扫源表，每遇到一项直接写进 b[cpot[j]]，' +
      '然后让 cpot[j] 加一指向该列的下一个空位 —— 同列有多个元素也不会撞。',
      ['cpot = 每列的起始下标', '写进 b[cpot[j]]', '写完 cpot[j] 自增']));

    return steps.concat(buildPlace(snap, num, cpot, dst));
  }

  /* 一趟归位：按源表次序（行序）扫，每项按 cpot[j] 直接写进结果表。
   * 这里要让学生看清两件事：写入位置是跳跃的（不像普通转置那样顺序追加），
   * 以及 cpot[j]++ 之后同列的下一个元素自然接在后面。 */
  function buildPlace(snap, num, cpot, dst) {
    var steps = [], p, done = 0;

    for (p = 0; p < TN; p++) {
      var t = SRC[p], col = t.j, pos = cpot[col];
      dst[pos] = swap(t);
      cpot[col] = pos + 1;
      done++;
      var ss = {}; ss[p] = 'hot';
      var ds = {}; ds[pos] = 'hot';
      var ms = {}; ms[t.i + ',' + t.j] = 'hot';
      var cs = {}; cs[col] = 'active';
      steps.push(step(snap({
        hdr: '一趟归位：第 ' + p + ' 项直接写到 b[' + pos + ']',
        mst: ms, srcSt: ss, dstSt: ds, cst: cs,
        t1: 'a[' + p + '] = (' + t.i + ', ' + t.j + ', ' + t.e + ')，列号 j = ' + col +
            ' → 查 cpot[' + col + '] = ' + pos + '，写进 b[' + pos + ']',
        t2: '写进去时行列对调，变成 (' + t.j + ', ' + t.i + ', ' + t.e +
            ')；随后 cpot[' + col + '] 自增为 ' + cpot[col],
        t3: '注意写入位置是跳着的 —— 源表按行序读，结果表按列序写，一趟就把次序换过来了',
        hints: ['j = ' + col + ' → b[' + pos + ']', 'cpot[' + col + '] → ' + cpot[col],
                '已归位 ' + done + ' / ' + TN],
        stats: { '源项': 'a[' + p + ']', '列号 j': col,
                 '写入位置': 'b[' + pos + ']', '已归位': done + ' / ' + TN } }), 7,
        'a[' + p + '] 的列号是 ' + col + '，查 cpot[' + col + '] 得 ' + pos +
        '，行列对调后直接写进 b[' + pos + ']，再让 cpot[' + col + '] 自增到 ' + cpot[col] +
        '。位置是查出来的，不用找。',
        ['查 cpot[' + col + '] = ' + pos, '对调后写入 b[' + pos + ']',
         'cpot[' + col + ']++ 让下一个接上']));
    }

    steps.push(step(snap({
      hdr: '一趟扫完，b[] 已经行序有序',
      dstSt: allSt('done'), cst: allColSt('mute'),
      t1: 'b[] 从头到尾 i 递增：0 0 2 2 3 4 5 5 —— 天然满足行序有序，不需要再排序',
      t2: '为什么天然有序？因为每一列的元素都被写进属于自己的那一段，段与段按列号排好了',
      t3: '注意 cpot 被自增改掉了 —— 它现在指向每列的末尾之后，用完就废，这没关系',
      hints: ['一趟写完', 'i 天然递增', 'cpot 已被改写'],
      stats: { '扫描趟数': '1 趟', '写入次数': TN,
               '结果': '行序有序', 'cpot': '已被自增改写' } }), 8,
      '一趟扫完，b 的 i 是 0 0 2 2 3 4 5 5，天然行序有序 —— 因为每列的元素都被写进属于它的那一段，' +
      '段本身按列号排好了。顺带一提，cpot 已经被自增改写，用完即废。',
      ['一趟写完，无需排序', '每列各占一段', 'cpot 用完即废']));

    steps.push(step(snap({
      hdr: '代价对比：O(n·t) 变成 O(m+t)',
      dstSt: allSt('done'),
      t1: '清零 O(n) + 统计 O(t) + 累加 O(n) + 归位 O(t) = O(n+t)，这里是 7+8+7+8 = 30 步',
      t2: '普通转置要 n×t = 56 次比较；矩阵越大差距越明显，因为一个是乘、一个是加',
      t3: '代价是多了 num、cpot 两个长度 n 的数组 —— 用 O(n) 空间换掉了一个乘法量级',
      hints: ['O(n+t)', '30 步 vs 56 次', '多用 2n 空间'],
      stats: { '快速转置': 'O(n+t) = 30', '普通转置': 'O(n·t) = 56',
               '额外空间': '2n = 14', '换取': '乘法降为加法' } }), -1,
      '把账算清：清零、统计、累加、归位四段加起来是 O(n+t)，本例 30 步；普通转置是 n×t = 56 次。' +
      '代价是 num、cpot 两个长度 n 的数组 —— 用 O(n) 空间把乘法量级降成了加法。',
      ['O(n+t) 取代 O(n·t)', '本例 30 步 vs 56 次',
       '花 O(n) 空间换时间']));

    steps.push(step(snap({
      hdr: '这一节真正的方法论',
      dstSt: allSt('done'),
      t1: '慢的版本慢在「每处理一列都要重新找一遍成员」—— 同样的信息被反复求了 n 遍',
      t2: '快的版本先花一趟把这些信息一次算清（num → cpot），后面直接查表',
      t3: '预处理换掉重复扫描 —— 基数排序的计数、哈希的桶、前缀和，都是同一个套路',
      hints: ['重复计算是病根', '预处理一次算清', '查表取代扫描'],
      stats: { '病根': '信息被求了 n 遍', '药方': '预处理一次算清',
               '同类': '计数排序 / 前缀和', '本质': '空间换时间' } }), -1,
      '值得记住的不是 num 和 cpot 这两个名字，而是套路：如果同一份信息被反复计算，' +
      '就先花一趟把它算清存下来，后面直接查。计数排序、前缀和都是这个思路。',
      ['病根是重复计算', '先算清再查表', '空间换时间的典型']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['sparse-matrix'] = {
    title: '稀疏矩阵三元组与转置',
    subtitle: '零元占了八成，就别再为它们花内存 —— 只记 (行, 列, 值)。代价是随机存取没了，连转置这种简单操作都要重新设计：普通转置靠反复扫描凑次序，O(n·t)；快速转置先用 num、cpot 算出每一项的落点，一趟 O(n+t) 归位。',
    height: 740,
    scenes: [
      { name: '三元组表示', build: buildTriple, codeTag: '压缩存储：只存非零元',
        code: [
          '// M 是 m×n 矩阵，非零元只有 t 个（t << m*n）',
          '// 每个非零元记成一个三元组：行下标 i、列下标 j、值 e',
          'for (i = 0; i < m; i++)           // 按行序扫描',
          '  for (j = 0; j < n; j++)         // 行内按列序',
          '    if (M[i][j] != 0)',
          '      a[t++] = { i, j, M[i][j] }; // 追加一项',
          '',
          '// 空间：3t 个单元 vs 二维数组的 m*n 个',
          '// t < m*n/3 时才真的省；否则不如直接用二维数组',
          '// 代价：下标到地址的公式没了，取一个元素要扫表 O(t)'
        ] },
      { name: '普通转置', build: buildTranspose, codeTag: 'O(n·t)：按列序扫 n 遍',
        code: [
          '// 转置：M[i][j] → T[j][i]，三元组里把 i、j 对调',
          '// 但结果表必须仍然行序有序，所以不能就地对调了事',
          'q = 0;',
          'for (col = 0; col < n; col++)     // 外层：目标行 = 源列',
          '  for (p = 0; p < t; p++)         // 内层：整表扫一遍',
          '    if (a[p].j == col) {',
          '      b[q].i = a[p].j;            // 行列对调',
          '      b[q].j = a[p].i;',
          '      b[q].e = a[p].e;',
          '      q++;',
          '    }',
          '// 内外相乘：O(n * t)。t 接近 m*n 时比朴素双重循环还慢'
        ] },
      { name: '快速转置', build: buildFast, codeTag: 'O(n+t)：num + cpot 一趟归位',
        code: [
          '// 思路：先算出每一项在结果表中的位置，再一趟写过去',
          'for (c = 0; c < n; c++) num[c] = 0;        // 清零 O(n)',
          'for (p = 0; p < t; p++) num[a[p].j]++;     // 统计 O(t)',
          '// num[c] = 第 c 列的非零元个数 = 转置后第 c 行的长度',
          'cpot[0] = 0;',
          'for (c = 1; c < n; c++)                    // 前缀和 O(n)',
          '  cpot[c] = cpot[c-1] + num[c-1];          // 该列的起始下标',
          'for (p = 0; p < t; p++) {                  // 归位 O(t)',
          '  q = cpot[a[p].j];                        // 位置是查出来的',
          '  b[q] = { a[p].j, a[p].i, a[p].e };       // 对调后写入',
          '  cpot[a[p].j]++;                          // 指向该列下一个空位',
          '}',
          '// 合计 O(n + t)：用 2n 的辅助空间把乘法量级降成加法'
        ] }
    ]
  };
})();
