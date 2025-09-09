// js/level6.js
'use strict';

import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, torpedos, proyectiles, generarNubeDeTinta } from './game/game.js';

// --- CONSTANTES ÉPICAS ---
let VORTEX_RADIUS = 250;
let VORTEX_FORCE = 350;
const PHASE_DURATION = 20; // 20 segundos por fase
const MAX_PHASES = 8; // ¡8 fases únicas!

// --- ESTADO DEL NIVEL MEGAMEJORADO ---
let vortexRotation = 0;
let vortexParticles = [];
let creatures = [];
let fallingDebris = [];
let shockwaves = [];
let blackHoles = [];
let timeWarps = [];
let gravityWells = [];
let sanctuary = null; // El objeto del refugio. null si no existe.

let currentPhase = 0;
let phaseTimer = 0;
let screenShake = 0;
let mirrorMode = false;
let blackHoleMode = false;
let timeSlow = 1;
let phaseHistory = [];

// --- TIPOS DE CRIATURAS ALUCINANTES ---
const CREATURE_TYPES = [
  { name: "Devorador", color: '#FF3355', speed: 200, size: 40, hp: 3, score: 150, behavior: 'vortexSpin', attack: 'blackHole', spawnEffect: () => { S.reproducir('boss_hit'); createShockwave(W / 2, H / 2, 1.5, '#FF3355'); } },
  { name: "Gemelo", color: '#33FF55', speed: 120, size: 35, hp: 2, score: 200, behavior: 'mirrorClone', attack: 'duplicate', spawnEffect: () => S.reproducir('machinegun') },
  { name: "Cronolord", color: '#3355FF', speed: 80, size: 50, hp: 4, score: 180, behavior: 'timeWarp', attack: 'slowTime', spawnEffect: () => S.reproducir('ink') },
  { name: "Fragmentador", color: '#FF33FF', speed: 250, size: 25, hp: 1, score: 250, behavior: 'fragment', attack: 'split', spawnEffect: () => { for (let i = 0; i < 3; i++) { setTimeout(() => generarExplosion(Math.random() * W, Math.random() * H, '#FF33FF'), i * 200); } } },
  { name: "Titán", color: '#FFFF33', speed: 60, size: 80, hp: 8, score: 300, behavior: 'titan', attack: 'quake', spawnEffect: () => { screenShake = 15; S.reproducir('shotgun'); for (let i = 0; i < 5; i++) spawnFallingDebris(true); } }
];

// --- NUEVAS ENTIDADES ESPECIALES ---
class BlackHole { constructor(x, y, power) { this.x = x; this.y = y; this.radius = 0; this.maxRadius = 30 + power * 10; this.power = power; this.life = 0; this.maxLife = 12; this.pulseTimer = 0; } }
class TimeWarp { constructor(x, y) { this.x = x; this.y = y; this.radius = 100; this.timeFactor = 0.3 + Math.random() * 0.4; this.life = 0; this.maxLife = PHASE_DURATION; } }
class GravityWell { constructor(x, y, dir) { this.x = x; this.y = y; this.direction = dir; this.strength = 250; this.radius = 200; this.life = 0; this.maxLife = 8; } }

// --- FUNCIONES DE CREACIÓN DE ENTIDADES ---

function createSanctuary() {
    sanctuary = {
        x: W * 0.3 + Math.random() * W * 0.4,
        y: H * 0.3 + Math.random() * H * 0.4,
        radius: 130,
        hp: 50,
        maxHp: 50,
        baseRadius: 20,
        pulse: 0
    };
    S.reproducir('powerup');
    createShockwave(sanctuary.x, sanctuary.y, 1.2, '#00FFFF');
}

function spawnVortexParticle(epic = false) {
  const angle = Math.random() * Math.PI * 2;
  const distance = VORTEX_RADIUS * (0.6 + Math.random() * 0.4);
  const size = epic ? 5 + Math.random() * 8 : 2 + Math.random() * 4;
  vortexParticles.push({ x: W / 2 + Math.cos(angle) * distance, y: H / 2 + Math.sin(angle) * distance, angle: angle, distance: distance, speed: 1 + Math.random() * (epic ? 3 : 2), size: size, maxSize: size, life: 0, maxLife: 4 + Math.random() * 8, color: epic ? `hsl(${Math.random() * 60 + 200}, 100%, 70%)` : '#88EEFF', trail: [] });
}

function spawnCreature(typeIndex = null) {
  const type = typeIndex !== null ? CREATURE_TYPES[typeIndex] : CREATURE_TYPES[Math.floor(Math.random() * CREATURE_TYPES.length)];
  const angle = Math.random() * Math.PI * 2;
  const distance = VORTEX_RADIUS + 100 + Math.random() * 150;
  const creature = { x: W / 2 + Math.cos(angle) * distance, y: H / 2 + Math.sin(angle) * distance, angle: angle, distance: distance, speed: type.speed, size: type.size, hp: type.hp, maxHp: type.hp, color: type.color, score: type.score, rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.2, type: type, attackCooldown: 2 + Math.random() * 3, id: Math.random().toString(36).substr(2, 9) };
  type.spawnEffect();
  creatures.push(creature);
  return creature;
}

function spawnFallingDebris(epic = false) {
  const size = epic ? 80 + Math.random() * 100 : 30 + Math.random() * 70;
  const speed = epic ? 500 + Math.random() * 300 : 300 + Math.random() * 200;
  fallingDebris.push({ x: Math.random() * W, y: -size, vx: (Math.random() - 0.5) * (epic ? 300 : 200), vy: speed, size: size, rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * (epic ? 0.3 : 0.2), color: `hsl(${Math.random() * 40 + 10}, 80%, ${epic ? 60 : 50}%)`, isEpic: epic });
}

function createShockwave(x, y, power, color = '#FF00FF') {
  shockwaves.push({ x: x, y: y, radius: 10, maxRadius: 200 + power * 150, power: power, life: 0, maxLife: 0.8 + power * 0.2, color: color });
  S.reproducir('choque');
}

function createBlackHole(x, y, power) {
  blackHoles.push(new BlackHole(x, y, power));
  S.reproducir('boss_hit');
}

function createTimeWarp(x, y) {
  timeWarps.push(new TimeWarp(x, y));
  S.reproducir('ink');
}

function createGravityWell(x, y, dir) {
  gravityWells.push(new GravityWell(x, y, dir));
  S.reproducir('torpedo');
}

// --- SISTEMA DE FASES REVOLUCIONARIO ---
const PHASE_BEHAVIORS = [
    { name: "Vortex Primordial", start: () => { S.reproducir('music_0'); for (let i = 0; i < 15; i++) spawnCreature(Math.floor(Math.random() * 2)); }, update: (dt) => { if (Math.random() < 0.05) spawnCreature(0); }, end: () => {} },
    { name: "Singularidades", start: () => { createBlackHole(W * 0.3, H * 0.3, 1.5); createBlackHole(W * 0.7, H * 0.7, 1.5); }, update: (dt) => { if (Math.random() < 0.015) createBlackHole(W * 0.2 + Math.random() * W * 0.6, H * 0.2 + Math.random() * H * 0.6, 0.8 + Math.random() * 1.2); }, end: () => { blackHoles = []; } },
    {
        name: "Terremoto Cósmico",
        start: () => { screenShake = 20; for (let i = 0; i < 10; i++) setTimeout(() => spawnFallingDebris(true), i * 300); createSanctuary(); },
        update: (dt) => { if (Math.random() < 0.2) spawnFallingDebris(Math.random() > 0.8); if (Math.random() < 0.01) createShockwave(Math.random() * W, 0, 1.2, '#FF5555'); },
        end: () => { if (sanctuary) { createShockwave(sanctuary.x, sanctuary.y, 1, '#FFFFFF'); sanctuary = null; } }
    },
    { name: "Distorsión Temporal", start: () => { S.reproducir('ink'); timeSlow = 0.6; for (let i = 0; i < 4; i++) createTimeWarp(W * 0.1 + Math.random() * W * 0.8, H * 0.1 + Math.random() * H * 0.8); }, update: (dt) => { if (Math.random() < 0.005) timeSlow = 0.4 + Math.random() * 0.4; }, end: () => { timeSlow = 1; timeWarps = []; } },
    { name: "Dimensión Espejo", start: () => { S.reproducir('machinegun'); mirrorMode = true; for (let i = 0; i < 8; i++) spawnCreature(1); }, update: (dt) => { if (Math.random() < 0.002) mirrorMode = !mirrorMode; }, end: () => { mirrorMode = false; } },
    { name: "Pozos Gravitacionales", start: () => { for (let i = 0; i < 6; i++) createGravityWell(W * 0.1 + Math.random() * W * 0.8, H * 0.1 + Math.random() * H * 0.8, Math.random() > 0.5 ? 'in' : 'out'); }, update: (dt) => { if (gravityWells.length < 4 && Math.random() < 0.02) createGravityWell(Math.random() * W, Math.random() * H, Math.random() > 0.5 ? 'in' : 'out'); }, end: () => { gravityWells = []; } },
    { name: "Era de los Titanes", start: () => { for (let i = 0; i < 2; i++) setTimeout(() => spawnCreature(4), i * 1000); }, update: (dt) => { if (creatures.filter(c => c.type.name === 'Titán').length < 3 && Math.random() < 0.01) spawnCreature(4); }, end: () => {} },
    { name: "Vortex del Juicio", start: () => { S.reproducir('music_1'); blackHoleMode = true; VORTEX_RADIUS = 350; VORTEX_FORCE = 450; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; createBlackHole(W/2 + Math.cos(a) * 300, H/2 + Math.sin(a) * 300, 1.2); } }, update: (dt) => { if (Math.random() < 0.05) createShockwave(W/2, H/2, 2.5, '#00FFFF'); }, end: () => { blackHoleMode = false; VORTEX_RADIUS = 250; VORTEX_FORCE = 350; blackHoles = []; } }
];

function applyVortexForce(entity, dt) {
    const dx = entity.x - W / 2;
    const dy = entity.y - H / 2;
    let distance = Math.hypot(dx, dy);
    if (distance > 10) {
        // Fuerza tangencial (para girar)
        const tangentAngle = Math.atan2(dy, dx) + Math.PI / 2;
        let tangentForce = VORTEX_FORCE * (1 - distance / (VORTEX_RADIUS * 2.5));
        entity.x += Math.cos(tangentAngle) * tangentForce * dt;
        entity.y += Math.sin(tangentAngle) * tangentForce * dt;

        // Fuerza radial (para atraer al centro)
        let radialForce = VORTEX_FORCE * 0.6 * (1 - distance / (VORTEX_RADIUS * 2));
        if (blackHoleMode) radialForce *= 3;
        entity.x -= (dx / distance) * radialForce * dt;
        entity.y -= (dy / distance) * radialForce * dt;
    }
}

function applyShockwaveForce(entity, dt) {
    for (const wave of shockwaves) {
        const waveDx = entity.x - wave.x;
        const waveDy = entity.y - wave.y;
        const waveDist = Math.hypot(waveDx, waveDy);
        if (waveDist < wave.radius && waveDist > 1) {
            const force = wave.power * 800 * (1 - wave.life / wave.maxLife) * dt;
            entity.x += (waveDx / waveDist) * force;
            entity.y += (waveDy / waveDist) * force;
        }
    }
}

function applyBlackHoleForce(entity, dt) {
    for (const bh of blackHoles) {
        const bhDx = bh.x - entity.x;
        const bhDy = bh.y - entity.y;
        const bhDist = Math.max(20, Math.hypot(bhDx, bhDy));
        if (bhDist < bh.radius * 8) {
            const force = bh.power * 5000 * (bh.radius / bh.maxRadius) * dt / (bhDist * bhDist);
            entity.x += bhDx * force;
            entity.y += bhDy * force;
        }
    }
}

function applyGravityWellForce(entity, dt) {
    for (const well of gravityWells) {
        const wellDx = well.x - entity.x;
        const wellDy = well.y - entity.y;
        const wellDist = Math.hypot(wellDx, wellDy);
        if (wellDist < well.radius) {
            const pull = (well.direction === 'in' ? 1 : -1);
            const force = pull * well.strength * (1 - wellDist / well.radius) * dt;
            entity.x += (wellDx / wellDist) * force;
            entity.y += (wellDy / wellDist) * force;
        }
    }
}

// --- APLICADOR DE FUERZAS UNIFICADO ---
function applyAllForces(entity, dt) {
    applyVortexForce(entity, dt);
    applyShockwaveForce(entity, dt);
    applyBlackHoleForce(entity, dt);
    applyGravityWellForce(entity, dt);
}

// --- NÚCLEO DEL JUEGO MEJORADO ---

export function init() {
    console.log("Inicializando Nivel 6: El Vortex del Caos Infinito");
    vortexParticles = []; creatures = []; fallingDebris = []; shockwaves = []; blackHoles = []; timeWarps = []; gravityWells = []; sanctuary = null;
    vortexRotation = 0; currentPhase = 0; phaseTimer = 0; screenShake = 0; mirrorMode = false; timeSlow = 1; blackHoleMode = false;
    phaseHistory = [];
    jugador.x = W * 0.15;
    jugador.y = H / 2;
    for (let i = 0; i < 50; i++) spawnVortexParticle(true);
    PHASE_BEHAVIORS[0].start();
}

export function update(dt) {
    if (!estadoJuego || estadoJuego.nivel !== 6) return;
    
    let currentDt = dt * timeSlow; let inTimeWarp = false; for(const tw of timeWarps) { if(Math.hypot(jugador.x - tw.x, jugador.y - tw.y) < tw.radius) { inTimeWarp = true; break; } } if (!inTimeWarp) { dt = currentDt; }
    phaseTimer += dt; if (phaseTimer >= PHASE_DURATION) { PHASE_BEHAVIORS[currentPhase].end(); currentPhase = (phaseHistory.length + 1) % MAX_PHASES; phaseTimer = 0; phaseHistory.push(currentPhase); PHASE_BEHAVIORS[currentPhase].start(); } PHASE_BEHAVIORS[currentPhase].update(dt); vortexRotation += dt * (blackHoleMode ? 1.5 : 0.8);

    // --- ACTUALIZACIÓN DE ENTIDADES ---

    // Partículas del Vórtice
    for (let i = vortexParticles.length - 1; i >= 0; i--) { const p = vortexParticles[i]; p.angle += dt * p.speed * (1/Math.max(0.1, p.distance/VORTEX_RADIUS)); p.life += dt; p.distance *= 1 - dt * 0.08; p.x = W / 2 + Math.cos(p.angle) * p.distance; p.y = H / 2 + Math.sin(p.angle) * p.distance; p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 10) p.trail.shift(); if (p.life > p.maxLife || p.distance < 15) { vortexParticles.splice(i, 1); if (Math.random() < 0.5) spawnVortexParticle(); } } if (Math.random() < 0.3) spawnVortexParticle(blackHoleMode);

    // Criaturas
    for (let i = creatures.length - 1; i >= 0; i--) {
        const c = creatures[i];
        let entityDt = dt;
        for (const tw of timeWarps) {
            if (Math.hypot(c.x - tw.x, c.y - tw.y) < tw.radius) entityDt = dt * tw.timeFactor;
        }
        applyAllForces(c, entityDt);
        c.rotation += c.rotationSpeed * entityDt;
        c.attackCooldown -= entityDt;
        if (c.attackCooldown <= 0) {
            c.attackCooldown = 3 + Math.random() * 4;
            switch (c.type.attack) {
                case 'blackHole': createBlackHole(c.x, c.y, 0.8); break;
                case 'duplicate': if (creatures.length < 25) { const newC = { ...c, id: Math.random().toString(36).substr(2, 9), hp: 1, maxHp: 1, size: c.size * 0.8 }; newC.x += (Math.random() - 0.5) * 50; newC.y += (Math.random() - 0.5) * 50; creatures.push(newC); } break;
                case 'slowTime': createTimeWarp(c.x, c.y); break;
                case 'split': break;
                case 'quake': createShockwave(c.x, c.y, 2, c.color); if (Math.random() > 0.5) spawnFallingDebris(true); break;
            }
        }
        if (Math.hypot(jugador.x - c.x, jugador.y - c.y) < jugador.r + c.size / 2) {
            generarExplosion(c.x, c.y, c.color);
            if (estadoJuego.vidas > 0) estadoJuego.vidas--;
            estadoJuego.animVida = 0.6;
            S.reproducir('choque');
            creatures.splice(i, 1);
            if (estadoJuego.vidas <= 0) perderJuego();
            continue;
        }

        let creatureDestroyed = false;
        // Colisión con torpedos
        for (let j = torpedos.length - 1; j >= 0; j--) {
            const t = torpedos[j];
            if (Math.hypot(t.x - c.x, t.y - c.y) < c.size / 2) {
                c.hp -= 3;
                torpedos.splice(j, 1);
                if (c.hp <= 0) { creatureDestroyed = true; break; }
            }
        }

        if (creatureDestroyed) {
            generarExplosion(c.x, c.y, c.color, c.size * 2);
            estadoJuego.puntuacion += c.score;
            creatures.splice(i, 1);
            continue;
        }

        // Colisión con proyectiles
        for (let k = proyectiles.length - 1; k >= 0; k--) {
            const p = proyectiles[k];
            if (Math.hypot(p.x - c.x, p.y - c.y) < c.size / 2) {
                c.hp -= 1;
                proyectiles.splice(k, 1);
                if (c.hp <= 0) { creatureDestroyed = true; break; }
            }
        }

        if (creatureDestroyed) {
            generarExplosion(c.x, c.y, c.color, c.size * 2);
            estadoJuego.puntuacion += c.score;
            if (c.type.attack === 'split' && creatures.length < 25) {
                for (let k = 0; k < 2; k++) {
                    const newC = spawnCreature(3);
                    newC.x = c.x + (k - 0.5) * 40;
                    newC.y = c.y;
                    newC.size *= 0.7;
                    newC.hp = 1;
                }
            }
            creatures.splice(i, 1);
            continue;
        }

        if (c.x < -c.size || c.x > W + c.size || c.y < -c.size || c.y > H + c.size || Math.hypot(c.x - W / 2, c.y - H / 2) < 20) {
            creatures.splice(i, 1);
        }
    }

    // Escombros y Santuario
    for (let i = fallingDebris.length - 1; i >= 0; i--) {
        const d = fallingDebris[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rotation += d.rotationSpeed * dt;

        let playerIsSafe = false;
        if (sanctuary && Math.hypot(jugador.x - sanctuary.x, jugador.y - sanctuary.y) < sanctuary.radius) {
            playerIsSafe = true;
        }

        // Colisión con el Santuario
        if (sanctuary && Math.hypot(d.x - sanctuary.x, d.y - sanctuary.y) < sanctuary.radius) {
            sanctuary.hp -= d.isEpic ? 3 : 1; // Escombros épicos hacen más daño
            generarExplosion(d.x, d.y, '#00FFFF', d.size * 0.5); // Explosión de escudo
            fallingDebris.splice(i, 1);

            if (sanctuary.hp <= 0) {
                generarExplosion(sanctuary.x, sanctuary.y, '#FFFFFF', sanctuary.radius * 2);
                createShockwave(sanctuary.x, sanctuary.y, 2, '#FFFFFF');
                S.reproducir('boss_hit');
                sanctuary = null;
            }
            continue;
        }

        // Colisión con el jugador (solo si no está a salvo)
        if (!playerIsSafe && Math.hypot(jugador.x - d.x, jugador.y - d.y) < jugador.r + d.size / 2) {
            generarExplosion(d.x, d.y, d.color);
            createShockwave(d.x, d.y, d.isEpic ? 1.5 : 1, d.color);
            if (estadoJuego.vidas > 0) estadoJuego.vidas--;
            estadoJuego.animVida = 0.6; S.reproducir('choque');
            fallingDebris.splice(i, 1);
            if (estadoJuego.vidas <= 0) perderJuego();
            continue;
        }

        if (d.y > H + d.size) fallingDebris.splice(i, 1);
    }
    
    // Entidades especiales
    if (sanctuary) sanctuary.pulse += dt * 5;
    shockwaves.forEach((w, i) => { w.life += dt; w.radius = w.maxRadius * (w.life / w.maxLife); if (w.life >= w.maxLife) shockwaves.splice(i, 1); });
    blackHoles.forEach((bh, i) => { bh.life += dt; bh.radius = bh.maxRadius * Math.sin((bh.life/bh.maxLife) * Math.PI); bh.pulseTimer += dt; if (bh.life >= bh.maxLife) blackHoles.splice(i, 1); });
    timeWarps.forEach((tw, i) => { tw.life += dt; if(tw.life >= tw.maxLife) timeWarps.splice(i, 1); });
    gravityWells.forEach((gw, i) => { gw.life += dt; if (gw.life >= gw.maxLife) gravityWells.splice(i, 1); });

    // Jugador
    let playerDt = dt; for(const tw of timeWarps) { if(Math.hypot(jugador.x - tw.x, jugador.y - tw.y) < tw.radius) playerDt = dt / tw.timeFactor; }
    applyAllForces(jugador, playerDt * 0.5);
    if (blackHoleMode && Math.hypot(W/2 - jugador.x, H/2 - jugador.y) < VORTEX_RADIUS * 0.3) { if (estadoJuego.vidas > 0) estadoJuego.vidas--; estadoJuego.animVida = 0.6; S.reproducir('choque'); createShockwave(jugador.x, jugador.y, 2, '#FFFFFF'); jugador.x = Math.random() < 0.5 ? jugador.r : W - jugador.r; jugador.y = Math.random() * H; if (estadoJuego.vidas <= 0) perderJuego(); }
    screenShake *= 0.95;
    estadoJuego.valorObjetivoNivel += dt;
}

export function draw() {
    if (!ctx) return;
    ctx.save();
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);

    // Vórtice y Partículas
    const gradColor = blackHoleMode ? '#220044' : '#002266'; const gradient = ctx.createRadialGradient(W/2, H/2, VORTEX_RADIUS * 0.1, W/2, H/2, VORTEX_RADIUS); gradient.addColorStop(0, blackHoleMode ? '#000' : '#004488'); gradient.addColorStop(0.5, gradColor); gradient.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const p of vortexParticles) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = p.color; ctx.lineWidth = p.size/2; ctx.beginPath(); if(p.trail.length > 0) ctx.moveTo(p.trail[0].x, p.trail[0].y); p.trail.forEach(t => ctx.lineTo(t.x, t.y)); ctx.stroke(); } ctx.restore();

    // Entidades especiales y Escombros
    timeWarps.forEach(tw => { ctx.fillStyle = `rgba(100, 150, 255, ${0.1 + 0.1 * Math.sin(tw.life*5)})`; ctx.beginPath(); ctx.arc(tw.x, tw.y, tw.radius, 0, Math.PI*2); ctx.fill(); });
    gravityWells.forEach(gw => { ctx.strokeStyle = gw.direction === 'in' ? `rgba(255, 0, 0, ${0.5 * (1-gw.life/gw.maxLife)})` : `rgba(0, 255, 0, ${0.5 * (1-gw.life/gw.maxLife)})`; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(gw.x, gw.y, gw.radius * (gw.life/gw.maxLife), 0, Math.PI*2); ctx.stroke(); });
    blackHoles.forEach(bh => { ctx.fillStyle = `rgba(0, 0, 0, 0.8)`; ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = `rgba(150, 50, 255, ${0.8 * Math.sin(bh.pulseTimer * 5)})`; ctx.lineWidth = 5; ctx.stroke(); });
    shockwaves.forEach(w => { ctx.strokeStyle = w.color; ctx.lineWidth = 8 * (1-w.life/w.maxLife); ctx.beginPath(); ctx.arc(w.x, w.y, w.radius, 0, Math.PI*2); ctx.stroke(); });
    fallingDebris.forEach(d => { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rotation); ctx.fillStyle = d.color; ctx.fillRect(-d.size/2, -d.size/2, d.size, d.size); ctx.strokeStyle = d.isEpic ? '#000' : '#333'; ctx.lineWidth=3; ctx.strokeRect(-d.size/2, -d.size/2, d.size, d.size); ctx.restore(); });

    // Santuario
    if (sanctuary) {
        const pulseEffect = 0.9 + 0.1 * Math.sin(sanctuary.pulse);
        // Campo de fuerza
        ctx.fillStyle = `rgba(0, 255, 255, ${0.1 + 0.2 * (sanctuary.hp / sanctuary.maxHp)})`;
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + 0.4 * (sanctuary.hp / sanctuary.maxHp)})`;
        ctx.lineWidth = 3 * pulseEffect;
        ctx.beginPath();
        ctx.arc(sanctuary.x, sanctuary.y, sanctuary.radius * pulseEffect, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Base
        ctx.fillStyle = '#CCCCCC';
        ctx.beginPath(); ctx.arc(sanctuary.x, sanctuary.y, sanctuary.baseRadius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#888888'; ctx.lineWidth = 4; ctx.stroke();
        // Barra de vida
        ctx.fillStyle = '#FF0000'; ctx.fillRect(sanctuary.x - sanctuary.radius, sanctuary.y - sanctuary.radius - 20, sanctuary.radius * 2, 8);
        ctx.fillStyle = '#00FF00'; ctx.fillRect(sanctuary.x - sanctuary.radius, sanctuary.y - sanctuary.radius - 20, sanctuary.radius * 2 * (sanctuary.hp / sanctuary.maxHp), 8);
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(sanctuary.x - sanctuary.radius, sanctuary.y - sanctuary.radius - 20, sanctuary.radius * 2, 8);
    }
    
    // Jugador espejo y Criaturas
    if (mirrorMode) { ctx.save(); ctx.globalAlpha = 0.4; ctx.translate(W - jugador.x, jugador.y); ctx.rotate(-jugador.a); ctx.fillStyle = jugador.color; ctx.beginPath(); ctx.moveTo(jugador.r, 0); ctx.lineTo(-jugador.r, -jugador.r * 0.7); ctx.lineTo(-jugador.r, jugador.r * 0.7); ctx.closePath(); ctx.fill(); ctx.restore(); }
    for (const c of creatures) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rotation); const damageEffect = c.hp / c.maxHp; ctx.fillStyle = c.color; ctx.globalAlpha = 0.6 + 0.4 * damageEffect; ctx.beginPath(); ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); const eyeAngle = Math.atan2(jugador.y - c.y, jugador.x - c.x) - c.rotation; ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(Math.cos(eyeAngle) * c.size/4, Math.sin(eyeAngle) * c.size/4, c.size/8, 0, Math.PI*2); ctx.fill(); ctx.restore(); if (c.hp < c.maxHp) { ctx.fillStyle = '#FF0000'; ctx.fillRect(c.x - c.size / 2, c.y - c.size/2 - 12, c.size * (c.hp / c.maxHp), 5); ctx.strokeStyle = '#000'; ctx.strokeRect(c.x - c.size / 2, c.y - c.size/2 - 12, c.size, 5); } }
    
    ctx.restore(); // Fin sacudida

    // --- UI ÉPICA ---
    ctx.fillStyle = '#FFFFFF'; ctx.font = '18px "Press Start 2P", monospace'; ctx.textAlign = 'left'; const phaseName = PHASE_BEHAVIORS[currentPhase].name; ctx.shadowColor = '#000'; ctx.shadowBlur = 5; ctx.fillText(`FASE: ${phaseName.toUpperCase()}`, 20, 30);
    const progress = phaseTimer / PHASE_DURATION; const progressWidth = 350; ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 3; ctx.strokeRect(20, 40, progressWidth, 15); ctx.fillStyle = `hsl(${(1-progress) * 120}, 100%, 50%)`; ctx.fillRect(22, 42, (progressWidth-4) * progress, 11); ctx.shadowBlur = 0;
    if (blackHoleMode || screenShake > 10) { ctx.fillStyle = blackHoleMode ? '#FF00FF' : '#FF5555'; ctx.font = '24px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(blackHoleMode ? `¡VORTEX DEL JUICIO!` : `¡TERREMOTO CÓSMICO!`, W / 2, 40); ctx.shadowBlur = 0; }
}