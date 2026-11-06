// 底部收起后向上滚: 滚动过程中页面高度不应变化 (直到空位滚出视口才一次去掉)
export default async ({ go, vp, ev, sleep, send }) => { await vp(1440, 900); await go('notes/ALL', 1500);
  const rows = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[data-nopen]')].map(x=>x.dataset.nopen))`)); const code = rows.at(-1);
  await ev('scrollTo(0,1e6)'); await sleep(400); await ev(`document.querySelector('[data-nopen="${code}"] .ch').click()`); await sleep(900); await ev('scrollTo(0,1e6)'); await sleep(300);
  await ev(`document.querySelector('[data-nopen="${code}"] .ch').click()`); await sleep(900);
  const hs = []; for (let i = 0; i < 30; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 500, deltaX: 0, deltaY: -40 }); await sleep(30); hs.push(await ev('document.documentElement.scrollHeight+"/"+Math.round(scrollY)')); }
  const H = hs.map(x => +x.split('/')[0]); const changes = H.filter((v, i) => i && v !== H[i - 1]).length; console.log('height changes while scrolling up:', changes, '|', hs.slice(0, 4).join(' '), '…', hs.slice(-3).join(' ')); };
