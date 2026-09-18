/* 栈解迷宫回溯 — 第3章
 * 场景一：完整求解一次 —— 每到一格就把「当前位置 + 已试到第几个方向」压栈，
 *         然后朝一个方向试探；四个方向都不通就弹栈退回上一格，换下一个方向。
 *         栈的涨与缩就是回溯的实体，弹栈那一下最值得看清。
 * 场景二：为什么非要留标记，以及这套试探法就是深度优先的雏形（第7章 DFS）。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 横向自左到右分四块，互不相犯：
   *   x 46…202  迷宫 6×6，格宽 26（行号写在 x=36，列号写在格子上方 y=162）
   *   x 232…460 方向表与本次试探的结果
   *   x 470…626 栈（栈底在下，向上生长）
   *   x 650…    右侧提示，最多 4 行
   * 竖直方向：标题 100、说明 122 / 142、列号 162、
   *   迷宫 168…324；栈自底向上 —— 栈底格顶边 306，格高 18、间隙 2，
   *   压到第 12 层时顶边 86，仍在 84 以内。 */
  var R = 6, CS = 26, GX0 = 46, GY0 = 168;
  var DIRX = 232, SKX = 470, SKW = 156;
  var SKY0 = 306, SKH = 18, SKG = 2;
  var NX = 650;

  function gx(c) { return GX0 + c * CS; }
  function gy(r) { return GY0 + r * CS; }
  function syOf(i) { return SKY0 - i * (SKH + SKG); }

  var DN = ['东', '南', '西', '北'];
  var DD = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  var DTXT = ['0  东 → (r, c+1)', '1  南 → (r+1, c)',
              '2  西 → (r, c-1)', '3  北 → (r-1, c)'];

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }
  function key(r, c) { return r * 10 + c; }

  /* f = { wall:[[0/1]…], mk:{key:'path'|'dead'|'try'}, cur:[r,c]|null,
   *       stack:[{r,c,d}…], di, probe, probeSt, ent:[r,c], ext:[r,c],
   *       hdr, cap1, cap2, notes, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var r, c, i, m, col, x, y;

    ctx.stage.appendChild(D.text(f.hdr || '栈解迷宫',
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 142, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    /* ---- 迷宫 ---- */
    for (c = 0; c < R; c++) {
      ctx.stage.appendChild(D.text(c,
        { x: gx(c) + CS / 2, y: 162, 'class': 'vz-idx' }));
    }
    for (r = 0; r < R; r++) {
      ctx.stage.appendChild(D.text(r,
        { x: 36, y: gy(r) + CS / 2 + 4, 'class': 'vz-idx' }));
      for (c = 0; c < R; c++) {
        x = gx(c); y = gy(r);
        m = f.mk[key(r, c)];
        if (f.wall[r][c]) col = { fill: '#2b3a5c', stroke: '#3f5580' };
        else if (f.cur && f.cur[0] === r && f.cur[1] === c) col = D.C.hot;
        else if (m === 'dead') col = D.C.bad;
        else if (m === 'path') col = D.C.good;
        else if (m === 'try') col = D.C.active;
        else col = D.C.mute;
        ctx.stage.appendChild(D.el('rect', { x: x, y: y, width: CS - 2,
          height: CS - 2, rx: 4, fill: col.fill, stroke: col.stroke,
          'stroke-width': 1.6 }));
        if (f.wall[r][c]) continue;
        if (m === 'dead') D.cross(ctx.stage, x + 12, y + 12, 6);
        else if (m === 'path') {
          ctx.stage.appendChild(D.el('circle', { cx: x + 12, cy: y + 12,
            r: 3, fill: '#6ceaa5' }));
        }
      }
    }
    ctx.stage.appendChild(D.text('入',
      { x: gx(f.ent[1]) + 12, y: gy(f.ent[0]) + 17, 'class': 'vz-tag',
        fill: '#ffd166' }));
    ctx.stage.appendChild(D.text('出',
      { x: gx(f.ext[1]) + 12, y: gy(f.ext[0]) + 17, 'class': 'vz-tag',
        fill: '#6ceaa5' }));

    /* ---- 方向表 ---- */
    ctx.stage.appendChild(D.text('方向表 di：按东南西北顺序试',
      { x: DIRX, y: 176, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    for (i = 0; i < 4; i++) {
      ctx.stage.appendChild(D.text(DTXT[i],
        { x: DIRX + 10, y: 204 + i * 24, 'class': 'vz-info',
          fill: f.di === i ? '#ffd166' : '#7d93bd' }));
    }
    if (f.probe) {
      ctx.stage.appendChild(D.text(f.probe,
        { x: DIRX, y: 314, 'class': 'vz-lab',
          fill: f.probeSt === 'ok' ? '#6ceaa5'
              : f.probeSt === 'no' ? '#ff6b6b' : '#8ea3c9' }));
    }

    /* ---- 栈 ---- */
    for (i = 0; i < f.stack.length && i < 12; i++) {
      y = syOf(i);
      col = i === f.stack.length - 1 ? D.C.active : D.C.good;
      ctx.stage.appendChild(D.el('rect', { x: SKX, y: y, width: SKW,
        height: SKH, rx: 4, fill: col.fill, stroke: col.stroke,
        'stroke-width': 1.6 }));
      ctx.stage.appendChild(D.text('(' + f.stack[i].r + ',' + f.stack[i].c + ')',
        { x: SKX + 10, y: y + 13, 'class': 'vz-info' }));
      ctx.stage.appendChild(D.text(f.stack[i].d < 0 ? '还没开始试'
                                    : '已试到 ' + DN[f.stack[i].d],
        { x: SKX + 62, y: y + 13, 'class': 'vz-info', fill: '#8ea3c9' }));
    }
    if (!f.stack.length) {
      ctx.stage.appendChild(D.el('rect', { x: SKX, y: syOf(0), width: SKW,
        height: SKH, rx: 4, fill: D.C.mute.fill, stroke: D.C.mute.stroke,
        'stroke-width': 1.6 }));
      ctx.stage.appendChild(D.text('栈空',
        { x: SKX + 10, y: syOf(0) + 13, 'class': 'vz-info', fill: '#5f7099' }));
    } else {
      ctx.stage.appendChild(D.text('顶',
        { x: SKX + SKW + 8, y: syOf(f.stack.length - 1) + 13,
          'class': 'vz-lab', fill: '#6ceaa5' }));
    }
    ctx.stage.appendChild(D.text('↑ 栈底在下 · 深 ' + f.stack.length,
      { x: SKX, y: 326, 'class': 'vz-lab', fill: '#8ea3c9' }));

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: NX, y: 190 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---------- 场景一：试探、前进、碰壁、回溯，完整走一遍 ---------- */
  /* 迷宫故意在起点旁挖了个两格的岔口：从 (0,0) 一直往东能走到 (0,2)，
   * 到那儿四面全堵 —— 这就是要看清的死胡同。退回 (0,1) 改走南，
   * 之后南、东交替下到 (4,5)，再往南一步便是出口 (5,5)。 */
  var W1 = [
    [0, 0, 0, 1, 1, 1],
    [1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 1],
    [1, 1, 1, 0, 1, 1],
    [1, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 0]
  ];

  function buildWalk() {
    var steps = [];
    var mk = {}, stack = [], cur = null, di = -1, tries = 0, pops = 0;
    var ent = [0, 0], ext = [5, 5];

    // 栈里存的是可变对象，每帧都得逐个复制，不然回退会看到未来的 d
    function skCopy() {
      var a = [], i;
      for (i = 0; i < stack.length; i++) {
        a.push({ r: stack[i].r, c: stack[i].c, d: stack[i].d });
      }
      return a;
    }
    var snap = function (o) {
      return { wall: W1, mk: cp(mk), cur: cur ? [cur[0], cur[1]] : null,
               stack: skCopy(), di: o.di === undefined ? di : o.di,
               probe: o.probe || null, probeSt: o.probeSt || null,
               ent: ent, ext: ext,
               hdr: o.hdr || '栈解迷宫　6×6，入口 (0,0)，出口 (5,5)',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '当前位置': cur ? '(' + cur[0] + ',' + cur[1] + ')' : '—',
               '栈深': stack.length, '试探': tries, '回溯': pops };
    };
    function top() { return stack[stack.length - 1]; }
    function at(p) { return '(' + p.r + ',' + p.c + ')'; }

    // 压栈：新格标 path，di 归 -1 —— 到了新地方一律从东重新试
    function pushCell(r, c) {
      stack.push({ r: r, c: c, d: -1 });
      mk[key(r, c)] = 'path';
      cur = [r, c];
      di = -1;
    }

    /* 朝 d 试探成功：先把「已试到 d」写回栈顶，再压新格 */
    function go(d, cap2, nv) {
      var t = top(), nr = t.r + DD[d][0], nc = t.c + DD[d][1], from = at(t);
      t.d = d;
      tries++;
      pushCell(nr, nc);
      steps.push(step(snap({
        di: d,
        probe: '试' + DN[d] + ' → (' + nr + ',' + nc + ')　通，走过去',
        probeSt: 'ok',
        cap1: from + ' 试' + DN[d] + '通 —— 标记 (' + nr + ',' + nc +
              ') 为已走，压栈',
        cap2: cap2,
        stats: base(),
        notes: ['先把「已试到' + DN[d] + '」写回栈顶那格',
          '(' + nr + ',' + nc + ') 标为 path，防止再踩',
          '新格带 di = -1 进栈，从东重新试',
          '栈深 ' + stack.length + ' 就是当前路径的长度'] }), 10,
        nv || (from + ' 往' + DN[d] + '通，把 (' + nr + ',' + nc +
        ') 标记后压栈。关键是先把「已试到' + DN[d] +
        '」记回栈顶 —— 将来退回来才知道接着试哪个方向。'),
        ['标记 (' + nr + ',' + nc + ') 为 path',
         'push((' + nr + ',' + nc + ')，di = -1)',
         '栈深 → ' + stack.length]));
    }

    /* 朝 d 试探失败：三种堵法各说清楚，方向指针往下挪一格 */
    function fail(d) {
      var t = top(), nr = t.r + DD[d][0], nc = t.c + DD[d][1];
      var why, tgt = '(' + nr + ',' + nc + ')';
      t.d = d; di = d; tries++;
      if (nr < 0 || nr >= R || nc < 0 || nc >= R) why = '出了迷宫的边界';
      else if (W1[nr][nc]) why = '是墙';
      else if (mk[key(nr, nc)] === 'dead') why = '已判定是死胡同';
      else why = '已经走过';
      steps.push(step(snap({
        di: d,
        probe: '试' + DN[d] + '：' + tgt + why + '，不通',
        probeSt: 'no',
        cap1: at(t) + ' 试' + DN[d] + '：' + tgt + why + ' —— 不通，换下一个方向',
        cap2: why === '已经走过'
          ? '这一条最要紧：没有标记，它就会掉头走回来，两格之间来回打转'
          : '不通也要把「已试到' + DN[d] + '」记回栈顶，免得回来重复试',
        stats: base(),
        notes: ['试' + DN[d] + '：' + tgt + why,
          'p.d = ' + d + '，记下试到哪儿了',
          why === '已经走过' ? '标记就是防它掉头回去' : 'di 加一，接着试下一个',
          '栈没动，人还站在 ' + at(t)] }), 7,
        at(t) + ' 往' + DN[d] + '看：' + tgt + why + '，走不通。' +
        (why === '已经走过'
          ? '注意这一步 —— 那格正是刚才走过来的地方，靠标记才挡住了掉头，' +
            '不然它会在两格之间来回打转，永远出不去。'
          : '把 p.d 记成 ' + d + '，di 加一，接着试下一个方向。'),
        ['试' + DN[d] + ' → ' + tgt + '：' + why, 'p.d = ' + d, '栈不动']));
    }

    /* 四个方向全试完 —— 标死胡同、弹栈，退回上一格 */
    function popCell(nv) {
      var t = top(), from = at(t);
      mk[key(t.r, t.c)] = 'dead';
      stack.pop();
      pops++;
      cur = stack.length ? [top().r, top().c] : null;
      di = stack.length ? top().d : -1;
      var nd = di >= 0 && di < 3 ? DN[di + 1] : '（已无方向可试，还得再退）';
      steps.push(step(snap({
        di: di,
        probe: from + ' 四面全堵，弹栈',
        probeSt: 'no',
        hdr: '死胡同回溯　' + from + ' 出栈',
        cap1: from + ' 标成死胡同并出栈 —— 人退回 ' +
              (cur ? '(' + cur[0] + ',' + cur[1] + ')' : '入口之外'),
        cap2: cur ? '退回来的那格 d = ' + di + '（' + DN[di] +
                    '），所以接着从' + nd + '试，不会重头再来'
                  : '栈空了就说明连入口都退掉了 —— 这迷宫没有通路',
        stats: base(),
        notes: [from + ' 打叉：从这儿走不通',
          'pop() —— 栈深 ' + (stack.length + 1) + ' → ' + stack.length,
          '弹栈这一下就是回溯本身',
          cur ? '回到 (' + cur[0] + ',' + cur[1] + ')，接着试' + nd
              : '无解'] }), 11,
        nv || (from + ' 四个方向全试完了，标成死胡同再 pop 出栈。栈缩了一层，' +
        '人就退回上一格 —— 回溯不是什么玄妙的说法，就是这一下弹栈。'),
        [from + ' 标 dead', 'pop()，栈深 → ' + stack.length,
         '退回 ' + (cur ? '(' + cur[0] + ',' + cur[1] + ')' : '栈空')]));
    }

    /* 走到出口：栈自底向上读出来就是一条通路 */
    function found(d) {
      var t = top(), nr = t.r + DD[d][0], nc = t.c + DD[d][1], i, p = [];
      t.d = d; tries++;
      pushCell(nr, nc);
      for (i = 0; i < stack.length; i++) {
        p.push('(' + stack[i].r + ',' + stack[i].c + ')');
      }
      steps.push(step(snap({
        di: d,
        probe: '试' + DN[d] + '：(' + nr + ',' + nc + ') 正是出口',
        probeSt: 'ok',
        hdr: '找到出口　栈自底向上就是通路，长 ' + stack.length,
        cap1: '压进出口后 cur == end，返回 TRUE —— 不必再试任何方向',
        cap2: '栈底到栈顶：' + p.slice(0, 6).join('→') + '…',
        stats: { '路径长': stack.length, '试探': tries, '回溯': pops,
                 '结果': '有通路' },
        notes: ['栈里剩下的全是 path，没有一个 dead',
          '自底向上读 = 入口到出口',
          '打叉的格子早被弹掉了',
          '所以栈既是回溯的工具，又是答案本身'] }), 4,
        '压进 (' + nr + ',' + nc + ') 之后发现它就是出口，返回 TRUE。这时栈里剩的' +
        '全是走通的格子 —— 自底向上读一遍正是入口到出口的路径。栈既是回溯的工具，也是答案。',
        ['push 出口，返回 TRUE', '栈深 ' + stack.length + ' = 路径长',
         '自底向上读即通路']));
    }

    /* ---- 开场三步：先把「栈里到底存什么」说清楚 ---- */
    steps.push(step(snap({
      hdr: '栈解迷宫　为什么单存位置不够',
      cap1: '深蓝是墙，灰格是通道；从 (0,0) 摸到 (5,5)',
      cap2: '走法很朴素：挑一个方向试，通就走，全不通就退回去换方向',
      stats: { '迷宫': '6×6', '入口': '(0,0)', '出口': '(5,5)',
               '方向序': '东南西北' },
      notes: ['人在迷宫里就是这么走的',
        '难点不在往前走，在「退回去」',
        '退回来得知道上一格已试到哪儿了',
        '所以栈里要存位置 + 方向'] }), -1,
      '迷宫求解的走法很朴素：挑个方向试，通就走过去，四面都不通就退回上一格换方向。' +
      '难的不是往前，是退回来之后怎么知道上一格已经试到哪个方向了。',
      ['墙走不通，通道可走', '不通就退回换方向',
       '退回来要记得试到哪儿了']));

    steps.push(step(snap({
      hdr: '栈里存的是「位置 + 已试到第几个方向」',
      cap1: '只存位置的话，退回来又从东开始试 —— 立刻死循环',
      cap2: '所以每格配一个 di：-1 还没试，0 试过东，1 试过南…3 四个都试完了',
      stats: { '栈元素': '{r, c, di}', 'di 范围': '-1 … 3',
               'di == 3': '该弹栈了', '方向表': DTXT.length + ' 个' },
      notes: ['右边那张表就是方向的固定顺序',
        '每格从 di = -1 开始，逐个往下试',
        'di 到 3 还没通 → 死胡同，弹栈',
        'di 是「进度条」，回溯全靠它'] }), 0,
      '栈元素是 {r, c, di}：位置加上「已试到第几个方向」。只存位置不行 —— 退回来又从东试，' +
      '立刻在原地打转。di 就是每格的进度条：到 3 还不通，这格就是死胡同。',
      ['栈元素 = {r, c, di}', 'di 记已试到第几个方向',
       'di == 3 仍不通 → 弹栈']));

    pushCell(0, 0);
    steps.push(step(snap({
      cap1: 'push((0,0)，di = -1) —— 入口进栈，同时标记为已走',
      cap2: '栈在右边，栈底在下往上长；栈深就是当前这条路径的长度',
      stats: base(),
      notes: ['入口先标记，再压栈',
        '标记与压栈总是成对出现',
        '栈深 1：路径上只有入口',
        '接下来从东开始试'] }), 2,
      '入口 (0,0) 先标记为已走，再压进栈。标记和压栈总是成对做 —— ' +
      '标记管「别再踩」，压栈管「记得回来」。栈画在右边，栈底在下，往上生长。',
      ['标记 (0,0) 为 path', 'push((0,0)，di = -1)',
       '栈深 → 1']));

    /* ---- 一路往东摸进死胡同 ---- */
    go(0, '没到分岔口时，试探就是一次一格地往前挪');
    go(0, '再往东一格 —— 眼下还看不出问题，麻烦在下一步');

    /* (0,2) 四面全堵：东是墙、南是墙、西已走过、北出界 */
    fail(0); fail(1); fail(2); fail(3);
    popCell('(0,2) 东南西北全试遍了，一个都不通 —— 这就是死胡同。打上叉、弹栈，' +
      '人退回 (0,1)。注意打叉的格子不会再被踩：它已经被证明走不通了。');

    /* ---- 退回 (0,1) 换方向，一路往南 ---- */
    go(1, '退回来的 (0,1) 里 d = 0，所以直接从南接着试 —— 东不会再试第二遍');
    fail(0);
    go(1, '碰壁只让 di 往下挪一格，栈一动不动 —— 人还站在原地');
    go(0, '通道往东拐，方向序里东排第一，正好一试就中');
    go(0, '连着两格都通，栈就连着长两层');
    fail(0);
    go(1, '东是墙就试南 —— 方向表从上往下扫，扫到通的为止');
    fail(0);
    go(1, '又一次「东不通改走南」，回溯的机器就这么转着');
    go(0, '拐向东南角，出口已经在两格之外');
    go(0, '倒数第二格，栈深已经 10');
    fail(0);
    found(1);

    steps.push(step(snap({
      hdr: '一次完整求解　试探 ' + tries + ' 次，回溯 ' + pops + ' 次',
      cap1: '栈涨了 11 层、缩过 1 层 —— 涨是前进，缩是回溯',
      cap2: '打叉的 (0,2) 是唯一被证伪的格子；余下 11 格连成通路',
      stats: { '路径长': stack.length, '试探': tries, '回溯': pops,
               '死胡同': 1 },
      notes: ['栈的涨与缩就是回溯的实体',
        '标记让每格最多进栈一次',
        '所以最坏也就 O(行×列)',
        '下一场景：去掉标记会怎样'] }), -1,
      '整个过程就是栈在涨和缩：涨一层是往前走一格，缩一层是退回来换方向。' +
      '标记保证每格最多进栈一次，所以最坏代价是 O(行×列)，不会无限打转。',
      ['涨 = 前进，缩 = 回溯', '每格最多进栈一次',
       '最坏 O(行×列)']));

    return steps;
  }

  /* ---------- 场景二：标记为什么非留不可，以及它就是 DFS 的雏形 ---------- */
  /* 挑 (2,3) 这一格做样本：它是从西边 (2,2) 走过来的，而东、南都是墙，
   * 于是方向表扫到「西」时正好指回来路 —— 没有标记就当场掉头，
   * 两格之间来回打转，栈无休止地长。手工摆状态，不跑算法。 */
  var W2 = [
    [0, 0, 0, 1, 1, 1],
    [0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 0]
  ];

  function buildMark() {
    var steps = [];
    var ent = [0, 0], ext = [5, 5];
    // 来路：(0,0)→(1,0)→(2,0)→(2,1)→(2,2)→(2,3)，最后一格刚进栈
    var road = [[0, 0, 1], [1, 0, 1], [2, 0, 0], [2, 1, 0], [2, 2, 0]];

    function sk(extra) {
      var a = [], i;
      for (i = 0; i < road.length; i++) {
        a.push({ r: road[i][0], c: road[i][1], d: road[i][2] });
      }
      for (i = 0; i < extra.length; i++) {
        a.push({ r: extra[i][0], c: extra[i][1], d: extra[i][2] });
      }
      return a;
    }
    // m: 'try' = 走过但没留标记，'path' = 走过且留了标记
    function marks(kind) {
      var o = {}, i;
      for (i = 0; i < road.length; i++) o[key(road[i][0], road[i][1])] = kind;
      o[key(2, 3)] = kind;
      return o;
    }
    var snap = function (o) {
      return { wall: W2, mk: o.mk, cur: o.cur, stack: o.stack,
               di: o.di === undefined ? -1 : o.di,
               probe: o.probe || null, probeSt: o.probeSt || null,
               ent: ent, ext: ext,
               hdr: o.hdr || '为什么非要留标记',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    steps.push(step(snap({
      hdr: '样本格 (2,3)：它是从西边走过来的',
      mk: marks('path'), cur: [2, 3], stack: sk([[2, 3, -1]]),
      cap1: '来路 (0,0)→(1,0)→(2,0)→(2,1)→(2,2)→(2,3)，栈深 6',
      cap2: '(2,3) 的东、南都是墙，方向表扫到第三个「西」时，正指着来路那一格',
      stats: { '当前': '(2,3)', '栈深': 6, '东/南': '都是墙',
               '西': '(2,2) 来路' },
      notes: ['先看清这一格的四周',
        '东 (2,4) 墙、南 (3,3) 墙',
        '西 (2,2) 恰是刚走过来的那格',
        '北 (1,3) 才是真正的出路'] }), 1,
      '挑 (2,3) 做样本：它是从西边 (2,2) 走过来的，而东、南都是墙。方向表扫到「西」时，' +
      '指的正是来路 —— 出路在北，可西排在北前面。',
      ['来路 (2,2) 在西边', '东、南都是墙',
       '方向表先扫到西，后扫到北']));

    steps.push(step(snap({
      hdr: '不留标记：试到「西」，它就当场掉头',
      mk: marks('try'), cur: [2, 2],
      stack: sk([[2, 3, 2], [2, 2, -1]]), di: 2,
      probe: '试西 → (2,2)　不是墙，判定「通」，走过去',
      probeSt: 'no',
      cap1: '(2,2) 没有标记，在程序眼里它跟没走过的空格一模一样',
      cap2: '于是 (2,2) 又被压进栈 —— 栈深 7，可人其实退回了原地',
      stats: { '当前': '(2,2)', '栈深': 7, '判据': '只看是不是墙',
               '实情': '原地打转' },
      notes: ['判「通」只看了 wall == 0',
        '走过的痕迹没记下来，就等于没走过',
        '(2,2) 二次进栈，di 又归 -1',
        '而 (2,2) 的东边正是 (2,3)…'] }), 6,
      '不留标记时，判断「通不通」只看是不是墙。(2,2) 不是墙，于是 (2,3) 试西成功、掉头走回去，' +
      '(2,2) 第二次进栈、di 又归 -1。人退回了原地，栈却长了一层。',
      ['判通只看 wall == 0', '(2,2) 二次进栈，di 归 -1',
       '栈深 7，人却在原地']));

    steps.push(step(snap({
      hdr: '死循环：两格之间来回压栈，栈只涨不缩',
      mk: marks('try'), cur: [2, 3],
      stack: sk([[2, 3, 2], [2, 2, 0], [2, 3, -1]]), di: 0,
      probe: '试东 → (2,3)　又「通」了，再压一次',
      probeSt: 'no',
      cap1: '(2,2) 从东开始试，第一个就是 (2,3) —— 于是又压回去',
      cap2: '(2,3)→(2,2)→(2,3)→… 两格互相当成新格，栈一路涨到溢出',
      stats: { '栈深': 8, '实际走过': '2 格', '趋势': '只涨不缩',
               '结局': '栈溢出' },
      notes: ['(2,2) 的东边就是 (2,3)',
        '两格各自都觉得对方是新格',
        '栈只涨不缩，永远走不到北边的出路',
        '压到 MAXSIZE 就溢出报错'] }), 6,
      '(2,2) 重新从东试，第一个就是 (2,3)，于是又压回去。两格互相当成新格，' +
      '(2,3)→(2,2)→(2,3)→… 栈只涨不缩，北边那条真出路永远轮不到试，最后栈溢出。',
      ['两格来回互相压栈', '栈只涨不缩',
       '真出路永远试不到']));

    steps.push(step(snap({
      hdr: '留了标记：西边「已走过」，直接跳过去试北',
      mk: (function () { var o = marks('path'); o[key(1, 3)] = 'path'; return o; })(),
      cur: [1, 3], stack: sk([[2, 3, 3], [1, 3, -1]]), di: 3,
      probe: '试西 → (2,2) 已走过，跳过；试北 → (1,3) 通',
      probeSt: 'ok',
      cap1: '判「通」的条件多了一条：不是墙，而且没走过',
      cap2: '西被标记挡住，方向表继续往下扫到北 —— 真正的出路这才轮上',
      stats: { '当前': '(1,3)', '栈深': 7, '判据': '非墙 且 未走过',
               '结果': '正常前进' },
      notes: ['标记把「来路」从候选里剔掉了',
        '每格最多进栈一次，栈深不会虚涨',
        '所以总步数有上限 O(行×列)',
        '标记不是优化，是正确性的前提'] }), 7,
      '加上标记之后，判「通」的条件变成「不是墙，而且没走过」。西边被挡住，方向表接着扫到北，' +
      '真出路这才轮上。标记不是省时间的优化，是算法能终止的前提。',
      ['判通 = 非墙 且 未走过', '来路被剔出候选',
       '每格最多进栈一次']));

    steps.push(step(snap({
      hdr: '两种标记：留在栈里的和已被证伪的',
      mk: (function () {
        var o = marks('path'); o[key(1, 3)] = 'path';
        o[key(0, 1)] = 'dead'; o[key(0, 2)] = 'dead';
        return o;
      })(),
      cur: [1, 3], stack: sk([[2, 3, 3], [1, 3, 0]]), di: 0,
      probe: '(0,1)、(0,2) 已弹栈，标成 dead',
      probeSt: 'no',
      cap1: '圆点 = 还在栈里，是当前路径的一部分',
      cap2: '叉 = 已经弹栈，从那儿走不通 —— 两种都算「走过」，都不再进入',
      stats: { '栈内': 7, '已证伪': 2, '共同点': '都不再踩',
               '区别': '在不在栈里' },
      notes: ['书上用 1 表示通道、-1 表示已判死',
        '圆点格弹栈后就变成叉',
        '叉永远不会再进栈',
        '最终栈里剩的全是圆点'] }), 7,
      '标记其实有两种：圆点是还在栈里的路径格，叉是已经弹栈、被证明走不通的格。' +
      '两种都算「走过」，都不再进入 —— 区别只在于是否还在当前路径上。',
      ['圆点：在栈里，属当前路径', '叉：已弹栈，已被证伪',
       '两种都不再进入']));

    steps.push(step(snap({
      hdr: '这套试探法就是深度优先搜索',
      mk: (function () {
        var o = marks('path'); o[key(1, 3)] = 'path';
        o[key(0, 1)] = 'dead'; o[key(0, 2)] = 'dead';
        return o;
      })(),
      cur: [1, 3], stack: sk([[2, 3, 3], [1, 3, 0]]), di: -1,
      cap1: '认死一个方向走到底，撞墙才退回来换下一个 —— 这就是「深度优先」',
      cap2: '把格子看成顶点、相邻格看成边，第7章的 DFS 与这里一字不差',
      stats: { '本章': '栈 + 方向表', '第7章': 'DFS',
               '标记': 'visited[]', '栈': '递归栈' },
      notes: ['迷宫格 = 图的顶点，相邻 = 边',
        'mk 标记 = DFS 的 visited 数组',
        '手写的栈 = 递归时的系统栈',
        'DFS 递归版就是把这个栈交给编译器'] }), -1,
      '认死一个方向走到底、撞墙才退回换下一个，这就是深度优先。把格子当顶点、相邻当边，' +
      '这套做法与第7章的 DFS 完全一致：mk 就是 visited，手写的栈就是递归栈。',
      ['格子=顶点，相邻=边', 'mk 就是 visited 数组',
       '手写栈 = 递归的系统栈']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['maze-solve'] = {
    title: '栈解迷宫回溯 Maze Solving',
    subtitle: '每到一格就把「位置 + 已试到第几个方向」压栈，然后挑个方向试探；四面都不通就弹栈退回上一格换下一个方向。栈的涨与缩就是回溯的实体，而走过的标记是算法能终止的前提。',
    height: 720,
    code: [
      '栈元素: {r, c, di}   // di：已试到第几个方向，-1 表示还没试',
      '方向表: 东(r,c+1) 南(r+1,c) 西(r,c-1) 北(r-1,c)',
      'push(入口); mark(入口)',
      'while 栈不空:',
      '    p = top();  if p == 出口: return TRUE',
      '    p.di++',
      '    if p.di <= 3:',
      '        (nr, nc) = p + 方向[p.di]',
      '        if 非墙 且 未走过:',
      '            mark(nr, nc)',
      '            push({nr, nc, di = -1})',
      '    else: mark_dead(p); pop()   // 四面全堵，回溯',
      'return FALSE                    // 栈空仍未到出口 = 无通路'
    ],
    scenes: [
      { name: '试探与回溯', build: buildWalk,
        codeTag: '压栈前进，弹栈回溯' },
      { name: '标记与 DFS', build: buildMark,
        codeTag: '判通要加「未走过」',
        code: [
          '// 判「通不通」到底该看什么',
          '错: if 非墙:              // 只看墙',
          '        push(nr, nc)      // 来路也算通 → 掉头 → 死循环',
          '',
          '对: if 非墙 且 未走过:     // 多一个条件，算法才会终止',
          '        mark(nr, nc); push(nr, nc)',
          '',
          '标记两种: mark 圆点 = 在栈里，属当前路径',
          '          dead 叉  = 已弹栈，从这儿走不通',
          '// 每格最多进栈一次 → 最坏 O(行 × 列)',
          '// 这就是第7章 DFS：mk 即 visited，手写栈即递归栈'
        ] }
    ]
  };
})();
