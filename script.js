(()=>{
const $=i=>document.getElementById(i);
const T0=40,TMAX=60,CLOCK=8,COLOR='#e63946';
const cv=$('c');let ctx=cv.getContext('2d');
let SC=1,VW=1280,VH=720,skyBg=null;const cityC=[];
function rs(){const d=Math.min(devicePixelRatio||1,1.5);cv.width=innerWidth*d;cv.height=innerHeight*d;SC=Math.min(cv.height/720,cv.width/640);VW=cv.width/SC;VH=cv.height/SC;skyBg=null;cityC.length=0}
addEventListener('resize',rs);addEventListener('orientationchange',()=>setTimeout(rs,200));rs();

/* ---------- Mundo (determinístico por seed) ---------- */
function rng(s){return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rand=()=>Math.random()*1e9|0;
const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
let PH=[0,0,0],items=[];
function G(x){const a=45+Math.min(Math.max(x,0)/90,75);return 520+sm(x/600)*a*(Math.sin(x/300+PH[0])+.35*Math.sin(x/140+PH[1])+.1*Math.sin(x/60+PH[2]))}
function mkWorld(sd){
  const r=rng(sd);PH=[r()*6,r()*6,r()*6];items=[];let x=700,n=0;
  while(x<90000){n++;
    if(n%7===0){items.push({x,y:G(x)-35-r()*40,t:'k'});x+=300}
    else{const c=3+(r()*3|0),h=25+r()*35;
      for(let i=0;i<c;i++){const cx=x+i*48;items.push({x:cx,y:G(cx)-h-Math.sin(i/(c-1)*Math.PI)*18,t:'c'})}
      x+=c*48+250+r()*250}}
  items.forEach((it,i)=>it.id=i);
}

/* ---------- Jogadores / física ---------- */
const mk=()=>{const y=G(60)-40;return{n:'',col:COLOR,x:60,y,vx:0,vy:0,a:0,w:0,co:0,mx:0,time:T0,done:false,gone:false,got:new Set(),sx:60,sy:y,sa:0,flash:0}};
const score=p=>Math.floor(Math.max(p.mx,0)/40)+p.co*3;

function step(p,dt,gas,br){
  // flutuar: quanto mais alto do chão, menos gravidade e mais resistência vertical
  const alt=G(p.x)-p.y-30,fl=alt>120?Math.min(1,(alt-120)/100):0;
  // rápido e subindo: o carro fica leve, as rodas soltam do chão e ele flutua levemente
  const sp=Math.hypot(p.vx,p.vy),lf=p.vy<-30?Math.min(1,Math.max(0,(sp-350)/150))*Math.min(1,-p.vy/150):0;
  p.vy+=900*Math.min(1-.9*fl,1-.6*lf)*dt;
  if(fl){p.vy-=p.vy*2.2*fl*dt;p.w-=p.w*1.5*fl*dt}
  if(lf){p.w-=p.w*1.5*lf*dt;const sl=Math.atan((G(p.x+60)-G(p.x))/60);p.w+=Math.sin(sl-p.a)*6*lf*dt}
  let c=Math.cos(p.a),s=Math.sin(p.a),ct=false;
  for(const ox of [-34,34]){
    const oy=16,rx=ox*c-oy*s,ry=ox*s+oy*c,wx=p.x+rx,wy=p.y+ry,pen=wy+14-G(wx);
    if(pen>0){
      ct=true;
      const sl=(G(wx+2)-G(wx-2))/4,l=Math.hypot(sl,1),nx=sl/l,ny=-1/l,tx=1/l,ty=sl/l;
      p.x+=nx*pen*.6;p.y+=ny*pen*.6;
      const vn=(p.vx-p.w*ry)*nx+(p.vy+p.w*rx)*ny;
      if(vn<0){const rn=rx*ny-ry*nx,j=-1.1*vn/(1+rn*rn/2500);p.vx+=j*nx;p.vy+=j*ny;p.w+=j*rn/2500}
      const vt=p.vx*tx+p.vy*ty;
      if(br){if(vt>-180){p.vx-=tx*600*dt;p.vy-=ty*600*dt}}
      else if(vt<650){p.vx+=tx*380*dt;p.vy+=ty*380*dt}
      if(gas)p.w-=.5*dt
    }
  }
  if(!ct){if(gas)p.w-=4.5*dt;if(br)p.w+=4.5*dt}
  p.w-=p.w*(ct?2.5:.6)*dt;p.w=Math.max(-6,Math.min(6,p.w));
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.a+=p.w*dt;
  if(p.x<-100){p.x=-100;p.vx=0}
  c=Math.cos(p.a);s=Math.sin(p.a);
  const hx=p.x+6*c+24*s,hy=p.y+6*s-24*c;
  if(hy>G(hx)-3){p.crash=true;p.done=true;return}
  p.mx=Math.max(p.mx,p.x);
  for(const it of items){
    if(it.x<p.x-90)continue;if(it.x>p.x+90)break;if(p.got.has(it.id))continue;
    if(Math.hypot(it.x-p.x,it.y-p.y)<50){p.got.add(it.id);if(it.t==='c')p.co++;else p.time=Math.min(TMAX,p.time+CLOCK)}
  }
  p.time-=dt;if(p.time<=0){p.time=0;p.done=true}
}

/* ---------- Estado do jogo ---------- */
let P=null,run=false,last=0,acc=0,tnow=0,cam={x:0,y:0},keys={g:0,b:0};
let best=0;
try{best=+localStorage.getItem('fastroad-best')||0}catch(e){}
function saveBest(v){best=v;try{localStorage.setItem('fastroad-best',String(v))}catch(e){}}
function showBest(){$('best').textContent='Recorde: '+best}

function startGame(){
  hs=hc=ht=-1;
  mkWorld(rand());P=mk();
  show(null);$('hud').classList.remove('hide');$('touch').classList.remove('hide');
  cam.x=0;cam.y=P.y-VH*.6;last=performance.now();acc=0;keys.g=keys.b=0;
  if(!run){run=true;requestAnimationFrame(loop)}
}
function loop(t){
  if(!run)return;requestAnimationFrame(loop);
  const d=Math.min((t-last)/1000,.1);last=t;acc+=d;tnow+=d;
  while(acc>=1/60){acc-=1/60;if(P&&!P.done){step(P,1/60,keys.g,keys.b);if(P.done)finish()}}
  draw();
}
function finish(){
  const s=score(P),novo=s>best;
  if(novo)saveBest(s);
  $('et').textContent=P.crash?'Você capotou!':'Tempo esgotado!';
  $('fs').textContent='Pontuação: '+s;
  $('fc').textContent='Moedas: '+P.co+'  |  Distância: '+Math.floor(P.mx/40)+' m';
  $('fb').textContent=novo?'Novo recorde!':'Recorde: '+best;
  keys.g=keys.b=0;
  show('end');
}
let hs=-1,hc=-1,ht=-1;
function hudTick(){
  if(!run||!P)return;
  const sc=score(P);if(sc!==hs){hs=sc;$('score').textContent='Pontuação: '+sc}
  if(P.co!==hc){hc=P.co;$('cn').textContent=P.co}
  const f=Math.max(0,P.time)/TMAX,pc=Math.round(f*200)/2,tf=$('tfill');if(pc!==ht){ht=pc;tf.style.width=pc+'%';tf.style.background=`hsl(${f*105},100%,50%)`}
}
setInterval(hudTick,100);

/* ---------- Desenho (visual tecnológico / neon) ---------- */
const STARS=Array.from({length:80},(_,i)=>{const r=rng(500+i);return{x:r(),y:r(),s:r()*1.4+.5,p:r()*6}});
const glow=(c,b)=>{ctx.shadowColor=c;ctx.shadowBlur=b*SC};
const noglow=()=>{ctx.shadowBlur=0;ctx.shadowColor='transparent'};
function ridge(par,base,amp,col,wl,sd){
  const off=cam.x*par;ctx.beginPath();ctx.moveTo(0,VH+10);
  for(let x=0;x<=VW+24;x+=24){const wx=x+off;ctx.lineTo(x,base+amp*(Math.sin(wx/wl+sd)+.5*Math.sin(wx/(wl*.41)+sd*2.3)))}
  ctx.lineTo(VW+24,VH+10);ctx.closePath();ctx.fillStyle=col;ctx.fill();
}
function city(par,base,col,edge,lit,idx){
  // cada camada de prédios é desenhada uma vez numa faixa repetível e depois só copiada
  const w=54,NB=48,W=w*NB,top=base-210,H=VH+10-top;
  let c=cityC[idx];
  if(!c){
    c=cityC[idx]=document.createElement('canvas');c.width=Math.ceil(W*SC);c.height=Math.ceil(H*SC);
    const x=c.getContext('2d');x.setTransform(SC,0,0,SC,0,-top*SC);
    for(let i=0;i<NB;i++){
      const r=rng(i*97+13),h=50+r()*150,bx=i*w,bw=w-8;
      x.fillStyle=col;x.fillRect(bx,base-h,bw,h+VH);
      x.fillStyle=edge;x.fillRect(bx,base-h,bw,2);
      x.fillStyle=lit;
      for(let j=0;j<h-14;j+=14)for(let k=0;k<3;k++)if(r()>.62)x.fillRect(bx+6+k*13,base-h+8+j,5,5);
    }
  }
  const off=((cam.x*par)%W+W)%W;
  for(let X=-off;X<VW;X+=W)ctx.drawImage(c,X,top,W,H);
}
function sky(){
  if(!skyBg){
    skyBg=document.createElement('canvas');skyBg.width=cv.width;skyBg.height=cv.height;
    const c=ctx;ctx=skyBg.getContext('2d');ctx.setTransform(SC,0,0,SC,0,0);
    const g=ctx.createLinearGradient(0,0,0,VH);g.addColorStop(0,'#04061a');g.addColorStop(.55,'#150b3a');g.addColorStop(1,'#5a1a78');
    ctx.fillStyle=g;ctx.fillRect(0,0,VW,VH);
    const sx=VW*.72,sy=VH*.36,rg=ctx.createLinearGradient(0,sy-90,0,sy+90);rg.addColorStop(0,'#ffe14d');rg.addColorStop(1,'#ff3df2');
    glow('#ff3df2',40);ctx.fillStyle=rg;ctx.beginPath();ctx.arc(sx,sy,90,0,7);ctx.fill();noglow();
    ctx.fillStyle='#11093a';for(let k=0;k<5;k++)ctx.fillRect(sx-95,sy+15+k*14,190,2+k*1.6);
    ctx=c;
  }
  ctx.drawImage(skyBg,0,0,VW,VH);
  ctx.fillStyle='#cfe9ff';
  for(const s of STARS){ctx.globalAlpha=.3+.7*Math.abs(Math.sin(tnow*1.5+s.p));ctx.fillRect(s.x*VW,s.y*VH*.6,s.s,s.s)}
  ctx.globalAlpha=1;
  ridge(.08,VH*.62,40,'#1b1050',260,1);
  city(.18,VH*.74,'#0c0f2e','rgba(25,246,255,.5)','rgba(25,246,255,.55)',0);
  city(.35,VH*.86,'#080a22','rgba(255,61,242,.5)','rgba(255,61,242,.5)',1);
}
function car(X,Y,A,q,al){
  if(q.flash>tnow&&((tnow*10)|0)%2)al*=.35;
  ctx.save();ctx.globalAlpha=al;ctx.translate(X,Y);ctx.rotate(A);
  // piloto (pixel art)
  const PX=3,PAL={h:'#4a3228',H:'#6e4b3a',S:'#f2b896',s:'#d99a78',E:'#1a1a1a',M:'#7a2a3a',m:'#4d1a28'};
  const SPR=[
    '..hH.H......',
    '.hHHHHHh....',
    'hHHHHHHHHh..',
    'hHHHHHHHHSh.',
    'hHHHHHHSSSS.',
    '.hHHHHSSESS.',
    '..hHHHSSESS.',
    '...hhSSSSsS.',
    '..MMMMSSMMM.',
    '.MMMMMMMMMMM',
    'MMMMMMMMMMMM',
    'MMMMMMMMMMMM'];
  ctx.imageSmoothingEnabled=false;
  SPR.forEach((row,j)=>{for(let i=0;i<row.length;i++){const c=PAL[row[i]];if(!c)continue;ctx.fillStyle=c;ctx.fillRect(-20+i*PX,-40+j*PX,PX,PX)}});
  // cúpula de vidro
  ctx.fillStyle='rgba(120,230,255,.16)';ctx.strokeStyle='rgba(170,245,255,.75)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(-28,-6);ctx.quadraticCurveTo(-24,-50,2,-50);ctx.quadraticCurveTo(26,-48,32,-4);ctx.closePath();ctx.fill();ctx.stroke();
  // carroceria
  ctx.beginPath();ctx.moveTo(-54,12);ctx.lineTo(-56,-4);ctx.lineTo(-44,-9);ctx.lineTo(18,-5);ctx.lineTo(38,0);ctx.quadraticCurveTo(56,4,54,12);ctx.closePath();
  ctx.fillStyle='#0d1533';glow(q.col,12);ctx.fill();ctx.strokeStyle=q.col;ctx.lineWidth=2.5;ctx.stroke();noglow();
  ctx.strokeStyle='#19f6ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-46,4);ctx.lineTo(46,4);ctx.stroke();
  ctx.fillStyle=q.col;ctx.fillRect(-60,-15,14,3);ctx.fillRect(-54,-12,3,5);
  ctx.fillStyle='#ff2d55';glow('#ff2d55',10);ctx.fillRect(-57,-3,3,8);noglow();
  const bm=ctx.createLinearGradient(54,5,125,5);bm.addColorStop(0,'rgba(255,246,200,.35)');bm.addColorStop(1,'rgba(255,246,200,0)');
  ctx.fillStyle=bm;ctx.beginPath();ctx.moveTo(54,2);ctx.lineTo(125,-12);ctx.lineTo(125,22);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff6c8';glow('#fff6c8',12);ctx.beginPath();ctx.arc(52,5,3,0,7);ctx.fill();noglow();
  ctx.strokeStyle='#19f6ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,-4);ctx.lineTo(14,-24);ctx.stroke();
  ctx.fillStyle='#19f6ff';ctx.beginPath();ctx.arc(14,-24,2.5,0,7);ctx.fill();
  // rodas
  const sp=X/14;
  for(const wx of [-34,34]){
    ctx.fillStyle='#070a18';ctx.beginPath();ctx.arc(wx,16,14,0,7);ctx.fill();
    glow(q.col,8);ctx.strokeStyle=q.col;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(wx,16,11,0,7);ctx.stroke();noglow();
    ctx.strokeStyle='#cfe9ff';ctx.lineWidth=2;ctx.beginPath();
    for(let k=0;k<3;k++){const a=sp+k*2.0944;ctx.moveTo(wx,16);ctx.lineTo(wx+Math.cos(a)*9,16+Math.sin(a)*9)}
    ctx.stroke();ctx.fillStyle='#19f6ff';ctx.beginPath();ctx.arc(wx,16,2.5,0,7);ctx.fill();
  }
  ctx.restore();
  if(!q.n)return;
  ctx.save();ctx.globalAlpha=al;ctx.font='700 17px Orbitron,"Trebuchet MS",sans-serif';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#05071a';ctx.fillStyle=q.col;
  ctx.strokeText(q.n,X,Y-58);glow(q.col,8);ctx.fillText(q.n,X,Y-58);ctx.restore();
}
function draw(){
  const p=P;if(!p)return;
  ctx.setTransform(SC,0,0,SC,0,0);
  cam.x=p.x-VW*.26;cam.y+=((p.y-VH*.6)-cam.y)*.08;
  sky();
  ctx.save();ctx.translate(-cam.x,-cam.y);
  // itens
  for(const it of items){
    if(it.x<cam.x-40)continue;if(it.x>cam.x+VW+40)break;if(p.got.has(it.id))continue;
    if(it.t==='c'){
      const w=Math.abs(Math.cos(tnow*4+it.id))*7+3;
      ctx.fillStyle='rgba(255,179,0,.28)';ctx.beginPath();ctx.ellipse(it.x,it.y,w+5,18,0,0,7);ctx.fill();ctx.fillStyle='#ffe14d';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(it.x,it.y,w,13,0,0,7);ctx.fill();ctx.stroke();
    }else{
      ctx.fillStyle='rgba(255,61,242,.25)';ctx.beginPath();ctx.arc(it.x,it.y,24,0,7);ctx.fill();ctx.fillStyle='#10173a';ctx.strokeStyle='#ff3df2';ctx.lineWidth=3;ctx.beginPath();ctx.arc(it.x,it.y,17,0,7);ctx.fill();ctx.stroke();
      ctx.strokeStyle='#19f6ff';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(it.x+7,it.y+3);ctx.lineTo(it.x,it.y);ctx.lineTo(it.x,it.y-9);ctx.stroke();
    }
  }
  // carro
  car(p.x,p.y,p.a,p,1);
  // chão
  const x0=Math.floor(cam.x/16)*16-32,x1=cam.x+VW+48,yb=cam.y+VH+60;
  const gy=[];for(let x=x0;x<=x1;x+=16)gy.push(G(x));
  ctx.beginPath();ctx.moveTo(x0,yb);for(let i=0,x=x0;x<=x1;x+=16,i++)ctx.lineTo(x,gy[i]);ctx.lineTo(x1,yb);ctx.closePath();
  const gg=ctx.createLinearGradient(0,cam.y,0,yb);gg.addColorStop(0,'#17305e');gg.addColorStop(1,'#060a1f');
  ctx.fillStyle=gg;ctx.fill();
  ctx.save();ctx.clip();
  ctx.strokeStyle='rgba(25,246,255,.13)';ctx.lineWidth=1.5;ctx.beginPath();
  for(let x=Math.floor(x0/90)*90;x<=x1;x+=90){ctx.moveTo(x,cam.y-100);ctx.lineTo(x,yb)}
  for(let y=Math.floor((cam.y-100)/70)*70;y<=yb;y+=70){ctx.moveTo(x0,y);ctx.lineTo(x1,y)}
  ctx.stroke();ctx.restore();
  ctx.beginPath();for(let i=0,x=x0;x<=x1;x+=16,i++){i===0?ctx.moveTo(x,gy[i]):ctx.lineTo(x,gy[i])}
  ctx.lineJoin='round';
  ctx.strokeStyle='rgba(25,246,255,.18)';ctx.lineWidth=16;ctx.stroke();
  ctx.strokeStyle='rgba(25,246,255,.35)';ctx.lineWidth=9;ctx.stroke();
  ctx.strokeStyle='#19f6ff';ctx.lineWidth=4;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.2;ctx.stroke();
  ctx.restore();
}

/* ---------- Telas / menus ---------- */
const screens=['menu','end'];
function show(id){screens.forEach(s=>$(s).classList.toggle('hide',s!==id))}
function toMenu(){
  run=false;P=null;
  $('hud').classList.add('hide');$('touch').classList.add('hide');
  keys.g=keys.b=0;showBest();show('menu');requestAnimationFrame(menuLoop);
}
$('bPlay').onclick=startGame;
$('bAgain').onclick=startGame;
$('bMenu').onclick=toMenu;
showBest();

/* Cenário animado atrás do menu (mesmo céu, sol e cidade do jogo) */
let mLast=0,mx=0;
const MG=x=>VH*.84+Math.sin(x/260)*26+Math.sin(x/110)*7;
const mcar={n:'',col:COLOR,flash:0};
function menuLoop(t){
  if(run)return;requestAnimationFrame(menuLoop);
  const d=Math.min((t-(mLast||t))/1000,.1);mLast=t;tnow+=d;mx+=d*140;cam.x=mx;
  ctx.setTransform(SC,0,0,SC,0,0);sky();
  const x0=-16,x1=VW+16;ctx.beginPath();ctx.moveTo(x0,VH+10);
  for(let x=x0;x<=x1;x+=16)ctx.lineTo(x,MG(x+mx));
  ctx.lineTo(x1,VH+10);ctx.closePath();
  const gg=ctx.createLinearGradient(0,VH*.7,0,VH);gg.addColorStop(0,'#17305e');gg.addColorStop(1,'#060a1f');
  ctx.fillStyle=gg;ctx.fill();
  ctx.beginPath();for(let x=x0;x<=x1;x+=16){const y=MG(x+mx);x===x0?ctx.moveTo(x,y):ctx.lineTo(x,y)}
  ctx.lineJoin='round';ctx.strokeStyle='rgba(25,246,255,.2)';ctx.lineWidth=14;ctx.stroke();ctx.strokeStyle='#19f6ff';ctx.lineWidth=4;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.2;ctx.stroke();
  const cx=VW>VH*1.2?VW*.14:VW*.5,gy=MG(cx+mx),sl=(MG(cx+mx+30)-MG(cx+mx-30))/60,a=Math.atan(sl);
  car(cx,gy-30-Math.cos(a)*4,a,mcar,1);
}
requestAnimationFrame(menuLoop);

/* ---------- Controles ---------- */
const K={ArrowRight:'g',KeyD:'g',ArrowUp:'g',Space:'g',ArrowLeft:'b',KeyA:'b',ArrowDown:'b'};
addEventListener('keydown',e=>{if(K[e.code]){keys[K[e.code]]=1;e.preventDefault()}});
addEventListener('keyup',e=>{if(K[e.code])keys[K[e.code]]=0});
addEventListener('blur',()=>{keys.g=keys.b=0});
[['bG','g'],['bB','b']].forEach(([id,k])=>{
  const b=$(id);
  b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=1});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys[k]=0));
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
})();
