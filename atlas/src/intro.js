// 星座 A 动画 (图标 B2「不对称星座 A」+ 开场「路线」), 主页开场和打开笔记时的遮罩是同一套, 2026-11-07 重写:
//
// 为什么不用逐帧 JS: 笔记在内嵌框里解析时和页面挤同一条主线程 (IDP 合集实测停 1.6 秒), 逐帧动画开头就卡住, 之后又突然跳到下一段.
// 所以所有动作都交给合成器 (每个部件一个独立图层, 只动 transform / opacity), 主线程堵住也照常走. 只有字符解码在主线程, 堵住时停一下不影响观感.
//
// 时间线 (ms), 两处相同:
//   0        遮罩、暗字场
//   60-740   星点淡入又退去; 连线按路线匀速画出 (每条隔 78 开始, 各画 190), 画到哪个节点哪个亮
//   150-830  格言逐字解码 (预先生成 11 层文字由合成器切换);  180 点线弧开始匀速旋转, 进度细线出现
//   收尾     进度线平滑走满 → 文字和进度线淡出 → 星座按路线反序淡出, 遮罩淡开 (约 400)
// 不同的只有结束时机:
//   主页开场: 固定 1500 后收尾 (留时间读格言), 进度线匀速走满.
//     刷新必播; 新打开且距上次 > 2 分钟才播 (localStorage 'atlas-intro-t'); 前进/后退不播; 由 <head> 里的脚本决定 (html[data-intro]).
//   笔记遮罩: 等笔记加载并停在目标位置 (ready). 进度线按文件大小估的时长走到 90%, 之后极慢地爬, ready 后走满.
//     进度是估算, 不是真实字节数. 等待时小光点沿路线循环. 0.38 秒内就好则直接淡掉. 最多等 20 秒.
//     笔记准备好之前保持隐藏 (#rd.hold), 不让它在遮罩底下绘制和光栅化; ready 前才露出, 绘制完再开始收尾 (core.js reader).
// 规矩: 点击 / 按键 / 滚轮立即结束; 减少动态效果和无头浏览器不播 (测试改 UA, 见 tests/intro.mjs).
// 接口: AtlasMark.play({ hold, fadeIn, est }) → { ready(), hold(), end() }. 已有动画在播时返回那一个并让它等.
(function () {
  var H = document.documentElement, NS = 'http://www.w3.org/2000/svg';
  var OFF = matchMedia('(prefers-reduced-motion: reduce)').matches || /HeadlessChrome/.test(navigator.userAgent);
  var R = function (n) { return Math.round(n * 100) / 100; }, at = function (P, Q, t) { return [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]; };
  // ---- 几何 (32×32), 与 favicon.svg 同源. 图形语言取自图谱: 实心核心 + 留白断开的连线, 亮度分主次; 跨课节点虚线圈 (.xm); 子概念小点 (.sb2) ----
  var A = [14, 5], L = [6.5, 26.5], Rr = [25, 25], c1 = at(A, L, .55), c2 = at(A, Rr, .72);
  var NODES = [[A, 1.8, 1, 'i'], [L, 1.15, .62, 'i'], [Rr, 1, .62, 'i'], [c1, 1.35, .85, 'i'], [c2, 1.05, .85, 'i'], [[30.6, 12.8], .75, .95, 'a']].map(function (n) { return { x: n[0][0], y: n[0][1], r: n[1], k: n[2], c: n[3] }; });
  var EDGES = [[0, 3, .5, .7], [3, 1, .5, .7], [0, 4, .5, .7], [4, 2, .5, .7], [3, 4, .5, .7], [4, 5, .45, .7, 1]];
  var XM = 4, SUBS = [[0, [9.2, 6.4], .45], [0, [10.6, 2], .36], [1, [3, 23.4], .4], [2, [22.2, 29.4], .36]], GAP = .9;
  var TOUR = [0, 3, 1, 3, 4, 2, 4, 5, 4, 0];   // 光点走的循环路线
  function cut(a, b, ra, rb) { var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), ta = ra + GAP, tb = rb + GAP, ux = dx / d, uy = dy / d; return [a.x + ux * ta, a.y + uy * ta, b.x - ux * tb, b.y - uy * tb]; }
  // ---- 时间线 ----
  var APEX = 60, STEP = 78, DRAW = 190, FIRST = 100;
  var LIT = NODES.map(function () { return Infinity; }); LIT[0] = APEX;
  var SCHED = EDGES.map(function (e, i) { var t = FIRST + i * STEP; LIT[e[1]] = Math.min(LIT[e[1]], t + DRAW * .8); return t; });
  var ROUTE = SCHED[SCHED.length - 1] + DRAW + 60, INTRO = 1500, FAST = 380, MAXHOLD = 20000;
  var EASE = 'cubic-bezier(.3,.1,.3,1)';
  var cur = null;
  // ---- 主页背景字符场的同一套文字 ----
  var GL = { braille: '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵', kana: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ', rune: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ',
    math: '∑∏∫∂∇∞≈≡≤≥⊂⊃∈∀∃λμσπΩΔ', box: '╱╲╳┼├┤┬┴░▒▖▗▘▝◢◣◤◥', hira: 'あいうえおかきくけこさしすせそたちつてとなにぬねのゐゑをん', cher: 'ᎠᎡᎢᎣᎤᎥᎦᎧᎨᎩᎪᎫᎬᎭᎮᎯᎰᎱᎲᎳ' };
  var GK = Object.keys(GL); GK.forEach(function (k) { GL[k] = Array.from(GL[k]); });
  var GF = '"SF Mono", Menlo, "Hiragino Sans", "PingFang SC", "Apple Symbols", "Plantagenet Cherokee", sans-serif', CW = 14, CH = 20;
  var gly = function (k) { var a = GL[k]; return a[(Math.random() * a.length) | 0]; }, rk = function () { return GK[(Math.random() * GK.length) | 0]; };
  // ---- 格言: 原文 + 出处, 每次随机, 不和上一次重复 ----
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
  function pickSay() { var last = -1; try { last = +localStorage.getItem('atlas-say'); } catch (e) {} var i; do { i = (Math.random() * SAY.length) | 0; } while (i === last); try { localStorage.setItem('atlas-say', i); } catch (e) {} return SAY[i]; }
  // 暗字场只画一次, 之后复用 (打开笔记的第一帧不再花时间画)
  var fldC = null, fldK = '';
  function field(day, ink) { var W = innerWidth, Hh = innerHeight, key = [W, Hh, day].join(); if (fldC && fldK === key) return fldC; fldK = key; var cv = fldC = document.createElement('canvas'), d = Math.min(2, devicePixelRatio || 1), c = cv.getContext('2d'); cv.className = 'fld'; cv.width = W * d; cv.height = Hh * d; c.setTransform(d, 0, 0, d, 0, 0);
    c.font = '11px ' + GF; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink; c.globalAlpha = day ? .08 : .065; var rx = Math.min(W * .34, 330), ry = Math.min(Hh * .36, 300);
    for (var x = 0; x < W / CW; x++) for (var y = 0; y < Hh / CH; y++) { var px = x * CW + CW / 2, py = y * CH + CH / 2, dx = (px - W / 2) / rx, dy = (py - Hh / 2 + 46) / ry; if (Math.random() > .2 || dx * dx + dy * dy < 1) continue; c.fillText(gly(rk()), px, py); } return cv; }

  // 文字 glitch: 事先生成几层「逐步解码」的文字, 由合成器按顺序切换 (不用主线程改文字, 解析笔记时也不会卡).
  // 每层都是一份排版相同的 <q>, 没解码的字透明占位, 乱码盖在各字的位置上, 所以解码前后每个字都不会移动
  var GN = 11, GSTEP = 62, GT0 = 150, GSETS = ['kana', 'rune', 'math', 'box', 'cher'];   // 不用盲文: 点阵太细太暗, 一整行几乎看不见
  function glitch(cap, text, play) { var q = cap.firstChild, esc = function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c; }, rs = function () { return GSETS[(Math.random() * GSETS.length) | 0]; };
    try { var tn = q.firstChild, base = cap.getBoundingClientRect(), rg = document.createRange(), cs = Array.from(text), i = 0, any = false;
      var pos = cs.map(function (ch, j) { rg.setStart(tn, i); rg.setEnd(tn, i + ch.length); i += ch.length; var r = rg.getClientRects()[0]; if (!r || !ch.trim()) return null; any = true; return { l: R(r.left - base.left), t: R(r.top - base.top), w: R(r.width), h: R(r.height), d: j / cs.length * .82 + Math.random() * .18 }; });
      if (!any) return;
      for (var k = 0; k < GN; k++) { var v = document.createElement('div'), h = '', sc = '', fr = k / (GN - 1), sa = rs(), sb = rs(); v.className = 'gv';
        var st = '', sw = function (t) { if (t === st) return; if (st) h += '</' + st + '>'; if (t) h += '<' + t + '>'; st = t; };   // 相邻同类的字合成一段, 标签越少排版舍入越小
        cs.forEach(function (ch, j) { var p = pos[j]; if (!p) { h += esc(ch); return; } if (p.d < fr) { sw(p.d > fr - .14 ? 'em' : ''); h += esc(ch); return; } sw('u'); h += esc(ch); sc += '<b' + (p.d - fr > .3 ? ' class="f"' : '') + ' style="left:' + p.l + 'px;top:' + p.t + 'px;width:' + p.w + 'px;height:' + p.h + 'px;line-height:' + p.h + 'px">' + esc(gly(Math.random() < .5 ? sa : sb)) + '</b>'; }); sw('');
        v.innerHTML = '<q>' + h + '</q>' + sc; cap.appendChild(v);
        play(v, [{ opacity: 0, offset: 0 }, { opacity: 1, offset: .001 }, { opacity: 1, offset: .999 }, { opacity: 0, offset: 1 }], { duration: GSTEP, delay: GT0 + k * GSTEP, easing: 'linear' }); }
      play(q, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: GT0 + GN * GSTEP - 1, easing: 'linear' }); } catch (e) {} }

  function run(ov, o) {
    var t0 = performance.now(), cs = getComputedStyle(H), cv = function (n) { return cs.getPropertyValue(n).trim(); }, day = H.getAttribute('data-mode') === 'day';
    var ok = !o.hold, hold = !!o.hold, exiting = false, done = false, timers = [], iv = 0, ends = [], est = o.est || 1500;
    var after = function (ms, f) { var id = setTimeout(f, ms); timers.push(id); return id; };
    var play = function (el, kf, op) { op.fill = op.fill || 'both'; return el.animate(kf, op); };
    var layer = function (ox, oy) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 32 32'); s.setAttribute('class', 'ly'); if (ox != null) s.style.transformOrigin = R(ox / 32 * 100) + '% ' + R(oy / 32 * 100) + '%'; ov.appendChild(s); return s; };
    var mk = function (par, tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); par.appendChild(e); return e; };
    // 背景是独立一层: 淡入淡出只动它, 不对整个遮罩做透明度 (那要把所有部件合成一张全屏大图, 大屏上开头和收尾都吃力)
    ov.innerHTML = ''; ov.style.background = 'none'; var bg = document.createElement('div'); bg.className = 'bgc'; ov.appendChild(bg); if (o.fadeIn) play(bg, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
    var fld = field(day, cv('--ink')); ov.appendChild(fld); play(fld, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    // 星点: 淡入又退去
    var nz = layer(), s = 7, rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (var i = 0; i < 22; i++) mk(nz, 'circle', { cx: R(-22 + rnd() * 76), cy: R(-8 + rnd() * 48), r: R(.25 + rnd() * .35), class: i % 3 ? 'z' : 'z a', opacity: i % 3 ? .34 : .5 });
    play(nz, [{ opacity: 0, offset: 0 }, { opacity: 1, offset: .32 }, { opacity: 1, offset: .62 }, { opacity: 0, offset: 1 }], { duration: ROUTE });
    // 点线弧: 匀速旋转 (旋转和淡入分开两个动画)
    var orb = layer(16, 16); for (var k0 = 0; k0 < 22; k0++) { var a0 = k0 * .13; mk(orb, 'circle', { cx: R(16 + 17.8 * Math.cos(a0)), cy: R(16 + 17.8 * Math.sin(a0)), r: .24, class: 'ad', opacity: R(.08 + .72 * k0 / 21) }); }
    var orbA = orb.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 3200, iterations: Infinity });
    orb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 180, fill: 'both' });
    // 连线, 节点 (子概念跟着父节点), 跨课虚线圈
    var parts = [];
    EDGES.forEach(function (e, i) { var a = NODES[e[0]], b = NODES[e[1]], q = cut(a, b, a.r, b.r), ly = layer(q[0], q[1]); mk(ly, 'line', { x1: R(q[0]), y1: R(q[1]), x2: R(q[2]), y2: R(q[3]), 'stroke-width': e[2], class: e[4] ? 'e x' : 'e', opacity: e[3] });
      play(ly, [{ opacity: 0, transform: 'scale(.02)' }, { opacity: 1, offset: .12, transform: 'scale(.12)' }, { opacity: 1, transform: 'scale(1)' }], { duration: DRAW, delay: SCHED[i], easing: EASE }); parts.push(ly); });
    NODES.forEach(function (n, i) { var ly = layer(n.x, n.y); SUBS.forEach(function (q) { if (q[0] !== i) return; var c = cut(n, { x: q[1][0], y: q[1][1] }, n.r, q[2] - GAP + .5); mk(ly, 'line', { x1: R(c[0]), y1: R(c[1]), x2: R(c[2]), y2: R(c[3]), class: 'sl', opacity: .4 }); mk(ly, 'circle', { cx: q[1][0], cy: q[1][1], r: q[2], class: 'sb', opacity: .9 }); });
      mk(ly, 'circle', { cx: n.x, cy: n.y, r: n.r, class: n.c === 'a' ? 'n a' : 'n', opacity: n.k }); play(ly, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 280, delay: LIT[i], easing: 'cubic-bezier(.3,1.3,.6,1)' }); parts.push(ly); });
    var xl = layer(NODES[XM].x, NODES[XM].y); mk(xl, 'circle', { cx: NODES[XM].x, cy: NODES[XM].y, r: NODES[XM].r + 1.5, class: 'xm', pathLength: 12 }); play(xl, [{ opacity: 0, transform: 'rotate(-90deg) scale(.7)' }, { opacity: .85, transform: 'rotate(0deg) scale(1)' }], { duration: 340, delay: LIT[5] - 40, easing: EASE }); parts.push(xl);
    // 等待时的小光点: 沿路线循环
    var pl = null;
    function startPulse() { if (pl || exiting || done) return; pl = layer(); pl.style.transformOrigin = '0 0'; mk(pl, 'circle', { cx: 0, cy: 0, r: .6, class: 'pl' }); var d = [0], tot = 0; for (var j = 1; j < TOUR.length; j++) { var p = NODES[TOUR[j - 1]], q = NODES[TOUR[j]]; tot += Math.hypot(p.x - q.x, p.y - q.y); d.push(tot); }
      pl.animate(TOUR.map(function (m, j) { var n = NODES[m]; return { transform: 'translate(' + R(n.x / 32 * 100) + '%,' + R(n.y / 32 * 100) + '%)', offset: d[j] / tot }; }), { duration: 3600, iterations: Infinity, easing: 'linear' }); pl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'both' }); }
    // 文字和进度线
    var say = pickSay(), cap = document.createElement('div'); cap.className = 'cap'; cap.innerHTML = '<q></q><small></small>'; cap.firstChild.textContent = say[0]; cap.lastChild.textContent = say[1]; ov.appendChild(cap);
    glitch(cap, say[0], play); play(cap, [{ opacity: 0 }, { opacity: 1 }], { duration: 110, delay: GT0 - 20, easing: 'linear' });
    var bar = document.createElement('div'); bar.className = 'pb'; bar.innerHTML = '<i></i>'; ov.appendChild(bar); var fill = bar.firstChild, fA = null; play(bar, [{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 180 });
    // 进度线是一条等待期间不会结束的动画: 分段接力时, 前一段若在主线程忙的时候走完 (本地解析大笔记时常碰上), 合成器会连整个画面一起停住, 直到主线程空闲 (SL 实测停 3 秒)
    function barTo() { var lead = hold ? est : INTRO, tot = lead + 30000; fA = play(fill, [{ transform: 'scaleX(.03)', easing: hold ? 'cubic-bezier(.25,.5,.5,1)' : 'linear' }, { transform: 'scaleX(' + (hold ? .9 : 1) + ')', offset: lead / tot, easing: 'linear' }, { transform: 'scaleX(' + (hold ? .99 : 1) + ')' }], { duration: tot, easing: 'linear' }); }
    barTo();
    // 字符簇: 星座四周, 对齐背景的 14×20 网格; 解码在主线程, 堵住时只是停一下
    var pal = hold ? [cv('--accent'), cv('--accent'), cv('--accent'), cv('--accent')] : [cv('--k-add'), cv('--k-math'), cv('--k-ok'), cv('--k-warn2')], gl = document.createElement('div'), clus = []; gl.className = 'gly'; ov.appendChild(gl);
    var S0 = parseFloat(getComputedStyle(parts[0]).width) || 240, cxx = innerWidth / 2, cyy = parseFloat(getComputedStyle(parts[0]).top) + S0 / 2, u = S0 / 32;
    [[-23, -13, 4], [21, -7, 3], [-19, 15, 5], [21, 14, 3]].forEach(function (p, k) { var set = rk(), x0 = Math.round((cxx + p[0] * u) / CW) * CW, y0 = Math.round((cyy + p[1] * u) / CH) * CH, cl = { set: set, t: 140 + k * 150, el: [] };
      for (var j = 0; j < p[2]; j++) { var e = document.createElement('i'); e.style.left = (x0 + j * CW) + 'px'; e.style.top = y0 + 'px'; e.style.color = pal[k]; e.textContent = gly(set); gl.appendChild(e); cl.el.push(e); play(e, [{ opacity: 0 }, { opacity: j ? .75 : 1 }], { duration: 160, delay: cl.t }); } clus.push(cl); });
    // 只在开头解码, 之后不再改文字: 每改一次都要把整份笔记一起提交一帧
    iv = setInterval(function () { var n = performance.now() - t0; clus.forEach(function (cl) { var a = n - cl.t; if (a > 0 && a < 300) cl.el.forEach(function (e) { e.textContent = gly(cl.set); }); }); if (n > 900) clearInterval(iv); }, 70);

    // 收尾: 一次性交给合成器 (不再用定时器分段, 主线程这时往往正忙): 进度线从当前位置走满 → 文字淡出 → 星座反序淡出, 背景层淡开
    function finish() { if (exiting || done) return; exiting = true; clearInterval(iv); var m = /matrix\(([^,]+)/.exec(getComputedStyle(fill).transform), v = m ? +m[1] : 0, dur = Math.max(160, Math.round((1 - v) * 520)); if (fA) fA.cancel(); play(fill, [{ transform: 'scaleX(' + v + ')' }, { transform: 'scaleX(1)' }], { duration: dur, easing: 'cubic-bezier(.35,0,.25,1)' });
      var out = function (el, ms, delay, ez) { play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, delay: dur + delay, easing: ez || 'ease-out' }); };
      [cap, bar, gl, orb].forEach(function (x) { out(x, 200, 0); }); if (pl) out(pl, 120, 0); parts.slice().reverse().forEach(function (p, i) { out(p, 170, i * 11, 'ease-in'); }); out(fld, 300, 0); out(bg, 320, 90, 'ease-in-out'); after(dur + 430, ctl.end); }
    function check() { if (done || exiting || !ok) return; var n = performance.now() - t0; if (hold && n < FAST) { exiting = true; clearInterval(iv); [].slice.call(ov.children).forEach(function (x) { play(x, [{ opacity: +getComputedStyle(x).opacity }, { opacity: 0 }], { duration: 170, easing: 'ease-out' }); }); after(180, ctl.end); return; } var need = (hold ? ROUTE : INTRO) - n; if (need > 0) { after(need, check); return; } finish(); }
    var ctl = {
      ready: function () { ok = true; check(); },
      onend: function (f) { ends.push(f); },
      // 动画确实上了合成器才回调: 笔记 (尤其本地, 读文件几乎没有延迟) 要等这之后才开始加载, 否则主线程一堵, 动画根本起不来
      whenLive: function (f) { var fired = false, go = function () { if (fired) return; fired = true; f(); }; Promise.all([orbA.ready, fA.ready]).then(function () { requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(go, 0); }); }); }, go); setTimeout(go, 350); },
      hold: function () { if (exiting || done) return; hold = true; ok = false; est = Math.max(est, 3000); if (fA) fA.cancel(); barTo(); after(Math.max(0, ROUTE - (performance.now() - t0)), startPulse); },
      end: function () { if (done) return; done = true; clearInterval(iv); timers.forEach(clearTimeout); ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (k) { removeEventListener(k, ctl.end, true); }); ends.forEach(function (f) { f(); }); if (ov.id === 'intro') H.removeAttribute('data-intro'); ov.remove(); if (cur === ctl) cur = null; }
    };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (k) { addEventListener(k, ctl.end, { capture: true, passive: true }); });
    if (hold) after(ROUTE, startPulse); after(MAXHOLD, function () { ok = true; check(); }); after(MAXHOLD + 5000, ctl.end);
    if (!hold) after(INTRO, check);
    cur = ctl; return ctl;
  }

  window.AtlasMark = {
    willPlay: function () { return !OFF; },
    play: function (o) {
      o = o || {};
      if (cur) { if (o.hold) cur.hold(); return cur; }
      if (OFF) return null;
      var ov = document.createElement('div'); ov.className = 'amk amk-rd'; ov.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ov); return run(ov, o);
    }
  };
  // 空闲时先把暗字场画好, 打开第一份笔记时首帧不用现画
  if (!OFF) (window.requestIdleCallback || function (f) { return setTimeout(f, 1200); })(function () { try { field(H.getAttribute('data-mode') === 'day', getComputedStyle(H).getPropertyValue('--ink').trim()); } catch (e) {} });
  var iv0 = document.getElementById('intro');
  if (iv0) { if (H.hasAttribute('data-intro') && !OFF) run(iv0, {}); else { iv0.remove(); H.removeAttribute('data-intro'); } }
})();
