/* 二叉树的遍历（先序/中序/后序）— 第6章
 * 三种遍历的差别只有一处：访问根结点这句话写在递归调用的哪个位置。
 * 场景一/二/三分别演示 DLR、LDR、LRD，右侧同时画出访问序列与递归栈；
 * 场景四把递归换成显式栈，说明中序非递归怎么写。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 这棵树刻意做得不对称，三种遍历的序列才互不相同：
   *           A
   *        /     \
   *       B       C
   *      / \     / \
   *     D   E   F   G
   *        /
   *       H
   * 下标按完全二叉树编号，H 落在 10 号位（E 的左孩子）。 */
  var V = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 10: 'H' };
  var IDS = [1, 2, 3, 4, 5, 6, 7, 10];
  var NN = IDS.length;

  function has(i) { return V[i] !== undefined; }
  function lch(i) { return has(i * 2) ? i * 2 : 0; }
  function rch(i) { return has(i * 2 + 1) ? i * 2 + 1 : 0; }

  /* 布局：树占左半 x∈[71,439]，序列在 x=530 起 8 格，递归栈贴右侧 x=850。
   * 竖直：标题 104 / 说明 126 / 树 150…282(+r=297) / 栈自 y=304 向上垒。 */
  var X0 = 30, SPAN = 450, Y0 = 150, DY = 44, R = 15;
  var QX = 530, QW = 34, QG = 4, QY = 160, QH = 32;
  var KX = 850, KW = 110, KH = 24, KBOT = 304;

  // 不用 Math.log 求层号：逐层数过去，整数运算没有浮点误差
  function levelOf(i) {
    var L = 1, f = 1;
    while (f * 2 <= i) { f *= 2; L++; }
    return L;
  }
  function xOf(i) {
    var L = levelOf(i), k = 1, f = 1, q;
    for (q = 1; q < L; q++) { k *= 2; f *= 2; }
    return X0 + SPAN * (i - f + 0.5) / k;
  }
  function yOf(i) { return Y0 + (levelOf(i) - 1) * DY; }

  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, j, id;

    ctx.stage.appendChild(D.text(f.hdr,
      { x: 44, y: 104, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap) {
      ctx.stage.appendChild(D.text(f.cap,
        { x: 44, y: 126, 'class': 'vz-lab', fill: '#ffd166' }));
    }

    // 先连线后画点，结点才不会被线压住
    for (j = 0; j < NN; j++) {
      i = IDS[j];
      if (i === 1) continue;
      D.link(ctx.stage, { x1: xOf(i >> 1), y1: yOf(i >> 1) + R,
        x2: xOf(i), y2: yOf(i) - R - 2,
        kind: f.path && f.path[i] ? 'hot' : 'next', arrow: false,
        width: f.path && f.path[i] ? 2.4 : 1.6 });
    }
    for (j = 0; j < NN; j++) {
      i = IDS[j];
      D.circleNode(ctx.stage, { x: xOf(i), y: yOf(i), r: R,
        state: f.st[i] || 'idle', value: V[i] });
    }

    // 访问序列：已输出的填绿，未输出的留空格
    ctx.stage.appendChild(D.text('访问序列',
      { x: QX, y: QY - 12, 'class': 'vz-tag', fill: '#9fb4dc',
        'text-anchor': 'start' }));
    for (j = 0; j < NN; j++) {
      var x = QX + j * (QW + QG);
      var on = j < f.out.length;
      var c = D.C[on ? 'done' : 'mute'];
      ctx.stage.appendChild(D.el('rect', { x: x, y: QY, width: QW,
        height: QH, rx: 5, fill: c.fill, stroke: c.stroke,
        'stroke-width': on && j === f.out.length - 1 ? 2.6 : 1.5 }));
      if (on) {
        ctx.stage.appendChild(D.text(f.out[j],
          { x: x + QW / 2, y: QY + 22, 'class': 'vz-cellval' }));
      }
      ctx.stage.appendChild(D.text(j + 1,
        { x: x + QW / 2, y: QY + QH + 14, 'class': 'vz-idx' }));
    }

    /* 递归栈自下而上垒，栈底在 KBOT，最多画 6 层（6×26 = 156，顶端 148 > 126，不压说明） */
    ctx.stage.appendChild(D.text(f.stkName || '递归栈（栈顶在上）',
      { x: KX + KW / 2, y: 142, 'class': 'vz-tag', fill: '#9fb4dc' }));
    var stk = f.stk || [], n = Math.min(stk.length, 6);
    for (j = 0; j < n; j++) {
      var sy = KBOT - (j + 1) * (KH + 2);
      var sc = D.C[j === n - 1 ? 'active' : 'idle'];
      ctx.stage.appendChild(D.el('rect', { x: KX, y: sy, width: KW,
        height: KH, rx: 5, fill: sc.fill, stroke: sc.stroke,
        'stroke-width': 1.5 }));
      ctx.stage.appendChild(D.text(stk[j],
        { x: KX + KW / 2, y: sy + 17, 'class': 'vz-idx',
          fill: '#dfe8ff', 'font-size': 11.5 }));
    }
    if (!stk.length) {
      ctx.stage.appendChild(D.text('（空）',
        { x: KX + KW / 2, y: KBOT - 10, 'class': 'vz-idx', fill: '#4a5c82' }));
    }
    if (stk.length > 6) {
      ctx.stage.appendChild(D.text('…下面还有 ' + (stk.length - 6) + ' 层',
        { x: KX + KW / 2, y: KBOT + 14, 'class': 'vz-idx' }));
    }

    for (j = 0; j < f.notes.length && j < 3; j++) {
      ctx.stage.appendChild(D.text(f.notes[j],
        { x: QX, y: 236 + j * 22, 'class': 'vz-info' }));
    }
    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  /* ---------- 三种递归遍历共用的构建器 ----------
   * order: 'DLR' | 'LDR' | 'LRD'
   * 递归过程逐步展开，每进一层、每访问一个结点、每退一层都存一帧。 */
  function makeBuild(order, hdr, capLine) {
    return function () {
      var steps = [];
      var out = [], st = {}, path = {}, stk = [];
      var visitLine = order === 'DLR' ? 1 : (order === 'LDR' ? 2 : 3);

      var snap = function (o) {
        return { st: cp(st), path: cp(path), out: out.slice(), stk: stk.slice(),
                 hdr: o.hdr || hdr, cap: o.cap || null,
                 notes: o.notes || [], stats: o.stats || {} };
      };
      var base = function () {
        return { '遍历方式': order, '已访问': out.length + ' / ' + NN,
                 '递归深度': stk.length, '当前序列': out.join(' ') || '（空）' };
      };

      steps.push(step(snap({
        cap: capLine,
        stats: { '遍历方式': order, '结点数': NN, '递归深度': 0,
                 '访问顺序': order === 'DLR' ? '根 左 右'
                           : (order === 'LDR' ? '左 根 右' : '左 右 根') },
        notes: ['三种遍历的代码只差一行的位置',
          '访问根这句写在哪，就叫什么遍历',
          '递归退出条件都是「树空则返回」'] }), 0,
        '三种遍历的代码几乎一样：都是「递归左子树、递归右子树」，' +
        '差别只在「访问根结点」这一句写在前、中、还是后。' + capLine,
        ['结点数 ' + NN, '访问顺序：' +
          (order === 'DLR' ? '根 左 右' : (order === 'LDR' ? '左 根 右' : '左 右 根')),
         '先看递归怎么展开']));

      function visit(i) {
        out.push(V[i]);
        st[i] = 'done';
        steps.push(step(snap({
          cap: '访问 ' + V[i] + '：输出到序列第 ' + out.length + ' 位',
          stats: base(),
          notes: ['visit(' + V[i] + ')',
            '序列：' + out.join(' '),
            order === 'DLR' ? '进入结点就访问，不必等子树'
              : (order === 'LDR' ? '左子树走完了才轮到根'
                                 : '左右子树都走完了才轮到根')] }), visitLine,
          '访问 ' + V[i] + '，它是序列的第 ' + out.length + ' 个。' +
          (order === 'DLR' ? '先序遍历一进入结点就把它输出，所以序列的第一个必然是根。'
            : (order === 'LDR' ? '中序遍历要等左子树彻底走完才输出根，所以序列的第一个是最左下的结点。'
                               : '后序遍历要等左右子树都走完才输出根，所以序列的最后一个必然是根。')),
          ['visit(' + V[i] + ')', '第 ' + out.length + ' 个输出',
           '序列 ' + out.join('')]));
      }

      function walk(i, from) {
        if (!i) return;
        if (from) path[i] = 1;
        stk.push(order + '(' + V[i] + ')');
        st[i] = 'active';
        steps.push(step(snap({
          cap: '递归进入 ' + V[i] + '：压栈，递归深度 ' + stk.length,
          stats: base(),
          notes: ['调用 ' + order + '(' + V[i] + ')',
            '栈里现在有 ' + stk.length + ' 层',
            '结点非空，继续往下'] }), 0,
          '递归进入 ' + V[i] + '。每一层递归调用都在栈上留一个栈帧，' +
          '记住「回来之后该干什么」—— 栈深度现在是 ' + stk.length + '。',
          ['进入 ' + V[i], '压栈，深度 ' + stk.length,
           '树非空，继续']));

        if (order === 'DLR') visit(i);
        walk(lch(i), i);
        if (order === 'LDR') visit(i);
        walk(rch(i), i);
        if (order === 'LRD') visit(i);

        stk.pop();
        st[i] = 'good';
        steps.push(step(snap({
          cap: '' + V[i] + ' 的子树处理完毕：出栈，回到' +
               (stk.length ? '上一层 ' + stk[stk.length - 1] : '调用者'),
          stats: base(),
          notes: ['' + V[i] + ' 这一层结束，弹出栈帧',
            '递归深度回落到 ' + stk.length,
            stk.length ? '继续上一层没做完的事' : '整棵树遍历完成'] }), 4,
          V[i] + ' 这一层的活全干完了，栈帧弹出，递归深度回落到 ' + stk.length + '。' +
          (stk.length ? '控制权交回上一层，接着做它没做完的那部分。'
                      : '栈已空，整棵树遍历结束。'),
          [V[i] + ' 返回', '出栈，深度 ' + stk.length,
           stk.length ? '回到上一层' : '遍历完成']));
      }

      walk(1, 0);

      steps.push(step(snap({
        hdr: order + ' 遍历完成',
        cap: '序列：' + out.join(' ') + '　—— 每个结点访问一次，时间 O(n)',
        stats: { '遍历方式': order, '序列': out.join(''),
                 '时间复杂度': 'O(n)', '空间（栈深）': 'O(树高)' },
        notes: ['每个结点恰好进出栈一次',
          '时间 O(n)，与树形无关',
          '栈深取决于树高：最好 log n，最坏 n'] }), -1,
        order + ' 遍历完成，序列是 ' + out.join(' ') + '。每个结点恰好被访问一次，' +
        '时间 O(n)；栈的深度等于树高，平衡时 O(log n)，退化成单支树时 O(n)。',
        ['序列 ' + out.join(''), '时间 O(n)',
         '空间 O(树高)']));

      return steps;
    };
  }

  /* ---------- 场景四：中序遍历的非递归写法 ----------
   * 递归栈是编译器替我们维护的；自己拿一个栈来做，就是这套「一路向左压栈、
   * 弹出即访问、再转向右子树」的循环。 */
  function buildIter() {
    var steps = [];
    var out = [], st = {}, stk = [];

    var snap = function (o) {
      return { st: cp(st), path: {}, out: out.slice(), stk: stk.slice(),
               stkName: '显式栈 S（栈顶在上）',
               hdr: o.hdr || '中序遍历的非递归实现', cap: o.cap || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function (p) {
      return { 'p 指向': p ? V[p] : 'NULL', '栈内': stk.length + ' 个',
               '已访问': out.length + ' / ' + NN,
               '序列': out.join('') || '（空）' };
    };

    steps.push(step(snap({
      cap: '递归栈本是编译器替我们维护的 —— 自己拿一个栈来，就能把递归改成循环',
      stats: { '思路': '显式栈代替递归栈', '循环条件': 'p 非空 或 栈非空',
               '结点数': NN, '时间': 'O(n)' },
      notes: ['一路向左：p 非空就压栈、p 走左孩子',
        '左边走到头就弹栈、访问、转向右孩子',
        'p 与栈同时为空，循环结束'] }), 0,
      '递归栈本来是编译器替我们维护的。自己拿一个栈来做同样的事，中序遍历就能改成循环：' +
      '一路向左压栈，左边走到头就弹出一个来访问，然后转向它的右子树。',
      ['显式栈代替递归栈', '一路向左压栈',
       '弹出即访问，再转右']));

    var p = 1;
    while (p || stk.length) {
      if (p) {
        stk.push(V[p]);
        st[p] = 'active';
        var lc = lch(p);
        steps.push(step(snap({
          cap: 'p = ' + V[p] + ' 非空：压栈，然后 p 走向左孩子 ' +
               (lc ? V[lc] : 'NULL'),
          stats: base(p),
          notes: ['Push(S, ' + V[p] + ')',
            'p = p->lchild → ' + (lc ? V[lc] : 'NULL'),
            lc ? '左边还有路，继续压' : '左边到头了，下一步该弹栈'] }), 2,
          'p 指向 ' + V[p] + '，非空，先把它压进栈 —— 意思是「这个结点的左子树还没走完，' +
          '先记着」。然后 p 转向左孩子 ' + (lc ? V[lc] : 'NULL') + '。' +
          (lc ? '' : '左边到头了，下一轮就该弹栈访问。'),
          ['Push(' + V[p] + ')', 'p → ' + (lc ? V[lc] : 'NULL'),
           lc ? '继续向左' : '左边到头']));
        p = lc;
      } else {
        var t = stk.pop();
        var id = 0, q;
        for (q = 0; q < NN; q++) if (V[IDS[q]] === t) id = IDS[q];
        out.push(t);
        st[id] = 'done';
        var rc = rch(id);
        steps.push(step(snap({
          cap: 'p 为空：弹出 ' + t + ' 并访问，然后 p 转向它的右孩子 ' +
               (rc ? V[rc] : 'NULL'),
          stats: base(rc),
          notes: ['Pop(S) → ' + t + '，visit(' + t + ')',
            '序列：' + out.join(' '),
            'p = ' + t + '->rchild → ' + (rc ? V[rc] : 'NULL')] }), 4,
          'p 空了，说明左边已经到头。弹出栈顶 ' + t + ' 并访问它 —— 弹出的时刻正好是' +
          '「左子树已走完、右子树还没走」，这正是中序的位置。接着 p 转向它的右孩子 ' +
          (rc ? V[rc] : 'NULL') + '。',
          ['Pop → ' + t, 'visit(' + t + ')',
           'p → ' + (rc ? V[rc] : 'NULL')]));
        p = rc;
      }
    }

    steps.push(step(snap({
      hdr: '非递归中序完成：' + out.join(' '),
      cap: '结果与递归版一模一样 —— 栈里存的就是「左子树未走完」的那批祖先',
      stats: { '序列': out.join(''), '与递归版': '完全一致',
               '时间': 'O(n)', '空间': 'O(树高)' },
      notes: ['每个结点恰好压栈、出栈一次',
        '栈中元素总是当前结点的祖先链',
        '先序也能这么改；后序要多记一个「从哪边回来」'] }), -1,
      '非递归中序的结果和递归版完全一致。栈里始终装着「左子树还没走完」的那批祖先，' +
      '弹出的时机恰好是中序访问的时机。先序也能照此改写；后序麻烦一点，要额外记住是从左边还是右边回来的。',
      ['序列 ' + out.join(''), '与递归版一致',
       '后序改写要多记一个标记']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['binary-tree-traversal'] = {
    title: '二叉树的遍历 Traversal',
    subtitle: '先序、中序、后序的代码只差一处：访问根结点这句写在两个递归调用的前、中、还是后。三种遍历都是 O(n)，栈深等于树高。',
    height: 700,
    code: [
      'void Traverse(BiTree T) {',
      '    if (!T) return;      // 树空则返回',
      '    // visit(T);         // 写在这里 → 先序 DLR',
      '    Traverse(T->lchild);',
      '    // visit(T);         // 写在这里 → 中序 LDR',
      '    Traverse(T->rchild);',
      '    // visit(T);         // 写在这里 → 后序 LRD',
      '}'
    ],
    scenes: [
      { name: '先序 DLR', build: makeBuild('DLR', '先序遍历 DLR：根 → 左 → 右',
          '先序把 visit 写在两个递归调用之前，所以一进入结点就输出。'),
        codeTag: '先序：visit 在最前',
        code: [
          'void PreOrder(BiTree T) {',
          '    if (!T) return;         // 递归出口：树空',
          '    visit(T);               // ← 先访问根',
          '    PreOrder(T->lchild);    // 再递归左子树',
          '    PreOrder(T->rchild);    // 最后递归右子树',
          '}',
          '// 序列首元素必为根；可用来复制一棵树、打印表达式前缀式'
        ] },
      { name: '中序 LDR', build: makeBuild('LDR', '中序遍历 LDR：左 → 根 → 右',
          '中序把 visit 夹在两个递归调用中间，所以要等左子树彻底走完才输出根。'),
        codeTag: '中序：visit 在中间',
        code: [
          'void InOrder(BiTree T) {',
          '    if (!T) return;',
          '    InOrder(T->lchild);     // 先把左子树走完',
          '    visit(T);               // ← 再访问根',
          '    InOrder(T->rchild);     // 最后走右子树',
          '}',
          '// 二叉排序树的中序序列递增，这是 BST 最要紧的性质'
        ] },
      { name: '后序 LRD', build: makeBuild('LRD', '后序遍历 LRD：左 → 右 → 根',
          '后序把 visit 写在两个递归调用之后，所以要等左右子树都走完才输出根。'),
        codeTag: '后序：visit 在最后',
        code: [
          'void PostOrder(BiTree T) {',
          '    if (!T) return;',
          '    PostOrder(T->lchild);   // 左子树',
          '    PostOrder(T->rchild);   // 右子树',
          '    visit(T);               // ← 最后访问根',
          '}',
          '// 序列末元素必为根；求树高、释放整棵树都得用后序'
        ] },
      { name: '非递归中序', build: buildIter,
        codeTag: '显式栈改写',
        code: [
          'void InOrderIter(BiTree T) {',
          '    p = T; InitStack(S);',
          '    while (p || !StackEmpty(S)) {',
          '        if (p) { Push(S, p); p = p->lchild; }   // 一路向左',
          '        else {',
          '            Pop(S, p); visit(p);               // 弹出即访问',
          '            p = p->rchild;                     // 转向右子树',
          '        }',
          '    }',
          '}'
        ] }
    ]
  };
})();
