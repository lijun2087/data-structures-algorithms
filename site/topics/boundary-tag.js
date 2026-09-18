/* 边界标识法 — 第8章
 * 场景一：首次拟合 —— 从 avail 顺着 rlink 找，第一个够大的就切给用户；
 *         余量小于阈值 e 就整块给出去，免得剩下一堆切不动的碎渣。
 * 场景二：最佳拟合 —— 整条链走满一圈挑余量最小的，保住大块，
 *         代价是每次都要 O(n)，而且专爱留下极小的空闲块。
 * 场景三：回收与合并 —— 底部标识让「物理相邻的前一块」一步就能摸到，
 *         左右邻居的四种占空组合各有各的接法。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 内存条布局：全长 400 个字画成 x=56…936 的长条，1 字 = 2.2px，
   * 最小的块 20 字 = 44px，塞得下两位数的 size。
   * 竖直方向自上而下：标题 104、说明 126 / 146、空闲链弧 164…186、
   * 内存条 186…234（头部标志带 188、底部标志带 220）、地址 248、
   * avail 266、p 与邻居标记 284、两行要点 308 / 328，全在 330 以内。 */
  var MEM = 400, BX = 56, BW = 880, SC = BW / MEM;
  var BY = 186, BH = 48, TAGH = 13;
  var E = 40;                    // 余量阈值 e：小于它就不再切，整块给出去

  function px(a) { return BX + a * SC; }
  function ccOf(b) { return px(b.a) + b.n * SC / 2; }

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  // 每帧都要留一份块表的副本，不然回退重放会串味
  function cpBlocks(bs) {
    var r = [], i;
    for (i = 0; i < bs.length; i++) {
      r.push({ a: bs[i].a, n: bs[i].n, free: bs[i].free });
    }
    return r;
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

  /* f = { blocks:[{a,n,free}], st:{下标:状态}, chain:[空闲链上的块下标],
   *       wrap:bool（补一条虚线弧表示链是循环的）,
   *       tags:[{idx,txt,y,color}], hdr, cap1, cap2, notes, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var bs = f.blocks, i, b, x, w, c, t;

    ctx.stage.appendChild(D.text(f.hdr || '边界标识法　可利用空间 400 字',
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 126, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 146, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    /* 空闲链的弧画在内存条上方。相邻两块走 166 那一档（弧顶约 170），
     * 表示「首尾相接」的那条虚线走 150 一档（弧顶约 158），两档不打架。 */
    if (f.chain) {
      for (i = 0; i + 1 < f.chain.length; i++) {
        arc(ctx, ccOf(bs[f.chain[i]]), ccOf(bs[f.chain[i + 1]]), 166, false);
      }
      if (f.wrap && f.chain.length > 1) {
        arc(ctx, ccOf(bs[f.chain[f.chain.length - 1]]),
            ccOf(bs[f.chain[0]]), 150, true);
      }
    }

    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      x = px(b.a); w = b.n * SC;
      c = D.C[f.st[i] || (b.free ? 'mute' : 'active')];
      ctx.stage.appendChild(D.el('rect', { x: x, y: BY, width: w, height: BH,
        rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));

      /* 头部标志带与底部标志带 —— 「边界标识」这名字就是指这一头一尾两条带。
       * 头部 188…200 放 tag，底部 220…232 放 tag 与 uplink。 */
      ctx.stage.appendChild(D.el('rect', { x: x + 2, y: BY + 2, width: w - 4,
        height: TAGH - 1, rx: 3, fill: '#0f1728', stroke: c.stroke,
        'stroke-width': 0.8 }));
      ctx.stage.appendChild(D.el('rect', { x: x + 2, y: BY + BH - TAGH - 1,
        height: TAGH - 1, width: w - 4, rx: 3, fill: '#0f1728',
        stroke: c.stroke, 'stroke-width': 0.8 }));
      t = b.free ? 'tag=0' : 'tag=1';
      if (w >= 58) {
        ctx.stage.appendChild(D.text(t,
          { x: x + w / 2, y: BY + 12, 'class': 'vz-slot' }));
        ctx.stage.appendChild(D.text('↑ uplink',
          { x: x + w / 2, y: BY + BH - 4, 'class': 'vz-slot' }));
      } else {
        ctx.stage.appendChild(D.text(b.free ? '0' : '1',
          { x: x + w / 2, y: BY + 12, 'class': 'vz-slot' }));
        ctx.stage.appendChild(D.text('↑',
          { x: x + w / 2, y: BY + BH - 4, 'class': 'vz-slot' }));
      }

      // 块中间写 size；窄块只写数字，宽块带上「字」
      ctx.stage.appendChild(D.text(w >= 76 ? b.n + ' 字' : b.n,
        { x: x + w / 2, y: BY + 30, 'class': 'vz-cellval' }));

      // 起始地址标在块的左边界下方，紧贴分界线，一眼能对上
      t = D.text(b.a, { x: x, y: BY + BH + 16, 'class': 'vz-idx' });
      t.setAttribute('text-anchor', 'start');
      ctx.stage.appendChild(t);
    }
    t = D.text(MEM, { x: BX + BW, y: BY + BH + 16, 'class': 'vz-idx' });
    t.setAttribute('text-anchor', 'end');
    ctx.stage.appendChild(t);

    for (i = 0; i < (f.tags || []).length; i++) {
      var g = f.tags[i];
      ctx.stage.appendChild(D.text(g.txt, { x: ccOf(bs[g.idx]), y: g.y,
        'class': 'vz-ptr', fill: g.color || '#6ceaa5' }));
    }

    for (i = 0; i < (f.notes || []).length && i < 2; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: 44, y: 306 + i * 22, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function arc(ctx, x1, x2, cy, dash) {
    var o = { d: 'M ' + x1 + ' ' + (BY - 2) + ' C ' + x1 + ' ' + cy + ', ' +
                 x2 + ' ' + cy + ', ' + x2 + ' ' + (BY - 2),
              fill: 'none', stroke: dash ? D.LINE.mute : D.LINE.ptr,
              'stroke-width': dash ? 1.5 : 2, 'marker-end': 'url(#vzPtr)' };
    if (dash) { o['stroke-dasharray'] = '5 4'; o['marker-end'] = 'url(#vzMute)'; }
    ctx.stage.appendChild(D.el('path', o));
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  // 空闲链上的结点：这里按地址顺序串，够说明问题，也免得弧线交叉看不清
  function chainOf(bs) {
    var r = [], i;
    for (i = 0; i < bs.length; i++) if (bs[i].free) r.push(i);
    return r;
  }

  function initBlocks() {
    return [
      { a: 0,   n: 30,  free: true },
      { a: 30,  n: 50,  free: false },
      { a: 80,  n: 110, free: true },
      { a: 190, n: 40,  free: false },
      { a: 230, n: 70,  free: true },
      { a: 300, n: 60,  free: false },
      { a: 360, n: 40,  free: true }
    ];
  }

  // 从第 i 块的高地址端划出 k 个字：低端留在链上原位，高端交给用户
  function carve(bs, i, k) {
    var b = bs[i];
    b.n -= k;
    bs.splice(i + 1, 0, { a: b.a + b.n, n: k, free: false });
    return i + 1;
  }

  /* ---------- 场景一：首次拟合 ---------- */
  /* 顺着 rlink 从 avail 走，第一个够大的就用。两次请求正好打到两条分支：
   * 请 60 时余量 50 ≥ e，切一刀；请 40 时余量 10 < e，整块给出去。 */
  function buildFirst() {
    var steps = [], bs = initBlocks(), st = {};

    var snap = function (o) {
      var fi = freeInfo(bs);
      return { blocks: cpBlocks(bs), st: cp(st), chain: chainOf(bs),
               wrap: true, tags: o.tags || [],
               hdr: o.hdr || '首次拟合　可利用空间 400 字，阈值 e = ' + E,
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [],
               stats: o.stats || { '空闲结点数': fi.cnt,
                 '空闲总量': fi.sum + ' 字', '最大空闲块': fi.max + ' 字',
                 '阈值 e': E + ' 字' } };
    };
    var avail = function (i) {
      return [{ idx: i, txt: 'avail', y: 270, color: '#6ceaa5' }];
    };
    var pAt = function (i, ai) {
      return [{ idx: ai, txt: 'avail', y: 270, color: '#6ceaa5' },
              { idx: i, txt: 'p', y: 290, color: '#ffd166' }];
    };

    steps.push(step(snap({
      cap1: '每一块的头部和底部各有一条标志带 —— 这就是「边界标识」',
      cap2: '头部 llink | tag | size | uplink，底部 uplink | tag，tag=0 空闲、tag=1 占用',
      tags: avail(0),
      notes: ['头部的 llink、rlink 把所有空闲块串成一条双向循环链',
        '底部那条 uplink 指回本块头部 —— 回收时全靠它，下一场景细说'] }), 0,
      '内存被切成一串块，每块的头尾各加一条标志带：头部存 llink、tag、size、uplink，' +
      '底部存 uplink 和 tag。tag=0 是空闲，tag=1 是占用。',
      ['头部：llink|tag|size|uplink', '底部：uplink|tag',
       'tag=0 空闲，tag=1 占用']));

    steps.push(step(snap({
      cap1: '空闲块共 4 个，串成一条双向循环链，表头指针叫 avail',
      cap2: '占用块不进链 —— 链上只有空闲块，所以查找的代价只和空闲块个数有关',
      tags: avail(0),
      notes: ['空闲总量 250 字，但它们分散在 4 段里',
        '双向循环：走到末尾接回表头，从任一结点都能绕一圈'] }), 2,
      '4 个空闲块用 llink、rlink 串成双向循环链，表头指针 avail 指着其中一个。' +
      '占用块不上链，所以查找代价只和空闲块的个数有关。',
      ['4 个空闲块上链', 'avail 是表头指针', '占用块不进链']));

    // 请求 60：0 号块不够，跳到 80 号那个 110 字的大块，余量 50 ≥ e，切一刀
    st = {}; st[0] = 'bad';
    steps.push(step(snap({
      cap1: 'Alloc(60)：从 avail 起沿 rlink 走，先看 0 号块 —— 30 < 60，不够',
      cap2: '首次拟合的规矩是「不够就往后走」，一个也不多比',
      tags: pAt(0, 0),
      notes: ['30 < 60，这一块装不下，p = p->rlink 继续',
        '首次拟合不关心后面有没有更合适的，够用就停'] }), 4,
      '请求 60 字。p 从 avail 出发，第一个是 0 号块，只有 30 字，不够，' +
      'p 顺着 rlink 往后走。首次拟合的规矩就是不够就走，够了就停。',
      ['Alloc(60)', '0 号块 30 < 60', 'p = p->rlink']));

    st = {}; st[2] = 'hot';
    steps.push(step(snap({
      cap1: '第二块地址 80、大小 110 —— 110 ≥ 60，够了，查找到此结束',
      cap2: '这时后面还有 70 字的块更贴合，但首次拟合根本不去看',
      tags: pAt(2, 0),
      notes: ['找到就停：查找期望长度短，这是首次拟合最大的好处',
        '代价是靠前的大块反复被切，越切越零碎'] }), 5,
      '第二块 110 字，够了，查找立刻结束。后面 230 处那个 70 字的块其实更贴合，' +
      '但首次拟合不看 —— 省下的正是这些比较。',
      ['110 ≥ 60，命中', '查找结束', '后面更贴合的块不再比']));

    var ci = carve(bs, 2, 60);
    st = {}; st[2] = 'good'; st[ci] = 'done';
    steps.push(step(snap({
      cap1: '余量 110 − 60 = 50 ≥ e，值得留 —— 从高地址端割 60 字给用户',
      cap2: '低地址那 50 字仍留在链上原位，llink、rlink 一个都不用改，只把 size 改小',
      tags: [{ idx: 2, txt: '留 50', y: 270, color: '#6ceaa5' },
             { idx: ci, txt: '分给用户 60', y: 290, color: '#ffd166' }],
      notes: ['从高端切走的好处：低端结点在链上的位置和指针全都不动',
        '只需改 size，再给新块打上 tag=1 的头尾标志'] }), 6,
      '余量 50 不小于阈值 e=40，值得保留，于是从这块的高地址端割 60 字给用户。' +
      '低端那 50 字仍在链上原位，只把 size 改小，指针一个都不用动。',
      ['110 − 60 = 50 ≥ e', '从高端切走 60 字', '低端留在链上，只改 size']));

    // 请求 40：走到 80 号那块只剩 50，余量 10 < e，整块给出去
    st = {}; st[0] = 'bad'; st[2] = 'hot';
    steps.push(step(snap({
      cap1: 'Alloc(40)：0 号块 30 < 40 跳过，第二块剩 50 —— 50 ≥ 40，命中',
      cap2: '可这回余量只有 50 − 40 = 10 字，比阈值 e 小得多',
      tags: pAt(2, 0),
      notes: ['10 字的空闲块几乎没人能用，却要占一个链结点',
        '每次查找都得路过它、比较它 —— 这种碎渣越攒越拖后腿'] }), 5,
      '再请求 40 字。0 号块跳过，第二块现在只剩 50，仍然够用。可余量是 10 字 —— ' +
      '这么小的块几乎没人能用，留着还得占一个链结点，每次查找都要路过。',
      ['Alloc(40)', '50 ≥ 40，命中', '余量只剩 10 字']));

    bs[2].free = false;
    st = {}; st[2] = 'done';
    steps.push(step(snap({
      cap1: '余量 10 < e，索性整块 50 字全给用户 —— 多给 10 字，换掉一个碎渣',
      cap2: '这一块从链上摘下：llink 与 rlink 对接，tag 改成 1',
      tags: [{ idx: 2, txt: '整块 50 全给出去', y: 270, color: '#ffd166' }],
      notes: ['宁可多给 10 字，也不留一个切不动的小结点',
        '摘链：p->llink->rlink = p->rlink，p->rlink->llink = p->llink'] }), 8,
      '余量小于 e，就把这 50 字整块给出去。多给的 10 字用户用不上，但换掉了一个' +
      '谁都用不了、还要占链结点的碎渣 —— 这笔账划得来。',
      ['余量 < e，整块给出', '从链上摘下这个结点',
       '多给 10 字换掉一个碎渣']));

    st = {};
    steps.push(step(snap({
      hdr: '外部碎片：空闲总量 140 字，最大的一块只有 70',
      cap1: '此刻若来一个 100 字的请求，只能失败 —— 空间够，却没一段连着够',
      cap2: '这些零散空闲叫外部碎片，是切分反复进行的必然结果',
      tags: [],
      stats: { '空闲总量': '140 字', '最大空闲块': '70 字',
               '请求 100 字': '失败', '成因': '外部碎片' },
      notes: ['首次拟合总从表头切，靠前的大块被反复削小',
        '所以书上常让 avail 每次分配后指向下一个结点，摊开切点'] }), -1,
      '两次分配后空闲共 140 字，可最大的一块只有 70 —— 来个 100 字的请求就得失败。' +
      '空间够却不连续，这叫外部碎片，是反复切分躲不开的结果。',
      ['空闲 140，最大块 70', '100 字请求会失败', '这就是外部碎片']));

    return steps;
  }

  /* ---------- 场景二：最佳拟合 ---------- */
  /* 同样的初始局面、同样请求 60，最佳拟合绕满一圈挑余量最小的：
   * 首次拟合会切 110 那个大块，最佳拟合挑中 70 —— 大块保住了。 */
  function buildBest() {
    var steps = [], bs = initBlocks(), st = {};

    var snap = function (o) {
      var fi = freeInfo(bs);
      return { blocks: cpBlocks(bs), st: cp(st), chain: chainOf(bs),
               wrap: true, tags: o.tags || [],
               hdr: o.hdr || '最佳拟合　同样的局面，同样请求 60 字',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [],
               stats: o.stats || { '空闲结点数': fi.cnt,
                 '空闲总量': fi.sum + ' 字', '最大空闲块': fi.max + ' 字',
                 '已比较': o.cmp == null ? 0 : o.cmp } };
    };

    steps.push(step(snap({
      cmp: 0,
      cap1: '最佳拟合的规矩：整条链走满一圈，挑余量最小的那一块',
      cap2: '找到够大的也不停 —— 必须比完全部，才知道谁最贴合',
      tags: [{ idx: 0, txt: 'avail', y: 270, color: '#6ceaa5' }],
      notes: ['首次拟合是「够就停」，最佳拟合是「比完再挑」',
        '所以每次分配都是 O(n)，n 是空闲结点个数'] }), 1,
      '最佳拟合换了个规矩：不是遇上够大的就停，而是把整条链走满一圈，挑余量最小的那块。' +
      '好处显而易见，代价是每次分配都要 O(n)。',
      ['走满整条链再挑', '选余量最小的块', '每次分配 O(n)']));

    st = {}; st[0] = 'bad';
    steps.push(step(snap({
      cmp: 1,
      cap1: '第 1 个结点：30 < 60，装不下，跳过',
      cap2: '装不下的连候选都算不上',
      tags: [{ idx: 0, txt: 'p', y: 290, color: '#ffd166' }],
      notes: ['best 还是空的，继续沿 rlink 走',
        '这一步和首次拟合没有区别'] }), 3,
      '第一个结点 30 字，装不下 60，跳过。这一步和首次拟合一样 —— 差别要到下一步才出来。',
      ['0 号块 30 < 60', '跳过', 'best 仍为空']));

    st = {}; st[2] = 'hot';
    steps.push(step(snap({
      cmp: 2,
      cap1: '第 2 个结点：110 ≥ 60，余量 50 —— 记下 best = 这一块',
      cap2: '换成首次拟合，到这里就切走了；最佳拟合还要接着往后比',
      tags: [{ idx: 2, txt: 'best：余 50', y: 270, color: '#ffd166' },
             { idx: 2, txt: 'p', y: 290, color: '#ffd166' }],
      notes: ['首次拟合在这一步就动刀了 —— 110 的大块从此被削小',
        '最佳拟合先记着，继续走完剩下的结点'] }), 5,
      '第二个结点 110 字够用，余量 50，先记下 best。首次拟合到这就动刀了，' +
      '而最佳拟合只是记账，还要往后接着比。',
      ['110 ≥ 60，余 50', 'best ← 这一块', '继续往后比']));

    st = {}; st[4] = 'good'; st[2] = 'idle';
    steps.push(step(snap({
      cmp: 3,
      cap1: '第 3 个结点：70 ≥ 60，余量只有 10 —— 比 50 更小，best 换人',
      cap2: '「最佳」比的不是块本身多大，而是切完剩多少',
      tags: [{ idx: 4, txt: 'best：余 10', y: 270, color: '#6ceaa5' },
             { idx: 4, txt: 'p', y: 290, color: '#ffd166' }],
      notes: ['余量 10 < 50，这一块更贴合，best 指过来',
        '判据是 size − n 最小，不是 size 最小'] }), 6,
      '第三个结点 70 字，余量只有 10，比刚才的 50 更小，best 换成它。' +
      '要留意「最佳」比的是切完剩多少，不是块本身多大。',
      ['70 ≥ 60，余 10', '10 < 50，best 换人', '判据：size − n 最小']));

    st = {}; st[4] = 'good'; st[6] = 'bad';
    steps.push(step(snap({
      cmp: 4,
      cap1: '第 4 个结点：40 < 60 跳过 —— 回到 avail，一圈走完',
      cap2: '整条链比了 4 次，结论是 230 处那个 70 字的块最贴合',
      tags: [{ idx: 6, txt: 'p', y: 290, color: '#ffd166' },
             { idx: 4, txt: 'best', y: 270, color: '#6ceaa5' }],
      notes: ['循环链的好处：从 avail 出发，回到 avail 就知道走完了',
        '4 个结点比了 4 次 —— 空闲块越多，这笔开销越重'] }), 7,
      '第四个结点 40 字跳过，p 回到 avail，一圈走完。4 次比较之后才敢下结论：' +
      '230 处那个 70 字的块最贴合。空闲块越多，这笔开销越重。',
      ['40 < 60，跳过', 'p 回到 avail，一圈走完', '共比较 4 次']));

    bs[4].free = false;
    st = {}; st[4] = 'done'; st[2] = 'good';
    steps.push(step(snap({
      cmp: 4,
      hdr: '分配完成　110 字的大块一刀未动',
      cap1: '余量 10 < e = 40，整块 70 字给出去',
      cap2: '对照首次拟合：那边切的是 110 的大块，这边把它完整保住了',
      tags: [{ idx: 4, txt: '整块 70 给出', y: 290, color: '#ffd166' },
             { idx: 2, txt: '110 保住了', y: 270, color: '#6ceaa5' }],
      stats: { '最大空闲块': '110 字', '首次拟合结果': '110 → 50',
               '比较次数': 4, '结论': '大块保住了' },
      notes: ['大块留着，后面来个 100 字的请求还能应付',
        '首次拟合那边此刻最大只剩 70，100 字的请求已经没戏'] }), 9,
      '余量 10 小于 e，整块 70 给出去。关键在于 110 那个大块一刀未动 —— ' +
      '首次拟合那边它已经被削到 50，再来个 100 字的请求就没戏了。',
      ['整块 70 给出', '110 的大块保住', '大请求还有指望']));

    steps.push(step(snap({
      cmp: 4,
      hdr: '两种策略的取舍',
      cap1: '首次拟合：查找短，但总从表头开刀，靠前的大块越切越碎',
      cap2: '最佳拟合：保住大块，代价是每次 O(n)，而且专爱留下极小的空闲块',
      tags: [],
      stats: { '首次拟合': '查找快 O(1)~O(n)', '最佳拟合': '恒 O(n)',
               '首次拟合弱点': '大块被反复切', '最佳拟合弱点': '尽留小碎块' },
      notes: ['最佳拟合挑的就是余量最小的，留下的自然是最不好用的小块',
        '所以最佳拟合更依赖阈值 e，也常配合按 size 排序的空闲链'] }), -1,
      '两边各有短板：首次拟合查找短，但老从表头开刀，大块越切越碎；最佳拟合保住大块，' +
      '却要每次走满一圈，而且挑的就是余量最小的，留下的净是不好用的小块。',
      ['首次拟合：快，但切大块', '最佳拟合：省，但恒 O(n)',
       '最佳拟合更依赖阈值 e']));

    return steps;
  }

  /* ---------- 场景三：回收与合并 ---------- */
  /* 依次释放 4 块，正好把四种占空组合走一遍：
   * ①两邻皆占 → 单独插链　②左邻空闲 → 并左　③右邻空闲 → 并右
   * ④两邻皆空 → 三合一，还要摘掉一个链结点。
   * 四次回收之后 120…340 连成一个 220 字的大块。 */
  function buildFree() {
    var steps = [], st = {};
    var bs = [
      { a: 0,   n: 40, free: false },
      { a: 40,  n: 40, free: false },
      { a: 80,  n: 40, free: false },
      { a: 120, n: 50, free: true },
      { a: 170, n: 40, free: false },
      { a: 210, n: 40, free: false },
      { a: 250, n: 40, free: false },
      { a: 290, n: 50, free: true },
      { a: 340, n: 60, free: false }
    ];

    var snap = function (o) {
      var fi = freeInfo(bs);
      return { blocks: cpBlocks(bs), st: cp(st), chain: chainOf(bs),
               wrap: true, tags: o.tags || [],
               hdr: o.hdr || '回收与合并　底部标识法的看家本事',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [],
               stats: o.stats || { '空闲结点数': fi.cnt,
                 '空闲总量': fi.sum + ' 字', '最大空闲块': fi.max + ' 字',
                 '本次情形': o.cs || '—' } };
    };
    // 找 a 处的块下标：合并会改动数组，不能记死下标
    var at = function (a) {
      for (var i = 0; i < bs.length; i++) if (bs[i].a === a) return i;
      return -1;
    };
    // 把 [i, i+k] 这 k+1 块并成一块
    var merge = function (i, k) {
      var n = 0, j;
      for (j = i; j <= i + k; j++) n += bs[j].n;
      bs.splice(i, k + 1, { a: bs[i].a, n: n, free: true });
      return i;
    };

    steps.push(step(snap({
      cap1: '要回收 p 这一块，先得知道它物理上左右两侧的邻居是占用还是空闲',
      cap2: '右邻好办：p 的头部往下走 size 个字就是它 —— 难的是左邻',
      tags: [{ idx: 1, txt: 'p', y: 270, color: '#ffd166' }],
      notes: ['左邻的大小写在它自己的头部，可它头部在哪、离多远，p 并不知道',
        '所以真正的问题是：怎么一步就摸到「物理上前一块」的头部'] }), 0,
      '回收 p 之前得先看左右邻居的占空状态。右邻好找 —— p 的地址加 size 就是它的头部。' +
      '难的是左邻：它的大小写在它自己头部，可那头部在哪里，p 并不知道。',
      ['右邻：p + size 就是', '左邻：头部位置未知',
       '这才是要解决的问题']));

    steps.push(step(snap({
      hdr: '底部标识的用处：一步摸到前一块的头部',
      cap1: 'p 的地址往回退一个字，正是左邻的底部标志带 —— 里面存着 tag 和 uplink',
      cap2: 'tag 告诉你它空不空，uplink 直接指回它的头部 —— 两件事都是 O(1)',
      tags: [{ idx: 0, txt: '底部 uplink ↑', y: 270, color: '#6ceaa5' },
             { idx: 1, txt: 'p', y: 290, color: '#ffd166' }],
      notes: ['没有底部标识，就只能拿 p 的地址去空闲链上逐个比对，O(n) 才能定位',
        '一头一尾各留一条标志带，把这件事压到常数 —— 这就是「边界标识」的价值'] }), 2,
      '关键在这里：p 往回退一个字，落在左邻的底部标志带上。tag 告诉你它空不空，' +
      'uplink 直接指回它的头部。没有这条底部标识，定位左邻就得在空闲链上找 O(n)。',
      ['(p−1) 就是左邻底部', 'tag 判空占，uplink 找头部',
       '一步到位，O(1)']));

    // ① 两邻皆占：单独插链
    var i = at(40);
    st = {}; st[0] = 'bad'; st[2] = 'bad'; st[1] = 'hot';
    steps.push(step(snap({
      cs: '①两邻皆占',
      cap1: '情形①　free(40)：左邻 tag=1、右邻 tag=1，两边都占着',
      cap2: '没得合并 —— 把这块自己改成 tag=0，插到空闲链上，完事',
      tags: [{ idx: 1, txt: 'p：40 起 40 字', y: 270, color: '#ffd166' }],
      notes: ['头尾两条标志带的 tag 都改成 0，再挂进 avail 链',
        '空闲结点从 2 个变成 3 个 —— 块数在变多，这是碎片的来路'] }), 4,
      '情形①：左右两邻的 tag 都是 1，都占着，无从合并。只能把自己的头尾 tag 改成 0，' +
      '插进空闲链。空闲结点由 2 个变成 3 个 —— 块越攒越多，碎片就是这么来的。',
      ['两邻 tag 都是 1', '改 tag=0，插入 avail 链', '空闲结点 2 → 3']));
    bs[i].free = true;

    // ② 左邻空闲、右邻占用：并左，只改 size
    i = at(170);
    st = {}; st[i - 1] = 'good'; st[i] = 'hot'; st[i + 1] = 'bad';
    steps.push(step(snap({
      cs: '②左邻空闲',
      cap1: '情形②　free(170)：退一个字读到左邻底部 tag=0 —— 左邻空闲，右邻 tag=1',
      cap2: 'uplink 指回左邻头部，把它的 size 从 50 加到 90，就并完了',
      tags: [{ idx: i - 1, txt: '左邻空闲 50', y: 270, color: '#6ceaa5' },
             { idx: i, txt: 'p', y: 290, color: '#ffd166' }],
      notes: ['左邻本来就在链上，位置和 llink、rlink 都不用动',
        '要改的只有两处：左邻头部的 size，以及新的底部标志带'] }), 2,
      '情形②：退一个字读到左邻底部 tag=0，空闲；右邻 tag=1，占用。沿 uplink 回到左邻头部，' +
      '把 size 从 50 加到 90 就并完了 —— 左邻本来就在链上，指针一个不用动。',
      ['左邻 tag=0，右邻 tag=1', 'uplink 找到左邻头部',
       'size：50 → 90']));

    i = merge(i - 1, 1);
    st = {}; st[i] = 'done';
    steps.push(step(snap({
      cs: '②左邻空闲',
      cap1: '并完了：120 起一整块 90 字，中间那道分界线消失',
      cap2: '新块的底部标志带要重写 —— uplink 得指回 120，不然下次回收会摸错头部',
      tags: [{ idx: i, txt: '120 起 90 字', y: 270, color: '#6ceaa5' }],
      notes: ['原来 p 的头部标志带就此作废，被并进块体',
        '空闲结点个数不变，但最大空闲块从 50 长到 90'] }), 5,
      '并完之后 120 起是一整块 90 字。要记得重写新块的底部标志带 —— uplink 必须指回 120，' +
      '否则下次回收右边的块时会顺着旧 uplink 摸到错的地方。',
      ['120 起 90 字', '底部 uplink 改指 120', '结点数不变，块变大']));

    // ③ 左邻占用、右邻空闲：并右，新块顶替右邻的链结点
    i = at(250);
    st = {}; st[i - 1] = 'bad'; st[i] = 'hot'; st[i + 1] = 'good';
    var j = merge(i, 1);
    st = {}; st[j] = 'done';
    steps.push(step(snap({
      cs: '③右邻空闲',
      cap1: '情形③　free(250)：左邻 tag=1，右邻 tag=0 —— 往右并，新块起点是 250',
      cap2: '注意新块的头部换了位置：得把右邻的 llink、rlink 抄到 250 这个新头部上',
      tags: [{ idx: j, txt: '250 起 90 字', y: 270, color: '#6ceaa5' },
             { idx: j, txt: '顶替右邻的链结点', y: 290, color: '#ffd166' }],
      notes: ['并左只改 size，并右要换头部 —— 链上的结点地址跟着变了',
        '所以要把右邻的 llink、rlink 接过来，还得让它的两个邻居回指 250'] }), 6,
      '情形③：左邻占着，右邻空闲，往右并。这回新块的头部落在 250，和原来右邻的头部不是一处，' +
      '所以要把右邻的 llink、rlink 抄过来，并让链上前后两个结点回指 250。',
      ['左邻 tag=1，右邻 tag=0', '新头部在 250',
       '接手右邻的 llink/rlink']));

    // ④ 两邻皆空：三合一，还要摘掉一个链结点
    i = at(210);
    st = {}; st[i - 1] = 'good'; st[i] = 'hot'; st[i + 1] = 'good';
    steps.push(step(snap({
      cs: '④两邻皆空',
      cap1: '情形④　free(210)：左邻 90 字空闲，右邻 90 字空闲 —— 两边都能并',
      cap2: '三块合成一块：左邻 size = 90 + 40 + 90 = 220',
      tags: [{ idx: i - 1, txt: '左邻空 90', y: 270, color: '#6ceaa5' },
             { idx: i, txt: 'p：40 字', y: 290, color: '#ffd166' }],
      notes: ['这一步是回收里最划算的：两条分界线一起消失',
        '也是唯一会让空闲结点变少的情形 —— 三个结点合成一个'] }), 7,
      '情形④：左右两邻都空闲，两边一起并。左邻的 size 直接加成 90 + 40 + 90 = 220，' +
      '两条分界线一起消失。这也是唯一会让空闲结点变少的情形。',
      ['两邻 tag 都是 0', 'size = 90+40+90 = 220',
       '三块合成一块']));

    i = merge(i - 1, 2);
    st = {}; st[i] = 'done';
    steps.push(step(snap({
      cs: '④两邻皆空',
      cap1: '右邻那个链结点已经没用了 —— 必须从 avail 链上摘掉',
      cap2: '摘链：右邻->llink->rlink = 右邻->rlink，右邻->rlink->llink = 右邻->llink',
      tags: [{ idx: i, txt: '120 起 220 字', y: 270, color: '#6ceaa5' }],
      notes: ['忘了摘链就会留一个指向块体中间的野结点，下次分配必出错',
        '若 avail 正好指着它，还要先把 avail 挪到 rlink 上去'] }), 8,
      '合并之后右邻那个链结点已经落在新块体内部，必须从 avail 链上摘掉。漏了这一步，' +
      '链上就留一个指向块体中间的野结点，下次分配一定出错。',
      ['摘掉右邻的链结点', '否则留下野结点',
       'avail 指着它就先挪走']));

    steps.push(step(snap({
      hdr: '四次回收之后：120…340 连成 220 字的一整块',
      cap1: '及时合并是对抗外部碎片的正手 —— 不合并，这里会是 3 个 90 字以下的小块',
      cap2: '能这么快合并，全靠头尾两条标志带把「左右邻居是谁」变成常数时间的事',
      tags: [{ idx: at(120), txt: '220 字', y: 270, color: '#6ceaa5' }],
      stats: { '空闲结点数': 2, '空闲总量': '260 字',
               '最大空闲块': '220 字', '不合并的话': '最大仅 90 字' },
      notes: ['四种情形的差别只在改哪几个指针，判定统一靠头尾的 tag',
        '这就是边界标识法：一头一尾各留一条标志带，换来 O(1) 的邻居判定与合并'] }), 9,
      '四次回收之后 120…340 连成 220 字的一整块。若不合并，这里会是三个 90 字以下的小块。' +
      '能合得这么快，靠的就是头尾两条标志带把「邻居是谁」变成常数时间的事。',
      ['最大空闲块 220 字', '不合并最大只有 90',
       '边界标识换来 O(1) 合并']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['boundary-tag'] = {
    title: '边界标识法 Boundary Tag',
    subtitle: '每块内存的头部和底部各留一条标志带，空闲块用 llink、rlink 串成双向循环链。头部记 tag 与 size 供分配时查找，底部那条 uplink 让回收时一步就能摸到物理上的前一块，四种邻居组合都能 O(1) 判定并合并。',
    height: 700,
    scenes: [
      { name: '首次拟合', build: buildFirst, codeTag: 'First Fit：够用就停',
        code: [
          '// 头部: llink | tag | size | uplink　　底部: uplink | tag',
          '// tag = 0 空闲，tag = 1 占用；空闲块串成双向循环链',
          'avail: 空闲链表头指针        // 只有空闲块上链',
          '',
          'FirstFit(n):',
          '  p = avail',
          '  while p != NULL and p->size < n: p = p->rlink',
          '                              // 不够就往后走，一个也不多比',
          '  if p->size - n >= e:        // 余量够大，值得留',
          '      从 p 的高地址端割 n 个字给用户，p->size -= n',
          '  else:                       // 余量 < e，整块给出去',
          '      把 p 从链上摘下，tag = 1，整块交给用户'
        ] },
      { name: '最佳拟合', build: buildBest, codeTag: 'Best Fit：比完再挑',
        code: [
          'BestFit(n):',
          '  best = NULL; p = avail',
          '  repeat                      // 循环链：走回 avail 才算一圈',
          '    if p->size < n: p = p->rlink; continue',
          '',
          '    if best == NULL:  best = p',
          '    elif p->size - n < best->size - n:  best = p',
          '    p = p->rlink                // 够用也不停，必须比完',
          '  until p == avail',
          '  if best == NULL: 分配失败',
          '  按余量与阈值 e 的关系，切一刀或整块给出（同首次拟合）',
          '// 判据是 size - n 最小 —— 比的是切完剩多少，不是块本身多大'
        ] },
      { name: '回收与合并', build: buildFree, codeTag: '四种邻居组合',
        code: [
          'free(p):                      // 回收 p 这一块，n = p->size',
          '  右邻 = p + n                 // 地址加 size 就到，tag 直接可读',
          '  左邻底部 = p - 1             // 退一个字，正是左邻的底部标志带',
          '  左邻 = 左邻底部->uplink      // 一步指回左邻头部，O(1)',
          '  ①两邻皆占: p->tag = 0，把 p 插入 avail 链',
          '  ②左邻空闲: 左邻->size += n           // 只改 size，不动链',
          '  ③右邻空闲: 新头部落在 p，接手右邻的 llink/rlink',
          '  ④两邻皆空: 左邻->size += n + 右邻->size',
          '              把右邻从 avail 链上摘掉   // 空闲结点少一个',
          '  合并后重写头尾标志带：新块底部的 uplink 要指回新头部'
        ] }
    ]
  };
})();
