/* 置换选择排序 — 第11章
 * 前两节把归并那一头做到了头：趟数 S = ⌈log_k m⌉，内部比较压到 ⌈log₂k⌉。
 * 剩下能动的只有 m —— 初始归并段的个数。内部排序做出来的段长恰好等于内存容量 w，
 * 段数 m = n/w，一个不多一个不少。置换选择排序能让平均段长达到 2w，m 直接减半。
 * 场景一：还剩 m 可以动 —— 为什么 m 减半就等于少一趟。
 * 场景二：边读边写的选择过程 —— 段长凭什么能超过 w。
 * 场景三：段号 RN 与「选不出来就换段」的判断。
 * 场景四：平均段长 2w 的道理（雪犁模型），以及这笔账。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var W = 3;                                   // 工作区能装 3 个记录
  var FI = [17, 21, 5, 44, 10, 12, 56, 32, 29];
  var INF = 9999;

  /* 布局：左侧输入 + 工作区，右侧输出的两个归并段。
   * 竖直：标题 100 / 说明 122 / 输入 152（h30，下标 196）/
   *       工作区 232（h34）/ 段号 282 / 备注 268… / 结语 336。 */
  var IX = 104, IW = 42, IG = 5, IY = 152, IH = 30;
  var AX = 104, AW = 56, AG = 10, AY = 232, AH = 34;
  var RX = 566, RW = 44, RG = 5, RH = 30, RY = [152, 214];
  var NX = 566, NY = 268;

  function fmt(v) { return v === INF ? '∞' : '' + v; }

  /* 一行格子：vals 里的每格用 sts[i] 上色，idx 为真时在下方标下标 */
  function row(g, x, y, w, h, gap, vals, sts, idx) {
    var i, cx, s, c;
    for (i = 0; i < vals.length; i++) {
      cx = x + i * (w + gap);
      s = (sts && sts[i]) || 'idle';
      c = D.C[s];
      g.appendChild(D.el('rect', { x: cx, y: y, width: w, height: h, rx: 5,
        fill: c.fill, stroke: c.stroke,
        'stroke-width': s === 'hot' ? 2.8 : 1.5 }));
      if (vals[i] !== null) {
        g.appendChild(D.text(fmt(vals[i]),
          { x: cx + w / 2, y: y + h / 2 + 7, 'class': 'vz-cellval',
            fill: s === 'mute' ? '#4a5c82' : '#eef3ff' }));
      }
      if (idx) {
        g.appendChild(D.text(i,
          { x: cx + w / 2, y: y + h + 14, 'class': 'vz-idx' }));
      }
    }
  }

  /* f = { inp:{sts,ptr}, wa:[{val,rn,st}], runs:[{vals,hot}], cur,
   *       hdr, cap, notes, legend, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, j, x;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    // 输入文件
    if (f.inp) {
      ctx.stage.appendChild(D.text('输入文件',
        { x: IX - 10, y: IY + 20, 'class': 'vz-tag', fill: '#9fb4dc',
          'text-anchor': 'end' }));
      row(ctx.stage, IX, IY, IW, IH, IG, FI, f.inp.sts, false);
      if (f.inp.ptr !== undefined && f.inp.ptr < FI.length) {
        x = IX + f.inp.ptr * (IW + IG) + IW / 2;
        D.pointer(ctx.stage, { x: x, y: IY - 6, name: '读', color: '#ffd166',
          above: true });
      }
    }

    // 工作区
    if (f.wa) {
      ctx.stage.appendChild(D.text('工作区 WA（w = ' + W + '）',
        { x: AX - 10, y: AY + 22, 'class': 'vz-tag', fill: '#9fb4dc',
          'text-anchor': 'end' }));
      for (i = 0; i < f.wa.length; i++) {
        x = AX + i * (AW + AG);
        var c = D.C[f.wa[i].st || 'idle'];
        ctx.stage.appendChild(D.el('rect', { x: x, y: AY, width: AW,
          height: AH, rx: 6, fill: c.fill, stroke: c.stroke,
          'stroke-width': f.wa[i].st === 'hot' ? 2.8 : 1.5 }));
        ctx.stage.appendChild(D.text(fmt(f.wa[i].val),
          { x: x + AW / 2, y: AY + 24, 'class': 'vz-cellval' }));
        ctx.stage.appendChild(D.text('段号 ' + f.wa[i].rn,
          { x: x + AW / 2, y: AY + AH + 18, 'class': 'vz-idx',
            fill: f.wa[i].rn === f.cur ? '#6ceaa5' : '#dd7b7b' }));
      }
    }

    // 右侧：已输出的归并段
    for (j = 0; j < (f.runs || []).length && j < 2; j++) {
      ctx.stage.appendChild(D.text('归并段 R' + (j + 1) + '（' +
        f.runs[j].vals.length + ' 个）',
        { x: RX, y: RY[j] - 11, 'class': 'vz-tag',
          fill: f.runs[j].hot ? '#ffd166' : '#9fb4dc', 'text-anchor': 'start' }));
      var sts = [], q;
      for (q = 0; q < f.runs[j].vals.length; q++) {
        sts.push(f.runs[j].hot && q === f.runs[j].vals.length - 1
          ? 'hot' : 'done');
      }
      row(ctx.stage, RX, RY[j], RW, RH, RG, f.runs[j].vals, sts, false);
    }

    for (i = 0; i < (f.notes || []).length && i < 3; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: NX, y: NY + i * 21, 'class': 'vz-info' }));
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

  /* ---------- 场景一：还剩 m 可以动 ----------
   * 趟数 S = ⌈log_k m⌉ + 1。k 已经加到内存的极限、内部比较已被败者树按住，
   * 剩下唯一能动的就是 m。而内部排序做出来的段长恰好是 w，m = n/w 一分不让。 */
  function buildWhy() {
    var steps = [];
    var snap = function (o) {
      return { inp: o.inp || null, wa: o.wa || null, runs: o.runs || [],
               cur: o.cur, hdr: o.hdr || '总账里还剩一个 m 可以动',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      inp: { sts: mk(FI.length, 'idle') },
      cap: '外排序的总代价 = 1 趟建段 + S 趟归并，而 S = ⌈log_k m⌉ —— k 已顶到内存上限',
      stats: { '总趟数': '1 + ⌈log_k m⌉', 'k 已定': '受缓冲区内存限制',
               '内部比较': '败者树已压到 log₂k', '还能动的': 'm' },
      notes: ['加大 k：受内存里能开多少个缓冲区限制，到头了',
        '内部比较：败者树已经压到 ⌈log₂k⌉，到头了',
        '只剩 m —— 初始归并段的个数，还没人动过'] }), 0,
      '把前两节的账合起来：总代价是 1 趟建段加 S 趟归并，S = ⌈log_k m⌉。' +
      'k 受缓冲区内存限制已经顶到头，内部比较被败者树按住也到头了 —— ' +
      '公式里还剩一个 m 没人动过，就是初始归并段的个数。',
      ['总趟数 1 + ⌈log_k m⌉', 'k 与比较都到头了',
       '只剩 m 可以动']));

    steps.push(step(snap({
      inp: { sts: (function () { var a = mk(FI.length, 'idle'), i;
        for (i = 0; i < 3; i++) a[i] = 'good';
        for (i = 3; i < 6; i++) a[i] = 'active';
        for (i = 6; i < 9; i++) a[i] = 'hot'; return a; })() },
      hdr: '内部排序做出来的段长，恰好等于内存容量',
      cap: '读满 w = 3 个记录 → 排好 → 写回，段长必定是 3；9 个记录只能得 3 段，一个不多',
      stats: { '记录数 n': 9, '内存 w': 3,
               '段长': 'w = 3', '段数 m': 'n / w = 3' },
      notes: ['做法决定了段长：一次只能装 w 个，排完就写回',
        '所以 m = ⌈n / w⌉ 是这个做法的下限，也是上限',
        '想减小 m，就得让一个段的长度超过 w'] }), 1,
      '毛病出在建段的做法上：读满 w 个记录、排好、写回 —— 段长必定等于 w，' +
      '所以 m = ⌈n/w⌉ 一分不让。9 个记录、内存装 3 个，就只能得 3 段。' +
      '想减小 m，唯一的出路是让一个段的长度超过内存容量。',
      ['读满 w → 排 → 写回', '段长恒为 w',
       'm = n/w 定死了']));

    steps.push(step(snap({
      inp: { sts: mk(FI.length, 'mute') },
      hdr: 'm 减半意味着什么：log 的真数减半',
      cap: 'n = 10⁶、w = 1000、k = 10：m = 1000 时 S = 3 趟；m = 500 时 S = 3 趟仍未变',
      stats: { 'm = 1000, k = 10': 'S = 3', 'm = 500, k = 10': 'S = 3',
               'm = 1000, k = 4': 'S = 5', 'm = 500, k = 4': 'S = 5' },
      notes: ['m 减半 = log_k m 减去 log_k 2，是一个小于 1 的量',
        '所以不保证每次都省下一趟 —— 但一旦跨过取整的边界就省一整趟',
        '而一趟归并是把整个文件读写一遍，省下来的是实打实的 I/O'] }), 2,
      'm 减半在 log 里只减去 log_k 2，不到 1，所以不保证每次都省下一趟。' +
      '但一旦跨过取整的边界就整整省一趟 —— 而一趟归并要把整个文件读写一遍，' +
      '这是外排序里最贵的东西，值得为它想办法。',
      ['m 减半 → log 减 log_k 2', '跨过取整边界就省一趟',
       '一趟 = 全文件 I/O']));

    steps.push(step(snap({
      inp: { sts: mk(FI.length, 'idle') },
      wa: [{ val: 17, rn: 1 }, { val: 21, rn: 1 }, { val: 5, rn: 1 }],
      cur: 1,
      hdr: '思路：别等排完再写，边选边写、边写边读',
      cap: '工作区里选出最小的写出去，腾出的位置立刻补一个新记录进来 —— 记录在「置换」',
      stats: { '原做法': '读满 → 排 → 写回', '新做法': '选最小 → 写 → 补一个',
               '内存占用': '同样是 w', '段长': '不再受 w 限制' },
      notes: ['选出工作区里最小的记录写进当前段',
        '腾出的空位马上从输入文件补一个进来',
        '补进来的若还不小于刚写出的，它就还能进这个段'],
      legend: '关键就在最后这句：新补进来的记录有机会继续留在当前段里 —— 段长于是能超过 w' }), 3,
      '换个做法：不等排完再写，而是从工作区里选出最小的写出去，腾出的位置立刻补一个新记录 —— ' +
      '记录在不断「置换」。要紧的是最后一句：补进来的记录若还不小于刚写出去的，' +
      '它就还能进这个段。段长于是不再受 w 限制。',
      ['选最小 → 写 → 补一个', '内存占用还是 w',
       '新记录能续进当前段']));

    return steps;
  }

  /* ---------- 场景二 / 三：选择过程 ----------
   * WA 里每个记录带一个段号 RN。每轮在「RN 等于当前段号」的记录里选最小的写出去，
   * 再从输入补一个进来：补进来的 ≥ 刚写出的 → RN 不变（还能进本段）；
   * 否则 RN 加一（只能进下一段）。RN 等于当前段号的记录一个不剩时，本段结束。
   * 场景二只看前一段（段长凭什么超过 w），场景三看换段那一刻。 */
  function walk(upto) {
    var steps = [];
    var wa = [], ptr = 0, cur = 1, runs = [[], []], i, sw = 0;
    for (i = 0; i < W; i++) { wa.push({ val: FI[i], rn: 1 }); ptr++; }

    var snap = function (o) {
      var rs = [{ vals: runs[0].slice(), hot: cur === 1 && o.hotRun }];
      if (cur === 2 || runs[1].length) {
        rs.push({ vals: runs[1].slice(), hot: cur === 2 && o.hotRun });
      }
      var ists = [], q;
      for (q = 0; q < FI.length; q++) {
        ists.push(q === o.rd ? 'hot' : (q < ptr ? 'done' : 'idle'));
      }
      var ws = [], z;
      for (z = 0; z < wa.length; z++) {
        ws.push({ val: wa[z].val, rn: wa[z].rn === INF ? '∞' : wa[z].rn,
                  st: o.wst && o.wst[z] ? o.wst[z]
                    : (wa[z].rn === cur ? 'active' : 'mute') });
      }
      return { inp: { sts: ists, ptr: ptr }, wa: ws, runs: rs, cur: cur,
               hdr: o.hdr || '边选边写：段长凭什么能超过 w',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      cap: '先读满工作区：17 21 5 全归段 1。此后每轮在「段号 = 当前段号」的记录里选最小的',
      stats: { '工作区 w': W, '当前段号 RN': 1,
               '候选': '17 21 5', '本轮选中': 5 },
      notes: ['WA 里每个记录多带一个段号 RN',
        '只有 RN 等于当前段号的记录才有资格参选',
        '绿色段号表示还能进本段，红色表示只能等下一段'] }), 0,
      '先把工作区读满：17、21、5 都归段 1。此后每轮做同一件事 —— ' +
      '在「段号等于当前段号」的记录里选最小的写出去。工作区里每个记录都多带一个段号 RN，' +
      '绿色表示还能进本段，红色表示只能等下一段。',
      ['读满 WA：17 21 5', '每个记录带段号 RN',
       '在 RN = 当前段的里选最小']));

    var guard = 0;
    while (guard++ < 14) {
      // 在 rn === cur 的记录里选最小
      var bi = -1, z2;
      for (z2 = 0; z2 < wa.length; z2++) {
        if (wa[z2].rn === cur && (bi < 0 || wa[z2].val < wa[bi].val)) bi = z2;
      }
      if (bi < 0) {                          // 本段选不出来了 → 换段
        if (cur === 2) break;
        var stx = {}, z3;
        for (z3 = 0; z3 < wa.length; z3++) stx[z3] = 'bad';
        steps.push(step(snap({
          wst: stx,
          hdr: '换段：段号 = 1 的记录一个不剩了',
          cap: '工作区里 10 12 32 的段号全是 2 —— 段 1 再也接不上，只能封段，当前段号加一',
          stats: { 'R1 长度': runs[0].length, '内存 w': W,
                   '超出': runs[0].length - W + ' 个', '下一段起点': 10 },
          notes: ['判断很省事：选不出 RN = 当前段号的记录，本段就结束',
            'R1 = ' + runs[0].join(' ') + '，长度 ' + runs[0].length + ' > w = ' + W,
            '工作区里剩下的记录原地不动，直接成为下一段的起点'],
          legend: '段号 RN 就是为这个判断服务的：它把「该进哪个段」这件事记在记录身上' }), 6,
          '工作区里 10、12、32 的段号全是 2 —— 段 1 再也接不上东西了，于是封段。' +
          'R1 长度 ' + runs[0].length + '，比内存容量 ' + W + ' 多出 ' +
          (runs[0].length - W) + ' 个。剩下的记录不用挪动，直接就是下一段的起点。',
          ['段 1 选不出候选', 'R1 长度 ' + runs[0].length + ' > w',
           '当前段号加一']));
        sw = steps.length - 1;
        cur = 2;
        continue;
      }

      var v = wa[bi].val;
      if (v === INF) break;
      runs[cur - 1].push(v);

      var nv = ptr < FI.length ? FI[ptr] : INF;
      var nrn = nv === INF ? INF : (nv >= v ? cur : cur + 1);
      var rd = ptr < FI.length ? ptr : undefined;
      var wst = {}; wst[bi] = 'hot';

      var why = nv === INF ? '输入取完了，空位填 ∞'
        : (nv >= v ? nv + ' ≥ ' + v + '，还能进本段 → 段号仍是 ' + cur
                   : nv + ' < ' + v + '，接不上了 → 段号记 ' + (cur + 1));
      steps.push(step(snap({
        wst: wst, rd: rd, hotRun: 1,
        cap: '写出 ' + v + '（本段第 ' + runs[cur - 1].length + ' 个）；空位补进 ' +
             fmt(nv) + ' —— ' + why,
        stats: { '写出': v, '补进': fmt(nv),
                 '新记录段号': nrn === INF ? '∞' : nrn,
                 '本段已有': runs[cur - 1].length + ' 个' },
        notes: ['选中 ' + v + '，它是段 ' + cur + ' 里当前最小的',
          '写出去之后空位立刻补 ' + fmt(nv),
          why],
        legend: '注意这一句：新记录只要不小于刚写出的，本段就还能收下它 —— 段长因此能超过 w' }),
        nv === INF ? 5 : (nrn === cur ? 3 : 4),
        '写出 ' + v + '，它是段 ' + cur + ' 里当前最小的。空位补进 ' + fmt(nv) + '：' +
        why + '。段是按递增顺序写出去的，所以只要新来的不小于刚写出的那个，就还能接在后面。',
        ['写出 ' + v, '补进 ' + fmt(nv),
         nrn === cur ? '段号仍是 ' + cur : '段号记 ' + (nrn === INF ? '∞' : nrn)]));

      wa[bi] = { val: nv, rn: nrn };
      ptr++;
      if (ptr > FI.length) ptr = FI.length;
    }

    steps.push(step(snap({
      hdr: '两段做完：R1 长 ' + runs[0].length + '，R2 长 ' + runs[1].length,
      cap: '内存只装 3 个，却做出了长度 ' + runs[0].length + ' 和 ' +
           runs[1].length + ' 的两个段 —— 段数从 3 降到 2',
      stats: { 'R1': runs[0].length + ' 个', 'R2': runs[1].length + ' 个',
               '内部排序会得': '3 段', '现在': '2 段' },
      notes: ['R1 = ' + runs[0].join(' '),
        'R2 = ' + runs[1].join(' '),
        '同样的内存、同样的一趟读写，段数少了'],
      legend: '代价：每轮要在 w 个候选里选最小 —— 这一步正好用败者树，O(log w)' }), -1,
      '两段做完：R1 长 ' + runs[0].length + '、R2 长 ' + runs[1].length +
      '，而内部排序在同样内存下只能得 3 段。多花的代价只是每轮要在 w 个候选里选最小 —— ' +
      '这一步正好交给上一节的败者树，O(log w)。',
      ['R1 = ' + runs[0].length + '，R2 = ' + runs[1].length,
       '段数 3 → 2', '选最小用败者树']));

    if (upto === 1) return steps.slice(0, sw + 1);
    return [steps[0]].concat(steps.slice(sw));
  }

  function buildSelect() { return walk(1); }
  function buildRunNo() { return walk(2); }

  /* ---------- 场景四：平均段长 2w ----------
   * Knuth 的雪犁模型：一台犁绕着圆形跑道推雪，雪均匀落下。稳态时跑道上的存雪量
   * 恰是犁一圈推走量的一半 —— 对应过来，工作区里「已归本段」的记录平均占一半，
   * 一个段平均能吐出 2w 个记录。 */
  function buildAvg() {
    var steps = [];
    var snap = function (o) {
      return { inp: o.inp || null, wa: o.wa || null, runs: o.runs || [],
               cur: o.cur, hdr: o.hdr || '平均段长为什么是 2w',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      wa: [{ val: 10, rn: 2 }, { val: 12, rn: 2 }, { val: 32, rn: 2 }],
      cur: 2,
      cap: '刚才 w = 3 得到长度 6 和 3 的两段，平均 4.5 —— 这不是巧合，理论值就是 2w',
      stats: { '内存 w': 3, '实测 R1': '6 个',
               '实测平均': '4.5', '理论平均': '2w = 6' },
      notes: ['本例 n 太小，尾段吃亏，压不到理论值',
        'n 足够大时平均段长趋于 2w',
        '于是 m 从 n/w 降到 n/2w —— 正好减半'] }), 0,
      '刚才 w = 3 做出了长度 6 和 3 的两段。这不是碰巧：n 足够大时平均段长趋于 2w，' +
      '于是 m 从 n/w 降到 n/2w，正好减半。本例 n 太小、尾段吃亏，所以没压到理论值。',
      ['平均段长 → 2w', 'm 从 n/w 降到 n/2w',
       '本例尾段吃亏']));

    steps.push(step(snap({
      wa: [{ val: 10, rn: 2 }, { val: 12, rn: 2 }, { val: 32, rn: 2 }],
      cur: 2,
      hdr: 'Knuth 的雪犁模型：为什么恰好是两倍',
      cap: '一台犁绕圆形跑道推雪，雪均匀落下 —— 稳态时跑道存雪量恰是犁一圈推走量的一半',
      stats: { '跑道': '工作区 w 个位置', '落雪': '新读进来的记录',
               '推走的雪': '写出去的记录', '稳态比例': '存雪 : 推走 = 1 : 2' },
      notes: ['犁走过的地方雪被清空，之后又慢慢落上',
        '所以犁前方的雪厚、刚走过的地方雪薄',
        '积分下来，一圈推走的量是当前存量的两倍'] }), 1,
      'Knuth 用雪犁解释过这件事：一台犁绕圆形跑道推雪，雪均匀落下。犁刚走过的地方雪薄、' +
      '前方雪厚，稳态下积分出来，犁一圈推走的雪量恰是跑道上存量的两倍。' +
      '跑道就是工作区的 w 个位置，落雪就是新读进来的记录。',
      ['跑道 = 工作区 w 个位置', '落雪 = 新读进来的记录',
       '一圈推走量 = 存量 × 2']));

    steps.push(step(snap({
      inp: { sts: (function () { var a = mk(FI.length, 'idle'), i;
        for (i = 0; i < FI.length; i++) a[i] = i % 3 === 2 ? 'bad' : 'done';
        return a; })() },
      hdr: '两个极端：输入越有序，段越长',
      cap: '输入本身递增 → 一个段就能收下全文件；输入完全递减 → 每段退回 w 个',
      stats: { '已递增': '1 段（m = 1）', '随机': '平均 2w',
               '完全递减': 'w（退回原点）', '所以': '越有序越占便宜' },
      notes: ['已递增：每个新读进来的都 ≥ 刚写出的，永远接得上',
        '完全递减：每个新读进来的都更小，一个都接不上',
        '实际数据总带点局部有序，所以通常好于 2w'] }), 2,
      '两个极端能说明这个做法的性格：输入本身递增时，每个新记录都接得上，' +
      '一个段就能收下整个文件；输入完全递减时一个都接不上，段长退回 w。' +
      '实际数据总带点局部有序，所以通常还能好于 2w。',
      ['递增 → 1 个段', '递减 → 退回 w',
       '越有序越占便宜']));

    steps.push(step(snap({
      wa: [{ val: 10, rn: 2 }, { val: 12, rn: 2 }, { val: 32, rn: 2 }],
      cur: 2,
      hdr: '这笔账，以及它带来的新麻烦',
      cap: 'm 减半换来趟数可能少一趟；但段长从此参差不齐 —— 归并的次序又值得挑一挑',
      stats: { 'm': 'n/w → n/2w', '每轮选最小': 'O(log w)（败者树）',
               '新问题': '段长不再相等', '对策': '最佳归并树（哈夫曼）' },
      notes: ['段长参差不齐时，先归并哪些段会影响总读写量',
        '短段应该早参与、多参与，这正是哈夫曼树的思路',
        '书上把它叫「最佳归并树」，用带权路径长度最小来选次序'],
      legend: '外排序一路下来：压趟数（加大 k）→ 压内部比较（败者树）→ 压段数（置换选择）' }), -1,
      '这笔账收在这里：m 从 n/w 降到 n/2w，代价只是每轮选最小改用败者树。' +
      '但它带来一个新麻烦 —— 段长从此参差不齐，先归并哪些段会影响总读写量。' +
      '让短段早参与、多参与，就是哈夫曼树的思路，书上叫「最佳归并树」。',
      ['m 减半，代价 O(log w)', '段长不再相等',
       '接着讲最佳归并树']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['replacement-selection'] = {
    title: '置换选择排序 Replacement Selection',
    subtitle: '趟数 S = ⌈log_k m⌉ 里的 k 已顶到内存上限、内部比较已被败者树按住，' +
      '只剩 m 还能动。内部排序做出的段长恰好等于内存容量 w，而置换选择边选边写、' +
      '边写边读，让平均段长达到 2w —— m 直接减半。',
    height: 700,
    code: [
      '// WA：工作区，w 个位置；每个记录带段号 RN',
      'while (WA 中有 RN == 当前段号的记录) {',
      '    选出其中最小的 min，写入当前归并段;',
      '    从输入读一个新记录填进这个空位;',
      '    if (新记录 >= min) 它的 RN = 当前段号;   // 还能进本段',
      '    else                它的 RN = 当前段号 + 1;',
      '}',
      '当前段号++;    // 选不出候选 → 本段封段',
      '// 平均段长 2w，选最小用败者树 O(log w)'
    ],
    scenes: [
      { name: '还剩 m 可以动', build: buildWhy,
        codeTag: '段长为什么恒等于 w',
        code: [
          '// 总代价 = 1 趟建段 + S 趟归并，S = ⌈log_k m⌉',
          '// k：受缓冲区内存限制，已到头',
          '// 内部比较：败者树压到 ⌈log₂k⌉，已到头',
          '// 剩下 m —— 初始归并段个数',
          '// 内部排序建段：读满 w → 排序 → 写回',
          '//   段长恒为 w  ⇒  m = ⌈n / w⌉，一分不让',
          '// 出路：让一个段的长度超过内存容量 w',
          '// 办法：别等排完再写，边选边写、边写边读'
        ] },
      { name: '边选边写的过程', build: buildSelect,
        codeTag: '新记录能续进当前段',
        code: [
          '// 读满 WA，全部记 RN = 1',
          'min = WA 中 RN == 当前段号的最小者;',
          'output(min);                    // 写入当前段',
          'x = 从输入读一个新记录;',
          'if (x >= min) x.RN = 当前段号;   // 接得上 → 续进本段',
          'else          x.RN = 当前段号+1; // 接不上 → 留给下一段',
          '// 段是递增写出去的，所以判据就是 x >= min',
          '// 于是段长可以超过 w'
        ] },
      { name: '段号与换段判断', build: buildRunNo,
        codeTag: '选不出来就封段',
        code: [
          '// RN 把「该进哪个段」记在记录身上',
          '// 每轮只在 RN == 当前段号的记录里选',
          'if (找不到 RN == 当前段号的记录) {',
          '    封闭当前归并段;',
          '    当前段号++;      // WA 里的记录原地不动',
          '}                    // 它们就是下一段的起点',
          '// 输入取完 → 空位填 ∞，RN 记为 ∞，永不参选',
          '// 两趟下来：w = 3 却做出了 6 + 3 两个段'
        ] },
      { name: '平均段长 2w', build: buildAvg,
        codeTag: '雪犁模型',
        code: [
          '// Knuth 雪犁：犁绕圆形跑道推雪，雪均匀落下',
          '//   犁刚过处雪薄，前方雪厚',
          '//   稳态：一圈推走量 = 跑道存量 × 2',
          '// 跑道 = 工作区 w 个位置，落雪 = 新读入的记录',
          '// ⇒ 平均段长 2w，m 从 n/w 降到 n/2w',
          '// 极端：输入已递增 → 1 个段；完全递减 → 退回 w',
          '// 代价：每轮选最小 O(log w)，用败者树',
          '// 新问题：段长参差不齐 → 最佳归并树（哈夫曼）'
        ] }
    ]
  };
})();
