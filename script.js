(function(){
  'use strict';
  // ========= Funciones Auxiliares =========
  function cargarImagen(url, cb){ const im=new Image(); im.crossOrigin='anonymous'; im.onload=()=>cb(im); im.onerror=()=>cb(null); im.src=url; }

  // ========= Lienzos (Canvas) =========
  const bgCanvas=document.getElementById('bgCanvas'), bgCtx=bgCanvas.getContext('2d');
  const cvs=document.getElementById('gameCanvas'), ctx=cvs.getContext('2d');
  const fxCanvas=document.getElementById('fxCanvas'), fx=fxCanvas.getContext('2d');
  const hudCanvas=document.getElementById('hudCanvas'), hud=hudCanvas.getContext('2d');

  // ========= Referencias de la Interfaz de Usuario (UI) =========
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
  const githubBtn = document.getElementById('githubBtn'); 
  const fsBtn=document.getElementById('fsBtn');
  const shareBtn=document.getElementById('shareBtn');
  const infoOverlay=document.getElementById('infoOverlay');
  const closeInfo=document.getElementById('closeInfo');
  const logoHUD=document.getElementById('logoHUD');
  const mainExtras=document.getElementById('mainExtras');
  const bossHealthContainer = document.getElementById('bossHealthContainer');
  const bossHealthBar = document.getElementById('bossHealthBar');
  const gameplayHints = document.getElementById('gameplay-hints');
  const hudLevelText = document.getElementById('hud-level-text');
  const hudObjectiveText = document.getElementById('hud-objective-text');
  
  function actualizarIconos(){ 
    if (!muteBtn) return;
    const slash = document.getElementById('muteSlash');
    if (S.estaSilenciado()) {
        muteBtn.classList.add('muted');
        if (slash) slash.style.display = 'block';
    } else {
        muteBtn.classList.remove('muted');
        if (slash) slash.style.display = 'none';
    }
  }
  
  // ========= Audio =========
  const RAW='https://raw.githubusercontent.com/baltaz/the_expedition/main/sfx/';
  const MUSIC='https://raw.githubusercontent.com/baltaz/the_expedition/main/music/the%20expedition.mp3';
  const S=(function(){ let creado=false; const a={}; let _silenciado=false; const mapaFuentes={ fire:RAW+'sfx_fire.mp3', lose:RAW+'sfx_lose.mp3', gameover:RAW+'sfx_gameover.mp3', music:MUSIC, torpedo: 'sonidos/torpedo.wav', boss_hit: 'sonidos/boss_hit.mp3', victory: 'sonidos/victoria.mp3', ink: 'sonidos/ink.wav', shotgun: 'sonidos/shotgun.wav', machinegun: 'sonidos/machinegun.wav', reload: 'sonidos/reload.wav' };
    function init(){ if(creado) return; creado=true; for(const k in mapaFuentes){ try{ const el=new Audio(mapaFuentes[k]); el.preload='auto'; if(k==='music'){ el.loop=true; el.volume=0.35; } else { el.volume=0.5; } a[k]=el; } catch(e) { console.warn(`No se pudo cargar el audio: ${mapaFuentes[k]}`); } } }
    function reproducir(k){ const el=a[k]; if(!el) return; try{ el.currentTime=0; el.play(); }catch(e){} }
    function bucle(k){ const el=a[k]; if(!el) return; if(el.paused){ try{ el.play(); }catch(e){} } }
    function detener(k){ const el=a[k]; if(!el) return; try{ el.pause(); el.currentTime=0; }catch(e){} }
    function pausar(k){ const el=a[k]; if(!el) return; try{ el.pause(); }catch(e){} }
    function setSilenciado(m){ for(const k in a){ try{ a[k].muted=!!m; }catch(e){} } _silenciado=!!m; }
    function estaSilenciado(){ return _silenciado; }
    function alternarSilenciado(){ setSilenciado(!estaSilenciado()); }
    return { init, reproducir, bucle, detener, pausar, setSilenciado, estaSilenciado, alternarSilenciado };
  })();

  // ========= Puntuación Máxima =========
  const CLAVE_PUNTUACION='expedicion_hiscore_v2'; let puntuacionMaxima=0; try{ puntuacionMaxima=parseInt(localStorage.getItem(CLAVE_PUNTUACION)||'0',10)||0; }catch(e){}
  function guardarPuntuacionMaxima(){ try{ localStorage.setItem(CLAVE_PUNTUACION,String(puntuacionMaxima)); }catch(e){} }

 // ========= Recursos (Assets) =========
  let robotImg=null, robotListo=false, spriteAncho=96, spriteAlto=64, robotEscala=2;
  cargarImagen('img/subastian.png', function(img){ if(img){ robotImg=img; robotListo=true; const altoObjetivo=64; const ratio=img.width/img.height; spriteAlto=altoObjetivo; spriteAncho=Math.round(altoObjetivo*ratio); } });
  let criaturasImg=null, criaturasListas=false, cFrameAncho=0,cFrameAlto=0,cFilas=0; cargarImagen('img/DeepseaCreatures_spritesheet.png', function(img){ if(img){ criaturasImg=img; cFrameAncho=Math.floor(img.width/2); cFilas=Math.max(1,Math.floor(img.height/cFrameAncho)); cFrameAlto=Math.floor(img.height/cFilas); criaturasListas=true; } });
  let bgImg=null,bgListo=false,bgOffset=0,bgAncho=0,bgAlto=0,BG_VELOCIDAD_BASE=35; cargarImagen('img/bg_back.png', function(img){ if(img){ bgImg=img; bgListo=true; bgAncho=img.width; bgAlto=img.height; } });
  let fgImg=null,fgListo=false,fgOffset=0,fgAncho=0,fgAlto=0,FG_VELOCIDAD_BASE=60; cargarImagen('img/bg_front.png', function(img){ if(img){ fgImg=img; fgListo=true; fgAncho=img.width; fgAlto=img.height; } });
  
  // ========= Geometría y Utilidades =========
  let W=innerWidth, H=innerHeight; const NUM_CARRILES=5; let carriles=[];
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function calcularCarriles(){ carriles.length=0; const minY=H*0.18, maxY=H*0.82; for(let i=0;i<NUM_CARRILES;i++){ const t=i/(NUM_CARRILES-1); carriles.push(minY+t*(maxY-minY)); } }

  // ========= Partículas y Efectos =========
  let particulas=[]; let particulasExplosion=[]; let particulasTinta=[];
  let proyectiles = [];

  function generarParticula(arr, opts){ arr.push({x:opts.x,y:opts.y,vx:opts.vx,vy:opts.vy,r:opts.r,vida:opts.vida,vidaMax:opts.vida,color:opts.color,tw:Math.random()*Math.PI*2, baseA: opts.baseA || 1}); }
  function iniciarParticulas(){ particulas.length=0; const densidad=Math.max(40,Math.min(140,Math.floor((W*H)/28000))); for(let i=0;i<densidad;i++) generarParticula(particulas, {x:Math.random()*W,y:Math.random()*H,vx:-(8+Math.random()*22),vy:-(10+Math.random()*25),r:Math.random()*2+1.2,vida:999,color:'#cfe9ff', baseA: 0.25 + Math.random() * 0.25}); }
  function actualizarParticulas(dt) {
    for(let arr of [particulas, particulasExplosion, particulasTinta]) {
        for(let i=arr.length-1; i>=0; i--) {
            const p=arr[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vida-=dt; p.tw+=dt*2.0;
            if (arr === particulas) { if(p.x<-8||p.y<-8){ p.x = W+10+Math.random()*20; p.y = H*Math.random(); }}
            else { if(p.vida<=0){ arr.splice(i,1); } }
        }
    }
  }
  function dibujarParticulas() {
      if (!ctx) return;
      ctx.save();
      for(const p of particulas) { ctx.globalCompositeOperation='lighter'; ctx.globalAlpha = clamp(p.baseA * (0.65 + 0.35 * Math.sin(p.tw)), 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); }
      ctx.globalCompositeOperation='lighter';
      for(const p of particulasExplosion) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); }
      ctx.globalCompositeOperation='source-over';
      for (const p of particulasTinta) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1) * 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fillStyle=p.color; ctx.fill(); }
      ctx.restore();
  }
  function oscilarX(){ return estadoJuego ? Math.sin(estadoJuego.tiempoTranscurrido * 2*Math.PI * 0.5) * 6 : 0; }
  function generarExplosion(x, y, color = '#ff8833') { for (let i=0; i<20; i++) { const ang=Math.random()*Math.PI*2, spd=30+Math.random()*100; generarParticula(particulasExplosion, {x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:Math.random()*2+1,vida:0.4+Math.random()*0.4,color}); } }
  function generarNubeDeTinta(x,y,size) { S.reproducir('ink'); for(let i=0; i<50; i++) { const ang = Math.random()*Math.PI*2, spd = 20+Math.random()*size; generarParticula(particulasTinta, {x,y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, r: 15+Math.random()*size*0.8, vida: 2.5+Math.random()*2, color: '#101010'}); } }

  // ========= Lógica del Juego =========
  let estadoJuego=null, jugador, animales; let teclas={};
  let modoSuperposicion='menu'; let estabaCorriendoAntesCreditos=false;
  let inclinacionRobot=0, inclinacionRobotObjetivo=0; const INCLINACION_MAX=Math.PI/36;
  const ENFRIAMIENTO_TORPEDO = 1.5;
  let torpedos = [];
  
  const CONFIG_NIVELES = [
    { nombre: 'NIVEL 1: CAÑÓN DE MAR DEL PLATA', objetivo: 'Captura 10 especímenes', meta: 10, tipo: 'capture' },
    { nombre: 'NIVEL 2: FOSA ABISAL', objetivo: 'Sobrevive 60 segundos', meta: 60, tipo: 'survive' },
    { nombre: 'NIVEL 3: LA GUARIDA DEL KRAKEN', objetivo: 'Derrota al jefe', meta: 1, tipo: 'boss' },
  ];
  
  const RANGOS_ASESINO = [
      {bajas: 0,   titulo: "NOVATO"},
      {bajas: 10,  titulo: "APRENDIZ"},
      {bajas: 25,  titulo: "MERCENARIO"},
      {bajas: 50,  titulo: "CAZADOR"},
      {bajas: 75,  titulo: "VETERANO"},
      {bajas: 100, titulo: "DEPREDADOR"},
      {bajas: 150, titulo: "LEYENDA ABISAL"}
  ];

  function reiniciar(){
    estadoJuego={ 
      faseJuego: 'menu', enEjecucion:false, rescatados:0, puntuacion:0, profundidad_m:0, vidas:3, animVida:0, aparicion:0, velocidad:260, tiempoTranscurrido:0, bloqueoEntrada:0.2,
      faseLuz:'off', luzVisible:false, timerLuz:0, cambiosLuz:0, ultimaMusicaT:0,
      enfriamientoTorpedo: 0,
      nivel: 1,
      valorObjetivoNivel: 0,
      jefe: null,
      proyectilesTinta: [],
      armaActual: 'garra',
      enfriamientoArma: 0,
      asesinatos: 0,
    };
    jugador={ x:0.18, y:0.5, vy:0, r:26, garra:null };
    animales=[];
    torpedos = [];
    proyectiles = [];
    particulasTinta = [];
    autoSize();
    iniciarParticulas();
    if (gameplayHints) gameplayHints.style.display = 'none';
  }
  
  function dificultadBase(){ if (!estadoJuego) return 0; return estadoJuego.tiempoTranscurrido/180; }
  function periodoAparicionActual(){
    if (estadoJuego.nivel === 3) return Infinity;
    const multiNivel = [1.0, 0.6, 0][estadoJuego.nivel-1];
    let base=lerp(2.5,0.6,dificultadBase());
    return Math.max(0.4, base * multiNivel);
  }
  function velocidadActual(){
    const multiNivel = [1.0, 1.4, 1.0][estadoJuego.nivel-1];
    let spd=lerp(260,520,dificultadBase());
    return spd * multiNivel;
  }
  function puntosPorRescate(){ const p0=clamp(dificultadBase(),0,1); return Math.floor(lerp(100,250,p0)); }
  function carrilOcupado(idx){ for(let i=0;i<animales.length;i++){ const a=animales[i]; if(a.carril===idx && a.x>W*0.25 && !a.capturado) return true; } return false; }
  function generarAnimal(esEsbirroJefe = false){
    if (estadoJuego.nivel === 3 && !esEsbirroJefe) return;
    const candidatos=[]; for(let i=0;i<carriles.length;i++){ if(!carrilOcupado(i)) candidatos.push(i);} if(!candidatos.length) return;
    const indiceCarril=candidatos[(Math.random()*candidatos.length)|0];
    const y=carriles[indiceCarril];
    
    let velocidad = velocidadActual() + 60;
    let tipo = 'normal';
    if (estadoJuego.nivel === 2 && Math.random() < 0.3) {
        tipo = 'aggressive';
        velocidad *= 1.3;
    }
    if (esEsbirroJefe) {
        tipo = 'aggressive';
        velocidad = 650;
    }
    
    const fila=(criaturasListas&&cFilas>0)?((Math.random()*cFilas)|0):0;
    animales.push({ x:W+40,y, vx:-velocidad, r:44, carril:indiceCarril, capturado:false, fila, frame:0, timerFrame:0, tamano:96, semillaFase:Math.random()*Math.PI*2, tipo: tipo });
  }

  function dispararGarfio(){ if(!jugador || jugador.garra || !estadoJuego || estadoJuego.bloqueoEntrada>0) return; const baseX=jugador.x*W + oscilarX(), baseY=jugador.y*H; jugador.garra={ x:baseX,y:baseY, dx:1,dy:0, velocidad:1400, fase:'ida', golpeado:null, alcance: W*0.7, recorrido:0 }; S.reproducir('fire'); }
  
  function dispararShotgun() {
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return;
    const px=jugador.x*W + oscilarX() + 40, py=jugador.y*H;
    
    for (let i = 0; i < 25; i++) {
        const angulo = (Math.random() - 0.5) * 1.5;
        const velocidad = 700 + Math.random() * 400;
        proyectiles.push({ x: px, y: py, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, w: 8, h: 3, color: '#ffb733', vida: 0.5 + Math.random() * 0.3 });
    }
    estadoJuego.enfriamientoArma = 2.5;
    S.reproducir('shotgun');
    setTimeout(() => S.reproducir('reload'), 500);
  }

  function dispararMetralleta() {
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return;
    const px=jugador.x*W + oscilarX() + 40, py=jugador.y*H;
    
    const numBalas = 30;
    for (let i = 0; i < numBalas; i++) {
        const angulo = (Math.random() - 0.5) * 0.2;
        const velocidad = 1600;
        // Se crea la bala con un pequeño retraso en su posición inicial para simular un chorro
        const xOffset = (i / numBalas) * velocidad * 0.05; 
        proyectiles.push({ x: px + xOffset, y: py, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, w: 12, h: 2, color: '#ff6363', vida: 0.8 });
    }
    
    estadoJuego.enfriamientoArma = 3.0; // Recarga larga después de la ráfaga
    
    // Reproducir sonido en ráfaga
    let soundCount = 0;
    const soundInterval = setInterval(() => {
        S.reproducir('machinegun');
        soundCount++;
        if (soundCount >= 5) clearInterval(soundInterval);
    }, 60);
    setTimeout(() => S.reproducir('reload'), 800);
  }
  
  function disparar() {
    if (!estadoJuego) return;
    switch (estadoJuego.armaActual) {
        case 'garra':
            if (!jugador.garra) dispararGarfio();
            else if (jugador.garra.fase === 'ida') jugador.garra.fase = 'retorno';
            break;
        case 'shotgun':
            dispararShotgun();
            break;
        case 'metralleta':
            dispararMetralleta();
            break;
    }
  }

  function lanzarTorpedo() {
    if (!estadoJuego || !estadoJuego.enEjecucion || estadoJuego.enfriamientoTorpedo > 0) return;
    const px=jugador.x*W + oscilarX(), py=jugador.y*H;
    torpedos.push({ x: px, y: py, w: 20, h: 6 });
    estadoJuego.enfriamientoTorpedo = ENFRIAMIENTO_TORPEDO;
    S.reproducir('torpedo');
  }
  
  function generarJefe() {
    estadoJuego.jefe = { x: W - 150, y: H / 2, w: 200, h: 300, hp: 150, maxHp: 150, estado: 'idle', timerAtaque: 3, timerGolpe: 0, tentaculos: [], };
    for (let i = 0; i < 6; i++) { estadoJuego.jefe.tentaculos.push({ angulo: (i / 5 - 0.5) * Math.PI * 0.8, largo: 150 + Math.random() * 50, fase: Math.random() * Math.PI * 2, }); }
    if (bossHealthContainer) bossHealthContainer.style.display = 'block';
  }

  function actualizarJefe(dt) {
    if (!estadoJuego || !estadoJuego.jefe) return;
    const jefe = estadoJuego.jefe;
    jefe.timerGolpe = Math.max(0, jefe.timerGolpe - dt);
    jefe.y = H/2 + Math.sin(estadoJuego.tiempoTranscurrido * 0.5) * 50;
    jefe.timerAtaque -= dt;
    if (jefe.timerAtaque <= 0) {
        const tipoAtaque = Math.random();
        jefe.estado = 'idle';
        if (tipoAtaque < 0.45) { jefe.estado = 'attacking_smash'; const carrilObjetivo = Math.floor(Math.random() * NUM_CARRILES); jefe.datosAtaque = { carril: carrilObjetivo, carga: 1.2, y: carriles[carrilObjetivo], progreso: 0 }; jefe.timerAtaque = 3;
        } else if (tipoAtaque < 0.75) { jefe.estado = 'attacking_ink'; estadoJuego.proyectilesTinta.push({ x: jefe.x, y: jefe.y, vx: -400, r: 20 }); jefe.timerAtaque = 3.5;
        } else { jefe.estado = 'attacking_minion'; for (let i = 0; i < 2; i++) { setTimeout(() => generarAnimal(true), i * 300); } jefe.timerAtaque = 5; }
    }
    if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
        jefe.datosAtaque.carga -= dt;
        if (jefe.datosAtaque.carga <= 0) {
            jefe.datosAtaque.progreso += dt * 8;
            const tentaculoX = W - jefe.datosAtaque.progreso * W;
            if (Math.hypot(jugador.x*W - tentaculoX, jugador.y*H - jefe.datosAtaque.y) < jugador.r + 30) { if(estadoJuego.vidas > 0) { estadoJuego.vidas--; S.reproducir('lose'); estadoJuego.animVida = 0.6; } if(estadoJuego.vidas <= 0) perderJuego(); }
            if (jefe.datosAtaque.progreso >= 1.2) { jefe.estado = 'idle'; jefe.datosAtaque = null; jefe.timerAtaque = 2 + Math.random() * 2; }
        }
    }
  }
  
  function dibujarJefe() {
    if (!estadoJuego || !estadoJuego.jefe || !ctx) return;
    const jefe = estadoJuego.jefe;
    ctx.save();
    if (jefe.timerGolpe > 0) ctx.filter = 'brightness(2.5)';
    ctx.strokeStyle = '#6a0dad'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    jefe.tentaculos.forEach(t => { ctx.beginPath(); ctx.moveTo(jefe.x, jefe.y); const a = t.angulo + Math.sin(estadoJuego.tiempoTranscurrido * 2 + t.fase) * 0.3; const midX = jefe.x + Math.cos(a) * t.largo * 0.5; const midY = jefe.y + Math.sin(a) * t.largo * 0.5; const endX = jefe.x + Math.cos(a + Math.sin(estadoJuego.tiempoTranscurrido * 1.5 + t.fase) * 0.5) * t.largo; const endY = jefe.y + Math.sin(a + Math.sin(estadoJuego.tiempoTranscurrido * 1.5 + t.fase) * 0.5) * t.largo; ctx.quadraticCurveTo(midX, midY, endX, endY); ctx.stroke(); });
    ctx.fillStyle = '#8a2be2'; ctx.beginPath(); ctx.ellipse(jefe.x, jefe.y, jefe.w / 2, jefe.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(jefe.x - 40, jefe.y - 50, 25, 0, Math.PI*2); ctx.arc(jefe.x + 40, jefe.y - 50, 25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); let pupilaX = clamp(jugador.x * W, jefe.x-50, jefe.x-30); ctx.arc(pupilaX, jefe.y - 50, 10, 0, Math.PI*2); pupilaX = clamp(jugador.x * W, jefe.x+30, jefe.x+50); ctx.arc(pupilaX, jefe.y - 50, 10, 0, Math.PI*2); ctx.fill();
    if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
        if (jefe.datosAtaque.carga > 0) { ctx.fillStyle = 'rgba(255, 50, 50, 0.4)'; ctx.fillRect(0, jefe.datosAtaque.y - 20, W, 40); ctx.strokeStyle = '#e04040'; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(W, jefe.datosAtaque.y); ctx.lineTo(W - 100, jefe.datosAtaque.y + (Math.random()-0.5)*20); ctx.stroke();
        } else { const tentaculoX = W - jefe.datosAtaque.progreso * (W+200); ctx.strokeStyle = '#e04040'; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(tentaculoX + 200, jefe.datosAtaque.y-20); ctx.lineTo(tentaculoX, jefe.datosAtaque.y); ctx.lineTo(tentaculoX + 200, jefe.datosAtaque.y+20); ctx.stroke(); }
    }
    ctx.restore();
  }

  function actualizar(dt){
    if(!estadoJuego || !estadoJuego.enEjecucion) return;

    estadoJuego.tiempoTranscurrido+=dt;
    estadoJuego.bloqueoEntrada=Math.max(0,estadoJuego.bloqueoEntrada-dt);
    if(estadoJuego.enfriamientoTorpedo > 0) estadoJuego.enfriamientoTorpedo -= dt;
    if(estadoJuego.enfriamientoArma > 0) estadoJuego.enfriamientoArma -= dt;

    const progresoProfundidad=clamp(estadoJuego.tiempoTranscurrido/180,0,1);
    estadoJuego.profundidad_m=Math.max(estadoJuego.profundidad_m,Math.floor(lerp(0,3900,progresoProfundidad)));
    estadoJuego.velocidad=velocidadActual();

    const arriba=!!teclas['ArrowUp'], abajo=!!teclas['ArrowDown'];
    if(arrastreActivo){ const targetYpx=clamp(arrastreY,H*0.1,H*0.9); const dy=targetYpx-(jugador.y*H); jugador.y=clamp(jugador.y+(Math.sign(dy)*(450*Math.log(1+Math.abs(dy)/24))*dt)/H,0.1,0.9); inclinacionRobotObjetivo = dy < -4 ? -INCLINACION_MAX : (dy>4 ? INCLINACION_MAX : 0); }
    else { jugador.vy=arriba?-400:abajo?400:0; jugador.y=clamp(jugador.y+(jugador.vy*dt/H),0.1,0.9); inclinacionRobotObjetivo = arriba ? -INCLINACION_MAX : (abajo ? INCLINACION_MAX : 0); }
    inclinacionRobot += (inclinacionRobotObjetivo - inclinacionRobot) * Math.min(1, 8*dt);
    
    if(teclas[' '] && estadoJuego.bloqueoEntrada===0){ 
        disparar(); 
        teclas[' '] = false; // Acción de un solo pulso para todas las armas
    }
    if((teclas['x'] || teclas['X']) && estadoJuego.bloqueoEntrada===0){ lanzarTorpedo(); teclas['x']=teclas['X']=false; }
    if(teclas['1']) { estadoJuego.armaActual = 'garra'; }
    if(teclas['2']) { estadoJuego.armaActual = 'shotgun'; }
    if(teclas['3']) { estadoJuego.armaActual = 'metralleta'; }
    
    const configNivel = CONFIG_NIVELES[estadoJuego.nivel - 1];
    if (configNivel.tipo === 'capture') estadoJuego.valorObjetivoNivel = estadoJuego.rescatados;
    else if (configNivel.tipo === 'survive') estadoJuego.valorObjetivoNivel = Math.min(estadoJuego.valorObjetivoNivel + dt, configNivel.meta);
    
    for(let i=animales.length-1;i>=0;i--){ const a=animales[i]; a.x+=a.vx*dt; a.timerFrame+=dt; if(a.timerFrame>=0.2){ a.timerFrame-=0.2; a.frame^=1; } if (!a.capturado && Math.hypot(jugador.x*W+oscilarX() - a.x, jugador.y*H - a.y) < jugador.r + 20) { animales.splice(i, 1); const antes=estadoJuego.vidas; if(estadoJuego.vidas > 0) estadoJuego.vidas--; if(estadoJuego.vidas < antes) { estadoJuego.animVida=0.6; S.reproducir('lose'); } if(estadoJuego.vidas <= 0) perderJuego(); continue; } if(!a.capturado && a.x < -a.r){ animales.splice(i,1); } }
    if(jugador.garra){ const g=jugador.garra, spd=g.velocidad; if(g.fase==='ida'){ g.x+=g.dx*spd*dt; g.recorrido+=spd*dt; for(let j=0;j<animales.length;j++){ const aa=animales[j]; if(!g.golpeado && !aa.capturado && aa.tipo === 'normal' && Math.hypot(aa.x-g.x,aa.y-g.y)<aa.r+8){ g.golpeado=aa; aa.capturado=true; break; } } if(g.golpeado || g.recorrido>=g.alcance) g.fase='retorno'; } else { g.x-=g.dx*spd*dt; const targetY=jugador.y*H; g.y += (targetY - g.y) * Math.min(1, 6*dt); g.recorrido=Math.max(0,g.recorrido-spd*dt); if(g.golpeado){ g.golpeado.x=g.x; g.golpeado.y=g.y; } if(g.recorrido<=0){ if(g.golpeado){ estadoJuego.rescatados++; estadoJuego.puntuacion+=puntosPorRescate(); const idx=animales.indexOf(g.golpeado); if(idx!==-1) animales.splice(idx,1);} jugador.garra=null; } } }
    for (let i = torpedos.length - 1; i >= 0; i--) { const t = torpedos[i]; t.x += 1200 * dt; if (t.x > W + 20) { torpedos.splice(i, 1); continue; } let golpe = false; for (let j = animales.length - 1; j >= 0; j--) { const a = animales[j]; if (!a.capturado && t.x < a.x + a.r && t.x + t.w > a.x - a.r && t.y < a.y + a.r && t.y + t.h > a.y - a.r) { generarExplosion(a.x, a.y); animales.splice(j, 1); estadoJuego.asesinatos++; torpedos.splice(i, 1); golpe = true; break; } } if (golpe) continue; if (estadoJuego.jefe && t.x > estadoJuego.jefe.x - estadoJuego.jefe.w/2) { generarExplosion(t.x, t.y); torpedos.splice(i, 1); estadoJuego.jefe.hp -= 10; estadoJuego.jefe.timerGolpe = 0.15; S.reproducir('boss_hit'); if (estadoJuego.jefe.hp <= 0) { estadoJuego.valorObjetivoNivel = 1; estadoJuego.puntuacion += 5000; } } }
    for (let i = proyectiles.length - 1; i >= 0; i--) { const p = proyectiles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; if (p.vida <= 0 || p.x > W + 20 || p.x < 0) { proyectiles.splice(i, 1); continue; } let golpe = false; for (let j = animales.length - 1; j >= 0; j--) { const a = animales[j]; if (!a.capturado && p.x < a.x + a.r && p.x + p.w > a.x - a.r && p.y < a.y + a.r && p.y + p.h > a.y - a.r) { generarExplosion(a.x, a.y, p.color); animales.splice(j, 1); estadoJuego.asesinatos++; proyectiles.splice(i, 1); golpe = true; break; } } if (golpe) continue; if (estadoJuego.jefe && p.x > estadoJuego.jefe.x - estadoJuego.jefe.w / 2) { generarExplosion(p.x, p.y, p.color); proyectiles.splice(i, 1); estadoJuego.jefe.hp -= 1; estadoJuego.jefe.timerGolpe = 0.15; S.reproducir('boss_hit'); if (estadoJuego.jefe.hp <= 0) { estadoJuego.valorObjetivoNivel = 1; estadoJuego.puntuacion += 5000; } } }
    for (let i = estadoJuego.proyectilesTinta.length - 1; i >= 0; i--) { const ink = estadoJuego.proyectilesTinta[i]; ink.x += ink.vx * dt; if (ink.x < 0) { generarNubeDeTinta(ink.x + Math.random()*100, ink.y, 80); estadoJuego.proyectilesTinta.splice(i, 1); } }

    estadoJuego.animVida=Math.max(0,estadoJuego.animVida-dt);
    estadoJuego.aparicion-=dt; if(estadoJuego.aparicion<=0){ generarAnimal(); estadoJuego.aparicion=periodoAparicionActual(); }
    if (estadoJuego.nivel === 3) actualizarJefe(dt);
    actualizarParticulas(dt);
    comprobarCompletadoNivel();
  }

  function renderizar(dt){
    if (estadoJuego) dibujarFondo(dt);
    if (!ctx) return;
    
    ctx.clearRect(0,0,W,H);
    if (estadoJuego) {
        if (estadoJuego.nivel === 3) dibujarJefe();
        for(let i=0;i<animales.length;i++){ const a=animales[i]; const offsetFlotante=Math.sin(Math.PI*estadoJuego.tiempoTranscurrido + a.semillaFase)*5; ctx.save(); if (a.tipo === 'aggressive') ctx.filter = 'hue-rotate(180deg) brightness(1.2)'; if(criaturasListas&&cFilas>0){ const sx=(a.frame%2)*cFrameAncho, sy=(a.fila%cFilas)*cFrameAlto; ctx.imageSmoothingEnabled=false; ctx.drawImage(criaturasImg,sx,sy,cFrameAncho,cFrameAlto, Math.round(a.x-a.tamano/2), Math.round(a.y+offsetFlotante-a.tamano/2), a.tamano,a.tamano); } else { ctx.fillStyle= a.tipo === 'aggressive' ? '#ff5e5e' : '#ffd95e'; ctx.beginPath(); ctx.arc(a.x,a.y+offsetFlotante,a.r,0,Math.PI*2); ctx.fill(); } ctx.restore(); }
        if(jugador){ const px=jugador.x*W + oscilarX(), py=jugador.y*H; ctx.save(); ctx.translate(px,py); ctx.rotate(inclinacionRobot); if(robotListo){ ctx.imageSmoothingEnabled=false; const dw=spriteAncho*robotEscala, dh=spriteAlto*robotEscala; ctx.drawImage(robotImg, Math.round(-dw/2), Math.round(-dh/2), dw, dh); } else { ctx.fillStyle='#7ef'; ctx.beginPath(); ctx.arc(0,0,jugador.r,0,Math.PI*2); ctx.fill(); } ctx.restore(); }
        if(jugador&&jugador.garra){ ctx.strokeStyle='#8ff'; ctx.beginPath(); const hx0=jugador.x*W + oscilarX(), hy0=jugador.y*H; ctx.moveTo(hx0,hy0); ctx.lineTo(jugador.garra.x, jugador.garra.y); ctx.stroke(); ctx.fillStyle='#8ff'; ctx.beginPath(); ctx.arc(jugador.garra.x, jugador.garra.y, 6, 0, Math.PI*2); ctx.fill(); }
        ctx.fillStyle = '#ffcc00';
        for (const t of torpedos) { ctx.fillRect(t.x, t.y, t.w, t.h); }
        for (const p of proyectiles) { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.w, p.h); }
        ctx.fillStyle = '#101010';
        for (const ink of estadoJuego.proyectilesTinta) { ctx.beginPath(); ctx.arc(ink.x, ink.y, ink.r, 0, Math.PI*2); ctx.fill(); }
        ctx.imageSmoothingEnabled = true;
    }
    dibujarParticulas();
    dibujarMascaraLuz();
    dibujarHUD();
  }
  
  function dibujarFondo(dt){ 
    if (!estadoJuego || !bgCtx) return;
    const scrollFondo = estadoJuego.nivel !== 3;

    bgCtx.clearRect(0,0,W,H);

    if(bgListo && bgAncho > 0 && bgAlto > 0){
        const spd=BG_VELOCIDAD_BASE*(1+0.6*clamp(dificultadBase(),0,2));
        if (scrollFondo) bgOffset=(bgOffset+spd*dt) % bgAncho;
        bgCtx.imageSmoothingEnabled=false;
        for(let x=-bgOffset; x < W + bgAncho; x+=bgAncho){ 
            for(let y=0; y < H + bgAlto; y+=bgAlto){ 
                bgCtx.drawImage(bgImg, Math.round(x), Math.round(y), bgAncho, bgAlto); 
            } 
        }
        if(fgListo && fgAncho > 0 && fgAlto > 0){
            const fspd=FG_VELOCIDAD_BASE*(1+0.6*clamp(dificultadBase(),0,2));
            if (scrollFondo) fgOffset=(fgOffset+fspd*dt) % fgAncho;
            const yBase=H-fgAlto; 
            for(let xx=-fgOffset; xx < W + fgAncho; xx+=fgAncho){ bgCtx.drawImage(fgImg, Math.round(xx), Math.round(yBase), fgAncho, fgAlto); }
        }
    } else { 
        bgCtx.fillStyle = '#06131f';
        bgCtx.fillRect(0, 0, W, H);
    }
  }

  function dibujarMascaraLuz(){ 
    if (!estadoJuego || !fx) return; 
    fx.clearRect(0,0,W,H);
    const oscuridadObjetivo = estadoJuego.nivel === 1 ? estadoJuego.tiempoTranscurrido / 180 : (estadoJuego.nivel === 2 ? 0.95 : 1.0);
    const alpha=lerp(0,0.9, clamp(oscuridadObjetivo,0,1));
    if(alpha<=0.001) return; 
    fx.globalCompositeOperation='source-over'; 
    fx.fillStyle='rgba(0,0,0,'+alpha.toFixed(3)+')'; 
    fx.fillRect(0,0,W,H); 
    if(estadoJuego.luzVisible && jugador){ 
        const px=jugador.x*W + oscilarX(), py=jugador.y*H; const ang=inclinacionRobot; const ux=Math.cos(ang), uy=Math.sin(ang); const vx=-Math.sin(ang), vy=Math.cos(ang); 
        const ax=Math.round(px + ux*(spriteAncho*robotEscala*0.5 - 11) + vx*(-4)); 
        const ay=Math.round(py + uy*(spriteAncho*robotEscala*0.5 - 11) + vy*(-4)); 
        const L=Math.min(W*0.65,560); const theta=Math.PI/9; const endx=ax+ux*L, endy=ay+uy*L; const half=Math.tan(theta)*L; 
        const pTopX=endx+vx*half, pTopY=endy+vy*half; const pBotX=endx-vx*half, pBotY=endy-vy*half; 
        let g=fx.createLinearGradient(ax,ay,endx,endy); g.addColorStop(0.00,'rgba(255,255,255,1.0)'); g.addColorStop(0.45,'rgba(255,255,255,0.5)'); g.addColorStop(1.00,'rgba(255,255,255,0.0)'); 
        fx.globalCompositeOperation='destination-out'; 
        fx.fillStyle=g; fx.beginPath(); fx.moveTo(ax,ay); fx.lineTo(pTopX,pTopY); fx.lineTo(pBotX,pBotY); fx.closePath(); fx.fill(); 
        const rg=fx.createRadialGradient(ax,ay,0, ax,ay,54); rg.addColorStop(0,'rgba(255,255,255,1.0)'); rg.addColorStop(1,'rgba(255,255,255,0.0)'); 
        fx.fillStyle=rg; fx.beginPath(); fx.arc(ax,ay,54,0,Math.PI*2); fx.fill(); 
        fx.globalCompositeOperation='lighter'; 
        const gGlow=fx.createLinearGradient(ax,ay,endx,endy); gGlow.addColorStop(0.00,'rgba(255,255,255,0.14)'); gGlow.addColorStop(0.60,'rgba(255,255,255,0.06)'); gGlow.addColorStop(1.00,'rgba(255,255,255,0.00)'); 
        fx.fillStyle=gGlow; fx.beginPath(); fx.moveTo(ax,ay); fx.lineTo(pTopX,pTopY); fx.lineTo(pBotX,pBotY); fx.closePath(); fx.fill(); 
        fx.globalCompositeOperation='source-over'; 
    }
  }
  
  function dibujarHUD(){ 
    if (!estadoJuego || !hudLevelText || !hudObjectiveText) return; 
    
    if(estadoJuego.enEjecucion) {
        const configNivel = CONFIG_NIVELES[estadoJuego.nivel-1];
        let textoObjetivo = '';
        if (configNivel.tipo === 'capture') textoObjetivo = `CAPTURAS: ${estadoJuego.rescatados} / ${configNivel.meta}`;
        else if (configNivel.tipo === 'survive') textoObjetivo = `SUPERVIVENCIA: ${Math.floor(configNivel.meta - estadoJuego.valorObjetivoNivel)}s`;
        
        hudLevelText.textContent = `NIVEL ${estadoJuego.nivel}`;
        hudObjectiveText.textContent = textoObjetivo;
    }

    if (!hud) return;
    hud.clearRect(0,0,W,H); 
    if (!estadoJuego.enEjecucion) return; 

    const s=estadoJuego, valorPuntuacion=s.puntuacion||0, valorVidas=s.vidas||3, valorProfundidad=Math.floor(s.profundidad_m||0); 
    
    const padX=18, padY=18, lh=22;
    hud.save(); 
    hud.fillStyle='#ffffff'; 
    hud.font='18px "Press Start 2P", monospace'; 
    hud.textAlign='left'; 
    hud.textBaseline='alphabetic';
    hud.shadowColor = 'rgba(0,0,0,0.7)';
    hud.shadowBlur = 4;

    const filas=[{label:'SCORE',value:String(valorPuntuacion)},{label:'DEPTH',value:valorProfundidad+' m'},{label:'RECORD',value:String(puntuacionMaxima)}];
    const totalFilas=filas.length + 4; 
    const y0=H-padY-lh*totalFilas;
    let maxAnchoEtiqueta=0; 
    
    const todasLasEtiquetas = [...filas.map(f => f.label), 'VIDAS', 'TORPEDO', 'ARMA', 'ASESINO'];
    for(const label of todasLasEtiquetas) maxAnchoEtiqueta=Math.max(maxAnchoEtiqueta, hud.measureText(label).width);
    
    const gap=16; 
    const valueX=padX+maxAnchoEtiqueta+gap; 
    
    let currentY = y0;
    for(let i=0;i<filas.length;i++){ hud.fillText(filas[i].label, padX, currentY); hud.fillText(filas[i].value, valueX, currentY); currentY += lh; }
    
    hud.fillText('VIDAS', padX, currentY); 
    hud.fillStyle='#ff4d4d'; 
    hud.fillText('♥'.repeat(valorVidas)+'♡'.repeat(Math.max(0,3-valorVidas)), valueX, currentY); 
    hud.fillStyle='#ffffff';
    currentY += lh;

    hud.fillText('TORPEDO', padX, currentY); 
    const torpedoListo = s.enfriamientoTorpedo <= 0; 
    hud.fillStyle = torpedoListo ? '#66ff66' : '#ff6666'; 
    hud.fillText(torpedoListo ? 'LISTO' : 'RECARGANDO...', valueX, currentY); 
    currentY += lh;
    
    hud.fillStyle='#ffffff';
    hud.fillText('ARMA', padX, currentY);
    let armaTexto = s.armaActual.toUpperCase();
    
    if (s.armaActual === 'shotgun' || s.armaActual === 'metralleta') {
        if (s.enfriamientoArma > 0) {
            armaTexto += " (RECARGANDO)";
            hud.fillStyle = '#ff6666';
        } else {
            armaTexto += " (LISTA)";
            hud.fillStyle = '#ffdd77';
        }
    } else { // Garra
        hud.fillStyle = '#aaddff';
    }

    hud.fillText(armaTexto, valueX, currentY);
    currentY += lh;

    hud.fillStyle = '#ffffff';
    hud.fillText('ASESINO', padX, currentY);
    const rango = RANGOS_ASESINO.slice().reverse().find(r => s.asesinatos >= r.bajas) || RANGOS_ASESINO[0];
    hud.fillStyle = '#ff5e5e';
    hud.fillText(rango.titulo, valueX, currentY);

    hud.restore();
    
    if (s.nivel === 3 && s.jefe) {
        const hpProgress = clamp(s.jefe.hp / s.jefe.maxHp, 0, 1);
        if (bossHealthBar) bossHealthBar.style.width = (hpProgress * 100) + '%';
    } else {
        if (bossHealthContainer && bossHealthContainer.style.display !== 'none') bossHealthContainer.style.display = 'none';
    }
  }
  
  let ultimo=0; function bucle(t){ const dt=Math.min(0.033,(t-ultimo)/1000||0); ultimo=t; if(estadoJuego && estadoJuego.faseJuego==='playing') actualizar(dt); renderizar(dt); requestAnimationFrame(bucle); }

  let __iniciando=false; 
  function iniciarJuego(){ 
    if(__iniciando) return; 
    __iniciando=true; 
    if(estadoJuego&&estadoJuego.enEjecucion){ __iniciando=false; return; } 
    reiniciar(); 
    teclas={}; 
    estadoJuego.bloqueoEntrada=0.2; 
    estadoJuego.faseJuego = 'playing'; 
    estadoJuego.enEjecucion=true; 
    estadoJuego.aparicion=1.0; 
    estadoJuego.luzVisible=true; 
    S.init(); 
    S.detener('music'); 
    S.bucle('music'); 
    if(overlay) overlay.style.display='none'; 
    if (gameplayHints) gameplayHints.style.display = 'flex';
    setTimeout(function(){ __iniciando=false; },200); 
  }
  
  function perderJuego(){ 
    if(!estadoJuego || estadoJuego.faseJuego === 'gameover') return; 
    estadoJuego.faseJuego = 'gameover'; estadoJuego.enEjecucion=false; 
    S.detener('music'); S.reproducir('gameover'); 
    if(estadoJuego.puntuacion>puntuacionMaxima){ puntuacionMaxima=estadoJuego.puntuacion; guardarPuntuacionMaxima(); } 
    if (mainMenu) mainMenu.style.display = 'block'; 
    if (levelTransition) levelTransition.style.display = 'none'; 
    if (brandLogo) brandLogo.style.display='none'; 
    if (titleEl) { titleEl.style.display='block'; titleEl.textContent='Fin de la expedición'; titleEl.style.color = ''; }
    if (finalP) finalP.textContent='Gracias por ser parte.'; 
    if (statScore) statScore.textContent='PUNTUACIÓN: '+estadoJuego.puntuacion; 
    if (statDepth) statDepth.textContent='PROFUNDIDAD: '+estadoJuego.profundidad_m+' m'; 
    if (statSpecimens) statSpecimens.textContent='ESPECÍMENES: '+estadoJuego.rescatados; 
    if (finalStats) finalStats.style.display='block'; 
    if (mainExtras) mainExtras.style.display='none'; 
    if (startBtn) startBtn.style.display='none'; 
    if (restartBtn) restartBtn.style.display='inline-block'; 
    modoSuperposicion='gameover'; 
    if (overlay) overlay.style.display='grid'; 
    if (bossHealthContainer) bossHealthContainer.style.display = 'none'; 
    if(gameplayHints) gameplayHints.style.display = 'none'; 
  }

  function ganarJuego(){ 
    if(!estadoJuego || estadoJuego.faseJuego === 'gameover') return; 
    estadoJuego.faseJuego = 'gameover'; estadoJuego.enEjecucion=false; 
    S.detener('music'); S.reproducir('victory'); 
    if(estadoJuego.puntuacion>puntuacionMaxima){ puntuacionMaxima=estadoJuego.puntuacion; guardarPuntuacionMaxima(); } 
    if (mainMenu) mainMenu.style.display = 'block'; 
    if (levelTransition) levelTransition.style.display = 'none'; 
    if (brandLogo) brandLogo.style.display='none'; 
    if (titleEl) { titleEl.style.display='block'; titleEl.textContent='¡VICTORIA!'; titleEl.style.color = '#ffdd77'; }
    if (finalP) finalP.textContent='¡Has conquistado las profundidades!'; 
    if (statScore) statScore.textContent='PUNTUACIÓN: '+estadoJuego.puntuacion; 
    if (statDepth) statDepth.textContent='PROFUNDIDAD: '+estadoJuego.profundidad_m+' m'; 
    if (statSpecimens) statSpecimens.textContent='ESPECÍMENES: '+estadoJuego.rescatados; 
    if (finalStats) finalStats.style.display='block'; 
    if (mainExtras) mainExtras.style.display='none'; 
    if (startBtn) startBtn.style.display='none'; 
    if (restartBtn) restartBtn.style.display='inline-block'; 
    modoSuperposicion='gameover'; 
    if (overlay) overlay.style.display='grid'; 
    if (bossHealthContainer) bossHealthContainer.style.display = 'none'; 
    if(gameplayHints) gameplayHints.style.display = 'none'; 
  }

  function comprobarCompletadoNivel() {
    if (!estadoJuego || estadoJuego.faseJuego !== 'playing') return;
    const config = CONFIG_NIVELES[estadoJuego.nivel - 1];
    if (estadoJuego.valorObjetivoNivel >= config.meta) {
        const proximoNivel = estadoJuego.nivel + 1;
        if (proximoNivel > CONFIG_NIVELES.length) {
            ganarJuego();
        } else {
            activarTransicionNivel(proximoNivel);
        }
    }
  }

  function activarTransicionNivel(proximoNivel) {
    estadoJuego.faseJuego = 'transition';
    estadoJuego.enEjecucion = false;
    const config = CONFIG_NIVELES[proximoNivel - 1];
    if (mainMenu) mainMenu.style.display = 'none';
    if (levelTitle) levelTitle.textContent = config.nombre;
    if (levelDesc) levelDesc.textContent = config.objetivo;
    if (levelTransition) levelTransition.style.display = 'block';
    if (overlay) overlay.style.display = 'grid';
    
    setTimeout(() => {
        iniciarSiguienteNivel(proximoNivel);
    }, 4000);
  }

  function iniciarSiguienteNivel(nivel) {
    if (!estadoJuego) return;
    estadoJuego.nivel = nivel;
    estadoJuego.valorObjetivoNivel = 0;
    animales = [];
    torpedos = [];
    proyectiles = [];
    estadoJuego.proyectilesTinta = [];
    if (nivel === 3) {
        generarJefe();
    }
    if(overlay) overlay.style.display = 'none';
    estadoJuego.faseJuego = 'playing';
    estadoJuego.enEjecucion = true;
    estadoJuego.bloqueoEntrada = 0.5;
  }
  
  addEventListener('keydown', function(e){ teclas[e.key]=true; if(e.code==='Space') e.preventDefault(); if(e.key==='Escape') { e.preventDefault(); abrirMenuPrincipal(); } });
  addEventListener('keyup', function(e){ teclas[e.key]=false; });

  if (startBtn) {
    startBtn.onclick=function(e){ e.stopPropagation(); if(modoSuperposicion==='pause'){ if(overlay) overlay.style.display='none'; if(estadoJuego){ estadoJuego.enEjecucion=true; estadoJuego.bloqueoEntrada=0.15; if(gameplayHints) gameplayHints.style.display = 'flex'; } S.bucle('music'); } else { iniciarJuego(); } };
  }
  if (restartBtn) restartBtn.onclick=iniciarJuego; 
  if (muteBtn) muteBtn.onclick=function(){ S.alternarSilenciado(); actualizarIconos(); };
  
  function mostrarVistaMenuPrincipal(desdePausa) {
    if (!mainMenu) return;
    const mainMenuHeader = document.getElementById('mainMenuHeader');
    if (mainMenuHeader) mainMenuHeader.style.display = 'block';
    if (brandLogo) brandLogo.style.display = 'block';

    if(finalP) finalP.innerHTML = 'Captura tantos especímenes<br/>como puedas.';
    if(titleEl) titleEl.style.display = 'none';
    if(finalStats) finalStats.style.display = 'none';
    if(mainExtras) mainExtras.style.display = desdePausa ? 'block' : 'none';
    if(startBtn) startBtn.style.display = 'inline-block';
    if(restartBtn) restartBtn.style.display = 'none';
    
    modoSuperposicion = desdePausa ? 'pause' : 'menu';
    if(mainMenu) mainMenu.style.display = 'block';
    if(levelTransition) levelTransition.style.display = 'none';
    if(overlay) overlay.style.display = 'grid';
  }

  function abrirMenuPrincipal(){ 
      if(estadoJuego && estadoJuego.enEjecucion){ 
          estadoJuego.enEjecucion=false; 
          S.pausar('music'); 
          mostrarVistaMenuPrincipal(true); 
          if(gameplayHints) gameplayHints.style.display = 'none'; 
      } 
  }
  
  if (infoBtn) {
      infoBtn.onclick = () => {
          estabaCorriendoAntesCreditos=!!(estadoJuego&&estadoJuego.enEjecucion); 
          if(estadoJuego) estadoJuego.enEjecucion=false; 
          S.pausar('music'); 
          if(infoOverlay) infoOverlay.style.display='grid'; 
          if(gameplayHints) gameplayHints.style.display = 'none';
      };
  }

  if (githubBtn) githubBtn.onclick = () => window.open('https://github.com/HectorDanielAyarachiFuentes', '_blank');
  if (logoHUD) logoHUD.addEventListener('click', abrirMenuPrincipal);
  
  if (closeInfo) {
    closeInfo.onclick=function(){ 
        if (infoOverlay) infoOverlay.style.display='none'; 
        if(estabaCorriendoAntesCreditos && (!overlay || overlay.style.display==='none')){ 
            if(estadoJuego){ estadoJuego.enEjecucion=true; } S.bucle('music'); 
            if(gameplayHints) gameplayHints.style.display = 'flex'; 
        } 
    };
  }

  if (fsBtn) fsBtn.onclick=function(){ alternarPantallaCompleta(); };

  if(shareBtn){ 
    shareBtn.onclick = async function(){ 
      let estabaCorriendo = !!(estadoJuego && estadoJuego.enEjecucion); 
      if(estabaCorriendo){ estadoJuego.enEjecucion=false; S.pausar('music'); } 
      try{ 
        if(navigator.share){ 
          await navigator.share({ title:'La Expedición', text:'¡He conquistado las profundidades! ¿Puedes tú?', url: location.href }); 
        } 
      }catch(_){} 
      finally{ 
        if(estabaCorriendo && (!overlay || overlay.style.display==='none')){ 
          if (estadoJuego) estadoJuego.enEjecucion=true; 
          S.bucle('music'); 
        } 
      } 
    }; 
  }
  
  if (overlay) {
      overlay.addEventListener('click', function(e){ 
          if(e.target===overlay && overlay.style.display!=='none' && (!restartBtn || restartBtn.style.display==='none') && estadoJuego && estadoJuego.faseJuego !== 'transition'){ 
              if(modoSuperposicion==='pause'){ 
                  overlay.style.display='none'; 
                  if(estadoJuego){ estadoJuego.enEjecucion=true; estadoJuego.bloqueoEntrada=0.15; if(gameplayHints) gameplayHints.style.display = 'flex';} S.bucle('music'); 
              } else { 
                  iniciarJuego(); 
              } 
          } 
      });
  }

  let arrastreId=-1, arrastreActivo=false, arrastreY=0;
  function estaSobreUI(x,y){ const elementos=[muteBtn, infoBtn, fsBtn, shareBtn, githubBtn, overlay, infoOverlay]; for (const el of elementos){ if(!el) continue; const style=getComputedStyle(el); if(style.display==='none'||style.visibility==='hidden') continue; const r=el.getBoundingClientRect(); if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) return true; } return false; }
  
  window.addEventListener('pointerdown', (e) => { 
      if (estaSobreUI(e.clientX, e.clientY)) return; 
      const tapX = e.clientX; 
      if (tapX < W * 0.4) { arrastreId = e.pointerId; arrastreActivo = true; arrastreY = e.clientY; e.preventDefault(); } 
      else if (tapX > W * 0.6) { if(!estadoJuego||!estadoJuego.enEjecucion) return; if(estadoJuego.bloqueoEntrada===0){ teclas[' '] = true; } } 
      else { lanzarTorpedo(); } 
  }, {passive:false});

  window.addEventListener('pointermove', (e) => { if (!arrastreActivo || e.pointerId !== arrastreId) return; arrastreY = e.clientY; e.preventDefault(); }, {passive:false});

  window.addEventListener('pointerup', (e) => { 
      if (e.pointerId === arrastreId) { 
        arrastreActivo = false; arrastreId = -1; 
      }
      teclas[' '] = false;
  }, {passive:false});

  function puedeUsarPantallaCompleta(){ return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled); }
  function alternarPantallaCompleta(){ if(!puedeUsarPantallaCompleta()){document.body.classList.toggle('immersive');return;}const el=document.documentElement;try{if(!document.fullscreenElement&&!document.webkitFullscreenElement&&!document.msFullscreenElement){if(el.requestFullscreen)return el.requestFullscreen();if(el.webkitRequestFullscreen)return el.webkitRequestFullscreen();}else{if(document.exitFullscreen)return document.exitFullscreen();if(document.webkitExitFullscreen)return document.webkitExitFullscreen();}}catch(err){console.warn('Pantalla completa no disponible',err);}}

  function autoSize(){ 
    const topHud = document.getElementById('top-hud');
    const alturaTotalHud = topHud ? topHud.offsetHeight : 70;
    
    const v={w:innerWidth, h:innerHeight - alturaTotalHud}; 
    [bgCanvas,cvs,fxCanvas,hudCanvas].forEach(c=>{ if (c) {c.width=v.w; c.height=v.h;} }); 
    W=v.w; 
    H=v.h; 
    calcularCarriles(); 
    if(!estadoJuego || !estadoJuego.enEjecucion) { renderizar(0); } 
  }
  window.addEventListener('resize', autoSize);
  
  // ======== INICIO ========
  autoSize(); 
  reiniciar(); 
  requestAnimationFrame(bucle); 
  S.init(); 
  actualizarIconos(); 
  mostrarVistaMenuPrincipal(false);
})();