/* 基数排序（LSD 最低位优先）— 第10章
 * 不比较大小，只按「位」分配与收集：从个位开始，把每个数丢进对应数字的桶，
 * 再按桶号 0..9 顺序倒回数组；然后换十位再来一遍。
 * 关键在于收集时保持桶内的先后次序（稳定），低位的排序结果才不会被高位打乱。
 * 快照模板同 insertion-sort.js。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [73, 22, 93, 43, 55, 14, 28, 65];
  var TY = 124, AX = 270, AW = 54, AGAP = 9, AH = 40;
  var BY = 196, BX = 44, BW = 80, BGAP = 12, BH = 128;
  var IH = 24, IGAP = 3;

  function xOf(i) { return AX + i * (AW + AGAP); }
  function bxOf(b) { return BX + b * (BW + BGAP); }

  function render(ctx, f) {
    D.clear(ctx.stage);
    ctx.stage.appendChild(D.text(f.title,
      { x: 500, y: 100, 'class': 'vz-hdr', 'text-anchor': 'middle',
        fill: '#ffd166' }));
    var cells = D.cellRow(ctx.stage, { values: f.a, states: f.st,
      x: AX, y: TY, w: AW, gap: AGAP, h: AH });
    ctx.stage.appendChild(D.text('数组 a',
      { x: AX - 16, y: TY + AH / 2 + 5, 'class': 'vz-lab',
        'text-anchor': 'end' }));
    // 十个桶：桶号就是那一位的数字，桶内自上而下就是入桶的先后次序
    for (var b = 0; b < 10; b++) {
      var bx = bxOf(b), on = f.bucket === b;
      ctx.stage.appendChild(D.el('rect', { x: bx, y: BY, width: BW,
        height: BH, rx: 8, fill: on ? '#123a5c' : '#141d33',
        stroke: on ? '#4aa3e0' : '#2b3a5c',
        'stroke-width': on ? 2 : 1.2 }));
      ctx.stage.appendChild(D.text('桶 ' + b,
        { x: bx + BW / 2, y: BY - 7, 'class': 'vz-tag',
          'text-anchor': 'middle', fill: on ? '#ffd166' : '#7f92bb' }));
      var q = f.bins[b];
      for (var k = 0; k < q.length && k < 4; k++) {
        var iy = BY + 8 + k * (IH + IGAP);
        var fresh = on && k === q.length - 1 && f.justIn;
        ctx.stage.appendChild(D.el('rect', { x: bx + 7, y: iy,
          width: BW - 14, height: IH, rx: 5,
          fill: fresh ? '#4a3c14' : '#1d2b49',
          stroke: fresh ? '#ffd166' : '#3f5580' }));
        ctx.stage.appendChild(D.text(String(q[k]),
          { x: bx + BW / 2, y: iy + 17, 'class': 'vz-cellval',
            'text-anchor': 'middle' }));
      }
      // 队列语义：进出方向标出来，才看得懂为什么是「先进先出」
      if (q.length) {
        ctx.stage.appendChild(D.text(f.mode === 'collect' ? '↑ 先出' : '↓ 后进',
          { x: bx + BW / 2, y: BY + BH - 8, 'class': 'vz-lab',
            'text-anchor': 'middle', fill: '#5c6f96' }));
      }
    }
    // 分配：数组 → 桶；收集：桶 → 数组
    if (f.from !== null && cells[f.from]) {
      D.link(ctx.stage, { x1: cells[f.from].cx, y1: TY + AH + 6,
        x2: bxOf(f.bucket) + BW / 2, y2: BY - 20, kind: 'hot' });
    }
    if (f.to !== null && cells[f.to]) {
      D.link(ctx.stage, { x1: bxOf(f.bucket) + BW / 2, y1: BY - 20,
        x2: cells[f.to].cx, y2: TY + AH + 6, kind: 'ptr' });
    }
    if (f.key !== null) {
      var kc = cells[f.from !== null ? f.from : f.to];
      if (kc) {
        ctx.stage.appendChild(D.text(f.keyLab + ' = ' + f.key,
          { x: kc.cx, y: TY - 10, 'class': 'vz-brace', fill: '#ffd166',
            'text-anchor': 'middle' }));
      }
    }
    ctx.stats = { '当前处理位': f.digLab, '入桶次数': f.dist,
                  '出桶次数': f.coll };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function build() {
    var a = SRC.slice(), n = a.length, dist = 0, coll = 0, steps = [];
    var bins = [], mode = 'dist', title = '', digLab = '个位';
    var i;
    for (i = 0; i < 10; i++) bins.push([]);

    var mkSt = function (marks) {
      var s = a.map(function () { return 'idle'; });
      if (marks) for (var q = 0; q < marks.length; q++) s[marks[q][0]] = marks[q][1];
      return s;
    };
    var snap = function (o) {
      o = o || {};
      return { a: a.slice(), st: o.st || mkSt(),
               bins: bins.map(function (x) { return x.slice(); }),
               bucket: o.bucket === undefined ? null : o.bucket,
               justIn: !!o.justIn, mode: mode, title: title, digLab: digLab,
               from: o.from === undefined ? null : o.from,
               to: o.to === undefined ? null : o.to,
               key: o.key === undefined ? null : o.key,
               keyLab: o.keyLab || digLab, dist: dist, coll: coll };
    };

    var maxV = Math.max.apply(null, a);
    var rounds = String(maxV).length;

    title = '待排序：' + a.join(', ');
    steps.push(step(snap({}), -1,
      '基数排序不做元素间的大小比较，而是「按位分派」。最大值 ' + maxV +
      ' 有 ' + rounds + ' 位，所以只需 ' + rounds +
      ' 轮：先按个位排一遍，再按十位排一遍。',
      ['原始序列', '最大值 ' + maxV + '，共 ' + rounds + ' 位',
       '需要 ' + rounds + ' 轮分配与收集']));

    var names = ['个位', '十位', '百位', '千位'];
    for (var r = 0, base = 1; r < rounds; r++, base *= 10) {
      digLab = names[r] || (base + ' 位');
      title = '第 ' + (r + 1) + ' 轮：按' + digLab + '分配';
      mode = 'dist';
      steps.push(step(snap({}), 0,
        '第 ' + (r + 1) + ' 轮开始，这一轮只看' + digLab +
        '。十个桶清空待用，桶号就代表' + digLab + '上的数字。',
        ['第 ' + (r + 1) + ' 轮', '关键字：' + digLab,
         '桶 0 ~ 桶 9 清空']));

      for (i = 0; i < n; i++) {
        var d = Math.floor(a[i] / base) % 10;
        bins[d].push(a[i]);
        dist++;
        steps.push(step(snap({ st: mkSt([[i, 'hot']]), bucket: d, justIn: true,
          from: i, key: d }), 1,
          'a[' + i + '] = ' + a[i] + ' 的' + digLab + '是 ' + d +
          '，把它放进桶 ' + d + ' 的队尾。同一个桶里，先进来的排在上面。',
          ['a[' + i + '] = ' + a[i], digLab + ' = ' + d,
           '进入桶 ' + d + '（队尾）']));
      }

      title = '第 ' + (r + 1) + ' 轮：分配完毕，准备收集';
      steps.push(step(snap({ st: a.map(function () { return 'mute'; }) }), 2,
        '这一轮全部入桶。注意每个桶内部还是乱的 —— 桶只保证「' + digLab +
        '相同的挨在一起」，靠的是后面按桶号顺序取出来才变有序。',
        ['分配完成，共 ' + dist + ' 次入桶',
         '桶内保持入桶先后次序']));

      mode = 'collect';
      var w = 0;
      for (var b = 0; b < 10; b++) {
        if (!bins[b].length) continue;
        title = '第 ' + (r + 1) + ' 轮：从桶 ' + b + ' 依次取出';
        while (bins[b].length) {
          var v = bins[b].shift();
          a[w] = v;
          coll++;
          steps.push(step(snap({
            st: a.map(function (_, k) { return k <= w ? 'good' : 'mute'; }),
            bucket: b, to: w, key: b }), 4,
            '按桶号从小到大取。桶 ' + b + ' 的队首是 ' + v + '，写回 a[' + w +
            ']。先进先出保证了' + digLab + '相同的两个数，相对次序和上一轮一样 —— ' +
            '这就是基数排序必须稳定的原因。',
            ['取桶 ' + b + ' 的队首 ' + v, 'a[' + w + '] = ' + v,
             '出桶次数 ' + coll]));
          w++;
        }
      }

      title = '第 ' + (r + 1) + ' 轮结束：' + a.join(', ');
      steps.push(step(snap({ st: a.map(function () { return 'good'; }) }), 5,
        '第 ' + (r + 1) + ' 轮收集完成：' + a.join(', ') + '。现在整个序列按' +
        digLab + '有序' + (r > 0 ? '，并且' + names[r - 1] + '相同时仍保持上一轮的次序' : '') +
        '。' + (r + 1 < rounds ? '接着看更高一位。' : ''),
        ['本轮完成', '已按' + digLab + '有序',
         r + 1 < rounds ? '进入下一位' : '所有位处理完毕']));
    }

    title = '排序完成：' + a.join(', ');
    steps.push(step(snap({ st: a.map(function () { return 'done'; }) }), -1,
      '排序完成。' + rounds + ' 轮，每轮把 n 个数各入桶一次、各出桶一次，' +
      '所以是 O(d·(n+r))：d 是位数、r 是基数 10。它完全不做元素比较，' +
      '代价是需要 r 个桶的额外空间，而且只适用于能按位拆解的关键字。',
      ['排序完成',
       rounds + ' 轮 × (' + dist + ' 入 / ' + coll + ' 出)',
       'O(d(n+r))，稳定，需额外空间']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['radix-sort'] = {
    title: '基数排序 Radix Sort（LSD）',
    subtitle: '不比较大小，只按位分派：从最低位起，把每个数丢进对应数字的桶，再按桶号 0..9 顺序收回。桶必须先进先出，低位的结果才不会被高位打乱。',
    height: 740,
    code: [
      'for base = 1; base <= maxV; base *= 10:   // 逐位，低位优先',
      '    for i = 0 to n-1:                     // 分配',
      '        bins[(a[i] / base) % 10].push(a[i])',
      '    // 桶内保持入桶次序（队列，先进先出）',
      '    w = 0                                 // 收集',
      '    for b = 0 to 9: while bins[b]: a[w++] = bins[b].shift()',
      '    // 此时已按当前位有序，且更低位的次序被保留'
    ],
    scenes: [
      { name: '完整流程', build: build }
    ]
  };
})();
