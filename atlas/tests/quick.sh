#!/bin/zsh
# Atlas 快速回归: 构建 → 数据体检 → 浏览器冒烟 (锁屏时自动跳过浏览器部分)
# 用法: zsh tests/quick.sh
set -e
cd "${0:A:h}/.."
python3 build.py | tail -1 | cut -c1-120
python3 tests/check_data.py
cd tests
for t in smoke.mjs ring3.mjs cov.mjs srd.mjs; do
  echo "== $t"; node t.mjs ./$t 2>&1 | tail -4 || { [ $? = 3 ] && echo "屏幕锁定, 跳过浏览器测试"; break; }
done
