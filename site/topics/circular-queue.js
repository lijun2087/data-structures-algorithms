/* 循环队列 — 第3章
 * 场景一：顺序队列的假溢出 —— front、rear 只增不减，整段队列一路向右漂，
 *         rear 撞到边界时前面还空着一片，空间明明有却用不上。
 * 场景二：下标取模回绕 —— 尾满了绕回头部；队空是 front==rear，
 *         队满则要另想办法区分，书上给了三种判法。
 * 快照模板同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 布局：6 格横排，格宽 64、间隙 8，自 x=120 起，末格止于 544；
   * 右侧 x=636 之后留给提示文字，不会挤到。
   * 竖直方向自上而下：标题 100、说明 124 / 148、回绕弧 164、弧上标注 180、
   * 格子 196…240、下标 256、front 标记 278、rear 标记 300，全在 336 以内。 */
  var N = 6;
  var CX0 = 120, CW = 64, CG = 8, CY = 196, CH = 44;
  var NX = 636;

  function cxOf(i) { return CX0 + i * (CW + CG); }
  function ccOf(i) { return cxOf(i) + CW / 2; }

  // st 是下标键的字典，每帧都得留一份副本，不然回退会串味
  function cp(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }

  // 键是下标，必须逐个赋值；字面量 { i: … } 只会得到字符串键 "i"
  function mark() {
    var o = {};
    for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /* f = { cells:[值或 null ×N], st:{下标:状态}, front, rear, wrap:bool,
   *       wrapTxt, hdr, cap1, cap2, notes, stats }
   * front / rear 可以等于 N（顺序队列越界时），此时标记画在末格右侧 */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, x, c, v;

    ctx.stage.appendChild(D.text(f.hdr || '循环队列',
      { x: 44, y: 100, 'class': 'vz-hdr', fill: '#8fa6d8' }));
    if (f.cap1) {
      ctx.stage.appendChild(D.text(f.cap1,
        { x: 44, y: 124, 'class': 'vz-lab', fill: '#ffd166' }));
    }
    if (f.cap2) {
      ctx.stage.appendChild(D.text(f.cap2,
        { x: 44, y: 148, 'class': 'vz-info', fill: '#8ea3c9' }));
    }

    /* 回绕弧画在格子上方：从末格顶上抬起，横过去落回首格。
     * 两个控制点都压到 y=154，实际弧顶约在 164，正好卡在说明与格子之间。 */
    if (f.wrap) {
      ctx.stage.appendChild(D.el('path', {
        d: 'M ' + ccOf(N - 1) + ' 192 C ' + ccOf(N - 1) + ' 154, ' +
           ccOf(0) + ' 154, ' + ccOf(0) + ' 192',
        fill: 'none', stroke: D.LINE.ptr, 'stroke-width': 2,
        'marker-end': 'url(#vzPtr)' }));
    }
    if (f.wrapTxt) {
      ctx.stage.appendChild(D.text(f.wrapTxt,
        { x: ccOf(0) + 180, y: 180, 'class': 'vz-tag', fill: '#6ceaa5' }));
    }

    for (i = 0; i < N; i++) {
      x = cxOf(i);
      c = D.C[f.st[i] || (f.cells[i] == null ? 'mute' : 'good')];
      ctx.stage.appendChild(D.el('rect', { x: x, y: CY, width: CW,
        height: CH, rx: 7, fill: c.fill, stroke: c.stroke,
        'stroke-width': 2, filter: 'url(#vzGlow)' }));
      v = f.cells[i];
      if (v != null) {
        ctx.stage.appendChild(D.text(v,
          { x: x + CW / 2, y: CY + 29, 'class': 'vz-cellval' }));
      }
      ctx.stage.appendChild(D.text(i,
        { x: x + CW / 2, y: CY + CH + 16, 'class': 'vz-idx' }));
    }

    // front 与 rear 分两行标，指到同一格也不会叠在一起
    ctx.stage.appendChild(D.text('front ↑ ' + f.front,
      { x: f.front < N ? ccOf(f.front) : cxOf(N - 1) + CW + 40, y: 278,
        'class': 'vz-ptr' }));
    ctx.stage.appendChild(D.text('rear ↑ ' + f.rear,
      { x: f.rear < N ? ccOf(f.rear) : cxOf(N - 1) + CW + 40, y: 300,
        'class': 'vz-ptr', fill: '#ff9f6b' }));

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

  /* ---------- 场景一：顺序队列的假溢出 ---------- */
  /* 入 3 个、出 2 个、再入 3 个，rear 就撞到 6 了 —— 可 0、1 两格明明空着。
   * front、rear 都只增不减，整段队列一路向右漂，这才是「假」溢出。 */
  function buildFake() {
    var steps = [];
    var cells = [null, null, null, null, null, null];
    var st = {}, front = 0, rear = 0;

    var snap = function (o) {
      return { cells: cells.slice(), st: cp(st), front: front, rear: rear,
               wrap: false, wrapTxt: null,
               hdr: o.hdr || '顺序队列　MAXSIZE = 6',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    var base = function () {
      return { 'front / rear': front + ' / ' + rear,
               '队内元素': rear - front,
               '废掉的格子': front, '还空着': N - rear };
    };

    function enq(v) {
      var at = rear;
      cells[at] = v; rear++;
      st[at] = 'active';
      steps.push(step(snap({
        cap1: 'EnQueue(' + v + ')：写进 base[' + at + ']，rear 走到 ' + rear,
        cap2: '入队只动 rear 这一端，front 一动不动',
        stats: base(),
        notes: ['base[' + at + '] ← ' + v,
          'rear：' + at + ' → ' + rear,
          'rear 指的是下一个空位',
          '队内 ' + (rear - front) + ' 个元素'] }), 2,
        '入队 ' + v + '：放进 base[' + at + ']，然后 rear 加一走到 ' + rear + '。' +
        'rear 指的从来不是队尾元素，而是下一个待插入的空位 —— 所以队内元素个数正好是 rear − front。',
        ['EnQueue(' + v + ')', 'base[' + at + '] ← ' + v,
         'rear → ' + rear]));
      delete st[at];
    }

    function deq() {
      var at = front, v = cells[at];
      cells[at] = null; front++;
      st[at] = 'idle';
      steps.push(step(snap({
        cap1: 'DeQueue：取走 base[' + at + '] 的 ' + v + '，front 走到 ' + front,
        cap2: '第 ' + at + ' 格就此废掉 —— front 不回头，谁也捡不起来',
        stats: base(),
        notes: ['取出 ' + v + '，front：' + at + ' → ' + front,
          '第 ' + at + ' 格空了，却收不回来',
          'front 左边那一片全是废格',
          '队列整段在往右漂'] }), 4,
        '出队 ' + v + '：从 base[' + at + '] 取走，front 加一。要紧的是第 ' + at +
        ' 格虽然空了，却再也用不上 —— front 只增不减，它左边那片就成了废格，队列整段往右漂。',
        ['DeQueue → ' + v, 'front → ' + front,
         '第 ' + at + ' 格废掉']));
    }

    steps.push(step(snap({
      cap1: '队列两头分工：rear 只管入队，front 只管出队',
      cap2: '顺序存储最省事的写法 —— 两个下标都只往右走，从不回头',
      stats: { 'MAXSIZE': N, 'front': 0, 'rear': 0, '队内元素': 0 },
      notes: ['front 指队头元素所在的格',
        'rear 指下一个待插入的空格',
        'front == rear 即队空',
        '先看这样写会撞上什么麻烦'] }), -1,
      '队列是两头开口的：一端入、一端出，所以要两个下标。顺序存储时最省事的写法是让 front、' +
      'rear 都只往右走 —— 入队 rear 加一，出队 front 加一。看着没毛病，麻烦马上就来。',
      ['rear 管入队，front 管出队', '两个下标都只增不减',
       'front == rear 即队空']));

    steps.push(step(snap({
      cap1: 'InitQueue：front = rear = 0，队空',
      cap2: '六个格子全空着，rear 指向 0 号，等着第一个元素',
      stats: { 'MAXSIZE': N, 'front': 0, 'rear': 0, '队内元素': 0 },
      notes: ['空队列：front 与 rear 同为 0',
        '队内元素个数 = rear − front',
        '所以 rear == front 就是空',
        '这个判据一直有效'] }), 1,
      '初始化：front 和 rear 都置 0，队空。队内元素个数就是 rear − front，' +
      '所以「front == rear」正是队空的判据 —— 这一条在顺序队列里一直成立，不会有歧义。',
      ['front = rear = 0', '元素个数 = rear − front',
       'front == rear → 队空']));

    // 入 3 出 2 再入 3：rear 正好撞到 6，而 0、1 两格空着没人要
    enq('A'); enq('B'); enq('C');
    deq(); deq();
    enq('D'); enq('E'); enq('F');

    steps.push(step(snap({
      hdr: '假溢出　rear == MAXSIZE，可 0、1 两格明明空着',
      cap1: 'rear 已经等于 6 —— 再入队就要越界，只能报「队满」',
      cap2: '可数一数：队里只有 4 个元素，0、1 两格空在那儿谁也用不上',
      stats: { 'front / rear': '2 / 6', '队内元素': 4,
               '空着的格子': 2, '判定': '假溢出' },
      notes: ['rear == MAXSIZE，报满',
        '可空间并没有真的用尽',
        '0、1 两格是出队让出来的',
        'front 不回头，它们就成了死空间'] }), 7,
      '再入队就要越界，只好报「队满」—— 可队里明明只有 4 个元素，0、1 两格空着。' +
      '空间没用尽却说满了，这就叫假溢出。根子在 front、rear 只增不减，整段队列一路右漂。',
      ['rear == MAXSIZE = 6', '队内只有 4 个元素',
       '空着 2 格却用不上']));

    steps.push(step(snap({
      hdr: '一个笨办法：每次出队都把后面的整体左移',
      cap1: '让 front 永远停在 0，废格自然就不存在了',
      cap2: '代价是出队从 O(1) 掉成 O(n) —— 队列最看重的那点快就没了',
      stats: { '出队代价': 'O(n)', '每次搬动': '至多 5 个',
               'front': '恒为 0', '结论': '不可取' },
      notes: ['出队后把后面的元素全往前搬一格',
        'front 恒为 0，确实没有废格了',
        '可每次出队都要搬 O(n) 个元素',
        '入队出队本该都是 O(1)'] }), -1,
      '有个笨办法：每次出队后把后面的元素整体左移一格，让 front 永远停在 0，废格自然消失。' +
      '可这样一次出队要搬 O(n) 个元素 —— 队列本该入出队都是 O(1)，这代价换不来。',
      ['左移让 front 恒为 0', '出队代价升到 O(n)',
       '得换个思路']));

    steps.push(step(snap({
      hdr: '换个思路：让下标绕回去',
      cap1: '空间是够的，问题只是 rear 撞到边界就不肯回头',
      cap2: '把数组首尾接成一个环 —— rear 走到 6 就绕回 0，这就是循环队列',
      stats: { '真正的毛病': 'rear 不回头', '解法': '下标取模回绕',
               '代价': 'O(1)', '下一场景': '取模回绕' },
      notes: ['空间够用，只是首尾没接上',
        'rear 到头就绕回 0 号格',
        '一个取模就够：(rear + 1) % MAXSIZE',
        '出队照旧 O(1)，废格不再存在'] }), 8,
      '空间是够的，问题只是 rear 撞到边界就不肯回头。既然前面空着，那就让下标绕回去 —— ' +
      '把数组首尾接成一个环，加一个取模就完事，入队出队仍是 O(1)。这就是循环队列。',
      ['把数组首尾接成环', 'rear = (rear + 1) % MAXSIZE',
       '入出队都还是 O(1)']));

    return steps;
  }

  /* ---------- 场景二：取模回绕，以及队空队满怎么分 ---------- */
  /* 同样入 3 出 2、再入 3：rear 走到 5 之后取模回到 0，出队让出来的格子
   * 就被捡回来用上了。可再入一个，rear 就追上 front —— front == rear
   * 同时既像空又像满，这道歧义才是循环队列真正要解决的问题。 */
  function buildCirc() {
    var steps = [];
    var cells = [null, null, null, null, null, null];
    var st = {}, front = 0, rear = 0, cnt = 0;

    var snap = function (o) {
      return { cells: cells.slice(), st: cp(st), front: front, rear: rear,
               wrap: !!o.wrap, wrapTxt: o.wrapTxt || null,
               hdr: o.hdr || '循环队列　MAXSIZE = 6，首尾接成环',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };
    // 个数不能再写 rear − front 了：rear 绕回头部时那个差会变成负数
    var base = function () {
      return { 'front / rear': front + ' / ' + rear,
               '队内元素': '(' + rear + '−' + front + '+6) % 6 = ' + cnt,
               '还能入队': (N - 1 - cnt) + ' 个' };
    };

    function enq(v) {
      var at = rear, wr, reuse = cells[at] === null && at < front;
      cells[at] = v; rear = (rear + 1) % N; cnt++;
      wr = rear === 0;
      st[at] = 'active';
      steps.push(step(snap({
        wrap: wr, wrapTxt: wr ? 'rear：' + at + ' + 1 → 0' : null,
        cap1: 'EnQueue(' + v + ')：写进 base[' + at + ']，rear = (' + at +
              ' + 1) % 6 = ' + rear,
        cap2: wr ? 'rear 走到末格就绕回 0 —— 数组的首尾在这里接上了'
                 : (reuse ? '这一格是先前出队让出来的，现在名正言顺地被用上'
                          : '没到边界时，取模和「加一」没有任何区别'),
        stats: base(),
        notes: ['base[' + at + '] ← ' + v,
          'rear = (' + at + ' + 1) % 6 = ' + rear,
          wr ? '下标绕回 0，没有越界' :
               (reuse ? '用的是回收来的格子' : '此处取模等同于加一'),
          '队内 ' + cnt + ' 个，还能再放 ' + (N - 1 - cnt) + ' 个'] }),
        wr ? 2 : 1,
        '入队 ' + v + '：写进 base[' + at + ']，然后 rear 取模前进到 ' + rear + '。' +
        (wr ? '这一步是关键 —— rear 本该走到 6，取模之后落回 0 号格。数组的首尾就这样接成了环，' +
              '前面出队腾出的空间从此能被重新使用。'
            : (reuse ? '注意这一格正是先前出队让出来的 —— 在顺序队列里它是废格，' +
                       '在循环队列里它又回到了可用状态。'
                     : '没到边界时取模不起作用，和普通的加一完全一样。')),
        ['base[' + at + '] ← ' + v,
         'rear → ' + rear + (wr ? '（绕回）' : ''),
         '队内 ' + cnt + ' 个']));
      delete st[at];
    }

    function deq() {
      var at = front, v = cells[at], wr;
      cells[at] = null; front = (front + 1) % N; cnt--;
      wr = front === 0;
      st[at] = 'done';
      steps.push(step(snap({
        wrap: wr, wrapTxt: wr ? 'front：' + at + ' + 1 → 0' : null,
        cap1: 'DeQueue：取走 base[' + at + '] 的 ' + v + '，front = (' + at +
              ' + 1) % 6 = ' + front,
        cap2: wr ? 'front 同样要取模 —— 它也得能绕回 0，否则一样会撞边界'
                 : '第 ' + at + ' 格立刻回到可用状态，等着被下一次入队用掉',
        stats: base(),
        notes: ['取出 ' + v + '，front → ' + front,
          '第 ' + at + ' 格重新变成空格',
          wr ? 'front 绕回 0 号，两个下标都要取模' : '它随时可以再被写入',
          '队内还剩 ' + cnt + ' 个'] }), wr ? 4 : 3,
        '出队 ' + v + '：从 base[' + at + '] 取走，front 取模前进到 ' + front + '。' +
        (wr ? 'front 也必须取模 —— 两个下标都在同一个环上跑，谁都可能走到头。'
            : '和顺序队列的差别就在这里：第 ' + at + ' 格空出来之后立刻回到可用状态，' +
              '不再是谁也捡不起来的废格。'),
        ['DeQueue → ' + v, 'front → ' + front + (wr ? '（绕回）' : ''),
         '第 ' + at + ' 格已回收']));
      delete st[at];
    }

    steps.push(step(snap({
      wrap: true, wrapTxt: '末格的下一格就是 0 号格',
      cap1: '把数组的首尾接起来 —— 下标一律取模 MAXSIZE',
      cap2: '格子还是那 6 个，变的只是「下一格」怎么算',
      stats: { 'MAXSIZE': N, 'front': 0, 'rear': 0, '队内元素': 0 },
      notes: ['物理上仍是一维数组',
        '逻辑上首尾相接成一个环',
        'rear = (rear + 1) % MAXSIZE',
        'front 同样取模'] }), -1,
      '循环队列并没有换存储结构 —— 底下还是那 6 个格子的一维数组。变的只是「下一格」的算法：' +
      '把加一换成取模加一，末格的下一格就落回 0 号格，数组的首尾在逻辑上接成了一个环。',
      ['存储仍是一维数组', '首尾在逻辑上接成环',
       '下标一律取模 MAXSIZE']));

    // 入 3 出 2，再连入 4 个：rear 从 5 取模绕回 0，出队让出的格子被捡回来用
    enq('A'); enq('B'); enq('C');
    deq(); deq();
    enq('D'); enq('E'); enq('F');
    enq('G');

    steps.push(step(snap({
      hdr: '还剩一个空格　front = 2，rear = 1',
      cap1: '队里 5 个元素，只剩 1 号格空着 —— 再入队 rear 就要撞上 front',
      cap2: '而 front == rear 在队空时也成立，一个式子两种含义，非分清不可',
      stats: { 'front / rear': front + ' / ' + rear, '队内元素': cnt,
               '空着的格子': N - cnt, '麻烦': 'front == rear 有歧义' },
      notes: ['0、1 两格都是出队回收来的',
        '假溢出没有了，空间用得满',
        '可再入一个，rear 就等于 front',
        '队空时 front == rear 也成立'] }), 5,
      '假溢出治好了 —— 出队让出的 0、1 两格都被重新用上，空间一点没浪费。' +
      '但新麻烦来了：再入一个元素，rear 就会追上 front，而队空时 front == rear 同样成立。' +
      '一个式子对应两种截然相反的状态，这道歧义必须解决。',
      ['空间不再浪费', '再入一个 rear 就撞上 front',
       'front == rear 既像空又像满']));

    return steps;
  }

  /* ---------- 场景三：front == rear 的歧义与三种判法 ---------- */
  /* 先把歧义摆出来：同一个 front == rear，一次是空、一次是满，画面完全不同
   * 但式子一模一样。再逐个看书上给的三种解法。 */
  function buildJudge() {
    var steps = [];
    var cells = [null, null, null, null, null, null];
    var st = {}, front = 0, rear = 0;

    var snap = function (o) {
      return { cells: cells.slice(), st: cp(st), front: front, rear: rear,
               wrap: !!o.wrap, wrapTxt: o.wrapTxt || null,
               hdr: o.hdr || '队空与队满怎么分',
               cap1: o.cap1 || null, cap2: o.cap2 || null,
               notes: o.notes || [], stats: o.stats || {} };
    };

    // 队空：front == rear == 2，六格全空
    front = 2; rear = 2;
    steps.push(step(snap({
      hdr: '情形一：队空　front == rear == 2',
      cap1: '六个格子全是空的，front 与 rear 重合在 2 号格',
      cap2: '判据 front == rear 成立 —— 这次它的含义是「空」',
      stats: { 'front': 2, 'rear': 2, '队内元素': 0, 'front == rear': '成立' },
      notes: ['队里一个元素都没有',
        'rear 指的空位就是 front 指的格',
        '此时 front == rear',
        '记住这个画面，下一步对比'] }), 5,
      '先看队空：元素全部出队之后，front 追上了 rear，两者都停在 2 号格。' +
      '此时 front == rear 成立，含义是「队空」。记住这个画面。',
      ['六格全空', 'front == rear == 2', '含义：队空']));

    // 队满：塞满六格，rear 绕回来又落在 2
    cells = ['E', 'F', 'A', 'B', 'C', 'D'];
    front = 2; rear = 2;
    steps.push(step(snap({
      hdr: '情形二：队满　front == rear == 2',
      wrap: true, wrapTxt: 'rear 绕了一整圈回到 2',
      cap1: '六个格子塞得满满当当，rear 绕完一圈又落回 2 号格',
      cap2: '判据 front == rear 照样成立 —— 可这次含义是「满」',
      stats: { 'front': 2, 'rear': 2, '队内元素': 6, 'front == rear': '成立' },
      notes: ['六格全被占满',
        'rear 转了一整圈回到起点',
        '此时 front == rear 也成立',
        '一个式子，两种相反的状态'] }), 5,
      '再看队满：从 2 号格起连入六个元素，rear 绕完整整一圈又落回 2 号格。' +
      'front == rear 依旧成立，可这回含义是「队满」。两个画面天差地别，判据却一模一样 —— ' +
      '光靠 front 和 rear 这两个下标，信息量不够。',
      ['六格全满', 'front == rear == 2', '含义：队满 —— 歧义！']));

    // 解法一：少用一个元素空间
    cells = [null, 'F', 'A', 'B', 'C', 'D'];
    front = 2; rear = 1;
    st = {}; st[1] = 'mute';
    steps.push(step(snap({
      hdr: '解法一：少用一个元素空间（最常用）',
      wrap: true, wrapTxt: '1 号格永远空着，作分隔用',
      cap1: '约定 1 号格空着不放东西，队满时 rear 就停在 front 前一格',
      cap2: '队空：front == rear　队满：(rear + 1) % MAXSIZE == front',
      stats: { 'front': 2, 'rear': 1, '实际可用': (N - 1) + ' 个',
               '判满': '(1+1)%6 == 2 ✓' },
      notes: ['牺牲一个格子换判据的唯一性',
        '队空：front == rear',
        '队满：(rear+1) % MAXSIZE == front',
        '个数：(rear − front + MAXSIZE) % MAXSIZE'] }), 6,
      '第一种解法最常用：约定队列永远空着一格不用。这样 rear 最多只能追到 front 的前一格，' +
      'front == rear 就只可能是队空了。队满改判 (rear + 1) % MAXSIZE == front —— ' +
      '代价是 6 个格子只能装 5 个元素。',
      ['空一格不用', '队空：front == rear',
       '队满：(rear+1)%MAXSIZE == front']));

    // 解法二：设标志变量
    cells = ['E', 'F', 'A', 'B', 'C', 'D'];
    front = 2; rear = 2; st = {};
    steps.push(step(snap({
      hdr: '解法二：另设标志位 flag',
      cap1: '入队成功就置 flag = 1，出队成功就置 flag = 0',
      cap2: 'front == rear 时再看 flag：0 是空，1 是满 —— 六个格子一个不浪费',
      stats: { 'front': 2, 'rear': 2, 'flag': 1, '判定': '队满' },
      notes: ['flag 记住最后一次操作是入还是出',
        '入队后 flag = 1，出队后 flag = 0',
        'front == rear && flag == 0 → 队空',
        'front == rear && flag == 1 → 队满'] }), 7,
      '第二种解法：加一个标志位 flag，入队成功置 1，出队成功置 0。' +
      'front == rear 时再看 flag —— 刚入队来的必然是满，刚出队来的必然是空。' +
      '好处是空间一格不浪费，代价是每次入出队都要多维护一个变量。',
      ['加标志位 flag', 'flag=0 → 空，flag=1 → 满',
       '空间全用上，多维护一个变量']));

    // 解法三：设计数器
    steps.push(step(snap({
      hdr: '解法三：另设计数器 count',
      cap1: '直接记住队里有多少个元素，不再靠下标去推',
      cap2: 'count == 0 是空，count == MAXSIZE 是满 —— 最直白，也最省心',
      stats: { 'front': 2, 'rear': 2, 'count': 6, '判定': 'count == MAXSIZE' },
      notes: ['count 直接就是队内元素个数',
        'count == 0 → 队空',
        'count == MAXSIZE → 队满',
        '求个数不用再取模换算'] }), 8,
      '第三种解法更直白：设一个计数器 count 记住队里的元素个数。count == 0 是空，' +
      'count == MAXSIZE 是满，连元素个数都不用再取模换算。三种解法各有取舍，' +
      '工程上第一种最常见 —— 只多写一个取模，不必额外维护状态。',
      ['加计数器 count', 'count == 0 → 空',
       'count == MAXSIZE → 满']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['circular-queue'] = {
    title: '循环队列 Circular Queue',
    subtitle: '顺序队列的 front、rear 只增不减，空间没用尽却报满 —— 这叫假溢出。把数组首尾接成环、下标取模就能治好，代价是要另想办法区分队空与队满。',
    height: 720,
    code: [
      'InitQueue:  front = rear = 0',
      'EnQueue(v): base[rear] = v; rear = (rear+1) % MAXSIZE',
      '            // 取模让 rear 从末格绕回 0 号格',
      'DeQueue:    v = base[front]; front = (front+1) % MAXSIZE',
      '            // front 同样要取模，它也在环上跑',
      '队空: front == rear                  // 三种判法都认这条',
      '队满: (rear+1) % MAXSIZE == front    // 解法一：空一格',
      '      front == rear && flag == 1     // 解法二：标志位',
      '      count == MAXSIZE               // 解法三：计数器',
      '个数: (rear - front + MAXSIZE) % MAXSIZE'
    ],
    scenes: [
      { name: '假溢出', build: buildFake,
        codeTag: '顺序队列：下标只增不减',
        code: [
          '// 顺序队列：两个下标都只增不减',
          'InitQueue:  front = rear = 0',
          'EnQueue(v): base[rear] = v; rear = rear + 1',
          '',
          'DeQueue:    v = base[front]; front = front + 1',
          '// 出队后 front 左边那片格子再也用不上了',
          '',
          'if rear == MAXSIZE: 报「队满」   // 可空间没真的用尽',
          '// 这就是假溢出：根子在 rear 撞到边界不肯回头'
        ] },
      { name: '取模回绕', build: buildCirc,
        codeTag: '循环队列：下标取模',
        code: [
          '// 循环队列：把数组首尾接成环，下标一律取模',
          'InitQueue:  front = rear = 0',
          'EnQueue(v): base[rear] = v',
          '            rear = (rear + 1) % MAXSIZE',
          '            // 取模让 rear 从末格绕回 0 号格',
          'DeQueue:    v = base[front]',
          '            front = (front + 1) % MAXSIZE',
          '            // front 同样要取模，它也在环上跑',
          '',
          '元素个数: (rear - front + MAXSIZE) % MAXSIZE',
          '// 不能再写 rear - front：绕回后那个差会变成负数'
        ] },
      { name: '队空/队满判定', build: buildJudge,
        codeTag: '三种判法' }
    ]
  };
})();
