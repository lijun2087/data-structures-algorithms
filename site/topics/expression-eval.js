/* 中缀转后缀与表达式求值 — 第3章
 * 场景一：中缀转后缀 —— 操作数照原样输出，运算符进栈排队。
 *         栈顶优先级不低于当前运算符就先弹出，括号另有一套规矩。
 * 场景二：后缀求值 —— 数字入栈，遇运算符弹两个算完再压回，扫完栈里只剩答案。
 * 两场景一头一尾：前者把优先级化进了顺序，后者就不用再管优先级了。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：左边竖着一列是栈，右边上下两行横排 —— 上行是被扫的式子，下行是结果。
   * 栈画得窄（x 44…112），格高 32 间隙 4，自底 y=300 往上排，
   * 4 格顶到 192，标签再往上 12 → 180，整列都在 y ∈ [84,336] 内。
   * 式子格 30 宽、间隙 4，自 x=240 起排，11 个字符止于 x=610，
   * 仍在提示列 648 左边。两场景的运算符栈 / 操作数栈最深都只到 3 格。
   * 游标 ↑ 在式子下方 164，当前字符写在 186，后缀行 200…234。
   * 栈的标签挂在 x=120，行标签 x=196，说明文字 302 / 326 从 x=250 起。 */
  var CAPC = 4, CAPE = 4;
  var SX = 44, SW = 68, SH = 32, SG = 4, SY0 = 300, STAGX = 120;
  var EX0 = 240, EW = 30, EG = 4, EY = 112, EH = 34;
  var PY = 200, LABX = 196;
  var CAPX = 250, NX = 648;

  function syOf(i) { return SY0 - i * (SH + SG); }
  function exOf(i) { return EX0 + i * (EW + EG); }

  // est / sst 是下标键的字典，每帧都得留一份副本，不然回退会串味
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  // 一行横排的格子：式子、后缀结果都用它画
  function strip(ctx, arr, st, y, dim) {
    for (var i = 0; i < arr.length; i++) {
      var x = exOf(i), c = D.C[st[i] || dim];
      ctx.stage.appendChild(D.el('rect', { x: x, y: y, width: EW, height: EH,
        rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      ctx.stage.appendChild(D.text(arr[i],
        { x: x + EW / 2, y: y + 24, 'class': 'vz-cellval' }));
    }
  }

  // 竖着的栈：下标 0 在最下面，栈外的格子一律 mute
  function column(ctx, stk, sst, cap, name) {
    var i, y, c, n = stk.length;
    ctx.stage.appendChild(D.text(name,
      { x: SX, y: syOf(cap - 1) - 12, 'class': 'vz-lab', fill: '#8fa6d8' }));
    for (i = 0; i < cap; i++) {
      y = syOf(i);
      c = D.C[sst[i] || (i < n ? 'good' : 'mute')];
      ctx.stage.appendChild(D.el('rect', { x: SX, y: y, width: SW, height: SH,
        rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      if (i < n) {
        ctx.stage.appendChild(D.text(stk[i],
          { x: SX + SW / 2, y: y + 22, 'class': 'vz-cellval' }));
      }
    }
    // 只剩一个元素时栈顶就是栈底，两个标签同高会撞，所以只画栈顶
    if (!n) {
      ctx.stage.appendChild(D.text('栈空',
        { x: STAGX, y: syOf(0) + 22, 'class': 'vz-lab', fill: '#8ea3c9' }));
    } else {
      ctx.stage.appendChild(D.text('← 栈顶',
        { x: STAGX, y: syOf(n - 1) + 22, 'class': 'vz-lab', fill: '#6ceaa5' }));
      if (n > 1) {
        ctx.stage.appendChild(D.text('栈底',
          { x: STAGX, y: syOf(0) + 22, 'class': 'vz-lab', fill: '#5f7099' }));
      }
    }
  }

  // 三段共用的收尾：游标、当前字符、两行说明、右侧提示
  function tailParts(ctx, f, n) {
    var i;
    if (f.cur != null && f.expr[f.cur] != null) {
      ctx.stage.appendChild(D.text('↑',
        { x: exOf(f.cur) + EW / 2 - 5, y: EY + EH + 18, 'class': 'vz-ptr',
          fill: '#ffd166' }));
    }
    if (f.curTxt) {
      ctx.stage.appendChild(D.text(f.curTxt,
        { x: EX0, y: EY + EH + 40, 'class': 'vz-lab', fill: '#8ea3c9' }));
    }
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: CAPX, y: 302, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: CAPX, y: 326, 'class': 'vz-info', fill: '#8ea3c9' }));
    }
    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: NX, y: 190 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  /* ---------- 场景一的画法：上行中缀，下行后缀，左边运算符栈 ---------- */
  /* f = { expr:[中缀字符…], est:{下标:状态}, cur, curTxt,
   *       post:[已输出的后缀…], pst:{下标:状态},
   *       stk:[运算符，自底向上], sst:{下标:状态},
   *       hdr, cap1, cap2, notes, stats } */
  function renderConv(ctx, f) {
    D.clear(ctx.stage);

    if (f.hdr) {
      ctx.stage.appendChild(D.text(f.hdr,
        { x: EX0, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    }

    // 中缀在上，后缀在下：两行对不齐是故意的，后缀的长度和中缀不一样
    ctx.stage.appendChild(D.text('中缀',
      { x: LABX, y: EY + 24, 'class': 'vz-lab' }));
    strip(ctx, f.expr, f.est, EY, 'mute');

    ctx.stage.appendChild(D.text('后缀',
      { x: LABX, y: PY + 24, 'class': 'vz-lab', fill: '#6ceaa5' }));
    if (!f.post.length) {
      ctx.stage.appendChild(D.text('（还没输出任何字符）',
        { x: EX0, y: PY + 24, 'class': 'vz-lab', fill: '#5f7099' }));
    } else {
      strip(ctx, f.post, f.pst, PY, 'done');
    }

    column(ctx, f.stk, f.sst, CAPC, '运算符栈');
    tailParts(ctx, f);
  }

  /* ---------- 场景二的画法：上行后缀，左边操作数栈 ---------- */
  /* f = { expr:[后缀字符…], est:{下标:状态}, cur, curTxt,
   *       stk:[操作数，自底向上], sst:{下标:状态},
   *       calc, hdr, cap1, cap2, notes, stats } */
  function renderEval(ctx, f) {
    D.clear(ctx.stage);

    if (f.hdr) {
      ctx.stage.appendChild(D.text(f.hdr,
        { x: EX0, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    }

    ctx.stage.appendChild(D.text('后缀',
      { x: LABX, y: EY + 24, 'class': 'vz-lab' }));
    strip(ctx, f.expr, f.est, EY, 'mute');

    // 正在算的那一笔写在后缀行下方，和游标同一片区域
    if (f.calc) {
      ctx.stage.appendChild(D.text(f.calc,
        { x: EX0, y: PY + 24, 'class': 'vz-hdr', fill: '#ffd166' }));
    }

    column(ctx, f.stk, f.sst, CAPE, '操作数栈');
    tailParts(ctx, f);
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'eval') renderEval(c, f); else renderConv(c, f);
             } };
  }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* ---------- 场景一：中缀转后缀 ---------- */
  /* 式子 A+B*C-(D+E) 一趟撞全三种情形：
   *   * 进栈时 + 不让位 —— 高优先级压着低的，等着先算
   *   - 一来把 * 和 + 连着赶出来 —— 低优先级要给已排队的让路
   *   括号里的 + 只认 )，不认优先级 —— ( 在栈里就是一道屏障
   * 输出的后缀是 A B C * + D E + -，栈最深 3 格。 */
  function buildConv() {
    var steps = [];
    var EXPR = ['A', '+', 'B', '*', 'C', '-', '(', 'D', '+', 'E', ')'];
    var HDR = '中缀  A + B * C - ( D + E )';
    var est = {}, pst = {}, post = [], stk = [];

    function prec(c) { return c === '(' ? 0 : (c === '+' || c === '-' ? 1 : 2); }
    function isNum(c) { return 'ABCDE'.indexOf(c) >= 0; }
    // 只让最新输出的那一格高亮，所以每次输出都把 pst 换成新的
    function out(ch) { post.push(ch); pst = {}; pst[post.length - 1] = 'active'; }

    var snap = function (o) {
      return { expr: EXPR.slice(), est: cp(est), post: post.slice(),
               pst: cp(pst), stk: stk.slice(), sst: o.sst || {},
               cur: o.cur != null ? o.cur : null, curTxt: o.curTxt || null,
               hdr: HDR, cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function (k) {
      return { '已扫描': k + ' / ' + EXPR.length,
               '已输出': post.length + ' 个',
               '栈内运算符': stk.length,
               '栈顶': stk.length ? stk[stk.length - 1] : '（空）' };
    };

    steps.push(step(snap({
      cap1: '中缀要靠优先级和括号才知道先算谁，后缀不用',
      cap2: '这一趟做的事：把「先算谁」搬进输出的先后顺序里',
      stats: { '中缀长度': EXPR.length, '栈里放': '运算符和 (',
               '输出': '后缀式', '时间': 'O(n)' },
      notes: ['操作数：来了就输出，顺序一点不动',
        '运算符：进栈排队，等更急的先出去',
        '( 是屏障，) 来了才清到 ( 为止',
        '扫完把栈里剩的全倒出来'] }), -1,
      '中缀式得看优先级和括号才知道先算谁，机器算起来绕。转成后缀之后，运算符出现的先后' +
      '就是计算的先后，再不用回头比较。所以这一趟真正做的事，是把优先级化进顺序里。',
      ['操作数照原样输出', '运算符按优先级排队',
       '( 在栈里当屏障']));

    steps.push(step(snap({ cur: 0,
      cap1: 'InitStack(S)：这个栈只放运算符，操作数从不入栈',
      cap2: '因为操作数在后缀里的相对顺序，和中缀里一模一样',
      stats: base(0),
      notes: ['空栈起步，游标指第 1 个字符',
        '栈里只会出现运算符和 (',
        '操作数不用等，直接输出',
        '所以两行的长度不一样，不必对齐'] }), 1,
      '空栈起步。留意这个栈只放运算符和左括号 —— 操作数一个也不入栈，因为它们在后缀里的' +
      '前后次序和中缀完全相同，不需要重排。要重排的只有运算符。',
      ['InitStack(S)', '栈里只放运算符和 (',
       '操作数不入栈']));

    for (var i = 0; i < EXPR.length; i++) {
      var ch = EXPR[i], top;

      /* 操作数：一路直通，连判断都没有 */
      if (isNum(ch)) {
        est[i] = 'done'; out(ch);
        steps.push(step(snap({ cur: i,
          curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，操作数',
          cap1: '输出 ' + ch + '：操作数不进栈，来了就写到后缀上',
          cap2: '后缀里操作数的次序 = 中缀里的次序，一个都不用挪',
          stats: base(i + 1),
          notes: ['操作数 ' + ch + ' 直接输出',
            '不比较，不入栈，没有任何判断',
            '后缀已有 ' + post.length + ' 个字符',
            '要排队的从来只是运算符'] }), 2,
          '操作数 ' + ch + ' 直接输出。这一步没有任何判断 —— 操作数之间的先后关系不受优先级' +
          '影响，中缀里 ' + ch + ' 排第几，后缀里还是第几。',
          ['输出 ' + ch, '操作数不入栈',
           '后缀已有 ' + post.length + ' 个']));
        continue;
      }

      /* 左括号：无条件入栈，它进去以后就是一道屏障 */
      if (ch === '(') {
        est[i] = 'good'; stk.push(ch);
        steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'active'),
          curTxt: '第 ' + (i + 1) + ' 个是 (，左括号',
          cap1: 'Push(S, ()：左括号不和谁比优先级，直接入栈',
          cap2: '进去之后它是一道屏障：括号里的运算符弹不过它',
          stats: base(i + 1),
          notes: ['( 无条件入栈',
            '它的优先级记作最低，所以谁都压不动它',
            '于是括号内外被隔开了',
            '只有 ) 能把它弹掉'] }), 3,
          '左括号无条件入栈。它不参与优先级比较，作用是当屏障 —— 括号里的运算符往下弹的时候' +
          '碰到 ( 就停，绝不会把括号外面的运算符牵扯进来。',
          ['Push(S, ()', '( 是一道屏障',
           '只有 ) 能弹掉它']));
        continue;
      }

      /* 右括号：把 ( 之上攒的运算符全倒出来，再把 ( 本身丢掉。
       * 这一段完全不看优先级 —— 括号已经把先算谁写死了。 */
      if (ch === ')') {
        est[i] = 'active';
        steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'hot'),
          curTxt: '第 ' + (i + 1) + ' 个是 )，右括号',
          cap1: ') 不入栈：它的活是把栈清到 ( 为止',
          cap2: '这一段不比优先级 —— 括号里该先算，本来就该先输出',
          stats: base(i + 1),
          notes: [') 自己从不进栈',
            '把栈顶一个个弹出来输出',
            '弹到 ( 就停，( 挡住了外面的运算符',
            '所以括号内外永远不会串'] }), 4,
          '右括号自己不入栈，它的活是清栈：把 ( 之上的运算符一个个弹出来输出。' +
          '这一段根本不看优先级 —— 括号已经把「先算谁」写死了，照弹就是对的。',
          [') 不入栈', '弹到 ( 为止',
           '这一段不比优先级']));

        while (stk[stk.length - 1] !== '(') {
          top = stk.pop(); out(top);
          steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'hot'),
            curTxt: '括号内的 ' + top + ' 弹出并输出',
            cap1: '输出 Pop(S) = ' + top + '：括号里的运算符轮到它了',
            cap2: '栈顶现在是 ' + stk[stk.length - 1] + '，还不是 (，接着弹',
            stats: base(i + 1),
            notes: ['Pop 出 ' + top + '，写到后缀上',
              '括号里的运算符先算，所以先输出',
              '继续看栈顶是不是 (',
              '后缀已有 ' + post.length + ' 个字符'] }), 4,
            '弹出 ' + top + ' 并输出。括号里的东西整体上要先算，所以它的运算符也就先出现在后缀里。',
            ['输出 Pop(S) = ' + top,
             '括号内先算 → 先输出',
             '继续检查栈顶']));
        }

        stk.pop(); est[i] = 'done';
        steps.push(step(snap({ cur: i,
          curTxt: '( 和 ) 一起消失，都不出现在后缀里',
          cap1: 'Pop(S) 弃掉这个 (：一对括号的任务已经完成',
          cap2: '后缀式里没有括号 —— 顺序本身就把优先级说清楚了',
          stats: base(i + 1),
          notes: ['再 Pop 一次，把 ( 丢掉',
            '这个 ( 不输出，直接扔',
            '一对括号在后缀里不留痕迹',
            '它们的作用已经化进输出顺序里了'] }), 4,
          '最后再 Pop 一次把 ( 丢掉 —— 它不输出。一对括号在后缀式里一点痕迹都没有，' +
          '因为它们要表达的「先算这一段」已经变成了输出顺序，不需要符号再说一遍。',
          ['Pop 掉 (，不输出', '后缀式里没有括号',
           '括号的作用化进了顺序']));
        continue;
      }

      /* 运算符：先把不肯让路的弹出去，自己再进栈 */
      est[i] = 'active';
      steps.push(step(snap({ cur: i,
        sst: stk.length ? mark(stk.length - 1, 'hot') : {},
        curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，运算符',
        cap1: stk.length ? '比一比：栈顶 ' + stk[stk.length - 1] + ' 和当前 ' + ch
                         : '栈是空的，没人要比，' + ch + ' 直接进去',
        cap2: stk.length ? '栈顶优先级 ≥ 它，就得先弹出去 —— 那些更急'
                         : '第一个运算符总是无条件入栈',
        stats: base(i + 1),
        notes: ['运算符不直接输出，先进栈排队',
          stk.length ? '和栈顶 ' + stk[stk.length - 1] + ' 比优先级'
                     : '栈空，无需比较',
          '栈顶不低于它 → 栈顶先走',
          '栈顶低于它 → 栈顶继续等'] }), 6,
        '运算符不能直接输出 —— 它得等右边的操作数出来。' +
        (stk.length ? '先和栈顶的 ' + stk[stk.length - 1] +
                      ' 比优先级：栈顶不低于它，说明栈顶那个更急，得先让栈顶输出。'
                    : '栈是空的，没有谁要让路，直接入栈。'),
        ['运算符先进栈排队',
         stk.length ? '和栈顶 ' + stk[stk.length - 1] + ' 比' : '栈空，不用比',
         '不低于就先弹栈顶']));

      while (stk.length && stk[stk.length - 1] !== '(' &&
             prec(stk[stk.length - 1]) >= prec(ch)) {
        top = stk.pop(); out(top);
        steps.push(step(snap({ cur: i,
          sst: stk.length ? mark(stk.length - 1, 'hot') : {},
          curTxt: '栈顶 ' + top + ' 让路：弹出并输出',
          cap1: 'prec(' + top + ') ≥ prec(' + ch + ') → 输出 Pop(S) = ' + top,
          cap2: top === '*' ? '* 比 - 急，它的两个操作数都齐了，可以先算'
                            : top + ' 排在 ' + ch + ' 前面，同级也要先算左边那个',
          stats: base(i + 1),
          notes: ['Pop 出 ' + top + '，写到后缀上',
            top === '*' ? '* 优先级高，本来就该先算'
                        : '同级时左边先算，所以也要先弹',
            stk.length ? '继续和新栈顶 ' + stk[stk.length - 1] + ' 比'
                       : '栈空了，不用再弹',
            '弹的过程是个循环，可能连弹好几个'] }), 7,
          '栈顶 ' + top + ' 的优先级不低于 ' + ch + '，先把它弹出来输出。' +
          (top === '*' ? '* 本来就比 ' + ch + ' 急，它的两个操作数 B、C 都已经在后缀上了，' +
                         '此刻输出 * 正好把它们收走。'
                       : '同级的两个运算符按左结合，左边那个先算，所以也得让它先走。') ,
          ['输出 Pop(S) = ' + top,
           top === '*' ? '* 优先级更高' : '同级左结合，左边先算',
           stk.length ? '再比新栈顶' : '栈空，停止弹出']));
      }

      stk.push(ch); est[i] = 'good';
      steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'active'),
        curTxt: '第 ' + (i + 1) + ' 个 ' + ch + ' 入栈排队',
        cap1: 'Push(S, ' + ch + ')：该让的都让完了，轮到它排队',
        cap2: stk.length > 1 ? '它压在 ' + stk[stk.length - 2] + ' 上面，比下面那个后算'
                             : '此刻它是栈里唯一的运算符',
        stats: base(i + 1),
        notes: ['Push(S, ' + ch + ')，成为新栈顶',
          '它要等右边的操作数出来才能输出',
          stk.length > 1 ? '栈从底到顶：' + stk.join(' ') : '栈里就它一个',
          '栈里自底向上，优先级大体递增'] }), 8,
        ch + ' 入栈。它现在只能等 —— 右边的操作数还没出来。' +
        (stk.length > 1 ? '注意栈里自底向上是 ' + stk.join(' ') +
                          '，越靠上的越急，出栈时正好先走。'
                        : '它是栈里唯一的运算符。'),
        ['Push(S, ' + ch + ')',
         '等右操作数出来再输出',
         stk.length > 1 ? '栈内：' + stk.join(' ') : '栈内只有它']));
    }

    /* 扫完了，栈里剩下的运算符按从顶到底的顺序全倒出来 —— 剩的都是还没轮到的 */
    steps.push(step(snap({
      cap1: '字符扫完了，可栈里还压着 ' + stk.length + ' 个运算符',
      cap2: '它们不是被漏了，是一直没等到该走的时机 —— 现在全倒出来',
      stats: base(EXPR.length),
      notes: ['循环结束，但事情没完',
        '栈里剩 ' + stk.length + ' 个运算符：' + stk.join(' '),
        '从栈顶往下依次弹出输出',
        '这一段不能漏，否则后缀式不完整'] }), 9,
      '中缀扫完了，栈里还压着 ' + stk.length + ' 个运算符。它们不是被漏掉的 —— ' +
      '只是一直没碰到能把它们赶出去的人。现在从栈顶往下全部弹出输出。',
      ['循环外还有一段', '栈内剩 ' + stk.join(' '),
       '从栈顶依次弹出']));

    while (stk.length) {
      top = stk.pop(); out(top);
      steps.push(step(snap({
        sst: stk.length ? mark(stk.length - 1, 'hot') : {},
        cap1: '输出 Pop(S) = ' + top + (stk.length ? '' : '，栈空了'),
        cap2: stk.length ? '栈里还剩 ' + stk.join(' ')
                         : '后缀式到这里才算写完：' + post.join(' '),
        stats: base(EXPR.length),
        notes: ['Pop 出 ' + top + '，写到后缀上',
          '越靠栈顶的越先输出',
          stk.length ? '栈里还剩 ' + stk.length + ' 个' : '栈空，转换结束',
          '后缀已有 ' + post.length + ' 个字符'] }), 9,
        '弹出 ' + top + ' 并输出。' +
        (stk.length ? '栈顶的先出去，因为它管的那一小段本来就要先算。'
                    : '栈空了，转换到此结束 —— 后缀式是 ' + post.join(' ') + '。'),
        ['输出 Pop(S) = ' + top,
         stk.length ? '栈剩 ' + stk.length + ' 个' : '栈空，转换结束',
         '后缀共 ' + post.length + ' 个字符']));
    }

    steps.push(step(snap({
      cap1: '中缀 A + B * C - ( D + E )　→　后缀 ' + post.join(' '),
      cap2: '操作数次序一字未动，动的只有运算符的位置',
      stats: { '中缀长度': EXPR.length, '后缀长度': post.length,
               '栈最深': 3, '时间': 'O(n)' },
      notes: ['两行对比着看：操作数顺序完全一样',
        '括号消失了，优先级也不用再看',
        '后缀里运算符出现的先后 = 计算的先后',
        '每个字符只处理一次，时间 O(n)'] }), -1,
      '把两行对比着看：操作数 A B C D E 的次序一字未动，变的只是运算符跑到了哪里，' +
      '而括号整个消失了。后缀式里运算符出现的先后就是计算的先后 —— 下一场就靠这一点求值。',
      ['操作数次序不变', '括号彻底消失',
       '运算符顺序 = 计算顺序']));

    return steps;
  }

  /* ---------- 场景二：后缀求值 ---------- */
  /* 用上一场那个式子的数字版：中缀 3 + 4 * 2 - ( 5 + 1 )，
   * 后缀 3 4 2 * + 5 1 + -，答案 5。9 个字符，栈最深 3 格。
   * 这一场全程不看优先级，也没有括号 —— 顺序已经把话说完了。 */
  function buildEval() {
    var steps = [];
    var EXPR = ['3', '4', '2', '*', '+', '5', '1', '+', '-'];
    var HDR = '后缀  3 4 2 * + 5 1 + -';
    var est = {}, stk = [];

    function isNum(c) { return '0123456789'.indexOf(c) >= 0; }
    function calc(a, op, b) {
      return op === '+' ? a + b : (op === '-' ? a - b : a * b);
    }

    var snap = function (o) {
      return { expr: EXPR.slice(), est: cp(est), stk: stk.slice(),
               sst: o.sst || {}, cur: o.cur != null ? o.cur : null,
               curTxt: o.curTxt || null, calc: o.calc || null, hdr: HDR,
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function (k) {
      return { '已扫描': k + ' / ' + EXPR.length,
               '栈内操作数': stk.length,
               '栈顶': stk.length ? stk[stk.length - 1] : '（空）',
               '已算次数': cnt };
    };
    var cnt = 0;

    steps.push(step(snap({
      cap1: '后缀式没有括号，也不用比优先级 —— 顺序已经说完了',
      cap2: '中缀 3 + 4 * 2 - ( 5 + 1 )，答案应该是 5',
      stats: { '后缀长度': EXPR.length, '栈里放': '操作数',
               '运算符': '不入栈', '时间': 'O(n)' },
      notes: ['数字：入栈',
        '运算符：弹两个，算完把结果压回去',
        '扫完栈里只剩一个数，就是答案',
        '全程不看优先级，不认括号'] }), 10,
      '后缀求值的规则只有两条：数字入栈；碰到运算符就弹两个出来算，结果再压回去。' +
      '整个过程既不看优先级也没有括号 —— 上一场已经把先算谁化进顺序里了，这里照着扫就行。',
      ['数字入栈', '运算符弹两个算完压回',
       '扫完栈里只剩答案'], 'eval'));

    for (var i = 0; i < EXPR.length; i++) {
      var ch = EXPR[i], a, b, r;

      if (isNum(ch)) {
        stk.push(+ch); est[i] = 'done';
        steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'active'),
          curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，数字',
          cap1: 'Push(S, ' + ch + ')：数字一律入栈等着',
          cap2: '它要等一个运算符来把它取走，现在还不知道是谁',
          stats: base(i + 1),
          notes: ['数字 ' + ch + ' 入栈',
            '这一步没有任何判断',
            '栈里现在有 ' + stk.length + ' 个操作数',
            '和上一场正相反：那边数字不入栈'] }), 11,
          '数字 ' + ch + ' 入栈。留意这和上一场恰好相反 —— 转换时操作数从不入栈，' +
          '求值时反倒只有操作数入栈。两个场景里栈装的东西完全不同。',
          ['Push(S, ' + ch + ')', '数字入栈不判断',
           '栈内 ' + stk.length + ' 个操作数'], 'eval'));
        continue;
      }

      /* 运算符：先弹两个，注意先弹出来的那个是右操作数 */
      b = stk[stk.length - 1]; a = stk[stk.length - 2];
      est[i] = 'active';
      steps.push(step(snap({ cur: i,
        sst: mark(stk.length - 1, 'hot', stk.length - 2, 'active'),
        curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，运算符',
        calc: 'b = Pop(S) = ' + b + '　　a = Pop(S) = ' + a,
        cap1: '先弹的是右操作数：b = ' + b + '，后弹的才是左：a = ' + a,
        cap2: ch === '-' ? '顺序反了就成了 ' + b + ' - ' + a + '，减法除法必错'
                         : '这次是 ' + ch + '，顺序反了看不出来，但不能靠运气',
        stats: base(i + 1),
        notes: ['连弹两次，栈顶那个是右操作数',
          'b = ' + b + '（先弹），a = ' + a + '（后弹）',
          '要算的是 a ' + ch + ' b，不是 b ' + ch + ' a',
          ch === '-' ? '减法对顺序敏感，弹反必错' : '加法乘法交换律掩盖了错误'] }), 12,
        '运算符 ' + ch + ' 来了，连弹两个。要紧的是次序：先弹出来的 ' + b +
        ' 是右操作数，后弹出来的 ' + a + ' 才是左操作数 —— 因为它是先入栈的。' +
        (ch === '-' ? '弹反就算成了 ' + b + ' - ' + a + '，减法和除法这样必错。'
                    : '这一步是 ' + ch + '，弹反了结果一样，但不能因此就不管顺序。'),
        ['b = Pop(S) = ' + b + '（右）',
         'a = Pop(S) = ' + a + '（左）',
         '算的是 a ' + ch + ' b'], 'eval'));

      stk.pop(); stk.pop();
      r = calc(a, ch, b); stk.push(r); cnt++;
      est[i] = 'done';
      steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'active'),
        calc: a + ' ' + ch + ' ' + b + ' = ' + r + '　→　Push(S, ' + r + ')',
        cap1: 'Push(S, ' + r + ')：算出来的中间结果又是一个操作数',
        cap2: stk.length > 1 ? '栈里现在是 ' + stk.join(' ') + '，下面那些还在等'
                             : '栈里只剩 ' + r + ' 一个数了',
        stats: base(i + 1),
        notes: [a + ' ' + ch + ' ' + b + ' = ' + r,
          '结果压回栈里，当普通操作数用',
          '两个变一个，所以栈越算越浅',
          '栈内：' + stk.join(' ')] }), 12,
        a + ' ' + ch + ' ' + b + ' = ' + r + '，把结果压回栈里。中间结果和原始数字一视同仁 —— ' +
        '这正是递归式求值能一路做下去的原因：一个运算符消掉两个操作数、产出一个，栈只会越来越浅。',
        [a + ' ' + ch + ' ' + b + ' = ' + r,
         'Push(S, ' + r + ')',
         '两个变一个，栈变浅'], 'eval'));
    }

    steps.push(step(snap({ sst: mark(0, 'done'),
      calc: '栈里只剩一个数：' + stk[0] + '，它就是答案',
      cap1: '扫完了，StackLength(S) == 1 → 返回 Pop(S) = ' + stk[0],
      cap2: '中缀 3 + 4 * 2 - ( 5 + 1 ) = 5，对上了',
      stats: { '已扫描': EXPR.length + ' / ' + EXPR.length,
               '栈内操作数': stk.length, '算了几次': cnt,
               '结果': stk[0] },
      notes: ['扫完时栈里恰好剩一个数',
        '剩多个或提前弹空 → 后缀式本身有错',
        '' + cnt + ' 个运算符，算了 ' + cnt + ' 次',
        '时间 O(n)，空间最坏 O(n)'] }), 12,
      '扫完最后一个字符，栈里恰好剩一个数 ' + stk[0] + '，它就是答案。' +
      '这个「恰好剩一个」还能当校验用：剩多个说明运算符少了，中途弹空说明操作数不够 —— ' +
      '两种都是后缀式本身写错了。',
      ['栈里剩一个数即答案', '剩多个或弹空 → 式子有错',
       '时间 O(n)'], 'eval'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['expression-eval'] = {
    title: '中缀转后缀与表达式求值',
    subtitle: '后缀式里运算符出现的先后就是计算的先后 —— 括号可以扔掉，优先级也不必再比。两趟都只用一个栈，但栈里装的东西正好相反：转换时只放运算符，求值时只放操作数。',
    height: 730,
    code: [
      '// 中缀转后缀：操作数直接输出，栈里只放运算符',
      'ToPost(expr):  InitStack(S)        // 空栈起步',
      '    if ch 是操作数: output(ch)      // 次序不变',
      '    if ch == "(":  Push(S, ch)     // 挡住外面的',
      '    if ch == ")":  弹到 ( 为止，再弃掉 (',
      '    else:                          // ch 是运算符',
      '        while 栈顶 != "(" && prec(栈顶) >= prec(ch):',
      '            output(Pop(S))         // 栈顶更急',
      '        Push(S, ch)                // 自己排队去',
      '    扫完：栈里剩的全部弹出输出      // 这段别漏',
      '// 后缀求值：栈里只放操作数，遇运算符就动手',
      'Eval(post):  if ch 是操作数: Push(S, ch)',
      '    else: b=Pop(S); a=Pop(S); Push(S, a op b)'
    ],
    scenes: [
      { name: '中缀转后缀', build: buildConv },
      { name: '后缀求值', build: buildEval }
    ]
  };
})();
