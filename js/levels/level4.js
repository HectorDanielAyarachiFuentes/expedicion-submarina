// js/level4.js
'use strict';

// Importamos todo lo que necesitamos, incluyendo proyectiles y torpedos
import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, torpedos, proyectiles } from '../game/game.js';

// --- ESTADO Y ENTIDADES DEL NIVEL 4 ---
let escombros = [];
let spawnTimer = 0;

// --- FUNCIONES DEL NIVEL 4 ---

function generarEscombro() {
    const y = Math.random() * H;
    const velocidad = 200 + Math.random() * 400;
    const tamano = 20 + Math.random() * 50;
    const velocidadRotacion = (Math.random() - 0.5) * 3;

    escombros.push({
        x: W + tamano,
        y: y,
        vx: -velocidad,
        tamano: tamano,
        rotacion: Math.random() * Math.PI * 2,
        vRot: velocidadRotacion
    });
}

/**
 * Comprueba si un proyectil (o torpedo) colisiona con un escombro.
 * @param {object} proyectil - El objeto del proyectil o torpedo.
 * @param {object} escombro - El objeto del escombro.
 * @returns {boolean} - True si hay colisión, false si no.
 */
function proyectilColisionaConEscombro(proyectil, escombro) {
    const proyectilHitbox = { x: proyectil.x, y: proyectil.y, w: proyectil.w || 1, h: proyectil.h || 1 };
    const escombroHitbox = { x: escombro.x, y: escombro.y, w: escombro.tamano, h: escombro.tamano };

    return Math.abs(proyectilHitbox.x - escombroHitbox.x) * 2 < (proyectilHitbox.w + escombroHitbox.w) &&
           Math.abs(proyectilHitbox.y - escombroHitbox.y) * 2 < (proyectilHitbox.h + escombroHitbox.h);
}

// --- INTERFAZ PÚBLICA DEL MÓDULO ---

export function init() {
    console.log("Inicializando Nivel 4: Campo de Escombros");
    escombros = [];
    spawnTimer = 1.5;
    // Limpiar el jefe del nivel anterior
    estadoJuego.jefe = null;
    // Ocultar la barra de vida del jefe si está visible
    const bossHealthContainer = document.getElementById('bossHealthContainer');
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
}

export function update(dt) {
    if (!estadoJuego || estadoJuego.nivel !== 4) return;

    // 1. Manejar el spawn de nuevos escombros
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        generarEscombro();
        const progreso = estadoJuego.valorObjetivoNivel / 90;
        const maxSpawnRate = 0.15;
        const minSpawnRate = 1.2;
        spawnTimer = minSpawnRate - (minSpawnRate - maxSpawnRate) * progreso;
    }

    // 2. Actualizar y comprobar colisiones para cada escombro
    for (let i = escombros.length - 1; i >= 0; i--) {
        const escombro = escombros[i];
        escombro.x += escombro.vx * dt;
        escombro.rotacion += escombro.vRot * dt;

        // Colisión con el jugador
        // === LÍNEA CORREGIDA ===
        const dist = Math.hypot(jugador.x - escombro.x, jugador.y - escombro.y);
        if (dist < jugador.r + escombro.tamano / 2) {
            generarExplosion(escombro.x, escombro.y, '#cccccc');
            escombros.splice(i, 1);
            if (estadoJuego.vidas > 0) {
                estadoJuego.vidas--;
                estadoJuego.animVida = 0.6;
                S.reproducir('choque');
            }
            if (estadoJuego.vidas <= 0) {
                perderJuego();
            }
            continue;
        }

        // Colisión con torpedos
        for (let j = torpedos.length - 1; j >= 0; j--) {
            const t = torpedos[j];
            if (proyectilColisionaConEscombro(t, escombro)) {
                generarExplosion(escombro.x, escombro.y, '#cccccc');
                escombros.splice(i, 1);
                torpedos.splice(j, 1);
                estadoJuego.puntuacion += 50;
                break;
            }
        }
        if (i >= escombros.length) continue; // El escombro fue destruido por un torpedo

        // Colisión con proyectiles
        for (let k = proyectiles.length - 1; k >= 0; k--) {
            const p = proyectiles[k];
            if (proyectilColisionaConEscombro(p, escombro)) {
                generarExplosion(escombro.x, escombro.y, p.color);
                escombros.splice(i, 1);
                proyectiles.splice(k, 1);
                estadoJuego.puntuacion += 10;
                break;
            }
        }

        // Eliminar si sale de la pantalla
        if (i < escombros.length && escombros[i].x < -escombros[i].tamano) {
            escombros.splice(i, 1);
        }
    }
}

export function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#8B8B8B';
    ctx.strokeStyle = '#5A5A5A';
    ctx.lineWidth = 2;

    for (const escombro of escombros) {
        ctx.save();
        ctx.translate(escombro.x, escombro.y);
        ctx.rotate(escombro.rotacion);
        ctx.fillRect(-escombro.tamano / 2, -escombro.tamano / 2, escombro.tamano, escombro.tamano);
        ctx.strokeRect(-escombro.tamano / 2, -escombro.tamano / 2, escombro.tamano, escombro.tamano);
        ctx.restore();
    }
}