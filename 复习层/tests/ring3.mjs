export default async ({ go, vp, ev }) => { await vp(1440, 900);
  const codes = JSON.parse(await ev(`JSON.stringify(Object.keys(window.BY||{}))`).catch(() => '[]'));
  const list = codes.length ? codes : ['EIP','EICL','SP','SNS','FS','SMIS','IE','EIPS','MGTN','IML','DBS','BS','SL','IDP','DPNLP1','DPNLP2'];
  let bad = [];
  for (const c of list) { await go('graph/' + c, 1600); const r = await ev(`(()=>{const B=[...document.querySelectorAll('.band')];if(!B.length)return 'none';return B.filter(b=>!b.getTotalLength()||/NaN/.test(b.getAttribute('d'))).map(b=>b.dataset.b).join(',')+'|'+B.length+'|'+document.querySelectorAll('.bl').length})()`); if (r !== 'none') { const [z, n, l] = r.split('|'); console.log(c.padEnd(7), 'bands', n, 'labels', l, z ? 'BROKEN: ' + z : 'ok'); if (z) bad.push(c); } }
  console.log('broken courses:', bad.length); };
