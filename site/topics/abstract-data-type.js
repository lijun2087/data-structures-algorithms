/* 抽象数据类型 ADT — 第1章
 * 场景一：三层分离 —— 逻辑结构（是什么）、操作集（能做什么）、存储结构（怎么放）。
 *         逐层揭开，最后强调「同一个 ADT 可以换存储结构而使用者不受影响」。
 * 场景二：同一份 Stack ADT，分别落到顺序存储和链式存储上，
 *         看清接口不变、实现可换，这才是「抽象」的意义。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* ---------- 场景一：三层 ---------- */
  var LX = 52, LW = 286, LY = 104, LH = 62, LGAP = 13;

  var LAYER = [
    ['逻辑结构  D', '数据元素之间的关系',
     ['元素集合 D = { a1, a2, …, an }',
      '关系集合 S：谁挨着谁、谁是谁的父',
      '只谈关系，不谈内存']],
    ['操作集  P', '在这份数据上能做什么',
     ['Push(&S, e)：压入一个元素',
      'Pop(&S, &e)：弹出栈顶',
      '只写「做什么」，不写「怎么做」']],
    ['存储结构', '关系在内存里怎么落地',
     ['顺序存储：靠地址相邻表达关系',
      '链式存储：靠指针字段表达关系',
      '同一逻辑结构可有多种存储']]
  ];

  var RX = 384;

  function renderLayer(ctx, f) {
    D.clear(ctx.stage);
    for (var i = 0; i < LAYER.length; i++) {
      var y = LY + i * (LH + LGAP), lit = i < f.upto, on = i === f.upto - 1;
      var st = on ? 'active' : (lit ? 'good' : 'mute');
      var c = D.C[st];
      ctx.stage.appendChild(D.el('rect', { x: LX, y: y, width: LW, height: LH,
        rx: 10, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      var ttl = D.text(lit ? LAYER[i][0] : '· · ·',
        { x: LX + 18, y: y + 26, 'class': 'vz-lab',
          fill: on ? '#eef3ff' : (lit ? '#9fe3bd' : '#4a5c82') });
      ttl.setAttribute('font-size', '14');
      ttl.setAttribute('font-weight', '700');
      ctx.stage.appendChild(ttl);
      if (lit) {
        ctx.stage.appendChild(D.text(LAYER[i][1],
          { x: LX + 18, y: y + 48, 'class': 'vz-info',
            fill: on ? '#c8d4ef' : '#7f92bb' }));
      }
      // 层与层之间画一根竖线，表示「上层不关心下层怎么实现」
      if (i > 0 && lit) {
        ctx.stage.appendChild(D.el('line', { x1: LX + LW / 2, y1: y - LGAP,
          x2: LX + LW / 2, y2: y, stroke: '#33456b', 'stroke-width': 1.6,
          'stroke-dasharray': '5 5' }));
      }
    }
    // 右侧展开当前层的要点
    var det = f.upto > 0 ? LAYER[f.upto - 1][2] : [];
    if (f.upto > 0) {
      ctx.stage.appendChild(D.text(LAYER[f.upto - 1][0] + ' 的要点',
        { x: RX, y: 122, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    }
    for (var k = 0; k < det.length && k < 5; k++) {
      ctx.stage.appendChild(D.text('· ' + det[k],
        { x: RX, y: 150 + k * 26, 'class': 'vz-info' }));
    }
    for (var m = 0; m < f.notes.length && m < 3; m++) {
      ctx.stage.appendChild(D.text(f.notes[m],
        { x: RX, y: 250 + m * 24, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    ctx.stats = { '已揭开层次': f.upto + ' / 3', '当前层': f.cur,
                  '关键词': f.key };
  }

  /* ---------- 场景二：同一个 Stack ADT，两种存储 ---------- */
  var SEQ = { x: 74, y: 158, w: 50, h: 40, gap: 8 };
  var LNK = { x: 74, y: 262, w: 92, h: 40, gap: 34 };
  var CAP = 5;
  var IX = 640;

  function renderImpl(ctx, f) {
    D.clear(ctx.stage);
    var i;
    ctx.stage.appendChild(D.text('接口（使用者只看到这一行）',
      { x: 48, y: 106, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    // 接口条：两种实现共用，所以画在最上面且始终不变
    var ops = ['Push(e)', 'Pop()', 'Top()', 'Empty()'];
    for (i = 0; i < ops.length; i++) {
      var on = f.op === ops[i];
      var c = D.C[on ? 'hot' : 'idle'];
      ctx.stage.appendChild(D.el('rect', { x: 48 + i * 104, y: 118,
        width: 94, height: 26, rx: 7, fill: c.fill, stroke: c.stroke,
        'stroke-width': 1.8 }));
      ctx.stage.appendChild(D.text(ops[i],
        { x: 48 + i * 104 + 47, y: 136, 'class': 'vz-brace',
          fill: on ? '#ffd166' : '#8ea3c9' }));
    }

    // 顺序存储：定长数组 + 一个 top 下标
    ctx.stage.appendChild(D.text('顺序栈：数组 + top 下标',
      { x: 48, y: 172, 'class': 'vz-lab',
        fill: f.impl === 'seq' ? '#ffd166' : '#5f7099' }));
    for (i = 0; i < CAP; i++) {
      var x = SEQ.x + 172 + i * (SEQ.w + SEQ.gap);
      var used = i < f.seq.length;
      var st = f.impl !== 'seq' ? 'mute'
             : (i === f.seq.length - 1 ? 'active' : (used ? 'good' : 'idle'));
      var cc = D.C[st];
      ctx.stage.appendChild(D.el('rect', { x: x, y: SEQ.y, width: SEQ.w,
        height: SEQ.h, rx: 6, fill: cc.fill, stroke: cc.stroke,
        'stroke-width': 2 }));
      if (used) {
        ctx.stage.appendChild(D.text(f.seq[i],
          { x: x + SEQ.w / 2, y: SEQ.y + 26, 'class': 'vz-cellval' }));
      }
      ctx.stage.appendChild(D.text(i,
        { x: x + SEQ.w / 2, y: SEQ.y + SEQ.h + 14, 'class': 'vz-idx' }));
    }
    if (f.impl === 'seq') {
      var tx = SEQ.x + 172 + Math.max(0, f.seq.length - 1) * (SEQ.w + SEQ.gap);
      ctx.stage.appendChild(D.text('top = ' + (f.seq.length - 1),
        { x: tx + SEQ.w / 2, y: SEQ.y - 9, 'class': 'vz-ptr',
          fill: '#6ceaa5' }));
    }

    // 链式存储：结点串起来，top 指针指向链首
    ctx.stage.appendChild(D.text('链栈：结点 + top 指针',
      { x: 48, y: 276, 'class': 'vz-lab',
        fill: f.impl === 'lnk' ? '#ffd166' : '#5f7099' }));
    var boxes = [];
    for (i = 0; i < f.lnk.length; i++) {
      var bx = LNK.x + 172 + i * (LNK.w + LNK.gap);
      var stl = f.impl !== 'lnk' ? 'mute' : (i === 0 ? 'active' : 'good');
      boxes.push(D.nodeBox(ctx.stage, { x: bx, y: LNK.y, w: LNK.w, h: LNK.h,
        slots: ['data', 'next'], value: f.lnk[i], state: stl }));
    }
    for (i = 0; i + 1 < boxes.length; i++) {
      D.link(ctx.stage, { x1: boxes[i].slotX('next'), y1: LNK.y + LNK.h / 2,
        x2: boxes[i + 1].x - 3, y2: LNK.y + LNK.h / 2,
        kind: f.impl === 'lnk' ? 'next' : 'mute' });
    }
    if (boxes.length) {
      // 末结点的 next 是空
      ctx.stage.appendChild(D.text('∧',
        { x: boxes[boxes.length - 1].slotX('next'), y: LNK.y + LNK.h - 8,
          'class': 'vz-ptr', fill: '#4a5c82' }));
    }
    if (f.impl === 'lnk' && boxes.length) {
      ctx.stage.appendChild(D.text('top',
        { x: boxes[0].cx, y: LNK.y - 9, 'class': 'vz-ptr', fill: '#6ceaa5' }));
    }

    ctx.stage.appendChild(D.text('注意',
      { x: IX, y: 172, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    for (var k = 0; k < f.notes.length && k < 5; k++) {
      ctx.stage.appendChild(D.text(f.notes[k],
        { x: IX, y: 196 + k * 24, 'class': 'vz-info' }));
    }
    ctx.stats = { '当前实现': f.label, '栈中元素': f.depth,
                  '接口是否改变': '否' };
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'impl') renderImpl(c, f); else renderLayer(c, f);
             } };
  }

  function buildLayer() {
    var steps = [];
    var snap = function (upto, cur, key, notes) {
      return { upto: upto, cur: cur, key: key, notes: notes || [] };
    };

    steps.push(step(snap(0, '—', '—'), -1,
      '抽象数据类型 ADT 是「数据的数学模型 + 定义在它上面的操作」。' +
      '它只回答两件事：这份数据长什么关系、能对它做什么。至于怎么存，是另一层的事。',
      ['ADT = (D, S, P)', '数据 + 关系 + 操作', '不含实现']));

    steps.push(step(snap(1, '逻辑结构', 'D 与 S', [
      '逻辑结构分四类：',
      '集合 / 线性 / 树形 / 图状'
    ]), 2,
      '第一层是逻辑结构：只描述元素之间的关系。线性表说「每个元素最多一个前驱一个后继」，' +
      '树说「每个结点最多一个父亲」—— 全是关系，内存里怎么放一个字都没提。',
      ['逻辑结构 = D + S', '只谈关系', '四类：集合/线性/树/图']));

    steps.push(step(snap(2, '操作集', 'P', [
      '只写函数签名与前后条件',
      '不写循环、不写指针'
    ]), 3,
      '第二层是操作集：给出每个操作的名字、参数、初始条件和操作结果，但不给算法。' +
      'Pop 的定义是「栈非空时删除并返回栈顶」，至于是挪下标还是改指针，定义里不出现。',
      ['操作只定义「做什么」', '含前置条件与结果',
       '不含实现代码']));

    steps.push(step(snap(3, '存储结构', '顺序 / 链式', [
      '顺序：地址相邻即关系相邻',
      '链式：指针字段显式记关系'
    ]), 7,
      '第三层才是存储结构，也叫物理结构。同一个逻辑关系有两种落地方式：' +
      '顺序存储让地址相邻来隐含关系，链式存储用一个 next 字段把关系写明。',
      ['存储结构 = 物理结构', '顺序：靠地址相邻',
       '链式：靠指针字段']));

    steps.push(step(snap(3, '三层合起来', '接口与实现分离', [
      '换存储结构 → 使用者代码不用改',
      '这就是「抽象」值钱的地方',
      '也是后面每一章的组织方式'
    ]), 7,
      '三层分开的好处：只要操作集不变，把顺序存储换成链式存储，使用者一行代码都不用改。' +
      '后面每一章都是这个套路 —— 先讲逻辑结构，再讲两种存储，最后讲操作怎么实现。',
      ['接口不变，实现可换', '这就是抽象的价值',
       '全书的组织方式']));

    return steps;
  }

  function buildImpl() {
    var steps = [], seq = [], lnk = [];
    var snap = function (o) {
      return { seq: seq.slice(), lnk: lnk.slice(),
               impl: o.impl || 'none', op: o.op || null,
               label: o.label || '—', depth: o.depth === undefined ? 0 : o.depth,
               notes: o.notes || [] };
    };

    steps.push(step(snap({ notes: ['接口在最上面，始终不变',
      '下面两行是两种存储结构',
      '同一串操作，两边各跑一遍'] }), 3,
      '拿栈来验证「接口不变、实现可换」。最上面那四个操作就是 Stack 的 ADT 接口，' +
      '下面两行是它的两种存储实现。接着用同一串操作分别驱动两边。',
      ['Stack ADT 有四个操作', '两种存储实现',
       '接口完全一样'], 'impl'));

    var seqOps = [
      ['Push(e)', 'A', '顺序栈的 Push 只做两件事：top 加一，把 e 写进 a[top]。' +
        '整个操作是 O(1)，因为数组下标能直接算出地址。'],
      ['Push(e)', 'B', '再压入 B。元素在内存里是紧挨着的 —— 顺序存储正是靠这份「地址相邻」' +
        '来表达栈的先后关系，不需要额外的指针字段。'],
      ['Push(e)', 'C', '压入 C。注意数组是定长的：容量 ' + CAP +
        ' 用满之后要么报栈满，要么重新申请更大的数组再搬一遍。']
    ];
    for (var i = 0; i < seqOps.length; i++) {
      seq.push(seqOps[i][1]);
      steps.push(step(snap({ impl: 'seq', op: seqOps[i][0], label: '顺序栈',
        depth: seq.length,
        notes: ['top 只是一个整数下标',
                '入栈出栈都是 O(1)',
                '容量固定为 ' + CAP + '，可能栈满'] }), 4,
        seqOps[i][2],
        ['Push(' + seqOps[i][1] + ')', 'top = ' + (seq.length - 1),
         '数组下标寻址，O(1)'], 'impl'));
    }

    var popped = seq.pop();
    steps.push(step(snap({ impl: 'seq', op: 'Pop()', label: '顺序栈',
      depth: seq.length,
      notes: ['Pop 只需 top 减一',
              '被弹出的格子不必清空',
              '下次 Push 直接覆盖'] }), 5,
      'Pop 弹出 ' + popped + '：把 top 减一就完事了，那个格子里的值都不用擦 —— ' +
      '因为 top 之外的内容按约定就是无效的，下次 Push 会直接覆盖。',
      ['Pop() → ' + popped, 'top = ' + (seq.length - 1),
       '不必清空原格子'], 'impl'));

    var lnkOps = [
      ['Push(e)', 'A', '换成链栈。Push 的做法变了：新申请一个结点，让它的 next 指向原来的 top，' +
        '再把 top 挪到新结点上。注意栈顶在链首，这样才能 O(1)。'],
      ['Push(e)', 'B', '压入 B。B 成了新的链首，它的 next 指向 A。' +
        '链式存储没有容量上限，要多少结点就申请多少，代价是每个结点多占一个指针字段。'],
      ['Push(e)', 'C', '压入 C。三个结点在内存里可能散落各处，但 next 字段把顺序写得明明白白 —— ' +
        '这就是链式存储表达关系的方式。']
    ];
    for (var k = 0; k < lnkOps.length; k++) {
      lnk.unshift(lnkOps[k][1]);
      steps.push(step(snap({ impl: 'lnk', op: lnkOps[k][0], label: '链栈',
        depth: lnk.length,
        notes: ['新结点插在链首',
                '入栈出栈同样 O(1)',
                '无容量上限，但每结点多一个指针'] }), 4,
        lnkOps[k][2],
        ['Push(' + lnkOps[k][1] + ')', '新结点插到链首',
         '改指针，O(1)'], 'impl'));
    }

    var lp = lnk.shift();
    steps.push(step(snap({ impl: 'lnk', op: 'Pop()', label: '链栈',
      depth: lnk.length,
      notes: ['top 后移一个结点',
              '原链首结点要 free 掉',
              '否则内存泄漏'] }), 5,
      'Pop 弹出 ' + lp + '：让 top 指向它的 next，然后把这个结点释放掉。' +
      '顺序栈不用管内存，链栈必须记得 free —— 这是实现层面的差别，接口上看不出来。',
      ['Pop() → ' + lp, 'top 指向下一个结点',
       '记得释放结点'], 'impl'));

    steps.push(step(snap({ impl: 'none', label: '两种都验证过',
      depth: lnk.length,
      notes: ['同一串 Push/Pop，两边结果一致',
              '使用者代码一个字都没改',
              '差别只在时间/空间的取舍',
              '这就是 ADT 的意义'] }), 3,
      '两边跑完：同一串操作、同样的结果，使用者的代码一个字都不用改。' +
      '差别只在取舍 —— 顺序存储省空间但容量固定，链式存储灵活但每个结点多一个指针。',
      ['接口完全一致', '实现自由替换',
       '取舍：定长省空间 / 链式灵活'], 'impl'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['abstract-data-type'] = {
    title: '抽象数据类型 ADT',
    subtitle: '把「数据是什么关系」「能对它做什么」和「在内存里怎么放」分成三层。只要操作集不变，存储结构可以随时替换。',
    height: 730,
    code: [
      'ADT Stack {',
      '    数据对象 D：n 个同类型元素，n >= 0',
      '    数据关系 S：线性，约定 an 端为栈顶',
      '    基本操作 P：',
      '        Push(&S, e)   前置：栈存在   结果：e 成为新栈顶',
      '        Pop(&S, &e)   前置：栈非空   结果：删栈顶并由 e 返回',
      '        Top(S)        前置：栈非空   结果：返回栈顶值',
      '}                                  // 全篇不含一行实现代码'
    ],
    scenes: [
      { name: '三层分离', build: buildLayer },
      { name: '同接口两实现', build: buildImpl }
    ]
  };
})();
