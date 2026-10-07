import {PHYSICS,ballistic,bob,swing} from './physics.js';
import {VINES} from './course.js';
import {createGame,SHORE_X} from './engine.js';
import {AREAS,drawScenery} from './scenery.js';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),stage=$('stage'),pad=$('pad');
function readPreference(name,fallback){try{const value=localStorage.getItem(`vine-trip.${name}`);return value===null?fallback:JSON.parse(value);}catch{return fallback;}}
function savePreference(name,value){try{localStorage.setItem(`vine-trip.${name}`,JSON.stringify(value));}catch{}}
const autoCatch=readPreference('autoCatch',false),explorer=new Image();explorer.src='assets/explorer.png';
let game=createGame({started:false,catchMode:autoCatch?'auto':'manual'}),width=390,height=400,camera=0,viewScale=1,worldOffsetY=0,showGuide=readPreference('guide',false),pointer=null,keyDown=false,manualClock=false,last=0,accumulator=0,uiKey='',freeVines=new Map(),trail=[],particles=[],rings=[],confetti=[],fallingAvatar=null,area=0,previousArea=0,areaFade=1,calloutLife=0,failureOverlayPending=false,cameraShake=0;
let promoEvents=[],promoCapture=false,promoSounds=[];const emit=(type,data={})=>promoEvents.push({type,...data});
let audioEnabled=readPreference('audio',true),audioContext=null,masterGain=null,bgmTimer=null,bgmIndex=0,nextBeat=0;
function clearInput(){game.cancel();pointer=null;keyDown=false;pad.classList.remove('is-down');}
function reset(){clearInput();game=createGame({started:false,catchMode:game.s.catchMode});camera=0;freeVines.clear();trail=[];particles=[];rings=[];confetti=[];fallingAvatar=null;area=0;previousArea=0;areaFade=1;calloutLife=0;failureOverlayPending=false;cameraShake=0;$('moment-callout').hidden=true;uiKey='';updateUI();render();}
function resize(){const box=stage.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);render();}
function press(){game.press();updateUI();}
function release(launch=true){const s=game.s,was=s.held&&s.status==='swing';if(was&&launch)freeVines.set(s.current,{angle:s.angle,omega:s.omega});game.release(launch);if(was&&launch){soundEffect('jump');emit('jump',{vine:s.current});burst(s.player.x,s.player.y,16);}updateUI();}
function resume(){clearInput();if(game.continue()){freeVines.delete(game.s.current);trail=[];particles=[];rings=[];confetti=[];fallingAvatar=null;calloutLife=0;failureOverlayPending=false;$('moment-callout').hidden=true;camera=VINES[game.s.current].x-150;}updateUI();render();}
function formatTime(seconds){const minutes=Math.floor(seconds/60),whole=Math.floor(seconds%60),tenths=Math.floor(seconds*10)%10;return`${String(minutes).padStart(2,'0')}:${String(whole).padStart(2,'0')}.${tenths}`;}
function tone(frequency,when,duration,volume=.02,wave='sine',endFrequency=frequency,c=audioContext,out=masterGain||c?.destination){if(!c)return;const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type=wave;oscillator.frequency.setValueAtTime(frequency,when);if(endFrequency!==frequency)oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency),when+duration);gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(volume,when+.018);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);oscillator.connect(gain);gain.connect(out);oscillator.start(when);oscillator.stop(when+duration+.02);}
const melody=[392,440,523.25,0,587.33,523.25,440,0,392,523.25,659.25,0,587.33,523.25,440,0];
function musicBeat(index,t,c,out){const step=index%melody.length,f=melody[step];if(f)tone(f,t,.24,.016,'triangle',f,c,out);if(step%4===0)tone([196,174.61,146.83,174.61][Math.floor(step/4)],t,.78,.009,'sine',undefined,c,out);}
function scheduleMusic(){if(!audioContext||!audioEnabled)return;const now=audioContext.currentTime;while(nextBeat<now+.18){musicBeat(bgmIndex,nextBeat,audioContext,masterGain);nextBeat+=.38;bgmIndex++;}}
function wakeAudio(){if(!audioEnabled||promoCapture)return;const AudioContextType=window.AudioContext||window.webkitAudioContext;if(!AudioContextType)return;try{if(!audioContext){audioContext=new AudioContextType();masterGain=audioContext.createGain();masterGain.gain.value=.72;masterGain.connect(audioContext.destination);}if(audioContext.state==='suspended')audioContext.resume();if(!bgmTimer){nextBeat=audioContext.currentTime+.08;bgmTimer=setInterval(scheduleMusic,90);scheduleMusic();}}catch{}}
// Sound voices take the context and output, so live play and promo rendering share them.
function soundVoices(kind,t,c,out){const T=(f,w,d,v,wave,e=f)=>tone(f,w,d,v,wave,e,c,out);if(kind==='jump'){T(230,t,.2,.025,'triangle',760);T(115,t,.22,.012,'sine',230);}
 else if(kind==='catch'){T(620,t,.17,.042,'sine',1175);T(930,t+.055,.2,.025,'triangle',1480);T(1240,t+.12,.24,.012,'sine',1760);}
 else if(kind==='fall'){T(470,t,.52,.05,'sawtooth',72);T(235,t+.08,.43,.035,'triangle',58);}
 else if(kind==='goal'){[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>T(f,t+i*.14,.72-i*.085,.05,'sine'));[261.63,329.63,392,523.25].forEach(f=>T(f,t+.62,1.6,.022,'triangle'));}}
function soundEffect(kind){if(promoCapture){promoSounds.push({name:kind,args:[]});return;}if(!audioEnabled||!audioContext)return;soundVoices(kind,audioContext.currentTime+.015,audioContext,masterGain);}
function renderSound(c,name,args,when){const out=c.createGain();out.gain.value=.72;out.connect(c.destination);if(name==='bgm'){for(let i=0,t=when;t<when+(args[0]||30);i++,t+=.38)musicBeat(i,t,c,out);}else soundVoices(name,when+.015,c,out);}
function showCallout(text,kind,duration){const node=$('moment-callout');node.textContent=text;node.className=`moment-callout is-${kind}`;node.hidden=false;void node.offsetWidth;node.classList.add('is-live');calloutLife=duration;}
function vibrate(pattern){try{navigator.vibrate?.(pattern);}catch{}}
function burst(x,y,count=24){const colors=['#fff1af','#ffce72','#f68c6e','#bce6ce','#fff9df'];for(let i=0;i<count;i++){const a=Math.PI*2*i/count+(Math.random()-.5)*.2,speed=55+Math.random()*155;particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-25,life:.48+Math.random()*.3,size:2.5+Math.random()*4,color:colors[i%colors.length],spin:(Math.random()-.5)*15,angle:Math.random()*Math.PI});}rings.push({x,y,r:8,life:.4,color:'#fff4c4'});}
function startGame(){if(game.s.status!=='ready')return;wakeAudio();game.start();uiKey='';updateUI();render();}
function celebrate(){confetti=[];for(let i=0;i<340;i++){const size=4+Math.random()*8;confetti.push({x:camera+width/viewScale*(.06+Math.random()*.88),y:height/viewScale*(.08+Math.random()*.5)-worldOffsetY,vx:(Math.random()-.5)*270,vy:-85-Math.random()*270,size,angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*15,hue:Math.floor(Math.random()*360),life:4+Math.random()*2.6});}}
function updateUI(){const s=game.s,next=VINES[s.current+1],ended=['ready','failed','goal'].includes(s.status)&&!(s.status==='failed'&&failureOverlayPending);$('app').classList.toggle('is-playing',s.started);pad.classList.toggle('is-down',s.held);pad.disabled=!s.started||['failed','goal'].includes(s.status);$('auto-catch').checked=s.catchMode==='auto';$('guide').checked=showGuide;$('intro-art').hidden=s.status!=='ready';
 $('audio-toggle').textContent=audioEnabled?'♪ 音 ON':'♪ 音 OFF';$('audio-toggle').setAttribute('aria-pressed',String(audioEnabled));$('audio-toggle').setAttribute('aria-label',audioEnabled?'BGMと効果音を消音':'BGMと効果音を再生');
 $('elapsed-time').textContent=formatTime(s.elapsed);$('miss-count').textContent=String(s.falls);
 $('area-name').textContent=s.status==='goal'?'09 日本':`${String(area+1).padStart(2,'0')} ${AREAS[area].name}`;
 $('progress').style.width=`${game.progress*100}%`;
 $('difficulty').textContent=next?.hard?'難所 · しっかり揺れて、狙って離す':!next?'最後のジャンプ · 思い切って飛ぼう':'長押しで勢いをつけよう';$('difficulty').classList.toggle('is-hard',!!next?.hard);
 $('state-label').textContent={ready:'スタート待ち',swing:'ツタにつかまり中',flight:'空中を飛行中',failed:'落下',goal:'日本に到着'}[s.status];
 $('message').textContent=s.status==='flight'?(s.catchMode==='auto'?'次のツタは、自動でキャッチ':s.held?'そのまま、次のツタをつかもう':'もう一度長押し！'):(s.held?'右へ振れたところで、離す！':'長押しで、勢いをつけよう');
 if(!next)$('message').textContent='ツタを離して、向こうへ！';
 $('detail').textContent=next?.hard?'一往復待つと、十分な勢いがつきます':'ツタのどこに触れても、つかまれます';
 if(s.current===VINES.length-1&&s.status!=='goal'){$('message').textContent='陸地に着地すればゴール！';$('detail').textContent='最後のツタから思い切って飛ぼう';}
 $('pad-title').textContent=!s.started?'スタートを押してください':s.held?(s.status==='flight'?'押したまま、キャッチを待つ':'指を離して、ジャンプ！'):s.status==='flight'?(s.catchMode==='auto'?'自動キャッチを待つ':'もう一度、長押し！'):'長押し → 離してジャンプ';
 $('pad-detail').textContent=!s.started?'タイムとミスを記録します':s.catchMode==='auto'?'次のツタは自動でつかみます':'飛んだら、もう一度長押しでキャッチ';$('pad-symbol').textContent=s.held?'◉':'◎';
 $('footnote').textContent=`ミス ${s.falls}回 · 落下したツタから再開できます · PCは Space`;
 $('overlay').hidden=!ended;$('overlay').classList.toggle('is-goal',s.status==='goal');$('resume').hidden=s.status==='goal';$('restart').hidden=s.status==='ready';
 if(s.status==='ready'){$('result-eyebrow').textContent='VINE TRIP';$('result-title').textContent='ツタワタリ';$('result-detail').textContent='長押しで揺れて、指を離すとジャンプ。\n次のツタをつかんで、先へ進もう。';$('resume').textContent='旅をはじめる';}
 else if(s.status==='failed'){$('result-eyebrow').textContent='ONE MORE SWING';$('result-title').textContent='もう一度、このツタから。';$('result-detail').textContent=`${AREAS[area].name}\n${s.missed?'ツタには届いた！ 空中で押し直そう。':next?.hard?'十分に揺れてから、離す瞬間を少し変えよう。':'右へ進む勢いがあるときに離してみよう。'}\nここまでのミス ${s.falls}回`;$('resume').textContent='ここから続ける';}
 else if(s.status==='goal'){$('result-eyebrow').textContent='WELCOME TO JAPAN';$('result-title').textContent='日本に着いた！';$('result-detail').textContent=`到着タイム　${formatTime(s.elapsed)}\nミス　${s.falls}回\n海の向こうは、日本でした。`;}
}
function pointerDown(e){if(pointer!==null||keyDown||!game.s.started||!['swing','flight'].includes(game.s.status)||e.target?.closest?.('.overlay'))return;e.preventDefault();pointer=e.pointerId;e.currentTarget.setPointerCapture(pointer);press();}
function pointerUp(e){if(e.pointerId!==pointer)return;e.preventDefault();pointer=null;release();}
function cancelInput(){release(false);clearInput();updateUI();}
for(const surface of [pad,stage]){surface.addEventListener('pointerdown',pointerDown);surface.addEventListener('pointerup',pointerUp);surface.addEventListener('pointercancel',e=>{if(e.pointerId===pointer)cancelInput();});surface.addEventListener('lostpointercapture',()=>{if(pointer!==null)cancelInput();});surface.addEventListener('contextmenu',e=>e.preventDefault());}
window.addEventListener('keydown',e=>{if(e.code!=='Space'||e.repeat||pointer!==null||['INPUT','BUTTON'].includes(document.activeElement?.tagName)&&document.activeElement!==pad)return;e.preventDefault();keyDown=true;press();});
window.addEventListener('keyup',e=>{if(e.code==='Space'&&keyDown){e.preventDefault();keyDown=false;release();}});
window.addEventListener('blur',cancelInput);document.addEventListener('visibilitychange',()=>{cancelInput();last=0;accumulator=0;if(audioContext){if(document.hidden)audioContext.suspend();else if(audioEnabled){audioContext.resume();nextBeat=audioContext.currentTime+.05;scheduleMusic();}}});
$('reset').onclick=reset;$('restart').onclick=reset;$('resume').onclick=()=>game.s.status==='ready'?startGame():resume();$('auto-catch').onchange=e=>{game.s.catchMode=e.target.checked?'auto':'manual';savePreference('autoCatch',e.target.checked);cancelInput();};$('guide').onchange=e=>{showGuide=e.target.checked;savePreference('guide',showGuide);};
$('audio-toggle').onclick=()=>{audioEnabled=!audioEnabled;savePreference('audio',audioEnabled);if(audioEnabled){if(game.s.started)wakeAudio();if(masterGain)masterGain.gain.setTargetAtTime(.72,audioContext.currentTime,.035);}else{if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null;}if(masterGain)masterGain.gain.setTargetAtTime(.0001,audioContext.currentTime,.025);}updateUI();};
function tick(dt){const before=game.s.current,oldStatus=game.s.status;game.step(dt);const s=game.s;
 const calloutWasLive=calloutLife>0;calloutLife=Math.max(0,calloutLife-dt);if(!calloutLife){$('moment-callout').hidden=true;if(calloutWasLive&&failureOverlayPending){failureOverlayPending=false;uiKey='';}}cameraShake=Math.max(0,cameraShake-dt*3.2);
 if(fallingAvatar){fallingAvatar.x+=fallingAvatar.vx*dt;fallingAvatar.y+=fallingAvatar.vy*dt;fallingAvatar.vy+=PHYSICS.gravity*dt;fallingAvatar.angle+=dt*7;fallingAvatar.life-=dt;if(fallingAvatar.life<=0)fallingAvatar=null;}
 if(s.current!==before){freeVines.delete(s.current);burst(s.player.x,s.player.y,30);cameraShake=Math.max(cameraShake,.24);vibrate(18);}
 if(s.catches>(tick.lastCatches||0)){soundEffect('catch');emit('catch',{vine:s.current,hard:!!VINES[s.current].hard});showCallout('ナイスキャッチ！','catch',.72);}tick.lastCatches=s.catches;
 if(oldStatus!==s.status&&['failed','goal'].includes(s.status)){pointer=null;keyDown=false;if(s.status==='failed'){failureOverlayPending=true;fallingAvatar={x:s.player.x,y:s.player.y,vx:s.player.vx,vy:Math.max(160,s.player.vy),angle:0,life:.58};soundEffect('fall');burst(s.player.x,s.player.y,48);rings.push({x:s.player.x,y:s.player.y,r:5,life:.7,color:'#ff8572'});cameraShake=1;showCallout('うわーーー！','fall',.9);emit('fall',{vine:s.current,missed:s.missed});vibrate([45,35,90]);}else{failureOverlayPending=false;fallingAvatar=null;celebrate();burst(s.player.x,s.player.y,72);soundEffect('goal');cameraShake=.58;showCallout('ゴール！！','goal',2.25);emit('goal',{elapsed:s.elapsed,falls:s.falls});vibrate([28,35,28,35,110]);}}
 for(const [index,p] of freeVines){if(index<s.current-2){freeVines.delete(index);continue;}Object.assign(p,swing(VINES[index],p.angle,p.omega,false,dt));}
 const wantedArea=s.status==='goal'?8:Math.min(7,VINES[s.current].area);if(wantedArea!==area){previousArea=area;area=wantedArea;areaFade=0;emit('area',{area,name:AREAS[area].name});}areaFade=Math.min(1,areaFade+dt*1.4);
 const target=s.current===VINES.length-1&&s.status!=='goal'?SHORE_X-210:Math.max(0,(s.status==='flight'?s.player.x-200:VINES[s.current].x-150));camera+=(target-camera)*(1-Math.exp(-dt*5));
 if(s.status==='goal')camera=SHORE_X-210;
 if(s.status==='flight')trail.push({x:s.player.x,y:s.player.y,life:.28});for(const p of trail)p.life-=dt;trail=trail.filter(p=>p.life>0);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.angle+=p.spin*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
 for(const r of rings){r.r+=240*dt;r.life-=dt;}rings=rings.filter(r=>r.life>0);
 for(const p of confetti){p.vx*=Math.exp(-dt*.38);p.vy+=245*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;p.life-=dt;}confetti=confetti.filter(p=>p.life>0&&p.y<height/viewScale+40);
 const key=[s.event,s.held,s.status,game.distance,area,game.progress,Math.floor(s.elapsed*10)].join('|');if(key!==uiKey){uiKey=key;updateUI();}
}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function line(a,b,color,lw=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.stroke();}
function render(){const s=game.s;if(!s.player)return;const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
 const scale=viewScale=Math.min(width/420,height/360),worldW=width/scale,worldH=height/scale,oy=worldOffsetY=Math.max(0,(worldH-360)*.3);ctx.scale(scale,scale);if(cameraShake>0)ctx.translate((Math.random()-.5)*cameraShake*12,(Math.random()-.5)*cameraShake*9);
 ctx.fillStyle=AREAS[area].sky[0];ctx.fillRect(0,0,worldW,worldH);ctx.translate(0,oy);const journeyReveal=s.status==='goal'?1:0;drawScenery(ctx,worldW,worldH-oy,camera,previousArea,journeyReveal);if(areaFade>0){ctx.save();ctx.globalAlpha=areaFade;drawScenery(ctx,worldW,worldH-oy,camera,area,journeyReveal);ctx.restore();}

 // Trees, cables and impossible sea vines all have visible overhead supports.
 ctx.strokeStyle=area>=3&&area!==4?'#596653':'#4c6547';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-10,29);ctx.bezierCurveTo(90,16,240,44,worldW+10,25);ctx.stroke();
 for(let i=Math.max(0,s.current-1);i<Math.min(VINES.length,s.current+3);i++){
  const v=VINES[i],top={x:v.x-camera,y:v.y},active=i===s.current&&s.status==='swing',free=freeVines.get(i),end=active?bob(v,s.angle,s.omega):free?bob(v,free.angle,free.omega):{x:v.x,y:v.y+v.length};const tip={x:end.x-camera,y:end.y};
  if(Math.max(top.x,tip.x)<-80||Math.min(top.x,tip.x)>worldW+80)continue;
  if(i===s.current+1){ctx.save();ctx.globalAlpha=.14;line(top,tip,v.hard?'#ffcf94':'#f4ffd1',PHYSICS.catchRadius*2);ctx.restore();}line(top,tip,'#263e32',5);line(top,tip,active?'#c6d589':v.hard?'#d6a578':'#8fab65',3);
  for(let leaf=1;leaf<=4;leaf++){const k=leaf/6,x=top.x+(tip.x-top.x)*k,y=top.y+(tip.y-top.y)*k;ctx.save();ctx.translate(x,y);ctx.rotate((leaf%2?1:-1)*.7);ctx.fillStyle=area===4?'#afcab5':'#789b59';ctx.beginPath();ctx.ellipse(leaf%2?5:-5,0,8,3,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  circle(top.x,top.y,4,'#ded5a1');circle(tip.x,tip.y,5,active?'#fbdf98':v.hard?'#f5c097':'#e9edb5');
  if(i===s.current+1){ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#35504b';ctx.strokeText(v.hard?'難所':'NEXT',tip.x,tip.y+29);ctx.fillStyle=v.hard?'#ffdbba':'#ffffe1';ctx.fillText(v.hard?'難所':'NEXT',tip.x,tip.y+29);}
 }
 if(s.current>=VINES.length-2&&SHORE_X-camera<worldW){const shore=SHORE_X-camera;ctx.fillStyle='#c3b28b';ctx.fillRect(shore,310,worldW+camera-SHORE_X,worldH);ctx.fillStyle='#8c9f66';ctx.fillRect(shore,304,worldW+camera-SHORE_X,7);if(s.current===VINES.length-1){ctx.save();
  const gate=shore+90;ctx.fillStyle='#713a32';ctx.fillRect(gate-69,190,10,116);ctx.fillRect(gate+59,190,10,116);ctx.fillRect(gate-83,181,166,12);ctx.fillRect(gate-70,197,140,7);
  ctx.beginPath();ctx.moveTo(gate-62,204);ctx.lineTo(gate+62,204);ctx.lineTo(gate+58,251);ctx.quadraticCurveTo(gate,263,gate-58,251);ctx.closePath();ctx.fillStyle='#b84f42';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#f7dfaa';ctx.stroke();
  ctx.font='900 25px ui-rounded, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#7b342d';ctx.strokeText('ゴール！',gate,231);ctx.fillStyle='#fff2c5';ctx.fillText('ゴール！',gate,231);
  for(const side of [-1,1]){ctx.fillStyle='#f6d78e';ctx.beginPath();ctx.moveTo(gate+side*51,256);ctx.lineTo(gate+side*57,271);ctx.lineTo(gate+side*63,256);ctx.closePath();ctx.fill();}ctx.restore();
 }}
 if(showGuide&&s.status==='swing'&&s.held){for(let i=1;i<=14;i++){const p=ballistic(s.player,i*.045);circle(p.x-camera,p.y,Math.max(1.5,3-i*.09),`rgba(255,249,207,${.9-i*.045})`);}}
 for(const p of trail)circle(p.x-camera,p.y,2,`rgba(255,241,193,${p.life*1.5})`);
 for(const r of rings){ctx.save();ctx.globalAlpha=Math.max(0,r.life*2.5);ctx.strokeStyle=r.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x-camera,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const p of particles){ctx.save();ctx.translate(p.x-camera,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();}
 if(s.status!=='failed'||fallingAvatar){
  const p=fallingAvatar||s.player,x=p.x-camera+(fallingAvatar?0:s.visualOffset.x),y=p.y+(fallingAvatar?0:s.visualOffset.y);ctx.save();ctx.translate(x,y);ctx.rotate(fallingAvatar?fallingAvatar.angle:s.status==='swing'?-s.angle*.2:Math.max(-.4,Math.min(.4,p.vx/850)));
  if(explorer.complete&&explorer.naturalWidth){const scale=.096;ctx.drawImage(explorer,-explorer.width*.488*scale,-explorer.height*.182*scale,explorer.width*scale,explorer.height*scale);}
  else{line({x:-4,y:19},{x:-8,y:29},'#b5754b',3);line({x:4,y:19},{x:8,y:29},'#b5754b',3);circle(0,15,8,'#d79550');circle(0,5,8,'#ffddb0');line({x:-5,y:12},{x:s.held||s.status==='swing'?0:-10,y:s.held||s.status==='swing'?-1:9},'#f8d09d',3);line({x:5,y:12},{x:10,y:s.held?-2:9},'#f8d09d',3);ctx.fillStyle='#596c3c';ctx.fillRect(-8,14,16,6);circle(2,4,1.2,'#46382d');circle(5,4,1.2,'#46382d');line({x:-7,y:-2},{x:7,y:-2},'#887048',4);}
  ctx.restore();
 }
 for(const p of confetti){ctx.save();ctx.translate(p.x-camera,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=`hsl(${p.hue} 88% 61%)`;ctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.68);ctx.restore();}
}
function frame(now){if(!manualClock&&!document.hidden){accumulator+=last?Math.min((now-last)/1000,.05):0;while(accumulator>=PHYSICS.step){tick(PHYSICS.step);accumulator-=PHYSICS.step;}render();}last=now;requestAnimationFrame(frame);}
window.__game={state(){return {...game.s,player:{...game.s.player},distance:game.distance,progress:game.progress,area,width,height,camera,confetti:confetti.length,vines:VINES.slice(game.s.current,game.s.current+3)};},press,release,touchDown(){if(game.s.started&&['swing','flight'].includes(game.s.status))press();},touchUp(){release();},drainEvents(){const e=promoEvents;promoEvents=[];return e;},audio:{capture(on){promoCapture=on;},drain(){const q=promoSounds;promoSounds=[];return q;},render:renderSound,play(name,...args){if(promoCapture)promoSounds.push({name,args});}},start:startGame,reset,resume,manual(value=true){manualClock=value;last=0;accumulator=0;},step(seconds){let remaining=seconds;while(remaining>1e-8){const dt=Math.min(PHYSICS.step,remaining);tick(dt);remaining-=dt;}render();},setCatchMode(mode){if(!['manual','auto'].includes(mode))throw Error('Invalid catch mode');game.s.catchMode=mode;$('auto-catch').checked=mode==='auto';updateUI();}};
new ResizeObserver(resize).observe(stage);updateUI();requestAnimationFrame(frame);
