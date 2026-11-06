// 搜索结果里的笔记: 应在阅读层打开 (有返回键), 返回后回到原页
export default async ({ go, vp, ev, sleep, send, shot }) => { await vp(1440, 900); await go('notes/ALL', 1500);
  await ev(`(()=>{const q=document.querySelector('#q');q.focus();q.value='Transformer';q.dispatchEvent(new Event('input'));})()`); await sleep(600);
  console.log('results', await ev(`[...document.querySelectorAll('.ci')].slice(0,3).map(x=>x.textContent.slice(0,30)).join(' | ')`));
  const i = await ev(`(()=>{const l=[...document.querySelectorAll('.ci')];return l.findIndex(x=>!x.classList.contains('ckn')&&!x.classList.contains('ckb')&&!x.classList.contains('cks'))})()`);
  const p = JSON.parse(await ev(`(()=>{const r=document.querySelectorAll('.ci')[${i}].getBoundingClientRect();return JSON.stringify([r.x+40,r.y+r.height/2])})()`)); for (const t of ['mouseMoved','mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x: p[0], y: p[1], button: 'left', clickCount: 1 }); await sleep(2000); await shot('srd');
  console.log('after pick: hash', await ev('location.hash.slice(0,40)'), '| reader on', await ev(`document.documentElement.classList.contains('rdon')`), '| back button visible', await ev(`(()=>{const b=document.querySelector('#rdb');return !!b&&getComputedStyle(b).opacity>0.5})()`));
  await ev(`document.querySelector('#rdb button, #rdb a, #rdb')&&(document.querySelector('#rdb button')||document.querySelector('#rdb')).click()`); await sleep(1200);
  console.log('after back: hash', await ev('location.hash'), '| reader on', await ev(`document.documentElement.classList.contains('rdon')`)); };
