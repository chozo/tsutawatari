#!/usr/bin/env node
// SNS共有用のOGP画像（1200×630）を作る。実際のゲーム画面を撮り、タイトル文字を重ねて public/ogp.png に書き出す。
//
//   node tools/ogp/make-ogp.mjs [出力先]   既定は public/ogp.png
import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),out=resolve(process.argv[2]||resolve(root,'public/ogp.png'));
const VINE=Number(process.env.OGP_VINE||0);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
// public/ のファイル（favicon.svg など）は公開時と同じくルートのパスで返す
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://x').pathname;const f=resolve(root,'.'+(p==='/'?'/index.html':p));const body=await readFile(f).catch(()=>readFile(resolve(root,'public','.'+p)));res.writeHead(200,{'Content-Type':types[extname(f)]||'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,r));
const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'});
try{
 // 1. ゲーム画面: 指定のツタまで進め、次のツタへ届く大きな揺れの瞬間で止めて撮る
 // ステージだけを 1200×630 に広げると、ゲームは横に広い範囲の景色を描く
 // 主人公は大きなイラストで重ねるので、背景のゲーム画面では透明な画像に差し替えて二重にならないようにする
 const game=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:2});
 await game.route('**/assets/explorer.png',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64')}));
 // 次のツタの「NEXT」表示も宣伝画像では消す
 await game.addInitScript(()=>{for(const k of ['fillText','strokeText']){const f=CanvasRenderingContext2D.prototype[k];CanvasRenderingContext2D.prototype[k]=function(t,...a){if(t!=='NEXT')return f.call(this,t,...a);};}});
 await game.goto(`http://localhost:${server.address().port}/`);
 await game.waitForFunction(()=>window.__game);
 await game.addStyleTag({content:'header,.controls,.journey,.bottom,.stage-top,.instruction,#overlay{display:none!important}#app{max-width:none!important;max-height:none!important;height:100vh!important;border:0!important}'});
 await game.evaluate(()=>dispatchEvent(new Event('resize')));
 await game.evaluate(target=>{
  const g=window.__game;g.manual(true);g.reset();g.start();
  const reach=s=>{let p={...s.player};const v=s.vines[1];if(!v||p.vx<40)return false;for(let i=0;i<240;i++){const dt=1/120,q={x:p.x+p.vx*dt,y:p.y+p.vy*dt+310*dt*dt,vx:p.vx,vy:p.vy+620*dt};for(let j=0;j<=4;j++){const x=p.x+(q.x-p.x)*j/4,y=p.y+(q.y-p.y)*j/4,nearY=Math.max(v.y,Math.min(v.y+v.length,y));if(Math.hypot(x-v.x,y-nearY)<=14)return true;}if(q.y>=284)return false;p=q;}return false;};
  while(g.state().current<target){g.press();for(let i=0;i<1800&&!reach(g.state());i++)g.step(1/120);g.release();g.press();for(let i=0;i<300&&g.state().status==='flight';i++)g.step(1/120);g.release(false);}
  g.step(1.5);g.press();for(let i=0;i<1800&&!reach(g.state());i++)g.step(1/120);g.step(.05);
 },VINE);
 const scene=(await game.locator('#stage').screenshot()).toString('base64');
 const explorer=(await readFile(resolve(root,'assets/explorer.png'))).toString('base64');

 // 2. 合成: 左に文字、右に実際のゲーム画面
 const card=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await card.setContent(`<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;position:relative;background:#102c32;font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",sans-serif}
  .scene{position:absolute;inset:0;background:url(data:image/png;base64,${scene}) center/cover no-repeat}
  .shade{position:absolute;inset:0;background:linear-gradient(90deg,#0c2a2ff2 0,#0c2a2fd9 38%,#0c2a2f40 60%,transparent 72%)}
  .text{position:absolute;left:72px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:26px}
  .eyebrow{color:#9bc4b7;font-weight:800;letter-spacing:.32em;font-size:24px}
  h1{color:#fff;font-weight:900;font-size:128px;line-height:1;letter-spacing:.02em;-webkit-text-stroke:16px #17302a;paint-order:stroke fill;text-shadow:0 8px 0 rgba(0,0,0,.35)}
  .sub{color:#fff6e5;font-weight:800;font-size:40px;line-height:1.4}
  .sub b{color:#ffe36a}
  .url{align-self:flex-start;margin-top:8px;color:#342915;background:#f6d399;font-weight:800;font-size:26px;padding:10px 26px;border-radius:999px;box-shadow:0 5px 0 #9f8156}
  .hero{position:absolute;right:56px;top:96px;height:470px;filter:drop-shadow(0 14px 18px #071b2088)}
 </style>
 <div class="scene"></div><div class="shade"></div>
 <img class="hero" src="data:image/png;base64,${explorer}">
 <div class="text"><div class="eyebrow">VINE TRIP</div><h1>ツタワタリ</h1><p class="sub">長押しで揺れて、<br><b>離してジャンプ！</b></p><div class="url">game.chozo.net/tsutawatari/</div></div>`);
 await card.evaluate(()=>document.fonts.ready);
 await writeFile(out,await card.screenshot({type:'png'}));
 console.log(`OGP画像を書き出しました: ${out}`);
}finally{await browser.close();server.close();}
