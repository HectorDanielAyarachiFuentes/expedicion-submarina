// js/level7.js
'use strict';

import { animales, W, H, mierdeiImg, mierdeiListo } from './game.js';
import { getLevelSpeed } from './levels.js';

let spawnTimer = 0;
// Intervalo de aparición de las criaturas 'mierdei' en segundos.
const SPAWN_INTERVAL = 0.4;

/**
 * Genera una criatura 'mierdei' y la añade al array de animales.
 */
function spawnMierdei() {
    if (!mierdeiListo) return;

    const minY = H * 0.15;
    const maxY = H * 0.85;
    const y = minY + Math.random() * (maxY - minY);
    const velocidad = getLevelSpeed() + 60;

    const anchoDeseado = 350;
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

export function init() {
    spawnTimer = SPAWN_INTERVAL;
}

export function update(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnMierdei();
        spawnTimer = SPAWN_INTERVAL;
    }
}

export function draw() {
    // El dibujado es manejado por el bucle principal en game.js
}