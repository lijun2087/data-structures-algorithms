/* catalog.js — 严蔚敏《数据结构(C语言版)》全书知识点目录
 * status: 'ready' 已完成 | 'todo' 待制作
 * 每个条目对应 topics/<id>.js 一个模块
 */
window.VizCatalog = [
  { ch: 1, title: '第1章 绪论', items: [
    { id: 'complexity', name: '时间复杂度与大 O 记号', status: 'ready' },
    { id: 'abstract-data-type', name: '抽象数据类型 ADT', status: 'ready' }
  ]},
  { ch: 2, title: '第2章 线性表', items: [
    { id: 'sequential-list', name: '顺序表（插入/删除/扩容）', status: 'ready' },
    { id: 'singly-linked-list', name: '单链表', status: 'ready' },
    { id: 'doubly-linked-list', name: '双向链表', status: 'ready' },
    { id: 'circular-linked-list', name: '循环链表与约瑟夫环', status: 'ready' },
    { id: 'static-linked-list', name: '静态链表', status: 'ready' },
    { id: 'polynomial-add', name: '一元多项式相加', status: 'ready' }
  ]},
  { ch: 3, title: '第3章 栈和队列', items: [
    { id: 'stack-basics', name: '顺序栈与链栈', status: 'ready' },
    { id: 'bracket-match', name: '括号匹配', status: 'ready' },
    { id: 'expression-eval', name: '中缀转后缀与表达式求值', status: 'ready' },
    { id: 'hanoi', name: '汉诺塔与递归栈帧', status: 'ready' },
    { id: 'circular-queue', name: '循环队列（队空/队满判定）', status: 'ready' },
    { id: 'linked-queue', name: '链队列', status: 'ready' },
    { id: 'maze-solve', name: '栈解迷宫回溯', status: 'ready' }
  ]},
  { ch: 4, title: '第4章 串', items: [
    { id: 'string-bf-match', name: '朴素模式匹配 BF', status: 'ready' },
    { id: 'kmp', name: 'KMP 算法与 next 数组', status: 'ready' }
  ]},
  { ch: 5, title: '第5章 数组和广义表', items: [
    { id: 'array-addressing', name: '多维数组的行/列优先寻址', status: 'ready' },
    { id: 'symmetric-matrix', name: '对称矩阵与三角矩阵压缩', status: 'ready' },
    { id: 'sparse-matrix', name: '稀疏矩阵三元组与转置', status: 'ready' },
    { id: 'generalized-list', name: '广义表的存储结构', status: 'ready' }
  ]},
  { ch: 6, title: '第6章 树和二叉树', items: [
    { id: 'binary-tree-basics', name: '二叉树的性质与存储', status: 'ready' },
    { id: 'binary-tree-traversal', name: '先序/中序/后序遍历', status: 'ready' },
    { id: 'level-order-traversal', name: '层次遍历', status: 'ready' },
    { id: 'threaded-binary-tree', name: '线索二叉树', status: 'ready' },
    { id: 'tree-forest-convert', name: '树、森林与二叉树的转换', status: 'ready' },
    { id: 'huffman-tree', name: '哈夫曼树与哈夫曼编码', status: 'ready' },
    { id: 'rebuild-tree', name: '由遍历序列重建二叉树', status: 'ready' }
  ]},
  { ch: 7, title: '第7章 图', items: [
    { id: 'graph-storage', name: '邻接矩阵与邻接表', status: 'ready' },
    { id: 'graph-dfs', name: '深度优先搜索 DFS', status: 'ready' },
    { id: 'graph-bfs', name: '广度优先搜索 BFS', status: 'ready' },
    { id: 'prim', name: '最小生成树 Prim', status: 'ready' },
    { id: 'kruskal', name: '最小生成树 Kruskal', status: 'ready' },
    { id: 'dijkstra', name: '单源最短路 Dijkstra', status: 'ready' },
    { id: 'floyd', name: '多源最短路 Floyd', status: 'ready' },
    { id: 'topological-sort', name: '拓扑排序', status: 'ready' },
    { id: 'critical-path', name: '关键路径 AOE 网', status: 'ready' }
  ]},
  { ch: 8, title: '第8章 动态存储管理', items: [
    { id: 'boundary-tag', name: '边界标识法（首次拟合/最佳拟合）', status: 'ready' },
    { id: 'buddy-system', name: '伙伴系统', status: 'ready' },
    { id: 'garbage-collection', name: '存储紧缩与垃圾回收', status: 'ready' }
  ]},
  { ch: 9, title: '第9章 查找', items: [
    { id: 'sequential-search', name: '顺序查找与哨兵', status: 'ready' },
    { id: 'binary-search', name: '折半查找与判定树', status: 'ready' },
    { id: 'fibonacci-search', name: '斐波那契查找', status: 'ready' },
    { id: 'block-search', name: '分块查找（索引顺序表）', status: 'ready' },
    { id: 'bst', name: '二叉排序树 BST', status: 'ready' },
    { id: 'avl-tree', name: '平衡二叉树 AVL 与四种旋转', status: 'ready' },
    { id: 'b-tree', name: 'B- 树的插入与分裂', status: 'ready' },
    { id: 'b-plus-tree', name: 'B+ 树', status: 'ready' },
    { id: 'hash-table', name: '哈希函数与冲突处理', status: 'ready' }
  ]},
  { ch: 10, title: '第10章 内部排序', items: [
    { id: 'insertion-sort', name: '直接插入排序', status: 'ready' },
    { id: 'binary-insertion-sort', name: '折半插入排序', status: 'ready' },
    { id: 'shell-sort', name: '希尔排序', status: 'ready' },
    { id: 'bubble-sort', name: '冒泡排序', status: 'ready' },
    { id: 'quick-sort', name: '快速排序与分区', status: 'ready' },
    { id: 'selection-sort', name: '简单选择排序', status: 'ready' },
    { id: 'heap-sort', name: '堆排序与筛选调整', status: 'ready' },
    { id: 'merge-sort', name: '归并排序', status: 'ready' },
    { id: 'radix-sort', name: '基数排序（LSD）', status: 'ready' },
    { id: 'sort-compare', name: '各排序算法性能对比', status: 'ready' }
  ]},
  { ch: 11, title: '第11章 外部排序', items: [
    { id: 'external-merge', name: '多路平衡归并', status: 'ready' },
    { id: 'loser-tree', name: '败者树', status: 'ready' },
    { id: 'replacement-selection', name: '置换选择排序', status: 'ready' }
  ]},
  { ch: 12, title: '第12章 文件', items: [
    { id: 'index-file', name: '索引文件与倒排表', status: 'ready' }
  ]}
];
