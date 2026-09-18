/* 伙伴系统 — 第8章
 * 场景一：分配与劈分 —— 请求先向上取整到 2^k；对应的空闲链空了就
 *         找更大的块对半劈，一半留用、一半挂到下一级链上，不够再劈。
 * 场景二：回收与合并伙伴 —— 伙伴的地址只差一个二进制位，addr XOR size
 *         一算就知道它在哪，判定与合并都是 O(1)，还能一级级往上并。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 可利用空间 512 字，最小块 64 字，于是有 512 / 256 / 128 / 64 四级。
   * 横向：512 字画成 x=150…950 的长条，1 字 = 1.5625px，最小的 64 字块 100px。
   * 竖直自上而下：标题 104、说明 124 / 142、内存条 156…196、地址 210、
   * p 与伙伴标记 226、劈分树四行 240 / 262 / 284 / 306（行高 18，底 324），
   * 行首的「2^k = size」标签落在 x=44，全部压在 330 以内。 */
  var MEM = 512, MIN = 64;
  var BX = 150, BW = 800, SC = BW / MEM;
  var BY = 156, BH = 40;
  var TY0 = 240, RH = 18, RG = 4;
  var LEVELS = [512, 256, 128, 64];

  function px(a) { return BX + a * SC; }
  function ccOf(a, n) { return px(a) + n * SC / 2; }

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  function cpBlocks(bs) {
    var r = [], i;
    for (i = 0; i < bs.length; i++) {
      r.push({ a: bs[i].a, n: bs[i].n, free: bs[i].free, tag: bs[i].tag });
    }
    return r;
  }

  // 覆盖住地址 a0 的那个当前块；劈分树画每一格时都要问它
  function coverOf(bs, a0) {
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].a <= a0 && a0 < bs[i].a + bs[i].n) return bs[i];
    }
    return null;
  }

  // 各级空闲链的现状，写进状态面板：'2^6:1　2^8:1'
  function listsOf(bs) {
    var m = {}, i, k, out = [];
    for (i = 0; i < bs.length; i++) {
      if (!bs[i].free) continue;
      k = Math.round(Math.log(bs[i].n) / Math.LN2);
      m[k] = (m[k] || 0) + 1;
    }
    for (i = 0; i < LEVELS.length; i++) {
      k = Math.round(Math.log(LEVELS[i]) / Math.LN2);
      if (m[k]) out.push('2^' + k + '×' + m[k]);
    }
    return out.length ? out.join('　') : '全空';
  }

  function pow2Up(n) {
    var s = MIN;
    while (s < n) s *= 2;
    return s;
  }

  function rowY(i) { return TY0 + i * (RH + RG); }

  /* f = { blocks:[{a,n,free,tag}], st:{下标:状态}, tst:{'级:地址':状态},
   *       tags:[{a,n,txt,y,color}], hdr, cap1, cap2, stats }
   * 劈分树把竖直空间占到 324，所以这个主题不留右侧要点栏，说明全走 cap1/cap2 */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var bs = f.blocks, i, j, b, x, w, c, t;

    ctx.stage.appendChild(D.text(f.hdr || '伙伴系统　可利用空间 512 字',
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 124, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 142, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    ctx.stage.appendChild(D.text('内存', { x: 44, y: BY + 25,
      'class': 'vz-lab', fill: '#7d93bd' }));

    for (i = 0; i < bs.length; i++) {
      b = bs[i]; x = px(b.a); w = b.n * SC;
      c = D.C[f.st[i] || (b.free ? 'mute' : 'active')];
      ctx.stage.appendChild(D.el('rect', { x: x, y: BY, width: w, height: BH,
        rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      ctx.stage.appendChild(D.text(b.n + (w >= 90 ? ' 字' : ''),
        { x: x + w / 2, y: BY + 20, 'class': 'vz-cellval' }));
      ctx.stage.appendChild(D.text(b.tag || (b.free ? '空闲' : '占用'),
        { x: x + w / 2, y: BY + 34, 'class': 'vz-slot' }));
      t = D.text(b.a, { x: x, y: BY + BH + 14, 'class': 'vz-idx' });
      t.setAttribute('text-anchor', 'start');
      ctx.stage.appendChild(t);
    }
    t = D.text(MEM, { x: BX + BW, y: BY + BH + 14, 'class': 'vz-idx' });
    t.setAttribute('text-anchor', 'end');
    ctx.stage.appendChild(t);

    for (i = 0; i < (f.tags || []).length; i++) {
      var g = f.tags[i];
      ctx.stage.appendChild(D.text(g.txt,
        { x: ccOf(g.a, g.n), y: g.y || 226, 'class': 'vz-ptr',
          fill: g.color || '#6ceaa5' }));
    }

    /* 劈分树：每一级画满整条内存，格子对齐 2^k 的边界。
     * 实心的格子表示这一级此刻真有这么一块，虚的表示它已经被劈开了。 */
    for (i = 0; i < LEVELS.length; i++) {
      var sz = LEVELS[i], y = rowY(i), kk = Math.round(Math.log(sz) / Math.LN2);
      t = D.text('2^' + kk + ' = ' + sz, { x: 44, y: y, 'class': 'vz-slot' });
      t.setAttribute('text-anchor', 'start');
      ctx.stage.appendChild(t);
      for (j = 0; j * sz < MEM; j++) {
        var a0 = j * sz, cov = coverOf(bs, a0);
        var here = cov && cov.a === a0 && cov.n === sz;
        var key = kk + ':' + a0, stt = f.tst && f.tst[key];
        c = D.C[stt || (here ? (cov.free ? 'mute' : 'active') : 'idle')];
        ctx.stage.appendChild(D.el('rect', { x: px(a0) + 1, y: y - 13,
          width: sz * SC - 2, height: 16, rx: 3, fill: c.fill,
          stroke: c.stroke, 'stroke-width': here || stt ? 1.6 : 0.8,
          'stroke-dasharray': here || stt ? 'none' : '4 3',
          opacity: here || stt ? 1 : 0.5 }));
        if (here || stt) {
          ctx.stage.appendChild(D.text(a0 + '+' + sz,
            { x: px(a0) + sz * SC / 2, y: y + 2, 'class': 'vz-slot' }));
        }
      }
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  // 找一个大小恰为 s 的空闲块；没有就返回 -1
  function findFree(bs, s) {
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].free && bs[i].n === s) return i;
    }
    return -1;
  }
  // 对半劈开第 i 块，返回低半的下标（高半就是 i+1）
  function split(bs, i) {
    var b = bs[i], h = b.n / 2;
    bs.splice(i, 1, { a: b.a, n: h, free: true },
                    { a: b.a + h, n: h, free: true });
    return i;
  }
  function kOf(n) { return Math.round(Math.log(n) / Math.LN2); }

  /* ---------- 场景一：分配与劈分 ---------- */
  /* 请 100 → 取整到 128，128 与 256 两级都空，只好从 512 连劈两刀；
   * 再请 60 → 64，从剩下的 128 劈一刀；最后请 200 → 256 直接命中不用劈。 */
  function buildAlloc() {
    var steps = [], bs = [{ a: 0, n: 512, free: true }], st = {}, tst = {};

    var snap = function (o) {
      return { blocks: cpBlocks(bs), st: cp(st), tst: cp(tst),
               tags: o.tags || [],
               hdr: o.hdr || '分配与劈分　块大小只能是 64 / 128 / 256 / 512',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               stats: o.stats || { '各级空闲链': listsOf(bs),
                 '请求': o.req || '—', '取整到': o.up || '—',
                 '内碎片': o.waste == null ? '—' : o.waste + ' 字' } };
    };

    steps.push(step(snap({
      cap1: '开局只有一块 512 字的整块，挂在 2^9 那条链上',
      cap2: '下面四行是劈分树：实线格子表示这一级此刻真有这么一块，虚线格子是还没劈出来的' }), 0,
      '伙伴系统把块的大小限死在 2 的幂 —— 这里是 64、128、256、512 四档，每档单独一条空闲链。' +
      '要多大就去对应的链上取，取块本身不用比较查找。',
      ['大小只能是 2 的幂', '每档一条空闲链', '开局只有一块 512']));

    // 请求 100 → 128
    st = {}; tst = {};
    steps.push(step(snap({
      req: '100 字', up: '128', waste: 28,
      cap1: 'Alloc(100)：先向上取整 —— 64 装不下，取到 2^7 = 128',
      cap2: '多要的 28 字用户用不上，白占着 —— 这叫内部碎片，是伙伴系统的固定代价' }), 2,
      '请求 100 字，先向上取整到 2 的幂：64 不够，取 128。多出来的 28 字用户用不上却被占着，' +
      '这叫内部碎片 —— 伙伴系统一开始就认了这笔账。',
      ['Alloc(100)', '向上取整到 128', '内碎片 28 字']));

    tst = {}; tst[kOf(128) + ':0'] = 'bad'; tst[kOf(256) + ':0'] = 'bad';
    steps.push(step(snap({
      req: '100 字', up: '128', waste: 28,
      cap1: '2^7 那条链是空的，2^8 也空 —— 一路往上找，直到 2^9 上有块',
      cap2: '找到更大的块，就得对半劈到需要的那一级为止' }), 4,
      '128 那条链空的，往上看 256 也空，一直找到 512 才有块。找到更大的块就得对半劈，' +
      '一刀一刀劈到需要的那一级。',
      ['2^7 链空', '2^8 链也空', '2^9 有块，往下劈']));

    split(bs, 0);
    st = {}; st[0] = 'hot'; st[1] = 'good';
    steps.push(step(snap({
      req: '100 字', up: '128', waste: 28,
      cap1: '第一刀：512 劈成两个 256，一个留着继续劈，另一个挂进 2^8 链',
      cap2: '劈出来的这两块互为「伙伴」—— 地址 0 和 256，只差第 8 位那一个二进制位',
      tags: [{ a: 0, n: 256, txt: '继续劈', color: '#ffd166' },
             { a: 256, n: 256, txt: '挂进 2^8 链', color: '#6ceaa5' }] }), 5,
      '第一刀把 512 劈成两个 256：一个留着继续劈，另一个挂进 2^8 链。这两块互为伙伴 —— ' +
      '地址 0 和 256 只差第 8 位那一个二进制位，这个细节回收时是关键。',
      ['512 → 256 + 256', '高半挂进 2^8 链',
       '两块互为伙伴']));

    split(bs, 0);
    st = {}; st[0] = 'hot'; st[1] = 'good';
    steps.push(step(snap({
      req: '100 字', up: '128', waste: 28,
      cap1: '第二刀：256 再劈成两个 128 —— 到 2^7 这一级了，正是要的大小',
      cap2: '劈了两刀，2^8 和 2^7 各多出一个空闲结点，都是这次分配的副产品',
      tags: [{ a: 0, n: 128, txt: '给用户', color: '#ffd166' },
             { a: 128, n: 128, txt: '挂进 2^7 链', color: '#6ceaa5' }] }), 5,
      '第二刀把 256 劈成两个 128，到需要的那一级了。两刀下来 2^8、2^7 各多出一个空闲结点，' +
      '都是这次分配的副产品，回头它们还能派上用场。',
      ['256 → 128 + 128', '到 2^7 这一级', '劈了两刀共 2 次']));

    bs[0].free = false; bs[0].tag = '用 100/128';
    st = {}; st[0] = 'done';
    steps.push(step(snap({
      req: '100 字', up: '128', waste: 28,
      cap1: '0 起 128 字交给用户 —— 从 2^7 链摘下，标成占用',
      cap2: '整个过程没有任何「找哪块最合适」的比较，只有取整和对半劈',
      tags: [{ a: 0, n: 128, txt: '已分配', color: '#ffd166' }] }), 6,
      '0 起 128 字交给用户。留意整个过程没有一次「哪块最合适」的比较 —— 只有取整和对半劈，' +
      '这就是伙伴系统比边界标识法快的地方。',
      ['0..128 分配出去', '无需查找比较',
       '代价：28 字内碎片']));

    // 请求 60 → 64：128 那块劈一刀就够
    var i = findFree(bs, 128);
    tst = {}; tst[kOf(64) + ':128'] = 'bad';
    st = {}; st[i] = 'hot';
    steps.push(step(snap({
      req: '60 字', up: '64', waste: 4,
      cap1: 'Alloc(60)：取整到 2^6 = 64，可 2^6 链是空的',
      cap2: '往上一级 2^7 有块 —— 就是刚才劈剩下的那个 128，劈一刀即可',
      tags: [{ a: 128, n: 128, txt: '劈它', color: '#ffd166' }] }), 4,
      '请求 60 取整到 64，2^6 链空的，往上一级 2^7 有块 —— 正是刚才劈剩的那个 128。' +
      '只需再劈一刀，上次分配的副产品这就用上了。',
      ['Alloc(60) → 64', '2^6 链空，上一级有',
       '只需劈一刀']));

    i = split(bs, i);
    bs[i].free = false; bs[i].tag = '用 60/64';
    st = {}; st[i] = 'done'; st[i + 1] = 'good';
    steps.push(step(snap({
      req: '60 字', up: '64', waste: 4,
      cap1: '128 劈成两个 64：低半 128 起给用户，高半 192 起挂进 2^6 链',
      cap2: '这次只白费 4 字 —— 请求越接近 2 的幂，内碎片越小',
      tags: [{ a: 128, n: 64, txt: '给用户', color: '#ffd166' },
             { a: 192, n: 64, txt: '进 2^6 链', color: '#6ceaa5' }] }), 6,
      '128 劈成两个 64，低半给用户，高半挂进 2^6 链。这次只白费 4 字 —— ' +
      '请求越贴近 2 的幂，内碎片越小；最坏情况是刚过一档，比如请 129 要给 256。',
      ['128 → 64 + 64', '内碎片仅 4 字',
       '最坏时白费近一半']));

    // 请求 200 → 256：2^8 链上正好有，一刀不用劈
    i = findFree(bs, 256);
    st = {}; st[i] = 'hot';
    steps.push(step(snap({
      req: '200 字', up: '256', waste: 56,
      cap1: 'Alloc(200)：取整到 2^8 = 256 —— 2^8 链上正好有一块，直接摘走',
      cap2: '不用劈，也不用比 —— 这一步是 O(1)，伙伴系统最舒服的情形',
      tags: [{ a: 256, n: 256, txt: '直接摘走', color: '#ffd166' }] }), 3,
      '请求 200 取整到 256，而 2^8 链上正好有一块 —— 直接摘走，不劈也不比。' +
      '这一步是彻底的 O(1)，也是伙伴系统敢把内碎片当代价换来的东西。',
      ['Alloc(200) → 256', '2^8 链上有现成的',
       '直接摘走，O(1)']));

    bs[i].free = false; bs[i].tag = '用 200/256';
    st = {}; st[i] = 'done';
    steps.push(step(snap({
      req: '200 字', up: '256', waste: 56,
      hdr: '三次分配之后：512 字全部划出，其中 88 字是内碎片',
      cap1: '内碎片共 28 + 4 + 56 = 88 字，占了 512 的一成七 —— 这笔账躲不开',
      cap2: '换来的是分配只有「取整 + 对半劈」，没有任何查找与比较',
      stats: { '已分配': '448 字', '内碎片': '88 字',
               '空闲': '64 字', '各级空闲链': listsOf(bs) } }), 8,
      '三次分配后 512 字划完，内碎片累计 88 字，接近一成七。伙伴系统就是用这笔固定的浪费，' +
      '换掉了首次拟合、最佳拟合里的那些查找和比较。',
      ['内碎片共 88 字', '换来分配 O(1)',
       '下一场景看回收']));

    return steps;
  }

  /* ---------- 场景二：回收与合并伙伴 ---------- */
  /* 局面接着上一场景：0..128 占、128..192 占、192..256 空、256..512 占。
   * 先回收 128 那个 64 —— 伙伴 192 空闲，并成 128；再回收 0..128 —— 伙伴
   * 128 刚好空了，并成 256；接着 0..256 的伙伴 256..512 还占着，停；
   * 最后回收 256..512，一路并回 512。级联合并一次演到底。 */
  function buildFree() {
    var steps = [], st = {}, tst = {};
    var bs = [
      { a: 0,   n: 128, free: false, tag: '占用' },
      { a: 128, n: 64,  free: false, tag: '占用' },
      { a: 192, n: 64,  free: true },
      { a: 256, n: 256, free: false, tag: '占用' }
    ];

    var snap = function (o) {
      return { blocks: cpBlocks(bs), st: cp(st), tst: cp(tst),
               tags: o.tags || [],
               hdr: o.hdr || '回收与合并伙伴　伙伴地址只差一个二进制位',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               stats: o.stats || { '各级空闲链': listsOf(bs),
                 '正在回收': o.p || '—', '伙伴地址': o.bud || '—',
                 '伙伴状态': o.bs || '—' } };
    };
    var at = function (a) {
      for (var i = 0; i < bs.length; i++) if (bs[i].a === a) return i;
      return -1;
    };
    // 伙伴地址：addr XOR size。同一级里两个块的地址只差 log2(size) 那一位
    var buddy = function (a, n) { return a ^ n; };
    var mergeAt = function (a, n) {
      var b = buddy(a, n), lo = Math.min(a, b), i = at(lo);
      bs.splice(i, 2, { a: lo, n: n * 2, free: true });
      return i;
    };

    steps.push(step(snap({
      cap1: '当前局面：0..128 占用、128..192 占用、192..256 空闲、256..512 占用',
      cap2: '回收的关键问题只有一个 —— 我的伙伴是谁，它此刻空不空' }), 0,
      '接着上一场景的局面往下走。回收一块时要问的只有一件事：我的伙伴是谁，它空不空。' +
      '伙伴空闲就并成上一级，接着再问新块的伙伴，能一级一级往上并。',
      ['伙伴空闲就合并', '合并后继续问上一级',
       '关键是怎么找伙伴']));

    steps.push(step(snap({
      p: '128 起 64 字', bud: '128 ⊕ 64 = 192', bs: '空闲',
      cap1: 'free(128, 64)：伙伴地址 = 128 XOR 64 = 192 —— 一次异或就算出来了',
      cap2: '128 是 010000000，192 是 011000000，只差第 6 位 —— 因为块都对齐在 2^k 边界上',
      tags: [{ a: 128, n: 64, txt: 'p', color: '#ffd166' },
             { a: 192, n: 64, txt: '伙伴：空闲', color: '#6ceaa5' }] }), 2,
      '回收 128 起的 64 字。伙伴地址就是 128 XOR 64 = 192 —— 二进制看，128 与 192 只差第 6 位。' +
      '因为每块都对齐在自己大小的边界上，同级两个伙伴的地址必然只差那一位。',
      ['伙伴 = 地址 XOR 大小', '128 ⊕ 64 = 192',
       '只差一个二进制位']));

    steps.push(step(snap({
      p: '128 起 64 字', bud: '192', bs: '空闲',
      cap1: '算出地址就能直接取那块的标志看空占 —— 不用查链，不用比较',
      cap2: '对比边界标识法：那边找邻居靠底部 uplink，这边连标志带都省了，一个异或就够',
      tags: [{ a: 128, n: 64, txt: 'p', color: '#ffd166' },
             { a: 192, n: 64, txt: '伙伴空闲，可以并', color: '#6ceaa5' }] }), 3,
      '算出地址就能直接读那块的标志判断空占，不用查链也不用比较。这是伙伴系统回收快的根子：' +
      '边界标识法要靠底部 uplink 才能摸到邻居，这边一个异或就定位了。',
      ['地址算出即可直接读标志', '判定伙伴是 O(1)',
       '比 uplink 还省']));

    mergeAt(128, 64);
    st = {}; st[at(128)] = 'done';
    steps.push(step(snap({
      p: '—', bud: '—', bs: '—',
      cap1: '伙伴空闲，两个 64 并成一个 128，挂到 2^7 链上',
      cap2: '合并只认伙伴 —— 哪怕旁边还有一个 64 字的空闲块，不是伙伴也不能并',
      tags: [{ a: 128, n: 128, txt: '并成 128', color: '#6ceaa5' }] }), 4,
      '伙伴空闲，两个 64 并成一个 128 挂到 2^7 链。要紧的是合并只认伙伴：' +
      '就算紧邻着另一个 64 字的空闲块，只要不是伙伴，也一样并不了。',
      ['64 + 64 → 128', '挂到 2^7 链',
       '只认伙伴，不认邻居']));

    // 回收 0..128：伙伴 128 刚好空了，并成 256；再问 0..256 的伙伴，还占着，停
    st = {}; st[at(0)] = 'hot'; st[at(128)] = 'good';
    steps.push(step(snap({
      p: '0 起 128 字', bud: '0 ⊕ 128 = 128', bs: '空闲',
      cap1: 'free(0, 128)：伙伴地址 0 XOR 128 = 128 —— 正是刚才并出来的那块',
      cap2: '低地址块的伙伴在它右边，高地址块的伙伴在左边 —— 异或天然把两种情况一起算了',
      tags: [{ a: 0, n: 128, txt: 'p', color: '#ffd166' },
             { a: 128, n: 128, txt: '伙伴：空闲', color: '#6ceaa5' }] }), 2,
      '再回收 0 起的 128 字。伙伴是 0 XOR 128 = 128，正是刚才并出来那块。' +
      '异或的妙处是不用管自己是低半还是高半，左边右边一个式子都算得对。',
      ['0 ⊕ 128 = 128', '伙伴恰好空闲',
       '异或不分左右']));

    mergeAt(0, 128);
    st = {}; st[at(0)] = 'done';
    steps.push(step(snap({
      p: '0 起 256 字', bud: '0 ⊕ 256 = 256', bs: '占用',
      cap1: '并成 256 之后不能收手 —— 还要问新块的伙伴：0 XOR 256 = 256',
      cap2: '256..512 还占着，级联到此为止，这块 256 挂进 2^8 链',
      tags: [{ a: 0, n: 256, txt: '并成 256', color: '#6ceaa5' },
             { a: 256, n: 256, txt: '伙伴占用，停', color: '#ff9f6b' }] }), 5,
      '并成 256 后不能收手，还得问新块的伙伴：0 XOR 256 = 256，那块还占着 —— 级联到此为止。' +
      '合并是个循环，直到伙伴占用或者已经并到最大一级才停。',
      ['128 + 128 → 256', '再问 0 ⊕ 256 = 256',
       '伙伴占用，停止级联']));

    // 回收 256..512：一路并回 512
    st = {}; st[at(256)] = 'hot'; st[at(0)] = 'good';
    steps.push(step(snap({
      p: '256 起 256 字', bud: '256 ⊕ 256 = 0', bs: '空闲',
      cap1: 'free(256, 256)：伙伴地址 256 XOR 256 = 0 —— 就是刚才那块 256',
      cap2: '它空闲，并成 512；再问 0 XOR 512 = 512，超出可利用空间，说明已经到顶',
      tags: [{ a: 256, n: 256, txt: 'p', color: '#ffd166' },
             { a: 0, n: 256, txt: '伙伴：空闲', color: '#6ceaa5' }] }), 2,
      '最后回收 256 起的 256 字，伙伴是 0，空闲，并成 512。再问下去就超出可利用空间了 —— ' +
      '到最大一级自然停手。',
      ['256 ⊕ 256 = 0', '伙伴空闲，并成 512',
       '已到最大级，停']));

    mergeAt(256, 256);
    st = {}; st[0] = 'done';
    steps.push(step(snap({
      hdr: '全部回收：512 字重新连成一整块',
      p: '—', bud: '—', bs: '—',
      cap1: '碎片全部并回，2^9 链上又是一块完整的 512 字',
      cap2: '外部碎片在伙伴系统里基本不成问题 —— 空闲块总能沿 2 的幂一级级并回去',
      stats: { '各级空闲链': listsOf(bs), '最大空闲块': '512 字',
               '合并次数': 4, '每次判定': 'O(1) 异或' },
      tags: [{ a: 0, n: 512, txt: '完整的 512 字', color: '#6ceaa5' }] }), 6,
      '全部回收之后 512 字重新连成一整块。伙伴系统的外部碎片基本不成问题 —— ' +
      '空闲块总能沿着 2 的幂一级级并回去，而每次判定都只是一次异或。',
      ['并回完整的 512', '外部碎片不成问题',
       '判定始终 O(1)']));

    steps.push(step(snap({
      hdr: '这笔账怎么算',
      p: '—', bud: '—', bs: '—',
      cap1: '收益：分配与回收都不需要查找比较，各级链表一取一放，快得多',
      cap2: '代价：内部碎片 —— 请 33 字给 64 字，最坏差不多要浪费一半',
      stats: { '分配': '取整 + 对半劈', '回收': '异或找伙伴',
               '省掉的': '查找与比较', '代价': '内部碎片' } }), -1,
      '总的看，伙伴系统用固定的内部碎片换掉了所有查找与比较：分配只是取整加对半劈，' +
      '回收只是异或找伙伴。请 33 字给 64 字这种浪费，就是这份速度的价钱。',
      ['省掉查找与比较', '代价是内部碎片',
       '请 33 给 64，最坏浪费近半']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['buddy-system'] = {
    title: '伙伴系统 Buddy System',
    subtitle: '所有块的大小都是 2 的幂，每一档单独挂一条空闲链。分配时把请求向上取整到 2^k，链上没有就取更大的块对半劈；回收时用 addr XOR size 一步算出伙伴的地址，空闲就并成上一级，再一级级往上级联。省掉了全部查找与比较，代价是内部碎片。',
    height: 700,
    scenes: [
      { name: '分配与劈分', build: buildAlloc, codeTag: '取整 + 对半劈',
        code: [
          '// 可利用空间 512 字，块大小只能是 64/128/256/512',
          '// avail[k] —— 大小为 2^k 的空闲块各挂一条链',
          'Alloc(n):',
          '  k = 使 2^k >= n 的最小 k        // 向上取整，多的就是内碎片',
          '  j = k; while avail[j] 为空: j++  // 往上找第一条非空的链',
          '  if j > 最大级: 分配失败',
          '',
          '  while j > k:                    // 一级一级对半劈下来',
          '      从 avail[j] 摘下一块，劈成两个 2^(j-1)',
          '      高半挂进 avail[j-1]，低半继续往下劈',
          '      j--',
          '  从 avail[k] 摘下一块，tag = 占用，交给用户',
          '// 全程没有「哪块最合适」的比较 —— 只有取整和劈'
        ] },
      { name: '回收与合并伙伴', build: buildFree, codeTag: '异或找伙伴',
        code: [
          'free(p, size):                   // 回收 p 起的 2^k 字',
          '  loop:',
          '    buddy = p XOR size           // 伙伴地址：只差第 k 个二进制位',
          '    if size 已是最大级: break',
          '    if buddy 处的块不空闲 or 它的大小 != size: break',
          '',
          '    把 buddy 从 avail[k] 上摘下',
          '    p = min(p, buddy)            // 合并后的块从低地址那个算起',
          '    size *= 2; k++               // 级联：接着问新块的伙伴',
          '  把 p 挂进 avail[k]，tag = 空闲',
          '// 每块都对齐在自身大小的边界上，所以伙伴地址只差一位',
          '// 合并只认伙伴：紧邻的空闲块若不是伙伴，一样并不了'
        ] }
    ]
  };
})();
