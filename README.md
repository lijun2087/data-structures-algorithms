# 数据结构算法可视化

以严蔚敏《数据结构（C语言版）》全书 12 章为知识框架的算法可视化系统，覆盖 **63 个知识点、169 个演示场景、1846 个动画步骤**。

每个知识点都是一段可播放、可单步、可后退的 SVG 动画，右侧同步高亮对应的伪代码行，底部给出当前这一步在做什么。零依赖、零构建、纯静态 —— 打开 `index.html` 就能跑。

![vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e)
![no dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![topics](https://img.shields.io/badge/知识点-63-5b8cff)
![scenes](https://img.shields.io/badge/场景-169-5b8cff)
![steps](https://img.shields.io/badge/动画步骤-1846-5b8cff)

## 它解决什么问题

教材上的图是静态的。「AVL 树 LR 旋转后为什么是这个形状」「KMP 失配时 j 到底退到哪」「B- 树分裂时中间那个关键字上升到父节点的哪个位置」—— 这些过程课本只能画首尾两帧，中间的变化要靠读者在脑子里补。

这套系统把中间帧全部补上，并且和伪代码逐行对齐：动画停在哪一步，伪代码就高亮哪一行。

## 快速开始

不需要 npm install，不需要打包。

```bash
git clone https://github.com/lijun2087/data-structures-algorithms.git
cd data-structures-algorithms/site
```

然后任选一种方式：

```bash
# 方式一：Python 自带的静态服务器
python -m http.server 8000

# 方式二：Node
npx serve .
```

浏览器打开 `http://localhost:8000`。

> 建议走本地服务器而不是直接双击 `index.html`。知识点模块是按需 `<script>` 注入加载的，`file://` 协议下部分浏览器会拦。

URL 支持 hash 直达，比如 `#kmp`、`#avl-tree`、`#b-tree`，方便讲课时做书签。

## 界面说明

左侧是按教材章节折叠的知识点树，带搜索框和完成度进度条。右侧是动画舞台，分四个区域：

| 区域 | 内容 |
| --- | --- |
| 舞台 | 当前数据结构的图形化状态，带过渡动画 |
| 旁白 | 舞台底部一到两行文字，解释这一步在做什么、为什么 |
| 伪代码 | 与教材风格一致的伪代码，当前执行行高亮 |
| 运行状态 | 关键变量的实时值（如 `i`、`j`、比较次数、移动次数） |

底部控制条：播放 / 单步 / 后退 / 重置 / 倍速（0.5x–2x），以及当前知识点的场景切换按钮。

「后退」是通过**从头重放到目标步**实现的，而不是维护反向操作。每个场景的 `build()` 只依赖传入的 `ctx`，所以重放是幂等的 —— 这个设计让新增知识点时不必再写一遍撤销逻辑。

## 项目结构

```
site/
├── index.html          # 外壳：布局、主题色、章节导航样式
├── app.js              # 目录树、hash 路由、知识点模块按需加载
├── core/
│   ├── catalog.js      # 全书 12 章知识点目录（唯一的一份清单）
│   ├── viz-draw.js     # SVG 图元库：节点盒、数组格、柱子、箭头、指针
│   └── viz-core.js     # 通用播放器：步进、高亮、旁白折行、状态面板
└── topics/             # 63 个知识点模块，一个知识点一个文件
    ├── kmp.js
    ├── avl-tree.js
    └── ...

tools/
└── check.js            # 无浏览器自检：在假 DOM 里跑完所有 1846 步
```

分层很直白：`viz-draw.js` 只管画，`viz-core.js` 只管放，`topics/*.js` 只管描述「这个算法有哪些步骤」。知识点模块不碰 DOM 细节，也不管播放控制。

## 知识点覆盖

| 章 | 知识点数 | 场景数 | 内容 |
| --- | :-: | :-: | --- |
| 1 绪论 | 2 | 4 | 时间复杂度与大 O 记号、抽象数据类型 ADT |
| 2 线性表 | 6 | 15 | 顺序表、单链表、双向链表、循环链表与约瑟夫环、静态链表、一元多项式相加 |
| 3 栈和队列 | 7 | 16 | 顺序栈与链栈、括号匹配、中缀转后缀与表达式求值、汉诺塔与递归栈帧、循环队列、链队列、栈解迷宫 |
| 4 串 | 2 | 5 | 朴素模式匹配 BF、KMP 与 next 数组 |
| 5 数组和广义表 | 4 | 11 | 行/列优先寻址、对称与三角矩阵压缩、稀疏矩阵三元组与转置、广义表存储 |
| 6 树和二叉树 | 7 | 23 | 二叉树性质与存储、三种遍历、层次遍历、线索二叉树、树与森林转换、哈夫曼编码、由遍历序列重建 |
| 7 图 | 9 | 26 | 邻接矩阵与邻接表、DFS、BFS、Prim、Kruskal、Dijkstra、Floyd、拓扑排序、关键路径 AOE |
| 8 动态存储管理 | 3 | 8 | 边界标识法（首次/最佳拟合）、伙伴系统、存储紧缩与垃圾回收 |
| 9 查找 | 9 | 31 | 顺序查找与哨兵、折半查找与判定树、斐波那契查找、分块查找、BST、AVL 四种旋转、B- 树、B+ 树、哈希冲突处理 |
| 10 内部排序 | 10 | 14 | 直接插入、折半插入、希尔、冒泡、快排分区、简单选择、堆排筛选、归并、基数 LSD、性能对比 |
| 11 外部排序 | 3 | 12 | 多路平衡归并、败者树、置换选择排序 |
| 12 文件 | 1 | 4 | 索引文件与倒排表 |
| **合计** | **63** | **169** | **1846 个动画步骤** |

场景数多于知识点数，是因为一个知识点常常要拆开讲。比如 KMP 分三个场景：先讲 `next[j]` 的含义（前缀等于后缀，最长多少），再讲怎么让 T 跟自己错位匹配递推出整张表，最后才是匹配过程 —— 并且刻意和 BF 的指针回退放在一起对照。

## 自检工具

1846 步动画没法靠手点。`tools/check.js` 用一个够用的假 DOM（约 60 行，只实现主题真正用到的那几个接口）在 Node 里跑完每个场景的 `build()` 和每一步的 `run()`：

```bash
node tools/check.js              # 全量
node tools/check.js kmp avl-tree # 只查指定知识点
```

```
检查 63 个主题，共 1846 步
通过 63，失败 0

全部通过
```

它抓这几类问题：

- `build()` / `run()` 运行期异常
- SVG 属性取到 `undefined`、`NaN`、`Infinity`
- 坐标越出舞台面板边界（文字飘到面板外是最常见的低级错误）
- `line` 下标超出该场景伪代码行数（高亮打到空行上）
- 旁白缺失或过长（面板只放得下两行，约 150 字）
- `stats` 超过 4 项、`act` 超过 3 条 —— 超出的部分在界面上根本不会显示

越界检查靠的是估算字宽而不是真实排版，所以它拦的是明显错误，不能替代肉眼过一遍。

## 加一个新知识点

三步。

**1. 在 `core/catalog.js` 对应章节里登记：**

```js
{ id: 'my-topic', name: '我的知识点', status: 'ready' }
```

`status` 为 `'todo'` 时界面会显示占位卡片，方便先占位后填。

**2. 新建 `site/topics/my-topic.js`，向 `VizTopics` 注册：**

```js
(function () {
  var D = window.VizDraw;

  function buildDemo(ctx) {
    // build 阶段把每一帧要画的数据算完，run 里只负责画。
    // 这样后退（从头重放）才是幂等的。
    var steps = [];
    var arr = [5, 3, 8];

    steps.push({
      line: 0,                        // 高亮伪代码第几行（0 起）
      narr: '初始状态，数组尚未处理。', // 舞台底部旁白，两行以内
      act: ['准备开始'],               // 运行状态面板下方，最多 3 条
      run: function (c) {
        D.clear(c.stage);
        c.stats = { '比较次数': 0 };   // 最多 4 项
        D.cellRow(c.stage, { values: arr, x: 200, y: 150 });
      }
    });

    return steps;
  }

  window.VizTopics = window.VizTopics || {};
  window.VizTopics['my-topic'] = {
    title: '我的知识点',
    subtitle: '一两句话说清这个结构解决什么问题、代价是多少。',
    height: 720,
    code: ['for (i = 0; i < n; i++) {', '  // ...', '}'],
    scenes: [
      { name: '基本流程', build: buildDemo, codeTag: '主流程' }
    ]
  };
})();
```

**3. 跑自检：**

```bash
node tools/check.js my-topic
```

几条约定，照着走可以省掉调试：

- 舞台可用区域是 `{ x: 24, y: 84, w: 952, h: 300 }`，`ctx.S` 里能拿到
- 颜色用 `D.C` 的语义名（`idle` / `hot` / `active` / `good` / `bad` / `done` / `mute`），不要写死色值，换主题色时才不用逐个文件改
- 每帧的数组要 `.slice()` 存副本，直接存引用会让后退重放时前后帧串味
- 现成图元：`cellRow`（数组格）、`barRow`（柱状图）、`nodeBox`、`circleNode`、`link`（箭头）、`cross`（叉号）、`pointer`、`brace`、`zone`

## 浏览器要求

需要支持 SVG、CSS 自定义属性和 `getComputedTextLength()` 的现代浏览器。Chrome / Edge / Firefox / Safari 近几年的版本都可以。代码是 ES5 写的，没有构建步骤，也没有 polyfill。

## 关于教材

知识点划分、术语、伪代码风格和示例数据都尽量贴合严蔚敏、吴伟民《数据结构（C语言版）》（清华大学出版社）。比如 KMP 用的就是书上的 `T = "abaabcac"`，方便对着书看。本项目是独立编写的教学辅助工具，与教材作者及出版社无关。

## License

MIT
