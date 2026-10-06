import test from 'node:test';
import assert from 'node:assert/strict';
import {PHYSICS,ballistic,segmentCircle,catchVine,releaseWindow} from '../physics.js';
import {VINES} from '../course.js';
import {createGame,LANDING_Y,SHORE_X} from '../engine.js';
function canLand(s){let p={...s.player};const v=VINES[s.current+1];if(p.vx<40)return false;for(let t=0;t<2;t+=PHYSICS.step){const q=ballistic(p,PHYSICS.step);if(v&&catchVine(p,q,v)!==null)return true;if(q.y>=LANDING_Y)return !v&&q.x>=SHORE_X;p=q;}return false;}
function waitForLaunch(g){for(let i=0;i<1800;i++){if(canLand(g.s))return;g.step(PHYSICS.step);}throw Error(`No reachable launch at vine ${g.s.current}`);}
function advance(g,seconds){for(let i=0;i<Math.ceil(seconds/PHYSICS.step);i++)g.step(PHYSICS.step);}
test('all 40 transitions are reachable; hard windows are narrower than normal',()=>{
 let hardCount=0;for(let i=1;i<VINES.length;i++){const w=releaseWindow(VINES[i-1],VINES[i],.005);assert.ok(w.seconds>0,`vine ${i}`);if(VINES[i].hard){hardCount++;assert.ok(w.seconds>=.06&&w.seconds<.16,`hard ${i}: ${w.seconds}`);}else assert.ok(w.seconds>.22,`normal ${i}: ${w.seconds}`);}assert.equal(hardCount,8);
});
test('manual input completes the entire journey and lands in Japan',()=>{
 const g=createGame();for(let target=1;target<VINES.length;target++){
  g.press();waitForLaunch(g);g.release();assert.equal(g.s.status,'flight');g.press();
  for(let i=0;i<300&&g.s.status==='flight';i++)g.step(PHYSICS.step);
  assert.equal(g.s.current,target,`catch ${target}`);assert.equal(g.s.status,'swing');
 }
 g.press();waitForLaunch(g);g.release();advance(g,2);assert.equal(g.s.status,'goal');assert.equal(g.progress,1);assert.equal(g.s.falls,0);const done={...g.s.player};advance(g,3);assert.deepEqual(g.s.player,done);
});
test('continue restores the last captured vine, preserves distance and counts falls',()=>{
 const g=createGame();g.press();waitForLaunch(g);g.release();g.press();for(let i=0;i<300&&g.s.status==='flight';i++)g.step(PHYSICS.step);
 assert.equal(g.s.current,1);g.cancel();g.press();waitForLaunch(g);g.release();advance(g,3);assert.equal(g.s.status,'failed');assert.equal(g.s.missed,true);const distance=g.distance;assert.equal(g.continue(),true);assert.equal(g.s.current,1);assert.equal(g.s.status,'swing');assert.equal(g.s.held,false);assert.equal(g.s.falls,1);assert.equal(g.distance,distance);
});
test('timer starts only from the start action, includes retries and resets on a new run',()=>{
 const g=createGame({started:false});advance(g,2);assert.equal(g.s.status,'ready');assert.equal(g.s.elapsed,0);
 assert.equal(g.start(),true);advance(g,2);assert.ok(g.s.elapsed>=1.99&&g.s.elapsed<=2.01);
 g.press();g.release();advance(g,3);assert.equal(g.s.status,'failed');assert.equal(g.s.falls,1);const failedTime=g.s.elapsed;
 assert.equal(g.continue(),true);advance(g,1);assert.ok(g.s.elapsed>failedTime);assert.equal(g.s.falls,1);
 const fresh=createGame({started:false});assert.equal(fresh.s.elapsed,0);fresh.start();advance(fresh,.5);assert.ok(fresh.s.elapsed<failedTime);
});
test('auto catch does not require repress; cancellation never launches',()=>{
 const g=createGame({catchMode:'auto'});g.press();g.cancel();assert.equal(g.s.status,'swing');assert.equal(g.s.held,false);g.press();waitForLaunch(g);g.release();advance(g,1.5);assert.equal(g.s.current,1);assert.equal(g.s.held,false);
});
test('holding keeps swinging without spinning or sticking at the turning point',()=>{const g=createGame();g.press();let crossings=0,previous=g.s.angle;for(let i=0;i<120*90;i++){g.step(PHYSICS.step);assert.ok(Math.abs(g.s.angle)<1.2);if(g.s.angle*previous<0)crossings++;previous=g.s.angle;}assert.ok(crossings>40);});
test('swept catch detects crossing; ballistic flight is frame independent',()=>{assert.equal(segmentCircle({x:-100,y:0},{x:100,y:0},{x:0,y:0},10),.45);const p={x:20,y:30,vx:200,vy:-100},a=ballistic(p,1),b=ballistic(ballistic(p,.4),.6);assert.ok(Math.abs(a.y-b.y)<1e-8);});

test('full vine catches at the top, middle and tip, including fast crossings',()=>{
 const vine={x:200,y:30,length:150};
 for(const y of [30,31,65,105,179,180]){
  const hit=catchVine({x:100,y},{x:300,y},vine);
  assert.ok(hit,`height ${y}`);assert.equal(hit.point.x,200);assert.equal(hit.point.y,y);
  assert.ok(Math.abs(hit.t-.425)<1e-9);
 }
 assert.equal(catchVine({x:100,y:14},{x:300,y:14},vine),null);
 assert.equal(catchVine({x:100,y:196},{x:300,y:196},vine),null);
 assert.equal(catchVine({x:216,y:90},{x:216,y:130},vine),null);
 assert.ok(catchVine({x:200,y:0},{x:200,y:210},vine));
 assert.equal(catchVine({x:200,y:100},{x:200,y:100},vine).t,0);
});
test('grabbing an upper section does not teleport to the tip and can continue onward',()=>{
 for(const offset of [0,40,85]){
  const g=createGame(),v=VINES[1];g.s.status='flight';g.s.player={x:v.x-20,y:v.y+offset,vx:300,vy:0};g.press();g.step(.025);
  assert.equal(g.s.current,1);assert.equal(g.s.status,'swing');assert.ok(g.s.gripLength<90);assert.ok(Math.abs(g.s.player.y-(v.y+offset))<2);
  advance(g,3);assert.equal(g.s.gripLength,v.length);assert.ok(Number.isFinite(g.s.player.x));
  waitForLaunch(g);g.release();g.press();for(let i=0;i<300&&g.s.status==='flight';i++)g.step(PHYSICS.step);assert.equal(g.s.current,2);
 }
});
test('manual grip also works when pressing while already next to the middle',()=>{
 const g=createGame(),v=VINES[1];g.s.status='flight';g.s.player={x:v.x+5,y:v.y+70,vx:30,vy:0};g.press();g.step(PHYSICS.step);assert.equal(g.s.current,1);assert.equal(g.s.gripLength,70);
});
