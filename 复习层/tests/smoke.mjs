export default async ({ go, ev, vp, errs }) => {
 await vp(1280, 800); const codes = await (async()=>{ await go('terms/ALL', 1500); return ev(`IDX.courses.filter(c=>c.has).map(c=>c.code)`); })();
 const bad = [];
 for (const c of codes) for (const p of ['terms/', 'graph/']) { const n0 = errs.length; await go(p + c, 1300); const len = await ev(`document.body.innerText.length`); if (errs.length > n0 || len < 240 || (p === 'graph/' && !(await ev(`document.querySelectorAll('.n.cp').length`)))) bad.push(p + c + ' len=' + len); }
 await go('graph/ALL', 1500); await go('terms/ALL', 1500);
 console.log('checked', codes.length, 'bad', JSON.stringify(bad));
};
