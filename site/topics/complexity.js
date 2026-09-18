/* 时间复杂度与大 O 记号 — 第1章
 * 场景一：把二重循环的执行次数一格一格数出来，看清 n(n+1)/2 从哪来，
 *         以及为什么可以扔掉低阶项和常数因子。
 * 场景二：六种常见量级画在同一张图上（纵轴取对数），看清量级之间的差距。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* ---------- 场景一：数格子 ---------- */
  var N = 8;
  var GX = 66, GY = 122, GS = 24, GG = 3;
  var TX = 336;

  function gx(j) { return GX + j * (GS + GG); }
  function gy(i) { return GY + i * (GS + GG); }

  function renderGrid(ctx, f) {
    D.clear(ctx.stage);
    ctx.stage.appendChild(D.text('内层每执行一次，就点亮一格（横轴 j，纵轴 i）',
      { x: GX - 14, y: 102, 'class': 'vz-lab' }));
    var i, j;
    for (j = 0; j < N; j++) {
      ctx.stage.appendChild(D.text(j,
        { x: gx(j) + GS / 2, y: GY - 7, 'class': 'vz-idx' }));
    }
    for (i = 0; i < N; i++) {
      var lab = D.text(i, { x: GX - 9, y: gy(i) + GS / 2 + 4, 'class': 'vz-idx' });
      lab.setAttribute('text-anchor', 'end');
      ctx.stage.appendChild(lab);
      for (j = 0; j < N; j++) {
        var st = 'mute';
        if (j >= i && i < f.done) st = (i === f.cur) ? 'hot' : 'good';
        var c = D.C[st];
        ctx.stage.appendChild(D.el('rect', { x: gx(j), y: gy(i),
          width: GS, height: GS, rx: 5, fill: c.fill, stroke: c.stroke,
          'stroke-width': 1.4 }));
      }
    }
    // 当前行右侧标出「这一行贡献几次」
    if (f.cur !== null) {
      ctx.stage.appendChild(D.text('+' + (N - f.cur) + ' 次',
        { x: gx(N - 1) + GS + 12, y: gy(f.cur) + GS / 2 + 4,
          'class': 'vz-ptr', fill: '#ffd166' }));
    }
    for (var k = 0; k < f.lines.length && k < 7; k++) {
      var L = f.lines[k];
      ctx.stage.appendChild(D.text(L[0],
        { x: TX, y: 130 + k * 27, 'class': L[1] || 'vz-info',
          fill: L[2] || '#b9c8e6' }));
    }
    ctx.stats = { 'n': N, '已数行数': f.done + ' / ' + N,
                  '累计执行次数': f.cnt };
  }

  /* ---------- 场景二：量级曲线 ---------- */
  var CX0 = 118, CY0 = 120, CW = 452, CH = 196, NMAX = 32;
  var LGX = 616;

  var FN = [
    ['O(1)', function () { return 1; }, '#4a5c82'],
    ['O(log n)', function (n) { return Math.log(n) / Math.LN2 + 1; }, '#6ceaa5'],
    ['O(n)', function (n) { return n; }, '#5b8cff'],
    ['O(n log n)', function (n) { return n * (Math.log(n) / Math.LN2 + 1); }, '#ffd166'],
    ['O(n²)', function (n) { return n * n; }, '#ff9f6b'],
    ['O(2ⁿ)', function (n) { return Math.pow(2, n); }, '#ff6b6b']
  ];

  function px(n) { return CX0 + (n - 1) / (NMAX - 1) * CW; }
  function py(v) {
    var t = Math.log(Math.max(1, v)) / Math.LN10 / 6;   // 纵轴 1 … 10^6 取对数
    return CY0 + CH - Math.min(1, t) * CH;
  }

  function fmt(v) {
    if (v < 1e7) return String(Math.round(v));
    var e = Math.floor(Math.log(v) / Math.LN10);
    return '≈10^' + e;
  }

  function renderCurve(ctx, f) {
    D.clear(ctx.stage);
    var i, k;
    // 坐标轴：纵轴是对数刻度，否则 2^n 一上来就把别的曲线压成一条平线
    ctx.stage.appendChild(D.el('line', { x1: CX0, y1: CY0, x2: CX0,
      y2: CY0 + CH, stroke: '#33456b', 'stroke-width': 1.4 }));
    ctx.stage.appendChild(D.el('line', { x1: CX0, y1: CY0 + CH,
      x2: CX0 + CW, y2: CY0 + CH, stroke: '#33456b', 'stroke-width': 1.4 }));
    for (k = 0; k <= 6; k += 2) {
      var yy = py(Math.pow(10, k));
      ctx.stage.appendChild(D.el('line', { x1: CX0, y1: yy, x2: CX0 + CW,
        y2: yy, stroke: '#22314f', 'stroke-width': 1, 'stroke-dasharray': '3 5' }));
      var t = D.text(k === 0 ? '1' : '10^' + k,
        { x: CX0 - 8, y: yy + 4, 'class': 'vz-idx' });
      t.setAttribute('text-anchor', 'end');
      ctx.stage.appendChild(t);
    }
    for (k = 1; k <= NMAX; k += 8) {
      ctx.stage.appendChild(D.text('n=' + k,
        { x: px(k), y: CY0 + CH + 16, 'class': 'vz-idx' }));
    }
    ctx.stage.appendChild(D.text('执行次数（纵轴对数刻度）',
      { x: CX0 - 8, y: CY0 - 12, 'class': 'vz-lab' }));

    for (i = 0; i < f.upto; i++) {
      var fn = FN[i], on = i === f.upto - 1, pts = [];
      for (var n = 1; n <= NMAX; n++) pts.push(px(n) + ' ' + py(fn[1](n)));
      ctx.stage.appendChild(D.el('path', { d: 'M' + pts.join(' L '),
        fill: 'none', stroke: fn[2], 'stroke-width': on ? 3 : 1.8,
        opacity: on ? 1 : 0.55, 'stroke-linecap': 'round' }));
      // 图例：顺便把 n=32 时的实际次数写出来，量级差距一眼看到
      var v = fn[1](NMAX);
      ctx.stage.appendChild(D.text(fn[0],
        { x: LGX, y: CY0 + 6 + i * 30, 'class': 'vz-lab',
          fill: on ? fn[2] : '#7f92bb' }));
      ctx.stage.appendChild(D.text('n=32 时 ' + fmt(v) + ' 次',
        { x: LGX + 82, y: CY0 + 6 + i * 30, 'class': 'vz-info',
          fill: on ? '#e6edfb' : '#6d7ea6' }));
    }
    ctx.stats = { '已画曲线': f.upto + ' / ' + FN.length,
                  '当前量级': f.worst, '相当于 O(n) 的': f.ratio };
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'curve') renderCurve(c, f); else renderGrid(c, f);
             } };
  }

  function buildGrid() {
    var steps = [], cnt = 0;
    var snap = function (done, cur, lines) {
      return { done: done, cur: cur === undefined ? null : cur,
               cnt: cnt, lines: lines || [] };
    };

    steps.push(step(snap(0, null, [
      ['要问「这段代码有多快」，先不看时间', 'vz-lab', '#8ea3c9'],
      ['而是数「基本操作执行了几次」', 'vz-lab', '#8ea3c9'],
      ['这里的基本操作是 x = x + 1', 'vz-info', '#b9c8e6'],
      ['它的次数只跟 n 有关，与机器无关', 'vz-info', '#b9c8e6']
    ]), -1,
      '时间复杂度不是「跑了多少毫秒」——那会随机器变。它数的是基本操作的执行次数，' +
      '这个次数只由输入规模 n 决定。下面把 n = ' + N + ' 时的次数一格一格数出来。',
      ['先数基本操作次数', 'n = ' + N, '与机器无关']));

    for (var i = 0; i < N; i++) {
      var add = N - i;
      cnt += add;
      steps.push(step(snap(i + 1, i, [
        ['外层 i = ' + i, 'vz-lab', '#ffd166'],
        ['内层 j 从 ' + i + ' 走到 ' + (N - 1), 'vz-info', '#b9c8e6'],
        ['本行执行 ' + add + ' 次', 'vz-info', '#b9c8e6'],
        ['累计 ' + cnt + ' 次', 'vz-lab', '#6ceaa5']
      ]), 2,
        'i = ' + i + ' 时，内层 j 从 ' + i + ' 走到 ' + (N - 1) + '，执行 ' + add +
        ' 次。注意每往下一行就少一次，所以总次数是 ' + N + '+' + (N - 1) +
        '+…+1 这样的等差和，累计已经 ' + cnt + ' 次。',
        ['i = ' + i + '，内层 ' + add + ' 次',
         '每行递减 1', '累计 ' + cnt + ' 次']));
    }

    var total = N * (N + 1) / 2;
    steps.push(step(snap(N, null, [
      ['总次数 = n + (n-1) + … + 1', 'vz-lab', '#6ceaa5'],
      ['        = n(n+1)/2', 'vz-lab', '#6ceaa5'],
      ['        = n²/2 + n/2', 'vz-info', '#b9c8e6'],
      ['n = ' + N + ' 时正好 ' + total + ' 次', 'vz-info', '#b9c8e6']
    ]), 4,
      '数完了：点亮的格子构成一个三角形，正好是 n(n+1)/2 = ' + total +
      ' 个。展开就是 n²/2 + n/2 —— 这就是这段代码精确的执行次数表达式。',
      ['共 ' + total + ' 次', 'n(n+1)/2 = n²/2 + n/2',
       '三角形面积 = 一半的方格']));

    steps.push(step(snap(N, null, [
      ['n²/2 + n/2  取最高阶项', 'vz-lab', '#ffd166'],
      ['→ n²/2      去掉常数因子', 'vz-lab', '#ffd166'],
      ['→ O(n²)', 'vz-lab', '#6ceaa5'],
      ['n=1000 时 n² 是 n/2 的 2000 倍', 'vz-info', '#b9c8e6']
    ]), 5,
      '大 O 只保留最高阶项、并丢掉常数因子：n²/2 + n/2 → O(n²)。' +
      '因为 n 一大，n/2 相对 n²/2 可以忽略：n = 1000 时前者是后者的两千分之一。',
      ['留最高阶项', '丢常数因子', '得 O(n²)']));

    steps.push(step(snap(N, null, [
      ['常数因子被丢掉不等于不重要', 'vz-lab', '#ff9f6b'],
      ['它决定同量级算法谁更快', 'vz-info', '#b9c8e6'],
      ['大 O 描述的是「增长趋势」', 'vz-info', '#b9c8e6'],
      ['n 小的时候量级往往不起作用', 'vz-info', '#b9c8e6']
    ]), -1,
      '要留意：丢掉常数不代表常数不重要。它决定了同量级算法里谁更快，' +
      '也解释了为什么 n 小时 O(n²) 的插入排序反而可能打赢 O(n log n) 的快排。',
      ['大 O 只描述增长趋势', '同量级看常数因子',
       'n 小时量级不起决定作用']));

    return steps;
  }

  var CNOTE = [
    '常数阶：无论 n 多大都只做固定几步。比如按下标取数组元素 a[i]，' +
      '直接算出地址就能拿到，不需要遍历。',
    '对数阶：每一步把问题规模砍掉一半。n 翻一倍也只多做一步 —— ' +
      '折半查找就是这样，n 从一千涨到十亿也只从 10 步涨到 30 步。',
    '线性阶：每个元素都要看一遍，比如顺序查找、求最大值。' +
      '这是「必须读完输入」的算法的下界。',
    '线性对数阶：分治的典型形态 —— 递归 log n 层、每层扫一遍 n 个元素。' +
      '这也是基于比较的排序能达到的最好量级。',
    '平方阶：二重循环，每个元素都和其他元素打一次交道。' +
      'n 翻一倍代价变四倍，n 上万就已经吃力了。',
    '指数阶：n 每加一，代价就翻一倍。n = 32 已经是四十多亿次，' +
      'n = 64 时哪台机器都算不完 —— 这类问题只能求近似解。'
  ];

  function buildCurve() {
    var steps = [], worst = '—', ratio = '—';
    var snap = function (upto) {
      return { upto: upto, worst: worst, ratio: ratio };
    };

    steps.push(step(snap(0), -1,
      '量级之间的差距有多大，光看式子不直观。这一场把六种常见量级画在一张图上，' +
      '横轴是 n，纵轴取对数刻度 —— 不取对数的话 2ⁿ 会把其余五条全压成一条平线。',
      ['六种常见量级', '横轴 n，纵轴对数刻度',
       '逐条画出'], 'curve'));

    for (var i = 0; i < FN.length; i++) {
      var v = FN[i][1](NMAX);
      worst = FN[i][0] + '，' + fmt(v) + ' 次';
      ratio = (v / NMAX >= 100 ? fmt(v / NMAX) : (v / NMAX).toFixed(2)) + ' 倍';
      steps.push(step(snap(i + 1), 6, CNOTE[i],
        [FN[i][0], 'n=32 时 ' + fmt(v) + ' 次',
         '是 O(n) 的 ' + ratio], 'curve'));
    }

    steps.push(step(snap(FN.length), 6,
      '六条摆在一起，结论很清楚：O(1) 与 O(log n) 几乎贴着底，O(n) 与 O(n log n) 差距不大，' +
      'O(n²) 开始明显上扬，而 O(2ⁿ) 直接冲出图外。所以算法优化的关键是「换量级」而不是抠常数。',
      ['量级排序：1 < log n < n', '< n log n < n² < 2ⁿ',
       '优化的关键是换量级'], 'curve'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['complexity'] = {
    title: '时间复杂度与大 O 记号',
    subtitle: '不数毫秒，数基本操作的执行次数；再用大 O 只保留最高阶项，得到与机器无关的增长趋势。',
    height: 730,
    code: [
      '// 数一段代码的基本操作次数',
      'for i = 0 to n-1:',
      '    for j = i to n-1:',
      '        x = x + 1              // 基本操作',
      '// 总次数 = n + (n-1) + … + 1 = n(n+1)/2',
      '//        = n²/2 + n/2  →  O(n²)',
      '// 量级：1 < log n < n < n log n < n² < 2ⁿ'
    ],
    scenes: [
      { name: '数出 O(n²)', build: buildGrid },
      { name: '量级增长对比', build: buildCurve }
    ]
  };
})();
