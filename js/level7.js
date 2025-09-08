// js/level7.js
'use strict';

import { animales, W, H, estadoJuego, activarSlowMotion, agregarPuntos, ctx, jugador, perderJuego, S, clamp, proyectiles, torpedos, generarExplosion, MIERDEI_SPRITE_DATA, generarAnimal, mierdeiImg, mierdeiListo } from './game.js';
import { getLevelSpeed } from './levels.js';

// --- ESTADO DEL NIVEL 7 ---
let levelState = {};

// --- RECURSOS DEL LÁSER SVG ---
let laserPattern = null;
let laserPatternReady = false;
let patternOffsetY = 0; // Para animar el patrón

const laserSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="256">
  <defs>
    <filter id="electric-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.9" numOctaves="2" result="turbulence"/>
      <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="20" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="1"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 3 -1" />
    </filter>
    <linearGradient id="beamGradient" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="rgba(255, 180, 180, 0)" />
      <stop offset="35%" stop-color="rgba(255, 220, 220, 1)" />
      <stop offset="65%" stop-color="rgba(255, 220, 220, 1)" />
      <stop offset="100%" stop-color="rgba(255, 180, 180, 0)" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="64" height="256" fill="url(#beamGradient)" filter="url(#electric-glow)"/>
</svg>`;

// --- SUBNIVELES ---
const SUBNIVELES = [
    { nombre: 'SUBNIVEL 1: HORDA INICIAL', objetivo: 'Elimina 30 mierdei', meta: 30, tipo: 'kill', spawnInterval: 0.5 },
    { nombre: 'SUBNIVEL 2: OLEADA MASIVA', objetivo: 'Sobrevive 15 segundos a la horda', meta: 15, tipo: 'survive', tiempoLimite: 15, spawnInterval: 0.3 },
    { nombre: 'SUBNIVEL 3: JEFE FINAL', objetivo: 'Derrota al jefe Mierdei', meta: 0, tipo: 'boss', spawnInterval: 1.2 }
];

/**
 * Genera una criatura 'mierdei' y la añade al array de animales.
 */
function spawnMierdei() {
    // Usa la función centralizada de game.js
    generarAnimal(false, 'mierdei');
}

/**
 * Genera una criatura 'mierdei' agresiva (más rápida y grande).
 */
function spawnMierdeiAgresivo() {
    // Usa la función centralizada con overrides para hacerlo más fuerte
    const overrides = { velocidad: getLevelSpeed() + 120, ancho: 150 };
    generarAnimal(false, 'mierdei', overrides);
}

/**
 * Genera una 'bomba' Mierdei que es lanzada por el jefe.
 */
function spawnMierdeiBombardero(jefe) {
    const anchoDeseado = 80; // Bombas más pequeñas

    // Lanza la bomba hacia el jugador
    const angulo = Math.atan2(jugador.y - jefe.y, jugador.x - jefe.x);
    const velocidadLanzamiento = 400 + Math.random() * 200;

    jefe.bombas.push({
        x: jefe.x, 
        y: jefe.y,
        vx: Math.cos(angulo) * velocidadLanzamiento,
        vy: Math.sin(angulo) * velocidadLanzamiento,
        gravedad: 350, // Cae con el tiempo
        r: anchoDeseado / 2,
        w: anchoDeseado, h: anchoDeseado, // Se dibujará con aspect ratio, esto es para la hitbox
        tipo: 'mierdei_bomba',
        rotacion: 0, // Kept for potential future use, but animation will handle it
        vRot: (Math.random() - 0.5) * 10,
        frame: 0,
        timerFrame: 0,
    });
}

/**
 * Dispara un láser desde el jefe hacia una posición aleatoria
 */
function dispararLaser(jefe, tipo = 'snipe') {
    jefe.estado = 'laser';

    if (tipo === 'sweep') {
        // Un rayo de barrido más ancho y lento
        const startAngle = Math.atan2(jugador.y - jefe.y, jugador.x - jefe.x) - Math.PI / 6;
        jefe.lasers.push({
            tipo: 'sweep', x: jefe.x, y: jefe.y,
            startAngle: startAngle, endAngle: startAngle + Math.PI / 3, // Barre un arco de 60 grados
            currentAngle: startAngle, sweepDuration: 2.0,
            duration: 2.5, timer: 2.5, length: W * 1.2,
            width: 80, // Un rayo más ancho y visible
            active: true, damageCooldown: 0
        });
        return;
    }

    // tipo 'snipe' (el original, pero mejorado)
    const offsetX = (Math.random() - 0.5) * 400;
    const offsetY = (Math.random() - 0.5) * 400;
    const targetX = clamp(jugador.x + offsetX, 0, W);
    const targetY = clamp(jugador.y + offsetY, 0, H);

    jefe.lasers.push({
        tipo: 'snipe', x: jefe.x, y: jefe.y,
        targetX: targetX, targetY: targetY,
        duration: 1.5, timer: 1.5,
        active: true, damageCooldown: 0
    });
}

export function init() {
    console.log("Inicializando Nivel 7: La Fosa de Mierdei");
    const sub = SUBNIVELES[0];
    levelState = {
        subnivelActual: 0,
        progresoSubnivel: 0,
        tiempoDeJuego: 0,
        spawnTimer: sub.spawnInterval,
        tiempoRestante: sub.tiempoLimite || 0,
        jefe: {
            x: W - 200,
            y: H / 2,
            w: 300,
            h: 300,
            hp: 200,
            maxHp: 200,
            timerAtaque: 2,
            timerGolpe: 0,
            estado: 'idle',
            lasers: [],
            bombas: [],
            vx: 0,
            vy: 0,
            direccion: -1, // Se mueve hacia la izquierda
            frame: 0,
            timerFrame: 0
        }
    };
    
    // Cargar el patrón SVG para el láser
    laserPatternReady = false;
    const laserPatternImage = new Image();
    laserPatternImage.onload = () => {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = laserPatternImage.width;
        patternCanvas.height = laserPatternImage.height;
        const patternCtx = patternCanvas.getContext('2d');
        if (!patternCtx) return;
        patternCtx.drawImage(laserPatternImage, 0, 0);
        laserPattern = ctx.createPattern(patternCanvas, 'repeat-y');
        laserPatternReady = true;
        console.log("Patrón de láser SVG cargado y listo.");
    };
    laserPatternImage.onerror = () => {
        console.error("No se pudo cargar el patrón de láser SVG.");
    };
    laserPatternImage.src = 'data:image/svg+xml;base64,' + btoa(laserSvgString);
    
    // Mostrar barra de vida del jefe solo en subnivel 3
    const bossHealthContainer = document.getElementById('bossHealthContainer');
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
    
    // Limpiar animales existentes
    animales.length = 0;
}

export function update(dt) {
    if (levelState.subnivelActual >= SUBNIVELES.length) return; // Nivel completado

    // Animación del patrón del láser
    patternOffsetY = (patternOffsetY + dt * 400) % 256; // 256 es la altura del SVG

    levelState.tiempoDeJuego += dt;
    const sub = SUBNIVELES[levelState.subnivelActual];

    // Lógica de spawn de enemigos
    levelState.spawnTimer -= dt;
    if (levelState.spawnTimer <= 0) {
        if (sub.tipo === 'boss') {
            // En modo jefe, alternar entre spawns normales y agresivos
            if (Math.random() < 0.7) {
                spawnMierdei();
            } else {
                spawnMierdeiAgresivo();
            }
        } else {
            spawnMierdei();
        }
        levelState.spawnTimer = sub.spawnInterval;
    }

    // Lógica de survive
    if (sub.tipo === 'survive') {
        levelState.tiempoRestante -= dt;
        if (levelState.tiempoRestante <= 0) {
            completarSubnivel();
            return;
        }
    }

    // Actualizar jefe solo en boss
    if (sub.tipo === 'boss') {
        const jefe = levelState.jefe;
        
        // Animar al jefe
        jefe.timerFrame += dt;
        const MIERDEI_ANIMATION_SPEED = 0.06;
        if (jefe.timerFrame >= MIERDEI_ANIMATION_SPEED) {
            jefe.timerFrame -= MIERDEI_ANIMATION_SPEED;
            jefe.frame = (jefe.frame + 1) % MIERDEI_SPRITE_DATA.frames.length;
        }

        jefe.timerGolpe = Math.max(0, jefe.timerGolpe - dt);

        // Movimiento del jefe (patrón mejorado)
        jefe.x += jefe.vx * dt;
        jefe.y = (H / 2) + Math.sin(levelState.tiempoDeJuego * 0.7) * (H * 0.35); // Movimiento sinusoidal vertical

        // Cambiar dirección si llega a los bordes horizontales
        if (jefe.x < W * 0.6 || jefe.x > W - jefe.w / 2) {
            jefe.vx = -jefe.vx;
            jefe.direccion = jefe.vx > 0 ? 1 : -1;
        }
        
        // Iniciar movimiento si está parado
        if (jefe.vx === 0) {
            jefe.vx = -70; // Velocidad inicial
        }

        jefe.timerAtaque -= dt;
        if (jefe.timerAtaque <= 0) {
            const r = Math.random();
            if (r < 0.35) {
                // Ataque: Bombardeo de Mierdei
                jefe.estado = 'bombard';
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => spawnMierdeiBombardero(jefe), i * 200);
                }
                jefe.timerAtaque = 3.0;
            } else if (r < 0.65) {
                // Ataque: Rayo de barrido
                dispararLaser(jefe, 'sweep');
                jefe.timerAtaque = 4.0;
            } else if (r < 0.9) {
                // Ataque: rayos láser múltiples
                dispararLaser(jefe, 'snipe');
                setTimeout(() => dispararLaser(jefe, 'snipe'), 200);
                setTimeout(() => dispararLaser(jefe, 'snipe'), 400);
                jefe.timerAtaque = 3.0;
            } else {
                // Ataque: spawnear agresivos
                spawnMierdeiAgresivo();
                spawnMierdei();
                spawnMierdei();
                jefe.timerAtaque = 2.5;
            }
        }

        // Actualizar bombas
        for (let i = jefe.bombas.length - 1; i >= 0; i--) {
            const bomba = jefe.bombas[i];
            bomba.vy += bomba.gravedad * dt;
            bomba.x += bomba.vx * dt;
            bomba.y += bomba.vy * dt;
            bomba.rotacion += bomba.vRot * dt;

            // Animar la bomba
            bomba.timerFrame += dt;
            if (bomba.timerFrame >= 0.06) { // Usamos una velocidad fija aquí
                bomba.timerFrame -= 0.06;
                bomba.frame = (bomba.frame + 1) % MIERDEI_SPRITE_DATA.frames.length;
            }

            // Colisión con el jugador
            if (Math.hypot(jugador.x - bomba.x, jugador.y - bomba.y) < jugador.r + bomba.r) {
                if (estadoJuego.vidas > 0) {
                    estadoJuego.vidas--;
                    S.reproducir('choque');
                    estadoJuego.animVida = 0.6;
                    estadoJuego.animDaño = 0.3;
                }
                jefe.bombas.splice(i, 1);
                if (estadoJuego.vidas <= 0) {
                    perderJuego();
                    return;
                }
                continue;
            }

            // Eliminar si sale de la pantalla
            if (bomba.y > H + bomba.h || bomba.x < -bomba.w || bomba.x > W + bomba.w) {
                jefe.bombas.splice(i, 1);
            }
        }

        // Actualizar láseres
        for (let i = jefe.lasers.length - 1; i >= 0; i--) {
            const laser = jefe.lasers[i];
            laser.timer -= dt;
            if (laser.damageCooldown > 0) {
                laser.damageCooldown -= dt;
            }
            
            // Daño al jugador si está en el rayo
            if (laser.active) {
                let jugadorEnRayo = false;
                if (laser.tipo === 'sweep') {
                    // Actualizar ángulo del barrido
                    const progress = 1 - (laser.timer / laser.duration);
                    const sweepProgress = Math.min(1, progress / (laser.sweepDuration / laser.duration));
                    laser.currentAngle = laser.startAngle + (laser.endAngle - laser.startAngle) * sweepProgress;

                    // Detección de colisión para el barrido
                    const dx = jugador.x - laser.x;
                    const dy = jugador.y - laser.y;
                    const playerAngle = Math.atan2(dy, dx);
                    const playerDist = Math.hypot(dx, dy);

                    let angleDiff = playerAngle - laser.currentAngle;
                    while (angleDiff <= -Math.PI) angleDiff += 2 * Math.PI;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

                    if (playerDist < laser.length && Math.abs(angleDiff) < (laser.width / playerDist)) {
                        jugadorEnRayo = true;
                    }
                } else { // tipo 'snipe'
                    const distToRay = distanciaPuntoARecta(
                        jugador.x, jugador.y,
                        laser.x, laser.y, laser.targetX, laser.targetY
                    );
                    if (distToRay < 30 && estaEntrePuntos(jugador.x, jugador.y, laser.x, laser.y, laser.targetX, laser.targetY)) {
                        jugadorEnRayo = true;
                    }
                }

                if (jugadorEnRayo) {
                    if (estadoJuego.vidas > 0 && laser.damageCooldown <= 0) {
                        estadoJuego.vidas--;
                        S.reproducir('choque');
                        estadoJuego.animVida = 0.6;
                        estadoJuego.animDaño = 0.3;
                        laser.damageCooldown = 0.5; 
                    }
                    if (estadoJuego.vidas <= 0) {
                        perderJuego();
                        return;
                    }
                }
            }
            
            if (laser.timer <= 0) {
                jefe.lasers.splice(i, 1);
            }
        }
        
        // --- LÓGICA DE COLISIONES: JUGADOR ATACANDO AL JEFE ---
        const hitbox = { x: jefe.x - jefe.w / 2, y: jefe.y - jefe.h / 2, w: jefe.w, h: jefe.h };

        // Colisión con torpedos
        for (let i = torpedos.length - 1; i >= 0; i--) {
            const t = torpedos[i];
            if (t.x > hitbox.x && t.x < hitbox.x + hitbox.w && t.y > hitbox.y && t.y < hitbox.y + hitbox.h) {
                recibirDanoJefe(t, 15); // Torpedos hacen más daño
                torpedos.splice(i, 1);
            }
        }

        // Colisión con proyectiles de armas
        for (let i = proyectiles.length - 1; i >= 0; i--) {
            const p = proyectiles[i];
            if (p.x > hitbox.x && p.x < hitbox.x + hitbox.w && p.y > hitbox.y && p.y < hitbox.y + hitbox.h) {
                recibirDanoJefe(p, 1); // Daño base
                proyectiles.splice(i, 1);
            }
        }

        if (jefe.lasers.length === 0) {
            jefe.estado = 'idle';
        }

        // Efectos sorpresa en el subnivel 3 cuando el jefe está herido
        if (jefe.hp <= 30 && jefe.hp > 0) {
            // Aumentar frecuencia de ataques
            if (Math.random() < 0.01) {
                activarSlowMotion(2.0);
            }
        }
    }

    // Completar boss si hp <=0
    if (sub.tipo === 'boss' && levelState.jefe.hp <= 0) {
        // Bonus de puntos por derrotar al jefe
        agregarPuntos(500);
        completarSubnivel();
    }
}

/**
 * Aplica daño al jefe y activa los efectos visuales/sonoros.
 * @param {object} proyectil - El objeto del proyectil que impactó.
 * @param {number} cantidad - La cantidad de daño a infligir.
 */
function recibirDanoJefe(proyectil, cantidad) {
    const jefe = levelState.jefe;
    if (!jefe || jefe.hp <= 0) return;
    generarExplosion(proyectil.x, proyectil.y, proyectil.color || '#ffdd77');
    jefe.hp -= cantidad;
    jefe.timerGolpe = 0.15; // Para el efecto de parpadeo
    S.reproducir('boss_hit');
}

// Función auxiliar para calcular distancia de punto a recta
function distanciaPuntoARecta(px, py, x1, y1, x2, y2) {
    const numerador = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1);
    const denominador = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
    return numerador / denominador;
}

// Función auxiliar para verificar si un punto está entre dos puntos
function estaEntrePuntos(px, py, x1, y1, x2, y2) {
    const dotProduct = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1);
    const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    
    if (dotProduct < 0 || dotProduct > lengthSquared) {
        return false;
    }
    return true;
}

export function draw() {
    if (!ctx || !mierdeiListo) return;

    if (levelState.subnivelActual >= SUBNIVELES.length) return;
    const sub = SUBNIVELES[levelState.subnivelActual];
    
    // Solo dibujar elementos especiales en el subnivel de jefe
    if (sub.tipo !== 'boss') return;

    const jefe = levelState.jefe;

    // Dibujar jefe
    ctx.save();
    if (jefe.timerGolpe > 0) {
        ctx.filter = 'brightness(3)'; // Efecto de flash al ser golpeado
    }
    ctx.translate(jefe.x, jefe.y);
    
    // Voltear imagen según dirección
    if (jefe.direccion > 0) {
        ctx.scale(-1, 1);
    }
    
    // Dibujar el frame correcto del jefe, no toda la hoja de sprites
    if (MIERDEI_SPRITE_DATA) {
        const frameData = MIERDEI_SPRITE_DATA.frames[jefe.frame];
        if (frameData) {
            const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
            const aspectRatio = sWidth / sHeight;
            const dHeight = jefe.w / aspectRatio; // Calcular alto manteniendo el aspect ratio
            ctx.drawImage(mierdeiImg, sx, sy, sWidth, sHeight, -jefe.w / 2, -dHeight / 2, jefe.w, dHeight);
        }
    }
    ctx.restore();

    // Dibujar bombas
    jefe.bombas.forEach(bomba => {
        if (MIERDEI_SPRITE_DATA) {
            const frameData = MIERDEI_SPRITE_DATA.frames[bomba.frame];
            if (frameData) {
                ctx.save();
                ctx.translate(bomba.x, bomba.y);
                ctx.rotate(bomba.rotacion); // Mantener la rotación de caída
                const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                const aspectRatio = sWidth / sHeight;
                const dHeight = bomba.w / aspectRatio;
                ctx.drawImage(mierdeiImg, sx, sy, sWidth, sHeight, -bomba.w / 2, -dHeight / 2, bomba.w, dHeight);
                ctx.restore();
            }
        }
    });

    // Dibujar láseres
    jefe.lasers.forEach(laser => {
        let targetX, targetY, beamWidth;
        if (laser.tipo === 'sweep') {
            targetX = laser.x + Math.cos(laser.currentAngle) * laser.length;
            targetY = laser.y + Math.sin(laser.currentAngle) * laser.length;
            beamWidth = laser.width;
        } else { // snipe
            targetX = laser.targetX;
            targetY = laser.targetY;
            beamWidth = 60;
        }

        const intensity = Math.min(1, laser.timer / laser.duration);
        beamWidth *= intensity;

        // --- Dibuja el rayo con el nuevo patrón SVG ---
        const dx = targetX - laser.x;
        const dy = targetY - laser.y;
        const angle = Math.atan2(dy, dx);
        const length = Math.hypot(dx, dy);

        ctx.save();
        ctx.translate(laser.x, laser.y);
        ctx.rotate(angle);

        // Dibuja el núcleo brillante primero (detrás)
        const coreWidth = 12 * intensity;
        const coreGrad = ctx.createLinearGradient(0, -coreWidth, 0, coreWidth);
        coreGrad.addColorStop(0, `rgba(255, 255, 255, 0)`);
        coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.9})`);
        coreGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, -coreWidth, length, coreWidth * 2);

        // Dibuja el patrón de energía SVG
        if (laserPatternReady && laserPattern) {
            ctx.save();
            // La animación se consigue moviendo el canvas antes de rellenar
            ctx.translate(0, -patternOffsetY); 
            
            ctx.fillStyle = laserPattern;
            ctx.globalAlpha = 0.9 * intensity;
            ctx.globalCompositeOperation = 'lighter';

            // Dibuja el rectángulo que se rellenará con el patrón
            ctx.fillRect(0, -beamWidth / 2 + patternOffsetY, length, beamWidth);
            
            ctx.restore();
        } else {
            // Fallback si el SVG no carga
            ctx.fillStyle = `rgba(255, 50, 50, ${0.4 * intensity})`;
            ctx.fillRect(0, -beamWidth / 2, length, beamWidth);
        }
        
        ctx.restore(); // Restaura la rotación y traslación

        // Texto en el rayo (solo si es suficientemente visible)
        if (intensity > 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            const midX = (laser.x + targetX) / 2;
            const midY = (laser.y + targetY) / 2;
            ctx.translate(midX, midY);
            // La rotación del texto debe considerar la dirección del rayo
            ctx.rotate(dx < 0 ? angle + Math.PI : angle);
            ctx.fillText('RAYO AJUSTADOR', 0, 0);
            ctx.restore();
        }
    });
}

export function onAnimalCazado(tipoAnimal) {
    // Capturar no cuenta para el objetivo de "Eliminar".
    // Si quisiéramos que contara, podríamos llamar a onKill(tipoAnimal) aquí.
}

export function onKill(tipoAnimal) {
    if (levelState.subnivelActual >= SUBNIVELES.length) return;
    const sub = SUBNIVELES[levelState.subnivelActual];

    // El daño al jefe ahora se maneja con colisiones directas en update().
    // Esta función solo se usa para el subnivel de eliminación.
    // Solo contamos 'mierdei' para el objetivo de eliminación.
    if (sub.tipo === 'kill' && tipoAnimal === 'mierdei') {
        levelState.progresoSubnivel++;
        if (levelState.progresoSubnivel >= sub.meta) {
            completarSubnivel();
        }
    }
}

function completarSubnivel() {
    levelState.subnivelActual++;
    if (levelState.subnivelActual >= SUBNIVELES.length) {
        // Nivel completado
        if (estadoJuego) {
            estadoJuego.valorObjetivoNivel = 1; // Coincide con la meta: 1 del tipo 'boss' en levels.js
        }
        // Ocultar barra de vida del jefe
        const bossHealthContainer = document.getElementById('bossHealthContainer');
        if (bossHealthContainer) bossHealthContainer.style.display = 'none';
        return;
    }
    
    const nuevoSub = SUBNIVELES[levelState.subnivelActual];
    levelState.progresoSubnivel = 0;
    levelState.spawnTimer = nuevoSub.spawnInterval;
    levelState.tiempoRestante = nuevoSub.tiempoLimite || 0;
    
    // Reiniciar posición del jefe si es el subnivel de boss
    if (nuevoSub.tipo === 'boss') {
        levelState.jefe.x = W - 200;
        levelState.jefe.y = H / 2;
        levelState.jefe.hp = 200;
        levelState.jefe.vx = 0;
        levelState.jefe.vy = 0;
        levelState.jefe.lasers = [];
        levelState.jefe.bombas = [];
        levelState.jefe.estado = 'idle';
        
        estadoJuego.jefe = levelState.jefe;
        const bossHealthContainer = document.getElementById('bossHealthContainer');
        if (bossHealthContainer) bossHealthContainer.style.display = 'block';
    } else {
        const bossHealthContainer = document.getElementById('bossHealthContainer');
        if (bossHealthContainer) bossHealthContainer.style.display = 'none';
    }
}

export function getEstadoMision() {
    if (levelState.subnivelActual >= SUBNIVELES.length) {
        return { texto: 'NIVEL 7 COMPLETADO', progreso: '¡Bonus terminado!' };
    }
    
    const sub = SUBNIVELES[levelState.subnivelActual];
    let progreso;
    
    if (sub.tipo === 'survive') {
        progreso = `TIEMPO: ${Math.ceil(levelState.tiempoRestante)}`;
    } else if (sub.tipo === 'boss') {
        progreso = `JEFE: ${levelState.jefe.hp}/${levelState.jefe.maxHp} HP`;
    } else {
        progreso = `${levelState.progresoSubnivel} / ${sub.meta}`;
    }
    
    return { texto: `${sub.nombre} - ${sub.objetivo}`, progreso };
}