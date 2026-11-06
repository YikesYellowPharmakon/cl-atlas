// 页面内执行各场景, 逐帧记录被点那一行的屏幕位置 (点击当帧前后 + 之后 30 帧)
export default async ({ go, vp, ev, sleep }) => { await vp(1440, 900); await go('terms/SL', 2000);
  const run = (lab, setup, target) => ev(`(async()=>{const S=ms=>new Promise(r=>setTimeout(r,ms));const F=()=>new Promise(r=>requestAnimationFrame(()=>r()));const L=[...document.querySelectorAll('.r7')];const ex=r=>{if(!r.classList.contains('o7'))r.click();if(!r.classList.contains('xo'))r.click()};const col=r=>{if(r.classList.contains('xo'))r.click()};
    ${setup}; await S(200); scrollTo(0,1e6); await S(250); const t=${target}; if(!t.classList.contains('o7')) t.click(); await F(); await F();
    const before=Math.round(t.getBoundingClientRect().top), sy0=Math.round(scrollY); t.click(); const seq=[]; for(let i=0;i<30;i++){await F();seq.push(Math.round(t.getBoundingClientRect().top))}
    return ${JSON.stringify(lab)}.padEnd(34)+' before '+before+' | after: min '+Math.min(...seq)+' max '+Math.max(...seq)+' | scrollY '+sy0+' → '+Math.round(scrollY)+' | spacer '+((document.querySelector('.tsp9')||{style:{}}).style.height||'-')})()`);
  console.log(await run('expand last (nothing open)', `L.forEach(col)`, `L.at(-1)`));
  console.log(await run('collapse last at bottom', `L.forEach(col); ex(L.at(-1))`, `L.at(-1)`));
  console.log(await run('3rd-last open → expand last', `L.forEach(col); ex(L.at(-3))`, `L.at(-1)`));
  console.log(await run('last open → expand 4th-last', `L.forEach(col); ex(L.at(-1))`, `L.at(-4)`));
  console.log(await run('mid open → expand mid below', `L.forEach(col); ex(L[80])`, `L[83]`));
  console.log(await run('collapse 6th-last at bottom', `L.forEach(col); ex(L.at(-6))`, `L.at(-6)`));
};
