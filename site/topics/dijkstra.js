/* Dijkstra 单源最短路 — 第7章
 * 场景一：三个数组 S/dist/path 的含义，贪心选 dist 最小的未定顶点
 * 场景二：松弛邻居，dist[v] > dist[u]+w 才更新
 * 场景三：负权边反例 + 时间复杂度 O(n²)
 * 快照架构：build() 跑完算法存快照，run() 只画，不改状态。
 */
(function () {
  'use strict';
  var D = window.VizDraw;

  /* 图：6 个顶点 v0..v5，有向带权
   * 布局在左半 x∈[60,440] y∈[140,310]
   * 刻意让 v0->v2->v4 先被发现再被松弛更新 */
  var VNAMES = ['v0','v1','v2','v3','v4','v5'];
  var VX = [80,  80, 220, 370, 370, 220];
  var VY = [200, 310, 155, 200, 310, 310];
  var R  = 20;

  /* 邻接表：edges[u] = [{v, w}] */
  var EDGES = [
    [{v:1,w:3},{v:2,w:7}],
    [{v:3,w:2}],
    [{v:3,w:1},{v:4,w:6}],
    [{v:5,w:4}],
    [{v:5,w:2}],
    []
  ];
  var N = 6, SRC = 0;
  var INF = 9999;

  /* ---- 坐标辅助 ---- */
  function midPt(u, v) {
    return { x: (VX[u]+VX[v])/2, y: (VY[u]+VY[v])/2 };
  }

  /* ---- 绘图 ---- */
  function render(ctx, f) {
    D.clear(ctx.stage);
    var i, j, e, u, v;

    /* 画所有边（先画边再画点） */
    for (u = 0; u < N; u++) {
      for (j = 0; j < EDGES[u].length; j++) {
        e = EDGES[u][j]; v = e.v;
        var hot = f.hotEdge && f.hotEdge[0]===u && f.hotEdge[1]===v;
        D.link(ctx.stage, {
          x1: VX[u], y1: VY[u], x2: VX[v], y2: VY[v],
          kind: hot ? 'hot' : 'mute', arrow: true, width: hot ? 2.8 : 1.8
        });
        var mp = midPt(u, v);
        ctx.stage.appendChild(D.text(e.w, {
          x: mp.x + 8, y: mp.y - 6, 'class': 'vz-idx',
          fill: hot ? '#ffd166' : '#8ea3c9'
        }));
      }
    }

    /* 画顶点 */
    for (i = 0; i < N; i++) {
      var st = f.stV ? (f.stV[i] || 'idle') : 'idle';
      D.circleNode(ctx.stage, {
        x: VX[i], y: VY[i], r: R, state: st, value: VNAMES[i]
      });
    }

    /* 右半：dist / S / path 三行表格 */
    var TX = 510, TY = 140, TW = 62, TH = 28, TG = 4;
    ctx.stage.appendChild(D.text('顶点', {x: TX-32, y: TY+20, 'class':'vz-tag'}));
    ctx.stage.appendChild(D.text('S', {x: TX-32, y: TY+TH+TG+20, 'class':'vz-tag'}));
    ctx.stage.appendChild(D.text('dist', {x: TX-32, y: TY+2*(TH+TG)+20, 'class':'vz-tag'}));
    ctx.stage.appendChild(D.text('path', {x: TX-32, y: TY+3*(TH+TG)+20, 'class':'vz-tag'}));

    for (i = 0; i < N; i++) {
      var cx = TX + i*(TW+TG);
      var inS = f.S && f.S[i];
      var isCur = f.cur === i;
      /* 顶点名 */
      var c0 = D.C[isCur ? 'hot' : 'idle'];
      ctx.stage.appendChild(D.el('rect',{x:cx,y:TY,width:TW,height:TH,rx:4,
        fill:c0.fill,stroke:c0.stroke,'stroke-width':1.5}));
      ctx.stage.appendChild(D.text(VNAMES[i],{x:cx+TW/2,y:TY+19,'class':'vz-idx',fill:'#dfe8ff'}));
      /* S */
      var c1 = D.C[inS ? 'done' : 'mute'];
      ctx.stage.appendChild(D.el('rect',{x:cx,y:TY+TH+TG,width:TW,height:TH,rx:4,
        fill:c1.fill,stroke:c1.stroke,'stroke-width':1.5}));
      ctx.stage.appendChild(D.text(inS?'✓':'-',{x:cx+TW/2,y:TY+TH+TG+19,'class':'vz-idx',fill:inS?'#2ecc71':'#4a5c82'}));
      /* dist */
      var dval = f.dist ? f.dist[i] : INF;
      var dstr = dval >= INF ? '∞' : String(dval);
      var c2 = D.C[isCur ? 'hot' : (inS ? 'done' : (dval < INF ? 'active' : 'idle'))];
      ctx.stage.appendChild(D.el('rect',{x:cx,y:TY+2*(TH+TG),width:TW,height:TH,rx:4,
        fill:c2.fill,stroke:c2.stroke,'stroke-width':1.5}));
      ctx.stage.appendChild(D.text(dstr,{x:cx+TW/2,y:TY+2*(TH+TG)+19,'class':'vz-idx',fill:'#ffd166'}));
      /* path */
      var pval = f.path ? f.path[i] : -1;
      var pstr = pval < 0 ? '-' : VNAMES[pval];
      var c3 = D.C[inS ? 'done' : 'idle'];
      ctx.stage.appendChild(D.el('rect',{x:cx,y:TY+3*(TH+TG),width:TW,height:TH,rx:4,
        fill:c3.fill,stroke:c3.stroke,'stroke-width':1.5}));
      ctx.stage.appendChild(D.text(pstr,{x:cx+TW/2,y:TY+3*(TH+TG)+19,'class':'vz-idx',fill:'#8ea3c9'}));
    }

    ctx.stats = f.stats || {};
  }

  function step(f, line, narr, act) {
    return { line: line, narr: narr, act: act,
             run: function (c) { render(c, f); } };
  }

  function snapOf(S, dist, path, stV, cur, hotEdge, stats) {
    var ss = []; for(var i=0;i<N;i++) ss.push(S[i]);
    var dd = dist.slice(), pp = path.slice();
    var sv = {}; for(var k in stV) sv[k] = stV[k];
    return { S:ss, dist:dd, path:pp, stV:sv,
             cur: cur===undefined ? -1 : cur,
             hotEdge: hotEdge || null, stats: stats || {} };
  }

  /* ======== 场景一：数组含义 + 初始化 ======== */
  function buildInit() {
    var steps = [];
    var S = [], dist = [], path = [], stV = {};
    for (var i = 0; i < N; i++) { S[i]=false; dist[i]=INF; path[i]=-1; stV[i]='idle'; }

    steps.push(step(snapOf(S,dist,path,stV,-1,null,
      {'算法':'Dijkstra','源点':'v0','顶点数':N,'思路':'贪心，每次把最近的未定点定下来'}),
      0, 'Dijkstra 维护三个数组：S（已确定最短路的顶点集）、dist（当前最短估计值）、path（前驱）。初始只有源点已知。',
      ['S = {}（空集）','dist[v0]=0，其余∞','path 全为 -1']));

    dist[SRC] = 0; stV[SRC] = 'active';
    steps.push(step(snapOf(S,dist,path,stV,SRC,null,
      {'S大小':0,'已定顶点':'无','源点dist':0,'待处理':N-1}),
      1, '源点 v0 到自身距离为 0，其余顶点距离设为 ∞。S 此时为空——没有顶点的最短路被「确认」。',
      ['dist[v0] = 0','dist[其余] = ∞','S 目前为空']));

    /* 第一轮：挑出 v0 放入 S */
    stV[SRC] = 'hot';
    steps.push(step(snapOf(S,dist,path,stV,SRC,null,
      {'S大小':0,'候选':'v0(dist=0)','贪心理由':'dist 最小=0','下一步':'放入S，松弛邻居'}),
      2, '在所有 dist 已知且不在 S 中的顶点里，v0 的 dist=0 最小。贪心直觉：它就是离源点最近的，不可能被更新得更短。',
      ['选 v0：dist[v0]=0 最小','不在 S 中且 dist 最小','即将放入 S']));

    S[SRC] = true; stV[SRC] = 'done';
    steps.push(step(snapOf(S,dist,path,stV,SRC,null,
      {'S大小':1,'刚放入S':'v0','|S|/n':'1/6','说明':'v0 到自身最短路已确认'}),
      3, 'v0 放入 S。S 中的顶点表示「从源点到它的最短路已经确定，不会再变小」。',
      ['v0 ∈ S','dist[v0]=0 已确认','接下来松弛 v0 的出边']));

    return steps;
  }

  /* ======== 场景二：完整松弛过程 ======== */
  function buildRelax() {
    var steps = [];
    var S = [], dist = [], path = [], stV = {};
    for (var i = 0; i < N; i++) { S[i]=false; dist[i]=INF; path[i]=-1; stV[i]='idle'; }
    dist[SRC] = 0; S[SRC] = true; stV[SRC] = 'done';

    /* 松弛 v0 的邻居 */
    var u = SRC;
    var relaxStep = function(u, v, w) {
      var he = [u, v];
      if (dist[u] + w < dist[v]) {
        var oldD = dist[v];
        dist[v] = dist[u] + w;
        path[v] = u;
        stV[v] = 'active';
        var st1 = {'松弛边':'v'+u+'→v'+v,'旧dist':oldD>=INF?'∞':oldD,
                   '新dist':dist[v],'前驱':'v'+u};
        steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,u,he,st1),
          5, 'dist[v'+u+']+'+w+' = '+(dist[u]+w)+' < '+(oldD>=INF?'∞':oldD)+' = dist[v'+v+']，松弛成功！更新 dist[v'+v+']='+dist[v]+'，前驱=v'+u+'。',
          ['dist[v'+u+']+'+w+' < dist[v'+v+']','更新 dist[v'+v+']='+dist[v],'path[v'+v+']=v'+u]));
      } else {
        var dstr2 = dist[v]>=INF?'∞':String(dist[v]);
        var st2 = {'检查边':'v'+u+'→v'+v,'松弛值':dist[u]+w,'当前dist':dstr2,'结果':'无需更新'};
        steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,u,he,st2),
          5, 'dist[v'+u+']+'+w+'='+(dist[u]+w)+' ≥ dist[v'+v+']='+dstr2+'，不更新。',
          ['dist[v'+u+']+'+w+' ≥ dist[v'+v+']','无需更新']));
      }
    };

    steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,u,null,
      {'当前确认':'v0','S大小':1,'需松弛':'v0的所有出边','方向':'v0→v1(3), v0→v2(7)'}),
      4, 'v0 已放入 S，现在用它的出边去松弛邻居。松弛公式：若 dist[v0]+w < dist[邻居]，就更新。',
      ['v0 已定','检查 v0→v1 (w=3)','检查 v0→v2 (w=7)']));

    relaxStep(0,1,3); relaxStep(0,2,7);

    /* 第二轮：选 v1(dist=3) */
    stV[1]='hot';
    steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,1,null,
      {'S大小':1,'候选':'v1(3) v2(7)','选择':'v1 dist最小=3','贪心依据':'正权图中不可能被更短路绕到'}),
      2, '未定顶点中 dist[v1]=3 最小，选 v1 放入 S。正权图保证：此后任何绕路都只会更长。',
      ['选 v1：dist=3 最小','v1 加入 S','松弛 v1 的出边']));
    S[1]=true; stV[1]='done';
    relaxStep(1,3,2);

    /* 第三轮：选 v2(dist=7)，松弛后 v3 的 dist 会被 v2->v3(1) 更新 */
    stV[2]='hot';
    steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,2,null,
      {'S大小':2,'候选':'v2(7) v3(5)','选择':'v3 dist=5 最小','说明':'v1松弛后v3变成5'}),
      2, '现在未定顶点：v2(dist=7)，v3(dist=5)。v3 更小，先选 v3。注意 v3 的 dist 已被 v1 松弛更新过了！',
      ['选 v3：dist=5 最小','v3 ∈ S','松弛 v3→v5']));
    S[3]=true; stV[3]='done'; stV[2]='active';
    relaxStep(3,5,4);

    /* v2 */
    stV[2]='hot';
    steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,2,null,
      {'S大小':3,'候选':'v2(7) v5(9)','选择':'v2 dist=7','说明':'v2→v3(1) 但v3已在S'}),
      2, 'v2(dist=7)，v5(dist=9)。选 v2。v2→v3 但 v3 已在 S，跳过；v2→v4 松弛之。',
      ['选 v2：dist=7','v2 ∈ S','v2→v4(6)：7+6=13']));
    S[2]=true; stV[2]='done';
    relaxStep(2,3,1); relaxStep(2,4,6);

    /* v4 */
    stV[4]='hot';
    steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,4,null,
      {'S大小':4,'候选':'v4(13) v5(9)','选择':'v5 dist=9','备注':'v4→v5 会被考虑'}),
      2, '选 v5(dist=9) 放入 S。v5 无出边，无需松弛。',
      ['选 v5：dist=9','v5 ∈ S','v5 无出边']));
    S[5]=true; stV[5]='done';

    stV[4]='hot';
    steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,4,null,
      {'S大小':5,'最后顶点':'v4','dist[v4]':dist[4]>=INF?'∞':dist[4],'说明':'v4→v5但v5已在S'}),
      2, '最后 v4 放入 S，所有顶点最短路确定完毕。',
      ['v4 ∈ S','所有顶点已确认','算法结束']));
    S[4]=true; stV[4]='done';

    var finalSt = {'v0→v0':0, 'v0→v1':dist[1], 'v0→v3':dist[3], 'v0→v5':dist[5]};
    steps.push(step(snapOf(S,dist.slice(),path.slice(),stV,-1,null,finalSt),
      -1, '算法结束。dist 数组就是从 v0 出发到各点的最短距离，path 数组可还原路径。',
      ['最短路已全部确认','时间复杂度 O(n²)','path 数组可回溯路径']));

    return steps;
  }

  /* ======== 场景三：负权边反例 + 复杂度 ======== */
  /* 反例：3 顶点 a->b(3), a->c(4), c->b(-2)
   * 正确最短路 a->c->b = 4+(-2) = 2，但 Dijkstra 先把 b 定为 3，错了。
   * 布局：a(80,220) b(300,160) c(300,290) */
  var NX = [80, 300, 300];
  var NY = [220, 160, 290];
  var NEDGES = [[{v:1,w:3},{v:2,w:4}],[],[{v:1,w:-2}]];
  var NN2 = 3;
  var NNAMES = ['a','b','c'];

  function buildNeg() {
    var steps = [];

    function renderNeg(ctx, f) {
      D.clear(ctx.stage);
      var u, j, e, v;
      for (u=0; u<NN2; u++) {
        for (j=0; j<NEDGES[u].length; j++) {
          e=NEDGES[u][j]; v=e.v;
          var hot = f.hotEdge && f.hotEdge[0]===u && f.hotEdge[1]===v;
          D.link(ctx.stage, {x1:NX[u],y1:NY[u],x2:NX[v],y2:NY[v],
            kind: hot?'hot':(e.w<0?'cut':'mute'), arrow:true, width:hot?2.8:2});
          var mpx = (NX[u]+NX[v])/2+8, mpy = (NY[u]+NY[v])/2-6;
          ctx.stage.appendChild(D.text(e.w,{x:mpx,y:mpy,'class':'vz-idx',
            fill: e.w<0?'#dd3b3b':(hot?'#ffd166':'#8ea3c9')}));
        }
      }
      for (u=0; u<NN2; u++) {
        D.circleNode(ctx.stage,{x:NX[u],y:NY[u],r:R,
          state: f.stV?f.stV[u]:'idle', value:NNAMES[u]});
      }
      var TX=520, TY=160, TW=80, TH=28, TG=6;
      for (u=0; u<NN2; u++) {
        var cy = TY + u*(TH+TG);
        ctx.stage.appendChild(D.el('rect',{x:TX,y:cy,width:TW,height:TH,rx:4,
          fill:D.C.idle.fill,stroke:D.C.idle.stroke,'stroke-width':1.5}));
        var dv = f.dist?f.dist[u]:INF;
        ctx.stage.appendChild(D.text(NNAMES[u]+': '+(dv>=INF?'∞':dv),
          {x:TX+TW/2,y:cy+19,'class':'vz-idx',fill:'#ffd166'}));
      }
      var notes = f.notes || [];
      for (var ni=0; ni<notes.length && ni<4; ni++) {
        ctx.stage.appendChild(D.text(notes[ni],
          {x:490,y:280+ni*22,'class':'vz-info'}));
      }
      ctx.stats = f.stats || {};
    }

    function stepN(f, line, narr, act) {
      return { line:line, narr:narr, act:act,
               run: function(c){ renderNeg(c,f); } };
    }

    var S=[false,false,false];
    steps.push(stepN({dist:[0,INF,INF],S:S.slice(),
      stV:{0:'idle',1:'idle',2:'idle'},hotEdge:null,
      notes:['正确最短路：a→c→b = 4+(-2) = 2','Dijkstra 会怎么做？'],
      stats:{'问题':'负权边','正确答案':'dist[b]=2','a→b':3,'a→c→b':2}},
      0, '反例：a→b 权重 3，a→c 权重 4，c→b 权重 -2。正确最短路 a→c→b=2。Dijkstra 贪心会先选 dist 最小的 b(=3) 锁定，从此不再更新它。',
      ['a→b=3, a→c=4, c→b=-2','正确最短路=2','Dijkstra 会出错']));

    steps.push(stepN({dist:[0,3,4],S:[true,false,false],
      stV:{0:'done',1:'active',2:'active'},hotEdge:null,
      notes:['a放入S，松弛得 b=3, c=4','下一步 Dijkstra 选 b(dist=3)'],
      stats:{'S':'{ a }','dist[b]':3,'dist[c]':4,'问题':'即将错误锁定b'}},
      3, 'a 放入 S，松弛邻居：dist[b]=3，dist[c]=4。dist[b] < dist[c]，Dijkstra 选 b 放入 S，认为 b 的最短路=3。',
      ['S={a}','dist[b]=3 < dist[c]=4','贪心：选 b 锁定']));

    steps.push(stepN({dist:[0,3,4],S:[true,true,false],
      stV:{0:'done',1:'bad',2:'hot'},hotEdge:[2,1],
      notes:['b 已在 S，不再更新','c→b(-2)：4+(-2)=2 < 3，本应更新','但已经太晚了'],
      stats:{'dist[b]错':'3（真实最短=2）','根本原因':'负权打破最优子结构','正确算法':'Bellman-Ford','复杂度':'O(n²) vs O(ne)'}},
      5, 'c 被选中，发现 c→b 权重 -2，4+(-2)=2 < dist[b]=3，应更新。但 b 已在 S，Dijkstra 永远不再碰它。dist[b]=3 是错误答案。',
      ['c→b(-2)：松弛结果2<3','b 已在 S！无法更新','dist[b]=3 永远错误']));

    steps.push(stepN({dist:[0,3,4],S:[true,true,true],
      stV:{0:'done',1:'bad',2:'done'},hotEdge:null,
      notes:['Dijkstra 无法处理负权边','负权图：改用 Bellman-Ford','Bellman-Ford：O(n·e)','Dijkstra O(n²) 要求权值≥0'],
      stats:{'时间 邻接矩阵':'O(n²)','时间 优先队列':'O((n+e)logn)','要求':'权值 ≥ 0','负权图':'Bellman-Ford'}},
      -1, '总结：Dijkstra 贪心正确性依赖「绕路只会更长」，这需要边权非负。负权图必须改用 Bellman-Ford（O(n·e)）。',
      ['Dijkstra 要求权值≥0','负权图用 Bellman-Ford','O(n²) vs O(ne)']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['dijkstra'] = {
    title: 'Dijkstra 单源最短路',
    subtitle: '贪心策略：每次把 dist 最小的未定顶点「锁定」，用它松弛邻居。要求所有边权非负，时间 O(n²)。',
    height: 700,
    code: [
      '初始化: dist[src]=0, 其余=∞, S={}',
      'for k = 1 to n:',
      '    u = 未定顶点中 dist 最小',
      '    S ∪= {u}',
      '    for v ∈ adj(u), v ∉ S:',
      '        if dist[u]+w(u,v) < dist[v]:',
      '            dist[v] = dist[u]+w(u,v)',
      '            path[v] = u'
    ],
    scenes: [
      { name: 'S/dist/path 含义', build: buildInit,
        code: [
          '// dist[v]: src→v 当前最短估计',
          '// S: 已锁定最短路的顶点集',
          '// path[v]: 最短路上 v 的前驱',
          'dist[src]=0; 其余=∞',
          'S = {}',
          '// 贪心：每次锁定 dist 最小的未定点'
        ]
      },
      { name: '逐步松弛演示', build: buildRelax,
        code: [
          'for k = 1 to n:',
          '    u = 未定中 dist 最小',
          '    S ∪= {u}',
          '    for each (u,v,w):',
          '        if v ∉ S:',
          '            if dist[u]+w < dist[v]:',
          '                dist[v]=dist[u]+w',
          '                path[v]=u'
        ]
      },
      { name: '负权边反例', build: buildNeg,
        code: [
          '// 贪心前提：绕路只会更长',
          '// 负权边可能让绕路更短，破坏前提',
          '// 反例：a→b(3) a→c(4) c→b(-2)',
          '// 正确答案 dist[b]=2',
          '// Dijkstra 错误锁定 dist[b]=3',
          '// 改用 Bellman-Ford 处理负权',
          '// 时间 O(n²)，优先队列 O((n+e)logn)'
        ]
      }
    ]
  };
})();
