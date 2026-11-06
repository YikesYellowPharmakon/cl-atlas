// v15s 本轮改动的整体核对: 顶栏 / 分隔线 / 换页 / 术语卡片与搜索 / 图谱总览与进入 / 单击聚焦 / 双击详情 / 前置路径 / 图谱内搜索 / 学习路线
export default async ({ go, shot, vp, sleep, ev, hov, key, mouse, send }) => {
  const P = (x) => console.log(typeof x === 'string' ? x : JSON.stringify(x));
  const type = async (w) => { await ev(`(()=>{const q=document.querySelector('#q');q.focus();q.value=${JSON.stringify(w)};q.dispatchEvent(new Event('input'));})()`); await sleep(500); };
  await vp(1440, 900);
  await go('notes/ALL', 1500); await shot('v-notes'); await ev('scrollTo(0,900)'); await sleep(500); await shot('v-notes2');
  // 换页中途
  await go('notes/ALL', 1200); await ev(`document.querySelector('.si[data-p="terms"]').click()`); await sleep(120); await shot('v-swap1'); await sleep(260); await shot('v-swap2'); await sleep(800); await shot('v-terms');
  await hov('.ts9[data-tc="EIP"] .ts9g:nth-child(2)'); await sleep(400); await shot('v-tseg');
  await type('梯度'); await shot('v-tsearch');
  await go('terms/IDP', 1500); await shot('v-tcourse');
  // 图谱总览
  await go('graph/ALL', 2200); await shot('v-gall');
  await hov('.cth[data-c="IML"] .cld'); await sleep(500); await shot('v-ghov');
  await ev('window.__MPH_SLOW = 6'); await ev(`(()=>{const e=document.querySelector('.cth[data-c="SL"] .cld');e.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`);
  for (const i of [1, 2, 3]) { await sleep(1100); await shot('v-gin' + i); }
  await sleep(2500); await shot('v-gcourse');
  // 单击聚焦 / 双击详情
  await ev(`(()=>{const g=document.querySelector('.n.cp[data-id="gb"]');g.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`); await sleep(900); await shot('v-gfocus');
  P(await ev(`(document.querySelector('.glc')||{}).textContent`));
  await ev(`(()=>{const g=document.querySelector('.n.cp[data-id="gb"]');g.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))})()`); await sleep(700); await shot('v-gcard');
  await ev(`(()=>{const s=document.querySelector('.gsc');const p=document.querySelector('.gpth2');if(s&&p)s.scrollTop=p.offsetTop-80})()`); await sleep(300); await shot('v-gpath');
  await key('Escape'); await sleep(300);
  // 图谱内搜索
  await type('核'); await sleep(300); await shot('v-gsearch'); P(await ev(`document.querySelectorAll('.n.qm').length + ' qm; groups=' + [...document.querySelectorAll('.cih')].map(x=>x.textContent).join('|')`));
  await key('Enter'); await sleep(1500); await shot('v-gpick');
  // 返回总览
  await key('Escape'); await ev(`document.querySelector('.gback').click()`); await sleep(1600); await shot('v-gback'); await sleep(2500); await shot('v-gback2');
  // EIP 学习路线前几步
  await go('graph/EIP', 1800); await ev(`(()=>{const d=document.querySelector('.dial');d.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`); await sleep(400);
  const ord = []; for (let i = 0; i < 64; i++) { ord.push(await ev(`(document.querySelector('.gtt b')||{}).textContent`)); await ev(`(()=>{const b=document.querySelector('.gtb [data-t="1"]');b&&b.click()})()`); await sleep(40); }
  P('EIP route: ' + ord.join(' › '));
  // 窄窗口顶栏
  await vp(820, 900); await go('terms/ALL', 1500); await shot('v-narrow');
  await vp(1100, 800); await go('notes/ALL', 1500); await shot('v-mid');
};
