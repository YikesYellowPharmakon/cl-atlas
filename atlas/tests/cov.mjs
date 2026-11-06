export default async ({ go, vp, ev, sleep, shot, send }) => { await vp(1440, 900); await go('terms/SL', 2000);
  const st = () => ev(`(()=>{const b=[...document.querySelectorAll('[data-cov]')].map(x=>x.dataset.cov+(x.classList.contains('on')?'*':'')).join(' ');const masked=document.querySelectorAll('.pd, .lq7.cv, [class*=cov]').length;return b+' | rows='+document.querySelectorAll('.r7').length+' masked='+masked+' TScov='+(window.TS?TS.cov:'?')})()`);
  console.log('init', await st()); await shot('cov0');
  for (const m of ['de', 'zh', '']) { const r = JSON.parse(await ev(`(()=>{const b=[...document.querySelectorAll('[data-cov]')].find(x=>x.dataset.cov==='${m}');if(!b)return 'null';const q=b.getBoundingClientRect();return JSON.stringify([q.x+q.width/2,q.y+q.height/2,b.textContent])})()`) || 'null');
    if (!r) { console.log('no button', m); continue; } for (const t of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x: r[0], y: r[1], button: 'left', clickCount: 1 }); await sleep(600); console.log('after', r[2], await st()); await shot('cov-' + (m || 'all')); }
};
