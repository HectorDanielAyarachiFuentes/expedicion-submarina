// js/level6.js
'use strict';

import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, torpedos, proyectiles, generarNubeDeTinta } from './game.js';

// --- ESTADO Y ENTIDADES DEL NIVEL 6 MEJORADO ---
const VORTEX_RADIUS = 200;
const VORTEX_FORCE = 300;
let vortexRotation = 0;
let vortexParticles = [];
let creatures = [];
let fallingDebris = [];
let shockwaves = [];
let timeUntilNextPhase = 25; // Reducido para más dinamismo
let currentPhase = 0;
let phaseTimer = 0;
let blackHoleMode = false;
let earthquakeTimer = 0;
let screenShake = 0;
let vortexPulseTimer = 0;
let vortexPulseStrength = 0;

// Tipos de criaturas mejoradas
const CREATURE_TYPES = [
  { 
    color: '#FF5555', 
    speed: 180, 
    size: 30, 
    hp: 2, 
    score: 100,
    behavior: 'aggressive', 
    attack: 'charge',
    spawnEffect: () => S.reproducir('machinegun')
  },
  { 
    color: '#55FF55', 
    speed: 90, 
    size: 50, 
    hp: 4, 
    score: 150,
    behavior: 'defensive', 
    attack: 'tentacleWhip',
    spawnEffect: () => generarNubeDeTinta(W/2, H/2, 50)
  },
  { 
    color: '#5555FF', 
    speed: 130, 
    size: 40, 
    hp: 3, 
    score: 125,
    behavior: 'swarming', 
    attack: 'projectile',
    spawnEffect: () => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => S.reproducir('arpon'), i * 200);
      }
    }
  },
  { 
    color: '#FF55FF', 
    speed: 200, 
    size: 25, 
    hp: 1, 
    score: 200,
    behavior: 'kamikaze', 
    attack: 'explode',
    spawnEffect: () => {
      ctx.fillStyle = '#FF00FF';
      ctx.fillRect(0, 0, W, H);
      setTimeout(() => {}, 100);
    }
  }
];

// --- FUNCIONES MEJORADAS DEL NIVEL 6 ---

function spawnVortexParticle() {
  const angle = Math.random() * Math.PI * 2;
  const distance = VORTEX_RADIUS * (0.7 + Math.random() * 0.3);
  const size = 2 + Math.random() * 4;
  
  vortexParticles.push({
    x: W/2 + Math.cos(angle) * distance,
    y: H/2 + Math.sin(angle) * distance,
    angle: angle,
    distance: distance,
    speed: 0.8 + Math.random() * 2,
    size: size,
    maxSize: size,
    life: 0,
    maxLife: 3 + Math.random() * 5
  });
}

function spawnCreature() {
  const type = CREATURE_TYPES[Math.floor(Math.random() * CREATURE_TYPES.length)];
  const angle = Math.random() * Math.PI * 2;
  const distance = VORTEX_RADIUS + 80 + Math.random() * 120;
  
  const creature = {
    x: W/2 + Math.cos(angle) * distance,
    y: H/2 + Math.sin(angle) * distance,
    angle: angle,
    distance: distance,
    speed: type.speed,
    size: type.size,
    hp: type.hp,
    maxHp: type.hp,
    color: type.color,
    score: type.score,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.15,
    type: type,
    attackCooldown: 0,
    lastAttack: 0,
    tentaclePhase: Math.random() * Math.PI * 2
  };
  
  type.spawnEffect();
  creatures.push(creature);
  return creature;
}

function spawnFallingDebris() {
  const size = 30 + Math.random() * 70;
  const speed = 300 + Math.random() * 400;
  
  fallingDebris.push({
    x: Math.random() * W,
    y: -size,
    vx: (Math.random() - 0.5) * 200,
    vy: speed,
    size: size,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
    color: `hsl(${Math.random() * 60 + 20}, 70%, 50%)`
  });
}

function createShockwave(x, y, power) {
  shockwaves.push({
    x: x,
    y: y,
    radius: 10,
    maxRadius: 150 + power * 100,
    power: power,
    life: 0,
    maxLife: 0.8
  });
  S.reproducir('choque');
}

function applyVortexForces(entity, dt) {
  const dx = entity.x - W/2;
  const dy = entity.y - H/2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < VORTEX_RADIUS * 2.5) {
    // Fuerza tangencial mejorada con pulso
    const tangentAngle = Math.atan2(dy, dx) + Math.PI/2;
    let tangentForce = VORTEX_FORCE * (1 - distance/(VORTEX_RADIUS * 2));
    
    // Efecto de pulso del vórtice
    tangentForce *= 1 + Math.sin(vortexPulseTimer * 5) * vortexPulseStrength * 0.5;
    
    entity.x += Math.cos(tangentAngle) * tangentForce * dt;
    entity.y += Math.sin(tangentAngle) * tangentForce * dt;
    
    // Fuerza radial con efecto de agujero negro
    if (distance > VORTEX_RADIUS * 0.3) {
      let radialForce = VORTEX_FORCE * 0.6 * (1 - distance/(VORTEX_RADIUS * 2));
      if (blackHoleMode) radialForce *= 3;
      
      entity.x -= (dx/distance) * radialForce * dt;
      entity.y -= (dy/distance) * radialForce * dt;
    }
  }
  
  // Aplicar efectos de ondas de choque
  for (const wave of shockwaves) {
    const waveDx = entity.x - wave.x;
    const waveDy = entity.y - wave.y;
    const waveDist = Math.sqrt(waveDx * waveDx + waveDy * waveDy);
    
    if (waveDist < wave.radius && waveDist > 0) {
      const force = wave.power * 500 * (1 - waveDist/wave.radius) * dt;
      entity.x += (waveDx/waveDist) * force;
      entity.y += (waveDy/waveDist) * force;
    }
  }
}

function updatePhase(dt) {
  phaseTimer += dt;
  vortexPulseTimer += dt;
  
  // Pulso constante del vórtice
  vortexPulseStrength = 0.3 + Math.sin(phaseTimer) * 0.2;
  
  if (phaseTimer >= timeUntilNextPhase) {
    phaseTimer = 0;
    currentPhase = (currentPhase + 1) % 4; // Ahora 4 fases diferentes
    
    // Efectos especiales al cambiar de fase
    switch(currentPhase) {
      case 0: // Fase normal
        blackHoleMode = false;
        S.reproducir('torpedo');
        break;
        
      case 1: // Fase rápida
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const c = spawnCreature();
            c.speed *= 1.5;
          }, i * 300);
        }
        break;
        
      case 2: // Fase de agujero negro
        blackHoleMode = true;
        S.reproducir('boss_hit');
        createShockwave(W/2, H/2, 2);
        setTimeout(() => blackHoleMode = false, 8000);
        break;
        
      case 3: // Fase de terremoto
        earthquakeTimer = 10;
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            spawnFallingDebris();
            if (i % 2 === 0) createShockwave(Math.random() * W, Math.random() * H, 1);
          }, i * 500);
        }
        break;
    }
  }
  
  // Actualizar terremoto
  if (earthquakeTimer > 0) {
    earthquakeTimer -= dt;
    screenShake = Math.sin(earthquakeTimer * 20) * 10 * earthquakeTimer;
    
    // Generar escombros durante el terremoto
    if (Math.random() < 0.1) {
      spawnFallingDebris();
    }
  } else {
    screenShake *= 0.9;
  }
}

// --- INTERFAZ PÚBLICA MEJORADA ---

export function init() {
  console.log("Inicializando Nivel 6 MEJORADO: El Vortex Caótico");
  vortexParticles = [];
  creatures = [];
  fallingDebris = [];
  shockwaves = [];
  vortexRotation = 0;
  currentPhase = 0;
  phaseTimer = 0;
  blackHoleMode = false;
  earthquakeTimer = 0;
  screenShake = 0;
  
  // Posición inicial del jugador
  jugador.x = W * 0.2;
  jugador.y = H/2;
  
  // Partículas iniciales
  for (let i = 0; i < 80; i++) spawnVortexParticle();
  
  // Criaturas iniciales
  for (let i = 0; i < 10; i++) {
    setTimeout(() => spawnCreature(), i * 800);
  }
  
  // Primer terremoto inicial
  setTimeout(() => {
    earthquakeTimer = 3;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => spawnFallingDebris(), i * 400);
    }
  }, 3000);
}

export function update(dt) {
  if (!estadoJuego || estadoJuego.nivel !== 6) return;
  
  // Actualizar fase y efectos globales
  updatePhase(dt);
  vortexRotation += dt * (blackHoleMode ? 1.2 : 0.7);
  
  // Actualizar partículas del vórtice (mejoradas)
  for (let i = vortexParticles.length - 1; i >= 0; i--) {
    const p = vortexParticles[i];
    p.angle += dt * p.speed;
    p.life += dt;
    
    // Tamaño pulsante
    p.size = p.maxSize * (0.7 + 0.3 * Math.sin(p.life * 3));
    
    // Movimiento espiral
    p.distance *= 1 - dt * 0.05;
    p.x = W/2 + Math.cos(p.angle) * p.distance;
    p.y = H/2 + Math.sin(p.angle) * p.distance;
    
    if (p.life > p.maxLife || p.distance < 10) {
      vortexParticles.splice(i, 1);
      if (Math.random() < 0.3) spawnVortexParticle();
    }
  }
  
  // Añadir nuevas partículas dinámicas
  if (Math.random() < (blackHoleMode ? 0.4 : 0.2)) {
    spawnVortexParticle();
  }
  
  // Actualizar criaturas (comportamientos mejorados)
  for (let i = creatures.length - 1; i >= 0; i--) {
    const c = creatures[i];
    
    // Comportamientos específicos por tipo
    switch(c.type.behavior) {
      case 'aggressive':
        c.angle += dt * 0.3;
        c.distance -= dt * c.speed * 0.15;
        break;
        
      case 'defensive':
        c.angle -= dt * 0.2;
        c.distance += dt * c.speed * 0.05;
        break;
        
      case 'swarming':
        c.angle += dt * 0.1;
        c.distance -= dt * c.speed * 0.02;
        // Atraer a otras criaturas
        for (const other of creatures) {
          if (other !== c) {
            const dx = other.x - c.x;
            const dy = other.y - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              other.x -= dx * 0.01 * dt;
              other.y -= dy * 0.01 * dt;
            }
          }
        }
        break;
        
      case 'kamikaze':
        c.angle += dt * 0.4;
        c.distance -= dt * c.speed * 0.25;
        break;
    }
    
    // Ataques especiales
    c.attackCooldown -= dt;
    if (c.attackCooldown <= 0 && Math.random() < 0.02) {
      c.attackCooldown = 2 + Math.random() * 3;
      
      switch(c.type.attack) {
        case 'charge':
          // Carga hacia el jugador
          const angleToPlayer = Math.atan2(jugador.y - c.y, jugador.x - c.x);
          c.angle = angleToPlayer;
          c.distance += 50;
          break;
          
        case 'tentacleWhip':
          // Latigazo de tentáculos
          for (let j = 0; j < 5; j++) {
            setTimeout(() => {
              const angle = c.tentaclePhase + j * Math.PI * 0.4;
              proyectiles.push({
                x: c.x,
                y: c.y,
                vx: Math.cos(angle) * 400,
                vy: Math.sin(angle) * 400,
                w: 10,
                h: 3,
                color: c.color,
                vida: 1.5
              });
            }, j * 100);
          }
          c.tentaclePhase += Math.PI * 0.5;
          break;
          
        case 'projectile':
          // Disparo de proyectil
          const angle = Math.atan2(jugador.y - c.y, jugador.x - c.x);
          proyectiles.push({
            x: c.x,
            y: c.y,
            vx: Math.cos(angle) * 500,
            vy: Math.sin(angle) * 500,
            w: 15,
            h: 5,
            color: '#FF0000',
            vida: 2
          });
          break;
          
        case 'explode':
          // Explosión kamikaze
          if (Math.hypot(jugador.x - c.x, jugador.y - c.y) < 150) {
            generarExplosion(c.x, c.y, c.color);
            estadoJuego.puntuacion += c.score;
            creatures.splice(i, 1);
            continue;
          }
          break;
      }
    }
    
    // Física mejorada
    applyVortexForces(c, dt);
    c.x = W/2 + Math.cos(c.angle) * c.distance;
    c.y = H/2 + Math.sin(c.angle) * c.distance;
    c.rotation += c.rotationSpeed;
    
    // Colisión con jugador mejorada
    const distToPlayer = Math.hypot(jugador.x - c.x, jugador.y - c.y);
    if (distToPlayer < jugador.r + c.size/2) {
      generarExplosion(c.x, c.y, c.color);
      
      if (c.type.behavior === 'kamikaze') {
        generarExplosion(c.x, c.y, '#FF0000');
        createShockwave(c.x, c.y, 1.5);
      }
      
      if (estadoJuego.vidas > 0) estadoJuego.vidas--;
      estadoJuego.animVida = 0.6;
      S.reproducir('choque');
      
      if (estadoJuego.vidas <= 0) {
        perderJuego();
      } else {
        creatures.splice(i, 1);
      }
      continue;
    }
    
    // Colisión con proyectiles y torpedos (mejorada)
    [...proyectiles, ...torpedos].forEach((p, index, arr) => {
      if (Math.hypot(p.x - c.x, p.y - c.y) < c.size/2 + (p.w || p.size)) {
        c.hp -= (p === torpedos.find(t => t === p)) ? 3 : 1;
        arr.splice(index, 1);
        
        if (c.hp <= 0) {
          generarExplosion(c.x, c.y, c.color);
          estadoJuego.puntuacion += c.score;
          if (Math.random() < 0.3) createShockwave(c.x, c.y, 0.7);
          creatures.splice(i, 1);
        }
      }
    });
    
    // Eliminación al acercarse demasiado
    if (c.distance < VORTEX_RADIUS * 0.2 || 
        c.x < -c.size * 2 || c.x > W + c.size * 2 || 
        c.y < -c.size * 2 || c.y > H + c.size * 2) {
      creatures.splice(i, 1);
      if (Math.random() < 0.8) spawnCreature();
    }
  }
  
  // Actualizar escombros que caen
  for (let i = fallingDebris.length - 1; i >= 0; i--) {
    const d = fallingDebris[i];
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.rotation += d.rotationSpeed;
    
    // Colisión con jugador
    if (Math.hypot(jugador.x - d.x, jugador.y - d.y) < jugador.r + d.size/2) {
      generarExplosion(d.x, d.y, d.color);
      createShockwave(d.x, d.y, 1);
      if (estadoJuego.vidas > 0) estadoJuego.vidas--;
      estadoJuego.animVida = 0.6;
      S.reproducir('choque');
      fallingDebris.splice(i, 1);
      if (estadoJuego.vidas <= 0) perderJuego();
      continue;
    }
    
    // Eliminar al salir de pantalla
    if (d.y > H + d.size) {
      fallingDebris.splice(i, 1);
    }
  }
  
  // Actualizar ondas de choque
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const w = shockwaves[i];
    w.life += dt;
    w.radius = w.maxRadius * (w.life / w.maxLife);
    
    if (w.life >= w.maxLife) {
      shockwaves.splice(i, 1);
    }
  }
  
  // Aplicar fuerzas al jugador (mejorado)
  if (!blackHoleMode) {
    applyVortexForces(jugador, dt * 0.4);
  } else {
    // Fuerza de agujero negro mejorada
    const dx = W/2 - jugador.x;
    const dy = H/2 - jugador.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const force = VORTEX_FORCE * 4 * dt / Math.max(10, distance);
    
    jugador.x += dx * force;
    jugador.y += dy * force;
    
    if (distance < VORTEX_RADIUS * 0.4) {
      generarExplosion(jugador.x, jugador.y, '#FF0000');
      if (estadoJuego.vidas > 0) estadoJuego.vidas--;
      estadoJuego.animVida = 0.6;
      S.reproducir('choque');
      
      // Teletransportación aleatoria con efecto
      const side = Math.floor(Math.random() * 4);
      switch(side) {
        case 0: jugador.x = jugador.r; jugador.y = Math.random() * H; break;
        case 1: jugador.x = W - jugador.r; jugador.y = Math.random() * H; break;
        case 2: jugador.x = Math.random() * W; jugador.y = jugador.r; break;
        case 3: jugador.x = Math.random() * W; jugador.y = H - jugador.r; break;
      }
      createShockwave(jugador.x, jugador.y, 1);
      
      if (estadoJuego.vidas <= 0) perderJuego();
    }
  }
  
  // Generación dinámica de criaturas
  if (creatures.length < 15 && Math.random() < 0.03) {
    spawnCreature();
  }
  
  // Generación de escombros durante terremotos
  if (earthquakeTimer > 0 && Math.random() < 0.15) {
    spawnFallingDebris();
  }
  
  // Actualizar objetivo del nivel
  estadoJuego.valorObjetivoNivel += dt;
}

export function draw() {
  if (!ctx) return;
  
  // Aplicar sacudida de pantalla
  ctx.save();
  ctx.translate(
    (Math.random() - 0.5) * screenShake,
    (Math.random() - 0.5) * screenShake
  );
  
  // Dibujar vórtice mejorado
  const gradient = ctx.createRadialGradient(
    W/2, H/2, VORTEX_RADIUS * 0.2,
    W/2, H/2, VORTEX_RADIUS * (blackHoleMode ? 1.5 : 1)
  );
  
  if (blackHoleMode) {
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.3, '#220044');
    gradient.addColorStop(0.6, '#5500AA');
    gradient.addColorStop(1, 'rgba(85, 0, 170, 0)');
  } else {
    gradient.addColorStop(0, '#004488');
    gradient.addColorStop(0.5, '#002266');
    gradient.addColorStop(0.8, '#001133');
    gradient.addColorStop(1, 'rgba(0, 17, 51, 0)');
  }
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(W/2, H/2, VORTEX_RADIUS * (blackHoleMode ? 1.5 : 1), 0, Math.PI * 2);
  ctx.fill();
  
  // Dibujar partículas del vórtice (mejoradas)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of vortexParticles) {
    const alpha = 0.7 * (1 - p.life/p.maxLife);
    ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(vortexRotation + p.life * 2);
    ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
    ctx.restore();
  }
  ctx.restore();
  
  // Dibujar ondas de choque
  for (const w of shockwaves) {
    const alpha = 0.7 * (1 - w.life/w.maxLife);
    ctx.strokeStyle = `rgba(255, 100, 255, ${alpha})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Dibujar escombros que caen
  for (const d of fallingDebris) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rotation);
    ctx.fillStyle = d.color;
    ctx.fillRect(-d.size/2, -d.size/2, d.size, d.size);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(-d.size/2, -d.size/2, d.size, d.size);
    ctx.restore();
  }
  
  // Dibujar criaturas mejoradas
  for (const c of creatures) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    
    // Cuerpo con efecto de daño
    const damageEffect = c.hp / c.maxHp;
    ctx.fillStyle = `hsl(${c.color}, ${50 + 50 * damageEffect}%, ${40 + 30 * damageEffect}%)`;
    
    // Forma más interesante
    ctx.beginPath();
    ctx.ellipse(0, 0, c.size/2, c.size/3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Tentáculos animados
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + c.rotation;
      const length = c.size/2 + Math.sin(vortexRotation * 3 + i) * c.size/3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
      ctx.stroke();
    }
    
    // Ojos que siguen al jugador
    const eyeAngle = Math.atan2(jugador.y - c.y, jugador.x - c.x);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      Math.cos(eyeAngle) * c.size/4, 
      Math.sin(eyeAngle) * c.size/4, 
      c.size/8, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    
    ctx.restore();
    
    // Barra de vida flotante
    if (c.hp < c.maxHp) {
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(
        c.x - c.size/2, 
        c.y - c.size - 10, 
        c.size * (c.hp / c.maxHp), 
        4
      );
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(
        c.x - c.size/2, 
        c.y - c.size - 10, 
        c.size, 
        4
      );
    }
  }
  
  // Dibujar UI mejorada
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '18px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  
  // Indicador de fase con iconos
  const phaseIcons = ['🌀', '⚡', '🕳️', '🌋'];
  ctx.fillText(`FASE ${currentPhase + 1}: ${phaseIcons[currentPhase]}`, 20, 30);
  
  // Barra de progreso de fase con estilo arcade
  const progressWidth = 250;
  const progress = phaseTimer / timeUntilNextPhase;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 40, progressWidth, 12);
  ctx.fillStyle = ['#00FFFF', '#FFFF00', '#FF00FF', '#FF5555'][currentPhase];
  ctx.fillRect(20, 40, progressWidth * progress, 12);
  
  // Efectos de texto especiales
  if (blackHoleMode) {
    ctx.fillStyle = '#FF00FF';
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('¡AGUJERO NEGRO!', W/2, 40);
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText('¡ESCAPA DEL CENTRO!', W/2, 70);
  } else if (earthquakeTimer > 0) {
    ctx.fillStyle = '#FF5555';
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('¡TERREMOTO ABISAL!', W/2, 40);
  }
  
  ctx.restore(); // Finalizar sacudida de pantalla
}