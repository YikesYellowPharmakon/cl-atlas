#!/usr/bin/env python3
# v15 第二步: content/<CODE>.txt (人工内容) + cand/<CODE>.json (笔记材料) → 校验 + 词典核对 + 原句匹配 + 图谱布局.
import os, re, json, math, random, time, urllib.parse, urllib.request
import woerter as W
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 项目根 (atlas/)
ROOT = os.path.dirname(HERE)  # Computerlinguistik/
RELOCK = False
from candidates_rules import NONK as BAN
LIM_ONE, LIM_PT = 64, 56
def parse(code):
    C = {'L': 'DE', 'H': '', 'B': [], 'N': [], 'E': [], 'T': [], 'DROP': {}, 'NOQ': set(), 'M': {}, 'Q': {}, 'KP': [], 'NODICT': {}, 'KA': {}, 'ZH': {}, 'DE': {}}
    for ln in open(f'{HERE}/content/{code}.txt', encoding='utf-8'):
        ln = ln.rstrip('\n')
        if not ln or ln[0] == '#': continue
        k, _, r = ln.partition(' '); f = [x.strip() for x in r.split(' | ')]
        if len(f) > {'B': 4, 'N': 8, 'T': 10, 'E': 2, 'M': 2}.get(k, 99): raise SystemExit(f'{code}: 字段过多 (正文里的竖线请写成 ∣): {ln[:80]}')
        if k == 'L': C['L'] = r.strip()
        elif k == 'H': C['H'] = r.strip()
        elif k == 'B': C['B'].append(dict(id=f[0], zh=f[1], de=f[2], one=f[3]))
        elif k == 'N':
            f += [''] * (8 - len(f)); f[7] = ' | '.join(f[7:]); C['N'].append(dict(id=f[0], b=f[1], zh=f[2], de=f[3], sec=f[4], one=f[5], pts=[x.strip() for x in f[6].split(';;') if x.strip()], ex=f[7]))
        elif k == 'E':
            m = re.match(r'(\w+) ([>~]) (\w+)$', f[0]); assert m, ln; C['E'].append(dict(a=m.group(1), kind=m.group(2), c=m.group(3), why=f[1] if len(f) > 1 else ''))
        elif k == 'T':
            f += [''] * (10 - len(f)); C['T'].append(dict(t=f[0], art=f[1], pl=f[2], zh=f[3], b=f[4], d=f[5], zd=f[6], vs=f[7], sec=f[8], alt=[x.strip() for x in f[9].split(';') if x.strip()]))
        elif k == 'NOQ': C['NOQ'] |= {x.strip() for x in r.split(';')}
        elif k == 'DROP': C['DROP'][f[0]] = [x.strip() for x in f[1].split(';') if x.strip()]
        elif k == 'KA': C['KA'][f[0]] = (f[1], f[2], f[3] if len(f) > 3 else '')   # 词典没有这个义项时, 按课件原文的冠词: 术语 | 冠词 | 课件里的原文片段 | 页码
        elif k == 'ZH': C['ZH'].update({x.strip(): f[0] for x in ' | '.join(f[1:]).split(';') if x.strip()})   # 笔记里没有这个写法的中文名: ZH 依据 | 名; 名
        elif k == 'DE': C['DE'].update({x.strip(): f[0] for x in ' | '.join(f[1:]).split(';') if x.strip()})   # 笔记里没有这个写法的外文名: DE 依据 | 名; 名
        elif k == 'NODICT': C['NODICT'][f[0]] = tuple(x.strip() for x in f[1].split(';'))   # 这些词典里只有别的义项, 视为查不到
        elif k == 'SKIP': pass   # 覆盖报告用 (cover.py)
        elif k == 'KP': C['KP'].append(dict(file=f[0], item=f[1], to=[x.strip() for x in f[2].split(';') if x.strip()]))   # 考点清单的一条 → 概念
        elif k == 'M': C['M'][f[0]] = f[1]   # 术语 → 图谱概念 (自动对应不准时手写)
        elif k == 'Q': C['Q'][f[0]] = (' | '.join(f[1:-1]) if len(f) > 2 else f[1], f[-1] if len(f) > 2 else '')   # 人工核对过的原句
        else: raise SystemExit('bad line ' + ln)
    # 分支 id 和概念 id 撞名时 (如 MGTN 的 menge), 图谱里分支和概念共用一张查找表会互相覆盖 (外圈弧线丢失、点分支打开概念).
    # 输出时给分支换一个不撞的 id, 并同步改所有引用它的 N / T 行; content/*.txt 原文不动.
    nid = {n['id'] for n in C['N']}
    for b in C['B']:
        if b['id'] in nid:
            old, new = b['id'], b['id'] + '_b'
            while new in nid: new += '_'
            b['id'] = new
            for n in C['N']:
                if n['b'] == old: n['b'] = new
            for t in C['T']:
                if t['b'] == old: t['b'] = new
    return C
def file_of(cand, sec):
    files = sorted({s['file'] for s in cand['sections']})
    if ':' in sec:
        n, a = sec.split(':', 1); hit = [f for f in files if re.search(r'-' + re.escape(n) + r'-', f)] or [f for f in files if n in f]; return (hit[0] if len(hit) == 1 else None), a   # 讲次号, 或文件名里的片段 (一门课有几个合集时)
    return (files[0] if len(files) == 1 else None), sec
def has_anchor(cand, f, a):
    return any(s['file'] == f and s['id'] == a for s in cand['sections'])
SOFT = []
def validate(code, C, cand):
    E = []; SOFT.clear(); B = {b['id'] for b in C['B']}; N = {n['id'] for n in C['N']}
    if len(N) != len(C['N']): E.append('节点 id 重复')
    for b in C['B']:
        if sum(n['b'] == b['id'] for n in C['N']) < 2: E.append('分支节点太少 ' + b['id'])
    for n in C['N']:
        if n['b'] not in B: E.append('分支不存在 ' + n['id'])
        f, a = file_of(cand, n['sec'])
        if not f or not has_anchor(cand, f, a): SOFT.append(('n', n['id']))
        if BAN.search(n['zh'] + ' ' + n['de']): E.append('无关内容 ' + n['zh'])
        if len(n['one']) > LIM_ONE: E.append(f'一句话过长 {n["id"]} {len(n["one"])}')
        if len(n['pts']) > 3: E.append('要点超过 3 条 ' + n['id'])
        for p in n['pts']:
            if len(p) > LIM_PT: E.append(f'要点过长 {n["id"]} {len(p)}: {p}')
    touch = set()
    for e in C['E']:
        for x in (e['a'], e['c']):
            if x not in N: E.append('连线端点不存在 ' + x)
        if not e['why']: E.append(f'连线没有理由 {e["a"]} {e["c"]}')
        touch |= {e['a'], e['c']}
    for x in N - touch: E.append('孤立节点 (无跨节点连线) ' + x)
    seen = set()
    for t in C['T']:
        if t['t'].lower() in seen: E.append('术语重复 ' + t['t'])
        seen.add(t['t'].lower())
        if t['b'] not in B: E.append('术语分支不存在 ' + t['t'])
        f, a = file_of(cand, t['sec'])
        if not f or not has_anchor(cand, f, a): SOFT.append(('t', t['t']))
        if not (t['d'] and t['zd']): E.append('术语缺定义 ' + t['t'])
    return E
BADQ = re.compile(r'Learning goals|What comes next|^Know |^Understand |^Be able |example /|S\\. \\d|Center for Information|Einführung in die Computerlinguistik ·|\\d+ Intro|[\u200b∑∏∈⇝]|\\bFolie\\b|Lernziele')
DEFV = re.compile(r'\\b(ist|sind|heißt|heißen|nennt|bezeichnet|misst|definiert|is|are|means|called|refers|quantifies|measures)\\b', re.I)
def find_quote(t, cand, f, a):
    """课件原句: 单条列表项, 逐字含术语, 是完整的一句话. 没有合格的就不显示"""
    words = [t['t']] + t['alt']
    def pat(w):   # 多词术语: 形容词可以变格, 但整个短语必须在
        ps = w.split(' '); ps = [re.escape(re.sub(r'e[rsmn]?$', '', x)) + r'[a-zäöüß]{0,3}' if i < len(ps) - 1 else re.escape(x) + r'[a-zäöüß]{0,3}' for i, x in enumerate(ps)]
        return re.compile(r'(?<![A-Za-zÄÖÜäöüß])' + r'\s+'.join(ps) + r'(?![A-Za-zÄÖÜäöüß])', re.I)
    pats = [pat(w) for w in words]
    best, bs = None, 3
    for s in cand['sections']:
        if s.get('nk'): continue
        same = s['file'] == f and (s['h2'] == a or s['id'] == a)
        for fol, q in s.get('quotes', []):
            if not 28 <= len(q) <= 210 or BADQ.search(q) or q.endswith((':', ',', ';', '–', '-')) or q.count(' ') < 4 or q.count('·') > 1: continue
            if not q[0].isupper() and not q[0] in '„“"(': continue
            m = next((x for x in (p.search(q) for p in pats) if x), None)
            if not m: continue
            if m.start() > 25 and not DEFV.search(q): continue
            sc = 2 * same + (s['file'] == f) + (3 if m.start() <= 25 else 0) + (2 if DEFV.search(q) else 0) + (1 if q.endswith('.') else 0)
            if sc > bs: best, bs = (q, fol), sc
    return best or ('', '')
def find_quote2(t, cand, f, a):
    """宽松一层: 课件里含这个术语 (逐字) 的一条, 长度合适, 不是标题/目标/公式. 同一小节 > 同一文件 > 其他. 结果要人工过目 (见 content.py 输出)"""
    words = [t['t']] + t['alt']
    pats = [re.compile(r'(?<![A-Za-zÄÖÜäöüß])' + r'\s+'.join(re.escape(x) for x in w.split(' ')) + r'(?:e|en|es|s|n|er)?(?![A-Za-zÄÖÜäöüß])', re.I) for w in words]
    best, bs = None, -1
    for s in cand['sections']:
        if s.get('nk'): continue
        same = s['file'] == f and (s['h2'] == a or s['id'] == a)
        for fol, q in s.get('quotes', []):
            q = q.strip()
            if not 18 <= len(q) <= 230 or BADQ.search(q) or q.count(' ') < 3 or q.count('·') > 1 or q.endswith((':', ',')): continue
            m = next((x for x in (p.search(q) for p in pats) if x), None)
            if not m: continue
            sc = 4 * same + 2 * (s['file'] == f) + (2 if DEFV.search(q) else 0) + (1 if m.start() <= 25 else 0) - len(q) / 400
            if sc > bs: best, bs = (q, fol), sc
    return best or ('', '')
# ---------- de.wiktionary ----------
DC_P = f'{HERE}/cand/_wikt.json'
try: DC = json.load(open(DC_P, encoding='utf-8'))
except Exception: DC = {}
def wikt(w):
    if w in DC: return DC[w]
    u = 'https://de.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=' + urllib.parse.quote(w)
    r = None
    try:
        q = urllib.request.Request(u, headers={'User-Agent': 'study-notes-terms-check/0.1'})
        d = json.load(urllib.request.urlopen(q, timeout=15)); x = d.get('parse', {}).get('wikitext', '')
        de = x.split('({{Sprache|Deutsch}})', 1)
        if len(de) > 1:
            body = de[1]; g = re.findall(r'\|Genus(?: \d)?=([mfn])', body); pl = re.findall(r'\|Nominativ Plural(?: \d)?=([^\n|]+)', body)
            if g: r = {'g': sorted(set(g)), 'pl': [p.strip() for p in pl if p.strip() and p.strip() != '—']}
    except Exception as e:
        print('  wikt err', w, e); return None
    DC[w] = r; time.sleep(.08); return r
ART = {'m': 'der', 'f': 'die', 'n': 'das'}
def check_noun(t):
    """返回 (art 是否核实, pl 是否核实, 说明). 找不到词条时看最长的后缀词"""
    head = t['t'].split()[-1]; parts = [head] + [head.split('-')[-1]] if '-' in head else [head]
    for i in range(1, len(head) - 3):
        if head[i - 1] in 's' or i > 2: parts.append(head[i:].capitalize())
    seen = []
    for p in parts:
        if p in seen or len(p) < 4 and p != head: continue
        seen.append(p); r = wikt(p)
        if not r: continue
        ok = t['art'] in [ART[x] for x in r['g']]
        plh = t['pl'].split()[-1] if t['pl'] and t['pl'] != '—' else ''
        plo = (not plh) or any(plh.endswith(x) or plh.endswith(x.lower()) for x in r['pl'])
        return ok, plo, f'{p}:{"/".join(r["g"])}:{",".join(r["pl"][:2])}', (p, r)
    return False, False, '查不到', None
# ---------- 布局 ----------
def box(n, big=False):
    zw = sum(14 if ord(c) > 255 else 7.5 for c in n['zh']) * (1.15 if big else 1); dw = len(n['de']) * 6.1
    return max(zw, dw) + 20, 48 if big else 42
def layout(C, W=1100, H=780):
    rnd = random.Random(7); P = {}; nb = len(C['B']); anch = {}
    for i, b in enumerate(C['B']):
        th = -math.pi / 2 + 2 * math.pi * i / nb; anch[b['id']] = (th, W * .19 * math.cos(math.atan2(math.sin(th), math.cos(th))), H * .19 * math.sin(th), th); P[b['id']] = [anch[b['id']][1], anch[b['id']][2]]
    for b in C['B']:
        kids = [n for n in C['N'] if n['b'] == b['id']]; th = anch[b['id']][0]
        for j, n in enumerate(kids):
            ph = th + (j - (len(kids) - 1) / 2) * (2 * math.pi / nb * .8 / max(1, len(kids) - 1)); r = .62 + (j % 3) * .17
            P[n['id']] = [W / 2 * r * math.cos(ph), H / 2 * r * math.sin(ph)]
    B = {n['id']: box(n) for n in C['N']}; B.update({b['id']: box(b, True) for b in C['B']}); B['_hub'] = (190, 80); P['_hub'] = [0, 0]
    ids = list(P); adj = [(e['a'], e['c'], .0022 if next(n for n in C['N'] if n['id'] == e['a'])['b'] == next(n for n in C['N'] if n['id'] == e['c'])['b'] else .0006) for e in C['E']]
    par = [(n['id'], n['b']) for n in C['N']]
    for it in range(900):
        cool = 1 - it / 900
        for a, c, k in adj:
            dx, dy = P[c][0] - P[a][0], P[c][1] - P[a][1]
            P[a][0] += dx * k * cool; P[a][1] += dy * k * cool; P[c][0] -= dx * k * cool; P[c][1] -= dy * k * cool
        for a, b in par:
            dx, dy = P[b][0] - P[a][0], P[b][1] - P[a][1]; d = math.hypot(dx, dy) or 1; f = (d - 150) / d * .012
            P[a][0] += dx * f; P[a][1] += dy * f
        for b in C['B']:   # 分支回到自己的方位
            P[b['id']][0] += (anch[b['id']][1] - P[b['id']][0]) * .05; P[b['id']][1] += (anch[b['id']][2] - P[b['id']][1]) * .05
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a, c = ids[i], ids[j]; dx, dy = P[c][0] - P[a][0], P[c][1] - P[a][1]
                ox = (B[a][0] + B[c][0]) / 2 + 10 - abs(dx); oy = (B[a][1] + B[c][1]) / 2 + 8 - abs(dy)
                if ox > 0 and oy > 0:
                    if ox < oy * 1.4:
                        s = (1 if dx >= 0 else -1) * ox * .3; P[a][0] -= s; P[c][0] += s
                    else:
                        s = (1 if dy >= 0 else -1) * oy * .3; P[a][1] -= s; P[c][1] += s
        for n in C['N']:   # 概念留在本分支的扇区, 分支之间不混
            x, y = P[n['id']]; ex, ey = x / (W / 2), y / (H / 2); r = math.hypot(ex, ey) or 1; th = math.atan2(ey, ex); t0 = anch[n['b']][3]; d = (th - t0 + math.pi) % (2 * math.pi) - math.pi; lim = math.pi / nb * .9; d = max(-lim, min(lim, d)); r = max(.34, min(1, r)); P[n['id']] = [(W / 2) * r * math.cos(t0 + d), (H / 2) * r * math.sin(t0 + d)]
        P['_hub'] = [0, 0]
    return {k: [round(v[0]), round(v[1])] for k, v in P.items()}, sum(1 for i in range(len(ids)) for j in range(i + 1, len(ids)) if abs(P[ids[i]][0] - P[ids[j]][0]) < (B[ids[i]][0] + B[ids[j]][0]) / 2 and abs(P[ids[i]][1] - P[ids[j]][1]) < (B[ids[i]][1] + B[ids[j]][1]) / 2)
def radial(C):
    """扇区布局: 每个分支一个扇区 (角度按概念数分配), 概念按先修深度从内到外. 坐标是单位圆上的角度 + 层, 画图时再换成椭圆"""
    N = {n['id']: n for n in C['N']}; pre = {k: [] for k in N}
    for e in C['E']:
        if e['kind'] == '>' and e['a'] in N and e['c'] in N: pre[e['c']].append(e['a'])
    memo = {}
    def lv(k, st=()):
        if k in memo: return memo[k]
        if k in st: return 0
        v = 0 if not pre[k] else 1 + max(lv(p, st + (k,)) for p in pre[k]); memo[k] = v; return v
    L = {k: min(3, lv(k)) for k in N}
    nb = len(C['B']); gap = .10; tot = 2 * math.pi - gap * nb
    cnt = {b['id']: max(2.5, sum(n['b'] == b['id'] for n in C['N'])) for b in C['B']}; S = sum(cnt.values())
    a = -math.pi / 2 - (cnt[C['B'][0]['id']] / S * tot) / 2; out = {}; bout = {}  # 分支和概念分开存: 有的课分支 id 和概念 id 相同 (如 MGTN menge), 混在一个表里会互相覆盖
    for b in C['B']:
        span = cnt[b['id']] / S * tot; a0, a1 = a, a + span; bout[b['id']] = dict(a0=round(a0, 4), a1=round(a1, 4)); a = a1 + gap
        kids = sorted([n for n in C['N'] if n['b'] == b['id']], key=lambda n: L[n['id']])
        # 每个扇区都铺满半径: 概念按先修深度从内到外分成几排, 外排弧长更长所以多放; rr 是这一排在半径上的位置 (0–1)
        n = len(kids); rows = min(n, 4, max(len({L[x['id']] for x in kids}), math.ceil(n / 3))) or 1
        base, extra = divmod(n, rows); k0 = 0; pad = span * .1
        for r in range(rows):
            m = base + (1 if r >= rows - extra else 0); ns = kids[k0:k0 + m]; k0 += m; step = (span - 2 * pad) / m
            for j, x in enumerate(ns):
                t = a0 + pad + step * (j + .5) + (step * (.24 if r % 2 else -.24) if rows > 1 else 0) * (1 if m > 1 else .6)
                out[x['id']] = dict(ang=round(max(a0 + pad * .5, min(a1 - pad * .5, t)), 4), lv=L[x['id']], rr=round((r + .5) / rows, 3))
    return bout, out
def compile_course(code, base_hrefs=None):
    C = parse(code); cand = json.load(open(f'{HERE}/cand/{code}.json', encoding='utf-8')); errs = validate(code, C, cand)
    bpos, pos = radial(C); rep = {'errs': errs, 'overlap': 0, 'dict': [], 'noquote': []}
    for x in C['B']: x.update(bpos[x['id']])
    nodes = []
    for n in C['N']:
        f, a = file_of(cand, n['sec']); n.update(pos[n['id']]); n.update(f=f, a=a); n.pop('sec'); nodes.append(n)
    terms = []
    for t in C['T']:
        f, a = file_of(cand, t['sec'])
        if t['t'] in C['Q']:
            q, fol = C['Q'][t['t']]; nq = re.sub(r'\s+', ' ', q)
            if not any(nq in re.sub(r'\s+', ' ', tx) for x in cand['sections'] for _, tx in x['cards']): raise SystemExit(f'{code}: Q 原句在课件里找不到 (要逐字): {t["t"]}')
        elif t['t'] in C['NOQ']: q, fol = '', ''
        else:
            q, fol = find_quote(t, cand, f, a)
            if not q:
                q, fol = find_quote2(t, cand, f, a)
                if q: rep.setdefault('loose', []).append((t['t'], q, fol))
        if not q: rep['noquote'].append(t['t'])
        o = dict(t=t['t'], zh=t['zh'], b=t['b'], d=t['d'], zd=t['zd'], f=f, a=a)
        if q: o['q'] = q; o['fol'] = fol
        if t['vs']: o['vs'] = t['vs']
        if t['alt']: o['alt'] = t['alt']
        if C['L'] == 'DE' and t['art']:
            hp = t['pl'] if t['pl'] != '—' else ''; hit, part, exact = W.lookup(t['t'], t['art'], C['NODICT'].get(t['t'], ()), hp); nz = W.nz; okp = hit and hp and any(nz(x) in nz(hp) for x in hit['pl'])
            if not hit:
                ka = C['KA'].get(t['t'])
                if ka:
                    if not any(ka[1] in tx for x in cand['sections'] for _, tx in x['cards']): raise SystemExit(f'{code}: KA 的原文片段在课件里找不到: {ka[1]}')
                    o['art'] = ka[0]; o['dsrc'] = '课件'
                else: rep['dict'].append(('查不到', t['t'], t['art'], '', '', ''))
            elif exact or t['art'] in hit['a']:
                o['art'] = t['art'] if t['art'] in hit['a'] else hit['a'][0]; o['dsrc'] = hit['src']
                if okp: o['pl'] = hp
                elif exact and hit['pl'] and part == t['t']: o['pl'] = hit['pl'][0]
                elif exact and hit['pl'] and t['t'].endswith(part) and '-' in t['t']: o['pl'] = t['t'][:-len(part)] + hit['pl'][0]
                if o['art'] != t['art'] or (hp and o.get('pl') != hp): rep['dict'].append(('改用' + hit['src'], t['t'], t['art'] + ' / ' + hp, o['art'] + ' / ' + o.get('pl', '—'), part + ' ' + hit.get('sense', ''), hit.get('mean', '')[:110]))
            else: rep['dict'].append(('末尾成分和人工冠词不符, 不显示', t['t'], t['art'], hit['a'], part, hit.get('mean', '')[:110]))
        terms.append(o)
    # 被删名单
    kept = {t['t'].lower() for t in C['T']} | {a.lower() for t in C['T'] for a in t['alt']}
    bold = cand['bold']; reason = {}
    for r, l in C['DROP'].items():
        for w in l: reason[w] = r
    drop = []
    for w, z in bold.items():
        if w.lower() in kept: continue
        drop.append((reason.get(w, '未入选, 无单独理由'), w, z))
    rep['drop'] = sorted(drop); rep['kept'] = len(terms); rep['cands'] = len(bold)
    # 笔记更新: 锚点没了 → st=2 (链接退到文件开头); 引用的笔记文件内容变了 → st=1. 基准在 content/<课>.lock.json
    import hashlib
    lockp = f'{HERE}/content/{code}.lock.json'; d0 = os.path.join(ROOT, cand['dir'], '笔记')
    def sha(f):
        try: return hashlib.sha1(open(os.path.join(d0, f), 'rb').read()).hexdigest()
        except OSError: return ''
    used = sorted({x['f'] for x in nodes + terms if x.get('f')}); now = {f: sha(f) for f in used}
    if RELOCK or not os.path.exists(lockp): json.dump(now, open(lockp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lock = json.load(open(lockp, encoding='utf-8')); chg = {f for f in used if lock.get(f) != now[f]}
    bad = {('n', k) for k, v in SOFT if k == 'n'} | set(SOFT)
    for n in nodes:
        if ('n', n['id']) in bad: n['st'] = 2; n['a'] = ''
        elif n.get('f') in chg: n['st'] = 1
    for t in terms:
        if ('t', t['t']) in bad: t['st'] = 2; t['a'] = ''
        elif t.get('f') in chg: t['st'] = 1
    rep['stale'] = dict(files=sorted(chg), anchors=[k for _, k in SOFT])
    json.dump(DC, open(DC_P, 'w', encoding='utf-8'), ensure_ascii=False)
    # 深层内容: 德语定义 / 讲解 / 下一级子概念 (content/<课>.deep.txt, 可选)
    dp = f'{HERE}/content/{code}.deep.txt'; NI = {n['id']: n for n in nodes}; nsub = 0
    if os.path.exists(dp):
        seen = set()
        for ln in open(dp, encoding='utf-8'):
            ln = ln.rstrip('\n')
            if not ln or ln[0] == '#': continue
            k, _, r = ln.partition(' '); f = [x.strip() for x in r.split(' | ')]
            if k in ('D', 'X'): f = [f[0], ' | '.join(f[1:])]
            if k == 'S': f = f[:4] + [' | '.join(f[4:])]
            if f[0] not in NI: raise SystemExit(f'{code}.deep: 概念不存在 {f[0]}')
            n = NI[f[0]]
            if k == 'D': n['dd'] = f[1]
            elif k == 'X': n['xp'] = f[1]
            elif k == 'S':
                sid = f[0] + '.' + f[1]
                if sid in seen: raise SystemExit(f'{code}.deep: 子概念 id 重复 {sid}')
                seen.add(sid); n.setdefault('sub', []).append(dict(id=sid, zh=f[2], de=f[3], one=f[4])); nsub += 1
            else: raise SystemExit('bad deep line ' + ln)
    rep['sub'] = nsub
    # 术语 ↔ 图谱概念: 名称 (原文 / 中文 / 别名) 对上概念或子概念就对应; 对不上的用 M 行手写. 结果: 术语 n (概念) + ns (子概念), 概念 tm (术语序号)
    def nm(x): return re.sub(r'[^0-9a-zäöüß一-鿿]+', '', str(x).lower())
    IX = {}
    for n in nodes:
        for w in [n['de'], n['zh']] + re.split(r'\s*(?:&|vs\.|und|and|、|与|和|,)\s*', n['de']):
            if nm(w): IX.setdefault(nm(w), (n['id'], ''))
    for n in nodes:
        for sb in n.get('sub', []):
            for w in [sb['zh'], sb['de']] + re.split(r'\s*(?:/|&|,)\s*', sb['de']):
                if nm(w): IX.setdefault(nm(w), (n['id'], sb['id']))
    unm = []
    for i, (t0, t) in enumerate(zip(C['T'], terms)):
        if t0['t'] in C['M']:
            v = C['M'][t0['t']]; nid = v.split('.')[0]
            if nid not in NI: raise SystemExit(f'{code}: M 行的概念不存在 {v}')
            m = (nid, v if '.' in v else '')
        else: m = next((IX[nm(w)] for w in [t0['t'], t0['zh']] + t0['alt'] if nm(w) in IX), None)
        if not m: unm.append(t0['t']); continue
        t['n'] = m[0]
        if m[1]: t['ns'] = m[1]
        NI[m[0]].setdefault('tm', []).append(i)
    rep['unmapped'] = unm
    # 考点清单: KP 行把每一条对应到概念 / 子概念; 概念带 kp (考点原文)
    rep['kp'] = []
    for x in C['KP']:
        for tg in x['to']:
            nid = tg.split('.')[0]
            if nid not in NI or ('.' in tg and not any(sb['id'] == tg for sb in NI[nid].get('sub', []))): raise SystemExit(f'{code}: KP 目标不存在 {tg}')
            if x['item'] not in NI[nid].setdefault('kp', []): NI[nid]['kp'].append(x['item'])
        rep['kp'].append(x['item'])
    # 名称表: 概念 + 子概念 + 对应术语, 用来给连线出处找归属
    def names(n):
        l = [n['zh'], n['de']] + re.split(r'\s*(?:&|vs\.|und|and|、|与|和|,)\s*', n['de']) + [sb['zh'] for sb in n.get('sub', [])] + [sb['de'] for sb in n.get('sub', [])] + [terms[i]['t'] for i in n.get('tm', [])] + [terms[i]['zh'] for i in n.get('tm', [])]
        return [w.lower() for w in l if w and (len(w) >= 4 or re.search(r'[一-鿿]{2}', w))]
    NM = {n['id']: names(n) for n in nodes}
    def has(txt, nid): t = txt.lower(); return any(w in t for w in NM[nid])
    SEC = [x for x in cand['sections'] if not x.get('nk')]
    # 连线出处: 两端概念都出现的那一节笔记, 优先目标概念自己的小节
    rep['noev'] = []
    for e in C['E']:
        best, bs = None, 0
        for x in SEC:
            txt = ' '.join([x['zh'], x['de'], x['card'], x['zh_txt']])
            if not (has(txt, e['a']) and has(txt, e['c'])): continue
            sc = 1 + 3 * (NI[e['c']].get('f') == x['file'] and NI[e['c']].get('a') in (x['id'], x['h2'])) + 2 * (NI[e['a']].get('f') == x['file'] and NI[e['a']].get('a') in (x['id'], x['h2'])) + (x['file'] == NI[e['c']].get('f'))
            if sc > bs: best, bs = x, sc
        if not best:   # 同一章里两端都出现 (章标题和子小节分开写的情况)
            for key in dict.fromkeys((x['file'], x['h2']) for x in SEC if x['h2']):   # 按笔记顺序遍历 (以前用集合, 同分时每次构建结果不同)
                tt = ' '.join(' '.join([x['zh'], x['de'], x['card'], x['zh_txt']]) for x in SEC if (x['file'], x['h2']) == key)
                if has(tt, e['a']) and has(tt, e['c']):
                    sc = 1 + 3 * (NI[e['c']].get('a') == key[1]) + 2 * (NI[e['a']].get('a') == key[1])
                    if sc > bs: best, bs = dict(file=key[0], id=key[1], h2=key[1]), sc
        if best: e['ev'] = [best['file'], best['id'] or best['h2']]
        else: rep['noev'].append(f"{e['a']} {e['kind']} {e['c']}")
    # 概念的原句: 对应术语里第一条有原句的; 没有就按概念的原文名找
    for n in nodes:
        q = next((terms[i] for i in n.get('tm', []) if terms[i].get('q')), None)
        if q: n['q'], n['fol'] = q['q'], q.get('fol', '')
        else:
            qq, ff = find_quote(dict(t=n['de'].split(' & ')[0].split(' vs. ')[0], alt=[]), cand, n.get('f'), n.get('a'))
            if qq: n['q'], n['fol'] = qq, ff
    return dict(lang=C['L'], stale=rep['stale'], used=used, hub=C['H'], branches=C['B'], nodes=nodes, edges=[[e['a'], e['c'], e['kind'], e['why']] + (e['ev'] if e.get('ev') else []) for e in C['E']], terms=terms), rep
if __name__ == '__main__':
    import sys
    for c in sys.argv[1:]:
        d, r = compile_course(c)
        print(f"== {c}: 节点 {len(d['nodes'])} 连线 {len(d['edges'])} 术语 {len(d['terms'])} / 候选 {r['cands']} 重叠 {r['overlap']}")
        print(' 错误:', r['errs'] or '无'); print(' 词典未核实:', r['dict'] or '无'); print(' 无原句:', len(r['noquote']), r['noquote'][:40])
        print(' 未给理由的删除:', [w for a, w, z in r['drop'] if a.startswith('未入选')])
