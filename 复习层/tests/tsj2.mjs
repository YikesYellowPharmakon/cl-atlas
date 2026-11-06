export default async ({ go, vp, ev, sleep }) => { await vp(1440, 900);
  for (const [lab, how] of [['home Enter', 'enter'], ['home click', 'click'], ['in-course Enter', 'course']]) {
    if (how === 'course') { await go('terms/SL', 1800); } else await go('terms/ALL', 1600);
    await ev(`(()=>{const q=document.querySelector('#q');q.focus();q.value=${JSON.stringify(how === 'course' ? 'gradient' : '梯度')};q.dispatchEvent(new Event('input'));})()`); await sleep(500);
    await ev(`(()=>{window.__f=[];const t0=performance.now();(function f(){const r=document.querySelector('.r7.xo')||document.querySelector('.r7:focus');window.__f.push([Math.round(scrollY),r?Math.round(r.getBoundingClientRect().top):null,location.hash.slice(0,20)]);if(performance.now()-t0<2500)requestAnimationFrame(f)})()})()`);
    if (how === 'click') await ev(`document.querySelector('.lbsr9').click()`); else await ev(`(()=>{const q=document.querySelector('#q');q.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));setTimeout(()=>{(document.activeElement.tagName==='INPUT'?q:document.activeElement).dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))},150)})()`);
    await sleep(2700); const f = JSON.parse(await ev('JSON.stringify(window.__f)'));
    const seq = f.map((x) => x[0] + '/' + x[1]).filter((v, i, a) => v !== a[i - 1]); const ys = f.map((x) => x[0]); let flips = 0; for (let i = 2; i < ys.length; i++) { const a = ys[i - 1] - ys[i - 2], b = ys[i] - ys[i - 1]; if (a * b < 0 && Math.abs(a) > 3 && Math.abs(b) > 3) flips++; }
    console.log(lab, '| scroll direction reversals', flips, '| seq', seq.slice(0, 22).join(' '));
  }
};
