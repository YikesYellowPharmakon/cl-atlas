// 笔记首页滚到底, 真实鼠标点击最后几门课展开/收起; 逐帧记录: 被点行的 top, scrollY, 文档高度, 视口底部到最后内容的距离
export default async ({ go, vp, ev, sleep, send }) => { await vp(1440, 900); await go('notes/ALL', 1500);
  const click = async (x, y) => { for (const t of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', clickCount: 1 }); };
  const run = async (code, lab) => { await ev(`(()=>{const h=document.querySelector('[data-nopen="${code}"]').getBoundingClientRect();if(h.top<80||h.top>innerHeight-80)scrollBy(0,h.top-innerHeight/2)})()`); await sleep(300); const p = JSON.parse(await ev(`(()=>{const h=document.querySelector('[data-nopen="${code}"] .ch').getBoundingClientRect();return JSON.stringify([h.x+40,h.y+h.height/2])})()`));
await click(p[0], p[1]);
    await ev(`(()=>{window.__f=[];const t0=performance.now();const r=document.querySelector('[data-nopen="${code}"]');const last=[...document.querySelectorAll('[data-nopen]')].at(-1);(function f(){window.__f.push([Math.round(r.getBoundingClientRect().top),Math.round(scrollY),document.documentElement.scrollHeight,Math.round(innerHeight-last.getBoundingClientRect().bottom)]);if(performance.now()-t0<1100)requestAnimationFrame(f)})();})()`);
     await sleep(1250); const f = JSON.parse(await ev('JSON.stringify(window.__f)'));
    const tops = f.map(x => x[0]), gaps = f.map(x => x[3]); let flips = 0; for (let i = 2; i < gaps.length; i++) { const a = gaps[i - 1] - gaps[i - 2], b = gaps[i] - gaps[i - 1]; if (a * b < 0 && Math.abs(a) > 1 && Math.abs(b) > 1) flips++; }
    if (lab.includes('换开')) console.log(JSON.stringify(f.map(x=>x[0]+'/'+x[1]+'/'+x[2])).slice(0,1400)); console.log(lab, code, 'frames', f.length, 'row top range', Math.min(...tops), Math.max(...tops), '| bottom gap', gaps[0], '→', gaps.at(-1), 'min', Math.min(...gaps), 'max', Math.max(...gaps), 'direction flips', flips); };
  const rows = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[data-nopen]')].map(x=>x.dataset.nopen))`));
  await ev('scrollTo(0, 1e6)'); await sleep(500);
  await run(rows.at(-1), '展开最后一门'); await run(rows.at(-1), '收起最后一门');
  await ev('scrollTo(0, 1e6)'); await sleep(500); await run(rows.at(-2), '展开倒数第二'); await run(rows.at(-1), '换开最后一门'); await run(rows.at(-1), '收起');
  await ev('scrollTo(0, 1e6)'); await sleep(500); await run(rows.at(-4), '展开倒数第四'); await run(rows.at(-4), '收起倒数第四');
};
