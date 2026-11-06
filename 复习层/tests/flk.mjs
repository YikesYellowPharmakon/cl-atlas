// 课程图谱: 鼠标在每个节点上小幅移动, 统计高亮在不同节点间来回切换的次数
export default async ({ go, vp, ev, sleep, send }) => { await vp(1440, 900);
  for (const c of ['SL', 'EIP', 'DPNLP1']) {
    await go('graph/' + c, 2600);
    await ev(`(()=>{window.__fl=[];const gs=document.querySelector('.gs');new MutationObserver(()=>{const m=document.querySelector('.n.cp.me');window.__fl.push(m?m.dataset.id:'-')}).observe(gs,{subtree:true,attributes:true,attributeFilter:['class']})})()`);
    const pts = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.n.cp .core')].slice(0,40).map(c=>{const r=c.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}))`));
    let flips = 0, bad = [];
    for (const [x, y] of pts) {
      await ev('window.__fl=[]');
      for (const [dx, dy] of [[-4,0],[0,0],[4,0],[0,4],[0,-4],[6,6],[-6,-6],[0,0]]) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + dx, y: y + dy }); await sleep(35); }
      await sleep(200);
      const seq = JSON.parse(await ev('JSON.stringify(window.__fl)')); const ids = seq.filter((v, i) => v !== seq[i - 1]); const f = ids.filter(v=>v!=='-').length; if (f > 1) { flips++; bad.push(ids.join('>')); }
    }
    console.log(c, 'nodes', pts.length, 'flicky', flips, bad.slice(0, 4).join(' | '));
  }
};
