# Atlas · 知识图册: 笔记 / 图谱 / 术语. 背景和开关圆来自 glass7 (lmu-course-notes skill); 内容来自 content/*.txt (人工) + cand/*.json (只读笔记). 不写任何笔记.
# 用法: python3 build.py  → 生成 ../Atlas.html (正式主页) 和 data/<课>.js. 说明见 README.md.
import os, sys, json, re, glob, math, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SRC = HERE + '/src/'; DATA = HERE + '/data'; PAGE = ROOT + '/Atlas.html'
# --repo <文件>: 另外写一份 GitHub 仓库用的主页 (仓库里每门课的笔记直接在课程文件夹下, 没有 笔记/ 这一层)
REPO_PAGE = sys.argv[sys.argv.index('--repo') + 1] if '--repo' in sys.argv else ''
import tempfile, shutil, unicodedata; TMPD = tempfile.mkdtemp(prefix='rv-data-'); REPO_BASE = {}  # 数据先写临时目录, 闸门通过后才替换 data/
src = open(HERE + '/lib/v14_base.py', encoding='utf-8').read()
# 复用 v14 的背景 / 胶囊 / 调色板 (不重写背景): 取到 course_tree 之前
exec(src[:src.index('from html.parser import HTMLParser')].replace("HERE = os.path.dirname(os.path.abspath(__file__)); V6 = HERE + '/../v6'", "V6 = HERE + '/lib/v6'"))
sys.path.insert(0, HERE + '/pipeline'); import content as K, candidates as CA
from candidates_rules import NOGRAPH, NONK_FILE
K.RELOCK = '--relock' in sys.argv

# 印刷网屏素材 (构建时生成, 用作 CSS mask): 半调网点 = 点的大小随位置变化; 抖动 = 4×4 Bayer 有序抖动
def _svg(w, h, body): return 'url("data:image/svg+xml,' + ("<svg xmlns='http://www.w3.org/2000/svg' width='%d' height='%d' viewBox='0 0 %d %d' shape-rendering='crispEdges'>%s</svg>" % (w, h, w, h, body.replace('"', "'"))).replace('<', '%3C').replace('>', '%3E').replace('#', '%23') + '")'
def raster_css():
    st = 6; dots = ''.join('<circle cx="%.0f" cy="%.0f" r="%.1f"/>' % (x + (st / 2 if (y // st) % 2 else 0), y + st / 2, st * .5 * (1 - x / 240) ** 1.1) for y in range(0, 24, st) for x in range(0, 240, st) if (1 - x / 240) > .04)
    R = 150; st2 = 8; rad = ''.join('<circle cx="%d" cy="%d" r="%.1f"/>' % (x, y, st2 * .46 * (1 - ((x - R) ** 2 + (y - R) ** 2) ** .5 / R) ** .8) for y in range(0, 2 * R, st2) for x in range(0, 2 * R, st2) if ((x - R) ** 2 + (y - R) ** 2) ** .5 < R * .97)
    B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]; c = 2; W, H = 32, 72
    dth = ''.join('<rect x="%d" y="%d" width="%d" height="%d"/>' % (i * c, j * c, c, c) for j in range(H // c) for i in range(W // c) if (1 - j / (H // c - 1)) * 1.15 - .08 > (B[j % 4][i % 4] + .5) / 16)
    dots2 = ''.join('<circle cx="%d" cy="%d" r="1"/>' % (x, 2) for x in range(2, 8, 4))
    return ':root{--m-hth:%s;--m-htr:%s;--m-dth:%s;--m-dot:%s}' % (_svg(240, 24, dots), _svg(2 * R, 2 * R, rad), _svg(W, H, dth), _svg(4, 4, '<circle cx="2" cy="2" r=".9"/>'))
def blk(sel, d): return sel + '{' + ''.join(f'--{k}:{v};' for k, v in d.items()) + '}'
CS, css = [], []
exec(re.search(r"^nn = .*?^css \+= \[blk\('html\[data-course=\"ALL\"\]'.*?$", src, re.S | re.M).group(0))
os.makedirs(DATA, exist_ok=True)
REPORT = {}
for folder, path in SR.course_dirs():
    files = sorted((x for x in os.listdir(path) if x.endswith('.html')), key=SR.note_key)
    if not files: continue
    code = files[0].split('-')[0]; mod = folder.split(' ', 1)[0]; g = re.match(r'[A-Z]+', mod).group(0)
    name, _ = SR.COURSE_INFO.get(folder, (folder, '')); zh, _, fo = name.partition(' · ')
    C = rv.get(folder); pal = C['pal'] if C else X.palette(open(os.path.join(path, files[0]), encoding='utf-8', errors='replace').read(400000))
    base = '/'.join(urllib.parse.quote(x) for x in os.path.relpath(path, ROOT).split(os.sep)) + '/'; notes = []; REPO_BASE[base] = urllib.parse.quote(re.sub(r'^([A-Z]+)(\d)(?!\d)', r'\g<1>0\2', unicodedata.normalize('NFC', folder).strip())) + '/'  # 仓库里课程文件夹编号补零 (同 sync_repo.repo_name)  # 相对主页的路径: 整个文件夹搬到哪里都能打开
    for f in files:
        t = SR.title_of(os.path.join(path, f))[0]; k = SR.note_type(f)[1]
        notes.append({'f': base + urllib.parse.quote(f), 'fn': f, 't': t, 'z': os.path.getsize(os.path.join(path, f)), 'k': 'ex' if k == 'Exercises' or re.search(r'R ?实践', f) else 'lit' if '文献' in f else 'lec'})
    has = os.path.exists(f'{HERE}/content/{code}.txt'); hub = ''
    if has and code in NOGRAPH: raise SystemExit(f'{code} 属于不做图谱和术语的课 (candidates_rules.NOGRAPH), 不应有 content/{code}.txt')
    if has:
        import contextlib, io
        with contextlib.redirect_stdout(io.StringIO()): CA.run(code)   # 先按当前笔记刷新锚点 (只读)
        data, rep = K.compile_course(code)
        data['newf'] = [n['t'] for n in notes if n['k'] == 'lec' and n['fn'] not in data['used'] and not NONK_FILE.search(n['t']) and not re.search(r'组织|欢迎|Organisation', n['t'])]  # 组织类、研讨课类讲次本来不进图谱
        data.pop('used'); REPORT[code] = rep; hub = data['hub']
        if data['newf']: print('新讲次未进图谱', code, data['newf'])
        if rep['errs']: sys.exit(f'{code} 校验失败: {rep["errs"]}')
        open(f'{TMPD}/{code}.js', 'w', encoding='utf-8').write('RV_LOAD(' + json.dumps(code) + ',' + json.dumps(data, ensure_ascii=False) + ');')
    CS.append({'code': code, 'mod': mod, 'g': g, 'zh': zh, 'fo': fo, 'notes': notes, 'has': has, 'base': base, 'hub': hub, 'nog': code in NOGRAPH})
    css += [blk(f'html[data-course="{code}"]', pal['n']), blk(f'html[data-course="{code}"][data-mode="day"]', pal['d']), f'.cx-{code}{{--cc:{pal["n"]["accent"]};--c:{pal["n"]["accent"]}}} html[data-mode="day"] .cx-{code}{{--cc:{pal["d"].get("accent", pal["n"]["accent"])};--c:{pal["d"].get("accent", pal["n"]["accent"])}}}']
G = [{'k': k, 'zh': v[0], 'de': v[1]} for k, v in SR.GROUPS.items() if any(c['g'] == k for c in CS)]
# 总览: 有内容的课在内圈, 其余在外圈, 按类别排
act = [c for c in CS if c['has']]; rest = [c for c in CS if not c['has']]; hubs = []
for i, c in enumerate(act):
    th = -math.pi / 2 + 2 * math.pi * i / max(1, len(act)); hubs.append({'code': c['code'], 'x': round(190 * math.cos(th)), 'y': round(170 * math.sin(th)) - 8})
for i, c in enumerate(rest):
    th = -math.pi / 2 + 2 * math.pi * (i + .5) / max(1, len(rest)); hubs.append({'code': c['code'], 'x': round(490 * math.cos(th)), 'y': round(345 * math.sin(th))})
BR = []
lab = {}
for c in act:
    for n in K.parse(c['code'])['N']: lab[(c['code'], n['id'])] = n['zh']
for ln in open(HERE + '/content/_bridges.txt', encoding='utf-8'):
    m = re.match(r'X (\w+):(\w+) ~ (\w+):(\w+) \| (.+)', ln)
    if not m: continue
    a, an, b, bn, why = m.groups()
    for k in ((a, an), (b, bn)):
        if k not in lab: sys.exit(f'跨课连线端点不存在: {k}')
    BR.append({'a': [a, an, lab[(a, an)]], 'b': [b, bn, lab[(b, bn)]], 'why': why.strip()})
js = open(SRC + 'core.js', encoding='utf-8').read().replace('/*__MOD__*/', ''.join(open(SRC + x, encoding='utf-8').read() for x in ('graph.js', 'terms.js'))).replace('__RING__', open(SRC + 'ring.js', encoding='utf-8').read()).replace('__TOUCH__', open(SRC + 'touch.js', encoding='utf-8').read())
page = open(SRC + 'shell.html', encoding='utf-8').read()
for a, b in (('/*__PAL__*/', '\n'.join(css) + '\n' + raster_css()), ('/*__PILL__*/', pill_css()), ('/*__CSS__*/', ''.join(open(p, encoding='utf-8').read() + '\n' for p in (SRC + 'app.css', SRC + 'keys.css', SRC + 'main.css'))), ('/*__IDX__*/', 'window.IDX=' + json.dumps({'courses': CS, 'groups': G, 'hubs': hubs, 'bridges': BR}, ensure_ascii=False).replace('</', '<\\/') + ';'), ('/*__BG__*/', bg_runtime()), ('/*__JS__*/', js), ('/*__INTRO__*/', open(SRC + 'intro.js', encoding='utf-8').read())):
    page = page.replace(a, b)
# 质量闸门: 每门有内容的课都要通过 cover.py (考点、覆盖、非知识排除). 不通过就不发布 (必须在写页面之前)
if '--nogate' not in sys.argv:
    import cover as _CV
    _bad = {code: _g for code, _g in ((c, _CV.report(c)['gate']) for c in REPORT) if _g}
    if _bad: raise SystemExit('闸门未通过, 详情见 cand/<课>.cover.txt: ' + str(_bad))
[os.remove(f) for f in glob.glob(DATA + '/*.js')]; [shutil.move(f, DATA) for f in glob.glob(TMPD + '/*.js')]; shutil.rmtree(TMPD, ignore_errors=True)
# 视觉层 (来自 skill, 笔记也用) 的手机判断在 Atlas 里换成 shell.html 开头的统一判断: iPad 和手机请求桌面网站都走桌面效果. 只改这个页面, 不动 skill
_LITE = "var LITE = matchMedia('(max-width: 640px) and (hover: none) and (pointer: coarse)').matches;"
if page.count(_LITE) != 1: raise SystemExit('视觉层的手机判断找不到了, 检查 glass 脚本')
page = page.replace(_LITE, 'var LITE = !!window.__LITE;')
open(PAGE, 'w', encoding='utf-8').write(page)
if REPO_PAGE:
    rp = page
    for a, b in sorted(REPO_BASE.items(), key=lambda x: -len(x[0])): rp = rp.replace('"' + a, '"' + b)
    open(REPO_PAGE, 'w', encoding='utf-8').write(rp)
# 给用户抽查: 被删名单
md = ['# 术语抽查: 每门课保留数和被删名单\n']
for code, r in REPORT.items():
    md.append(f'\n## {code}: 保留 {r["kept"]} / 粗体候选 {r["cands"]}\n')
    if r['dict']: md.append('未通过词典核对, 页面上不显示对应的冠词或复数: ' + '; '.join(str(x[1]) + ' (' + str(x[0]) + ')' for x in r['dict']) + '\n')
    if r['noquote']: md.append('没有匹配到课件原句 (页面上不显示原句): ' + '; '.join(r['noquote']) + '\n')
    last = None
    for a, w, z in r['drop']:
        if a != last: md.append(f'\n**{a}**\n'); last = a
        md.append(f'- {w} = {z}')
open(HERE + '/docs/term-audit.md', 'w', encoding='utf-8').write('\n'.join(md) + '\n')
for code, r in REPORT.items():
    if r['stale']['files'] or r['stale']['anchors']: print('需更新', code, r['stale'])
print('courses', len(CS), 'with content', len(act), os.path.getsize(PAGE) // 1024, 'KB', {k: (r['kept'], r['overlap']) for k, r in REPORT.items()})
