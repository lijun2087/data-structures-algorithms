/* 分块查找（索引顺序表）— 第9章
 * 场景一：索引顺序表结构（块间有序、块内无序）
 * 场景二：查找过程（先定块，再块内顺序查）
 * 场景三：ASL 分析（块长取 √n 时最优，介于顺序与折半之间）
 */
(function () {
  var D = window.VizDraw;

  // 数据：3块，每块4个元素，共12个元素（下标1..12）
  // 块1: [8,3,12,6]  最大12
  // 块2: [20,15,25,18] 最大25
  // 块3: [38,30,45,32] 最大45
  var DATA = [0, 8, 3, 12, 6, 20, 15, 25, 18, 38, 30, 45, 32];
  var N = 12, BLOCK = 4, NB = 3; // NB=块数
  // 索引表：每块最大关键字 + 起始下标
  var IDX_KEY = [12, 25, 45];
  var IDX_START = [1, 5, 9];

  var CX = 54, CY = 200, CW = 60, GAP = 6, CH = 44;
  function cellX(i) { return CX + (i - 1) * (CW + GAP); }

  // 索引表画在顶部
  var IX = 54, IY = 108, IW = 130, IH = 46;
  function idxX(b) { return IX + b * (IW + 30); }

  function renderBlock(ctx, f) {
    D.clear(ctx.stage);
    var i;
    // 画索引表
    ctx.stage.appendChild(D.text('索引表', { x: IX - 10, y: IY - 14, 'class': 'vz-info', 'text-anchor': 'start' }));
    for (var b = 0; b < NB; b++) {
      var ix = idxX(b);
      var ic = D.C[f.idxSt && f.idxSt[b] ? f.idxSt[b] : 'idle'];
      ctx.stage.appendChild(D.el('rect', { x: ix, y: IY, width: IW, height: IH, rx: 8,
        fill: ic.fill, stroke: ic.stroke, 'stroke-width': 2 }));
      ctx.stage.appendChild(D.text('max:' + IDX_KEY[b] + ' 起:' + IDX_START[b],
        { x: ix + IW/2, y: IY + IH/2 + 6, 'class': 'vz-cellval',
          'font-size': 13 }));
      ctx.stage.appendChild(D.text('块' + (b+1), { x: ix + IW/2, y: IY - 6, 'class': 'vz-idx' }));
    }
    // 画数据格
    for (i = 1; i <= N; i++) {
      var x = cellX(i);
      var bc = D.C[f.st && f.st[i] ? f.st[i] : 'idle'];
      ctx.stage.appendChild(D.el('rect', { x: x, y: CY, width: CW, height: CH, rx: 7,
        fill: bc.fill, stroke: bc.stroke, 'stroke-width': 2 }));
      ctx.stage.appendChild(D.text(DATA[i], { x: x + CW/2, y: CY + CH/2 + 7, 'class': 'vz-cellval' }));
      ctx.stage.appendChild(D.text(i, { x: x + CW/2, y: CY + CH + 17, 'class': 'vz-idx' }));
    }
    // 块分界线
    for (var b2 = 1; b2 < NB; b2++) {
      var lx = cellX(b2 * BLOCK + 1) - GAP/2 - 1;
      ctx.stage.appendChild(D.el('line', { x1: lx, y1: CY - 8, x2: lx, y2: CY + CH + 8,
        stroke: '#4a5c82', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
    }
    // 查找指针
    if (f.ptr !== null && f.ptr >= 1 && f.ptr <= N) {
      D.pointer(ctx.stage, { x: cellX(f.ptr) + CW/2, y: CY - 2,
        name: 'i', above: true, color: '#ffd166' });
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act, run: function (c) { renderBlock(c, f); } };
  }

  function snap(st, idxSt, ptr, stats) {
    var stCopy = {}, ixCopy = {};
    if (st) for (var k in st) stCopy[k] = st[k];
    if (idxSt) for (var k in idxSt) ixCopy[k] = idxSt[k];
    return { st: stCopy, idxSt: ixCopy, ptr: ptr !== undefined ? ptr : null, stats: stats || {} };
  }

  /* ---- 场景一：索引顺序表结构 ---- */
  function buildStructure() {
    var steps = [];

    steps.push(step(snap({}, {}, null,
      { '总元素n': N, '块数': NB, '块长': BLOCK, '特点': '块间有序' }),
      0, '分块查找把 n 个元素分成若干块，块间按最大关键字有序，块内可以无序——比折半查找放宽了要求。',
      ['块间有序', '块内无序', '索引表记录每块最大值']));

    // 高亮块1
    var st1 = {};
    for (var i = 1; i <= BLOCK; i++) st1[i] = 'active';
    steps.push(step(snap(st1, { 0: 'hot' }, null,
      { '块1范围': '1..4', '最大值': 12, '块内': '无序', '特性': '块间有序' }),
      1, '块1 的4个元素 [8,3,12,6] 无序。但索引表记录了它的最大关键字 12，以及起始下标 1。',
      ['块1：[8,3,12,6]', '最大关键字=12', '块内任意顺序']));

    // 高亮块2
    var st2 = {};
    for (var i = BLOCK+1; i <= 2*BLOCK; i++) st2[i] = 'active';
    steps.push(step(snap(st2, { 1: 'hot' }, null,
      { '块2范围': '5..8', '最大值': 25, '块1max<块2max': '12<25', '块间': '有序' }),
      1, '块2 的最大关键字 25 大于块1 的 12。块间有序保证了：若目标 ≤ 某块最大值，它只可能在那块里。',
      ['块2：[20,15,25,18]', '最大关键字=25', '12 < 25（块间有序）']));

    steps.push(step(snap({}, {}, null,
      { '结构': '索引+数据', '索引': '最大值+起始', '特点': '块间有序', '块内': '无序' }),
      2, '索引表就是查找的"目录"：先查目录定块，再在块内逐个扫描。动静结合，比纯顺序快，比折半要求低。',
      ['索引表 = 目录', '先查目录定块', '再块内顺序查']));

    return steps;
  }

  /* ---- 场景二：查找过程 ---- */
  function buildSearch() {
    var steps = [];
    var TARGET = 20;
    var cmp = 0;

    steps.push(step(snap({}, {}, null,
      { '目标': TARGET, '第一步': '查索引表', '方法': '顺序或折半' }),
      0, '查找 ' + TARGET + '：第一步在索引表里定块——找最小的"最大关键字 ≥ ' + TARGET + '"，这保证目标可能在该块内。',
      ['目标 = ' + TARGET, '先查索引表', '找 max >= ' + TARGET]));

    // 查索引表：先比 IDX_KEY[0]=12, 不够; 再比 IDX_KEY[1]=25 >= 20
    cmp++;
    steps.push(step(snap({}, { 0: 'hot' }, null,
      { '目标': TARGET, '比较': '12 < ' + TARGET, '索引0': '不匹配', '下一块': '继续' }),
      1, '索引表第0项 max=12 < ' + TARGET + '，目标不在块1。继续往下查索引表。',
      ['IDX[0].max=12 < ' + TARGET, '跳过块1']));

    cmp++;
    steps.push(step(snap({}, { 1: 'hot' }, null,
      { '目标': TARGET, '比较': '25 >= ' + TARGET, '定块': '块2', '起始': IDX_START[1] }),
      1, '索引表第1项 max=25 ≥ ' + TARGET + '，目标若存在，必在块2（下标 5..8）中。进入块内顺序查找。',
      ['IDX[1].max=25 >= ' + TARGET, '定位到块2', '起始下标=5']));

    // 块内顺序查
    var blockStart = IDX_START[1], blockEnd = blockStart + BLOCK - 1;
    for (var i = blockStart; i <= blockEnd; i++) {
      cmp++;
      var found = (DATA[i] === TARGET);
      var st = {};
      if (found) {
        st[i] = 'good';
        for (var j = blockStart; j < i; j++) st[j] = 'done';
      } else {
        st[i] = 'hot';
        for (var j = blockStart; j < i; j++) st[j] = 'done';
      }
      if (found) {
        steps.push(step(snap(st, { 1: 'done' }, i,
          { '目标': TARGET, '比较次数': cmp, '位置': i, '找到': '是' }),
          3, 'a[' + i + ']=' + DATA[i] + ' 等于目标 ' + TARGET + '！块内第 ' + (i-blockStart+1) + ' 个位置命中，总比较 ' + cmp + ' 次。',
          ['a[' + i + '] == ' + TARGET, '查找成功！', '总比较 ' + cmp + ' 次']));
        break;
      } else {
        steps.push(step(snap(st, { 1: 'done' }, i,
          { '目标': TARGET, '比较次数': cmp, '块内': i-blockStart+1 + '/' + BLOCK }),
          3, 'a[' + i + ']=' + DATA[i] + ' 不是目标，继续扫块内下一个。块内顺序查无需有序。',
          ['a[' + i + '] != ' + TARGET, '块内继续']));
      }
    }

    return steps;
  }

  /* ---- 场景三：ASL 分析 ---- */
  function buildASL() {
    var steps = [];

    function renderASL(ctx, f) {
      D.clear(ctx.stage);
      // 画三种方法的 ASL 比较条形图
      var labels = ['顺序查找', '分块查找', '折半查找'];
      var values = [6.5, 4.0, 2.8]; // n=12 时近似值
      var colors = ['#dd3b3b', '#ffd166', '#2ecc71'];
      var bx = 140, by = 310, bw = 60, gap = 100, maxH = 180;
      for (var i = 0; i < 3; i++) {
        var h = Math.round(values[i] / 7 * maxH);
        var x = bx + i * (bw + gap);
        var col = f.hlBar === i ? colors[i] : '#1d2b49';
        var scol = colors[i];
        ctx.stage.appendChild(D.el('rect', { x: x, y: by - h, width: bw, height: h, rx: 6,
          fill: col, stroke: scol, 'stroke-width': 2 }));
        ctx.stage.appendChild(D.text(values[i].toFixed(1), { x: x+bw/2, y: by-h-10, 'class': 'vz-cellval', fill: scol }));
        ctx.stage.appendChild(D.text(labels[i], { x: x+bw/2, y: by+18, 'class': 'vz-idx', fill: scol }));
      }
      ctx.stage.appendChild(D.el('line', { x1: bx-10, y1: by, x2: bx+3*(bw+gap), y2: by,
        stroke: '#3f5580', 'stroke-width': 1.5 }));
      if (f.formula) {
        ctx.stage.appendChild(D.text(f.formula, { x: 500, y: 180, 'class': 'vz-info', fill: '#ffd166', 'text-anchor': 'start' }));
      }
      ctx.stats = f.stats || {};
    }

    steps.push({ line: 0, narr: 'n个元素分成b块，每块s个。ASL = 定块的ASL_I + 块内的ASL_II。两部分加起来决定总性能。',
      act: ['ASL = ASL_I + ASL_II', 'b=n/s 块', 's=块长'],
      run: function (c) { renderASL(c, { hlBar: 1, formula: 'ASL = (b+1)/2 + (s+1)/2',
        stats: { 'n': N, 'b块': NB, 's块长': BLOCK, 'ASL': '(b+1)/2+(s+1)/2' } }); } });

    steps.push({ line: 1, narr: '用顺序查找定块：ASL_I=(b+1)/2=(3+1)/2=2；块内顺序：ASL_II=(s+1)/2=(4+1)/2=2.5；总ASL=4.5。',
      act: ['b=3, ASL_I=2', 's=4, ASL_II=2.5', '总ASL=4.5'],
      run: function (c) { renderASL(c, { hlBar: 1, formula: '(3+1)/2 + (4+1)/2 = 4.5',
        stats: { '定块ASL_I': 2, '块内ASL_II': 2.5, '总ASL': 4.5, 'n=12,b=3,s=4': '' } }); } });

    steps.push({ line: 2, narr: '当块长 s=√n 时，总 ASL = √n + 1（最优）。n=12 时 s≈3.5，接近4，这是分块查找的最优点。',
      act: ['最优块长 s=√n', 'ASL_最优=√n+1', 'n=12 时约4.46'],
      run: function (c) { renderASL(c, { hlBar: 1, formula: '最优：s=√n，ASL=√n+1≈4.46',
        stats: { '最优块长': '√n≈3.5', '最优ASL': '√n+1≈4.46', '顺序ASL': 6.5, '折半ASL': 2.8 } }); } });

    steps.push({ line: 3, narr: '分块查找的 ASL 介于顺序 O(n) 和折半 O(log n) 之间：约 O(√n)。当数据动态增减时比折半更灵活。',
      act: ['ASL 约 O(√n)', '介于顺序和折半', '动态增删比折半灵活'],
      run: function (c) { renderASL(c, { hlBar: -1, formula: null,
        stats: { '顺序ASL': 'O(n)', '分块ASL': 'O(√n)', '折半ASL': 'O(log n)', '适用场景': '动态维护' } }); } });

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['block-search'] = {
    title: '分块查找 Block Search',
    subtitle: '索引顺序表：块间有序、块内无序。先查索引表定块，再块内顺序查找。ASL 约 O(√n)，介于顺序查找和折半之间。',
    height: 700,
    code: [
      '// 第一步：查索引表定块',
      'while (b<NB && IDX[b].max<key) b++;  // 顺序定块',
      '// 第二步：块内顺序查',
      'i = IDX[b].start;',
      'while (i<=end && a[i]!=key) i++;',
      'return (a[i]==key) ? i : 0;'
    ],
    scenes: [
      { name: '结构介绍', build: buildStructure,
        codeTag: '索引顺序表',
        code: [
          '// 数据分成 b 块，每块 s 个元素',
          '// 块间：IDX[0].max < IDX[1].max < ...',
          '// 块内：元素可以无序',
          '// 索引表：每块 (最大关键字, 起始下标)'
        ] },
      { name: '查找过程', build: buildSearch,
        codeTag: '先定块再顺序查',
        code: [
          '// 第一步：查索引表定块',
          'while (b<NB && IDX[b].max<key) b++;',
          '// 第二步：块内顺序查',
          'i = IDX[b].start;',
          'while (i<=end && a[i]!=key) i++;',
          'return (a[i]==key) ? i : 0;'
        ] },
      { name: 'ASL 分析', build: buildASL,
        codeTag: '最优块长 s=√n',
        code: [
          '// ASL = ASL_I（定块）+ ASL_II（块内）',
          '// 顺序定块：ASL_I = (b+1)/2',
          '// 块内顺序：ASL_II = (s+1)/2',
          '// 最优：s=√n → ASL ≈ √n + 1'
        ] }
    ]
  };
})();
