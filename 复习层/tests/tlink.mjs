export default async ({ go, vp, ev, sleep }) => { await vp(1440, 900);
  for (let i = 0; i < 4; i++) { await go('terms/SMIS', 2000); await ev(`(()=>{const r=document.querySelector('.r7');r.click();r.click()})()`); await sleep(500);
    const info = await ev(`(()=>{const a=document.querySelector('.r7.xo .lxf a');return a?decodeURI(a.getAttribute('href')).slice(-40)+' | xo='+!!document.querySelector('.r7.xo'):'no link, xo='+!!document.querySelector('.r7.xo')})()`);
    await ev(`document.querySelector('.r7.xo .lxf a')&&document.querySelector('.r7.xo .lxf a').click()`); await sleep(2200);
    console.log('run', i, info, '| reader', await ev(`document.documentElement.classList.contains('rdon')`), '| hash', await ev('location.hash.slice(0,30)')); }
};
