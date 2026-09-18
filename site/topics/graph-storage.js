/* 邻接矩阵与邻接表 — 第7章
 * 场景一：邻接矩阵。场景二：邻接表。场景三：对比。
 * 快照架构同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var N = 6;
  var VNAME = ['A','B','C','D','E','F'];
  var EDGES = [
    [0,1,4],[0,2,2],[1,3,5],[1,4,3],
    [2,4,6],[3,5,7],[4,5,1],[2,3,8]
  ];
  var VX = [90, 200, 90, 310, 200, 310];
  var VY = [155, 155, 250, 155, 250, 250];
  var R = 18;

  var MX0 = 490, MY0 = 108, MCW = 36, MCH = 28;
  var LX0 = 490, LY0 = 108, LNW = 34, LNH = 26, LGAP = 8;

  function buildMatrix() {
    var i, j, e, adj = [];
    for (i = 0; i < N; i++) { adj.push([]); for (j = 0; j < N; j++) adj[i].push(0); }
    for (e = 0; e < EDGES.length; e++) adj[EDGES[e][0]][EDGES[e][1]] = EDGES[e][2];
    return adj;
  }
  var ADJ = buildMatrix();

  function drawGraph(g, stV, stE) {
    var i, e, x1, y1, x2, y2, dx, dy, len, ex1, ey1, ex2, ey2;
    stE = stE || {};
    for (e = 0; e < EDGES.length; e++) {
      var ef = EDGES[e][0], et = EDGES[e][1];
      var ekey = ef + '-' + et;
      x1=VX[ef]; y1=VY[ef]; x2=VX[et]; y2=VY[et];
      dx=x2-x1; dy=y2-y1; len=Math.sqrt(dx*dx+dy*dy)||1;
      ex1=x1+dx/len*R; ey1=y1+dy/len*R;
      ex2=x2-dx/len*(R+4); ey2=y2-dy/len*(R+4);
      D.link(g, {x1:ex1,y1:ey1,x2:ex2,y2:ey2,kind:stE[ekey]?'hot':'mute'});
      g.appendChild(D.text(EDGES[e][2], {
        x:(x1+x2)/2+(dy/len)*(-10), y:(y1+y2)/2+(-dx/len)*(-10), 'class':'vz-elab'
      }));
    }
    for (i = 0; i < N; i++) {
      D.circleNode(g, {x:VX[i],y:VY[i],r:R,state:(stV&&stV[i])||'idle',value:VNAME[i]});
    }
  }

  function drawMatrix(g, hiRow, hiCol, hiCell) {
    var i, j, x, y, val, col;
    for (j = 0; j < N; j++) {
      g.appendChild(D.text(VNAME[j], {x:MX0+(j+1)*MCW+MCW/2,y:MY0-6,'class':'vz-idx'}));
    }
    for (i = 0; i < N; i++) {
      g.appendChild(D.text(VNAME[i], {x:MX0+MCW/2,y:MY0+i*MCH+MCH/2+5,'class':'vz-idx'}));
      for (j = 0; j < N; j++) {
        x=MX0+(j+1)*MCW; y=MY0+i*MCH; val=ADJ[i][j];
        col = D.C.idle;
        if (hiCell && hiCell[i+'-'+j]) col = D.C.hot;
        else if (hiRow !== undefined && hiRow === i) col = D.C.active;
        else if (hiCol !== undefined && hiCol === j) col = D.C.active;
        g.appendChild(D.el('rect',{x:x,y:y,width:MCW,height:MCH,rx:3,
          fill:col.fill,stroke:col.stroke,'stroke-width':1.3}));
        g.appendChild(D.text(val===0?'∞':val, {x:x+MCW/2,y:y+MCH/2+5,
          'class':'vz-idx',fill:val===0?'#4a5c82':'#dfe8ff'}));
      }
    }
  }

  function drawAdjList(g, hiV) {
    var i, e, y, ex, nbrs, k, col;
    for (i = 0; i < N; i++) {
      y = LY0 + i*(LNH+LGAP);
      col = (hiV !== undefined && hiV === i) ? D.C.hot : D.C.idle;
      g.appendChild(D.el('rect',{x:LX0,y:y,width:LNW*2,height:LNH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(VNAME[i],{x:LX0+LNW,y:y+LNH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
      nbrs = [];
      for (e = 0; e < EDGES.length; e++) { if (EDGES[e][0]===i) nbrs.push(EDGES[e][1]); }
      if (nbrs.length === 0) {
        g.appendChild(D.text('∧',{x:LX0+LNW*2+20,y:y+LNH/2+5,'class':'vz-idx',fill:'#4a5c82'}));
      }
      for (k = 0; k < nbrs.length; k++) {
        ex = LX0 + LNW*2 + LGAP + k*(LNW*2 + LGAP*3);
        if (ex + LNW*2 > 960) break;
        D.link(g,{x1:LX0+LNW*2+(k>0?-LGAP*3+LGAP:0),y1:y+LNH/2,
          x2:ex,y2:y+LNH/2,kind:'next',arrow:false});
        g.appendChild(D.el('rect',{x:ex,y:y,width:LNW*2,height:LNH,rx:4,
          fill:D.C.active.fill,stroke:D.C.active.stroke,'stroke-width':1.3}));
        g.appendChild(D.text(VNAME[nbrs[k]],{x:ex+LNW/2,y:y+LNH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
      }
    }
  }

  /* ===== 场景一：邻接矩阵 ===== */
  function buildSceneMatrix() {
    var steps = [];
    function step(f, line, narr, act) {
      return { line: line, narr: narr, act: act,
               run: function(c) {
                 D.clear(c.stage);
                 drawGraph(c.stage, f.stV, f.stE);
                 drawMatrix(c.stage, f.hiRow, f.hiCol, f.hiCell);
                 if (f.note) c.stage.appendChild(D.text(f.note,
                   {x:44,y:330,'class':'vz-info',fill:'#ffd166'}));
                 c.stats = f.stats||{};
               }};
    }
    function snap(o) {
      return {stV:o.stV||{},stE:o.stE||{},hiRow:o.hiRow,hiCol:o.hiCol,
              hiCell:o.hiCell||null,note:o.note||null,stats:o.stats||{}};
    }

    steps.push(step(snap({
      stats:{'顶点数 n':6,'边数 e':8,'矩阵大小':'n×n=36','类型':'有向图'}
    }),0,'邻接矩阵用 n×n 二维数组记录图。arr[i][j] 非零表示从 i 到 j 有边，值就是权；0代表无边。',
    ['6个顶点、8条有向边','arr[i][j]=权值','0表示无边']));

    steps.push(step(snap({hiRow:0,
      stats:{'查 A 的出度':'数第0行非0项','出度':'2','A→B':4,'A→C':2}
    }),1,'有向图求顶点 A 的出度：数第 0 行非0项——A→B(4)、A→C(2)，出度=2。入度要数列，O(n)。',
    ['高亮第0行=顶点A','出度=非0项数=2','入度须扫整列']));

    steps.push(step(snap({hiCol:3,
      stats:{'查 D 的入度':'数第3列非0项','入度':'2','B→D':5,'C→D':8}
    }),2,'有向图求 D 的入度：数第 3 列非0项——B→D(5)、C→D(8)，入度=2。求一次入度要扫整列 O(n)。',
    ['高亮第3列=顶点D','入度=非0项数=2','代价 O(n)']));

    var hc={}; hc['1-3']=1; hc['2-3']=1;
    steps.push(step(snap({hiCell:hc,
      note:'无向图：arr[i][j]=arr[j][i]，矩阵关于主对角线对称',
      stats:{'判断邻接':'O(1)直接查表','有向图':'不对称','无向图':'对称','空间':'O(n²)'}
    }),3,'有向图矩阵不对称；无向图 arr[i][j]=arr[j][i]，关于主对角线对称，存一半即可节省空间。',
    ['有向→不对称','无向→对角线对称','判断邻接 O(1)']));

    steps.push(step(snap({
      stats:{'空间':'O(n²)','稠密图':'合适','稀疏图':'大量格子是0','浪费':'e≪n²时浪费严重'}
    }),4,'矩阵判断两顶点是否相邻只需 O(1)，代价是空间 O(n²)。若图稀疏（e≪n²），大量格子存0，浪费严重。',
    ['判断邻接 O(1)','空间 O(n²)','稀疏图浪费空间']));

    return steps;
  }

  /* ===== 场景二：邻接表 ===== */
  function buildSceneList() {
    var steps = [];
    function step(f, line, narr, act) {
      return { line: line, narr: narr, act: act,
               run: function(c) {
                 D.clear(c.stage);
                 drawGraph(c.stage, f.stV, f.stE);
                 drawAdjList(c.stage, f.hiV);
                 if (f.note) c.stage.appendChild(D.text(f.note,
                   {x:44,y:330,'class':'vz-info',fill:'#ffd166'}));
                 c.stats = f.stats||{};
               }};
    }
    function snap(o) {
      return {stV:o.stV||{},stE:o.stE||{},hiV:o.hiV,note:o.note||null,stats:o.stats||{}};
    }

    steps.push(step(snap({
      stats:{'顶点数 n':6,'边数 e':8,'链表数':'n=6','结点数':'n+e=14'}
    }),0,'邻接表为每个顶点维护一条链表，只存真实存在的边。n个顶点头+e条边结点，共 n+e 个结点。',
    ['每顶点一条链表','n+e个结点','只存真实的边']));

    steps.push(step(snap({hiV:0,
      stats:{'A 的出边链表':'B→C→∧','出度':'2','查出度':'O(出度)','查入度':'需遍历全表'}
    }),1,'顶点 A(0) 链表是 B→C→∧，表示 A→B 和 A→C 两条边。求出度遍历本链表 O(出度)，比矩阵快。',
    ['A的链表:B→C→∧','出度=链表长=2','入度需扫全表']));

    steps.push(step(snap({
      note:'稀疏图：e≪n² 时邻接表比矩阵省很多空间',
      stats:{'空间':'O(n+e)','矩阵空间':'O(n²)','n=1000,e=2000':'矩阵100万,表仅3千','省':'约330倍'}
    }),2,'邻接表空间 O(n+e)，邻接矩阵 O(n²)。稀疏图（e≪n²）时优势巨大；稠密图（e≈n²）差距不大。',
    ['空间 O(n+e)','稀疏图省空间','稠密图差距不大']));

    steps.push(step(snap({
      stats:{'判断邻接':'O(出度)','矩阵判断':'O(1)','遍历全图边':'O(n+e)','矩阵遍历':'O(n²)'}
    }),3,'代价：判断 i 和 j 是否相邻要扫 i 的链表，O(出度)，不如矩阵 O(1)。遍历全图所有边 O(n+e)。',
    ['判断邻接 O(出度)','不如矩阵 O(1)','遍历边 O(n+e)']));

    return steps;
  }

  /* ===== 场景三：两者对比 ===== */
  function buildSceneCmp() {
    var steps = [];
    var ROWS = [
      ['空间','O(n²)','O(n+e)'],
      ['判断邻接','O(1)','O(出度)'],
      ['求顶点的度','O(n)','O(出度)'],
      ['遍历全部边','O(n²)','O(n+e)'],
      ['稠密图','适合','不划算'],
      ['稀疏图','浪费','适合']
    ];
    function drawTable(c, hiRow) {
      var headers=['操作/属性','邻接矩阵','邻接表'];
      var TBX=44, TBY=105, TBW=[150,150,150], TBH=30;
      var i, j, x, col;
      for (j=0; j<headers.length; j++) {
        x=TBX; for (var q=0;q<j;q++) x+=TBW[q];
        c.stage.appendChild(D.el('rect',{x:x,y:TBY,width:TBW[j],height:TBH,rx:4,
          fill:D.C.active.fill,stroke:D.C.active.stroke,'stroke-width':1.5}));
        c.stage.appendChild(D.text(headers[j],{x:x+TBW[j]/2,y:TBY+TBH/2+5,
          'class':'vz-idx',fill:'#dfe8ff'}));
      }
      for (i=0; i<ROWS.length; i++) {
        var isHi=(hiRow===i);
        for (j=0; j<ROWS[i].length; j++) {
          x=TBX; for (var p=0;p<j;p++) x+=TBW[p];
          var ry=TBY+(i+1)*TBH;
          col=isHi?D.C.hot:D.C.idle;
          c.stage.appendChild(D.el('rect',{x:x,y:ry,width:TBW[j],height:TBH,rx:4,
            fill:col.fill,stroke:col.stroke,'stroke-width':1.3}));
          c.stage.appendChild(D.text(ROWS[i][j],{x:x+TBW[j]/2,y:ry+TBH/2+5,
            'class':'vz-idx',fill:isHi?'#ffd166':'#b9c8e6'}));
        }
      }
    }
    function step(f, line, narr, act) {
      return { line: line, narr: narr, act: act,
               run: function(c) {
                 D.clear(c.stage);
                 drawTable(c, f.hiRow);
                 if (f.note) c.stage.appendChild(D.text(f.note,
                   {x:44,y:325,'class':'vz-info',fill:'#6ceaa5'}));
                 c.stats = f.stats||{};
               }};
    }

    steps.push(step({hiRow:undefined,note:null,stats:
      {'矩阵空间':'O(n²)','链表空间':'O(n+e)','选择依据':'稠密/稀疏','本例e/n²':'8/36≈22%'}
    },0,'两种存储各有优劣，选哪个取决于图的稀疏程度和主要操作。这张对比表汇总了关键指标。',
    ['矩阵 vs 邻接表','核心差别：空间与查询','稀疏选链表，稠密选矩阵']));

    steps.push(step({hiRow:0,note:null,stats:
      {'矩阵':'O(n²)固定','邻接表':'O(n+e)随边数','稀疏图省':'n²-n-e个单元','本例':'36格 vs 14结点'}
    },1,'空间是最大差别。矩阵 O(n²) 与边数无关；邻接表 O(n+e) 跟着边数走。e 越少邻接表越省。',
    ['空间差距最显著','矩阵固定 O(n²)','链表 O(n+e)随e变']));

    steps.push(step({hiRow:1,note:null,stats:
      {'矩阵判邻接':'O(1)','链表判邻接':'O(出度)','出度最大':'n-1','频繁判邻接':'选矩阵'}
    },2,'矩阵判断两点邻接 O(1)，邻接表要扫链表 O(出度)。若频繁判断邻接关系，矩阵更快。',
    ['矩阵判邻接 O(1)','链表 O(出度)','频繁判邻接选矩阵']));

    steps.push(step({hiRow:3,
      note:'结论：稠密图选矩阵；稀疏图选链表；DFS/BFS 优先选链表。',
      stats:{'遍历矩阵所有边':'O(n²)','遍历链表所有边':'O(n+e)','DFS/BFS主要做':'遍历边','优选':'邻接表'}
    },3,'遍历全图所有边：矩阵扫 n² 格（大量是0），链表仅 O(n+e)。DFS/BFS 依赖遍历边，优选邻接表。',
    ['遍历边：矩阵O(n²)','链表O(n+e)','DFS/BFS优选链表']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['graph-storage'] = {
    title: '邻接矩阵与邻接表 Graph Storage',
    subtitle: '图的两种经典存储：矩阵用 n×n 数组（判邻接 O(1)，空间 O(n²)）；邻接表每顶点挂边链表（空间 O(n+e)，稀疏图省）。',
    height: 700,
    code: [
      '// 邻接矩阵：二维数组 adj[n][n]',
      'adj[i][j] = w;  // i→j 权值 w，0表示无边',
      '// 有向图不对称；无向图 adj[i][j]=adj[j][i]',
      '// 邻接表：顶点数组 + 边链表',
      'head[i]→{to,w,next}→NULL',
      '// 矩阵：判邻接O(1)，空间O(n²)',
      '// 链表：空间O(n+e)，遍历边O(n+e)',
      '// 稠密图选矩阵，稀疏图选链表'
    ],
    scenes: [
      { name: '邻接矩阵', build: buildSceneMatrix, codeTag: 'adj[i][j]=权值',
        code: [
          '// 邻接矩阵：n×n 数组',
          '// adj[i][j]=w 表示 i→j 权 w，0为无边',
          '// 无向图 adj[i][j]=adj[j][i]（对称）',
          '// 求出度：数第i行非0 → O(n)',
          '// 求入度：数第j列非0 → O(n)',
          '// 判断邻接：查 adj[i][j] → O(1)',
          '// 空间 O(n²)，稀疏图浪费'
        ]
      },
      { name: '邻接表', build: buildSceneList, codeTag: '每顶点挂边链表',
        code: [
          '// 邻接表：顶点数组 head[n]',
          '// head[i]→{to,w,next}→NULL',
          '// 求出度：链表长度 → O(出度)',
          '// 判断邻接：遍历链表 → O(出度)',
          '// 空间 O(n+e)，稀疏图省空间',
          '// 遍历全部边 O(n+e)'
        ]
      },
      { name: '两者对比', build: buildSceneCmp, codeTag: '如何选择',
        code: [
          '// 稠密图（e≈n²）→ 邻接矩阵',
          '// 稀疏图（e≪n²）→ 邻接表',
          '// 频繁判断邻接 → 矩阵 O(1)',
          '// 频繁遍历顶点的边 → 链表',
          '// DFS/BFS 遍历边为主 → 链表',
          '// 矩阵便于代数运算'
        ]
      }
    ]
  };
})();

