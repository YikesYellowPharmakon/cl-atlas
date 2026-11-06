// 术语: 卡片 / 分支段悬停 / 首页搜索 (键盘) / 课程内搜索
export default async ({ go, shot, vp, sleep, ev, hov, key }) => {
  await vp(1440, 900);
  await go('terms/ALL', 1800); await shot('th2-home');
  await hov('.ts9[data-tc="SL"] .ts9g:nth-child(3)'); await sleep(400); await shot('th2-seg');
  const type = async (w) => { await ev(`(()=>{const q=document.querySelector('#q');q.focus();q.value=${JSON.stringify(w)};q.dispatchEvent(new Event('input'));})()`); await sleep(500); };
  await type('baum'); await shot('th2-s1'); console.log('baum', await ev(`document.querySelector('.lbsn9')&&document.querySelector('.lbsn9').textContent`));
  await type('strasse'); console.log('strasse', await ev(`document.querySelector('.lbsn9')?document.querySelector('.lbsn9').textContent:document.querySelector('.none')&&document.querySelector('.none').textContent`));
  await type('梯度'); await key('ArrowDown'); await sleep(150); console.log('sel', await ev(`document.querySelector('.lbsr9.on').textContent`));
  await key('Enter'); await sleep(1600); await shot('th2-open');
  console.log('opened', await ev(`location.hash + ' | ' + (document.querySelector('.r7.xo')||{}).textContent`).then((x) => String(x).slice(0, 120)));
  await go('terms/SL', 1500); await ev(`document.querySelector('[data-f="gp"]')&&document.querySelector('[data-f="gp"]').click()`); await sleep(300);
  await type('hinge'); console.log('in-course', await ev(`document.querySelector('.lbsn9').textContent + ' rows=' + document.querySelectorAll('.r7').length`)); await shot('th2-course');
};
