/* 最小生成树 Kruskal — 第7章
 * 场景一：按权值排序边，逐条加入（跳过成环的）。
 * 场景二：并查集（Union-Find）判断成环。
 * 场景三：时间 O(e log e) 与 Prim 对比，适合稀疏图。
 * 快照架构同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var N = 5;
  var VNAME = ['A','B','C','D','E'];
  /* 无向带权，同 prim.js */
  var EDGES_RAW = [
    [0,1,2],[0,2,4],[0,3,6],[1,2,3],[1,3,8],[1,4,5],
    [2,4,7],[3,4,9]
  ];
  var VX = [90, 200, 310, 90, 310];
  var VY = [160, 160, 160, 260, 260];
  var R = 18;

  /* 按权排序 */
  var EDGES = EDGES_RAW.slice().sort(function(a,b){return a[2]-b[2];});

  function drawGraph(g, stV, stE) {
    var e,ef,et,x1,y1,x2,y2,dx,dy,len,ex1,ey1,ex2,ey2,ekey,kind;
    stV=stV||{}; stE=stE||{};
    for(e=0;e<EDGES_RAW.length;e++){
      ef=EDGES_RAW[e][0]; et=EDGES_RAW[e][1];
      ekey=ef+'-'+et;
      x1=VX[ef]; y1=VY[ef]; x2=VX[et]; y2=VY[et];
      dx=x2-x1; dy=y2-y1; len=Math.sqrt(dx*dx+dy*dy)||1;
      ex1=x1+dx/len*R; ey1=y1+dy/len*R;
      ex2=x2-dx/len*(R+4); ey2=y2-dy/len*(R+4);
      kind=(stE[ekey]||stE[et+'-'+ekey])||'mute';
      if(stE[ekey]) kind=stE[ekey];
      else if(stE[et+'-'+ef]) kind=stE[et+'-'+ef];
      D.link(g,{x1:ex1,y1:ey1,x2:ex2,y2:ey2,kind:kind});
      D.link(g,{x1:ex2,y1:ey2,x2:ex1,y2:ey1,kind:kind});
      g.appendChild(D.text(EDGES_RAW[e][2],{
        x:(x1+x2)/2+(dy/len)*(-8),y:(y1+y2)/2+(-dx/len)*(-8),'class':'vz-elab'
      }));
    }
    for(var i=0;i<N;i++){
      D.circleNode(g,{x:VX[i],y:VY[i],r:R,
        state:(stV[i])||'idle',value:VNAME[i]});
    }
  }

  /* 右侧：已排序边列表 */
  var EX = 490, EY = 108, EW = 80, EH = 24, EG = 4;

  function drawEdgeList(g, hiIdx, stateArr) {
    var i,ry,col;
    g.appendChild(D.text('边（按权排序）',
      {x:EX+EW/2,y:EY-6,'class':'vz-tag',fill:'#9fb4dc'}));
    for(i=0;i<EDGES.length;i++){
      ry=EY+i*(EH+EG);
      if(i===hiIdx) col=D.C.active;
      else if(stateArr&&stateArr[i]==='mst') col=D.C.done;
      else if(stateArr&&stateArr[i]==='skip') col=D.C.bad;
      else col=D.C.idle;
      g.appendChild(D.el('rect',{x:EX,y:ry,width:EW,height:EH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(
        VNAME[EDGES[i][0]]+'-'+VNAME[EDGES[i][1]]+' ('+EDGES[i][2]+')',
        {x:EX+EW/2,y:ry+EH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
    }
  }

  /* ===== 并查集 ===== */
  function makeUF(n) {
    var parent=[],rank=[],i;
    for(i=0;i<n;i++){parent.push(i);rank.push(0);}
    return {
      find:function(x){
        while(parent[x]!==x) x=parent[x]; return x;
      },
      union:function(x,y){
        var px=this.find(x), py=this.find(y);
        if(px===py) return false;
        if(rank[px]<rank[py]){var t=px;px=py;py=t;}
        parent[py]=px;
        if(rank[px]===rank[py]) rank[px]++;
        return true;
      },
      snap:function(){return parent.slice();}
    };
  }

  /* ===== 场景一：Kruskal 过程 ===== */
  function buildSceneKruskal() {
    var steps = [];
    var uf = makeUF(N);
    var stV={}, stE={};
    var edgeState = EDGES.map(function(){return 'idle';});
    var mstEdges=[], mstW=0;

    function snap(note,stats){
      var sv={},se={},i,k;
      for(i=0;i<N;i++) sv[i]=stV[i]||'idle';
      for(k in stE) se[k]=stE[k];
      return {edgeState:edgeState.slice(),hiIdx:-1,
              stV:sv,stE:se,note:note||null,stats:stats||{}};
    }
    function snapHi(hi,note,stats){
      var f=snap(note,stats); f.hiIdx=hi; return f;
    }
    function mkstep(f,line,narr,act){
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph(c.stage,f.stV,f.stE);
        drawEdgeList(c.stage,f.hiIdx,f.edgeState);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:315,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      '顶点数':N,'边数':EDGES_RAW.length,'目标':'选n-1条边',
      '策略':'按权排序，逐条判断'
    }),0,'Kruskal：将所有边按权值从小到大排序，依次取边，若不成环则加入 MST，共取 n-1 条边为止。',
    ['边按权排序','逐条判断成环','选n-1条不成环的边']));

    var i;
    for(i=0;i<EDGES.length && mstEdges.length<N-1;i++){
      var ef=EDGES[i][0], et=EDGES[i][1], ew=EDGES[i][2];
      edgeState[i]='active';
      steps.push(mkstep(snapHi(i,'检查边 '+VNAME[ef]+'-'+VNAME[et]+'('+ew+')',{
        '当前边':VNAME[ef]+'-'+VNAME[et],'权':ew,
        '已选':mstEdges.length+'/'+(N-1),'判断':'是否成环'
      }),1,'取出权最小的未处理边 '+VNAME[ef]+'-'+VNAME[et]+'('+ew+')。用并查集判断两端是否已在同一连通分量。',
      ['检查'+VNAME[ef]+'-'+VNAME[et],'权='+ew,'并查集判环']));

      var ok=uf.union(ef,et);
      if(ok){
        edgeState[i]='mst'; mstW+=ew;
        mstEdges.push(VNAME[ef]+'-'+VNAME[et]+'('+ew+')');
        stE[ef+'-'+et]='hot'; stE[et+'-'+ef]='hot';
        stV[ef]='done'; stV[et]='done';
        steps.push(mkstep(snapHi(i,'加入 MST：'+VNAME[ef]+'-'+VNAME[et]+'('+ew+')',{
          '加入MST':VNAME[ef]+'-'+VNAME[et],'权':ew,
          '已选':mstEdges.length+'/'+(N-1),'MST累计权':mstW
        }),2,'两端不在同一分量，无环，将边 '+VNAME[ef]+'-'+VNAME[et]+'('+ew+') 加入 MST。已选 '+mstEdges.length+' 条边。',
        ['加入MST','MST权='+mstW,'已选'+mstEdges.length+'条']));
      } else {
        edgeState[i]='skip';
        steps.push(mkstep(snapHi(i,'跳过：'+VNAME[ef]+'-'+VNAME[et]+' 成环',{
          '跳过边':VNAME[ef]+'-'+VNAME[et],'原因':'两端同分量',
          '已选':mstEdges.length+'/'+(N-1),'操作':'丢弃此边'
        }),3,'两端已在同一连通分量，加入此边会成环。跳过，继续取下一条边。',
        ['跳过成环边','两端同分量','继续下一条']));
      }
    }

    steps.push(mkstep(snap('MST 完成，总权 = '+mstW,{
      'MST边数':mstEdges.length,'总权':mstW,
      '时间':'O(e log e)','适合':'稀疏图'
    }),-1,'Kruskal MST 完成，选了 '+(N-1)+' 条边，总权 '+mstW+'。时间 O(e log e)，主要消耗在边的排序上。',
    ['MST总权:'+mstW,'时间O(e log e)','稀疏图优先']));

    return steps;
  }

  /* ===== 场景二：并查集 Union-Find ===== */
  /* 演示 parent 数组的变化：逐步合并分量 */
  var UFX = 490, UFY = 108, UFW = 44, UFH = 24, UFG = 4;

  function drawUFPanel(g, parent) {
    var i,x;
    g.appendChild(D.text('parent[]',
      {x:UFX,y:UFY-6,'class':'vz-tag',fill:'#9fb4dc','text-anchor':'start'}));
    for(i=0;i<N;i++){
      x=UFX+i*(UFW+UFG);
      var isRoot=(parent[i]===i);
      var col=isRoot?D.C.done:D.C.active;
      g.appendChild(D.el('rect',{x:x,y:UFY,width:UFW,height:UFH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(VNAME[i],
        {x:x+UFW/2,y:UFY+UFH+12,'class':'vz-idx',fill:'#9fb4dc'}));
      g.appendChild(D.text(VNAME[parent[i]],
        {x:x+UFW/2,y:UFY+UFH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
    }
    g.appendChild(D.text('亮色=根节点',
      {x:UFX,y:UFY+UFH+28,'class':'vz-info',fill:'#6ceaa5','text-anchor':'start'}));
  }

  function buildSceneUF() {
    var steps = [];
    var uf2=makeUF(N);
    var stV={},stE={};
    var edgeState=EDGES.map(function(){return 'idle';});

    function snap(note,stats){
      var sv={},se={},i,k;
      for(i=0;i<N;i++) sv[i]=stV[i]||'idle';
      for(k in stE) se[k]=stE[k];
      return {parent:uf2.snap(),edgeState:edgeState.slice(),hiIdx:-1,
              stV:sv,stE:se,note:note||null,stats:stats||{}};
    }
    function snapHi(hi,note,stats){
      var f=snap(note,stats); f.hiIdx=hi; return f;
    }
    function mkstep(f,line,narr,act){
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph(c.stage,f.stV,f.stE);
        drawUFPanel(c.stage,f.parent);
        drawEdgeList(c.stage,f.hiIdx,f.edgeState);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:310,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      '并查集':'路径压缩+按秩合并','初始':'每顶点自成一组',
      'find':'O(α(n))≈O(1)','union':'O(α(n))≈O(1)'
    }),0,'并查集用 parent[] 数组记录每个顶点的父节点，根节点 parent[i]=i。find(x) 找根，union(x,y) 合并两棵树。',
    ['parent[i]=i表示根','find找根','union合并两棵树']));

    /* 演示前3条边的合并 */
    var show=Math.min(4,EDGES.length), i;
    for(i=0;i<show;i++){
      var ef=EDGES[i][0], et=EDGES[i][1], ew=EDGES[i][2];
      var pef=uf2.find(ef), pet=uf2.find(et);
      edgeState[i]='active';
      var suf={}; suf['边']=VNAME[ef]+'-'+VNAME[et]; suf['权']=ew;
      suf['find('+VNAME[ef]+')']=VNAME[pef]; suf['find('+VNAME[et]+')']=VNAME[pet];
      steps.push(mkstep(snapHi(i,
        'find('+VNAME[ef]+')='+VNAME[pef]+', find('+VNAME[et]+')='+VNAME[pet],suf),1,'检查边 '+VNAME[ef]+'-'+VNAME[et]+'。find('+VNAME[ef]+')='+VNAME[pef]+'，find('+VNAME[et]+')='+VNAME[pet]+'。'+(pef===pet?'根相同，成环，跳过。':'根不同，可合并。'),
      ['find'+VNAME[ef]+'='+VNAME[pef],'find'+VNAME[et]+'='+VNAME[pet],pef===pet?'成环跳过':'根不同可合并']));

      var ok=uf2.union(ef,et);
      if(ok){
        edgeState[i]='mst';
        stE[ef+'-'+et]='hot'; stE[et+'-'+ef]='hot';
        stV[ef]='done'; stV[et]='done';
        steps.push(mkstep(snapHi(i,'union('+VNAME[ef]+','+VNAME[et]+')：合并两棵树',{
          '操作':'union','新parent':VNAME[uf2.find(ef)],
          '已合并边':i+1,'下一步':'继续下一条边'
        }),2,'union('+VNAME[ef]+','+VNAME[et]+')：将两棵树合并，根节点指向更深的那棵（按秩合并）。parent[] 已更新。',
        ['union完成','parent已更新','按秩合并']));
      } else {
        edgeState[i]='skip';
        steps.push(mkstep(snapHi(i,'skip：'+VNAME[ef]+'-'+VNAME[et]+' 成环',{
          '判断':'根相同','操作':'跳过','原因':'同一连通分量'
        }),3,'两端根相同，加入此边会成环，跳过。并查集 find() 时间近似 O(1)，整体 O(e log e) 来自排序。',
        ['根相同=成环','跳过此边','find≈O(1)']));
      }
    }

    steps.push(mkstep(snap('并查集保证无环，合并代价近似 O(1)',{
      '算法':'路径压缩+按秩合并','find单次':'O(α(n))≈O(1)',
      '总并查集代价':'O(e·α(n))≈O(e)','排序代价':'O(e log e)'
    }),-1,'并查集配合路径压缩与按秩合并，单次 find/union 时间近似 O(1)。Kruskal 总时间瓶颈在边排序：O(e log e)。',
    ['find≈O(1)','总UF代价O(e)','瓶颈在排序O(e log e)']));

    return steps;
  }

  /* ===== 场景三：适用场景与复杂度分析 ===== */
  function buildSceneCmp() {
    var steps = [];
    var ROWS = [
      ['时间复杂度','O(e log e)','O(n²)'],
      ['空间','O(e)+并查集','O(n)'],
      ['稠密图(e≈n²)','O(n²logn)慢','O(n²)快'],
      ['稀疏图(e≪n²)','O(e log e)快','O(n²)慢'],
      ['实现','边排序+并查集','lowcost/closest数组']
    ];
    var headers=['指标','Kruskal','Prim'];
    var TBX=44, TBY=108, TBW=[150,150,150], TBH=30;

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
      'Kruskal':'O(e log e)','Prim':'O(n²)',
      '选择依据':'稀疏/稠密','本例':'稀疏图选Kruskal'
    }},0,'Kruskal 适合稀疏图（e≪n²），时间 O(e log e)；Prim 适合稠密图（e≈n²），时间 O(n²)。',
    ['Kruskal稀疏图','Prim稠密图','时间取决于e/n²']));

    steps.push(mkstep({hiRow:0,note:null,stats:{
      'Kruskal稀疏':'O(e log e)小','Kruskal稠密':'退化O(n²logn)',
      'Prim固定':'O(n²)','结论':'看e和n²的大小'
    }},1,'Kruskal O(e log e)：稀疏图 e 小时极快；稠密图 e≈n² 时退化为 O(n² log n)，不如 Prim。',
    ['稀疏→Kruskal','稠密→Prim','分界e≈n log n']));

    steps.push(mkstep({hiRow:3,
      note:'结论：稀疏图选 Kruskal；稠密图选 Prim。本例 e=8, n=5：选 Kruskal。',
      stats:{
        '稀疏图':'Kruskal优','稠密图':'Prim优',
        'e=8,n=5':'稀疏选Kruskal','MST总权':20
      }
    },2,'本例 e=8，n=5，e≪n²=25，稀疏图。Kruskal 排序 8 条边远少于 Prim 扫 5²=25 次。',
    ['e=8<n²=25','稀疏图','Kruskal更优']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['kruskal'] = {
    title: '最小生成树 Kruskal',
    subtitle: 'Kruskal 将所有边按权排序，用并查集判断成环，逐条加入不成环的边直到 n-1 条。时间 O(e log e)，适合稀疏图。',
    height: 700,
    code: [
      '// Kruskal 算法',
      'Kruskal(G):',
      '    将所有边按权值排序;',
      '    for each edge(u,v,w) in sorted order:',
      '        if find(u) != find(v):',
      '            MST.add(u,v,w); union(u,v);',
      '        if |MST|==n-1: break;',
      '// 时间 O(e log e)，适合稀疏图'
    ],
    scenes: [
      { name: 'Kruskal过程', build: buildSceneKruskal,
        codeTag: '排序+判环',
        code: [
          'Kruskal(G):',
          '    edges = sort(all edges by weight);',
          '    for each (u,v,w) in edges:',
          '        if find(u) != find(v):',
          '            MST.add(u,v,w);',
          '            union(u, v);',
          '        if |MST|==n-1: break;',
          '// O(e log e) 主要来自排序'
        ]
      },
      { name: '并查集', build: buildSceneUF,
        codeTag: 'Union-Find判环',
        code: [
          '// Union-Find（路径压缩+按秩合并）',
          'find(x): 路径追溯至根;',
          'union(x,y):',
          '    px=find(x); py=find(y);',
          '    if px==py: return false;',
          '    parent[py]=px;',
          '    return true;'
        ]
      },
      { name: 'Kruskal vs Prim', build: buildSceneCmp,
        codeTag: '适用场景',
        code: [
          '// Kruskal: O(e log e) → 稀疏图',
          '// Prim:    O(n²)      → 稠密图',
          '// 分界线: e ≈ n log n',
          '// 稠密图: e≈n², Prim 占优',
          '// 稀疏图: e≪n², Kruskal 占优'
        ]
      }
    ]
  };
})();