#!/usr/bin/env python3
# v15 第一步: 只读各课笔记, 产出候选材料 cand/<CODE>.json + cand/<CODE>.txt (给人/模型读).
# 不写笔记. 用法: candidates.py SMIS EICL IML
import os, re, sys, json, glob, html as H
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 项目根 (atlas/)
ROOT = os.path.dirname(HERE)  # Computerlinguistik/
CJK = re.compile(r'[一-鿿]')
def strip(x):
    x = re.sub(r'<annotation[^>]*>(.*?)</annotation>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<span class="katex-html".*?</span>\s*</span>\s*</span>', ' ', x, flags=re.S)
    x = re.sub(r'<img[^>]*>', ' [图] ', x); x = re.sub(r'<svg.*?</svg>', ' [图] ', x, flags=re.S)
    x = re.sub(r'<[^>]+>', '', x); return re.sub(r'\s+', ' ', H.unescape(x)).strip()
from candidates_rules import NONK, NONK_FILE
def dirs():
    for d in sorted(os.listdir(ROOT)):
        p = os.path.join(ROOT, d, '笔记')
        if os.path.isdir(p): yield d, p
def lect(p):
    return sorted(f for f in glob.glob(p + '/*.html') if not re.search(r'练习单|文献|R实践|R 实践', os.path.basename(f)))
def run(code):
    for d, p in dirs():
        fs = glob.glob(p + '/' + code + '-*.html')
        if fs: break
    else: raise SystemExit('no ' + code)
    out, secs, bold = [], [], {}; cur2 = ''; cur2nk = False
    for f in lect(p):
        s = open(f, encoding='utf-8', errors='replace').read(); fn = os.path.basename(f)
        if NONK_FILE.search(fn): print('  跳过整讲 (非知识):', fn); continue
        s = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
        s = re.sub(r'data:image/[^"\']+', '', s)
        out.append('\n#### FILE ' + fn)
        for m in re.finditer(r'(<h[23]\b[^>]*>)(.*?)</h[23]>(.*?)(?=<h[23]\b|\Z)', s, re.S):
            lvl = m.group(1)[2]; idm = re.search(r'id="([^"]+)"', m.group(1)); hid = idm.group(1) if idm else ''
            if not hid:   # 锚点写在紧挨着标题的外层 <section> / <article> 上 (MGTN 这类合集)
                pm = re.search(r'<(?:section|article|div)\b[^>]*\bid="([^"]+)"[^>]*>\s*$', s[max(0, m.start() - 400):m.start()]); hid = pm.group(1) if pm else ''
            parts = re.split(r'<br\s*/?>', m.group(2), maxsplit=1); zh = strip(parts[0]); de = strip(parts[1]) if len(parts) > 1 else ''
            body = m.group(3)
            if lvl == '2': cur2 = hid
            raw = re.findall(r'<div class="card (?:de|orig)">\s*<span class="(?:folie|slide)">([^<]+)</span>(.*?)\n</div>', body, re.S)
            cards = [(a, strip(b)) for a, b in raw]
            def units(b):   # 课件的单条列表项或段落; 带公式的不要, 嵌套列表只取本层文字
                out = []
                for u in re.findall(r'<li\b[^>]*>(.*?)(?=</li>|<ul|<ol)|<p\b[^>]*>(.*?)</p>', b, re.S):
                    x = u[0] or u[1]
                    if 'katex' in x or '<img' in x or '<svg' in x: continue
                    t = strip(x)
                    if t: out.append(t)
                return out
            quotes = [[a, t] for a, b in raw for t in units(b)]
            zhs = [strip(b) for b in re.findall(r'<div class="zh">(.*?)</div>', body, re.S)]
            bs = []
            for b in re.findall(r'<b>(.*?)</b>', body, re.S):
                t = strip(b)
                mm = re.match(r'^([A-Za-zÄÖÜäöüß][^一-鿿]*?)\s+([一-鿿].*)$', t)
                if mm and len(t) < 70: bs.append((mm.group(1).strip(), mm.group(2).strip())); bold.setdefault(mm.group(1).strip(), mm.group(2).strip())
            nk = bool(NONK.search(zh + ' ' + de)) or (lvl == '3' and cur2nk)
            if lvl == '2': cur2nk = nk
            if nk:
                for x, y in bs:
                    if bold.get(x) == y: bold.pop(x)
                bs = []
            sec = {'file': fn, 'id': hid, 'h2': cur2, 'cards': cards, 'quotes': quotes, 'lvl': lvl, 'zh': zh, 'de': de, 'folie': [a for a, _ in cards], 'card': ' / '.join(b for _, b in cards), 'zh_txt': ' '.join(zhs), 'nk': nk}
            secs.append(sec)
            lim = 420 if lvl == '3' else 200
            out.append(('## ' if lvl == '2' else '### ') + zh + ' | ' + de + ' #' + hid + ' ' + ','.join(sec['folie'])[:30])
            if sec['zh_txt']: out.append('  Z: ' + sec['zh_txt'][:lim])
            if sec['card']: out.append('  D: ' + sec['card'][:lim // 2])
            if bs: out.append('  B: ' + '; '.join(a + '=' + b for a, b in bs))
    json.dump({'code': code, 'dir': d, 'sections': secs, 'bold': bold}, open(f'{HERE}/cand/{code}.json', 'w', encoding='utf-8'), ensure_ascii=False)
    open(f'{HERE}/cand/{code}.txt', 'w', encoding='utf-8').write('\n'.join(out)); print(code, 'sections', len(secs), 'bold', len(bold), 'txt', sum(map(len, out)))
if __name__ == '__main__':
    for c in sys.argv[1:]: run(c)
