#!/usr/bin/env python3
"""check_data.py — 构建后的数据体检 (不打开浏览器, 几秒钟).

用法: python3 tests/check_data.py        有问题时退出码 1
检查每门课 data/<课>.js:
  1. 分支 id 和概念 id 不撞名; id 不重复
  2. 每个概念的分支存在; 连线两端存在
  3. 先修关系 (>) 没有环
  4. 分支角度有效 (外圈弧线能画出来), 概念角度在所属分支范围内
  5. 跨课连线 (首页 IDX.bridges) 两端都存在
"""
import json, math, os, re, sys, glob
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ROOT = os.path.dirname(HERE)
bad = []
def err(code, msg): bad.append(f'{code}: {msg}')
def load(p):
    s = open(p, encoding='utf-8').read(); i = s.index(','); return json.loads(s[i + 1:s.rindex(')')])
DATA = {}
for p in sorted(glob.glob(HERE + '/data/*.js')):
    code = os.path.basename(p)[:-3]; d = DATA[code] = load(p)
    B = [b['id'] for b in d['branches']]; N = [n['id'] for n in d['nodes']]
    for x in set(B) & set(N): err(code, f'分支和概念撞名: {x}')
    for lst, what in ((B, '分支'), (N, '概念')):
        for x in {x for x in lst if lst.count(x) > 1}: err(code, f'{what} id 重复: {x}')
    BS = {b['id']: b for b in d['branches']}; NS = set(N)
    for n in d['nodes']:
        if n['b'] not in BS: err(code, f'概念 {n["id"]} 的分支不存在: {n["b"]}')
    for b in d['branches']:
        a0, a1 = b.get('a0'), b.get('a1')
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (a0, a1)) or not a1 > a0: err(code, f'分支 {b["id"]} 角度无效: {a0}, {a1}')
    for n in d['nodes']:
        b = BS.get(n['b'])
        if b and isinstance(n.get('ang'), (int, float)) and not (b['a0'] - 1e-6 <= n['ang'] <= b['a1'] + 1e-6): err(code, f'概念 {n["id"]} 角度不在分支 {b["id"]} 范围内')
    pre = {}
    for e in d['edges']:
        a, c, k = e[0], e[1], e[2]
        for x in (a, c):
            if x not in NS and x not in BS: err(code, f'连线端点不存在: {x}')
        if k == '>': pre.setdefault(c, []).append(a)
    seen, stack = {}, []
    def dfs(x):
        seen[x] = 1; stack.append(x)
        for p in pre.get(x, []):
            if seen.get(p) == 1: err(code, '先修有环: ' + ' > '.join(stack[stack.index(p):] + [p])); continue
            if not seen.get(p): dfs(p)
        stack.pop(); seen[x] = 2
    for x in N:
        if not seen.get(x): dfs(x)
page = open(ROOT + '/Atlas.html', encoding='utf-8').read()
i = page.find('window.IDX=')
if i >= 0:
    idx, _ = json.JSONDecoder().raw_decode(page, i + len('window.IDX='))
    for br in idx.get('bridges', []):
        for side in ('a', 'b'):
            c, n = br[side][0], br[side][1]
            if c not in DATA or n not in {x['id'] for x in DATA[c]['nodes']}: err('跨课', f'连线端点不存在: {c}:{n}')
else: err('首页', '找不到 bridges 数据')
print(f'{len(DATA)} 门课已检查, 问题 {len(bad)} 个')
for b in bad: print('  ' + b)
sys.exit(1 if bad else 0)
