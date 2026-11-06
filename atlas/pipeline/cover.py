#!/usr/bin/env python3
# v15 覆盖报告: 笔记里的每个小节 (h2/h3) 和每个加粗词, 要么对应到图谱概念 / 子概念 / 术语, 要么在 content/<课>.txt 里用 SKIP / DROP 写明理由.
# 用法: cover.py SMIS IML EICL  → 打印汇总, 明细写到 cand/<课>.cover.txt. 只读笔记材料 (cand/*.json), 不碰笔记.
import os, re, sys, json
import content as K
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 项目根 (atlas/)
from candidates_rules import META, BADNAME
def norm(s): return re.sub(r'[^0-9a-zäöüß一-鿿]+', ' ', str(s).lower()).strip()
def skips(code):
    S = {}
    for ln in open(f'{HERE}/content/{code}.txt', encoding='utf-8'):
        if ln.startswith('SKIP '):
            r, _, l = ln[5:].rstrip('\n').partition(' | ')
            for a in l.split(';'):
                if a.strip(): S[a.strip()] = r.strip()
    return S
def report(code):
    C = K.parse(code); cand = json.load(open(f'{HERE}/cand/{code}.json', encoding='utf-8')); SK = skips(code)
    names = []
    for n in C['N']: names += [n['zh'], n['de']]
    for t in C['T']: names += [t['t'], t['zh']] + t['alt']
    dp = f'{HERE}/content/{code}.deep.txt'
    if os.path.exists(dp):
        for ln in open(dp, encoding='utf-8'):
            if ln.startswith('S '):
                f = [x.strip() for x in ln[2:].split(' | ')]; names += [f[2], f[3]]
    NM = {norm(x) for x in names if len(norm(x)) >= 2}
    anchors = set()
    for x in C['N'] + C['T']:
        f, a = K.file_of(cand, x['sec']); anchors.add((f, a))
    rows = []; cov = 0; org = 0; tot = 0
    for s in cand['sections']:
        title = (s['zh'] + ' ' + s['de']).strip(); key = s['id']
        if not title: continue
        if s.get('nk') or META.search(title): org += 1; continue
        tot += 1
        hit = (s['file'], s['id']) in anchors
        if not hit:
            tn = norm(s['de']) + ' ' + norm(s['zh'])
            hit = any(m and (m in tn) for m in NM if len(m) >= 3)
        if hit: cov += 1; continue
        why = next((SK[k] for k in (key, s['de'].strip(), s['zh'].strip()) if k and k in SK), None)
        if why: rows.append(('跳过: ' + why, s)); cov += 1; continue
        rows.append(('未覆盖', s))
    d, r = K.compile_course(code)
    ex = [q[1] for x in cand['sections'] if (x['id'] == 'exam' and not x.get('nk')) or re.search(r'klausurrelevant|考试特别要看', x['zh'] + x['de'], re.I) for q in x['quotes']]   # 课程组织类 (nk) 的考试安排小节不是考点清单
    kp_miss = [q for q in ex if q not in r['kp']]
    nk = [x['zh'] for x in cand['sections'] if x.get('nk')]
    bold_un = [w for a, w, z in r['drop'] if a.startswith('未入选')]
    nq = len(r['noquote'])
    out = [f'考点清单: {len(ex) - len(kp_miss)}/{len(ex)} 条已对应到概念', f'连线出处: {len(d["edges"]) - len(r["noev"])}/{len(d["edges"])}', '排除的非知识小节: ' + ' / '.join(nk)] + [f'# {code} 覆盖报告', f'小节: {cov}/{tot} 已对应或已写理由 (另有 {org} 个课程组织类小节不计)', f'加粗词: {r["cands"] - len(bold_un)}/{r["cands"]} 已收录或已写理由', f'术语原句: {len(d["terms"]) - nq}/{len(d["terms"])}', '']
    for why, s in rows:
        if why == '未覆盖': out.append(f'未覆盖  {s["file"].split("-")[1]}:{s["id"]}  {s["zh"]} | {s["de"]}')
    for w in bold_un: out.append('未写理由的加粗词  ' + w)
    for q in kp_miss: out.append('考点未对应  ' + q)
    for e in r['noev']: out.append('连线无出处  ' + e)
    # 名称溯源: 每个中文名和外文名都要在笔记里出现 (组合名看各部分); 否则要写 ZH / DE 行说明依据
    zh_t = ' '.join(x['zh'] + ' ' + x['zh_txt'] for x in cand['sections']); de_t = ' '.join(x['de'] + ' ' + x['card'] + ' ' + x['zh_txt'] + ' ' + x['zh'] for x in cand['sections']).lower()
    def parts(w, sep): return [x.strip() for x in re.split(sep, w) if x.strip()]
    def zh_ok(w): return w in zh_t or all(x in zh_t for x in parts(w, r'与|、|和|及|:|：|的(?=[一-鿿])|\s+'))
    def de_ok(w): w = w.lower(); return w in de_t or all(x in de_t for x in parts(w, r'\s*(?:&|/|,|vs\.)\s*'))
    NAMES = [('分支', b['zh'], b['de']) for b in C['B']] + [('概念', n['zh'], n['de']) for n in C['N']] + [('术语', t['zh'], '') for t in C['T']]
    if os.path.exists(dp):
        for ln in open(dp, encoding='utf-8'):
            if ln.startswith('S '):
                f = [x.strip() for x in ln[2:].split(' | ')]; NAMES.append(('子概念', f[2], f[3]))
    zh_un = sorted({z for _, z, _d in NAMES if not zh_ok(z) and z not in C['ZH']}); de_un = sorted({d_ for _, _z, d_ in NAMES if d_ and not de_ok(d_) and d_ not in C['DE']})
    bad_n = sorted({z for _, z, d_ in NAMES if BADNAME.search(z + ' ' + d_)} | {n['one'][:30] for n in C['N'] if BADNAME.search(n['one'])})
    for z in zh_un: out.append('中文名无出处  ' + z)
    for d_ in de_un: out.append('外文名无出处  ' + d_)
    for z in bad_n: out.append('名称不规范  ' + z)
    # 闸门: 这些不为空就不能发布 (规则见 docs/extraction-rules.md)
    bad_a = [x['sec'] for x in C['N'] + C['T'] if any(q.get('nk') and (q['id'] == K.file_of(cand, x['sec'])[1] or q['h2'] == K.file_of(cand, x['sec'])[1]) and q['file'] == K.file_of(cand, x['sec'])[0] and K.file_of(cand, x['sec'])[1] for q in cand['sections'])]
    txt0 = open(f'{HERE}/content/{code}.txt', encoding='utf-8').read() + (open(dp, encoding='utf-8').read() if os.path.exists(dp) else '')
    gate = [f'小节未覆盖 {len([1 for w, _ in rows if w == "未覆盖"])}'] * bool([1 for w, _ in rows if w == '未覆盖']) + [f'加粗词没写理由 {len(bold_un)}'] * bool(bold_un) + [f'考点未对应 {len(kp_miss)}'] * bool(kp_miss) + [f'锚点指向非知识小节 {bad_a}'] * bool(bad_a) + ['内容里出现了易错提示'] * ('易错' in re.sub(r'(?m)^#.*$', '', txt0)) + [f'中文名无出处 {len(zh_un)}'] * bool(zh_un) + [f'外文名无出处 {len(de_un)}'] * bool(de_un) + [f'名称不规范 {bad_n}'] * bool(bad_n) + [f'内容校验错误 {r["errs"]}'] * bool(r['errs'])
    out = [('闸门未通过: ' + '; '.join(gate)) if gate else '闸门: 通过'] + out
    open(f'{HERE}/cand/{code}.cover.txt', 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    return dict(gate=gate, zh_un=zh_un, de_un=de_un, kp=(len(ex) - len(kp_miss), len(ex)), ev=(len(d['edges']) - len(r['noev']), len(d['edges'])), nk=len(nk), sec=(cov, tot), bold=(r['cands'] - len(bold_un), r['cands']), q=(len(d['terms']) - nq, len(d['terms'])), un=[s for w, s in rows if w == '未覆盖'], bu=bold_un)
if __name__ == '__main__':
    bad = []
    for c in sys.argv[1:]:
        x = report(c); bad = bad or x['gate']; print(('✗ ' + ' / '.join(x['gate']) + '\n') if x['gate'] else '', end=''); print(f'{c}: 考点 {x["kp"][0]}/{x["kp"][1]}  连线出处 {x["ev"][0]}/{x["ev"][1]}  排除非知识 {x["nk"]}  小节 {x["sec"][0]}/{x["sec"][1]}  加粗词 {x["bold"][0]}/{x["bold"][1]}  原句 {x["q"][0]}/{x["q"][1]}  未覆盖小节 {len(x["un"])}')
    sys.exit(1 if bad else 0)
