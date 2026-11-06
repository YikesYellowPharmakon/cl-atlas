// 术语卡底部分支段: 指向 → 离开到卡内别处 / 别的卡 / 页面外 / 键盘, 每一步都检查是否复原
export default async ({ go, vp, ev, sleep, send, key }) => { await vp(1440, 900); await go('terms/ALL', 1800);
  const mv = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  const at = async (s) => JSON.parse(await ev(`(()=>{const r=document.querySelector('${s}').getBoundingClientRect();return JSON.stringify([r.x+r.width/2,r.y+r.height/2,r.top,r.bottom])})()`));
  const st = () => ev(`document.querySelectorAll('.ts9g.on').length+' on / '+document.querySelectorAll('.ts9.lb9').length+' lb'`);
  const [x, y] = await at('.ts9[data-tc="EIP"] .ts9g:nth-child(2)'); await mv(x, y); await sleep(250); console.log('指向段', await st());
  await mv(x, y - 60); await sleep(250); console.log('移到卡内上方', await st());
  await mv(x, y); await sleep(200); const [x2, y2] = await at('.ts9[data-tc="EICL"] .ts9z'); await mv(x2, y2); await sleep(250); console.log('移到别的卡', await st());
  await mv(x, y); await sleep(200); await mv(x, y + 3); await sleep(80); await mv(x, y + 30); await sleep(80); await mv(x, y + 60); await sleep(250); console.log('从段往下滑出卡底', await st());
  await mv(x, y); await sleep(200); await mv(5, 5); await sleep(250); console.log('移到页面角落', await st());
  for (let i = 0; i < 6; i++) { await mv(x + (i % 2 ? 30 : -30), y); await sleep(60); } await mv(x, y - 200); await sleep(250); console.log('段间快速来回后离开', await st());
  await ev(`document.querySelector('.ts9[data-tc="EIP"] .ts9g').focus()`); await sleep(150); console.log('键盘聚焦', await st()); await key('Tab'); await key('Tab'); await key('Tab'); await key('Tab'); await key('Tab'); await key('Tab'); await key('Tab'); await sleep(150); console.log('Tab 离开', await st(), await ev('document.activeElement.className'));
};
