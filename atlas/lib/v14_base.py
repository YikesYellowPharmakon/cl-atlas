# 复习层 v11: 笔记页 + 十套模块方案 (图谱 / 词库 / 问答 / 模考). 背景和开关圆来自 glass7; 不用 backdrop-filter. 输出 site/index.html + site/d/<课>.js
import os, sys, json, re, glob, urllib.parse
SK = os.path.expanduser('~/.claude/skills/lmu-course-notes/scripts'); sys.path.insert(0, SK)
import sync_repo as SR
HERE = os.path.dirname(os.path.abspath(__file__)); V6 = HERE + '/../v6'; sys.path.insert(0, V6)
import extract as X
A = os.path.expanduser('~/.claude/skills/lmu-course-notes/assets/')
GJ = open(A + 'glass7.js', encoding='utf-8').read(); GC = open(A + 'glass7.css', encoding='utf-8').read()
def cut(a, b):
    i = GJ.index(a); return GJ[i:GJ.index(b, i)]
def sub(t, a, b):
    assert a in t, a
    return t.replace(a, b)
def bg_runtime():
    pre = sub(cut('    var doc = document.documentElement', '    /* ================= 结构整理'), "var auto = navigator.webdriver || /HeadlessChrome/.test(navigator.userAgent);", "var auto = (navigator.webdriver || /HeadlessChrome/.test(navigator.userAgent)) && !/[?&]live/.test(location.search);")
    pal = cut('    /* ================= 调色板', '    /* ================= 背景: 字符场')
    fld = sub(cut('    /* ================= 背景: 字符场', '    /* ================= 框的装置'), "e.target.closest('main, a, button, summary, #toc-pill')", "e.target.closest('main, a, button, input, #toc-pill, #top, #stg, #cpop')")
    trl = cut('    /* ================= 光标拖影', '    /* ================= 图片放大')
    rep = """    var setC = function (a, b) { if (a && b) { a[0] = b[0]; a[1] = b[1]; a[2] = b[2]; } };
    window.__bgRepal = function () { cs = getComputedStyle(doc); setC(ACC, rgbOf(cs.getPropertyValue('--accent'), ACC)); doc.style.removeProperty('--glow2'); mkGlow2(); setC(ACC2, rgbOf(getComputedStyle(doc).getPropertyValue('--glow2'), ACC2));
      [['add', BLUE], ['ok', LIME], ['ans', SUN], ['warn2', MAG], ['math', VIO], ['warn', RED], ['card', SLATE], ['zh2', ZH2]].forEach(function (p) { setC(p[1], K(p[0], p[1])); });
      var ink = rgbOf(cs.getPropertyValue('--ink'), [238, 246, 244]); INKP = doc.getAttribute('data-mode') === 'day' ? 'rgba(' + ink.join(',') + ',' : 'rgba(238,246,244,'; };
    window.__bgRepal();
"""
    return '(function () {\n  try {\n' + pre + pal + rep + fld + trl + '  } catch (e) { console.error(e); }\n})();\n'
def pill_css():
    src = re.sub(r'/\*.*?\*/', '', GC, flags=re.S); out = []
    def walk(s, wrap=None):
        i, n = 0, len(s)
        while i < n:
            o = s.find('{', i)
            if o < 0: break
            d, k = 1, o + 1
            while k < n and d:
                d += {'{': 1, '}': -1}.get(s[k], 0); k += 1
            sel, body = s[i:o].strip(), s[o + 1:k - 1]; i = k
            if sel.startswith('@media'):
                if 'print' not in sel: walk(body, sel)
            elif not sel.startswith('@') and 'html.lite' not in sel and re.search(r'#toc-pill|\.orb\b', sel):
                r = sel + '{' + body + '}'; out.append(wrap + '{' + r + '}' if wrap else r)
    walk(src); return '\n'.join(out)
D = json.load(open(V6 + '/data.json', encoding='utf-8')); rv = {c['dir'].strip(): c for c in D['courses']}
# 术语筛选: 课件里有原句或被考过才算; 跨课关系作底层数据
for c in D['courses']:
    c['terms'] = [t for t in c['terms'] if t.get('quote') or t.get('ex') or t.get('art')]
seen = {}
for c in D['courses']:
    for t in c['terms']: seen.setdefault(t['de'].lower(), []).append((c['code'], t['zh']))
for c in D['courses']:
    for t in c['terms']:
        o = [[a, b] for a, b in seen[t['de'].lower()] if a != c['code']]
        if o: t['other'] = o[:3]
from html.parser import HTMLParser
class Hd(HTMLParser):
    """收集 main 里 (不含原文卡片和目录) 的 h2 / h3 和站内链接"""
    def __init__(s): super().__init__(convert_charrefs=True); s.main = 0; s.card = 0; s.nav = 0; s.h = None; s.items = []; s.a = None; s.skip = 0
    def handle_starttag(s, t, at):
        at = dict(at); cl = (at.get('class') or '').split()
        if t == 'main': s.main = 1
        if not s.main: return
        if t in ('script', 'style'): s.skip += 1
        if t == 'nav': s.nav += 1
        if t == 'div' and s.card: s.card += 1
        elif t == 'div' and 'card' in cl: s.card = 1
        if t in ('h2', 'h3') and not s.card and not s.nav: s.h = {'t': t, 'id': at.get('id'), 'zh': '', 'de': '', 'br': False}
        elif s.h is not None and t == 'br': s.h['br'] = True
        if t == 'a' and at.get('href') and not s.nav: s.a = {'href': at['href'], 'txt': ''}
    def handle_endtag(s, t):
        if not s.main: return
        if t in ('script', 'style'): s.skip -= 1
        if t == 'nav': s.nav -= 1
        if t == 'div' and s.card: s.card -= 1
        if t in ('h2', 'h3') and s.h is not None and t == s.h['t']: s.items.append(s.h); s.h = None
        if t == 'a' and s.a is not None: s.items.append({'t': 'a', 'href': s.a['href'], 'txt': s.a['txt']}); s.a = None
    def handle_data(s, d):
        if s.skip or not s.main: return
        if s.h is not None:
            s.h['de' if s.h['br'] else 'zh'] += d
        if s.a is not None: s.a['txt'] += d
def nt(x): return re.sub(r'\s+', ' ', x).strip()
def course_tree(path, notes):
    """讲 → h2 → h3; 只有一篇时 h2 → h3; 一讲只有一个 h2 时不重复. rel = 第一层节点之间的真实互引"""
    lec = [urllib.parse.unquote(n['f'].rsplit('/', 1)[1]) for n in notes if n['k'] == 'lec']; ff, tops, links, where = lec, [], [], {}
    multi = len(lec) > 1
    for fi, f in enumerate(lec):
        P = Hd(); P.feed(open(os.path.join(path, f), encoding='utf-8', errors='replace').read()); h2s, cur2, cur3 = [], None, None; pend = []
        for it in P.items:
            if it['t'] == 'h2': cur2 = {'t': nt(it['zh']), 'd': nt(it['de']), 'f': fi, 'a': it['id'], 'k': []}; cur3 = None; h2s.append(cur2)
            elif it['t'] == 'h3':
                if cur2 is None: cur2 = {'t': nt(SR.title_of(os.path.join(path, f))[0]), 'd': '', 'f': fi, 'a': None, 'k': []}; h2s.append(cur2)
                cur3 = {'t': nt(it['zh']), 'd': nt(it['de']), 'f': fi, 'a': it['id'] or cur2['a']}; cur2['k'].append(cur3)
            elif cur2 is not None and not re.search(r'上一|下一|←|→|返回|目录', it['txt']): pend.append((cur2, it['href']))
        if multi:
            ti = re.sub(r'^\S+(?:\s+I+)?\s+(?:\d+|合集)\s*·\s*', '', SR.title_of(os.path.join(path, f))[0])
            if len(h2s) == 1: top = {'t': ti, 'd': h2s[0]['d'], 'f': fi, 'a': h2s[0]['a'], 'k': h2s[0]['k']}
            else: top = {'t': ti, 'd': '', 'f': fi, 'a': None, 'k': h2s}
            ti2 = len(tops); tops.append(top)
            for h in h2s: where[(fi, h['a'])] = ti2; [where.__setitem__((fi, x['a']), ti2) for x in h['k']]
            where[(fi, None)] = ti2
            links += [(ti2, fi, hr) for _, hr in pend]
        else:
            for h in h2s:
                i = len(tops); tops.append(h); where[(fi, h['a'])] = i
                for x in h['k']: where[(fi, x['a'])] = i
            links += [(tops.index(o), fi, hr) for o, hr in pend]
    rel = set()
    for i, fi, hr in links:
        fn, _, an = hr.partition('#'); fn = urllib.parse.unquote(fn)
        if '/' in fn or ':' in fn: continue
        tf = lec.index(fn) if fn in lec else (fi if not fn else None)
        if tf is None: continue
        j = where.get((tf, an or None), where.get((tf, None)))
        if j is not None and j != i: rel.add((min(i, j), max(i, j)))
    def slim(n):
        o = {'t': n['t'], 'f': n['f']}
        if n.get('d'): o['d'] = n['d']
        if n.get('a'): o['a'] = n['a']
        if n.get('k'): o['k'] = [slim(x) for x in n['k']]
        return o
    return [slim(n) for n in tops], ff, sorted(rel)
CS, css = [], []
def blk(sel, d): return sel + '{' + ''.join(f'--{k}:{v};' for k, v in d.items()) + '}'
nn = dict(D['neutral']['n'], **{'bg-a': '#0c0e10', 'bg-b': '#0d0f11', 'bg-c': '#0e1013', 'ink': '#e4e6e8', 'muted': '#8f969d', 'accent': '#d4d7da', 'glow': '#d4d7da', 'bg-g1': '#5aa9f0', 'bg-g2': '#9b82ff', 'k-zh2': '#7fd3ff', 'k-add': '#5aa9f0', 'k-ok': '#8fd94a', 'k-ans': '#f5df4a', 'k-warn': '#ff5a4a', 'k-warn2': '#e04fc8', 'k-math': '#9b82ff', 'k-card': '#8fa6c4'})
nd = dict(D['neutral']['d'], **{'bg-a': '#f4f3f0', 'bg-b': '#f1f0ec', 'bg-c': '#efeeea', 'ink': '#1d2024', 'muted': '#646a71', 'accent': '#2b2f34', 'glow': '#2b2f34', 'bg-g1': '#296fae', 'bg-g2': '#502da9', 'k-zh2': '#2f7fa8', 'k-add': '#296fae', 'k-ok': '#50841f', 'k-ans': '#b8a10a', 'k-warn': '#c9321f', 'k-warn2': '#ae2998', 'k-math': '#502da9', 'k-card': '#4d6280'})
css += [blk('html[data-course="ALL"]', nn), blk('html[data-course="ALL"][data-mode="day"]', nd)]
OUT = HERE + '/site'
for folder, path in SR.course_dirs():
    files = sorted((x for x in os.listdir(path) if x.endswith('.html')), key=SR.note_key)
    if not files: continue
    code = files[0].split('-')[0]; mod = folder.split(' ', 1)[0]; g = re.match(r'[A-Z]+', mod).group(0)
    name, _ = SR.COURSE_INFO.get(folder, (folder, '')); zh, _, fo = name.partition(' · ')
    C = rv.get(folder); pal = C['pal'] if C else X.palette(open(os.path.join(path, files[0]), encoding='utf-8', errors='replace').read(400000))
    base = 'file://' + urllib.parse.quote(path) + '/'; notes = []
    for f in files:
        t = SR.title_of(os.path.join(path, f))[0]
        k = SR.note_type(f)[1]; notes.append({'f': base + urllib.parse.quote(f), 't': t, 'k': 'ex' if k == 'Exercises' else 'lit' if '文献' in f else 'lec'})
    has = bool(C and (C['terms'] or C['questions']))
    ids = (['t:' + t['id'] for t in C['terms']] + ['q:' + q['id'] for q in C['questions']]) if has else []
    tree, ff, rel = course_tree(path, notes)
    if C and len(ff) == 1:   # 笔记补充层记下的先修也算真实联系
        ix = {n.get('a'): i for i, n in enumerate(tree)}; rel = sorted(set(map(tuple, rel)) | {(min(ix[s['id']], ix[x]), max(ix[s['id']], ix[x])) for s in C['sections'] for x in s.get('after', []) if s['id'] in ix and x in ix})
    CS.append({'code': code, 'mod': mod, 'tree': tree, 'ff': ff, 'rel': rel, 'g': g, 'zh': zh, 'fo': fo, 'notes': notes, 'has': has, 'base': base, 'ids': ids, 'c': [pal['n']['accent'], pal['d'].get('accent', pal['n']['accent'])]})
    css += [blk(f'html[data-course="{code}"]', pal['n']), blk(f'html[data-course="{code}"][data-mode="day"]', pal['d']), f'.cx-{code}{{--cc:{pal["n"]["accent"]};--c:{pal["n"]["accent"]}}} html[data-mode="day"] .cx-{code}{{--cc:{pal["d"].get("accent", pal["n"]["accent"])};--c:{pal["d"].get("accent", pal["n"]["accent"])}}}']
    if has:
        data = {k: C[k] for k in ('terms', 'questions', 'sections', 'exams', 'tasks', 'parts', 'lineage', 'dist', 'dist_of', 'basis') if k in C}
        open(f'{OUT}/d/{code}.js', 'w', encoding='utf-8').write('RV_LOAD(' + json.dumps(code) + ',' + json.dumps(data, ensure_ascii=False) + ');')
G = [{'k': k, 'zh': v[0], 'de': v[1]} for k, v in SR.GROUPS.items() if any(c['g'] == k for c in CS)]
def cat(pat): return '\n'.join(open(p, encoding='utf-8').read() for p in sorted(glob.glob(HERE + '/styles/' + pat)))
page = open(HERE + '/shell.html', encoding='utf-8').read()
for a, b in (('/*__PAL__*/', '\n'.join(css)), ('/*__PILL__*/', pill_css()), ('/*__CSS__*/', ''.join(open(HERE + '/' + f, encoding='utf-8').read() + '\n' for f in ('app.css', 'modules.css', 'keys.css'))), ('/*__IDX__*/', 'window.IDX=' + json.dumps({'courses': CS, 'groups': G}, ensure_ascii=False).replace('</', '<\\/') + ';'), ('/*__BG__*/', bg_runtime()), ('/*__JS__*/', open(HERE + '/core.js', encoding='utf-8').read().replace('/*__MOD__*/', open(HERE + '/modules.js', encoding='utf-8').read()))):
    page = page.replace(a, b)
open(OUT + '/index.html', 'w', encoding='utf-8').write(page); print('courses', len(CS), os.path.getsize(OUT + '/index.html') // 1024, 'KB')
