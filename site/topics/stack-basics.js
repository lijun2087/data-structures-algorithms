/* 顺序栈与链栈 — 第3章
 * 场景一：顺序栈 —— top 不指栈顶元素，而指栈顶的下一个空位。
 *         这个约定让 push 写成 S[top++]=e、pop 写成 e=S[--top]，
 *         而且 top==0 就是栈空、top==MAXSIZE 就是栈满，判定极干净。
 * 场景二：链栈 —— 栈顶就是链首，插删全在头上，一个头结点都不用。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* ---------- 场景一：顺序栈 ---------- */
  /* 栈画成竖着的一列，下标 0 在最下面 —— 和「栈」这个字的直觉一致。
   * 5 格：格高 32，间隙 4，自底 y=300 往上排，顶格 y=300-4*36=156，
   * 底格下沿 332，整列落在 y ∈ [156,332] 内。
   * 只放 5 格是为了在列上方留出 y ∈ [84,152] 的横带：标题 100、
   * 说明 124 / 148 都写在这里，宽度须止于 x=364（再往右会撞 top 标记）。
   * 下标写在左侧 x=278，top 标记挂在右侧 x=396，提示文字在 x=636。 */
  var CAP = 5;
  var SBX = 300, SBW = 80, SBH = 32, SBG = 4, SBY0 = 300;
  var IDXX = 278, TOPX = 396, NX = 636;
  var HX = 520, HY = 186;

  function syOf(i) { return SBY0 - i * (SBH + SBG); }

  /* f = { v:[值…], n:栈内元素个数, st:{下标:状态}, top, hold:{v,st,lab},
   *       cap1, cap2, notes, stats } */
  function renderSeq(ctx, f) {
    D.clear(ctx.stage);
    var i, y, c;

    ctx.stage.appendChild(D.text('顺序栈 S（MAXSIZE = ' + CAP + '）',
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));

    for (i = 0; i < CAP; i++) {
      y = syOf(i);
      // 栈内的格子才有底色，栈外的一律 mute —— 一眼看出水位在哪
      c = D.C[f.st[i] || (i < f.n ? 'good' : 'mute')];
      ctx.stage.appendChild(D.el('rect', { x: SBX, y: y, width: SBW,
        height: SBH, rx: 6, fill: c.fill, stroke: c.stroke,
        'stroke-width': 2, filter: 'url(#vzGlow)' }));
      if (i < f.n && f.v[i] != null) {
        ctx.stage.appendChild(D.text(f.v[i],
          { x: SBX + SBW / 2, y: y + 22, 'class': 'vz-cellval' }));
      }
      ctx.stage.appendChild(D.text(i,
        { x: IDXX, y: y + 22, 'class': 'vz-idx' }));
    }

    // 栈底恒在下标 0，栈顶随水位走 —— 标出来省得把这列看成普通数组
    ctx.stage.appendChild(D.text('栈底 →',
      { x: 196, y: syOf(0) + 22, 'class': 'vz-lab', fill: '#5f7099' }));
    if (f.n > 0) {
      ctx.stage.appendChild(D.text('栈顶 →',
        { x: 196, y: syOf(f.n - 1) + 22, 'class': 'vz-lab', fill: '#6ceaa5' }));
    }

    // top 指的是「下一个空位」，所以它可以停在 CAP 那一格之外
    if (f.top != null) {
      var ty = f.top < CAP ? syOf(f.top) + 21 : syOf(CAP - 1) - 9;
      ctx.stage.appendChild(D.text('← top = ' + f.top,
        { x: TOPX, y: ty, 'class': 'vz-ptr', fill: '#ffd166' }));
      ctx.stage.appendChild(D.text(f.top >= CAP ? '已越过顶格，栈满'
        : (f.top === 0 ? '停在 0 号格，栈空' : '这一格还是空的'),
        { x: TOPX, y: ty + 21, 'class': 'vz-lab',
          fill: f.top >= CAP ? '#dd3b3b' : '#8ea3c9' }));
    }

    // 悬在栈右侧的元素：正要压进去，或刚弹出来
    if (f.hold) {
      var hc = D.C[f.hold.st || 'active'];
      ctx.stage.appendChild(D.el('rect', { x: HX, y: HY, width: SBW,
        height: SBH, rx: 6, fill: hc.fill, stroke: hc.stroke,
        'stroke-width': 2, filter: 'url(#vzGlow)' }));
      ctx.stage.appendChild(D.text(f.hold.v,
        { x: HX + SBW / 2, y: HY + 22, 'class': 'vz-cellval' }));
      ctx.stage.appendChild(D.text(f.hold.lab || 'e',
        { x: HX + SBW / 2, y: HY - 9, 'class': 'vz-brace', fill: '#4aa3e0' }));
    }

    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 124, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 148, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: NX, y: 190 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  /* ---------- 场景二：链栈 ---------- */
  /* 链横着画，栈顶放在最左边 —— 因为链栈的栈顶就是链首，插删全在头上。
   * 结点 84×46，间距 112，自 x=148 起排 4 个，末尾 568，都在 x ≤ 977 内。
   * 链行 214…260，下方标签 277；待压/已弹的结点悬在上方 y=120。 */
  var NLX0 = 148, NLY = 214, NLW = 84, NLH = 46, NLP = 112;
  var SPX = 62, NLHX = 148, NLHY = 120;

  /* f = { v:[栈顶→栈底的值…], st:[状态…], hold:{v,st,lab,toFirst},
   *       sNull, cap1, cap2, notes, stats } */
  function renderLinked(ctx, f) {
    D.clear(ctx.stage);
    var i, boxes = [];

    ctx.stage.appendChild(D.text('链栈 S（栈顶即链首，没有头结点）',
      { x: 44, y: 106, 'class': 'vz-hdr', fill: '#8fa6d8' }));

    for (i = 0; i < f.v.length; i++) {
      var b = D.nodeBox(ctx.stage, { x: NLX0 + i * NLP, y: NLY,
        w: NLW, h: NLH, slots: ['data', 'next'],
        value: f.v[i], state: f.st[i] || 'idle' });
      boxes.push(b);
      ctx.stage.appendChild(D.text(i === 0 ? '栈顶' : (i === f.v.length - 1
          ? '栈底' : '第 ' + (i + 1) + ' 个'),
        { x: b.cx, y: NLY + NLH + 17,
          'class': i === 0 ? 'vz-tag' : 'vz-idx' }));
    }

    // S 只有一个：它就是栈顶指针，链栈不需要另设头结点
    ctx.stage.appendChild(D.text('S',
      { x: SPX, y: NLY + NLH / 2 + 5, 'class': 'vz-ptr' }));
    if (f.sNull || !boxes.length) {
      ctx.stage.appendChild(D.text('= NULL　栈空',
        { x: SPX + 16, y: NLY + NLH / 2 + 5, 'class': 'vz-lab',
          fill: '#8ea3c9' }));
    } else {
      D.link(ctx.stage, { x1: SPX + 14, y1: NLY + NLH / 2,
        x2: boxes[0].x - 3, y2: NLY + NLH / 2, kind: 'ptr' });
    }

    for (i = 0; i + 1 < boxes.length; i++) {
      D.link(ctx.stage, { x1: boxes[i].slotX('next'), y1: NLY + NLH / 2,
        x2: boxes[i + 1].x - 3, y2: NLY + NLH / 2, kind: 'next' });
    }
    // 栈底结点的 next 是 NULL —— 链栈没有栈满，只有 malloc 失败
    if (boxes.length) {
      var tl = boxes[boxes.length - 1];
      ctx.stage.appendChild(D.text('∧',
        { x: tl.slotX('next'), y: NLY + NLH - 9, 'class': 'vz-ptr',
          fill: '#4a5c82' }));
    }

    // 悬在上方的结点：刚 malloc 出来还没挂上，或刚摘下来还没 free
    if (f.hold) {
      var hb = D.nodeBox(ctx.stage, { x: NLHX, y: NLHY, w: NLW, h: NLH,
        slots: ['data', 'next'], value: f.hold.v,
        state: f.hold.st || 'active' });
      ctx.stage.appendChild(D.text(f.hold.lab || 'p',
        { x: hb.x - 14, y: NLHY + NLH / 2 + 5, 'class': 'vz-ptr',
          fill: '#4aa3e0' }));
      // 新结点的 next 要接到原栈顶：画成一条下垂的弧
      if (f.hold.toFirst && boxes.length) {
        D.link(ctx.stage, { x1: hb.slotX('next'), y1: NLHY + NLH,
          x2: boxes[0].cx, y2: NLY - 4, kind: 'hot', curve: -18 });
      }
      if (f.hold.st === 'bad') D.cross(ctx.stage, hb.cx, hb.cy, 9);
    }

    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 302, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 326, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: 676, y: 172 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'link') renderLinked(c, f); else renderSeq(c, f);
             } };
  }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* ---------- 场景一：顺序栈 ---------- */
  /* 一路压到栈满，再一路弹到栈空 —— 两个边界都撞一次，
   * top 的两种取值（0 和 MAXSIZE）就都亲眼见过了。 */
  function buildSeq() {
    var steps = [], VALS = [12, 25, 33, 47, 56];
    var v = [], n = 0, top = 0;

    var snap = function (o) {
      return { v: v.slice(), n: n, top: top, st: o.st || {},
               hold: o.hold || null,
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { 'top': top, '栈内元素': n,
               '状态': top === 0 ? '栈空' : (top >= CAP ? '栈满' : '可压可弹') };
    };

    steps.push(step(snap({
      cap1: 'top 指的不是栈顶元素，而是栈顶的下一个空位',
      cap2: '所以栈内有几个元素，top 就是几 —— top 同时充当长度',
      stats: base(),
      notes: ['顺序栈 = 数组 + 一个 top',
        'top 指「下一个能放的位置」',
        '空栈时 top = 0',
        '这个约定让四个操作都只有一行'] }), -1,
      '顺序栈就是一个数组加一个 top。要紧的是 top 的约定：它不指栈顶元素，' +
      '而指栈顶的下一个空位。空栈时 top = 0，栈内有几个元素 top 就是几。',
      ['数组 + 一个 top', 'top 指下一个空位',
       '空栈 top = 0']));

    for (var t = 0; t < VALS.length; t++) {
      var e = VALS[t];
      if (t === 0) {
        steps.push(step(snap({ st: mark(top, 'hot'),
          hold: { v: e, lab: 'e' },
          cap1: '入栈前先判满：top == MAXSIZE 吗？',
          cap2: 'top = ' + top + '，MAXSIZE = ' + CAP + '，还差得远，可以压',
          stats: base(),
          notes: ['Push 第一步：判栈满',
            '判据就一句 top == MAXSIZE',
            '因为 top 正好等于已用格数',
            '不满，就往 top 这一格放'] }), 1,
          '压入 ' + e + ' 之前先判满。判据只有一句 top == MAXSIZE —— 因为 top 恰好等于已用格数，' +
          '它顶到 MAXSIZE 就说明格子用尽了。现在 top = 0，尽管压。',
          ['判满：top == MAXSIZE', 'top = 0 < ' + CAP + '，不满',
           '目标格就是 top 这一格']));
      }

      v[top] = e; n = top + 1; top = top + 1;
      var full = top >= CAP;
      steps.push(step(snap({ st: mark(top - 1, 'active'),
        cap1: 'S.base[' + (top - 1) + '] = ' + e + '；然后 top++ → ' + top,
        cap2: full ? 'top 已经等于 MAXSIZE，再压就溢出了'
                   : '写在 top 那一格，再让 top 往上挪一格 —— 合起来就是 S[top++] = e',
        stats: base(),
        notes: ['S.base[top] = ' + e,
          'top++ → ' + top,
          '两句合成一句：S[top++] = e',
          full ? 'top == MAXSIZE，栈满了' : 'top 又停在一个空格上'] }), 2,
        '把 ' + e + ' 写进 S.base[' + (top - 1) + ']，再让 top 加一变成 ' + top + '。' +
        (full ? '这一下 top 顶到了 MAXSIZE，栈满 —— 注意满的时候 top 指的位置根本不存在。'
              : '因为 top 本来就指着空位，写入和自增能合成一句 S[top++] = e，不用先加再写。'),
        ['S.base[' + (top - 1) + '] = ' + e, 'top++ → ' + top,
         full ? 'top == MAXSIZE，栈满' : '合写：S[top++] = e']));
    }

    steps.push(step(snap({ st: mark(CAP - 1, 'good'),
      hold: { v: 78, lab: 'e', st: 'bad' },
      cap1: 'Push 78：判满 —— top == MAXSIZE，返回 ERROR',
      cap2: '顺序栈的容量在建栈时就定死了，满了就是满了',
      stats: base(),
      notes: ['再压 78：top == ' + CAP + ' == MAXSIZE',
        '直接返回 ERROR，不能写',
        'top 已经越过顶格，那个位置不存在',
        '这就是顺序栈的硬伤：容量定长'] }), 1,
      '再压一个 78 试试：top == MAXSIZE，Push 直接返回 ERROR。注意 top 此刻指的是顶格之外，' +
      '那个位置并不存在 —— 所以判满必须在写入之前，写完再判就已经越界了。',
      ['top == MAXSIZE，栈满', 'Push 返回 ERROR',
       '判满必须在写入之前']));

    // 一路弹到空：pop 只是 --top，格子里的旧值根本不用擦
    for (var k = 0; k < CAP; k++) {
      if (k === 0) {
        steps.push(step(snap({ st: mark(CAP - 1, 'hot'),
          cap1: '出栈前先判空：top == 0 吗？',
          cap2: 'top = ' + top + '，不是 0，栈里有货，可以弹',
          stats: base(),
          notes: ['Pop 第一步：判栈空',
            '判据同样只有一句 top == 0',
            '要弹的是 top-1 那一格，不是 top',
            'top 指的那格本来就是空的'] }), 3,
          '出栈之前先判空，判据是 top == 0。要弹的元素在 top-1 那一格 —— 别弹 top 那一格，' +
          '按约定它本来就是空的。这是 top 指向空位带来的唯一一处别扭。',
          ['判空：top == 0', 'top = ' + top + '，不空',
           '待弹元素在 top-1']));
      }

      top = top - 1; n = top;
      var got = v[top];
      steps.push(step(snap({ st: mark(top, 'mute'),
        hold: { v: got, lab: 'e', st: 'good' },
        cap1: 'top-- → ' + top + '；e = S.base[' + top + '] = ' + got,
        cap2: '合起来就是 e = S[--top]；那一格的旧值不用擦，下次压入会盖掉',
        stats: base(),
        notes: ['top-- → ' + top,
          'e = S.base[' + top + '] = ' + got,
          '合成一句：e = S[--top]',
          top === 0 ? 'top 回到 0，栈空了' : '格子里的旧值留着也无妨'] }), 4,
        'top 先减一变成 ' + top + '，再取 S.base[' + top + '] 得到 ' + got +
        '，合起来就是 e = S[--top]。' +
        (top === 0 ? '弹到这里 top 回到 0，栈空 —— 和初始状态一模一样。'
                   : '被弹掉的那一格不用清空：它现在在 top 之上，逻辑上已经不属于栈了。'),
        ['top-- → ' + top, 'e = S[--top] = ' + got,
         top === 0 ? 'top == 0，栈空' : '旧值无需擦除']));
    }

    steps.push(step(snap({
      cap1: 'top == 0，栈空；再弹一次就是 Pop 返回 ERROR',
      cap2: '四个判断全落在 top 一个变量上，这就是这套约定的好处',
      stats: { 'top': top, '栈空判据': 'top == 0',
               '栈满判据': 'top == MAXSIZE', '四个操作': '全是 O(1)' },
      notes: ['栈空 top == 0，栈满 top == MAXSIZE',
        '元素个数就是 top，不用另设 length',
        'Push / Pop 各一行，都是 O(1)',
        '代价：容量定长，满了不能长'] }), 3,
      '全弹完，top 回到 0。回头看这套约定省下了多少事：栈空判 top == 0，栈满判 top == MAXSIZE，' +
      '元素个数就是 top，Push / Pop 各一行且都是 O(1)。唯一的代价是容量定长。',
      ['栈空 top == 0', '栈满 top == MAXSIZE',
       '四个操作全 O(1)']));

    return steps;
  }

  /* ---------- 场景二：链栈 ---------- */
  /* v[0] 恒为栈顶。压栈就是 unshift，弹栈就是 shift —— 数组这么写只是为了
   * 画图方便，要点是插删都落在链首，一步不用走。 */
  function buildLinked() {
    var steps = [], v = [], PUSH = [12, 25, 33];

    var snap = function (o) {
      return { v: v.slice(), st: o.st || [], hold: o.hold || null,
               sNull: !!o.sNull,
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '栈内元素': v.length, '栈顶': v.length ? v[0] : '—',
               '状态': v.length ? '非空' : '栈空' };
    };
    // 状态数组按位置给：0 号是栈顶，其余一律 idle
    function sts(i0, s0) {
      var a = [], i;
      for (i = 0; i < v.length; i++) a.push('idle');
      if (i0 != null && a[i0]) a[i0] = s0 || 'active';
      return a;
    }

    steps.push(step(snap({ sNull: true,
      cap1: '链栈：栈顶就是链首，S 直接指着栈顶结点',
      cap2: '不设头结点 —— 插删都在头上，头结点省下来的那一步没人需要',
      stats: base(),
      notes: ['链栈 = 只在头部插删的单链表',
        'S 就是栈顶指针，S == NULL 即栈空',
        '不需要头结点',
        '也没有栈满，除非 malloc 失败'] }), 5,
      '链栈是只在头部插删的单链表：S 直接指着栈顶结点，S == NULL 就是栈空。' +
      '单链表爱设头结点是为了让「删首元」和「删其他」写法一致，链栈只删首元，这一步就省了。',
      ['栈顶即链首', 'S == NULL 即栈空',
       '不需要头结点'], 'link'));

    for (var t = 0; t < PUSH.length; t++) {
      var e = PUSH[t], first = !v.length;

      steps.push(step(snap({ st: sts(0, 'good'), sNull: first,
        hold: { v: e, lab: 'p', st: 'hot', toFirst: !first },
        cap1: 'p = malloc(); p->data = ' + e + '; p->next = S',
        cap2: first ? 'S 现在是 NULL，所以 p->next = NULL，它将成为栈底'
                    : '新结点的 next 先接上原栈顶 ' + v[0] + '，顺序不能反',
        stats: base(),
        notes: ['先申请结点，写好 data',
          'p->next = S：接上原来的栈顶',
          first ? 'S 为 NULL，这将是栈底结点' : '此刻链上还有两个入口',
          '必须先接后改，反了就断链'] }), 6,
        '压入 ' + e + '：申请结点，写好 data，然后 p->next = S 把它接到原栈顶前面。' +
        (first ? 'S 现在是 NULL，所以这个结点的 next 就是 NULL，它会一直待在栈底。'
               : '顺序要紧：必须先让 p->next 接上原栈顶，再动 S。反过来先改 S，原来那条链就找不回来了。'),
        ['p->data = ' + e, 'p->next = S',
         first ? 'S 是 NULL，此结点为栈底' : '先接后改，否则断链'], 'link'));

      v.unshift(e);
      steps.push(step(snap({ st: sts(0, 'active'),
        cap1: 'S = p —— 栈顶换成新结点',
        cap2: '插在链首，不用走一步就找到位置，所以 Push 是 O(1)',
        stats: base(),
        notes: ['S = p，栈顶指针前移',
          '插入位置永远是链首',
          '不用遍历，不用找前驱',
          'Push 是 O(1)'] }), 7,
        'S = p，栈顶指针换成新结点，' + e + ' 就压进去了。插入位置永远是链首，' +
        '既不用遍历也不用找前驱，所以 Push 恒为 O(1) —— 和顺序栈一样快，还不受容量限制。',
        ['S = p', '插入永远在链首',
         'Push 是 O(1)'], 'link'));
    }

    // 弹两个：摘链首 + free，同样一步不用走
    for (var k = 0; k < 2; k++) {
      var head = v[0], nxt = v[1];

      steps.push(step(snap({ st: sts(0, 'hot'),
        cap1: '判空：S == NULL 吗？不是，栈顶是 ' + head,
        cap2: 'p = S —— 先拿住栈顶结点，等下要 free 它',
        stats: base(),
        notes: ['Pop 第一步：判 S == NULL',
          '不空，取 e = S->data = ' + head,
          'p = S：拿住这个结点',
          '不拿住就 free 不掉了'] }), 8,
        '出栈先判 S == NULL。不空，取 e = S->data = ' + head + '，同时用 p 记住这个结点 —— ' +
        '一会儿 S 要往后挪，不先拿住它，这块内存就再也找不到了。',
        ['判空：S == NULL', 'e = S->data = ' + head,
         'p = S，先拿住结点'], 'link'));

      v.shift();
      steps.push(step(snap({ st: sts(0, 'good'), sNull: !v.length,
        hold: { v: head, lab: 'p', st: 'bad' },
        cap1: 'S = S->next；free(p)',
        cap2: v.length ? '栈顶换成 ' + nxt + '，摘下来的结点还给系统'
                       : 'S 变成 NULL，栈空了 —— 链栈就是这样收干净的',
        stats: base(),
        notes: ['S = S->next，栈顶后移',
          'free(p)，把结点还回去',
          v.length ? '新栈顶是 ' + nxt : 'S == NULL，栈空',
          '只改一个指针：Pop 也是 O(1)'] }), 9,
        'S = S->next 让栈顶后移' + (v.length ? '到 ' + nxt : '，S 变成 NULL') +
        '，再 free(p) 把摘下的结点还给系统。只改一个指针，Pop 同样是 O(1)。' +
        '别漏了 free —— 顺序栈的格子是复用的，链栈的结点不还就是泄漏。',
        ['S = S->next', 'free(p)',
         v.length ? '新栈顶 ' + nxt : 'S == NULL，栈空'], 'link'));
    }

    steps.push(step(snap({ st: sts(0, 'done'),
      cap1: '链栈没有「栈满」这一说 —— 只有 malloc 失败',
      cap2: '代价是每个结点多一个 next 指针，空间开销比顺序栈大',
      stats: { '栈内元素': v.length, 'Push / Pop': '都是 O(1)',
               '栈空判据': 'S == NULL', '有无栈满': '无，除非 malloc 失败' },
      notes: ['两种栈的 Push / Pop 都是 O(1)',
        '顺序栈容量定长，链栈随要随给',
        '链栈每结点多一个指针的开销',
        '多个栈共存时链栈更省心'] }), 5,
      '两种实现摆在一起：Push / Pop 都是 O(1)，差别在容量和开销。顺序栈定长、判满一句话、' +
      '空间紧凑；链栈随要随给、没有栈满，但每个结点多一个指针。要同时开好几个栈时，链栈更省心。',
      ['两者都是 O(1)', '顺序栈定长，链栈不限',
       '链栈多一个指针的开销'], 'link'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['stack-basics'] = {
    title: '顺序栈与链栈',
    subtitle: '顺序栈的 top 不指栈顶元素，而指栈顶的下一个空位 —— 于是栈空是 top==0、栈满是 top==MAXSIZE，Push / Pop 各一行。链栈的栈顶就是链首，插删全在头上，连头结点都不用。',
    height: 730,
    code: [
      '// 顺序栈：top 指栈顶的下一个空位，非栈顶元素',
      'Push(S, e):  if S.top == MAXSIZE: return ERROR',
      '    S.base[S.top++] = e        // 写完 top 才加',
      'Pop(S, &e):  if S.top == 0: return ERROR',
      '    e = S.base[--S.top]        // 先减再取',
      '// 链栈：栈顶即链首，S == NULL 即栈空，无头结点',
      'Push(S, e):  p = malloc();  p->data = e',
      '    p->next = S;  S = p        // 先接后改，O(1)',
      'Pop(S, &e):  if S == NULL: return ERROR',
      '    p = S;  e = S->data',
      '    S = S->next;  free(p)      // 摘链首，O(1)',
      '// 顺序栈定长，判满一句话；链栈不限，多个指针',
      '// 两者的 Push / Pop 都是 O(1)'
    ],
    scenes: [
      { name: '顺序栈', build: buildSeq },
      { name: '链栈', build: buildLinked }
    ]
  };
})();
