// 节点文字: 逐级缩放, 每级停稳后记录 每个标签 显示/位置; 统计相邻两级之间变化的数量、可见标签互相重叠的对数; 再缩回原级看是否一致
export default async ({ go, vp, ev, sleep, send, shot }) => { await vp(1440, 900);
  const snap = `JSON.stringify((()=>{const o={};document.querySelectorAll('.n.cp').forEach(g=>{const l=g.querySelector('.lab');o[g.dataset.id]=g.classList.contains('lh')?'-':(l&&l.getAttribute('transform')||'0')});const R=[...document.querySelectorAll('.n.cp:not(.lh) .lab text.l1')].map(t=>t.getBoundingClientRect()).filter(r=>r.width);let ov=0;for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const a=R[i],b=R[j];if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)ov++}return {o,vis:R.length,ov}})())`;
  for (const c of ['DPNLP1', 'SL']) { await go('graph/' + c, 2800); const L = []; L.push(JSON.parse(await ev(snap)));
    const wheel = async (d) => { await ev(`document.querySelector('svg.gv').dispatchEvent(new WheelEvent('wheel',{deltaY:${d},deltaMode:0,clientX:760,clientY:520,bubbles:true,cancelable:true}))`); await sleep(700); L.push(JSON.parse(await ev(snap))); };
    for (let i = 0; i < 5; i++) await wheel(-50); if (c === 'DPNLP1') await shot('lab-zoomed'); for (let i = 0; i < 5; i++) await wheel(50);
    const diff = (a, b) => Object.keys(a.o).filter((k) => a.o[k] !== b.o[k]).length; const mv = (a, b) => Object.keys(a.o).filter((k) => a.o[k] !== '-' && b.o[k] !== '-' && b.o[k] != null && a.o[k] !== b.o[k]).length;
    console.log(c, 'visible per level', L.map((x) => x.vis).join(' '), '| overlaps', L.map((x) => x.ov).join(' '), '| changes between levels', L.slice(1).map((x, i) => diff(L[i], x)).join(' '), '| moved while visible', L.slice(1).map((x, i) => mv(L[i], x)).join(' '), '| back at start, differs:', diff(L[0], L.at(-1)), 'k', await ev(`document.querySelector('#cam').getAttribute('transform').slice(-9)`));
  }
  await go('graph/DPNLP1', 2800); await shot('lab-fit'); };
