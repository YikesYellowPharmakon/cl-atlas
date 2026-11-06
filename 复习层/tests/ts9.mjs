export default async ({ go, vp, ev, sleep, shot }) => { await vp(1440, 900);
  const st = (lab) => ev(`(()=>{const b=[...document.querySelectorAll('.lbcv [data-cov]')].map(x=>(x.dataset.cov||'all')+(x.classList.contains('on')?'*':'')).join(' ');const tab=(document.querySelector('.lbseg .sb.on')||{}).textContent;return ${JSON.stringify(lab)}.padEnd(30)+' btns['+b+'] tab='+tab+' rows='+document.querySelectorAll('.r7').length+' masked='+document.querySelectorAll('.r7 .cv').length+' marks='+document.querySelectorAll('.r7 mark').length+' maskedMarks='+document.querySelectorAll('.r7 .cv mark').length+' info='+((document.querySelector('.lbsn9')||{}).textContent||'').slice(0,40)+' none='+((document.querySelector('.none')||{}).textContent||'').slice(0,30)})()`);
  const type = async (w) => { await ev(`(()=>{const q=document.querySelector('#q');q.focus();q.value=${JSON.stringify(w)};q.dispatchEvent(new Event('input'));})()`); await sleep(400); };
  const click = async (sel) => { await ev(`document.querySelector(${JSON.stringify(sel)}).click()`); await sleep(400); };
  await go('terms/SL', 2000); console.log(await st('load'));
  await click('.lbcv [data-cov="de"]'); console.log(await st('hide terms, no query'));
  await type('loss'); console.log(await st('type loss'));
  await click('.lbcv [data-cov="de"]'); console.log(await st('search + hide terms'));
  await click('.lbcv [data-cov="zh"]'); console.log(await st('search + hide meaning'));
  const fb = await ev(`[...document.querySelectorAll('.lbseg .sb[data-f]')].filter(x=>x.dataset.f).map(x=>x.dataset.f)[0]`); await click(`.lbseg .sb[data-f="${fb}"]`); console.log(await st('search + branch ' + fb));
  await click('.lbseg .sb[data-f=""]'); console.log(await st('search + ALLE'));
  await type(''); console.log(await st('clear search'));
  // 选一个没有匹配的分支
  await click('.lbseg .sb[data-f="gp"]'); await type('hinge'); console.log(await st('branch gp + hinge'));
  if (await ev(`!!document.querySelector('.lbal')`)) { await click('.lbal'); console.log(await st('click 看全部')); }
  await type(''); await click('.lbseg .sb[data-f=""]');
  // 滚到下面再输入
  await ev('scrollTo(0, 2500)'); await sleep(300); await type('ker'); console.log('typed while scrolled: scrollY', await ev('Math.round(scrollY)'), 'list header top', await ev(`Math.round(document.querySelector('.lbh').getBoundingClientRect().top)`)); await shot('ts9-scrolled');
  await type('kern'); console.log('next key: scrollY', await ev('Math.round(scrollY)'), 'header top', await ev(`Math.round(document.querySelector('.lbh').getBoundingClientRect().top)`));
};
