// js/level7.js
'use strict';

import { animales, W, H, mierdeiImg, mierdeiListo, estadoJuego, activarSlowMotion, agregarPuntos, ctx, jugador, perderJuego, S } from './game.js';
import { getLevelSpeed } from './levels.js';

// --- ESTADO DEL NIVEL 7 ---
let levelState = {};

// --- SUBNIVELES ---
const SUBNIVELES = [
    { nombre: 'SUBNIVEL 1: ELIMINACIÓN', objetivo: 'Elimina 5 mierdei', meta: 5, tipo: 'kill', spawnInterval: 2.0 },
    { nombre: 'SUBNIVEL 2: OLEADAS', objetivo: 'Sobrevive 15 segundos a las oleadas', meta: 15, tipo: 'survive', tiempoLimite: 15, spawnInterval: 1.0 },
    { nombre: 'SUBNIVEL 3: JEFE FINAL', objetivo: 'Derrota al jefe Mierdei', meta: 0, tipo: 'boss', spawnInterval: 1.5 }
];

/**
 * Genera una criatura 'mierdei' y la añade al array de animales.
 */
function spawnMierdei() {
    if (!mierdeiListo) return;

    const minY = H * 0.15;
    const maxY = H * 0.85;
    const y = minY + Math.random() * (maxY - minY);
    const velocidad = getLevelSpeed() + 60;

    const anchoDeseado = 100;
    let altoDeseado = anchoDeseado;
    if (mierdeiImg.width > 0) {
        altoDeseado = anchoDeseado * (mierdeiImg.height / mierdeiImg.width);
    }

    animales.push({
        x: W + anchoDeseado, y,
        vx: -velocidad * 0.7,
        r: anchoDeseado / 2,
        w: anchoDeseado, h: altoDeseado,
        capturado: false, tipo: 'mierdei',
        semillaFase: Math.random() * Math.PI * 2,
    });
}

/**
 * Genera una criatura 'mierdei' agresiva (más rápida y grande).
 */
function spawnMierdeiAgresivo() {
    if (!mierdeiListo) return;

    const minY = H * 0.15;
    const maxY = H * 0.85;
    const y = minY + Math.random() * (maxY - minY);
    const velocidad = getLevelSpeed() + 120; // Más rápido

    const anchoDeseado = 150; // Más grande
    let altoDeseado = anchoDeseado;
    if (mierdeiImg.width > 0) {
        altoDeseado = anchoDeseado * (mierdeiImg.height / mierdeiImg.width);
    }

    animales.push({
        x: W + anchoDeseado, y,
        vx: -velocidad * 0.7,
        r: anchoDeseado / 2,
        w: anchoDeseado, h: altoDeseado,
        capturado: false, tipo: 'mierdei',
        semillaFase: Math.random() * Math.PI * 2,
    });
}

/**
 * Dispara un láser desde el jefe hacia una posición aleatoria
 */
function dispararLaser(jefe) {
    jefe.estado = 'laser';
    jefe.lasers.push({
        x: jefe.x,
        y: jefe.y,
        targetX: Math.random() * W,
        targetY: Math.random() * H,
        duration: 1.5,
        timer: 1.5,
        active: true
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
            hp: 50,
            maxHp: 50,
            timerAtaque: 2,
            estado: 'idle',
            lasers: [],
            vx: 0,
            vy: 0,
            direccion: -1 // Se mueve hacia la izquierda
        }
    };
    
    // Mostrar barra de vida del jefe solo en subnivel 3
    const bossHealthContainer = document.getElementById('bossHealthContainer');
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
    
    // Limpiar animales existentes
    animales.length = 0;
}

export function update(dt) {
    if (levelState.subnivelActual >= SUBNIVELES.length) return; // Nivel completado

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
        
        // Movimiento del jefe (patrón simple)
        jefe.x += jefe.vx * dt;
        jefe.y += jefe.vy * dt;
        
        // Cambiar dirección si llega a los bordes
        if (jefe.x < W * 0.3 || jefe.x > W * 0.7) {
            jefe.vx = -jefe.vx;
            jefe.direccion = jefe.vx > 0 ? 1 : -1;
        }
        
        if (jefe.y < H * 0.2 || jefe.y > H * 0.8) {
            jefe.vy = -jefe.vy;
        }
        
        // Iniciar movimiento si está parado
        if (jefe.vx === 0 && jefe.vy === 0) {
            jefe.vx = -50; // Velocidad inicial
            jefe.vy = 30;
        }

        jefe.timerAtaque -= dt;
        if (jefe.timerAtaque <= 0) {
            const r = Math.random();
            if (r < 0.5) {
                // Ataque: spawnear mierdei
                spawnMierdei();
                spawnMierdei();
                jefe.timerAtaque = 2.0;
            } else if (r < 0.8) {
                // Ataque: rayos láser múltiples
                dispararLaser(jefe);
                dispararLaser(jefe);
                jefe.timerAtaque = 3.0;
            } else {
                // Ataque: spawnear agresivos
                spawnMierdeiAgresivo();
                jefe.timerAtaque = 2.5;
            }
        }

        // Actualizar láseres
        for (let i = jefe.lasers.length - 1; i >= 0; i--) {
            const laser = jefe.lasers[i];
            laser.timer -= dt;
            
            // Daño al jugador si está en el rayo
            if (laser.active) {
                // Calcular distancia del jugador al rayo
                const distToRay = distanciaPuntoARecta(
                    jugador.x, jugador.y,
                    laser.x, laser.y,
                    laser.targetX, laser.targetY
                );
                
                // Verificar si el jugador está dentro del rayo
                if (distToRay < 30 && estaEntrePuntos(jugador.x, jugador.y, laser.x, laser.y, laser.targetX, laser.targetY)) {
                    if (estadoJuego.vidas > 0) {
                        estadoJuego.vidas--;
                        S.reproducir('choque');
                        estadoJuego.animVida = 0.6;
                        // Destello visual
                        estadoJuego.animDaño = 0.3;
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
    ctx.translate(jefe.x, jefe.y);
    
    // Voltear imagen según dirección
    if (jefe.direccion > 0) {
        ctx.scale(-1, 1);
    }
    
    ctx.drawImage(mierdeiImg, -jefe.w / 2, -jefe.h / 2, jefe.w, jefe.h);
    ctx.restore();

    // Dibujar láseres
    jefe.lasers.forEach(laser => {
        // Interpolar color según tiempo restante
        const intensity = Math.min(1, laser.timer / laser.duration);
        ctx.strokeStyle = `rgba(255, ${50 + intensity * 205}, 50, ${intensity * 0.7})`;
        ctx.lineWidth = 8 * intensity;
        ctx.beginPath();
        ctx.moveTo(laser.x, laser.y);
        ctx.lineTo(laser.targetX, laser.targetY);
        ctx.stroke();

        // Efecto de brillo
        ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.3})`;
        ctx.lineWidth = 15 * intensity;
        ctx.stroke();

        // Texto en el rayo (solo si es suficientemente visible)
        if (intensity > 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            const midX = (laser.x + laser.targetX) / 2;
            const midY = (laser.y + laser.targetY) / 2;
            ctx.fillText('RAYO AJUSTADOR', midX, midY);
        }
    });
}

export function onAnimalCazado(tipoAnimal) {
    if (tipoAnimal === 'mierdei') {
        if (levelState.subnivelActual >= SUBNIVELES.length) return;
        const sub = SUBNIVELES[levelState.subnivelActual];
        
        if (sub.tipo === 'kill') {
            levelState.progresoSubnivel++;
            if (levelState.progresoSubnivel >= sub.meta) {
                completarSubnivel();
            }
        }
    }
}

export function onKill() {
    if (levelState.subnivelActual >= SUBNIVELES.length) return;
    const sub = SUBNIVELES[levelState.subnivelActual];
    
    if (sub.tipo === 'kill') {
        levelState.progresoSubnivel++;
        if (levelState.progresoSubnivel >= sub.meta) {
            completarSubnivel();
        }
    } else if (sub.tipo === 'boss') {
        levelState.jefe.hp -= 10;
        if (levelState.jefe.hp <= 0) {
            // El jefe es derrotado, se maneja en update()
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
        levelState.jefe.hp = 50;
        levelState.jefe.vx = 0;
        levelState.jefe.vy = 0;
        levelState.jefe.lasers = [];
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