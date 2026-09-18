/* 索引文件与倒排表 — 第12章
 * 文件放在外存上，一次 I/O 读一个物理块 —— 所以文件组织的账只算「访问几次外存」。
 * 顺序文件按主键查要扫半个文件；索引文件把主键抽出来单独建表，表小到能常驻内存，
 * 于是只花一次 I/O 就把记录取到手。
 * 场景一：账怎么算 —— 顺序文件的毛病，以及索引为什么便宜。
 * 场景二：稠密索引与稀疏索引（每记录一项 vs 每块一项）。
 * 场景三：按次关键字查怎么办 —— 倒排表把「记录 → 属性」翻成「属性 → 记录」。
 * 场景四：倒排表的求交，以及它的维护代价。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 6 条记录，主键递增；次关键字「语言」用来做倒排表 */
  var REC = [
    { k: 12, name: 'Ann', lang: 'C' },
    { k: 25, name: 'Bob', lang: 'Java' },
    { k: 31, name: 'Cai', lang: 'C' },
    { k: 48, name: 'Dan', lang: 'Go' },
    { k: 53, name: 'Eve', lang: 'Java' },
    { k: 67, name: 'Fay', lang: 'C' }
  ];
  var BLK = 2;                               // 一个物理块装 2 条记录

  /* 布局：左侧索引表 x=104，右侧数据文件 x=440 起 3 块。
   * 竖直：标题 100 / 说明 122 / 表头 150 / 行 158 起每行 30 / 备注 / 结语 336。 */
  var TX = 104, TW = 78, TH = 26, TY = 158;
  var FX = 430, FW = 150, FH = 26, FY = 158, FG = 8;
  var NX = 640, NY = 286;

  /* 一个表：cols 是列宽数组，rows[i] 是字符串数组，sts[i] 给整行上色 */
  function table(g, x, y, title, cols, rows, sts, hi) {
    var i, j, cx, s, c, tot = 0;
    for (j = 0; j < cols.length; j++) tot += cols[j];
    g.appendChild(D.text(title,
      { x: x, y: y - 10, 'class': 'vz-tag', fill: '#9fb4dc',
        'text-anchor': 'start' }));
    for (i = 0; i < rows.length; i++) {
      s = (sts && sts[i]) || 'idle';
      c = D.C[s];
      cx = x;
      for (j = 0; j < cols.length; j++) {
        g.appendChild(D.el('rect', { x: cx, y: y + i * TH, width: cols[j],
          height: TH, rx: 4, fill: c.fill, stroke: c.stroke,
          'stroke-width': s === 'hot' ? 2.6 : 1.3 }));
        g.appendChild(D.text(rows[i][j],
          { x: cx + cols[j] / 2, y: y + i * TH + 18, 'class': 'vz-idx',
            fill: s === 'mute' ? '#4a5c82'
              : (i === 0 ? '#9fb4dc' : '#eef3ff') }));
        cx += cols[j];
      }
      if (hi && hi[i]) {
        g.appendChild(D.text(hi[i],
          { x: cx + 8, y: y + i * TH + 18, 'class': 'vz-idx',
            fill: '#ffd166', 'text-anchor': 'start' }));
      }
    }
  }

  /* 数据文件：按物理块画，块里两条记录 */
  function fileBlocks(g, x, y, sts, bst, title) {
    var b, i, by, s, c;
    g.appendChild(D.text(title || '数据文件（一块装 ' + BLK + ' 条）',
      { x: x, y: y - 10, 'class': 'vz-tag', fill: '#9fb4dc',
        'text-anchor': 'start' }));
    for (b = 0; b * BLK < REC.length; b++) {
      by = y + b * (BLK * FH + FG);
      s = (bst && bst[b]) || null;
      if (s) {
        c = D.C[s];
        g.appendChild(D.el('rect', { x: x - 5, y: by - 4, width: 160,
          height: BLK * FH + 8, rx: 6, fill: 'none', stroke: c.stroke,
          'stroke-width': 2.4 }));
      }
      g.appendChild(D.text('块 ' + b,
        { x: x - 14, y: by + BLK * FH / 2 + 5, 'class': 'vz-idx',
          fill: s ? '#ffd166' : '#7d90b6', 'text-anchor': 'end' }));
      for (i = 0; i < BLK && b * BLK + i < REC.length; i++) {
        var r = REC[b * BLK + i], rs = (sts && sts[b * BLK + i]) || 'idle';
        var rc = D.C[rs];
        g.appendChild(D.el('rect', { x: x, y: by + i * FH, width: FW,
          height: FH, rx: 4, fill: rc.fill, stroke: rc.stroke,
          'stroke-width': rs === 'hot' ? 2.6 : 1.3 }));
        g.appendChild(D.text(r.k + '　' + r.name + '　' + r.lang,
          { x: x + FW / 2, y: by + i * FH + 18, 'class': 'vz-idx',
            fill: rs === 'mute' ? '#4a5c82' : '#eef3ff' }));
      }
    }
  }

  /* f = { tab:{x,y,title,cols,rows,sts,hi}, tab2:{...}, file:{sts,bst,title},
   *       hdr, cap, notes, legend, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    if (f.tab) {
      table(ctx.stage, f.tab.x || TX, f.tab.y || TY, f.tab.title,
        f.tab.cols, f.tab.rows, f.tab.sts, f.tab.hi);
    }
    if (f.tab2) {
      table(ctx.stage, f.tab2.x || TX, f.tab2.y || TY, f.tab2.title,
        f.tab2.cols, f.tab2.rows, f.tab2.sts, f.tab2.hi);
    }
    if (f.file) {
      fileBlocks(ctx.stage, FX, FY, f.file.sts, f.file.bst, f.file.title);
    }

    for (i = 0; i < (f.notes || []).length && i < 3; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: f.nx || NX, y: (f.ny || NY) + i * 21, 'class': 'vz-info' }));
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

  function mk(n, s) { var a = [], i; for (i = 0; i < n; i++) a.push(s); return a; }

  /* ---------- 场景一：账怎么算 ----------
   * 文件在外存上，一次 I/O 读一整块。所以查找的代价不数比较次数，数读块次数。
   * 顺序文件按主键查平均读半个文件的块；索引表小到能常驻内存，内存里查完
   * 直接按块号读一次 —— 一次 I/O。 */
  function buildWhy() {
    var steps = [];
    var snap = function (o) {
      return { tab: o.tab || null, tab2: o.tab2 || null, file: o.file || null,
               nx: o.nx, ny: o.ny,
               hdr: o.hdr || '外存上的账：只数读块次数',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var idxRows = function () {
      var r = [['主键', '块号']], i;
      for (i = 0; i < REC.length; i++) {
        r.push(['' + REC[i].k, '块 ' + Math.floor(i / BLK)]);
      }
      return r;
    };

    steps.push(step(snap({
      file: { sts: mk(REC.length, 'idle') },
      cap: '记录存在外存上，一次 I/O 读一整块 —— 一次读块比几百次内存比较还慢，账只能这么算',
      stats: { '记录数': REC.length, '块大小': BLK + ' 条 / 块',
               '块数': 3, '代价单位': '读块次数' },
      notes: ['内存比较快到可以忽略，外存寻道要毫秒级',
        '所以文件组织的所有设计都围着「少读几块」转',
        '本例 6 条记录、每块 2 条，共 3 块'],
      nx: 640, ny: 286 }), 0,
      '文件的账和内存里的数据结构不一样：记录在外存上，一次 I/O 读一整块，' +
      '一次读块比几百次内存比较还慢。所以这一章的所有设计都只围着一件事转 —— ' +
      '少读几块。本例 6 条记录、每块装 2 条，共 3 块。',
      ['一次 I/O 读一整块', '外存慢，内存比较可忽略',
       '代价 = 读块次数']));

    steps.push(step(snap({
      file: { sts: (function () { var a = mk(REC.length, 'mute'), i;
        for (i = 0; i < 5; i++) a[i] = 'active';
        a[4] = 'hot'; return a; })(),
        bst: { 0: 'bad', 1: 'bad', 2: 'bad' } },
      hdr: '顺序文件的毛病：查 53 要把前面的块都读一遍',
      cap: '记录顺序存放，找主键 53 只能一块块读下去 —— 读到块 2 才碰上，平均读半个文件',
      stats: { '要找': 53, '实际读块': '3 块',
               '平均': '块数 / 2', '记录多了': '线性增长' },
      notes: ['折半查找在这里用不上：块要一块块读进来才知道里面是什么',
        '就算主键有序，也得先读块才能比 —— 每次试探都是一次 I/O',
        '文件越大越吃亏，代价随块数线性增长'],
      nx: 640, ny: 286 }), 1,
      '顺序文件按主键查，只能一块块读下去：找 53 读到块 2 才碰上，平均要读半个文件。' +
      '这里连折半查找都用不上 —— 块得先读进内存才知道里面是什么，每次试探都是一次 I/O，' +
      '代价随文件大小线性长。',
      ['一块块读下去', '平均读半个文件',
       '折半在这里用不上']));

    steps.push(step(snap({
      tab: { title: '索引表（常驻内存）', cols: [58, 58], rows: idxRows(),
             sts: mk(REC.length + 1, 'idle') },
      file: { sts: mk(REC.length, 'idle') },
      hdr: '索引文件：把主键和块号抽出来单独存一张表',
      cap: '一项只有主键 + 块号，比整条记录小得多 —— 于是这张表能整个装进内存',
      stats: { '一条记录': '主键 + 姓名 + 语言…', '一个索引项': '主键 + 块号',
               '索引表': '小到能常驻内存', '查表': '内存操作，不算 I/O' },
      notes: ['索引项只留「查得着」需要的两样：主键、记录在哪一块',
        '于是索引表比数据文件小一两个数量级',
        '小到能一次读进内存并常驻 —— 这是索引便宜的根本原因'],
      nx: 640, ny: 286 }), 2,
      '索引文件的办法：把主键和「记录在哪一块」抽出来，单独存一张表。' +
      '一个索引项只有这两样，比整条记录小一两个数量级，于是这张表小到能一次读进内存并常驻。' +
      '这才是索引便宜的根本原因，不是因为它有序。',
      ['索引项 = 主键 + 块号', '比记录小得多',
       '小到能常驻内存']));

    steps.push(step(snap({
      tab: { title: '索引表（常驻内存）', cols: [58, 58], rows: idxRows(),
             sts: (function () { var a = mk(REC.length + 1, 'mute');
               a[0] = 'idle'; a[5] = 'hot'; return a; })(),
             hi: { 5: '← 折半查到' } },
      file: { sts: (function () { var a = mk(REC.length, 'mute');
        a[4] = 'hot'; a[5] = 'idle'; return a; })(),
        bst: { 2: 'good' } },
      hdr: '查 53：内存里折半定位，再读一次块',
      cap: '索引表在内存里，折半查到 53 → 块 2；照块号读一次外存，记录到手 —— 一共 1 次 I/O',
      stats: { '内存查表': 'O(log n)，不算 I/O',
               '读块': '1 次', '顺序文件': '平均 1.5 次（本例 3 块）',
               '文件再大': '仍是 1 次' },
      notes: ['索引表在内存，可以放心用折半 —— 试探不花 I/O',
        '查到块号后按块号直接读，只此一次',
        '文件涨到 10⁶ 条，这一步还是 1 次读块'],
      legend: '索引把「在外存里试探」换成了「在内存里试探」，I/O 从 O(块数) 降到 1 次' }), 3,
      '查 53 就变成两步：索引表在内存里，放心折半查到块号 2 —— 试探不花 I/O；' +
      '再照块号读一次外存，记录到手。一共 1 次读块，而且文件涨到一百万条也还是 1 次。' +
      '索引做的事就是把「在外存里试探」换成「在内存里试探」。',
      ['内存折半查块号', '按块号读 1 次',
       '与文件大小无关']));

    return steps;
  }

  /* ---------- 场景二：稠密索引与稀疏索引 ----------
   * 稠密：每条记录一个索引项，记录不必有序，索引本身就够查。
   * 稀疏：每块一个索引项（存块内最大主键），要求记录按主键有序 ——
   * 索引小了 BLK 倍，代价是块内还得再扫一遍（但块已经在内存里，不花 I/O）。 */
  function buildSparse() {
    var steps = [];
    var snap = function (o) {
      return { tab: o.tab || null, tab2: o.tab2 || null, file: o.file || null,
               nx: o.nx || 640, ny: o.ny || 286,
               hdr: o.hdr || '稠密索引与稀疏索引',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var dense = function (sts, hi) {
      var r = [['主键', '块号']], i;
      for (i = 0; i < REC.length; i++) {
        r.push(['' + REC[i].k, '块 ' + Math.floor(i / BLK)]);
      }
      return { title: '稠密索引：每条记录一项', cols: [58, 58], rows: r,
               sts: sts, hi: hi, x: 104 };
    };
    var sparse = function (sts, hi) {
      var r = [['块内最大', '块号']], b;
      for (b = 0; b * BLK < REC.length; b++) {
        r.push(['' + REC[Math.min(b * BLK + BLK - 1, REC.length - 1)].k,
                '块 ' + b]);
      }
      return { title: '稀疏索引：每个块一项', cols: [68, 58], rows: r,
               sts: sts, hi: hi, x: 240, y: 158 };
    };

    steps.push(step(snap({
      tab: dense(mk(REC.length + 1, 'idle')),
      file: { sts: mk(REC.length, 'idle') },
      cap: '稠密索引每条记录一项，共 6 项 —— 好处是数据文件可以不按主键有序',
      stats: { '索引项数': REC.length, '记录数': REC.length,
               '要求记录有序': '不要求', '索引占用': '与记录数同阶' },
      notes: ['索引项数 = 记录数，索引本身有序就够了',
        '数据文件可以按插入顺序堆着，随便存在哪一块',
        '代价：索引表跟着记录数一起长'] }), 0,
      '稠密索引是每条记录一项。好处很实在：索引自己有序就够了，数据文件可以按插入顺序' +
      '随便堆着，记录存在哪一块都行。代价是索引项数等于记录数，跟着数据一起长。',
      ['每记录一项', '数据文件不必有序',
       '索引与记录同阶']));

    steps.push(step(snap({
      tab: sparse(mk(4, 'idle')),
      file: { sts: mk(REC.length, 'idle') },
      hdr: '稀疏索引：一个块只留一项，存块内最大主键',
      cap: '3 个块就 3 项，索引小了 ' + BLK + ' 倍 —— 前提是记录必须按主键有序存放',
      stats: { '索引项数': 3, '块数': 3,
               '缩小倍数': BLK + ' 倍', '前提': '记录按主键有序' },
      notes: ['一项存「这一块里最大的主键」和块号',
        '找 x：在索引里找第一个 ≥ x 的项，x 只可能在那一块',
        '前提是记录有序 —— 否则「块内最大」说明不了任何事'],
      legend: '记住这个交换：索引变小、记录必须有序、块内要多扫一遍' }), 1,
      '稀疏索引一个块只留一项，存这块里最大的主键。索引因此小了 ' + BLK +
      ' 倍（实际是每块的记录数倍）。前提变严了：记录必须按主键有序存放，' +
      '否则「块内最大」这个数说明不了任何事。',
      ['每块一项', '存块内最大主键',
       '要求记录有序']));

    steps.push(step(snap({
      tab: sparse((function () { var a = mk(4, 'mute'); a[0] = 'idle';
        a[3] = 'hot'; return a; })(), { 3: '← 第一个 ≥ 53' }),
      file: { sts: (function () { var a = mk(REC.length, 'mute');
        a[4] = 'hot'; a[5] = 'active'; return a; })(),
        bst: { 2: 'good' } },
      hdr: '查 53：索引定块，块内再扫',
      cap: '索引里第一个 ≥ 53 的是 67 → 块 2；读进块 2，再在这两条里扫一遍找到 53',
      stats: { '内存查表': '在 3 项里折半', '读块': '1 次',
               '块内扫描': '≤ ' + BLK + ' 条', '额外 I/O': '0' },
      notes: ['索引只把范围缩到一个块，块内还得逐条比',
        '但块已经读进内存了 —— 这一步不花 I/O',
        '所以读块次数和稠密索引一样是 1 次'] }), 2,
      '查 53：索引里第一个 ≥ 53 的项是 67，对应块 2；读进块 2，再在这两条记录里扫一遍。' +
      '块内扫描听着多了一步，可块已经在内存里，一次 I/O 都不多花 —— ' +
      '读块次数和稠密索引一样是 1 次。',
      ['索引定到块 2', '块内再扫 ≤ 2 条',
       '读块仍是 1 次']));

    steps.push(step(snap({
      tab: dense(mk(REC.length + 1, 'done')),
      tab2: sparse(mk(4, 'done')),
      hdr: '两者的取舍，以及索引大了怎么办',
      cap: '索引若大到装不进内存，就给索引再建一层索引 —— 层层往上，这就是 B+ 树的由来',
      stats: { '稠密': '记录可无序，索引大',
               '稀疏': '索引小，记录须有序',
               '索引装不下': '给索引建索引',
               '结果': '多级索引 → B+ 树' },
      notes: ['稀疏索引的代价是要求记录有序，插入就得挪动记录',
        '索引大到内存装不下时，给索引再建一层稀疏索引',
        '层层往上就成了多级索引，B+ 树正是把这件事做成了动态平衡的'],
      legend: '第9章的 B+ 树在这里对上了：它就是能随插入删除自动维持平衡的多级稀疏索引' }), 3,
      '两者的取舍：稠密索引大但不要求记录有序，稀疏索引小但要求有序、插入时得挪记录。' +
      '若索引本身大到内存装不下，就给索引再建一层稀疏索引 —— 层层往上就是多级索引。' +
      '第9章的 B+ 树正是把这件事做成了能随插删自动平衡的形式。',
      ['稠密：大但不要求有序', '稀疏：小但要求有序',
       '索引装不下 → B+ 树']));

    return steps;
  }

  /* ---------- 场景三：倒排表 ----------
   * 主键索引解决不了「按次关键字查」：语言 = C 的都有谁？主键索引按主键排，
   * 语言散在各条记录里，只能全文件扫。倒排表把「记录 → 属性」翻过来存成
   * 「属性 → 记录号表」，一次查表就得到全部答案。 */
  var LANGS = ['C', 'Go', 'Java'];
  function invRows(sts) {
    var r = [['次关键字', '记录号表']], j, i, lst;
    for (j = 0; j < LANGS.length; j++) {
      lst = [];
      for (i = 0; i < REC.length; i++) {
        if (REC[i].lang === LANGS[j]) lst.push(REC[i].k);
      }
      r.push([LANGS[j], lst.join(' ')]);
    }
    return { title: '倒排表：属性 → 记录号表', cols: [78, 128], rows: r,
             sts: sts, x: 104 };
  }

  function buildInverted() {
    var steps = [];
    var snap = function (o) {
      return { tab: o.tab || null, tab2: o.tab2 || null, file: o.file || null,
               nx: o.nx || 640, ny: o.ny || 286,
               hdr: o.hdr || '倒排表：把查询的方向翻过来',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      file: { sts: (function () { var a = mk(REC.length, 'active');
        a[0] = 'hot'; a[2] = 'hot'; a[5] = 'hot'; return a; })(),
        bst: { 0: 'bad', 1: 'bad', 2: 'bad' } },
      hdr: '主键索引管不了的问题：语言 = C 的都有谁',
      cap: '主键索引按主键排，语言散在各条记录里 —— 只能把 3 个块全读一遍',
      stats: { '查询': '语言 = C', '主键索引': '用不上',
               '读块': '3 块（全文件）', '答案': '12 31 67' },
      notes: ['主键索引只回答「主键 = x 的记录在哪」',
        '按次关键字查，它一点忙帮不上',
        '只能全文件扫一遍，代价又回到 O(块数)'],
      nx: 640, ny: 264 }), 0,
      '主键索引只回答一种问题：主键等于 x 的记录在哪一块。' +
      '换成「语言 = C 的都有谁」它就一点忙帮不上 —— 语言散在各条记录里，' +
      '只能把 3 个块全读一遍，代价又回到 O(块数)。',
      ['按次关键字查', '主键索引用不上',
       '只能全文件扫']));

    steps.push(step(snap({
      tab: invRows(mk(LANGS.length + 1, 'idle')),
      file: { sts: mk(REC.length, 'mute') },
      hdr: '办法：把「记录 → 属性」翻成「属性 → 记录」',
      cap: '给每个语言值列一张记录号表 —— 这张表叫倒排表，“倒”就倒在这个方向上',
      stats: { '原方向': '记录 → 它的语言',
               '倒排方向': '语言 → 哪些记录',
               '表项数': '不同语言值的个数', '查一次': '直接得全部答案' },
      notes: ['原来的存法是「给一条记录，说出它的语言」',
        '倒排表反过来：「给一个语言，列出所有记录」',
        '倒排的“倒”就是指这个方向 —— 与查询的方向对上了'],
      nx: 640, ny: 264 }), 1,
      '办法就是把方向翻过来。原来的存法是「给一条记录，说出它的语言」，' +
      '倒排表反过来记「给一个语言，列出所有记录」。倒排的「倒」指的就是这个方向 —— ' +
      '存储的方向和查询的方向对上了，查一次就得到全部答案。',
      ['记录→属性 翻成 属性→记录', '每个属性值一张记录号表',
       '方向与查询对上']));

    steps.push(step(snap({
      tab: invRows((function () { var a = mk(LANGS.length + 1, 'mute');
        a[0] = 'idle'; a[1] = 'hot'; return a; })()),
      file: { sts: (function () { var a = mk(REC.length, 'mute');
        a[0] = 'good'; a[2] = 'good'; a[5] = 'good'; return a; })(),
        bst: { 0: 'good', 1: 'good', 2: 'good' } },
      hdr: '查「语言 = C」：一次查表拿到 12 31 67',
      cap: '倒排表在内存里，查一次就得到记录号表；要取记录再按主键索引各读一次块',
      stats: { '查倒排表': '1 次（内存）',
               '得到': '12 31 67',
               '只要记录号': '0 次 I/O',
               '要取记录': '每条 1 次读块' },
      notes: ['很多查询只要「有哪些」，那就一次 I/O 都不用花',
        '真要取记录内容，再拿这些主键去主键索引里查块号',
        '两级配合：倒排表定「是谁」，主键索引定「在哪」'],
      nx: 640, ny: 264 }), 2,
      '查「语言 = C」：倒排表在内存里，查一次就拿到 12 31 67。' +
      '很多查询只要知道「有哪些」，到这里就完了，一次 I/O 都不花；' +
      '真要取记录内容，再拿这些主键去主键索引里查块号。倒排表定「是谁」，主键索引定「在哪」。',
      ['一次查表得 12 31 67', '只要记录号 → 0 次 I/O',
       '两级配合']));

    return steps;
  }

  /* ---------- 场景四：求交与维护代价 ----------
   * 倒排表真正的价值在组合查询：记录号表有序，多个条件就是几张有序表求交，
   * 归并式扫一遍即可。代价在维护：插一条记录要动它涉及的每一张记录号表。 */
  function buildCombine() {
    var steps = [];
    var snap = function (o) {
      return { tab: o.tab || null, tab2: o.tab2 || null, file: o.file || null,
               nx: o.nx || 640, ny: o.ny || 264,
               hdr: o.hdr || '组合查询：几张有序表求交',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var two = function (sts, hi) {
      return { title: '两张记录号表（都按主键有序）',
               cols: [78, 128],
               rows: [['条件', '记录号表'],
                      ['语言 = C', '12 31 67'],
                      ['主键 > 20', '25 31 48 53 67']],
               sts: sts, hi: hi, x: 104 };
    };

    steps.push(step(snap({
      tab: two(['idle', 'active', 'active']),
      file: { sts: mk(REC.length, 'mute') },
      cap: '「语言 = C 且 主键 > 20」—— 两个条件各取一张记录号表，答案就是它们的交集',
      stats: { '条件一': '12 31 67', '条件二': '25 31 48 53 67',
               '要求': '两表都有序', '做法': '归并式扫一遍' },
      notes: ['记录号表建的时候就按主键有序',
        '于是求交不用哈希、不用嵌套循环，归并扫一遍就行',
        '两表长 p、q，求交 O(p + q)'] }), 0,
      '倒排表真正好用的地方是组合查询：「语言 = C 且 主键 > 20」，' +
      '取两个条件各自的记录号表，答案就是交集。记录号表建的时候就按主键有序，' +
      '所以求交不用哈希也不用嵌套循环 —— 像归并那样扫一遍，O(p + q)。',
      ['两个条件两张表', '答案 = 交集',
       '有序 → 归并扫一遍']));

    steps.push(step(snap({
      tab: two(['idle', 'hot', 'hot'], { 1: '∩', 2: '= 31 67' }),
      file: { sts: (function () { var a = mk(REC.length, 'mute');
        a[2] = 'good'; a[5] = 'good'; return a; })(),
        bst: { 1: 'good', 2: 'good' } },
      hdr: '求交结果：31 67',
      cap: '两个指针各扫一遍：相等就收下，小的那个前移 —— 得到 31 67，全程没碰外存',
      stats: { '交集': '31 67', '比较次数': '≤ p + q',
               '外存访问': '0 次', '取记录才需要': '2 次读块' },
      notes: ['12 < 25 → 前移；25 < 31 → 前移；31 = 31 → 收下',
        '48 与 53 都比 67 小，依次前移；67 = 67 → 收下',
        '整个求交在内存完成，一次 I/O 都不花'],
      legend: '这正是搜索引擎的基本骨架：词 → 文档号表，多个词就是多张有序表求交' }), 2,
      '两个指针各扫一遍：相等就收下、小的那个前移，得到 31 67。整个求交在内存里完成，' +
      '一次 I/O 都不花；只有真要取记录内容时才按主键索引读那 2 块。' +
      '搜索引擎的基本骨架就是这个 —— 词 → 文档号表，多个词就是多张有序表求交。',
      ['31 67', '求交不碰外存',
       '搜索引擎的基本骨架']));

    steps.push(step(snap({
      tab: invRows((function () { var a = mk(LANGS.length + 1, 'mute');
        a[0] = 'idle'; a[2] = 'bad'; return a; })()),
      file: { sts: (function () { var a = mk(REC.length, 'mute');
        a[3] = 'bad'; return a; })(), bst: { 1: 'bad' } },
      hdr: '代价在维护：改一条记录要动好几张表',
      cap: '把 48 的语言从 Go 改成 Java：Go 表里删掉 48，Java 表里插入 48 —— 且要插在有序位置',
      stats: { '改一个属性': '动 2 张记录号表',
               '插一条记录': '动它涉及的每张表',
               '每张表还要': '保持有序',
               '所以倒排表': '适合读多写少' },
      notes: ['插入一条记录：每个次关键字的表都要插入它的主键',
        '删除一条：每张表都要把它摘掉',
        '并且每张表都得保持有序，否则求交的归并法就失效'] }), 3,
      '代价都在维护上。把 48 的语言从 Go 改成 Java，要在 Go 表里删掉 48、' +
      '再插到 Java 表的有序位置上。插入删除记录同理 —— 它涉及的每张表都得改，' +
      '而且每张都要保持有序，否则求交的归并法就失效了。',
      ['改一个属性动 2 张表', '每张表要保持有序',
       '适合读多写少']));

    steps.push(step(snap({
      tab: invRows(mk(LANGS.length + 1, 'done')),
      file: { sts: mk(REC.length, 'done'), bst: { 0: 'done', 1: 'done', 2: 'done' } },
      hdr: '小结：文件组织的取舍都写在这张表里',
      cap: '顺序文件写得快查得慢，索引文件查得快写得慢 —— 按访问方式选，没有通吃的组织',
      stats: { '顺序文件': '写快、按主键查 O(块数)',
               '索引文件': '主键查 1 次读块，写要维护索引',
               '倒排表': '次关键字查极快，写更贵',
               '选择依据': '读写比例与查询方式' },
      notes: ['本章的每种组织都是拿写的代价换读的代价',
        '所以先看清「怎么查、查多写少还是写多查少」，再选结构',
        '这也是为什么真实系统里几种组织常常并存'],
      legend: '全书到此收束：从数组链表到外存文件，所有结构都在同一件事上做取舍 —— 用一处代价换另一处' }), -1,
      '这一章的每种组织都是拿写的代价换读的代价：顺序文件写得快查得慢，' +
      '索引文件主键查 1 次读块但写要维护索引，倒排表次关键字查极快但写更贵。' +
      '所以选结构之前先看清怎么查、读写比例如何 —— 没有通吃的组织。',
      ['都是拿写换读', '先看访问方式再选',
       '没有通吃的组织']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['index-file'] = {
    title: '索引文件与倒排表 Index & Inverted List',
    subtitle: '文件在外存上，一次 I/O 读一整块，所以账只数读块次数。索引文件把主键和块号' +
      '抽出来单独存表，表小到能常驻内存 —— 把「在外存里试探」换成「在内存里试探」，' +
      '主键查降到 1 次读块；倒排表再把方向翻过来，管次关键字查。',
    height: 700,
    code: [
      '// 索引项：只留查得着所需的两样',
      'typedef struct { KeyType key; int blkno; } IdxItem;',
      '// 索引表常驻内存 → 折半查表不算 I/O',
      'b = BinSearch(idx, key);      // 内存里定位块号',
      'ReadBlock(b);                 // 唯一的一次读外存',
      'SearchInBlock(b, key);        // 块已在内存，扫描不花 I/O',
      '// 倒排表：次关键字 → 按主键有序的记录号表',
      '// 组合查询 = 几张有序表求交，O(p + q)，不碰外存'
    ],
    scenes: [
      { name: '为什么要索引', build: buildWhy,
        codeTag: '账只数读块次数',
        code: [
          '// 外存：一次 I/O 读一整块，比内存慢几个数量级',
          '// ⇒ 文件组织只有一个目标：少读几块',
          '// 顺序文件按主键查：一块块读，平均读半个文件',
          '//   折半在这里用不上 —— 每次试探都是一次 I/O',
          '// 索引项 = 主键 + 块号，比整条记录小一两个数量级',
          '// ⇒ 索引表小到能常驻内存',
          '// 查找 = 内存折半定块号 + 读 1 次块',
          '// 与文件大小无关：涨到 10⁶ 条还是 1 次读块'
        ] },
      { name: '稠密与稀疏索引', build: buildSparse,
        codeTag: '每记录一项 vs 每块一项',
        code: [
          '// 稠密索引：每条记录一项',
          '//   记录可以无序堆放；索引与记录同阶',
          '// 稀疏索引：每个块一项，存块内最大主键',
          '//   索引小了「每块记录数」倍',
          '//   前提：记录必须按主键有序',
          '//   查找：索引找第一个 >= key 的项 → 读块 → 块内扫',
          '//   块内扫描不花 I/O，读块仍是 1 次',
          '// 索引大到内存装不下 → 给索引建索引 → B+ 树'
        ] },
      { name: '倒排表', build: buildInverted,
        codeTag: '属性 → 记录号表',
        code: [
          '// 主键索引只答「主键 = x 的记录在哪一块」',
          '// 按次关键字查（语言 = C 的有谁）它帮不上忙',
          '//   → 只能全文件扫，代价回到 O(块数)',
          '// 倒排表：把「记录 → 属性」翻成「属性 → 记录」',
          '//   C    : 12 31 67',
          '//   Java : 25 53',
          '// 查一次表就得到全部记录号，0 次 I/O',
          '// 要取记录内容，再用主键索引各读 1 块'
        ] },
      { name: '求交与维护代价', build: buildCombine,
        codeTag: '读多写少才划算',
        code: [
          '// 记录号表建时即按主键有序',
          '// 组合查询 = 求交，归并式扫一遍：',
          'while (i < p && j < q)',
          '    if (A[i] == B[j])      收下, i++, j++;',
          '    else if (A[i] < B[j])  i++;',
          '    else                   j++;',
          '// O(p + q)，全程在内存，不碰外存',
          '// 维护：插删一条记录要改它涉及的每张表并保持有序',
          '// ⇒ 倒排表适合读多写少；组织按访问方式选，无通吃方案'
        ] }
    ]
  };
})();
