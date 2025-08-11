(function(){
  'use strict';
  // ========= Helpers =========
  function makeDataUrl(svg){ return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg); }
  function loadImage(url, cb){ const im=new Image(); im.crossOrigin='anonymous'; im.onload=()=>cb(im); im.onerror=()=>cb(null); im.src=url; }

  // ========= Canvases =========
  const bgCanvas=document.getElementById('bgCanvas'), bgCtx=bgCanvas.getContext('2d');
  const cvs=document.getElementById('gameCanvas'), ctx=cvs.getContext('2d');
  const fxCanvas=document.getElementById('fxCanvas'), fx=fxCanvas.getContext('2d');
  const hudCanvas=document.getElementById('hudCanvas'), hud=hudCanvas.getContext('2d');

  // ========= UI Refs =========
  const overlay=document.getElementById('overlay');
  const mainMenu=document.getElementById('mainMenu');
  const levelTransition=document.getElementById('levelTransition');
  const levelTitle=document.getElementById('levelTitle');
  const levelDesc=document.getElementById('levelDesc');
  const startBtn=document.getElementById('start');
  const restartBtn=document.getElementById('restart');
  const titleEl=document.getElementById('gameOverTitle');
  const brandLogo=document.getElementById('brandLogo');
  const finalP=document.getElementById('final');
  const finalStats=document.getElementById('finalStats');
  const statScore=document.getElementById('statScore');
  const statDepth=document.getElementById('statDepth');
  const statSpecimens=document.getElementById('statSpecimens');
  const muteBtn=document.getElementById('muteBtn');
  const infoBtn=document.getElementById('infoBtn');
  const fsBtn=document.getElementById('fsBtn');
  const shareBtn=document.getElementById('shareBtn');
  const infoOverlay=document.getElementById('infoOverlay');
  const closeInfo=document.getElementById('closeInfo');
  const logoHUD=document.getElementById('logoHUD');
  const mainExtras=document.getElementById('mainExtras');
  
  // ========= Sprites (UI) =========
  const BTN_SPRITE_URL='https://raw.githubusercontent.com/baltaz/the_expedition/main/assets/blue-buttons.png';
  const MODAL_BTN_URL='https://raw.githubusercontent.com/baltaz/the_expedition/main/assets/gray-buttons.png';
  let icoMuteURL=null,icoInfoURL=null,icoFSURL=null,icoShareURL=null; let grayExitURL=null,grayContinueURL=null,grayDiveURL=null,grayRetryURL=null;

  loadImage(BTN_SPRITE_URL, function(img){ if(!img){ refreshIcons(); return; } const h=img.height; function slice(x,w){ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.imageSmoothingEnabled=false; g.drawImage(img,x,0,w,h,0,0,w,h); return c.toDataURL('image/png'); }
    icoMuteURL=slice(0,45); icoInfoURL=slice(46,45); icoFSURL=slice(91,45); icoShareURL=slice(136,45); refreshIcons(); });
  loadImage(MODAL_BTN_URL, function(img){ if(!img) return; const w=img.width; function sliceY(y0,y1){ const h=(y1-y0+1)|0; const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.imageSmoothingEnabled=false; g.drawImage(img,0,y0,w,h,0,0,w,h); return c.toDataURL('image/png'); }
    grayExitURL=sliceY(0,83); grayContinueURL=sliceY(84,166); grayDiveURL=sliceY(167,249); grayRetryURL=sliceY(250,332); setModalButtons(false); });

  const iconSpeakerOn = makeDataUrl("<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#5aa4ff'/><stop offset='1' stop-color='#2b58a6'/></linearGradient></defs><rect x='2' y='2' width='52' height='52' rx='8' ry='8' fill='url(#g)' stroke='#0b214b' stroke-width='3'/><g transform='translate(28,28)'><path d='M-9,-8 h6 l8,-6 v28 l-8,-6 h-6 z' fill='#0b214b'/><path d='M6,-6 q6,6 0,12' fill='none' stroke='#0b214b' stroke-width='3' stroke-linecap='round'/><path d='M10,-10 q10,10 0,20' fill='none' stroke='#0b214b' stroke-width='3' stroke-linecap='round'/></g></svg>");
  const iconInfo = makeDataUrl("<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#5aa4ff'/><stop offset='1' stop-color='#2b58a6'/></linearGradient></defs><rect x='2' y='2' width='52' height='52' rx='8' ry='8' fill='url(#g)' stroke='#0b214b' stroke-width='3'/><g transform='translate(28,28)'><circle r='10' fill='#0b214b'/><text x='0' y='6' text-anchor='middle' font-family='monospace' font-size='20' fill='#5aa4ff'>?</text></g></svg>");
  function refreshIcons(){ muteBtn.innerHTML='<img alt="mute" src="'+(icoMuteURL||iconSpeakerOn)+'" />'; infoBtn.innerHTML='<img alt="info" src="'+(icoInfoURL||iconInfo)+'" />'; if(icoFSURL) fsBtn.innerHTML='<img alt="fullscreen" src="'+icoFSURL+'" />'; if(icoShareURL) shareBtn.innerHTML='<img alt="share" src="'+icoShareURL+'" />'; muteBtn.style.opacity=S.isMuted()?0.35:1; }
  function setModalButtons(fromPause){ if(grayDiveURL){ startBtn.innerHTML='<img alt="'+(fromPause?'Continuar':'Sumergirse')+'" src="'+(fromPause?grayContinueURL:grayDiveURL)+'" />'; } if(grayRetryURL){ restartBtn.innerHTML='<img alt="Reintentar" src="'+grayRetryURL+'" />'; } if(grayExitURL){ closeInfo.innerHTML='<img alt="Salir" src="'+grayExitURL+'" />'; } }
  
  // ========= Audio =========
  const RAW='https://raw.githubusercontent.com/baltaz/the_expedition/main/sfx/';
  const MUSIC='https://raw.githubusercontent.com/baltaz/the_expedition/main/music/the%20expedition.mp3';
  const S=(function(){ let created=false; const a={}; let _muted=false; const srcMap={ fire:RAW+'sfx_fire.mp3', lose:RAW+'sfx_lose.mp3', gameover:RAW+'sfx_gameover.mp3', music:MUSIC, torpedo: 'https://cdn.freesound.org/previews/219/219244_4023635-lq.mp3', boss_hit: 'https://cdn.freesound.org/previews/55/55123_417757-lq.mp3', victory: 'https://cdn.freesound.org/previews/270/270319_5126113-lq.mp3', ink: 'https://cdn.freesound.org/previews/49/49110_391983-lq.mp3' };
    function init(){ if(created) return; created=true; for(const k in srcMap){ const el=new Audio(srcMap[k]); el.preload='auto'; if(k==='music'){ el.loop=true; el.volume=0.35; } else { el.volume=0.5; } a[k]=el; } }
    function play(k){ const el=a[k]; if(!el) return; try{ el.currentTime=0; el.play(); }catch(e){} }
    function loop(k){ const el=a[k]; if(!el) return; if(el.paused){ try{ el.play(); }catch(e){} } }
    function stop(k){ const el=a[k]; if(!el) return; try{ el.pause(); el.currentTime=0; }catch(e){} }
    function pause(k){ const el=a[k]; if(!el) return; try{ el.pause(); }catch(e){} }
    function setMuted(m){ for(const k in a){ try{ a[k].muted=!!m; }catch(e){} } _muted=!!m; }
    function isMuted(){ return _muted; }
    function toggleMuted(){ setMuted(!isMuted()); }
    return { init, play, loop, stop, pause, setMuted, isMuted, toggleMuted };
  })();

  // ========= High Score =========
  const HS_KEY='expedicion_hiscore_v2'; let highScore=0; try{ highScore=parseInt(localStorage.getItem(HS_KEY)||'0',10)||0; }catch(e){}
  function saveHighScore(){ try{ localStorage.setItem(HS_KEY,String(highScore)); }catch(e){} }

  // ========= Assets =========
  let robotImg=null, robotReady=false, spriteW=96, spriteH=64, robotScale=2;
  loadImage('https://raw.githubusercontent.com/baltaz/the_expedition/main/assets/subastian.png', function(img){ if(img){ robotImg=img; robotReady=true; const targetH=64; const ratio=img.width/img.height; spriteH=targetH; spriteW=Math.round(targetH*ratio); } });
  let creaturesImg=null, creaturesReady=false, cFrameW=0,cFrameH=0,cRows=0; loadImage('https://raw.githubusercontent.com/baltaz/the_expedition/main/Creatures/DeepseaCreatures_spritesheet.png', function(img){ if(img){ creaturesImg=img; cFrameW=Math.floor(img.width/2); cRows=Math.max(1,Math.floor(img.height/cFrameW)); cFrameH=Math.floor(img.height/cRows); creaturesReady=true; } });
  let bgImg=null,bgReady=false,bgOffset=0,bgW=0,bgH=0,BG_BASE_SPEED=35; loadImage('https://raw.githubusercontent.com/baltaz/the_expedition/main/assets/bg/bg_back.png', function(img){ if(img){ bgImg=img; bgReady=true; bgW=img.width; bgH=img.height; } });
  let fgImg=null,fgReady=false,fgOffset=0,fgW=0,fgH=0,FG_BASE_SPEED=60; loadImage('https://raw.githubusercontent.com/baltaz/the_expedition/main/assets/bg/bg_front.png', function(img){ if(img){ fgImg=img; fgReady=true; fgW=img.width; fgH=img.height; } });
  
  // ========= Geometry & Utils =========
  let W=innerWidth, H=innerHeight; const LANES_N=5; let lanes=[];
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function computeLanes(){ lanes.length=0; const minY=H*0.18, maxY=H*0.82; for(let i=0;i<LANES_N;i++){ const t=i/(LANES_N-1); lanes.push(minY+t*(maxY-minY)); } }

  // ========= Particles & Effects =========
  let particles=[]; let explosionParticles=[]; let inkParticles=[];
  function spawnParticle(arr, opts){ arr.push({x:opts.x,y:opts.y,vx:opts.vx,vy:opts.vy,r:opts.r,life:opts.life,maxLife:opts.life,color:opts.color,tw:Math.random()*Math.PI*2, baseA: opts.baseA || 1}); }
  function initParticles(){ particles.length=0; const density=Math.max(40,Math.min(140,Math.floor((W*H)/28000))); for(let i=0;i<density;i++) spawnParticle(particles, {x:Math.random()*W,y:Math.random()*H,vx:-(8+Math.random()*22),vy:-(10+Math.random()*25),r:Math.random()*2+1.2,life:999,color:'#cfe9ff', baseA: 0.25 + Math.random() * 0.25}); }
  function updateParticles(dt) {
    for(let arr of [particles, explosionParticles, inkParticles]) {
        for(let i=arr.length-1; i>=0; i--) {
            const p=arr[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; p.tw+=dt*2.0;
            if (arr === particles) { if(p.x<-8||p.y<-8){ p.x = W+10+Math.random()*20; p.y = H*Math.random(); }}
            else { if(p.life<=0){ arr.splice(i,1); } }
        }
    }
  }
  function drawParticles() {
      ctx.save();
      for(const p of particles) { ctx.globalCompositeOperation='lighter'; ctx.globalAlpha = clamp(p.baseA * (0.65 + 0.35 * Math.sin(p.tw)), 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); }
      ctx.globalCompositeOperation='lighter';
      for(const p of explosionParticles) { ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); }
      ctx.globalCompositeOperation='source-over';
      for (const p of inkParticles) { ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fillStyle=p.color; ctx.fill(); }
      ctx.restore();
  }
  function bobX(){ return state ? Math.sin(state.elapsed * 2*Math.PI * 0.5) * 6 : 0; }
  function spawnTorpedoExplosion(x,y) { for (let i=0; i<20; i++) { const ang=Math.random()*Math.PI*2, spd=30+Math.random()*100; spawnParticle(explosionParticles, {x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:Math.random()*2+1,life:0.4+Math.random()*0.4,color:'#ff8833'}); } }
  function spawnInkCloud(x,y,size) { S.play('ink'); for(let i=0; i<50; i++) { const ang = Math.random()*Math.PI*2, spd = 20+Math.random()*size; spawnParticle(inkParticles, {x,y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, r: 15+Math.random()*size*0.8, life: 2.5+Math.random()*2, color: '#101010'}); } }

  // ========= State & Game Logic =========
  let state=null, player, animals; let keys={};
  let overlayMode='menu'; let wasRunningBeforeCredits=false;
  let robotTilt=0, robotTiltTarget=0; const MAX_TILT=Math.PI/36;
  const TORPEDO_COOLDOWN = 1.5;
  let torpedos = [];
  
  // *** NEW: Level Configuration ***
  const LEVEL_CONFIG = [
    { name: 'NIVEL 1: CAÑÓN DE MAR DEL PLATA', objective: 'Captura 10 especímenes', goal: 10, type: 'capture' },
    { name: 'NIVEL 2: FOSA ABISAL', objective: 'Sobrevive 60 segundos', goal: 60, type: 'survive' },
    { name: 'NIVEL 3: LA GUARIDA DEL KRAKEN', objective: 'Derrota al jefe', goal: 1, type: 'boss' },
  ];

  function reset(){
    state={ 
      gamePhase: 'menu', // menu, playing, transition, gameover
      run:false, rescued:0, score:0, depth_s:0, lives:3, lifeAnim:0, spawn:0, speed:260, elapsed:0, inputLock:0.2,
      lightPhase:'off', lightVisible:false, lightTimer:0, lightToggles:0, lastMusicT:0,
      torpedoCooldown: 0,
      // *** NEW: Level state ***
      level: 1,
      levelObjectiveValue: 0,
      boss: null,
      inkProjectiles: [],
    };
    player={ x:0.18, y:0.5, vy:0, r:26, h:null };
    animals=[];
    torpedos = [];
    inkParticles = [];
    computeLanes();
    initParticles();
  }
  
  function difficultyRaw(){ if (!state) return 0; return state.elapsed/180; }
  function currentSpawnPeriod(){
    if (state.level === 3) return Infinity; // No regular spawns during boss fight
    const levelMulti = [1.0, 0.6, 0][state.level-1];
    let base=lerp(2.5,0.6,difficultyRaw());
    return Math.max(0.4, base * levelMulti);
  }
  function currentSpeed(){
    const levelMulti = [1.0, 1.4, 1.0][state.level-1];
    let spd=lerp(260,520,difficultyRaw());
    return spd * levelMulti;
  }
  function pointsForRescue(){ const p0=clamp(difficultyRaw(),0,1); return Math.floor(lerp(100,250,p0)); }
  function laneOccupied(idx){ for(let i=0;i<animals.length;i++){ const a=animals[i]; if(a.lane===idx && a.x>W*0.25 && !a.captured) return true; } return false; }
  
  function spawnAnimal(isBossMinion = false){
    if (state.level === 3 && !isBossMinion) return;
    const candidates=[]; for(let i=0;i<lanes.length;i++){ if(!laneOccupied(i)) candidates.push(i);} if(!candidates.length) return;
    const laneIndex=candidates[(Math.random()*candidates.length)|0];
    const y=lanes[laneIndex];
    
    let speed = currentSpeed() + 60;
    let type = 'normal';
    // Level 2 has aggressive creatures
    if (state.level === 2 && Math.random() < 0.3) {
        type = 'aggressive';
        speed *= 1.3;
    }
    if (isBossMinion) {
        type = 'aggressive';
        speed = 650;
    }
    
    const row=(creaturesReady&&cRows>0)?((Math.random()*cRows)|0):0;
    animals.push({ x:W+40,y, vx:-speed, r:44, lane:laneIndex, captured:false, row, frame:0, frameTimer:0, size:96, phaseSeed:Math.random()*Math.PI*2, type: type });
  }

  function fire(){ if(!player || player.h || state.inputLock>0) return; const baseX=player.x*W + bobX(), baseY=player.y*H; player.h={ x:baseX,y:baseY, dx:1,dy:0, speed:1400, phase:'out', hit:null, range: W*0.7, traveled:0 }; S.play('fire'); }
  function fireTorpedo() {
    if (!state || !state.run || state.torpedoCooldown > 0) return;
    const px=player.x*W + bobX(), py=player.y*H;
    torpedos.push({ x: px, y: py, w: 20, h: 6 });
    state.torpedoCooldown = TORPEDO_COOLDOWN;
    S.play('torpedo');
  }
  
  // *** NEW: Boss Logic ***
  function spawnBoss() {
    state.boss = {
        x: W - 150, y: H / 2,
        w: 200, h: 300,
        hp: 150, maxHp: 150,
        state: 'idle', // idle, attacking, hit
        attackTimer: 3, // time until next attack
        hitTimer: 0,
        tentacles: [],
    };
    // Create some tentacles
    for (let i = 0; i < 6; i++) {
        state.boss.tentacles.push({
            angle: (i / 5 - 0.5) * Math.PI * 0.8,
            len: 150 + Math.random() * 50,
            phase: Math.random() * Math.PI * 2,
        });
    }
  }

  function updateBoss(dt) {
    if (!state.boss) return;
    const boss = state.boss;
    boss.hitTimer = Math.max(0, boss.hitTimer - dt);
    boss.y = H/2 + Math.sin(state.elapsed * 0.5) * 50;

    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
        const attackType = Math.random();
        if (attackType < 0.45) { // Tentacle Smash
            boss.state = 'attacking_smash';
            const targetLane = Math.floor(Math.random() * LANES_N);
            boss.attackData = {
                lane: targetLane,
                charge: 1.2,
                y: lanes[targetLane],
                progress: 0,
            };
        } else if (attackType < 0.75) { // Ink Blast
            boss.state = 'attacking_ink';
            state.inkProjectiles.push({ x: boss.x, y: boss.y, vx: -400, r: 20 });
            boss.attackTimer = 3.5;
        } else { // Spawn Minions
            boss.state = 'attacking_minion';
            for (let i = 0; i < 2; i++) {
                setTimeout(() => spawnAnimal(true), i * 300);
            }
            boss.attackTimer = 5;
        }
    }
    
    // Update ongoing attacks
    if (boss.state === 'attacking_smash') {
        boss.attackData.charge -= dt;
        if (boss.attackData.charge <= 0) {
            boss.attackData.progress += dt * 8; // speed of smash
            const tentacleX = W - boss.attackData.progress * W;
            if (Math.hypot(player.x*W - tentacleX, player.y*H - boss.attackData.y) < player.r + 30) {
                 if(state.lives > 0) { state.lives--; S.play('lose'); state.lifeAnim = 0.6; }
                 if(state.lives <= 0) loseGame();
            }
            if (boss.attackData.progress >= 1.2) {
                boss.state = 'idle';
                boss.attackTimer = 2 + Math.random() * 2;
            }
        }
    }
  }
  
  function drawBoss() {
    if (!state.boss) return;
    const boss = state.boss;
    ctx.save();
    
    // Hit flash
    if (boss.hitTimer > 0) {
        ctx.filter = 'brightness(2.5)';
    }

    // Tentacles
    ctx.strokeStyle = '#6a0dad';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    boss.tentacles.forEach(t => {
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y);
        const a = t.angle + Math.sin(state.elapsed * 2 + t.phase) * 0.3;
        const midX = boss.x + Math.cos(a) * t.len * 0.5;
        const midY = boss.y + Math.sin(a) * t.len * 0.5;
        const endX = boss.x + Math.cos(a + Math.sin(state.elapsed * 1.5 + t.phase) * 0.5) * t.len;
        const endY = boss.y + Math.sin(a + Math.sin(state.elapsed * 1.5 + t.phase) * 0.5) * t.len;
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.stroke();
    });

    // Body
    ctx.fillStyle = '#8a2be2';
    ctx.beginPath();
    ctx.ellipse(boss.x, boss.y, boss.w / 2, boss.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(boss.x - 40, boss.y - 50, 25, 0, Math.PI*2);
    ctx.arc(boss.x + 40, boss.y - 50, 25, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    let pupilX = clamp(player.x * W, boss.x-50, boss.x-30);
    ctx.arc(pupilX, boss.y - 50, 10, 0, Math.PI*2);
    pupilX = clamp(player.x * W, boss.x+30, boss.x+50);
    ctx.arc(pupilX, boss.y - 50, 10, 0, Math.PI*2);
    ctx.fill();
    
    // Smash attack telegraph
    if (boss.state === 'attacking_smash' && boss.attackData.charge > 0) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
        ctx.fillRect(0, boss.attackData.y - 20, W, 40);
        // Draw tentacle preparing
        ctx.strokeStyle = '#e04040';
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.moveTo(W, boss.attackData.y);
        ctx.lineTo(W - 100, boss.attackData.y + (Math.random()-0.5)*20);
        ctx.stroke();
    }
    // Smash attack active
    if (boss.state === 'attacking_smash' && boss.attackData.charge <= 0) {
        const tentacleX = W - boss.attackData.progress * (W+200);
        ctx.strokeStyle = '#e04040';
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.moveTo(tentacleX + 200, boss.attackData.y-20);
        ctx.lineTo(tentacleX, boss.attackData.y);
        ctx.lineTo(tentacleX + 200, boss.attackData.y+20);
        ctx.stroke();
    }
    
    ctx.restore();
  }

  // ========= Update & Render Functions (Game Loop) =========
  function update(dt){
    if(!state || !state.run) return;

    state.elapsed+=dt;
    state.inputLock=Math.max(0,state.inputLock-dt);
    if(state.torpedoCooldown > 0) state.torpedoCooldown -= dt;

    const depthP=clamp(state.elapsed/180,0,1);
    state.depth_s=Math.max(state.depth_s,Math.floor(lerp(0,3900,depthP)));
    state.speed=currentSpeed();

    const up=!!keys['ArrowUp'], down=!!keys['ArrowDown'];
    if(dragActive){ const targetYpx=clamp(dragY,H*0.1,H*0.9); const dy=targetYpx-(player.y*H); player.y=clamp(player.y+(Math.sign(dy)*(450*Math.log(1+Math.abs(dy)/24))*dt)/H,0.1,0.9); robotTiltTarget = dy < -4 ? -MAX_TILT : (dy>4 ? MAX_TILT : 0); }
    else { player.vy=up?-400:down?400:0; player.y=clamp(player.y+(player.vy*dt/H),0.1,0.9); robotTiltTarget = up ? -MAX_TILT : (down ? MAX_TILT : 0); }
    robotTilt += (robotTiltTarget - robotTilt) * Math.min(1, 8*dt);

    if(keys[' ']&&state.inputLock===0){ if(!player.h){ fire(); } else if(player.h.phase==='out'){ player.h.phase='return'; } keys[' ']=false; }
    if((keys['x'] || keys['X']) && state.inputLock===0){ fireTorpedo(); keys['x']=keys['X']=false; }
    
    // Update Level Objective
    const levelConf = LEVEL_CONFIG[state.level - 1];
    if (levelConf.type === 'capture') state.levelObjectiveValue = state.rescued;
    else if (levelConf.type === 'survive') state.levelObjectiveValue = Math.min(state.levelObjectiveValue + dt, levelConf.goal);
    
    for(let i=animals.length-1;i>=0;i--){
        const a=animals[i]; a.x+=a.vx*dt; a.frameTimer+=dt; if(a.frameTimer>=0.2){ a.frameTimer-=0.2; a.frame^=1; }
        // Player collision
        if (!a.captured && Math.hypot(player.x*W+bobX() - a.x, player.y*H - a.y) < player.r + 20) {
            if (a.type === 'aggressive') {
                animals.splice(i, 1);
                const before=state.lives; if(state.lives>0) state.lives--; if(state.lives<before){ state.lifeAnim=0.6; S.play('lose'); } if(state.lives<=0) loseGame();
                continue;
            }
        }
        if(!a.captured && a.x<-a.r){ animals.splice(i,1); if(a.type !== 'aggressive'){ const before=state.lives; if(state.lives>0) state.lives--; if(state.lives<before){ state.lifeAnim=0.6; S.play('lose'); } if(state.lives<=0) loseGame(); } }
    }
    
    if(player.h){ const h=player.h, spd=h.speed; if(h.phase==='out'){ h.x+=h.dx*spd*dt; h.traveled+=spd*dt; for(let j=0;j<animals.length;j++){ const aa=animals[j]; if(!h.hit && !aa.captured && aa.type === 'normal' && Math.hypot(aa.x-h.x,aa.y-h.y)<aa.r+8){ h.hit=aa; aa.captured=true; break; } } if(h.hit || h.traveled>=h.range) h.phase='return'; }
      else { h.x-=h.dx*spd*dt; const targetY=player.y*H; h.y += (targetY - h.y) * Math.min(1, 6*dt); h.traveled=Math.max(0,h.traveled-spd*dt); if(h.hit){ h.hit.x=h.x; h.hit.y=h.y; } if(h.traveled<=0){ if(h.hit){ state.rescued++; state.score+=pointsForRescue(); const idx=animals.indexOf(h.hit); if(idx!==-1) animals.splice(idx,1);} player.h=null; } } }
    
    for (let i = torpedos.length - 1; i >= 0; i--) {
        const t = torpedos[i];
        t.x += 1200 * dt;
        if (t.x > W + 20) { torpedos.splice(i, 1); continue; }
        let hit = false;
        for (let j = animals.length - 1; j >= 0; j--) {
            const a = animals[j];
            if (!a.captured && t.x < a.x + a.r && t.x + t.w > a.x - a.r && t.y < a.y + a.r && t.y + t.h > a.y - a.r) {
                spawnTorpedoExplosion(a.x, a.y);
                animals.splice(j, 1);
                torpedos.splice(i, 1);
                hit = true; break;
            }
        }
        if (hit) continue;
        // Boss collision
        if (state.boss && t.x > state.boss.x - state.boss.w/2) {
            spawnTorpedoExplosion(t.x, t.y);
            torpedos.splice(i, 1);
            state.boss.hp -= 1;
            state.boss.hitTimer = 0.15;
            S.play('boss_hit');
            if (state.boss.hp <= 0) {
                 state.levelObjectiveValue = 1;
                 state.score += 5000;
            }
        }
    }
    
    // Update ink projectiles
    for (let i = state.inkProjectiles.length - 1; i >= 0; i--) {
        const ink = state.inkProjectiles[i];
        ink.x += ink.vx * dt;
        if (ink.x < 0) {
            spawnInkCloud(ink.x + Math.random()*100, ink.y, 80);
            state.inkProjectiles.splice(i, 1);
        }
    }

    state.lifeAnim=Math.max(0,state.lifeAnim-dt);
    state.spawn-=dt; if(state.spawn<=0){ spawnAnimal(); state.spawn=currentSpawnPeriod(); }
    
    if (state.level === 3) updateBoss(dt);
    
    updateParticles(dt);
    checkLevelCompletion();
  }

  function render(dt){
    // Background
    if (state) drawBG(dt);
    
    // Main Canvas
    ctx.clearRect(0,0,W,H);
    if (state) {
        // Boss is drawn behind animals
        if (state.level === 3) drawBoss();

        for(let i=0;i<animals.length;i++){
            const a=animals[i];
            const floatOffset=Math.sin(Math.PI*state.elapsed + a.phaseSeed)*5;
            ctx.save();
            if (a.type === 'aggressive') ctx.filter = 'hue-rotate(180deg) brightness(1.2)';
            if(creaturesReady&&cRows>0){
                const sx=(a.frame%2)*cFrameW, sy=(a.row%cRows)*cFrameH;
                ctx.imageSmoothingEnabled=false;
                ctx.drawImage(creaturesImg,sx,sy,cFrameW,cFrameH, Math.round(a.x-a.size/2), Math.round(a.y+floatOffset-a.size/2), a.size,a.size);
            } else { ctx.fillStyle= a.type === 'aggressive' ? '#ff5e5e' : '#ffd95e'; ctx.beginPath(); ctx.arc(a.x,a.y+floatOffset,a.r,0,Math.PI*2); ctx.fill(); }
            ctx.restore();
        }
        if(player){ const px=player.x*W + bobX(), py=player.y*H; ctx.save(); ctx.translate(px,py); ctx.rotate(robotTilt); if(robotReady){ ctx.imageSmoothingEnabled=false; const dw=spriteW*robotScale, dh=spriteH*robotScale; ctx.drawImage(robotImg, Math.round(-dw/2), Math.round(-dh/2), dw, dh); } else { ctx.fillStyle='#7ef'; ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.fill(); } ctx.restore(); }
        if(player&&player.h){ ctx.strokeStyle='#8ff'; ctx.beginPath(); const hx0=player.x*W + bobX(), hy0=player.y*H; ctx.moveTo(hx0,hy0); ctx.lineTo(player.h.x, player.h.y); ctx.stroke(); ctx.fillStyle='#8ff'; ctx.beginPath(); ctx.arc(player.h.x, player.h.y, 6, 0, Math.PI*2); ctx.fill(); }
        
        // Draw Torpedos and Ink
        ctx.fillStyle = '#ffcc00';
        for (const t of torpedos) { ctx.fillRect(t.x, t.y, t.w, t.h); }
        ctx.fillStyle = '#101010';
        for (const ink of state.inkProjectiles) { ctx.beginPath(); ctx.arc(ink.x, ink.y, ink.r, 0, Math.PI*2); ctx.fill(); }
        ctx.imageSmoothingEnabled = true;
    }
    drawParticles();

    // FX and HUD
    drawLightMask();
    drawHUD();
  }
  
  function drawBG(dt){ if (!state) return;
    const bgScroll = state.level !== 3; // Stop scrolling for boss
    if(bgReady&&bgW&&bgH){
        const spd=BG_BASE_SPEED*(1+0.6*clamp(difficultyRaw(),0,2));
        if (bgScroll) bgOffset=(bgOffset+spd*dt)%bgW;
        bgCtx.setTransform(1,0,0,1,0,0); bgCtx.clearRect(0,0,W,H); bgCtx.imageSmoothingEnabled=false;
        let startX=-Math.floor(bgOffset)-bgW; for(let x=startX; x<W+bgW; x+=bgW){ for(let y=0; y<H+bgH; y+=bgH){ bgCtx.drawImage(bgImg, Math.round(x), Math.round(y)); } }
    } else { bgCtx.clearRect(0,0,W,H); }
    if(fgReady&&fgW&&fgH){
        const fspd=FG_BASE_SPEED*(1+0.6*clamp(difficultyRaw(),0,2));
        if (bgScroll) fgOffset=(fgOffset+fspd*dt)%fgW;
        const yBase=H-fgH; const startXF=-Math.floor(fgOffset)-fgW;
        for(let xx=startXF; xx<W+fgW; xx+=fgW){ bgCtx.drawImage(fgImg, Math.round(xx), Math.round(yBase)); }
    }
  }
  function drawLightMask(){ if (!state) return; fx.clearRect(0,0,W,H);
    const darknessTarget = state.level === 1 ? state.elapsed / 180 : (state.level === 2 ? 0.95 : 1.0);
    const alpha=lerp(0,0.9, clamp(darknessTarget,0,1));
    if(alpha<=0.001) return; fx.globalCompositeOperation='source-over'; fx.fillStyle='rgba(0,0,0,'+alpha.toFixed(3)+')'; fx.fillRect(0,0,W,H); if(state.lightVisible && player){ const px=player.x*W + bobX(), py=player.y*H; const ang=robotTilt; const ux=Math.cos(ang), uy=Math.sin(ang); const vx=-Math.sin(ang), vy=Math.cos(ang); const ax=Math.round(px + ux*(spriteW*robotScale*0.5 - 11) + vx*(-4)); const ay=Math.round(py + uy*(spriteW*robotScale*0.5 - 11) + vy*(-4)); const L=Math.min(W*0.65,560); const theta=Math.PI/9; const endx=ax+ux*L, endy=ay+uy*L; const half=Math.tan(theta)*L; const pTopX=endx+vx*half, pTopY=endy+vy*half; const pBotX=endx-vx*half, pBotY=endy-vy*half; let g=fx.createLinearGradient(ax,ay,endx,endy); g.addColorStop(0.00,'rgba(255,255,255,1.0)'); g.addColorStop(0.45,'rgba(255,255,255,0.5)'); g.addColorStop(1.00,'rgba(255,255,255,0.0)'); fx.globalCompositeOperation='destination-out'; fx.fillStyle=g; fx.beginPath(); fx.moveTo(ax,ay); fx.lineTo(pTopX,pTopY); fx.lineTo(pBotX,pBotY); fx.closePath(); fx.fill(); const rg=fx.createRadialGradient(ax,ay,0, ax,ay,54); rg.addColorStop(0,'rgba(255,255,255,1.0)'); rg.addColorStop(1,'rgba(255,255,255,0.0)'); fx.fillStyle=rg; fx.beginPath(); fx.arc(ax,ay,54,0,Math.PI*2); fx.fill(); fx.globalCompositeOperation='lighter'; const gGlow=fx.createLinearGradient(ax,ay,endx,endy); gGlow.addColorStop(0.00,'rgba(255,255,255,0.14)'); gGlow.addColorStop(0.60,'rgba(255,255,255,0.06)'); gGlow.addColorStop(1.00,'rgba(255,255,255,0.00)'); fx.fillStyle=gGlow; fx.beginPath(); fx.moveTo(ax,ay); fx.lineTo(pTopX,pTopY); fx.lineTo(pBotX,pBotY); fx.closePath(); fx.fill(); fx.globalCompositeOperation='source-over'; }
  }
  function drawHUD(){ if (!state) return; hud.clearRect(0,0,W,H); if (!state.run) return; const s=state, depthVal=Math.floor(s.depth_s||0), scoreVal=s.score||0, livesVal=s.lives||3; const padX=18,padY=18,lh=22;
    hud.save(); hud.fillStyle='#ffffff'; hud.font='18px "Press Start 2P", monospace'; hud.textAlign='left'; hud.textBaseline='alphabetic';

    // Top-left HUD: Level Objective
    const levelConf = LEVEL_CONFIG[s.level-1];
    let objectiveText = '';
    if (levelConf.type === 'capture') objectiveText = `CAPTURES: ${s.rescued} / ${levelConf.goal}`;
    else if (levelConf.type === 'survive') objectiveText = `SUPERVIVENCIA: ${Math.floor(levelConf.goal - s.levelObjectiveValue)}s`;
    
    hud.fillText(`NIVEL ${s.level}`, padX, padY + lh);
    hud.fillStyle='#ffdd77';
    hud.fillText(objectiveText, padX, padY + lh*2);
    hud.fillStyle='#ffffff';

    // Bottom-left HUD: Stats
    const rows=[{label:'SCORE',value:String(scoreVal)},{label:'DEPTH',value:depthVal+' m'},{label:'RECORD',value:String(highScore)}]; const totalRows=rows.length+2; const y0=H-padY-lh*totalRows;
    let maxLabelW=0; for(let i=0;i<rows.length;i++) maxLabelW=Math.max(maxLabelW, hud.measureText(rows[i].label).width);
    const gap=16; const valueX=padX+maxLabelW+gap; for(let i=0;i<rows.length;i++){ const y=y0+i*lh; hud.fillText(rows[i].label, padX, y); hud.fillText(rows[i].value, valueX, y); }
    const livesY=y0+rows.length*lh; hud.fillText('LIVES', padX, livesY); hud.fillStyle='#ff4d4d'; hud.fillText('♥'.repeat(livesVal)+'♡'.repeat(3-livesVal), valueX, livesY); hud.fillStyle='#ffffff';
    const torpedoY = livesY + lh; hud.fillText('TORPEDO', padX, torpedoY); const torpedoReady = s.torpedoCooldown <= 0; hud.fillStyle = torpedoReady ? '#66ff66' : '#ff6666'; hud.fillText(torpedoReady ? 'LISTO' : 'RECARGANDO...', valueX, torpedoY); const barW = hud.measureText('RECARGANDO...').width; const barH = 4; const barX = valueX; const progress = clamp(1 - (s.torpedoCooldown / TORPEDO_COOLDOWN), 0, 1); hud.fillStyle = 'rgba(255,255,255,0.2)'; hud.fillRect(barX, torpedoY + 2, barW, barH); hud.fillStyle = '#66ff66'; hud.fillRect(barX, torpedoY + 2, barW * progress, barH);
    
    // Boss Health Bar
    if (s.level === 3 && s.boss) {
        const barW = W * 0.6, barH = 20;
        const barX = (W - barW) / 2, barY = 20;
        hud.fillStyle = 'rgba(0,0,0,0.5)';
        hud.fillRect(barX, barY, barW, barH);
        const hpProgress = clamp(s.boss.hp / s.boss.maxHp, 0, 1);
        hud.fillStyle = '#b22222';
        hud.fillRect(barX, barY, barW * hpProgress, barH);
        hud.strokeStyle = '#fff';
        hud.strokeRect(barX, barY, barW, barH);
        hud.fillStyle = '#fff';
        hud.textAlign = 'center';
        hud.font='14px "Press Start 2P"';
        hud.fillText('KRAKEN', W/2, barY + barH - 5);
    }
    
    hud.restore();
  }
  
  // ========= Main Loop Setup =========
  let last=0; function loop(t){ const dt=Math.min(0.033,(t-last)/1000||0); last=t; if(state.gamePhase==='playing') update(dt); render(dt); requestAnimationFrame(loop); }

  // ========= Start / End / Levels =========
  let __starting=false; function start(){ if(__starting) return; __starting=true; if(state&&state.run){ __starting=false; return; } reset(); keys={}; state.inputLock=0.2; state.gamePhase = 'playing'; state.run=true; state.spawn=1.0; state.lightVisible=true; S.init(); S.stop('music'); S.loop('music'); mainMenu.style.display = 'block'; levelTransition.style.display = 'none'; titleEl.style.display='none'; brandLogo.style.display='block'; finalP.innerHTML='Captura tantos especímenes<br/>como puedas'; finalStats.style.display='none'; if(mainExtras) mainExtras.style.display='none'; overlay.style.display='none'; overlayMode='menu'; startBtn.style.display='inline'; restartBtn.style.display='none'; refreshIcons(); setTimeout(function(){ __starting=false; },200); }
  
  function loseGame(){ if(!state || state.gamePhase === 'gameover') return; state.gamePhase = 'gameover'; state.run=false; S.stop('music'); S.play('gameover'); if(state.score>highScore){ highScore=state.score; saveHighScore(); } mainMenu.style.display = 'block'; levelTransition.style.display = 'none'; brandLogo.style.display='none'; titleEl.style.display='block'; titleEl.textContent='Fin de la expedición'; finalP.textContent='Gracias por ser parte'; statScore.textContent='SCORE: '+state.score; statDepth.textContent='DEPTH: '+state.depth_s+' m'; statSpecimens.textContent='SPECIMENS: '+state.rescued; finalStats.style.display='block'; if(mainExtras) mainExtras.style.display='none'; startBtn.style.display='none'; restartBtn.style.display='inline'; overlayMode='gameover'; overlay.style.display='grid'; }
  function winGame(){ if(!state || state.gamePhase === 'gameover') return; state.gamePhase = 'gameover'; state.run=false; S.stop('music'); S.play('victory'); if(state.score>highScore){ highScore=state.score; saveHighScore(); } mainMenu.style.display = 'block'; levelTransition.style.display = 'none'; brandLogo.style.display='none'; titleEl.style.display='block'; titleEl.textContent='¡VICTORIA!'; titleEl.style.color = '#ffdd77'; finalP.textContent='¡Has conquistado las profundidades!'; statScore.textContent='SCORE: '+state.score; statDepth.textContent='DEPTH: '+state.depth_s+' m'; statSpecimens.textContent='SPECIMENS: '+state.rescued; finalStats.style.display='block'; if(mainExtras) mainExtras.style.display='none'; startBtn.style.display='none'; restartBtn.style.display='inline'; overlayMode='gameover'; overlay.style.display='grid'; }

  function checkLevelCompletion() {
    if (state.gamePhase !== 'playing') return;
    const config = LEVEL_CONFIG[state.level - 1];
    if (state.levelObjectiveValue >= config.goal) {
        const nextLevel = state.level + 1;
        if (nextLevel > LEVEL_CONFIG.length) {
            winGame();
        } else {
            triggerLevelTransition(nextLevel);
        }
    }
  }

  function triggerLevelTransition(nextLevel) {
    state.gamePhase = 'transition';
    state.run = false;
    const config = LEVEL_CONFIG[nextLevel - 1];
    mainMenu.style.display = 'none';
    levelTitle.textContent = config.name;
    levelDesc.textContent = config.objective;
    levelTransition.style.display = 'block';
    overlay.style.display = 'grid';
    
    setTimeout(() => {
        startNextLevel(nextLevel);
    }, 4000);
  }

  function startNextLevel(level) {
    state.level = level;
    state.levelObjectiveValue = 0;
    animals = [];
    torpedos = [];
    state.inkProjectiles = [];
    if (level === 3) {
        spawnBoss();
    }
    overlay.style.display = 'none';
    state.gamePhase = 'playing';
    state.run = true;
    state.inputLock = 0.5;
  }

  // ========= Input & Buttons =========
  addEventListener('keydown', function(e){ keys[e.key]=true; if(e.code==='Space') e.preventDefault(); if(e.key==='Escape') { e.preventDefault(); openMainMenu(); } });
  addEventListener('keyup', function(e){ keys[e.key]=false; });
  startBtn.onclick=function(e){ e.stopPropagation(); if(overlayMode==='pause'){ overlay.style.display='none'; if(state){ state.run=true; state.inputLock=0.15; } S.loop('music'); } else { start(); } };
  restartBtn.onclick=start; muteBtn.onclick=function(){ S.toggleMuted(); refreshIcons(); };
  function showMainMenuView(fromPause){ brandLogo.style.display='block'; titleEl.style.display='none'; finalP.innerHTML='Captura tantos especímenes<br/>como puedas'; finalStats.style.display='none'; const divider=document.getElementById('menuDivider'); if(divider) divider.style.display='block'; if(mainExtras) mainExtras.style.display= fromPause ? 'block':'none'; setModalButtons(fromPause); startBtn.style.display='inline'; restartBtn.style.display = fromPause ? 'inline' : 'none'; overlayMode= fromPause ? 'pause':'menu'; mainMenu.style.display = 'block'; levelTransition.style.display = 'none'; overlay.style.display='grid'; }
  function openMainMenu(){ if(state && state.run){ state.run=false; S.pause('music'); showMainMenuView(true); } }
  infoBtn.onclick=openMainMenu;
  logoHUD.addEventListener('click', function(){ wasRunningBeforeCredits=!!(state&&state.run); if(state){ state.run=false; } S.pause('music'); infoOverlay.style.display='grid'; });
  closeInfo.onclick=function(){ infoOverlay.style.display='none'; if(wasRunningBeforeCredits && overlay.style.display==='none'){ if(state){ state.run=true; } S.loop('music'); } };
  fsBtn.onclick=function(){ toggleFullscreen(); };
  if(shareBtn){ shareBtn.onclick = async function(){ let wasRunning = !!(state && state.run); if(wasRunning){ state.run=false; S.pause('music'); } try{ if(navigator.share){ await navigator.share({ title:'Expedición Mardel', text:'¡He conquistado las profundidades! ¿Puedes tú?', url: location.href }); } }catch(_){} finally{ if(wasRunning && overlay.style.display==='none'){ state.run=true; S.loop('music'); } } }; }
  overlay.addEventListener('click', function(e){ if(e.target===overlay && overlay.style.display!=='none' && restartBtn.style.display==='none' && state.gamePhase !== 'transition'){ if(overlayMode==='pause'){ overlay.style.display='none'; if(state){ state.run=true; state.inputLock=0.15; } S.loop('music'); } else { start(); } } });

  // ---- Mobile controls ----
  let dragId=-1, dragActive=false, dragY=0;
  function isOverUI(x,y){ const elts=[muteBtn, infoBtn, fsBtn, shareBtn, overlay, infoOverlay]; for (const el of elts){ if(!el) continue; const style=getComputedStyle(el); if(style.display==='none'||style.visibility==='hidden') continue; const r=el.getBoundingClientRect(); if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) return true; } return false; }
  window.addEventListener('pointerdown', (e) => { if (isOverUI(e.clientX, e.clientY)) return; const tapX = e.clientX; if (tapX < W * 0.4) { dragId = e.pointerId; dragActive = true; dragY = e.clientY; e.preventDefault(); } else if (tapX > W * 0.6) { if(!state||!state.run) return; if(state.inputLock===0){ if(!player.h){ fire(); } else if(player.h.phase==='out'){ player.h.phase='return'; } } } else { fireTorpedo(); } }, {passive:false});
  window.addEventListener('pointermove', (e) => { if (!dragActive || e.pointerId !== dragId) return; dragY = e.clientY; e.preventDefault(); }, {passive:false});
  window.addEventListener('pointerup', (e) => { if (e.pointerId === dragId) { dragActive = false; dragId = -1; } }, {passive:false});

  // ========= Fullscreen / Immersive =========
  function canUseFullscreen(){ return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled); }
  function toggleFullscreen(){ if(!canUseFullscreen()){document.body.classList.toggle('immersive');return;}const el=document.documentElement;try{if(!document.fullscreenElement&&!document.webkitFullscreenElement&&!document.msFullscreenElement){if(el.requestFullscreen)return el.requestFullscreen();if(el.webkitRequestFullscreen)return el.webkitRequestFullscreen();}else{if(document.exitFullscreen)return document.exitFullscreen();if(document.webkitExitFullscreen)return document.webkitExitFullscreen();}}catch(err){console.warn('Fullscreen no disponible',err);}}

  // ========= Size / Init =========
  function autoSize(){ const v={w:innerWidth,h:innerHeight}; [bgCanvas,cvs,fxCanvas,hudCanvas].forEach(c=>{ c.width=v.w; c.height=v.h; }); W=v.w; H=v.h; computeLanes(); if(!state || !state.run) { initParticles(); } }
  window.addEventListener('resize', autoSize);
  
  autoSize(); reset(); requestAnimationFrame(loop); S.init(); refreshIcons();
})();