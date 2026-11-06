# LMU 计算语言学 · 课程笔记

每门课一个文件夹, 里面是单文件 HTML 笔记 (中文讲解 + 原文卡片, 深色主题与动效视觉层都内嵌在文件中).

首页有三栏:

- **笔记**: 按课程列出所有课件笔记、练习单和文献, 点开直接阅读.
- **图谱**: 每门课的知识网 (概念、先修关系、学习路线), 以及不同课程之间相通的概念.
- **术语**: 每门课的原文术语 (德语附冠词和复数), 可以隐藏术语或释义来自测.

在线阅读: https://yikesyellowpharmakon.github.io/lmu-cl-notes/

## 推荐: 下载到本地看

笔记里的图片都直接嵌在 HTML 文件中, 有的笔记有 2–4 MB. 在线打开时每份都要先完整下载, 网速慢时要等好几秒; 下载到本地后:

- 打开每份笔记都是瞬间的, 也不需要联网;
- 用 `git pull` 一条命令就能拿到最新进度.

(笔记打开以后, 滚动和动效在本地和在线是一样流畅的, 差别只在打开速度.)

## 怎么下载和更新
1. 第一次: `git clone https://github.com/YikesYellowPharmakon/lmu-cl-notes.git`
   (或用 GitHub Desktop 克隆; 也可以在 GitHub 网页上 Code → Download ZIP, 但 ZIP 不能用 git pull 更新).
2. 用浏览器打开根目录的 `index.html`, 从首页点进各份笔记.
3. 以后获取最新进度: 在仓库文件夹里运行 `git pull` (Mac 用终端, Windows 用 Git Bash 或 PowerShell; 或在 GitHub Desktop 里点 Fetch origin → Pull).

部分笔记的公式用到同文件夹下的 `katex/`, 请保持文件夹结构不变.

## 目录

- `<编号> <课程缩写>/`: 每门课的笔记 (HP / NP / NWP = 本科, X = 跨专业补充, P = 硕士, OC = 公开课自学).
- `index.html`: 首页 (笔记 / 图谱 / 术语).
- `复习层/`: 首页的源码和数据. `content/` 是人工整理的图谱和术语, `数据/` 是首页加载的每门课数据, `src/` 是页面代码, 说明见 `复习层/README.md`.
