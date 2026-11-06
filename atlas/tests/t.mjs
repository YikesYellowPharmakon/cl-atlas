import { spawn } from 'node:child_process'; import fs from 'node:fs';
import { fileURLToPath } from 'node:url'; import * as P_ from 'node:path';
const URLB = process.env.RV_URL || 'file://' + P_.resolve(P_.dirname(fileURLToPath(import.meta.url)), '../../Atlas.html').split('/').map(encodeURI).join('/');  // 正式主页
const LOCAL_ = (() => { try { return JSON.parse(fs.readFileSync(P_.resolve(P_.dirname(fileURLToPath(import.meta.url)), '../.local.json'), 'utf8')); } catch { return {}; } })();
const OUT = P_.join((LOCAL_.evidence || '').replace(/^~/, process.env.HOME) || (await import('node:os')).tmpdir(), 'atlas-shots') + '/'; fs.mkdirSync(OUT, { recursive: true }); /* 截图位置在 atlas/.local.json 里配置 (不进仓库) */ const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* 2026-11-06 安全保护: 两次在锁屏解锁时整机卡死复位, 当时都有无头 Chrome 在跑 (还有没退出的残留实例).
   1) 锁屏时不跑, 直接退出 (退出码 3); 2) 先结束残留的测试 Chrome (只认 /tmp/cdpud-v15- 用户目录); 3) 不用 GPU; 4) 任何方式退出都带走 Chrome */
import { execSync } from 'node:child_process';
const locked = (() => { try { return /CGSSessionScreenIsLocked<\/key>\s*<true\/>/.test(execSync('ioreg -n Root -d1 -a', { encoding: 'utf8' })); } catch { return false; } })();
if (locked && !process.env.FORCE_LOCKED) { console.log('SKIP: 屏幕已锁定, 不运行无头 Chrome'); process.exit(3); }
try { execSync("pkill -f 'user-data-dir=/tmp/cdpud-v15-'", { stdio: 'ignore' }); } catch {}
const port = 9800 + Math.floor(Math.random() * 150), ud = fs.mkdtempSync('/tmp/cdpud-v15-');
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--disable-gpu-compositing', ...(process.env.SB ? [] : ['--hide-scrollbars']), '--remote-debugging-port=' + port, '--user-data-dir=' + ud, 'about:blank'], { stdio: 'ignore' });
const bye = () => { try { chrome.kill('SIGKILL'); } catch {} }; process.on('exit', bye); for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => { bye(); process.exit(1); });
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); const errs = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ')); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
export const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) errs.push('EV ' + x.slice(0, 80) + ' ' + (r.result.exceptionDetails.exception?.description || '')); return r.result?.result?.value; };
await send('Runtime.enable'); await send('Page.enable');
const vp = (w, h, m = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: m });
const go = async (h, ms = 1100) => { await send('Page.navigate', { url: 'about:blank' }); await sleep(30); await send('Page.navigate', { url: URLB + '?live#/' + h }); await sleep(ms); };
const shot = async (n) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(OUT + n + '.png', Buffer.from(s.result.data, 'base64')); };
const mouse = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); const key = async (k, text) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, text, code: k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k }); };
const box = (s) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)});if(!e)return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
const hov = async (s) => { const b = await box(s); if (b) await mouse(b[0], b[1]); return b; };
const mod = await import(process.argv[2]); await mod.default({ go, shot, ev, vp, sleep, mouse, key, box, hov, send, errs });
console.log('ERRS', errs.length ? errs.slice(0, 8) : 'none'); ws.close(); chrome.kill(); setTimeout(() => { try { fs.rmSync(ud, { recursive: true, force: true }); } catch {} process.exit(0); }, 300);
