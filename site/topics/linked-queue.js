/* 链队列 — 第3章
 * 场景一：入队 —— 新结点挂到 rear->next，rear 前移接手队尾，恒为 O(1)。
 * 场景二：出队 —— 摘掉 front->next；队里只剩一个时必须补一句 rear = front，
 *         否则 rear 指着刚 free 掉的内存，成了悬空指针。这是链队列最常写错的地方。
 * 场景三：与循环队列对比 —— 链队列不必预设容量、没有假溢出，代价是每个结点多一个指针。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 链式布局：结点 84×46，间距 112，自 x=96 起。
   * 一条链最多画 5 个盒子（头结点 + 4 个数据结点），末盒右边止于 628，
   * 提示文字自 x=676 起，撞不上。
   * 竖直方向自上而下：标题 100、说明 122 / 144、
   * 游离结点行 160…206（新申请的 s、或已摘下待 free 的 p）、
   * 链表主行 232…278、front 标记 296、rear 标记 318，全在 330 以内。 */
  var NW = 84, NH = 46, PITCH = 112, NX0 = 96;
  var NY = 232, GY = 160, NX = 676;
  var CY = NY + NH / 2;

  function nxOf(i) { return NX0 + i * PITCH; }
  function ncOf(i) { return nxOf(i) + NW / 2; }

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* f = { nodes:[{v,st}…]（下标 0 恒为头结点）, front, rear,
   *       ghost:{v,at,st,lab,up}, bridge:[a,b], cut:idx, nullAt:idx,
   *       hdr, cap1, cap2, notes, stats } */
  function renderChain(ctx, f) {
    D.clear(ctx.stage);
    var i, boxes = [], nd, last = f.nodes.length - 1;

    ctx.stage.appendChild(D.text(f.hdr || '链队列',
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 144, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    for (i = 0; i < f.nodes.length; i++) {
      nd = f.nodes[i];
      boxes.push(D.nodeBox(ctx.stage, { x: nxOf(i), y: NY, w: NW, h: NH,
        slots: ['data', 'next'], value: nd.v, state: nd.st || 'idle' }));
      ctx.stage.appendChild(D.text(i === 0 ? '头结点' : '第 ' + i + ' 个',
        { x: ncOf(i), y: NY + NH + 16, 'class': 'vz-idx' }));
    }
    // 相邻结点之间的 next 指针；末结点的 next 画成 ∧ 表示 NULL
    for (i = 0; i < last; i++) {
      D.link(ctx.stage, { x1: boxes[i].slotX('next'), y1: CY,
        x2: nxOf(i + 1) - 3, y2: CY, kind: 'next' });
    }
    ctx.stage.appendChild(D.text('∧',
      { x: boxes[last].slotX('next'), y: NY + NH - 9, 'class': 'vz-ptr' }));

    // 头结点跨过被删结点的那条新 next：走上方，与原链错开
    if (f.bridge) {
      D.link(ctx.stage, { x1: boxes[f.bridge[0]].slotX('next'), y1: NY + 2,
        x2: ncOf(f.bridge[1]), y2: NY - 2, kind: 'ptr', curve: -30 });
    }
    if (typeof f.cut === 'number') {
      D.cross(ctx.stage, boxes[f.cut].slotX('next') + 15, CY);
    }

    // 游离结点：入队时是刚 malloc 的 s，出队时是已摘下待 free 的 p
    if (f.ghost) {
      var gb = D.nodeBox(ctx.stage, { x: nxOf(f.ghost.at), y: GY, w: NW, h: NH,
        slots: ['data', 'next'], value: f.ghost.v, state: f.ghost.st || 'hot' });
      ctx.stage.appendChild(D.text('∧',
        { x: gb.slotX('next'), y: GY + NH - 9, 'class': 'vz-ptr' }));
      ctx.stage.appendChild(D.text(f.ghost.lab || '',
        { x: ncOf(f.ghost.at), y: GY - 10, 'class': 'vz-tag', fill: '#ffd166' }));
      if (f.ghost.up) {
        D.link(ctx.stage, { x1: boxes[f.rear].slotX('next'), y1: NY - 2,
          x2: nxOf(f.ghost.at) + 20, y2: GY + NH + 4, kind: 'hot' });
      }
    }

    ctx.stage.appendChild(D.text('front ↑ ' + (f.front === 0 ? '头结点' : f.front),
      { x: ncOf(f.front), y: 296, 'class': 'vz-ptr' }));
    ctx.stage.appendChild(D.text('rear ↑ ' + (f.rear === 0 ? '头结点' : f.rear),
      { x: ncOf(f.rear), y: 318, 'class': 'vz-ptr', fill: '#ff9f6b' }));

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: NX, y: 190 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  /* ---------- 场景三的对比表 ----------
   * 两列并排：左列循环队列（x=90…420），右列链队列（x=520…850）。
   * 表头 y=180，四行条目自 y=212 起，行距 30，末行 302，仍在 330 以内。 */
  var TBX = [90, 520], TBW = 330, TRY0 = 212, TRH = 30;

  function renderCmp(ctx, f) {
    D.clear(ctx.stage);
    var i, j, row;

    ctx.stage.appendChild(D.text(f.hdr || '循环队列 vs 链队列',
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 144, 'class': 'vz-info', fill: '#8ea3c9' }));
    }
    for (j = 0; j < 2; j++) {
      ctx.stage.appendChild(D.text(j === 0 ? '循环队列（顺序存储）' : '链队列（链式存储）',
        { x: TBX[j] + TBW / 2, y: 180, 'class': 'vz-tag',
          fill: j === 0 ? '#4aa3e0' : '#6ceaa5' }));
    }
    for (i = 0; i < f.rows.length && i < 4; i++) {
      row = f.rows[i];
      for (j = 0; j < 2; j++) {
        var c = D.C[row.st && row.st[j] ? row.st[j] : 'idle'];
        ctx.stage.appendChild(D.el('rect', { x: TBX[j], y: TRY0 + i * TRH,
          width: TBW, height: TRH - 6, rx: 6, fill: c.fill, stroke: c.stroke,
          'stroke-width': 1.6 }));
        ctx.stage.appendChild(D.text(row.txt[j],
          { x: TBX[j] + 12, y: TRY0 + i * TRH + 16, 'class': 'vz-info' }));
      }
      ctx.stage.appendChild(D.text(row.key,
        { x: 44, y: TRY0 + i * TRH + 16, 'class': 'vz-lab', fill: '#8ea3c9' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'cmp') renderCmp(c, f); else renderChain(c, f);
             } };
  }

  /* ---------- 场景一：入队 ---------- */
  /* 从空队列起连入 A、B、C。每次入队拆成「申请结点」「挂到 rear->next」
   * 「rear 前移」三帧 —— 看清 rear 是怎么一路把队尾接手过去的。 */
  function buildEnq() {
    var steps = [];
    var nodes = [{ v: '头', st: 'mute' }];
    var front = 0, rear = 0, cnt = 0;

    var snap = function (o) {
      var ns = [], i;
      for (i = 0; i < nodes.length; i++) {
        ns.push({ v: nodes[i].v,
                  st: o.st && o.st[i] ? o.st[i] : (nodes[i].st || 'good') });
      }
      return { nodes: ns, front: front, rear: rear,
               ghost: o.ghost || null, bridge: null, cut: null,
               hdr: o.hdr || '入队：只动 rear 这一端',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '队内元素': cnt, 'front 指向': '头结点',
               'rear 指向': rear === 0 ? '头结点' : '第 ' + rear + ' 个',
               '入队代价': 'O(1)' };
    };

    steps.push(step(snap({
      hdr: '链队列：头结点 + front / rear 两个指针',
      cap1: '队列两端分工：入队动队尾，出队动队头 —— 所以两头都得有指针',
      cap2: 'front 恒指头结点，rear 指队尾结点；头结点不存数据，只占位',
      st: { 0: 'mute' },
      stats: { '存储': '链式', 'front': '指头结点', 'rear': '指队尾',
               '队空判据': 'front == rear' },
      notes: ['单链表只有一个 head，不够用',
        '出队要摘队头，入队要接队尾',
        '两端各给一个指针，各管一头',
        '再加一个头结点，省掉全部特判'] }), 0,
      '队列一端进一端出，所以链式实现要两个指针：front 管队头、rear 管队尾。' +
      '再约定头结点不存数据，front 永远指着它 —— 这个空壳能省掉一大堆特判。',
      ['front 管队头，rear 管队尾', '头结点不存数据，只占位',
       'front == rear 即队空']));

    steps.push(step(snap({
      hdr: '为什么非要头结点',
      cap1: '若不设头结点：队空时 front 是 NULL，插第一个结点得改 front 本身',
      cap2: '有了头结点，第一个结点也是挂在 rear->next 上 —— 入队代码只有一种写法',
      st: { 0: 'mute' },
      stats: { '不设头结点': '插首元素要特判', '设头结点': '统一写法',
               '代价': '多一个空壳结点', '队空': 'front == rear' },
      notes: ['不设头结点时，空队 front = rear = NULL',
        '插第一个结点必须同时改 front 和 rear',
        '删最后一个结点又得把 front 置回 NULL',
        '头结点把这两处特判一起抹掉'] }), 6,
      '不设头结点的话：队空时 front 是 NULL，插第一个结点要连 front 一起改，' +
      '删到空又得把 front 置回 NULL，一头一尾两处特判。有了头结点，首元素也挂在 rear->next 上。',
      ['空队 front = rear = 头结点', '插首元素不必改 front',
       '入队代码只剩一种写法']));

    steps.push(step(snap({
      cap1: 'InitQueue：front = rear = 头结点，头结点的 next 为 NULL',
      cap2: '此刻 front == rear，这就是队空 —— 判据只看两个指针是否重合',
      st: { 0: 'mute' },
      stats: { '队内元素': 0, 'front': '头结点', 'rear': '头结点',
               'front == rear': '成立 → 队空' },
      notes: ['只申请了一个头结点',
        'front 与 rear 都指着它',
        '头结点的 next 是 NULL',
        'front == rear → 队空'] }), 6,
      '初始化只做一件事：申请头结点，让 front 和 rear 都指着它，next 置 NULL。' +
      '此时 front == rear，正是队空。这个判据在链队列里始终成立，不会有循环队列那种歧义。',
      ['申请头结点', 'front = rear = 头结点',
       'front == rear → 队空']));

    function enq(v) {
      var at = nodes.length;
      steps.push(step(snap({
        ghost: { v: v, at: at, st: 'hot', lab: 's = malloc(QNode)' },
        cap1: '第一步：申请新结点 s，填上数据 ' + v + '，next 先置 NULL',
        cap2: '此刻 s 还是游离的 —— 链上谁都指不到它，它也指不到链上',
        stats: base(),
        notes: ['malloc 一个结点，放数据 ' + v,
          's->next = NULL，它将成为新队尾',
          '此刻它与链表毫无关系',
          '下一步才把它挂上去'] }), 2,
        '入队 ' + v + ' 的第一步：malloc 一个结点 s，写入数据，next 置 NULL。' +
        '注意它现在还游离在链外 —— 顺序队列是往格子里写值，链队列得先申请空间。',
        ['s = malloc(QNode)', 's->data = ' + v + '，s->next = NULL',
         '尚未挂入链表']));

      steps.push(step(snap({
        ghost: { v: v, at: at, st: 'hot', lab: 's', up: true },
        cap1: '第二步：rear->next = s —— 把 s 挂到当前队尾之后',
        cap2: 'rear 直接指着队尾，这一句不用遍历任何结点，代价与队长无关',
        stats: base(),
        notes: ['rear->next 原本是 NULL',
          '现在改成指向 s',
          '因为 rear 直接指着队尾…',
          '…所以不必从头遍历，O(1)'] }), 3,
        '第二步：rear->next = s，把 s 接到当前队尾后面。要紧的是不必遍历 —— ' +
        'rear 本来就指着队尾。若只有 front，这里就得走到链尾，代价掉成 O(n)。',
        ['rear->next = s', '不必遍历链表',
         '代价与队长无关']));

      nodes.push({ v: v, st: 'active' });
      rear = at; cnt++;
      var hot = {}; hot[at] = 'active';
      steps.push(step(snap({
        st: hot,
        cap1: '第三步：rear = s —— rear 前移，接手新队尾',
        cap2: v + ' 已入队；三句都是常数时间，入队恒为 O(1)',
        stats: base(),
        notes: ['rear 从上一个结点移到 s',
          '新队尾的 next 是 NULL',
          '入队 ' + v + ' 完成，队内 ' + cnt + ' 个',
          '三句都是常数操作 → O(1)'] }), 4,
        '第三步：rear = s，rear 前移接手新队尾，' + v + ' 入队完成。' +
        '整个入队就是申请、挂上、移指针三句，都是常数时间，所以链队列入队恒为 O(1)。',
        ['rear = s', v + ' 已入队',
         '入队代价 O(1)']));
      nodes[at].st = 'good';
    }

    enq('A'); enq('B'); enq('C');

    steps.push(step(snap({
      hdr: '三个元素入队完毕',
      cap1: '链上是 头结点 → A → B → C，front 仍指头结点，rear 指 C',
      cap2: '没有 MAXSIZE，也没有假溢出 —— 内存够就能一直入队',
      st: { 0: 'mute' },
      stats: { '队内元素': 3, 'rear 指向': '第 3 个（C）',
               '入队代价': 'O(1)', '容量上限': '无（受内存限制）' },
      notes: ['front 全程没动过一下',
        'rear 一路把队尾接手过来',
        '不必预设容量，不存在队满',
        '代价：每个结点多一个 next 指针'] }), 5,
      '三个元素入队完毕。front 全程一动没动，rear 一路把队尾接手过来。' +
      '链队列不必预设 MAXSIZE，也就没有假溢出，代价是每个结点多花一个指针的空间。',
      ['头 → A → B → C', 'front 未动，rear 指 C',
       '无容量上限']));

    return steps;
  }

  /* ---------- 场景二：出队，以及只剩一个元素时的悬空指针 ---------- */
  /* 从 头→A→B 起：先正常删 A（rear 无关，四句就够），再删 B —— 这时 B 正是
   * rear 指着的结点，free 掉之后 rear 就悬空了，必须补 rear = front。 */
  function buildDeq() {
    var steps = [];
    var nodes = [{ v: '头', st: 'mute' }, { v: 'A', st: 'good' },
                 { v: 'B', st: 'good' }];
    var front = 0, rear = 2, cnt = 2, freed = 0;

    var snap = function (o) {
      var ns = [], i;
      for (i = 0; i < nodes.length; i++) {
        ns.push({ v: nodes[i].v,
                  st: o.st && o.st[i] ? o.st[i] : (nodes[i].st || 'good') });
      }
      return { nodes: ns, front: front, rear: o.rear === undefined ? rear : o.rear,
               ghost: o.ghost || null, bridge: o.bridge || null,
               cut: o.cut === undefined ? null : o.cut,
               hdr: o.hdr || '出队：摘掉 front->next',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '队内元素': cnt, '已释放结点': freed,
               'rear 指向': rear === 0 ? '头结点' : '第 ' + rear + ' 个',
               '出队代价': 'O(1)' };
    };

    steps.push(step(snap({
      cap1: '出队要删的是队头元素，也就是头结点后面那一个：p = front->next',
      cap2: '删链上结点得先拿到它的前驱 —— 头结点正好当了 A 的前驱，白捡一个便利',
      st: { 0: 'mute', 1: 'active' },
      stats: { '队内元素': 2, '要删的结点': 'p = front->next',
               'p 的前驱': '头结点', '出队代价': 'O(1)' },
      notes: ['队头元素是 front->next',
        '删结点必须知道它的前驱',
        '头结点天然就是队头的前驱',
        '这是头结点的第二个好处'] }), 8,
      '出队删的是队头，也就是 front->next 指的那个结点 p。删链上结点必须先拿到前驱 —— ' +
      '而头结点正好是队头的前驱，白捡一个便利，这是设头结点的第二个好处。',
      ['p = front->next', '删结点需要前驱',
       '头结点就是队头的前驱']));

    steps.push(step(snap({
      cap1: '判空要先做：front == rear 时队里没元素，直接返回 ERROR',
      cap2: '此刻 front 指头结点、rear 指第 2 个，两者不等，可以往下删',
      st: { 0: 'mute' },
      stats: { 'front': '头结点', 'rear': '第 2 个',
               'front == rear': '不成立', '判定': '非空，可出队' },
      notes: ['空队列上做出队是错误操作',
        '判据仍是 front == rear',
        '链队列这一判据没有歧义',
        '不像循环队列要另想办法'] }), 7,
      '动手之前先判空：front == rear 就是队空，直接返回 ERROR。' +
      '链队列这条判据干净得多 —— 循环队列的 front == rear 既可能是空又可能是满，链队列只可能是空。',
      ['先判 front == rear', '空队出队返回 ERROR',
       '链队列此判据无歧义']));

    // 第一次出队：删 A，rear 指着 B，与本次删除无关
    var brg = [0, 2];
    steps.push(step(snap({
      st: { 0: 'mute', 1: 'hot' }, bridge: brg, cut: 1,
      cap1: 'front->next = p->next —— 头结点越过 A，直接指向 B',
      cap2: 'A 就此脱链；它原来的 next 已经没人看了，画个叉表示作废',
      stats: base(),
      notes: ['p 指 A，p->next 指 B',
        '头结点的 next 改指 B',
        'A 脱链，但内存还没还给系统',
        '接下来 free(p)'] }), 9,
      '关键一句：front->next = p->next，让头结点越过 A 直接指向 B，A 就此脱链。' +
      '只改一个指针，不必挪动任何数据 —— 这是链式存储相对顺序存储的长处。',
      ['front->next = p->next', 'A 脱链',
       '只改一个指针']));

    nodes.splice(1, 1);
    rear = 1; cnt = 1; freed = 1;
    steps.push(step(snap({
      st: { 0: 'mute' },
      ghost: { v: 'A', at: 1, st: 'bad', lab: 'free(p)：内存已归还' },
      cap1: 'free(p)：把 A 的空间还给系统，第一次出队完成',
      cap2: '这一次 rear 没受影响 —— 它指着 B，而 B 还在链上',
      stats: base(),
      notes: ['A 的内存已归还系统',
        '链上剩 头结点 → B',
        'rear 仍指 B，安然无事',
        '注意：这一次没动 rear'] }), 11,
      'free(p) 把 A 的空间还给系统，第一次出队完成。这一次 rear 毫发无伤 —— ' +
      '它指着 B，而 B 还好好地在链上。正因为这样，很多人就以为出队根本不用管 rear。',
      ['free(p)，A 已释放', '链上剩 头 → B',
       'rear 指 B，未受影响']));

    // 第二次出队：队里只剩 B，而 B 正是 rear 指的结点 —— 悬空指针就在这里
    steps.push(step(snap({
      hdr: '队里只剩一个元素了 —— 麻烦就在这一步',
      st: { 0: 'mute', 1: 'hot' },
      cap1: '再出队一次：p = front->next 指的是 B，而 rear 指的也是 B',
      cap2: '同一个结点既是队头又是队尾 —— 删掉它，rear 该指哪儿？',
      stats: { '队内元素': 1, 'p 指向': 'B（队头）',
               'rear 指向': 'B（队尾）', '隐患': 'p 与 rear 同一个结点' },
      notes: ['队里只剩一个元素时…',
        '…它既是队头也是队尾',
        'p 与 rear 指向同一个结点',
        '接着 free(p)，rear 就指向了废内存'] }), 8,
      '再出一次队，情况变了：队里只剩 B，它既是队头也是队尾，所以 p 和 rear 指的是同一个结点。' +
      '照上面那套删下去，free 掉 p 之后 rear 会指向什么？',
      ['只剩一个元素', 'p 与 rear 是同一个结点',
       'free 之后 rear 指向废内存']));

    steps.push(step(snap({
      st: { 0: 'mute', 1: 'hot' }, cut: 1,
      cap1: 'front->next = p->next —— B 的 next 是 NULL，于是头结点的 next 变回 NULL',
      cap2: '链已经空了，可 rear 还死死指着 B 这个即将被 free 的结点',
      stats: { '队内元素': 0, 'front->next': 'NULL',
               'rear 指向': 'B（就要被 free）', '状态': '危险' },
      notes: ['p->next 是 NULL',
        '头结点的 next 也变成 NULL',
        '逻辑上队列已经空了',
        '但 rear 还指着 B'] }), 9,
      'front->next = p->next 照常执行 —— B 的 next 是 NULL，头结点的 next 就变回 NULL，' +
      '逻辑上队列已空。可 rear 还死死指着 B，而 B 下一句就要被 free。',
      ['头结点 next 变回 NULL', '逻辑上队列已空',
       '但 rear 仍指着 B']));

    steps.push(step(snap({
      hdr: '错误写法：漏掉 rear = front，rear 成了悬空指针',
      st: { 0: 'mute' }, rear: 1,
      ghost: { v: 'B', at: 1, st: 'bad', lab: '已 free —— rear 指着这里！' },
      cap1: 'free(p) 之后 B 的内存已归还，rear 却还指着那个地址',
      cap2: '这叫悬空指针（dangling pointer）：地址还在，内容已不属于你',
      stats: { '队内元素': 0, 'front': '头结点',
               'rear': '悬空！', '后果': '下次入队即崩' },
      notes: ['B 的内存已经还给系统',
        'rear 保存的地址随之失效',
        '下次入队要执行 rear->next = s',
        '往废内存里写 → 崩溃或数据错乱'] }), 11,
      '如果就这样 free(p) 收工，rear 保存的地址已经失效 —— 这就是悬空指针。' +
      '下次入队要执行 rear->next = s，等于往已归还的内存里写东西，崩溃或诡异错乱就此埋下。',
      ['free(p) 后 rear 失效', '这叫悬空指针',
       '下次入队 rear->next 即出事']));

    steps.push(step(snap({
      hdr: '正确写法：删的是队尾结点时，补一句 rear = front',
      st: { 0: 'hot' }, rear: 0,
      cap1: 'if (rear == p) rear = front —— 把 rear 拉回头结点',
      cap2: '于是 front == rear 重新成立，队空状态恢复得干干净净',
      stats: { '队内元素': 0, 'front': '头结点', 'rear': '头结点',
               'front == rear': '成立 → 队空' },
      notes: ['判断条件：rear == p',
        '成立就把 rear 拉回 front（头结点）',
        'front == rear，队空判据自动恢复',
        '这一句是链队列最常被漏掉的地方'] }), 10,
      '正确的写法要在 free 之前判一句：if (rear == p) rear = front，把 rear 拉回头结点。' +
      '这样 front == rear 重新成立，队空状态恢复得干干净净，下次入队也不会碰到废内存。',
      ['if (rear == p) rear = front', 'rear 拉回头结点',
       'front == rear，队空恢复']));

    nodes.splice(1, 1);
    rear = 0; cnt = 0; freed = 2;
    steps.push(step(snap({
      hdr: '回到空队列：front == rear == 头结点',
      st: { 0: 'mute' },
      cap1: 'free(p) 之后链上只剩头结点，front 与 rear 又重合在它身上',
      cap2: '头结点始终不删 —— 它是这套统一写法的地基，直到 DestroyQueue 才释放',
      stats: { '队内元素': 0, '已释放结点': 2,
               'front == rear': '成立', '状态': '空队列，可继续入队' },
      notes: ['两个元素都已出队并释放',
        '头结点保留，front、rear 同指它',
        '状态与 InitQueue 之后完全一致',
        '所以再入队走的还是那三句'] }), 11,
      'free 掉之后链上只剩头结点，front 与 rear 又重合在它身上 —— 状态和刚初始化时一模一样。' +
      '头结点自始至终不删，它是这套无特判写法的地基，只在销毁整个队列时才释放。',
      ['链上只剩头结点', '状态同 InitQueue 之后',
       '头结点直到销毁才释放']));

    return steps;
  }

  /* ---------- 场景三：与循环队列对比 ---------- */
  function buildCmp() {
    var steps = [];
    var R = {
      cap: { key: '容量', txt: ['开数组时就定死 MAXSIZE', '不预设，内存够就能入队'] },
      of:  { key: '溢出', txt: ['要判队满；空一格才无歧义', '没有队满，也没有假溢出'] },
      sp:  { key: '空间', txt: ['只存数据，无额外指针', '每个结点多一个 next 指针'] },
      tm:  { key: '代价', txt: ['入出队 O(1)，无 malloc', '入出队 O(1)，但每次都要 malloc/free'] },
      ju:  { key: '判空', txt: ['front == rear 有歧义，要另加办法', 'front == rear 即队空，无歧义'] },
      us:  { key: '选用', txt: ['队长可估、追求稳定：选它', '队长波动大、上限难估：选它'] }
    };
    var snap = function (o) {
      return { rows: o.rows, hdr: o.hdr || '循环队列 vs 链队列',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               stats: o.stats || {} };
    };
    var pick = function (list, hi) {
      var out = [], i;
      for (i = 0; i < list.length; i++) {
        out.push({ key: list[i].key, txt: list[i].txt,
                   st: i === hi ? ['active', 'good'] : null });
      }
      return out;
    };

    var L1 = [R.cap, R.of, R.sp, R.tm];
    steps.push(step(snap({
      rows: pick(L1, 0),
      cap1: '循环队列靠取模在固定数组里绕，链队列靠 malloc 按需长',
      cap2: '第一条差别：容量 —— 一个开数组时就定死，一个根本不必预设',
      stats: { '循环队列': '顺序存储', '链队列': '链式存储',
               '本条对比': '容量', '结论': '链队列更灵活' },
      notes: [] }), 0,
      '两种队列的分野从存储方式就开始了。第一条是容量：循环队列开数组时 MAXSIZE 就定死了，' +
      '估小了要溢出、估大了浪费；链队列按需 malloc，内存够就能一直入队。',
      ['循环队列容量定死', '链队列按需申请',
       '上限难估时选链队列'], 'cmp'));

    steps.push(step(snap({
      rows: pick(L1, 1),
      cap1: '第二条：溢出 —— 循环队列必须判队满，还得为此牺牲一格或加变量',
      cap2: '链队列没有队满这回事，假溢出的问题也就不存在',
      stats: { '循环队列': '要判队满', '链队列': '无队满',
               '本条对比': '溢出', '结论': '链队列省心' },
      notes: [] }), 1,
      '第二条是溢出。循环队列为了区分队空队满，得空出一格、或加 flag、或加 count；' +
      '链队列压根没有队满这回事，前一节费劲治的假溢出，在这里从根上不存在。',
      ['循环队列要判队满', '链队列无队满',
       '假溢出问题不存在'], 'cmp'));

    steps.push(step(snap({
      rows: pick(L1, 2),
      cap1: '第三条：空间 —— 链队列的灵活不是白来的',
      cap2: '每个结点都要多存一个 next 指针，数据小的时候这笔开销相当可观',
      stats: { '循环队列': '无指针开销', '链队列': '每结点 +1 指针',
               '本条对比': '空间', '结论': '循环队列更省' },
      notes: [] }), 2,
      '第三条是空间，链队列的灵活不是白来的：每个结点都得多存一个 next。' +
      '若数据本身只是个 int，指针的开销就和数据一样大甚至更大 —— 这时循环队列明显更省。',
      ['链队列每结点多一个指针', '数据小则开销占比高',
       '循环队列空间更省'], 'cmp'));

    var L2 = [R.tm, R.ju, R.us];
    steps.push(step(snap({
      rows: pick([R.sp, R.tm, R.ju], 1),
      cap1: '第四条：时间 —— 两者入出队都是 O(1)，但常数不一样',
      cap2: '链队列每次入队要 malloc、出队要 free，这两个系统调用的开销不算小',
      stats: { '循环队列': 'O(1)，无系统调用',
               '链队列': 'O(1)，含 malloc/free',
               '本条对比': '时间常数', '结论': '循环队列更快' },
      notes: [] }), 3,
      '第四条是时间。渐进复杂度上两者打平，入出队都是 O(1)，但常数差得远：' +
      '链队列每入队一次 malloc、每出队一次 free，这两个调用比一次取模贵得多。',
      ['都是 O(1)', '链队列含 malloc/free',
       '循环队列常数更小'], 'cmp'));

    steps.push(step(snap({
      hdr: '怎么选',
      rows: pick(L2, 2),
      cap1: '队长能估个上限、又在意速度：循环队列',
      cap2: '队长起伏大、上限心里没数：链队列 —— 别拿最坏情况去开数组',
      stats: { '队长可估': '选循环队列', '上限难估': '选链队列',
               '判空': '链队列无歧义', '结论': '看场景取舍' },
      notes: [] }), 5,
      '所以没有哪个一定更好。队长能估出上限、又在意那点常数，用循环队列；' +
      '队长起伏大、上限心里没数，用链队列 —— 总比按最坏情况开一个大数组划算。',
      ['队长可估 → 循环队列', '上限难估 → 链队列',
       '按场景取舍'], 'cmp'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['linked-queue'] = {
    title: '链队列 Linked Queue',
    subtitle: '队列两端分工，所以要 front、rear 两个指针；再加一个不存数据的头结点，插首元素和判空的特判就全没了。唯一还得留神的是：删掉最后一个元素时，rear 会悬空，必须补一句 rear = front。',
    height: 720,
    code: [
      'typedef struct { QNode *front, *rear; } LinkQueue;',
      '',
      'InitQueue(Q):  Q.front = Q.rear = malloc(QNode)',
      '               Q.front->next = NULL     // 头结点不存数据',
      'EnQueue(Q,v):  s = malloc(QNode); s->data = v; s->next = NULL',
      '               Q.rear->next = s         // 挂到队尾之后',
      '               Q.rear = s               // rear 接手新队尾',
      'DeQueue(Q):    if Q.front == Q.rear: return ERROR   // 队空',
      '               p = Q.front->next        // 队头元素',
      '               Q.front->next = p->next  // 头结点越过 p',
      '               if Q.rear == p: Q.rear = Q.front  // 关键补丁',
      '               free(p)'
    ],
    scenes: [
      { name: '入队', build: buildEnq, codeTag: '入队：只动 rear',
        code: [
          '// 链队列：front 恒指头结点，rear 指队尾结点',
          'InitQueue(Q):  Q.front = Q.rear = malloc(QNode)',
          '               Q.front->next = NULL   // 头结点不存数据',
          '',
          'EnQueue(Q, v): s = malloc(QNode)      // ① 申请新结点',
          '               s->data = v; s->next = NULL',
          '               Q.rear->next = s       // ② 挂到队尾之后',
          '               Q.rear = s             // ③ rear 接手队尾',
          '// 三句都是常数操作 → 入队恒为 O(1)',
          '// 有头结点，插第一个元素也走这三句，不必特判',
          '',
          '队空: Q.front == Q.rear   // 无歧义，不像循环队列'
        ] },
      { name: '出队与悬空指针', build: buildDeq, codeTag: '出队：关键在第 10 行',
        code: [
          '// 出队：摘掉头结点后面那一个',
          'DeQueue(Q, &v):',
          '    if Q.front == Q.rear:',
          '        return ERROR              // 队空，不能出队',
          '',
          '',
          '',
          '    p = Q.front->next            // ① p 就是队头元素',
          '    v = p->data',
          '    Q.front->next = p->next      // ② 头结点越过 p',
          '    if Q.rear == p:              // ③ p 正是队尾？',
          '        Q.rear = Q.front         //    把 rear 拉回头结点',
          '    free(p)                      // ④ 归还内存'
        ] },
      { name: '与循环队列对比', build: buildCmp, codeTag: '两种队列的取舍',
        code: [
          '// 循环队列（顺序）        链队列（链式）',
          '容量  MAXSIZE 定死         按需 malloc，无上限',
          '溢出  要判队满/假溢出      无队满，无假溢出',
          '空间  只存数据             每结点多一个 next',
          '时间  O(1)，纯下标运算     O(1)，但含 malloc/free',
          '判空  front==rear 有歧义   front==rear 即空',
          '',
          '// 队长可估、在意常数  → 循环队列',
          '// 队长起伏大、上限未知 → 链队列',
          '// 两者的 ADT 完全一样，换实现不影响调用方'
        ] }
    ]
  };
})();
