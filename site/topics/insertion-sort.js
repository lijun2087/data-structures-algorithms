/* 直接插入排序 — 第10章
 * 架构约定（所有主题都照这个来）：
 *   build() 在构建期把算法完整跑一遍，每一步存一个「快照」；
 *   run() 只负责把快照画出来，不做任何计算、不改共享状态。
 * 这样后退（重建+重放）才是可靠的，也不会出现构建期与运行期状态漂移。
 */
(function () {
  var D = window.VizDraw;
  var SRC = [5, 2, 9, 1, 7, 3];
  var CY = 200, CX = 168, CW = 62, GAP = 10, CH = 46;

  function render(ctx, f) {
    D.clear(ctx.stage);
    if (f.sortedTo >= 0) {
      D.zone(ctx.stage, { x: CX - 7, y: CY - 9, rx: 9,
        w: (f.sortedTo + 1) * (CW + GAP) - GAP + 14, h: CH + 18,
        color: '#2ecc71', label: '已排序区' });
    }
    var cells = D.cellRow(ctx.stage, { values: f.a, states: f.st,
      x: CX, y: CY, w: CW, gap: GAP, h: CH });
    if (f.hold !== null) {
      var hx = CX + f.holdAt * (CW + GAP);
      D.cellRow(ctx.stage, { values: [f.hold], states: ['active'],
        x: hx, y: CY - 86, w: CW, gap: GAP, h: CH, index: false });
      ctx.stage.appendChild(D.text('哨兵 tmp',
        { x: hx + CW / 2, y: CY - 96, 'class': 'vz-brace', fill: '#4aa3e0' }));
      D.link(ctx.stage, { x1: hx + CW / 2, y1: CY - 86 + CH + 4,
        x2: hx + CW / 2, y2: CY - 6, kind: 'ptr', dash: true });
    }
    if (f.j !== null && cells[f.j]) {
      D.pointer(ctx.stage, { x: cells[f.j].cx, y: CY + CH + 22,
        name: 'j', above: false, color: '#ffd166' });
    }
    ctx.stats = { '有序区长度': f.len, '比较次数': f.cmp, '移动次数': f.mov };
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function build() {
    var a = SRC.slice(), n = a.length, cmp = 0, mov = 0, steps = [];
    var base = function () { return a.map(function () { return 'idle'; }); };
    var sorted = function (upto, extra) {
      var s = base();
      for (var k = 0; k <= upto; k++) s[k] = 'done';
      if (extra) for (var q in extra) s[q] = extra[q];
      return s;
    };
    var snap = function (o) {
      return { a: a.slice(), st: o.st, sortedTo: o.sortedTo,
               hold: o.hold === undefined ? null : o.hold,
               holdAt: o.holdAt || 0, j: o.j === undefined ? null : o.j,
               len: o.len, cmp: cmp, mov: mov };
    };

    steps.push(step(snap({ st: sorted(0), sortedTo: 0, len: 1 }), 0,
      '单个元素天然有序，所以有序区从 a[0] 开始，待处理的是 a[1] 往后。',
      ['初始有序区 = [' + a[0] + ']', '从 i = 1 开始']));

    for (var i = 1; i < n; i++) {
      var tmp = a[i];
      // 注意用变量作键必须写成计算属性，写 { i: ... } 得到的是字符串键 "i"
      var hole = {}; hole[i] = 'mute';
      steps.push(step(snap({ st: sorted(i - 1, hole), sortedTo: i - 1,
        hold: tmp, holdAt: i, len: i }), 1,
        '取出 a[' + i + '] = ' + tmp + ' 暂存到 tmp，这个位置就空出来了，可以被覆盖。',
        ['tmp = a[' + i + ']', '空位等待后续元素右移填入']));

      var j = i - 1;
      while (j >= 0 && a[j] > tmp) {
        cmp++; mov++;
        var moved = a[j];
        a[j + 1] = a[j];
        var stm = sorted(i, {});
        stm[j + 1] = 'hot'; stm[j] = 'mute';
        steps.push(step(snap({ st: stm, sortedTo: i - 1, hold: tmp,
          holdAt: j, j: j, len: i }), 4,
          'a[' + j + '] = ' + moved + ' 比 tmp = ' + tmp + ' 大，把它右移一格，空位跟着左移。',
          ['a[' + j + '] > tmp', 'a[' + (j + 1) + '] = a[' + j + ']', '移动次数 +1']));
        j--;
      }
      if (j >= 0) {
        cmp++;
        var sts = sorted(i, {});
        sts[j] = 'active';
        steps.push(step(snap({ st: sts, sortedTo: i - 1, hold: tmp,
          holdAt: j + 1, j: j, len: i }), 3,
          'a[' + j + '] = ' + a[j] + ' 不大于 tmp = ' + tmp + '，右移停止，插入点就是它后面一格。',
          ['a[' + j + '] <= tmp', '循环结束，插入点 = ' + (j + 1)]));
      } else {
        steps.push(step(snap({ st: sorted(i, {}), sortedTo: i - 1, hold: tmp,
          holdAt: 0, j: null, len: i }), 3,
          'j 已经越过左边界，说明 tmp = ' + tmp + ' 比有序区所有元素都小，插到最前面。',
          ['j < 0，循环结束', '插入点 = 0']));
      }
      mov++;
      a[j + 1] = tmp;
      var stf = sorted(i, {});
      stf[j + 1] = 'good';
      steps.push(step(snap({ st: stf, sortedTo: i, len: i + 1 }), 5,
        '把 tmp = ' + tmp + ' 写进位置 ' + (j + 1) + '，有序区扩大到 ' + (i + 1) + ' 个元素。',
        ['a[' + (j + 1) + '] = tmp', '有序区长度 ' + (i + 1)]));
    }

    steps.push(step(snap({ st: a.map(function () { return 'done'; }),
      sortedTo: n - 1, len: n }), -1,
      '全部元素插入完毕，数组有序。共比较 ' + cmp + ' 次，移动 ' + mov + ' 次。',
      ['排序完成', '比较 ' + cmp + ' 次 / 移动 ' + mov + ' 次']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['insertion-sort'] = {
    title: '直接插入排序 Insertion Sort',
    subtitle: '把每个新元素插进左边已经有序的那一段，像打牌时把新摸的牌插进手里已排好的顺子。',
    height: 700,
    code: [
      'for i = 1 to n-1:',
      '    tmp = a[i]                    // 暂存待插入元素',
      '    j = i - 1',
      '    while j >= 0 and a[j] > tmp:  // 找插入点',
      '        a[j+1] = a[j]; j--        // 比 tmp 大就右移',
      '    a[j+1] = tmp                  // 写进插入点'
    ],
    scenes: [
      { name: '完整流程', build: build }
    ]
  };
})();
