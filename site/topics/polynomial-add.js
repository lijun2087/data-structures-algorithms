/* 一元多项式相加 — 第2章
 * 场景一：多项式的链式存储 —— 每一项只存 coef 和 expn 两个数，
 *         全表按 expn 递增有序；稀疏多项式再高次也不浪费空间。
 * 场景二：两式相加 —— 像归并两个有序表那样扫一遍，比较指数分三种情形；
 *         同次项系数相加为 0 时，两个结点都要删掉。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function sup(n) {
    var s = '' + n, r = '', i;
    for (i = 0; i < s.length; i++) r += SUP.charAt(+s.charAt(i));
    return r;
  }
  // 一项写成数学形式：(7,0)→7   (3,1)→3x   (9,8)→9x⁸
  function term(c, e) {
    var s = (c < 0 ? '-' : '') + Math.abs(c);
    return e === 0 ? s : s + 'x' + (e === 1 ? '' : sup(e));
  }
  function poly(ts) {
    var r = '', i, t;
    for (i = 0; i < ts.length; i++) {
      t = term(ts[i][0], ts[i][1]);
      r += i === 0 ? t
         : (t.charAt(0) === '-' ? ' - ' + t.slice(1) : ' + ' + t);
    }
    return r || '0';
  }

  /* ---------- 场景一：链式存储 ---------- */
  /* 稀疏对照数组 112…146（下标 159），结点行 200…252（项号 269），
   * 说明文字 300 / 322 —— 全部落在舞台 y ∈ [84,336] 之内 */
  var NW = 98, NH = 52, PITCH = 112, NX0 = 76, NY = 200;
  var AY1 = 112, ACW = 30, ACG = 2, AX0 = 44, ANUM = 18;
  var HEADX = 30, TX = 656;

  function nxOf(i) { return NX0 + i * PITCH; }

  // 三个域 coef | expn | next：nodeBox 只在 data 那一列画值，所以自己画
  function polyNode(g, o) {
    var x = o.x, y = o.y, i;
    var c = D.C[o.state || 'idle'], sw = NW / 3;
    var LAB = ['coef', 'expn', 'next'];
    g.appendChild(D.el('rect', { x: x, y: y, width: NW, height: NH, rx: 8,
      fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
      filter: 'url(#vzGlow)' }));
    for (i = 1; i < 3; i++) {
      g.appendChild(D.el('line', { x1: x + i * sw, y1: y,
        x2: x + i * sw, y2: y + NH,
        stroke: '#33456b', 'stroke-width': 1.5 }));
    }
    for (i = 0; i < 3; i++) {
      g.appendChild(D.el('rect', { x: x + i * sw + 1, y: y + 1,
        width: sw - 2, height: 15, fill: '#24314f' }));
      g.appendChild(D.text(LAB[i],
        { x: x + i * sw + sw / 2, y: y + 12, 'class': 'vz-slot' }));
    }
    if (o.coef != null) {
      g.appendChild(D.text(o.coef,
        { x: x + sw / 2, y: y + 40, 'class': 'vz-nodeval' }));
    }
    if (o.expn != null) {
      g.appendChild(D.text(o.expn,
        { x: x + sw * 1.5, y: y + 40, 'class': 'vz-nodeval' }));
    }
    return { x: x, cx: x + NW / 2, nx: x + sw * 2.5 };
  }

  /* f = { arr:[系数…] | null, arrSt:{指数:状态},
   *       terms:[null（头结点）, [coef,expn]…], st:{下标:状态},
   *       ptrs:{名字:下标}, cap1, cap2, notes, stats } */
  function renderStore(ctx, f) {
    D.clear(ctx.stage);
    var i, x, c, boxes = [];

    // 顺序存储的对照：指数当下标，中间没有的项也得占一格
    if (f.arr) {
      ctx.stage.appendChild(D.text('顺序存储：指数当下标，系数当值',
        { x: AX0, y: AY1 - 12, 'class': 'vz-lab', fill: '#8ea3c9' }));
      for (i = 0; i < ANUM; i++) {
        x = AX0 + i * (ACW + ACG);
        c = D.C[f.arrSt[i] || (f.arr[i] ? 'good' : 'mute')];
        ctx.stage.appendChild(D.el('rect', { x: x, y: AY1, width: ACW,
          height: 34, rx: 5, fill: c.fill, stroke: c.stroke,
          'stroke-width': 1.8 }));
        ctx.stage.appendChild(D.text(f.arr[i] || 0,
          { x: x + ACW / 2, y: AY1 + 23, 'class': 'vz-idx',
            fill: f.arr[i] ? '#e8f0ff' : '#4a5c82' }));
        ctx.stage.appendChild(D.text(i,
          { x: x + ACW / 2, y: 159, 'class': 'vz-idx' }));
      }
      ctx.stage.appendChild(D.text('↑ 指数',
        { x: AX0 + ANUM * (ACW + ACG) + 24, y: 159, 'class': 'vz-lab',
          fill: '#5f7099' }));
    }

    // 链式存储：一项一个结点，中间空着的指数根本不出现
    for (i = 0; i < f.terms.length; i++) {
      var t = f.terms[i];
      boxes.push(polyNode(ctx.stage, { x: nxOf(i), y: NY,
        coef: t ? t[0] : null, expn: t ? t[1] : null,
        state: f.st[i] || 'idle' }));
      ctx.stage.appendChild(D.text(i === 0 ? '头结点（两域都不用）' : '第 ' + i + ' 项',
        { x: boxes[i].cx, y: NY + NH + 17,
          'class': i === 0 ? 'vz-tag' : 'vz-idx' }));
    }

    ctx.stage.appendChild(D.text('P',
      { x: HEADX - 6, y: NY + NH / 2 + 5, 'class': 'vz-ptr' }));
    D.link(ctx.stage, { x1: HEADX + 6, y1: NY + NH / 2,
      x2: boxes[0].x - 3, y2: NY + NH / 2, kind: 'next' });

    for (i = 0; i + 1 < boxes.length; i++) {
      D.link(ctx.stage, { x1: boxes[i].nx, y1: NY + NH / 2,
        x2: boxes[i + 1].x - 3, y2: NY + NH / 2, kind: 'next' });
    }
    ctx.stage.appendChild(D.text('∧',
      { x: boxes[boxes.length - 1].nx, y: NY + NH - 8,
        'class': 'vz-ptr', fill: '#4a5c82' }));

    var pn = Object.keys(f.ptrs || {});
    for (i = 0; i < pn.length; i++) {
      if (!boxes[f.ptrs[pn[i]]]) continue;
      D.pointer(ctx.stage, { name: pn[i], x: boxes[f.ptrs[pn[i]]].cx,
        y: NY + NH + 20, above: false, color: '#6ceaa5' });
    }

    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 46, y: 300, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 46, y: 322, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: TX, y: 172 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  /* ---------- 场景二：两式相加 ---------- */
  /* 三条链上下排开：Pa 120…160，Pb 198…238，Pc 278…318。
   * 结点上方写这一项的数学形式，下方挂指针名，两层文字各占一行，
   * 行与行之间还空着 38px，所以三条链叠在一起也不会缠。 */
  var MW = 68, MH = 40, PITCH2 = 86, MX0 = 150;
  var RY = [120, 198, 278], MTX = 656;

  function mxOf(i) { return MX0 + i * PITCH2; }

  // 相加时 next 不是重点，只留 coef | expn 两个域，结点压到 68×40
  function mergeNode(g, o) {
    var x = o.x, y = o.y, i, sw = MW / 2;
    var c = D.C[o.state || 'idle'], LAB = ['coef', 'expn'];
    var val = [o.coef, o.expn];
    g.appendChild(D.el('rect', { x: x, y: y, width: MW, height: MH, rx: 6,
      fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
      filter: 'url(#vzGlow)' }));
    g.appendChild(D.el('line', { x1: x + sw, y1: y, x2: x + sw, y2: y + MH,
      stroke: '#33456b', 'stroke-width': 1.5 }));
    for (i = 0; i < 2; i++) {
      g.appendChild(D.el('rect', { x: x + i * sw + 1, y: y + 1,
        width: sw - 2, height: 13, fill: '#24314f' }));
      g.appendChild(D.text(LAB[i],
        { x: x + i * sw + sw / 2, y: y + 11, 'class': 'vz-slot' }));
      g.appendChild(D.text(val[i],
        { x: x + i * sw + sw / 2, y: y + 32, 'class': 'vz-nodeval' }));
    }
    return { x: x, cx: x + MW / 2, r: x + MW };
  }

  // 一行画一条链：行首链名，结点上方数学形式，下方挂当前指针
  function mergeRow(ctx, o) {
    var y = RY[o.row], i, boxes = [], t;
    ctx.stage.appendChild(D.text(o.name,
      { x: 46, y: y + 26, 'class': 'vz-ptr', fill: o.color }));
    if (!o.terms.length) {
      ctx.stage.appendChild(D.text('空表（头结点的 next 是 NULL）',
        { x: MX0, y: y + 26, 'class': 'vz-info', fill: '#5f7099' }));
      return;
    }
    var isGone = {};
    for (i = 0; i < (o.gone || []).length; i++) isGone[o.gone[i]] = 1;
    for (i = 0; i < o.terms.length; i++) {
      t = o.terms[i];
      boxes.push(mergeNode(ctx.stage, { x: mxOf(i), y: y,
        coef: t[0], expn: t[1],
        state: o.st[i] || (isGone[i] ? 'mute' : 'idle') }));
      ctx.stage.appendChild(D.text(term(t[0], t[1]),
        { x: boxes[i].cx, y: y - 7, 'class': 'vz-tag' }));
    }
    for (i = 0; i + 1 < boxes.length; i++) {
      D.link(ctx.stage, { x1: boxes[i].r, y1: y + MH / 2,
        x2: boxes[i + 1].x - 3, y2: y + MH / 2, kind: 'next' });
    }
    ctx.stage.appendChild(D.text('∧',
      { x: boxes[boxes.length - 1].r + 12, y: y + MH / 2 + 5,
        'class': 'vz-ptr', fill: '#4a5c82' }));
    for (i = 0; i < (o.gone || []).length; i++) {
      if (boxes[o.gone[i]]) {
        D.cross(ctx.stage, boxes[o.gone[i]].cx, y + MH / 2, 9);
      }
    }
    if (o.at != null && boxes[o.at]) {
      ctx.stage.appendChild(D.text(o.ptr,
        { x: boxes[o.at].cx, y: y + MH + 15, 'class': 'vz-ptr',
          fill: o.color }));
    }
  }

  /* f = { a, b, c:[[coef,expn]…], ast, bst, cst:{下标:状态},
   *       pa, pb, pc:下标, agone, bgone:[下标…], hdr, notes, stats } */
  function renderMerge(ctx, f) {
    D.clear(ctx.stage);
    var i;
    if (f.hdr) {
      ctx.stage.appendChild(D.text(f.hdr,
        { x: 46, y: 96, 'class': 'vz-hdr', fill: '#ffd166' }));
    }
    mergeRow(ctx, { row: 0, name: 'Pa', color: '#6ceaa5', terms: f.a,
      st: f.ast || {}, at: f.pa, ptr: 'pa', gone: f.agone });
    mergeRow(ctx, { row: 1, name: 'Pb', color: '#ffd166', terms: f.b,
      st: f.bst || {}, at: f.pb, ptr: 'pb', gone: f.bgone });
    mergeRow(ctx, { row: 2, name: 'Pc', color: '#4aa3e0', terms: f.c,
      st: f.cst || {}, at: f.pc, ptr: 'pc', gone: null });

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: MTX, y: 150 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'merge') renderMerge(c, f); else renderStore(c, f);
             } };
  }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* ---------- 场景一：链式存储 ---------- */
  /* 取 7 + 3x + 9x⁸ + 5x¹⁷：四项，指数最高 17，中间空了一大截。
   * 顺序存储要开 18 格才装得下，链式存储四个结点就够 —— 这个对比就是本场景。 */
  function buildStore() {
    var steps = [];
    var TS = [[7, 0], [3, 1], [9, 8], [5, 17]];
    var terms = [null, TS[0], TS[1], TS[2], TS[3]];
    var arr = [];
    for (var z = 0; z < ANUM; z++) arr.push(0);
    for (z = 0; z < TS.length; z++) arr[TS[z][1]] = TS[z][0];

    var snap = function (o) {
      return { arr: o.arr || null, arrSt: o.arrSt || {},
               terms: terms.slice(), st: o.st || {}, ptrs: o.ptrs || {},
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      cap1: 'P(x) = ' + poly(TS),
      cap2: '每一项只有两个数说得清：系数 coef 和指数 expn',
      stats: { '项数': TS.length, '最高次': 17, '一项要存': 'coef 和 expn' },
      notes: ['一元多项式的每一项：系数 + 指数',
        '7 → (7, 0)   3x → (3, 1)',
        '9x⁸ → (9, 8)   5x¹⁷ → (5, 17)',
        '所以结点是 coef | expn | next'] }), 0,
      '一元多项式的每一项，说清它只需要两个数：系数和指数。' +
      '把 (coef, expn) 当成一个数据元素，整个多项式就是一个线性表 —— 这一步转换是全题的起点。',
      ['一项 = (coef, expn)', '多项式即线性表',
       '结点：coef | expn | next']));

    steps.push(step(snap({ arr: arr, arrSt: {},
      cap1: '顺序存储：开 18 格，只有 4 格有用',
      cap2: '空着的 14 格全是 0，白占地方',
      stats: { '数组长度': ANUM, '非零项': TS.length,
               '空间利用率': '4 / 18 ≈ 22%' },
      notes: ['顺序存储：指数当下标，系数当值',
        '最高次 17，就得开 18 格',
        '中间 14 格存的全是 0',
        '要是 5x¹⁰⁰⁰⁰ 呢？开一万格'] }), 1,
      '先看顺序存储的做法：指数当下标，系数当值。' + poly(TS) +
      ' 最高次是 17，数组就得开到 18 格，可真正有用的只有 4 格。' +
      '这还只是 17 次，换成 5x¹⁰⁰⁰⁰ 就得开一万格，全存 0。',
      ['指数当下标', '开 18 格只用 4 格',
       '稀疏时浪费得离谱']));

    steps.push(step(snap({ st: mark(0, 'good'),
      cap1: 'P(x) = ' + poly(TS),
      cap2: '链式存储：一项一个结点，四个结点就够了',
      stats: { '结点数': TS.length, '空间': '与项数成正比',
               '与最高次': '无关' },
      notes: ['链式存储：只存出现了的项',
        '四项，四个结点，一格不多',
        '空间只和项数有关，和最高次无关',
        '5x¹⁰⁰⁰⁰ 也只是一个结点'] }), 0,
      '换成链式存储：只给真正出现的项建结点。四项就是四个结点，一格不多。' +
      '空间只跟项数走，跟最高次完全无关 —— 5x¹⁰⁰⁰⁰ 照样只占一个结点。',
      ['只存非零项', '四项 → 四个结点',
       '空间与最高次无关']));

    steps.push(step(snap({ st: mark(0, 'hot'),
      cap2: '头结点两个域都不用，只借它的 next 当入口',
      stats: { '头结点': '有', 'coef/expn': '都不用', '判空': 'P->next == NULL' },
      notes: ['和单链表一样带头结点',
        '它的 coef、expn 两个域都空着',
        '只借它的 next 做入口',
        '好处还是那个：插删不必特判表头'] }), 2,
      '照单链表的老规矩带一个头结点，它的 coef 和 expn 都空着，只借它的 next 当入口。' +
      '这样插到表头和插到表中走同一段代码，判空也统一写成 P->next == NULL。',
      ['带头结点', '两个数据域都不用',
       '插删无需特判表头']));

    // 沿链走一遍，指出 expn 一路递增 —— 这个有序性是下一场相加的前提
    var seen = [];
    for (var k = 1; k < terms.length; k++) {
      var st = mark(0, 'good');
      for (var t = 1; t < k; t++) st[t] = 'good';
      st[k] = 'active';
      seen.push(terms[k][1]);
      var sta = { '当前项': '第 ' + k + ' 项', 'expn': terms[k][1] };
      sta['是否大于前一项'] = k === 1 ? '（第一项）' : '是';
      steps.push(step(snap({ st: st, ptrs: { p: k },
        stats: sta,
        notes: ['p 走到第 ' + k + ' 项：' + term(terms[k][0], terms[k][1]),
          'expn = ' + terms[k][1],
          k === 1 ? '从最低次开始' : '比前一项的 ' + terms[k - 1][1] + ' 大',
          '指数序列：' + seen.join(' < ')] }), 3,
        'p 走到第 ' + k + ' 项 ' + term(terms[k][0], terms[k][1]) + '，指数是 ' + terms[k][1] +
        (k === 1 ? '，这是次数最低的一项。'
                 : '，比前一项的 ' + terms[k - 1][1] + ' 大。'),
        ['第 ' + k + ' 项 expn = ' + terms[k][1],
         k === 1 ? '从最低次起' : '大于前一项',
         '一路递增']));
    }

    steps.push(step(snap({ st: mark(0, 'good', 1, 'done', 2, 'done',
        3, 'done', 4, 'done'),
      cap1: '指数递增有序：' + seen.join(' < '),
      cap2: '这个有序性不是摆好看的，下一场相加全靠它',
      stats: { '存储约定': 'expn 递增', '同次项': '不允许重复',
               '系数为 0 的项': '不出现' },
      notes: ['约定：全表按 expn 递增有序',
        '同一个指数不许出现两次',
        '系数为 0 的项干脆不建结点',
        '这三条一起保证了表示唯一'] }), 4,
      '走完一圈，指数是 ' + seen.join(' < ') + ' —— 全表按 expn 递增有序。' +
      '再加上「同次项不重复」和「系数为 0 的项不建结点」，一个多项式的链表表示就是唯一的。',
      ['expn 递增有序', '同次项不重复',
       '零系数项不出现']));

    steps.push(step(snap({
      cap1: 'P(x) = ' + poly(TS),
      cap2: '有序 + 唯一 → 两式相加只要扫一遍，O(m+n)',
      stats: { '按序号查找': 'O(n)', '求某次项系数': 'O(n)',
               '两式相加': 'O(m+n)' },
      notes: ['有序的好处：相加时能像归并一样扫',
        '两个指针各走一遍，谁都不回头',
        '代价 O(m+n)，和项数成正比',
        '要是无序，就得两两比对 O(m·n)'] }), 4,
      '为什么非要递增有序？因为这样两式相加就能像归并两个有序表那样，两个指针各扫一遍，' +
      '谁也不回头，代价 O(m+n)。要是不排序，每取一项都得在另一条链上找同次项，就成了 O(m·n)。',
      ['有序才能归并式相加', '两指针各扫一遍',
       'O(m+n) 对 O(m·n)']));

    return steps;
  }

  /* ---------- 场景二：两式相加 ---------- */
  /* Pa = 7 + 3x + 9x⁸ + 5x¹⁷
   * Pb = 8x + 22x⁷ - 9x⁸
   * 挑这两个是为了把三种分支和「系数相加为 0」全撞上一遍：
   *   expn 0：Pa 独有 → 直接摘挂
   *   expn 1：两边都有，7+8=15 ≠ 0 → 合成一个结点
   *   expn 7：Pb 独有 → 摘 Pb 的挂上去
   *   expn 8：9 + (-9) = 0 → 两个结点都删，Pc 不长
   *   expn 17：Pb 走完了，Pa 的尾巴整段接过来 */
  function buildAdd() {
    var steps = [];
    var A = [[7, 0], [3, 1], [9, 8], [5, 17]];
    var B = [[8, 1], [22, 7], [-9, 8]];
    var a = A.slice(), b = B.slice(), c = [];
    var agone = [], bgone = [];
    var pa = 0, pb = 0, cmp = 0;

    var snap = function (o) {
      return { a: a.slice(), b: b.slice(), c: c.slice(),
               ast: o.ast || {}, bst: o.bst || {}, cst: o.cst || {},
               pa: o.pa === undefined ? pa : o.pa,
               pb: o.pb === undefined ? pb : o.pb,
               pc: o.pc === undefined ? (c.length ? c.length - 1 : null) : o.pc,
               agone: agone.slice(), bgone: bgone.slice(),
               hdr: o.hdr || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '比较次数': cmp, 'Pc 项数': c.length,
               'Pa 剩余': a.length - pa, 'Pb 剩余': b.length - pb };
    };

    steps.push(step(snap({ pa: null, pb: null, pc: null,
      hdr: 'Pa(x) = ' + poly(A) + '  ·  Pb(x) = ' + poly(B),
      stats: { 'Pa 项数': A.length, 'Pb 项数': B.length,
               '两表': '都按 expn 递增', '结果放在': 'Pc' },
      notes: ['两条链都已按 expn 递增有序',
        '相加就是归并两个有序表',
        'pa、pb 各指一条链的当前项',
        '结果链 Pc 从空开始'] }), 5,
      '两个多项式相加，本质就是归并两个按指数有序的表。pa、pb 各指着一条链的当前项，' +
      '比较它们的 expn，把该出的那一项挂到结果链 Pc 上。Pc 一开始是空的。',
      ['归并两个有序表', 'pa、pb 各指当前项',
       'Pc 初始为空'], 'merge'));

    // 三种分支各走一遍，直到有一条链走完
    while (pa < a.length && pb < b.length) {
      var ea = a[pa][1], eb = b[pb][1], sum;
      cmp++;

      steps.push(step(snap({ ast: mark(pa, 'hot'), bst: mark(pb, 'hot'),
        hdr: '比较 expn：' + ea + (ea < eb ? ' < ' : ea > eb ? ' > ' : ' == ') + eb,
        stats: base(),
        notes: ['pa->expn = ' + ea + '，pb->expn = ' + eb,
          ea < eb ? 'pa 的指数小 → 摘 pa 的结点'
                  : ea > eb ? 'pb 的指数小 → 摘 pb 的结点'
                            : '指数相等 → 系数相加',
          '只比较，不改动',
          '三种情形，三条分支'] }), 6,
        '比较当前两项的指数：pa->expn = ' + ea + '，pb->expn = ' + eb + '。' +
        (ea < eb ? ea + ' 小，说明 ' + term(a[pa][0], ea) + ' 这一项 Pb 里没有同次的，直接归 Pc。'
                 : ea > eb ? eb + ' 小，说明 ' + term(b[pb][0], eb) + ' 这一项 Pa 里没有同次的，直接归 Pc。'
                           : '两边指数一样，得把系数加起来 —— 这是三条分支里唯一要算的一支。'),
        ['pa->expn = ' + ea + '，pb->expn = ' + eb,
         ea < eb ? '取 pa 的' : ea > eb ? '取 pb 的' : '系数相加',
         '三分支之一'], 'merge'));

      if (ea < eb) {
        c.push([a[pa][0], ea]);
        agone.push(pa);
        pa++;
        steps.push(step(snap({ cst: mark(c.length - 1, 'good'),
          stats: base(),
          notes: ['把 pa 的结点整个摘下来挂到 Pc 尾',
            '不用 malloc 新结点，直接换链',
            '所以这一步是 O(1)',
            'pa = pa->next，往后走一格'] }), 7,
          'pa 的指数小，把这个结点整个从 Pa 上摘下来挂到 Pc 尾巴上 —— 不用申请新结点，' +
          '只是改指针，O(1)。然后 pa 往后走一格。Pc 现在是 ' + poly(c) + '。',
          ['结点直接换链，不 malloc', 'Pc 尾添 ' + term(c[c.length - 1][0], c[c.length - 1][1]),
           'pa = pa->next'], 'merge'));
      } else if (ea > eb) {
        c.push([b[pb][0], eb]);
        bgone.push(pb);
        pb++;
        steps.push(step(snap({ cst: mark(c.length - 1, 'good'),
          stats: base(),
          notes: ['这次摘的是 pb 的结点',
            '和上一支完全对称',
            '同样只改指针，O(1)',
            'pb = pb->next'] }), 8,
          '这回是 pb 的指数小，摘 pb 的结点挂到 Pc 上，和刚才那支完全对称。' +
          'pb 往后走一格。Pc 现在是 ' + poly(c) + '。',
          ['摘 pb 的结点', 'Pc 尾添 ' + term(c[c.length - 1][0], c[c.length - 1][1]),
           'pb = pb->next'], 'merge'));
      } else {
        sum = a[pa][0] + b[pb][0];
        steps.push(step(snap({ ast: mark(pa, 'active'), bst: mark(pb, 'active'),
          hdr: '系数相加：' + a[pa][0] + ' + (' + b[pb][0] + ') = ' + sum,
          stats: { '比较次数': cmp, 'coef 之和': sum,
                   '和是否为 0': sum === 0 ? '是' : '否',
                   '要不要建结点': sum === 0 ? '不建' : '建一个' },
          notes: ['coef 之和 = ' + a[pa][0] + ' + (' + b[pb][0] + ') = ' + sum,
            sum === 0 ? '和为 0，这一项在结果里根本不该出现'
                      : '和不为 0，合成一个结点挂到 Pc',
            sum === 0 ? '两个结点都要 free' : '另一个结点 free 掉',
            '这一支是全题最容易漏的地方'] }), 9,
          '指数相同，把系数加起来：' + a[pa][0] + ' + (' + b[pb][0] + ') = ' + sum + '。' +
          (sum === 0
            ? '和是 0 —— x' + sup(ea) + ' 这一项在结果里就不存在了，两个结点都得删掉，Pc 一项都不添。'
            : '和不为 0，把它写进其中一个结点挂到 Pc，另一个 free 掉。'),
          ['coef 之和 = ' + sum,
           sum === 0 ? '和为 0 → 不建结点' : '和 ≠ 0 → 合成一个',
           sum === 0 ? '两个结点都删' : '多余的那个 free'], 'merge'));

        if (sum !== 0) c.push([sum, ea]);
        agone.push(pa);
        bgone.push(pb);
        pa++; pb++;
        steps.push(step(snap({
          cst: sum === 0 ? {} : mark(c.length - 1, 'good'),
          hdr: sum === 0 ? 'x' + sup(ea) + ' 这一项被抵消了，Pc 没有变长'
                         : 'Pc 尾添 ' + term(sum, ea),
          stats: base(),
          notes: [sum === 0 ? '两个结点都从链上摘掉并 free'
                            : '一个结点留用，一个 free',
            sum === 0 ? 'Pc 项数没变，还是 ' + c.length : 'Pc 项数变成 ' + c.length,
            'pa、pb 同时往后走一格',
            sum === 0 ? '漏掉这一支，结果里就会多出 0·x' + sup(ea)
                      : '同次项合并只发生在这一支'] }), 10,
          (sum === 0
            ? '两个结点都摘掉 free，Pc 一项都没添 —— 结果的项数可以比任何一个输入都少。' +
              '要是忘了这一支，结果里就会挂上一个系数为 0 的项，破坏「零系数不出现」的约定。'
            : '把 ' + term(sum, ea) + ' 挂到 Pc 尾，另一个结点 free。') +
          ' pa、pb 同时往后走一格。',
          [sum === 0 ? 'Pc 不变长' : 'Pc 尾添 ' + term(sum, ea),
           sum === 0 ? '两个结点都 free' : '多余结点 free',
           'pa、pb 各进一格'], 'merge'));
      }
    }

    // 一条链走完，另一条的尾巴整段接过去 —— 不必逐个搬
    var rest = pa < a.length ? 'Pa' : 'Pb';
    var restN = pa < a.length ? a.length - pa : b.length - pb;
    var restT = [];
    for (var r = pa; r < a.length; r++) restT.push(a[r]);
    for (r = pb; r < b.length; r++) restT.push(b[r]);

    steps.push(step(snap({
      ast: pa < a.length ? mark(pa, 'hot') : {},
      bst: pb < b.length ? mark(pb, 'hot') : {},
      hdr: (pa < a.length ? 'pb' : 'pa') + ' 走到 NULL，' + rest + ' 还剩 ' +
           restN + ' 项',
      stats: { '比较次数': cmp, 'Pc 项数': c.length,
               '剩余在': rest, '剩余项数': restN },
      notes: [(pa < a.length ? 'pb' : 'pa') + ' 已经是 NULL，循环退出',
        rest + ' 上还挂着 ' + restN + ' 项',
        '这些项在另一条链上没有同次的',
        '所以整段接到 Pc 尾就行'] }), 11,
      (pa < a.length ? 'pb' : 'pa') + ' 走到 NULL，循环结束，但 ' + rest + ' 上还剩 ' +
      restN + ' 项：' + poly(restT) + '。这些项在另一条链上没有同次的，' +
      '不用再比较，也不用逐个搬 —— 让 Pc 的尾指针直接接上这一段就行。',
      [(pa < a.length ? 'pb' : 'pa') + ' == NULL，退出循环',
       rest + ' 还剩 ' + restN + ' 项', '整段接上，不逐个搬'], 'merge'));

    while (pa < a.length) { c.push(a[pa]); agone.push(pa); pa++; }
    while (pb < b.length) { c.push(b[pb]); bgone.push(pb); pb++; }

    var CT = c.slice();
    steps.push(step(snap({ pa: null, pb: null,
      cst: mark(c.length - 1, 'done'),
      hdr: 'Pc(x) = ' + poly(CT),
      stats: { '比较次数': cmp, 'Pa 项数': A.length, 'Pb 项数': B.length,
               'Pc 项数': c.length },
      notes: ['Pc = ' + poly(CT),
        'x⁸ 被抵消，所以 Pc 只有 ' + c.length + ' 项',
        '比 Pa 的 ' + A.length + ' 项还少一项',
        '结果仍然按 expn 递增有序'] }), 12,
      '相加完成：Pc = ' + poly(CT) + '。注意 x⁸ 那一项被抵消了，' +
      '所以 Pc 只有 ' + c.length + ' 项，比 Pa 的 ' + A.length + ' 项还少 —— ' +
      '相加可以让项数变少。结果链依然是按 expn 递增有序的，可以接着参与下一次相加。',
      ['Pc = ' + poly(CT), 'x⁸ 抵消，项数反而变少',
       '结果仍然有序'], 'merge'));

    steps.push(step(snap({ pa: null, pb: null,
      hdr: '总代价：比较 ' + cmp + ' 次，新建结点 0 个',
      stats: { '时间': 'O(m + n)', '空间': 'O(1) 附加',
               '新建结点': 0, 'Pa、Pb': '已被破坏' },
      notes: ['两个指针各扫一遍，O(m+n)',
        '全程没 malloc 过新结点',
        '结点都是从 Pa、Pb 上摘下来换链的',
        '代价：Pa 和 Pb 加完就没了'] }), 12,
      '整个过程 pa、pb 各扫一遍，时间 O(m+n)，附加空间 O(1) —— 一个新结点都没申请，' +
      'Pc 上的结点全是从 Pa、Pb 摘过来的。代价是 Pa 和 Pb 加完就被拆散了；' +
      '要保留原式，就得改成复制结点的写法。',
      ['时间 O(m+n)，空间 O(1)', '结点换链，不 malloc',
       '代价：Pa、Pb 被破坏'], 'merge'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['polynomial-add'] = {
    title: '一元多项式相加',
    subtitle: '一项只存 coef 和 expn，全表按指数递增有序。相加就是归并两个有序表：比较指数分三支，同次项系数相加为 0 时两个结点都要删。',
    height: 730,
    code: [
      '// 结点：coef | expn | next，全表按 expn 递增有序',
      '// 稀疏多项式：空间只和项数有关，与最高次无关',
      'CreatePolyn(P, m):  P = 头结点，两个数据域都不用',
      '    逐项插入，按 expn 升序找位置        // O(m·n)',
      '    同次项合并，系数为 0 的项不建结点',
      'AddPolyn(Pa, Pb):  pa = Pa->next; pb = Pb->next',
      '    while pa and pb:  比较 pa->expn 和 pb->expn',
      '        case < :  摘 pa 的结点挂到 Pc 尾',
      '        case > :  摘 pb 的结点挂到 Pc 尾',
      '        case ==:  sum = pa->coef + pb->coef',
      '            sum!=0 留一个结点，sum==0 两个都删',
      '    Pc 尾接上 pa 或 pb 的剩余段        // 不逐个搬',
      '// 时间 O(m+n)，不新建结点，但 Pa、Pb 被破坏'
    ],
    scenes: [
      { name: '链式存储', build: buildStore },
      { name: '两式相加', build: buildAdd }
    ]
  };
})();
