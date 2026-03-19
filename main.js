/* CURSOR */
const dot=document.getElementById('cur-dot'),ring=document.getElementById('cur-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px'});
(function loop(){rx+=(mx-rx)*.1;ry+=(my-ry)*.1;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop)})();
document.querySelectorAll('a,button,.card,.pillar,.qopt,.wcard,.qcard').forEach(el=>{
  el.addEventListener('mouseenter',()=>document.body.classList.add('hov'));
  el.addEventListener('mouseleave',()=>document.body.classList.remove('hov'));
});

/* ═══════════════════════════════════════════════════════
   CINEMATIC INTRO ENGINE
   Phase 1 (0-2s):   Stars + Globe materialises
   Phase 2 (2-4.5s): Words orbit the globe, spiralling in
   Phase 3 (4.5-6s): Globe implodes, TTT letters burst out
   Phase 4 (6-7s):   White flash → fade to hero
═══════════════════════════════════════════════════════ */
(function(){
  const cv = document.getElementById('intro-canvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, cx, cy;
  function resize(){
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
    cx = W/2; cy = H/2;
  }
  resize();
  window.addEventListener('resize', resize);

  const startTime = performance.now();
  let phase = 0; // 0=build 1=orbit 2=implode 3=burst 4=done
  let done = false;

  /* ── STARS ── */
  const stars = Array.from({length:220}, ()=>({
    x: Math.random()*2-1, y: Math.random()*2-1,
    z: Math.random(),
    r: Math.random()*1.4+.3,
    tw: Math.random()*Math.PI*2
  }));

  /* ── ORBIT WORDS ── */
  const words = [
    {t:'TRAIN',    col:'#C0302A'},
    {t:'TRAVEL',   col:'#888888'},
    {t:'TRANSFORM',col:'#7B4FA8'},
    {t:'DISCIPLINE',col:'rgba(192,48,42,.7)'},
    {t:'EXPLORE',  col:'rgba(136,136,136,.7)'},
    {t:'BECOME',   col:'rgba(123,79,168,.7)'},
    {t:'STRENGTH', col:'rgba(192,48,42,.6)'},
    {t:'JOURNEY',  col:'rgba(136,136,136,.6)'},
    {t:'PURPOSE',  col:'rgba(123,79,168,.6)'},
    {t:'MOVE',     col:'rgba(192,48,42,.55)'},
    {t:'DISCOVER', col:'rgba(136,136,136,.55)'},
    {t:'REWIRE',   col:'rgba(123,79,168,.55)'},
  ];
  words.forEach((w,i)=>{
    w.baseAngle  = (i/words.length)*Math.PI*2;
    w.orbitR     = 0;          // will grow
    w.orbitSpeed = .35 + (i%3)*.08;
    w.tilt       = .35 + (i%4)*.1;
    w.yOff       = (Math.sin(i*1.3)*.3);
    w.layer      = i%3;       // depth layer
    w.alpha      = 0;
    w.size       = 11 + (i%3)*4;
  });

  /* ── GLOBE PARTICLES ── */
  const gPts = [];
  for(let lat=-80;lat<=80;lat+=12){
    for(let lon=0;lon<360;lon+=Math.max(6,Math.round(18/Math.cos(lat*Math.PI/180)))){
      gPts.push({lat:lat*Math.PI/180, lon:lon*Math.PI/180,
        r:.8+Math.random()*.6, brightness:Math.random()});
    }
  }

  let globeR    = 0;       // grows in
  let globeRot  = 0;
  let implodeT  = 0;       // 0→1 during phase 3
  let burstT    = 0;       // 0→1 during phase 4

  /* ── BURST PARTICLES ── */
  const burst = Array.from({length:180},(_,i)=>{
    const ang = (i/180)*Math.PI*2 + Math.random()*.3;
    const speed = 4 + Math.random()*8;
    const cols = ['#C0302A','#888','#7B4FA8','#fff'];
    return {
      x:0,y:0,
      vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
      r:Math.random()*3+1,
      col:cols[Math.floor(Math.random()*cols.length)],
      alpha:1, life:0, maxLife:.6+Math.random()*.6
    };
  });
  let burstStarted = false;

  function project3D(lat, lon, R, rotY){
    const x = R*Math.cos(lat)*Math.sin(lon+rotY);
    const y = -R*Math.sin(lat);
    const z = R*Math.cos(lat)*Math.cos(lon+rotY);
    return {x:cx+x, y:cy+y, z, vis:z>-R*.1};
  }

  function drawGlobe(R, rot, alpha, scale){
    ctx.save();
    ctx.globalAlpha = alpha;
    // atmosphere glow
    const ag = ctx.createRadialGradient(cx,cy,R*.5,cx,cy,R*1.5);
    ag.addColorStop(0,'rgba(80,20,140,.18)');
    ag.addColorStop(.6,'rgba(40,8,80,.08)');
    ag.addColorStop(1,'transparent');
    ctx.fillStyle=ag;
    ctx.beginPath();ctx.arc(cx,cy,R*1.5,0,Math.PI*2);ctx.fill();

    // grid lines
    for(let la=-75;la<=75;la+=18){
      ctx.beginPath(); let first=true;
      for(let lo=0;lo<=360;lo+=3){
        const p=project3D(la*Math.PI/180,lo*Math.PI/180,R,rot);
        if(p.vis){first?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);first=false;}
        else first=true;
      }
      ctx.strokeStyle=`rgba(160,100,220,.18)`;ctx.lineWidth=.5;ctx.stroke();
    }
    for(let lo=0;lo<360;lo+=18){
      ctx.beginPath(); let first=true;
      for(let la=-90;la<=90;la+=2){
        const p=project3D(la*Math.PI/180,lo*Math.PI/180,R,rot);
        if(p.vis){first?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);first=false;}
        else first=true;
      }
      ctx.strokeStyle=`rgba(140,80,200,.12)`;ctx.lineWidth=.4;ctx.stroke();
    }
    // rim
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.strokeStyle=`rgba(180,120,255,.3)`;ctx.lineWidth=1;ctx.stroke();
    // surface dots
    gPts.forEach(p=>{
      const pt=project3D(p.lat,p.lon,R,rot);
      if(!pt.vis)return;
      const depthA=(.5+(.5*(pt.z+R)/(R*2)));
      ctx.beginPath();ctx.arc(pt.x,pt.y,p.r*depthA,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,160,255,${depthA*p.brightness*.6})`;
      ctx.fill();
    });
    ctx.restore();
  }

  function drawWord(w, elapsed){
    const spin = elapsed*.001 * w.orbitSpeed;
    const ang  = w.baseAngle + spin;
    // elliptical orbit (tilted)
    const ex = w.orbitR * Math.cos(ang);
    const ey = w.orbitR * Math.sin(ang) * w.tilt + cy*w.yOff;
    const depth = Math.sin(ang) * w.tilt;
    const depthScale = .65 + depth*.35;
    const wx = cx + ex;
    const wy = cy + ey;
    ctx.save();
    ctx.font=`700 ${Math.round(w.size*depthScale)}px 'Bebas Neue',sans-serif`;
    ctx.letterSpacing='0.12em';
    ctx.globalAlpha = w.alpha * depthScale;
    // glow
    ctx.shadowColor = w.col;
    ctx.shadowBlur  = 12*depthScale;
    ctx.fillStyle   = w.col;
    ctx.textAlign   = 'center';
    ctx.textBaseline='middle';
    ctx.fillText(w.t, wx, wy);
    ctx.restore();
  }

  function loop(now){
    if(done) return;
    requestAnimationFrame(loop);
    const elapsed = now - startTime;
    const t = elapsed/1000; // seconds

    ctx.clearRect(0,0,W,H);

    // deep bg
    const bg = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*.8);
    bg.addColorStop(0,'#150820');bg.addColorStop(.5,'#0d0610');bg.addColorStop(1,'#080608');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

    // stars
    stars.forEach(s=>{
      const sx=cx+s.x*(W*.65), sy=cy+s.y*(H*.65);
      const a=.15+.12*Math.sin(t*1.2+s.tw);
      ctx.beginPath();ctx.arc(sx,sy,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(220,210,255,${a})`;ctx.fill();
    });

    /* PHASE 0→1: Globe materialises (0–2s) */
    if(t < 2){
      phase=0;
      const progress = t/2;
      globeR = Math.min(W,H)*.22 * easeOut(progress);
      globeRot += .008;
      drawGlobe(globeR, globeRot, progress*.85, 1);
    }

    /* PHASE 1: Words orbit in (2–4.5s) */
    else if(t < 4.5){
      phase=1;
      const p = (t-2)/2.5;
      globeR = Math.min(W,H)*.22;
      globeRot += .01;
      drawGlobe(globeR, globeRot, .85, 1);

      words.forEach((w,i)=>{
        const delay = i*.12;
        const wp = Math.max(0, Math.min(1,(p-delay/.8)/.8));
        const targetR = globeR*(1.6 + w.layer*.25);
        w.orbitR = targetR * easeOut(wp);
        w.alpha  = wp;
        if(wp>0) drawWord(w, elapsed);
      });
    }

    /* PHASE 2: Implode (4.5–6s) */
    else if(t < 6){
      phase=2;
      implodeT = (t-4.5)/1.5;
      const scale = 1 - implodeT*.85;
      globeRot += .025;

      ctx.save();
      ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.translate(-cx,-cy);
      drawGlobe(globeR*(1+implodeT*.4), globeRot, .85*(1-implodeT), 1);
      words.forEach(w=>{
        w.orbitR *= .92;
        w.alpha = Math.max(0,(1-implodeT*1.4));
        if(w.alpha>0) drawWord(w, elapsed);
      });
      ctx.restore();

      // shock ring
      const sRings = [0,.15,.3];
      sRings.forEach(offset=>{
        const rp = Math.min(1,(implodeT-offset)*3);
        if(rp<=0)return;
        const rr = Math.min(W,H)*.6*rp;
        ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);
        ctx.strokeStyle=`rgba(180,120,255,${.5*(1-rp)})`;
        ctx.lineWidth=2*(1-rp);ctx.stroke();
      });
    }

    /* PHASE 3: TTT burst (6–7.2s) */
    else if(t < 7.2){
      phase=3;
      if(!burstStarted){
        burstStarted=true;
        burst.forEach(p=>{p.x=cx;p.y=cy;p.life=0;p.alpha=1;});
        // flash
        const flash=document.getElementById('intro-flash');
        if(flash){flash.style.opacity='.9';setTimeout(()=>flash.style.opacity='0',200);}
        const ttt=document.getElementById('intro-ttt');
        if(ttt) setTimeout(()=>ttt.classList.add('show'),80);
        const tag=document.getElementById('intro-tag');
        if(tag) setTimeout(()=>tag.classList.add('show'),300);
      }
      burstT=(t-6)/1.2;
      burst.forEach(p=>{
        p.x+=p.vx*(1-burstT*.5);
        p.y+=p.vy*(1-burstT*.5);
        p.life+=.025;
        p.alpha=Math.max(0,1-p.life/p.maxLife);
        if(p.alpha<=0)return;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1-p.life*.5),0,Math.PI*2);
        ctx.fillStyle=p.col.replace(')',`,${p.alpha})`).replace('rgb(','rgba(').replace('#','');
        // hex to rgba manually
        const hex=p.col;
        if(hex.startsWith('#')){
          const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
          ctx.fillStyle=`rgba(${r},${g},${b},${p.alpha})`;
        } else {
          ctx.fillStyle=p.col;
          ctx.globalAlpha=p.alpha;
        }
        ctx.fill();
        ctx.globalAlpha=1;
      });
    }

    /* PHASE 4: Fade out (7.2s+) */
    else {
      if(!done){
        done=true;
        endIntro();
      }
    }
  }

  function easeOut(t){return 1-Math.pow(1-t,3);}

  function endIntro(){
    const intro=document.getElementById('intro');
    if(intro){
      setTimeout(()=>{
        intro.classList.add('gone');
        revealHero();
      },600);
    }
  }

  function revealHero(){
    document.querySelector('nav').classList.add('visible');
    setTimeout(()=>document.getElementById('hero').classList.add('hero-revealed'),100);
  }

  // Skip button
  const skipBtn=document.getElementById('intro-skip');
  if(skipBtn){
    skipBtn.addEventListener('click',()=>{
      done=true;
      const intro=document.getElementById('intro');
      if(intro) intro.classList.add('gone');
      revealHero();
    });
  }

  requestAnimationFrame(loop);
})();

/* SCROLL REVEAL PILLARS + START CANVAS ANIMATIONS */
const ro=new IntersectionObserver(entries=>entries.forEach(e=>{
  if(e.isIntersecting){
    e.target.classList.add('vis');
    const id=e.target.querySelector('.pcanvas')?.id;
    if(id==='cv-train') startTrain();
    if(id==='cv-travel') startTravel();
    if(id==='cv-transform') startTransform();
  }
}),{threshold:.1});
document.querySelectorAll('.pillar').forEach(p=>ro.observe(p));

/* ── CANVAS RESIZE HELPER ── */
function fitCanvas(c){
  const r=c.parentElement.getBoundingClientRect();
  c.width=r.width;c.height=r.height;
}
window.addEventListener('resize',()=>{
  ['cv-train','cv-travel','cv-transform'].forEach(id=>{
    const c=document.getElementById(id);if(c)fitCanvas(c);
  });
});

/* ══════════════════════════════════════════════════
   TRAIN — cinematic weightlifting / power energy
   Heavy barbell silhouettes, energy burst particles,
   sweat-drop streaks, pulsing red heat rings
══════════════════════════════════════════════════ */
function startTrain(){
  const c=document.getElementById('cv-train');if(!c||c._running)return;c._running=true;
  fitCanvas(c);const ctx=c.getContext('2d');let t=0;
  const W=()=>c.width,H=()=>c.height;

  // particles: sparks / sweat streaks
  const sparks=Array.from({length:120},()=>resetSpark({}));
  function resetSpark(p){
    p.x=W()*(.2+Math.random()*.6);p.y=H()*(.3+Math.random()*.5);
    p.vx=(Math.random()-.5)*2.5;p.vy=-Math.random()*3-1;
    p.life=Math.random();p.maxLife=.6+Math.random()*.8;
    p.r=Math.random()*2+.5;
    p.red=Math.random()>.5;return p;
  }

  // barbell silhouette data
  function drawBarbell(ctx,cx,cy,w,h,alpha,thick){
    ctx.save();ctx.globalAlpha=alpha;
    ctx.strokeStyle=`rgba(${thick?'192,48,42':'90,20,20'},${alpha})`;
    ctx.lineWidth=thick?3:1.5;ctx.lineCap='round';
    // bar
    ctx.beginPath();ctx.moveTo(cx-w/2,cy);ctx.lineTo(cx+w/2,cy);ctx.stroke();
    // plates left
    const pw=w*.08;
    [-w/2,-w/2+pw*1.4,-w/2+pw*2.6].forEach(x=>{
      ctx.fillStyle=`rgba(${thick?'160,30,30':'60,10,10'},${alpha})`;
      ctx.fillRect(x-pw*.4,cy-h*.5,pw*.8,h);
    });
    // plates right
    [w/2,w/2-pw*1.4,w/2-pw*2.6].forEach(x=>{
      ctx.fillRect(x-pw*.4,cy-h*.5,pw*.8,h);
    });
    ctx.restore();
  }

  // heat ring pulse
  const rings=[{r:0,max:H()*.45,alpha:0,speed:1.8},{r:0,max:H()*.3,alpha:0,speed:2.4}];

  (function loop(){
    c._raf=requestAnimationFrame(loop);t+=.016;
    ctx.clearRect(0,0,W(),H());

    // deep red background glow
    const g=ctx.createRadialGradient(W()*.45,H()*.5,0,W()*.45,H()*.5,W()*.7);
    g.addColorStop(0,'rgba(80,8,8,.55)');g.addColorStop(.5,'rgba(40,2,2,.3)');g.addColorStop(1,'rgba(8,6,8,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W(),H());

    // pulsing heat rings
    rings.forEach((rg,i)=>{
      rg.r+=rg.speed;rg.alpha=Math.max(0,(1-rg.r/rg.max)*.35);
      if(rg.r>rg.max){rg.r=0;rg.alpha=.35;}
      ctx.beginPath();ctx.arc(W()*.45,H()*.5,rg.r,0,Math.PI*2);
      ctx.strokeStyle=`rgba(192,48,42,${rg.alpha})`;ctx.lineWidth=1.5;ctx.stroke();
    });

    // barbells — 3 layers at different depths
    const bob=Math.sin(t*1.8)*4;
    drawBarbell(ctx,W()*.42,H()*.35+bob,W()*.55,H()*.12,.12,false);
    drawBarbell(ctx,W()*.42,H()*.5+Math.sin(t*2.2+1)*3,W()*.7,H()*.15,.22,true);
    drawBarbell(ctx,W()*.42,H()*.68+Math.sin(t*1.5+2)*5,W()*.5,H()*.1,.1,false);

    // sparks
    sparks.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life+=.02;
      if(p.life>p.maxLife) resetSpark(p);
      const a=(1-p.life/p.maxLife)*.7;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.red?`rgba(220,60,40,${a})`:`rgba(200,180,160,${a*.5})`;
      ctx.fill();
    });

    // sweat streak lines
    for(let i=0;i<8;i++){
      const sx=W()*(.25+i*.07);const sy=H()*(.2+Math.sin(t+i)*.1);
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+1,sy+18+Math.sin(t*2+i)*6);
      ctx.strokeStyle=`rgba(180,60,60,${.08+Math.sin(t+i)*.04})`;ctx.lineWidth=.8;ctx.stroke();
    }

    // horizontal energy scan line
    const scanY=((t*60)%H());
    const sg=ctx.createLinearGradient(0,scanY-2,0,scanY+2);
    sg.addColorStop(0,'transparent');sg.addColorStop(.5,'rgba(200,50,30,.12)');sg.addColorStop(1,'transparent');
    ctx.fillStyle=sg;ctx.fillRect(0,scanY-2,W(),4);
  })();
}

/* ══════════════════════════════════════════════════
   TRAVEL — rotating globe + city name flyovers
   Wireframe Earth sphere, orbital flight paths,
   city beacons, star field
══════════════════════════════════════════════════ */
function startTravel(){
  const c=document.getElementById('cv-travel');if(!c||c._running)return;c._running=true;
  fitCanvas(c);const ctx=c.getContext('2d');let t=0;
  const W=()=>c.width,H=()=>c.height;

  // cities: [lat degrees, lon degrees, name]
  const cities=[
    [40.7,74,'New York'],[51.5,0,'London'],[48.9,2.3,'Paris'],
    [35.7,139.7,'Tokyo'],[1.3,103.8,'Singapore'],[-33.9,18.4,'Cape Town'],
    [25.2,55.3,'Dubai'],[19.1,72.9,'Mumbai'],[-23.5,-46.6,'São Paulo'],
    [55.8,37.6,'Moscow'],[31.2,121.5,'Shanghai'],[37.8,-122.4,'San Francisco'],
  ];

  // flight arcs
  const arcs=[];
  for(let i=0;i<6;i++){
    const a=cities[Math.floor(Math.random()*cities.length)];
    const b=cities[Math.floor(Math.random()*cities.length)];
    arcs.push({a,b,prog:Math.random(),speed:.003+Math.random()*.004});
  }

  function project(lat,lon,R,cx,cy,rotY){
    const la=lat*Math.PI/180,lo=(lon*Math.PI/180)+rotY;
    const x=R*Math.cos(la)*Math.sin(lo);
    const y=-R*Math.sin(la);
    const z=R*Math.cos(la)*Math.cos(lo);
    return {x:cx+x,y:cy+y,z,visible:z>0};
  }

  function slerp(p1,p2,t,R,cx,cy,rot){
    const la1=p1[0]*Math.PI/180,lo1=p1[1]*Math.PI/180;
    const la2=p2[0]*Math.PI/180,lo2=p2[1]*Math.PI/180;
    const la=la1+(la2-la1)*t,lo=lo1+(lo2-lo1)*t;
    return project(la*180/Math.PI,lo*180/Math.PI,R,cx,cy,rot);
  }

  // star field
  const stars=Array.from({length:160},()=>({
    x:Math.random(),y:Math.random(),r:Math.random()*1.2+.2,
    twinkle:Math.random()*Math.PI*2
  }));

  (function loop(){
    c._raf=requestAnimationFrame(loop);t+=.008;
    ctx.clearRect(0,0,W(),H());

    // star field
    stars.forEach(s=>{
      const a=.2+.15*Math.sin(t*1.5+s.twinkle);
      ctx.beginPath();ctx.arc(s.x*W(),s.y*H(),s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,200,220,${a})`;ctx.fill();
    });

    const cx=W()*.42,cy=H()*.5,R=Math.min(W(),H())*.32;
    const rotY=t*.18;

    // globe atmosphere glow
    const ag=ctx.createRadialGradient(cx,cy,R*.7,cx,cy,R*1.3);
    ag.addColorStop(0,'rgba(60,60,80,.0)');ag.addColorStop(.7,'rgba(40,50,70,.15)');ag.addColorStop(1,'rgba(20,20,30,.0)');
    ctx.fillStyle=ag;ctx.fillRect(0,0,W(),H());

    // globe wireframe — latitude lines
    for(let lat=-75;lat<=75;lat+=15){
      ctx.beginPath();let first=true;
      for(let lon=0;lon<=360;lon+=3){
        const p=project(lat,lon,R,cx,cy,rotY);
        if(p.visible){first?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);first=false;}
        else first=true;
      }
      ctx.strokeStyle='rgba(140,140,160,.12)';ctx.lineWidth=.6;ctx.stroke();
    }
    // longitude lines
    for(let lon=0;lon<360;lon+=15){
      ctx.beginPath();let first=true;
      for(let lat=-90;lat<=90;lat+=2){
        const p=project(lat,lon,R,cx,cy,rotY);
        if(p.visible){first?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);first=false;}
        else first=true;
      }
      ctx.strokeStyle='rgba(140,140,160,.1)';ctx.lineWidth=.5;ctx.stroke();
    }

    // globe edge ring
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.strokeStyle='rgba(160,160,180,.25)';ctx.lineWidth=1;ctx.stroke();

    // flight arcs
    arcs.forEach(arc=>{
      arc.prog+=arc.speed;if(arc.prog>1)arc.prog=0;
      const steps=40;
      ctx.beginPath();let started=false;
      for(let i=0;i<=steps;i++){
        const p=slerp(arc.a,arc.b,i/steps,R,cx,cy,rotY);
        if(p.visible){started?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);started=true;}
        else started=false;
      }
      ctx.strokeStyle='rgba(160,160,180,.15)';ctx.lineWidth=.7;ctx.stroke();

      // flight dot
      const fp=slerp(arc.a,arc.b,arc.prog,R,cx,cy,rotY);
      if(fp.visible){
        ctx.beginPath();ctx.arc(fp.x,fp.y,2.5,0,Math.PI*2);
        ctx.fillStyle='rgba(220,220,240,.9)';ctx.fill();
        // trail
        for(let tr=1;tr<=8;tr++){
          const tp2=Math.max(0,arc.prog-tr*.015);
          const tp=slerp(arc.a,arc.b,tp2,R,cx,cy,rotY);
          if(tp.visible){
            ctx.beginPath();ctx.arc(tp.x,tp.y,2.5-tr*.25,0,Math.PI*2);
            ctx.fillStyle=`rgba(200,200,220,${.6-tr*.07})`;ctx.fill();
          }
        }
      }
    });

    // city beacons
    cities.forEach(city=>{
      const p=project(city[0],city[1],R,cx,cy,rotY);
      if(!p.visible)return;
      const pulse=.5+.5*Math.sin(t*3+city[1]);
      // beacon ring
      ctx.beginPath();ctx.arc(p.x,p.y,4+pulse*4,0,Math.PI*2);
      ctx.strokeStyle=`rgba(200,200,220,${.1+pulse*.12})`;ctx.lineWidth=.8;ctx.stroke();
      // dot
      ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);
      ctx.fillStyle=`rgba(240,240,255,${.5+pulse*.4})`;ctx.fill();
      // city name
      if(pulse>.6){
        ctx.font=`${Math.round(9+pulse*3)}px 'DM Sans',sans-serif`;
        ctx.fillStyle=`rgba(210,205,200,${(pulse-.6)*1.8})`;
        ctx.fillText(city[2],p.x+6,p.y-5);
      }
    });
  })();
}

/* ══════════════════════════════════════════════════
   TRANSFORM — neurological mind waves
   Brain-wave EEG lines, synaptic neuron network,
   thought-particle bursts, violet energy fields
══════════════════════════════════════════════════ */
function startTransform(){
  const c=document.getElementById('cv-transform');if(!c||c._running)return;c._running=true;
  fitCanvas(c);const ctx=c.getContext('2d');let t=0;
  const W=()=>c.width,H=()=>c.height;

  // neurons
  const neurons=Array.from({length:28},()=>({
    x:Math.random()*W(),y:Math.random()*H(),
    vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,
    r:2+Math.random()*3,fire:0,fireTimer:Math.random()*200
  }));

  // thought particles
  const thoughts=Array.from({length:80},()=>resetThought({}));
  function resetThought(p){
    p.x=W()*.5+(Math.random()-.5)*W()*.6;
    p.y=H()*.5+(Math.random()-.5)*H()*.5;
    p.vx=(Math.random()-.5)*.8;p.vy=(Math.random()-.5)*.8;
    p.life=0;p.maxLife=.8+Math.random()*1.2;
    p.r=.5+Math.random()*2;p.hue=260+Math.random()*60;return p;
  }

  // EEG wave channels
  const channels=Array.from({length:6},(_, i)=>({
    yBase:H()*(.15+i*.13),freq:.8+i*.4,amp:12+i*4,speed:.6+i*.2,phase:i*1.1
  }));

  (function loop(){
    c._raf=requestAnimationFrame(loop);t+=.016;
    ctx.clearRect(0,0,W(),H());

    // deep violet background radial
    const bg=ctx.createRadialGradient(W()*.45,H()*.45,0,W()*.45,H()*.45,W()*.75);
    bg.addColorStop(0,'rgba(28,6,52,.6)');bg.addColorStop(.5,'rgba(18,3,34,.35)');bg.addColorStop(1,'rgba(8,6,8,0)');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W(),H());

    // EEG brain wave lines
    channels.forEach(ch=>{
      ctx.beginPath();
      for(let x=0;x<W();x+=2){
        const noise=Math.sin(x*.02+t*ch.speed+ch.phase)*ch.amp
                  + Math.sin(x*.05+t*ch.speed*1.7+ch.phase*2)*ch.amp*.4
                  + Math.sin(x*.003+t*ch.speed*.3)*ch.amp*.6;
        const y=ch.yBase+noise;
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      const alpha=.12+.06*Math.sin(t+ch.phase);
      ctx.strokeStyle=`rgba(140,80,200,${alpha})`;ctx.lineWidth=1;ctx.stroke();

      // highlight the active peak
      const peakX=(t*ch.speed*60)%W();
      const peakNoise=Math.sin(peakX*.02+t*ch.speed+ch.phase)*ch.amp;
      ctx.beginPath();ctx.arc(peakX,ch.yBase+peakNoise,2.5,0,Math.PI*2);
      ctx.fillStyle=`rgba(180,120,255,${.4+.3*Math.sin(t*3+ch.phase)})`;ctx.fill();
    });

    // synapse connections
    neurons.forEach((n,i)=>{
      n.x+=n.vx;n.y+=n.vy;
      if(n.x<0||n.x>W())n.vx*=-1;if(n.y<0||n.y>H())n.vy*=-1;
      n.fireTimer--;if(n.fireTimer<=0){n.fire=1;n.fireTimer=80+Math.random()*160;}
      if(n.fire>0)n.fire=Math.max(0,n.fire-.04);

      neurons.forEach((m,j)=>{
        if(j<=i)return;
        const dx=m.x-n.x,dy=m.y-n.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d>W()*.22)return;
        const str=(1-d/(W()*.22))*(n.fire||m.fire?1.8:.5);
        ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(m.x,m.y);
        ctx.strokeStyle=`rgba(130,70,200,${str*.2})`;ctx.lineWidth=str*.6;ctx.stroke();
        // signal pulse along firing connection
        if(n.fire>.3){
          const px=n.x+dx*((t*2)%1);const py=n.y+dy*((t*2)%1);
          ctx.beginPath();ctx.arc(px,py,1.5,0,Math.PI*2);
          ctx.fillStyle=`rgba(200,150,255,${n.fire*.6})`;ctx.fill();
        }
      });

      // neuron node
      const fr=n.r+(n.fire*4);
      const ng=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,fr*3);
      ng.addColorStop(0,`rgba(180,120,255,${.4+n.fire*.5})`);
      ng.addColorStop(1,'rgba(100,50,180,0)');
      ctx.fillStyle=ng;ctx.beginPath();ctx.arc(n.x,n.y,fr*3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(n.x,n.y,fr,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,160,255,${.6+n.fire*.4})`;ctx.fill();
    });

    // thought particles
    thoughts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.life+=.012;
      if(p.life>p.maxLife)resetThought(p);
      const a=(1-p.life/p.maxLife)*.5;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`hsla(${p.hue},70%,70%,${a})`;ctx.fill();
    });

    // centre consciousness bloom
    const br=80+30*Math.sin(t*.8);
    const cg=ctx.createRadialGradient(W()*.44,H()*.5,0,W()*.44,H()*.5,br);
    cg.addColorStop(0,`rgba(160,80,255,${.12+.05*Math.sin(t*.8)})`);
    cg.addColorStop(1,'rgba(80,20,160,0)');
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(W()*.44,H()*.5,br,0,Math.PI*2);ctx.fill();
  })();
}

/* PROGRESS BARS */
const bro=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.querySelectorAll('.bfill').forEach(b=>b.style.width=b.dataset.w+'%');
      bro.unobserve(e.target);
    }
  });
},{threshold:.25});
document.querySelectorAll('.pillar').forEach(p=>bro.observe(p));

/* STAT COUNTER */
let cnt=false;
new IntersectionObserver(entries=>{
  if(entries[0].isIntersecting&&!cnt){
    cnt=true;
    document.querySelectorAll('.snum').forEach(el=>{
      const t=+el.dataset.t;let c=0;const s=Math.ceil(t/60);
      const iv=setInterval(()=>{c=Math.min(c+s,t);el.textContent=c.toLocaleString()+'+';if(c>=t)clearInterval(iv)},22);
    });
  }
},{threshold:.5}).observe(document.getElementById('stats'));

/* QUIZ */
const steps=document.querySelectorAll('.qstep'),qdots=document.querySelectorAll('.qdot');
let cs=0;const sc={train:0,travel:0,transform:0};
document.querySelectorAll('.qopt').forEach(b=>{
  b.addEventListener('click',()=>{
    sc[b.dataset.v]=(sc[b.dataset.v]||0)+1;
    b.closest('.qopts').querySelectorAll('.qopt').forEach(x=>x.classList.remove('sel'));
    b.classList.add('sel');
    setTimeout(()=>{
      cs++;
      qdots.forEach((d,i)=>{d.classList.toggle('done',i<cs);d.classList.toggle('cur',i===cs)});
      if(cs<steps.length){steps.forEach((s,i)=>s.classList.toggle('act',i===cs))}
      else{steps.forEach(s=>s.classList.remove('act'));showRes();}
    },400);
  });
});
function showRes(){
  const w=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0][0];
  const m={
    train:{e:'🔥',l:'THE TRAINER',c:'var(--red-b)',bg:'rgba(139,26,26,.14)',txt:"You're driven by discipline, physical excellence and progress. Your body is your temple and your training is your meditation. The Train pillar has a program with your name on it.",h:'#train-sec'},
    travel:{e:'🌍',l:'THE EXPLORER',c:'#bbb',bg:'rgba(80,80,80,.14)',txt:"New horizons are your oxygen. You come alive when the ground is unfamiliar beneath your feet. Your next great version is waiting on a map you haven't touched yet. The Travel pillar is calling.",h:'#travel-sec'},
    transform:{e:'✨',l:'THE TRANSFORMER',c:'var(--vio-b)',bg:'rgba(59,26,90,.18)',txt:"The inward journey is your frontier. You're not just changing what you do — you're rewiring who you are. The Transform pillar has the tools, rituals and philosophy to architect the life you feel is possible.",h:'#transform-sec'},
  }[w];
  const rb=document.getElementById('rbadge'),rd=document.getElementById('rdesc'),rc=document.getElementById('rcta');
  rb.style.cssText=`background:${m.bg};color:${m.c};border:1px solid ${m.c}`;
  rb.innerHTML=`${m.e} &nbsp; ${m.l}`;rd.textContent=m.txt;rc.href=m.h;
  rc.style.cssText=`background:${m.bg};color:${m.c};border:1px solid ${m.c}`;
  document.getElementById('qresult').classList.add('show');
  document.getElementById('qprog').style.opacity='0';
}

/* SOUND */
let son=false,actx=null,gn=null,bs=null;
document.getElementById('snd-btn').addEventListener('click',()=>{
  son=!son;
  if(son){
    actx=new(window.AudioContext||window.webkitAudioContext)();
    gn=actx.createGain();gn.gain.setValueAtTime(0,actx.currentTime);gn.gain.linearRampToValueAtTime(.12,actx.currentTime+2);
    const buf=actx.createBuffer(1,actx.sampleRate*4,actx.sampleRate);
    const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.25;
    bs=actx.createBufferSource();bs.buffer=buf;bs.loop=true;
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=380;
    bs.connect(f);f.connect(gn);gn.connect(actx.destination);bs.start();
    document.getElementById('slbl').textContent='Playing';
    document.getElementById('sico').textContent='♫';
    document.getElementById('sviz').classList.add('on');
  } else {
    if(gn){gn.gain.linearRampToValueAtTime(0,actx.currentTime+1);setTimeout(()=>{try{bs.stop()}catch(e){}actx=null},1200)}
    document.getElementById('slbl').textContent='Ambience';
    document.getElementById('sico').textContent='♪';
    document.getElementById('sviz').classList.remove('on');
  }
});

/* NEWSLETTER */
document.getElementById('nlsub').addEventListener('click',()=>{
  const v=document.getElementById('nlem').value;
  if(v&&v.includes('@')){document.querySelector('.nlform').style.opacity='.3';document.getElementById('nlok').style.display='block'}
});

/* CLOTHING NOTIFY */
document.getElementById('cloth-notify-btn').addEventListener('click',()=>{
  const v=document.getElementById('cloth-email').value;
  if(v&&v.includes('@')){
    document.querySelector('.cloth-notify-form').style.opacity='.3';
    document.getElementById('cloth-ok').style.display='block';
  }
});

/* ACTIVE NAV */
window.addEventListener('scroll',()=>{
  let cur='';
  document.querySelectorAll('section[id],div[id]').forEach(s=>{if(window.scrollY>=s.offsetTop-220)cur=s.id});
  document.querySelectorAll('.nav-links a').forEach(a=>a.style.color=a.getAttribute('href')==='#'+cur?'var(--light)':'rgba(214,210,206,.5)');
});

/* ══════════════════════════════════════════
   FOUNDER AVATAR — Animated Canvas Portrait
   Cinematic silhouette with particle field,
   pulsing energy rings and identity text
══════════════════════════════════════════ */
(function(){
  const cv = document.getElementById('founder-avatar-canvas');
  if(!cv) return; // photo now shown instead
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const cx = W/2, cy = H/2;
  let t = 0;

  // Start when section scrolls into view
  let started = false;
  const obs = new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting && !started){
      started = true;
      loop();
    }
  },{threshold:.3});
  obs.observe(cv);

  // Particle ring system
  const particles = Array.from({length:90},(_,i)=>{
    const ang = (i/90)*Math.PI*2;
    return {
      baseAng: ang,
      r: 85 + Math.random()*30,
      speed: .3 + Math.random()*.4,
      size: .8 + Math.random()*2,
      layer: Math.floor(Math.random()*3),
      phase: Math.random()*Math.PI*2
    };
  });

  // Floating DNA-style helix dots
  const helix = Array.from({length:24},(_,i)=>({
    t: i/24, phase: i*.5
  }));

  function loop(){
    requestAnimationFrame(loop);
    t += .018;
    ctx.clearRect(0,0,W,H);

    // Background — deep circular gradient
    const bg = ctx.createRadialGradient(cx,cy,0,cx,cy,W*.6);
    bg.addColorStop(0,'#1a0820');
    bg.addColorStop(.5,'#100614');
    bg.addColorStop(1,'#080608');
    ctx.fillStyle = bg;
    ctx.beginPath();ctx.arc(cx,cy,W*.5,0,Math.PI*2);ctx.fill();

    // Outer glow ring
    const gr = ctx.createRadialGradient(cx,cy,W*.35,cx,cy,W*.52);
    gr.addColorStop(0,'transparent');
    gr.addColorStop(.5,'rgba(192,48,42,.06)');
    gr.addColorStop(1,'rgba(123,79,168,.04)');
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(cx,cy,W*.52,0,Math.PI*2);ctx.fill();

    // Energy rings
    [.32,.38,.44].forEach((rf,i)=>{
      const pulse = Math.sin(t*1.5+i*1.1)*.015;
      ctx.beginPath();ctx.arc(cx,cy,W*(rf+pulse),0,Math.PI*2);
      const alpha = [.18,.1,.06][i];
      ctx.strokeStyle=`rgba(192,48,42,${alpha+Math.sin(t+i)*.04})`;
      ctx.lineWidth=1;ctx.stroke();
    });
    [.28,.36].forEach((rf,i)=>{
      const pulse = Math.sin(t*1.2+i*1.8)*.01;
      ctx.beginPath();ctx.arc(cx,cy,W*(rf+pulse),0,Math.PI*2);
      ctx.strokeStyle=`rgba(123,79,168,${[.12,.07][i]})`;
      ctx.lineWidth=.8;ctx.stroke();
    });

    // Orbiting particles
    particles.forEach(p=>{
      const ang = p.baseAng + t*p.speed*(p.layer===0?1:p.layer===1?.7:.5);
      const wobble = Math.sin(t*2+p.phase)*4;
      const px = cx + (p.r+wobble)*Math.cos(ang);
      const py = cy + (p.r+wobble)*.6*Math.sin(ang);
      const alpha = .3+.4*Math.sin(t+p.phase);
      const cols=['rgba(192,48,42,','rgba(136,136,136,','rgba(123,79,168,'];
      ctx.beginPath();ctx.arc(px,py,p.size,0,Math.PI*2);
      ctx.fillStyle=cols[p.layer]+alpha+')';ctx.fill();
    });

    // Human silhouette (stylised geometric head+shoulders)
    ctx.save();
    // shoulders / body glow
    const bodyG = ctx.createRadialGradient(cx,cy+55,0,cx,cy+55,75);
    bodyG.addColorStop(0,'rgba(192,48,42,.22)');
    bodyG.addColorStop(.6,'rgba(139,26,26,.08)');
    bodyG.addColorStop(1,'transparent');
    ctx.fillStyle=bodyG;
    ctx.beginPath();
    ctx.ellipse(cx,cy+70,65,55,0,0,Math.PI*2);
    ctx.fill();

    // torso shape
    ctx.beginPath();
    ctx.moveTo(cx-50,H*.88);
    ctx.quadraticCurveTo(cx-55,cy+45,cx-28,cy+20);
    ctx.quadraticCurveTo(cx,cy+12,cx+28,cy+20);
    ctx.quadraticCurveTo(cx+55,cy+45,cx+50,H*.88);
    ctx.fillStyle='rgba(30,8,14,.9)';ctx.fill();
    ctx.strokeStyle='rgba(192,48,42,.18)';ctx.lineWidth=1;ctx.stroke();

    // neck
    ctx.beginPath();
    ctx.ellipse(cx,cy+5,11,14,0,0,Math.PI*2);
    ctx.fillStyle='rgba(28,8,12,.95)';ctx.fill();

    // head shape
    const headPulse = Math.sin(t*.6)*.5;
    ctx.beginPath();
    ctx.ellipse(cx,cy-30,38+headPulse,44+headPulse,0,0,Math.PI*2);
    const headG=ctx.createRadialGradient(cx-8,cy-38,0,cx,cy-30,44);
    headG.addColorStop(0,'rgba(60,18,30,.95)');
    headG.addColorStop(.7,'rgba(25,6,16,.98)');
    headG.addColorStop(1,'rgba(15,3,10,1)');
    ctx.fillStyle=headG;ctx.fill();
    ctx.strokeStyle='rgba(192,48,42,.22)';ctx.lineWidth=1;ctx.stroke();

    // subtle facial feature glow — eyes
    const eyeGlow = .35+.2*Math.sin(t*2.5);
    [-13,13].forEach(ex=>{
      const eg=ctx.createRadialGradient(cx+ex,cy-32,0,cx+ex,cy-32,7);
      eg.addColorStop(0,`rgba(192,48,42,${eyeGlow})`);
      eg.addColorStop(1,'transparent');
      ctx.fillStyle=eg;ctx.beginPath();ctx.arc(cx+ex,cy-32,7,0,Math.PI*2);ctx.fill();
      // iris dot
      ctx.beginPath();ctx.arc(cx+ex,cy-32,2,0,Math.PI*2);
      ctx.fillStyle=`rgba(220,80,60,${eyeGlow+.2})`;ctx.fill();
    });

    // crown line / military brow  
    ctx.beginPath();
    ctx.moveTo(cx-30,cy-65);
    ctx.quadraticCurveTo(cx,cy-80,cx+30,cy-65);
    ctx.strokeStyle='rgba(192,48,42,.15)';ctx.lineWidth=1.5;ctx.stroke();

    // brain/mind energy field above head
    for(let i=0;i<6;i++){
      const ba=t*1.2+i*1.05;
      const bx=cx+Math.cos(ba)*22;
      const by=cy-82+Math.sin(ba*1.3)*10;
      const ba2=.12+.1*Math.sin(t*2+i);
      ctx.beginPath();ctx.arc(bx,by,2.5,0,Math.PI*2);
      ctx.fillStyle=`rgba(123,79,168,${ba2})`;ctx.fill();
    }

    ctx.restore();

    // Initials "JM" in center of head
    ctx.save();
    ctx.font=`700 22px 'Bebas Neue',sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.letterSpacing='0.1em';
    const textA=.35+.15*Math.sin(t*.8);
    ctx.fillStyle=`rgba(214,210,206,${textA})`;
    ctx.shadowColor='rgba(192,48,42,.6)';ctx.shadowBlur=10;
    ctx.fillText('J M',cx,cy-30);
    ctx.restore();

    // Bottom text — role marquee
    const roles=['ARMY VETERAN','ENTREPRENEUR','WORLD EXPLORER','CYBER EXPERT','TTT FOUNDER'];
    const roleIdx=Math.floor(t/3)%roles.length;
    const roleT=(t%3)/3;
    const fadeA=roleT<.15?roleT/.15:roleT>.85?(1-roleT)/.15:1;
    ctx.save();
    ctx.font=`600 9px 'DM Sans',sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.letterSpacing='0.25em';
    ctx.fillStyle=`rgba(192,48,42,${fadeA*.7})`;
    ctx.fillText(roles[roleIdx],cx,cy+108);
    ctx.restore();

    // Scanning line (military/tech aesthetic)
    const scanY = ((t*40)%(H*.9))+H*.05;
    const sg=ctx.createLinearGradient(0,scanY-1,0,scanY+1);
    sg.addColorStop(0,'transparent');
    sg.addColorStop(.5,'rgba(192,48,42,.08)');
    sg.addColorStop(1,'transparent');
    ctx.fillStyle=sg;
    ctx.beginPath();ctx.arc(cx,cy,W*.46,0,Math.PI*2);ctx.save();
    ctx.clip();ctx.fillRect(cx-W*.5,scanY-1,W,2);ctx.restore();
  }
})();


/* ── SCROLL PROGRESS BAR ── */
window.addEventListener('scroll',()=>{
  const sp=document.getElementById('scroll-prog');
  if(!sp)return;
  const h=document.documentElement;
  const pct=(h.scrollTop||document.body.scrollTop)/(h.scrollHeight-h.clientHeight)*100;
  sp.style.width=pct+'%';
  // back to top
  const bt=document.getElementById('back-top');
  if(bt) bt.classList.toggle('show',window.scrollY>600);
},{passive:true});

/* ── MOBILE MENU ── */
const hamburger=document.getElementById('hamburger');
const mobileMenu=document.getElementById('mobile-menu');
hamburger&&hamburger.addEventListener('click',()=>{
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow=mobileMenu.classList.contains('open')?'hidden':'';
});
function closeMobMenu(){
  hamburger&&hamburger.classList.remove('open');
  mobileMenu&&mobileMenu.classList.remove('open');
  document.body.style.overflow='';
}

/* ── PAGE TRANSITION on nav links ── */
document.querySelectorAll('.nav-links a, .mob-link, .ftlinks a').forEach(a=>{
  a.addEventListener('click',e=>{
    const href=a.getAttribute('href');
    if(!href||!href.startsWith('#'))return;
    const trans=document.getElementById('pg-trans');
    if(!trans)return;
    trans.classList.add('flash');
    setTimeout(()=>trans.classList.remove('flash'),300);
  });
});

/* ── COOKIE BANNER ── */
(function(){
  if(localStorage.getItem('ttt-cookie'))return;
  const banner=document.getElementById('cookie');
  if(!banner)return;
  setTimeout(()=>banner.classList.add('show'),3000);
  document.getElementById('cookie-ok')&&document.getElementById('cookie-ok').addEventListener('click',()=>{
    localStorage.setItem('ttt-cookie','accepted');
    banner.classList.add('hide');
    setTimeout(()=>banner.remove(),500);
  });
  document.getElementById('cookie-no')&&document.getElementById('cookie-no').addEventListener('click',()=>{
    localStorage.setItem('ttt-cookie','declined');
    banner.classList.add('hide');
    setTimeout(()=>banner.remove(),500);
  });
})();

/* ── COUNTDOWN TIMER (90 days from today) ── */
(function(){
  const launch=new Date(Date.now()+90*24*60*60*1000);
  function tick(){
    const now=new Date();
    const diff=launch-now;
    if(diff<=0){
      ['cd-d','cd-h','cd-m','cd-s'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='00';});
      return;
    }
    const d=Math.floor(diff/864e5);
    const h=Math.floor((diff%864e5)/36e5);
    const m=Math.floor((diff%36e5)/6e4);
    const s=Math.floor((diff%6e4)/1e3);
    function set(id,val){
      const el=document.getElementById(id);
      if(!el)return;
      const str=String(val).padStart(2,'0');
      if(el.textContent!==str){
        el.style.transform='scale(1.12)';
        el.textContent=str;
        setTimeout(()=>el.style.transform='',150);
      }
    }
    set('cd-d',d);set('cd-h',h);set('cd-m',m);set('cd-s',s);
  }
  tick();setInterval(tick,1000);
})();
