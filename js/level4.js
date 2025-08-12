// js/level4.js
'use strict';

// Importamos todo lo que necesitamos, incluyendo proyectiles y torpedos
import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, torpedos, proyectiles } from './game.js';

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

// --- INTERFAZ PÚBLICA DEL MÓDULO ---

export function init() {
    console.log("Inicializando Nivel 4: Campo de Escombros");
    escombros = [];
    spawnTimer = 1.5;
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
        const dist = Math.hypot((jugador.x * W) - escombro.x, (jugador.y * H) - escombro.y);
        if (dist < jugador.r + escombro.tamano / 2) {
            generarExplosion(escombro.x, escombro.y, '#cccccc');
            escombros.splice(i, 1);
            if (estadoJuego.vidas > 0) {
                estadoJuego.vidas--;
                estadoJuego.animVida = 0.6;
                S.reproducir('lose');
            }
            if (estadoJuego.vidas <= 0) {
                perderJuego();
            }
            continue;
        }

        // Colisión con torpedos
        for (let j = torpedos.length - 1; j >= 0; j--) {
            const t = torpedos[j];
            if (t.x < escombro.x + escombro.tamano / 2 && t.x + t.w > escombro.x - escombro.tamano / 2 &&
                t.y < escombro.y + escombro.tamano / 2 && t.y + t.h > escombro.y - escombro.tamano / 2)
            {
                generarExplosion(escombro.x, escombro.y, '#cccccc');
                escombros.splice(i, 1);
                torpedos.splice(j, 1);
                estadoJuego.puntuacion += 50;
                break; 
            }
        }
        if (i >= escombros.length) continue;

        // Colisión con proyectiles
        for (let k = proyectiles.length - 1; k >= 0; k--) {
            const p = proyectiles[k];
            if (p.x < escombro.x + escombro.tamano / 2 && p.x + p.w > escombro.x - escombro.tamano / 2 &&
                p.y < escombro.y + escombro.tamano / 2 && p.y + p.h > escombro.y - escombro.tamano / 2)
            {
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