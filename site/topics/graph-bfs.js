/* 广度优先搜索 BFS — 第7章
 * 场景一：BFS 过程（队列驱动）。场景二：BFS 求最短路径（无权图）。
 * 快照架构同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  var N = 6;
  var VNAME = ['A','B','C','D','E','F'];
  /* 无向图，方便 BFS 层次展开 */
  var EDGES = [[0,1],[0,2],[1,3],[1,4],[2,4],[3,5],[4,5]];
  var VX = [90, 200, 90, 310, 200, 310];
  var VY = [155, 155, 250, 155, 250, 250];
  var R = 18;

  function makeAdj() {
    var i,e,adj=[];
    for(i=0;i<N;i++) adj.push([]);
    for(e=0;e<EDGES.length;e++){
      adj[EDGES[e][0]].push(EDGES[e][1]);
      adj[EDGES[e][1]].push(EDGES[e][0]);
    }
    return adj;
  }
  var ADJ = makeAdj();

  function drawGraph(g, stV, stE) {
    var e,ef,et,ekey,x1,y1,x2,y2,dx,dy,len,ex1,ey1,ex2,ey2;
    stV=stV||{}; stE=stE||{};
    for(e=0;e<EDGES.length;e++){
      ef=EDGES[e][0]; et=EDGES[e][1];
      ekey=ef+'-'+et;
      x1=VX[ef]; y1=VY[ef]; x2=VX[et]; y2=VY[et];
      dx=x2-x1; dy=y2-y1; len=Math.sqrt(dx*dx+dy*dy)||1;
      ex1=x1+dx/len*R; ey1=y1+dy/len*R;
      ex2=x2-dx/len*(R+4); ey2=y2-dy/len*(R+4);
      var k=(stE[ekey]||stE[et+'-'+ef])?'hot':'mute';
      D.link(g,{x1:ex1,y1:ey1,x2:ex2,y2:ey2,kind:k});
      D.link(g,{x1:ex2,y1:ey2,x2:ex1,y2:ey1,kind:k});
    }
    for(var i=0;i<N;i++){
      D.circleNode(g,{x:VX[i],y:VY[i],r:R,
        state:(stV[i])||'idle',value:VNAME[i]});
    }
  }

  /* 右侧：队列（横向，队头在左）+ visited + 访问序列 */
  var QX = 490, QY = 108, QW = 34, QH = 26, QG = 4;
  var AY2 = 175, AY3 = 235;

  function drawPanel(g, queue, visited, order) {
    var i,x,col;
    /* 队列 */
    g.appendChild(D.text('队列 Q（队头在左）',
      {x:QX,y:QY-6,'class':'vz-tag',fill:'#9fb4dc','text-anchor':'start'}));
    for(i=0;i<6;i++){
      x=QX+i*(QW+QG);
      var inQ=(i<queue.length);
      col=inQ?D.C.active:D.C.mute;
      g.appendChild(D.el('rect',{x:x,y:QY,width:QW,height:QH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':inQ&&i===0?2.4:1.5}));
      if(inQ) g.appendChild(D.text(queue[i],
        {x:x+QW/2,y:QY+QH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
    }
    /* visited */
    g.appendChild(D.text('visited[]',
      {x:QX,y:AY2-6,'class':'vz-tag',fill:'#9fb4dc','text-anchor':'start'}));
    for(i=0;i<N;i++){
      x=QX+i*(QW+QG);
      col=visited[i]?D.C.done:D.C.idle;
      g.appendChild(D.el('rect',{x:x,y:AY2,width:QW,height:QH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(VNAME[i],
        {x:x+QW/2,y:AY2+QH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
      g.appendChild(D.text(visited[i]?'1':'0',
        {x:x+QW/2,y:AY2+QH+14,'class':'vz-idx',fill:visited[i]?'#6ceaa5':'#4a5c82'}));
    }
    /* 访问序列 */
    g.appendChild(D.text('访问序列',
      {x:QX,y:AY3-6,'class':'vz-tag',fill:'#9fb4dc','text-anchor':'start'}));
    for(i=0;i<N;i++){
      x=QX+i*(QW+QG);
      var on=(i<order.length);
      col=on?D.C.done:D.C.mute;
      g.appendChild(D.el('rect',{x:x,y:AY3,width:QW,height:QH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':on&&i===order.length-1?2.4:1.5}));
      if(on) g.appendChild(D.text(order[i],
        {x:x+QW/2,y:AY3+QH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
    }
  }

  /* ===== 场景一：BFS 过程 ===== */
  function buildSceneBFS() {
    var steps = [];
    var visited = [0,0,0,0,0,0];
    var queue = [];
    var order = [];
    var stV = {}, stE = {};

    function snap(note, stats) {
      var sv={},se={},i,k;
      for(i=0;i<N;i++) sv[i]=stV[i]||'idle';
      for(k in stE) se[k]=stE[k];
      return {visited:visited.slice(),queue:queue.map(function(x){return VNAME[x];}),
              order:order.slice(),stV:sv,stE:se,note:note||null,stats:stats||{}};
    }
    function mkstep(f,line,narr,act){
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph(c.stage,f.stV,f.stE);
        drawPanel(c.stage,f.queue,f.visited,f.order);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:315,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      '算法':'BFS','起点':'A(0)','数据结构':'队列',
      '特点':'按距离由近及远访问'
    }),0,'BFS 用队列驱动：从起点出发，先访问所有距离为1的邻居，再依次往外扩展。保证按层次（距离）顺序访问。',
    ['队列驱动','按层扩展','先近后远']));

    visited[0]=1; stV[0]='active'; queue.push(0);
    steps.push(mkstep(snap('起点 A 入队，visited[0]=1',{
      '操作':'EnQueue(A)','队列':'[A]',
      'visited[0]':1,'说明':'入队时即标记'
    }),1,'起点 A 入队并标记 visited[0]=1。BFS 的关键：入队时立即标记，防止重复入队。',
    ['A入队','visited[0]=1','入队时标记']));

    while(queue.length){
      var u=queue.shift();
      stV[u]='done'; order.push(VNAME[u]);
      steps.push(mkstep(snap('出队 '+VNAME[u]+' 并访问',{
        '出队':VNAME[u],'已访问':order.length+'/'+N,
        '序列':order.join(''),'队列长':queue.length
      }),2,'出队顶点 '+VNAME[u]+' 并访问，输出到序列第 '+order.length+' 位。然后遍历其所有邻居。',
      ['出队'+VNAME[u],'序列:'+order.join(''),'遍历邻居']));

      var j,v;
      for(j=0;j<ADJ[u].length;j++){
        v=ADJ[u][j];
        if(!visited[v]){
          visited[v]=1; stV[v]='active'; queue.push(v);
          stE[u+'-'+v]='hot'; stE[v+'-'+u]='hot';
          steps.push(mkstep(snap('邻居 '+VNAME[v]+' 未访问，入队',{
            '邻居':VNAME[v],'来自':VNAME[u],
            '操作':'EnQueue('+VNAME[v]+')','队列长':queue.length
          }),3,'邻居 '+VNAME[v]+' 未被访问，标记 visited=1 并入队。入队即标记是 BFS 正确性的保证。',
          ['EnQueue('+VNAME[v]+')','visited['+v+']=1','队列长'+queue.length]));
        }
      }
    }
    steps.push(mkstep(snap('BFS 完成，序列: '+order.join(' '),{
      '访问序列':order.join(''),'时间':'O(n+e)',
      '空间':'O(n) 队列','层次':'按距离由近及远'
    }),-1,'BFS 完成。时间 O(n+e)，每个顶点出队一次，每条边检查两次（无向图）。序列就是 BFS 树的层次遍历。',
    ['序列:'+order.join(''),'时间O(n+e)','按距离排列']));

    return steps;
  }

  /* ===== 场景二：BFS 最短路径（无权图跳数） ===== */
  function buildSceneSP() {
    var steps = [];
    var visited = [0,0,0,0,0,0];
    var dist = [-1,-1,-1,-1,-1,-1];
    var prev = [-1,-1,-1,-1,-1,-1];
    var queue = [];
    var order = [];
    var stV = {}, stE = {};
    var SRC = 0, DST = 5;

    function snap(note, stats) {
      var sv={},se={},i,k;
      for(i=0;i<N;i++) sv[i]=stV[i]||'idle';
      for(k in stE) se[k]=stE[k];
      var dStr='['+dist.map(function(d){return d<0?'∞':d;}).join(',')+']';
      return {visited:visited.slice(),
              queue:queue.map(function(x){return VNAME[x];}),
              order:order.slice(),dist:dStr,
              stV:sv,stE:se,note:note||null,stats:stats||{}};
    }
    function mkstep(f,line,narr,act){
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph(c.stage,f.stV,f.stE);
        drawPanel(c.stage,f.queue,f.visited,f.order);
        c.stage.appendChild(D.text('dist[]: '+f.dist,
          {x:490,y:300,'class':'vz-info',fill:'#6ceaa5','text-anchor':'start'}));
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:320,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      '起点':VNAME[SRC],'终点':VNAME[DST],
      '算法':'BFS最短路','图':'无权图（跳数）'
    }),0,'无权图最短路：BFS 第一次抵达某顶点时走过的跳数就是最短距离。dist[v] = dist[u] + 1 逐层递推。',
    ['BFS保证最短','dist[v]=dist[u]+1','有权图须Dijkstra']));

    visited[0]=1; stV[0]='active'; dist[0]=0; queue.push(0);
    steps.push(mkstep(snap('起点 '+VNAME[SRC]+' 入队，dist[0]=0',{
      'dist[A]':0,'dist[其余]':'∞',
      '队列':'[A]','说明':'起点距离为0'
    }),1,'起点 A 入队，dist[0]=0。其余顶点距离初始化为 ∞（-1）。BFS 会逐层把距离填进去。',
    ['A入队','dist[0]=0','其余=∞']));

    while(queue.length){
      var u=queue.shift();
      stV[u]='done'; order.push(VNAME[u]);
      var sd={}; sd['出队']=VNAME[u]; sd['dist['+VNAME[u]+']']=dist[u];
      sd['序列']=order.join(''); sd['队列长']=queue.length;
      steps.push(mkstep(snap('出队 '+VNAME[u]+' dist='+dist[u],sd),2,'出队 '+VNAME[u]+'，当前距离 dist='+dist[u]+'。遍历邻居，若未访问则 dist+1。',
      ['出队'+VNAME[u],'dist='+dist[u],'更新邻居']));

      var j,v;
      for(j=0;j<ADJ[u].length;j++){
        v=ADJ[u][j];
        if(!visited[v]){
          visited[v]=1; stV[v]='active';
          dist[v]=dist[u]+1; prev[v]=u;
          queue.push(v);
          stE[u+'-'+v]='hot'; stE[v+'-'+u]='hot';
          var sd2={}; sd2['更新']=VNAME[v]; sd2['dist['+VNAME[v]+']']=dist[v];
          sd2['前驱']=VNAME[u]; sd2['BFS层']=dist[v];
          steps.push(mkstep(snap('dist['+VNAME[v]+']='+dist[v],sd2),3,'更新 dist['+VNAME[v]+']='+dist[v]+'，前驱='+VNAME[u]+'。BFS 保证第一次到达时的距离是最短的。',
          ['dist['+VNAME[v]+']='+dist[v],'前驱='+VNAME[u],'入队'+VNAME[v]]));
        }
      }
    }

    /* 回溯路径 A→F */
    var path = [], cur = DST;
    while(cur >= 0){ path.unshift(VNAME[cur]); cur=prev[cur]; }
    var pathStr = path.join('→');
    for(var pi=0;pi<path.length-1;pi++){
      var pu=VNAME.indexOf(path[pi]), pv2=VNAME.indexOf(path[pi+1]);
      stE[pu+'-'+pv2]='hot'; stE[pv2+'-'+pu]='hot';
      stV[pu]='hot'; stV[pv2]='hot';
    }
    steps.push(mkstep(snap('最短路径: '+pathStr+'，跳数: '+dist[DST],{
      '起点':VNAME[SRC],'终点':VNAME[DST],
      '最短路径':pathStr,'跳数':dist[DST]
    }),-1,'BFS 求得 '+VNAME[SRC]+' 到 '+VNAME[DST]+' 最短路径为 '+pathStr+'，共 '+dist[DST]+' 跳。回溯 prev[] 数组可还原完整路径。',
    ['最短路:'+pathStr,'跳数:'+dist[DST],'回溯prev[]']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['graph-bfs'] = {
    title: '广度优先搜索 BFS',
    subtitle: 'BFS 用队列驱动，按距离由近及远访问；无权图中 BFS 第一次到达某顶点时的跳数即最短距离。时间 O(n+e)。',
    height: 700,
    code: [
      '// BFS：队列驱动，入队即标记',
      'void BFS(G, s) {',
      '    visited[s]=1; EnQueue(Q, s);',
      '    while (!Empty(Q)) {',
      '        u = DeQueue(Q); visit(u);',
      '        for each v in Adj[u]:',
      '            if (!visited[v]) { visited[v]=1; EnQueue(Q,v); }',
      '    }',
      '}'
    ],
    scenes: [
      { name: 'BFS过程', build: buildSceneBFS,
        codeTag: '队列驱动',
        code: [
          'void BFS(G, s) {',
          '    visited[s]=1; EnQueue(Q, s); // 入队即标记',
          '    while (!Empty(Q)) {',
          '        u = DeQueue(Q); visit(u);',
          '        for each v in Adj[u]:',
          '            if (!visited[v])',
          '                visited[v]=1; EnQueue(Q,v);',
          '    }',
          '}'
        ]
      },
      { name: 'BFS最短路', build: buildSceneSP,
        codeTag: '无权图最短距离',
        code: [
          '// BFS最短路（无权图）',
          '    dist[s]=0; EnQueue(Q, s);',
          '    while (!Empty(Q)) {',
          '        u = DeQueue(Q);',
          '        for each v in Adj[u]:',
          '            if (dist[v]<0) {',
          '                dist[v]=dist[u]+1;',
          '                prev[v]=u; EnQueue(Q,v);',
          '            }',
          '    }'
        ]
      }
    ]
  };
})();
