/* 顺序查找与哨兵 — 第9章
 * 场景一：朴素顺序查找（每步两次比较：越界 + 关键字）
 * 场景二：哨兵顺序查找（a[0] 放目标值，从后往前，省掉越界判断）
 * 场景三：ASL 分析（成功 / 失败期望，按概率重排的优化思路）
 */
(function () {
  var D = window.VizDraw;

  // 查找表：11个元素，下标1..11（顺序表从1开始更贴近教材）
  var SRC = [0, 34, 15, 27, 8, 42, 19, 53, 6, 31, 47, 22];
  // 下标0留给哨兵，SRC[1..11]是实际数据
  var TARGET_FOUND = 31;   // 能找到的目标
  var TARGET_MISS  = 20;   // 找不到的目标

  // 布局：显示下标1..11，共11个格子
  var CX = 130, CY = 178, CW = 58, GAP = 4, CH = 46;
  var N = 11; // 有效元素个数

  function cellX(i) { return CX + (i - 1) * (CW + GAP); }

  /* 渲染一帧：f包含所有需要的快照信息 */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var a = f.a, st = f.st;

    // 画格子（下标1..N）
    for (var i = 1; i <= N; i++) {
      var x = cellX(i);
      var c = D.C[st[i] || 'idle'];
      ctx.stage.appendChild(D.el('rect', {
        x: x, y: CY, width: CW, height: CH, rx: 7,
        fill: c.fill, stroke: c.stroke, 'stroke-width': 2
      }));
      ctx.stage.appendChild(D.text(a[i], {
        x: x + CW / 2, y: CY + CH / 2 + 7, 'class': 'vz-cellval'
      }));
      ctx.stage.appendChild(D.text(i, {
        x: x + CW / 2, y: CY + CH + 17, 'class': 'vz-idx'
      }));
    }

    // 画哨兵格（仅哨兵场景）
    if (f.showSentinel) {
      var sx = cellX(1) - CW - GAP - 18;
      var sc = D.C[f.st[0] || 'mute'];
      ctx.stage.appendChild(D.el('rect', {
        x: sx, y: CY, width: CW, height: CH, rx: 7,
        fill: sc.fill, stroke: sc.stroke, 'stroke-width': 2
      }));
      ctx.stage.appendChild(D.text(a[0], {
        x: sx + CW / 2, y: CY + CH / 2 + 7, 'class': 'vz-cellval'
      }));
      ctx.stage.appendChild(D.text('哨兵[0]', {
        x: sx + CW / 2, y: CY + CH + 17, 'class': 'vz-idx'
      }));
    }

    // 画当前比较指针
    if (f.ptr !== null && f.ptr >= 1 && f.ptr <= N) {
      D.pointer(ctx.stage, {
        x: cellX(f.ptr) + CW / 2, y: CY - 2,
        name: 'i', above: true, color: '#ffd166'
      });
    }
    if (f.ptr !== null && f.ptr === 0 && f.showSentinel) {
      var spx = cellX(1) - CW - GAP - 18;
      D.pointer(ctx.stage, {
        x: spx + CW / 2, y: CY - 2,
        name: 'i', above: true, color: '#ffd166'
      });
    }

    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---- 场景一：朴素顺序查找 ---- */
  function buildNaive() {
    var steps = [];
    var a = SRC.slice(), cmp = 0;

    function snap(ptr, stArr, stats) {
      var s = {};
      for (var k = 0; k < stArr.length; k++) s[k + 1] = stArr[k];
      return { a: a.slice(), st: s, ptr: ptr, showSentinel: false,
               stats: stats || { '目标': TARGET_FOUND, '比较次数': cmp } };
    }
    function baseStates(hot, done) {
      var r = [];
      for (var k = 1; k <= N; k++) {
        if (k === hot) r.push('hot');
        else if (done && k < hot) r.push('done');
        else r.push('idle');
      }
      return r;
    }

    steps.push(step(snap(null, baseStates(-1, false), { '目标': TARGET_FOUND, '比较次数': 0 }),
      0, '从头开始，逐一比较每个元素，先检查下标是否越界，再比较关键字。',
      ['目标 key = ' + TARGET_FOUND, '从 i=1 开始']));

    for (var i = 1; i <= N; i++) {
      cmp++;
      var found = (a[i] === TARGET_FOUND);
      var st = baseStates(i, true);
      if (found) {
        st[i - 1] = 'good';
        steps.push(step(snap(i, st, { '目标': TARGET_FOUND, '比较次数': cmp, '位置': i }),
          2, 'a[' + i + '] = ' + a[i] + ' 等于目标 ' + TARGET_FOUND + '，查找成功！共比较 ' + cmp + ' 次。',
          ['a[' + i + '] == key', '找到，返回 ' + i]));
        break;
      } else {
        steps.push(step(snap(i, st, { '目标': TARGET_FOUND, '比较次数': cmp }),
          2, 'a[' + i + '] = ' + a[i] + ' 不等于目标 ' + TARGET_FOUND + '，继续往后。每步要做两次判断：i≤n 且 a[i]≠key。',
          ['a[' + i + '] ≠ key', 'i++ → ' + (i + 1)]));
      }
    }

    steps.push(step(snap(null, baseStates(-1, false), { '目标': TARGET_FOUND, '比较次数': cmp, 'ASL成功': '(n+1)/2' }),
      -1, '朴素查找：每轮循环做两次比较（越界判断 + 关键字判断）。平均成功 ASL = (n+1)/2 = ' +
          ((N + 1) / 2).toFixed(1) + '。',
      ['成功 ASL = (n+1)/2', '失败 ASL = n+1']));
    return steps;
  }

  /* ---- 场景二：哨兵顺序查找 ---- */
  function buildSentinel() {
    var steps = [];
    var a = SRC.slice();
    a[0] = TARGET_FOUND; // 哨兵放下标0
    var cmp = 0;

    function snap(ptr, stObj, stats) {
      return { a: a.slice(), st: stObj || {}, ptr: ptr,
               showSentinel: true, stats: stats || { '目标': TARGET_FOUND, '比较次数': cmp } };
    }

    steps.push(step(snap(null, {}),
      0, '哨兵技巧：把目标值先存到 a[0]，然后从 a[n] 往前找，循环条件只写 a[i]≠key，越界时必然命中 a[0]。',
      ['a[0] = key（哨兵）', 'i 从 n 向前']));

    for (var i = N; i >= 0; i--) {
      cmp++;
      var found = (a[i] === TARGET_FOUND && i > 0);
      var stObj = {};
      if (i === 0) { stObj[0] = 'bad'; }
      else { stObj[i] = found ? 'good' : 'hot'; }

      if (found) {
        steps.push(step(snap(i, stObj, { '目标': TARGET_FOUND, '比较次数': cmp, '位置': i }),
          2, 'a[' + i + '] = ' + a[i] + ' 命中！哨兵只需一次比较，省掉了越界判断，循环更简洁。',
          ['a[' + i + '] == key', '找到，返回 i=' + i]));
        break;
      } else if (i === 0) {
        steps.push(step(snap(0, stObj, { '目标': TARGET_FOUND, '比较次数': cmp, '结果': '未找到' }),
          2, 'i 退到 0 号位（哨兵），说明 1..n 里没有目标值，查找失败。哨兵使循环不需单独判断 i>0。',
          ['命中哨兵', '查找失败，返回 0']));
        break;
      } else {
        steps.push(step(snap(i, stObj, { '目标': TARGET_FOUND, '比较次数': cmp }),
          2, 'a[' + i + '] = ' + a[i] + ' 不是目标，i-- 向前。只比较一次关键字，比朴素版少一半判断。',
          ['a[' + i + '] ≠ key', 'i-- → ' + (i - 1)]));
      }
    }

    steps.push(step(snap(null, {}),
      -1, '哨兵的本质：把"越界"变成一种"找到"，用同一个条件统一处理，减少每步的比较次数。',
      ['省掉越界判断', '循环体更简洁']));
    return steps;
  }

  /* ---- 场景三：ASL 分析 ---- */
  function buildASL() {
    var steps = [];
    var dn = 6;
    var demo = [0, 8, 15, 19, 27, 31, 42];
    var opt  = [0, 31, 27, 19, 42, 15, 8];

    function drawRow(c, arr, n, hilite3) {
      D.clear(c.stage);
      var cxl = 215, cyw = 178, cwd = 76, gapd = 4, chd = 46;
      c.stage.appendChild(D.text('查找长度:', {
        x: cxl, y: cyw - 24, 'class': 'vz-tag', fill: '#6d82ab', 'text-anchor': 'start'
      }));
      for (var i = 1; i <= n; i++) {
        var x = cxl + (i - 1) * (cwd + gapd);
        var col = hilite3 && i <= 3 ? D.C.done : D.C.idle;
        c.stage.appendChild(D.el('rect', { x: x, y: cyw, width: cwd, height: chd, rx: 7,
          fill: col.fill, stroke: col.stroke, 'stroke-width': 2 }));
        c.stage.appendChild(D.text(arr[i], { x: x + cwd/2, y: cyw + chd/2 + 7, 'class': 'vz-cellval' }));
        c.stage.appendChild(D.text(i, { x: x + cwd/2, y: cyw + chd + 17, 'class': 'vz-idx' }));
        c.stage.appendChild(D.text(i, { x: x + cwd/2, y: cyw - 12, 'class': 'vz-tag', fill: '#9fb4dc' }));
      }
    }

    steps.push({ line: 0, narr: '找 a[i] 需 i 次比较。等概率时 ASL成功 = (1+2+…+n)/n = (n+1)/2，时间复杂度 O(n)。',
      act: ['ASL = (n+1)/2', '本例 = ' + ((dn+1)/2).toFixed(1), 'O(n)'],
      run: function (c) {
        drawRow(c, demo, dn, false);
        c.stats = { 'n': dn, '成功ASL': ((dn+1)/2).toFixed(1), '失败ASL': dn+1, '复杂度': 'O(n)' };
      } });

    steps.push({ line: 1, narr: '失败时要走完全部 n 个，再碰越界或哨兵，共比较 n+1 次。失败 ASL = n+1。',
      act: ['失败 ASL = n+1', '本例 = ' + (dn+1)],
      run: function (c) {
        drawRow(c, demo, dn, false);
        c.stats = { 'n': dn, '失败ASL': dn+1, '成功ASL': ((dn+1)/2).toFixed(1), '复杂度': 'O(n)' };
      } });

    steps.push({ line: 2, narr: '若高频元素排前面，ASL 可以低于 (n+1)/2。绿色前3个访问频率高，期望比较次数更少。',
      act: ['高频前移', 'ASL = Σ(p_i·i)', '< (n+1)/2'],
      run: function (c) {
        drawRow(c, opt, dn, true);
        c.stage.appendChild(D.text('高频元素（绿）排前面', {
          x: 500, y: 148, 'class': 'vz-tag', fill: '#2ecc71'
        }));
        c.stats = { '优化策略': '高频前移', '成功ASL': '< (n+1)/2', '条件': '概率已知', '复杂度': 'O(n)' };
      } });

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['sequential-search'] = {
    title: '顺序查找 Sequential Search',
    subtitle: '最朴素的查找：逐个比较直到找到或耗尽。哨兵技巧让循环少一半判断，却不改变 O(n) 的本质。',
    height: 700,
    code: [
      'int SeqSearch(ST a, int n, KeyType key) {',
      '    for (i = 1; i <= n; i++)',
      '        if (a[i] == key) return i;',
      '    return 0;'
    ],
    scenes: [
      { name: '朴素查找', build: buildNaive,
        codeTag: '两次判断版',
        code: [
          'int SeqSearch(ST a, int n, KeyType key) {',
          '    for (i = 1; i <= n; i++)       // 逐一扫描',
          '        if (a[i] == key) return i;  // 找到返回下标',
          '    return 0;                        // 未找到'
        ] },
      { name: '哨兵查找', build: buildSentinel,
        codeTag: '哨兵版（省越界判断）',
        code: [
          'int SentinelSearch(ST a, int n, KeyType key) {',
          '    a[0] = key;               // 哨兵',
          '    i = n;',
          '    while (a[i] != key) i--;  // 只需一次比较',
          '    return i;                  // 0 表示未找到'
        ] },
      { name: 'ASL 分析', build: buildASL,
        codeTag: 'ASL 期望分析',
        code: [
          '// 等概率：ASL成功 = (n+1)/2',
          '// 失败：ASL = n+1',
          '// 高频前移可降低 ASL',
          '// 时间复杂度 O(n)'
        ] }
    ]
  };
})();
