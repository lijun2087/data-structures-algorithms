/* 汉诺塔与递归栈帧 — 第3章
 * 场景一：三个盘子的搬运 —— 7 步走完，看清「最大的那个只动一次」。
 * 场景二：递归栈帧 —— 每层帧记着 n、三根柱子此刻的角色，以及回来后
 *         该接着执行哪一句。递归不是魔法，是系统替你压了一个栈。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* ---------- 场景一：三根柱子 ---------- */
  /* 柱心 150 / 330 / 510，间距 180；最宽的盘 118，半宽 59，不会串柱。
   * 柱底 y=300，盘高 26，三层落在 y ∈ [222,300]；柱杆自 176 到 300。
   * 上方 y ∈ [84,170] 的横带留给标题 100 和说明 124 / 148。
   * 柱名写在 y=320，提示文字在 x=636。搬运中的盘悬在 y=186。 */
  var PEGX = [150, 330, 510], PEGN = ['A', 'B', 'C'];
  var PBASE = 300, DH = 26, RODTOP = 176;
  var DW = [50, 84, 118];
  var NX = 636, HOLDY = 186;

  function dyOf(k) { return PBASE - (k + 1) * DH; }
  function dwOf(id) { return DW[id - 1]; }

  // 盘子按编号固定配色，一路盯着同一个盘也不会看错
  var DCOL = [{ fill: '#123a5c', stroke: '#4aa3e0' },
              { fill: '#12492f', stroke: '#1fa268' },
              { fill: '#3a2a55', stroke: '#9b7bd4' }];

  function disk(ctx, id, cx, y, hot) {
    var w = dwOf(id), c = hot ? D.C.hot : DCOL[id - 1];
    ctx.stage.appendChild(D.el('rect', { x: cx - w / 2, y: y, width: w,
      height: DH - 4, rx: 8, fill: c.fill, stroke: c.stroke,
      'stroke-width': 2, filter: 'url(#vzGlow)' }));
    ctx.stage.appendChild(D.text(id,
      { x: cx, y: y + 17, 'class': 'vz-cellval' }));
  }

  /* f = { pegs:[[自底向上的盘号…]×3], hold:{id,pi} , moveTxt, hi,
   *       hdr, cap1, cap2, notes, stats } */
  function renderPeg(ctx, f) {
    D.clear(ctx.stage);
    var i, k, cx;

    ctx.stage.appendChild(D.text(f.hdr || '三个盘子：从 A 借 B 移到 C',
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));

    for (i = 0; i < 3; i++) {
      cx = PEGX[i];
      // 柱杆先画，盘子后画，盘子才压在杆上面
      ctx.stage.appendChild(D.el('rect', { x: cx - 3, y: RODTOP, width: 6,
        height: PBASE - RODTOP, rx: 3, fill: '#2b3a5c' }));
      ctx.stage.appendChild(D.el('rect', { x: cx - 72, y: PBASE, width: 144,
        height: 7, rx: 3, fill: '#3f5580' }));
      ctx.stage.appendChild(D.text(PEGN[i] + (f.role && f.role[i] ?
          '　' + f.role[i] : ''),
        { x: cx - 6, y: 322, 'class': 'vz-tag' }));
      for (k = 0; k < f.pegs[i].length; k++) {
        disk(ctx, f.pegs[i][k], cx, dyOf(k), f.hi === f.pegs[i][k]);
      }
    }

    // 悬在半空的盘：正被搬走，还没落到柱子上
    if (f.hold) disk(ctx, f.hold.id, PEGX[f.hold.pi], HOLDY, true);

    if (f.moveTxt) {
      ctx.stage.appendChild(D.text(f.moveTxt,
        { x: NX, y: 100, 'class': 'vz-hdr', fill: '#ffd166' }));
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

  /* ---------- 场景二：递归栈帧 ---------- */
  /* 帧自底向上摞：底帧顶边 y=266，帧高 34、间隙 4，n=3 最深三层，
   * 顶帧落在 y ∈ [190,224]，栈顶标注在 178 —— 与 148 的说明行错开。
   * 帧宽 330（x 68…398），左侧 x=26 留给「顶 →」；右侧 420 起列已产生的移动。 */
  var FX = 68, FW = 330, FH = 34, FG = 4, FY0 = 266;
  var MVX = 420;

  function fyOf(i) { return FY0 - i * (FH + FG); }

  /* f = { frames:[{n,src,aux,dst,ret,st}…自底向上], moves:[…],
   *       hdr, cap1, cap2, notes, stats } */
  function renderFrame(ctx, f) {
    D.clear(ctx.stage);
    var i, y, c, fr, n = f.frames.length;

    ctx.stage.appendChild(D.text(f.hdr || '递归栈帧：Hanoi(3, A, B, C)',
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 124, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 148, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    // 三层都空着时也把底格的位置画出来，省得整块区域忽然消失
    for (i = 0; i < Math.max(1, n); i++) {
      y = fyOf(i);
      fr = f.frames[i];
      c = D.C[fr ? (fr.st || 'good') : 'mute'];
      ctx.stage.appendChild(D.el('rect', { x: FX, y: y, width: FW,
        height: FH, rx: 7, fill: c.fill, stroke: c.stroke,
        'stroke-width': 2, filter: 'url(#vzGlow)' }));
      if (!fr) continue;
      ctx.stage.appendChild(D.text('n=' + fr.n,
        { x: FX + 14, y: y + 22, 'class': 'vz-lab', fill: '#ffd166' }));
      ctx.stage.appendChild(D.text(fr.src + ' → ' + fr.dst + '　借 ' + fr.aux,
        { x: FX + 62, y: y + 22, 'class': 'vz-info' }));
      ctx.stage.appendChild(D.text('回来接 ' + fr.ret,
        { x: FX + 214, y: y + 22, 'class': 'vz-lab', fill: '#8ea3c9' }));
    }

    if (!n) {
      ctx.stage.appendChild(D.text('栈空',
        { x: FX + 14, y: fyOf(0) + 22, 'class': 'vz-lab', fill: '#5f7099' }));
    } else {
      ctx.stage.appendChild(D.text('顶 →',
        { x: 26, y: fyOf(n - 1) + 22, 'class': 'vz-lab', fill: '#6ceaa5' }));
      if (n > 1) {
        ctx.stage.appendChild(D.text('底 →',
          { x: 26, y: fyOf(0) + 22, 'class': 'vz-lab', fill: '#5f7099' }));
      }
    }

    ctx.stage.appendChild(D.text('已产生的移动',
      { x: MVX, y: 178, 'class': 'vz-lab', fill: '#8fa6d8' }));
    if (!f.moves.length) {
      ctx.stage.appendChild(D.text('（还没有）',
        { x: MVX, y: 200, 'class': 'vz-info', fill: '#5f7099' }));
    }
    for (i = 0; i < f.moves.length && i < 7; i++) {
      ctx.stage.appendChild(D.text(f.moves[i],
        { x: MVX, y: 200 + i * 22, 'class': 'vz-info' }));
    }

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: NX, y: 190 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'frame') renderFrame(c, f); else renderPeg(c, f);
             } };
  }

  var ROLE = ['源', '借', '目标'];

  /* ---------- 场景一：三个盘子搬到 C ---------- */
  /* 7 步正是 2^3-1，不多不少。每步拆成「拿起」「放下」两帧，
   * 好看清盘子从哪根离开、落到哪根上；盘 3 全程只被拿起一次。 */
  function buildMove() {
    var steps = [];
    var pegs = [[3, 2, 1], [], []];
    // [盘号, 从, 到]：这七步就是 Hanoi(3,A,B,C) 展开后的全部输出
    var MOVES = [[1, 0, 2], [2, 0, 1], [1, 2, 1], [3, 0, 2],
                 [1, 1, 0], [2, 1, 2], [1, 0, 2]];
    var cnt = 0, big = 0;

    var snap = function (o) {
      return { pegs: [pegs[0].slice(), pegs[1].slice(), pegs[2].slice()],
               hold: o.hold || null, hi: o.hi || null,
               moveTxt: o.moveTxt || null, role: ROLE,
               hdr: o.hdr || '三个盘子：从 A 借 B 移到 C',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '已走步数': cnt + ' / 7', '盘 3 动过': big + ' 次',
               'A B C': pegs[0].length + ' ' + pegs[1].length + ' ' +
                        pegs[2].length };
    };

    steps.push(step(snap({
      cap1: '规矩两条：一次只搬一个，大盘不能压在小盘上',
      cap2: '目标是把 A 上这三个整体挪到 C，B 只能当中转站',
      stats: { '盘子数 n': 3, '最少步数': '2³ − 1 = 7',
               '递归深度': 3 },
      notes: ['盘子越往上越小，编号 1 最小',
        '只能搬柱顶那一个',
        '落下时下面必须是更大的盘，或空柱',
        '先看 7 步怎么走，再看递归怎么想'] }), -1,
      '汉诺塔的规矩只有两条：一次只能搬一个盘，而且任何时候大盘都不许压在小盘上。' +
      '要把 A 上的三个盘整体搬到 C，B 只能当中转。三个盘的最少步数是 2³−1＝7 步。',
      ['一次只搬一个', '大盘不能压小盘',
       '3 个盘最少 7 步']));

    steps.push(step(snap({
      cap1: '递归的想法：把「搬 3 个」拆成「搬 2 个」+「搬 1 个」',
      cap2: '要让盘 3 从 A 到 C，先得把压在它上面的 1、2 挪去 B',
      stats: { '盘子数 n': 3, '最少步数': 7, '拆法': '2 + 1 + 2' },
      notes: ['① 把上面 2 个从 A 挪到 B（借 C）',
        '② 把盘 3 从 A 挪到 C —— 只动这一次',
        '③ 把那 2 个从 B 挪到 C（借 A）',
        '① 和 ③ 是同一个问题的小一号版本'] }), 4,
      '不用去想 7 步该怎么排，只问一句：盘 3 怎么才能从 A 到 C？' +
      '得先把压在它上面的 1、2 整体挪到 B，让 A 只剩盘 3、C 空着。' +
      '「挪两个」又是同一个问题的小一号版本 —— 这就是递归的入口。',
      ['① 上面 2 个 A → B', '② 盘 3 A → C',
       '③ 那 2 个 B → C']));

    for (var m = 0; m < MOVES.length; m++) {
      var id = MOVES[m][0], fr = MOVES[m][1], to = MOVES[m][2];
      var stage = m === 3 ? '②' : (m < 3 ? '①' : '③');
      var line = m === 3 ? 5 : (m < 3 ? 4 : 6);

      pegs[fr].pop();
      steps.push(step(snap({ hold: { id: id, pi: fr }, hi: id,
        moveTxt: '第 ' + (m + 1) + ' 步　' + PEGN[fr] + ' → ' + PEGN[to],
        cap1: '拿起盘 ' + id + '：它是 ' + PEGN[fr] + ' 的柱顶，能搬的只有它',
        cap2: '这一步属于第 ' + stage + ' 段' +
              (id === 3 ? ' —— 全程唯一一次搬动盘 3' : ''),
        stats: base(),
        notes: ['盘 ' + id + ' 离开 ' + PEGN[fr],
          '柱顶之下的盘现在露出来了',
          '目的地 ' + PEGN[to] +
            (pegs[to].length ? ' 顶上是盘 ' + pegs[to][pegs[to].length - 1]
                             : ' 是空柱'),
          '落下前先确认不会大压小'] }), line,
        '第 ' + (m + 1) + ' 步：拿起 ' + PEGN[fr] + ' 顶上的盘 ' + id + '。' +
        (id === 3 ? '这是盘 3 唯一一次被搬动 —— 前三步全在给它腾地方。'
                  : '能搬的永远只有柱顶那一个，所以每一步的候选其实很少。'),
        ['拿起盘 ' + id, '来自 ' + PEGN[fr] + '，去 ' + PEGN[to],
         '第 ' + stage + ' 段']));

      pegs[to].push(id);
      cnt++;
      if (id === 3) big++;
      steps.push(step(snap({ hi: id,
        moveTxt: '第 ' + (m + 1) + ' 步　' + PEGN[fr] + ' → ' + PEGN[to] +
                 '　完成',
        cap1: '盘 ' + id + ' 落在 ' + PEGN[to] +
              (pegs[to].length > 1 ? ' 的盘 ' + pegs[to][pegs[to].length - 2] +
                                     ' 上面' : '（空柱）'),
        cap2: '已走 ' + cnt + ' 步，还剩 ' + (7 - cnt) + ' 步',
        stats: base(),
        notes: ['盘 ' + id + ' 落到 ' + PEGN[to],
          '下面是' + (pegs[to].length > 1 ?
            '更大的盘 ' + pegs[to][pegs[to].length - 2] : '柱底'),
          '规矩没破：大盘始终在下',
          '已走 ' + cnt + ' 步 / 共 7 步'] }), line,
        '盘 ' + id + ' 落到 ' + PEGN[to] + '。' +
        (pegs[to].length > 1 ? '它下面压的是更大的盘 ' +
           pegs[to][pegs[to].length - 2] + '，规矩没破。'
         : PEGN[to] + ' 原本是空柱，随便放。') +
        '已走 ' + cnt + ' 步。',
        ['盘 ' + id + ' → ' + PEGN[to], '大盘仍在下',
         cnt + ' / 7 步']));
    }

    steps.push(step(snap({
      moveTxt: '7 步走完',
      cap1: '三个盘按大小整齐落在 C 上，A、B 都空了',
      cap2: '盘 3 只动过 1 次，盘 2 动 2 次，盘 1 动 4 次',
      stats: { '已走步数': '7 / 7', '盘 3 动过': '1 次', '结论': '完成' },
      notes: ['7 步 = 2³ − 1，一步都不多',
        '盘 1 动 4 次，盘 2 动 2 次，盘 3 动 1 次',
        '越大的盘动得越少：4 + 2 + 1 = 7',
        '再多一个盘，步数就翻一倍还多一步'] }), 11,
      '7 步走完，三个盘按大小整齐地落在 C 上。数一数每个盘动了几次：' +
      '盘 1 四次、盘 2 两次、盘 3 一次，加起来正好 4+2+1＝7。' +
      '越大的盘动得越少，因为它只在自己那一层的「②」里被搬一次。',
      ['7 = 2³ − 1', '4 + 2 + 1 次',
       '越大的盘动得越少']));

    return steps;
  }

  /* ---------- 场景二：递归栈帧的压入与弹出 ---------- */
  /* 同一段代码被调 7 次，每次的 n 和三根柱子的角色都不同 —— 靠的就是
   * 每层一份独立的栈帧。这里把帧画出来，递归就没有神秘可言了。 */
  function buildFrames() {
    var steps = [];
    var frames = [], moves = [], calls = 0, maxd = 0;

    var snap = function (o) {
      var fs = [], i, fr;
      for (i = 0; i < frames.length; i++) {
        fr = frames[i];
        fs.push({ n: fr.n, src: fr.src, aux: fr.aux, dst: fr.dst,
                  ret: fr.ret, st: o.act === i ? 'active' :
                       (o.dead === i ? 'hot' : 'good') });
      }
      return { frames: fs, moves: moves.slice(),
               hdr: o.hdr || '递归栈帧　Hanoi(3, A, B, C)',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { '栈帧深度': frames.length + ' / 3', '调用次数': calls + ' / 7',
               '已产生移动': moves.length + ' / 7' };
    };
    var mv = function (id, s, d) {
      moves.push('第 ' + (moves.length + 1) + ' 步　盘 ' + id + '：' +
                 s + ' → ' + d);
    };

    steps.push(step(snap({
      cap1: '同一段代码被调用 7 次，每次的 n 和三柱角色都不一样',
      cap2: '靠的是每层一份独立的栈帧 —— 递归不是魔法，是系统替你压栈',
      stats: { '盘子数 n': 3, '总调用次数': 7, '栈帧最深': 3 },
      notes: ['帧里记三样东西',
        '① n：这一层要搬几个盘',
        '② src / aux / dst：三柱此刻的角色',
        '③ 回来接哪一句：② 还是 ③'] }), 8,
      '递归看着玄，其实就是系统替你维护了一个栈。同一段代码被调用 7 次，' +
      '每次的 n 不同、三根柱子的角色也不同 —— 区分它们的就是每层一份独立的栈帧。' +
      '帧里记着 n、三柱角色，以及回来后该接着执行哪一句。',
      ['递归 = 系统替你压栈', '每层一份独立栈帧',
       '记 n、三柱角色、回来接哪句'], 'frame'));

    // 直接照着 Hanoi 的定义递归，边走边记帧的压入弹出
    function rec(n, s, a, d, tag) {
      var self;
      calls++;
      frames.push({ n: n, src: s, aux: a, dst: d, ret: n === 1 ? '返回' : '②' });
      if (frames.length > maxd) maxd = frames.length;
      self = frames.length - 1;

      steps.push(step(snap({ act: self,
        cap1: '压入新帧：Hanoi(' + n + ', ' + s + ', ' + a + ', ' + d + ')' +
              '　' + tag,
        cap2: '注意三柱角色：这一层的目标是 ' + d + '，借的是 ' + a,
        stats: base(),
        notes: ['第 ' + calls + ' 次调用，栈深 ' + frames.length,
          'n = ' + n + '，' + s + ' → ' + d + '，借 ' + a,
          '上一层的帧原封不动留在下面',
          '所以回来时角色不会串'] }), n === 1 ? 1 : 1,
        '压入一帧：Hanoi(' + n + ', ' + s + ', ' + a + ', ' + d + ')。' +
        '要紧的是三根柱子的角色换了 —— 这一层要把 ' + n + ' 个盘从 ' + s +
        ' 搬到 ' + d + '，借 ' + a + '。上一层的帧原封不动压在下面，' +
        '所以回来时角色不会串。',
        ['Push 帧 n=' + n, s + ' → ' + d + '，借 ' + a,
         '栈深 ' + frames.length], 'frame'));

      if (n === 1) {
        mv(1, s, d);
        steps.push(step(snap({ act: self,
          cap1: 'n == 1，撞到递归出口：直接 move(' + s + ' → ' + d + ')',
          cap2: '出口不再往下调，这一层做完就该弹帧了',
          stats: base(),
          notes: ['n == 1 是递归出口',
            '一步搬完，不必再拆',
            '没有出口的递归会一直压栈到崩',
            '第 ' + moves.length + ' 步移动产生'] }), 3,
          'n 减到 1，撞上递归出口 —— 一个盘直接从 ' + s + ' 搬到 ' + d + ' 就完事，' +
          '不必再往下拆。出口是递归的地基：没有它，栈会一直压到崩。',
          ['n == 1，命中出口', 'move(' + s + ' → ' + d + ')',
           '共 ' + moves.length + ' 步'], 'frame'));
      } else {
        rec(n - 1, s, d, a, '① 上面 ' + (n - 1) + ' 个挪去借柱');

        frames[self].ret = '③';
        mv(n, s, d);
        steps.push(step(snap({ act: self,
          cap1: '① 回来了，接着执行 ②：move(盘 ' + n + '：' + s + ' → ' + d + ')',
          cap2: '压在盘 ' + n + ' 上面的都挪走了，它这一层只动这一次',
          stats: base(),
          notes: ['① 的那串调用全部返回了',
            '本帧从「回来接 ②」继续往下走',
            '搬盘 ' + n + '：' + s + ' → ' + d,
            '帧里那句「回来接哪一句」就派上用场了'] }), 5,
          '① 那一串调用全部返回，控制权回到本帧。帧里记着「回来接 ②」，' +
          '于是接着搬盘 ' + n + '：' + s + ' → ' + d + '。' +
          '压在它上面的盘都已挪到 ' + a + '，所以这一步合法，而它这一层只动这一次。',
          ['① 已返回，接 ②', '搬盘 ' + n + '：' + s + ' → ' + d,
           '本层只动它一次'], 'frame'));

        rec(n - 1, a, s, d, '③ 借柱上的挪到目标');
      }

      steps.push(step(snap({ dead: self,
        cap1: '这一层三段都做完了，return —— 帧弹出',
        cap2: frames.length > 1 ? '回到下面那层，接着它记的那一句往下走'
                               : '弹掉最外层，整个递归结束',
        stats: base(),
        notes: ['本层任务完成，Pop 掉这一帧',
          'n = ' + n + ' 这层的局部信息随帧一起消失',
          frames.length > 1 ? '下层帧重新成为栈顶' : '栈将变空，递归收尾',
          '压入弹出严格配对，一共 7 对'] }), n === 1 ? 3 : 7,
        'n = ' + n + ' 这一层做完了，return，帧弹出。帧里的 n 和三柱角色随之消失 —— ' +
        (frames.length > 1 ? '下面那层重新成为栈顶，接着它自己记的那一句往下走。'
                           : '这是最外层，弹掉之后栈就空了，整个递归结束。'),
        ['Pop 帧 n=' + n, '局部信息随帧消失',
         frames.length > 1 ? '回到下层' : '栈将空'], 'frame'));
      frames.pop();
    }

    rec(3, 'A', 'B', 'C', '最外层调用');

    steps.push(step(snap({
      hdr: '递归结束：7 次调用，7 步移动',
      cap1: '调用 7 次、移动 7 步，但栈最深只有 3 层',
      cap2: '深度是 n，不是 2ⁿ−1 —— 所以空间只要 O(n)',
      stats: { '总调用': '7 次', '总移动': '7 步', '栈最深': maxd + ' 层',
               '空间': 'O(n)' },
      notes: ['T(n) = 2T(n−1) + 1 = 2ⁿ − 1',
        '时间是指数级的，躲不掉',
        '但同时活着的帧最多只有 n 层',
        '空间 O(n)：栈深等于递归深度'] }), 10,
      '数一下：调用了 7 次、移动了 7 步，可栈最深的时候只有 3 层。' +
      '步数 T(n)=2T(n−1)+1=2ⁿ−1 是指数级的，躲不掉；但同时活着的帧最多 n 个，' +
      '所以空间只要 O(n)。别把「调用总次数」和「栈的深度」混为一谈。',
      ['时间 2ⁿ − 1', '栈最深只有 n 层',
       '空间 O(n)'], 'frame'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['hanoi'] = {
    title: '汉诺塔与递归栈帧',
    subtitle: '不要去数那 2ⁿ−1 步，只问一句：最大的盘怎么才能过去？把压在它上面的整体挪到借柱，问题就小了一号。递归靠的是每层一份栈帧，记着 n 和三柱此刻的角色。',
    height: 730,
    code: [
      '// 汉诺塔：把 n 个盘从 src 借 aux 移到 dst',
      'Hanoi(n, src, aux, dst):        // 调用即压一帧',
      '    if n == 1:                  // 递归出口',
      '        move(src → dst); return // 一步搬完就弹帧',
      '    Hanoi(n-1, src, dst, aux)   // ① 上面的去借柱',
      '    move(n: src → dst)          // ② 只动这一次',
      '    Hanoi(n-1, aux, src, dst)   // ③ 借柱到目标',
      '    return                      // 三段做完，弹帧',
      '// 帧里记 n、三柱当下的角色、回来该接哪一句',
      '// 三柱角色每层都在换，这是最容易看错的地方',
      '// 递归深度 = n → 空间 O(n)',
      '// 步数 T(n) = 2T(n-1) + 1 = 2^n - 1'
    ],
    scenes: [
      { name: '三个盘子的搬运', build: buildMove },
      { name: '递归栈帧', build: buildFrames }
    ]
  };
})();
