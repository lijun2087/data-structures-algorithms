/* 各排序算法性能对比 — 第10章
 * 两个场景：一张复杂度总表逐行揭开并解释「为什么是这个量级」；
 * 再用同一组数据把前面九个算法各跑一遍，实测比较与移动次数画成条形图。
 * 实测数据是构建期真跑出来的，不是抄书上的结论。
 * 快照模板同 insertion-sort.js。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [49, 38, 65, 97, 76, 13, 27, 49, 55, 4, 82, 31];

  // 表格几何：六列铺满舞台宽度
  var COL = [48, 196, 322, 448, 566, 664];
  var CW = [148, 126, 126, 118, 98, 296];
  var TH = 104, RH = 24;

  var ROWS = [
    ['直接插入', 'O(n²)', 'O(n²)', 'O(1)', '稳定',
     '基本有序时接近 O(n)，小规模首选'],
    ['折半插入', 'O(n²)', 'O(n²)', 'O(1)', '稳定',
     '比较降到 O(n log n)，但移动量不变'],
    ['希尔排序', 'O(n^1.3)', 'O(n²)', 'O(1)', '不稳定',
     '增量分组让元素大步前进，量级依赖增量序列'],
    ['冒泡排序', 'O(n²)', 'O(n²)', 'O(1)', '稳定',
     '可加标志提前退出，有序时一趟即止'],
    ['快速排序', 'O(n log n)', 'O(n²)', 'O(log n)', '不稳定',
     '实测最快；栈深即空间，枢轴选得差会退化'],
    ['简单选择', 'O(n²)', 'O(n²)', 'O(1)', '不稳定',
     '比较次数恒为 n(n-1)/2，但交换至多 n-1 次'],
    ['堆排序', 'O(n log n)', 'O(n log n)', 'O(1)', '不稳定',
     '最坏也有保证，且原地；常数因子大于快排'],
    ['归并排序', 'O(n log n)', 'O(n log n)', 'O(n)', '稳定',
     '唯一「又快又稳」的，代价是额外一个数组'],
    ['基数排序', 'O(d(n+r))', 'O(d(n+r))', 'O(n+r)', '稳定',
     '不比较大小，只适用于可按位拆解的关键字']
  ];

  var HEAD = ['算法', '平均时间', '最坏时间', '额外空间', '稳定性', '一句话要点'];

  function cellFill(ci, txt, lit) {
    if (!lit) return '#7f92bb';
    if (ci === 4) return txt === '稳定' ? '#2ecc71' : '#ff9f6b';
    if (ci === 1 || ci === 2) {
      return /log n\)$/.test(txt) || /n\+r/.test(txt) ? '#6ceaa5' : '#ffd166';
    }
    return '#c8d4ef';
  }

  function renderTable(ctx, f) {
    D.clear(ctx.stage);
    var i, c;
    for (c = 0; c < HEAD.length; c++) {
      ctx.stage.appendChild(D.text(HEAD[c],
        { x: COL[c], y: TH, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    }
    ctx.stage.appendChild(D.el('line', { x1: 40, y1: TH + 9, x2: 962,
      y2: TH + 9, stroke: '#33456b', 'stroke-width': 1.4 }));

    for (i = 0; i < ROWS.length; i++) {
      var y = TH + 20 + i * RH, lit = i < f.upto, on = i === f.upto - 1;
      if (on) {
        ctx.stage.appendChild(D.el('rect', { x: 40, y: y - 15, width: 922,
          height: RH - 3, rx: 6, fill: '#1b2a4a', stroke: '#4aa3e0' }));
      } else if (lit && f.mark && f.mark.indexOf(i) >= 0) {
        ctx.stage.appendChild(D.el('rect', { x: 40, y: y - 15, width: 922,
          height: RH - 3, rx: 6, fill: '#14301f', stroke: '#1fa268' }));
      }
      for (c = 0; c < ROWS[i].length; c++) {
        var t = D.text(lit ? ROWS[i][c] : '· · ·',
          { x: COL[c], y: y + 3,
            'class': c === 5 ? 'vz-info' : (c === 0 ? 'vz-lab' : 'vz-code'),
            fill: cellFill(c, ROWS[i][c], lit) });
        if (lit && c === 5) t.setAttribute('fill', on ? '#e6edfb' : '#93a4c9');
        ctx.stage.appendChild(t);
        if (!lit) break;             // 未揭开的行只画一个省略号占位
      }
    }
    ctx.stats = { '已揭开': f.upto + ' / ' + ROWS.length,
                  '优于 O(n²) 的': f.fast, '稳定的': f.stable };
  }

  function step(f, line, narr, act, kind) {
    return { line: line, narr: narr, act: act,
             run: function (c) {
               if (kind === 'chart') renderChart(c, f); else renderTable(c, f);
             } };
  }

  /* ---------- 场景二：同一组数据实测 ---------- */
  var LX = 128, LY = 118, LRH = 24, BARX = 300, BARW = 300;

  function renderChart(ctx, f) {
    D.clear(ctx.stage);
    ctx.stage.appendChild(D.text('同一组 ' + SRC.length + ' 个数据，各算法实测开销',
      { x: 40, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    ctx.stage.appendChild(D.text('比较次数',
      { x: BARX, y: 100, 'class': 'vz-lab', fill: '#4aa3e0' }));
    ctx.stage.appendChild(D.text('移动次数',
      { x: BARX + BARW + 40, y: 100, 'class': 'vz-lab', fill: '#ffd166' }));

    var max = 1, i;
    for (i = 0; i < f.rows.length; i++) {
      max = Math.max(max, f.rows[i].cmp, f.rows[i].mov);
    }
    for (i = 0; i < f.rows.length; i++) {
      var r = f.rows[i], y = LY + i * LRH, on = i === f.cur;
      ctx.stage.appendChild(D.text(r.name,
        { x: LX, y: y + 4, 'class': 'vz-lab', 'text-anchor': 'end',
          fill: on ? '#ffd166' : '#93a4c9' }));
      var wc = Math.max(2, Math.round(r.cmp / max * BARW));
      var wm = Math.max(2, Math.round(r.mov / max * BARW));
      ctx.stage.appendChild(D.el('rect', { x: BARX, y: y - 8, width: wc,
        height: 8, rx: 3, fill: on ? '#5b8cff' : '#2f52bd' }));
      ctx.stage.appendChild(D.el('rect', { x: BARX, y: y + 2, width: wm,
        height: 8, rx: 3, fill: on ? '#ffd166' : '#8a6f24' }));
      ctx.stage.appendChild(D.text(r.cmp + ' 比 / ' + r.mov + ' 移',
        { x: BARX + Math.max(wc, wm) + 10, y: y + 5, 'class': 'vz-info',
          fill: on ? '#e6edfb' : '#6d7ea6' }));
    }
    ctx.stats = { '已实测': f.rows.length + ' 个算法',
                  '比较最少': f.bestC, '移动最少': f.bestM };
  }

  /* 各算法的计数版实现：只统计关键字比较与元素移动，返回 {cmp, mov} */
  function runInsertion(a) {
    var cmp = 0, mov = 0;
    for (var i = 1; i < a.length; i++) {
      cmp++;
      if (a[i] >= a[i - 1]) continue;
      var t = a[i], j = i - 1;
      mov++;
      while (j >= 0) { cmp++; if (a[j] <= t) break; a[j + 1] = a[j]; mov++; j--; }
      a[j + 1] = t; mov++;
    }
    return { cmp: cmp, mov: mov };
  }
  function runBinInsertion(a) {
    var cmp = 0, mov = 0;
    for (var i = 1; i < a.length; i++) {
      var t = a[i], lo = 0, hi = i - 1;
      while (lo <= hi) {
        var m = (lo + hi) >> 1; cmp++;
        if (a[m] <= t) lo = m + 1; else hi = m - 1;
      }
      mov++;
      for (var j = i - 1; j >= lo; j--) { a[j + 1] = a[j]; mov++; }
      a[lo] = t; mov++;
    }
    return { cmp: cmp, mov: mov };
  }
  function runShell(a) {
    var cmp = 0, mov = 0;
    for (var g = a.length >> 1; g >= 1; g >>= 1) {
      for (var i = g; i < a.length; i++) {
        var t = a[i], j = i - g; mov++;
        while (j >= 0) { cmp++; if (a[j] <= t) break; a[j + g] = a[j]; mov++; j -= g; }
        a[j + g] = t; mov++;
      }
    }
    return { cmp: cmp, mov: mov };
  }
  function runBubble(a) {
    var cmp = 0, mov = 0;
    for (var i = 0; i < a.length - 1; i++) {
      var sw = false;
      for (var j = 0; j < a.length - 1 - i; j++) {
        cmp++;
        if (a[j] > a[j + 1]) {
          var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; mov += 3; sw = true;
        }
      }
      if (!sw) break;
    }
    return { cmp: cmp, mov: mov };
  }
  function runQuick(a) {
    var cmp = 0, mov = 0;
    var part = function (lo, hi) {
      var p = a[lo]; mov++;
      while (lo < hi) {
        while (lo < hi) { cmp++; if (a[hi] < p) break; hi--; }
        if (lo < hi) { a[lo] = a[hi]; mov++; }
        while (lo < hi) { cmp++; if (a[lo] > p) break; lo++; }
        if (lo < hi) { a[hi] = a[lo]; mov++; }
      }
      a[lo] = p; mov++;
      return lo;
    };
    var go = function (lo, hi) {
      if (lo >= hi) return;
      var m = part(lo, hi); go(lo, m - 1); go(m + 1, hi);
    };
    go(0, a.length - 1);
    return { cmp: cmp, mov: mov };
  }
  function runSelection(a) {
    var cmp = 0, mov = 0;
    for (var i = 0; i < a.length - 1; i++) {
      var mi = i;
      for (var j = i + 1; j < a.length; j++) { cmp++; if (a[j] < a[mi]) mi = j; }
      if (mi !== i) { var t = a[i]; a[i] = a[mi]; a[mi] = t; mov += 3; }
    }
    return { cmp: cmp, mov: mov };
  }
  function runHeap(a) {
    var cmp = 0, mov = 0, n = a.length;
    var sift = function (s, size) {
      while (true) {
        var l = 2 * s + 1;
        if (l >= size) return;
        var c = l;
        if (l + 1 < size) { cmp++; if (a[l + 1] > a[l]) c = l + 1; }
        cmp++;
        if (a[s] >= a[c]) return;
        var t = a[s]; a[s] = a[c]; a[c] = t; mov += 3;
        s = c;
      }
    };
    for (var s0 = (n - 2) >> 1; s0 >= 0; s0--) sift(s0, n);
    for (var m = n - 1; m > 0; m--) {
      var t2 = a[0]; a[0] = a[m]; a[m] = t2; mov += 3;
      sift(0, m);
    }
    return { cmp: cmp, mov: mov };
  }
  function runMerge(a) {
    var cmp = 0, mov = 0, n = a.length, b = a.slice();
    for (var len = 1; len < n; len *= 2) {
      for (var lo = 0; lo < n; lo += len * 2) {
        var mid = Math.min(lo + len - 1, n - 1);
        var hi = Math.min(lo + len * 2 - 1, n - 1);
        var i = lo, j = mid + 1, k = lo;
        while (i <= mid && j <= hi) {
          cmp++;
          b[k++] = a[i] <= a[j] ? a[i++] : a[j++];
          mov++;
        }
        while (i <= mid) { b[k++] = a[i++]; mov++; }
        while (j <= hi) { b[k++] = a[j++]; mov++; }
      }
      for (var q = 0; q < n; q++) { a[q] = b[q]; mov++; }
    }
    return { cmp: cmp, mov: mov };
  }
  function runRadix(a) {
    var mov = 0, n = a.length;
    var maxV = Math.max.apply(null, a);
    for (var base = 1; base <= maxV; base *= 10) {
      var bins = [], i;
      for (i = 0; i < 10; i++) bins.push([]);
      for (i = 0; i < n; i++) { bins[Math.floor(a[i] / base) % 10].push(a[i]); mov++; }
      var w = 0;
      for (var b = 0; b < 10; b++) {
        for (i = 0; i < bins[b].length; i++) { a[w++] = bins[b][i]; mov++; }
      }
    }
    return { cmp: 0, mov: mov };       // 基数排序不做关键字比较
  }

  var ALGOS = [
    ['直接插入', runInsertion], ['折半插入', runBinInsertion],
    ['希尔排序', runShell], ['冒泡排序', runBubble],
    ['快速排序', runQuick], ['简单选择', runSelection],
    ['堆排序', runHeap], ['归并排序', runMerge],
    ['基数排序', runRadix]
  ];

  var NOTE = [
    '插入排序每次只把一个元素往前挪一格，逆序对有多少就要挪多少次，' +
      '平均是 n²/4 —— 所以它的量级由「数据有多乱」直接决定。',
    '折半插入把「找位置」从顺序查找换成二分，比较次数降到 O(n log n)；' +
      '但找到位置后照样要整段后移，移动量还是 O(n²)，总量级不变。',
    '希尔排序先用大增量让元素跨越很远的距离，等到增量变 1 时序列已接近有序，' +
      '插入排序此时几乎是线性的。它的量级无法用一个式子精确表达。',
    '冒泡每次只交换相邻元素，和插入排序一样受逆序对数支配；' +
      '好处是加一个「本趟有没有交换过」的标志，遇上有序数据一趟就结束。',
    '快排每趟把区间一分为二，理想情况下递归 log n 层、每层扫 n 个元素。' +
      '但枢轴每次都选到极值时区间只缩小 1，就退化成 n 趟的 O(n²)。',
    '选择排序的比较次数与数据无关，永远是 n(n-1)/2；' +
      '它唯一的长处是每趟最多交换一次，总搬运量极小。',
    '堆排序把「找最大值」变成 O(log n) 的筛选，做 n-1 次。' +
      '它的最坏情况也是 O(n log n)，且原地 —— 这是快排给不了的保证。',
    '归并每轮把段长翻倍，所以只有 log n 轮，每轮扫一遍 n 个元素。' +
      '相等时固定取左段，于是它是唯一「O(n log n) 且稳定」的比较排序。',
    '基数排序跳出了「比较」这个框架，因此不受 O(n log n) 下界的约束。' +
      '代价是关键字必须能拆成 d 位、并且要准备 r 个桶。'
  ];

  // ROWS 每一行对应伪代码里的哪一行（0..3 是 O(n²) 组，4..7 是 O(n log n) 组）
  var LINE_OF = [1, 1, 1, 1, 3, 1, 3, 3, 5];

  function buildTable() {
    var steps = [], fast = 0, stable = 0, i;
    var snap = function (upto, mark) {
      return { upto: upto, mark: mark || null, fast: fast, stable: stable };
    };

    steps.push(step(snap(0), -1,
      '第10章的九种排序，差别不在「哪个更快」，而在各自把代价花在了哪里：' +
      '比较次数、移动次数、额外空间、稳定性，四者不可能同时最优。' +
      '下面逐行揭开这张表。',
      ['九种内部排序', '四个维度：时间/空间/稳定', '逐行揭开']));

    for (i = 0; i < ROWS.length; i++) {
      if (/log n\)$/.test(ROWS[i][1]) || /n\+r/.test(ROWS[i][1])) fast++;
      if (ROWS[i][4] === '稳定') stable++;
      steps.push(step(snap(i + 1), LINE_OF[i],
        ROWS[i][0] + '：平均 ' + ROWS[i][1] + '，最坏 ' + ROWS[i][2] +
        '，额外空间 ' + ROWS[i][3] + '，' + ROWS[i][4] + '。' + NOTE[i],
        [ROWS[i][0], '平均 ' + ROWS[i][1] + ' / 最坏 ' + ROWS[i][2],
         '空间 ' + ROWS[i][3] + '，' + ROWS[i][4]]));
    }

    var fastRows = [], stableRows = [], bothRows = [];
    for (i = 0; i < ROWS.length; i++) {
      var isFast = /log n\)$/.test(ROWS[i][1]) || /n\+r/.test(ROWS[i][1]);
      var isStable = ROWS[i][4] === '稳定';
      // 高亮只标三个比较排序：基数排序不比较大小，量级不同标尺
      if (isFast && ROWS[i][0] !== '基数排序') fastRows.push(i);
      if (isStable) stableRows.push(i);
      if (isFast && isStable && ROWS[i][0] !== '基数排序') bothRows.push(i);
    }

    steps.push(step(snap(ROWS.length, fastRows), 6,
      '先按时间分：平均能到 O(n log n) 量级的只有快排、堆排、归并这三个' +
      '（基数排序不比较大小，不在同一套标尺里）。其余五个都是 O(n²)，' +
      '只适合 n 很小或数据基本有序的场合。',
      ['O(n log n) 的三个', '快排 / 堆排 / 归并', '其余均为 O(n²)']));

    steps.push(step(snap(ROWS.length, stableRows), 7,
      '再按稳定性分：稳定的是插入、折半插入、冒泡、归并、基数。' +
      '不稳定的共同点是元素会「跨越式」移动 —— 希尔跨增量、' +
      '快排跨半个区间、选择和堆排跨层交换，相等元素的先后就被打乱了。',
      ['稳定的五个', '不稳定 = 存在跨越式移动',
       '稳定性只在多关键字排序时要紧']));

    steps.push(step(snap(ROWS.length, bothRows), 8,
      '两个条件一起卡：既 O(n log n) 又稳定的比较排序，全表只有归并排序一个，' +
      '而它要付出 O(n) 的额外空间。这就是那句结论的由来 —— ' +
      '快、稳、省空间，三者只能取其二。',
      ['又快又稳：只有归并', '代价是 O(n) 额外空间',
       '快 / 稳 / 省，三者取二']));

    steps.push(step(snap(ROWS.length), -1,
      '实际选择的经验：n 小（几十以内）直接用插入排序，代码短、常数小；' +
      'n 大且不在意稳定性用快排；需要最坏情况有保证用堆排；' +
      '需要稳定就用归并；关键字是定长整数或字符串则考虑基数排序。',
      ['n 小 → 插入排序', 'n 大 → 快排；要保证 → 堆排',
       '要稳定 → 归并；定长键 → 基数']));

    return steps;
  }

  function buildChart() {
    var steps = [], rows = [], bestC = '—', bestM = '—';
    var snap = function (cur) {
      return { rows: rows.map(function (r) {
                 return { name: r.name, cmp: r.cmp, mov: r.mov };
               }),
               cur: cur === undefined ? -1 : cur,
               bestC: bestC, bestM: bestM };
    };

    steps.push(step(snap(), -1,
      '光看量级不够直观。这一场用同一组 ' + SRC.length +
      ' 个数据（含两个相等的 49）把九个算法各跑一遍，' +
      '把真实的比较次数和移动次数量出来。',
      ['数据 ' + SRC.join(', '), 'n = ' + SRC.length,
       '逐个实测'], 'chart'));

    for (var i = 0; i < ALGOS.length; i++) {
      var arr = SRC.slice();
      var res = ALGOS[i][1](arr);
      var ok = arr.every(function (v, k) { return k === 0 || arr[k - 1] <= v; });
      rows.push({ name: ALGOS[i][0], cmp: res.cmp, mov: res.mov });
      var mc = null, mm = null;
      for (var k = 0; k < rows.length; k++) {
        if (rows[k].cmp > 0 && (mc === null || rows[k].cmp < rows[mc].cmp)) mc = k;
        if (mm === null || rows[k].mov < rows[mm].mov) mm = k;
      }
      bestC = rows[mc].name + ' ' + rows[mc].cmp;
      bestM = rows[mm].name + ' ' + rows[mm].mov;
      steps.push(step(snap(i), LINE_OF[i],
        ALGOS[i][0] + '跑完：比较 ' + res.cmp + ' 次、移动 ' + res.mov +
        ' 次，结果' + (ok ? '正确有序' : '有误') + '。' +
        (ALGOS[i][0] === '基数排序' ? '它一次关键字比较都没做，所以蓝条为 0。' :
         (ALGOS[i][0] === '简单选择' ?
          '注意它的比较次数恰好是 n(n-1)/2 = ' + (SRC.length * (SRC.length - 1) / 2) +
          '，而移动次数是全表最少的之一。' : '')),
        [ALGOS[i][0], '比较 ' + res.cmp + ' / 移动 ' + res.mov,
         '当前比较最少：' + bestC], 'chart'));
    }

    steps.push(step(snap(), -1,
      '九个都跑完了。n 只有 ' + SRC.length +
      ' 时，O(n log n) 的算法领先得并不明显 —— 量级差异要等 n 大起来才拉开。' +
      '这也解释了为什么工程里的排序库常常在小区间上直接切回插入排序。',
      ['实测完成', '比较最少：' + bestC, '移动最少：' + bestM], 'chart'));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['sort-compare'] = {
    title: '各排序算法性能对比',
    subtitle: '九种内部排序的时间、空间与稳定性总表，以及同一组数据下的实测开销。核心结论：快、稳、省空间，三者只能取其二。',
    height: 740,
    code: [
      '// O(n²) 一类：受逆序对数支配',
      '直接插入 / 折半插入 / 希尔 / 冒泡',
      '// O(n log n) 一类：分治或堆结构',
      '快速排序 / 堆排序 / 归并排序',
      '// 不比较大小，跳出 O(n log n) 下界',
      '基数排序 LSD',
      '// 按时间分类',
      '// 按稳定性分类',
      '// 又快又稳：只有归并（代价 O(n) 空间）'
    ],
    scenes: [
      { name: '复杂度总表', build: buildTable },
      { name: '同数据实测', build: buildChart }
    ]
  };
})();
