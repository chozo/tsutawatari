export const AREAS=[
 {name:'草原',sky:['#71b3b1','#dae9b9'],ground:'#698956',far:'#96b786'},
 {name:'川と沼',sky:['#629c9c','#b6d0ad'],ground:'#426e65',far:'#729786'},
 {name:'集落',sky:['#8eafaf','#f5dca4'],ground:'#928654',far:'#b4b58a'},
 {name:'高層都市',sky:['#789aab','#d6d7bf'],ground:'#536f67',far:'#81969b'},
 {name:'雪国',sky:['#789cae','#e9f4ee'],ground:'#dae9e6',far:'#bacfd1'},
 {name:'溶岩帯',sky:['#3d4656','#b37564'],ground:'#573e40',far:'#805857'},
 {name:'砂漠',sky:['#a6888e','#f4c68a'],ground:'#c49760',far:'#d9b17a'},
 {name:'海',sky:['#78a6b9','#e3e4c2'],ground:'#4e929e',far:'#aac6b6'},
 {name:'日本',sky:['#94b4bd','#f7e6c4'],ground:'#84946b',far:'#b1c2ad'}
];
export function drawScenery(ctx,w,h,camera,area,journey){
 const a=AREAS[area],g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,a.sky[0]);g.addColorStop(1,a.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const poly=(pts,color)=>{ctx.fillStyle=color;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
 const circle=(x,y,r,color)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 circle(w*.78,68,24,area===5?'#dc9a76':'#fff2cb');
 for(let i=0;i<5;i++){const x=((i*138-camera*.09)%(w+180)+w+180)%(w+180)-70;ctx.fillStyle='#fff7e435';ctx.beginPath();ctx.ellipse(x,67+i%2*34,44,9,0,0,Math.PI*2);ctx.fill();}
 for(let i=-1;i<5;i++){const x=i*180-((camera*.16)%180);poly([[x-50,295],[x+65,area===4?115:area===6?230:195],[x+210,310]],a.far);if(area===4)poly([[x+37,158],[x+65,115],[x+111,177],[x+75,162],[x+59,173]],'#ecf5ef');}
 if(area>=7&&journey>.82){const appear=Math.min(1,(journey-.82)/.16),x=w*.8-appear*70;ctx.globalAlpha*=appear;poly([[x-145,305],[x-28,181],[x+16,181],[x+157,305]],'#7897a3');poly([[x-69,227],[x-28,181],[x+16,181],[x+69,226],[x+20,213],[x-7,222],[x-29,208]],'#f5f3df');ctx.globalAlpha/=appear||1;}
 ctx.fillStyle=a.ground;ctx.fillRect(0,310,w,h-310);
 for(let i=-1;i<8;i++){
  const x=i*105-((camera*.52)%105),variant=((Math.floor(camera*.52/105)+i)%4+4)%4;
  if(area===0||area===1){
   if(variant%2===0){ctx.fillStyle='#59774d';ctx.fillRect(x+30,237,7,75);circle(x+33,226,27,area===1?'#487867':'#77985d');circle(x+49,244,23,area===1?'#4e806b':'#72965a');}
   if(area===0&&variant===1){ctx.fillStyle='#d9dac2';ctx.fillRect(x+30,291,26,12);ctx.fillRect(x+48,286,12,10);ctx.fillStyle='#545f46';for(const dx of [32,50])ctx.fillRect(x+dx,300,3,10);circle(x+37,295,4,'#6d785c');}
   if(area===1){ctx.strokeStyle='#91b7a6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,324);ctx.lineTo(x+58,324);ctx.stroke();if(variant===1){ctx.fillStyle='#385849';ctx.fillRect(x+16,314,35,7);circle(x+44,313,3,'#e1d787');}}
  }else if(area===2){
   const hh=variant%2?36:51;ctx.fillStyle=['#d3b988','#ead2a2','#b8bf9d','#d1b58f'][variant];ctx.fillRect(x+14,310-hh,62,hh);poly([[x+6,312-hh],[x+44,285-hh],[x+83,312-hh]],'#92745b');ctx.fillStyle='#577776';ctx.fillRect(x+25,285,11,13);ctx.fillRect(x+49,287,14,23);
  }else if(area===3){
   const bh=105+variant*30;ctx.fillStyle=['#789395','#94aaa3','#688b91','#a4b4a8'][variant];ctx.fillRect(x+6,310-bh,76,bh);ctx.fillStyle='#dce1b4';for(let row=0;row<Math.floor(bh/24);row++)for(let col=0;col<3;col++)ctx.fillRect(x+16+col*21,320-bh+row*23,10,11);ctx.fillStyle='#54775b';ctx.fillRect(x+1,310-bh-6,85,7);
  }else if(area===4){
   ctx.fillStyle='#677f7b';ctx.fillRect(x+35,265,5,48);poly([[x+10,287],[x+37,233],[x+65,287]],'#82a6a1');poly([[x+17,270],[x+37,230],[x+56,270]],'#e1ece5');circle(x+73,299,11,'#f0f4e9');circle(x+73,285,8,'#f0f4e9');circle(x+76,285,1.5,'#6d8586');
  }else if(area===5){
   poly([[x-10,321],[x+17,267-variant*11],[x+64,312],[x+93,285],[x+122,333]],'#60484b');poly([[x+16,279-variant*11],[x+21,296],[x+14,319],[x+28,347],[x+43,340],[x+23,318],[x+29,298]],'#f6a060');ctx.fillStyle='#de825a';ctx.fillRect(x+52,329,40,3);
  }else if(area===6){
   ctx.fillStyle='#dbac70';ctx.beginPath();ctx.ellipse(x+45,321,85,28,-.1,0,Math.PI*2);ctx.fill();if(variant===1){poly([[x+10,303],[x+23,289],[x+37,301],[x+49,288],[x+62,302],[x+62,310],[x+10,310]],'#8f7959');ctx.fillStyle='#8f7959';ctx.fillRect(x+59,280,6,25);ctx.fillRect(x+59,280,13,5);ctx.fillRect(x+16,305,4,17);ctx.fillRect(x+52,305,4,17);}
  }else if(area===7){
   ctx.strokeStyle='#b5d4c5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+5,328);ctx.quadraticCurveTo(x+26,321,x+51,328);ctx.stroke();if(variant===1){poly([[x-9,311],[x+17,291],[x+42,311]],'#899c72');ctx.strokeStyle='#6d8158';ctx.beginPath();ctx.moveTo(x+15,294);ctx.quadraticCurveTo(x+22,277,x+20,268);ctx.stroke();poly([[x+1,273],[x+20,264],[x+41,270],[x+20,269]],'#6b8966');}
  }else{ctx.fillStyle='#bcaa87';ctx.fillRect(x,313,105,48);}
 }
 if(area===4){ctx.fillStyle='#f4f9efb0';for(let i=0;i<24;i++)circle((i*71-camera*.22)%w,(i*43+camera*.1)%310,1.6,'#f4f9efb0');}
 if(area===5){for(let i=0;i<12;i++)circle((i*67-camera*.1)%w,245+(i*31)%65,1.5,'#ffd29b');}
}
