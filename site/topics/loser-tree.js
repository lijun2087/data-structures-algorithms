/* 败者树 — 第11章
 * 上一节留下的账：k 路归并每输出一个记录要比 k−1 次，k 越大内部比较越多，
 * 把多路归并省下的 I/O 又吃回去。败者树就是来抹平这一项的。
 * 场景一：先想到的是胜者树 —— 能降到 log k，可调整时要去找兄弟结点。
 * 场景二：改存败者，冠军单独放在 ls[0] —— 构建过程。
 * 场景三：输出一个后的调整：只沿一条根到叶的路径向上，⌈log₂k⌉ 次比较。
 * 场景四：段取空了怎么办（∞ 哨兵），以及 k−1 → ⌈log₂k⌉ 这笔账。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var K = 4;
  var SEG = [[10, 15, 16], [9, 18, 20], [20, 22, 40], [6, 15, 25]];
  var INF = 9999, MINF = -9999;

  /* 布局：树在左 x∈[95,413]，右侧 x=500 起放输出序列。
   * 竖直：标题 100 / 说明 122 / 冠军 152 / 内部 196·240 / 叶 280（r=15）/
   *       叶标签 309 / 剩余 327。 */
  var LX = 110, LP = 96, R = 15;
  var YR = [196, 240, 280], WY = 152;
  var OX = 500, OW = 40, OG = 5, OY = 176, OH = 30, OPR = 6;

  function fmt(v) { return v === MINF ? '−∞' : (v === INF ? '∞' : '' + v); }
  function levelOf(id) { var L = 0, f = 1; while (f * 2 <= id) { f *= 2; L++; } return L; }
  function xOf(id) {
    if (id >= K) return LX + (id - K) * LP;
    return (xOf(id * 2) + xOf(id * 2 + 1)) / 2;
  }
  function yOf(id) { return YR[levelOf(id)]; }
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* f = { nodes:{id:{val,seg,st}}, win:{val,seg,st}, rem:{i:str},
   *       hotE:{id:1}, out:[], outHot, hdr, cap, notes, legend, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var id, i, x, c, n;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    // 冠军框与它到根的连线
    if (f.win) {
      D.link(ctx.stage, { x1: xOf(1), y1: WY + R, x2: xOf(1), y2: yOf(1) - R - 2,
        kind: 'ptr', arrow: false, width: 2 });
      D.circleNode(ctx.stage, { x: xOf(1), y: WY, r: R,
        state: f.win.st || 'good', value: fmt(f.win.val) });
      ctx.stage.appendChild(D.text('ls[0] 冠军 b' + f.win.seg,
        { x: xOf(1) + R + 10, y: WY + 5, 'class': 'vz-tag',
          fill: '#6ceaa5', 'text-anchor': 'start' }));
    }

    // 树枝
    for (id = 2; id < K * 2; id++) {
      if (!f.nodes[id] || !f.nodes[id >> 1]) continue;
      D.link(ctx.stage, { x1: xOf(id >> 1), y1: yOf(id >> 1) + R,
        x2: xOf(id), y2: yOf(id) - R - 2, kind: f.hotE && f.hotE[id] ? 'hot' : 'next',
        arrow: false, width: f.hotE && f.hotE[id] ? 2.8 : 1.7 });
    }

    // 结点
    for (id = 1; id < K * 2; id++) {
      n = f.nodes[id];
      if (!n) continue;
      D.circleNode(ctx.stage, { x: xOf(id), y: yOf(id), r: R,
        state: n.st || 'idle', value: fmt(n.val) });
      if (id < K) {
        ctx.stage.appendChild(D.text('ls[' + id + '] = b' + n.seg,
          { x: xOf(id) - R - 8, y: yOf(id) + 5, 'class': 'vz-idx',
            'text-anchor': 'end', fill: '#7d90b6' }));
      } else {
        ctx.stage.appendChild(D.text('b' + (id - K),
          { x: xOf(id), y: yOf(id) + R + 14, 'class': 'vz-idx',
            fill: '#9fb4dc' }));
        if (f.rem && f.rem[id - K] !== undefined) {
          ctx.stage.appendChild(D.text(f.rem[id - K],
            { x: xOf(id), y: yOf(id) + R + 32, 'class': 'vz-idx',
              fill: '#5f739b' }));
        }
      }
    }

    // 输出序列：两行，每行 6 格
    if (f.out) {
      ctx.stage.appendChild(D.text('输出的归并段',
        { x: OX, y: OY - 12, 'class': 'vz-tag', fill: '#9fb4dc',
          'text-anchor': 'start' }));
      for (i = 0; i < OPR * 2; i++) {
        x = OX + (i % OPR) * (OW + OG);
        c = D.C[i < f.out.length ? (i === f.outHot ? 'hot' : 'done') : 'mute'];
        var y = OY + Math.floor(i / OPR) * (OH + 26);
        ctx.stage.appendChild(D.el('rect', { x: x, y: y, width: OW,
          height: OH, rx: 5, fill: c.fill, stroke: c.stroke,
          'stroke-width': i === f.outHot ? 2.8 : 1.5 }));
        if (i < f.out.length) {
          ctx.stage.appendChild(D.text(fmt(f.out[i]),
            { x: x + OW / 2, y: y + 21, 'class': 'vz-cellval' }));
        }
      }
    }

    for (i = 0; i < (f.notes || []).length && i < 3; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: OX, y: 268 + i * 21, 'class': 'vz-info' }));
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

  /* 叶结点：b[i] 的当前首元素。head[i] 走到段尾就换成 ∞ */
  function headVal(head, i) {
    return head[i] < SEG[i].length ? SEG[i][head[i]] : INF;
  }
  function remStr(head, i) {
    var n = SEG[i].length - head[i];
    return n > 0 ? '剩 ' + n : '已取空';
  }
  function remAll(head) {
    var o = {}, i;
    for (i = 0; i < K; i++) o[i] = remStr(head, i);
    return o;
  }
  /* 把 head 对应的 K 个叶结点铺成 nodes 的 4..7 */
  function leaves(head, st) {
    var o = {}, i;
    for (i = 0; i < K; i++) {
      o[K + i] = { val: headVal(head, i), seg: i, st: (st && st[K + i]) || 'idle' };
    }
    return o;
  }

  /* ---------- 场景一：先想到的是胜者树 ----------
   * 直觉做法：每个内部结点存两个孩子里的胜者（较小者）。冠军在根，取走以后
   * 补进新值，要沿路重新比 —— 可这时候「对手是谁」不在手上：结点存的是胜者，
   * 兄弟那一支的胜者得再往下找一层才知道。 */
  function buildWinner() {
    var steps = [];
    var head = [0, 0, 0, 0];

    // 胜者树：ws[id] = 该子树的胜者所属段号
    function winTree(h) {
      var ws = {}, id;
      for (id = K * 2 - 1; id >= K; id--) ws[id] = id - K;
      for (id = K - 1; id >= 1; id--) {
        var a = ws[id * 2], b = ws[id * 2 + 1];
        ws[id] = headVal(h, a) <= headVal(h, b) ? a : b;
      }
      return ws;
    }
    function wnodes(h, st) {
      var ws = winTree(h), o = leaves(h, st), id;
      for (id = 1; id < K; id++) {
        o[id] = { val: headVal(h, ws[id]), seg: ws[id], st: (st && st[id]) || 'idle' };
      }
      return o;
    }

    var snap = function (o) {
      return { nodes: o.nodes || wnodes(head, o.st), win: o.win || null,
               rem: remAll(head), hotE: o.hotE || null,
               out: o.out || [], outHot: o.outHot,
               hdr: o.hdr || '胜者树：内部结点存两个孩子里的赢家',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      cap: '每个内部结点记下两个孩子中较小的那个 —— 一层层比上去，根就是 k 个首元素里最小的',
      stats: { 'k': K, '一次构建': 'k−1 次比较',
               '根': '全局最小 6', '看上去': '取一次只要 log₂k 次' },
      notes: ['叶子是 4 个段的当前首元素',
        '内部结点 = 两个孩子里较小的那个',
        '根 = 6，来自 b3 —— 它就是本轮该输出的记录'] }), 0,
      '先按最自然的想法来：让每个内部结点记住两个孩子里较小的那个，一层层比上去，' +
      '根上就是 k 个首元素里的最小值。这棵树叫胜者树，构建一次要 k−1 次比较，' +
      '看起来取一次只用 log₂k 次就能修好。',
      ['内部结点存赢家', '根 = 全局最小 6',
       '构建 k−1 次比较']));

    var st1 = {}; st1[1] = 'good'; st1[7] = 'hot';
    steps.push(step(snap({
      st: st1, win: { val: 6, seg: 3 }, out: [6], outHot: 0,
      hotE: { 7: 1, 3: 1 },
      cap: '把根上的 6 写进输出，它来自 b3 —— 于是 b3 要补进下一个记录 15，沿这条路重新比一遍',
      stats: { '输出': 6, '来自': 'b3',
               'b3 补进': 15, '要重比': '2 层' },
      notes: ['冠军 6 输出，b3 的首元素前移到 15',
        '只有 b3 这一支的值变了，其余三支原封不动',
        '所以只需沿 b3 到根这一条路重新比'] }), 2,
      '把根上的 6 输出，它来自 b3，于是 b3 的首元素前移到 15。注意只有这一支的值变了，' +
      '其余三支的胜负关系没动 —— 所以只要沿着 b3 到根的这一条路重新比，log₂k 次就够，' +
      '这正是树形选择比 k−1 次强的地方。',
      ['输出 6，b3 补 15', '只有一支变了',
       '沿一条路重比 2 层']));

    head[3] = 1;
    var st2 = {}; st2[7] = 'active'; st2[6] = 'bad'; st2[3] = 'hot';
    steps.push(step(snap({
      st: st2, out: [6], hotE: { 7: 1 },
      hdr: '毛病来了：对手藏在兄弟结点里',
      cap: '15 要和谁比？和 b2 这一支的胜者比 —— 可那个值存在兄弟结点 ls[3] 的另一个孩子上',
      stats: { '新来者': 15, '它的对手': 'b2 支的胜者 20',
               '对手存在': '兄弟结点里', '每层要访问': '兄弟 + 父亲' },
      notes: ['父亲 ls[3] 存的是「谁赢了」，不是「谁输了」',
        '15 的对手是上一轮输掉的那一支 —— 那一支没留在父亲里',
        '只能跳到兄弟结点去读，再回来写父亲'] }), 3,
      '毛病在这里：15 该和谁比？和 b2 那一支的胜者比。可父亲结点存的是「谁赢了」，' +
      '赢家就是 b3 自己 —— 输掉的那一支并没有留在父亲里，得跳到兄弟结点去把它读出来，' +
      '再回头改父亲。每上一层都要这么旁跳一次。',
      ['父亲只存赢家', '对手在兄弟里',
       '每层都要旁跳一次']));

    var st3 = {}; st3[1] = 'hot'; st3[2] = 'bad'; st3[3] = 'active';
    steps.push(step(snap({
      st: st3, out: [6], hotE: { 3: 1 },
      hdr: '症结：改一处，却要来回横跳 log k 次',
      cap: '再上一层同样如此：node1 要重比，得先读兄弟 node2 的 9 —— 路径清清楚楚，访问却不干净',
      stats: { '路径长度': '⌈log₂k⌉', '每层访问': '兄弟 + 自己',
               '想要的': '只碰祖先', '办法': '改存败者' },
      notes: ['访问模式是「一路向上」，可每层都得横一下',
        '若父亲存的是败者，它本身就是新来者的对手',
        '这样一路向上只碰祖先，写法也只剩一个循环'],
      legend: '一句话改进：既然每轮要找的都是「上次在这里输掉的那一支」，那就直接把败者存在结点里' }), 4,
      '症结就在这里：调整的路径明明是一条直线，可每层都得横跳到兄弟去读对手。' +
      '既然每轮要找的都是「上次在这里输掉的那一支」，那就干脆把败者存在结点里 —— ' +
      '一路向上只碰祖先，代码也只剩一个循环。这就是败者树。',
      ['路径是直线，访问不是', '把败者存进结点',
       '一路向上只碰祖先']));

    return steps;
  }

  /* 败者树：ls[1..K−1] 存内部结点上的败者段号，ls[0] 存冠军段号。
   * 段号 K 是那个虚拟的 −∞ 段，只在构建时用一次。 */
  function valOf(head, s) { return s >= K ? MINF : headVal(head, s); }
  function lsNodes(head, ls, st) {
    var o = leaves(head, st), id;
    for (id = 1; id < K; id++) {
      if (ls[id] === undefined) continue;
      o[id] = { val: valOf(head, ls[id]), seg: ls[id],
                st: (st && st[id]) || 'idle' };
    }
    return o;
  }
  /* 叶 s 到根的那条路径，用来点亮 hotE */
  function pathOf(s) {
    var o = {}, t = K + s;
    while (t > 1) { o[t] = 1; t = t >> 1; }
    return o;
  }

  /* ---------- 场景二：构建败者树 ----------
   * 诀窍：先把每个内部结点都填上「虚拟段 K 的 −∞ 输在这里」。
   * 这样第一次 Adjust(s) 走到任何一层，s 都比 −∞ 大 —— 必定「输」并留在结点上，
   * 而 −∞ 继续上浮。一句 if 不用改，k 次 Adjust 就把整棵树填好了。 */
  function buildBuild() {
    var steps = [];
    var head = [0, 0, 0, 0];
    var ls = {}, i, cmp = 0;
    for (i = 0; i < K; i++) ls[i] = K;

    var snap = function (o) {
      return { nodes: lsNodes(head, ls, o.st), win: o.win || null,
               rem: remAll(head), hotE: o.hotE || null,
               out: [], hdr: o.hdr || '构建：−∞ 初始化，然后 k 次 Adjust',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      cap: '先让每个内部结点都记「虚拟段 b4 的 −∞ 输在这里」—— 于是任何真值上来都必定赢它',
      stats: { 'ls[1..3]': '全填 b4', 'b4 的值': '−∞',
               '为什么': '保证真值必赢', '好处': '不必给构建写另一套代码' },
      notes: ['ls[i] 存的是「在这个结点输掉的是哪一段」',
        '初始全填虚拟段 b4，它的值是 −∞',
        '−∞ 谁都赢不过它 —— 真值上来必定把它挤下去'] }), 0,
      '构建有个巧劲：先让每个内部结点都记「虚拟段 b4 的 −∞ 输在这里」。' +
      '这样第一次调整走到任何一层，真值都比 −∞ 大、必定「输」并留在结点上，' +
      '而 −∞ 继续往上浮 —— 一句 if 都不用改，反复调用 Adjust 就能把树填满。',
      ['ls[i] 存败者段号', '初始全填 −∞ 的 b4',
       '真值上来必定留下']));

    for (i = K - 1; i >= 0; i--) {
      var s = i, t = (s + K) >> 1, hp = pathOf(i), swaps = [];
      while (t > 0) {
        cmp++;
        if (valOf(head, s) > valOf(head, ls[t])) {
          swaps.push('ls[' + t + '] ← b' + s);
          var tmp = ls[t]; ls[t] = s; s = tmp;
        } else {
          swaps.push('ls[' + t + '] 不动');
        }
        t = t >> 1;
      }
      ls[0] = s;

      var st = {}, q;
      st[K + i] = 'active';
      for (q in hp) st[q] = 'hot';
      steps.push(step(snap({
        st: st, hotE: hp,
        win: ls[0] < K ? { val: headVal(head, ls[0]), seg: ls[0] } : null,
        cap: 'Adjust(' + i + ')：把 b' + i + ' 的首元素 ' + SEG[i][0] +
             ' 从叶子送上去，一路比到根 —— ' + swaps.join('，'),
        stats: { '本次 Adjust': 'b' + i, '送上去的值': SEG[i][0],
                 '走过层数': 2, '累计比较': cmp },
        notes: ['t = (s + k) / 2 找到父亲，然后 t /= 2 一路上行',
          '输的留下（ls[t] = s），赢的接着往上（s = 原 ls[t]）',
          '循环结束时 s 就是当前冠军，写进 ls[0]'],
        legend: '黄色是这一次走过的路径；结点左边的 ls[i] = b? 就是记在那里的败者' }), 3,
        '调用 Adjust(' + i + ')：把 b' + i + ' 的首元素 ' + SEG[i][0] +
        ' 从叶子往上送，' + swaps.join('，') + '。规则只有一句：输的留在结点里，' +
        '赢的顶替它继续上行；走到根，手里剩下的那个就是冠军，写进 ls[0]。',
        ['Adjust(' + i + ')，送上 ' + SEG[i][0],
         '输的留下，赢的上行',
         '累计比较 ' + cmp + ' 次']));
    }

    var stf = {}, qq;
    for (qq = 1; qq < K; qq++) stf[qq] = 'done';
    stf[K + ls[0]] = 'good';
    steps.push(step(snap({
      st: stf, win: { val: headVal(head, ls[0]), seg: ls[0], st: 'good' },
      hotE: pathOf(ls[0]),
      hdr: '构建完成：ls[0] = b' + ls[0] + '，冠军是 ' + headVal(head, ls[0]),
      cap: '4 次 Adjust 共 ' + cmp + ' 次比较；此后每输出一个记录只要再调整一次',
      stats: { '冠军': headVal(head, ls[0]), '来自': 'b' + ls[0],
               '构建比较': cmp + ' 次', '此后每次': '⌈log₂k⌉ 次' },
      notes: ['ls[1] = b' + ls[1] + '，ls[2] = b' + ls[2] + '，ls[3] = b' + ls[3],
        '每个内部结点记着「在这里输掉的是谁」',
        '冠军单独放在 ls[0] —— 它没在任何地方输过'],
      legend: '注意冠军不占内部结点：它一路赢到底，所以只能另设 ls[0] 存它' }), -1,
      '构建完成，冠军是 b' + ls[0] + ' 的 ' + headVal(head, ls[0]) +
      '。这里有个容易忽略的细节：冠军一路赢到底，没在任何结点输过，' +
      '所以内部结点放不下它 —— 必须另设一个 ls[0] 专门存冠军。',
      ['冠军 ' + headVal(head, ls[0]) + ' 来自 b' + ls[0],
       '内部结点全是败者',
       '冠军只能放 ls[0]']));

    return steps;
  }

  /* ---------- 场景三：输出一个记录后的调整 ----------
   * 冠军所在的段补进下一个记录，从那片叶子出发一路向上：
   * 每层拿当前值和结点里的败者比，输的留下、赢的继续 —— 恰好 ⌈log₂k⌉ 次比较。 */
  function buildAdjust() {
    var steps = [];
    var head = [0, 0, 0, 0];
    var ls = {}, i, out = [], cmp = 0;
    for (i = 0; i < K; i++) ls[i] = K;
    for (i = K - 1; i >= 0; i--) {          // 静默构建，本场景不演示
      var s0 = i, t0 = (s0 + K) >> 1;
      while (t0 > 0) {
        if (valOf(head, s0) > valOf(head, ls[t0])) {
          var tp = ls[t0]; ls[t0] = s0; s0 = tp;
        }
        t0 = t0 >> 1;
      }
      ls[0] = s0;
    }

    var snap = function (o) {
      return { nodes: lsNodes(head, ls, o.st), win: o.win || null,
               rem: remAll(head), hotE: o.hotE || null,
               out: out.slice(), outHot: o.outHot,
               hdr: o.hdr || '调整：只沿一条根到叶的路径向上',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      st: (function () { var o = {}, q; for (q = 1; q < K; q++) o[q] = 'idle';
        o[K + ls[0]] = 'good'; return o; })(),
      win: { val: headVal(head, ls[0]), seg: ls[0], st: 'good' },
      cap: '树已建好，冠军 6 在 ls[0]。下面看输出它之后怎么用一趟上行把树修好',
      stats: { '冠军': 6, '来自': 'b3',
               '一次调整': '⌈log₂4⌉ = 2 次', '对比胜者树': 'k−1 = 3 次' },
      notes: ['输出冠军 → 该段补进下一个记录',
        '从这片叶子出发，一路向上比到根',
        '每层只和结点里的败者比一次'] }), 0,
      '树已经建好，冠军 6 在 ls[0]。接下来是整个算法真正循环的部分：' +
      '输出冠军、给那个段补进下一个记录、从这片叶子一路向上修树。' +
      '每层只比一次，走 ⌈log₂k⌉ 层 —— 而朴素做法要比 k−1 次。',
      ['输出冠军后补新值', '从那片叶子向上',
       '每层只比一次']));

    var round = 0;
    while (round < 5) {
      var q = ls[0], v = headVal(head, q);
      if (v === INF) break;
      out.push(v);
      round++;

      // 第一步：输出冠军，该段前移
      var sa = {}; sa[K + q] = 'hot';
      steps.push(step(snap({
        st: sa, outHot: out.length - 1, hotE: pathOf(q),
        cap: '输出 ' + v + '（来自 b' + q + '）；b' + q + ' 的首元素前移到 ' +
             fmt(head[q] + 1 < SEG[q].length ? SEG[q][head[q] + 1] : INF),
        stats: { '本次输出': v, '来自': 'b' + q,
                 '补进': fmt(head[q] + 1 < SEG[q].length ? SEG[q][head[q] + 1] : INF),
                 '已输出': out.length + ' 个' },
        notes: ['冠军 ' + v + ' 写进输出序列',
          'b' + q + ' 的读指针前移一格',
          '只有这片叶子的值变了，别处不动'] }), 1,
        '把冠军 ' + v + ' 输出，它来自 b' + q + '，于是这一段的首元素前移到 ' +
        fmt(head[q] + 1 < SEG[q].length ? SEG[q][head[q] + 1] : INF) +
        '。全树只有这一片叶子的值变了，其余的胜负关系一概没动 —— 这才是只修一条路的依据。',
        ['输出 ' + v, 'b' + q + ' 前移一格',
         '只有一片叶子变了']));

      head[q]++;
      var nv = headVal(head, q);

      // 第二步：沿路径向上调整
      var s = q, t = (s + K) >> 1, log = [];
      while (t > 0) {
        cmp++;
        if (valOf(head, s) > valOf(head, ls[t])) {
          log.push('ls[' + t + ']：' + fmt(valOf(head, s)) + ' 输给 ' +
                   fmt(valOf(head, ls[t])) + '，留下');
          var tm = ls[t]; ls[t] = s; s = tm;
        } else {
          log.push('ls[' + t + ']：' + fmt(valOf(head, s)) + ' 赢了 ' +
                   fmt(valOf(head, ls[t])) + '，继续上行');
        }
        t = t >> 1;
      }
      ls[0] = s;

      var sb = {}, qz;
      sb[K + q] = 'active';
      for (qz in pathOf(q)) sb[qz] = 'hot';
      steps.push(step(snap({
        st: sb, hotE: pathOf(q),
        win: { val: headVal(head, ls[0]), seg: ls[0], st: 'good' },
        cap: '新值 ' + fmt(nv) + ' 沿路上行：' + log.join('；') +
             ' → 新冠军 ' + fmt(headVal(head, ls[0])) + '（b' + ls[0] + '）',
        stats: { '新来者': fmt(nv), '本次比较': 2,
                 '新冠军': fmt(headVal(head, ls[0])), '累计比较': cmp },
        notes: [log[0], log[1] || '',
          '新冠军 b' + ls[0] + ' 写进 ls[0]'],
        legend: '一次调整只走这一条黄色路径，比较次数恒为树高 ⌈log₂k⌉ = 2' }), 3,
        '新值 ' + fmt(nv) + ' 从叶子往上走：' + log.join('；') +
        '。走到根，手里的 ' + fmt(headVal(head, ls[0])) + ' 就是新冠军。' +
        '整趟只比了 2 次，与 k 无关地固定为树高。',
        ['新来者 ' + fmt(nv), '比较 2 次',
         '新冠军 ' + fmt(headVal(head, ls[0]))]));
    }

    return steps;
  }

  /* ---------- 场景四：∞ 哨兵与那笔账 ----------
   * 段取空了不能把叶子空着，否则「谁该参赛」要另外判断。填 ∞：它永远赢不了，
   * 自然退出竞争；冠军也变成 ∞ 时，说明全部段都空了，归并结束。 */
  function buildSentinel() {
    var steps = [];
    var head = [3, 3, 2, 3];               // 只剩 b2 还有 40 没取
    var ls = { 0: 2, 1: 0, 2: 1, 3: 3 };

    var snap = function (o) {
      return { nodes: lsNodes(head, ls, o.st), win: o.win || null,
               rem: remAll(head), hotE: o.hotE || null,
               out: o.out || [], outHot: o.outHot,
               hdr: o.hdr || '段取空了：填 ∞ 让它自动退出竞争',
               cap: o.cap || null, legend: o.legend || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      st: (function () { var o = {}; o[4] = 'mute'; o[5] = 'mute'; o[7] = 'mute';
        o[6] = 'good'; return o; })(),
      win: { val: 40, seg: 2, st: 'good' },
      cap: 'b0、b1、b3 都取空了 —— 叶子填 ∞。∞ 永远赢不了，等于自动退出比赛',
      stats: { '空段': 'b0 b1 b3', '填的值': '∞',
               '效果': '永远赢不了', '还剩': 'b2 的 40' },
      notes: ['不填的话，每次比较前都要先判断「这一支还有没有记录」',
        '填 ∞ 就把这个判断消掉了 —— 它必输，自然沉在下面',
        '这和顺序查找里加哨兵是同一个路子'] }), 0,
      '段取空了，叶子不能空着 —— 否则每次比较前都得先问一句「这一支还有记录吗」。' +
      '办法是填 ∞：它永远赢不了，等于自动退出比赛。跟顺序查找加哨兵是同一个路子，' +
      '用一个不可能的值换掉一处分支判断。',
      ['空段填 ∞', '∞ 必输，自动退出',
       '省掉一处判断']));

    head[2] = 3;
    ls = { 0: 2, 1: 0, 2: 1, 3: 3 };
    steps.push(step(snap({
      st: (function () { var o = {}, i; for (i = K; i < K * 2; i++) o[i] = 'mute';
        return o; })(),
      win: { val: INF, seg: 2, st: 'bad' }, out: [40], outHot: 0,
      hdr: '结束条件：冠军自己变成 ∞',
      cap: '把 40 输出后 b2 也空了 —— 四片叶子全是 ∞，冠军也是 ∞，说明这一趟归并做完了',
      stats: { '冠军': '∞', '含义': '所有段都空',
               '循环条件': 'while (ls[0] 的值 ≠ ∞)', '不必': '另设计数器' },
      notes: ['冠军是 k 个值里最小的',
        '最小的都是 ∞，说明全部都是 ∞',
        '所以 while 的条件天然就有了，不用另外数'],
      legend: '∞ 一举两得：既让空段退出竞争，又顺手给出了归并的终止条件' }), 5,
      '把 40 输出后 b2 也空了，四片叶子全是 ∞。冠军是 k 个值里最小的那个，' +
      '最小的都成了 ∞，就说明全部都是 ∞ —— 归并结束。所以循环条件天然就是' +
      '「ls[0] 的值不是 ∞」，不必另设计数器。',
      ['冠军变 ∞', '说明全部段都空',
       '终止条件天然成立']));

    var CMP = [[2, 1, 1], [3, 2, 2], [5, 4, 3], [10, 9, 4], [100, 99, 7]];
    var j;
    for (j = 0; j < 2; j++) {
      var rows = [], z;
      for (z = 0; z <= (j === 0 ? 2 : 4); z++) {
        rows.push('k = ' + CMP[z][0] + '：朴素 ' + CMP[z][1] +
                  ' 次 → 败者树 ' + CMP[z][2] + ' 次');
      }
      var stx = {}, zi;
      for (zi = 1; zi < K * 2; zi++) stx[zi] = 'done';
      steps.push(step(snap({
        st: stx, win: { val: INF, seg: 2, st: 'done' },
        hdr: j === 0 ? '这笔账：k−1 变成 ⌈log₂k⌉' : '结论：k 可以放开加了',
        cap: j === 0
          ? '输出一个记录的内部比较次数，从与 k 成正比降到与 log k 成正比'
          : 'k 从 10 加到 100，朴素做法的比较涨了 11 倍，败者树只涨不到 1 倍',
        stats: j === 0
          ? { '朴素选最小': 'k−1 次', '败者树': '⌈log₂k⌉ 次',
              'k = 10': '9 → 4', '总比较': '(n−1)⌈log₂k⌉' }
          : { 'k = 10': '9 → 4', 'k = 100': '99 → 7',
              '趟数 S': '⌈log_k m⌉ 仍在降', '结论': 'k 由 I/O 与内存定' },
        notes: rows.slice(j === 0 ? 0 : 2, j === 0 ? 3 : 5),
        legend: j === 0
          ? '上一节的症结是「每轮只换一个首元素却全部重比」—— 败者树把没变的胜负关系留了下来'
          : '至此外排序的两头都通了：加大 k 压趟数，用败者树按住内部比较' }),
        j === 0 ? 3 : -1,
        j === 0
          ? '这就是上一节那笔账的结果：输出一个记录的内部比较从 k−1 次降到 ⌈log₂k⌉ 次。' +
            '道理很朴素 —— 每轮只有一个首元素变了，别处的胜负关系还有效，败者树把它们留在了结点里。'
          : 'k 从 10 加到 100，朴素做法的比较从 9 次涨到 99 次，败者树只从 4 次涨到 7 次。' +
            '于是 k 不再受内部比较的牵制，能开多大就由缓冲区内存和一次 I/O 的块大小说话了。',
        j === 0
          ? ['k−1 → ⌈log₂k⌉', '因为胜负关系被留下了',
             '总比较 (n−1)⌈log₂k⌉']
          : ['k = 100：99 → 7 次', 'k 不再受比较牵制',
             '由内存与 I/O 决定']));
    }

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['loser-tree'] = {
    title: '败者树 Loser Tree',
    subtitle: 'k 路归并每输出一个记录要比 k−1 次，k 越大内部比较越多，把省下的 I/O 吃回去。' +
      '症结是每轮只换一个首元素，其余胜负关系明明还有效却全被丢掉 —— ' +
      '败者树把它们留在结点里，一次调整只沿一条路走 ⌈log₂k⌉ 步。',
    height: 700,
    code: [
      '// ls[0] 存冠军段号，ls[1..k-1] 存各结点上的败者段号',
      'void Adjust(int s) {          // s：值刚变过的那片叶子',
      '    for (t = (s + k) / 2; t > 0; t /= 2)',
      '        if (b[s].key > b[ls[t]].key)',
      '            { swap(s, ls[t]); }   // 输的留下，赢的上行',
      '    ls[0] = s;                // 走到根，手里的就是冠军',
      '}',
      '// 一次调整恒为 ⌈log₂k⌉ 次比较，与 k 只有对数关系'
    ],
    scenes: [
      { name: '胜者树的毛病', build: buildWinner,
        codeTag: '对手藏在兄弟结点里',
        code: [
          '// 胜者树：内部结点存两个孩子里较小的那个',
          '// 根 = 全局最小 → 输出它，该段补进新值',
          '// 调整时：新值该和谁比？',
          '//   和「上次在这个结点输掉的那一支」比',
          '//   可结点里存的是赢家 —— 输家没留下',
          '// 只能跳到兄弟结点去读，再回来改父亲',
          '// 路径是一条直线，访问却每层横跳一次',
          '// 改进：干脆把败者存进结点'
        ] },
      { name: '构建败者树', build: buildBuild,
        codeTag: '−∞ 初始化 + k 次 Adjust',
        code: [
          'for (i = 0; i < k; i++) ls[i] = k;   // 全指虚拟段',
          'b[k].key = MINKEY;                   // 虚拟段填 −∞',
          'for (i = k - 1; i >= 0; i--)',
          '    Adjust(i);            // 从右往左逐个送上去',
          '// −∞ 谁都赢不过 → 真值上来必定留在结点上',
          '// 于是构建不必另写代码，复用 Adjust 即可',
          '// 共 k 次 Adjust，冠军最后落在 ls[0]',
          '// 冠军一路赢到底，内部结点放不下 → 另设 ls[0]'
        ] },
      { name: '输出后的调整', build: buildAdjust,
        codeTag: '一条路上行 ⌈log₂k⌉ 次',
        code: [
          'while (b[ls[0]].key != MAXKEY) {',
          '    q = ls[0];  output(b[q]);      // 输出冠军',
          '    b[q] = next record of run q;   // 该段补新值',
          '    Adjust(q);                     // 只修这一条路',
          '}',
          '// 每轮只有一片叶子变了',
          '// 其余结点记着的败者关系依然有效 → 不必重比',
          '// 所以比较次数 = 树高 = ⌈log₂k⌉'
        ] },
      { name: '∞ 哨兵与这笔账', build: buildSentinel,
        codeTag: 'k−1 → ⌈log₂k⌉',
        code: [
          '// 段取空 → 叶子填 MAXKEY（∞）',
          '// ∞ 永远赢不了，等于自动退出竞争',
          '// 省掉了「这一支还有记录吗」这个判断',
          '// 冠军也变成 ∞ → 所有段都空 → 归并结束',
          '// 账：输出一个记录的内部比较',
          '//   朴素 k−1 次   →   败者树 ⌈log₂k⌉ 次',
          '//   k=10：9 → 4    k=100：99 → 7',
          '// k 遂由缓冲区内存与块大小决定，不再受比较牵制'
        ] }
    ]
  };
})();
