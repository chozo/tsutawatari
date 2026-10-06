export const PHYSICS = Object.freeze({ gravity: 620, amplitude: 1.12, catchRadius: 15, step: 1 / 120 });
export function bob(vine, angle, omega) {
  const {x,y,length:l}=vine;
  return {x:x+l*Math.sin(angle),y:y+l*Math.cos(angle),vx:l*Math.cos(angle)*omega,vy:-l*Math.sin(angle)*omega};
}
export function ballistic(p,t) {
  return {x:p.x+p.vx*t,y:p.y+p.vy*t+PHYSICS.gravity*t*t/2,vx:p.vx,vy:p.vy+PHYSICS.gravity*t};
}
export function swing(vine,angle,omega,held,dt) {
  const g=PHYSICS.gravity,l=Math.max(12,vine.length);
  omega-=g/l*Math.sin(angle)*dt;
  omega*=Math.exp(-.035*dt);
  angle+=omega*dt;
  // A bounded energy assist while holding: wait one swing to build momentum.
  const target=g*l*(1-Math.cos(PHYSICS.amplitude));
  const potential=g*l*(1-Math.cos(angle));
  const energy=l*l*omega*omega/2+potential;
  const wanted=held?Math.min(target,energy+target*1.3*dt):Math.min(target,energy);
  if(wanted>potential){const sign=Math.sign(omega)||-Math.sign(angle)||1;omega=sign*Math.sqrt(2*(wanted-potential))/l;}
  // Resolve the turning point explicitly so the energy assist cannot hold the
  // pendulum motionless just below its maximum angle.
  if(Math.abs(angle)>=PHYSICS.amplitude-.001&&angle*omega>0){angle=Math.sign(angle)*PHYSICS.amplitude;omega=0;}
  return {angle,omega};
}
export function segmentCircle(a,b,c,r=PHYSICS.catchRadius) {
  const fx=a.x-c.x,fy=a.y-c.y,dx=b.x-a.x,dy=b.y-a.y;
  const cc=fx*fx+fy*fy-r*r;if(cc<=0)return 0;
  const aa=dx*dx+dy*dy;if(aa===0)return null;
  const bb=2*(fx*dx+fy*dy),disc=bb*bb-4*aa*cc;if(disc<0)return null;
  const t=(-bb-Math.sqrt(disc))/(2*aa);return t>=0&&t<=1?t:null;
}
// Earliest swept contact between a moving hand and a complete vine (capsule).
export function catchVine(a,b,vine,r=PHYSICS.catchRadius) {
  const top={x:vine.x,y:vine.y},bottom={x:vine.x,y:vine.y+vine.length};
  const hits=[segmentCircle(a,b,top,r),segmentCircle(a,b,bottom,r)].filter(t=>t!==null);
  let enter=0,exit=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,vine.x-r,vine.x+r],[a.y,b.y-a.y,vine.y,vine.y+vine.length]]){
    if(Math.abs(delta)<1e-12){if(start<min||start>max){enter=2;break;}}
    else{let lo=(min-start)/delta,hi=(max-start)/delta;if(lo>hi)[lo,hi]=[hi,lo];enter=Math.max(enter,lo);exit=Math.min(exit,hi);}
  }
  if(enter<=exit&&enter>=0&&enter<=1)hits.push(enter);
  if(!hits.length)return null;
  const t=Math.min(...hits),hand={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  const length=Math.max(0,Math.min(vine.length,hand.y-vine.y));
  return {t,length,point:{x:vine.x,y:vine.y+length},hand};
}
export function fullSwingRelease(vine,angle) {
  const omega=Math.sqrt(Math.max(0,2*PHYSICS.gravity/vine.length*(Math.cos(angle)-Math.cos(PHYSICS.amplitude))));
  return bob(vine,angle,omega);
}
// Offline course calibration also uses this function. It measures a forward swing,
// including the player's hand reach, rather than guessing difficulty from distance.
export function releaseWindow(from,to,angleStep=.005) {
  let duration=0,min=null,max=null;
  const target=to;
  for(let a=-PHYSICS.amplitude+.01;a<PHYSICS.amplitude-.01;a+=angleStep){
    const start=fullSwingRelease(from,a);let p=start,hit=false;
    for(let t=0;t<1.8;t+=PHYSICS.step){const q=ballistic(p,PHYSICS.step);if(catchVine(p,q,target)!==null){hit=true;break;}if(q.x>target.x+PHYSICS.catchRadius||q.y>390)break;p=q;}
    if(hit){const omega=Math.hypot(start.vx,start.vy)/from.length;duration+=angleStep/omega;if(min===null)min=a;max=a;}
  }
  return {seconds:duration,min,max};
}
