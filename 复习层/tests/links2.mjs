export default async ({ go, vp, ev, sleep, shot }) => { await vp(1440, 900);
  await go('graph/SL', 2500); await ev(`document.querySelector('.n.cp[data-id="gb"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`); await sleep(800); await ev(`[...document.querySelectorAll('.gcard a.gnl')].find(a=>/读笔记/.test(a.textContent)).click()`); await sleep(3000); await shot('reader-from-graph');
  console.log('iframe src:', await ev(`decodeURI(document.querySelector('#rd').src).slice(-70)`)); };
