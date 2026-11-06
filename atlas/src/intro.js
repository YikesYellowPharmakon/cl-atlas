// 星座 A 动画 (2026-11-06 用户选定: 图标 B2「不对称星座 A」 + 开场 2c「路线」; 同日按图谱的节点语言升级), 两处使用:
//  1. 主页开场: 刷新必播; 新打开且距上次播放 > 2 分钟才播 (localStorage 'atlas-intro-t'); 前进/后退 (从笔记返回) 不播.
//     是否播放由 <head> 里的脚本决定 (html[data-intro]), 这样第一帧就有盖板, 页面不会先闪出来.
//  2. 打开笔记时的加载遮罩: 笔记加载并滚到目标位置之前盖住画面; A 画完还没好就停在完整的 A 上等 (最多 6 秒);
//     0.38 秒内就好了则直接淡掉, 不硬播. 字簇用该课的课程色.
// 字幕 = 一句小众格言 (原文衬线斜体 + 等宽出处), 逐字从背景字符解码出来; 每次随机, 不和上一次重复. 主页开场因此多留约半秒.
// 图形语言取自图谱: 节点 = 实心核心 + 一圈留白 (连线在留白处断开), 主次靠亮度; 跨课节点外有虚线圈 (图谱 .xm);
//   子概念 = 课程色小点 + 细线 (图谱 .sb2); 背景一段点线弧 (开关圆 .orb0 的点线). 图标 favicon.svg 是同一几何.
// 共同规矩: 点击 / 按键 / 滚轮立即结束; 减少动态效果和无头浏览器不播 (测试改 UA 来测, 见 tests/intro.mjs).
// 接口: AtlasMark.play({ hold, fadeIn, cap: [主行, 副行] }) → { ready(), end() }; hold = 等 ready() 再退场.
(function () {
  var H = document.documentElement, NS = 'http://www.w3.org/2000/svg';
  var OFF = matchMedia('(prefers-reduced-motion: reduce)').matches || /HeadlessChrome/.test(navigator.userAgent);
  var R = function (n) { return Math.round(n * 100) / 100; }, at = function (P, Q, t) { return [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]; };
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; }, sg = function (t, a, b) { return clamp((t - a) / (b - a)); };
  var eio = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }, eo = function (x) { return 1 - Math.pow(1 - x, 3); };
  var eob = function (x) { return 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  // ---- 几何 (32×32), 与 favicon.svg 同源 ----
  var A = [14, 5], L = [6.5, 26.5], Rr = [25, 25], c1 = at(A, L, .55), c2 = at(A, Rr, .72);
  // 节点: [位置, 核心半径, 亮度 (图谱 .core 的 ink 比例), 类] ; 类 i = 墨色, a = 课程色 (跨课的那一端)
  var NODES = [[A, 1.8, 1, 'i'], [L, 1.15, .62, 'i'], [Rr, 1, .62, 'i'], [c1, 1.35, .85, 'i'], [c2, 1.05, .85, 'i'], [[30.6, 12.8], .75, .95, 'a']].map(function (n) { return { x: n[0][0], y: n[0][1], r: n[1], k: n[2], c: n[3] }; });
  // 连线: [起, 止, 线宽, 不透明度, 虚线?]; 最后一条是跨课连线 (虚线)
  var EDGES = [[0, 3, .5, .7], [3, 1, .5, .7], [0, 4, .5, .7], [4, 2, .5, .7], [3, 4, .5, .7], [4, 5, .45, .7, 1]];
  var XM = 4;                                   // 有跨课连线的节点: 外面一圈虚线 (图谱 .xm)
  // 子概念: [父节点, 位置, 半径]
  var SUBS = [[0, [9.2, 6.4], .45], [0, [10.6, 2], .36], [1, [3, 23.4], .4], [2, [22.2, 29.4], .36]];
  var GAP = .9, D0 = .6;
  function cut(a, b, ra, rb) { var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), ta = ra + GAP, tb = rb + GAP, ux = dx / d, uy = dy / d; return [a.x + ux * ta, a.y + uy * ta, b.x - ux * tb, b.y - uy * tb]; }
  // ---- 时间线 (ms): 星点铺开 → 点线弧扫过 → 顶点亮 → 连线按路线一条条画, 画到哪个节点哪个亮 → 子概念落下 → 跨课圈 ----
  var LIT = NODES.map(function () { return Infinity; }); LIT[0] = 180;
  var SCHED = EDGES.map(function (e, i) { var t = 210 + i * 85; LIT[e[1]] = Math.min(LIT[e[1]], t + 120); return t; });
  var LAST = Math.max.apply(null, LIT), END0 = LAST + 240, EXIT = 320, FAST = 380, MAXHOLD = 6000;
  var cur = null;
  // ---- 主页背景字符场的同一套文字 (glass7 v6 字符场): 遮罩上铺一层同样稀疏的暗字, 星座旁冒出几簇字, 一簇一种文字一种颜色, 先解码再停住 ----
  var GL = { braille: '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵', kana: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ', rune: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ',
    math: '∑∏∫∂∇∞≈≡≤≥⊂⊃∈∀∃λμσπΩΔ', box: '╱╲╳┼├┤┬┴░▒▖▗▘▝◢◣◤◥', hira: 'あいうえおかきくけこさしすせそたちつてとなにぬねのゐゑをん', cher: 'ᎠᎡᎢᎣᎤᎥᎦᎧᎨᎩᎪᎫᎬᎭᎮᎯᎰᎱᎲᎳ' };
  var GK = Object.keys(GL); GK.forEach(function (k) { GL[k] = Array.from(GL[k]); });
  var GF = '"SF Mono", Menlo, "Hiragino Sans", "PingFang SC", "Apple Symbols", "Plantagenet Cherokee", sans-serif', CW = 14, CH = 20;
  var gly = function (k) { var a = GL[k]; return a[(Math.random() * a.length) | 0]; };
  // ---- 格言: 语言 / 意义 / 地图; 原文 + 出处, 每次随机, 不和上一次重复 ----
  var SAY = [
    ['You shall know a word by the company it keeps.', 'J. R. Firth · 1957'],
    ['Die Bedeutung eines Wortes ist sein Gebrauch in der Sprache.', 'L. Wittgenstein · Philosophische Untersuchungen §43'],
    ['… von endlichen Mitteln einen unendlichen Gebrauch machen.', 'W. von Humboldt · 1836'],
    ['A map is not the territory it represents.', 'A. Korzybski · Science and Sanity'],
    ['Colorless green ideas sleep furiously.', 'N. Chomsky · Syntactic Structures'],
    ['Dans la langue il n’y a que des différences.', 'F. de Saussure · Cours de linguistique générale'],
    ['Le langage est une raison humaine qui a ses raisons, et que l’homme ne connaît pas.', 'C. Lévi-Strauss · La Pensée sauvage'],
    ['Nach der Bedeutung der Wörter muss im Satzzusammenhange gefragt werden.', 'G. Frege · Die Grundlagen der Arithmetik'],
    ['Calculemus!', 'G. W. Leibniz']
  ];
  function pickSay() { var last = -1; try { last = +localStorage.getItem('atlas-say'); } catch (e) {} var i; do { i = (Math.random() * SAY.length) | 0; } while (i === last && SAY.length > 1); try { localStorage.setItem('atlas-say', i); } catch (e) {} return SAY[i]; }

  function run(ov, o) {
    var svg = ov.querySelector('svg'), END = END0 + (o.hold ? 0 : 560), TOTAL = END + EXIT;   // 主页多留半秒读格言; 笔记遮罩照常
    var cs = getComputedStyle(H), day = H.getAttribute('data-mode') === 'day', cv = function (n) { return cs.getPropertyValue(n).trim(); };
    var PAL = o.hold ? [cv('--accent'), cv('--accent'), cv('--accent'), cv('--accent')] : [cv('--k-add'), cv('--k-math'), cv('--k-ok'), cv('--k-warn2')];
    // 暗字场: 约五分之一的格子有字, 中间留空 (星座和格言所在), 一次画好
    var fld = document.createElement('canvas'); fld.className = 'fld'; ov.insertBefore(fld, ov.firstChild);
    (function () { var W = innerWidth, Hh = innerHeight, d = Math.min(2, devicePixelRatio || 1), c = fld.getContext('2d'); fld.width = W * d; fld.height = Hh * d; c.setTransform(d, 0, 0, d, 0, 0);
      c.font = '11px ' + GF; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = cv('--ink'); c.globalAlpha = day ? .08 : .065;
      var rx = Math.min(W * .34, 330), ry = Math.min(Hh * .36, 300);
      for (var x = 0; x < W / CW; x++) for (var y = 0; y < Hh / CH; y++) { var px = x * CW + CW / 2, py = y * CH + CH / 2, dx = (px - W / 2) / rx, dy = (py - Hh / 2) / ry;
        if (Math.random() > .2 || dx * dx + dy * dy < 1) continue; c.fillText(gly(GK[(Math.random() * GK.length) | 0]), px, py); } })();
    // 字簇: 星座四周 4 簇, 对齐背景的 14×20 网格
    var gl = document.createElement('div'); gl.className = 'gly'; ov.appendChild(gl);
    var SPOTS = [[-7, 3, 4], [34, 9, 3], [-3, 31, 5], [33, 34, 3]], clus = [];
    function place() { var b = svg.getBoundingClientRect(), u = b.width / 32;
      SPOTS.forEach(function (p, k) { var set = GK[(Math.random() * GK.length) | 0], x0 = Math.round((b.left + p[0] * u) / CW) * CW, y0 = Math.round((b.top + p[1] * u) / CH) * CH, cl = { set: set, t0: 140 + k * 150, el: [] };
        for (var j = 0; j < p[2]; j++) { var e = document.createElement('i'); e.style.left = (x0 + j * CW) + 'px'; e.style.top = y0 + 'px'; e.style.color = PAL[k % PAL.length]; e.textContent = gly(set); gl.appendChild(e); cl.el.push(e); }
        clus.push(cl); }); }
    var say = o.cap || pickSay(), qChars = Array.from(say[0]), qSet = GK[(Math.random() * GK.length) | 0], qStep = Math.min(14, 420 / qChars.length), lastSw = 0;
    var mk = function (tag, a, par) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); (par || svg).appendChild(e); return e; };
    var s = 7, rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };   // 星点固定种子, 每次一样
    var arc = []; for (var k = 0; k < 19; k++) { var an = -.8 + k * .095; arc.push(mk('circle', { cx: R(16 + 17.8 * Math.cos(an)), cy: R(16 + 17.8 * Math.sin(an)), r: .24, class: 'ad' })); }   // 点线弧 = 一串点
    var zEl = []; for (var i = 0; i < 22; i++) zEl.push(mk('circle', { cx: R(-22 + rnd() * 76), cy: R(-8 + rnd() * 48), r: R(.25 + rnd() * .35), class: i % 3 ? 'z' : 'z a' }));
    var sEl = SUBS.map(function (q) { var p = NODES[q[0]], g = mk('g', {}); return { l: mk('line', { class: 'sl' }, g), c: mk('circle', { r: q[2], class: 'sb' }, g), q: q, p: p }; });
    var eEl = EDGES.map(function (e) { return mk('line', { 'stroke-width': e[2], class: e[4] ? 'e x' : 'e' }); });
    var xm = mk('circle', { cx: NODES[XM].x, cy: NODES[XM].y, r: NODES[XM].r + 1.5, class: 'xm', pathLength: 12 });
    var nEl = NODES.map(function (n) { return mk('circle', { cx: n.x, cy: n.y, class: n.c === 'a' ? 'n a' : 'n' }); });
    var cap = ov.querySelector('.cap'); cap.lastChild.textContent = say[1];
    // 格言逐字解码: 第 i 个字在 Q0 + i·qStep 落定, 之前每 50ms 换一个背景字
    function decode(t) { var Q0 = 240, out = '', sw = Math.floor(t / 50) !== lastSw; if (!sw && t > Q0 + qChars.length * qStep + 60) return; lastSw = Math.floor(t / 50);
      qChars.forEach(function (ch, i) { var at = Q0 + i * qStep; out += t >= at + 160 || ch === ' ' ? ch : t < at ? '\u2007' : gly(qSet); }); cap.firstChild.textContent = out; }
    function draw(t, fade) {
      var tt = Math.min(t, END), ex = eio(sg(t, END, TOTAL));   // 退场: 原地收拢, 连线缩回起点, 节点变小, 不移动位置
      var on = sg(tt, 0, 200);
      arc.forEach(function (el, j) { el.setAttribute('opacity', R(.42 * sg(tt, 60 + j * 34, 160 + j * 34) * (1 - ex))); });
      zEl.forEach(function (el, j) { el.setAttribute('opacity', R((j % 3 ? .34 : .5) * on * (1 - sg(tt, LAST - 220 + j * 6, LAST + 60)))); });
      EDGES.forEach(function (e, i) { var a = NODES[e[0]], b = NODES[e[1]], q = cut(a, b, a.r, b.r), p = eio(sg(tt, SCHED[i], SCHED[i] + 120)) * (1 - ex), el = eEl[i];
        el.setAttribute('x1', R(q[0])); el.setAttribute('y1', R(q[1])); el.setAttribute('x2', R(lerp(q[0], q[2], p))); el.setAttribute('y2', R(lerp(q[1], q[3], p))); el.setAttribute('opacity', p ? e[3] : 0); });
      NODES.forEach(function (n, i) { var g = sg(tt, LIT[i], LIT[i] + 180), el = nEl[i];
        el.setAttribute('r', R(Math.max(.1, lerp(lerp(D0, n.r, eob(g)), D0 * .6, ex))));
        el.setAttribute('opacity', R(on * lerp(.3, n.k, g) * (1 - ex * .5))); });
      sEl.forEach(function (s, j) { var g = eo(sg(tt, LIT[s.q[0]] + 140 + j * 40, LIT[s.q[0]] + 340 + j * 40)) * (1 - ex), q = cut(s.p, { x: s.q[1][0], y: s.q[1][1] }, s.p.r, s.q[2] - GAP + .5);
        s.c.setAttribute('cx', R(lerp(s.p.x, s.q[1][0], g))); s.c.setAttribute('cy', R(lerp(s.p.y, s.q[1][1], g))); s.c.setAttribute('opacity', R(g * .9));
        s.l.setAttribute('x1', R(q[0])); s.l.setAttribute('y1', R(q[1])); s.l.setAttribute('x2', R(lerp(q[0], q[2], g))); s.l.setAttribute('y2', R(lerp(q[1], q[3], g))); s.l.setAttribute('opacity', R(g * .4)); });
      var xg = eio(sg(tt, LIT[5] - 40, LIT[5] + 260)) * (1 - ex); xm.setAttribute('transform', 'rotate(' + R(-150 * (1 - xg)) + ' ' + R(NODES[XM].x) + ' ' + R(NODES[XM].y) + ')'); xm.setAttribute('opacity', R(.85 * xg));
      decode(tt); cap.style.opacity = R(sg(tt, 200, 320) * (1 - sg(t, END, END + EXIT * .6)));
      if (!clus.length) place();
      clus.forEach(function (cl) { var a = tt - cl.t0, op = sg(a, 0, 60) * (1 - sg(t, END - 200, END + EXIT * .5)) * (1 - ex);
        cl.el.forEach(function (e, j) { if (a > 0 && a < 260 + j * 40 && ((a / 45) | 0) !== e._k) { e._k = (a / 45) | 0; e.textContent = gly(cl.set); } e.style.opacity = R(op * (j ? .75 : 1)); }); });
      fld.style.opacity = R(sg(tt, 0, 240));
      svg.style.opacity = R(1 - sg(t, END + EXIT * .45, TOTAL));
      ov.style.opacity = R((o.fadeIn ? sg(t, 0, 140) : 1) * (1 - sg(t, END + 60, TOTAL)) * fade);
    }
    var t = 0, prev = null, raf = 0, done = false, wait = !!o.hold, ok = !o.hold, held = 0, fast = null, guard = 0;
    var ctl = {
      ready: function () { ok = true; },
      hold: function () { if (t < END) { wait = true; ok = false; } },
      end: function () {
        if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(guard);
        ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (k) { removeEventListener(k, ctl.end, true); });
        if (ov.id === 'intro') H.removeAttribute('data-intro'); ov.remove(); if (cur === ctl) cur = null;
      }
    };
    function step(now) {
      var dt = prev === null ? 0 : Math.min(64, now - prev); prev = now;
      if (fast !== null) { fast += dt; draw(t, 1 - sg(fast, 0, 200)); if (fast >= 200) return ctl.end(); raf = requestAnimationFrame(step); return; }
      if (wait && ok && t < FAST) fast = 0;                                                   // 很快就好了: 直接淡掉
      else if (t + dt >= END && !ok) { t = END; held += dt; if (held > MAXHOLD) ok = true; }   // 还没好: 停在完整的 A 上等
      else t += dt;
      draw(t, 1); if (t >= TOTAL) return ctl.end(); raf = requestAnimationFrame(step);
    }
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (k) { addEventListener(k, ctl.end, { capture: true, passive: true }); });
    guard = setTimeout(ctl.end, TOTAL + MAXHOLD + 2000);     // 保险: 后台标签页里 rAF 不跑
    draw(0, 1); raf = requestAnimationFrame(step);
    cur = ctl; return ctl;
  }

  var SHELL = '<svg viewBox="0 0 32 32"></svg><div class="cap"><q></q><small></small></div>';
  window.AtlasMark = {
    play: function (o) {
      o = o || {};
      if (cur) { if (o.hold) cur.hold(); return cur; }
      if (OFF) return null;
      var ov = document.createElement('div'); ov.className = 'amk amk-rd'; ov.setAttribute('aria-hidden', 'true'); ov.innerHTML = SHELL;
      document.body.appendChild(ov); return run(ov, o);
    }
  };
  var iv = document.getElementById('intro');
  if (iv) { if (H.hasAttribute('data-intro') && !OFF) { iv.innerHTML = SHELL; run(iv, {}); } else { iv.remove(); H.removeAttribute('data-intro'); } }
})();
