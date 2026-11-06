# Atlas · 知识图册

LMU 计算语言学课程笔记的主页，分三栏：

- **笔记**：所有课件笔记、练习单、文献，按课程排列，点开就读。
- **图谱**：每门课的知识网（概念、先修关系、学习路线），以及不同课程之间相通的概念。
- **术语**：每门课的原文术语（德语附冠词和复数），可以隐藏术语或释义来自测。

生成的主页是上一级的 `Atlas.html`。本地双击就能打开，离线可用；线上版本是仓库的 GitHub Pages 首页。Atlas 只读各课的 `笔记/` 文件夹，不改任何笔记。

## 常用命令

在 `Computerlinguistik/` 下运行：

```
python3 atlas/build.py                    # 重新生成主页 (同步到仓库时会自动运行)
python3 atlas/tests/check_data.py         # 数据体检: ID 撞名、连线、先修环、外圈角度、跨课连线
zsh atlas/tests/quick.sh                  # 快速回归: 构建 + 体检 + 浏览器冒烟 (锁屏时跳过浏览器部分)
python3 atlas/tests/notes_hash.py check   # 确认笔记没被改动
```

新笔记、新课程、学期换版之后怎么更新图谱和术语：见 `docs/sync-guide.md`。

## 目录

```
atlas/
├── build.py        构建入口 → ../Atlas.html + data/<课>.js
├── src/            页面源码: shell.html, core.js (笔记栏、检索、顶栏), graph.js (图谱), terms.js (术语),
│                   main.css, app.css, keys.css, ring.js, touch.js
├── pipeline/       内容处理: candidates.py (从笔记抽候选), content.py (编译、校验、排版),
│                   cover.py (质量闸门), woerter.py (词典核对), candidates_rules.py (排除规则)
├── content/        人工整理的内容: <课>.txt (分支、概念、连线、术语), <课>.deep.txt (定义、讲解、子概念),
│                   _bridges.txt (跨课连线)
├── data/           构建产物: 每门课一个 .js, 主页按需加载
├── lib/            沿用的底层: 背景、开关圆、调色板 (背景源码在 lmu-course-notes skill 的 glass7)
├── tests/          t.mjs (无头 Chrome 测试工具) 和各项回归脚本
└── docs/           extraction-rules.md (图谱与术语的抓取规范), sync-guide.md (同步更新方案)
```

本机才有、不进仓库的：`cand/`（自动生成的候选和词典缓存，可重建）、`.local.json`（本机设置）、`docs/changelog.md`（开发记录）、`docs/term-audit.md`（构建时生成的术语抽查表）、`content/*.lock.json`（上次核对时的笔记哈希）。

## 依赖

- Python 3，只用标准库。
- lmu-course-notes skill（背景 glass7、课程登记 `sync_repo.py`），默认位置 `~/.claude/skills/lmu-course-notes/`。
- 浏览器测试需要 Node.js 和 Google Chrome。
- `.local.json` 里的 `evidence` 是测试截图和笔记哈希快照的存放目录；没有这个文件时用系统临时目录。

## 开发时要守的规则

这些规则来自实际出过的 bug：

- 不改笔记；改动前后用 `notes_hash.py` 核对。
- 在 `<html>` / `<body>` 上加 `data-*` 属性前，先查有没有代码用 `closest('[data-…]')` 找同名属性（`data-f` 撞名曾让术语隐藏模式失效）。
- 类名不和图谱 SVG 里的类撞（`.ar` 同时是冠词和箭头，曾把所有冠词藏掉）。
- 图谱 SVG 里不放无限循环动画（任何一个在动，整张图每帧重画）。
- 判断页面高度用 `document.body.scrollHeight`（`documentElement` 含背景画布，它稍后才变）。
- 构建必须是确定的：不要按 Python 集合的顺序做选择。
- 分支 ID 和概念 ID 不能相同。
