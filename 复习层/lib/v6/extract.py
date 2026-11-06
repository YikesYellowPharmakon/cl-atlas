# 复习层 v5 · 数据: 第一层 = 自动抽取 (任何课程, 不用 AI); 第二层 = 人工补充 (目前只有 SMIS), 按稳定 ID 叠加.
# 只读各课 笔记/, 不写任何笔记.
import re, os, glob, json, html as H, hashlib, colorsys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))  # 笔记根目录 (复习层/lib/v6/ 往上三级)
OUT = os.path.dirname(os.path.abspath(__file__))
CJK = re.compile(r'[一-鿿]')

def txt(x):
    x = re.sub(r'<span class="katex-mathml">.*?</span></span>', '', x, flags=re.S)
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()
def plain(seg):  # 不含公式的纯文字段落
    return None if 'katex' in seg else re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', seg))).strip()
def sid(*a): return hashlib.sha1('|'.join(a).encode()).hexdigest()[:10]

WANT = ['bg', 'ink', 'muted', 'line', 'card', 'code', 'accent', 'chip', 'zh', 'add', 'add-line', 'warn', 'warn-line', 'bg-a', 'bg-b', 'bg-c', 'k-zh', 'k-zh2', 'k-card', 'k-card2', 'k-add', 'k-add2',
        'k-warn', 'k-warn2', 'k-ok', 'k-ans', 'k-ans2', 'k-math', 'k-math2', 'bg-g1', 'bg-g2', 'glow']
def palette(note_html):
    css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', note_html, re.S)); n, d = {}, {}
    for b in re.findall(r':root\s*\{([^}]*)\}', css):
        for k, v in re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\b', b):
            if k in WANT: n[k] = v
    for b in re.findall(r'html\[data-mode="day"\]\s*\{([^}]*)\}', css):
        for k, v in re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\b', b):
            if k in WANT: d[k] = v
    m = re.search(r':root\s*\{[^}]*--accent:\s*(#[0-9a-fA-F]+)', css); n['accent'] = m.group(1)
    m = re.search(r':root\s*\{[^}]*--bg:\s*(#[0-9a-fA-F]+)', css); n['bg'] = m.group(1)
    n['glow'] = n['accent']; d.setdefault('glow', d.get('accent'))
    return {'n': n, 'd': d}

def neutral(p):  # 「全部」视图: 同一套结构, 去饱和 (红黄绿三色保留)
    def gray(c, s=.08):
        c = c.lstrip('#'); r, g, b = (int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)); h, l, _ = colorsys.rgb_to_hls(r, g, b)
        r, g, b = colorsys.hls_to_rgb(.6, l, s); return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))
    keep = {'k-ok', 'k-ans', 'k-ans2', 'k-warn', 'k-warn2', 'warn', 'warn-line'}
    return {m: {k: (v if k in keep else gray(v, .1 if k in ('accent', 'glow', 'k-zh', 'k-zh2') else .05)) for k, v in p[m].items()} for m in p}

def course_title(nd, code):
    m = re.search(r'<h1>(.*?)<br>.*?de-title">(.*?)</span>', nd, re.S)
    return (txt(m.group(1)).replace(' · 练习单合集', '').strip(), txt(m.group(2))) if m else (code, '')

def extract(cdir):
    notes = sorted(glob.glob(cdir + '/笔记/*.html'))
    if not notes: return None
    code = os.path.basename(notes[0]).split('-')[0]
    lect = [f for f in notes if '练习单' not in f and '文献' not in f]
    sheet = [f for f in notes if '练习单' in f]
    numbered = [f for f in lect if re.match(r'.*/' + re.escape(code) + r'-\d+', f)]
    main = (numbered or lect)[0] if (numbered or lect) else notes[0]
    mh = open(main, encoding='utf-8').read()
    C = {'code': code, 'dir': os.path.basename(cdir), 'pal': palette(mh), 'sections': [], 'terms': [], 'questions': [], 'exams': [], 'tasks': []}
    # 课程名: 合集主笔记的 h1, 编号笔记则取总目录登记名
    C['name'], C['full'] = course_title(open((lect or notes)[0], encoding='utf-8').read(), code)
    NAMES = {'DBS': ('数据库系统', 'Datenbanksysteme'), 'SNS': ('自然语言句法', 'Syntax natürlicher Sprachen'), 'BS': ('操作系统', 'Betriebssysteme'), 'EIPS': ('计算机语言学编程导论', 'Einführung in die Programmierung'),
             'EICL': ('计算语言学导论', 'Einführung in die Computerlinguistik'), 'SP': ('符号程序设计语言', 'Symbolische Programmiersprache'), 'IE': ('信息抽取', 'Informationsextraktion'),
             'FS': ('形式语言', 'Formale Sprachen'), 'STE': ('科技英语写作', 'Scientific & Technical English'), 'MIT1805': ('概率与统计导论', 'MIT 18.05'), 'DPNLP1': ('深度学习自然语言处理 I', 'Deep Learning for NLP I'),
             'DPNLP2': ('深度学习自然语言处理 II', 'Deep Learning for NLP II'), 'AEAL': ('学术英语', 'Academic English'), 'EIP': ('计算机语言学编程导论', 'Einführung in die Programmierung'), 'MGTN': ('数学基础', 'Mathematische Grundlagen'),
             'SMIS': ('语言处理中的统计方法', 'Statistische Methoden in der Sprachverarbeitung')}
    if code in NAMES: C['name'], C['full'] = NAMES[code]
    # 章节
    if numbered:
        for f in numbered:
            s = open(f, encoding='utf-8').read(); n = re.match(r'.*-(\d+)-', f).group(1); t = re.search(r'<title>[^·]*·\s*(.*?)</title>', s)
            de = re.search(r'<h1>.*?de-title">(.*?)</span>', s, re.S)
            C['sections'].append({'id': f'n{n}', 'n': n, 'zh': (t.group(1) if t else os.path.basename(f)), 'de': txt(de.group(1)) if de else '', 'file': os.path.basename(f), 'anchor': '', 'can': [], 'after': [], 'heat': None, 'pages': ''})
    else:
        for f in lect:
            s = open(f, encoding='utf-8').read()
            for i, m in enumerate(re.finditer(r'<h2 id="([^"]+)">(.*?)<br><span class="de-title">(.*?)</span></h2>', s, re.S)):
                C['sections'].append({'id': m.group(1), 'n': f'{i+1:02d}', 'zh': txt(m.group(2)), 'de': txt(m.group(3)), 'file': os.path.basename(f), 'anchor': m.group(1), 'can': [], 'after': [], 'heat': None, 'pages': ''})
    secfile = {}
    for s in C['sections']: secfile.setdefault(s['file'], []).append(s)
    def sec_at(f, pos, s_html):
        lst = secfile.get(os.path.basename(f), [])
        if len(lst) == 1: return lst[0]['id']
        best = None
        for sc in lst:
            p = s_html.find(f'<h2 id="{sc["anchor"]}"')
            if 0 <= p <= pos: best = sc['id']
        return best or (lst[0]['id'] if lst else None)
    # 术语: <b>外文 中文</b>
    seen = {}
    for f in lect:
        s = open(f, encoding='utf-8').read()
        segs = [(plain(x), y.group(1)) for y in re.finditer(r'<div class="card de">\s*<span class="folie">([^<]+)</span>(.*?)\n</div>', s, re.S) for x in re.findall(r'<(?:li|p)[^>]*>(.*?)</(?:li|p)>', y.group(2), re.S)]
        segs = [(a, b) for a, b in segs if a]
        for m in re.finditer(r'<b>([^<]{3,70})</b>', s):
            t = H.unescape(m.group(1)).strip(); mm = re.match(r'^([A-Za-zÄÖÜäöüß][^一-鿿]*?)\s+([一-鿿][^A-Za-z]*)$', t)
            if not mm or t.endswith(':'): continue
            de, zh = mm.group(1).strip(), mm.group(2).strip()
            if len(de) < 3 or de.lower() in seen: continue
            q = next(((a, b) for a, b in segs if de.lower() in a.lower() and 20 < len(a) < 260), (None, None))
            seen[de.lower()] = 1
            C['terms'].append({'id': 't-' + sid(code, de), 'sec': sec_at(f, m.start(), s), 'de': de, 'zh': zh, 'art': None, 'pl': None, 'col': [], 'quote': q[0] or '', 'src': q[1] or '', 'auto': True})
    # 练习单: 带折叠答案的题 → 卡; 考试小节 → 试卷库
    for f in sheet:
        s = open(f, encoding='utf-8').read()
        parts = re.split(r'(?=<h2[ >])', s)
        for p in parts[1:]:
            hm = re.match(r'<h2[^>]*>(.*?)</h2>', p, re.S); title = txt(hm.group(1)) if hm else ''
            anc = re.search(r'id="([^"]+)"', p[:300]) or re.search(r'<section[^>]*id="([^"]+)"', s[max(0, s.find(p) - 200):s.find(p)])
            link = re.search(r'href="(' + re.escape(code) + r'-(\d+)-[^"#]+\.html)', hm.group(1) if hm else '')
            chap = f'n{link.group(2)}' if link and any(x['id'] == f'n{link.group(2)}' for x in C['sections']) else None
            is_exam = bool(re.search(r'考试|Klausur|Prüfung|Exam', title)) and '导读' not in title
            body_txt = txt(p)
            if is_exam:
                topics = [txt(x).split('Aufgabe')[0].strip() for x in re.findall(r'<h3[^>]*>(.*?)<br', p, re.S)]
                kind = 'V' if re.search(r'Vorlesung|讲座', title) else 'U' if re.search(r'Übung|练习课', title) else ''
                C['exams'].append({'id': 'x-' + sid(code, title), 'title': title.split('Schrift')[0].split('源文件')[0].strip(), 'kind': kind, 'anchor': anc.group(1) if anc else '', 'file': os.path.basename(f), 'topics': topics[:8], 'text': body_txt.lower()[:20000]})
            for qm in re.finditer(r'(<h3[^>]*>(.*?)</h3>)?\s*(<div class="card de">.*?\n</div>)\s*(?:<div class="zh">(.*?)</div>\s*)?<details class="answer">.*?</summary>(.*?)</details>', p, re.S):
                qd, qz, ans = qm.group(3), qm.group(4) or '', qm.group(5)
                if 'katex' in qd or 'katex' in ans or '<img' in qd or '<img' in ans: continue
                qt, at = txt(re.sub(r'<span class="folie">[^<]*</span>', '', qd)), txt(ans)
                if not (20 < len(qt) < 1400 and 5 < len(at) < 2400): continue
                ahtml = re.sub(r'\s+(class="nb")', '', ans.strip()); ahtml = re.sub(r'<span>(.*?)</span>', r'\1', ahtml)
                src = re.search(r'<span class="folie">([^<]+)</span>', qd)
                C['questions'].append({'id': 'p-' + sid(code, qt[:80]), 'sec': chap, 'type': 'x' if is_exam else 'u', 'q': H.escape(qt), 'qzh': txt(qz)[:500], 'a': ahtml, 'src': (src.group(1) if src else '') + ' · ' + title.split('Schrift')[0][:24], 'sheet': os.path.basename(f), 'anchor': anc.group(1) if anc else ''})
    C['basis'] = 'past' if C['exams'] else 'exercises' if C['questions'] else None
    # 术语在往年考题里出现几次
    for t in C['terms']:
        w = t['de'].lower(); t['ex'] = sum(1 for e in C['exams'] if len(w) >= 4 and w in e['text'])
    for e in C['exams']: e.pop('text')
    return C

def smis_overlay(C):
    D = json.load(open(ROOT + '/HP10 SMIS/复习/SMIS-复习数据.json', encoding='utf-8'))
    for s in D['sections']: s['file'] = 'SMIS-合集-语言处理中的统计方法.html'; s['anchor'] = s['id']
    C['sections'] = D['sections']; C['parts'] = D['parts']; C['lineage'] = D['lineage']
    auto = {t['de'].lower(): t for t in C['terms']}
    for t in D['terms']: t['ex'] = auto.get(t['de'].lower(), {}).get('ex', 0)
    # 补 ex: 自动层没找到的, 用考试目录再数一次
    C['terms'] = D['terms']
    C['questions'] = D['questions'] + [q for q in C['questions'] if q['type'] == 'u']
    C['tasks'] = D['exam']['tasks']; C['dist'] = D['exam']['dist']; C['dist_of'] = D['exam']['dist_of']
    PAIRS = [('Token', 'Type'), ('Apriori-Wahrscheinlichkeit', 'Aposteriori-Wahrscheinlichkeit'), ('generatives Modell', 'diskriminatives Modell'), ('Forward-Wahrscheinlichkeit', 'Backward-Wahrscheinlichkeit'),
             ('Inside-Wahrscheinlichkeit', 'Outside-Wahrscheinlichkeit'), ('Kontextwahrscheinlichkeit', 'lexikalische Wahrscheinlichkeit'), ('Baseline', 'Obergrenze'), ('Entwicklungsdaten', 'Goldstandard'),
             ('Mutual Information', 'punktweise Mutual Information'), ('relative Entropie', 'Crossentropie'), ('Varianz', 'Standardabweichung'), ('gemeinsame Entropie', 'bedingte Entropie')]
    byde = {t['de']: t for t in C['terms']}
    for a, b in PAIRS:
        if a in byde and b in byde: byde[a]['vs'] = b; byde[b]['vs'] = a
    return C

RUBRIC = {
 'x-ws1718-a1': [('Formel: p(x|y) = p(y|x) · p(x) / p(y)', .5), ('ein Beispiel aus dem Kurs (HMM: unbekannte Wörter, oder Naive Bayes)', .5)],
 'x-ws1718-a2': [('E(−log p(X)) = −Σ p(x) log p(x)', .5), ('Name: Entropie', .5)],
 'x-ws1718-a3': [('p(w₃|w₁,w₂) = f(w₁,w₂,w₃) / f(w₁,w₂)', 1)],
 'x-ws1718-a4': [('max(0, f(w₁,w₂,w₃) − δ) / f(w₁,w₂)', .75), ('+ α(w₁,w₂) · p̂(w₃|w₂), rekursiv bis p(w₃)', .75), ('δ = N₁ / (N₁ + 2N₂)', .75), ('α(w₁,w₂) = δ · |{w : f(w₁,w₂,w) > 0}| / f(w₁,w₂)', .75)],
 'x-ws1718-a5': [('bedingte Wahrscheinlichkeit / Bayes: p(t|w) = p(t,w)/p(w)', .75), ('p(w) ist konstant und fällt bei arg max weg', .75), ('Kettenregel zerlegt p(t,w)', .75), ('Markow-Annahme + wᵢ hängt nur von tᵢ ab', .75)],
 'x-ws1718-a6': [('E-Schritt: erwartete Häufigkeiten mit den aktuellen Parametern', .5), ('M-Schritt: Parameter aus den erwarteten Häufigkeiten neu schätzen', .5)],
 'x-ws1718-a7': [('α: Initialisierung αt(0) = 1 für ⟨s⟩', 1), ('α: Rekursion mit Σ über t′', 1), ('β: Initialisierung βt(n+1) = 1 für ⟨/s⟩', 1), ('β: Rekursion, Emission der nächsten Position', 1), ('γt(i) = αt(i) βt(i) / α⟨/s⟩(n+1)', 1)],
 'x-ws1718-a8': [('mehrere Tests → zufällige Signifikanz wahrscheinlicher (≈ 14 %)', .5), ('Korrektur, z. B. Bonferroni 0,05/3', .5)],
 'x-ws1718-a10': [('Zähler exp(θ · f(x, y))', 1), ('Normierung: Σ über alle Klassen y′', 1)],
 'x-ws2021-a5': [('δA(1) = 0,25', 1), ('δA(2) = 0,0625', 1), ('δA(3) = 0,015625 und δB(3) = 0', 1), ('δ⟨s⟩(4) = 0,0078125 mit ψ = A', 1), ('beste Tagfolge A A A', 1)],
}

def main():
    courses = []
    for cdir in sorted(glob.glob(ROOT + '/*/')):
        cdir = cdir.rstrip('/')
        try: C = extract(cdir)
        except Exception as e: print('skip', cdir, e); continue
        if not C or not C['sections']: continue
        if C['code'] == 'SMIS': C = smis_overlay(C)
        for t in C['tasks']: t['rubric'] = [{'t': a, 'w': b} for a, b in RUBRIC.get(t['id'], [(t['a_de'], t['pts'])])]
        courses.append(C)
    order = ['SMIS', 'DBS', 'SNS', 'EIPS', 'EICL', 'SP', 'DPNLP1', 'DPNLP2', 'FS', 'IE', 'BS', 'STE', 'EIP', 'MGTN', 'AEAL']
    courses.sort(key=lambda c: order.index(c['code']) if c['code'] in order else 99)
    smis = next(c for c in courses if c['code'] == 'SMIS')
    data = {'courses': courses, 'neutral': neutral(smis['pal']), }
    json.dump(data, open(OUT + '/data.json', 'w', encoding='utf-8'), ensure_ascii=False)
    for c in courses:
        print(f"{c['code']:7} sec {len(c['sections']):3} terms {len(c['terms']):4} q {len(c['questions']):4} exams {len(c['exams']):3} basis {c['basis']}")
    print(os.path.getsize(OUT + '/data.json') // 1024, 'KB')

if __name__ == '__main__':
    main()
