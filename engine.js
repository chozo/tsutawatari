import {PHYSICS,bob,ballistic,swing,catchVine} from './physics.js';
import {VINES} from './course.js';
export const LANDING_Y=284;
export const SHORE_X=VINES.at(-1).x+180;
export function createGame({catchMode='manual',checkpoint=0,started=true}={}) {
 const s={catchMode,status:started?'swing':'ready',started,held:false,current:Math.max(0,Math.min(VINES.length-1,checkpoint|0)),angle:-PHYSICS.amplitude,omega:0,gripLength:0,player:null,falls:0,catches:0,missed:false,elapsed:0,maxX:VINES[0].x,visualOffset:{x:0,y:0},event:0};
 function restore(){s.status=s.started?'swing':'ready';s.angle=-PHYSICS.amplitude;s.omega=0;s.held=false;s.missed=false;s.visualOffset={x:0,y:0};s.gripLength=VINES[s.current].length;s.player=bob(VINES[s.current],s.angle,s.omega);s.maxX=Math.max(s.maxX,VINES[s.current].x);s.event++;}
 restore();
 return {s,start(){if(s.started)return false;s.started=true;s.elapsed=0;s.falls=0;s.catches=0;s.current=0;s.maxX=VINES[0].x;restore();return true;},press(){if(s.started&&(s.status==='swing'||s.status==='flight'))s.held=true;},release(launch=true){const was=s.held;s.held=false;if(was&&launch&&s.status==='swing'){s.status='flight';s.missed=false;s.event++;}},cancel(){s.held=false;},
 continue(){if(s.status!=='failed')return false;restore();return true;},
 step(dt){
  if(!s.started||!['swing','flight'].includes(s.status))return;
  s.elapsed+=dt;s.visualOffset.x*=Math.exp(-dt*18);s.visualOffset.y*=Math.exp(-dt*18);
  if(s.status==='swing'){
   const full=VINES[s.current],previousLength=s.gripLength;
   // A caught hand starts where it met the vine, then slides gently downward.
   // This avoids trapping the player on a short upper grip before a long gap.
   s.gripLength=Math.min(full.length,s.gripLength+85*dt);
   if(s.gripLength>0)s.omega*=Math.max(12,previousLength)/Math.max(12,s.gripLength);
   const v={...full,length:s.gripLength},next=swing(v,s.angle,s.omega,s.held,dt);s.angle=next.angle;s.omega=next.omega;s.player=bob(v,s.angle,s.omega);
   const sliding=(s.gripLength-previousLength)/dt;s.player.vx+=sliding*Math.sin(s.angle);s.player.vy+=sliding*Math.cos(s.angle);
  }else{
   const before=s.player;s.player=ballistic(before,dt);
   const next=VINES[s.current+1];
   if(next){const hit=catchVine(before,s.player,next);
    if(hit!==null){
     if(s.held||s.catchMode==='auto'){
      s.visualOffset={x:hit.hand.x-hit.point.x,y:hit.hand.y-hit.point.y};s.gripLength=hit.length;
      s.current++;s.catches++;s.angle=0;
      const maxSpeed=Math.sqrt(2*PHYSICS.gravity/Math.max(12,s.gripLength)*(1-Math.cos(PHYSICS.amplitude)));
      s.omega=Math.max(-maxSpeed,Math.min(maxSpeed,s.player.vx/Math.max(12,s.gripLength)));s.player=bob({...next,length:s.gripLength},0,s.omega);s.status='swing';s.event++;
     }else s.missed=true;
    }
   }
   if(s.status==='flight'&&before.y<LANDING_Y&&s.player.y>=LANDING_Y&&s.player.vy>0&&s.current===VINES.length-1){
    const t=(LANDING_Y-before.y)/(s.player.y-before.y),landX=before.x+(s.player.x-before.x)*t;
    if(landX>=SHORE_X){s.player={x:landX,y:LANDING_Y,vx:0,vy:0};s.status='goal';s.held=false;s.event++;}
   }
   if(s.status==='flight'&&(s.player.y>LANDING_Y||s.player.x<VINES[s.current].x-230)){
    s.status='failed';s.falls++;s.held=false;s.event++;
   }
  }
  s.maxX=Math.max(s.maxX,s.player.x);
 },get distance(){return Math.max(0,Math.round((s.maxX-VINES[0].x)/10));},get progress(){return s.status==='goal'?1:Math.min(.99,s.current/VINES.length);}};
}
