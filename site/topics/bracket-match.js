/* 括号匹配 — 第3章
 * 场景一：匹配成功 —— 左括号入栈，右括号和栈顶配对就出栈，扫完栈空。
 * 场景二：三种失配 —— 右括号来时栈空、类型对不上、扫完栈里还剩左括号。
 * 栈在这里的用处只有一句：记住最近那个还没闭合的左括号。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：左边竖着一列是栈（自底向上），右上横着一排是被扫描的表达式。
   * 栈 5 格：格高 32、间隙 4，自底 y=300 往上排，顶格 156，整列落在 y ∈ [156,332]。
   * 栈故意画得窄（x 76…152），右边整片让给表达式、游标和说明文字。
   * 表达式格 40 宽、间隙 5，自 x=240 起排，7 个字符止于 x=555。
   * 游标 ↑ 在表达式下方 y=160，当前字符写在 y=182，宽度须止于 x=636。
   * 栈的标签挂在 x=164，说明文字 302 / 326 从 x=250 起，提示文字 x=636。 */
  var CAP = 5;
  var SX = 76, SW = 76, SH = 32, SG = 4, SY0 = 300, STAGX = 164;
  var EX0 = 240, EW = 40, EG = 5, EY = 104, EH = 36;
  var CAPX = 250, NX = 636;

  function syOf(i) { return SY0 - i * (SH + SG); }
  function exOf(i) { return EX0 + i * (EW + EG); }

  // est / sst 是下标键的字典，每帧都得留一份副本，不然回退会串味
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* f = { expr:[字符…], est:{下标:状态}, cur:下标, curTxt,
   *       stk:[栈内字符，自底向上], sst:{下标:状态},
   *       hdr, cap1, cap2, notes, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, x, y, c, n = f.stk.length;

    if (f.hdr) {
      ctx.stage.appendChild(D.text(f.hdr,
        { x: 44, y: 98, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    }

    /* 表达式：没扫的 mute，扫过还没闭合的 good，当前字符 active，
     * 配对成好的一对 done，出问题的 bad —— 一眼看出扫到哪、哪对配上了 */
    ctx.stage.appendChild(D.text('表达式',
      { x: 152, y: EY + 25, 'class': 'vz-lab' }));
    for (i = 0; i < f.expr.length; i++) {
      x = exOf(i);
      c = D.C[f.est[i] || 'mute'];
      ctx.stage.appendChild(D.el('rect', { x: x, y: EY, width: EW,
        height: EH, rx: 6, fill: c.fill, stroke: c.stroke,
        'stroke-width': 2, filter: 'url(#vzGlow)' }));
      ctx.stage.appendChild(D.text(f.expr[i],
        { x: x + EW / 2, y: EY + 25, 'class': 'vz-cellval' }));
    }

    if (f.cur != null && f.expr[f.cur] != null) {
      ctx.stage.appendChild(D.text('↑',
        { x: exOf(f.cur) + EW / 2 - 5, y: EY + EH + 20, 'class': 'vz-ptr',
          fill: '#ffd166' }));
    }
    if (f.curTxt) {
      ctx.stage.appendChild(D.text(f.curTxt,
        { x: EX0, y: EY + EH + 42, 'class': 'vz-lab', fill: '#8ea3c9' }));
    }

    // 栈：下标 0 在最下面，和「栈」这个字的直觉一致
    ctx.stage.appendChild(D.text('栈 S',
      { x: SX, y: syOf(CAP - 1) - 12, 'class': 'vz-lab', fill: '#8fa6d8' }));
    for (i = 0; i < CAP; i++) {
      y = syOf(i);
      c = D.C[f.sst[i] || (i < n ? 'good' : 'mute')];
      ctx.stage.appendChild(D.el('rect', { x: SX, y: y, width: SW,
        height: SH, rx: 6, fill: c.fill, stroke: c.stroke,
        'stroke-width': 2, filter: 'url(#vzGlow)' }));
      if (i < n) {
        ctx.stage.appendChild(D.text(f.stk[i],
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

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  var LEFT = '([{', RIGHT = ')]}';
  function isL(c) { return LEFT.indexOf(c) >= 0; }
  function mateOf(r) { return LEFT.charAt(RIGHT.indexOf(r)); }
  function closeOf(l) { return RIGHT.charAt(LEFT.indexOf(l)); }

  /* ---------- 场景一：全部配对成功 ---------- */
  /* 表达式 [(){}]：既有嵌套又有并列，栈会涨到 2、落到 1、再涨再落。
   * 挑这个而不是纯嵌套的 {[()]}，是为了看清栈顶怎么换人。 */
  function buildOk() {
    var steps = [], EXPR = ['[', '(', ')', '{', '}', ']'];
    var stk = [], idxOf = [], est = {};

    var snap = function (o) {
      return { expr: EXPR.slice(), est: cp(est), stk: stk.slice(),
               sst: o.sst || {}, cur: o.cur != null ? o.cur : null,
               curTxt: o.curTxt || null, hdr: '表达式  [ ( ) { } ]',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function (k) {
      return { '已扫描': k + ' / ' + EXPR.length, '栈内左括号': stk.length,
               '栈顶': stk.length ? stk[stk.length - 1] : '（空）' };
    };

    steps.push(step(snap({
      cap1: '左括号只能先记下来，等它的右括号来闭合',
      cap2: '而且只需记「最近那个」—— 后来的先闭合，正是 LIFO',
      stats: { '表达式长度': EXPR.length, '栈内左括号': 0,
               '成功判据': '扫完 + 栈空' },
      notes: ['扫一遍字符串，只做两件事',
        '左括号：压栈',
        '右括号：和栈顶配对，配上就弹掉',
        '栈顶永远是最近那个未闭合的左括号'] }), -1,
      '括号匹配只要一个栈。扫到左括号先记下来，扫到右括号就找它该闭合的那个左括号 —— ' +
      '一定是最近记下的那一个。后进先出，这正好是栈的定义，所以这题用栈天生合适。',
      ['扫一遍，两种情况', '左括号压栈',
       '右括号找栈顶配对']));

    steps.push(step(snap({ cur: 0,
      cap1: 'InitStack(S)：从空栈开始',
      cap2: '游标停在第 1 个字符，准备逐个扫过去',
      stats: base(0),
      notes: ['先建一个空栈',
        '栈里只放左括号，不放右括号',
        '右括号一来就当场处理掉',
        '所以栈的深度就是嵌套层数'] }), 1,
      '初始化一个空栈，游标指向第一个字符。留意栈里只放左括号 —— 右括号一来就当场配对处理，' +
      '从不入栈。所以任何时刻栈的深度就是当前的嵌套层数。',
      ['InitStack(S)', '栈里只放左括号',
       '栈深 = 嵌套层数']));

    for (var i = 0; i < EXPR.length; i++) {
      var ch = EXPR[i];
      if (isL(ch)) {
        est[i] = 'good';
        stk.push(ch); idxOf.push(i);
        steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'active'),
          curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，左括号',
          cap1: 'Push(S, ' + ch + ')：压到栈顶，等它的 ' + closeOf(ch) + ' 来闭合',
          cap2: '栈里有 ' + stk.length + ' 个左括号，就是说此刻嵌套 ' + stk.length + ' 层',
          stats: base(i + 1),
          notes: ['遇左括号 ' + ch + '，无条件入栈',
            '它成了新的栈顶',
            '压栈这一步不需要任何判断',
            '栈深 ' + stk.length + '，即当前嵌套 ' + stk.length + ' 层'] }), 3,
          '第 ' + (i + 1) + ' 个字符是左括号 ' + ch + '，直接压栈。左括号入栈不用判断什么 —— ' +
          '它跟谁闭合要等后面的右括号来说。它现在是栈顶，也就是「最近那个还没闭合的左括号」。',
          ['Push(S, ' + ch + ')', ch + ' 成为新栈顶',
           '嵌套深度 ' + stk.length]));
      } else {
        var top = stk[stk.length - 1], j = idxOf[idxOf.length - 1];
        est[i] = 'active';
        steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'hot'),
          curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，右括号',
          cap1: '先判空：栈不空，栈顶是 ' + top + '（表达式第 ' + (j + 1) + ' 个字符）',
          cap2: '再判类型：pair(' + top + ', ' + ch + ') 成立，这一对能闭合',
          stats: base(i + 1),
          notes: ['遇右括号 ' + ch + '，先判栈空',
            '栈不空，栈顶是 ' + top,
            '再判类型：' + top + ' 和 ' + ch + ' 正好一对',
            '两个判断都过了才能弹'] }), 5,
          '第 ' + (i + 1) + ' 个字符是右括号 ' + ch + '。它要找的左括号只可能是栈顶那个 —— ' +
          '先确认栈不空，再确认栈顶的 ' + top + ' 和它同类。两道判断都过了，才轮到出栈。',
          ['右括号 ' + ch + '，先判栈空', '栈顶是 ' + top,
           'pair(' + top + ', ' + ch + ') 成立']));

        stk.pop(); idxOf.pop();
        est[i] = 'done'; est[j] = 'done';
        steps.push(step(snap({ cur: i,
          curTxt: '第 ' + (j + 1) + ' 个和第 ' + (i + 1) + ' 个配成一对',
          cap1: 'Pop(S)：' + top + ch + ' 这一对闭合，栈顶让给下一层',
          cap2: stk.length ? '栈顶回到 ' + stk[stk.length - 1] + '，外层那个还等着闭合'
                           : '栈空了 —— 到这里为止的括号已经全部两两配平',
          stats: base(i + 1),
          notes: ['配上了，Pop 掉这个左括号',
            '表达式上这两格标成一对',
            stk.length ? '栈顶回到 ' + stk[stk.length - 1] + '，即外一层'
                       : '栈空：目前扫过的部分已经配平',
            '配一对只花 O(1)'] }), 7,
          top + ' 和 ' + ch + ' 配成一对，把栈顶弹掉。' +
          (stk.length ? '栈顶随即回到外一层的 ' + stk[stk.length - 1] +
                        ' —— 内层闭合了，外层自然重新成为「最近未闭合的那个」。'
                      : '栈空了，说明到这里为止的括号已经两两配平。但还没扫完，不能急着下结论。'),
          ['Pop(S)，弹掉 ' + top, top + ch + ' 记作一对',
           stk.length ? '栈顶回到 ' + stk[stk.length - 1] : '栈空，暂时配平']));
      }
    }

    steps.push(step(snap({
      cap1: '扫完了，StackEmpty(S) 为真 → 返回 TRUE',
      cap2: '两个条件缺一不可：中途没失配，而且最后栈是空的',
      stats: { '已扫描': EXPR.length + ' / ' + EXPR.length, '栈内左括号': 0,
               '结论': '匹配成功' },
      notes: ['扫完 + 栈空 → 匹配成功',
        '中途每个右括号都配上了',
        '最后也没有左括号剩下',
        '时间 O(n)，空间最坏 O(n)'] }), 8,
      '扫完最后一个字符，栈正好是空的，返回 TRUE。注意判据是两条：扫的过程中没出现失配，' +
      '而且扫完之后栈里没有剩下的左括号。只看其中一条都会漏判。',
      ['扫完 + 栈空 → TRUE', '两个条件缺一不可',
       '时间 O(n)']));

    return steps;
  }

  /* ---------- 场景二：三种失配 ---------- */
  /* 三个例子各打一种：
   *   ( ) )   → 第 3 个右括号来时栈已空，没有左括号能配它
   *   ( ] )   → 栈顶是 (，来的是 ]，类型对不上
   *   ( [ )   → 一直扫完，栈里还剩左括号没闭合
   * 三种合起来才是完整判据：中途两道判断 + 扫完再判一次栈空。 */
  function buildBad() {
    var steps = [];
    var CASES = [
      { expr: ['(', ')', ')'], why: 'empty' },
      { expr: ['(', ']', ')'], why: 'type' },
      { expr: ['(', '[', '('], why: 'left' }
    ];

    // 每个 case 从零开始扫，共用一个 push 帧的小函数
    function runCase(ci) {
      var C = CASES[ci], EXPR = C.expr;
      var stk = [], idxOf = [], est = {};
      var HDR = '第 ' + (ci + 1) + ' 种失配　表达式  ' + EXPR.join(' ');

      var snap = function (o) {
        return { expr: EXPR.slice(), est: cp(est), stk: stk.slice(),
                 sst: o.sst || {}, cur: o.cur != null ? o.cur : null,
                 curTxt: o.curTxt || null, hdr: HDR,
                 cap1: o.cap1 || null, cap2: o.cap2 || null,
                 notes: o.notes || [], stats: o.stats || {} };
      };
      var base = function (k, res) {
        return { '已扫描': k + ' / ' + EXPR.length, '栈内左括号': stk.length,
                 '判定': res || '还在扫' };
      };

      for (var i = 0; i < EXPR.length; i++) {
        var ch = EXPR[i], top, j;

        if (isL(ch)) {
          est[i] = 'good';
          stk.push(ch); idxOf.push(i);
          steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'active'),
            curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，压栈',
            cap1: 'Push(S, ' + ch + ')：左括号一律入栈，此处不会失配',
            cap2: '失配只可能发生在两处：遇到右括号时，和扫完之后',
            stats: base(i + 1),
            notes: ['左括号 ' + ch + ' 入栈',
              '压栈这一步永不出错',
              '栈里现在有 ' + stk.length + ' 个待闭合的左括号',
              '问题要等右括号或扫完才暴露'] }), 3,
            '左括号 ' + ch + ' 入栈。压栈这一步没有任何判断，所以也不可能在这里失配 —— ' +
            '括号串出错只会在两个地方被抓住：右括号找不到对，或者扫完了栈还没空。',
            ['Push(S, ' + ch + ')', '压栈永不失配',
             '栈深 ' + stk.length]));
          continue;
        }

        /* 右括号：两道判断 —— 先判栈空，再判类型 */
        if (!stk.length) {
          est[i] = 'bad';
          steps.push(step(snap({ cur: i, sst: {},
            curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，可是栈空了',
            cap1: 'StackEmpty(S) 为真 → 直接返回 FALSE',
            cap2: '右括号多了：它想找的左括号根本没出现过',
            stats: base(i + 1, '失配：栈空'),
            notes: ['右括号 ' + ch + ' 来了，但栈是空的',
              '没有任何左括号在等它闭合',
              '这就是右括号多于左括号',
              '第一种失配：栈空却来了右括号'] }), 5,
            '第 ' + (i + 1) + ' 个是右括号 ' + ch + '，但此刻栈是空的 —— 前面的括号已经两两配平，' +
            '没有谁在等它。右括号比左括号多，当场返回 FALSE。判空必须在取栈顶之前，' +
            '否则空栈上取 Pop 就是错误操作。',
            ['栈空却来了 ' + ch, '右括号多于左括号',
             '返回 FALSE']));
          return;
        }

        top = stk[stk.length - 1]; j = idxOf[idxOf.length - 1];
        if (top !== mateOf(ch)) {
          est[i] = 'bad'; est[j] = 'bad';
          steps.push(step(snap({ cur: i, sst: mark(stk.length - 1, 'bad'),
            curTxt: '第 ' + (i + 1) + ' 个是 ' + ch + '，栈顶却是 ' + top,
            cap1: 'pair(' + top + ', ' + ch + ') 不成立 → 返回 FALSE',
            cap2: '数目对得上也不算配平，类型还得一一对应',
            stats: base(i + 1, '失配：类型不符'),
            notes: ['栈不空，栈顶是 ' + top,
              '但 ' + top + ' 和 ' + ch + ' 不是一对',
              '应该来的是 ' + closeOf(top) + '，来的却是 ' + ch,
              '第二种失配：类型对不上'] }), 6,
            '栈不空，栈顶是 ' + top + '，可它要的是 ' + closeOf(top) + '，来的却是 ' + ch + '。' +
            '光数个数是不够的，左右还得同类 —— 所以判空之后还要再判一次类型，两道都过才能出栈。',
            ['栈顶 ' + top + '，来的是 ' + ch, '应该是 ' + closeOf(top),
             '类型不符，返回 FALSE']));
          return;
        }

        stk.pop(); idxOf.pop();
        est[i] = 'done'; est[j] = 'done';
        steps.push(step(snap({ cur: i,
          curTxt: '第 ' + (j + 1) + ' 个和第 ' + (i + 1) + ' 个配成一对',
          cap1: 'Pop(S)：' + top + ch + ' 闭合，继续往后扫',
          cap2: '这一对没问题，但不代表整串没问题',
          stats: base(i + 1),
          notes: ['两道判断都过了，Pop 掉 ' + top,
            top + ch + ' 配成一对',
            stk.length ? '栈里还剩 ' + stk.length + ' 个' : '栈空了，但还没扫完',
            '不能提前下结论'] }), 7,
          top + ' 和 ' + ch + ' 配成一对，弹掉栈顶。' +
          (stk.length ? '栈里还剩 ' + stk.length + ' 个左括号没闭合。'
                      : '栈暂时空了，可字符还没扫完 —— 后面出问题的余地还在。'),
          ['Pop(S)，' + top + ch + ' 一对',
           stk.length ? '栈剩 ' + stk.length + ' 个' : '栈空但未扫完',
           '继续往后扫']));
      }

      // 扫完了还没 return，说明中途每个右括号都配上了，只剩最后一道判空
      est[idxOf[idxOf.length - 1]] = 'bad';
      steps.push(step(snap({ sst: mark(stk.length - 1, 'bad'),
        cap1: '扫完了，可 StackEmpty(S) 为假 → 返回 FALSE',
        cap2: '栈里剩着 ' + stk.length + ' 个左括号，它们永远等不到闭合了',
        stats: { '已扫描': EXPR.length + ' / ' + EXPR.length,
                 '栈内左括号': stk.length, '判定': '失配：栈非空' },
        notes: ['字符扫完了，一次也没失配',
          '但栈里还剩 ' + stk.length + ' 个左括号',
          '左括号多于右括号',
          '第三种失配：扫完栈不空'] }), 8,
        '这一串中途一次都没出错，每个右括号都找到了对 —— 可字符扫完时栈里还剩 ' +
        stk.length + ' 个左括号，它们永远等不到闭合了。' +
        '所以最后那句判空绝不能省：只看中途不失配就返回 TRUE，这一类错误全都漏掉了。',
        ['扫完但栈不空', '左括号多于右括号',
         '返回 FALSE']));
    }

    steps.push(step({ expr: [], est: {}, stk: [], sst: {}, cur: null,
      curTxt: null, hdr: '括号串出错，只有三种样子',
      cap1: '所以判据是三条，写代码时一条都不能少',
      cap2: '两条在循环里（判空、判类型），一条在循环外（扫完判空）',
      stats: { '失配种类': 3, '循环内判断': '判空 + 判类型',
               '循环外判断': '扫完后栈是否空' },
      notes: ['① 右括号来时栈空 → 右括号多了',
        '② 栈顶类型对不上 → 左右不同类',
        '③ 扫完栈还非空 → 左括号多了',
        '下面三个例子各打一种'] }, -1,
      '括号串出错，翻来覆去只有三种样子：右括号来时栈里没货、栈顶那个左括号跟它不同类、' +
      '扫完了栈里还剩左括号。前两条在循环里抓，第三条只能等扫完再抓。下面三个例子各打一种。',
      ['① 栈空却来右括号', '② 栈顶类型不符',
       '③ 扫完栈还非空']));

    for (var ci = 0; ci < CASES.length; ci++) runCase(ci);

    steps.push(step({ expr: [], est: {}, stk: [], sst: {}, cur: null,
      curTxt: null, hdr: '三种失配对照',
      cap1: '返回 TRUE 的条件：一路没失配，且扫完时栈是空的',
      cap2: '漏掉循环外那句判空，( [ ( 这种串会被误判成合法',
      stats: { '( ) )': '栈空来右括号', '( ] )': '类型不符',
               '( [ (': '扫完栈非空', '共同点': '栈顶是唯一线索' },
      notes: ['三种失配，三处判断，一一对应',
        '任何时刻只看栈顶，不用回头翻前面',
        '所以一遍扫完就够，时间 O(n)',
        '空间最坏 O(n)：全是左括号时栈最深'] }, 8,
      '三种失配对上三处判断，一个不多一个不少。要紧的是它们都只看栈顶 —— ' +
      '不用记住前面出现过哪些括号，也不用回头重扫，所以一遍 O(n) 就能定论。' +
      '空间最坏是 O(n)，出现在全为左括号的时候。',
      ['三种失配 ↔ 三处判断', '每步只看栈顶',
       '时间 O(n)，空间最坏 O(n)']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['bracket-match'] = {
    title: '括号匹配',
    subtitle: '左括号只需记住「最近那个」，因为后来的必定先闭合 —— 这正是 LIFO，所以用栈天生合适。判据有三条：栈空却来右括号、栈顶类型不符、扫完栈还非空。',
    height: 730,
    code: [
      '// 括号匹配：栈里只放左括号，右括号当场配对',
      'Match(expr):  InitStack(S)         // 空栈起步',
      '    for each ch in expr:           // 扫一遍即可',
      '        if ch 是左括号: Push(S, ch) // 压栈不判断',
      '        else:                      // ch 是右括号',
      '            if StackEmpty(S): return FALSE',
      '            if !pair(GetTop(S), ch): return FALSE',
      '            Pop(S)                 // 这一对闭合',
      '    return StackEmpty(S)  // 扫完还得判一次栈空',
      '// 三种失配：栈空来右括号 / 类型不符 / 扫完非空',
      '// 时间 O(n)，空间最坏 O(n)：全是左括号时栈最深'
    ],
    scenes: [
      { name: '匹配成功', build: buildOk },
      { name: '三种失配', build: buildBad }
    ]
  };
})();
