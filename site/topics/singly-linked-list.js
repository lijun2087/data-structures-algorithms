/* 单链表 — 第2章
 * 场景一：找第 i 个元素只能从头一个一个数（对照顺序表的一步到位），
 *         然后插入 —— 关键是「先接后断」的赋值顺序。
 * 场景二：删除结点要先找前驱；以及头结点为什么能省掉一堆特殊判断。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：5 个结点 + 右侧要点栏，全部压在 y ∈ [84, 336] 之内
   * ghost 行 112…158（标签基线 104），链行 200…246，下标 262，游标标签 280 */
  var NW = 84, NH = 46, PITCH = 112;
  var NX0 = 96, NY = 200, GY = 112;
  var HEADX = 34, TX = 676;

  function nxOf(i) { return NX0 + i * PITCH; }

  /* f = { v:[值…], st:{下标:状态}, cur:{名字:下标}, skip:[下标…],
   *       cut:[下标…], ghost:{v,at,to,from,lab,st}, headNode:bool,
   *       head:'L', notes:[], stats:{} } */
  function renderChain(ctx, f) {
    D.clear(ctx.stage);
    var i, k, boxes = [];

    for (i = 0; i < f.v.length; i++) {
      var b = D.nodeBox(ctx.stage, { x: nxOf(i), y: NY, w: NW, h: NH,
        slots: ['data', 'next'], value: f.v[i], state: f.st[i] || 'idle' });
      boxes.push(b);
      // 头结点不存数据，标出来；其余结点标「第几个元素」，注意是从 1 数起
      if (f.headNode && i === 0) {
        ctx.stage.appendChild(D.text('头结点（data 域不用）',
          { x: b.cx, y: NY + NH + 17, 'class': 'vz-tag' }));
      } else {
        ctx.stage.appendChild(D.text('第 ' + (i + (f.headNode ? 0 : 1)) + ' 个',
          { x: b.cx, y: NY + NH + 17, 'class': 'vz-idx' }));
      }
    }

    // 头指针是单链表唯一的入口，丢了它整条链都找不回来
    if (boxes.length) {
      ctx.stage.appendChild(D.text(f.head || 'L',
        { x: HEADX + 8, y: NY + NH / 2 + 5, 'class': 'vz-ptr' }));
      D.link(ctx.stage, { x1: HEADX + 20, y1: NY + NH / 2,
        x2: boxes[0].x - 3, y2: NY + NH / 2, kind: 'next' });
    } else {
      ctx.stage.appendChild(D.text((f.head || 'L') + ' = NULL',
        { x: HEADX + 46, y: NY + NH / 2 + 5, 'class': 'vz-ptr' }));
    }

    for (i = 0; i + 1 < boxes.length; i++) {
      if (f.skip && f.skip.indexOf(i) >= 0) continue;
      D.link(ctx.stage, { x1: boxes[i].slotX('next'), y1: NY + NH / 2,
        x2: boxes[i + 1].x - 3, y2: NY + NH / 2, kind: 'next' });
    }
    if (boxes.length) {
      ctx.stage.appendChild(D.text('∧',
        { x: boxes[boxes.length - 1].slotX('next'), y: NY + NH - 9,
          'class': 'vz-ptr', fill: '#4a5c82' }));
    }

    // 悬在上方的新结点 / 刚摘下的结点
    if (f.ghost) {
      var gb = D.nodeBox(ctx.stage, { x: nxOf(f.ghost.at), y: GY, w: NW, h: NH,
        slots: ['data', 'next'], value: f.ghost.v,
        state: f.ghost.st || 'active' });
      ctx.stage.appendChild(D.text(f.ghost.lab || 's = 新结点',
        { x: gb.cx, y: GY - 8, 'class': 'vz-brace', fill: '#4aa3e0' }));
      if (f.ghost.to != null && boxes[f.ghost.to]) {
        D.link(ctx.stage, { x1: gb.slotX('next'), y1: GY + NH,
          x2: boxes[f.ghost.to].cx, y2: NY - 4, kind: 'hot', curve: 22 });
      }
      if (f.ghost.from != null && boxes[f.ghost.from]) {
        D.link(ctx.stage, { x1: boxes[f.ghost.from].slotX('next'), y1: NY - 4,
          x2: gb.x + 8, y2: GY + NH, kind: 'hot', curve: -22 });
      }
    }

    // 游标 p / q：链表操作全靠这几个指针来回挪
    var names = Object.keys(f.cur || {});
    for (k = 0; k < names.length; k++) {
      var at = f.cur[names[k]];
      if (!boxes[at]) continue;
      // 让箭杆起于下标行之下（下标基线 NY+NH+17），否则会横穿「第 N 个」
      D.pointer(ctx.stage, { name: names[k], x: boxes[at].cx, y: NY + NH + 20,
        above: false, color: names[k] === 'p' ? '#6ceaa5' : '#ffd166' });
    }

    for (k = 0; k < (f.cut || []).length; k++) {
      if (!boxes[f.cut[k]]) continue;
      D.cross(ctx.stage, boxes[f.cut[k]].slotX('next') + 16, NY + NH / 2, 8);
    }

    // 删除时 skip 只是把旧连线撤掉，新的 p->next 得单独画出来，
    // 否则前驱看着像断了。从链上方绕过被删结点。
    if (f.bridge) {
      D.link(ctx.stage, { x1: boxes[f.bridge[0]].slotX('next'), y1: NY - 2,
        x2: boxes[f.bridge[1]].cx, y2: NY - 2, kind: 'hot', curve: -26 });
    }

    for (k = 0; k < f.notes.length && k < 4; k++) {
      ctx.stage.appendChild(D.text(f.notes[k],
        { x: TX, y: 168 + k * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { renderChain(c, f); } };
  }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* ---------- 场景一：按序号查找 + 插入 ---------- */
  function buildInsert() {
    var steps = [], v = ['', 12, 25, 33], hops = 0;
    var snap = function (o) {
      return { v: v.slice(), st: o.st || {}, cur: o.cur || {},
               skip: o.skip || [], cut: o.cut || [], ghost: o.ghost || null,
               bridge: o.bridge || null,
               headNode: true, head: 'L', notes: o.notes || [],
               stats: o.stats || {} };
    };

    steps.push(step(snap({ notes: ['每个结点 = 数据域 data + 指针域 next',
      '结点在内存里可以散落各处',
      '先后关系全靠 next 显式写明',
      '代价：没法按下标直接算地址'] }), -1,
      '单链表的结点由数据域和指针域组成。结点在内存里不必挨着放，谁在谁后面完全靠 next 记录。' +
      '这带来了插入删除不用搬元素的好处，但也意味着不能像数组那样按下标算地址。',
      ['结点 = data + next', '关系靠指针显式表达',
       '不要求地址连续']));

    /* --- 按序号查找 --- */
    var POS = 3;   // 要在第 3 个位置插入，得先找到第 2 个结点作前驱
    steps.push(step(snap({ st: mark(0, 'active'), cur: mark('p', 0),
      stats: { '目标位置 i': POS, 'p 走过的结点': hops, '当前 j': 0 },
      notes: ['要在第 ' + POS + ' 个位置插入',
        '得先拿到它的前驱：第 ' + (POS - 1) + ' 个结点',
        'p 从头结点出发，计数器 j = 0',
        '顺序表这一步是 O(1)，链表不行'] }), 0,
      '要在第 ' + POS + ' 个位置插入，第一件事是找到它的前驱，也就是第 ' + (POS - 1) +
      ' 个结点。链表没有下标可算，只能让指针 p 从头结点出发一个一个数过去。',
      ['先找第 ' + (POS - 1) + ' 个结点做前驱', 'p 指向头结点，j = 0',
       '只能顺着 next 走']));

    for (var j = 1; j < POS; j++) {
      hops++;
      steps.push(step(snap({ st: mark(j, 'active', j - 1, 'good'),
        cur: mark('p', j),
        stats: { '目标位置 i': POS, 'p 走过的结点': hops, '当前 j': j },
        notes: ['p = p->next；j = ' + j,
          '走一步只能前进一个结点',
          'next 是单向的，退不回去',
          '已经走了 ' + hops + ' 步'] }), 2,
        'p = p->next，j 变成 ' + j + '，现在 p 指着第 ' + j + ' 个结点（值 ' + v[j] + '）。' +
        '注意 next 是单向的：走过去就退不回来，想回头只能从 L 重新出发。',
        ['p = p->next', 'j = ' + j + '，p 指向第 ' + j + ' 个',
         '单向，不能回退']));
    }

    steps.push(step(snap({ st: mark(POS - 1, 'hot'), cur: mark('p', POS - 1),
      stats: { '目标位置 i': POS, 'p 走过的结点': hops, '当前 j': POS - 1 },
      notes: ['j == i-1，前驱找到了',
        '一共走了 ' + hops + ' 步',
        '平均要走 n/2 步 → O(n)',
        '这就是链表放弃随机访问的代价'] }), 3,
      'j 等于 ' + (POS - 1) + ' 了，p 就是我们要的前驱。找它花了 ' + hops +
      ' 步，平均得走 n/2 步，所以链表按序号查找是 O(n) —— 顺序表那一步到位的本事，链表没有。',
      ['前驱已找到', '走了 ' + hops + ' 步',
       '按序号查找 O(n)']));

    /* --- 插入：先接后断 --- */
    var E = 20, P = POS - 1;
    steps.push(step(snap({ st: mark(P, 'hot'), cur: mark('p', P),
      ghost: { v: E, at: P, lab: 's = 新结点（malloc）' },
      stats: { '目标位置 i': POS, '待插入元素': E, '已改指针': 0 },
      notes: ['s = malloc(一个结点)',
        's->data = ' + E,
        's->next 现在还是野值',
        '接下来只改两个指针，不挪任何元素'] }), 5,
      '申请一个新结点 s，把 ' + E + ' 放进它的 data。' +
      '插入本身只需要改两个指针，一个元素都不用搬 —— 这正是链表相对顺序表的长处。',
      ['s = malloc 一个结点', 's->data = ' + E,
       '插入只改指针，不挪元素']));

    steps.push(step(snap({ st: mark(P, 'hot', P + 1, 'good'), cur: mark('p', P),
      ghost: { v: E, at: P, to: P + 1, lab: 's->next = p->next' },
      stats: { '目标位置 i': POS, '待插入元素': E, '已改指针': 1 },
      notes: ['第一步：s->next = p->next',
        '让新结点先接上后半截',
        '此时 ' + v[P + 1] + ' 被两个指针指着',
        '这不要紧，链还是完整的'] }), 6,
      '第一步 s->next = p->next：先让新结点接上后半截链。这时候 ' + v[P + 1] +
      ' 同时被 p->next 和 s->next 指着，看着重复，但链是完整的，没丢任何结点。',
      ['s->next = p->next', '新结点先接上后半截',
       '链仍然完整']));

    steps.push(step(snap({ st: mark(P, 'hot', P + 1, 'good'), cur: mark('p', P),
      skip: [P], cut: [P],
      ghost: { v: E, at: P, to: P + 1, from: P, lab: 'p->next = s' },
      stats: { '目标位置 i': POS, '待插入元素': E, '已改指针': 2 },
      notes: ['第二步：p->next = s',
        '前驱改指新结点，插入完成',
        '两句话的顺序不能换',
        '换了就会先丢掉后半截'] }), 7,
      '第二步 p->next = s：前驱改指新结点，插入完成。这两句的顺序绝对不能换 —— ' +
      '要是先写 p->next = s，p->next 原来的值就被冲掉了，后半截链再也找不到。',
      ['p->next = s', '两句顺序不可交换',
       '先接后断']));

    v.splice(POS, 0, E);
    steps.push(step(snap({ st: mark(POS, 'done'),
      stats: { '链表长度': v.length - 1, '本次移动元素': 0, '本次改指针': 2 },
      notes: ['插入完成，链表长度 ' + (v.length - 1),
        '移动元素 0 个，改指针 2 个',
        '但为了找到前驱走了 ' + hops + ' 步',
        '所以整体还是 O(n)'] }), 7,
      '插入完成。改指针的动作本身是 O(1)，一个元素都没挪 —— 但别忘了为找前驱走了 ' + hops +
      ' 步。所以「链表插入是 O(1)」只在已经握着前驱指针时才成立。',
      ['插入完成，改了 2 个指针', '移动元素 0 个',
       '含查找则整体 O(n)']));

    return steps;
  }

  /* ---------- 场景二：删除 + 头结点的作用 ---------- */
  function buildDelete() {
    var steps = [], v = ['', 12, 20, 25, 33];
    var snap = function (o) {
      // 后半段讲头结点时要临时换掉整条链，所以 o.v 优先于当前的 v
      return { v: (o.v || v).slice(), st: o.st || {}, cur: o.cur || {},
               skip: o.skip || [], cut: o.cut || [], ghost: o.ghost || null,
               bridge: o.bridge || null,
               headNode: o.headNode !== false, head: o.head || 'L',
               notes: o.notes || [], stats: o.stats || {} };
    };

    /* --- 删除第 2 个元素 --- */
    var DEL = 2;
    steps.push(step(snap({ st: mark(DEL, 'bad'), cur: mark('p', DEL - 1),
      stats: { '要删的元素': v[DEL], '已改指针': 0, '待释放结点': 0 },
      notes: ['要删第 ' + DEL + ' 个元素（值 ' + v[DEL] + '）',
        '删除同样得先拿到它的前驱 p',
        '因为改的是 p->next，不是 q 自己',
        '单向链表从 q 找不到它的前驱'] }), 8,
      '删除第 ' + DEL + ' 个元素 ' + v[DEL] + '。和插入一样，先得找到它的前驱 p，' +
      '因为真正要改的是 p->next。单向链表拿着一个结点是找不到它前驱的，只能从头走。',
      ['删第 ' + DEL + ' 个（值 ' + v[DEL] + '）', '先找前驱 p',
       '要改的是 p->next']));

    steps.push(step(snap({ st: mark(DEL, 'hot'),
      cur: { p: DEL - 1, q: DEL },
      stats: { '要删的元素': v[DEL], '已改指针': 0, '待释放结点': 1 },
      notes: ['q = p->next：先把待删结点存住',
        '不先存住 q，改了 p->next 就再也找不到它',
        '找不到就没法 free，直接内存泄漏',
        '这一步不是多余的'] }), 9,
      'q = p->next，先用另一个指针把待删结点存住。这一步很多人会省，结果是改完 p->next 后 ' +
      v[DEL] + ' 那个结点谁也指不着了 —— 内存还占着却无法释放，就是泄漏。',
      ['q = p->next', '先存住待删结点',
       '不存住就没法 free']));

    steps.push(step(snap({ st: mark(DEL, 'bad'),
      cur: { p: DEL - 1, q: DEL }, skip: [DEL - 1], cut: [DEL - 1],
      bridge: [DEL - 1, DEL + 1],
      stats: { '要删的元素': v[DEL], '已改指针': 1, '待释放结点': 1 },
      notes: ['p->next = q->next：跨过 q 接到后一个',
        'q 已经不在链上了',
        '但它占的内存还没还回去',
        '注意链本身此刻已经是正确的'] }), 10,
      'p->next = q->next：让前驱直接跨过 q 接到后面。现在从 L 走一遍已经看不到 ' + v[DEL] +
      ' 了，链的逻辑结构正确无误 —— 但那块内存还捏在手里没还。',
      ['p->next = q->next', 'q 已脱离链表',
       '内存尚未释放']));

    v.splice(DEL, 1);
    steps.push(step(snap({ cur: mark('p', DEL - 1),
      stats: { '链表长度': v.length - 1, '本次移动元素': 0, '本次改指针': 1 },
      notes: ['free(q)：把结点还给系统',
        '顺序表删除不用管这一步',
        '因为它的空间是整块申请的',
        '链表逐个申请，就得逐个释放'] }), 11,
      'free(q) 把结点还给系统，删除才算真做完。顺序表删除没有这一步，' +
      '因为它的空间是一整块申请的；链表逐个 malloc，就得逐个 free。',
      ['free(q)', '删除完成，改了 1 个指针',
       '移动元素 0 个']));

    /* --- 头结点的作用 --- */
    steps.push(step(snap({ v: [''], st: mark(0, 'good'),
      stats: { '链表状态': '空表', '头结点': '有', 'L 是否为空': '否' },
      notes: ['带头结点的空表：L 指着头结点',
        '头结点的 next 是 NULL',
        '注意 L 本身永远不为 NULL',
        '所以「表空」的判断是 L->next == NULL'] }), 12,
      '再看头结点为什么值得多占一个结点。带头结点时，空表长这样：L 指着头结点，' +
      '头结点的 next 是 NULL。L 自己永远不变，判空条件是 L->next == NULL。',
      ['空表：L->next == NULL', 'L 本身永不为 NULL',
       '头结点不存数据']));

    steps.push(step(snap({ v: [''], st: mark(0, 'hot'),
      ghost: { v: 99, at: 0, to: null, lab: 's = 新结点' },
      stats: { '链表状态': '空表插入', '前驱 p': '头结点', '需要特判': '不需要' },
      notes: ['往空表插入：p 就是头结点',
        '照样是 s->next = p->next; p->next = s',
        '和往中间插入的代码一模一样',
        '不需要为「插在表头」写特殊分支'] }), 5,
      '往空表里插入时，前驱 p 就是头结点，代码还是那两句 s->next = p->next; p->next = s。' +
      '插表头、插中间、插空表，走的是同一段代码 —— 这就是头结点买来的好处。',
      ['前驱就是头结点', '插入代码完全通用',
       '无需特判表头']));

    steps.push(step(snap({ v: [12, 20, 25], headNode: false, head: 'L',
      st: mark(0, 'bad'),
      stats: { '链表状态': '不带头结点', '删除首元结点': '要改 L 本身',
               '需要特判': '需要' },
      notes: ['不带头结点：L 直接指第一个元素',
        '删掉首元结点就必须改 L 自己',
        '所以函数得传 &L（指针的指针）',
        '每个操作都要多写一个 if'] }), 12,
      '对照一下不带头结点的情形：L 直接指着第一个元素，删掉它就必须修改 L 本身，' +
      '函数得传指针的指针，而且插入删除都要额外判断「是不是在表头」。',
      ['L 直接指首元结点', '改表头就得改 L 本身',
       '每个操作多一个特判']));

    steps.push(step(snap({ v: ['', 12, 20, 25], st: mark(0, 'good'),
      stats: { '结论': '多一个结点', '换来': '代码无特判', '判空': 'L->next == NULL' },
      notes: ['头结点的代价：多占一个结点的空间',
        '换来的是：表头和表中一视同仁',
        'L 恒定，函数签名也简单',
        '所以教材默认都带头结点'] }), 12,
      '结论：头结点只多花一个结点的空间，换来的是表头和表中位置一视同仁、L 恒定不变、' +
      '所有操作少一个特判分支。这笔账很划算，所以教材里的链表默认都带头结点。',
      ['代价：一个结点空间', '收益：代码无特判',
       '教材默认带头结点']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['singly-linked-list'] = {
    title: '单链表',
    subtitle: '结点散落在内存里，靠 next 把先后关系写明。插入删除只改指针不挪元素，但找第 i 个只能从头一个一个数。',
    height: 730,
    code: [
      'GetElem(L, i):  p = L;  j = 0    // 按序号查找，从头结点起数',
      '    while p->next and j < i-1:   // 一步只能前进一个结点',
      '        p = p->next;  j++        // 走 i-1 步，O(n)',
      '    return p                     // 拿到第 i-1 个，即前驱',
      'ListInsert(&L, i, e):            // 插到第 i 个位置',
      '    s = malloc();  s->data = e   // 先备好新结点',
      '    s->next = p->next            // ① 先接上后半截',
      '    p->next = s                  // ② 再改前驱，顺序不可换',
      'ListDelete(&L, i, &e):           // 删第 i 个（p 为前驱）',
      '    q = p->next                  // 先存住待删结点',
      '    p->next = q->next            // 跨过 q，结点脱链',
      '    e = q->data;  free(q)        // 必须释放，否则泄漏',
      '// 头结点：L 恒不为 NULL，判空写 L->next == NULL，插删无需特判'
    ],
    scenes: [
      { name: '查找与插入', build: buildInsert },
      { name: '删除与头结点', build: buildDelete }
    ]
  };
})();
