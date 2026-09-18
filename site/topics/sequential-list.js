/* 顺序表 — 第2章
 * 场景一：插入要腾位（从后往前挪），删除要补位（从前往后挪），
 *         并数清移动次数：插在最前面最贵，插在末尾不用挪。
 * 场景二：满了怎么办 —— 申请更大的数组、逐个搬迁、释放旧空间。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var CAP = 8;
  var CX = 128, CY = 182, CW = 54, GAP = 9, CH = 44;
  // 待插入/刚删除的元素悬在数组上方。标签基线取 HOLDY-8，字形上沿还要再高 12px，
  // 所以 HOLDY 不能小于 104，否则会越过舞台顶边 y=84。
  var HOLDY = 110;
  var NX = 664;     // 右侧要点栏（数组最右端 x≈623，留出间距）

  function xOf(i) { return CX + i * (CW + GAP); }

  function renderList(ctx, f) {
    D.clear(ctx.stage);
    // 已用区：length 之内才是有效元素，之外是「申请了但没用」的空间
    if (f.len > 0) {
      D.zone(ctx.stage, { x: CX - 6, y: CY - 8, rx: 8,
        w: f.len * (CW + GAP) - GAP + 12, h: CH + 16,
        color: '#2ecc71', label: '有效元素 length = ' + f.len });
    }
    if (f.len < CAP) {
      D.zone(ctx.stage, { x: xOf(f.len) - 5, y: CY - 4, rx: 8,
        w: (CAP - f.len) * (CW + GAP) - GAP + 10, h: CH + 8,
        color: '#4a5c82', opacity: 0.14 });
    }
    var i, x;
    for (i = 0; i < CAP; i++) {
      x = xOf(i);
      var st = f.st[i] || (i < f.len ? 'idle' : 'mute');
      var c = D.C[st];
      ctx.stage.appendChild(D.el('rect', { x: x, y: CY, width: CW, height: CH,
        rx: 7, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      if (f.a[i] !== undefined && f.a[i] !== null) {
        ctx.stage.appendChild(D.text(f.a[i],
          { x: x + CW / 2, y: CY + CH / 2 + 7, 'class': 'vz-cellval' }));
      }
      ctx.stage.appendChild(D.text(i,
        { x: x + CW / 2, y: CY + CH + 16, 'class': 'vz-idx' }));
    }
    // 挪动方向用弧线画出来，一眼看出是往右还是往左
    if (f.mv) {
      D.link(ctx.stage, { x1: xOf(f.mv[0]) + CW / 2, y1: CY - 12,
        x2: xOf(f.mv[1]) + CW / 2, y2: CY - 12,
        kind: 'hot', curve: -20 });
    }
    if (f.hold !== null) {
      var hx = xOf(f.holdAt);
      D.cellRow(ctx.stage, { values: [f.hold], states: ['active'],
        x: hx, y: HOLDY, w: CW, gap: GAP, h: CH, index: false });
      ctx.stage.appendChild(D.text(f.holdLab || 'e',
        { x: hx + CW / 2, y: HOLDY - 8, 'class': 'vz-brace', fill: '#4aa3e0' }));
    }
    ctx.stage.appendChild(D.text('容量 capacity = ' + CAP + '（定长，满了只能扩容）',
      { x: CX - 14, y: CY + CH + 44, 'class': 'vz-lab' }));
    for (var k = 0; k < f.notes.length && k < 4; k++) {
      ctx.stage.appendChild(D.text(f.notes[k],
        { x: NX, y: 172 + k * 25, 'class': 'vz-info' }));
    }
    ctx.stats = { 'length': f.len, 'capacity': CAP, '本次移动元素': f.mov };
  }

  /* ---------- 场景二：扩容 ---------- */
  var OLDCAP = 6, NEWCAP = 12;
  var GX = 196, GW = 38, GGAP = 5, GH = 40;
  var OLDY = 124, NEWY = 238;
  var GNX = 740;

  function gxOf(i) { return GX + i * (GW + GGAP); }

  function renderGrow(ctx, f) {
    D.clear(ctx.stage);
    var i, x, c, st;

    ctx.stage.appendChild(D.text('旧空间  capacity = ' + OLDCAP,
      { x: 44, y: OLDY + 18, 'class': 'vz-lab',
        fill: f.freed ? '#5f7099' : '#ffd166' }));
    for (i = 0; i < OLDCAP; i++) {
      x = gxOf(i);
      st = f.freed ? 'mute' : (f.oldSt[i] || 'good');
      c = D.C[st];
      ctx.stage.appendChild(D.el('rect', { x: x, y: OLDY, width: GW,
        height: GH, rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2 }));
      if (f.old[i] !== undefined) {
        ctx.stage.appendChild(D.text(f.old[i],
          { x: x + GW / 2, y: OLDY + 26, 'class': 'vz-cellval',
            fill: f.freed ? '#4a5c82' : '#eef3ff' }));
      }
      ctx.stage.appendChild(D.text(i,
        { x: x + GW / 2, y: OLDY + GH + 14, 'class': 'vz-idx' }));
    }
    // 释放之后旧空间就不属于我们了：整行划掉
    if (f.freed) {
      ctx.stage.appendChild(D.el('line', { x1: GX - 6, y1: OLDY + GH / 2,
        x2: gxOf(OLDCAP - 1) + GW + 6, y2: OLDY + GH / 2,
        stroke: '#ff6b6b', 'stroke-width': 2.6, 'stroke-linecap': 'round' }));
      D.cross(ctx.stage, gxOf(OLDCAP - 1) + GW + 6, OLDY + GH / 2, 8);
      ctx.stage.appendChild(D.text('已 free，指针不能再用',
        { x: gxOf(OLDCAP - 1) + GW + 24, y: OLDY + 26, 'class': 'vz-lab',
          fill: '#ff6b6b' }));
    }

    if (f.showNew) {
      ctx.stage.appendChild(D.text('新空间  capacity = ' + NEWCAP,
        { x: 44, y: NEWY + 18, 'class': 'vz-lab', fill: '#6ceaa5' }));
      for (i = 0; i < NEWCAP; i++) {
        x = gxOf(i);
        st = f.nwSt[i] || (i < f.nw.length ? 'good' : 'idle');
        c = D.C[st];
        ctx.stage.appendChild(D.el('rect', { x: x, y: NEWY, width: GW,
          height: GH, rx: 6, fill: c.fill, stroke: c.stroke,
          'stroke-width': 2 }));
        if (i < f.nw.length) {
          ctx.stage.appendChild(D.text(f.nw[i],
            { x: x + GW / 2, y: NEWY + 26, 'class': 'vz-cellval' }));
        }
        ctx.stage.appendChild(D.text(i,
          { x: x + GW / 2, y: NEWY + GH + 14, 'class': 'vz-idx' }));
      }
      // 搬迁是「逐个复制」，用一根竖箭头点明当前搬的是哪一个
      if (f.moving !== null) {
        D.link(ctx.stage, { x1: gxOf(f.moving) + GW / 2, y1: OLDY + GH + 20,
          x2: gxOf(f.moving) + GW / 2, y2: NEWY - 4, kind: 'hot' });
      }
    }

    for (var k = 0; k < f.notes.length && k < 4; k++) {
      ctx.stage.appendChild(D.text(f.notes[k],
        { x: GNX, y: 132 + k * 25, 'class': 'vz-info' }));
    }
    ctx.stats = { '当前 capacity': f.cap, '已搬迁元素': f.copied + ' / ' + OLDCAP,
                  '本次总代价': f.cost };
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'grow') renderGrow(c, f); else renderList(c, f);
             } };
  }

  // 状态覆盖表的键是下标，必须用 o[i]= 赋值，字面量 { i: … } 会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* ---------- 场景一：插入与删除 ---------- */
  function buildList() {
    var steps = [], a = [12, 25, 33, 47, 58, 61], len = 6, mov = 0, k;
    var snap = function (o) {
      return { a: a.slice(), st: o.st || {}, len: len, mov: mov,
               mv: o.mv || null, hold: o.hold === undefined ? null : o.hold,
               holdAt: o.holdAt || 0, holdLab: o.holdLab,
               notes: o.notes || [] };
    };

    steps.push(step(snap({ notes: ['顺序表 = 一个数组 + 一个 length',
      '元素关系靠「地址相邻」隐含表达',
      '所以按下标取值只要一步：O(1)',
      '代价是插入删除得挪一片元素'] }), -1,
      '顺序表就是一个数组加一个 length。元素在内存里紧挨着放，谁在谁后面靠地址顺序表达，' +
      '不需要额外的指针字段。好处是算一下就能取到 a[i]；代价马上就能看到。',
      ['数组 + length', '取值 O(1)', '插入/删除要挪元素']));

    /* --- 插入 --- */
    var E = 20, IDX = 1;
    steps.push(step(snap({ hold: E, holdAt: IDX, holdLab: 'e = ' + E,
      st: mark(IDX, 'hot'),
      notes: ['第一步先检查还装不装得下', 'length = 6 < capacity = 8，可以插',
        '目标：让 ' + E + ' 落到下标 ' + IDX,
        '那下标 ' + IDX + ' 及其后面的都得右移'] }), 1,
      '要在下标 ' + IDX + ' 处插入 ' + E + '。先检查 length 有没有顶到 capacity —— ' +
      '6 还没到 8，装得下。接着的问题是：这个位置已经被 25 占着，得先把它和后面的都腾开。',
      ['插入 e = ' + E + ' 到下标 ' + IDX, 'length 6 < capacity 8',
       '先腾位，再写入']));

    for (k = len - 1; k >= IDX; k--) {
      a[k + 1] = a[k];
      mov++;
      steps.push(step(snap({ hold: E, holdAt: IDX, holdLab: 'e = ' + E,
        st: mark(k, 'hot', k + 1, 'active'), mv: [k, k + 1],
        notes: ['a[' + (k + 1) + '] ← a[' + k + ']',
          k === len - 1 ? '必须从最后一个开始挪' : '继续往前推进',
          k === len - 1 ? '否则会把还没挪的值覆盖掉' : '每挪一次，空位就左移一格',
          '已移动 ' + mov + ' 次'] }), 3,
        k === len - 1
          ? '腾位得从最后一个元素开始，倒着来。先把 ' + a[k + 1] + ' 从下标 ' + k +
            ' 复制到 ' + (k + 1) + '。如果顺着从前往后挪，第一次赋值就会把下一个待挪的值冲掉。'
          : '接着把 ' + a[k + 1] + ' 从下标 ' + k + ' 挪到 ' + (k + 1) +
            '。空位一格一格往左移动，一直移到下标 ' + IDX + ' 为止，已经挪了 ' + mov + ' 次。',
        ['a[' + (k + 1) + '] ← a[' + k + ']', '空位左移到 ' + k,
         '累计移动 ' + mov + ' 次']));
    }

    a[IDX] = E;
    len++;
    steps.push(step(snap({ st: mark(IDX, 'done'),
      notes: ['a[' + IDX + '] = ' + E, 'length 6 → 7',
        '一共移动了 ' + mov + ' 个元素',
        '移动次数 = length - i = 6 - ' + IDX] }), 4,
      '空位腾好，把 ' + E + ' 写进 a[' + IDX + ']，再把 length 加一。' +
      '整个插入移动了 ' + mov + ' 个元素 —— 正好是 length - i，插得越靠前挪得越多。',
      ['写入 a[' + IDX + '] = ' + E, 'length = ' + len,
       '移动 ' + mov + ' 次 = length - i']));

    /* --- 删除 --- */
    var DEL = 4, gone = a[DEL];
    mov = 0;
    steps.push(step(snap({ hold: gone, holdAt: DEL, holdLab: '取出 ' + gone,
      st: mark(DEL, 'bad'),
      notes: ['先把 a[' + DEL + '] 的值取出来返回',
        '删除会在中间留下一个空洞',
        '顺序表不允许有空洞',
        '所以后面的元素要整体左移补位'] }), 6,
      '再看删除，删掉下标 ' + DEL + ' 上的 ' + gone + '。先把值取出来带回去，' +
      '然后麻烦来了：中间空了一格。顺序表靠地址相邻表达关系，中间不能留洞，后面的必须往前补。',
      ['删除下标 ' + DEL + '（值 ' + gone + '）', '中间出现空洞',
       '后面的元素要左移补位']));

    for (k = DEL + 1; k < len; k++) {
      a[k - 1] = a[k];
      mov++;
      steps.push(step(snap({ st: mark(k, 'hot', k - 1, 'active'), mv: [k, k - 1],
        notes: ['a[' + (k - 1) + '] ← a[' + k + ']',
          k === DEL + 1 ? '这次必须从空洞的后一个开始' : '继续往后推进',
          k === DEL + 1 ? '也就是从前往后，方向和插入相反' : '空洞一格一格往右移',
          '已移动 ' + mov + ' 次'] }), 8,
        k === DEL + 1
          ? '补位要从空洞后面的第一个开始，从前往后 —— 方向和插入正好相反。' +
            '把 ' + a[k - 1] + ' 从下标 ' + k + ' 挪到 ' + (k - 1) + '，空洞就右移了一格。'
          : '继续把 ' + a[k - 1] + ' 从下标 ' + k + ' 挪到 ' + (k - 1) +
            '。空洞被一路推到末尾，累计移动 ' + mov + ' 次。',
        ['a[' + (k - 1) + '] ← a[' + k + ']', '空洞右移到 ' + k,
         '累计移动 ' + mov + ' 次']));
    }

    a.pop();
    len--;
    steps.push(step(snap({ st: mark(len, 'mute'),
      notes: ['length 7 → 6', '末尾那格不必清空',
        'length 之外的内容按约定就是无效的',
        '本次移动 ' + mov + ' 次 = length - i - 1'] }), 9,
      '最后把 length 减一就完成了。末尾那一格的旧值不用擦 —— length 之外按约定就是垃圾。' +
      '这次移动了 ' + mov + ' 次，公式是 length - i - 1，删得越靠前挪得越多。',
      ['length = ' + len, '末尾不必清空',
       '移动 ' + mov + ' 次 = length - i - 1']));

    /* --- 代价总结 --- */
    steps.push(step(snap({
      notes: ['插在最前面 i=0：挪 n 次，最贵',
        '插在末尾 i=n：一次都不用挪',
        '平均要挪一半，所以是 O(n)',
        '这就是顺序表拿 O(1) 随机访问换来的代价'] }), 2,
      '把两头的极端情况摆出来：插到 i=0 要挪全部 n 个元素，插到末尾一个都不用挪，' +
      '平均下来挪一半。所以顺序表的插入删除是 O(n) —— 这是它换来 O(1) 随机访问付的价钱。',
      ['最坏 i=0：挪 n 次', '最好 i=n：挪 0 次',
       '平均 n/2，量级 O(n)']));

    return steps;
  }

  /* ---------- 场景二：满了怎么扩容 ---------- */
  function buildGrow() {
    var steps = [], old = [12, 25, 33, 47, 58, 61], nw = [];
    var cap = OLDCAP, cost = 0, i;
    var snap = function (o) {
      return { old: old.slice(), nw: nw.slice(),
               oldSt: o.oldSt || {}, nwSt: o.nwSt || {},
               showNew: !!o.showNew, freed: !!o.freed,
               moving: o.moving === undefined ? null : o.moving,
               copied: nw.length, cap: o.cap === undefined ? cap : o.cap,
               cost: o.cost === undefined ? cost : o.cost,
               notes: o.notes || [] };
    };

    steps.push(step(snap({ notes: ['length = 6，capacity = 6',
      '数组满了，再插一个就越界',
      'C 里数组一旦申请，长度就固定了',
      '所以只能另开一块更大的，再搬过去'] }), 1,
      '这一场看顺序表最尴尬的时刻：length 已经等于 capacity，数组满了。' +
      'C 语言里数组长度申请时就定死了，没法原地变长，只能另开一块更大的空间再把人搬过去。',
      ['length = capacity = ' + OLDCAP, '数组满，无法原地扩',
       '只能重新申请 + 搬迁'], 'grow'));


    cap = NEWCAP;
    steps.push(step(snap({ showNew: true, cap: NEWCAP,
      notes: ['realloc / malloc 一块 ' + NEWCAP + ' 格的新空间',
        '通常按倍数扩（这里 6 → 12）',
        '按倍数扩才能让均摊代价降到 O(1)',
        '每次只加固定几格会退化成 O(n)'] }), 10,
      '先申请一块新空间，容量取原来的两倍：' + OLDCAP + ' → ' + NEWCAP + '。' +
      '为什么翻倍而不是加一格？因为翻倍能让扩容次数按对数增长，均摊到每次插入才是 O(1)。',
      ['新申请 capacity = ' + NEWCAP, '按倍数扩容（×2）',
       '均摊代价才能是 O(1)'], 'grow'));

    for (i = 0; i < OLDCAP; i++) {
      nw.push(old[i]);
      cost++;
      steps.push(step(snap({ showNew: true, moving: i, cap: NEWCAP,
        oldSt: mark(i, 'hot'), nwSt: mark(i, 'active'),
        notes: ['new[' + i + '] ← old[' + i + ']',
          i === 0 ? '搬迁是逐个复制，一个都不能漏' : '继续复制下一个',
          i === 0 ? '新旧是两块不同的内存，没法共用' : '已复制 ' + cost + ' 个',
          '相对下标不变，所以关系也不变'] }), 11,
        i === 0
          ? '开始搬迁：把 old[0] 的 ' + old[i] + ' 复制到 new[0]。新旧是两块互不相干的内存，' +
            '只能一个一个抄过去，' + OLDCAP + ' 个元素就是 ' + OLDCAP + ' 次复制。'
          : '把 old[' + i + '] 的 ' + old[i] + ' 复制到 new[' + i + ']。' +
            '注意下标保持一致，所以元素之间的先后关系搬完之后一点没变，已复制 ' + cost + ' 个。',
        ['new[' + i + '] ← old[' + i + ']', '已复制 ' + cost + ' / ' + OLDCAP,
         '下标不变，关系不变'], 'grow'));
    }

    steps.push(step(snap({ showNew: true, freed: true, cap: NEWCAP,
      notes: ['free(old)：旧空间必须还回去',
        '忘了 free 就是内存泄漏',
        '释放后旧指针成了野指针，不能再碰',
        '要让表的指针指向新空间'] }), 11,
      '搬完之后把旧空间 free 掉，并让顺序表的指针指向新空间。这一步不能省：' +
      '忘了 free 就是内存泄漏，而释放后再用旧指针就是野指针访问。',
      ['free(old)', '表指针改指新空间',
       '旧指针不可再用'], 'grow'));

    steps.push(step(snap({ showNew: true, freed: true, cap: NEWCAP,
      notes: ['这一次扩容代价 = 复制 ' + OLDCAP + ' 次',
        '但下一次扩容要等到再插 ' + OLDCAP + ' 个',
        '所以均摊到每次插入只有常数几步',
        '这就是「均摊 O(1)」的来历'] }), 10,
      '这次扩容花了 ' + OLDCAP + ' 次复制，看着挺贵，但代价可以摊开看：' +
      '容量翻倍后要再插 ' + OLDCAP + ' 个元素才会触发下一次扩容，均摊到每次插入还是常数级。',
      ['单次扩容 O(n)', '翻倍后间隔也翻倍',
       '均摊每次插入 O(1)'], 'grow'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['sequential-list'] = {
    title: '顺序表（插入 / 删除 / 扩容）',
    subtitle: '元素挨着放，关系靠地址相邻表达。取值一步到位，代价是插入要腾位、删除要补位，装满了还得另开一块搬过去。',
    height: 730,
    code: [
      'ListInsert(&L, i, e):            // 在下标 i 处插入',
      '    if length == capacity: 扩容   // 满了先扩',
      '    for k = length-1 down to i:  // 必须倒着挪',
      '        a[k+1] = a[k]            // 否则覆盖后面的',
      '    a[i] = e;  length++          // 共移动 length-i 次',
      'ListDelete(&L, i, &e):           // 删掉下标 i',
      '    e = a[i]                     // 先把值取出来',
      '    for k = i+1 to length-1:     // 这次顺着挪',
      '        a[k-1] = a[k]            // 空洞右移补位',
      '    length--                     // 移动 length-i-1 次',
      'Grow(&L):  new = malloc(2*capacity)   // 按倍数扩',
      '    copy a → new;  free(a);  a = new  // 搬迁并释放'
    ],
    scenes: [
      { name: '插入与删除', build: buildList },
      { name: '装满了扩容', build: buildGrow }
    ]
  };
})();
