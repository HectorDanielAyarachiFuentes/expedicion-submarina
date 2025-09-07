// js/level2.js
'use strict';

import { generarAnimal, dificultadBase } from './game.js';

let spawnTimer = 0;

function getSpawnPeriod() {
    const multiNivel = 0.6;
    let base = 2.5 + (0.6 - 2.5) * dificultadBase();
    return Math.max(0.4, base * multiNivel);
}

export function init() {
    spawnTimer = getSpawnPeriod();
}

export function update(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        generarAnimal();
        spawnTimer = getSpawnPeriod();
    }
}

export function draw() {
    // El dibujado de animales es manejado por el bucle principal en game.js
}