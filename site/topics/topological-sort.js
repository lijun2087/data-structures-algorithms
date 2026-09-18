/* 拓扑排序 — 第7章
 * 场景一：AOV 网、有向无环图的必要性，什么是拓扑序
 * 场景二：入度为 0 入栈/队，输出后把邻居入度减 1，降到 0 就入栈
 * 场景三：若输出顶点数 < n，说明有环——这是判环的标准手段
 *
 * 与 critical-path.js 共用同一个 AOE 有向带权图，顶点 v0..v5。
 * 布局：顶点在左半 x∈[60,430] y∈[140,310]。
 */
(function () {
  'use strict';
  var D = window.VizDraw;

  /* AOV/AOE 网顶点 v0..v5
   *   v0 → v1(6), v0 → v2(4), v0 → v3(5)
   *   v1 → v4(1)
   *   v2 → v4(1)
   *   v3 → v5(2)
   *   v4 → v5(8)  (v4→v5 是关键活动之一)
   * 入度：v0=0, v1=1, v2=1, v3=1, v4=2, v5=2
   */
  var VX = [80,  220, 220, 80,  360, 360];
  var VY = [225, 160, 290, 160, 225, 290];
  var R  = 20;
  var VNAMES = ['v0','v1','v2','v3','v4','v5'];
  var N = 6;

  /* 有向边 (u,v,w) — 权重供 critical-path 用，拓扑排序只看有无边 */
  var EDGES = [
    {u:0,v:1,w:6}, {u:0,v:2,w:4}, {u:0,v:3,w:5},
    {u:1,v:4,w:1}, {u:2,v:4,w:1},
    {u:3,v:5,w:2}, {u:4,v:5,w:8}
  ];
  /* 邻接表 */
  var ADJ = [];
  var i;
  for (i=0;i<N;i++) ADJ.push([]);
  for (i=0;i<EDGES.length;i++) ADJ[EDGES[i].u].push(EDGES[i].v);

  /* ---- 绘图辅助 ---- */
  function drawGraph(g, stV, hotEdge, inDeg) {
    var j, e;
    for (j=0;j<EDGES.length;j++) {
      e = EDGES[j];
      var hh = hotEdge && hotEdge[0]===e.u && hotEdge[1]===e.v;
      /* 偏移：v0→v1 和 v0→v3 y 坐标不同不需偏移，但 v3→v5 和 v4→v5 需要错开 */
      var ox = 0, oy = 0;
      if (e.u===3 && e.v===5) { ox = -8; }
      if (e.u===4 && e.v===5) { ox =  8; }
      D.link(g,{x1:VX[e.u]+ox,y1:VY[e.u]+oy,x2:VX[e.v]+ox,y2:VY[e.v]+oy,
        kind:hh?'hot':'mute',arrow:true,width:hh?2.8:1.8});
    }
    for (j=0;j<N;j++) {
      D.circleNode(g,{x:VX[j],y:VY[j],r:R,
        state:stV&&stV[j]?stV[j]:'idle',value:VNAMES[j]});
      if (inDeg) {
        g.appendChild(D.text('入度'+inDeg[j],
          {x:VX[j],y:VY[j]+R+16,'class':'vz-idx',fill:'#8ea3c9'}));
      }
    }
  }

  /* 入度数组 */
  function initInDeg() {
    var d = [];
    for (var ii=0;ii<N;ii++) d.push(0);
    for (var jj=0;jj<EDGES.length;jj++) d[EDGES[jj].v]++;
    return d;
  }

  function step(f, line, narr, act) {
    return { line:line, narr:narr, act:act,
             run: function(c) {
               D.clear(c.stage);
               var stV = f.stV || {};
               var inDeg = f.showDeg ? f.inDeg : null;
               drawGraph(c.stage, stV, f.hotEdge, inDeg);
               /* 右半：栈/队列 + 已输出序列 */
               var TX = 490, TY = 148;
               c.stage.appendChild(D.text('栈（top→）',
                 {x:TX+10,y:TY-8,'class':'vz-tag','text-anchor':'start'}));
               var stk = f.stk || [];
               for (var si=0; si<stk.length && si<6; si++) {
                 var sx = TX + si*52;
                 c.stage.appendChild(D.el('rect',{x:sx,y:TY,width:48,height:28,rx:4,
                   fill:D.C[si===stk.length-1?'hot':'active'].fill,
                   stroke:D.C[si===stk.length-1?'hot':'active'].stroke,'stroke-width':1.5}));
                 c.stage.appendChild(D.text(stk[stk.length-1-si],
                   {x:sx+24,y:TY+19,'class':'vz-idx',fill:'#ffd166'}));
               }
               if (!stk.length) {
                 c.stage.appendChild(D.text('（空）',
                   {x:TX+40,y:TY+19,'class':'vz-idx',fill:'#4a5c82'}));
               }
               c.stage.appendChild(D.text('拓扑序列',
                 {x:TX+10,y:TY+52,'class':'vz-tag','text-anchor':'start'}));
               var out = f.out || [];
               for (var oi=0; oi<out.length && oi<6; oi++) {
                 var ox2 = TX + oi*52;
                 c.stage.appendChild(D.el('rect',{x:ox2,y:TY+60,width:48,height:28,rx:4,
                   fill:D.C.done.fill,stroke:D.C.done.stroke,'stroke-width':1.5}));
                 c.stage.appendChild(D.text(out[oi],
                   {x:ox2+24,y:TY+79,'class':'vz-idx',fill:'#2ecc71'}));
               }
               /* 入度表 */
               c.stage.appendChild(D.text('入度',
                 {x:TX+10,y:TY+118,'class':'vz-tag','text-anchor':'start'}));
               var id = f.inDeg || [];
               for (var ii2=0; ii2<N && ii2<6; ii2++) {
                 var ix = TX + ii2*52;
                 c.stage.appendChild(D.el('rect',{x:ix,y:TY+126,width:48,height:26,rx:3,
                   fill:D.C[id[ii2]===0&&!(f.stV&&f.stV[ii2]==='done')?'good':'idle'].fill,
                   stroke:D.C[id[ii2]===0&&!(f.stV&&f.stV[ii2]==='done')?'good':'idle'].stroke,
                   'stroke-width':1.2}));
                 c.stage.appendChild(D.text(VNAMES[ii2]+':'+id[ii2],
                   {x:ix+24,y:TY+143,'class':'vz-idx',fill:'#dfe8ff'}));
               }
               var notes = f.notes || [];
               for (var ni=0;ni<notes.length&&ni<2;ni++) {
                 c.stage.appendChild(D.text(notes[ni],{x:TX,y:TY+168+ni*22,'class':'vz-info','text-anchor':'start'}));
               }
               c.stats = f.stats || {};
             } };
  }

  /* ======== 场景一：AOV 网与拓扑序概念 ======== */
  function buildWhy() {
    var steps = [];
    var inDeg = initInDeg();
    steps.push({ line:0, narr:'AOV 网是顶点表示活动、有向边表示先决条件的有向无环图（DAG）。拓扑序是把所有顶点排成一行，使每条边的起点排在终点之前。',
      act:['AOV 网：顶点=活动','有向边=先后依赖','有向无环图 DAG'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage, {}, null, null);
        c.stage.appendChild(D.text('AOV 网：顶点代表活动，有向边代表先决条件',
          {x:490,y:160,'class':'vz-info','text-anchor':'start'}));
        c.stage.appendChild(D.text('例：v1 必须在 v4 之前完成（v1→v4）',
          {x:490,y:182,'class':'vz-info','text-anchor':'start'}));
        c.stats = {'图类型':'有向无环图 DAG','顶点':'活动','有向边':'先决关系','目标':'求拓扑序'};
      }
    });
    steps.push({ line:1, narr:'拓扑排序的核心思路：每次从入度为 0 的顶点开始输出（它没有先决条件），输出后把它的后继入度减 1，继续找下一个入度为 0 的顶点。',
      act:['入度 0：无先决条件可输出','输出后邻居入度−1','反复直到无顶点可输出'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage, {0:'hot'}, null, inDeg);
        c.stage.appendChild(D.text('v0 入度=0，可以最先输出',
          {x:490,y:160,'class':'vz-info','text-anchor':'start'}));
        c.stage.appendChild(D.text('输出后 v1,v2,v3 入度各减 1',
          {x:490,y:182,'class':'vz-info','text-anchor':'start'}));
        c.stats = {'v0入度':0,'v1入度':1,'v4入度':2,'v5入度':2};
      }
    });
    steps.push({ line:2, narr:'若最终输出的顶点数等于 n，说明图是 DAG，拓扑序合法。若输出数 < n，说明图中有环——环上每个顶点的入度永远降不到 0。',
      act:['输出数=n：图无环','输出数<n：图有环','判环标准手段'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage, {}, null, null);
        c.stage.appendChild(D.text('判环：输出顶点数 < n → 有环',
          {x:490,y:160,'class':'vz-info','text-anchor':'start'}));
        c.stage.appendChild(D.text('有环时环上入度永远 ≥ 1，无法输出',
          {x:490,y:182,'class':'vz-info','text-anchor':'start'}));
        c.stats = {'判环条件':'输出数<n','原因':'环上入度≥1','拓扑序':'非唯一','复杂度':'O(n+e)'};
      }
    });
    return steps;
  }

  /* ======== 场景二：Kahn 算法逐步演示 ======== */
  function buildKahn() {
    var steps = [];
    var inDeg = initInDeg();
    var stk = [], out = [], stV = {};
    var i;
    for (i=0;i<N;i++) stV[i]='idle';

    function snap(line, narr, act, stkCopy, outCopy, stVCopy, inDCopy, hotEdge, notes, stats) {
      var fs = stkCopy.slice(), fo = outCopy.slice();
      var fst = {}; for (var k in stVCopy) fst[k]=stVCopy[k];
      var fid = inDCopy.slice();
      var fn = notes||[]; var fhe = hotEdge||null;
      return { line:line, narr:narr, act:act,
        run: function(c) {
          D.clear(c.stage);
          drawGraph(c.stage, fst, fhe, fid);
          var TX=490, TY=148;
          c.stage.appendChild(D.text('栈（top→）',
            {x:TX+10,y:TY-8,'class':'vz-tag','text-anchor':'start'}));
          for (var si=0;si<fs.length&&si<6;si++) {
            var sx=TX+si*52;
            c.stage.appendChild(D.el('rect',{x:sx,y:TY,width:48,height:28,rx:4,
              fill:D.C[si===fs.length-1?'hot':'active'].fill,
              stroke:D.C[si===fs.length-1?'hot':'active'].stroke,'stroke-width':1.5}));
            c.stage.appendChild(D.text(fs[fs.length-1-si],
              {x:sx+24,y:TY+19,'class':'vz-idx',fill:'#ffd166'}));
          }
          if (!fs.length) {
            c.stage.appendChild(D.text('（空）',
              {x:TX+40,y:TY+19,'class':'vz-idx',fill:'#4a5c82'}));
          }
          c.stage.appendChild(D.text('拓扑序列',
            {x:TX+10,y:TY+52,'class':'vz-tag','text-anchor':'start'}));
          for (var oi=0;oi<fo.length&&oi<6;oi++) {
            var ox2=TX+oi*52;
            c.stage.appendChild(D.el('rect',{x:ox2,y:TY+60,width:48,height:28,rx:4,
              fill:D.C.done.fill,stroke:D.C.done.stroke,'stroke-width':1.5}));
            c.stage.appendChild(D.text(fo[oi],
              {x:ox2+24,y:TY+79,'class':'vz-idx',fill:'#2ecc71'}));
          }
          c.stage.appendChild(D.text('入度',
            {x:TX+10,y:TY+118,'class':'vz-tag','text-anchor':'start'}));
          for (var ii2=0;ii2<N&&ii2<6;ii2++) {
            var ix=TX+ii2*52;
            c.stage.appendChild(D.el('rect',{x:ix,y:TY+126,width:48,height:26,rx:3,
              fill:D.C[fid[ii2]===0&&!(fst[ii2]==='done')?'good':'idle'].fill,
              stroke:D.C[fid[ii2]===0&&!(fst[ii2]==='done')?'good':'idle'].stroke,
              'stroke-width':1.2}));
            c.stage.appendChild(D.text(VNAMES[ii2]+':'+fid[ii2],
              {x:ix+24,y:TY+143,'class':'vz-idx',fill:'#dfe8ff'}));
          }
          for (var ni=0;ni<fn.length&&ni<2;ni++) {
            c.stage.appendChild(D.text(fn[ni],{x:TX,y:TY+168+ni*22,'class':'vz-info','text-anchor':'start'}));
          }
          c.stats = stats||{};
        }
      };
    }

    /* 初始化：入度 0 的顶点入栈 */
    steps.push(snap(0,'初始化：扫描所有顶点，入度为 0 的顶点压栈。本图中只有 v0 入度=0。',
      ['扫描入度','v0 入度=0 入栈','其余入度>0 等待'],
      [],[],stV,inDeg.slice(),null,[],
      {'初始栈':'v0','待处理':N,'已输出':0,'说明':'入度0即无先决条件'}));
    stk.push(VNAMES[0]); stV[0]='hot';
    steps.push(snap(1,'v0 入栈，栈顶是 v0。',
      ['v0 入栈','栈：[v0]','等待弹出输出'],
      stk.slice(),[],stV,inDeg.slice(),null,[],
      {'栈顶':'v0','栈大小':1,'已输出':0,'入度0顶点':'仅v0'}));

    /* 弹出 v0 */
    stk.pop(); out.push(VNAMES[0]); stV[0]='done';
    var adj0 = ADJ[0].slice();
    inDeg[1]--; inDeg[2]--; inDeg[3]--;
    steps.push(snap(2,'弹出 v0，输出到序列。然后把 v0 的所有邻居（v1,v2,v3）入度各减 1。v1,v2,v3 入度降为 0，全部压栈。',
      ['弹出 v0，输出','v1,v2,v3 入度−1','三者入度变0，入栈'],
      stk.slice(),out.slice(),stV,inDeg.slice(),[0,1],['v0 输出；v1/v2/v3 入度→0'],
      {'已输出':'v0','新入栈':'v1,v2,v3','栈大小':3,'输出数':1}));
    stk.push(VNAMES[1]); stk.push(VNAMES[2]); stk.push(VNAMES[3]);
    stV[1]='active'; stV[2]='active'; stV[3]='active';
    steps.push(snap(2,'v1,v2,v3 依次压栈。栈顶是 v3（后进先出）。',
      ['v1,v2,v3 入栈','栈顶 v3','后进先出'],
      stk.slice(),out.slice(),stV,inDeg.slice(),null,[],
      {'栈':'v1 v2 v3','栈顶':'v3','已输出':'v0','入度0':'v1,v2,v3'}));

    /* 弹出 v3 */
    stk.pop(); out.push(VNAMES[3]); stV[3]='done';
    inDeg[5]--;
    steps.push(snap(2,'弹出 v3，输出。v3 的邻居 v5 入度减 1（4→3→2，v3 贡献 1，v5 入度变 1）。v5 入度仍 >0，不入栈。',
      ['弹出 v3，输出','v5 入度−1','v5 入度=1，不入栈'],
      stk.slice(),out.slice(),stV,inDeg.slice(),[3,5],[],
      {'已输出':'v0 v3','v5入度':inDeg[5],'栈':'v1 v2','下一个':'v2（栈顶）'}));

    /* 弹出 v2 */
    stk.pop(); out.push(VNAMES[2]); stV[2]='done';
    inDeg[4]--;
    steps.push(snap(2,'弹出 v2，输出。v2 的邻居 v4 入度减 1（2→1）。v4 入度仍 1，不入栈。',
      ['弹出 v2，输出','v4 入度2→1','v4 还需等 v1'],
      stk.slice(),out.slice(),stV,inDeg.slice(),[2,4],[],
      {'已输出':'v0 v3 v2','v4入度':inDeg[4],'v4需等':'v1','栈':'仅v1'}));

    /* 弹出 v1 */
    stk.pop(); out.push(VNAMES[1]); stV[1]='done';
    inDeg[4]--;
    steps.push(snap(2,'弹出 v1，输出。v1 的邻居 v4 入度减 1（1→0）。v4 入度降为 0，压栈。',
      ['弹出 v1，输出','v4 入度1→0','v4 入栈'],
      stk.slice(),out.slice(),stV,inDeg.slice(),[1,4],['v4 入度降为 0，入栈'],
      {'已输出':'v0 v3 v2 v1','v4入度':0,'v4入栈':'是','输出数':4}));
    stk.push(VNAMES[4]); stV[4]='hot';

    /* 弹出 v4 */
    stk.pop(); out.push(VNAMES[4]); stV[4]='done';
    inDeg[5]--;
    steps.push(snap(2,'弹出 v4，输出。v4→v5 入度减 1（1→0），v5 入栈。',
      ['弹出 v4，输出','v5 入度1→0','v5 入栈'],
      stk.slice(),out.slice(),stV,inDeg.slice(),[4,5],['v5 入度降为 0'],
      {'已输出':'v0 v3 v2 v1 v4','v5入度':0,'v5入栈':'是','剩余':1}));
    stk.push(VNAMES[5]); stV[5]='hot';

    /* 弹出 v5 */
    stk.pop(); out.push(VNAMES[5]); stV[5]='done';
    steps.push(snap(-1,'弹出 v5，输出。栈空，算法结束。输出数=6=n，图无环，拓扑序合法。',
      ['v5 输出','栈空，算法结束','输出数=n，无环'],
      stk.slice(),out.slice(),stV,inDeg.slice(),null,['拓扑序：v0 v3 v2 v1 v4 v5'],
      {'拓扑序':'v0 v3 v2 v1 v4 v5','输出数':6,'顶点数':6,'结论':'图无环'}));

    return steps;
  }

  /* ======== 场景三：有环图——输出数 < n 判环 ======== */
  function buildCycle() {
    var steps = [];
    /* 在原图基础上添加 v5→v1 形成环 v1→v4→v5→v1 */
    var cycEdges = EDGES.concat([{u:5,v:1,w:0}]);
    var i;
    var cycInDeg = [];
    for (i=0;i<N;i++) cycInDeg.push(0);
    for (i=0;i<cycEdges.length;i++) cycInDeg[cycEdges[i].v]++;

    function drawCycGraph(g, stV2, hotEdge) {
      var j, e;
      for (j=0;j<cycEdges.length;j++) {
        e = cycEdges[j];
        var hh = hotEdge && hotEdge[0]===e.u && hotEdge[1]===e.v;
        var isCyc = (e.u===5 && e.v===1);
        var ox3=0;
        if (e.u===3 && e.v===5) ox3=-8;
        if (e.u===4 && e.v===5) ox3= 8;
        D.link(g,{x1:VX[e.u]+ox3,y1:VY[e.u],x2:VX[e.v]+ox3,y2:VY[e.v],
          kind:hh?'hot':(isCyc?'bad':'mute'),arrow:true,width:hh?2.8:1.8});
      }
      for (j=0;j<N;j++) {
        D.circleNode(g,{x:VX[j],y:VY[j],r:R,
          state:stV2&&stV2[j]?stV2[j]:'idle',value:VNAMES[j]});
        g.appendChild(D.text('入度'+cycInDeg[j],
          {x:VX[j],y:VY[j]+R+16,'class':'vz-idx',fill:'#8ea3c9'}));
      }
    }

    steps.push({ line:0, narr:'添加 v5→v1 后，图中出现环 v1→v4→v5→v1。v5 入度变为 2，v1 入度变为 2。现在只有 v0 入度为 0。',
      act:['加边 v5→v1 形成环','v1 入度变2','只有 v0 可以输出'],
      run: function(c) {
        D.clear(c.stage);
        drawCycGraph(c.stage, {}, null);
        c.stage.appendChild(D.text('红色边 v5→v1 造成环 v1→v4→v5→v1',
          {x:490,y:160,'class':'vz-info','text-anchor':'start'}));
        c.stats = {'v0入度':0,'v1入度':2,'v4入度':2,'v5入度':2};
      }
    });
    steps.push({ line:2, narr:'Kahn 算法：v0 输出后 v2,v3 入度降为 0 可入栈，v1 入度仍为 1（等待 v5），v4 等 v1，v5 等 v4——形成循环等待，三者永远无法出栈。',
      act:['v0 输出','v1 入度=1，等 v5','v1 v4 v5 循环等待'],
      run: function(c) {
        D.clear(c.stage);
        drawCycGraph(c.stage, {0:'done',2:'done',3:'done',1:'bad',4:'bad',5:'bad'}, null);
        c.stage.appendChild(D.text('v1,v4,v5 相互等待，入度永远无法降为 0',
          {x:490,y:160,'class':'vz-info','text-anchor':'start'}));
        c.stats = {'已输出':'v0 v3 v2','v1入度':1,'v4入度':1,'v5入度':1};
      }
    });
    steps.push({ line:5, narr:'算法结束，输出数=3 < n=6。判环结论：图有环。环上顶点 v1,v4,v5 入度始终大于 0，永远无法被输出。',
      act:['输出数3 < 总数6','v1 v4 v5 在环上','结论：图有环'],
      run: function(c) {
        D.clear(c.stage);
        drawCycGraph(c.stage, {0:'done',2:'done',3:'done',1:'bad',4:'bad',5:'bad'}, null);
        c.stage.appendChild(D.text('count(3) < n(6)  →  图有环！',
          {x:490,y:160,'class':'vz-info','text-anchor':'start'}));
        c.stage.appendChild(D.text('拓扑排序判环：O(n+e)，无需 DFS',
          {x:490,y:182,'class':'vz-info','text-anchor':'start'}));
        c.stats = {'判断':'有环','输出数':3,'总顶点':6,'时间':'O(n+e)'};
      }
    });
    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['topological-sort'] = {
    title: '拓扑排序 Topological Sort',
    subtitle: '入度为 0 的顶点入栈/队，输出后邻居入度减 1；输出数 < n 说明有环。时间 O(n+e)。',
    height: 700,
    code: [
      '初始化: 计算所有顶点入度',
      'for i=0 to n-1: if 入度[i]==0 then Push(S,i)',
      'while S 非空:',
      '    u = Pop(S); 输出 u; count++',
      '    for v ∈ adj(u): 入度[v]--; if 入度[v]==0 then Push(S,v)',
      'if count < n: 图有环'
    ],
    scenes: [
      { name: 'AOV 网与拓扑序概念', build: buildWhy,
        code: [
          '// AOV 网：顶点=活动，有向边=先决条件',
          '// 拓扑序：排列顶点使每条边起点在终点之前',
          '// 有向无环图 DAG 才存在拓扑序',
          '// 入度=0：无先决条件，可直接输出',
          '// 拓扑序不唯一（多个顶点入度同时为0时）',
          '// 输出数=n 验证图无环'
        ]
      },
      { name: 'Kahn 算法逐步演示', build: buildKahn,
        code: [
          '初始化: 计算所有顶点入度',
          'for i=0 to n-1: if 入度[i]==0 then Push(S,i)',
          'while S 非空:',
          '    u = Pop(S); 输出 u; count++',
          '    for v ∈ adj(u): 入度[v]--; if 入度[v]==0 then Push(S,v)',
          'if count < n: 图有环'
        ]
      },
      { name: '有环图判环演示', build: buildCycle,
        code: [
          '// 添加 v5→v1 形成环',
          '// Kahn 算法正常运行，只输出入度能降到0的顶点',
          '// 环上顶点互相等待，入度永远>0',
          '// count=3 < n=6',
          'if count < n: 图有环',
          '// 时间 O(n+e)，比 DFS 判环更直观'
        ]
      }
    ]
  };
})();
