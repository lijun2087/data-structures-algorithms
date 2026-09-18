/* 朴素模式匹配 BF — 第4章
 * 场景一：普通例子 —— S 与 T 上下对齐逐字比；一旦失配，i 退回本轮起点的
 *         下一格、j 归零，等于把 T 整体右移一格从头再来。
 * 场景二：退化例子 —— S = "aaaaab"、T = "aaab"，每轮都要比到最后一个字符
 *         才发现不匹配，O(n×m) 的上界就是这么来的。
 * 快照模板同 insertion-sort.js：build() 里算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：主串最长 13 格，格宽 38、间隙 6，自 x=112 起，末格止于 678；
   * 右侧 x=700 之后留给提示文字，最宽到 976。
   * 竖直方向自上而下：标题 100、说明 122 / 144、i 标记 164、
   * S 格 172…208、S 下标 222、对齐标注 238、T 格 252…288、
   * T 下标 302、j 标记 322 —— 全在 330 以内，不会压到旁白。 */
  var CX0 = 112, CW = 38, CG = 6;
  var SY = 172, TY = 252, CH = 36;
  var NX = 700;

  function cxOf(i) { return CX0 + i * (CW + CG); }
  function ccOf(i) { return cxOf(i) + CW / 2; }

  // 每帧都要留一份状态字典的副本，不然后退重放会串味
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  /* 画一行字符格。at 给出每格对应的主串下标（T 是错位摆的），
   * idx 决定下标标签写的是主串下标还是模式串下标。 */
  function row(ctx, chars, states, at, y, idx) {
    var i, x, c;
    for (i = 0; i < chars.length; i++) {
      x = cxOf(at(i));
      c = D.C[states[i] || 'idle'];
      ctx.stage.appendChild(D.el('rect', { x: x, y: y, width: CW, height: CH,
        rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      ctx.stage.appendChild(D.text(chars[i],
        { x: x + CW / 2, y: y + 24, 'class': 'vz-cellval' }));
      ctx.stage.appendChild(D.text(idx(i),
        { x: x + CW / 2, y: y + CH + 14, 'class': 'vz-idx' }));
    }
  }

  /* f = { s, t, start, i, j, sst, tst, hdr, cap1, cap2,
   *       align:bool, guide:bool, notes, stats } */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var m = f.t.length, n = f.s.length, bx, i;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 122, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 144, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    // 本轮对齐窗口：虚线框圈出 T 当前压在 S 的哪一段，右移一格看得见
    if (f.align) {
      bx = cxOf(f.start);
      ctx.stage.appendChild(D.el('rect', { x: bx - 4, y: 166,
        width: (m - 1) * (CW + CG) + CW + 8, height: 122, rx: 8,
        fill: 'none', stroke: D.LINE.ptr, 'stroke-width': 1.5,
        'stroke-dasharray': '5 4' }));
      ctx.stage.appendChild(D.text('本轮对齐 S[' + f.start + ']', {
        x: bx - 4 + ((m - 1) * (CW + CG) + CW + 8) / 2, y: 238,
        'class': 'vz-tag', fill: '#6ceaa5' }));
    }
    // 当前比较的那一列：S 格底与 T 格顶之间连一小段竖线
    if (f.guide && f.i >= 0 && f.i < n) {
      ctx.stage.appendChild(D.el('line', { x1: ccOf(f.i), y1: SY + CH + 20,
        x2: ccOf(f.i), y2: TY - 4, stroke: D.LINE.hot, 'stroke-width': 2 }));
    }

    ctx.stage.appendChild(D.text('主串 S', { x: 44, y: SY + 24,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    ctx.stage.appendChild(D.text('模式 T', { x: 44, y: TY + 24,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    row(ctx, f.s, f.sst, function (k) { return k; },
        SY, function (k) { return k; });
    row(ctx, f.t, f.tst, function (k) { return f.start + k; },
        TY, function (k) { return k; });

    ctx.stage.appendChild(D.text('i ↓ ' + f.i,
      { x: f.i < n ? ccOf(f.i) : ccOf(n - 1) + 46, y: 164, 'class': 'vz-ptr' }));
    ctx.stage.appendChild(D.text('j ↑ ' + f.j,
      { x: f.j < m ? ccOf(f.start + f.j) : ccOf(f.start + m - 1) + 46,
        y: 322, 'class': 'vz-ptr', fill: '#ff9f6b' }));

    for (i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: NX, y: 180 + i * 25, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---------- BF 的公共驱动 ---------- */
  /* 一轮 = 从某个对齐位置起连着比，比到底就成功、比崩了就整体右移一格重来。
   * i 与 j 始终满足 start = i − j，所以对齐位置不用另存，随时能推出来。 */
  function driver(S, T, mkHdr) {
    var steps = [], n = S.length, m = T.length;
    var s = S.split(''), t = T.split('');
    var i = 0, j = 0, cmp = 0, back = 0, rnd = 1;

    /* o = { i, j, res, hdr, cap1, cap2, guide, notes, stats }
     * res 是当前比较格的着色：'hot' 待比、'good' 相等、'bad' 失配 */
    function snap(o) {
      var start = o.i - o.j, sst = [], tst = [], k;
      for (k = 0; k < n; k++) {
        if (k === o.i && o.res) sst[k] = o.res;
        else if (k >= start && k < o.i) sst[k] = 'good';
        else sst[k] = 'idle';
      }
      for (k = 0; k < m; k++) {
        if (k === o.j && o.res) tst[k] = o.res;
        else if (k < o.j) tst[k] = 'good';
        else tst[k] = 'idle';
      }
      return { s: s, t: t, start: start, i: o.i, j: o.j,
               sst: sst, tst: tst, align: true, guide: !!o.guide,
               hdr: o.hdr || mkHdr(rnd, start), cap1: o.cap1 || null,
               cap2: o.cap2 || null, notes: o.notes || [],
               stats: o.stats || { '本轮起点': start, 'i / j': o.i + ' / ' + o.j,
                                   '比较次数': cmp, 'i 回退次数': back } };
    }

    steps.push(step(snap({ i: 0, j: 0,
      hdr: 'BF 的思路：把 T 挨个位置试一遍',
      cap1: 'i 走主串、j 走模式串，先把 T 的头对齐到 S[0]',
      cap2: '这一轮不成就整体右移一格再来 —— 试到成功或者主串走完为止',
      notes: ['主串长 n = ' + n + '，模式长 m = ' + m,
        '虚线框是本轮 T 压住的那一段',
        'i 与 j 始终满足 start = i − j',
        '最多要试 n − m + 1 个对齐位置'] }), 0,
      'BF 就是最直白的办法：把 T 的头依次对齐到 S 的每一个位置，每次都从 T 的头开始逐字比。' +
      '比崩了就把 T 整体右移一格，从头再比。',
      ['i = 0，j = 0', 'T 的头先对齐 S[0]', '不成就右移一格重试']));

    while (i < n && j < m) {
      var eq = s[i] === t[j], at = i, aj = j;
      cmp++;
      if (eq) {
        steps.push(step(snap({ i: i, j: j, res: 'good', guide: true,
          cap1: 'S[' + at + '] = ' + s[at] + '　T[' + aj + '] = ' + t[aj] +
                '　相等，i 与 j 一起往后走',
          cap2: '本轮已经对上 ' + (aj + 1) + ' 个字符，绿格就是攒下来的战果',
          notes: ['比较 S[' + at + '] 与 T[' + aj + ']：相等',
            'i：' + at + ' → ' + (at + 1),
            'j：' + aj + ' → ' + (aj + 1),
            '累计比较 ' + cmp + ' 次'] }), 3,
          'S[' + at + '] 和 T[' + aj + '] 都是 ' + s[at] + '，对上了，i 和 j 各加一继续往后比。' +
          '这一轮已经连着对上 ' + (aj + 1) + ' 个字符。',
          ['S[' + at + '] == T[' + aj + ']', 'i → ' + (at + 1) + '，j → ' + (aj + 1),
           '本轮已匹配 ' + (aj + 1) + ' 个']));
        i++; j++;
      } else {
        var ni = i - j + 1;
        steps.push(step(snap({ i: i, j: j, res: 'bad', guide: true,
          cap1: 'S[' + at + '] = ' + s[at] + '　T[' + aj + '] = ' + t[aj] +
                '　失配，本轮就此作废',
          cap2: aj > 0 ? '前面对上的 ' + aj + ' 个字符白比了 —— BF 一点也不留' :
                         '第一个字符就没对上，这一轮只花了一次比较',
          notes: ['比较 S[' + at + '] 与 T[' + aj + ']：不等',
            '本轮已对上的 ' + aj + ' 个字符全部作废',
            'i 要退回 i − j + 1 = ' + ni,
            'j 要归零，从 T 的头重新来'] }), 2,
          'S[' + at + '] 是 ' + s[at] + '，T[' + aj + '] 是 ' + t[aj] + '，失配。' +
          (aj > 0 ? '本轮前面对上的 ' + aj + ' 个字符全部作废，' : '') +
          '接下来 i 退回 ' + ni + '、j 归零。',
          ['S[' + at + '] != T[' + aj + ']',
           aj > 0 ? '已匹配的 ' + aj + ' 个作废' : '首字符就不等',
           '准备回退重试']));
        i = ni; j = 0; back++; rnd++;
        steps.push(step(snap({ i: i, j: j,
          cap1: 'i = i − j + 1 = ' + i + '，j = 0 —— T 整体右移一格重来',
          cap2: '注意 i 是往回走的：它退到了上一轮起点的下一格，这才是 BF 慢的病根',
          notes: ['i 回退到 ' + i + '，j 归零',
            'i − j + 1 就是上一轮起点加一',
            '虚线框整体右移了一格',
            '已经回退 ' + back + ' 次'] }), 5,
          'i = i − j + 1 = ' + i + '，j = 0。i 往回走了 —— 它退到上一轮起点的下一格，' +
          '看画面就是 T 整体右移一格。主串指针来回跑，正是 BF 慢的病根。',
          ['i 回退到 ' + i + '，j = 0', 'T 整体右移一格',
           '第 ' + rnd + ' 轮开始']));
      }
    }
    return { steps: steps, i: i, j: j, cmp: cmp, back: back,
             snap: snap, n: n, m: m, rnd: rnd };
  }

  /* ---------- 场景一：普通例子 ---------- */
  /* S = "acabaabaabcac"，T = "abaabcac"。中间有一轮已经对上 5 个字符才失配，
   * 那 5 次比较全白费 —— 这正是 KMP 要抢回来的东西。 */
  function buildNormal() {
    var S = 'acabaabaabcac', T = 'abaabcac';
    var r = driver(S, T, function (rnd, start) {
      return 'BF 匹配　第 ' + rnd + ' 轮，T 的头压在 S[' + start + ']';
    });
    var steps = r.steps, pos = r.i - r.m;

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: '匹配成功　返回 i − m = ' + pos,
      cap1: 'j 走到了 ' + r.m + ' 等于 T 的长度 —— T 已经整段对上',
      cap2: '成功位置是 i − m = ' + pos + '，一共比了 ' + r.cmp +
            ' 次、i 回退了 ' + r.back + ' 次',
      stats: { '匹配位置': pos, '比较次数': r.cmp,
               'i 回退次数': r.back, '试过的对齐位': r.rnd },
      notes: ['j == m，T 整段匹配上了',
        '返回本轮起点 i − m = ' + pos,
        '总比较 ' + r.cmp + ' 次，理想值只需 ' + r.m + ' 次',
        '多出来的都是回退重比的开销'] }), 7,
      'j 走到 ' + r.m + '，等于 T 的长度，说明 T 整段都对上了，返回本轮起点 i − m = ' + pos +
      '。代价是比了 ' + r.cmp + ' 次、i 回退了 ' + r.back + ' 次。',
      ['j == m，匹配成功', '返回位置 ' + pos, '共比较 ' + r.cmp + ' 次']));

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: 'BF 亏在哪：失配时把已知的信息全扔了',
      cap1: '第 3 轮已经对上 abaab 五个字符，一失配就退回去从头再比',
      cap2: '可那 5 个字符是什么我们明明知道 —— T 自己的结构本来就能告诉我们该退多少',
      stats: { '白费的比较': (r.cmp - r.m) + ' 次', 'i 回退': r.back + ' 次',
               '时间复杂度': 'O(n×m)', '出路': 'KMP' },
      notes: ['失配时已匹配的那一段被彻底丢弃',
        'i 回退，等于把读过的主串又读一遍',
        '而这一段的内容就是 T 的前缀，早就知道',
        'KMP 就是靠它算出 j 该退到哪'] }), 9,
      'BF 亏的地方在这里：失配时把本轮已经对上的信息全扔了，i 退回去重读主串。' +
      '可那一段就是 T 的前缀，内容是已知的 —— KMP 正是用它算出 j 该退到哪，让 i 不必回头。',
      ['已匹配的信息被丢弃', 'i 回退 = 主串重读',
       '下一节：KMP 让 i 不回退']));
    return steps;
  }

  /* ---------- 场景二：退化例子，O(n×m) 的由来 ---------- */
  /* S = "aaaaab"、T = "aaab"：每一轮都要比到 T 的最后一个字符才发现不对，
   * 每轮几乎白费 m 次比较，总量就贴到 (n − m + 1) × m 的上界。 */
  function buildWorst() {
    var S = 'aaaaab', T = 'aaab';
    var r = driver(S, T, function (rnd, start) {
      return '最坏情况　第 ' + rnd + ' 轮，T 的头压在 S[' + start + ']';
    });
    var steps = r.steps, pos = r.i - r.m;

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: '匹配成功　但代价贴到了上界',
      cap1: 'n = 6、m = 4，理想只要 4 次比较，实际比了 ' + r.cmp + ' 次',
      cap2: '每一轮都是前 3 个 a 全对上、到第 4 个字符才失配 —— 白费的比较最多',
      stats: { '匹配位置': pos, '比较次数': r.cmp,
               'i 回退次数': r.back, '上界': '(n−m+1)×m = ' + ((r.n - r.m + 1) * r.m) },
      notes: ['每轮都要比到 T 的末尾才发现不对',
        '每轮白费将近 m 次比较',
        '共 n − m + 1 个对齐位置',
        '总量贴到 (n−m+1)×m'] }), 7,
      '匹配成功了，可代价贴到上界：n = 6、m = 4，理想只要 4 次比较，实际比了 ' + r.cmp +
      ' 次。因为每轮的前 3 个 a 都能对上，非要比到第 4 个字符才发现不对。',
      ['比较 ' + r.cmp + ' 次，理想 4 次', '每轮都比到 T 末尾',
       'i 回退 ' + r.back + ' 次']));

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: 'O(n×m) 就是这么来的',
      cap1: '对齐位置有 n − m + 1 个，每个位置最多比 m 次 —— 乘起来就是 O(n×m)',
      cap2: '把串加长看得更清楚：S 是 10 万个 a 加一个 b，T 是 1000 个 a 加一个 b，' +
            '要比一亿次',
      stats: { '对齐位置数': r.n - r.m + 1, '每轮最多': r.m + ' 次',
               '最坏复杂度': 'O(n×m)', 'KMP': 'O(n+m)' },
      notes: ['对齐位置 n − m + 1 个',
        '每个位置最多比 m 次',
        '最坏 O(n×m)，平均 O(n+m)',
        'KMP 把最坏也压到 O(n+m)'] }), 9,
      '对齐位置有 n − m + 1 个，每个位置最多比 m 次，乘起来就是 O(n×m)。' +
      '换成 10 万个 a 的主串、1000 个 a 的模式串，要比一亿次 —— KMP 能把它压到 O(n+m)。',
      ['n−m+1 个位置 × 每轮 m 次', '最坏 O(n×m)',
       'KMP 可做到 O(n+m)']));
    return steps;
  }

  var CODE = [
    'int Index_BF(S, T) {',
    '  i = 0; j = 0;',
    '  while (i < n && j < m) {',
    '    if (S[i] == T[j]) { i++; j++; }      // 对上就一起往后走',
    '    else {',
    '      i = i - j + 1;  j = 0;             // 失配：i 退回本轮起点的下一格',
    '    }                                    // j 归零，从 T 的头重新比',
    '  }',
    '  if (j >= m) return i - m;              // 整段对上，返回起始下标',
    '  return -1;                             // 主串走完还没对上',
    '}'
  ];

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['string-bf-match'] = {
    title: '朴素模式匹配 BF Brute Force',
    subtitle: '把模式串 T 的头依次对齐到主串 S 的每个位置逐字比对。失配时 i 退回 i−j+1、j 归零 —— 主串指针回退把已知的信息全扔了，这就是 BF 最坏要 O(n×m) 的病根。',
    height: 700,
    code: CODE,
    scenes: [
      { name: '普通例子', build: buildNormal,
        codeTag: 'Index_BF：i 会回退' , code: CODE },
      { name: '最坏情况 O(n×m)', build: buildWorst,
        codeTag: 'S = aaaaab，T = aaab', code: CODE }
    ]
  };
})();
