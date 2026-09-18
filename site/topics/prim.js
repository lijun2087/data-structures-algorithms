/* 最小生成树 Prim — 第7章
 * 场景一：Prim 贪心过程（从 A 出发，逐步加入最近顶点）。
 * 场景二：lowcost/closest 辅助数组的更新过程。
 * 场景三：时间复杂度 O(n²) 分析与适用场景。
 * 快照架构同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 无向带权图，5顶点，保证 MST 唯一 */
  var N = 5;
  var VNAME = ['A','B','C','D','E'];
  /* [u, v, weight] 无向 */
  var EDGES = [
    [0,1,2],[0,3,6],[1,2,3],[1,3,8],[1,4,5],
    [2,4,7],[3,4,9],[0,2,4]
  ];
  var VX = [90, 200, 310, 90, 310];
  var VY = [160, 160, 160, 260, 260];
  var R = 18;

  function makeWAdj() {
    var i,e,adj=[];
    for(i=0;i<N;i++) adj.push([]);
    for(e=0;e<EDGES.length;e++){
      adj[EDGES[e][0]].push({v:EDGES[e][1],w:EDGES[e][2]});
      adj[EDGES[e][1]].push({v:EDGES[e][0],w:EDGES[e][2]});
    }
    return adj;
  }
  var WADJ = makeWAdj();

  /* 边权矩阵，用于 Prim 的矩阵实现 */
  var INF = 9999;
  function makeW() {
    var i,j,e,W=[];
    for(i=0;i<N;i++){W.push([]); for(j=0;j<N;j++) W[i].push(i===j?0:INF);}
    for(e=0;e<EDGES.length;e++){
      W[EDGES[e][0]][EDGES[e][1]]=EDGES[e][2];
      W[EDGES[e][1]][EDGES[e][0]]=EDGES[e][2];
    }
    return W;
  }
  var W = makeW();

  function drawGraph(g, stV, stE, eLabels) {
    var e,ef,et,x1,y1,x2,y2,dx,dy,len,ex1,ey1,ex2,ey2,ekey,kind;
    stV=stV||{}; stE=stE||{};
    for(e=0;e<EDGES.length;e++){
      ef=EDGES[e][0]; et=EDGES[e][1];
      ekey=ef+'-'+et;
      x1=VX[ef]; y1=VY[ef]; x2=VX[et]; y2=VY[et];
      dx=x2-x1; dy=y2-y1; len=Math.sqrt(dx*dx+dy*dy)||1;
      ex1=x1+dx/len*R; ey1=y1+dy/len*R;
      ex2=x2-dx/len*(R+4); ey2=y2-dy/len*(R+4);
      kind=(stE[ekey]||stE[et+'-'+ef])||'mute';
      D.link(g,{x1:ex1,y1:ey1,x2:ex2,y2:ey2,kind:kind});
      D.link(g,{x1:ex2,y1:ey2,x2:ex1,y2:ey1,kind:kind});
      if(eLabels!==false){
        g.appendChild(D.text(EDGES[e][2],{
          x:(x1+x2)/2+(dy/len)*(-8),y:(y1+y2)/2+(-dx/len)*(-8),'class':'vz-elab'
        }));
      }
    }
    for(var i=0;i<N;i++){
      D.circleNode(g,{x:VX[i],y:VY[i],r:R,
        state:(stV[i])||'idle',value:VNAME[i]});
    }
  }

  /* 右侧：lowcost / closest 数组 */
  var TX = 490, TY = 108, TW = 50, TH = 24, TG = 4;

  function drawArrayPanel(g, lowcost, closest, inT) {
    var i,x,col;
    /* 列头 */
    g.appendChild(D.text('顶点',
      {x:TX+TW/2,y:TY-6,'class':'vz-tag',fill:'#9fb4dc'}));
    g.appendChild(D.text('lowcost',
      {x:TX+TW*2,y:TY-6,'class':'vz-tag',fill:'#9fb4dc'}));
    g.appendChild(D.text('closest',
      {x:TX+TW*3+TG,y:TY-6,'class':'vz-tag',fill:'#9fb4dc'}));
    for(i=0;i<N;i++){
      var rowY=TY+i*(TH+TG);
      col=inT[i]?D.C.done:D.C.idle;
      /* 顶点名 */
      g.appendChild(D.el('rect',{x:TX,y:rowY,width:TW,height:TH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(VNAME[i],
        {x:TX+TW/2,y:rowY+TH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
      /* lowcost */
      var lc=lowcost[i];
      var lcCol=inT[i]?D.C.mute:(lc===INF?D.C.mute:D.C.active);
      g.appendChild(D.el('rect',{x:TX+TW+TG,y:rowY,width:TW,height:TH,rx:4,
        fill:lcCol.fill,stroke:lcCol.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(inT[i]?'已选':(lc===INF?'∞':lc),
        {x:TX+TW+TG+TW/2,y:rowY+TH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
      /* closest */
      g.appendChild(D.el('rect',{x:TX+TW*2+TG*2,y:rowY,width:TW,height:TH,rx:4,
        fill:D.C.idle.fill,stroke:D.C.idle.stroke,'stroke-width':1.3}));
      g.appendChild(D.text(inT[i]||closest[i]<0?'-':VNAME[closest[i]],
        {x:TX+TW*2+TG*2+TW/2,y:rowY+TH/2+5,'class':'vz-idx',fill:'#9fb4dc'}));
    }
  }

  /* ===== 场景一：Prim 贪心过程 ===== */
  function buildScenePrim() {
    var steps = [];
    var inT = [false,false,false,false,false];
    var lowcost = [INF,INF,INF,INF,INF];
    var closest = [-1,-1,-1,-1,-1];
    var mstW = 0, mstEdges = [];
    var stV = {}, stE = {};

    function snap(note, stats) {
      var sv={},se={},i,k;
      for(i=0;i<N;i++) sv[i]=stV[i]||'idle';
      for(k in stE) se[k]=stE[k];
      return {inT:inT.slice(),lowcost:lowcost.slice(),closest:closest.slice(),
              stV:sv,stE:se,note:note||null,stats:stats||{}};
    }
    function mkstep(f,line,narr,act){
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph(c.stage,f.stV,f.stE);
        drawArrayPanel(c.stage,f.lowcost,f.closest,f.inT);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:315,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      '顶点数':N,'边数':EDGES.length,'起点':'A','算法':'Prim 贪心'
    }),0,'Prim 算法：每步从已选集合 T 出发，选一条权值最小的跨割边，将对应顶点加入 T。重复 n-1 次。',
    ['贪心选最小跨割边','逐步扩大集合T','重复n-1次']));

    /* 初始：加入 A(0) */
    inT[0]=true; stV[0]='done'; lowcost[0]=0;
    var i,j;
    for(j=0;j<WADJ[0].length;j++){
      var nb=WADJ[0][j];
      if(nb.w < lowcost[nb.v]){ lowcost[nb.v]=nb.w; closest[nb.v]=0; }
    }
    steps.push(mkstep(snap('加入起点 A，更新邻居的 lowcost',{
      'T中':'{A}','已选':1+'/'+N,'MST权':0,'下一步':'选最小lowcost'
    }),1,'起点 A 加入集合 T，更新所有邻居的 lowcost（到 T 的最短边权）和 closest（T 内最近顶点）。',
    ['A加入T','更新lowcost','closest记录来源']));

    var round;
    for(round=1;round<N;round++){
      /* 找 lowcost 最小的未入 T 顶点 */
      var minW=INF, minV=-1;
      for(i=0;i<N;i++){
        if(!inT[i] && lowcost[i]<minW){ minW=lowcost[i]; minV=i; }
      }
      if(minV<0) break;
      var fromV=closest[minV];
      inT[minV]=true; stV[minV]='done'; mstW+=minW;
      mstEdges.push(VNAME[fromV]+'-'+VNAME[minV]+'('+minW+')');
      stE[fromV+'-'+minV]='hot'; stE[minV+'-'+fromV]='hot';
      steps.push(mkstep(snap('选入顶点 '+VNAME[minV]+'，边 '+VNAME[fromV]+'→'+VNAME[minV]+'('+minW+')',{
        '新加顶点':VNAME[minV],'最小权':minW,'来自':VNAME[fromV],'MST累计权':mstW
      }),2,'lowcost 最小的未入 T 顶点是 '+VNAME[minV]+'（权='+minW+'，来自 '+VNAME[fromV]+'）。将其加入 T，MST 累计权='+mstW+'。',
      ['选入'+VNAME[minV],'权='+minW,'MST权='+mstW]));

      /* 更新 lowcost/closest */
      for(j=0;j<WADJ[minV].length;j++){
        var nb2=WADJ[minV][j];
        if(!inT[nb2.v] && nb2.w < lowcost[nb2.v]){
          lowcost[nb2.v]=nb2.w; closest[nb2.v]=minV;
          steps.push(mkstep(snap('更新 lowcost['+VNAME[nb2.v]+']='+nb2.w,{
            '更新顶点':VNAME[nb2.v],'新lowcost':nb2.w,'closer':VNAME[minV],'MST权':mstW
          }),3,'加入 '+VNAME[minV]+' 后，邻居 '+VNAME[nb2.v]+' 的 lowcost 由旧值更新为 '+nb2.w+'，closest 改为 '+VNAME[minV]+'。',
          ['更新'+VNAME[nb2.v],'lowcost='+nb2.w,'closest='+VNAME[minV]]));
        }
      }
    }

    steps.push(mkstep(snap('MST 完成，总权 = '+mstW,{
      'MST边':mstEdges.join(' '),'总权':mstW,
      '时间':'O(n²)','适合':'稠密图'
    }),-1,'Prim MST 构建完成，共选 '+(N-1)+' 条边，总权 '+mstW+'。Prim 时间 O(n²)，与边数无关，适合稠密图。',
    ['MST总权:'+mstW,'边:'+mstEdges.length+'条','时间O(n²)']));

    return steps;
  }

  /* ===== 场景二：lowcost/closest 更新细节 ===== */
  /* 演示从 A 出发第一轮，详细展示每个邻居的更新过程 */
  function buildSceneLow() {
    var steps = [];
    var inT=[false,false,false,false,false];
    var lowcost=[INF,INF,INF,INF,INF];
    var closest=[-1,-1,-1,-1,-1];
    var stV={},stE={};

    function snap(note,stats){
      var sv={},se={},i,k;
      for(i=0;i<N;i++) sv[i]=stV[i]||'idle';
      for(k in stE) se[k]=stE[k];
      return {inT:inT.slice(),lowcost:lowcost.slice(),closest:closest.slice(),
              stV:sv,stE:se,note:note||null,stats:stats||{}};
    }
    function mkstep(f,line,narr,act){
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph(c.stage,f.stV,f.stE);
        drawArrayPanel(c.stage,f.lowcost,f.closest,f.inT);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:315,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      'lowcost[v]':'v到T的最短边权','closest[v]':'T内最近顶点',
      '初始':'全为∞/-1','说明':'每轮选最小lowcost顶点'
    }),0,'lowcost[v] 记录 v 到已选集合 T 的最小边权；closest[v] 记录 T 内对应的最近顶点。每轮选 lowcost 最小的未入 T 顶点。',
    ['lowcost=最小跨割边权','closest=T内来源顶点','每轮O(n)扫一遍']));

    inT[0]=true; stV[0]='done'; lowcost[0]=0;
    steps.push(mkstep(snap('初始：A 加入 T，开始更新邻居',{
      'T中':'{A}','lowcost[A]':0,'说明':'A已选，不再参与选择','邻居数':WADJ[0].length
    }),1,'A 加入 T。接下来逐个检查 A 的邻居，把 lowcost 从 ∞ 更新为实际边权，closest 设为 A。',
    ['A加入T','lowcost[A]=0','开始更新邻居']));

    var j;
    for(j=0;j<WADJ[0].length;j++){
      var nb=WADJ[0][j];
      lowcost[nb.v]=nb.w; closest[nb.v]=0;
      stE['0-'+nb.v]='hot'; stE[nb.v+'-0']='hot';
      steps.push(mkstep(snap('lowcost['+VNAME[nb.v]+']='+nb.w+'，closest=A',{
        '顶点':VNAME[nb.v],'旧lowcost':'∞','新lowcost':nb.w,'closest':'A'
      }),2,'边 A→'+VNAME[nb.v]+' 权='+nb.w+'，比 ∞ 小，更新 lowcost['+VNAME[nb.v]+']='+nb.w+'，closest['+VNAME[nb.v]+']=A。',
      ['lowcost['+VNAME[nb.v]+']='+nb.w,'closest=A','∞→'+nb.w]));
    }

    /* 选最小：B(2) */
    var minV=1;
    inT[minV]=true; stV[minV]='done';
    steps.push(mkstep(snap('扫描 lowcost：最小是 '+VNAME[minV]+'='+lowcost[minV]+'，选入 T',{
      '最小lowcost':lowcost[minV],'对应顶点':VNAME[minV],'来自':'A',
      '扫描代价':'O(n)'
    }),3,'扫描 lowcost 数组，找到最小值 '+lowcost[minV]+' 对应顶点 '+VNAME[minV]+'，将其加入 T。每轮扫描代价 O(n)，共 n 轮，总体 O(n²)。',
    ['最小lowcost='+lowcost[minV],'选入B','扫描O(n)']));

    steps.push(mkstep(snap('选入 '+VNAME[minV]+' 后继续更新其邻居 lowcost',{
      '刚加入':VNAME[minV],'下一步':'更新'+VNAME[minV]+'的邻居',
      '重复':'n-1轮','总复杂度':'O(n²)'
    }),3,'选入 '+VNAME[minV]+' 后，扫描其邻居更新 lowcost。这两步（选最小 + 更新）各 O(n)，n-1 轮共 O(n²)。Prim 适合稠密图。',
    ['加入'+VNAME[minV],'更新邻居lowcost','O(n)×n轮=O(n²)']));

    return steps;
  }

  /* ===== 场景三：复杂度对比 ===== */
  function buildSceneCmp() {
    var steps = [];
    var ROWS = [
      ['时间复杂度','O(n²)','O(e log e)'],
      ['空间','O(n)','O(e)'],
      ['稠密图(e≈n²)','快','慢（排序e条边）'],
      ['稀疏图(e≪n²)','慢','快'],
      ['实现难度','简单','需并查集']
    ];
    var headers=['指标','Prim','Kruskal'];
    var TBX=44, TBY=108, TBW=[130,140,150], TBH=30;

    function drawTable(c, hiRow) {
      var i,j,x,col;
      for(j=0;j<headers.length;j++){
        x=TBX; for(var q=0;q<j;q++) x+=TBW[q];
        c.stage.appendChild(D.el('rect',{x:x,y:TBY,width:TBW[j],height:TBH,rx:4,
          fill:D.C.active.fill,stroke:D.C.active.stroke,'stroke-width':1.5}));
        c.stage.appendChild(D.text(headers[j],
          {x:x+TBW[j]/2,y:TBY+TBH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
      }
      for(i=0;i<ROWS.length;i++){
        var isHi=(hiRow===i);
        for(j=0;j<ROWS[i].length;j++){
          x=TBX; for(var p=0;p<j;p++) x+=TBW[p];
          var ry=TBY+(i+1)*TBH;
          col=isHi?D.C.hot:D.C.idle;
          c.stage.appendChild(D.el('rect',{x:x,y:ry,width:TBW[j],height:TBH,rx:4,
            fill:col.fill,stroke:col.stroke,'stroke-width':1.3}));
          c.stage.appendChild(D.text(ROWS[i][j],
            {x:x+TBW[j]/2,y:ry+TBH/2+5,'class':'vz-idx',fill:isHi?'#ffd166':'#b9c8e6'}));
        }
      }
    }
    function mkstep(f,line,narr,act){
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawTable(c,f.hiRow);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:44,y:323,'class':'vz-info',fill:'#6ceaa5'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep({hiRow:undefined,note:null,stats:{
      'Prim':'O(n²)','Kruskal':'O(e log e)',
      '分界点':'e≈n log n','选择依据':'稠密/稀疏'
    }},0,'Prim 与 Kruskal 都求最小生成树，但策略不同：Prim 按顶点贪心，Kruskal 按边排序。稠密/稀疏决定选哪个。',
    ['Prim按顶点','Kruskal按边','稠密/稀疏决定选择']));

    steps.push(mkstep({hiRow:0,note:null,stats:{
      'Prim时间':'O(n²)与边数无关','Kruskal时间':'O(e log e)',
      '稠密图':'Kruskal退化为O(n²logn)','优选':'Prim'
    }},1,'Prim O(n²) 与 e 无关；Kruskal O(e log e)。稠密图 e≈n²，Kruskal 退化为 O(n² log n)，Prim 更快。',
    ['Prim O(n²)','Kruskal O(e log e)','稠密图Prim更快']));

    steps.push(mkstep({hiRow:2,
      note:'结论：稠密图选 Prim；稀疏图选 Kruskal。',
      stats:{
        '稠密图':'Prim优','稀疏图':'Kruskal优',
        'e≈n²':'选Prim','e≪n²':'选Kruskal'
      }
    },2,'稠密图 Prim 占优；稀疏图 Kruskal 占优。本例 e=8, n=5，属稀疏图，理论上 Kruskal 更优。',
    ['稠密→Prim','稀疏→Kruskal','本题属稀疏图']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['prim'] = {
    title: '最小生成树 Prim',
    subtitle: 'Prim 每步从已选集 T 出发选最小跨割边，lowcost/closest 维护候选状态，时间 O(n²)，适合稠密图。',
    height: 700,
    code: [
      '// Prim 算法（邻接矩阵版）',
      'Prim(G, s):',
      '    lowcost[s]=0; 将s加入T;',
      '    重复 n-1 次:',
      '        选 lowcost 最小的未入T顶点 v;',
      '        将 v 加入 T;',
      '        更新 v 的邻居的 lowcost/closest;',
      '// 时间 O(n²)，适合稠密图'
    ],
    scenes: [
      { name: 'Prim过程', build: buildScenePrim,
        codeTag: '贪心选最小边',
        code: [
          'Prim(G, s):',
          '    lowcost[s]=0; 加入T;',
          '    for k=1 to n-1:',
          '        选 min(lowcost[v], v∉T) → 加入T;',
          '        for each w∈Adj[v]:',
          '            if w∉T and W[v][w]<lowcost[w]:',
          '                lowcost[w]=W[v][w]; closest[w]=v;',
          '// 每轮 O(n)，n 轮：总 O(n²)'
        ]
      },
      { name: 'lowcost更新', build: buildSceneLow,
        codeTag: 'lowcost/closest数组',
        code: [
          '// lowcost[v] = v 到 T 的最小边权',
          '// closest[v] = T 内最近顶点',
          '初始: lowcost[s]=0, 其余=∞',
          '每加入顶点 u:',
          '    for each v∉T, v∈Adj[u]:',
          '        if W[u][v] < lowcost[v]:',
          '            lowcost[v]=W[u][v]; closest[v]=u;'
        ]
      },
      { name: 'Prim vs Kruskal', build: buildSceneCmp,
        codeTag: '复杂度对比',
        code: [
          '// Prim: O(n²)，与边数无关',
          '// Kruskal: O(e log e)，按边排序',
          '// 稠密图 e≈n²: 选 Prim',
          '// 稀疏图 e≪n²: 选 Kruskal',
          '// 分界点: e ≈ n log n'
        ]
      }
    ]
  };
})();