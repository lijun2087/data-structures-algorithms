/* 多路平衡归并 — 第11章
 * 外部排序的账要按 I/O 次数算：一次磁盘访问比一次内存比较贵好几个数量级，
 * 所以外排序的全部功夫都花在「少读写几趟」上。
 * 场景一：内存装不下整个文件，只能先分段排好、再归并 —— 两个阶段。
 * 场景二：归并趟数 S = ⌈log_k m⌉，k 一大趟数立刻掉下来。
 * 场景三：一趟 3 路归并具体怎么做 —— k 个输入缓冲各出一个，选最小写输出。
 * 场景四：k 大了内部比较反而变多 —— 这正是败者树要解决的问题。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var M = 10;                        // 初始归并段个数
  var NREC = 3000, NBLK = 30, MEM = 3;   // 记录数 / 外存块数 / 内存能装几块

  /* 归并树：最底一层是初始段，每往上一层就是一趟归并 */
  var TX = 60, TW = 34, TG = 6, TBASE = 300, TDY = 34, TH = 22;
  var TLX = 470;                     // 每层右侧的文字说明

  /* 场景三的缓冲区：左侧 3 个输入段，右侧输出缓冲 */
  var BX = 96, BW = 46, BG = 6, BH = 30, BY = [168, 212, 256];
  var OX = 384, OW = 40, OG = 5, OY = 176, OH = 30;

  var SEG = [[12, 25, 38], [9, 30, 41], [17, 22, 50]];
  var SNAME = ['输入缓冲 1', '输入缓冲 2', '输入缓冲 3'];

  function mk(n) { var a = [], i; for (i = 0; i < n; i++) a.push('mute'); return a; }

  /* 归并树的分层：每层把下一层每 k 个合成一个 */
  function passes(m, k) {
    var lv = [], cur = [], i, j, q, nx, s, n;
    for (i = 0; i < m; i++) cur.push({ s: i, n: 1 });
    lv.push(cur);
    while (cur.length > 1) {
      nx = [];
      for (j = 0; j < cur.length; j += k) {
        s = cur[j].s; n = 0;
        for (q = j; q < cur.length && q < j + k; q++) n += cur[q].n;
        nx.push({ s: s, n: n });
      }
      lv.push(nx);
      cur = nx;
    }
    return lv;
  }

  function drawTree(g, lv, lit) {
    var L, j, b, x, w, y, st, c;
    for (L = 0; L < lv.length; L++) {
      y = TBASE - L * TDY;
      for (j = 0; j < lv[L].length; j++) {
        b = lv[L][j];
        x = TX + b.s * (TW + TG);
        w = b.n * (TW + TG) - TG;
        st = L === lit ? 'hot' : (L < lit ? 'done' : 'mute');
        c = D.C[st];
        g.appendChild(D.el('rect', { x: x, y: y, width: w, height: TH,
          rx: 5, fill: c.fill, stroke: c.stroke,
          'stroke-width': L === lit ? 2.6 : 1.4 }));
        g.appendChild(D.text(b.n, { x: x + w / 2, y: y + 16,
          'class': 'vz-idx', fill: L <= lit ? '#eef3ff' : '#4a5c82' }));
      }
      g.appendChild(D.text(L === 0 ? '初始段 ' + lv[L].length + ' 个'
        : '第 ' + L + ' 趟 → 剩 ' + lv[L].length + ' 段',
        { x: TLX, y: y + 16, 'class': 'vz-idx', 'text-anchor': 'start',
          fill: L === lit ? '#ffd166' : '#7d90b6' }));
    }
  }

  /* 外存块的一排小格；win 圈出内存能同时装下的那几块 */
  function drawBlocks(g, y, n, win, title) {
    var w = 26, gp = 4, i, x, on, c;
    g.appendChild(D.text(title, { x: 60, y: y - 10, 'class': 'vz-tag',
      fill: '#9fb4dc', 'text-anchor': 'start' }));
    for (i = 0; i < n; i++) {
      x = 60 + i * (w + gp);
      on = win && i >= win[0] && i <= win[1];
      c = D.C[on ? 'hot' : 'idle'];
      g.appendChild(D.el('rect', { x: x, y: y, width: w, height: 26, rx: 4,
        fill: c.fill, stroke: c.stroke, 'stroke-width': on ? 2.4 : 1.3 }));
    }
  }

  /* 一排缓冲区格子：head 之前的已经取走（mute），head 处高亮 */
  function drawBuf(g, x, y, title, vals, head, hot, tag) {
    var i, cx, st, c;
    g.appendChild(D.text(title, { x: x - 8, y: y + 20, 'class': 'vz-tag',
      fill: '#9fb4dc', 'text-anchor': 'end' }));
    for (i = 0; i < vals.length; i++) {
      cx = x + i * (BW + BG);
      st = i < head ? 'mute' : (i === head ? (hot ? 'hot' : 'active') : 'idle');
      c = D.C[st];
      g.appendChild(D.el('rect', { x: cx, y: y, width: BW, height: BH,
        rx: 5, fill: c.fill, stroke: c.stroke,
        'stroke-width': i === head && hot ? 2.8 : 1.5 }));
      g.appendChild(D.text(i < head ? '·' : vals[i],
        { x: cx + BW / 2, y: y + 21, 'class': 'vz-cellval',
          fill: i < head ? '#3f5580' : '#eef3ff' }));
    }
    if (tag) {
      g.appendChild(D.text(tag, { x: x + vals.length * (BW + BG) + 6,
        y: y + 21, 'class': 'vz-idx', 'text-anchor': 'start',
        fill: '#ffd166' }));
    }
  }

  /* f = { lv, lit, blocks:{y,n,win,title}, bufs:[{vals,head,hot,tag}],
   *       out:[], outHot, nx, ny, hdr, cap, notes, legend, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var j, b, x, c;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    if (f.lv) drawTree(ctx.stage, f.lv, f.lit === undefined ? -1 : f.lit);

    if (f.blocks) {
      drawBlocks(ctx.stage, f.blocks.y, f.blocks.n, f.blocks.win,
        f.blocks.title);
    }

    for (j = 0; j < (f.bufs || []).length && j < 3; j++) {
      b = f.bufs[j];
      drawBuf(ctx.stage, BX, BY[j], SNAME[j], b.vals, b.head, b.hot, b.tag);
    }

    if (f.out) {
      ctx.stage.appendChild(D.text('输出缓冲（归并段）',
        { x: OX, y: OY - 12, 'class': 'vz-tag', fill: '#9fb4dc',
          'text-anchor': 'start' }));
      for (j = 0; j < 9; j++) {
        x = OX + j * (OW + OG);
        c = D.C[j < f.out.length ? (j === f.outHot ? 'hot' : 'done') : 'mute'];
        ctx.stage.appendChild(D.el('rect', { x: x, y: OY, width: OW,
          height: OH, rx: 5, fill: c.fill, stroke: c.stroke,
          'stroke-width': j === f.outHot ? 2.8 : 1.5 }));
        if (j < f.out.length) {
          ctx.stage.appendChild(D.text(f.out[j],
            { x: x + OW / 2, y: OY + 21, 'class': 'vz-cellval' }));
        }
      }
    }

    for (j = 0; j < (f.notes || []).length && j < 3; j++) {
      ctx.stage.appendChild(D.text(f.notes[j],
        { x: f.nx || 636, y: (f.ny || 240) + j * 21, 'class': 'vz-info' }));
    }
    if (f.legend) {
      ctx.stage.appendChild(D.text(f.legend,
        { x: 44, y: 330, 'class': 'vz-info', fill: '#6ceaa5' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---------- 场景一：为什么要分两个阶段 ----------
   * 内部排序的前提是「全部记录都在内存里」，外排序一上来就不成立：
   * 内存只装得下 3 块，文件却有 30 块。于是只能先分段排好，再归并。 */
  function buildPhases() {
    var steps = [];
    var snap = function (o) {
      return { blocks: { y: o.by === undefined ? 200 : o.by, n: NBLK,
                         win: o.win || null, title: o.bt || '外存文件：' +
                           NBLK + ' 块（' + NREC + ' 条记录）' },
               lv: o.lv || null, lit: o.lit,
               nx: 60, ny: o.ny || 250,
               hdr: o.hdr, cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      hdr: '前提变了：内存装不下整个文件',
      cap: '内部排序的所有算法都假定「记录全在内存里」—— 文件 ' + NBLK +
           ' 块而内存只有 ' + MEM + ' 块，这个假定一上来就不成立',
      stats: { '文件': NBLK + ' 块 / ' + NREC + ' 条', '内存': MEM + ' 块',
               '装得下吗': '装不下', '结果': '内部排序全部失效' },
      notes: ['内部排序的下标 a[i] 随手就能访问，外存不行',
        '外存要按块读写，一次访问比一次内存比较贵几个数量级',
        '所以外排序的账不按比较次数算，按 I/O 次数算'] }), 0,
      '外部排序的起点是一个很硬的限制：内存装不下整个文件。' +
      '文件 ' + NBLK + ' 块，内存只有 ' + MEM + ' 块，内部排序里那种随手 a[i] 的访问方式没了。' +
      '而且一次磁盘访问比一次内存比较贵好几个数量级 —— 所以外排序的账要按 I/O 次数算。',
      ['内存装不下文件', '外存按块读写',
       '代价按 I/O 次数算']));

    steps.push(step(snap({
      win: [0, MEM - 1], by: 200,
      hdr: '阶段一：内存装得下多少，就排好多少 —— 得到初始归并段',
      cap: '每次读进 ' + MEM + ' 块，用内部排序（快排/堆排都行）排好再写回 —— 一段就叫一个「初始归并段 run」',
      stats: { '每次读入': MEM + ' 块', '内部排序': '快排 / 堆排',
               '写回后': '一个有序段', '共得到': NBLK / MEM + ' 个初始段' },
      notes: ['黄框就是当前读进内存的那 ' + MEM + ' 块',
        '排好后原地写回外存，段内有序、段间无序',
        NBLK + ' / ' + MEM + ' = ' + (NBLK / MEM) + ' 个初始归并段'],
      legend: '阶段一的 I/O：整个文件读一遍写一遍，恰好一趟' }), 1,
      '阶段一很朴素：内存能装 ' + MEM + ' 块就读 ' + MEM + ' 块，在内存里用任意一种内部排序排好，' +
      '再原地写回外存。这样一段叫一个「初始归并段」。' + NBLK + ' 块分成 ' + (NBLK / MEM) +
      ' 段，此时段内有序、段间无序，整个文件被读了一遍写了一遍 —— 一趟 I/O。',
      ['读满内存就排', '排好写回 → 一个 run',
       '得到 ' + (NBLK / MEM) + ' 个初始段']));

    steps.push(step(snap({
      win: [0, NBLK - 1], by: 200,
      hdr: '阶段二：把这些有序段归并成一个 —— 而归并不需要装下整段',
      cap: '归并只看每段的当前首元素，所以内存里每段留一块缓冲就够 —— 这才是外排序能成立的关键',
      stats: { '待归并': (NBLK / MEM) + ' 个有序段', '每段占内存': '1 块缓冲',
               '还需要': '1 块输出缓冲', '内存够吗': '够，与段长无关' },
      notes: ['归并时不必把整段读进内存',
        '每段只留一块输入缓冲，取完了再读下一块',
        '内存需求只和「段数 k」有关，与段有多长无关'],
      legend: '外排序成立的根据：归并是流式的，只看各段的当前首元素' }), 2,
      '阶段二把这些有序段归并起来。关键在于归并根本不需要把整段装进内存 —— ' +
      '它每次只看各段的当前首元素，所以每段在内存里留一块输入缓冲就够，取完了再去外存读下一块。' +
      '内存需求只与段数 k 有关，跟段有多长完全无关，外排序就是靠这一点成立的。',
      ['归并是流式的', '每段一块输入缓冲',
       '内存需求只和 k 有关']));

    steps.push(step(snap({
      lv: passes(NBLK / MEM, 2), lit: -1, by: 200, ny: 250,
      win: [0, NBLK - 1],
      hdr: '两阶段合起来：总代价 = 1 趟建段 + S 趟归并',
      cap: '归并不一定一趟做完：2 路归并每趟段数减半，' + (NBLK / MEM) +
           ' 段要 ' + (passes(NBLK / MEM, 2).length - 1) + ' 趟 —— 趟数就是下一个要压的东西',
      stats: { '阶段一': '1 趟', '阶段二（2 路）':
                 (passes(NBLK / MEM, 2).length - 1) + ' 趟',
               '总趟数': (1 + passes(NBLK / MEM, 2).length - 1) + ' 趟',
               '优化方向': '减少归并趟数' },
      notes: ['每一趟归并都要把整个文件读一遍写一遍',
        '所以趟数直接乘在 I/O 总量上',
        '下一个场景：k 路归并如何把趟数压下来'] }), -1,
      '两阶段合起来，总代价是 1 趟建段加 S 趟归并。而每一趟归并都要把整个文件完整读一遍写一遍，' +
      '趟数是直接乘在 I/O 总量上的。2 路归并每趟段数减半，' + (NBLK / MEM) + ' 段要 ' +
      (passes(NBLK / MEM, 2).length - 1) + ' 趟 —— 所以外排序优化的第一刀就砍在趟数上。',
      ['1 趟建段 + S 趟归并', '每趟都是全文件读写',
       '趟数直接乘 I/O']));

    return steps;
  }

  /* ---------- 场景二：归并趟数 S = ⌈log_k m⌉ ----------
   * m 个初始段、k 路归并，每趟段数变成 ⌈m/k⌉，所以趟数是以 k 为底的对数。
   * k 从 2 加到 5，趟数从 4 掉到 2 —— 这是外排序最直接的一刀。 */
  function buildPassCount() {
    var steps = [];
    var snap = function (o) {
      return { lv: o.lv, lit: o.lit === undefined ? -1 : o.lit,
               nx: 660, ny: o.ny || 150,
               hdr: o.hdr, cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var P2 = passes(M, 2), P3 = passes(M, 3), P5 = passes(M, 5);

    steps.push(step(snap({
      lv: P2, lit: 0,
      hdr: '归并树：最底一层是 ' + M + ' 个初始段，往上每一层就是一趟归并',
      cap: '格子里的数字是这一段由几个初始段合成的 —— 底层全是 1，顶上那个是 ' + M,
      stats: { '初始段数 m': M, '归并路数 k': 2,
               '每趟后段数': '⌈m / k⌉', '趟数 S': P2.length - 1 },
      notes: ['一趟归并 = 把相邻 k 段合成 1 段',
        '所以段数每趟变成 ⌈m / k⌉',
        '一直合到只剩 1 段，层数就是趟数'] }), 0,
      '把归并过程画成一棵树：最底一层是 ' + M + ' 个初始段，每往上一层就是一趟归并，' +
      '格子里的数字表示这一段由几个初始段合成。一趟归并把相邻 k 段并成 1 段，' +
      '段数每趟变成 ⌈m / k⌉，一直合到只剩一段 —— 层数减一就是趟数。',
      ['底层 = ' + M + ' 个初始段', '每趟段数 → ⌈m/k⌉',
       '层数 − 1 = 趟数']));

    var li;
    for (li = 1; li < P2.length; li++) {
      steps.push(step(snap({
        lv: P2, lit: li,
        hdr: '2 路归并第 ' + li + ' 趟：' + P2[li - 1].length + ' 段 → ' +
             P2[li].length + ' 段',
        cap: '这一趟要把整个文件完整读一遍、写一遍 —— 每一趟的 I/O 代价都是一样的',
        stats: { '本趟前': P2[li - 1].length + ' 段',
                 '本趟后': P2[li].length + ' 段',
                 '本趟 I/O': '全文件读 1 遍写 1 遍',
                 '还剩几趟': (P2.length - 1 - li) + ' 趟' },
        notes: ['⌈' + P2[li - 1].length + ' / 2⌉ = ' + P2[li].length + ' 段',
          '注意 2 路归并时 ' + P2[li - 1].length +
            (P2[li - 1].length % 2 ? ' 是奇数，末尾那段直接抬上去' : ' 是偶数，两两配对'),
          '不管段数多少，本趟 I/O 都是全文件一遍'] }), 1,
        '第 ' + li + ' 趟归并把 ' + P2[li - 1].length + ' 段合成 ' + P2[li].length +
        ' 段。要紧的是：不论这一趟处理几段，它都要把整个文件读一遍写一遍，' +
        '每趟 I/O 代价完全相同。所以想省 I/O，唯一的办法就是让趟数变少。',
        [P2[li - 1].length + ' 段 → ' + P2[li].length + ' 段',
         '本趟 I/O = 全文件一遍',
         '剩 ' + (P2.length - 1 - li) + ' 趟']));
    }

    steps.push(step(snap({
      lv: P3, lit: -1,
      hdr: '换成 3 路归并：趟数从 ' + (P2.length - 1) + ' 掉到 ' + (P3.length - 1),
      cap: 'S = ⌈log_k m⌉ —— k 出现在对数的底上，所以 k 稍微加大，趟数立刻掉下来',
      stats: { 'k = 2': (P2.length - 1) + ' 趟', 'k = 3': (P3.length - 1) + ' 趟',
               '公式': 'S = ⌈log_k m⌉', 'I/O 省了': '1 趟全文件读写' },
      notes: ['⌈log₂10⌉ = 4，⌈log₃10⌉ = 3',
        'k 在对数底上，增大 k 的收益是「除以 log k」',
        '归并树变矮变宽，一趟处理的段更多'] }), 2,
      '把 2 路换成 3 路，归并树立刻变矮：⌈log₂10⌉ = ' + (P2.length - 1) +
      ' 趟变成 ⌈log₃10⌉ = ' + (P3.length - 1) + ' 趟。' +
      '趟数公式 S = ⌈log_k m⌉ 里 k 站在对数的底上，所以增大 k 的收益是「整个趟数除以 log k」—— 这是很陡的下降。',
      ['S = ⌈log_k m⌉', 'k 在对数底上',
       '4 趟 → 3 趟']));

    steps.push(step(snap({
      lv: P5, lit: -1,
      hdr: '5 路归并：只剩 ' + (P5.length - 1) + ' 趟',
      cap: 'k = 2 → 4 趟，k = 3 → 3 趟，k = 5 → 2 趟，k = ' + M + ' → 1 趟就归并完',
      stats: { 'k = 2': (P2.length - 1) + ' 趟', 'k = 3': (P3.length - 1) + ' 趟',
               'k = 5': (P5.length - 1) + ' 趟', 'k = 10': '1 趟' },
      notes: ['k 增大到 m 时一趟就能合完',
        '看起来 k 越大越好 —— 但事情没这么简单',
        '内存要开 k + 1 个缓冲，且内部比较次数会涨'],
      legend: '下一步的疑问：既然 k 越大趟数越少，为什么不把 k 开到最大？' }), 3,
      'k = 5 时只要 2 趟，k 加到 ' + M + ' 更是一趟就归并完。照这个趋势看似 k 越大越好 —— ' +
      '但内存要为每路开一块输入缓冲，k 大了缓冲就小、每块装的记录少，读写反而更零碎；' +
      '更要紧的是内部比较次数会跟着涨。下面先看清一趟 k 路归并到底在做什么。',
      ['k = 5 → 2 趟', 'k 越大趟数越少',
       '但内存与比较次数要付账']));

    return steps;
  }

  /* ---------- 场景三：一趟 3 路归并具体怎么做 ----------
   * k 个输入缓冲各露出一个首元素，从这 k 个里挑最小的写进输出缓冲，
   * 那一路的头指针前移。朴素做法每输出一个要比 k−1 次。 */
  function buildOneMerge() {
    var steps = [];
    var head = [0, 0, 0], out = [], cmp = 0;

    var snap = function (o) {
      var bufs = [], j;
      for (j = 0; j < 3; j++) {
        bufs.push({ vals: SEG[j], head: head[j],
                    hot: o.hot === j, tag: o.tag && o.tag[j] });
      }
      return { bufs: bufs, out: out.slice(),
               outHot: o.outHot === undefined ? -1 : o.outHot,
               nx: 380, ny: 240,
               hdr: o.hdr || '一趟 3 路归并：从 3 个首元素里挑最小',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var live = function () {
      var j, n = 0;
      for (j = 0; j < 3; j++) if (head[j] < SEG[j].length) n++;
      return n;
    };
    var base = function () {
      return { '已输出': out.length + ' / 9', '比较次数': cmp,
               '还剩几路': live() + ' 路',
               '输出序列': out.join(' ') || '（空）' };
    };

    steps.push(step(snap({
      cap: '3 个有序段各占一块输入缓冲，缓冲里露出的第一个就是这一路当前最小的',
      stats: { '路数 k': 3, '输入缓冲': '3 块',
               '输出缓冲': '1 块', '内存共需': 'k + 1 块' },
      notes: ['每一路自己是有序的，所以首元素就是这一路的最小',
        '全局最小一定在这 3 个首元素之中',
        '内存里一共只要 k + 1 块缓冲'] }), 0,
      '一趟 k 路归并的场面是这样的：k 个有序段各占一块输入缓冲，' +
      '每块露出的第一个元素就是这一路当前的最小值。' +
      '既然每一路自己有序，全局最小就一定在这 k 个首元素里 —— 内存只要 k + 1 块缓冲。',
      ['k 路各一块输入缓冲', '首元素 = 该路最小',
       '全局最小在这 k 个里']));

    var guard = 0;
    while (live() && guard++ < 12) {
      var best = -1, j;
      for (j = 0; j < 3; j++) {
        if (head[j] >= SEG[j].length) continue;
        if (best < 0) { best = j; continue; }
        cmp++;
        if (SEG[j][head[j]] < SEG[best][head[best]]) best = j;
      }
      var tg = [null, null, null];
      for (j = 0; j < 3; j++) {
        if (head[j] < SEG[j].length) tg[j] = j === best ? '← 最小' : '';
      }
      steps.push(step(snap({
        hot: best, tag: tg,
        cap: '比较 3 个首元素 ' + (function () {
          var a = [], q;
          for (q = 0; q < 3; q++) {
            if (head[q] < SEG[q].length) a.push(SEG[q][head[q]]);
          }
          return a.join(' / ');
        })() + '，最小的是 ' + SEG[best][head[best]] + '（第 ' + (best + 1) + ' 路）',
        stats: base(),
        notes: ['还剩 ' + live() + ' 路 → 要比 ' + (live() - 1) + ' 次',
          '累计比较 ' + cmp + ' 次',
          '朴素做法：每输出一个都要重新比 k − 1 次'] }), 2,
        '从 ' + live() + ' 个首元素里挑最小，朴素做法就是一路顺着比下去，要比 ' +
        (live() - 1) + ' 次，选出 ' + SEG[best][head[best]] + '。' +
        '注意这些比较的结果下一轮全部作废 —— 只换掉了一个数，却要把所有比较重做一遍。',
        ['比 ' + (live() - 1) + ' 次选最小',
         '得到 ' + SEG[best][head[best]],
         '累计 ' + cmp + ' 次']));

      out.push(SEG[best][head[best]]);
      head[best]++;
      steps.push(step(snap({
        hot: best, outHot: out.length - 1,
        cap: SEG[best][head[best] - 1] + ' 写进输出缓冲，第 ' + (best + 1) +
             ' 路的头指针前移' + (head[best] >= SEG[best].length ?
               ' —— 这一路取空了' : ''),
        stats: base(),
        notes: ['输出缓冲：' + out.join(' '),
          head[best] >= SEG[best].length
            ? '第 ' + (best + 1) + ' 路缓冲空了 → 去外存读它的下一块'
            : '第 ' + (best + 1) + ' 路露出下一个：' + SEG[best][head[best]],
          '输出缓冲满了就整块写回外存'] }), 4, '', []));
      steps[steps.length - 1].line = 4;
      steps[steps.length - 1].narr = SEG[best][head[best] - 1] +
        ' 写进输出缓冲，第 ' + (best + 1) + ' 路头指针前移。' +
        (head[best] >= SEG[best].length
          ? '这一路的缓冲取空了，真实实现里要去外存读它的下一块 —— 缓冲区的作用就是把零散的取数攒成整块 I/O。'
          : '它露出下一个 ' + SEG[best][head[best]] + '，下一轮继续在 k 个首元素里挑。');
      steps[steps.length - 1].act = ['写出 ' + SEG[best][head[best] - 1],
        '第 ' + (best + 1) + ' 路前移',
        head[best] >= SEG[best].length ? '该路缓冲空，需补读' : '已输出 ' + out.length + ' 个'];
    }

    steps.push(step(snap({
      hdr: '这一趟归并完成：' + out.join(' '),
      cap: '输出 ' + out.length + ' 个记录共比较 ' + cmp +
           ' 次 —— 平均每个 ' + (cmp / out.length).toFixed(1) + ' 次，正是 k − 1',
      stats: { '输出记录': out.length, '总比较': cmp,
               '每个记录': '(k − 1) 次', '总计': '(n − 1)(k − 1)' },
      notes: ['朴素选最小：每输出一个比 k − 1 次',
        '归并 n 个记录共 (n − 1)(k − 1) 次比较',
        'k 变大时这一项跟着线性变大 —— 抵消了趟数的收益'],
      legend: '趟数省下的 I/O 被内部比较吃掉了多少？下一场景把两笔账放一起算' }), -1,
      '这一趟归并完成，输出 ' + out.length + ' 个记录用了 ' + cmp + ' 次比较，' +
      '平均每个记录 k − 1 = 2 次。推广开来，归并 n 个记录要 (n − 1)(k − 1) 次比较 —— ' +
      'k 变大时这一项是线性增长的，而趟数只是按 log k 下降。两笔账要放一起算。',
      ['每个记录 k − 1 次', '总共 (n−1)(k−1) 次',
       '随 k 线性增长']));

    return steps;
  }

  /* ---------- 场景四：k 大了内部比较反而变多 ----------
   * 总比较次数 ≈ (n − 1)(k − 1)·⌈log_k m⌉。
   * (k − 1) / log k 随 k 单调增，所以朴素选最小时 k 越大内部比较越多 ——
   * 败者树把「每次 k − 1 次」降到「⌈log₂k⌉ 次」，这一项才被抹平。 */
  function buildWhyLoser() {
    var steps = [];
    var KS = [2, 3, 5, 10];

    var snap = function (o) {
      return { lv: o.lv || null, lit: o.lit === undefined ? -1 : o.lit,
               nx: 60, ny: o.ny || 250,
               hdr: o.hdr, cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    /* 朴素归并的内部比较总量，按 (k−1)·S 计（省掉公共因子 n−1） */
    function cost(k) { return (k - 1) * (passes(M, k).length - 1); }

    steps.push(step(snap({
      lv: passes(M, 2), lit: -1,
      hdr: '两笔账放一起：趟数按 log k 降，每趟比较按 k 线性升',
      cap: '总比较 ≈ (n − 1)(k − 1)·⌈log_k m⌉ —— (k − 1) 在分子上，log k 在分母上',
      stats: { '趟数': 'S = ⌈log_k m⌉', '每记录比较': 'k − 1',
               '总比较': '(n−1)(k−1)·S', '关键比值': '(k − 1) / log k' },
      notes: ['⌈log_k m⌉ 可以写成 ⌈log₂m / log₂k⌉',
        '于是总比较正比于 (k − 1) / log₂k',
        '这个比值随 k 单调增 —— 方向和我们想要的相反'] }), 0,
      '现在把两笔账放到一起。趟数 S = ⌈log_k m⌉ 可以写成 ⌈log₂m / log₂k⌉，' +
      '而每个记录每趟要比 k − 1 次，所以总比较次数正比于 (k − 1) / log₂k。' +
      '这个比值随 k 单调递增 —— 也就是说 k 越大，内部比较越多，方向正好和省 I/O 相反。',
      ['趟数 ∝ 1 / log₂k', '每趟比较 ∝ k − 1',
       '总量 ∝ (k−1)/log₂k']));

    var i;
    for (i = 0; i < KS.length; i++) {
      var k = KS[i], P = passes(M, k), S = P.length - 1;
      steps.push(step(snap({
        lv: P, lit: -1,
        hdr: 'k = ' + k + '：趟数 ' + S + '，每记录比较 ' + (k - 1) +
             ' 次 → 相对总量 ' + cost(k),
        cap: 'I/O 从 ' + (passes(M, 2).length - 1) + ' 趟降到 ' + S +
             ' 趟，可内部比较从 ' + cost(2) + ' 涨到 ' + cost(k) +
             '（以 n − 1 为单位）',
        stats: { 'k': k, '趟数 S': S,
                 '每记录比较': (k - 1) + ' 次',
                 '(k−1)·S': cost(k) },
        notes: ['归并树 ' + P.length + ' 层，' + S + ' 趟归并',
          '每趟每记录比 ' + (k - 1) + ' 次 → 合计 ' + cost(k) + '(n−1)',
          k === 2 ? '这是比较次数最少的一档' :
            '比 k = 2 多了 ' + (cost(k) - cost(2)) + '(n−1) 次比较'] }), 1,
        'k = ' + k + ' 时归并 ' + S + ' 趟，每个记录每趟比 ' + (k - 1) +
        ' 次，合计 ' + cost(k) + ' 倍的 (n − 1)。' +
        (k === 2 ? '这是内部比较最省的一档 —— 但 I/O 最贵。'
                 : 'I/O 少了，比较却比 k = 2 多出 ' + (cost(k) - cost(2)) +
                   ' 倍 —— 单靠加大 k，省下的磁盘时间要被 CPU 时间侵蚀。'),
        ['k = ' + k + '，S = ' + S,
         '每记录 ' + (k - 1) + ' 次',
         '相对总量 ' + cost(k)]));
    }

    steps.push(step(snap({
      lv: passes(M, M), lit: -1, ny: 250,
      hdr: '症结：那 k − 1 次比较里，绝大多数是白比的',
      cap: '每输出一个记录只换掉了 k 个首元素中的一个，其余 k − 1 个的胜负关系完全没变 —— 却被重比了一遍',
      stats: { '每轮变化': '只有 1 路换了首元素',
               '朴素做法': '重比 k − 1 次',
               '真正需要': '只更新这一路的胜负',
               '理论下限': '⌈log₂k⌉ 次' },
      notes: ['上一轮已经比出来的大小关系没有失效',
        '只有被取走那一路的位置需要重新定',
        '沿着一条根到叶的路径更新即可 → ⌈log₂k⌉ 次'] }), 5,
      '症结找到了：每输出一个记录，k 个首元素里只换掉了一个，其余 k − 1 个之间的胜负关系一点没变，' +
      '朴素做法却把它们全部重比了一遍。真正需要做的只是「把新来的这个数放回正确位置」—— ' +
      '若把上一轮的比较结果保存成一棵树，沿一条根到叶的路径更新就够，代价 ⌈log₂k⌉ 次。',
      ['只换了 1 个首元素', '其余胜负关系未变',
       '重比 k−1 次是浪费']));

    steps.push(step(snap({
      lv: passes(M, 5), lit: -1,
      hdr: '结论：败者树把 k − 1 降成 ⌈log₂k⌉，k 才真的可以放大',
      cap: '有了败者树，总比较 ∝ ⌈log₂k⌉ / log₂k ≈ 常数 —— 增大 k 只减 I/O，不再多花比较',
      stats: { '朴素选最小': '(k − 1) 次 / 记录',
               '败者树': '⌈log₂k⌉ 次 / 记录',
               'k = 10 时': '9 次 → 4 次',
               'k 的上限': '改由内存缓冲块数决定' },
      notes: ['败者树：k 个叶子存段，内部结点存「败者」',
        '每次只沿一条路径回溯 ⌈log₂k⌉ 层',
        '此后限制 k 的不再是比较次数，而是内存能开多少缓冲'],
      legend: '外排序的两条主线：多路归并压趟数（本节），置换选择加长初始段减小 m（后一节）' }), -1,
      '所以下一节的败者树不是花招，而是这里逼出来的：它把每输出一个记录的比较从 k − 1 次降到 ⌈log₂k⌉ 次，' +
      'k = 10 时是 9 次变 4 次。这样总比较正比于 ⌈log₂k⌉ / log₂k，基本是常数，' +
      '增大 k 就只剩省 I/O 的好处 —— 此后限制 k 的是内存能开多少缓冲，而不是 CPU。',
      ['败者树 → ⌈log₂k⌉ 次', 'k 可以放心加大',
       '上限改由内存决定']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['external-merge'] = {
    title: '多路平衡归并 k-way Balanced Merge',
    subtitle: '内存装不下整个文件，只能先分段排好再归并；而每趟归并都要把全文件读写一遍，' +
      '所以外排序的功夫全花在压趟数上：S = ⌈log_k m⌉，加大 k 立刻见效 —— 代价是每趟内部比较变多。',
    height: 700,
    code: [
      '// 阶段一：内存装满一次就内部排序一次 → m 个初始归并段',
      '// 阶段二：k 路归并，每趟段数 → ⌈m / k⌉',
      'while (段数 > 1) {',
      '    每次取 k 段，各读一块进输入缓冲;',
      '    while (k 路未取空) {',
      '        从 k 个首元素中选最小 → 输出缓冲;   // 朴素：k-1 次比较',
      '        该路头指针前移，缓冲空则补读下一块;',
      '    }',
      '}   // 趟数 S = ⌈log_k m⌉，总 I/O = (S + 1) 遍全文件'
    ],
    scenes: [
      { name: '为什么分两阶段', build: buildPhases,
        codeTag: '建段 + 归并',
        code: [
          '// 内部排序的前提：全部记录在内存中 —— 外排序不成立',
          '// 阶段一：读满内存 → 内部排序 → 写回，得一个初始归并段',
          'for (每 MEM 块) { 读入; QuickSort; 写回; }   // m 个 run',
          '// 阶段二：归并不必装下整段，每段只留一块输入缓冲',
          '//   归并是流式的：只看各段的当前首元素',
          '//   内存需求 = k + 1 块，与段长无关 ← 外排序成立的根据',
          '// 总代价 = 1 趟建段 + S 趟归并，每趟都是全文件读写一遍'
        ] },
      { name: '趟数 S = ⌈log_k m⌉', build: buildPassCount,
        codeTag: 'k 在对数的底上',
        code: [
          '// 一趟归并：相邻 k 段 → 1 段，段数变 ⌈m / k⌉',
          'S = 0;  cur = m;',
          'while (cur > 1) { cur = ceil(cur / k);  S++; }',
          '// 即 S = ⌈log_k m⌉ = ⌈log2(m) / log2(k)⌉',
          '// m = 10: k=2 → 4 趟   k=3 → 3 趟',
          '//         k=5 → 2 趟   k=10 → 1 趟',
          '// 每趟 I/O 都是全文件一遍 → 趟数直接乘在总 I/O 上'
        ] },
      { name: '一趟 3 路归并', build: buildOneMerge,
        codeTag: '选最小写输出',
        code: [
          '// k 个输入缓冲 + 1 个输出缓冲',
          'while (仍有未取空的路) {',
          '    q = 首个未空的路;',
          '    for (j = q+1; j < k; j++)              // k-1 次比较',
          '        if (buf[j][head[j]] < buf[q][head[q]]) q = j;',
          '    out[++t] = buf[q][head[q]++];          // 写输出缓冲',
          '    if (head[q] 越界) 读该段下一块;         // 补读',
          '    if (输出缓冲满) 整块写回外存;',
          '}   // 共 (n-1)(k-1) 次比较'
        ] },
      { name: 'k 大了为何反而慢', build: buildWhyLoser,
        codeTag: '(k−1)/log₂k 单调增',
        code: [
          '// 总内部比较 ≈ (n-1)(k-1)·⌈log_k m⌉',
          '//            = (n-1)·(k-1)/log2(k) · log2(m)',
          '// (k-1)/log2(k)：k=2 → 1.0   k=5 → 1.72   k=10 → 2.71',
          '// 单调增 → 朴素选最小时，k 越大内部比较越多',
          '// 症结：每轮只换掉 1 个首元素，其余胜负关系没变却全重比',
          '// 办法：把比较结果存成树，只沿一条路径更新 → ⌈log2(k)⌉ 次',
          '//      这就是败者树；此后 (k-1) 变 ⌈log2 k⌉，k 可放心加大'
        ] }
    ]
  };
})();
