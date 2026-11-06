#!/usr/bin/env python3
# 德语名词的冠词和复数: Duden 优先, 查不到再用 DWDS, 再用 Wiktionary. 结果缓存在 cand/_woerter.json, 只查一次.
# 同形词: Duden 搜索页列出所有义项, 冠词相同直接用; 不同时取和人工冠词一致的义项 (Korpus: das = Sammlung, der = Leib).
# 义项不符 (词典里只有别的意思, 如 Type = Drucktype): 在课程 content 里写 NODICT 行, 该词典视为查不到.
import os, re, json, time, html, urllib.parse, urllib.request
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = f'{HERE}/cand/_woerter.json'
try: CACHE = json.load(open(P, encoding='utf-8'))
except Exception: CACHE = {}
UA = 'study-notes-terms-check/0.2'
BUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
G = {'maskulin': 'der', 'feminin': 'die', 'Neutrum': 'das', 'Maskulinum': 'der', 'Femininum': 'die'}
def save(): json.dump(CACHE, open(P, 'w', encoding='utf-8'), ensure_ascii=False)
def get(u, ua=UA):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': ua}), timeout=20).read().decode('utf-8', 'replace'); time.sleep(.35); return r
    except Exception as e:
        time.sleep(.35); return '' if '404' in str(e) else None
def txt(x): return re.sub(r'[ \t]+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x))).replace('\xad', '')
def clean_pl(p):
    """复数字段 → 列表: 去掉音标和括号, 按 und / oder / 斜杠 / 逗号分开"""
    p = re.split(r'Worttrennung|Aussprache|Deklinationstabelle|\(computer|Bl[aä]ttern|→', p)[0]
    p = re.sub(r'\[[^\]]*\]|\([^)]*\)', ' ', p); out = []
    for x in re.split(r'\s+(?:und|oder|auch)\s+|,|;|/', p):
        x = re.sub(r'^\s*die\s+', '', x).strip()
        if x and len(x) < 60 and not re.search(r'ohne|selten|kein|Plural|\d', x) and x not in out: out.append(x)
    return out
def arts(s): return [G[x] for x in ('maskulin', 'feminin', 'Neutrum', 'Maskulinum', 'Femininum') if x in s]
def nz(x): return x.lower().replace('ph', 'f').replace('th', 't').replace('c', 'k')
def duden(w, want='', hp=''):
    k = 'D:' + w
    if k not in CACHE:
        s = get('https://www.duden.de/suchen/dudenonline/' + urllib.parse.quote(w), BUA)
        if s is None: return None   # 网络错误不写缓存
        L = []
        for m in re.finditer(r'<section class="vignette">(.*?)</section>', s, re.S):
            b = m.group(1); h = re.search(r'href="/rechtschreibung/([^"]+)"', b); t = re.search(r'<h2.*?</h2>', b, re.S); sn = re.search(r'vignette__snippet">(.*?)</p>', b, re.S)
            if not (h and t and sn): continue
            title = txt(t.group(0)).strip(); sn = txt(sn.group(1)).strip()
            if 'Substantiv' in sn and w in [x.strip().replace('®', '') for x in title.split(',')]: L.append(dict(slug=h.group(1), a=arts(sn), sense=(sn.split('–')[1].strip() if '–' in sn else '')))
        CACHE[k] = L; save()
    L = CACHE[k]
    if not L: return None
    # 同一冠词有几个义项时 (Gewicht: Schwere / Jägersprache), 选复数和人工一致的那个
    cs = [x for x in L if want in x['a']] or L[:1]
    for e in cs:
        pk = 'DP:' + e['slug']
        if pk not in CACHE:
            s = get('https://www.duden.de/rechtschreibung/' + e['slug'], BUA)
            if s is None: return dict(src='Duden', a=e['a'], pl=[], sense=e['sense'], mean='', all=[x['a'] for x in L])
            t = re.sub(r'\s+', ' ', txt(s)); pl = []; mean = ''
            m = re.search(r'Grammatik ⓘ(.{0,200})', t)
            if m:
                g = re.split(r'Bl[aä]ttern|→|Zur Deklination', m.group(1))[0]
                if 'Plural:' in g: pl = clean_pl(g.split('Plural:')[1])
                elif 'Genitiv:' in g and ',' in g.split('Genitiv:')[1]: pl = clean_pl(g.split('Genitiv:')[1].split(',', 1)[1])
            i = s.find('id="bedeutung"'); i = i if i >= 0 else s.find('id="bedeutungen"')
            if i >= 0: mean = re.sub(r'\s+', ' ', txt(s[i:i + 900]))[:170]
            CACHE[pk] = dict(pl=pl, mean=mean); save()
        if not hp or any(nz(x) in nz(hp) for x in CACHE.get(pk, {}).get('pl', [])): break
    else: e = cs[0]; pk = 'DP:' + e['slug']
    d = CACHE[pk]
    return dict(src='Duden', a=e['a'], pl=d['pl'], sense=e['sense'], mean=d['mean'], all=[x['a'] for x in L])
def dwds(w, want='', hp=''):
    k = 'W:' + w
    if k not in CACHE:
        s = get('https://www.dwds.de/wb/' + urllib.parse.quote(w))
        if s is None: return None
        tt = re.search(r'<title>(.*?)[ –|]', s or ''); L = []   # 重定向到别的词条 (Dependent → Dependenz) 不算
        t = re.sub(r'\s+', ' ', txt(s)) if tt and tt.group(1).strip() == w else ''
        for m in re.finditer(r'Substantiv \((Maskulinum|Femininum|Neutrum)\)(.{0,120})', t):
            pm = re.search(r'Nominativ Plural: ([^·]+)', m.group(2)); L.append(dict(a=arts(m.group(1)), pl=clean_pl(pm.group(1)) if pm else [], auto='computergeneriert' in m.group(2)))
        CACHE[k] = L; save()
    L = CACHE[k]
    if not L: return None
    e = next((x for x in L if want in x['a']), L[0]); return dict(src='DWDS', a=e['a'], pl=e['pl'], sense='computergeneriert' if e['auto'] else '', mean='', all=[x['a'] for x in L])
def wikt(w, want='', hp=''):
    k = 'K:' + w
    if k not in CACHE:
        s = get('https://de.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=' + urllib.parse.quote(w))
        if s is None: return None
        r = None
        try:
            x = json.loads(s).get('parse', {}).get('wikitext', ''); de = x.split('({{Sprache|Deutsch}})', 1)
            if len(de) > 1:
                gs = sorted(set(re.findall(r'\|Genus(?: \d)?=([mfn])', de[1]))); pl = [p.strip() for p in re.findall(r'\|Nominativ Plural(?: \d)?=([^\n|]+)', de[1]) if p.strip() and p.strip() != '—']
                if gs: r = dict(a=[{'m': 'der', 'f': 'die', 'n': 'das'}[g] for g in gs], pl=pl)
        except Exception: pass
        CACHE[k] = r; save()
    r = CACHE[k]
    return dict(src='Wiktionary', a=r['a'], pl=r['pl'], sense='', mean='', all=[r['a']]) if r else None
BOOKS = [('Duden', duden), ('DWDS', dwds), ('Wiktionary', wikt)]
def exact_parts(t):
    w = t.split(); head = w[-1]
    # 名词后面还跟小写词 (Häufigkeit zweiter Ordnung, Theorem von Bayes) 时, 中心词是前面那个名词
    for i, x in enumerate(w[:-1]):
        if x[0].isupper() and w[i + 1][0].islower(): head = x; break
    l = [t] if ' ' not in t else []; l.append(head)
    if '-' in head: l.append(head.split('-')[-1].capitalize())
    out = []
    for x in l:
        if x not in out: out.append(x)
    return out
def tails(head):
    head = head.split('-')[-1]
    return [head[i:].capitalize() for i in range(3, len(head) - 4)]
def lookup(term, art='', skip=(), hp=''):
    """返回 (词典结果, 对应成分, 精确?). 精确 = 整词 / 中心词 / 连字符末段; 非精确 = 复合词的末尾成分, 只用来确认人工冠词, 不能推翻它.
    冠词取第一本查到的词典; 这本没给复数时, 复数继续往后查"""
    for k, (name, fn) in enumerate(BOOKS):
        if name in skip: continue
        for p in exact_parts(term):
            r = fn(p, art, hp)
            if r:
                if not r['pl']:
                    for n2, f2 in BOOKS[k + 1:]:
                        if n2 in skip: continue
                        r2 = f2(p, r['a'][0] if art not in r['a'] else art)
                        if r2 and r2['pl']: r['pl'] = r2['pl']; r['plsrc'] = n2; break
                return r, p, True
    for p in tails(exact_parts(term)[-1])[:10]:
        r = duden(p, art, hp)
        if r: return r, p, False
    return None, '', False
