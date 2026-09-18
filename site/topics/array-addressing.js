/* 多维数组的行/列优先寻址 — 第5章
 * 场景一：行优先 —— 先铺完第 0 行再铺第 1 行，k = i*n + j。
 * 场景二：列优先 —— 先铺完第 0 列再铺第 1 列，k = j*m + i。
 * 两场景共用一套渲染：左边画 3×4 的矩阵，右边画它在内存里的一维排布，
 * 一条虚线把「二维下标」和「一维偏移」对上，公式和画面就能一一对照。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：舞台 x∈[24,976]、y∈[84,384]，图形内容不低于 330（旁白占 352）。
   * 左侧矩阵：列号 132，格子 140/180/220（36 见方、步长 40），底边 256，
   *           行号写在 x=52。右边界 70+3*40+36 = 226，不会挤到内存条。
   * 右侧内存条：12 格自 x=300 起（50 宽、步长 55），末格右边 955；
   *           格子 158…194，偏移号 210，花括号 218（标签落在 250）。
   * 底部三行说明：276 / 298 / 320。 */
  var M = 3, N = 4;                       // 3 行 4 列
  var MX = 70, MSZ = 36, MST = 40, MY = 140;
  var LX = 300, LW = 50, LH = 36, LST = 55, LY = 158;

  function mx(j) { return MX + j * MST; }
  function my(i) { return MY + i * MST; }
  function mcx(j) { return mx(j) + MSZ / 2; }
  function mcy(i) { return my(i) + MSZ / 2; }
  function lx(k) { return LX + k * LST; }
  function lcx(k) { return lx(k) + LW / 2; }
  function nameOf(i, j) { return 'a' + i + j; }

  // 键是下标或 "i,j"，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* f = { hdr, memLab, mst:{"i,j":状态}, lst:{k:状态}, mem:[12 个名字或 null],
   *       arrow:{i,j,k} | null, brace:{k1,k2,label} | null,
   *       t1, t2, t3, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, j, k, c, key;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));

    // 左：矩阵本体。列号在上、行号在左，二维下标看得见
    for (j = 0; j < N; j++) {
      ctx.stage.appendChild(D.text('j=' + j,
        { x: mcx(j), y: 132, 'class': 'vz-idx' }));
    }
    for (i = 0; i < M; i++) {
      ctx.stage.appendChild(D.text('i=' + i,
        { x: 52, y: mcy(i) + 5, 'class': 'vz-idx' }));
      for (j = 0; j < N; j++) {
        key = i + ',' + j;
        c = D.C[f.mst[key] || 'idle'];
        ctx.stage.appendChild(D.el('rect', { x: mx(j), y: my(i), width: MSZ,
          height: MSZ, rx: 6, fill: c.fill, stroke: c.stroke,
          'stroke-width': 2, filter: 'url(#vzGlow)' }));
        ctx.stage.appendChild(D.text(nameOf(i, j),
          { x: mcx(j), y: mcy(i) + 5, 'class': 'vz-cellval', 'font-size': 12.5 }));
      }
    }

    // 右：一维内存条。空格画成 mute，放进去的才亮起来
    ctx.stage.appendChild(D.text(f.memLab,
      { x: LX, y: 146, 'class': 'vz-lab', fill: '#8fd0ff' }));
    for (k = 0; k < M * N; k++) {
      c = D.C[f.lst[k] || (f.mem[k] == null ? 'mute' : 'good')];
      ctx.stage.appendChild(D.el('rect', { x: lx(k), y: LY, width: LW,
        height: LH, rx: 6, fill: c.fill, stroke: c.stroke,
        'stroke-width': 2, filter: 'url(#vzGlow)' }));
      if (f.mem[k] != null) {
        ctx.stage.appendChild(D.text(f.mem[k],
          { x: lcx(k), y: LY + 23, 'class': 'vz-cellval', 'font-size': 12.5 }));
      }
      ctx.stage.appendChild(D.text(k, { x: lcx(k), y: 210, 'class': 'vz-idx' }));
    }

    /* 对应线：从矩阵格顶上抬起、横过去落到内存格顶。走上方绕行，
     * 免得穿过别的格子；控制点压到 y=112，弧顶约 126，不碰标题（基线 104 在最左）。 */
    if (f.arrow) {
      var ax = mcx(f.arrow.j), bx = lcx(f.arrow.k);
      ctx.stage.appendChild(D.el('path', {
        d: 'M ' + ax + ' ' + my(f.arrow.i) + ' C ' + ax + ' 112, ' +
           bx + ' 112, ' + bx + ' ' + LY,
        fill: 'none', stroke: D.LINE.hot, 'stroke-width': 2.2,
        'stroke-dasharray': '6 5', 'marker-end': 'url(#vzHot)' }));
    }

    // 花括号圈出「已经铺好的这一段」，行优先圈一行、列优先圈一列
    if (f.brace) {
      D.brace(ctx.stage, { x1: lx(f.brace.k1) - 2, x2: lx(f.brace.k2) + LW + 2,
        y: 218, depth: 9, label: f.brace.label, color: '#6ceaa5' });
    }

    if (f.t1) {
      ctx.stage.appendChild(D.text(f.t1,
        { x: 44, y: 276, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.t2) {
      ctx.stage.appendChild(D.text(f.t2,
        { x: 44, y: 298, 'class': 'vz-info', fill: '#b9c8e6' }));
    }
    if (f.t3) {
      ctx.stage.appendChild(D.text(f.t3,
        { x: 44, y: 320, 'class': 'vz-info', fill: '#8ea3c9' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* 两个场景只差「铺开的次序」和公式里 m、n 谁在前，所以共用一个 builder。
   * row：k = i*n + j，先铺满一行再换行；col：k = j*m + i，先铺满一列再换列。 */
  var L = 4, BASE = 1000;                 // 每元素 4 字节，首地址 1000

  function buildOrder(mode) {
    var row = mode === 'row';
    var steps = [];
    var mem = [], mst = {}, lst = {};
    for (var q = 0; q < M * N; q++) mem.push(null);

    var HDR = row ? 'A[3][4] 行优先 row-major：先铺完一行再换行'
                  : 'A[3][4] 列优先 column-major：先铺完一列再换列';
    var MEMLAB = row ? '内存里的一维排布（行优先）　k = i*n + j'
                     : '内存里的一维排布（列优先）　k = j*m + i';
    var snap = function (o) {
      return { hdr: o.hdr || HDR, memLab: MEMLAB,
               mst: cp(mst), lst: cp(lst), mem: mem.slice(),
               arrow: o.arrow || null, brace: o.brace || null,
               t1: o.t1 || null, t2: o.t2 || null, t3: o.t3 || null,
               stats: o.stats || {} };
    };
    // 由一维下标 k 反推二维下标，两种次序的差别全在这一句
    var ijOf = function (k) {
      return row ? { i: Math.floor(k / N), j: k % N }
                 : { i: k % M, j: Math.floor(k / M) };
    };

    steps.push(step(snap({
      t1: '内存是一维的，数组是二维的 —— 存进去之前必须先「拉直」',
      t2: '拉直的次序有两种：一行一行铺（行优先），或一列一列铺（列优先）',
      t3: '不管哪种，元素个数都是 m × n = 12，占 12 × L 个字节',
      stats: { '矩阵规模': M + ' × ' + N, '元素个数': M * N,
               '每元素字节 L': L, '首地址 LOC(0,0)': BASE } }), 0,
      '数组是二维的，内存却只有一维 —— 一条从低地址到高地址的直线。所以二维只是我们看它的方式，' +
      '真要存进去，得先按某个次序把它拉成一条。',
      ['内存只有一维', '二维要先拉直', '拉直的次序有两种']));

    steps.push(step(snap({
      t1: row ? '行优先：a00 a01 a02 a03 | a10 a11 … 一行铺完再换下一行'
              : '列优先：a00 a10 a20 | a01 a11 a21 … 一列铺完再换下一列',
      t2: row ? '同一行的元素在内存里紧挨着，行与行之间首尾相接'
              : '同一列的元素在内存里紧挨着，列与列之间首尾相接',
      t3: row ? 'C、C++、Java、Pascal 都用行优先'
              : 'Fortran、MATLAB、R 用列优先 —— 语言不同，约定不同',
      stats: { '排列次序': row ? '行优先' : '列优先',
               '一段的长度': row ? 'n = ' + N + ' 个' : 'm = ' + M + ' 个',
               '共几段': row ? 'm = ' + M + ' 段' : 'n = ' + N + ' 段' } }), 1,
      (row ? '行优先的规则：把第 0 行整个铺完，接着铺第 1 行，一行一行往下接。'
           : '列优先的规则：把第 0 列整个铺完，接着铺第 1 列，一列一列往右接。') +
      (row ? 'C 语言、Java 都是这样。' : 'Fortran、MATLAB 是这样，跟 C 正好相反。'),
      [row ? '一行铺完再换行' : '一列铺完再换列',
       row ? '同行元素紧挨着' : '同列元素紧挨着',
       row ? 'C / Java 用行优先' : 'Fortran / MATLAB 用列优先']));

    /* 逐个铺开：k 从 0 走到 11，每步把 a(i,j) 放进第 k 格。
     * 一段铺满时（行优先每 4 个、列优先每 3 个）用花括号把这一段圈出来。 */
    var seg = row ? N : M;                       // 一段有几个元素
    var segName = row ? '行' : '列';
    for (var k = 0; k < M * N; k++) {
      var p = ijOf(k), i = p.i, j = p.j;
      mem[k] = nameOf(i, j);
      mst = {}; mst[i + ',' + j] = 'active';
      lst = {}; lst[k] = 'active';
      var segIdx = Math.floor(k / seg), off = k % seg;
      var full = off === seg - 1;
      var br = { k1: segIdx * seg, k2: segIdx * seg + off,
                 label: '第 ' + segIdx + ' ' + segName + (full ? '（铺满）' : '') };
      var expr = row ? i + '×' + N + ' + ' + j : j + '×' + M + ' + ' + i;
      var sta = { '当前元素': nameOf(i, j) };
      sta['k = ' + (row ? 'i×n + j' : 'j×m + i')] = expr + ' = ' + k;
      sta['地址'] = BASE + ' + ' + k + '×' + L + ' = ' + (BASE + k * L);
      sta['已铺'] = (k + 1) + ' / ' + (M * N);
      steps.push(step(snap({
        arrow: { i: i, j: j, k: k }, brace: br,
        t1: nameOf(i, j) + ' 落在第 ' + k + ' 格：k = ' + expr + ' = ' + k,
        t2: '它前面有 ' + (row ? segIdx + ' 个整行，每行 ' + N + ' 个，再加同行左边 ' + off + ' 个'
                              : segIdx + ' 个整列，每列 ' + M + ' 个，再加同列上面 ' + off + ' 个'),
        t3: '所以偏移量就是 ' + (row ? i + '×' + N : j + '×' + M) + ' + ' + off + ' = ' + k,
        stats: sta }), full ? 3 : 2,
        nameOf(i, j) + ' 该放第几格？数一数它前面有多少个元素：' + segIdx + ' 个完整的' + segName +
        '，每' + segName + segName_cnt(row) + '，再加同' + segName + '里排在它前面的 ' + off +
        ' 个，合起来 ' + expr + ' = ' + k + '。' + (full ? '第 ' + segIdx + ' ' + segName + '到此铺满。' : ''),
        [nameOf(i, j) + ' → 第 ' + k + ' 格',
         'k = ' + expr + ' = ' + k,
         full ? '第 ' + segIdx + ' ' + segName + '铺满' : '同' + segName + '还剩 ' + (seg - 1 - off) + ' 个']));
    }

    // 全部铺完，把公式立起来
    var FML = row ? 'LOC(i,j) = LOC(0,0) + (i×n + j)×L'
                  : 'LOC(i,j) = LOC(0,0) + (j×m + i)×L';
    steps.push(step(snap({
      hdr: (row ? '行优先' : '列优先') + '寻址公式：' + FML,
      brace: { k1: 0, k2: M * N - 1, label: '12 个元素，连续存放，一格不空' },
      t1: FML,
      t2: '括号里的 ' + (row ? 'i×n + j' : 'j×m + i') + ' 是偏移量：前面隔了多少个元素',
      t3: '乘 L 换成字节数，再加首地址 LOC(0,0)，就是真实地址',
      stats: { '偏移量': row ? 'i×n + j' : 'j×m + i',
               '×L': '元素个数换字节数',
               '+LOC(0,0)': '换成绝对地址',
               '公式代价': '两次乘加' } }), 4,
      '把刚才数的过程写成公式就是它：括号里算的是「前面隔了几个元素」，乘上每个元素的字节数 L 换成' +
      '字节偏移，再加首地址。整条公式只有两次乘加。',
      ['偏移量 = ' + (row ? 'i×n + j' : 'j×m + i'),
       '×L 换成字节数', '+LOC(0,0) 得绝对地址']));

    // 随机存取：随手挑一个元素，直接算地址，不用挨个走
    var qi = 2, qj = 1, qk = row ? qi * N + qj : qj * M + qi;
    var qm = {}; qm[qi + ',' + qj] = 'hot';
    var ql = {}; ql[qk] = 'hot';
    mst = qm; lst = ql;
    steps.push(step(snap({
      hdr: '随机存取：要 ' + nameOf(qi, qj) + '，直接算，不用找',
      arrow: { i: qi, j: qj, k: qk },
      t1: 'LOC(' + qi + ',' + qj + ') = ' + BASE + ' + (' +
          (row ? qi + '×' + N + ' + ' + qj : qj + '×' + M + ' + ' + qi) +
          ')×' + L + ' = ' + (BASE + qk * L),
      t2: '不管数组多大，这个式子的计算量都一样 —— 两次乘加，O(1)',
      t3: '地址是算出来的，不是找出来的。链表做不到这一点：它只能沿指针一步步走',
      stats: { '目标': nameOf(qi, qj), '偏移 k': qk,
               '地址': BASE + qk * L, '时间复杂度': 'O(1)' } }), 5,
      '要取 ' + nameOf(qi, qj) + '，不必从头挨个走 —— 把 i、j 代进公式，一步算出地址 ' +
      (BASE + qk * L) + '。数组的地址是算出来的，不是找出来的，这就是它能 O(1) 随机存取的全部原因。',
      ['代入公式直接得地址', '与数组大小无关，O(1)',
       '地址靠算，不靠找']));

    steps.push(step(snap({
      hdr: '为什么数组是「随机存取结构」',
      brace: { k1: 0, k2: M * N - 1, label: '元素等长 + 连续存放 = 地址可算' },
      t1: '两个前提：每个元素等长（都是 L 字节），且连续存放（中间不留空）',
      t2: '有这两条，下标到地址就是一个算式；缺任何一条，公式立刻失效',
      t3: '链式结构两条都不满足，所以只能顺着指针走 —— 存取是 O(n)',
      stats: { '前提一': '元素等长 L', '前提二': '连续存放',
               '结果': '下标 → 地址可算', '存取': 'O(1)' } }), -1,
      '公式能成立靠两个前提：元素等长、连续存放。有这两条，下标到地址就是一个算式。' +
      '链式结构两条都不满足，只能顺着指针一个一个走，这才是数组和链表的根本分界。',
      ['前提：等长 + 连续', '下标到地址是算式',
       '链表只能顺指针走，O(n)']));

    return steps;
  }

  // 「每行 4 个 / 每列 3 个」这句话在旁白里出现多次，抽出来避免行优先列优先写错
  function segName_cnt(row) { return row ? ' ' + N + ' 个' : ' ' + M + ' 个'; }

  function buildRow() { return buildOrder('row'); }
  function buildCol() { return buildOrder('col'); }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['array-addressing'] = {
    title: '多维数组的行/列优先寻址',
    subtitle: '内存只有一维，二维数组必须先拉成一条才能存。拉直的次序有行优先和列优先两种，对应两个寻址公式 —— 有了公式，下标到地址只是一次计算，这才是数组能 O(1) 随机存取的原因。',
    height: 720,
    scenes: [
      { name: '行优先', build: buildRow, codeTag: 'row-major（C / Java）',
        code: [
          '// 二维数组 A[m][n]，元素 L 字节，行优先存放',
          '// 规则：第 0 行铺完接第 1 行，一行一行往下接',
          'k = i * n + j        // 前面隔了 i 个整行，再加同行 j 个',
          '// 一行铺满 n 个，k 就进到下一行的头上',
          'LOC(i,j) = LOC(0,0) + (i * n + j) * L',
          '// 代入 i、j 一步得地址 —— 两次乘加，与 m、n 多大无关',
          '',
          '// 注意公式里出现的是 n（列数），行数 m 根本用不到',
          '// 所以 C 里 int a[][4] 可以省掉行数，列数不能省'
        ] },
      { name: '列优先', build: buildCol, codeTag: 'column-major（Fortran）',
        code: [
          '// 同一个 A[m][n]，改成列优先存放',
          '// 规则：第 0 列铺完接第 1 列，一列一列往右接',
          'k = j * m + i        // 前面隔了 j 个整列，再加同列 i 个',
          '// 一列铺满 m 个，k 就进到下一列的头上',
          'LOC(i,j) = LOC(0,0) + (j * m + i) * L',
          '// 和行优先只差 m、n 换了位置，代价完全一样',
          '',
          '// 这回公式里出现的是 m（行数），列数 n 用不到',
          '// 同一片内存，两种约定读出来的矩阵是互为转置的'
        ] }
    ]
  };
})();
