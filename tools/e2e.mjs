import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})});
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
try{
 for(const [width,height] of [[360,640],[390,844],[1280,800]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('../game.html',import.meta.url).href);await page.evaluate(()=>{__game.manual();__game.reset();});
  const pad=await page.locator('#pad').boundingBox();assert.ok(pad.y+pad.height<=height&&pad.x>=0&&pad.x+pad.width<=width);
  const client=await context.newCDPSession(page);const touch=type=>client.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x:pad.x+pad.width/2,y:pad.y+pad.height/2}]});
  await page.locator('#resume').click();assert.equal(await page.evaluate(()=>__game.state().started),true);
  await touch('touchStart');assert.equal(await page.evaluate(()=>__game.state().held),true);await touch('touchCancel');assert.equal(await page.evaluate(()=>__game.state().status),'swing');
  await touch('touchStart');await touch('touchEnd');await page.evaluate(()=>__game.step(3));assert.equal(await page.evaluate(()=>__game.state().status),'failed');assert.equal(await page.locator('#resume').isVisible(),true);
  await page.locator('#resume').click();assert.equal(await page.evaluate(()=>__game.state().status),'swing');assert.equal(await page.evaluate(()=>__game.state().falls),1);
  await page.evaluate(()=>{__game.press();__game.release();__game.step(3);});assert.equal(await page.evaluate(()=>__game.state().status),'failed');assert.equal(await page.evaluate(()=>__game.state().falls),2);
  await page.locator('#restart').click();assert.equal(await page.evaluate(()=>__game.state().status),'ready');assert.equal(await page.evaluate(()=>__game.state().falls),0);assert.equal(await page.evaluate(()=>__game.state().elapsed),0);
  await page.screenshot({path:new URL(`../artifacts/${width}x${height}.png`,import.meta.url).pathname});assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}x${height}: start, touch, cancel, fall, continue, stats, reset, layout`);
 }
}finally{await browser.close();}
