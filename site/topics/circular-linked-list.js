/* 循环链表与约瑟夫环 — 第2章
 * 场景一：尾结点的 next 指回 L 而不是 NULL，于是遍历的终止条件
 *         从 p != NULL 变成 p != L —— 这一个字的差别是全章的重点。
 * 场景二：约瑟夫环，循环链表最经典的用处：报数出圈，摘结点是 O(1)。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* ---------- 场景一：结构与遍历 ---------- */
  /* 链行 204…250，下标 267，游标标签 304；回指弧走结点上方，峰值约 y=145 */
  var NW = 84, NH = 46, PITCH = 112;
  var NX0 = 96, NY = 204, ARCY = 120;
  var HEADX = 34, TX = 676;

  function nxOf(i) { return NX0 + i * PITCH; }

  function renderRing(ctx, f) {
    D.clear(ctx.stage);
    var i, boxes = [];

    for (i = 0; i < f.v.length; i++) {
      var b = D.nodeBox(ctx.stage, { x: nxOf(i), y: NY, w: NW, h: NH,
        slots: ['data', 'next'], value: f.v[i], state: f.st[i] || 'idle' });
      boxes.push(b);
      ctx.stage.appendChild(D.text(i === 0 ? '头结点 L' : '第 ' + i + ' 个',
        { x: b.cx, y: NY + NH + 17, 'class': i === 0 ? 'vz-tag' : 'vz-idx' }));
    }

    ctx.stage.appendChild(D.text('L',
      { x: HEADX + 8, y: NY + NH / 2 + 5, 'class': 'vz-ptr' }));
    D.link(ctx.stage, { x1: HEADX + 20, y1: NY + NH / 2,
      x2: boxes[0].x - 3, y2: NY + NH / 2, kind: 'next' });

    for (i = 0; i + 1 < boxes.length; i++) {
      D.link(ctx.stage, { x1: boxes[i].slotX('next'), y1: NY + NH / 2,
        x2: boxes[i + 1].x - 3, y2: NY + NH / 2, kind: 'next' });
    }

    // 尾结点的 next：单链表指 NULL，循环链表绕回头结点
    var tail = boxes[boxes.length - 1];
    if (f.nullTail) {
      ctx.stage.appendChild(D.text('∧',
        { x: tail.slotX('next'), y: NY + NH - 9, 'class': 'vz-ptr',
          fill: '#4a5c82' }));
      ctx.stage.appendChild(D.text('单链表：尾结点 next = NULL',
        { x: tail.cx, y: ARCY - 10, 'class': 'vz-lab', fill: '#8ea3c9' }));
    } else {
      var hx = boxes[0].cx, tx2 = tail.slotX('next');
      ctx.stage.appendChild(D.el('path', {
        d: 'M ' + tx2 + ' ' + NY + ' C ' + tx2 + ' ' + ARCY + ' ' +
           hx + ' ' + ARCY + ' ' + hx + ' ' + (NY - 4),
        fill: 'none', stroke: f.hotArc ? '#ffd166' : '#5b8cff',
        'stroke-width': f.hotArc ? 3 : 2.2, 'stroke-linecap': 'round',
        'marker-end': 'url(#' + (f.hotArc ? 'vzHot' : 'vzNext') + ')' }));
      // 弧的峰值约在 y=141，标签必须放到峰之上，否则曲线会横穿文字
      ctx.stage.appendChild(D.text('尾结点的 next 指回 L，整条链首尾相接',
        { x: (hx + tx2) / 2, y: ARCY - 10, 'class': 'vz-lab',
          fill: f.hotArc ? '#ffd166' : '#8ea3c9' }));
    }

    var names = Object.keys(f.cur || {});
    for (i = 0; i < names.length; i++) {
      var at = f.cur[names[i]];
      if (!boxes[at]) continue;
      D.pointer(ctx.stage, { name: names[i], x: boxes[at].cx, y: NY + NH + 20,
        above: false, color: '#6ceaa5' });
    }

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: TX, y: 172 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  /* ---------- 场景二：约瑟夫环 ---------- */
  /* 圆心 (300,214)，半径 84，人结点半径 22：
   * 最上结点的报数标签基线 100，最下结点下沿 320，都落在 y ∈ [84,336] 内 */
  var CCX = 300, CCY = 214, CR = 84, PR = 22;
  var JX = 496;

  function posOf(i, n) {
    var a = -Math.PI / 2 + i * 2 * Math.PI / n;
    return { x: CCX + CR * Math.cos(a), y: CCY + CR * Math.sin(a) };
  }

  /* f = { seat:[人的编号…], out:[bool…], order:[出圈顺序…],
   *       st:{下标:状态}, cnt:{下标:报数}, mid, mid2, notes, stats } */
  function renderJoseph(ctx, f) {
    D.clear(ctx.stage);
    var i, n = f.seat.length, pts = [], alive = [];
    for (i = 0; i < n; i++) pts.push(posOf(i, n));
    for (i = 0; i < n; i++) if (!f.out[i]) alive.push(i);

    // 连线只在还在圈里的人之间画：出圈的人已经从链上摘掉了
    if (alive.length > 1) {
      for (i = 0; i < alive.length; i++) {
        var a = pts[alive[i]], b = pts[alive[(i + 1) % alive.length]];
        D.link(ctx.stage, {
          x1: a.x + (b.x - a.x) * 0.3, y1: a.y + (b.y - a.y) * 0.3,
          x2: a.x + (b.x - a.x) * 0.72, y2: a.y + (b.y - a.y) * 0.72,
          kind: 'next' });
      }
    }

    for (i = 0; i < n; i++) {
      // 出圈者身上盖了个 X，圈里的号码看不见了，所以把编号挪到上方的 tag 位
      D.circleNode(ctx.stage, { x: pts[i].x, y: pts[i].y, r: PR,
        value: f.seat[i], state: f.out[i] ? 'mute' : (f.st[i] || 'idle'),
        tag: f.out[i] ? f.seat[i] + ' 号'
                      : (f.cnt[i] != null ? '报 ' + f.cnt[i] : null) });
      if (f.out[i]) D.cross(ctx.stage, pts[i].x, pts[i].y, 11);
    }

    if (f.mid) {
      ctx.stage.appendChild(D.text(f.mid,
        { x: 40, y: 120, 'class': 'vz-hdr', fill: '#ffd166' }));
    }
    if (f.mid2) {
      ctx.stage.appendChild(D.text(f.mid2,
        { x: 40, y: 146, 'class': 'vz-info' }));
    }

    ctx.stage.appendChild(D.text('出圈顺序',
      { x: 40, y: 188, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    for (i = 0; i < f.order.length && i < 6; i++) {
      ctx.stage.appendChild(D.text((i + 1) + '.  ' + f.order[i] + ' 号',
        { x: 40, y: 212 + i * 21, 'class': 'vz-info', fill: '#6ceaa5' }));
    }
    if (!f.order.length) {
      ctx.stage.appendChild(D.text('（还没有人出圈）',
        { x: 40, y: 212, 'class': 'vz-info', fill: '#5f7099' }));
    }

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: JX, y: 150 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'joseph') renderJoseph(c, f); else renderRing(c, f);
             } };
  }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* ---------- 场景一：结构与遍历终止条件 ---------- */
  function buildRing() {
    var steps = [], v = ['', 12, 25, 33, 47];
    var snap = function (o) {
      return { v: v.slice(), st: o.st || {}, cur: o.cur || {},
               nullTail: !!o.nullTail, hotArc: !!o.hotArc,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({ nullTail: true, st: mark(4, 'bad'),
      stats: { '结构': '单链表', '尾结点 next': 'NULL', '能否从尾回到头': '否' },
      notes: ['先看单链表：尾结点 next = NULL',
        '走到尾巴就走不动了',
        '想再看一遍只能从 L 重新出发',
        '有些场合这很不方便'] }), -1,
      '先摆出单链表作对照：尾结点的 next 是 NULL，指针走到这里就停住了。' +
      '要想再看一遍前面的元素，只能回到 L 重新出发 —— 循环链表就是为了去掉这个麻烦。',
      ['单链表：尾 next = NULL', '走到尾就是终点',
       '回头必须从 L 重来']));

    steps.push(step(snap({ st: mark(4, 'hot', 0, 'good'), hotArc: true,
      stats: { '结构': '循环链表', '尾结点 next': 'L', '能否从尾回到头': '能' },
      notes: ['循环链表：把尾结点的 next 改成 L',
        '只改了一个指针，别的都没动',
        '整条链首尾相接成一个环',
        '从任何结点出发都能遍历全表'] }), 0,
      '循环链表的全部改动只有一处：把尾结点的 next 从 NULL 改成 L。' +
      '一个指针的差别，整条链就闭合成了环 —— 从任何一个结点出发都能走遍全表。',
      ['尾结点 next = L', '只改一个指针',
       '首尾相接成环']));

    steps.push(step(snap({ st: mark(0, 'active'), cur: mark('p', 0),
      stats: { '遍历起点': '头结点 L', '已访问结点': 0, '终止条件': 'p->next != L' },
      notes: ['遍历还是 p = L 起步',
        '但终止条件必须换',
        '写 p != NULL 会死循环',
        '因为环上根本没有 NULL'] }), 1,
      '开始遍历，p 依然从头结点起步。关键在终止条件：单链表写 p != NULL，' +
      '搬到循环链表上就是死循环 —— 环上没有任何一个 next 是 NULL，永远走不出去。',
      ['p 从 L 起步', '不能再判 p != NULL',
       '环上没有 NULL']));

    for (var i = 1; i < v.length; i++) {
      steps.push(step(snap({ st: mark(i, 'active', i - 1, 'good'),
        cur: mark('p', i),
        stats: { '遍历起点': '头结点 L', '已访问结点': i,
                 '终止条件': 'p->next != L' },
        notes: ['p = p->next，访问 ' + v[i],
          'p->next ' + (i === v.length - 1 ? '就是 L 了' : '不是 L，继续'),
          i === v.length - 1 ? '所以这是最后一个结点' : '已访问 ' + i + ' 个',
          '判断的是 p->next，不是 p'] }), 2,
        'p 走到第 ' + i + ' 个结点，访问值 ' + v[i] + '。每次循环前先看 p->next 是不是 L：' +
        (i === v.length - 1
          ? '这次是了，说明 p 已经是尾结点，循环到此结束。'
          : '现在还不是，继续往下走。'),
        ['访问 ' + v[i], i === v.length - 1 ? 'p->next == L，到尾了'
                                           : 'p->next != L，继续',
         '判断 p->next 而非 p']));
    }

    steps.push(step(snap({ st: mark(4, 'done'), cur: mark('p', 4),
      hotArc: true,
      stats: { '已访问结点': v.length - 1, '循环次数': v.length - 1,
               '是否回到起点': '是' },
      notes: ['p->next == L，遍历正好走完一圈',
        '每个元素访问一次，不重不漏',
        '终止条件从 p != NULL 换成 p->next != L',
        '这一个字的差别就是全章的重点'] }), 2,
      '遍历结束，p 停在尾结点，p->next 正好回到 L —— 一圈走完，每个元素访问一次，不重不漏。' +
      '循环链表的代码和单链表几乎一样，差别就在终止条件里的那个 L。',
      ['正好遍历一圈', '不重不漏',
       'p != NULL → p->next != L']));

    return steps;
  }

  /* ---------- 场景二：约瑟夫环 ---------- */
  function buildJoseph() {
    var steps = [], N = 7, M = 3, i;
    var seat = [], out = [], order = [];
    for (i = 0; i < N; i++) { seat.push(i + 1); out.push(false); }

    var snap = function (o) {
      return { seat: seat.slice(), out: out.slice(), order: order.slice(),
               st: o.st || {}, cnt: o.cnt || {},
               mid: o.mid || null, mid2: o.mid2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({ mid: N + ' 个人围成一圈', mid2: '每次报到 ' + M + ' 的人出圈',
      stats: { '总人数 n': N, '报数上限 m': M, '还在圈里': N },
      notes: [N + ' 个人围坐，编号 1 到 ' + N,
        '从 1 号开始依次报数 1、2、3…',
        '报到 ' + M + ' 的人出圈',
        '下一个人重新从 1 报起'] }), -1,
      N + ' 个人围成一圈，从 1 号开始报数，报到 ' + M + ' 的人出圈，' +
      '接着由下一个人重新从 1 报起。这个游戏用循环链表来做正合适：圈本身就是个环。',
      ['n = ' + N + ' 人围成环', 'm = ' + M + ' 报到就出圈',
       '循环链表天然是环'], 'joseph'));

    var idx = 0;   // 当前该报数的人在 seat 里的下标
    var round = 0;
    while (order.length < N - 1) {
      round++;
      var cnt = {}, path = [], k = 0, cur = idx;
      // 从 idx 起，跳过已出圈的人，数 M 个
      while (k < M) {
        if (!out[cur]) { k++; cnt[cur] = k; path.push(cur); }
        if (k < M) cur = (cur + 1) % N;
      }
      var victim = cur;

      steps.push(step(snap({ cnt: cnt, st: mark(victim, 'hot'),
        mid: '第 ' + round + ' 轮报数',
        mid2: '从 ' + seat[path[0]] + ' 号报 1，' + seat[victim] + ' 号报到 ' + M,
        stats: { '本轮起点': seat[path[0]] + ' 号',
                 '报到 m 的人': seat[victim] + ' 号',
                 '还在圈里': N - order.length },
        notes: ['从 ' + seat[path[0]] + ' 号开始报 1',
          '沿 next 走，报到 ' + M + ' 停下',
          seat[victim] + ' 号报到 ' + M + '，该出圈了',
          '出圈的人要跳过，不再参与报数'] }), 8,
        '第 ' + round + ' 轮：从 ' + seat[path[0]] + ' 号报 1，沿着 next 一个个数过去，' +
        seat[victim] + ' 号报到 ' + M + '。注意已经出圈的人在链上已经没有了，报数时自然跳过。',
        ['起点 ' + seat[path[0]] + ' 号报 1', seat[victim] + ' 号报到 ' + M,
         '出圈者已不在链上'], 'joseph'));

      out[victim] = true;
      order.push(seat[victim]);
      // 下一轮从出圈者的后一个还活着的人开始
      var nxt = (victim + 1) % N;
      while (out[nxt]) nxt = (nxt + 1) % N;
      idx = nxt;

      steps.push(step(snap({ st: mark(nxt, 'active'),
        mid: seat[victim] + ' 号出圈',
        mid2: 'q->next = p->next; free(p)',
        stats: { '已出圈': order.length + ' 人', '还在圈里': N - order.length,
                 '摘结点代价': 'O(1)' },
        notes: [seat[victim] + ' 号出圈，第 ' + order.length + ' 个离开',
          '前驱的 next 跨过它，然后 free',
          '摘一个结点只改一个指针：O(1)',
          '下一轮从 ' + seat[nxt] + ' 号重新报 1'] }), 11,
        seat[victim] + ' 号出圈：让它的前驱 next 跨过它，再 free 掉这个结点。' +
        '摘结点只改一个指针，是 O(1) —— 用数组做这题每次出圈都得挪一片元素，这是链表的长处。',
        [seat[victim] + ' 号出圈', '改一个指针 + free，O(1)',
         '下一轮从 ' + seat[nxt] + ' 号起'], 'joseph'));
    }

    var last = 0;
    for (i = 0; i < N; i++) if (!out[i]) last = i;
    steps.push(step(snap({ st: mark(last, 'done'),
      mid: '只剩 ' + seat[last] + ' 号',
      mid2: 'p->next == p，环上只有它自己',
      stats: { '最后留下': seat[last] + ' 号', '已出圈': (N - 1) + ' 人',
               '总代价': 'O(n·m)' },
      notes: ['终止条件：p->next == p',
        '也就是环上只剩一个结点',
        '最后留下的是 ' + seat[last] + ' 号',
        '总代价 O(n·m)：出 n-1 次，每次数 m 步'] }), 7,
      '圈里只剩 ' + seat[last] + ' 号，它的 next 指着自己，p->next == p 就是终止条件。' +
      '整个过程出圈 ' + (N - 1) + ' 次、每次数 ' + M + ' 步，所以是 O(n·m)。',
      ['p->next == p 时结束', '最后留下 ' + seat[last] + ' 号',
       '总代价 O(n·m)'], 'joseph'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['circular-linked-list'] = {
    title: '循环链表与约瑟夫环',
    subtitle: '把尾结点的 next 从 NULL 改成 L，链就闭成了环。代码几乎没变，只有遍历的终止条件从 p != NULL 换成 p->next != L。',
    height: 730,
    code: [
      '// 循环链表：尾结点 next = L，而不是 NULL',
      'Traverse(L):  p = L              // 起点仍是头结点',
      '    while p->next != L:          // 关键：不是 p != NULL',
      '        p = p->next;  visit(p)   // 走一圈正好访问 n 个',
      'Joseph(n, m):                    // 约瑟夫环',
      '    建一个 n 个结点的循环链表      // 无头结点更省事',
      '    p = 第1个;  q = p 的前驱',
      '    while p->next != p:          // 剩一个人就停',
      '        for k = 1 to m-1:        // 数 m-1 步到待删者',
      '            q = p;  p = p->next',
      '        输出 p->data             // 这人出圈',
      '        q->next = p->next        // 摘结点，O(1)',
      '        free(p);  p = q->next    // 下一轮从后一个报起'
    ],
    scenes: [
      { name: '结构与遍历', build: buildRing },
      { name: '约瑟夫环', build: buildJoseph }
    ]
  };
})();
