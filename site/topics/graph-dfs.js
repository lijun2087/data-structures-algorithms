/* 深度优先搜索 DFS — 第7章
 * 场景一：递归 DFS（含 visited 数组）。场景二：显式栈非递归。场景三：非连通图。
 * 快照架构同 insertion-sort.js：build() 算完，run() 只画。
 */
(function () {
  var D = window.VizDraw;

  /* 6顶点有向图，同 graph-storage.js */
  var N = 6;
  var VNAME = ['A','B','C','D','E','F'];
  var EDGES = [
    [0,1],[0,2],[1,3],[1,4],
    [2,4],[3,5],[4,5],[2,3]
  ];
  var VX = [90, 200, 90, 310, 200, 310];
  var VY = [155, 155, 250, 155, 250, 250];
  var R = 18;

  /* 邻接表（只用出边） */
  function makeAdj() {
    var i, e, adj = [];
    for (i = 0; i < N; i++) adj.push([]);
    for (e = 0; e < EDGES.length; e++) adj[EDGES[e][0]].push(EDGES[e][1]);
    return adj;
  }
  var ADJ = makeAdj();

  function drawGraph(g, stV, stE) {
    var e, ef, et, ekey, x1, y1, x2, y2, dx, dy, len, ex1, ey1, ex2, ey2;
    stV = stV || {}; stE = stE || {};
    for (e = 0; e < EDGES.length; e++) {
      ef = EDGES[e][0]; et = EDGES[e][1];
      ekey = ef + '-' + et;
      x1=VX[ef]; y1=VY[ef]; x2=VX[et]; y2=VY[et];
      dx=x2-x1; dy=y2-y1; len=Math.sqrt(dx*dx+dy*dy)||1;
      ex1=x1+dx/len*R; ey1=y1+dy/len*R;
      ex2=x2-dx/len*(R+4); ey2=y2-dy/len*(R+4);
      D.link(g, {x1:ex1,y1:ey1,x2:ex2,y2:ey2,
        kind:stE[ekey]?'hot':'mute'});
    }
    for (var i = 0; i < N; i++) {
      D.circleNode(g, {x:VX[i],y:VY[i],r:R,
        state:(stV[i])||'idle',value:VNAME[i]});
    }
  }

  /* 右侧：visited 数组（6格）+ 访问序列（6格） */
  var AX = 490, AY = 108, AW = 34, AH = 26, AG = 6;

  function drawArrays(g, visited, order) {
    var i, x, col;
    /* visited 数组 */
    g.appendChild(D.text('visited[]',
      {x:AX,y:AY-6,'class':'vz-tag',fill:'#9fb4dc','text-anchor':'start'}));
    for (i = 0; i < N; i++) {
      x = AX + i*(AW+AG);
      col = visited[i] ? D.C.done : D.C.idle;
      g.appendChild(D.el('rect',{x:x,y:AY,width:AW,height:AH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(VNAME[i],
        {x:x+AW/2,y:AY+AH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
      g.appendChild(D.text(visited[i]?'1':'0',
        {x:x+AW/2,y:AY+AH+14,'class':'vz-idx',fill:visited[i]?'#6ceaa5':'#4a5c82'}));
    }
    /* 访问序列 */
    g.appendChild(D.text('访问序列',
      {x:AX,y:AY+AH+40,'class':'vz-tag',fill:'#9fb4dc','text-anchor':'start'}));
    for (i = 0; i < N; i++) {
      x = AX + i*(AW+AG);
      var on = i < order.length;
      col = on ? D.C.done : D.C.mute;
      g.appendChild(D.el('rect',{x:x,y:AY+AH+52,width:AW,height:AH,rx:4,
        fill:col.fill,stroke:col.stroke,'stroke-width':on&&i===order.length-1?2.4:1.5}));
      if (on) g.appendChild(D.text(order[i],
        {x:x+AW/2,y:AY+AH+52+AH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
    }
  }

  /* 右侧：显式栈（垂直，栈底在下） */
  var SX = 490, SY = 108, SW = 52, SH = 26, SBOT = 290;

  function drawStack(g, stk) {
    g.appendChild(D.text('显式栈（栈顶在上）',
      {x:SX+SW/2,y:SY-6,'class':'vz-tag',fill:'#9fb4dc'}));
    var n = Math.min(stk.length, 6), j, sy, sc;
    for (j = 0; j < n; j++) {
      sy = SBOT - (j+1)*(SH+4);
      sc = D.C[j===n-1?'active':'idle'];
      g.appendChild(D.el('rect',{x:SX,y:sy,width:SW,height:SH,rx:4,
        fill:sc.fill,stroke:sc.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(stk[stk.length-1-j],
        {x:SX+SW/2,y:sy+SH/2+5,'class':'vz-idx',fill:'#dfe8ff'}));
    }
    if (!stk.length) g.appendChild(D.text('（空）',
      {x:SX+SW/2,y:SBOT-10,'class':'vz-idx',fill:'#4a5c82'}));
  }

  /* ===== 场景一：递归 DFS ===== */
  function buildSceneRec() {
    var steps = [];
    var visited = [0,0,0,0,0,0];
    var order = [];
    var stV = {}, stE = {};

    function snap(note, stats) {
      var sv = {}, se = {}, i, k;
      for (i=0;i<N;i++) sv[i]=stV[i]||'idle';
      for (k in stE) se[k]=stE[k];
      return {visited:visited.slice(),order:order.slice(),stV:sv,stE:se,
              note:note||null,stats:stats||{}};
    }
    function mkstep(f,line,narr,act) {
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph(c.stage,f.stV,f.stE);
        drawArrays(c.stage,f.visited,f.order);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:320,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      '顶点数':N,'边数':EDGES.length,'起点':'A(0)','算法':'递归DFS'
    }),0,'DFS 从起点出发，每次访问未访问邻居，一头扎到底再回溯。必须有 visited[] 防止图中的回路导致死循环。',
    ['visited防止重复','一条路走到底','回溯再探其他路']));

    function dfs(u) {
      visited[u]=1; stV[u]='active'; order.push(VNAME[u]);
      steps.push(mkstep(snap('访问 '+VNAME[u]+' → visited['+u+']=1',{
        '当前顶点':VNAME[u],'已访问':order.length+'/'+N,
        '访问序列':order.join(''),'递归层':order.length
      }),1,'进入 DFS('+VNAME[u]+')：标记 visited['+u+']=1，输出 '+VNAME[u]+'。从此开始沿出边深入探索。',
      ['访问'+VNAME[u],'visited['+u+']=1','序列:'+order.join('')]));

      var j, v;
      for (j=0;j<ADJ[u].length;j++) {
        v=ADJ[u][j];
        if (!visited[v]) {
          stE[u+'-'+v]='hot';
          var st2={}; st2['当前顶点']=VNAME[u]; st2['邻居']=VNAME[v];
          st2['visited['+v+']']=0; st2['操作']='递归DFS('+VNAME[v]+')';
          steps.push(mkstep(snap('边 '+VNAME[u]+'→'+VNAME[v]+' 未访问，递归进入',st2),2,'发现未访问邻居 '+VNAME[v]+'，沿边 '+VNAME[u]+'→'+VNAME[v]+' 递归深入。',
          ['发现'+VNAME[v],'visited['+v+']=0','递归DFS('+VNAME[v]+')']));
          dfs(v);
        }
      }
      stV[u]='done';
      steps.push(mkstep(snap(VNAME[u]+' 的所有出边已探完，返回上层',{
        '当前顶点':VNAME[u],'状态':'全部邻居已处理',
        '已访问':order.length+'/'+N,'返回':'上层调用'
      }),3,VNAME[u]+' 的全部出边都已探索，DFS('+VNAME[u]+') 返回。此即回溯：从已死路返回寻找新路。',
      [VNAME[u]+' 全部完成','回溯','已访问'+order.length+'/'+N]));
    }

    dfs(0);
    steps.push(mkstep(snap('DFS 完成，序列: '+order.join(' '),{
      '访问序列':order.join(''),'时间':'O(n+e)',
      '空间':'O(n) visited','递归深度':'最坏O(n)'
    }),-1,'DFS 遍历完成。时间 O(n+e)：每个顶点、每条边访问一次。递归深度等于 DFS 树的高度，最坏情况 O(n)。',
    ['序列:'+order.join(''),'时间O(n+e)','空间O(n)']));

    return steps;
  }

  /* ===== 场景二：显式栈非递归 DFS ===== */
  function buildSceneIter() {
    var steps = [];
    var visited = [0,0,0,0,0,0];
    var order = [];
    var stk = [];
    var stV = {}, stE = {};

    function snap(note, stats) {
      var sv = {}, se = {}, i, k;
      for (i=0;i<N;i++) sv[i]=stV[i]||'idle';
      for (k in stE) se[k]=stE[k];
      return {visited:visited.slice(),order:order.slice(),stk:stk.slice(),
              stV:sv,stE:se,note:note||null,stats:stats||{}};
    }
    function mkstep(f,line,narr,act) {
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph(c.stage,f.stV,f.stE);
        drawStack(c.stage,f.stk);
        drawArrays(c.stage,f.visited,f.order);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:320,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      '思路':'显式栈代替递归栈','初始':'压入起点A',
      '循环条件':'栈非空','顶点数':N
    }),0,'显式栈版：把起点压栈，每次弹出顶部顶点访问，再把未访问邻居逆序压栈，效果与递归版一致。',
    ['起点A压栈','弹出即访问','邻居逆序压栈']));

    stk.push(0); stV[0]='active';
    steps.push(mkstep(snap('压入起点 A(0)',{
      '操作':'Push(A)','栈内':'A','visited[A]':0,'说明':'尚未标记，入栈即可'
    }),1,'将起点 A 压入栈。注意：此时还未标记 visited，弹出时才标记，避免重复访问。',
    ['Push(A)','栈:{A}','弹出时再标记']));

    while (stk.length) {
      var u = stk.pop();
      if (visited[u]) continue;
      visited[u]=1; stV[u]='done'; order.push(VNAME[u]);
      steps.push(mkstep(snap('弹出 '+VNAME[u]+' 并访问，visited['+u+']=1',{
        '弹出':VNAME[u],'已访问':order.length+'/'+N,
        '访问序列':order.join(''),'栈内':stk.length+'个'
      }),2,'弹出栈顶 '+VNAME[u]+'，标记 visited['+u+']=1，输出到序列。接着把未访问邻居逆序压栈。',
      ['Pop→'+VNAME[u],'visited['+u+']=1','序列:'+order.join('')]));

      var nbrs = ADJ[u].slice().reverse(), j, v;
      for (j=0;j<nbrs.length;j++) {
        v=nbrs[j];
        if (!visited[v]) {
          stk.push(v); stV[v]='active';
          stE[u+'-'+v]='hot';
          var st3={}; st3['操作']='Push('+VNAME[v]+')'; st3['栈内']=stk.length+'个';
          st3['visited['+v+']']=0; st3['来自']=VNAME[u];
          steps.push(mkstep(snap('压入邻居 '+VNAME[v],st3),3,'邻居 '+VNAME[v]+' 未访问，压入栈。逆序压栈保证弹出顺序与邻接表顺序一致。',
          ['Push('+VNAME[v]+')','栈内'+stk.length+'个','与递归版顺序一致']));
        }
      }
    }
    steps.push(mkstep(snap('栈空，DFS 完成，序列: '+order.join(' '),{
      '访问序列':order.join(''),'时间':'O(n+e)',
      '空间':'O(n) 栈','与递归版':'结果相同'
    }),-1,'栈已空，DFS 结束。序列与递归版完全相同。栈中最多同时存放 O(n) 个顶点。',
    ['序列:'+order.join(''),'时间O(n+e)','栈空间O(n)']));

    return steps;
  }

  /* ===== 场景三：非连通图 DFS ===== */
  /* 两连通分量：A-B-C 和 D-E-F，无跨组边 */
  var N2 = 6;
  var VNAME2 = ['A','B','C','D','E','F'];
  var EDGES2 = [[0,1],[1,2],[3,4],[4,5]];
  var VX2 = [80,200,320, 80,200,320];
  var VY2 = [160,160,160, 250,250,250];

  function makeAdj2() {
    var i,e,adj=[];
    for(i=0;i<N2;i++) adj.push([]);
    for(e=0;e<EDGES2.length;e++) {
      adj[EDGES2[e][0]].push(EDGES2[e][1]);
      adj[EDGES2[e][1]].push(EDGES2[e][0]);
    }
    return adj;
  }
  var ADJ2 = makeAdj2();

  function drawGraph2(g, stV2, stE2) {
    var e,ef,et,ekey,x1,y1,x2,y2,dx,dy,len,ex1,ey1,ex2,ey2;
    stV2=stV2||{}; stE2=stE2||{};
    for(e=0;e<EDGES2.length;e++){
      ef=EDGES2[e][0]; et=EDGES2[e][1];
      ekey=ef+'-'+et;
      x1=VX2[ef]; y1=VY2[ef]; x2=VX2[et]; y2=VY2[et];
      dx=x2-x1; dy=y2-y1; len=Math.sqrt(dx*dx+dy*dy)||1;
      ex1=x1+dx/len*R; ey1=y1+dy/len*R;
      ex2=x2-dx/len*(R+4); ey2=y2-dy/len*(R+4);
      D.link(g,{x1:ex1,y1:ey1,x2:ex2,y2:ey2,kind:stE2[ekey]?'hot':'mute'});
      D.link(g,{x1:ex2,y1:ey2,x2:ex1,y2:ey1,kind:stE2[et+'-'+ef]?'hot':'mute'});
    }
    for(var i=0;i<N2;i++){
      D.circleNode(g,{x:VX2[i],y:VY2[i],r:R,
        state:(stV2[i])||'idle',value:VNAME2[i]});
    }
  }

  function buildSceneDisconn() {
    var steps = [];
    var visited = [0,0,0,0,0,0];
    var order = [];
    var stV2 = {}, stE2 = {};
    var comp = 0;

    function snap(note, stats) {
      var sv={},se={},i,k;
      for(i=0;i<N2;i++) sv[i]=stV2[i]||'idle';
      for(k in stE2) se[k]=stE2[k];
      return {visited:visited.slice(),order:order.slice(),
              stV2:sv,stE2:se,note:note||null,stats:stats||{}};
    }
    function mkstep(f,line,narr,act){
      return {line:line,narr:narr,act:act,run:function(c){
        D.clear(c.stage);
        drawGraph2(c.stage,f.stV2,f.stE2);
        drawArrays(c.stage,f.visited,f.order);
        if(f.note) c.stage.appendChild(D.text(f.note,
          {x:490,y:320,'class':'vz-info',fill:'#ffd166','text-anchor':'start'}));
        c.stats=f.stats;
      }};
    }

    steps.push(mkstep(snap(null,{
      '图类型':'非连通无向图','连通分量':2,
      '第1分量':'A-B-C','第2分量':'D-E-F'
    }),0,'非连通图一次 DFS 只能访问到起点所在分量。需外层 for 循环，对每个未访问顶点各启动一次 DFS 才能全覆盖。',
    ['非连通图需外层循环','每分量各启动一次','遍历所有顶点']));

    function dfs2(u) {
      visited[u]=1; stV2[u]='active'; order.push(VNAME2[u]);
      steps.push(mkstep(snap('访问 '+VNAME2[u],{
        '连通分量':comp,'当前':VNAME2[u],
        '已访问':order.length+'/'+N2,'序列':order.join('')
      }),3,'DFS('+VNAME2[u]+')：访问并标记。',
      ['访问'+VNAME2[u],'分量'+comp,'序列:'+order.join('')]));
      var j,v;
      for(j=0;j<ADJ2[u].length;j++){
        v=ADJ2[u][j];
        if(!visited[v]){
          stE2[u+'-'+v]='hot'; stE2[v+'-'+u]='hot';
          dfs2(v);
        }
      }
      stV2[u]='done';
    }

    var i;
    for(i=0;i<N2;i++){
      if(!visited[i]){
        comp++;
        var st4={}; st4['外层i']=i; st4['顶点']=VNAME2[i];
        st4['visited['+i+']']=0; st4['启动第']=comp+'次DFS';
        steps.push(mkstep(snap('外层循环i='+i+'：顶点'+VNAME2[i]+'未访问，启动第'+comp+'次DFS',st4),1,'外层循环发现顶点 '+VNAME2[i]+' 未被访问，启动第 '+comp+' 次 DFS，探索新连通分量。',
        ['外层i='+i,'第'+comp+'次DFS','新连通分量']));
        dfs2(i);
      }
    }

    steps.push(mkstep(snap('全图遍历完成，发现 '+comp+' 个连通分量',{
      '访问序列':order.join(''),'连通分量数':comp,
      '时间':'O(n+e)','保证':'外层循环全覆盖'
    }),-1,'全图遍历完成，共 '+comp+' 个连通分量。外层循环确保每个顶点都被访问到，时间仍是 O(n+e)。',
    ['序列:'+order.join(''),'分量数:'+comp,'时间O(n+e)']));

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['graph-dfs'] = {
    title: '深度优先搜索 DFS',
    subtitle: 'DFS 沿出边一路深入，visited[] 防止回路死循环；回溯时才处理兄弟节点。时间 O(n+e)，递归深度 O(树高)。',
    height: 700,
    code: [
      '// visited[] 防止重复，图有回路',
      'void DFS(G, u) {',
      '    visited[u] = 1; visit(u);',
      '    for each v in Adj[u]:',
      '        if (!visited[v]) DFS(G, v);',
      '}',
      '// 非连通图外层循环：for(i=0..n-1) if(!visited[i]) DFS(i)'
    ],
    scenes: [
      { name: '递归DFS', build: buildSceneRec,
        codeTag: '递归+visited',
        code: [
          'void DFS(G, u) {',
          '    visited[u] = 1; visit(u);',
          '    for each v in Adj[u]:',
          '        if (!visited[v])',
          '            DFS(G, v);',
          '}'
        ]
      },
      { name: '非递归DFS', build: buildSceneIter,
        codeTag: '显式栈',
        code: [
          'void DFSIter(G, s) {',
          '    Push(S, s);',
          '    while (!Empty(S)) {',
          '        u = Pop(S);',
          '        if (visited[u]) continue;',
          '        visited[u]=1; visit(u);',
          '        逆序压入未访问邻居;',
          '    }',
          '}'
        ]
      },
      { name: '非连通图', build: buildSceneDisconn,
        codeTag: '外层循环',
        code: [
          'void DFSTraverse(G) {',
          '    for (i=0; i<n; i++)',
          '        if (!visited[i])',
          '            DFS(G, i);',
          '}'
        ]
      }
    ]
  };
})();