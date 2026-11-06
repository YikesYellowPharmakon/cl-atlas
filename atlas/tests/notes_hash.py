#!/usr/bin/env python3
"""notes_hash.py — 确认 Atlas 的工作没有改动任何笔记.

用法:
  python3 tests/notes_hash.py snapshot   记下所有 <课>/笔记/ 下文件的哈希 (位置在 atlas/.local.json 的 evidence 下, 没配置就用系统临时目录)
  python3 tests/notes_hash.py check      和上次快照比较, 有变化就列出并退出码 1
Atlas 只读笔记; 改 Atlas 之前 snapshot, 改完 check。笔记本身更新 (写新笔记、改笔记) 之后要重新 snapshot。
"""
import hashlib, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json, tempfile
try: _ev = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.local.json'), encoding='utf-8')).get('evidence', '')
except Exception: _ev = ''
SNAP = os.path.join(os.path.expanduser(_ev) if _ev else tempfile.gettempdir(), 'atlas-notes.sha1')
def now():
    out = {}
    for d in sorted(os.listdir(ROOT)):
        p = os.path.join(ROOT, d, '笔记')
        if not os.path.isdir(p): continue
        for r, _, fs in os.walk(p):
            for f in sorted(fs):
                if f == '.DS_Store': continue
                q = os.path.join(r, f); out[os.path.relpath(q, ROOT)] = hashlib.sha1(open(q, 'rb').read()).hexdigest()
    return out
cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
cur = now()
if cmd == 'snapshot':
    os.makedirs(os.path.dirname(SNAP), exist_ok=True)
    open(SNAP, 'w', encoding='utf-8').write(''.join(f'{h}  {k}\n' for k, h in cur.items())); print(f'快照: {len(cur)} 个文件 → {SNAP}')
else:
    old = {}
    for l in open(SNAP, encoding='utf-8'):
        h, k = l.rstrip('\n').split('  ', 1); old[k] = h
    diff = sorted(k for k in set(old) | set(cur) if old.get(k) != cur.get(k))
    print(f'{len(cur)} 个文件, 变化 {len(diff)} 个'); [print('  ' + k) for k in diff[:50]]
    sys.exit(1 if diff else 0)
