// 正式主页 (相对路径) 下三个入口都能在阅读层打开笔记, 且笔记内容真的加载了
export default async ({ go, vp, ev, sleep }) => { await vp(1440, 900);
  const rd = async (lab) => { await sleep(2200); console.log(lab.padEnd(22), 'reader', await ev(`document.documentElement.classList.contains('rdon')`), '| iframe title:', await ev(`(()=>{try{const f=document.querySelector('#rd');return (f&&f.contentDocument&&f.contentDocument.title||'(none)').slice(0,40)}catch(e){return 'ERR '+e.message}})()`)); await ev(`history.back()`); await sleep(1200); };
  await go('notes/ALL', 1500); await ev(`document.querySelector('[data-nopen="EICL"] .ch').click()`); await sleep(700); await ev(`document.querySelector('[data-nopen="EICL"] .nl a').click()`); await rd('notes list → lecture');
  await go('terms/SMIS', 2000); await ev(`(()=>{const r=document.querySelector('.r7');r.click();r.click()})()`); await sleep(500); await ev(`document.querySelector('.r7.xo .lxf a').click()`); await rd('terms → 读笔记');
  await go('graph/SL', 2500); await ev(`document.querySelector('.n.cp[data-id="gb"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`); await sleep(800); await ev(`[...document.querySelectorAll('.gcard a.gnl')].find(a=>/读笔记/.test(a.textContent)).click()`); await rd('graph card → 读笔记');
};
