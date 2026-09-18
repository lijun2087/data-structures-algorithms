/* 静态链表 — 第2章
 * 场景一：用一个数组模拟链表 —— data 存值，cur 存「下一个元素的数组下标」，
 *         下标当指针用。逻辑顺序靠 cur 串起来，物理下标顺序完全不相干。
 * 场景二：备用链表 —— space[0].cur 专门指向空闲分量串成的那条链，
 *         Malloc_SL 从链头摘一个，Free_SL 把删掉的还回链头，都是 O(1)。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：8 个分量横排（x 124…614）。av 标记在表上方，D.pointer 的标签落在
   * y-24，所以锚点 DY-4=124 已是上限，再往上就越过舞台顶边 84。
   * cur 的指向画成表下方的弧线：跨度越大压得越低（弧峰 252…273），
   * 长弧整条都在短弧之下，两条链叠在一起也不会缠。说明文字 300 / 322。 */
  var CAP = 8;
  var SX = 124, SW = 56, SGAP = 6;
  var DY = 128, DH = 38, CY = 168, CH = 30;
  var IDXY = 214, ARCY = 220;
  var NX = 700;

  function sxOf(i) { return SX + i * (SW + SGAP); }
  function scxOf(i) { return sxOf(i) + SW / 2; }

  /* f = { data:[…], cur:[…], st:{下标:状态}, arcs:[[from,to,kind,curve]…],
   *       ptrs:{名字:下标}, cap1, cap2, notes, stats } */
  function renderSL(ctx, f) {
    D.clear(ctx.stage);
    var i, c, x;

    ctx.stage.appendChild(D.text('data 域',
      { x: 46, y: DY + 25, 'class': 'vz-lab' }));
    ctx.stage.appendChild(D.text('cur 域',
      { x: 46, y: CY + 21, 'class': 'vz-lab', fill: '#8fd0ff' }));
    ctx.stage.appendChild(D.text('下标',
      { x: 46, y: IDXY, 'class': 'vz-lab', fill: '#5f7099' }));

    for (i = 0; i < CAP; i++) {
      x = sxOf(i);
      c = D.C[f.st[i] || 'idle'];
      ctx.stage.appendChild(D.el('rect', { x: x, y: DY, width: SW, height: DH,
        rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      if (f.data[i] !== null && f.data[i] !== undefined && f.data[i] !== '') {
        ctx.stage.appendChild(D.text(f.data[i],
          { x: x + SW / 2, y: DY + 25, 'class': 'vz-cellval' }));
      }
      // cur 域另给一种底色和字色：它存的是下标，不是值，别混在一起看
      ctx.stage.appendChild(D.el('rect', { x: x, y: CY, width: SW, height: CH,
        rx: 6, fill: '#16213a', stroke: c.stroke, 'stroke-width': 1.6 }));
      ctx.stage.appendChild(D.text(f.cur[i],
        { x: x + SW / 2, y: CY + 21, 'class': 'vz-nodeval', fill: '#8fd0ff' }));
      ctx.stage.appendChild(D.text(i,
        { x: x + SW / 2, y: IDXY, 'class': 'vz-idx' }));
    }

    // 头指针画在表上方：S 指数据链首元，av 指备用链首元（教材里 = space[0].cur）
    var pn = Object.keys(f.ptrs || {});
    for (i = 0; i < pn.length; i++) {
      D.pointer(ctx.stage, { name: pn[i], x: scxOf(f.ptrs[pn[i]]), y: DY - 4,
        above: true, color: pn[i] === 'av' ? '#ffd166' : '#6ceaa5' });
    }

    // cur 里存的下标画成弧线，逻辑顺序才看得见
    for (i = 0; i < (f.arcs || []).length; i++) {
      var a = f.arcs[i];
      var cv = a[3] != null ? a[3]
             : 34 + Math.min(4, Math.abs(a[1] - a[0])) * 9;
      D.link(ctx.stage, { x1: scxOf(a[0]), y1: ARCY,
        x2: scxOf(a[1]), y2: ARCY, kind: a[2] || 'next', curve: cv });
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
        { x: NX, y: 132 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { renderSL(c, f); } };
  }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* ---------- 场景一：下标当指针用 ---------- */
  /* 故意让物理下标顺序和逻辑顺序错开：物理读是 33 12 25 47，
   * 沿 cur 走才是 12 25 33 47。这个错位就是本场景要讲的全部。 */
  function buildArray() {
    var steps = [];
    var data = ['', 33, 12, '', 25, 47, '', ''];
    var cur  = [ 2,  5,  4,  0,  1,  0,  0,  0];
    var ARCS = [[0, 2], [2, 4], [4, 1], [1, 5]];
    var ORDER = [2, 4, 1, 5];
    var PHYS = '物理顺序（按下标读）：33  12  25  47';

    var snap = function (o) {
      return { data: data.slice(), cur: cur.slice(), st: o.st || {},
               arcs: o.arcs || [], ptrs: o.ptrs || {},
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      stats: { '数组容量 MAXSIZE': CAP, '已用分量': 4, 'cur 存的是': '下标' },
      notes: ['一个数组，每个分量两个域',
        'data 存值，cur 存「下一个的下标」',
        '没有指针，也没有 malloc',
        '下标就是这里的「指针」'] }), -1,
      '静态链表用一个数组模拟链表：每个分量除了 data 还带一个 cur，存的是下一个元素所在的下标。' +
      '没有真指针，也不用 malloc —— 用下标顶替地址，所以它能在没有指针的语言里实现链表。',
      ['data 存值，cur 存下标', '下标顶替指针',
       '不需要 malloc']));

    steps.push(step(snap({ st: mark(0, 'hot', 2, 'active'),
      arcs: [ARCS[0]], ptrs: { S: 2 },
      stats: { '首元下标': 2, '已访问': 0, '终止标志': 'cur == 0' },
      notes: ['space[0].cur = 2',
        '首元不在下标 1，而在下标 2',
        '物理位置和逻辑位置无关',
        '0 号分量当头结点用'] }), 2,
      '遍历从 space[0].cur 起步，它记着首元的下标 —— 这里是 2，不是 1。' +
      '首元放在数组的哪一格完全无所谓，逻辑上谁在前谁在后只由 cur 说话。',
      ['i = space[0].cur = 2', '首元在下标 2',
       '物理位置任意']));

    var seen = [];
    for (var k = 0; k < ORDER.length; k++) {
      var i = ORDER[k], st = mark(0, 'good');
      for (var t = 0; t < k; t++) st[ORDER[t]] = 'good';
      st[i] = 'active';
      seen.push(data[i]);
      var nx = cur[i];
      var sta = { '当前下标 i': i, '已访问': k + 1 };
      sta['space[' + i + '].cur'] = nx;
      steps.push(step(snap({ st: st, arcs: ARCS.slice(0, k + 1),
        ptrs: { S: 2 },
        cap1: '逻辑顺序（沿 cur 走）：' + seen.join(' → '),
        stats: sta,
        notes: ['访问 space[' + i + '].data = ' + data[i],
          'i = space[' + i + '].cur = ' + nx,
          nx === 0 ? 'cur == 0，后面没有了' : '下一个在下标 ' + nx,
          '走一步只是换一个下标'] }), k === 0 ? 4 : 5,
        (k === 0 ? '访问 space[' + i + '].data，取到第一个元素 ' + data[i] +
                   '。接着看 space[' + i + '].cur = ' + nx + '，'
                 : '取到 ' + data[i] + '，再看 space[' + i + '].cur = ' + nx + '，') +
        (nx === 0 ? '而 cur 是 0，说明这就是最后一个元素了。'
                  : '下一个元素跑到了下标 ' + nx + '。下标跳来跳去，逻辑顺序却是连贯的。'),
        ['访问 ' + data[i], 'i = space[' + i + '].cur = ' + nx,
         nx === 0 ? 'cur == 0，到尾了' : '跳到下标 ' + nx]));
    }

    steps.push(step(snap({ st: mark(0, 'good', 2, 'good', 4, 'good',
        1, 'good', 5, 'done'),
      arcs: ARCS, ptrs: { S: 2 },
      cap1: '逻辑顺序（沿 cur 走）：' + seen.join(' → '),
      cap2: PHYS,
      stats: { '已访问': seen.length, '终止条件': 'i == 0',
               '为什么用 0': '0 号是头结点' },
      notes: ['终止条件是 i == 0，不是 i == NULL',
        '数组里没有 NULL 这个东西',
        '0 号分量派作头结点，于是 0 空出来当结束标志',
        '这也是首元下标为什么不能是 0'] }), 3,
      '遍历到 cur == 0 就停。数组里没有 NULL，教材的办法是把 0 号分量派作头结点，' +
      '这样下标 0 就永远不会是任何元素的位置，正好空出来当「结束」的标志。',
      ['i == 0 即到尾', '0 号分量当头结点',
       '0 顶替 NULL']));

    steps.push(step(snap({ arcs: ARCS, ptrs: { S: 2 },
      cap1: '逻辑顺序（沿 cur 走）：' + seen.join(' → '),
      cap2: PHYS,
      stats: { '按下标读': '33 12 25 47', '沿 cur 读': seen.join(' '),
               '两者是否相同': '不同' },
      notes: ['按下标读：33  12  25  47',
        '沿 cur 走：' + seen.join('  '),
        '两条顺序完全不相干',
        '这正是链式存储的特征：关系由指针决定'] }), 5,
      '把两种读法摆在一起：按下标从左到右读是 33 12 25 47，沿 cur 走才是 12 25 33 47。' +
      '物理次序和逻辑次序彻底脱钩 —— 这就是链式存储，只不过「指针」换成了下标。',
      ['物理序 ≠ 逻辑序', '关系由 cur 决定',
       '链式存储的本质']));

    steps.push(step(snap({ arcs: ARCS, ptrs: { S: 2 },
      cap2: PHYS,
      stats: { '插入删除': '只改 cur', '按序号查找': 'O(n)',
               '容量': '定长，不能长' },
      notes: ['插入删除只改 cur，不挪元素',
        '按序号查找还是得一个一个数：O(n)',
        '但数组是定长的，满了就没法再加',
        '还得自己管哪些分量是空的 → 备用链表'] }), 1,
      '静态链表保住了链表的长处：插入删除只改 cur，一个元素都不用挪。代价有两条：' +
      '数组定长，装满就加不进；而且哪些分量还空着得自己记 —— 这就要用到下一场的备用链表。',
      ['插删只改 cur', '容量定长，无法增长',
       '空闲分量要自己管']));

    return steps;
  }

  /* ---------- 场景二：备用链表 ---------- */
  /* 这一场换成教材的另一种约定：0 号分量交给备用链表当头指针
   * （space[0].cur 就是 av），数据链的首元下标另用变量 S 记。
   * 于是一个数组里同时住着两条链，各走各的 cur，互不相干。
   * 弧深：数据链 246…257，备用链 261…272 —— 长弧永在短弧之下，
   * 最深的 272 也还在说明文字（基线 300）之上。 */
  function buildAvail() {
    var steps = [], S = 0;
    var data = ['', '', '', '', '', '', '', ''];
    var cur  = [ 1,  2,  3,  4,  5,  6,  7,  0];

    // 沿 cur 把一条链的弧线全生成；bump 把备用链整体压到数据链之下
    function walk(start, kind, bump) {
      var a = [], i = start, g = 0, nx;
      while (g++ <= CAP) {
        nx = cur[i];
        if (!nx) break;
        a.push([i, nx, kind,
          28 + Math.min(3, Math.abs(nx - i)) * 7 + (bump || 0)]);
        i = nx;
      }
      return a;
    }
    function both() {
      // S 为 0 表示数据链还是空的，此时不能拿 0 当起点，否则会把备用链画两遍
      return (S ? walk(S, 'next', 0) : []).concat(walk(0, 'hot', 20));
    }
    function idxStr() {           // 备用链报下标
      var s = [], i = cur[0], g = 0;
      while (i !== 0 && g++ <= CAP) { s.push(i); i = cur[i]; }
      return s.length ? s.join(' → ') : '空';
    }
    function valStr() {           // 数据链报值
      var s = [], i = S, g = 0;
      while (i !== 0 && g++ <= CAP) { s.push(data[i]); i = cur[i]; }
      return s.length ? s.join(' → ') : '空';
    }
    function nFree() {
      var n = 0, i = cur[0], g = 0;
      while (i !== 0 && g++ <= CAP) { n++; i = cur[i]; }
      return n;
    }

    // 每帧都得把两条链的现状报一遍，包一层省得来回抄
    var snap = function (o) {
      return { data: data.slice(), cur: cur.slice(), st: o.st || {},
               arcs: o.arcs || both(), ptrs: o.ptrs || {},
               cap1: '数据链（从 S 走）：' + valStr(),
               cap2: '备用链（从 space[0].cur 走）：' + idxStr(),
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '空闲分量': nFree(), '数据元素': CAP - 1 - nFree(),
               '满的判据': 'space[0].cur == 0' };
    };

    steps.push(step(snap({ st: mark(0, 'good'), ptrs: { av: 1 },
      stats: base(),
      notes: ['哪些分量是空的，得自己记着',
        '办法：把空闲分量也串成一条链',
        'space[0].cur 就是这条备用链的头',
        '一个数组里同时住着两条链'] }), -1,
      '上一场留了个问题：数组里哪些分量还空着？教材的办法是把空闲分量也用 cur 串成一条链，' +
      '叫备用链表，链头记在 space[0].cur 里。于是一个数组里住着两条链，各走各的 cur。',
      ['空闲分量串成备用链', 'space[0].cur 记链头',
       '一个数组，两条链']));

    steps.push(step(snap({ st: mark(1, 'good', 2, 'good', 3, 'good',
        4, 'good', 5, 'good', 6, 'good', 7, 'good'), ptrs: { av: 1 },
      stats: base(),
      notes: ['初始化：space[i].cur = i+1',
        '末尾那个置 0，链就收口了',
        '这时数据链是空的，S = 0',
        '整个数组都在备用链上'] }), 7,
      'InitSpace_SL 做的事只有一句：让每个分量的 cur 指向下一个下标，最后一个置 0。' +
      '此刻数据链还是空的，7 个可用分量全挂在备用链上，等着被领走。',
      ['space[i].cur = i+1', '末尾置 0 收口',
       '7 个分量全空闲']));

    // 数据链上的分量一律标 good，再额外点出当前操作的那一个
    function chainSt(extra, exState) {
      var o = {}, i = S, g = 0;
      while (i !== 0 && g++ <= CAP) { o[i] = 'good'; i = cur[i]; }
      if (extra != null) o[extra] = exState || 'hot';
      return o;
    }

    /* 连插三个：每次都是「先 Malloc_SL 领一格，再挂到数据链尾」。
     * 领到的下标恰好是 1、2、3，但这只是初始备用链顺序使然，不是规律。 */
    var VALS = [12, 25, 33], tail = 0;
    for (var t = 0; t < VALS.length; t++) {
      var got = cur[0], first = !S;

      steps.push(step(snap({ st: chainSt(got, 'hot'),
        ptrs: first ? { av: got } : { S: S, av: got },
        stats: base(),
        notes: ['Malloc_SL：从备用链领一个分量',
          '领的永远是链头 space[0].cur = ' + got,
          '摘链头只改一个 cur → O(1)',
          '若 space[0].cur == 0 就是满了'] }), 8,
        'Malloc_SL 领分量：i = space[0].cur = ' + got + '，直接摘备用链的链头。' +
        '为什么固定取链头？因为摘链头只要改一个 cur，是 O(1)；从链尾取就得先走一遍找前驱。',
        ['i = space[0].cur = ' + got, '领的是备用链链头',
         '摘链头才是 O(1)']));

      cur[0] = cur[got];
      data[got] = VALS[t];
      cur[got] = 0;
      if (tail) cur[tail] = got; else S = got;

      steps.push(step(snap({ st: chainSt(got, 'active'),
        ptrs: { S: S, av: cur[0] },
        stats: base(),
        notes: ['分量 ' + got + ' 从备用链转到数据链',
          '备用链短一格，数据链长一格',
          '两条链的总长恒为 ' + (CAP - 1) + ' 格',
          'malloc / free 全在数组内部完成'] }), 9,
        'space[0].cur = space[' + got + '].cur，备用链的头往后挪一格，下标 ' + got +
        ' 就归数据链了。把 ' + VALS[t] + ' 写进它的 data' +
        (first ? '，并用 S 记下首元下标 ' + got
               : '，再让前一个分量的 cur 指向 ' + got) + '。',
        ['space[0].cur = ' + cur[0],
         'space[' + got + '].data = ' + VALS[t],
         first ? 'S = ' + got : 'space[' + tail + '].cur = ' + got]));

      tail = got;
    }

    /* 删中间那个：先让前驱的 cur 跨过它，再 Free_SL 把它还回备用链。
     * 还回去之后备用链的下标就不再是升序了 —— 这一点值得专门指出。 */
    var DEL = 2, PRE = 1, gone = data[DEL];

    steps.push(step(snap({ st: chainSt(DEL, 'bad'), ptrs: { S: S, av: cur[0] },
      stats: base(),
      notes: ['要删的是 space[' + DEL + ']，值 ' + gone,
        '和单链表一样：先找前驱',
        '前驱是 space[' + PRE + ']',
        '要改的是前驱的 cur'] }), 10,
      '删除数据链上的 ' + gone + '。和单链表一个路子：先找到它的前驱 space[' + PRE + ']，' +
      '因为真正要改的是前驱的 cur。下标当指针用，删除的写法也就和指针版一模一样。',
      ['待删 space[' + DEL + ']，值 ' + gone,
       '前驱是 space[' + PRE + ']', '要改前驱的 cur']));

    cur[PRE] = cur[DEL];
    steps.push(step(snap({ st: chainSt(null), ptrs: { S: S, av: cur[0] },
      stats: base(),
      notes: ['space[' + PRE + '].cur = space[' + DEL + '].cur',
        '分量 ' + DEL + ' 已经脱离数据链',
        '但它还没回到备用链上',
        '此刻它两边都不属于 —— 必须还回去'] }), 11,
      'space[' + PRE + '].cur 跨过 ' + DEL + ' 直接接到后面，' + gone +
      ' 就从数据链上摘下来了。但注意：这一格现在两条链都不在它身上，' +
      '要是不还回备用链，这一格就永远用不上了 —— 相当于内存泄漏。',
      ['前驱 cur 跨过 ' + DEL, '分量已脱离数据链',
       '不还回去就等于泄漏']));

    cur[DEL] = cur[0];
    cur[0] = DEL;
    data[DEL] = '';
    steps.push(step(snap({ st: chainSt(DEL, 'hot'), ptrs: { S: S, av: DEL },
      stats: base(),
      notes: ['Free_SL：还回备用链的链头',
        'space[' + DEL + '].cur = space[0].cur；space[0].cur = ' + DEL,
        '同样只改两个 cur → O(1)',
        '于是备用链的下标不再是升序'] }), 12,
      'Free_SL 把这一格挂回备用链的链头：先让它的 cur 指向原链头，再让 space[0].cur 指向它。' +
      '还回链头同样是 O(1)。代价是备用链的下标从此不再有序 —— 但根本不需要有序，谁空着就行。',
      ['挂回备用链链头', '只改两个 cur，O(1)',
       '备用链无需有序']));

    steps.push(step(snap({ st: chainSt(null), ptrs: { S: S, av: cur[0] },
      stats: { '空闲分量': nFree(), '数据元素': CAP - 1 - nFree(),
               '一共几格': CAP - 1 + ' 格，不增不减' },
      notes: ['两条链此消彼长，总格数不变',
        '判满：space[0].cur == 0',
        '满了就真的插不进去了，数组不会长',
        '这是静态链表和真链表的根本差别'] }), 8,
      '把两条链摆在一起看：数据链长一格备用链就短一格，总数恒定为 ' + (CAP - 1) + '。' +
      '所以判满只需看 space[0].cur 是不是 0。真链表向系统要内存，要不到才算满；' +
      '静态链表的家底一开始就定死了。',
      ['两链此消彼长', '判满：space[0].cur == 0',
       '容量定长，不能增长']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['static-linked-list'] = {
    title: '静态链表',
    subtitle: '用一个数组模拟链表：data 存值，cur 存「下一个的下标」，下标顶替指针。空闲分量串成备用链，malloc / free 全在数组内部完成。',
    height: 730,
    code: [
      '// 静态链表：分量 = data 域 + cur 域（存下标）',
      '// 插删只改 cur，不挪元素；但数组定长，不能增长',
      'Traverse():  i = space[0].cur   // 首元下标，非 1',
      '    while i != 0:              // 0 顶替 NULL',
      '        visit(space[i].data)   // 访问当前分量',
      '        i = space[i].cur       // 跳到下一个下标',
      '// 备用链表：空闲分量串成链，头在 space[0].cur',
      'InitSpace_SL():  space[i].cur = i+1，末尾置 0',
      'Malloc_SL():  i = space[0].cur  // 为 0 则表满',
      '    space[0].cur = space[i].cur;  return i',
      'Delete(S, i):  先找前驱 p       // 和单链表一样',
      '    space[p].cur = space[i].cur // 分量脱离数据链',
      'Free_SL(i):  挂回链头 → space[0].cur = i，O(1)'
    ],
    scenes: [
      { name: '数组模拟链表', build: buildArray },
      { name: '备用链表', build: buildAvail }
    ]
  };
})();
