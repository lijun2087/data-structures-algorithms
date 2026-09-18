/* KMP 算法与 next 数组 — 第4章
 * 场景一：next 的含义 —— next[j] 是 T 前 j 个字符里「最长的、既是前缀又是后缀」
 *         那一段的长度。用书上的 T = "abaabcac" 逐个 j 把这两段圈出来。
 * 场景二：求 next —— 让 T 自己跟自己错位匹配，递推出整张表。
 * 场景三：KMP 匹配 —— 主串指针 i 永不回退，失配只让 j 退到 next[j]，
 *         画面上就是 T 向右滑动。和 BF 的 i 回退对照着看。
 * 快照模板同 insertion-sort.js：build() 里算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var T = 'abaabcac';                    // 书上的例子，m = 8
  var M = T.length;
  var NX = [-1, 0, 0, 1, 1, 2, 0, 1];    // 0 起标的 next；书上 1 起标的值是它加一

  /* 两套格子几何：
   * P 系列给只画模式串的场景一、二 —— 格宽 48、间隙 8，自 x=200 起，8 格止于 640；
   * S 系列给要画主串的场景三 —— 格宽 38、间隙 6，自 x=112 起，13 格止于 678。
   * 右侧提示文字从 x=700 起，不会挤到。 */
  var PW = 48, PG = 8, PX0 = 200;
  var SW = 38, SG = 6, SX0 = 112;
  var NOTEX = 700;

  function pxOf(i) { return PX0 + i * (PW + PG); }
  function pcOf(i) { return pxOf(i) + PW / 2; }
  function pWide(n) { return (n - 1) * (PW + PG) + PW; }
  function sxOf(i) { return SX0 + i * (SW + SG); }
  function scOf(i) { return sxOf(i) + SW / 2; }
  function sWide(n) { return (n - 1) * (SW + SG) + SW; }

  // 每帧都留一份副本，不然后退重放会串味
  function cp(a) { return a.slice(); }

  /* 通用的一行字符格。xf 给出第 k 格的左边界，lab 给出下标标签（传 null 不画）。 */
  function row(ctx, chars, states, xf, y, w, h, lab, vcls) {
    var i, x, c;
    for (i = 0; i < chars.length; i++) {
      if (chars[i] === null) continue;
      x = xf(i);
      c = D.C[states[i] || 'idle'];
      ctx.stage.appendChild(D.el('rect', { x: x, y: y, width: w, height: h,
        rx: 6, fill: c.fill, stroke: c.stroke, 'stroke-width': 2,
        filter: 'url(#vzGlow)' }));
      ctx.stage.appendChild(D.text(chars[i],
        { x: x + w / 2, y: y + h * 0.66, 'class': vcls || 'vz-cellval' }));
      if (lab) {
        ctx.stage.appendChild(D.text(lab(i),
          { x: x + w / 2, y: y + h + 14, 'class': 'vz-idx' }));
      }
    }
  }

  function caps(ctx, f) {
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
  }

  function notes(ctx, f, y0) {
    for (var i = 0; i < f.notes.length && i < 4; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: NOTEX, y: y0 + i * 25, 'class': 'vz-info' }));
    }
  }

  // 虚线框：圈住第 a…b 格（P 系列几何）
  function pbox(ctx, a, b, y, h, color, label, ly) {
    ctx.stage.appendChild(D.el('rect', { x: pxOf(a) - 4, y: y,
      width: pWide(b - a + 1) + 8, height: h, rx: 8, fill: 'none',
      stroke: color, 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
    ctx.stage.appendChild(D.text(label,
      { x: pxOf(a) - 4 + (pWide(b - a + 1) + 8) / 2, y: ly,
        'class': 'vz-tag', fill: color }));
  }

  function step(f, render, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---------- 场景一：next[j] 到底在说什么 ---------- */
  /* 上下摆两行同样的 T[0..j-1]：上行圈前缀段，下行圈后缀段，
   * 两段之间牵连线表示它们逐字相等。竖直方向：
   * 标题 100、说明 122 / 144、前缀标注 164、上行格 176…218、
   * 后缀标注 240、下行格 252…294、下标 308 —— 都在 330 以内。 */
  var AY = 176, BY = 252, PH = 42;

  /* f = { up, dn, ust, dst, pa, pb, sa, sb, link, hdr, cap1, cap2, notes, stats } */
  function renderMeaning(ctx, f) {
    D.clear(ctx.stage);
    var i;
    caps(ctx, f);

    ctx.stage.appendChild(D.text('看前缀', { x: 44, y: AY + 27,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    ctx.stage.appendChild(D.text('看后缀', { x: 44, y: BY + 27,
      'class': 'vz-lab', fill: '#b9c8e6' }));

    row(ctx, f.up, f.ust, pxOf, AY, PW, PH, null);
    row(ctx, f.dn, f.dst, pxOf, BY, PW, PH, function (k) { return k; });

    if (f.pb >= f.pa) {
      pbox(ctx, f.pa, f.pb, AY - 6, PH + 12, D.LINE.next,
           '前缀段 · 长 ' + (f.pb - f.pa + 1), AY - 12);
    }
    if (f.sb >= f.sa) {
      pbox(ctx, f.sa, f.sb, BY - 6, PH + 12, D.LINE.prev,
           '后缀段 · 长 ' + (f.sb - f.sa + 1), BY - 12);
    }
    // 连线：前缀第 i 个字符对上后缀第 i 个字符，逐字相等才算数
    for (i = 0; i < f.link; i++) {
      ctx.stage.appendChild(D.el('line', {
        x1: pcOf(f.pa + i), y1: AY + PH + 2,
        x2: pcOf(f.sa + i), y2: BY - 2,
        stroke: D.LINE.ptr, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
    }

    notes(ctx, f, 186);
    ctx.stats = f.stats || {};
  }

  /* 造一帧：只摆出 T 的前 j 个字符，pa…pb 是前缀段，sa…sb 是后缀段 */
  function mkMeaning(j, k, o) {
    var up = [], dn = [], ust = [], dst = [], i;
    for (i = 0; i < M; i++) {
      up[i] = i < j ? T.charAt(i) : null;
      dn[i] = i < j ? T.charAt(i) : null;
      ust[i] = i < k ? 'active' : 'idle';
      dst[i] = (i >= j - k && i < j) ? 'hot' : 'idle';
    }
    if (k <= 0) { for (i = 0; i < M; i++) { ust[i] = 'idle'; dst[i] = 'idle'; } }
    return { up: up, dn: dn, ust: ust, dst: dst,
             pa: 0, pb: k - 1, sa: j - k, sb: j - 1, link: k > 0 ? k : 0,
             hdr: o.hdr, cap1: o.cap1, cap2: o.cap2,
             notes: o.notes || [], stats: o.stats || {} };
  }

  function buildMeaning() {
    var steps = [], j, k, pre, suf, cur;

    steps.push(step(mkMeaning(M, 0, {
      hdr: 'next[j] 的定义：前缀与后缀最长能重合多少',
      cap1: 'T = "' + T + '"，m = ' + M + '　—— 整张 next 表只跟 T 有关，跟主串无关',
      cap2: 'next[j]：T 的前 j 个字符里，最长的那一段「既是前缀又是后缀」有多长',
      stats: { 'T': T, 'm': M, 'next 表长': M, '与主串': '无关' },
      notes: ['next 是 T 自己的性质',
        '换主串也不必重算',
        '下面按 j 从小到大一个个看',
        '上行圈前缀，下行圈后缀'] }), renderMeaning, 0,
      'KMP 的秘密全在 next 数组里。它只由模式串 T 决定，跟主串没有半点关系 —— 一次算好可以反复用。',
      ['T = ' + T + '，m = ' + M, 'next 只由 T 决定', '先弄清定义']));

    for (j = 1; j < M; j++) {
      k = NX[j];
      cur = T.slice(0, j); pre = T.slice(0, k); suf = T.slice(j - k, j);
      steps.push(step(mkMeaning(j, k, {
        hdr: 'j = ' + j + '　考察 T[0..' + (j - 1) + '] = "' + cur + '"',
        cap1: k > 0 ? '前缀 "' + pre + '" 与后缀 "' + suf + '" 逐字相等，长 ' + k +
                      '　再长一格就对不上了'
                    : (j === 1 ? '只有一个字符，而前缀后缀都不许取整段，所以只能是空串'
                               : '首字符 ' + T.charAt(0) + ' 与末字符 ' +
                                 T.charAt(j - 1) + ' 就不同，一个都对不上'),
        cap2: 'next[' + j + '] = ' + k + (k > 0 ? '　虚线连的就是逐字相等的那几对' : ''),
        stats: { 'j': j, '前缀段': k > 0 ? pre : '空',
                 '后缀段': k > 0 ? suf : '空', 'next': k },
        notes: ['考察 "' + cur + '" 这 ' + j + ' 个字符',
          k > 0 ? '前缀 "' + pre + '" = 后缀 "' + suf + '"' : '没有非空的公共前后缀',
          '不许取整段 —— 否则永远等于自己',
          'next[' + j + '] = ' + k] }), renderMeaning, 6,
        '前 ' + j + ' 个字符是 "' + cur + '"。' +
        (k > 0 ? '最长的公共前后缀是 "' + pre + '"，长 ' + k + '，所以 next[' + j +
                 '] = ' + k + '。' +
                 (k >= 2 ? '注意它是「最长」的，取短了会白跳一趟。' : '')
               : '找不到非空的公共前后缀，next[' + j + '] = 0。'),
        ['T[0..' + (j - 1) + '] = ' + cur,
         k > 0 ? '公共前后缀 "' + pre + '"，长 ' + k : '公共前后缀为空',
         'next[' + j + '] = ' + k]));
    }

    steps.push(step(mkMeaning(5, 2, {
      hdr: 'next 有什么用：失配时 j 该退到哪',
      cap1: '假设比到 T[5] 才失配 —— 前 5 个字符 "abaab" 已经和主串对上了',
      cap2: '主串末尾那两个字符必然是 "ab"，正好是 T 的前缀 —— 所以 j 直接退到 2 接着比',
      stats: { '已匹配': 'abaab', '公共前后缀': 'ab', 'j 退到': 'next[5] = 2',
               'i': '一步不退' },
      notes: ['已匹配段的后缀 = T 的前缀',
        '这 2 个字符不用再比一遍',
        'j 从 5 退到 next[5] = 2',
        '主串指针 i 停在原地不动'] }), renderMeaning, 9,
      '这就是它的用处：T[5] 失配时，主串末尾那两个字符一定是 "ab"，正好是 T 的前缀。' +
      '所以 j 退到 2 就行，i 一步都不用退。',
      ['已匹配段的后缀 = T 的前缀', 'j: 5 → next[5] = 2', 'i 原地不动']));

    return steps;
  }

  /* ---------- 场景二：让 T 自己跟自己错位匹配，递推出整张表 ---------- */
  /* 上行是 T 本体（走 i），下行是 T 的一份副本右移 offset = i − j 格（走 j）。
   * 竖直方向：标题 100、说明 122 / 144、i 标记 164、上行 172…208、下标 222、
   * 错位标注 238、下行 252…288、下标 302、j 标记 322。
   * 右侧 702 起画 next 表，下面留 3 行提示，全在 330 以内。 */
  var UY = 172, DY = 252, RH = 36;
  var TW = 26, TG = 3, TX0 = 744;   // 8 格止于 973，错位框最远到 730，不会碰上

  function txOf(i) { return TX0 + i * (TW + TG); }

  /* f = { off, i, j, ust, dst, res, tbl, hdr, cap1, cap2, notes, stats } */
  function renderNext(ctx, f) {
    D.clear(ctx.stage);
    var i, x, c, v;
    caps(ctx, f);

    // 错位窗口：下行副本压住上行的哪一段
    ctx.stage.appendChild(D.el('rect', { x: sxOf(f.off) - 4, y: 166,
      width: sWide(M) + 8, height: 122, rx: 8, fill: 'none',
      stroke: D.LINE.ptr, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
    ctx.stage.appendChild(D.text('副本右移 ' + f.off + ' 格',
      { x: sxOf(f.off) - 4 + (sWide(M) + 8) / 2, y: 238,
        'class': 'vz-tag', fill: '#6ceaa5' }));
    if (f.res) {
      ctx.stage.appendChild(D.el('line', { x1: scOf(f.i), y1: UY + RH + 20,
        x2: scOf(f.i), y2: DY - 4, stroke: D.LINE.hot, 'stroke-width': 2 }));
    }

    ctx.stage.appendChild(D.text('T 本体', { x: 30, y: UY + 24,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    ctx.stage.appendChild(D.text('T 副本', { x: 30, y: DY + 24,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    row(ctx, T.split(''), f.ust, sxOf, UY, SW, RH,
        function (k) { return k; });
    row(ctx, T.split(''), f.dst,
        function (k) { return sxOf(f.off + k); }, DY, SW, RH,
        function (k) { return k; });

    ctx.stage.appendChild(D.text('i ↓ ' + f.i,
      { x: scOf(f.i), y: 164, 'class': 'vz-ptr' }));
    ctx.stage.appendChild(D.text('j ↑ ' + f.j,
      { x: scOf(f.off + f.j), y: 322, 'class': 'vz-ptr', fill: '#ff9f6b' }));

    // 右侧 next 表：算出来的填数字，没算到的留问号
    ctx.stage.appendChild(D.text('next 表', { x: TX0, y: 166,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    for (i = 0; i < M; i++) {
      x = txOf(i);
      v = f.tbl[i];
      c = D.C[v === null ? 'mute' : (i === f.i + 1 ? 'done' : 'good')];
      ctx.stage.appendChild(D.el('rect', { x: x, y: 176, width: TW,
        height: 28, rx: 5, fill: c.fill, stroke: c.stroke,
        'stroke-width': 2 }));
      ctx.stage.appendChild(D.text(v === null ? '?' : v,
        { x: x + TW / 2, y: 195, 'class': 'vz-cellval' }));
      ctx.stage.appendChild(D.text(i,
        { x: x + TW / 2, y: 218, 'class': 'vz-idx' }));
    }
    for (i = 0; i < f.notes.length && i < 3; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: TX0, y: 246 + i * 24, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  /* 求 next 的经典写法：i 走本体、j 走副本，j == −1 或两字符相等就一起进一，
   * 否则 j = next[j] 自己往回跳 —— 求表的过程本身就是一次 KMP 匹配。 */
  function nextDriver() {
    var steps = [], tbl = [], i, j, k;
    for (k = 0; k < M; k++) tbl[k] = null;

    /* o = { i, j, res, ... }；res 是当前比较格的着色 */
    function snap(o) {
      var off = o.i - o.j, ust = [], dst = [], k2;
      for (k2 = 0; k2 < M; k2++) {
        if (k2 === o.i && o.res) ust[k2] = o.res;
        else if (k2 >= off && k2 < o.i) ust[k2] = 'good';
        else ust[k2] = 'idle';
        if (k2 === o.j && o.res) dst[k2] = o.res;
        else if (k2 < o.j) dst[k2] = 'good';
        else dst[k2] = 'idle';
      }
      return { off: off, i: o.i, j: o.j, res: o.res || null,
               ust: ust, dst: dst, tbl: cp(tbl),
               hdr: o.hdr || '求 next　i 走本体、j 走副本，副本右移 ' + off + ' 格',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [],
               stats: o.stats || { 'i / j': o.i + ' / ' + o.j,
                 '副本右移': off, '已填': cntOf() + ' / ' + M,
                 '当前': o.res === 'bad' ? '失配' : '比较' } };
    }
    function cntOf() { var c = 0, k2; for (k2 = 0; k2 < M; k2++) if (tbl[k2] !== null) c++; return c; }

    i = 0; j = -1; tbl[0] = -1;
    steps.push(step(snap({ i: 0, j: -1,
      hdr: '求 next：让 T 自己跟自己错位匹配',
      cap1: 'next[0] = −1 是约定的哨兵 —— 它表示「连第一个字符都不必留，T 整体右移一格」',
      cap2: '本体从 i = 0 起，副本右移一格从 j = −1 起　j == −1 就是「副本还没摆上来」',
      stats: { 'next[0]': -1, 'i / j': '0 / −1', '已填': '1 / ' + M,
               '思路': 'T 与自身匹配' },
      notes: ['next[0] = −1 当哨兵',
        'i 找的是 next[i+1] 的值',
        'j 就是当前公共前后缀的长度'] }), renderNext, 1,
      '求 next 的巧处：公共前后缀本来就是 T 与自身的匹配结果，所以让 T 跟自己错位比一遍就能递推出来。' +
      'next[0] = −1 是哨兵。',
      ['next[0] = −1 哨兵', 'i 走本体，j 走副本', 'j 就是公共前后缀长度']));

    while (i < M - 1) {
      if (j === -1 || T.charAt(i) === T.charAt(j)) {
        var was = j, eqi = i;
        if (j >= 0) {
          steps.push(step(snap({ i: i, j: j, res: 'good',
            cap1: 'T[' + i + '] = ' + T.charAt(i) + '　T[' + j + '] = ' +
                  T.charAt(j) + '　相等 —— 公共前后缀又能长一格',
            cap2: '于是 next[' + (i + 1) + '] = j + 1 = ' + (j + 1),
            notes: ['T[' + i + '] == T[' + j + ']',
              '公共前后缀长度 ' + j + ' → ' + (j + 1),
              'next[' + (i + 1) + '] = ' + (j + 1)] }), renderNext, 3,
            'T[' + i + '] 和 T[' + j + '] 都是 ' + T.charAt(i) +
            '，公共前后缀从 ' + j + ' 长到 ' + (j + 1) + '，所以 next[' + (i + 1) +
            '] = ' + (j + 1) + '。',
            ['T[' + i + '] == T[' + j + ']',
             'i → ' + (i + 1) + '，j → ' + (j + 1),
             'next[' + (i + 1) + '] = ' + (j + 1)]));
        }
        i++; j++; tbl[i] = j;
        steps.push(step(snap({ i: i, j: j,
          cap1: 'next[' + i + '] = ' + j + ' 填好了　i、j 同时进一，接着往后推',
          cap2: was === -1 ? 'j 从 −1 进到 0 —— 副本整体右移一格，从头重新贴上去'
                           : '绿格就是当前对上的公共前后缀，长度正好是 j',
          notes: ['next[' + i + '] ← ' + j,
            was === -1 ? '副本右移一格重新贴' : '公共前后缀长 ' + j,
            '已填 ' + cntOf() + ' / ' + M] }), renderNext, 4,
          'next[' + i + '] = ' + j + ' 填好。' +
          (was === -1 ? 'j 从 −1 走到 0，画面上就是副本整体右移一格重新贴上去。'
                      : '绿格是已对上的公共前后缀，它有多长，j 就是多少。'),
          ['next[' + i + '] = ' + j, 'i → ' + i + '，j → ' + j,
           '已填 ' + cntOf() + ' / ' + M]));
      } else {
        var nj = tbl[j];
        steps.push(step(snap({ i: i, j: j, res: 'bad',
          cap1: 'T[' + i + '] = ' + T.charAt(i) + '　T[' + j + '] = ' +
                T.charAt(j) + '　失配 —— 当前这 ' + j + ' 长的前后缀撑不住了',
          cap2: '不从头重来，让 j 退到 next[' + j + '] = ' + nj + ' 试更短的那一档',
          notes: ['T[' + i + '] != T[' + j + ']',
            'j 退到 next[' + j + '] = ' + nj,
            'i 不动 —— 求表时 i 也不回退'] }), renderNext, 5,
          'T[' + i + '] 是 ' + T.charAt(i) + '，T[' + j + '] 是 ' + T.charAt(j) +
          '，失配。j 退到 next[' + j + '] = ' + nj + ' 换更短的一档再试，i 不动。',
          ['T[' + i + '] != T[' + j + ']',
           'j: ' + j + ' → next[' + j + '] = ' + nj, 'i 原地不动']));
        j = nj;
      }
    }
    return { steps: steps, tbl: tbl, snap: snap, i: i, j: j };
  }

  function buildNext() {
    var r = nextDriver(), steps = r.steps;

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: 'next 表算完了　next = [' + r.tbl.join(', ') + ']',
      cap1: 'i 走到 ' + r.i + ' = m − 1 就收工 —— next[0] 是哨兵，其余 ' + (M - 1) +
            ' 项都由前一项推来',
      cap2: '和这张表核对：next[3] = 1 因为 "aba" 头尾都是 a；next[5] = 2 因为 "abaab" 头尾都是 ab',
      stats: { 'next': r.tbl.join(','), '耗时': 'O(m)',
               'i 回退': '0 次', '空间': 'O(m)' },
      notes: ['整张表一次推完，O(m)',
        'i 从不回退，j 只往回跳',
        'j 减少的总量不超过增加的总量'] }), renderNext, 8,
      '整张表推完了：next = [' + r.tbl.join(', ') + ']。i 一路向前不回头，j 每次只往回跳，' +
      '总跳跃量不超过它涨上去的量，所以求表只花 O(m)。',
      ['next = ' + r.tbl.join(','), '求表耗时 O(m)', 'i 从不回退']));

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: '为什么失配时是 j = next[j] 而不是从头再来',
      cap1: '当前 j 长的前后缀撑不住，可更短的那一档也许还成立 —— next[j] 正是「次长」的那个',
      cap2: '一路退到 −1 就说明连一个字符都留不住，这时 i 进一、j 归零，等于 T 整体右移',
      stats: { '退一档': 'j = next[j]', '退到底': 'j = −1',
               '含义': '换更短的前后缀', '代价': '摊还 O(1)' },
      notes: ['next[j] 是次长的公共前后缀',
        '退档就是换更短的一档再试',
        'j = −1 时 T 整体右移一格'] }), renderNext, 5,
      'j = next[j] 的含义是「换短一档再试」：长的前后缀撑不住，次长的也许还成立。' +
      '一直退到 −1 才认输，那时 T 整体右移一格。',
      ['next[j] 是次长前后缀', '退档 = 换短一档再试', '退到 −1 才整体右移']));

    return steps;
  }

  /* ---------- 场景三：KMP 匹配 —— i 永不回退 ---------- */
  /* 几何同场景二：S 在上（13 格，止于 678），T 在下按 off = i − j 错位摆。
   * 右侧 744 起是 next 表，当前要跳去的那一项高亮；下面 3 行提示。 */
  var S3 = 'acabaabaabcac';

  // 右侧 next 表：hi 那一项用 done 色标出来（比如「j 要退到这里」）
  function tblRow(ctx, tbl, hi, lab) {
    var i, x, c;
    ctx.stage.appendChild(D.text(lab, { x: TX0, y: 166,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    for (i = 0; i < tbl.length; i++) {
      x = txOf(i);
      c = D.C[tbl[i] === null ? 'mute' : (i === hi ? 'done' : 'good')];
      ctx.stage.appendChild(D.el('rect', { x: x, y: 176, width: TW,
        height: 28, rx: 5, fill: c.fill, stroke: c.stroke, 'stroke-width': 2 }));
      ctx.stage.appendChild(D.text(tbl[i] === null ? '?' : tbl[i],
        { x: x + TW / 2, y: 195, 'class': 'vz-cellval' }));
      ctx.stage.appendChild(D.text(i,
        { x: x + TW / 2, y: 218, 'class': 'vz-idx' }));
    }
  }

  /* f = { i, j, off, sst, tst, res, hi, slide, hdr, cap1, cap2, notes, stats } */
  function renderMatch(ctx, f) {
    D.clear(ctx.stage);
    var n = S3.length, i;
    caps(ctx, f);

    // 对齐窗口：T 压在 S 的哪一段。它整体右移就是「T 向右滑动」
    ctx.stage.appendChild(D.el('rect', { x: sxOf(f.off) - 4, y: 166,
      width: sWide(M) + 8, height: 122, rx: 8, fill: 'none',
      stroke: f.slide ? D.LINE.hot : D.LINE.ptr, 'stroke-width': f.slide ? 2.5 : 1.5,
      'stroke-dasharray': '5 4' }));
    ctx.stage.appendChild(D.text(f.slide ? 'T 向右滑到 S[' + f.off + ']'
                                         : 'T 的头压在 S[' + f.off + ']',
      { x: sxOf(f.off) - 4 + (sWide(M) + 8) / 2, y: 238,
        'class': 'vz-tag', fill: f.slide ? '#ffd166' : '#6ceaa5' }));
    if (f.res) {
      ctx.stage.appendChild(D.el('line', { x1: scOf(f.i), y1: UY + RH + 20,
        x2: scOf(f.i), y2: DY - 4, stroke: D.LINE.hot, 'stroke-width': 2 }));
    }

    ctx.stage.appendChild(D.text('主串 S', { x: 30, y: UY + 24,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    ctx.stage.appendChild(D.text('模式 T', { x: 30, y: DY + 24,
      'class': 'vz-lab', fill: '#b9c8e6' }));
    row(ctx, S3.split(''), f.sst, sxOf, UY, SW, RH,
        function (k) { return k; });
    row(ctx, T.split(''), f.tst,
        function (k) { return sxOf(f.off + k); }, DY, SW, RH,
        function (k) { return k; });

    ctx.stage.appendChild(D.text('i ↓ ' + f.i,
      { x: f.i < n ? scOf(f.i) : scOf(n - 1) + 40, y: 164, 'class': 'vz-ptr' }));
    ctx.stage.appendChild(D.text('j ↑ ' + f.j,
      { x: f.j >= 0 && f.off + f.j < n ? scOf(f.off + f.j) : scOf(f.off) - 30,
        y: 322, 'class': 'vz-ptr', fill: '#ff9f6b' }));

    tblRow(ctx, NX, f.hi, 'next 表' + (f.hi >= 0 ? '　j 要退到 next[' + f.hi + ']' : ''));
    for (i = 0; i < f.notes.length && i < 3; i++) {
      ctx.stage.appendChild(D.text(f.notes[i],
        { x: TX0, y: 246 + i * 24, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function matchDriver() {
    var steps = [], n = S3.length, i = 0, j = 0, cmp = 0, jump = 0;

    function snap(o) {
      var off = o.j < 0 ? o.i : o.i - o.j, sst = [], tst = [], k;
      for (k = 0; k < n; k++) {
        if (k === o.i && o.res) sst[k] = o.res;
        else if (k >= off && k < o.i) sst[k] = 'good';
        else sst[k] = 'idle';
      }
      for (k = 0; k < M; k++) {
        if (k === o.j && o.res) tst[k] = o.res;
        else if (k < o.j) tst[k] = 'good';
        else tst[k] = 'idle';
      }
      return { i: o.i, j: o.j, off: off, sst: sst, tst: tst,
               res: o.res || null,
               hi: typeof o.hi === 'number' ? o.hi : -1, slide: !!o.slide,
               hdr: o.hdr || 'KMP 匹配　i 只前进，绝不回退',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [],
               stats: o.stats || { 'i / j': o.i + ' / ' + o.j,
                 'T 压在': 'S[' + off + ']', '比较次数': cmp,
                 'i 回退次数': 0 } };
    }

    steps.push(step(snap({ i: 0, j: 0,
      hdr: 'KMP：主串指针 i 一路向前，一步不回头',
      cap1: 'S = "' + S3 + '"　T = "' + T + '"　next = [' + NX.join(',') + ']',
      cap2: '失配时不动 i，只让 j 退到 next[j] —— 画面上就是 T 自己向右滑',
      stats: { 'n': n, 'm': M, 'i 回退次数': 0, '复杂度': 'O(n+m)' },
      notes: ['和 BF 比：i 从不回退',
        '失配只改 j，不改 i',
        'j = next[j] 看着就是 T 右滑'] }), renderMatch, 1,
      '同样的 S 和 T，这回用 KMP。规矩只有一条：i 只许前进。失配时不动 i，' +
      '只让 j 退到 next[j]，看画面就是 T 自己向右滑一段。',
      ['S、T 与 BF 那节相同', 'i 只前进不回退', '失配只改 j']));

    while (i < n && j < M) {
      if (j === -1 || S3.charAt(i) === T.charAt(j)) {
        if (j >= 0) {
          cmp++;
          steps.push(step(snap({ i: i, j: j, res: 'good',
            cap1: 'S[' + i + '] = ' + S3.charAt(i) + '　T[' + j + '] = ' +
                  T.charAt(j) + '　相等，i 与 j 一起进一',
            cap2: '绿格是本轮攒下的战果，长度就是 j —— 它也是下次失配时的本钱',
            notes: ['S[' + i + '] == T[' + j + ']',
              'i → ' + (i + 1) + '，j → ' + (j + 1),
              '累计比较 ' + cmp + ' 次'] }), renderMatch, 3,
            'S[' + i + '] 和 T[' + j + '] 都是 ' + S3.charAt(i) +
            '，对上了，i、j 各进一。已经连着对上 ' + (j + 1) + ' 个字符。',
            ['S[' + i + '] == T[' + j + ']',
             'i → ' + (i + 1) + '，j → ' + (j + 1),
             '已匹配 ' + (j + 1) + ' 个']));
        }
        i++; j++;
      } else {
        cmp++;
        var nj = NX[j], had = j;
        steps.push(step(snap({ i: i, j: j, res: 'bad', hi: j,
          cap1: 'S[' + i + '] = ' + S3.charAt(i) + '　T[' + j + '] = ' +
                T.charAt(j) + '　失配 —— 但前面对上的 ' + j + ' 个字符不白费',
          cap2: 'j 退到 next[' + j + '] = ' + nj + '，i 留在 ' + i +
                ' 不动　（BF 到这里会把 i 退回去）',
          notes: ['S[' + i + '] != T[' + j + ']',
            'j: ' + j + ' → next[' + j + '] = ' + nj,
            'i 停在 ' + i + '，一步不退'] }), renderMatch, 5,
          'S[' + i + '] 是 ' + S3.charAt(i) + '，T[' + j + '] 是 ' + T.charAt(j) +
          '，失配。j 退到 next[' + j + '] = ' + nj + '，i 留在 ' + i +
          ' 不动 —— BF 到这里要把 i 退回去。',
          ['S[' + i + '] != T[' + j + ']',
           'j → next[' + j + '] = ' + nj, 'i 停在 ' + i + ' 不退']));
        j = nj; jump++;
        steps.push(step(snap({ i: i, j: j, slide: true, hi: had,
          cap1: j < 0 ? 'j = −1：一个字符都留不住，T 整体右移，从 S[' + i + '] 重新起头'
                      : 'j = ' + j + '：T 向右滑到 S[' + (i - j) + '] —— 前 ' + j +
                        ' 个字符不用再比，它们必然已经对上',
          cap2: j < 0 ? '下一步 i、j 同时进一，等于把 T 的头挪到 S[' + (i + 1) + ']'
                      : '省下的就是这 ' + j + ' 次比较，而且主串一个字符也没重读',
          stats: { 'i / j': i + ' / ' + j,
                   'T 压在': 'S[' + (j < 0 ? i : i - j) + ']',
                   'j 已退档': jump + ' 次', 'i 回退次数': 0 },
          notes: ['T 整体右滑，i 原地不动',
            j < 0 ? 'j = −1，T 的头重贴到 S[' + i + ']'
                  : 'T 的前 ' + j + ' 个字符白送 —— 已知对上',
            '主串一个字符都没重读'] }), renderMatch, 5,
          j < 0 ? 'j 退到 −1，一个字符都留不住，T 整体右移，接着从 S[' + i + '] 重新起头。'
                : 'T 向右滑到 S[' + (i - j) + ']。它的前 ' + j +
                  ' 个字符已知与主串对上，直接跳过 —— 省下的就是这几次比较。',
          ['T 右滑到 S[' + (j < 0 ? i : i - j) + ']',
           j < 0 ? 'j = −1，从头起' : '前 ' + j + ' 个字符白送',
           '主串没有重读']));
      }
    }
    return { steps: steps, i: i, j: j, cmp: cmp, jump: jump,
             snap: snap, n: n };
  }

  function buildMatch() {
    var r = matchDriver(), steps = r.steps, pos = r.i - M;

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: '匹配成功　返回 i − m = ' + pos,
      cap1: 'j 走到 ' + M + ' 等于 m —— T 整段对上，起始位置是 i − m = ' + pos,
      cap2: '全程比了 ' + r.cmp + ' 次，i 回退 0 次　BF 在同一组数据上要比 ' +
            '更多次、还回退了好几趟',
      stats: { '匹配位置': pos, '比较次数': r.cmp,
               'i 回退次数': 0, 'j 退档': r.jump + ' 次' },
      notes: ['j == m，匹配成功',
        '返回 i − m = ' + pos,
        '比较 ' + r.cmp + ' 次，i 回退 0 次'] }), renderMatch, 7,
      'j 走到 ' + M + ' 等于 m，T 整段对上，返回 i − m = ' + pos + '。全程比了 ' +
      r.cmp + ' 次，i 一次都没回退，只让 j 退了 ' + r.jump + ' 档。',
      ['j == m，匹配成功', '返回位置 ' + pos, 'i 回退 0 次']));

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: 'O(n+m) 从哪来：i 只涨不落，j 落得也不多',
      cap1: 'i 从 0 单调走到 n，最多前进 n 步 —— 主串每个字符最多被读一次',
      cap2: 'j 每次涨最多 1，总涨量不超过 n；退档只会让 j 变小，所以退的总量也不超过 n',
      stats: { 'i 的总步数': '≤ n', 'j 的总退量': '≤ n',
               '求 next': 'O(m)', '合计': 'O(n+m)' },
      notes: ['i 单调递增，至多 n 步',
        'j 涨量 ≤ n，故退量也 ≤ n',
        '加上求表的 O(m)，合计 O(n+m)'] }), renderMatch, 9,
      '复杂度这样算：i 单调递增，至多走 n 步；j 每次最多涨 1，涨量不超过 n，' +
      '所以退的总量也不超过 n。加上求表的 O(m)，合起来就是 O(n+m)。',
      ['i 单调递增 ≤ n 步', 'j 的退量 ≤ 涨量 ≤ n', '匹配 O(n) + 求表 O(m)']));

    steps.push(step(r.snap({ i: r.i, j: r.j,
      hdr: 'KMP 与 BF 的分水岭：主串要不要重读',
      cap1: 'BF 失配时 i = i − j + 1，读过的主串又读一遍，最坏 O(n×m)',
      cap2: 'KMP 把「已匹配段的后缀也是 T 的前缀」这件事先算进 next 里，i 就不必回头了',
      stats: { 'BF': 'i 回退，O(n×m)', 'KMP': 'i 不退，O(n+m)',
               '差别': '信息复用', '代价': 'O(m) 的 next 表' },
      notes: ['BF 把已匹配的信息全扔了',
        'KMP 用 next 把它存下来',
        '多花 O(m) 空间，省掉全部回退'] }), renderMatch, 9,
      '两者的分水岭就一件事：主串要不要重读。BF 一失配就把 i 退回去重读，' +
      'KMP 提前把 T 的自相似性存进 next，i 从此不必回头。多花 O(m) 空间，换掉全部回退。',
      ['分水岭：主串是否重读', 'BF O(n×m)，KMP O(n+m)',
       '代价只是 O(m) 的 next 表']));

    return steps;
  }

  var CODE_DEF = [
    '// next[j] 的定义（0 起标）',
    '// 取 T[0..j-1] 这 j 个字符，找最长的 k 使得',
    '//     T[0..k-1]  ==  T[j-k..j-1]',
    '//     └ 前缀 ┘        └ 后缀 ┘',
    '// 且 k < j —— 不许取整段，否则永远等于自己',
    '',
    'next[j] = 这个最长的 k',
    'next[0] = -1                 // 哨兵：连一个字符都留不住',
    '',
    '// 用处：T[j] 失配时，已匹配段的后缀就是 T 的前缀，',
    '// 所以 j 退到 next[j] 即可，主串指针 i 不必回退'
  ];

  var CODE_NEXT = [
    'void get_next(T, next) {',
    '  i = 0; j = -1; next[0] = -1;',
    '  while (i < m - 1) {',
    '    if (j == -1 || T[i] == T[j]) {   // 对上：前后缀能再长一格',
    '      i++; j++; next[i] = j;         // 填表：next[i] = j',
    '    } else {',
    '      j = next[j];                   // 失配：退到次长的那一档',
    '    }',
    '  }',
    '}                                    // i 从不回退，全程 O(m)'
  ];

  var CODE_KMP = [
    'int Index_KMP(S, T, next) {',
    '  i = 0; j = 0;',
    '  while (i < n && j < m) {',
    '    if (j == -1 || S[i] == T[j]) { i++; j++; }  // 对上就一起进一',
    '    else {',
    '      j = next[j];                 // 失配：只退 j，i 一动不动',
    '    }                              // 画面上就是 T 向右滑动',
    '  }',
    '  if (j >= m) return i - m;        // 整段对上，返回起始下标',
    '  return -1;                       // 主串走完还没对上',
    '}                                  // 匹配 O(n) + 求表 O(m)'
  ];

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['kmp'] = {
    title: 'KMP 算法与 next 数组',
    subtitle: 'BF 的病根是失配时主串指针 i 要回退。KMP 先算出 next 数组 —— next[j] 是 T 前 j 个字符里最长的「既是前缀又是后缀」那一段的长度；失配时只让 j 退到 next[j]，i 一步不退，画面上就是 T 自己向右滑，总代价降到 O(n+m)。',
    height: 720,
    code: CODE_KMP,
    scenes: [
      { name: 'next 的含义', build: buildMeaning,
        codeTag: '前缀 = 后缀，最长多少', code: CODE_DEF },
      { name: '求 next 数组', build: buildNext,
        codeTag: 'get_next：T 与自身匹配', code: CODE_NEXT },
      { name: 'KMP 匹配过程', build: buildMatch,
        codeTag: 'Index_KMP：i 永不回退', code: CODE_KMP }
    ]
  };
})();
