/* 关键路径 — 第7章
 * 场景一：AOE 网概念，ve/vl/e/l 四个量的定义
 * 场景二：正向（拓扑序）计算 ve（最早发生时间）
 * 场景三：逆向（逆拓扑序）计算 vl（最迟发生时间），找出 e==l 的关键活动
 *
 * AOE 网：v0..v5，与 topological-sort.js 共用同一张图
 * v0→v1(6), v0→v2(4), v0→v3(5)
 * v1→v4(1), v2→v4(1), v3→v5(2), v4→v5(8)
 * 关键路径：v0→v1→v4→v5，总时间=15
 */
(function () {
  'use strict';
  var D = window.VizDraw;

  var VX = [80,  220, 220, 80,  360, 360];
  var VY = [225, 160, 290, 160, 225, 290];
  var R  = 20;
  var VNAMES = ['v0','v1','v2','v3','v4','v5'];
  var N = 6;

  var EDGES = [
    {u:0,v:1,w:6}, {u:0,v:2,w:4}, {u:0,v:3,w:5},
    {u:1,v:4,w:1}, {u:2,v:4,w:1},
    {u:3,v:5,w:2}, {u:4,v:5,w:8}
  ];

  function drawGraph(g, stV, hotEdges, ve, vl) {
    var j, e;
    for (j=0;j<EDGES.length;j++) {
      e = EDGES[j];
      var isCrit = ve && vl && (ve[e.u]+e.w === vl[e.v]);
      var ox=0;
      if (e.u===3 && e.v===5) ox=-8;
      if (e.u===4 && e.v===5) ox= 8;
      var hh = false;
      if (hotEdges) {
        for (var hi=0;hi<hotEdges.length;hi++) {
          if (hotEdges[hi][0]===e.u && hotEdges[hi][1]===e.v) { hh=true; break; }
        }
      }
      D.link(g,{x1:VX[e.u]+ox,y1:VY[e.u],x2:VX[e.v]+ox,y2:VY[e.v],
        kind:hh?'hot':(isCrit?'active':'mute'),arrow:true,
        width:hh?2.8:(isCrit?2.4:1.8)});
      var mx=(VX[e.u]+VX[e.v])/2+ox+8, my=(VY[e.u]+VY[e.v])/2-6;
      g.appendChild(D.text(e.w,{x:mx,y:my,'class':'vz-idx',
        fill:hh?'#ffd166':(isCrit?'#2ecc71':'#8ea3c9')}));
    }
    for (j=0;j<N;j++) {
      D.circleNode(g,{x:VX[j],y:VY[j],r:R,
        state:stV&&stV[j]?stV[j]:'idle',value:VNAMES[j]});
    }
  }

  /* 绘制 ve/vl 对照表 */
  function drawTable(g, ve, vl, hiRow) {
    var TX=490, TY=148, TW=62, TH=28, TG=4;
    var labels=['顶点','ve','vl'];
    var i;
    for (i=0;i<labels.length;i++) {
      g.appendChild(D.text(labels[i],
        {x:TX-34,y:TY+i*(TH+TG)+20,'class':'vz-tag'}));
    }
    for (i=0;i<N;i++) {
      var cx=TX+i*(TW+TG);
      var isCur=(i===hiRow);
      var c0=D.C[isCur?'hot':'idle'];
      g.appendChild(D.el('rect',{x:cx,y:TY,width:TW,height:TH,rx:4,
        fill:c0.fill,stroke:c0.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(VNAMES[i],{x:cx+TW/2,y:TY+19,'class':'vz-idx',fill:'#dfe8ff'}));
      /* ve 行 */
      var veStr = ve&&ve[i]!==undefined ? String(ve[i]) : '?';
      var c1=D.C[ve&&ve[i]!==undefined?(isCur?'hot':'done'):'mute'];
      g.appendChild(D.el('rect',{x:cx,y:TY+TH+TG,width:TW,height:TH,rx:4,
        fill:c1.fill,stroke:c1.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(veStr,{x:cx+TW/2,y:TY+TH+TG+19,'class':'vz-idx',fill:'#ffd166'}));
      /* vl 行 */
      var vlStr = vl&&vl[i]!==undefined ? String(vl[i]) : '?';
      var c2=D.C[vl&&vl[i]!==undefined?(isCur?'hot':'active'):'mute'];
      g.appendChild(D.el('rect',{x:cx,y:TY+2*(TH+TG),width:TW,height:TH,rx:4,
        fill:c2.fill,stroke:c2.stroke,'stroke-width':1.5}));
      g.appendChild(D.text(vlStr,{x:cx+TW/2,y:TY+2*(TH+TG)+19,'class':'vz-idx',fill:'#8ea3c9'}));
    }
  }

  function step(f, line, narr, act) {
    return { line:line, narr:narr, act:act,
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage, f.stV||{}, f.hotEdges||null, f.ve||null, f.vl||null);
        drawTable(c.stage, f.ve||null, f.vl||null, f.hiRow===-1?-1:(f.hiRow||0));
        var notes = f.notes||[];
        for (var ni=0;ni<notes.length&&ni<2;ni++) {
          c.stage.appendChild(D.text(notes[ni],
            {x:490,y:260+ni*22,'class':'vz-info','text-anchor':'start'}));
        }
        c.stats = f.stats||{};
      }
    };
  }

  /* ======== 场景一：AOE 网与四个量的定义 ======== */
  function buildConcept() {
    var steps = [];
    steps.push(step({stV:{},hiRow:-1,
      notes:['AOE 网：边=活动(权重=持续时间)，顶点=事件'],
      stats:{'网类型':'AOE 网','顶点':'事件','边':'活动','目标':'求关键路径'}},
      0, 'AOE 网中，顶点表示事件（某阶段完成），有向边表示活动，边权表示活动持续时间。关键路径是从源点到汇点的最长路径，决定整个工程的最短完成时间。',
      ['AOE：边=活动','顶点=事件','最长路=关键路径']));
    steps.push(step({stV:{0:'hot',5:'active'},hiRow:-1,
      notes:['ve[i]：事件 i 最早发生时间（从 v0 出发的最长路）','vl[i]：事件 i 最迟发生时间（不影响工期的最晚时刻）'],
      stats:{'ve':'最早发生时间','vl':'最迟发生时间','ve[v0]':0,'ve[v5]':15}},
      1, 've[i] 是从源点到顶点 i 的最长路（最早能到的时刻）。vl[i] 是在不影响总工期前提下，事件 i 最迟必须发生的时刻，从汇点倒推。',
      ['ve[i]：正向最长路','vl[i]：逆向倒推','总工期=ve[汇点]']));
    steps.push(step({stV:{},hiRow:-1,
      notes:['活动<u,v>的 e=ve[u]（最早开始）','活动<u,v>的 l=vl[v]-w（最迟开始）'],
      stats:{'e(活动)':'ve[u]','l(活动)':'vl[v]-w','关键活动':'e==l','时间余量':'l-e'}},
      2, '每条活动边 <u,v,w>：e=ve[u]（最早能开始的时刻），l=vl[v]-w（最迟不得迟于此开始）。e==l 时该活动无时间余量，是关键活动，所有关键活动串起来就是关键路径。',
      ['e=ve[u]：最早开始','l=vl[v]-w：最迟开始','e==l：关键活动']));
    return steps;
  }

  /* ======== 场景二：正向计算 ve ======== */
  function buildVe() {
    var steps = [];
    /* ve: 按拓扑序计算 v0→v3,v2,v1→v4→v5 */
    var ve = [undefined,undefined,undefined,undefined,undefined,undefined];
    var stV = {};

    steps.push(step({stV:{},ve:null,vl:null,hiRow:-1,
      notes:['按拓扑序从 v0 出发，逐步计算 ve'],
      stats:{'方法':'正向拓扑序','初始':'ve[v0]=0','规则':'ve[v]=max(ve[u]+w)','目标':'ve[v5]'}},
      0, '计算 ve：按拓扑序（源点 v0 开始）依次处理每个顶点。ve[v] = max{ve[u]+w(u,v)} for all (u,v) ∈ E。源点 ve[v0]=0。',
      ['按拓扑序处理','ve[v]=max前驱ve+w','源点ve=0']));

    ve[0]=0; stV[0]='done';
    steps.push(step({stV:{0:'done'},ve:ve.slice(),vl:null,hiRow:0,
      notes:['ve[v0]=0，源点最早时间为 0'],
      stats:{'ve[v0]':0,'含义':'工程从0时刻开始','下一步':'松弛v0的出边','拓扑序':'v0,...'}},
      1, 've[v0]=0，工程从 0 时刻开始。v0 的出边 v0→v1(6), v0→v2(4), v0→v3(5) 将更新邻居的 ve 值。',
      ['ve[v0]=0','v0→v1(6),v0→v2(4),v0→v3(5)','松弛三个邻居']));

    ve[1]=6; ve[2]=4; ve[3]=5; stV[1]='active'; stV[2]='active'; stV[3]='active';
    steps.push(step({stV:{0:'done',1:'active',2:'active',3:'active'},ve:ve.slice(),vl:null,hiRow:-1,
      notes:['ve[v1]=6,ve[v2]=4,ve[v3]=5','下一步计算 ve[v4]'],
      stats:{'ve[v1]':6,'ve[v2]':4,'ve[v3]':5,'来源':'v0的三条出边'}},
      1, 've[v1]=6（v0→v1，权 6），ve[v2]=4（v0→v2，权 4），ve[v3]=5（v0→v3，权 5）。接下来计算 ve[v4]。',
      ['ve[v1]=6','ve[v2]=4','ve[v3]=5']));

    ve[4]=7; stV[4]='active';
    steps.push(step({stV:{0:'done',1:'done',2:'done',3:'active',4:'active'},ve:ve.slice(),vl:null,hiRow:4,
      notes:['ve[v4]=max(ve[v1]+1, ve[v2]+1)=max(7,5)=7','v1→v4 是瓶颈'],
      stats:{'ve[v4]':'max(7,5)=7','v1→v4':'6+1=7','v2→v4':'4+1=5','取最大':'7'}},
      1, 've[v4]=max{ve[v1]+1, ve[v2]+1}=max{7,5}=7。v1→v4 这条路更长，是 v4 的制约路径。',
      ['ve[v4]=max(7,5)=7','v1路径更长','v2→v4只需5']));

    ve[5]=15; stV[5]='active';
    steps.push(step({stV:{0:'done',1:'done',2:'done',3:'done',4:'done',5:'done'},ve:ve.slice(),vl:null,hiRow:5,
      notes:['ve[v5]=max(ve[v3]+2, ve[v4]+8)=max(7,15)=15','总工期=15'],
      stats:{'ve[v5]':'max(7,15)=15','v3→v5':'5+2=7','v4→v5':'7+8=15','总工期':15}},
      1, 've[v5]=max{ve[v3]+2, ve[v4]+8}=max{7,15}=15。v4→v5 这条路决定总工期 15。ve 计算完毕。',
      ['ve[v5]=max(7,15)=15','总工期=15','由v4路径决定']));

    return steps;
  }

  /* ======== 场景三：逆向计算 vl + 关键路径 ======== */
  function buildVl() {
    var steps = [];
    var ve = [0,6,4,5,7,15];
    var vl = [undefined,undefined,undefined,undefined,undefined,undefined];
    var stV = {};

    steps.push(step({stV:{5:'hot'},ve:ve.slice(),vl:null,hiRow:5,
      notes:['vl[汇点]=ve[汇点]=15','从汇点逆向倒推'],
      stats:{'方法':'逆拓扑序倒推','初始':'vl[v5]=15','规则':'vl[u]=min(vl[v]-w)','目标':'找关键活动'}},
      0, '计算 vl：从汇点 v5 开始，vl[v5]=ve[v5]=15（汇点最迟等于最早，不可拖延）。按逆拓扑序倒推：vl[u]=min{vl[v]-w(u,v)}。',
      ['vl[v5]=15，汇点不拖延','逆拓扑序倒推','vl[u]=min后继vl-w']));

    vl[5]=15; stV[5]='done';
    vl[4]=7; stV[4]='active';
    steps.push(step({stV:{4:'active',5:'done'},ve:ve.slice(),vl:vl.slice(),hiRow:4,
      notes:['vl[v4]=vl[v5]-8=15-8=7','ve[v4]=7，时间余量=0'],
      stats:{'vl[v4]':7,'ve[v4]':7,'余量':'0 → 关键','推导':'15-8=7'}},
      1, 'vl[v4]=vl[v5]-w(v4,v5)=15-8=7。ve[v4]=7，vl[v4]=7，时间余量为 0，v4 是关键事件。',
      ['vl[v4]=15-8=7','ve[v4]=vl[v4]=7','v4 关键事件']));

    vl[3]=13; stV[3]='active';
    steps.push(step({stV:{3:'active',4:'active',5:'done'},ve:ve.slice(),vl:vl.slice(),hiRow:3,
      notes:['vl[v3]=vl[v5]-2=15-2=13','ve[v3]=5，余量=8，非关键'],
      stats:{'vl[v3]':13,'ve[v3]':5,'余量':8,'v3':'非关键事件'}},
      1, 'vl[v3]=vl[v5]-2=13。ve[v3]=5，余量=8，v3 有充足缓冲，不是关键事件。',
      ['vl[v3]=13','ve[v3]=5，余量=8','v3 非关键']));

    vl[2]=6; vl[1]=6; stV[2]='active'; stV[1]='active';
    steps.push(step({stV:{1:'active',2:'active',3:'active',4:'done',5:'done'},ve:ve.slice(),vl:vl.slice(),hiRow:1,
      notes:['vl[v1]=vl[v4]-1=7-1=6，ve[v1]=6，余量=0','vl[v2]=vl[v4]-1=6，ve[v2]=4，余量=2'],
      stats:{'vl[v1]':6,'ve[v1]':6,'vl[v2]':6,'ve[v2]':4}},
      1, 'vl[v1]=vl[v4]-1=6。ve[v1]=6，余量=0，v1 是关键事件。vl[v2]=vl[v4]-1=6。ve[v2]=4，余量=2，v2 非关键。',
      ['vl[v1]=6，余量0，关键','vl[v2]=6，余量2','v2 非关键事件']));

    vl[0]=0; stV[0]='active';
    steps.push(step({stV:{0:'active',1:'active',2:'active',3:'active',4:'done',5:'done'},
      ve:ve.slice(),vl:vl.slice(),hiRow:0,
      notes:['vl[v0]=min(6-6,6-4,13-5)=min(0,2,8)=0','ve=vl=0，v0 是关键事件'],
      stats:{'vl[v0]':0,'ve[v0]':0,'取min':'min(0,2,8)=0','v0':'关键事件'}},
      1, 'vl[v0]=min{vl[v1]-6, vl[v2]-4, vl[v3]-5}=min{0, 2, 8}=0。ve[v0]=vl[v0]=0，v0 是源点关键事件。',
      ['vl[v0]=min(0,2,8)=0','v0 是关键事件','vl 全部计算完毕']));

    /* 检验关键活动 e==l */
    var finalVe=ve.slice(), finalVl=vl.slice();
    steps.push({ line:2, narr:'现在逐条活动检验：e=ve[u]，l=vl[v]-w，e==l 则是关键活动。v0→v1: e=0,l=6-6=0 ✓；v0→v2: e=0,l=6-4=2 ✗；v0→v3: e=0,l=13-5=8 ✗。',
      act:['v0→v1: e=l=0 关键','v0→v2: e=0,l=2 非关键','v0→v3: e=0,l=8 非关键'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage,{0:'done',1:'hot',2:'active',3:'active'},
          [[0,1]],finalVe,finalVl);
        drawTable(c.stage,finalVe,finalVl,-1);
        c.stage.appendChild(D.text('v0→v1 e=l=0 ✓关键；v0→v2 e=0,l=2；v0→v3 e=0,l=8',
          {x:490,y:260,'class':'vz-info','text-anchor':'start'}));
        c.stats={'v0→v1':'e=l=0 关键','v0→v2':'余量2','v0→v3':'余量8','关键':'仅v0→v1'};
      }
    });

    steps.push({ line:2, narr:'继续：v1→v4: e=ve[v1]=6, l=vl[v4]-1=6, e==l ✓关键；v2→v4: e=ve[v2]=4, l=vl[v4]-1=6, e≠l ✗；v3→v5: e=5, l=13-2=11 ✗。',
      act:['v1→v4: e=l=6 关键','v2→v4: e=4,l=6 非关键','v3→v5: e=5,l=11 非关键'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage,{0:'done',1:'done',4:'hot',2:'active',3:'active'},
          [[1,4]],finalVe,finalVl);
        drawTable(c.stage,finalVe,finalVl,-1);
        c.stage.appendChild(D.text('v1→v4 e=l=6 ✓关键；v2→v4 e=4,l=6；v3→v5 e=5,l=11',
          {x:490,y:260,'class':'vz-info','text-anchor':'start'}));
        c.stats={'v1→v4':'e=l=6 关键','v2→v4':'余量2','v3→v5':'余量6','关键活动数':2};
      }
    });

    steps.push({ line:-1, narr:'v4→v5: e=ve[v4]=7, l=vl[v5]-8=7, e==l ✓关键。关键路径：v0→v1→v4→v5，总工期 15。',
      act:['v4→v5: e=l=7 关键','关键路径：v0→v1→v4→v5','总工期=15'],
      run: function(c) {
        D.clear(c.stage);
        drawGraph(c.stage,{0:'done',1:'done',4:'done',5:'hot'},
          [[0,1],[1,4],[4,5]],finalVe,finalVl);
        drawTable(c.stage,finalVe,finalVl,-1);
        c.stage.appendChild(D.text('关键路径：v0→v1→v4→v5，长度=6+1+8=15',
          {x:490,y:260,'class':'vz-info','text-anchor':'start'}));
        c.stats={'关键路径':'v0→v1→v4→v5','总工期':15,'关键活动':'v0v1,v1v4,v4v5','余量':'均为0'};
      }
    });

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['critical-path'] = {
    title: '关键路径 Critical Path',
    subtitle: '正向求 ve，逆向求 vl，活动 e=l 则为关键活动，所有关键活动串成关键路径，长度=工程最短完成时间。',
    height: 700,
    code: [
      '初始 ve[v0]=0；按拓扑序: ve[v]=max{ve[u]+w}',
      '初始 vl[vn-1]=ve[vn-1]；逆拓扑序: vl[u]=min{vl[v]-w}',
      '每条活动<u,v,w>: e=ve[u]，l=vl[v]-w',
      '若 e==l：关键活动，加入关键路径'
    ],
    scenes: [
      { name: 'AOE 网与 ve/vl 概念', build: buildConcept,
        code: [
          '// AOE 网：边=活动，顶点=事件',
          '// ve[i]：事件i最早发生时间（正向最长路）',
          '// vl[i]：事件i最迟发生时间（逆向倒推）',
          '// 活动e=ve[u]（最早开始时刻）',
          '// 活动l=vl[v]-w（最迟开始时刻）',
          '// 关键活动：e==l（无时间余量）'
        ]
      },
      { name: '正向计算 ve', build: buildVe,
        code: [
          '初始 ve[v0]=0；按拓扑序: ve[v]=max{ve[u]+w}',
          '处理每个顶点v：遍历所有入边<u,v,w>',
          '    ve[v] = max(ve[v], ve[u]+w)',
          '// ve[v4]=max(6+1,4+1)=7',
          '// ve[v5]=max(5+2,7+8)=15',
          '// 总工期=ve[汇点]=15'
        ]
      },
      { name: '逆向求 vl + 关键路径', build: buildVl,
        code: [
          '初始 vl[vn-1]=ve[vn-1]；逆拓扑序: vl[u]=min{vl[v]-w}',
          '每条活动<u,v,w>: e=ve[u]，l=vl[v]-w',
          '若 e==l：关键活动，加入关键路径',
          '// 关键路径：v0→v1→v4→v5',
          '// 缩短工期只能压缩关键活动',
          '// 时间 O(n+e)'
        ]
      }
    ]
  };
})();

