// Paste into the local prototype's DevTools console to verify the real rendered app.
// Uses only the app's same-input test interface; no direct position mutation.
(()=>{
 const g=window.__game;g.manual();g.reset();if(document.querySelector('#result-title').textContent!=='ツタワタリ')throw Error('Game title was not updated');g.start();
 if(getComputedStyle(document.querySelector('header .brand')).display!=='none'||parseFloat(getComputedStyle(document.querySelector('#elapsed-time')).fontSize)<18)throw Error('The in-game title should be hidden and stats enlarged');
 g.press();g.release();
 for(let i=0;i<240&&g.state().status!=='failed';i++)g.step(1/120);
 const retry=document.querySelector('#overlay'),fallCallout=document.querySelector('#moment-callout');
 if(g.state().status!=='failed'||!retry.hidden||fallCallout.hidden||fallCallout.textContent!=='うわーーー！')throw Error('The fall callout should appear before the retry screen');
 g.step(1);if(retry.hidden)throw Error('The retry screen did not appear after the fall callout');
 g.reset();g.start();const areas=new Set();
 function hit(s){let p={...s.player};const v=s.vines[1];if(p.vx<40)return false;
  for(let i=0;i<240;i++){const dt=1/120,q={x:p.x+p.vx*dt,y:p.y+p.vy*dt+310*dt*dt,vx:p.vx,vy:p.vy+620*dt};
   if(v){for(let j=0;j<=4;j++){const x=p.x+(q.x-p.x)*j/4,y=p.y+(q.y-p.y)*j/4,nearY=Math.max(v.y,Math.min(v.y+v.length,y));if(Math.hypot(x-v.x,y-nearY)<=14)return true;}}
   if(q.y>=284)return !v&&q.x>=s.vines[0].x+180;p=q;
  }return false;
 }
 for(let hop=0;hop<41;hop++){
  g.press();let ready=false;for(let i=0;i<1800;i++){if(hit(g.state())){ready=true;break;}g.step(1/120);}if(!ready)throw Error('Unreachable hop '+hop);
  const current=g.state().current;g.release();g.press();for(let i=0;i<300&&g.state().status==='flight';i++)g.step(1/120);
  if(g.state().status==='failed')throw Error('Fell at '+hop);if(hop<40&&g.state().current!==current+1)throw Error('No catch at '+hop);if(g.state().vines.length===1&&document.querySelector('#message').textContent!=='陸地に着地すればゴール！')throw Error('The final vine should clearly mark the landing as the goal');areas.add(g.state().area);
  if(g.state().status!=='goal'&&/日本|富士/.test(document.body.innerText))throw Error('The destination was revealed before the goal');
  if(document.getElementById('distance'))throw Error('Distance should not be displayed');
 }
 if(g.state().status!=='goal')throw Error('No goal');g.step(1);
 if(g.state().elapsed<=0||g.state().falls!==0||g.state().confetti<150)throw Error('Missing finish time, miss count or celebration');
 return JSON.stringify({status:g.state().status,catches:g.state().catches,falls:g.state().falls,areas:[...areas],arrivalSeconds:Math.round(g.state().elapsed),arrivalTime:document.querySelector('#result-detail').textContent,confetti:g.state().confetti});
})();
