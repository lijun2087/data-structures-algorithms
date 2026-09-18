/* 哈希表：哈希函数与冲突处理 — 第9章
 * 场景一：哈希函数与冲突（O(1) 直接寻址，抽屉原理必然冲突）
 * 场景二：开放定址法（线性探测的堆积现象）
 * 场景三：链地址法（每槽一条链，装填因子 α 与 ASL）
 * 场景四：删除的麻烦（线性探测不能直接删，要打墓碑标记）
 * 表长 M=11（质数），哈希函数 H(k) = k mod 11
 */
(function () {
  var D = window.VizDraw;

  var M = 11; // 表长
  function H(k) { return k % M; }

  /* 开放定址法的数据（刻意造出堆积：多个关键字映射到同一槽附近）
   * 47→3, 14→3, 25→3, 36→3  → 全映射到槽3，连续探测形成堆积
   * 另加 7→7, 19→8, 1→1, 90→2 */
  var OA_KEYS = [47, 7, 14, 25, 19, 36, 1, 90];

  /* 链地址法数据：同样用 mod 11 */
  var CA_KEYS = [22, 33, 11, 44, 7, 18, 55, 66, 99, 3, 14];

  // 哈希表格子布局：11 个槽，横排
  var TX = 40, TY = 154, TW = 76, TH = 44, TG = 8;
  function slotX(i) { return TX + i * (TW + TG); } // i=0..10

  /* 画哈希表格子（开放定址用） */
  function renderOATable(ctx, f) {
    D.clear(ctx.stage);
    var i;
    for (i = 0; i < M; i++) {
      var x = slotX(i);
      var val = f.table[i];
      var state = (f.st && f.st[i]) || (val === null ? 'idle' : 'done');
      if (val === -1) state = 'mute'; // 墓碑
      var c = D.C[state];
      ctx.stage.appendChild(D.el('rect', { x: x, y: TY, width: TW, height: TH, rx: 7,
        fill: c.fill, stroke: c.stroke, 'stroke-width': 2 }));
      ctx.stage.appendChild(D.text(val === null ? '' : (val === -1 ? '✕' : val), {
        x: x + TW/2, y: TY + TH/2 + 7, 'class': 'vz-cellval'
      }));
      ctx.stage.appendChild(D.text(i, { x: x + TW/2, y: TY + TH + 17, 'class': 'vz-idx' }));
    }
    // 当前探测指针
    if (f.ptr !== null && f.ptr >= 0 && f.ptr < M) {
      D.pointer(ctx.stage, { x: slotX(f.ptr) + TW/2, y: TY - 2,
        name: f.pname || 'H', above: true, color: '#ffd166' });
    }
    ctx.stats = f.stats || {};
  }

  function stepOA(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { renderOATable(c, f); } };
  }

  function snapOA(table, st, ptr, pname, stats) {
    var t2 = table.slice(), s2 = {};
    if (st) for (var k in st) s2[k] = st[k];
    return { table: t2, st: s2, ptr: ptr !== undefined ? ptr : null,
             pname: pname || 'H', stats: stats || {} };
  }

  /* ---- 场景一：哈希函数与冲突原理 ---- */
  function buildConcept() {
    var steps = [];
    var table = [];
    for (var i = 0; i < M; i++) table.push(null);

    function renderConcept(ctx, f) {
      D.clear(ctx.stage);
      var i;
      for (i = 0; i < M; i++) {
        var x = slotX(i);
        var val = f.table[i];
        var state = (f.st && f.st[i]) || (val !== null ? 'done' : 'idle');
        var c = D.C[state];
        ctx.stage.appendChild(D.el('rect', { x: x, y: TY, width: TW, height: TH, rx: 7,
          fill: c.fill, stroke: c.stroke, 'stroke-width': 2 }));
        ctx.stage.appendChild(D.text(val === null ? '' : val, {
          x: x + TW/2, y: TY + TH/2 + 7, 'class': 'vz-cellval'
        }));
        ctx.stage.appendChild(D.text(i, { x: x + TW/2, y: TY + TH + 17, 'class': 'vz-idx' }));
      }
      if (f.arrow && f.arrow.from !== undefined) {
        var ax = f.arrow.from * (TW + TG + 0) + 200;
        var tx = slotX(f.arrow.to) + TW/2;
        ctx.stage.appendChild(D.text('H(' + f.arrow.key + ')=' + f.arrow.to, {
          x: tx, y: TY - 30, 'class': 'vz-tag', fill: '#ffd166'
        }));
        ctx.stage.appendChild(D.el('line', { x1: tx, y1: TY - 20, x2: tx, y2: TY - 4,
          stroke: '#ffd166', 'stroke-width': 2, 'marker-end': 'url(#vzHot)' }));
      }
      if (f.conflict) {
        ctx.stage.appendChild(D.text('冲突！两个关键字映射到同一槽', {
          x: 500, y: 108, 'class': 'vz-info', fill: '#dd3b3b'
        }));
      }
      ctx.stats = f.stats || {};
    }

    steps.push({ line: 0, narr: '哈希查找的思想：不比较，直接计算！H(key) = key mod M 把关键字映射到数组下标，O(1) 存取。',
      act: ['H(k)=k mod 11', '直接算地址', 'O(1) 存取'],
      run: function (c) { renderConcept(c, { table: table.slice(), st: {}, arrow: null, conflict: false,
        stats: { '哈希函数': 'H(k)=k mod M', '表长M': M, '思想': '算地址不比较', '理想': 'O(1)' } }); } });

    // 插入 22: H(22)=0
    var t1 = table.slice(); t1[0] = 22;
    steps.push({ line: 1, narr: 'H(22) = 22 mod 11 = 0，把 22 存到槽 0。查找时同样计算，O(1) 直达，完全不需要比较其他元素。',
      act: ['H(22)=22 mod 11=0', '存入槽0', '查找时原路返回'],
      run: function (c) { renderConcept(c, { table: t1.slice(), st: { 0: 'good' },
        arrow: { key: 22, to: 0 }, conflict: false,
        stats: { 'H(22)': 0, '存入槽': 0, '比较次数': 1, '冲突': '无' } }); } });

    // 插入 33: H(33)=0，冲突
    steps.push({ line: 2, narr: 'H(33) = 33 mod 11 = 0，但槽0已被22占用——这叫冲突。抽屉原理：元素>槽数时冲突不可避免。',
      act: ['H(33)=0（与22冲突）', '抽屉原理：必然冲突', '需要冲突处理策略'],
      run: function (c) { renderConcept(c, { table: t1.slice(), st: { 0: 'bad' },
        arrow: { key: 33, to: 0 }, conflict: true,
        stats: { 'H(33)': 0, '冲突槽': 0, '冲突': '是', '原因': '抽屉原理' } }); } });

    steps.push({ line: 3, narr: '两种主要冲突处理：开放定址（在表内探测空位）和链地址（每槽挂一条链表）。各有利弊。',
      act: ['开放定址：在表内找空位', '链地址：挂链表', '两种方案各有利弊'],
      run: function (c) { renderConcept(c, { table: t1.slice(), st: {}, arrow: null, conflict: false,
        stats: { '方案1': '开放定址', '方案2': '链地址', '选择依据': '装填因子α', '理想α': '<0.75' } }); } });

    return steps;
  }

  /* ---- 场景二：开放定址法（线性探测） ---- */
  function buildOpenAddr() {
    var steps = [];
    var table = [];
    for (var i = 0; i < M; i++) table.push(null);
    var cmp = 0, total = 0;

    // 插入函数（会产生探测记录）
    function insertKey(key) {
      var h0 = H(key), pos = h0, probes = 0;
      while (table[pos] !== null) {
        pos = (pos + 1) % M;
        probes++;
      }
      table[pos] = key;
      return { h0: h0, pos: pos, probes: probes };
    }

    steps.push(stepOA(snapOA(table.slice(), {}, null, null,
      { '方法': '线性探测', '公式': 'H_i=(H+i) mod M', '堆积': '连续空位被抢占' }),
      0, '开放定址：冲突时在原槽基础上线性向后探测，找到空槽就存入。表内不另开链，一张表存一切。',
      ['冲突→向后探测', 'H_i=(H(k)+i) mod M', '不用额外空间']));

    // 按顺序插入，演示堆积
    var insertOrder = [47, 14, 25, 36]; // 都映射到槽3
    for (var qi = 0; qi < insertOrder.length; qi++) {
      var key = insertOrder[qi];
      var h0 = H(key);
      var pos = h0;
      var probes = 0;
      // 演示探测过程
      while (table[pos] !== null) {
        var stProbe = {};
        for (var k2 = 0; k2 < M; k2++) if (table[k2] !== null) stProbe[k2] = 'done';
        stProbe[pos] = 'bad';
        cmp++;
        steps.push(stepOA(snapOA(table.slice(), stProbe, pos, 'H',
          { '插入': key, 'H(k)': h0, '探测槽': pos, '冲突次数': probes }),
          2, 'H(' + key + ')=' + h0 + '，槽' + pos + '已被占，线性探测下一槽 ' + ((pos+1)%M) + '。这叫"堆积"——附近连锁满。',
          ['H(' + key + ')=' + h0, '槽' + pos + '已占', '探测→' + ((pos+1)%M)]));
        pos = (pos + 1) % M;
        probes++;
      }
      var stFinal = {};
      for (var k3 = 0; k3 < M; k3++) if (table[k3] !== null) stFinal[k3] = 'done';
      stFinal[pos] = 'good';
      table[pos] = key;
      cmp++;
      total++;
      steps.push(stepOA(snapOA(table.slice(), stFinal, pos, 'H',
        { '插入': key, '存入槽': pos, '探测次数': probes + 1, '已填': total }),
        3, '槽' + pos + '为空，把 ' + key + ' 存入。经过 ' + (probes+1) + ' 次探测才找到位置，堆积严重时代价越来越大。',
        ['存入槽' + pos, '探测' + (probes+1) + '次', total + '/' + M + '已填']));
    }

    steps.push(stepOA(snapOA(table.slice(), {}, null, null,
      { '堆积原因': '同余关键字聚簇', '解决': '二次探测/双哈希', '装填因子α': (total/M).toFixed(2) }),
      -1, '堆积（Clustering）：多个关键字落入同一区域后互相争占位置，导致链式探测次数不断增加。二次探测可缓解。',
      ['堆积 = 连锁冲突', '二次探测缓解', 'α应<0.75']));

    return steps;
  }

  /* ---- 场景三：链地址法 ---- */
  function buildChaining() {
    var steps = [];
    var chains = [];
    var i;
    for (i = 0; i < M; i++) chains.push([]);

    function snapChains(chs, hlSlot, hlNew, stats) {
      var c2 = [];
      for (var s = 0; s < M; s++) c2.push(chs[s].slice()); // 每槽独立 slice
      return { chains: c2, hlSlot: hlSlot !== undefined ? hlSlot : -1,
               hlNew: hlNew, stats: stats || {} };
    }

    function renderChain(ctx, f) {
      D.clear(ctx.stage);
      var j;
      var hx = 44, hy = 98, hw = 50, hh = 24, hg = 2;
      ctx.stage.appendChild(D.text('槽', { x: hx+hw/2, y: hy-10, 'class': 'vz-idx' }));
      for (i = 0; i < M; i++) {
        var iy = hy + i * (hh + hg);
        var col = D.C[i === f.hlSlot ? 'hot' : 'idle'];
        ctx.stage.appendChild(D.el('rect', { x: hx, y: iy, width: hw, height: hh, rx: 5,
          fill: col.fill, stroke: col.stroke, 'stroke-width': 1.5 }));
        ctx.stage.appendChild(D.text(i, { x: hx+hw/2, y: iy+hh/2+5, 'class': 'vz-idx' }));
        var chain = f.chains[i];
        for (j = 0; j < chain.length && j < 5; j++) {
          var nx = hx + hw + 16 + j * 62;
          var isNew = (i === f.hlSlot && j === chain.length - 1 && f.hlNew > 0);
          var nc = D.C[isNew ? 'good' : 'done'];
          ctx.stage.appendChild(D.el('rect', { x: nx, y: iy, width: 52, height: hh, rx: 5,
            fill: nc.fill, stroke: nc.stroke, 'stroke-width': 1.5 }));
          ctx.stage.appendChild(D.text(chain[j], { x: nx+26, y: iy+hh/2+5,
            'class': 'vz-cellval', 'font-size': 13 }));
          var lx1 = j === 0 ? hx+hw : nx-14;
          ctx.stage.appendChild(D.el('line', { x1: lx1, y1: iy+hh/2, x2: nx-2, y2: iy+hh/2,
            stroke: '#5b8cff', 'stroke-width': 1.5, 'marker-end': 'url(#vzNext)' }));
        }
        if (chain.length === 0) {
          ctx.stage.appendChild(D.text('∅', {
            x: hx+hw+24, y: iy+hh/2+5, 'class': 'vz-idx', fill: '#4a5c82' }));
        }
      }
      ctx.stats = f.stats || {};
    }

    function chainStep(chs, hlSlot, hlNew, line, narr, act, stats) {
      var f = snapChains(chs, hlSlot, hlNew, stats);
      return { line: line, narr: narr, act: act, run: function (c) { renderChain(c, f); } };
    }

    var filled = 0;
    steps.push(chainStep(chains, -1, -1, 0,
      '链地址法：每个槽挂一条链表，H(k)=i 的关键字都追加到槽 i 的链里。表不会满，冲突不蔓延。',
      ['每槽挂链表', '冲突→追加链', '表不会满'],
      { '方法': '链地址', 'M': M, '冲突处理': '挂链', '无需探测': '是' }));

    var insertKeys = [22, 33, 11, 44, 55];
    for (var qi = 0; qi < insertKeys.length; qi++) {
      var key = insertKeys[qi];
      var slot = H(key);
      chains[slot].push(key);
      filled++;
      var alpha = (filled / M).toFixed(2);
      steps.push(chainStep(chains, slot, filled, 1,
        'H(' + key + ')=' + slot + '，加入槽' + slot + '的链尾。冲突只影响该槽链长，不污染其他槽——这是链地址的优势。',
        ['H(' + key + ')=' + slot, '加入槽' + slot + '链尾', 'α=' + alpha],
        (function(k,s,a,f){ var st={}; st['H('+k+')'] = s; st['链长'] = chains[s].length; st['装填因子α'] = a; st['已插入'] = f; return st; }(key,slot,alpha,filled))));
    }

    steps.push(chainStep(chains, -1, -1, 2,
      '装填因子 α=n/M。链地址成功 ASL ≈ 1+α/2，失败 ASL ≈ α。α 可以大于 1，链越长查找越慢。',
      ['ASL成功 ≈ 1+α/2', 'ASL失败 ≈ α', 'α可>1'],
      { '装填因子α': (filled/M).toFixed(2), 'ASL成功': '1+α/2', 'ASL失败': 'α', 'α允许大于1': '是' }));

    return steps;
  }

  /* ---- 场景四：删除的麻烦（线性探测） ---- */
  function buildDelete() {
    var steps = [];
    // 先建一个小哈希表，插入若干元素，然后演示删除的麻烦
    var table = [];
    for (var i = 0; i < M; i++) table.push(null);
    // 插入 47→3, 14→3（线性探测到4）, 25→3（探测到5）
    table[3] = 47; table[4] = 14; table[5] = 25;

    steps.push(stepOA(snapOA(table.slice(), { 3: 'done', 4: 'done', 5: 'done' }, null, null,
      { '槽3': 47, '槽4': 14, '槽5': 25, '链': '3→4→5探测链' }),
      0, '已有 47→槽3，14 冲突探测到槽4，25 冲突探测到槽5。它们形成一条"探测链"：3→4→5。',
      ['47 在槽3', '14 探到槽4', '25 探到槽5']));

    // 演示如果直接删除 14（槽4），查找 25 会断链
    var t2 = table.slice(); t2[4] = null;
    steps.push(stepOA(snapOA(t2, { 3: 'done', 4: 'bad', 5: 'done' }, 4, null,
      { '操作': '直接删除14', '槽4': 'null', '问题': '链断了！' }),
      2, '若直接删除槽4的 14，槽4变空。查找 25 时，H(25)=3→槽4为空→误判"不存在"，实际25还在槽5！',
      ['删14→槽4变空', '查25：3→4空→失败', '其实25在槽5！']));

    // 正确做法：打墓碑标记（-1）
    var t3 = table.slice(); t3[4] = -1;
    steps.push(stepOA(snapOA(t3, { 3: 'done', 4: 'mute', 5: 'done' }, 4, null,
      { '操作': '墓碑标记', '槽4': '✕(deleted)', '查找': '遇墓碑继续' }),
      3, '正确做法：把槽4 标记为"已删除"（墓碑 ✕），而不是变成 null。查找时遇墓碑继续探测，插入时墓碑可复用。',
      ['槽4 打墓碑✕', '查找遇✕继续', '插入可复用✕']));

    steps.push(stepOA(snapOA(t3, {}, null, null,
      { '墓碑策略': '查找继续，插入复用', '代价': '墓碑多了表变慢', '根本解': '定期重建哈希表' }),
      -1, '墓碑越积越多，表会越来越慢。实际工程中常定期重建整张哈希表来清理墓碑，或改用链地址法回避此问题。',
      ['墓碑越多越慢', '需定期重建', '链地址无此问题']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['hash-table'] = {
    title: '哈希表 Hash Table',
    subtitle: 'H(k) = k mod M 直接算地址，理想 O(1) 查找。冲突处理是核心：开放定址有堆积，链地址更灵活。',
    height: 700,
    code: [
      'H(key) = key % M;      // 哈希函数',
      'if (a[H(key)] == null) // 无冲突，直接存',
      '    a[H(key)] = key;',
      'else                   // 冲突：需要处理',
      '    处理冲突（开放定址/链地址）'
    ],
    scenes: [
      { name: '函数与冲突', build: buildConcept,
        codeTag: 'O(1) 与抽屉原理',
        code: [
          'H(key) = key % M;        // mod 取余',
          'if (table[H(k)] == null)  // 直接存',
          '    table[H(k)] = key;',
          '// 若槽已占：冲突',
          '// 抽屉原理：n>M 时必有冲突'
        ] },
      { name: '开放定址', build: buildOpenAddr,
        codeTag: '线性探测与堆积',
        code: [
          'H_i(k) = (H(k)+i) % M;   // 线性探测',
          'while (table[pos] != null)',
          '    pos = (pos+1) % M;    // 逐个往后',
          'table[pos] = key;          // 找到空位存入'
        ] },
      { name: '链地址法', build: buildChaining,
        codeTag: '每槽挂链，装填因子α',
        code: [
          'slot = H(key);             // 定槽',
          '链表插入(table[slot], key); // 头插或尾插',
          '// ASL成功 ≈ 1 + α/2',
          '// α = n/M，可>1'
        ] },
      { name: '删除难题', build: buildDelete,
        codeTag: '墓碑标记',
        code: [
          '// 开放定址不能直接删：',
          '// 直接置 null → 断探测链',
          '// 正确：打墓碑标记 DELETED',
          '// 查找遇墓碑继续；插入可复用'
        ] }
    ]
  };
})();
