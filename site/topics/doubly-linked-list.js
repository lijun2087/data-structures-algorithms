/* 双向链表 — 第2章
 * 场景一：结构剖析 —— 每个节点多出一个 prev，head/tail 两端各有一个 NULL。
 * 场景二：双向遍历 —— 正向靠 next，反向靠 prev，这是单链表做不到的。
 * 场景三：头部插入 —— 四句赋值，重点是 head->prev = nd 那一步别漏。
 * 场景四：中间插入 —— 已知 p 时插入是 O(1)，两个方向的线都要接上。
 * 场景五：删除节点 —— 拿着 p 就能删，不必像单链表那样先 O(n) 找前驱。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：最多 5 个节点。节点行 200…250，ghost 行 112…162，
   * next 线走 222（偏上），prev 线走 240（偏下），两个方向不打架。
   * 5 节点右边界 166+4*140+108 = 834，加上 NULL 标记仍在舞台内。 */
  var NW = 108, NH = 50, PITCH = 140, NX0 = 166;
  var NY = 200, GY = 112;
  var YN = NY + 22, YP = NY + 40;

  function xOf(i) { return NX0 + i * PITCH; }
  function cp(a) { return a.slice(); }

  // 键是下标，得逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  function has(arr, i) { return arr && arr.indexOf(i) >= 0; }

  /* 左上角图例：把两种线色的含义说清楚，后面所有场景都靠它认线 */
  function legend(ctx, hdr) {
    ctx.stage.appendChild(D.text(hdr,
      { x: 48, y: 98, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    var rows = [['next', 'next 后继'], ['prev', 'prev 前驱']];
    for (var i = 0; i < rows.length; i++) {
      var y = 126 + i * 24;
      D.link(ctx.stage, { x1: 48, y1: y, x2: 82, y2: y, kind: rows[i][0] });
      ctx.stage.appendChild(D.text(rows[i][1],
        { x: 90, y: y + 5, 'class': 'vz-lab' }));
    }
  }

  /* f = { v:[值…], st:{下标:状态}, head:下标|null, tail:下标|null,
   *       skipN:[下标…], skipP:[下标…], cutN:[下标…], cutP:[下标…],
   *       bridgeN:[i,j], bridgeP:[j,i], cur:{名字:下标},
   *       ghost:{v,at,gn,gp,inN,inP,lab,st}, hdr, notes:[], stats:{} } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, k, boxes = [], n = f.v.length;
    legend(ctx, f.hdr);

    for (i = 0; i < n; i++) {
      boxes.push(D.nodeBox(ctx.stage, { x: xOf(i), y: NY, w: NW, h: NH,
        slots: ['prev', 'data', 'next'], value: f.v[i],
        state: f.st[i] || 'idle' }));
    }

    // 两端的 NULL：双向链表的边界条件全在这两个位置上
    if (n) {
      ctx.stage.appendChild(D.text('NULL',
        { x: NX0 - 26, y: YP + 5, 'class': 'vz-lab', fill: '#6d82ab' }));
      D.link(ctx.stage, { x1: NX0 - 4, y1: YP, x2: NX0 - 46, y2: YP,
        kind: 'prev' });
      var rx = xOf(n - 1) + NW;
      ctx.stage.appendChild(D.text('NULL',
        { x: rx + 44, y: YN + 5, 'class': 'vz-lab', fill: '#6d82ab' }));
      D.link(ctx.stage, { x1: rx - 14, y1: YN, x2: rx + 22, y2: YN,
        kind: 'next' });
    }

    for (i = 0; i + 1 < n; i++) {
      if (!has(f.skipN, i)) {
        D.link(ctx.stage, { x1: boxes[i].slotX('next'), y1: YN,
          x2: boxes[i + 1].x - 4, y2: YN, kind: 'next' });
      }
      if (!has(f.skipP, i + 1)) {
        D.link(ctx.stage, { x1: boxes[i + 1].slotX('prev'), y1: YP,
          x2: boxes[i].x + NW + 4, y2: YP, kind: 'prev' });
      }
    }

    // 跨越被删节点的新连线：从链外侧绕过去，一眼能看出「接过去了」
    if (f.bridgeN && boxes[f.bridgeN[0]] && boxes[f.bridgeN[1]]) {
      D.link(ctx.stage, { x1: boxes[f.bridgeN[0]].slotX('next'), y1: NY - 2,
        x2: boxes[f.bridgeN[1]].cx, y2: NY - 2, kind: 'hot', curve: -24 });
    }
    if (f.bridgeP && boxes[f.bridgeP[0]] && boxes[f.bridgeP[1]]) {
      D.link(ctx.stage, { x1: boxes[f.bridgeP[0]].slotX('prev'), y1: NY + NH + 2,
        x2: boxes[f.bridgeP[1]].cx, y2: NY + NH + 2, kind: 'hot', curve: 22 });
    }

    for (k = 0; k < (f.cutN || []).length; k++) {
      if (boxes[f.cutN[k]]) D.cross(ctx.stage, boxes[f.cutN[k]].x + NW + 10, YN, 8);
    }
    for (k = 0; k < (f.cutP || []).length; k++) {
      if (boxes[f.cutP[k]]) D.cross(ctx.stage, boxes[f.cutP[k]].x - 10, YP, 8);
    }

    // head / tail 是双向链表的两个入口，标在节点上方
    if (f.head != null && boxes[f.head]) {
      ctx.stage.appendChild(D.text('head',
        { x: boxes[f.head].cx - 26, y: NY - 12, 'class': 'vz-ptr', fill: '#6ceaa5' }));
    }
    if (f.tail != null && boxes[f.tail]) {
      ctx.stage.appendChild(D.text('tail',
        { x: boxes[f.tail].cx + 26, y: NY - 12, 'class': 'vz-ptr', fill: '#ffd166' }));
    }

    // 悬在上方的新节点 / 刚摘下来的节点
    if (f.ghost) {
      var gx = xOf(f.ghost.at);
      var gb = D.nodeBox(ctx.stage, { x: gx, y: GY, w: NW, h: NH,
        slots: ['prev', 'data', 'next'], value: f.ghost.v,
        state: f.ghost.st || 'active' });
      ctx.stage.appendChild(D.text(f.ghost.lab || 'nd = 新节点',
        { x: gb.cx, y: GY - 10, 'class': 'vz-brace', fill: '#4aa3e0' }));
      if (f.ghost.gn != null && boxes[f.ghost.gn]) {
        D.link(ctx.stage, { x1: gb.slotX('next'), y1: GY + NH,
          x2: boxes[f.ghost.gn].cx, y2: NY - 4, kind: 'next', curve: 20 });
      }
      if (f.ghost.gp != null && boxes[f.ghost.gp]) {
        D.link(ctx.stage, { x1: gb.slotX('prev'), y1: GY + NH,
          x2: boxes[f.ghost.gp].cx, y2: NY - 4, kind: 'prev', curve: 20 });
      }
      if (f.ghost.inN != null && boxes[f.ghost.inN]) {
        D.link(ctx.stage, { x1: boxes[f.ghost.inN].slotX('next'), y1: NY - 4,
          x2: gb.x + 12, y2: GY + NH, kind: 'next', curve: -20 });
      }
      if (f.ghost.inP != null && boxes[f.ghost.inP]) {
        D.link(ctx.stage, { x1: boxes[f.ghost.inP].slotX('prev'), y1: NY - 4,
          x2: gb.x + NW - 12, y2: GY + NH, kind: 'prev', curve: -20 });
      }
    }

    var names = Object.keys(f.cur || {});
    for (k = 0; k < names.length; k++) {
      var at = f.cur[names[k]];
      if (!boxes[at]) continue;
      D.pointer(ctx.stage, { name: names[k], x: boxes[at].cx, y: NY + NH + 6,
        above: false, color: names[k] === 'p' ? '#6ceaa5' : '#ffd166' });
    }

    for (k = 0; k < (f.notes || []).length && k < 3; k++) {
      ctx.stage.appendChild(D.text(f.notes[k],
        { x: 48, y: 320 + k * 22, 'class': 'vz-info', fill: '#8ea3c9' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* 各场景的快照工厂：v/head/tail 由调用方给，其余给默认值。
   * 注意 v 一定要 cp()，否则后面 splice 会把早先的快照一起改掉。 */
  function maker(getV, hdr) {
    return function (o) {
      var v = getV();
      return { v: cp(v), st: o.st || {}, hdr: hdr,
               head: o.head === undefined ? (v.length ? 0 : null) : o.head,
               tail: o.tail === undefined ? (v.length ? v.length - 1 : null) : o.tail,
               skipN: o.skipN || [], skipP: o.skipP || [],
               cutN: o.cutN || [], cutP: o.cutP || [],
               bridgeN: o.bridgeN || null, bridgeP: o.bridgeP || null,
               cur: o.cur || {}, ghost: o.ghost || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
  }

  var BASE = [10, 20, 30, 40];

  /* ---------- 场景一：结构剖析 ---------- */
  function buildAnatomy() {
    var v = cp(BASE), n = v.length, steps = [];
    var snap = maker(function () { return v; }, '结构剖析：每个节点三个域');

    steps.push(step(snap({ st: mark(1, 'active'),
      stats: { '节点数': n, '每节点指针数': 2, '入口': 'head / tail' },
      notes: ['一个节点 = prev + data + next',
        '单链表只有 data + next',
        '多存一个指针，换来能往回走'] }), 0,
      '双向链表的节点比单链表多一个域：prev 指前驱、data 存值、next 指后继。' +
      '每个节点多花一个指针的空间，换来的是「能往回走」这件事。',
      ['节点 = prev + data + next', '比单链表多一个 prev',
       '空间换能力']));

    steps.push(step(snap({ st: mark(2, 'hot', 1, 'active'),
      stats: { '看的域': 'prev', '指向': '前一个节点', '方向': '向左' },
      notes: ['a[2].prev 指着 a[1]',
        'prev 让「找前驱」变成 O(1)',
        '单链表要从 head 重新数一遍'] }), 1,
      '看中间这个节点的 prev：它指着自己的前一个节点。有了 prev，拿到任意一个节点就能立刻找到它的前驱，' +
      '而单链表只能从 head 重新数过来。',
      ['prev 指向前驱', '找前驱 O(1)',
       '单链表要 O(n)']));

    steps.push(step(snap({ st: mark(1, 'hot', 2, 'active'),
      stats: { '看的域': 'next', '指向': '后一个节点', '方向': '向右' },
      notes: ['next 和单链表完全一样',
        '两个方向的线各走一层，互不干扰',
        '蓝线向右，橙线向左'] }), 3,
      'next 的作用和单链表一样，指向后一个节点。图上蓝线一律向右、橙线一律向左，' +
      '两个方向各走一层，读图时不会混。',
      ['next 指向后继', '蓝线向右 / 橙线向左',
       '与单链表一致']));

    steps.push(step(snap({ st: mark(0, 'good', n - 1, 'good'),
      stats: { 'head': 'a[0] = ' + v[0], 'tail': 'a[' + (n - 1) + '] = ' + v[n - 1],
               '链表长度': n },
      notes: ['head 指第一个节点',
        'tail 指最后一个节点',
        '有 tail 才能 O(1) 地在尾部操作'] }), 5,
      'head 指着第一个节点，tail 指着最后一个。tail 不是必需的，但有了它，' +
      '在尾部插入和删除都能做到 O(1)，不用先走到链尾。',
      ['head → 首节点', 'tail → 尾节点',
       'tail 让尾部操作 O(1)']));

    steps.push(step(snap({ st: mark(0, 'hot', n - 1, 'hot'),
      stats: { 'head.prev': 'null', 'tail.next': 'null', '边界': '两端各一个' },
      notes: ['head.prev == null：左边到头了',
        'tail.next == null：右边到头了',
        '遍历的终止条件就靠这两个 null'] }), 6,
      '两端的边界：head.prev 和 tail.next 都是 null。正向遍历走到 next 为 null 就停，' +
      '反向遍历走到 prev 为 null 就停 —— 所有循环的终止条件都落在这两个 null 上。',
      ['head.prev == null', 'tail.next == null',
       '遍历终止条件']));

    return steps;
  }

  /* ---------- 场景二：双向遍历 ---------- */
  function buildTraverse() {
    var v = cp(BASE), n = v.length, steps = [], i, seen;
    var snap = maker(function () { return v; }, '双向遍历：正着走一遍，再倒着走一遍');

    steps.push(step(snap({ st: mark(0, 'active'), cur: mark('p', 0),
      stats: { '方向': '正向 →', '已访问': 0, 'p': 'head' },
      notes: ['p = head，准备正向遍历',
        '沿 next 一路走到 null',
        '这一段和单链表一模一样'] }), 0,
      '先正向走一遍：p = head，然后沿着 next 一直走到 null。这一段和单链表完全一样，' +
      'prev 在正向遍历里派不上用场。',
      ['p = head', '沿 next 前进',
       '终止条件 p == null']));

    for (i = 0; i < n; i++) {
      seen = i + 1;
      var stf = {}, k;
      for (k = 0; k < i; k++) stf[k] = 'done';
      stf[i] = 'hot';
      steps.push(step(snap({ st: stf, cur: mark('p', i),
        stats: { '方向': '正向 →', '已访问': seen, 'p': 'a[' + i + '] = ' + v[i] },
        notes: ['visit(' + v[i] + ')',
          'p = p.next',
          i === n - 1 ? '下一步 p 就是 null，循环结束' : '继续往右'] }), 2,
        '访问 ' + v[i] + '，然后 p = p.next。' +
        (i === n - 1 ? '这是最后一个节点，再走一步 p 就成了 null，正向遍历结束。'
                     : '正向遍历就是这样一格一格往右挪。'),
        ['visit(' + v[i] + ')', 'p = p.next',
         '已访问 ' + seen + ' 个']));
    }

    steps.push(step(snap({ st: mark(n - 1, 'active'), cur: mark('p', n - 1),
      stats: { '方向': '反向 ←', '已访问': 0, 'p': 'tail' },
      notes: ['p = tail，改成反向遍历',
        '沿 prev 一路走到 null',
        '单链表做不到这件事'] }), 4,
      '现在反过来：p = tail，沿着 prev 往左走。这是双向链表真正的价值 —— ' +
      '单链表想倒着输出，只能先把整条链读进栈或者数组里。',
      ['p = tail', '沿 prev 后退',
       '单链表无法直接反向走']));

    for (i = n - 1; i >= 0; i--) {
      seen = n - i;
      var stb = {}, m;
      for (m = n - 1; m > i; m--) stb[m] = 'done';
      stb[i] = 'hot';
      steps.push(step(snap({ st: stb, cur: mark('p', i),
        stats: { '方向': '反向 ←', '已访问': seen, 'p': 'a[' + i + '] = ' + v[i] },
        notes: ['visit(' + v[i] + ')',
          'p = p.prev',
          i === 0 ? 'head.prev == null，循环结束' : '继续往左'] }), 6,
        '访问 ' + v[i] + '，然后 p = p.prev。' +
        (i === 0 ? '走到 head 了，它的 prev 是 null，反向遍历结束。'
                 : '靠 prev 一步一步往左退，代价和正向完全一样。'),
        ['visit(' + v[i] + ')', 'p = p.prev',
         '已访问 ' + seen + ' 个']));
    }

    steps.push(step(snap({ st: mark(0, 'done', 1, 'done', 2, 'done', 3, 'done'),
      stats: { '正向': v.join(' → '), '反向': cp(v).reverse().join(' → '),
               '两次都是': 'O(n)' },
      notes: ['两个方向的代价一样，都是 O(n)',
        '任意节点都能左右横跳',
        '代价：每节点多一个指针'] }), -1,
      '两个方向各走一遍，代价都是 O(n)。双向链表的本质是：拿着链上任意一个节点，' +
      '左右都能走。代价就是每个节点多存一个指针。',
      ['正向 / 反向都是 O(n)', '任意节点可双向移动',
       '代价：每节点多一个指针']));

    return steps;
  }

  /* ---------- 场景三：头部插入 ---------- */
  function buildPushFront() {
    var v = cp(BASE), steps = [], E = 5, chg = 0;
    var snap = maker(function () { return v; }, '头部插入 O(1)');

    steps.push(step(snap({ st: mark(0, 'active'),
      ghost: { v: E, at: 0, lab: 'nd = 新节点（data = ' + E + '）' },
      stats: { '待插入': E, '链表长度': v.length, '指针改动': chg },
      notes: ['申请节点 nd，data = ' + E,
        '它的 prev / next 现在都是野值',
        '目标：把它接到 head 前面'] }), -1,
      '要在表头插入 ' + E + '。先申请一个新节点 nd，它的两个指针域现在都还是野值，' +
      '接下来要做的就是把它接到 head 前面，并且把两个方向的线都接对。',
      ['nd.data = ' + E, '两个指针待填',
       '目标：接到 head 之前']));

    chg++;
    steps.push(step(snap({ st: mark(0, 'hot'),
      ghost: { v: E, at: 0, gn: 0, lab: 'nd.next = head' },
      stats: { '待插入': E, '链表长度': v.length, '指针改动': chg },
      notes: ['nd.next = head',
        '新节点先向右接上原来的第一个',
        '此时 ' + v[0] + ' 被两个 next 指着，不要紧'] }), 0,
      'nd.next = head：新节点先向右接上原来的首节点。这时候 ' + v[0] +
      ' 同时被 head 和 nd.next 指着，看着重复，但链是完整的，没丢东西。',
      ['nd.next = head', '先接上原首节点',
       '指针改动 ' + chg]));

    chg++;
    steps.push(step(snap({ st: mark(0, 'hot'),
      ghost: { v: E, at: 0, gn: 0, lab: 'nd.prev = null' },
      stats: { '待插入': E, '链表长度': v.length, '指针改动': chg },
      notes: ['nd.prev = null',
        'nd 马上就是新的第一个节点',
        '第一个节点的 prev 必须是 null'] }), 1,
      'nd.prev = null：nd 马上就要成为新的首节点，而首节点的 prev 必须是 null。' +
      '这一句不能省，野值留在那里，反向遍历就会走到不该去的地方。',
      ['nd.prev = null', '首节点 prev 恒为 null',
       '野值会让反向遍历出错']));

    chg++;
    steps.push(step(snap({ st: mark(0, 'bad'),
      skipP: [0],
      ghost: { v: E, at: 0, gn: 0, inP: 0, lab: 'head.prev = nd' },
      stats: { '待插入': E, '链表长度': v.length, '指针改动': chg },
      notes: ['head.prev = nd —— 最容易漏的一句',
        '漏了它，反向遍历就找不到新节点',
        '双向链表的改动永远成对出现'] }), 3,
      'head.prev = nd：让原来的首节点回指新节点。这是双向链表最容易漏的一句 —— ' +
      '漏了它，正向能看到 ' + E + '，反向走却会直接跳过它，两个方向的视图不一致。',
      ['head.prev = nd', '后继必须回指新节点',
       '双向改动成对出现']));

    v.unshift(E);
    chg++;
    steps.push(step(snap({ st: mark(0, 'done'), head: 0, tail: v.length - 1,
      stats: { '链表长度': v.length, '指针改动': chg, '移动元素': 0 },
      notes: ['head = nd，插入完成',
        '一共改了 ' + chg + ' 个指针，没挪任何元素',
        '整个过程与链表长度无关 → O(1)'] }), 4,
      'head = nd，插入完成。全过程只改了 ' + chg + ' 个指针，一个元素都没搬，' +
      '而且不需要遍历，所以头部插入是 O(1)。',
      ['head = nd', '改指针 ' + chg + ' 个 / 移动 0 个',
       '头部插入 O(1)']));

    steps.push(step(snap({ st: mark(0, 'done', v.length - 1, 'good'),
      stats: { 'head': v[0], 'tail': v[v.length - 1], '空表特判': '需要' },
      notes: ['若原来是空表，tail 也要指向 nd',
        '空表是唯一需要特判的情形',
        '所以有 if tail == null: tail = nd'] }), 5,
      '最后一句是为空表准备的：如果插入前链表是空的，nd 既是头也是尾，tail 也得指向它。' +
      '空表是头部插入唯一需要特判的情形。',
      ['空表时 tail 也要更新', 'nd 既是头也是尾',
       '这是唯一的特判']));

    return steps;
  }

  /* ---------- 场景四：中间插入（在 p 之后插 25） ---------- */
  function buildInsertAfter() {
    var v = cp(BASE), steps = [], P = 1, E = 25, chg = 0;
    var snap = maker(function () { return v; }, '中间插入 O(1)：在已知节点 p 之后插入');

    steps.push(step(snap({ st: mark(P, 'active'), cur: mark('p', P),
      ghost: { v: E, at: P + 1, lab: 'nd = 新节点（data = ' + E + '）' },
      stats: { '待插入': E, 'p': 'a[' + P + '] = ' + v[P], '指针改动': chg },
      notes: ['已经握着节点 p，不需要再找它',
        '要把 ' + E + ' 插到 p 与 ' + v[P + 1] + ' 之间',
        '一共要接四根线'] }), 0,
      '要在节点 ' + v[P] + ' 之后插入 ' + E + '。前提是已经握着 p 这个指针 —— ' +
      '这时插入完全不用遍历，只需要把四根线接对。',
      ['已知 p = ' + v[P], '插到 p 与 ' + v[P + 1] + ' 之间',
       '共需接四根线']));

    chg++;
    steps.push(step(snap({ st: mark(P, 'hot'), cur: mark('p', P),
      ghost: { v: E, at: P + 1, gp: P, lab: 'nd.prev = p' },
      stats: { '待插入': E, 'p': 'a[' + P + '] = ' + v[P], '指针改动': chg },
      notes: ['nd.prev = p',
        '第一根线：新节点向左认前驱',
        '先把新节点自己的两个域填好'] }), 1,
      'nd.prev = p：新节点先向左认下前驱。策略是先把新节点自己的两个指针填好，' +
      '再去改旁边两个节点 —— 这样中间任何一步都不会把链弄断。',
      ['nd.prev = p', '新节点向左认前驱',
       '指针改动 ' + chg]));

    chg++;
    steps.push(step(snap({ st: mark(P, 'hot', P + 1, 'active'), cur: mark('p', P),
      ghost: { v: E, at: P + 1, gp: P, gn: P + 1, lab: 'nd.next = p.next' },
      stats: { '待插入': E, 'p': 'a[' + P + '] = ' + v[P], '指针改动': chg },
      notes: ['nd.next = p.next',
        '第二根线：新节点向右认后继',
        '这一句必须在改 p.next 之前'] }), 2,
      'nd.next = p.next：新节点向右认下后继。注意这一句必须写在 p.next = nd 之前，' +
      '否则 p.next 原来的值已经被冲掉，后半截链就找不回来了。',
      ['nd.next = p.next', '新节点向右认后继',
       '必须先于 p.next = nd']));

    chg++;
    steps.push(step(snap({ st: mark(P + 1, 'bad'), cur: mark('p', P),
      skipP: [P + 1],
      ghost: { v: E, at: P + 1, gp: P, gn: P + 1, inP: P + 1,
               lab: 'p.next.prev = nd' },
      stats: { '待插入': E, '后继': v[P + 1], '指针改动': chg },
      notes: ['p.next.prev = nd',
        '第三根线：后继回指新节点',
        '和头部插入那句 head.prev = nd 同一个道理'] }), 4,
      'p.next.prev = nd：让后继节点 ' + v[P + 1] + ' 回指新节点。' +
      '这和头部插入里的 head.prev = nd 是同一件事：改了一个方向，另一个方向必须跟上。',
      ['p.next.prev = nd', '后继回指新节点',
       '两个方向必须同步']));

    chg++;
    steps.push(step(snap({ st: mark(P, 'bad'), cur: mark('p', P),
      skipN: [P], skipP: [P + 1],
      ghost: { v: E, at: P + 1, gp: P, gn: P + 1, inP: P + 1, inN: P,
               lab: 'p.next = nd' },
      stats: { '待插入': E, 'p': 'a[' + P + '] = ' + v[P], '指针改动': chg },
      notes: ['p.next = nd',
        '第四根线，四根都接好了',
        'nd 正式进入链中'] }), 5,
      'p.next = nd：第四根线接好，nd 正式进入链中。两个方向的线都接上了，' +
      '此刻从左往右和从右往左走，看到的都是同一条链。',
      ['p.next = nd', '四根线全部接好',
       '两个方向视图一致']));

    v.splice(P + 1, 0, E);
    steps.push(step(snap({ st: mark(P + 1, 'done'), cur: mark('p', P),
      stats: { '链表长度': v.length, '指针改动': chg, '移动元素': 0 },
      notes: ['插入完成，改了 ' + chg + ' 个指针',
        '没有搬动任何元素',
        '已知 p 时插入是 O(1)'] }), 5,
      '插入完成，结果是 ' + v.join(' ⇄ ') + '。只改了 ' + chg +
      ' 个指针、没搬任何元素。前提仍然是「已知 p」：若还得先按序号找到 p，那部分依旧是 O(n)。',
      ['结果 ' + v.join(' ⇄ '), '改指针 ' + chg + ' 个',
       '已知 p 则为 O(1)']));

    return steps;
  }

  /* ---------- 场景五：删除节点（删 30） ---------- */
  function buildDelete() {
    var v = cp(BASE), steps = [], P = 2, chg = 0;
    var snap = maker(function () { return v; }, '删除节点 O(1)：拿着 p 就能删');

    steps.push(step(snap({ st: mark(P, 'bad'), cur: mark('p', P),
      stats: { '待删': v[P], '前驱': v[P - 1], '后继': v[P + 1] },
      notes: ['要删的节点 p 已经在手上',
        'p.prev 直接给出前驱，不用找',
        '单链表这一步要 O(n)'] }), 0,
      '要删掉节点 ' + v[P] + '。关键差别在这里：p.prev 直接就是前驱，不必从 head 重新数。' +
      '单链表拿着待删节点是删不掉的，必须先花 O(n) 找前驱。',
      ['已知待删节点 p', 'p.prev 直接给出前驱',
       '单链表需 O(n) 找前驱']));

    chg++;
    steps.push(step(snap({ st: mark(P, 'bad', P - 1, 'hot'), cur: mark('p', P),
      skipN: [P - 1], cutN: [P - 1], bridgeN: [P - 1, P + 1],
      stats: { '待删': v[P], '指针改动': chg, '方向': 'next' },
      notes: ['p.prev.next = p.next',
        '前驱的 next 跨过 p 接到后继',
        'p 若是首节点，这里要改 head'] }), 1,
      'p.prev.next = p.next：让前驱 ' + v[P - 1] + ' 的 next 跨过 p 直接接到 ' + v[P + 1] +
      '。如果 p 恰好是首节点，那就没有 p.prev，此时改的是 head 本身。',
      ['p.prev.next = p.next', '前驱跨过 p',
       'p 为首节点时改 head']));

    chg++;
    steps.push(step(snap({ st: mark(P, 'bad', P + 1, 'hot'), cur: mark('p', P),
      skipN: [P - 1], skipP: [P], cutN: [P - 1], cutP: [P],
      bridgeN: [P - 1, P + 1], bridgeP: [P + 1, P - 1],
      stats: { '待删': v[P], '指针改动': chg, '方向': 'prev' },
      notes: ['p.next.prev = p.prev',
        '后继的 prev 也跨过 p 接到前驱',
        'p 若是尾节点，这里要改 tail'] }), 3,
      'p.next.prev = p.prev：反方向也要跨过去。两根线都接好了，现在无论正着走还是倒着走，' +
      '都看不到 ' + v[P] + ' 了。若 p 是尾节点，这里改的是 tail。',
      ['p.next.prev = p.prev', '两根线都接好了',
       'p 为尾节点时改 tail']));

    steps.push(step(snap({ st: mark(P, 'mute'), cur: mark('p', P),
      skipN: [P - 1], skipP: [P], cutN: [P - 1], cutP: [P],
      bridgeN: [P - 1, P + 1], bridgeP: [P + 1, P - 1],
      stats: { '待删': v[P], '指针改动': chg, '仍占内存': '是' },
      notes: ['已经没有任何指针指向 p 了',
        '但它占的内存还没还回去',
        '下一步 free(p)'] }), 5,
      '现在链上已经没有任何指针指向 p 了 —— 它脱离了链表，但内存还捏在手里。' +
      'C 语言里这一步不做就是内存泄漏。',
      ['p 已脱离链表', '无人指向它',
       '内存尚未释放']));

    v.splice(P, 1);
    steps.push(step(snap({ st: mark(P - 1, 'done', P, 'done'),
      stats: { '链表长度': v.length, '指针改动': chg, '移动元素': 0 },
      notes: ['free(p)，删除完成',
        '结果 ' + v.join(' ⇄ '),
        '改了 ' + chg + ' 个指针，没挪元素'] }), 5,
      'free(p) 把节点还给系统，删除完成，链表变成 ' + v.join(' ⇄ ') + '。' +
      '一共只改了 ' + chg + ' 个指针，没有搬动任何元素。',
      ['free(p)', '结果 ' + v.join(' ⇄ '),
       '改指针 ' + chg + ' 个']));

    steps.push(step(snap({ st: mark(0, 'good', v.length - 1, 'good'),
      stats: { '删除': 'O(1)', '每节点开销': '多一个指针',
               '边界': 'head / tail 各一处' },
      notes: ['每次结构改动都要成对维护两个方向',
        '删除无需先找前驱，这是相对单链表的长处',
        '代价是每个节点多一个指针、边界多一处判断'] }), -1,
      '总结两点：一是每次结构改动都要成对地维护 next 和 prev，漏一根线两个方向的视图就会不一致；' +
      '二是删除不必先找前驱，代价是每节点多一个指针、两端各多一处边界判断。',
      ['改动必须成对维护', '删除无需找前驱',
       '代价：空间 + 边界判断']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['doubly-linked-list'] = {
    title: '双向链表',
    subtitle: '每个节点同时记住前驱和后继。代价是多一个指针，换来的是任意节点都能左右移动、' +
      '删除时不必先花 O(n) 找前驱 —— 但每次结构改动都必须成对维护两个方向。',
    height: 720,
    scenes: [
      { name: '结构剖析', codeTag: '节点与边界', build: buildAnatomy,
        code: [
          'class Node:',
          '    prev  -> 指向前一个节点',
          '    data  -> 存放的值',
          '    next  -> 指向后一个节点',
          '',
          'head 指向第一个节点，tail 指向最后一个',
          'head.prev == null，tail.next == null'
        ] },
      { name: '双向遍历', codeTag: '正向 / 反向', build: buildTraverse,
        code: [
          'p = head                 // 正向',
          'while p != null:',
          '    visit(p.data); p = p.next',
          '',
          'p = tail                 // 反向',
          'while p != null:',
          '    visit(p.data); p = p.prev'
        ] },
      { name: '头部插入', codeTag: 'O(1)', build: buildPushFront,
        code: [
          'nd.next = head',
          'nd.prev = null',
          'if head != null:',
          '    head.prev = nd       // 别漏这一步',
          'head = nd',
          'if tail == null: tail = nd'
        ] },
      { name: '中间插入', codeTag: 'O(1)', build: buildInsertAfter,
        code: [
          '// 在已知节点 p 之后插入 nd',
          'nd.prev = p',
          'nd.next = p.next',
          'if p.next != null:',
          '    p.next.prev = nd     // 后继回指新节点',
          'p.next = nd'
        ] },
      { name: '删除节点', codeTag: 'O(1)', build: buildDelete,
        code: [
          '// 已知待删节点 p，无需再找前驱',
          'if p.prev: p.prev.next = p.next',
          'else:      head = p.next',
          'if p.next: p.next.prev = p.prev',
          'else:      tail = p.prev',
          'free(p)'
        ] }
    ]
  };
})();
