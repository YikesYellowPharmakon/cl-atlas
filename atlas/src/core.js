/* v15: 笔记 + 图谱 + 术语. 三页同一个页头; 复习不留记录: 除白天黑夜外不写 localStorage, 页面状态放网址和内存 */
(function () {
  var D = document, H = D.documentElement, CS = IDX.courses, BY = {}; CS.forEach(function (c) { BY[c.code] = c; });
  function $(s, r) { return (r || D).querySelector(s); } function $$(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var put = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var CALM = matchMedia('(prefers-reduced-motion: reduce)').matches, M = $('#main'), CLEAN = [];
  var PG = [['notes', '笔记', 'Notizen'], ['graph', '图谱', 'Wissensnetz'], ['terms', '术语', 'Begriffe']], CAT = [['lec', '课件笔记', 'Folien'], ['ex', '练习单', 'Übungen'], ['lit', '文献合集', 'Literatur']];
  var R = { p: 'notes', f: 'ALL', node: '' }, OPEN = {};
  var BOOT = /^#\/read\//.test(location.hash) ? location.hash : ''; if (BOOT) history.replaceState(null, '', '#/notes/ALL');
  (function () { var m = /#\/(\w+)(?:\/([\w:]+))?(?:\/(\w+))?/.exec(location.hash); if (m && PG.some(function (x) { return x[0] === m[1]; })) { R.p = m[1]; R.f = m[2] || 'ALL'; R.node = m[3] || ''; } if (history.state && history.state.open) OPEN = history.state.open; })();
  function inF(c) { return R.f === 'ALL' || R.f === c.code || R.f === 'g:' + c.g; }

  /* ---------- 数据 ---------- */
  var WAIT = {}; window.RV_LOAD = function (code, d) { var c = BY[code]; Object.keys(d).forEach(function (k) { c[k] = d[k]; }); c.loaded = true; c.NODE = {}; c.nodes.forEach(function (n) { c.NODE[n.id] = n; }); c.branches.forEach(function (b) { c.NODE[b.id] = b; }); (WAIT[code] || []).forEach(function (f) { f(); }); delete WAIT[code]; };
  function load(code) { return new Promise(function (ok) { var c = BY[code]; if (c.loaded || !c.has) return ok(); if (WAIT[code]) return WAIT[code].push(ok); WAIT[code] = [ok]; var s = D.createElement('script'); s.src = 'atlas/data/' + code + '.js'; D.head.appendChild(s); }); }
  function loadAll() { return Promise.all(CS.filter(function (c) { return c.has; }).map(function (c) { return load(c.code); })); }
  CS.forEach(function (c) { c.base = new URL(c.base, location.href).href; c.notes.forEach(function (n) { n.f = new URL(n.f, location.href).href; }); });  /* 构建写的是相对路径 */
  function noteHref(c, f, a) { return c.base + encodeURIComponent(f) + (a ? '#' + a : ''); }
  /* 三页共用: 类别标题 + 课程板页眉, 结构和名字相同才能在切换时平滑过渡 */
  /* 分隔线 (纯装饰): 一条发丝线上按顺序排着这一组每门课一个课程色的点, 不响应鼠标 */
  /* 分隔线已按用户要求全部去掉 (v16b) */
  function rulC() { return ''; }
  function shHead(g, first, l) { return '<div class="sh" style="--vn:' + (first ? 'ttl' : 'g-' + g.k) + '">' + '<b>' + esc(g.zh) + '</b><small>' + esc(g.de) + '</small></div>'; }
  function crHead(c) { return '<button class="ch"><span class="m"><b>' + esc(c.mod) + '</b><i>' + esc(c.code) + '</i></span><span class="z"><span class="zt">' + esc(c.zh) + '</span><span class="fo">' + esc(c.fo) + '</span></span><span class="key"><b></b></span></button>'; }
  function shown(c) { return !c.nog || R.p === 'notes'; }
  function groupsIn() { return IDX.groups.map(function (g) { return { g: g, l: CS.filter(function (c) { return c.g === g.k && inF(c) && shown(c); }) }; }).filter(function (x) { return x.l.length; }); }

/*__MOD__*/

  /* ---------- 页面 ---------- */
  var VIEW = { graph: function (el) { GRAPH(el); }, terms: function (el) { TERMS(el); } };
  function render(anim) { if (BY[R.f] && !shown(BY[R.f])) R.f = 'g:' + BY[R.f].g; CLEAN.splice(0).forEach(function (f) { f(); }); H.dataset.pg = R.p; var el = D.createElement('div'); el.className = 'sc' + (anim && !CALM ? ' ani' : ''); M.textContent = ''; M.appendChild(el); syncTop(); if (window.__bgRepal) window.__bgRepal();
    if (R.p === 'notes') { notes(el); stagger(el); dispatchEvent(new Event('resize')); return Promise.resolve(); }
    return loadAll().then(function () { if (!el.isConnected) return; VIEW[R.p](el); stagger(el); dispatchEvent(new Event('resize')); }).catch(function (e) { console.error(e); }); }
  function morph() { H.dataset.tr = '1'; clearTimeout(morph.t); morph.t = setTimeout(function () { delete H.dataset.tr; }, 620); }
  /* 共享元素过渡: 同名的课程板、标题在新旧页面之间平滑移动; 页头留在原地 */
  /* 同时只跑一个过渡: 新的开始前先跳过旧的. 页面已经滚下去时不配对元素 (位置差太大会乱飞), 只做整页淡入 */
  var VT = null;
  /* v15s: 不再让标题文字在新旧页面之间飘移 (用户不喜欢文字滞留). 页头和筛选行原地不动; 旧内容快速淡出, 新内容按版块依次升起 (见 stagger) */
  /* 2026-11-06: 视图过渡只在 Chromium 内核里用 (Chrome / Edge / Arc / Brave…). Safari 等其他内核的实现会在快照交接时闪一帧,
     改成普通的淡入淡出: 旧内容 110ms 淡出 → 换内容 → 新内容 220ms 淡入. 测试可设 window.__VTOFF = true 强制走这条路. */
  var VTOK = !!(window.chrome || (navigator.userAgentData && (navigator.userAgentData.brands || []).some(function (b) { return /Chromium/.test(b.brand); }))), XF = null;
  function fadeSwap(fn) {
    if (XF) { clearTimeout(XF.t); clearTimeout(XF.u); var f0 = XF.fn; XF = null; if (f0) f0(); }
    var x = XF = { fn: fn }; H.classList.remove('xfi'); H.classList.add('xfo');
    x.t = setTimeout(function () { x.fn = null; fn(); H.classList.remove('xfo'); void D.body.offsetWidth; H.classList.add('xfi'); x.u = setTimeout(function () { H.classList.remove('xfi'); if (XF === x) XF = null; }, 260); }, 110);
  }
  function trans(fn) { window.__vtForce = 0; if (VT) { try { VT.skipTransition(); } catch (e) {} VT = null; } if (CALM) return fn(); if (!D.startViewTransition || !VTOK || window.__VTOFF) return fadeSwap(fn); H.dataset.vtp = '1'; var vt = VT = D.startViewTransition(fn); vt.finished.finally(function () { if (VT === vt) { VT = null; delete H.dataset.vtp; } }); }
  function stagger(el) { if (CALM) return; var bl = $$('.sc > .grp, .tx9 > .tx9h, .tx9 > .grp, .lb7 > .sh, .lbw > .lbh, .lbw > .lbsn9, .lbw > .lbg, .lbs9 > *', el).slice(0, 14); bl.forEach(function (b, i) { b.style.setProperty('--d', i); b.classList.add('blk9'); }); clearTimeout(stagger.t); stagger.t = setTimeout(function () { bl.forEach(function (b) { b.classList.remove('blk9'); }); }, 1300); }
  /* 切栏目: 笔记页展开的课程全部收回, 检索清空 */
  function page(p) { if (p === R.p) return; morph(); OPEN = {}; clearQ(); trans(function () { R.p = p; R.node = ''; scrollTo(0, 0); return render(false); }); }
  /* 跨栏目跳到某门课的某个位置: 术语 → 图谱概念, 图谱概念 → 术语 */
  function jump(p, f, node) { morph(); OPEN = {}; clearQ(); trans(function () { R.p = p; R.f = f; R.node = node || ''; scrollTo(0, 0); return render(false); }); }
  function setF(v, node) { var inPlace = R.p === 'notes' ? NOTESF : R.p === 'terms' && !(BY[v] && BY[v].has) ? TERMS.f : null; if (inPlace) { R.f = v; R.node = node || ''; OPEN = {}; if (scrollY) scrollTo(0, 0); syncTop(); if (window.__bgRepal) window.__bgRepal(); inPlace(true); return; } morph(); if (R.p === 'graph' && GRAPH.go) { R.f = v; R.node = node || ''; GRAPH.go(v, node); syncTop(); if (window.__bgRepal) window.__bgRepal(); return; } trans(function () { R.f = v; R.node = node || ''; OPEN = {}; scrollTo(0, 0); return render(false); }); }
  function clearQ() { var q = $('#q'); if (!q) return; q.value = ''; q.blur(); $('#res').innerHTML = ''; $('.slq').classList.remove('has'); }

  /* ---------- 外壳 ---------- */
__RING__
__TOUCH__

  /* 页头: 胶囊独占第一行, 和笔记一样. 选项、细线、课程索引都对齐内容的左右边; 指示线落在细线上滑动 */
  function shell() {
    $('#top').innerHTML = '<div class="hb1"><nav class="hl" aria-label="主导航">' + PG.map(function (p) { return '<button class="si" data-p="' + p[0] + '"><b>' + p[1] + '</b><small>' + esc(p[2]) + '</small></button>'; }).join('') + '</nav><label class="slq"><span class="pr">&gt;_</span><input id="q" placeholder="Suche" aria-label="搜索" autocomplete="off" spellcheck="false"><kbd>/</kbd></label><i class="ind gh"></i><i class="ind"></i></div><div class="sres" id="res"></div>';
    var rl = D.createElement('div'); rl.id = 'rail'; rl.setAttribute('aria-label', '课程索引');  rl.innerHTML = '<div class="sci"></div><div class="rl" id="rl"></div>'; M.parentNode.insertBefore(rl, M);
    var bar = $('.hb1'), gh = $('.ind.gh');
    bar.addEventListener('click', function (e) { var t = e.target.closest('[data-p]'); if (t) page(t.dataset.p); });
    bar.addEventListener('pointerover', function (e) { var t = e.target.closest('.si'); if (!t || e.pointerType === 'touch') { if (!t) gh.classList.remove('v'); return; } if (t !== bar._h) { bar._h = t; scr($('small', t)); } if (!t.classList.contains('on')) { ind(gh, t); gh.classList.add('v'); } else gh.classList.remove('v'); });
    bar.addEventListener('pointerleave', function () { bar._h = null; gh.classList.remove('v'); });
    bar.addEventListener('keydown', function (e) { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; var l = $$('.si[data-p]', bar), i = l.indexOf(D.activeElement); if (i < 0) return; var n = l[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]; n.focus(); page(n.dataset.p); });
    search(); rail();
    var pin = $('#top'), st = function () { pin.classList.toggle('stuck', scrollY > 8); }; addEventListener('scroll', st, { passive: true }); st();
    addEventListener('resize', indNow);
  }
  function scr(el) { if (CALM || el._d) return; el._d = 1; var src = el.textContent, ch = Array.from(src), t0 = performance.now(), last = 0; (function f(now) { var k = Math.min(1, (now - t0) / 260), n = Math.floor(k * ch.length); if (now - last > 40) { last = now; el.textContent = ch.map(function (c, i) { return i < n ? c : GL[Math.floor(Math.random() * GL.length)]; }).join(''); } if (k < 1) requestAnimationFrame(f); else { el.textContent = src; el._d = 0; } })(t0); }
  function ind(n, t) { var b = t.querySelector('b') || t, sm = t.querySelector('small'), bar = t.closest('.hb1') || t.parentNode, rb = b.getBoundingClientRect(), rs = sm && sm.getBoundingClientRect(), r0 = bar.getBoundingClientRect(), R = rs && rs.width ? Math.max(rb.right, rs.right) : rb.right; n.style.width = (R - rb.left) + 'px'; n.style.transform = 'translateX(' + (rb.left - r0.left) + 'px)'; }
  function indNow() { var on = $('.si.on'); if (on) ind($('.ind:not(.gh)'), on); }
  function syncTop() { H.dataset.flt = R.f || 'ALL'; $$('.si[data-p]').forEach(function (t) { var on = t.dataset.p === R.p; t.classList.toggle('on', on); t.setAttribute('aria-current', on ? 'page' : 'false'); }); indNow(); $('.ind.gh').classList.remove('v');
    $('#q').placeholder = 'Suche'; syncRail(); history.replaceState(history.state, '', '#/' + R.p + '/' + R.f + (R.node ? '/' + R.node : '')); }

  /* 课程索引: 三页都在同一个位置 */
  /* 课程筛选: 永远一行, 不弹窗.
     第一层: ALLE | HP NP …  点类别 = 筛选整个类别, 同时这一行换成该类的课程.
     第二层: ‹ HP | EIP EICL …  点课程 = 只看这门课, 再点一次回到整个类别; 点「‹」回到 ALLE.
     切换时只保留一层: 新的一层出现前, 旧的立刻移除 (连点也不会叠在一起) */
  var RAILG = '', RAILT = 0;
  function rail() { var el = $('#rail'), box = $('.sci', el); box.innerHTML = '<div class="rlv"></div>';
    box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.back != null) { setF('ALL'); return; }
      if (b.dataset.g) { setF('g:' + b.dataset.g); return; }
      var v = b.dataset.f; if (v == null) return; setF(R.f === v && BY[v] ? 'g:' + BY[v].g : v); }); }
  function railHTML(g) { if (!g) return '<button class="rk ra' + (R.f === 'ALL' ? ' on' : '') + '" data-f="ALL">ALLE</button><i class="rsep"></i>' + IDX.groups.map(function (x) { return '<button class="rk rgk" data-g="' + x.k + '" title="' + esc(x.zh) + '">' + x.k + '<i></i></button>'; }).join('');
    var gg = IDX.groups.filter(function (x) { return x.k === g; })[0]; return '<button class="rk rbk" data-back="" title="回到全部课程" aria-label="回到全部课程"><i></i></button><button class="rk rgh' + (R.f === 'g:' + g ? ' on' : '') + '" data-g="' + g + '" title="' + esc(gg.zh) + '">' + g + '</button><i class="rsep"></i><div class="rls">' + CS.filter(function (c) { return c.g === g && shown(c); }).map(function (c) { return '<button class="rk rc2 cx-' + c.code + (c.has ? '' : ' no') + (R.f === c.code ? ' on' : '') + '" data-f="' + c.code + '" title="' + esc(c.zh) + '">' + esc(c.code) + '</button>'; }).join('') + '</div>'; }
  function paintRail(dir) { var box = $('#rail .sci'), h = railHTML(RAILG); clearTimeout(RAILT);
    $$('.rlv.outl, .rlv.outr', box).forEach(function (x) { x.remove(); }); var lv = $('.rlv', box);
    if (lv && lv.innerHTML === h) { lv.classList.remove('inr', 'inl'); return; }
    var nv = D.createElement('div'); nv.className = 'rlv'; nv.innerHTML = h;
    /* 旧的一层立即换掉, 只让新的一层轻轻滑入: 任何时刻只有一层, 不会叠字 */
    if (lv) lv.replaceWith(nv); else box.appendChild(nv); if (lv && dir && !CALM) { nv.classList.add(dir > 0 ? 'inr' : 'inl'); RAILT = setTimeout(function () { nv.classList.remove('inr', 'inl'); }, 220); }
    var sc = nv.querySelector('.rls'), on = sc && sc.querySelector('.on'); if (on && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = Math.max(0, on.offsetLeft - sc.offsetLeft - sc.clientWidth / 2); }
  function syncRail() { H.dataset.course = BY[R.f] ? R.f : 'ALL'; var c = BY[R.f], g = c ? c.g : R.f.indexOf('g:') === 0 ? R.f.slice(2) : ''; var d = g !== RAILG ? (g ? 1 : -1) : 0; RAILG = g; paintRail(d); }

  /* 检索: 从页头下方展开一行. 笔记页查课程和笔记; 图谱查节点; 术语就地筛选 */
  function search() { var inp = $('#q'), lst = $('#res'), box = $('.slq'), sel = 0, res = [];
    function find() { var w = inp.value.trim().toLowerCase(); res = []; if (w && R.p === 'notes') { CS.forEach(function (c) { if ((c.zh + c.fo + c.code + c.mod).toLowerCase().indexOf(w) >= 0) res.push({ t: c.mod + ' · ' + c.code + '  ' + c.zh, e: 'Kurs', c: c.code }); c.notes.forEach(function (n) { if (n.t.toLowerCase().indexOf(w) >= 0) res.push({ t: n.t, e: 'Notiz', f: n.f }); }); }); }
      if (w && R.p === 'graph') { /* 图谱搜索的范围永远是全部课程 (不取决于之前打开过哪些课): 还没加载的先补齐, 补齐后重查 */ var miss = CS.filter(function (c) { return c.has && !c.loaded; }); if (miss.length && !find.ld) { find.ld = 1; Promise.all(miss.map(function (c) { return load(c.code); })).then(function () { find.ld = 0; if (inp.value.trim() && R.p === 'graph') find(); }); }
        /* 概念、分支和子概念; 当前这门课排在前面, 名称开头就匹配的排在前面 */ var sc = function (c, a, b) { var A = a.toLowerCase(), Bq = (b || '').toLowerCase(), m = A.indexOf(w) === 0 || Bq.indexOf(w) === 0 ? 0 : 1; return (c.code === R.f ? 0 : 10) + m; };
        CS.forEach(function (c) { if (!c.loaded) return; c.branches.forEach(function (b) { if ((b.zh + ' ' + b.de).toLowerCase().indexOf(w) >= 0) res.push({ t: b.zh, d: b.de, e: c.code + ' · 分支', c: c.code, n: b.id, k: 'b', o: sc(c, b.zh, b.de) + .5 }); });
          c.nodes.forEach(function (n) { var B0 = c.NODE[n.b]; if ((n.zh + ' ' + n.de).toLowerCase().indexOf(w) >= 0) res.push({ t: n.zh, d: n.de, e: c.code + ' · ' + (B0 ? B0.zh : ''), c: c.code, n: n.id, k: 'n', o: sc(c, n.zh, n.de) }); (n.sub || []).forEach(function (sb) { if ((sb.zh + ' ' + (sb.de || '')).toLowerCase().indexOf(w) >= 0) res.push({ t: sb.zh, d: sb.de || '', e: c.code + ' · ' + n.zh, c: c.code, n: n.id, s: sb.id, k: 's', o: sc(c, sb.zh, sb.de) + .7 }); }); }); });
        res.sort(function (a, b) { return a.o - b.o; }); } if (R.p === 'graph' && GRAPH.mark) { var cc0 = GRAPH.cur && GRAPH.cur(); GRAPH.mark(w && cc0 ? res.filter(function (r) { return r.c === cc0 && r.k === 'n'; }).map(function (r) { return r.n; }) : null); } if (R.p === 'graph') { var capN = {}, ccur = GRAPH.cur && GRAPH.cur(); res = res.filter(function (r) { if (!r.k) return true; capN[r.c] = (capN[r.c] || 0) + 1; return capN[r.c] <= (r.c === ccur ? 12 : 5); }); } res = res.slice(0, 40); if (R.p === 'graph') { var cc1 = GRAPH.cur && GRAPH.cur(), gr = {}; res.forEach(function (r, i) { if (r.k && !(r.c in gr)) gr[r.c] = r.c === cc1 ? -1 : i; }); res = res.map(function (r, i) { return [r, i]; }).sort(function (x, y) { var gx = x[0].k ? gr[x[0].c] : 1e9, gy = y[0].k ? gr[y[0].c] : 1e9; return gx - gy || x[1] - y[1]; }).map(function (x) { return x[0]; }); } sel = 0; paint(); }
    function paint() { var prevC = null; lst.innerHTML = res.map(function (r, i) { var hd = ''; if (R.p === 'graph' && r.k && r.c !== prevC) { hd = '<div class="cih">' + (GRAPH.cur && GRAPH.cur() === r.c ? '本课' : esc(BY[r.c].zh)) + '<em>' + r.c + '</em></div>'; prevC = r.c; } return hd + '<button class="ci' + (i === sel ? ' on' : '') + (r.k ? ' ck' + r.k : '') + '" data-i="' + i + '">' + (r.k ? '<i class="cim" aria-hidden="true"></i>' : '') + '<span>' + esc(r.t) + (r.d ? '<small>' + esc(r.d) + '</small>' : '') + '</span><em>' + esc(r.e) + '</em></button>'; }).join(''); var on = $('.on', lst); if (on) on.scrollIntoView({ block: 'nearest' }); if (R.p === 'graph' && GRAPH.peek) GRAPH.peek(res[sel] || null); }
    function pick(r) { var all = res.filter(function (x) { return x.k; }); inp.value = ''; res = []; lst.innerHTML = ''; inp.blur(); if (r.f) { /* 搜索结果里的笔记也走阅读层 (有返回键), 和点笔记链接一样 */ var abs = new URL(r.f, location.href).href, hit = courseOf(abs); if (hit) openNote(abs, hit, null); else location.href = r.f; return; } if (R.p === 'graph' && r.k && GRAPH.find) { GRAPH.find(all, all.indexOf(r)); return; } if (r.c) setF(r.c, r.n); }
    inp.addEventListener('blur', function () { setTimeout(function () { if (D.activeElement !== inp) { lst.innerHTML = ''; if (GRAPH.peek) GRAPH.peek(null); if (GRAPH.mark) GRAPH.mark(null); } box.classList.toggle('has', !!inp.value.trim()); }, 130); });
    inp.oninput = function () { if (R.p === 'terms') { if (TERMS.q) TERMS.q(inp.value); return; } if (R.p === 'graph') loadAll().then(find); else find(); };
    lst.onpointerover = function (e) { var b = e.target.closest('.ci'); if (b && +b.dataset.i !== sel) { sel = +b.dataset.i; $$('.ci', lst).forEach(function (x) { x.classList.toggle('on', x === b); }); if (R.p === 'graph' && GRAPH.peek) GRAPH.peek(res[sel] || null); } };
    lst.onpointerdown = function (e) { var b = e.target.closest('.ci'); if (b) { e.preventDefault(); pick(res[+b.dataset.i]); } };
    inp.onkeydown = function (e) { if (R.p === 'terms' && TERMS.key && TERMS.key(e)) { e.preventDefault(); if (e.key === 'Enter' || (e.key === 'ArrowDown' && R.f && BY[R.f] && BY[R.f].has)) inp.blur(); return; } if (e.key === 'ArrowDown' && res.length) { e.preventDefault(); sel = Math.min(res.length - 1, sel + 1); paint(); } else if (e.key === 'ArrowUp' && res.length) { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); } else if (e.key === 'Enter') { if (res[sel]) pick(res[sel]); else inp.blur(); } else if (e.key === 'Escape') { inp.value = ''; res = []; paint(); if (R.p === 'terms' && TERMS.q) TERMS.q(''); inp.blur(); } }; }

  /* ---------- 笔记页 ---------- */
  var LAST = {};
  function fill(box, code, k) { var c = BY[code], gs = CAT.map(function (x) { return { k: x[0], zh: x[1], de: x[2], l: c.notes.filter(function (n) { return n.k === x[0]; }) }; }).filter(function (g) { return g.l.length; }); k = k || LAST[code] || 'lec'; if (!gs.some(function (g) { return g.k === k; })) k = gs[0].k; var g = gs.filter(function (x) { return x.k === k; })[0];
    if (box.dataset.nc !== code) { box.dataset.nc = code; box.innerHTML = '<div class="seg ct"><i class="sgi"></i>' + gs.map(function (x) { return '<button class="sb" data-k="' + x.k + '"><b>' + x.zh + '</b><small>' + x.de + '</small></button>'; }).join('') + '</div><div class="cl"></div>'; box.onclick = function (e) { var t = e.target.closest('.sb'); if (t) fill(box, code, t.dataset.k); }; }
    $$('.sb', box).forEach(function (b) { b.classList.toggle('on', b.dataset.k === k); }); var on = $('.sb.on', box), bd = $('.sgi', box); bd.style.width = on.offsetWidth + 'px'; bd.style.transform = 'translateX(' + on.offsetLeft + 'px)'; $('.cl', box).innerHTML = '<ul class="nl' + (g.l.length > 4 ? ' two' : '') + '">' + g.l.map(function (n) { var i = n.t.indexOf(' · '); return '<li><a href="' + esc(n.f) + '">' + (i > 0 ? '<em>' + esc(n.t.slice(0, i)) + '</em><i> · </i><span>' + esc(n.t.slice(i + 3)) + '</span>' : '<span>' + esc(n.t) + '</span>') + '</a></li>'; }).join('') + '</ul>'; LAST[code] = k; }
  /* 课程列表的收放 (笔记首页、术语首页共用). 只动真正变化的元素. 没变化的行和组一个属性都不碰, 版面其他地方不会跟着抖 */
    function fold(e, show, anim) { var runs = e.getAnimations ? e.getAnimations().filter(function (a) { return a.id === 'fold'; }) : [], wasOff = e.classList.contains('k5off'); if (!runs.length && wasOff === !show) return; var h0 = runs.length ? e.getBoundingClientRect().height : null, op0 = runs.length ? +getComputedStyle(e).opacity : null; runs.forEach(function (a) { a.onfinish = null; a.cancel(); }); clearTimeout(e._ft); e.style.overflow = '';
    if (!anim || CALM) { e.classList.toggle('k5off', !show); return; } e.classList.remove('k5off'); var cs = getComputedStyle(e), hn = e.offsetHeight, K = ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom'], full = { height: hn + 'px', opacity: 1 }, zero = { height: '0px', opacity: 0 }; K.forEach(function (x) { full[x] = cs[x]; zero[x] = '0px'; });
    var from = {}, to = show ? full : zero; for (var x in full) from[x] = wasOff && !runs.length ? zero[x] : full[x]; if (h0 != null) { from.height = h0 + 'px'; from.opacity = op0; } e.style.overflow = 'clip'; var a = e.animate([from, to], { duration: 300, easing: 'cubic-bezier(.22,.8,.24,1)' }); a.id = 'fold'; function done() { e.style.overflow = ''; if (!show) e.classList.add('k5off'); } a.onfinish = done; if (!show) e._ft = setTimeout(function () { if (e.getAnimations().every(function (q) { return q.id !== 'fold' || q.playState === 'finished'; })) done(); }, 340); }
  function foldList(el, code, anim) { var first = true; $$('.grp', el).forEach(function (g) { var rows = $$('.cr', g), vis = rows.map(function (r) { return inF(BY[code(r)]); }), any = vis.some(Boolean), was = !g.classList.contains('k5off'); g.classList.toggle('k5first', any && first); if (any) first = false;
      /* 组要收起: 里面的行先不动, 跟着组一起收; 组要重新出现: 行先到位, 再展开组; 组留着: 行各自收起或展开 */
      if (any) rows.forEach(function (r, i) { fold(r, vis[i], anim && was); }); fold(g, any, anim); }); }
  /* 笔记页: 所有课程行一直在页面上. 筛选 = 同一个列表收起和展开 (不换页, 没有淡入淡出的幻影); 连续点击时从当前高度接着动 */
  var NOTESF = null;
  function notes(el) { el.innerHTML = IDX.groups.map(function (g) { return { g: g, l: CS.filter(function (c) { return c.g === g.k; }) }; }).filter(function (x) { return x.l.length; }).map(function (x, i) { return '<section class="grp" data-g="' + x.g.k + '">' + shHead(x.g, i === 0, x.l) + x.l.map(function (c) { return '<div class="cr cx-' + c.code + '" style="--vn:c-' + c.code + '" data-nopen="' + c.code + '">' + crHead(c) + '<div class="cb"><div class="nbox"></div></div></div>'; }).join('') + '</section>'; }).join('');
    var openT = 0, prevF = R.f;
    /* 2026-11-06: 同一大类里从一门课换到另一门课 (如 HP 里 EICL → SNS): 原地替换, 不再「旧行收起 + 新行展开 + 0.2 秒后再展开笔记列表」两段跳.
       新课程连同笔记列表一步到位, 只做淡入 + 轻微上浮; 所在组的高度从旧高度平滑过渡到新高度. */
    function swapCourse(from, to) { var o = el.querySelector('[data-nopen="' + from + '"]'), n = el.querySelector('[data-nopen="' + to + '"]'), g = n && n.closest('.grp');
      if (!o || !g || o.closest('.grp') !== g || g.classList.contains('k5off')) return false;
      (g.getAnimations ? g.getAnimations() : []).forEach(function (a) { if (a.id === 'swap') a.cancel(); }); var h0 = g.getBoundingClientRect().height;
      foldList(el, function (r) { return r.dataset.nopen; }, false);
      o.classList.remove('open'); delete OPEN[from]; var cb = $('.cb', n); cb.style.transition = 'none'; show(n, true); OPEN[to] = 1; void cb.offsetHeight; cb.style.transition = '';
      var h1 = g.getBoundingClientRect().height; g.style.overflow = 'clip';
      var a = g.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 300, easing: 'cubic-bezier(.22,.8,.24,1)' }); a.id = 'swap'; a.onfinish = a.oncancel = function () { g.style.overflow = ''; };
      n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,.8,.24,1)' });
      return true; }
    function applyF(anim) { clearTimeout(openT); spDrop(); var from = prevF; prevF = R.f;
      if (anim && !CALM && BY[from] && BY[R.f] && from !== R.f && swapCourse(from, R.f)) return;
      foldList(el, function (r) { return r.dataset.nopen; }, anim);
      if (anim) { $$('.cr.open', el).forEach(function (cr) { if (cr.dataset.nopen !== R.f) cr.classList.remove('open'); }); if (BY[R.f]) openT = setTimeout(function () { var cr = el.querySelector('[data-nopen="' + R.f + '"]'); if (cr && cr.isConnected && !cr.classList.contains('open')) cr.querySelector('.ch').click(); }, CALM ? 0 : 200); } }
    NOTESF = applyF; CLEAN.push(function () { NOTESF = null; clearTimeout(openT); }); applyF(false);
    function show(cr, on) { cr.classList.toggle('open', on); if (on) fill($('.nbox', cr), cr.dataset.nopen); }
    /* 页面最底部收起课程时, 页面会变短, 浏览器把滚动位置往回收, 整页往下滑一截.
       做法: 只在「这次收起会让页面不够高」时, 在列表后面临时垫一块等高的空白 (独立元素, 不碰列表本身);
       它滚出视口下方、换筛选、换页时一次去掉. 其余情况 (上方课程收起等) 交给浏览器自带的滚动锚定. */
    var sp = null, spOn = false; function spDrop() { if (sp) { sp.remove(); sp = null; } if (spOn) { removeEventListener('scroll', spChk); spOn = false; } }
    function spChk() { if (sp && sp.getBoundingClientRect().top >= innerHeight + 2) spDrop(); }
    function spNeed(closing) { var h = 0; closing.forEach(function (x) { var cb = $('.cb', x); if (cb) h += cb.offsetHeight; }); var need = Math.min(h, scrollY + innerHeight - (D.body.scrollHeight - h)); if (need <= 1) return; if (!sp) { sp = D.createElement('div'); sp.className = 'nsp9'; sp.setAttribute('aria-hidden', 'true'); el.appendChild(sp); } sp.style.height = ((parseFloat(sp.style.height) || 0) + need) + 'px'; if (!spOn) { addEventListener('scroll', spChk, { passive: true }); spOn = true; } }
    CLEAN.push(spDrop);
    /* 上方有展开的课程要收起时, 浏览器的滚动锚定会落在正在收起的内容上而失效; 这 0.4 秒里由这里让被点的那一行在屏幕上不动, 结束后恢复浏览器默认 */
    var pinT = 0; function pinRow(cr) { var top0 = cr.getBoundingClientRect().top, t0 = performance.now(); H.style.overflowAnchor = 'none'; cancelAnimationFrame(pinT); (function loop() { if (!cr.isConnected) { H.style.overflowAnchor = ''; return; } var d = cr.getBoundingClientRect().top - top0; if (Math.abs(d) > .5) scrollBy(0, d); if (performance.now() - t0 < 420) pinT = requestAnimationFrame(loop); else H.style.overflowAnchor = ''; })(); }
    CLEAN.push(function () { cancelAnimationFrame(pinT); H.style.overflowAnchor = ''; });
    el.addEventListener('click', function (e) { var h = e.target.closest('.ch'); if (!h) return; var cr = h.parentNode, on = !cr.classList.contains('open'), above = $$('.cr.open', el).filter(function (x) { return x !== cr && (x.compareDocumentPosition(cr) & 4); }); if (above.length) pinRow(cr); spNeed($$('.cr.open', el).filter(function (x) { return x !== cr || !on; })); $$('.cr.open', el).forEach(function (x) { if (x !== cr) { show(x, false); delete OPEN[x.dataset.nopen]; } }); show(cr, on); if (on) OPEN[cr.dataset.nopen] = 1; else delete OPEN[cr.dataset.nopen]; });
    $$('.cr', el).forEach(function (cr) { if (OPEN[cr.dataset.nopen]) show(cr, true); });
    if (BY[R.f] && !OPEN[R.f]) { var cr0 = el.querySelector('[data-nopen="' + R.f + '"]'), t0 = setTimeout(function () { if (cr0 && cr0.isConnected && !cr0.classList.contains('open')) cr0.querySelector('.ch').click(); }, CALM ? 0 : 300); CLEAN.push(function () { clearTimeout(t0); }); }
    }
  /* ---------- 阅读层 (导航方案 A): 笔记在本页的全屏框架里打开, 笔记文件不改.
     开: 目录内容淡出, 底色换成这门课的配色, 点中的标题升到笔记标题的位置, 笔记淡入; 两边的开关圆在同一位置, 笔记显示后才把本页的藏起来.
     关: 左上角「← 笔记」、浏览器返回或 Esc; 目录原样回来 (滚动位置、展开的课程). ---------- */
  var RDR = null;
  function courseOf(href) { var u = href.split('#')[0]; for (var i = 0; i < CS.length; i++) for (var j = 0; j < CS[i].notes.length; j++) if (CS[i].notes[j].f === u) return [CS[i], CS[i].notes[j]]; return null; }
  D.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href]'); if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.closest('#rdb')) return; var hit = courseOf(a.href); if (!hit) return; e.preventDefault(); openNote(a.href, hit, a); });
  function openNote(href, hit, a) { if (RDR) return; var mdl = $('#mdl'); if (mdl) { mdl.remove(); D.body.classList.remove('on'); }
    history.replaceState({ y: scrollY, open: OPEN }, '', location.hash); history.pushState({ rd: 1 }, '', '#/read/' + hit[0].code + '/' + encodeURIComponent(hit[1].fn) + (href.indexOf('#') > 0 ? '/' + href.split('#')[1] : ''));
    reader(href, hit, a); }
  function reader(href, hit, a) { var c = hit[0], y0 = scrollY; RDR = { y: y0, code: c.code };
    morph(); H.dataset.course = c.code; if (window.__bgRepal) window.__bgRepal(); H.classList.add('reading');
    /* 加载遮罩: 星座 A 盖住画面, 笔记加载完并停在目标位置后退场 (intro.js) */
    var mk = window.AtlasMark ? AtlasMark.play({ hold: true, fadeIn: true }) : null; RDR.mk = mk;
    var f = D.createElement('iframe'); f.id = 'rd'; f.title = hit[1].t; f.src = href; D.body.appendChild(f); RDR.f = f;
    if (mk) f.addEventListener('load', function () { settle(f, function () { mk.ready(); }); }, { once: true });
    var bar = D.createElement('div'); bar.id = 'rdb'; bar.innerHTML = '<button class="rdx" aria-label="回到笔记目录" title="回到笔记目录 (Esc)"><i class="rdi"></i></button>'; D.body.appendChild(bar); RDR.b = bar; $('.rdx', bar).onclick = leaveReader;
    /* 目录完全淡出 (260ms) 之后笔记才开始淡入, 两层不会叠在一起 */
    var t0 = performance.now(), shown = false, show = function () { if (shown) return; shown = true; setTimeout(function () { if (RDR && RDR.f === f) { H.classList.add('rdon'); try { f.focus(); } catch (e) {} } }, Math.max(0, 280 - (performance.now() - t0))); }; f.addEventListener('load', show, { once: true }); setTimeout(show, 650); }
  /* 笔记里的滚动位置连续 3 次 (约 240ms) 不变 = 已经停在目标位置; 读不到 (file:// 跨源) 就等 300ms; 最多等 3 秒 */
  function settle(f, cb) { var t0 = performance.now(), last = -1, n = 0; (function poll() { var y; try { y = f.contentWindow.scrollY; f.contentWindow.document.body; } catch (e) { return setTimeout(cb, 300); } if (y === last) n++; else { n = 0; last = y; } if (n >= 3 || performance.now() - t0 > 3000) cb(); else setTimeout(poll, 80); })(); }
  /* 返回键和 Esc: 直接关掉并把地址换回目录, 不靠浏览器后退 (笔记里点过链接后, 后退只会在笔记之间退) */
  function leaveReader() { if (!RDR) return; closeReader(); history.replaceState({ y: scrollY, open: OPEN }, '', '#/' + R.p + '/' + R.f + (R.node ? '/' + R.node : '')); }
  function closeReader() { if (!RDR) return; var R0 = RDR; RDR = null; if (R0.mk) R0.mk.end(); var m = null; try { m = localStorage.getItem('lmu-notes-mode'); } catch (e) {} if ((m === 'day') !== (H.dataset.mode === 'day')) { if (m === 'day') H.dataset.mode = 'day'; else delete H.dataset.mode; }
    H.classList.remove('rdon'); morph(); syncRail(); if (window.__bgRepal) window.__bgRepal(); scrollTo(0, R0.y); setTimeout(function () { H.classList.remove('reading'); }, CALM ? 0 : 240); setTimeout(function () { R0.f.remove(); R0.b.remove(); }, 600); }
  addEventListener('popstate', function () { if (RDR && !/^#\/read\//.test(location.hash)) closeReader(); else if (!RDR) { var m = /^#\/read\/(\w+)\/([^/]+)(?:\/(.+))?/.exec(location.hash); if (m && BY[m[1]]) { var n = BY[m[1]].notes.filter(function (x) { return x.fn === decodeURIComponent(m[2]); })[0]; if (n) reader(n.f + (m[3] ? '#' + m[3] : ''), [BY[m[1]], n], null); } } });
  addEventListener('keydown', function (e) { if (RDR && e.key === 'Escape') leaveReader(); });
  addEventListener('storage', function (e) { if (e.key === 'lmu-notes-mode') { if (e.newValue === 'day') H.dataset.mode = 'day'; else delete H.dataset.mode; if (window.__bgRepal) window.__bgRepal(); } });

  addEventListener('keydown', function (e) { var tag = e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey) return; if (e.key === '/') { e.preventDefault(); $('#q').focus(); } });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; shell(); render(true);
  if (R.p !== 'graph' && history.state && history.state.y) setTimeout(function () { scrollTo(0, history.state.y); }, 80);
  addEventListener('pagehide', function () { history.replaceState({ y: scrollY, open: OPEN }, '', location.hash); });
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(syncTop);
  if (BOOT) { history.pushState({ rd: 1 }, '', BOOT); dispatchEvent(new PopStateEvent('popstate')); }
})();
