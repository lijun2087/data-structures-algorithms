/* Floyd 多源最短路 — 第7章
 * 场景一：为什么三重循环 k 必须在最外层（允许经过 v0..vk 中转逐层放开）
 * 场景二：逐个 k 更新 D 矩阵，同时维护 Path 矩阵
 * 场景三：从 Path 矩阵还原路径 + O(n³) 取舍
 * 4 个顶点，矩阵 4×4，∞ 用 '∞' 显示。
 */
(function () {
  'use strict';
  var D = window.VizDraw;

  /* 图：v0..v3，有向带权
   * v0→v1(3) v0→v3(7) v1→v2(2) v2→v3(1) v3→v1(5) v1→v3(8)
   * 最优路：v0→v3 = v0→v1→v2→v3 = 3+2+1=6 (比直接7短)
   * 布局左半：v0(80,160) v1(240,160) v2(240,290) v3(80,290) */
  var VX = [80,  240, 240, 80];
  var VY = [160, 160, 290, 290];
  var R  = 20;
  var VNAMES = ['v0','v1','v2','v3'];
  var N = 4;
  var INF = 9999;

  /* 初始邻接矩阵 W[i][j] */
  var W = [
    [0,   3,   INF, 7  ],
    [INF, 0,   2,   8  ],
    [INF, INF, 0,   1  ],
    [INF, 5,   INF, 0  ]
  ];

  /* 复制二维矩阵 */
  function copyMat(m) {
    var r = [];
    for (var i=0;i<m.length;i++) r.push(m[i].slice());
    return r;
  }

  function dStr(v) { return v >= INF ? '∞' : String(v); }

  /* ---- 绘制图（左半） ---- */
  function drawGraph(g, stV, hotEdge) {
    var u, j, e;
    var GEDGES = [
      [{v:1,w:3},{v:3,w:7}],
      [{v:2,w:2},{v:3,w:8}],
      [{v:3,w:1}],
      [{v:1,w:5}]
    ];
    for (u=0; u<N; u++) {
      for (j=0;j<GEDGES[u].length;j++) {
        e = GEDGES[u][j];
        var hh = hotEdge && hotEdge[0]===u && hotEdge[1]===e.v;
        /* 偏移避免双向箭头重叠 */
        var ox = (VY[u]!==VY[e.v] && VX[u]===VX[e.v]) ? 10 : 0;
        var oy = (VX[u]!==VX[e.v] && VY[u]===VY[e.v]) ? -10 : 0;
        D.link(g, {x1:VX[u]+ox,y1:VY[u]+oy,x2:VX[e.v]+ox,y2:VY[e.v]+oy,
          kind:hh?'hot':'mute',arrow:true,width:hh?2.8:1.8});
        var mx=(VX[u]+VX[e.v])/2+ox+8, my=(VY[u]+VY[e.v])/2+oy-6;
        g.appendChild(D.text(e.w,{x:mx,y:my,'class':'vz-idx',
          fill:hh?'#ffd166':'#8ea3c9'}));
      }
    }
    for (u=0;u<N;u++) {
      D.circleNode(g,{x:VX[u],y:VY[u],r:R,
        state:stV&&stV[u]?stV[u]:'idle',value:VNAMES[u]});
    }
  }

  /* ---- 绘制矩阵（右半） ---- */
  /* TX: 起始x, TY: 起始y, mat: 二维数组, hi/hj: 高亮格, title */
  function drawMatrix(g, TX, TY, mat, title, hi, hj) {
    var CW=54, CH=24, GAP=2;
    g.appendChild(D.text(title,{x:TX+(N+1)*(CW+GAP)/2,y:TY-8,'class':'vz-tag'}));
    /* 列标 */
    for (var j=0;j<N;j++) {
      g.appendChild(D.text(VNAMES[j],
        {x:TX+(j+1)*(CW+GAP)+CW/2,y:TY+14,'class':'vz-idx',fill:'#8ea3c9'}));
    }
    for (var i=0;i<N;i++) {
      /* 行标 */
      g.appendChild(D.text(VNAMES[i],
        {x:TX+CW/2,y:TY+(i+1)*(CH+GAP)+CH/2+5,'class':'vz-idx',fill:'#8ea3c9'}));
      for (j=0;j<N;j++) {
        var cx = TX+(j+1)*(CW+GAP);
        var cy = TY+(i+1)*(CH+GAP);
        var isHot = (i===hi && j===hj);
        var isDiag = (i===j);
        var st = isHot?'hot':(isDiag?'mute':'idle');
        var c = D.C[st];
        g.appendChild(D.el('rect',{x:cx,y:cy,width:CW,height:CH,rx:3,
          fill:c.fill,stroke:c.stroke,'stroke-width':isHot?2:1.2}));
        var val = mat[i][j];
        g.appendChild(D.text(dStr(val),
          {x:cx+CW/2,y:cy+CH/2+5,'class':'vz-idx',
           fill:isHot?'#ffd166':(isDiag?'#4a5c82':'#dfe8ff')}));
      }
    }
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function(c) {
               D.clear(c.stage);
               drawGraph(c.stage, f.stV, f.hotEdge);
               if (f.D) drawMatrix(c.stage, 490, 130, f.D, 'D 最短距离矩阵', f.hi, f.hj);
               if (f.P) drawMatrix(c.stage, 490, 245, f.P, 'Path 中转矩阵', f.phi, f.phj);
               var notes = f.notes || [];
               for (var ni=0; ni<notes.length && ni<3; ni++) {
                 c.stage.appendChild(D.text(notes[ni],
                   {x:330,y:148+ni*22,'class':'vz-info'}));
               }
               c.stats = f.stats || {};
             } };
  }

  /* ======== 场景一：为什么 k 在最外层 ======== */
  function buildWhy() {
    var steps = [];
    var initD = copyMat(W);
    var initP = [];
    for (var i=0;i<N;i++) {
      initP.push([]);
      for (var j=0;j<N;j++) initP[i].push(-1);
    }

    steps.push({ line:0, narr:'Floyd 要求出所有顶点对间的最短路。暴力法跑 n 次 Dijkstra 也行，但 Floyd 更简洁：一个三重循环。',
      act:['多源最短路','n 次 Dijkstra 也行','Floyd 更简洁：三重 for'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage, {}, null);
        drawMatrix(c.stage, 490, 130, initD, '初始 D（邻接矩阵）', -1, -1);
        c.stage.appendChild(D.text('Floyd-Warshall：三重循环解决多源最短路',
          {x:330,y:148,'class':'vz-info'}));
        c.stage.appendChild(D.text('∞ 表示无直接边，对角线 = 0',
          {x:330,y:170,'class':'vz-info'}));
        c.stats = {'算法':'Floyd','思路':'动态规划','顶点数':N,'时间':'O(n³)'};
      }
    });

    steps.push({ line:1, narr:'关键洞察：D^k[i][j] = 只允许经过 v0..vk 作中转时 i→j 的最短路。k 从 -1（不允许中转）逐步放开到 n-1（任意中转）。',
      act:['D^k[i][j]：经 v0..vk 中转的最短路','k=-1：只走直达边','k 逐层增大，开放更多中转'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage, {}, null);
        drawMatrix(c.stage, 490, 130, initD, 'D^(-1)：初始（无中转）', -1, -1);
        c.stage.appendChild(D.text('D^k[i][j] = 只经 v0..vk 中转时 i→j 最短路',
          {x:330,y:148,'class':'vz-info'}));
        c.stage.appendChild(D.text('k=-1: 无中转  k=0: 可经v0  k=1: 可经v0,v1',
          {x:330,y:170,'class':'vz-info'}));
        c.stats = {'状态定义':'D^k[i][j]','k 从':'-1','k 到':'n-1','逐层放开':'中转顶点集'};
      }
    });

    steps.push({ line:2, narr:'递推公式：D^k[i][j] = min(D^(k-1)[i][j], D^(k-1)[i][k]+D^(k-1)[k][j])。要么不经 vk，要么经 vk 中转。k 必须在最外层！',
      act:['D^k = min(不经vk, 经vk)','经vk: D[i][k]+D[k][j]','k 在最外层保证更新顺序正确'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage, {}, null);
        drawMatrix(c.stage, 490, 130, initD, 'D 递推方向：k 外层', -1, -1);
        c.stage.appendChild(D.text('递推：D[i][j]=min(D[i][j], D[i][k]+D[k][j])',
          {x:330,y:148,'class':'vz-info'}));
        c.stage.appendChild(D.text('k 在最外层：先开放 v0，再开放 v1，...，最后 vn-1',
          {x:330,y:170,'class':'vz-info'}));
        c.stage.appendChild(D.text('若 k 在中间层，更新 D[i][j] 时 D[i][k] 可能已被本轮改过',
          {x:330,y:192,'class':'vz-info'}));
        c.stats = {'递推公式':'min(D[i][j], D[i][k]+D[k][j])','k 必须':'最外层','原因':'保证子问题独立','顺序错':'会漏掉部分最短路'};
      }
    });

    return steps;
  }

  /* ======== 场景二：逐个 k 跑矩阵更新 ======== */
  function buildMatrix() {
    var steps = [];
    var Dm = copyMat(W);
    var Pm = [];
    var i, j, k;
    for (i=0;i<N;i++) {
      Pm.push([]);
      for (j=0;j<N;j++) Pm[i].push(-1);
    }

    function snapStep(line, narr, act, Ds, Ps, hi, hj, stV, notes, stats) {
      var fD = copyMat(Ds), fP = copyMat(Ps);
      var fStV = {}; for (var kk in stV) fStV[kk] = stV[kk];
      var fn = notes ? notes.slice() : [];
      var fs = stats || {};
      return { line:line, narr:narr, act:act,
        run: function(c) {
          D.clear(c.stage);
          drawGraph(c.stage, fStV, null);
          drawMatrix(c.stage, 490, 130, fD, 'D 最短距离矩阵', hi, hj);
          drawMatrix(c.stage, 490, 245, fP, 'Path 中转矩阵', hi, hj);
          for (var ni=0;ni<fn.length&&ni<2;ni++) {
            c.stage.appendChild(D.text(fn[ni],{x:330,y:148+ni*22,'class':'vz-info'}));
          }
          c.stats = fs;
        }
      };
    }

    steps.push(snapStep(0,'初始 D 矩阵就是邻接矩阵。Path 矩阵全为 -1（还没有中转点）。接下来按 k=0,1,2,3 依次放开中转。',
      ['D初始=邻接矩阵','Path全-1','k=0开始'],
      Dm, Pm, -1, -1, {}, ['D 初始 = 邻接矩阵','Path 全为 -1（无中转）'],
      {'当前k':'初始','已放开中转':'无','待放开':'v0,v1,v2,v3','目标':'求所有对最短路'}));

    for (k=0; k<N; k++) {
      var stV = {}; stV[k] = 'hot';
      steps.push(snapStep(2,'k='+k+'，尝试以 v'+k+' 为中转点，更新所有 D[i][j]。若 D[i][k]+D[k][j] < D[i][j] 则更新。',
        ['k='+k+'，以 v'+k+' 为中转','检查所有 (i,j)'],
        Dm, Pm, -1, -1, stV, ['开放 v'+k+' 作为中转点'],
        {'当前k':k,'中转顶点':'v'+k,'操作':'扫描所有(i,j)','若改进':'同时更新Path[i][j]=k'}));

      var changed = 0;
      for (i=0; i<N; i++) {
        for (j=0; j<N; j++) {
          if (i===j) continue;
          if (Dm[i][k] < INF && Dm[k][j] < INF) {
            var newD = Dm[i][k] + Dm[k][j];
            if (newD < Dm[i][j]) {
              var oldVal = Dm[i][j];
              Dm[i][j] = newD;
              Pm[i][j] = k;
              changed++;
              steps.push(snapStep(3,
                'D[v'+i+'][v'+j+'] 更新！经 v'+k+' 中转：'+dStr(oldVal)+' → '+newD+'。同时 Path[v'+i+'][v'+j+']='+k+'。',
                ['D[v'+i+'][v'+j+']: '+dStr(oldVal)+'→'+newD,'经 v'+k+' 中转','Path[v'+i+'][v'+j+']='+k],
                Dm, Pm, i, j, stV, ['更新 D[v'+i+'][v'+j+']: '+dStr(oldVal)+' → '+newD],
                {'更新格':'D[v'+i+'][v'+j+']','旧值':dStr(oldVal),'新值':newD,'中转':'v'+k}));
            }
          }
        }
      }
      if (changed === 0) {
        steps.push(snapStep(3,'k='+k+' 轮：没有路径被改进。v'+k+' 作为中转点对本轮无贡献。',
          ['k='+k+' 轮无更新','v'+k+' 作中转无改进'],
          Dm, Pm, -1, -1, stV, [],
          {'k轮':'k='+k,'本轮更新':0,'说明':'该中转顶点无贡献','累计改进':'-'}));
      }
    }

    steps.push(snapStep(-1,'Floyd 完成。D 矩阵就是所有顶点对的最短距离，Path 矩阵记录中转路径。时间复杂度 O(n³)。',
      ['Floyd 完成','D=所有对最短距离','O(n³) 适合稠密图'],
      Dm, Pm, -1, -1, {}, [],
      {'状态':'完成','时间':'O(n³)','空间':'O(n²)','适用':'稠密图/小规模图'}));

    return steps;
  }

  /* ======== 场景三：从 Path 矩阵还原路径 ======== */
  function buildPath() {
    var steps = [];
    /* 先跑完 Floyd 得到最终 D 和 Path */
    var Dm = copyMat(W);
    var Pm = [];
    var i, j, k;
    for (i=0;i<N;i++) { Pm.push([]); for (j=0;j<N;j++) Pm[i].push(-1); }
    for (k=0;k<N;k++) for (i=0;i<N;i++) for (j=0;j<N;j++) {
      if (Dm[i][k]<INF && Dm[k][j]<INF && Dm[i][k]+Dm[k][j]<Dm[i][j]) {
        Dm[i][j]=Dm[i][k]+Dm[k][j]; Pm[i][j]=k;
      }
    }
    var finalD = copyMat(Dm), finalP = copyMat(Pm);

    function renderPath(ctx, f) {
      D.clear(ctx.stage);
      var GEDGES2 = [
        [{v:1,w:3},{v:3,w:7}],
        [{v:2,w:2},{v:3,w:8}],
        [{v:3,w:1}],
        [{v:1,w:5}]
      ];
      var pathSet = f.pathSet || {};
      var u2, j2, e2;
      for (u2=0; u2<N; u2++) {
        for (j2=0; j2<GEDGES2[u2].length; j2++) {
          e2 = GEDGES2[u2][j2];
          var key = u2+'_'+e2.v;
          var inPath = pathSet[key];
          D.link(ctx.stage, {x1:VX[u2],y1:VY[u2],x2:VX[e2.v],y2:VY[e2.v],
            kind: inPath?'hot':'mute', arrow:true, width:inPath?2.8:1.8});
          var mx2=(VX[u2]+VX[e2.v])/2+8, my2=(VY[u2]+VY[e2.v])/2-6;
          ctx.stage.appendChild(D.text(e2.w,{x:mx2,y:my2,'class':'vz-idx',
            fill:inPath?'#ffd166':'#8ea3c9'}));
        }
      }
      for (u2=0;u2<N;u2++) {
        D.circleNode(ctx.stage,{x:VX[u2],y:VY[u2],r:R,
          state:f.stV&&f.stV[u2]?f.stV[u2]:'idle',value:VNAMES[u2]});
      }
      drawMatrix(ctx.stage, 490, 130, finalD, '最终 D 矩阵', f.hi, f.hj);
      drawMatrix(ctx.stage, 490, 245, finalP, 'Path 矩阵', f.phi, f.phj);
      var notes = f.notes || [];
      for (var ni=0;ni<notes.length&&ni<3;ni++) {
        ctx.stage.appendChild(D.text(notes[ni],{x:330,y:148+ni*22,'class':'vz-info'}));
      }
      ctx.stats = f.stats || {};
    }

    function stepP(f, line, narr, act) {
      return {line:line,narr:narr,act:act,run:function(c){renderPath(c,f);}};
    }

    steps.push(stepP({stV:{},pathSet:{},hi:-1,hj:-1,phi:-1,phj:-1,
      notes:['Floyd 完成：D[i][j]=最短距离','Path[i][j]=该路径的核心中转点'],
      stats:{'状态':'Floyd已完成','还原目标':'v0→v3','D[v0][v3]':6,'Path[v0][v3]':2}},
      0, 'Floyd 跑完后，D[i][j] 是最短距离，Path[i][j] 记录 i→j 最后一个「值得绕」的中转点。用递归还原具体路径。',
      ['D[v0][v3]=6','Path[v0][v3]=2','递归查 Path 还原路径']));

    steps.push(stepP({stV:{0:'active',3:'active'},pathSet:{},hi:0,hj:3,phi:0,phj:3,
      notes:['Path[v0][v3]=2，经过v2','分成 v0→v2 和 v2→v3 两段'],
      stats:{'查':'Path[v0][v3]=2','经过':'v2','左段':'v0→v2','右段':'v2→v3'}},
      1, 'Path[v0][v3]=2，表示 v0→v3 经 v2 中转。递归分成 v0→v2 和 v2→v3 两段还原。',
      ['Path[v0][v3]=2','分解两段','递归还原']));

    steps.push(stepP({stV:{0:'active',2:'active'},pathSet:{},hi:0,hj:2,phi:0,phj:2,
      notes:['Path[v0][v2]=1，经过v1','v0→v1→v2'],
      stats:{'查':'Path[v0][v2]=1','经过':'v1','D[v0][v2]':5,'左段':'v0→v1'}},
      1, 'Path[v0][v2]=1，说明 v0→v2 经 v1 中转。Path[v0][v1]=-1（直接边），Path[v1][v2]=-1（直接边），终止递归。',
      ['Path[v0][v2]=1','v0→v1直接边','v1→v2直接边']));

    steps.push(stepP({stV:{0:'done',1:'done',2:'done',3:'done'},
      pathSet:{'0_1':true,'1_2':true,'2_3':true},
      hi:-1,hj:-1,phi:-1,phj:-1,
      notes:['路径：v0→v1→v2→v3  距离=6','Path[v2][v3]=-1，v2→v3直接边'],
      stats:{'最短路':'v0→v1→v2→v3','距离':6,'直接边v0→v3':7,'Floyd时间':'O(n³)'}},
      -1, '路径还原完成：v0→v1→v2→v3，总距离 6 < 直接边 7。Floyd 时间 O(n³)，空间 O(n²)，可处理负权但不能有负环。',
      ['路径 v0→v1→v2→v3 距离=6','Floyd O(n³)','可负权，不可负环']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['floyd'] = {
    title: 'Floyd 多源最短路',
    subtitle: '动态规划逐步开放中转顶点集，k 必须在最外层。时间 O(n³)，可处理负权（不能有负环）。',
    height: 700,
    code: [
      '初始化 D=W; Path=-1',
      'for k = 0 to n-1:',
      '    for i = 0 to n-1:',
      '        for j = 0 to n-1:',
      '            if D[i][k]+D[k][j] < D[i][j]:',
      '                D[i][j] = D[i][k]+D[k][j]',
      '                Path[i][j] = k'
    ],
    scenes: [
      { name: 'k 为何在最外层', build: buildWhy,
        code: [
          '// D^k[i][j]: 只经 v0..vk 的 i→j 最短路',
          '// 递推: D^k=min(D^(k-1), D^(k-1)[i][k]+D^(k-1)[k][j])',
          '// k 在外层: 每轮只新增一个中转点',
          '// k 在内层: D[i][k] 可能已被本轮改过',
          '// 子问题不独立 → 结果错误',
          '// 结论: k 必须在最外层！'
        ]
      },
      { name: '矩阵逐轮更新', build: buildMatrix,
        code: [
          'for k = 0 to n-1:',
          '    for i = 0 to n-1:',
          '        for j = 0 to n-1:',
          '            if D[i][k]+D[k][j]<D[i][j]:',
          '                D[i][j]=D[i][k]+D[k][j]',
          '                Path[i][j]=k',
          '// 每轮开放一个新中转点'
        ]
      },
      { name: '还原路径 + 复杂度', build: buildPath,
        code: [
          'GetPath(i,j):',
          '    k = Path[i][j]',
          '    if k==-1: 直接边 i→j; return',
          '    GetPath(i, k)',
          '    GetPath(k, j)',
          '// 时间 O(n³)，空间 O(n²)',
          '// 可负权，不可负环'
        ]
      }
    ]
  };
})();
