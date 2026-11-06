export default async ({ go, vp, ev, sleep, send }) => { await vp(1440, 900);
  const q = async (w) => { await ev(`(()=>{const q=document.querySelector('#q');q.focus();q.value=${JSON.stringify(w)};q.dispatchEvent(new Event('input'));})()`); await sleep(1500);
    return ev(`(()=>{const g={};let cur='';[...document.querySelectorAll('#res > *')].forEach(e=>{if(e.classList.contains('cih'))cur=e.querySelector('em')?e.querySelector('em').textContent:e.textContent;else if(e.classList.contains('ci'))g[cur]=(g[cur]||0)+1});return Object.entries(g).map(([k,v])=>k+':'+v).join(' ')})()`); };
  for (const [page, words] of [['graph/FS', ['核', 'Gradient', '树', 'Regel']], ['graph/ALL', ['核', 'Gradient', '树', 'Regel']], ['graph/DPNLP1', ['注意力', 'Transformer']]]) {
    await go(page, 2500); console.log(page, 'loaded before search:', await ev(`(()=>{let n=0;for(const k in window.BY||{})if(BY[k].loaded)n++;return n})()`));
    for (const w of words) console.log('  ', w.padEnd(12), await q(w)); await ev(`(()=>{const q=document.querySelector('#q');q.value='';q.dispatchEvent(new Event('input'));q.blur()})()`); await sleep(300); }
  await go('graph/FS', 2500); await q('Gradient');
  const p = JSON.parse(await ev(`(()=>{const e=[...document.querySelectorAll('#res .ci')][0];const r=e.getBoundingClientRect();return JSON.stringify([r.x+40,r.y+r.height/2,e.textContent.slice(0,30)])})()`));
  for (const t of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x: p[0], y: p[1], button: 'left', clickCount: 1 }); await sleep(2800);
  console.log('picked', p[2], '→', await ev('location.hash'), '| focus panel:', await ev(`(document.querySelector('.glc:not([hidden])')||{}).textContent?.slice(0,20)`)); };
