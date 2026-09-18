/* check.js — 无浏览器的主题自检
 * 用一个够用的假 DOM 跑每个主题的 build() 与每一步 run()，
 * 抓运行期异常、越界的 line 下标、以及超出舞台的坐标。
 * 用法: node tools/check.js [topic-id ...]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'site');
const STAGE = { x: 24, y: 84, w: 952, h: 300 };

/* ---------- 假 DOM：只实现主题真正用到的那几个接口 ---------- */
class Node {
  constructor(tag) {
    this.tagName = tag;
    this.attrs = {};
    this.children = [];
    this._text = '';
    this.style = {};
    this.dataset = {};
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  setAttribute(k, v) {
    if (v === undefined || v === null || (typeof v === 'number' && !isFinite(v))) {
      throw new Error(`属性 ${this.tagName}.${k} 取到了 ${v}`);
    }
    this.attrs[k] = String(v);
  }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttributeNS(ns, k, v) { this.attrs[k] = String(v); }
  appendChild(n) { this.children.push(n); n.parentNode = this; return n; }
  insertBefore(n, ref) {
    const i = ref ? this.children.indexOf(ref) : 0;
    this.children.splice(i < 0 ? 0 : i, 0, n);
    n.parentNode = this;
    return n;
  }
  removeChild(n) {
    const i = this.children.indexOf(n);
    if (i >= 0) this.children.splice(i, 1);
    return n;
  }
  addEventListener() {}
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
  // 每个中文字按 13px、其余按 7px 估宽，够 setNarr 的折行逻辑用
  getComputedTextLength() {
    const s = this._text || '';
    let w = 0;
    for (const ch of s) w += /[^\x00-\xff]/.test(ch) ? 13 : 7;
    return w;
  }
  getTotalLength() { return 100; }
  getPointAtLength() { return { x: 0, y: 0 }; }
  querySelector(sel) {
    const id = sel.startsWith('#') ? sel.slice(1) : null;
    const walk = (n) => {
      if (id && n.attrs.id === id) return n;
      if (!id && n.tagName === sel) return n;
      for (const c of n.children) { const r = walk(c); if (r) return r; }
      return null;
    };
    for (const c of this.children) { const r = walk(c); if (r) return r; }
    return null;
  }
  querySelectorAll() { return []; }
  set innerHTML(v) { this._html = v; this.children = []; }
  get innerHTML() { return this._html || ''; }
}

function makeSandbox() {
  const document = {
    createElementNS: (ns, tag) => new Node(tag),
    createElement: (tag) => new Node(tag),
    createTextNode: (t) => { const n = new Node('#text'); n._text = String(t); return n; },
    getElementById: () => new Node('div'),
    head: new Node('head'),
    body: new Node('body')
  };
  const win = {
    document,
    setInterval: () => 0, clearInterval: () => {},
    setTimeout: () => 0, clearTimeout: () => {},
    location: { hash: '' },
    addEventListener: () => {},
    console
  };
  win.window = win;
  return win;
}

function load(sandbox, rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInNewContext(src, sandbox, { filename: rel });
}

/* ---------- 收集所有画出来的元素，检查是否越出面板 ---------- */
function flatten(node, out) {
  for (const c of node.children) {
    out.push(c);
    flatten(c, out);
  }
  return out;
}

function geomIssues(stage) {
  const bad = [];
  for (const n of flatten(stage, [])) {
    const a = n.attrs;
    const nums = {};
    for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'width', 'height', 'r']) {
      if (k in a) {
        const v = parseFloat(a[k]);
        if (isNaN(v)) bad.push(`${n.tagName}.${k} = "${a[k]}" 不是数字`);
        else nums[k] = v;
      }
    }
    // 只查明显越界：舞台面板之外
    const L = STAGE.x, R = STAGE.x + STAGE.w, T = STAGE.y, B = STAGE.y + STAGE.h;
    const chk = (x, y, tag) => {
      if (x !== undefined && (x < L - 2 || x > R + 2)) {
        bad.push(`${n.tagName} ${tag} x=${x} 越出舞台 [${L},${R}]` +
                 (n._text ? ` (文字 "${n._text.slice(0, 14)}")` : ''));
      }
      if (y !== undefined && (y < T - 2 || y > B + 2)) {
        bad.push(`${n.tagName} ${tag} y=${y} 越出舞台 [${T},${B}]` +
                 (n._text ? ` (文字 "${n._text.slice(0, 14)}")` : ''));
      }
    };
    if ('x' in nums || 'y' in nums) {
      chk(nums.x, nums.y, '左上');
      if ('width' in nums) chk(nums.x + nums.width, undefined, '右边');
      if ('height' in nums) chk(undefined, nums.y + nums.height, '下边');
    }
    if ('cx' in nums) {
      const r = nums.r || 0;
      chk(nums.cx - r, nums.cy - r, '圆左上');
      chk(nums.cx + r, nums.cy + r, '圆右下');
    }
    if ('x1' in nums) { chk(nums.x1, nums.y1, '起点'); chk(nums.x2, nums.y2, '终点'); }
  }
  return bad;
}

/* ---------- 主流程 ---------- */
const sandbox = makeSandbox();
load(sandbox, 'core/catalog.js');
load(sandbox, 'core/viz-draw.js');
load(sandbox, 'core/viz-core.js');
sandbox.VizTopics = sandbox.VizTopics || {};

const want = process.argv.slice(2);
const catalog = sandbox.VizCatalog;
const targets = [];
for (const chap of catalog) {
  for (const it of chap.items) {
    if (want.length && !want.includes(it.id)) continue;
    if (!want.length && it.status !== 'ready') continue;
    targets.push({ ch: chap.ch, id: it.id, name: it.name });
  }
}

let fail = 0, pass = 0, totalSteps = 0;
const problems = [];

for (const t of targets) {
  const file = path.join(ROOT, 'topics', t.id + '.js');
  if (!fs.existsSync(file)) {
    problems.push(`[${t.id}] 文件不存在: topics/${t.id}.js`);
    fail++;
    continue;
  }
  try {
    load(sandbox, path.join('topics', t.id + '.js'));
  } catch (e) {
    problems.push(`[${t.id}] 加载失败: ${e.message}`);
    fail++;
    continue;
  }
  const topic = sandbox.VizTopics[t.id];
  if (!topic) {
    problems.push(`[${t.id}] 没有注册到 VizTopics`);
    fail++;
    continue;
  }
  const errs = [];
  if (!topic.title) errs.push('缺 title');
  if (!topic.scenes || !topic.scenes.length) errs.push('缺 scenes');

  (topic.scenes || []).forEach((scene, si) => {
    const codeLen = (scene.code || topic.code || []).length;
    if (!codeLen) errs.push(`场景${si}「${scene.name}」没有伪代码`);
    const stage = new Node('g');
    const ctx = { stage, draw: sandbox.VizDraw, stats: {},
                  root: new Node('svg'), W: 1000, S: STAGE };
    let steps;
    try {
      steps = scene.build(ctx) || [];
    } catch (e) {
      errs.push(`场景${si}「${scene.name}」build() 抛错: ${e.message}`);
      return;
    }
    if (!steps.length) { errs.push(`场景${si}「${scene.name}」没有步骤`); return; }
    totalSteps += steps.length;
    steps.forEach((s, k) => {
      if (typeof s.line === 'number' && s.line >= codeLen) {
        errs.push(`场景${si} 第${k}步 line=${s.line} 超出伪代码行数 ${codeLen}`);
      }
      if (!s.narr) errs.push(`场景${si} 第${k}步 没有旁白`);
      if (s.narr && s.narr.length > 200) {
        errs.push(`场景${si} 第${k}步 旁白 ${s.narr.length} 字，两行装不下（上限约 150）`);
      }
      if (s.act && s.act.length > 3) {
        errs.push(`场景${si} 第${k}步 act 有 ${s.act.length} 条，面板只显示 3 条`);
      }
      try {
        stage.children = [];
        s.run(ctx);
      } catch (e) {
        errs.push(`场景${si} 第${k}步 run() 抛错: ${e.message}`);
        return;
      }
      if (Object.keys(ctx.stats || {}).length > 4) {
        errs.push(`场景${si} 第${k}步 stats 有 ${Object.keys(ctx.stats).length} 项，面板只显示 4 项`);
      }
      const g = geomIssues(stage);
      if (g.length) errs.push(`场景${si} 第${k}步 越界: ${g.slice(0, 3).join('; ')}`);
    });
  });

  // 同一条错误在每一步都会报，去重后只留前几条
  const uniq = [...new Set(errs)];
  if (uniq.length) {
    fail++;
    problems.push(`[${t.id}] ${t.name}`);
    uniq.slice(0, 6).forEach((e) => problems.push(`    ${e}`));
    if (uniq.length > 6) problems.push(`    …另有 ${uniq.length - 6} 条`);
  } else {
    pass++;
  }
}

console.log(`\n检查 ${targets.length} 个主题，共 ${totalSteps} 步`);
console.log(`通过 ${pass}，失败 ${fail}\n`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('全部通过');
