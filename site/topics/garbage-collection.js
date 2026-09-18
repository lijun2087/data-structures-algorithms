/* 存储紧缩与垃圾回收 — 第8章
 * 场景一：存储紧缩 —— 空闲总量够、却没一段连着够，于是把占用块全部推向低端，
 *         零散空闲汇成一整片。代价是所有指向被搬动块的指针都得改，且必须停机。
 * 场景二：引用计数法 —— 每块记着有几个指针指向自己，减到 0 就回收。及时、
 *         开销摊薄，但循环引用的两块互相撑着，计数永远下不到 0。
 * 场景三：标记-清扫 —— 从根出发标记所有可达块（Mark），再扫一遍内存把没标记的
 *         全部收掉（Sweep）。能处理循环引用，代价是一次停顿和一地碎片。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 三个场景共用一条内存条：全长 200 字画成 x=56…936，1 字 = 4.4px，
   * 最小的块 15 字 = 66px，放得下名字和计数。
   * 竖直自上而下：标题 104、说明 124 / 142、指针弧 160…196、
   * 内存条 196…244、地址 258、块名与计数 274、标记位 292、
   * 两行要点 310 / 328，全在 330 以内。
   * 根集合画成内存条左上方 x=56 起的一小排，占 y 160…178 —— 只有
   * 场景二、三用得到，它们不画指针弧的最高那一档，不会撞上。 */
  var MEM = 200, BX = 56, BW = 880, SC = BW / MEM;
  var BY = 196, BH = 48;
  var ROOTY = 172;

  function px(a) { return BX + a * SC; }
  function ccOf(b) { return px(b.a) + b.n * SC / 2; }

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* 块记录 { a, n, free, name, rc, mk }
   * name 空表示这是一段空闲区；rc 是引用计数；mk 是标记位 */
  function cpBlocks(bs) {
    var r = [], i;
    for (i = 0; i < bs.length; i++) {
      r.push({ a: bs[i].a, n: bs[i].n, free: bs[i].free,
               name: bs[i].name, rc: bs[i].rc, mk: bs[i].mk });
    }
    return r;
  }

  function byName(bs, nm) {
    for (var i = 0; i < bs.length; i++) if (bs[i].name === nm) return bs[i];
    return null;
  }

  function freeInfo(bs) {
    var cnt = 0, sum = 0, mx = 0, i;
    for (i = 0; i < bs.length; i++) {
      if (!bs[i].free) continue;
      cnt++; sum += bs[i].n;
      if (bs[i].n > mx) mx = bs[i].n;
    }
    return { cnt: cnt, sum: sum, max: mx };
  }

  /* f = { blocks, st:{下标:状态}, arcs:[{from,to,color,lift,dash}],
   *       roots:[{name,to,color}], showRc, showMk,
   *       hdr, cap1, cap2, notes, stats }
   * arcs 的 from/to 是块名；lift 取 168 或 152 两档，避免弧线叠在一起 */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var bs = f.blocks, i, b, x, w, c, t;

    ctx.stage.appendChild(D.text(f.hdr || '存储紧缩与垃圾回收',
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 124, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 142, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    // 根集合：画成内存条上方的一排小方块，箭头竖直落到被指的块上
    for (i = 0; i < (f.roots || []).length; i++) {
      var rt = f.roots[i], rx = BX + 8 + i * 96;
      ctx.stage.appendChild(D.el('rect', { x: rx, y: ROOTY - 14, width: 84,
        height: 20, rx: 5, fill: '#101a2e', stroke: rt.color || '#6ceaa5',
        'stroke-width': 1.4 }));
      ctx.stage.appendChild(D.text(rt.name,
        { x: rx + 42, y: ROOTY, 'class': 'vz-tag', fill: rt.color || '#6ceaa5' }));
      b = byName(bs, rt.to);
      if (b) {
        ctx.stage.appendChild(D.el('line', { x1: rx + 42, y1: ROOTY + 6,
          x2: ccOf(b), y2: BY - 3, stroke: rt.color || '#6ceaa5',
          'stroke-width': 1.8, 'marker-end': 'url(#vzPtr)' }));
      }
    }

    // 块间指针：从块顶抬起画一条弧过去
    for (i = 0; i < (f.arcs || []).length; i++) {
      var ar = f.arcs[i], p = byName(bs, ar.from), q = byName(bs, ar.to);
      if (!p || !q) continue;
      var x1 = ccOf(p), x2 = ccOf(q), lift = ar.lift || 168;
      var o = { d: 'M ' + x1 + ' ' + (BY - 2) + ' C ' + x1 + ' ' + lift +
                   ', ' + x2 + ' ' + lift + ', ' + x2 + ' ' + (BY - 2),
                fill: 'none', stroke: ar.color || D.LINE.next,
                'stroke-width': 2, 'marker-end': 'url(#vzNext)' };
      if (ar.dash) { o['stroke-dasharray'] = '5 4'; }
      ctx.stage.appendChild(D.el('path', o));
    }

    for (i = 0; i < bs.length; i++) {
      b = bs[i]; x = px(b.a); w = b.n * SC;
      c = D.C[f.st[i] || (b.free ? 'mute' : 'active')];
      ctx.stage.appendChild(D.el('rect', { x: x, y: BY, width: w, height: BH,
        rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      ctx.stage.appendChild(D.text(b.free ? '空闲' : b.name,
        { x: x + w / 2, y: BY + 22, 'class': 'vz-cellval' }));
      ctx.stage.appendChild(D.text(b.n + ' 字',
        { x: x + w / 2, y: BY + 38, 'class': 'vz-slot' }));
      t = D.text(b.a, { x: x, y: BY + BH + 14, 'class': 'vz-idx' });
      t.setAttribute('text-anchor', 'start');
      ctx.stage.appendChild(t);

      if (f.showRc && !b.free) {
        ctx.stage.appendChild(D.text('rc = ' + b.rc,
          { x: x + w / 2, y: 274, 'class': 'vz-ptr',
            fill: b.rc === 0 ? '#ff6b6b' : '#6ceaa5' }));
      }
      if (f.showMk && !b.free) {
        ctx.stage.appendChild(D.text(b.mk ? 'mark ✓' : 'mark −',
          { x: x + w / 2, y: 292, 'class': 'vz-ptr',
            fill: b.mk ? '#6ceaa5' : '#ff6b6b' }));
      }
    }
    t = D.text(MEM, { x: BX + BW, y: BY + BH + 14, 'class': 'vz-idx' });
    t.setAttribute('text-anchor', 'end');
    ctx.stage.appendChild(t);

    for (i = 0; i < (f.notes || []).length && i < 2; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: 44, y: 310 + i * 18, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---------- 场景一：存储紧缩 ---------- */
  /* 占用与空闲交错，空闲共 75 字，可最大一段只有 25 —— 来个 50 字的请求就失败。
   * 把 4 个占用块依次推到低端，空闲汇成 75 字的一整片。 */
  function buildCompact() {
    var steps = [];
    var bs = [
      { a: 0,   n: 25, free: false, name: 'A' },
      { a: 25,  n: 20, free: true },
      { a: 45,  n: 30, free: false, name: 'B' },
      { a: 75,  n: 25, free: true },
      { a: 100, n: 25, free: false, name: 'C' },
      { a: 125, n: 15, free: true },
      { a: 140, n: 45, free: false, name: 'D' },
      { a: 185, n: 15, free: true }
    ];
    var st = {};

    var snap = function (o) {
      var fi = freeInfo(bs);
      return { blocks: cpBlocks(bs), st: cp(st), arcs: o.arcs || [],
               roots: o.roots || [],
               hdr: o.hdr || '存储紧缩　可利用空间 200 字',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [],
               stats: o.stats || { '空闲块数': fi.cnt,
                 '空闲总量': fi.sum + ' 字', '最大空闲段': fi.max + ' 字',
                 '请求 50 字': fi.max >= 50 ? '可以满足' : '失败' } };
    };
    // 把第 i 个占用块搬到地址 to
    var moveTo = function (i, to) { bs[i].a = to; };

    steps.push(step(snap({
      cap1: '四个占用块被三段空闲隔开 —— 空闲共 75 字，可最大的一段只有 25',
      cap2: '此刻来一个 50 字的请求：空间明明够，却一定失败',
      notes: ['这就是外部碎片攒到头的样子：总量够，没一段连着够',
        '分配算法再聪明也没用 —— 得动手把块搬到一起'] }), 0,
      '四个占用块被三段空闲隔开：空闲总共 75 字，最大的一段却只有 25。这时来个 50 字的请求，' +
      '空间够却一定失败。分配算法再聪明也解不开，只能动手搬块。',
      ['空闲共 75 字', '最大一段仅 25 字',
       '50 字请求必然失败']));

    st = {}; st[0] = 'good';
    steps.push(step(snap({
      cap1: '紧缩的做法：从低地址端起，把占用块一个个挨着码过去',
      cap2: 'A 已经贴着 0 号地址，不用动 —— 记住「下一个空位」free = 25',
      notes: ['扫描顺序必须是地址从低到高，否则会盖掉还没搬的块',
        'free 始终指着已码好部分的末尾'] }), 2,
      '紧缩就是从低地址端起把占用块挨着码过去。A 已经贴着 0，不用动，记下「下一个空位」是 25。' +
      '扫描必须按地址从低到高，否则会盖掉还没搬的块。',
      ['从低端起依次码放', 'A 不用动', 'free = 25']));

    moveTo(2, 25);
    st = {}; st[2] = 'hot';
    steps.push(step(snap({
      cap1: 'B 从 45 搬到 25 —— 30 字整体前移 20 个字',
      cap2: '搬动是真的复制内存内容，块越大越慢，这是紧缩最实打实的开销',
      notes: ['A 后面那 20 字的空隙就此被填掉',
        'free 往后走：25 + 30 = 55'] }), 4,
      'B 从 45 搬到 25，30 个字整体前移。这是真的复制内存内容，块越大越慢 —— ' +
      '紧缩最实打实的开销就在这儿，和空闲块多少无关，只看要搬多少字节。',
      ['B: 45 → 25', '真复制 30 字内容', 'free = 55']));

    steps.push(step(snap({
      cap1: '搬完 B 立刻有个麻烦：所有指向 B 的指针还记着旧地址 45',
      cap2: '必须把它们统统改成 25 —— 否则程序下一次访问 B 就落到别人的块体里',
      arcs: [{ from: 'D', to: 'B', color: '#ff9f6b' }],
      notes: ['所以紧缩要求「能找到所有指针」—— 得知道每块里哪几个字是指针',
        '这就是紧缩的前置条件，也是它比回收难做的地方'] }), 5,
      '搬完立刻有个麻烦：所有指向 B 的指针还记着旧地址 45，必须统统改成 25，不然下次访问就落到' +
      '别人的块体里。这要求系统能找出全部指针 —— 紧缩难做，难在这里。',
      ['指向 B 的指针要改', '45 → 25',
       '前提：能找到所有指针']));

    moveTo(4, 55);
    st = {}; st[4] = 'hot';
    steps.push(step(snap({
      cap1: 'C 从 100 搬到 55，接着 D 从 140 搬到 80',
      cap2: '每搬一块都要改一批指针 —— 搬 4 块就是 4 轮指针修正',
      notes: ['常见做法：搬完之后统一扫一遍，用「旧址 → 新址」的对照表批量改',
        '也可以让块头存一个转发地址，访问时顺一次'] }), 4,
      'C 从 100 搬到 55。每搬一块都要改一批指针，所以实现上常是先搬完、记下「旧址→新址」的' +
      '对照表，再统一扫一遍批量修正，而不是一块一块地改。',
      ['C: 100 → 55', '记下旧址→新址',
       '搬完统一改指针']));

    moveTo(6, 80);
    // 三段空闲汇成一段：只留一个空闲结点，起点 125、长度 75
    bs = [bs[0], bs[2], bs[4], bs[6], { a: 125, n: 75, free: true }];
    st = {}; st[4] = 'done';
    steps.push(step(snap({
      hdr: '紧缩完成　三段零散空闲汇成 75 字的一整片',
      cap1: 'D 搬到 80，四个占用块贴在 0…125，空闲全都挤到高端',
      cap2: '现在 50 字的请求一口就能满足 —— 空闲一整片 75 字，还有富余',
      stats: { '空闲块数': 1, '空闲总量': '75 字',
               '最大空闲段': '75 字', '请求 50 字': '可以满足' },
      notes: ['紧缩把外部碎片一次清零 —— 这是它无法替代的用处',
        '代价：搬动的字节数 + 修正全部指针，而且全程必须停机'] }), 7,
      'D 搬到 80，四块贴在 0…125，空闲汇成 75 字的一整片，50 字的请求一口就能满足。' +
      '紧缩能把外部碎片一次清零，这是它无法替代的用处。',
      ['空闲汇成 75 字一片', '50 字请求可满足',
       '外部碎片清零']));

    steps.push(step(snap({
      hdr: '紧缩的代价',
      cap1: '一、搬动本身要复制大量内存，开销和活数据的总量成正比',
      cap2: '二、全程必须停机 —— 地址在变、指针在改，程序这时候一步也不能跑',
      stats: { '开销': '正比于活数据量', '前提': '能找出全部指针',
               '必须': '停机（Stop the World）', '收益': '外部碎片清零' },
      notes: ['所以紧缩不会常做，通常等到分配失败了才触发一次',
        '它也常和后面的标记-清扫配对：清扫留下碎片，紧缩接手整理'] }), -1,
      '代价有两条：搬动要复制大量内存，开销正比于活数据量；而且地址在变、指针在改，' +
      '程序全程一步也不能跑。所以紧缩通常等分配失败了才触发一次。',
      ['开销正比于活数据量', '必须停机',
       '常与标记-清扫配对']));

    return steps;
  }

  /* ---------- 场景二：引用计数法 ---------- */
  /* 五块：root→A→B，root→C，D 与 E 互相指。
   * 先看正常情形：断开 root→A，A 的 rc 归零被回收，连带 B 的 rc 也减到 0。
   * 再看致命伤：断开 root→D 之后 D、E 的 rc 都还是 1，互相撑着，永远收不掉。 */
  function buildRefCount() {
    var steps = [];
    var bs = [
      { a: 0,   n: 30, free: false, name: 'A', rc: 1 },
      { a: 30,  n: 35, free: false, name: 'B', rc: 1 },
      { a: 65,  n: 25, free: false, name: 'C', rc: 1 },
      { a: 90,  n: 45, free: false, name: 'D', rc: 2 },
      { a: 135, n: 40, free: false, name: 'E', rc: 1 },
      { a: 175, n: 25, free: true }
    ];
    var st = {}, arcs, roots;

    var snap = function (o) {
      var fi = freeInfo(bs);
      return { blocks: cpBlocks(bs), st: cp(st),
               arcs: o.arcs || [], roots: o.roots || [], showRc: true,
               hdr: o.hdr || '引用计数法　每块记着有几个指针指向自己',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [],
               stats: o.stats || { '已回收': o.rec || '—',
                 '空闲总量': fi.sum + ' 字',
                 '收不掉的': o.leak || '—', '成因': o.why || '—' } };
    };
    var A = function (nm, v) { byName(bs, nm).rc = v; };

    // 局面：root1→A→B，root2→C，D⇄E，另有 root3→D
    arcs = [{ from: 'A', to: 'B', lift: 168 },
            { from: 'D', to: 'E', lift: 168 },
            { from: 'E', to: 'D', lift: 152, color: '#ff9f6b' }];
    roots = [{ name: 'root → A', to: 'A' }, { name: 'root → C', to: 'C' },
             { name: 'root → D', to: 'D' }];
    steps.push(step(snap({
      arcs: arcs, roots: roots,
      cap1: '每块头部多存一个引用计数 rc：有几个指针指着我，rc 就是几',
      cap2: 'A 被 root 指着 rc=1；D 被 root 和 E 一起指着 rc=2；E 只被 D 指着 rc=1',
      notes: ['指针每复制一次 rc 加一，每撤销一次 rc 减一 —— 开销摊在平时',
        'rc 减到 0 说明谁也找不到它了，当场就能回收'] }), 0,
      '引用计数法给每块加一个计数 rc：有几个指针指着我，rc 就是几。指针每复制一次加一、' +
      '撤销一次减一，开销摊在平时。rc 减到 0 说明谁也够不着它了，当场回收。',
      ['rc = 指向本块的指针数', '复制加一，撤销减一',
       'rc 到 0 立刻回收']));

    A('A', 0);
    st = {}; st[0] = 'bad';
    steps.push(step(snap({
      arcs: arcs, roots: [roots[1], roots[2]],
      cap1: '程序把 root → A 这个指针撤了 —— A 的 rc 从 1 减到 0',
      cap2: 'rc 变 0 的这一瞬就知道它成了垃圾，不用等到内存不够，也不用扫描全内存',
      why: 'rc = 0',
      notes: ['这是引用计数最大的长处：回收及时，没有集中的停顿',
        '内存刚不用就还回去，峰值占用也压得低'] }), 2,
      '程序撤掉 root → A 这个指针，A 的 rc 从 1 减到 0。这一瞬就能断定它是垃圾 —— ' +
      '不用等内存不够，也不用扫描全内存。回收及时、没有集中停顿，是它最大的长处。',
      ['撤销 root → A', 'A 的 rc: 1 → 0',
       '当场判定为垃圾']));

    bs[0].free = true; bs[0].name = null;
    A('B', 0);
    st = {}; st[0] = 'done'; st[1] = 'bad';
    steps.push(step(snap({
      arcs: [arcs[1], arcs[2]], roots: [roots[1], roots[2]],
      cap1: '回收 A 之前要先处理它里面的指针：A 指着 B，所以 B 的 rc 也要减一',
      cap2: 'B 的 rc 从 1 减到 0，于是 B 也成了垃圾 —— 回收会顺着指针连锁下去',
      rec: 'A（30 字）', why: '连锁减一',
      notes: ['释放一块时，块内每个指针都要给对方 rc 减一',
        '所以一次撤销可能引发一长串回收 —— 偶尔也会卡一下'] }), 4,
      '回收 A 之前要先处理它里面的指针：A 指着 B，B 的 rc 也减一，减到 0，于是 B 跟着成了垃圾。' +
      '回收会顺着指针连锁下去，一次撤销有时会引发一长串。',
      ['释放 A，块内指针要减一', 'B 的 rc: 1 → 0',
       '回收连锁传下去']));

    bs[1].free = true; bs[1].name = null;
    st = {}; st[0] = 'done'; st[1] = 'done';
    steps.push(step(snap({
      arcs: [arcs[1], arcs[2]], roots: [roots[1], roots[2]],
      cap1: 'A、B 都收回来了，65 字变成空闲 —— 到这儿一切都很顺',
      cap2: '接下来看 D 和 E，那一对互相指着的块',
      rec: 'A + B（65 字）',
      notes: ['正常的树形、链式引用，引用计数处理得又快又准',
        '真正要命的是下面这种环'] }), 5,
      'A、B 都收回来了，65 字变成空闲。到这里引用计数表现得又快又准 —— 对树形、链式的引用' +
      '结构确实好用。真正要命的是接下来这种情况。',
      ['A、B 均已回收', '共腾出 65 字',
       '接着看 D 与 E']));

    st = {}; st[0] = 'done'; st[1] = 'done'; st[3] = 'hot'; st[4] = 'hot';
    steps.push(step(snap({
      arcs: [arcs[1], arcs[2]], roots: [roots[1], roots[2]],
      cap1: 'D 指着 E，E 又指回 D —— 两块互相引用，各自都在给对方的 rc 贡献一',
      cap2: 'D 的 rc = 2（root 一个、E 一个），E 的 rc = 1（D 一个）',
      rec: 'A + B（65 字）', why: '互相引用',
      notes: ['双向链表、树里的父指针、图里的回边，全都是这个形状',
        '这种环在实际程序里非常常见，不是刻意构造的怪例'] }), 6,
      'D 指着 E，E 又指回 D，两块互相给对方的 rc 贡献一。双向链表、带父指针的树、图里的回边' +
      '全是这个形状 —— 这种环在真实程序里太常见了，不是刻意构造的怪例。',
      ['D ⇄ E 互相引用', 'D 的 rc=2，E 的 rc=1',
       '双向链表就是这形状']));

    A('D', 1);
    st = {}; st[0] = 'done'; st[1] = 'done'; st[3] = 'bad'; st[4] = 'bad';
    steps.push(step(snap({
      arcs: [arcs[1], arcs[2]], roots: [roots[1]],
      cap1: '撤掉 root → D：D 的 rc 从 2 减到 1 —— 没到 0，不回收',
      cap2: '可从根出发已经再也走不到 D 和 E 了，它们明明是垃圾',
      rec: 'A + B（65 字）', leak: 'D + E（85 字）', why: '循环引用',
      notes: ['外面没有任何指针指进来，程序永远访问不到这两块',
        '但它们互相撑着 rc，各自都是 1 —— 一个也减不到 0'] }), 7,
      '撤掉 root → D，D 的 rc 从 2 减到 1，没到 0，不回收。可从根出发已经走不到 D 和 E 了，' +
      '它们明明是垃圾 —— 只是互相撑着 rc，谁也减不到 0。',
      ['撤销 root → D', 'D 的 rc: 2 → 1，不为 0',
       '从根已不可达']));

    steps.push(step(snap({
      hdr: '致命伤：循环引用永远收不回来',
      arcs: [arcs[1], arcs[2]], roots: [roots[1]],
      cap1: 'D 的 rc=1 靠 E 撑着，E 的 rc=1 靠 D 撑着 —— 两个 1 互为对方的理由',
      cap2: '85 字就这么漏掉了。环越多漏越多，最后照样是分配失败',
      rec: 'A + B（65 字）', leak: 'D + E（85 字）', why: '两个 1 互撑',
      stats: { 'D 的 rc': 1, 'E 的 rc': 1, '从根可达': '否',
               '会被回收': '永远不会' },
      notes: ['根子在 rc 只看「有没有人指我」，不看「指我的那个人自己还活着吗」',
        '要判「活着」就必须从根出发走一遍 —— 这正是标记-清扫的思路'] }), 8,
      'D 的 rc 靠 E 撑着，E 的 rc 靠 D 撑着，两个 1 互为对方的理由，85 字就这么漏掉了。' +
      '根子在于 rc 只看有没有人指我，不问指我的那个自己还活着吗。',
      ['两个 1 互相撑着', '85 字永久泄漏',
       'rc 不问「指我的还活着吗」']));

    steps.push(step(snap({
      hdr: '引用计数：取舍在哪',
      arcs: [arcs[1], arcs[2]], roots: [roots[1]],
      cap1: '好处：回收及时、开销摊在平时、没有集中的长停顿',
      cap2: '坏处：每次赋值都要维护 rc（还得考虑并发），且循环引用必然泄漏',
      stats: { '回收时机': '即时', '开销': '摊薄在平时',
               '循环引用': '泄漏', '补救': '配一次标记-清扫' },
      notes: ['工程上的常见做法：平时用引用计数，偶尔跑一次标记-清扫兜掉环',
        '或者让程序员用弱引用手动打断环'] }), -1,
      '引用计数的账：回收及时、开销摊薄、没有长停顿；代价是每次赋值都要维护 rc，' +
      '而且循环引用必然泄漏。实际做法常是平时算计数，偶尔跑一次标记-清扫兜掉环。',
      ['及时回收，无长停顿', '循环引用必泄漏',
       '需标记-清扫兜底']));

    return steps;
  }

  /* ---------- 场景三：标记-清扫 ---------- */
  /* 同一批块：root→A→B，root→C，D⇄E 且没有根指向它们。
   * Mark 从根出发把 A、B、C 标上；Sweep 顺序扫一遍，把没标记的 D、E 收掉 ——
   * 循环引用在这里根本不是问题，因为判据换成了「从根可达」。 */
  function buildMarkSweep() {
    var steps = [];
    var bs = [
      { a: 0,   n: 30, free: false, name: 'A', mk: 0 },
      { a: 30,  n: 35, free: false, name: 'B', mk: 0 },
      { a: 65,  n: 25, free: false, name: 'C', mk: 0 },
      { a: 90,  n: 45, free: false, name: 'D', mk: 0 },
      { a: 135, n: 40, free: false, name: 'E', mk: 0 },
      { a: 175, n: 25, free: true }
    ];
    var st = {};
    var arcs = [{ from: 'A', to: 'B', lift: 168 },
                { from: 'D', to: 'E', lift: 168 },
                { from: 'E', to: 'D', lift: 152, color: '#ff9f6b' }];
    var roots = [{ name: 'root → A', to: 'A' }, { name: 'root → C', to: 'C' }];

    var snap = function (o) {
      var fi = freeInfo(bs), i, mk = 0;
      for (i = 0; i < bs.length; i++) if (!bs[i].free && bs[i].mk) mk++;
      return { blocks: cpBlocks(bs), st: cp(st),
               arcs: o.arcs || arcs, roots: o.roots || roots, showMk: true,
               hdr: o.hdr || '标记-清扫　判据换成「从根可达」',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [],
               stats: o.stats || { '阶段': o.ph || 'Mark',
                 '已标记': mk + ' 块', '空闲总量': fi.sum + ' 字',
                 '空闲块数': fi.cnt } };
    };
    var M = function (nm) { byName(bs, nm).mk = 1; };

    steps.push(step(snap({
      ph: '准备',
      cap1: '换个判据：不再问「有几个指针指着我」，而问「从根出发能不能走到我」',
      cap2: '所有块的 mark 位先全部清 0 —— D 和 E 那个环，这次不会再是问题',
      notes: ['根集合：全局变量、栈上的变量、寄存器里的引用',
        '能从根走到的叫活对象，走不到的就是垃圾，不管它们之间怎么指'] }), 0,
      '标记-清扫换了判据：不问有几个指针指着我，而问从根出发能不能走到我。根集合就是全局变量、' +
      '栈上的变量这些。走得到的活着，走不到的是垃圾 —— 不管它们内部怎么互指。',
      ['判据：从根可达', '先把所有 mark 清 0',
       '环不再是问题']));

    M('A');
    st = {}; st[0] = 'good';
    steps.push(step(snap({
      ph: 'Mark',
      cap1: 'Mark 第一步：从 root → A 走进去，把 A 标上',
      cap2: '标记的过程就是一次图遍历 —— 深度优先或广度优先都行',
      notes: ['标上之后要接着走 A 里面的指针，这是递归/入栈的地方',
        '已标记的块不再进队 —— 环靠这一条自然终止'] }), 2,
      'Mark 第一步：从 root → A 走进去，把 A 标上。标记就是一次图遍历，深度优先或广度优先都行；' +
      '已经标过的块不再重复进队 —— 环靠这一条自然就终止了。',
      ['从 root → A 进入', 'A 标记 ✓',
       '已标记的不再重复访问']));

    M('B');
    st = {}; st[0] = 'good'; st[1] = 'good';
    steps.push(step(snap({
      ph: 'Mark',
      cap1: '顺着 A 里的指针走到 B，把 B 也标上 —— B 没有再指向别人，这一支走完',
      cap2: '注意 B 并不被任何根直接指着，可它是活的 —— 活不活看的是可达性',
      notes: ['间接可达同样算活 —— 只要根能一路走到就行',
        'B 里没有指针了，回退到上一层继续'] }), 3,
      '顺着 A 里的指针走到 B，也标上。B 并不被任何根直接指着，可它照样是活的 —— ' +
      '间接可达也算活，只要根能一路走到。',
      ['A → B，B 标记 ✓', '间接可达同样算活',
       '这一支走完，回退']));

    M('C');
    st = {}; st[0] = 'good'; st[1] = 'good'; st[2] = 'good';
    steps.push(step(snap({
      ph: 'Mark',
      cap1: '再从 root → C 进去，把 C 标上 —— 根集合里的每个根都要走一遍',
      cap2: '根走完了，Mark 阶段结束：A、B、C 有标记，D、E 一个都没碰到',
      notes: ['D、E 虽然互相指着，可没有任何一条从根出发的路能到它们',
        '所以遍历根本不会走到那儿 —— 循环引用就这么被跳过了'] }), 4,
      '再从 root → C 进去标上。根都走完，Mark 结束：A、B、C 有标记，D、E 一次也没被碰到。' +
      'D、E 虽然互相指着，可没有一条从根出发的路能到它们，遍历根本走不过去。',
      ['C 标记 ✓', 'Mark 阶段结束',
       'D、E 从未被访问到']));

    st = {}; st[3] = 'bad'; st[4] = 'bad';
    steps.push(step(snap({
      ph: 'Sweep',
      cap1: 'Sweep：从头到尾顺序扫一遍整块内存，看每块的 mark 位',
      cap2: '有标记的把 mark 清 0，留着下轮用；没标记的直接回收 —— D、E 就是',
      notes: ['清扫是顺序扫描，代价正比于整个内存的大小，不只是活数据',
        '引用计数收不掉的那 85 字，这里一遍就收掉了'] }), 6,
      'Sweep 阶段从头到尾顺序扫一遍内存看 mark 位：有标记的清 0 留着下轮，没标记的直接回收。' +
      'D、E 正是没标记的那两块 —— 引用计数收不掉的 85 字，这里一遍就收掉了。',
      ['顺序扫描整块内存', '有标记：清 0 留下',
       '无标记：回收']));

    bs[3].free = true; bs[3].name = null;
    bs[4].free = true; bs[4].name = null;
    bs[0].mk = 0; bs[1].mk = 0; bs[2].mk = 0;
    st = {}; st[3] = 'done'; st[4] = 'done';
    steps.push(step(snap({
      ph: '完成',
      hdr: '清扫完成　循环引用的 85 字回收了',
      arcs: [arcs[0]], roots: roots,
      cap1: 'D、E 连着的 85 字全部收回，A、B、C 的 mark 位复位，等下一轮',
      cap2: '但要看清楚：空闲成了两段（90…175 和 175…200 相邻，可 A/B/C 之间没缝）',
      notes: ['能收环，是因为判据从「有人指我」换成了「根能走到我」',
        '代价一：Mark 要遍历全部活对象，Sweep 要扫全部内存'] }), 7,
      'D、E 那 85 字全部收回，A、B、C 的 mark 位复位等下一轮。能收掉环，' +
      '全因为判据从「有人指我」换成了「根能走到我」—— 环里的块谁都指不进去。',
      ['85 字成功回收', 'mark 位复位',
       '判据换了，环就不难']));

    steps.push(step(snap({
      ph: '取舍',
      hdr: '标记-清扫的代价，以及为什么要配紧缩',
      arcs: [arcs[0]], roots: roots,
      cap1: '一、Mark 要遍历全部活对象、Sweep 要扫全部内存，期间必须停机',
      cap2: '二、回收出来的空闲是散在各处的 —— 清扫不搬块，碎片留在原地',
      stats: { 'Mark': '遍历活对象', 'Sweep': '扫描全内存',
               '停顿': '必须停机', '遗留': '外部碎片' },
      notes: ['所以标准做法是「标记-清扫-紧缩」：清扫收回垃圾，紧缩再把碎片压平',
        '引用计数管日常、标记-清扫兜环、紧缩治碎片 —— 三件事各管一头'] }), -1,
      '代价也有两条：Mark 要遍历全部活对象、Sweep 要扫全部内存，期间必须停机；而且清扫不搬块，' +
      '碎片留在原地。所以标准配法是标记-清扫之后再跑一次紧缩。',
      ['停顿正比于内存规模', '清扫不搬块，留碎片',
       '常接一次紧缩']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['garbage-collection'] = {
    title: '存储紧缩与垃圾回收 Compaction & GC',
    subtitle: '外部碎片攒到头就是「空间够、没一段连着够」，紧缩把占用块推向一端把碎片清零，代价是搬动内存、修正全部指针并停机。谁是垃圾则有两种判法：引用计数看有几个指针指着我，及时但漏掉循环引用；标记-清扫看从根能否走到我，能收环但要一次停顿。',
    height: 700,
    scenes: [
      { name: '存储紧缩', build: buildCompact, codeTag: 'Compaction',
        code: [
          '// 外部碎片攒到头：空闲总量够，却没有一段连着够',
          'Compact():',
          '  free = 内存低端地址          // 下一个可码放的位置',
          '  for 每个块 b，按地址从低到高:  // 顺序不能反，否则会盖掉未搬的块',
          '      if b 占用:',
          '          若 b.addr != free: 把 b 的内容整体搬到 free',
          '                             记下 旧址 → 新址',
          '          free += b.size',
          '  统一扫一遍，按对照表修正所有指向被搬块的指针',
          '  剩下 [free, 末端) 汇成一整段空闲',
          '',
          '// 代价一：搬动的字节数正比于活数据总量',
          '// 代价二：地址在变、指针在改，全程必须停机'
        ] },
      { name: '引用计数法', build: buildRefCount, codeTag: 'Reference Count',
        code: [
          '// 每块头部多存一个 rc：有几个指针指向本块',
          'p = q:                          // 指针赋值时同步维护',
          '  if p != NULL: rc(p)--         // 旧目标少了一个引用',
          '  if q != NULL: rc(q)++',
          '  if rc(旧目标) == 0: Release(旧目标)',
          '',
          'Release(b):',
          '  for b 里的每个指针 x: rc(x)--  // 连锁：可能引发一串回收',
          '                       if rc(x) == 0: Release(x)',
          '  把 b 挂回空闲链',
          '',
          '// 致命伤：D 指 E、E 指 D，外面再没人指进来',
          '//   两个 rc 都是 1，互为对方存在的理由，永远减不到 0',
          '//   双向链表、带父指针的树、图的回边全是这个形状'
        ] },
      { name: '标记-清扫', build: buildMarkSweep, codeTag: 'Mark & Sweep',
        code: [
          '// 判据换成「从根出发能否走到」，与谁指谁无关',
          'MarkSweep():',
          '  // ---- Mark：从根集合出发遍历，标出全部活对象 ----',
          '  for 每个根 r: Mark(r)',
          '  // ---- Sweep：顺序扫描整块内存 ----',
          '  for 每个块 b，按地址从低到高:',
          '      if b.mark: b.mark = 0     // 活的，复位标记留到下一轮',
          '      else:      把 b 挂回空闲链  // 没标记，就是垃圾',
          '',
          'Mark(b):',
          '  if b == NULL or b.mark: return  // 已标记就不再进 —— 环靠这条终止',
          '  b.mark = 1',
          '  for b 里的每个指针 x: Mark(x)',
          '// Sweep 不搬块，碎片留在原地 —— 所以后面常再跑一次紧缩'
        ] }
    ]
  };
})();
