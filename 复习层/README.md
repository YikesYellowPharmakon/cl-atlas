# 复习层

LMU 计算语言学笔记的主页：**笔记 / 图谱 / 术语** 三栏。生成的正式主页是上一级的 `笔记总目录.html`，双击就能打开，离线可用。

复习层只读各课 `笔记/` 文件夹，不改任何笔记。

## 常用命令

在 `Computerlinguistik/` 下运行：

```
python3 复习层/build.py                    # 重新生成主页 (笔记有改动后运行; 同步到仓库时会自动运行)
python3 复习层/tests/check_data.py         # 数据体检 (ID 撞名、连线、先修环、外圈角度、跨课连线)
zsh 复习层/tests/quick.sh                  # 快速回归: 构建 + 体检 + 浏览器冒烟 (锁屏时跳过浏览器部分)
python3 复习层/tests/notes_hash.py check   # 确认笔记没被改动
```

新笔记、新课程、换版之后怎么更新图谱和术语：见 `docs/同步更新方案.md`。

## 目录

```
复习层/
├── build.py            构建入口 → ../笔记总目录.html + 数据/<课>.js
├── src/                页面源码: shell.html, core.js (笔记栏、检索、顶栏), graph.js (图谱), terms.js (术语),
│                       main.css (主样式), app.css / keys.css (底层样式), ring.js / touch.js
├── pipeline/           内容处理: candidates.py (从笔记抽候选), content.py (编译、校验、排版), cover.py (质量闸门),
│                       woerter.py (词典核对), candidates_rules.py (不抓的词、不做图谱的课)
├── content/            人工整理的内容: <课>.txt (分支、概念、连线、术语), <课>.deep.txt (定义、讲解、子概念),
│                       _bridges.txt (跨课连线), <课>.lock.json (上次核对时的笔记哈希)
├── cand/               自动生成的候选和词典缓存 (可重建, 词典缓存重建要联网)
├── 数据/               构建产物: 每门课一个 .js, 主页按需加载
├── lib/                沿用的底层: 背景 / 开关圆 / 调色板 (来自 v14、v6; 背景源码在 lmu-course-notes skill 的 glass7)
├── tests/              t.mjs (无头 Chrome 测试工具, 锁屏时不运行) 和各项回归脚本
└── docs/               抓取规范.md, 同步更新方案.md, 开发记录.md, 术语抽查.md (构建时生成)
```

## 依赖

- Python 3（只用标准库）。
- lmu-course-notes skill（背景 glass7、课程登记 `sync_repo.py`），默认位置 `~/.claude/skills/lmu-course-notes/`。
- 浏览器测试需要 Node.js 和 Google Chrome。
- 本机专用设置写在 `.local.json`（不进仓库）：`evidence` = 测试截图和笔记哈希快照的存放目录；没有这个文件时用系统临时目录。

## 开发时要守的规则

这些规则来自实际出过的 bug：
- 不改笔记；改动前后用 `notes_hash.py` 核对。
- `<html>` / `<body>` 上加 `data-*` 属性前，先查有没有代码用 `closest('[data-…]')` 找同名属性（`data-f` 撞名曾让术语隐藏模式失效）。
- 类名不和图谱 SVG 里的类撞（`.ar` 同时是冠词和箭头，曾把所有冠词藏掉）。
- 图谱 SVG 里不放无限循环动画（任何一个在动，整张图每帧重画）。
- 判断页面高度用 `document.body.scrollHeight`（`documentElement` 含背景画布，它稍后才变）。
- 构建必须是确定的：不要按 Python 集合的顺序做选择。
- 分支 ID 和概念 ID 不能相同。

历史版本和每一轮的改动记录在本机的 `docs/开发记录.md`（不进仓库）。
