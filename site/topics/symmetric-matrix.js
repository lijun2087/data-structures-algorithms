/* 对称矩阵与三角矩阵压缩 — 第5章
 * 场景一：对称矩阵 —— a[i][j] == a[j][i]，只存下三角共 n(n+1)/2 个，
 *         对称的一对元素落到同一个存储位置，下标要先做换算。
 * 场景二：三角矩阵 —— 零区（常数区）只占一个存储单元，公式随上下三角而变。
 * 场景三：三对角带状矩阵 —— 只有 |i-j| <= 1 处非零，共 3n-2 个，k = 2i + j。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：舞台 x∈[24,976]、y∈[84,384]，图形不低于 330（旁白占 352）。
   * 标题 104。
   * 左侧 5×5 矩阵：列号 122，格子 28 见方步长 30，
   *   x = 68…216（68+4*30+28），y = 128…276（128+4*30+28），行号写在 x=46。
   * 右侧一维存储表 SA：说明 140，格子 42×34 步长 45 自 x=250 起。
   *   最长的表是三角矩阵的 16 格，末格右边 250+15*45+42 = 967，刚好卡进 976。
   *   下标 202，花括号 210（标签落在 242），补注 268。
   * 底部两行说明：300 / 322。 */
  var NN = 5;
  var MX0 = 68, MSZ = 28, MST = 30, MY0 = 128;
  var SX0 = 250, SW = 42, SH = 34, SST = 45, SY = 152;

  function mx(j) { return MX0 + j * MST; }
  function my(i) { return MY0 + i * MST; }
  function mcx(j) { return mx(j) + MSZ / 2; }
  function mcy(i) { return my(i) + MSZ / 2; }
  function sx(k) { return SX0 + k * SST; }
  function scx(k) { return sx(k) + SW / 2; }
  function an(i, j) { return 'a' + i + j; }

  // 键是 "i,j" 或下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }
  function cp2(m) { return m.map(function (r) { return r.slice(); }); }

  /* f = { hdr, mv:[[显示值或 null]], mst:{"i,j":状态},
   *       sa:[值或 null], saN, sst:{k:状态},
   *       arrows:[{i,j,k,dx}], brace:{k1,k2,label},
   *       t1, t2, t3, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, j, k, c, key, v;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));

    // 左：矩阵本体。空位（不存的那一半）画成 mute，一眼看出哪半边省掉了
    for (j = 0; j < NN; j++) {
      ctx.stage.appendChild(D.text(j, { x: mcx(j), y: 122, 'class': 'vz-idx' }));
    }
    for (i = 0; i < NN; i++) {
      ctx.stage.appendChild(D.text(i, { x: 46, y: mcy(i) + 5, 'class': 'vz-idx' }));
      for (j = 0; j < NN; j++) {
        key = i + ',' + j;
        v = f.mv[i][j];
        c = D.C[f.mst[key] || (v == null ? 'mute' : 'idle')];
        ctx.stage.appendChild(D.el('rect', { x: mx(j), y: my(i), width: MSZ,
          height: MSZ, rx: 5, fill: c.fill, stroke: c.stroke,
          'stroke-width': 1.8, filter: 'url(#vzGlow)' }));
        if (v != null) {
          ctx.stage.appendChild(D.text(v,
            { x: mcx(j), y: mcy(i) + 5, 'class': 'vz-cellval', 'font-size': 12.5 }));
        }
      }
    }

    // 右：一维存储表 SA。没写进去的格子留空，写进去的亮起来
    ctx.stage.appendChild(D.text('一维存储表 SA',
      { x: SX0, y: 140, 'class': 'vz-lab', fill: '#8fd0ff' }));
    for (k = 0; k < f.saN; k++) {
      c = D.C[f.sst[k] || (f.sa[k] == null ? 'mute' : 'good')];
      ctx.stage.appendChild(D.el('rect', { x: sx(k), y: SY, width: SW,
        height: SH, rx: 6, fill: c.fill, stroke: c.stroke,
        'stroke-width': 2, filter: 'url(#vzGlow)' }));
      if (f.sa[k] != null) {
        ctx.stage.appendChild(D.text(f.sa[k],
          { x: scx(k), y: SY + 23, 'class': 'vz-cellval', 'font-size': 13.5 }));
      }
      ctx.stage.appendChild(D.text(k, { x: scx(k), y: 202, 'class': 'vz-idx' }));
    }

    /* 对应线：矩阵格右边缘 → SA 格左下方。走矩阵与 SA 之间的空档，
     * 控制点压在 y=118 上方绕行，不会穿过任何格子。
     * 对称的两个元素各画一条，落到同一个 SA 格，「共用一个位置」就看得见了。 */
    for (i = 0; i < (f.arrows || []).length; i++) {
      var a = f.arrows[i];
      var ax = mcx(a.j), ay = my(a.i), bx = scx(a.k) + (a.dx || 0);
      ctx.stage.appendChild(D.el('path', {
        d: 'M ' + ax + ' ' + ay + ' C ' + ax + ' 118, ' + bx + ' 118, ' +
           bx + ' ' + SY,
        fill: 'none', stroke: a.kind === 'alt' ? D.LINE.ptr : D.LINE.hot,
        'stroke-width': 2, 'stroke-dasharray': '6 5',
        'marker-end': a.kind === 'alt' ? 'url(#vzPtr)' : 'url(#vzHot)' }));
    }

    if (f.brace) {
      D.brace(ctx.stage, { x1: sx(f.brace.k1) - 2, x2: sx(f.brace.k2) + SW + 2,
        y: 210, depth: 9, label: f.brace.label, color: '#6ceaa5' });
    }
    if (f.sub) {
      ctx.stage.appendChild(D.text(f.sub,
        { x: SX0, y: 268, 'class': 'vz-info', fill: '#8ea3c9' }));
    }
    if (f.t1) {
      ctx.stage.appendChild(D.text(f.t1,
        { x: 44, y: 300, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.t2) {
      ctx.stage.appendChild(D.text(f.t2,
        { x: 44, y: 322, 'class': 'vz-info', fill: '#8ea3c9' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---------- 场景一：对称矩阵 ---------- */
  /* 取值故意造成「下三角按行铺开正好是 1…15」：a[i][j] 的值等于它在 SA 里的
   * 下标加一。这样画面上格子里的数字和 SA 的位置能直接对上，公式对不对
   * 一眼就能验，不必另设一套编号。 */
  var SYM = [
    [1,  2,  4,  7,  11],
    [2,  3,  5,  8,  12],
    [4,  5,  6,  9,  13],
    [7,  8,  9,  10, 14],
    [11, 12, 13, 14, 15]
  ];
  var SN = NN * (NN + 1) / 2;             // 15

  function kSym(i, j) {
    var a = Math.max(i, j), b = Math.min(i, j);
    return a * (a + 1) / 2 + b;
  }

  function buildSym() {
    var steps = [];
    var sa = [], mv, mst = {}, sst = {};
    for (var q = 0; q < SN; q++) sa.push(null);

    var snap = function (o) {
      return { hdr: o.hdr || '对称矩阵 A[5][5]', mv: cp2(o.mv || mv),
               mst: cp(o.mst || {}), sa: sa.slice(), saN: SN,
               sst: cp(o.sst || {}), arrows: o.arrows || [],
               brace: o.brace || null, sub: o.sub || null,
               t1: o.t1 || null, t2: o.t2 || null, stats: o.stats || {} };
    };
    // 全矩阵 / 只留下三角，两种画法来回切
    var full = function () { return cp2(SYM); };
    var lower = function () {
      var m = cp2(SYM);
      for (var i = 0; i < NN; i++) {
        for (var j = i + 1; j < NN; j++) m[i][j] = null;
      }
      return m;
    };
    mv = full();

    steps.push(step(snap({
      t1: '对称矩阵的定义：任意 i、j 都满足 a[i][j] == a[j][i]',
      t2: '沿主对角线折过去，两半完全重合 —— 这说明有一半元素是重复记录的',
      stats: { '阶数 n': NN, '全部元素': NN * NN,
               '对称条件': 'a[i][j] == a[j][i]' } }), 0,
      '对称矩阵沿主对角线对折，两半严丝合缝重合。既然 a[i][j] 和 a[j][i] 永远相等，' +
      '把它们各存一份就是白花空间。',
      ['a[i][j] == a[j][i]', '沿对角线对折可重合',
       '一半元素是重复的']));

    // 挑一对对称元素点出来：值相同，位置互为镜像
    var pi = 1, pj = 3;
    steps.push(step(snap({
      hdr: '一对对称元素：a13 与 a31 的值都是 ' + SYM[pi][pj],
      mst: mark(pi + ',' + pj, 'hot', pj + ',' + pi, 'hot'),
      t1: 'a' + pi + pj + ' = a' + pj + pi + ' = ' + SYM[pi][pj] +
          '，两个格子装的是同一个数',
      t2: '这样的一对一共有 (n² − n) / 2 = ' + ((NN * NN - NN) / 2) +
          ' 对，每对都能省下一个存储单元',
      stats: { '这一对': 'a' + pi + pj + ' / a' + pj + pi,
               '值': SYM[pi][pj], '重复的对数': (NN * NN - NN) / 2,
               '对角线元素': NN + ' 个，不重复' } }), 0,
      '拿 a13 和 a31 举例：值都是 ' + SYM[pi][pj] + '，位置互为镜像。' +
      '这样的成对元素有 ' + ((NN * NN - NN) / 2) + ' 对；对角线上的 ' + NN +
      ' 个不成对，只有自己。',
      ['a13 与 a31 值相同',
       '成对元素 ' + ((NN * NN - NN) / 2) + ' 对',
       '对角线 ' + NN + ' 个不重复']));

    mv = lower();
    steps.push(step(snap({
      hdr: '压缩方案：只存下三角（含对角线）',
      t1: '上三角整块不存了 —— 需要 a[i][j] (i<j) 时，改去读 a[j][i]',
      t2: '要存的个数：1 + 2 + 3 + … + n = n(n+1)/2 = ' + SN +
          '，原来是 n² = ' + NN * NN,
      stats: { '原来': NN * NN + ' 个', '现在': SN + ' 个',
               '省下': (NN * NN - SN) + ' 个',
               '压缩率': (SN / (NN * NN) * 100).toFixed(0) + '%' } }), 1,
      '于是只存下三角：第 0 行 1 个、第 1 行 2 个……第 n−1 行 n 个，加起来 n(n+1)/2 = ' +
      SN + ' 个。上三角要用时改去读它的镜像位置。',
      ['只存下三角含对角线',
       '共 1+2+…+n = ' + SN + ' 个',
       '从 ' + NN * NN + ' 降到 ' + SN]));

    /* 一行一行铺进 SA：铺第 i 行时，它前面已经占掉 1+2+…+i = i(i+1)/2 格，
     * 这正是公式里那一项的来历 —— 所以逐行铺比逐个铺更能讲清推导。 */
    for (var i = 0; i < NN; i++) {
      var pre = i * (i + 1) / 2;          // 前 i 行占掉的格数
      var rs = {}, ss = {};
      for (var j = 0; j <= i; j++) {
        sa[pre + j] = SYM[i][j];
        rs[i + ',' + j] = 'active';
        ss[pre + j] = 'active';
      }
      var sumTxt = i === 0 ? '0' :
        (function () { var t = []; for (var q = 1; q <= i; q++) t.push(q);
                       return t.join('+') + ' = ' + pre; })();
      steps.push(step(snap({
        hdr: '按行铺开：第 ' + i + ' 行的 ' + (i + 1) + ' 个元素进 SA',
        mv: lower(), mst: rs, sst: ss,
        brace: { k1: pre, k2: pre + i,
                 label: '第 ' + i + ' 行，占 SA[' + pre + '…' + (pre + i) + ']' },
        sub: '前 ' + i + ' 行一共占掉 ' + sumTxt + ' 格，所以本行从 SA[' + pre + '] 起',
        t1: '第 ' + i + ' 行有 ' + (i + 1) + ' 个元素（j 从 0 到 ' + i + '）',
        t2: 'i = ' + i + ' 时起点 = 1+2+…+' + i + ' = i(i+1)/2 = ' + pre +
            '，于是 k = ' + pre + ' + j',
        stats: { '当前行 i': i, '本行个数': i + 1,
                 '前 i 行共占': pre + ' 格', '本行起点': 'SA[' + pre + ']' } }), 2,
        '铺第 ' + i + ' 行前先问：前面已经占掉几格？第 0 行 1 个、第 1 行 2 个……到第 ' +
        (i - 1) + ' 行，累计 ' + sumTxt + ' 格。所以本行的起点是 SA[' + pre +
        ']，行内第 j 个就落在 ' + pre + ' + j。',
        ['前 ' + i + ' 行占 ' + pre + ' 格',
         '本行起点 SA[' + pre + ']',
         '本行 ' + (i + 1) + ' 个元素']));
    }

    steps.push(step(snap({
      hdr: '下标映射公式：k = i(i+1)/2 + j　（i ≥ j）',
      mv: lower(),
      brace: { k1: 0, k2: SN - 1, label: SN + ' 格全部装满，一格不空' },
      sub: 'i(i+1)/2 是「前 i 行占掉的格数」，j 是「本行左边还隔了几个」',
      t1: 'k = i(i+1)/2 + j　　地址 = LOC(SA[0]) + k × L',
      t2: '公式只有两项：整行的累计 + 行内偏移。和一维数组的 i*n+j 是同一个套路',
      stats: { '前 i 行': 'i(i+1)/2 格', '行内偏移': 'j',
               'k =': 'i(i+1)/2 + j', '存取仍是': 'O(1)' } }), 2,
      '把刚才每行都数的那件事写成公式：i(i+1)/2 是前 i 行占掉的格数，j 是行内偏移，' +
      '两项相加就是 k。和一维化公式 i*n+j 完全同一个套路，只是每行长度不再相等。',
      ['k = i(i+1)/2 + j',
       '前项：前 i 行的累计', '后项：行内偏移 j']));

    // i < j 的情形：先换下标再套公式，这是本节最容易做错的一步
    var qi = 1, qj = 3, qk = kSym(qi, qj);
    steps.push(step(snap({
      hdr: '取 a13：i < j，落在没存的上三角里',
      mv: lower(), mst: mark(qi + ',' + qj, 'bad'),
      sst: mark(qk, 'mute'),
      sub: '直接代入 i=1、j=3 会得 k = 1 + 3 = 4，而 SA[4] 装的是 a21 —— 取错了',
      t1: 'a13 在上三角，SA 里根本没有它的位置',
      t2: '硬套公式必然出错：公式只对 i ≥ j 成立，因为它数的是「下三角前 i 行」',
      stats: { '目标': 'a13', 'i < j': '成立',
               '硬套得 k': 1 + 3, 'SA[4] 实为': 'a21' } }), 3,
      '取 a13 就麻手了：它在上三角，SA 里没有它的格子。硬把 i=1、j=3 代进公式会得 k=4，' +
      '而 SA[4] 装的是 a21 —— 公式只对 i ≥ j 成立，因为它数的是下三角的行。',
      ['a13 在上三角，没存', '硬套公式取到 a21',
       '公式只对 i ≥ j 成立']));

    steps.push(step(snap({
      hdr: '办法：i < j 时先交换 i、j，再套同一个公式',
      mv: lower(), mst: mark(qi + ',' + qj, 'hot', qj + ',' + qi, 'good'),
      sst: mark(qk, 'hot'),
      arrows: [{ i: qi, j: qj, k: qk, dx: -9 },
               { i: qj, j: qi, k: qk, dx: 9, kind: 'alt' }],
      brace: { k1: qk, k2: qk, label: '两个下标共用这一格' },
      sub: 'k = 3×4/2 + 1 = 7，SA[7] = ' + SYM[qj][qi] + '，正是 a31 也就是 a13 的值',
      t1: '换成 a31：i=3、j=1，k = i(i+1)/2 + j = 6 + 1 = 7',
      t2: '两条虚线落在同一格 —— 对称的一对元素共用一个存储位置，这是压缩的本质',
      stats: { '换下标后': 'i=3, j=1', 'k = 3×4/2+1': qk,
               'SA[k] 的值': SYM[qj][qi], '共用': 'a13 与 a31' } }), 4,
      '正确做法是先换：i < j 就交换 i、j，把 a13 变成 a31，再套同一个公式得 k = 6+1 = 7。' +
      '看两条虚线都落在 SA[7] —— 对称的一对元素共用一个存储位置，压缩就压在这里。',
      ['i < j 先交换 i、j', 'k = 6 + 1 = 7',
       '两个下标共用 SA[7]']));

    steps.push(step(snap({
      hdr: '压缩存储的代价',
      mv: lower(),
      brace: { k1: 0, k2: SN - 1, label: '省了空间，换来的是每次存取都要换算' },
      sub: '实现上通常写个 Value(SA, i, j) 把换算包起来，调用处才不至于每次都判 i、j 大小',
      t1: '省下的：空间从 n² 降到 n(n+1)/2，n 越大越划算，接近省掉一半',
      t2: '付出的：每次存取先判 i、j 大小再算 k；二维下标的直观也丢了，SA[7] 看不出是谁',
      stats: { '空间': 'n² → n(n+1)/2', '存取': '仍 O(1)',
               '代价一': '要做下标换算', '代价二': '失去二维直观' } }), 5,
      '压缩不是白得的。空间省了接近一半，但每次存取都要先比 i、j 大小再算 k；而且光看 SA[7] ' +
      '完全不知道它是哪个元素，二维下标的直观没了。工程上一般把换算包成一个函数藏起来。',
      ['空间省近一半', '存取要先做下标换算',
       '失去二维下标的直观']));

    return steps;
  }

  /* ---------- 场景二：三角矩阵 ---------- */
  /* 下三角矩阵：i ≥ j 处是有效值，i < j 处全是同一个常数 c。
   * 关键差别在于 SA 要多留一格（第 n(n+1)/2 格）专放这个常数 —— 于是
   * 表长是 n(n+1)/2 + 1，比对称矩阵多一格。 */
  var TRI = [
    [3,  0,  0,  0,  0],
    [6,  8,  0,  0,  0],
    [2,  5,  9,  0,  0],
    [7,  1,  4,  6,  0],
    [5,  3,  8,  2,  7]
  ];
  var TN = SN + 1;                        // 16：多的那一格放常数

  function buildTri() {
    var steps = [];
    var sa = [], mst = {}, sst = {};
    for (var q = 0; q < TN; q++) sa.push(null);

    // 有效区照抄，零区一律显示成 c
    var mvTri = function () {
      var m = [];
      for (var i = 0; i < NN; i++) {
        m.push([]);
        for (var j = 0; j < NN; j++) m[i].push(j <= i ? TRI[i][j] : 'c');
      }
      return m;
    };
    var snap = function (o) {
      return { hdr: o.hdr || '下三角矩阵 A[5][5]', mv: cp2(o.mv || mvTri()),
               mst: cp(o.mst || {}), sa: sa.slice(), saN: TN,
               sst: cp(o.sst || {}), arrows: o.arrows || [],
               brace: o.brace || null, sub: o.sub || null,
               t1: o.t1 || null, t2: o.t2 || null, stats: o.stats || {} };
    };
    // 上三角（零区）整片标出来
    var zoneSt = function (state) {
      var o = {};
      for (var i = 0; i < NN; i++) {
        for (var j = i + 1; j < NN; j++) o[i + ',' + j] = state;
      }
      return o;
    };

    steps.push(step(snap({
      mst: zoneSt('mute'),
      t1: '下三角矩阵：主对角线以上全是同一个常数 c（多数情况下 c = 0）',
      t2: '和对称矩阵的差别：那边上三角是「重复的值」，这边上三角是「同一个值」',
      stats: { '有效元素': SN + ' 个', '常数区': (NN * NN - SN) + ' 个',
               '常数区的值': '全是 c', '需要几格': SN + ' + 1' } }), 0,
      '下三角矩阵是另一种情形：对角线以上全是同一个常数 c，通常是 0。' +
      '和对称矩阵比，那边上三角是「重复的值」，这边上三角是「同一个值」—— 都不必逐个存。',
      ['对角线以上全为常数 c', 'c 多数情况下是 0',
       '常数区不必逐个存']));

    // 有效区逐行铺满，公式和对称矩阵完全一样
    for (var i = 0; i < NN; i++) {
      var pre = i * (i + 1) / 2, rs = {}, ss = {};
      for (var j = 0; j <= i; j++) {
        sa[pre + j] = TRI[i][j];
        rs[i + ',' + j] = 'active';
        ss[pre + j] = 'active';
      }
      steps.push(step(snap({
        hdr: '有效区按行铺进 SA：第 ' + i + ' 行',
        mst: rs, sst: ss,
        brace: { k1: pre, k2: pre + i, label: '第 ' + i + ' 行，' + (i + 1) + ' 个' },
        sub: '下三角有效区的铺法和公式，与对称矩阵一字不差：k = i(i+1)/2 + j',
        t1: '第 ' + i + ' 行 ' + (i + 1) + ' 个有效元素 → SA[' + pre + '…' + (pre + i) + ']',
        t2: 'k = i(i+1)/2 + j = ' + pre + ' + j',
        stats: { '当前行 i': i, '本行个数': i + 1,
                 '本行起点': 'SA[' + pre + ']',
                 '已用格数': pre + i + 1 } }), 1,
        '有效区的铺法和对称矩阵一模一样：第 ' + i + ' 行 ' + (i + 1) +
        ' 个元素接在 SA[' + pre + '] 之后，k = ' + pre + ' + j。' +
        '公式没变，因为要数的还是「前 i 行占了几格」。',
        ['第 ' + i + ' 行 → SA[' + pre + '…' + (pre + i) + ']',
         'k = i(i+1)/2 + j', '公式与对称矩阵相同']));
    }

    // 最后一格专放常数：这是三角矩阵和对称矩阵唯一的结构差别
    sa[SN] = 'c';
    var zh = zoneSt('hot'), arr = [];
    arr.push({ i: 0, j: 2, k: SN, dx: -12 });
    arr.push({ i: 1, j: 4, k: SN, dx: 12, kind: 'alt' });
    steps.push(step(snap({
      hdr: '常数区只占一个存储单元：SA[' + SN + '] = c',
      mst: zh, sst: mark(SN, 'hot'), arrows: arr,
      brace: { k1: SN, k2: SN, label: '整片零区共用这一格' },
      sub: '所以下三角矩阵的表长是 n(n+1)/2 + 1 = ' + TN + '，比对称矩阵多出这一格',
      t1: '零区里 ' + (NN * NN - SN) + ' 个元素值都一样，存一份就够 —— 全指向 SA[' + SN + ']',
      t2: '取 a[i][j] 时：i ≥ j 走公式，i < j 直接返回 SA[' + SN + ']，不必换算',
      stats: { '零区元素': (NN * NN - SN) + ' 个',
               '实际占用': '1 格', '表长': TN,
               'i < j 时': '返回 SA[' + SN + ']' } }), 2,
      '零区里那 ' + (NN * NN - SN) + ' 个元素值全一样，存一份就够了 —— 全部指向 SA[' + SN +
      ']。所以三角矩阵的表长是 n(n+1)/2 + 1，比对称矩阵多的正是这一格。',
      ['零区共用 SA[' + SN + ']',
       '表长 = n(n+1)/2 + 1',
       'i < j 直接返回常数']));

    steps.push(step(snap({
      hdr: '上三角矩阵：公式要换，因为每行长度反过来了',
      sub: '上三角第 i 行有 n−i 个有效元素，前 i 行累计 n + (n−1) + … + (n−i+1)',
      t1: '上三角：k = i(2n − i + 1)/2 + (j − i)　（i ≤ j），零区同样只占一格',
      t2: '别背公式，记推导：前 i 行占了多少格 + 本行左边隔了几个 —— 两项相加，永远是这个套路',
      stats: { '下三角每行': '1, 2, …, n 个',
               '上三角每行': 'n, n−1, …, 1 个',
               '上三角 k': 'i(2n−i+1)/2 + (j−i)',
               '推导思路': '累计 + 行内偏移' } }), 3,
      '上三角矩阵的公式长得不一样，原因只是每行长度反过来了：第 i 行有 n−i 个。' +
      '所以不要背公式，记推导 —— 前 i 行占了多少格，加上本行左边隔了几个，两项相加。',
      ['上三角每行 n−i 个',
       'k = i(2n−i+1)/2 + (j−i)',
       '记推导，不必背公式']));

    return steps;
  }

  /* ---------- 场景三：三对角带状矩阵 ---------- */
  /* 只有 |i − j| ≤ 1 处非零，共 3n − 2 个。除首末两行，每行恰好 3 个，
   * 所以 k = 2i + j 这个式子非常齐整 —— 推导也就格外好讲。 */
  var BAND = [
    [4,  2,  0,  0,  0],
    [1,  5,  3,  0,  0],
    [0,  6,  7,  2,  0],
    [0,  0,  1,  8,  4],
    [0,  0,  0,  3,  9]
  ];
  var BN = 3 * NN - 2;                    // 13

  function buildBand() {
    var steps = [];
    var sa = [], sst = {};
    for (var q = 0; q < BN; q++) sa.push(null);

    var mvBand = function () {
      var m = [];
      for (var i = 0; i < NN; i++) {
        m.push([]);
        for (var j = 0; j < NN; j++) {
          m[i].push(Math.abs(i - j) <= 1 ? BAND[i][j] : null);
        }
      }
      return m;
    };
    var snap = function (o) {
      return { hdr: o.hdr || '三对角带状矩阵 A[5][5]', mv: cp2(o.mv || mvBand()),
               mst: cp(o.mst || {}), sa: sa.slice(), saN: BN,
               sst: cp(o.sst || {}), arrows: o.arrows || [],
               brace: o.brace || null, sub: o.sub || null,
               t1: o.t1 || null, t2: o.t2 || null, stats: o.stats || {} };
    };
    var bandSt = function (state) {
      var o = {};
      for (var i = 0; i < NN; i++) {
        for (var j = 0; j < NN; j++) {
          if (Math.abs(i - j) <= 1) o[i + ',' + j] = state;
        }
      }
      return o;
    };

    steps.push(step(snap({
      mst: bandSt('idle'),
      t1: '三对角矩阵：只有 |i − j| ≤ 1 的位置可能非零，非零元挤在对角线附近一条带上',
      t2: '带外全是 0，而且这些 0 的位置是事先知道的 —— 这一点很关键',
      stats: { '阶数 n': NN, '带宽': '3 条对角线',
               '非零元': '3n − 2 = ' + BN, '全部元素': NN * NN } }), 0,
      '三对角矩阵的非零元挤在对角线附近的一条带上，|i − j| ≤ 1 之外全是 0。' +
      '要紧的是这些 0 在哪儿事先就知道，不必存位置信息 —— 这和下一节的稀疏矩阵完全不同。',
      ['非零元集中在 3 条对角线',
       '带外全是 0', '零元位置事先已知']));

    steps.push(step(snap({
      mst: bandSt('active'),
      t1: '数一数：首行和末行各 2 个，中间 n−2 行各 3 个 → 2×2 + 3(n−2) = 3n − 2 = ' + BN,
      t2: '首末两行缺一个，是因为它们各有一侧越出了矩阵边界',
      stats: { '首行 / 末行': '各 2 个', '中间 3 行': '各 3 个',
               '合计': '3n − 2 = ' + BN,
               '压缩比': BN + ' / ' + NN * NN } }), 1,
      '数非零元：中间每行都是 3 个，首末两行各有一侧越出边界，只有 2 个。' +
      '合起来 2×2 + 3(n−2) = 3n − 2 = ' + BN + ' 个，而全矩阵是 ' + NN * NN + ' 个。',
      ['中间每行 3 个',
       '首末行各 2 个', '合计 3n − 2 = ' + BN]));

    /* 按行铺开。为了让公式齐整，教材的做法是给首行也留 3 格的位置：
     * 第 i 行从 SA[3i − 1] 起。这里按 k = 2i + j 直接算，等价而更好记。 */
    for (var i = 0; i < NN; i++) {
      var rs = {}, ss = {}, ks = [];
      for (var j = Math.max(0, i - 1); j <= Math.min(NN - 1, i + 1); j++) {
        var k = 2 * i + j;
        sa[k] = BAND[i][j];
        rs[i + ',' + j] = 'active';
        ss[k] = 'active';
        ks.push(k);
      }
      steps.push(step(snap({
        hdr: '按行铺开：第 ' + i + ' 行的 ' + ks.length + ' 个非零元',
        mst: rs, sst: ss,
        brace: { k1: ks[0], k2: ks[ks.length - 1],
                 label: '第 ' + i + ' 行 → SA[' + ks[0] + '…' + ks[ks.length - 1] + ']' },
        sub: 'k = 2i + j：前 i 行每行占 2 格的「步进」，再加上列号 j',
        t1: '第 ' + i + ' 行占 SA[' + ks.join(', ') + ']',
        t2: '代入验一下：' + (function () {
              var t = [], q, jj;
              for (q = 0; q < ks.length; q++) {
                jj = Math.max(0, i - 1) + q;
                t.push('k(' + i + ',' + jj + ') = 2×' + i + '+' + jj + ' = ' + ks[q]);
              }
              return t.join('　');
            })(),
        stats: { '当前行 i': i, '本行个数': ks.length,
                 '本行 k': ks.join(', '), '已用格数': ks[ks.length - 1] + 1 } }), 2,
        '第 ' + i + ' 行的 ' + ks.length + ' 个非零元落在 SA[' + ks.join('、') +
        ']。规律很齐整：行号每加一，起点就往后挪 3 格，而 k = 2i + j 正好把这个步进和列号合到一起。',
        ['第 ' + i + ' 行 → SA[' + ks.join(',') + ']',
         'k = 2i + j',
         '行号加一，起点挪 3 格']));
    }

    var bi = 3, bj = 2, bk = 2 * bi + bj;
    steps.push(step(snap({
      hdr: '取 a32：k = 2×3 + 2 = ' + bk,
      mst: mark(bi + ',' + bj, 'hot'), sst: mark(bk, 'hot'),
      arrows: [{ i: bi, j: bj, k: bk }],
      brace: { k1: bk, k2: bk, label: 'SA[' + bk + '] = ' + BAND[bi][bj] },
      sub: '存取前先判 |i − j| ≤ 1：不成立就直接返回 0，不必去查 SA',
      t1: 'k = 2i + j = 2×3 + 2 = ' + bk + '，SA[' + bk + '] = ' + BAND[bi][bj],
      t2: '带外元素（|i − j| > 1）连一格都不占 —— 它们的位置是算得出来的，无需记录',
      stats: { '目标': 'a32', 'k = 2×3+2': bk,
               'SA[k] 的值': BAND[bi][bj], '带外': '直接返回 0' } }), 3,
      '取 a32：先判 |3 − 2| ≤ 1 成立，说明它在带内，再算 k = 2×3 + 2 = ' + bk +
      '。带外元素连一格都不占，因为哪些位置是 0 完全可以算出来，不用记。',
      ['先判 |i − j| ≤ 1', 'k = 2i + j = ' + bk,
       '带外直接返回 0']));

    steps.push(step(snap({
      brace: { k1: 0, k2: BN - 1, label: BN + ' 格装完，原本需要 ' + NN * NN + ' 格' },
      sub: '这三种矩阵能压缩，靠的是「零元分布有规律」；分布没规律的就得用三元组，见下一节',
      t1: '对称、三角、带状三种矩阵的共同点：非零元的位置有规律，能用公式算出来',
      t2: '所以只需存值，不必存下标 —— 一旦零元散落无规律，就必须连位置一起存了',
      stats: { '空间': NN * NN + ' → ' + BN, '存取': '仍 O(1)',
               '能压缩的前提': '零元分布有规律',
               '无规律时': '改用三元组' } }), -1,
      '这三种矩阵能这么压，全靠零元的位置有规律，能用公式算出来，于是只存值就够。' +
      '一旦非零元散落得毫无规律，公式就编不出来了，只能把行号列号跟着值一起存 —— 那就是三元组。',
      ['前提：零元分布有规律',
       '有规律就只需存值',
       '无规律则要存下标 → 三元组']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['symmetric-matrix'] = {
    title: '对称矩阵与三角矩阵的压缩存储',
    subtitle: '对称矩阵有一半元素是重复的，三角矩阵有一片元素是同一个常数，带状矩阵的零元位置事先已知 —— 三种情形都能只存一份、用公式把二维下标换算成一维下标。省了空间，代价是每次存取都要先做换算。',
    height: 730,
    scenes: [
      { name: '对称矩阵', build: buildSym, codeTag: 'k = i(i+1)/2 + j',
        code: [
          '// 对称矩阵 A[n][n]：a[i][j] == a[j][i]，一半元素重复',
          '// 只存下三角（含对角线），共 n(n+1)/2 个 → 一维表 SA',
          'k = i*(i+1)/2 + j        // i >= j：前 i 行 + 行内偏移 j',
          '// i < j 时这个式子无效，它数的是下三角的行',
          'Value(SA, i, j):         // 统一的存取入口',
          '    if i < j: swap(i, j) // 先换成下三角的下标',
          '    return SA[ i*(i+1)/2 + j ]',
          '',
          '// 推导：前 i 行分别有 1, 2, …, i 个元素',
          '//       累计 1+2+…+i = i(i+1)/2，这就是本行起点'
        ] },
      { name: '三角矩阵', build: buildTri, codeTag: '零区只占一格',
        code: [
          '// 下三角矩阵：i < j 的位置全是同一个常数 c（常为 0）',
          '// 有效区仍是 n(n+1)/2 个，末尾再加一格专放 c',
          'k = i*(i+1)/2 + j        // i >= j：与对称矩阵完全相同',
          'Value(SA, i, j):',
          '    if i < j: return SA[ n*(n+1)/2 ]   // 整片零区共用这一格',
          '    return SA[ i*(i+1)/2 + j ]',
          '// 表长 = n(n+1)/2 + 1，比对称矩阵多的就是这一格',
          '',
          '// 上三角矩阵：第 i 行有 n-i 个，每行长度反过来了',
          '// k = i*(2n-i+1)/2 + (j-i)   (i <= j)'
        ] },
      { name: '三对角矩阵', build: buildBand, codeTag: 'k = 2i + j',
        code: [
          '// 三对角带状矩阵：只有 |i-j| <= 1 处可能非零',
          '// 个数：首末行各 2 个，中间 n-2 行各 3 个 → 3n-2',
          'k = 2*i + j              // |i-j| <= 1 时成立',
          'Value(SA, i, j):',
          '    if |i-j| > 1: return 0    // 带外，位置可算，不占空间',
          '    return SA[ 2*i + j ]',
          '',
          '// 行号每加一，本行起点就往后挪 3 格',
          '// 2i 是这个步进，j 是列号，合起来正好齐整'
        ] }
    ]
  };
})();
