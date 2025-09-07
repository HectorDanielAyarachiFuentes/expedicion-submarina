// js/levels.js
'use strict';

// Importamos la lógica de los niveles
import * as Level1 from './level1.js';
import * as Level2 from './level2.js';
import * as Level3 from './level3.js';
import * as Level4 from './level4.js';
import * as Level5 from './level5.js';
import * as Level6 from './level6.js'; // NUEVO NIVEL 6
import * as Level7 from './level7.js';

// Importamos dependencias de game.js
import { estadoJuego, dificultadBase } from './game.js';

// --- CONFIGURACIÓN DE NIVELES (Añadimos el Nivel 6) ---
export const CONFIG_NIVELES = [
  { nombre: 'NIVEL 1: CAÑÓN DE MAR DEL PLATA', objetivo: 'Captura 10 especímenes', meta: 10, tipo: 'capture' },
  { nombre: 'NIVEL 2: FOSA ABISAL', objetivo: 'Sobrevive 60 segundos', meta: 60, tipo: 'survive' },
  { nombre: 'NIVEL 3: LA GUARIDA DEL KRAKEN', objetivo: 'Derrota al jefe', meta: 1, tipo: 'boss' },
  { nombre: 'NIVEL 4: CAMPO DE ESCOMBROS', objetivo: 'Sobrevive 90 segundos', meta: 90, tipo: 'survive' },
  { nombre: 'NIVEL 5: COLAPSO DE LA FOSA', objetivo: 'Escapa durante 60 segundos', meta: 60, tipo: 'survive' },
  { nombre: 'NIVEL 6: EL VORTEX DE LAS PROFUNDIDADES', objetivo: 'Sobrevive 120 segundos', meta: 120, tipo: 'survive' }, // NUEVO NIVEL 6
  { nombre: "NIVEL 7: LA FOSA DE MIERDEI", objetivo: "¡Nivel de bonus! Captura 15 caras.", meta: 15, tipo: 'capture' }
];

export function getLevelSpawnPeriod() {
    // MODIFICADO: La lógica de spawn ahora está en cada módulo de nivel.
    // Esta función devuelve Infinity para los niveles que la gestionan por su cuenta.
    if ([1, 2, 3, 4, 5, 6, 7].includes(estadoJuego.nivel)) return Infinity;
    
    // Lógica de fallback para niveles sin módulo específico (ninguno por ahora)
    const multiNivel = 1.0;
    let base = 2.5 + (0.6 - 2.5) * dificultadBase();
    return Math.max(0.4, base * multiNivel);
}

export function getLevelSpeed() {
    // MODIFICADO: Incluir nivel 5 y 6
    const multiNivel = [1.0, 1.4, 1.0, 1.0, 0, 0, 1.2][estadoJuego.nivel - 1] ?? 1.0; // La velocidad no aplica en niveles 5 y 6
    let spd = 260 + (520 - 260) * dificultadBase();
    return spd * multiNivel;
}

// --- ROUTER DEL GESTOR DE NIVELES (AÑADIMOS EL CASO PARA EL NIVEL 6)---
export function initLevel(nivel) {
    switch(nivel) {
        case 1:
            Level1.init();
            break;
        case 2:
            Level2.init();
            break;
        case 3:
            Level3.init();
            break;
        case 4:
            Level4.init();
            break;
        case 5:
            Level5.init();
            break;
        case 6: // NUEVO NIVEL 6
            Level6.init();
            break;
        case 7:
            Level7.init();
            break;
    }
}

export function updateLevel(dt) {
    if (!estadoJuego) return;
    switch(estadoJuego.nivel) {
        case 1:
            Level1.update(dt);
            break;
        case 2:
            Level2.update(dt);
            break;
        case 3:
            Level3.update(dt);
            break;
        case 4:
            Level4.update(dt);
            break;
        case 5:
            Level5.update(dt);
            break;
        case 6: // NUEVO NIVEL 6
            Level6.update(dt);
            break;
        case 7:
            Level7.update(dt);
            break;
    }
}

export function drawLevel() {
    if (!estadoJuego) return;
    switch(estadoJuego.nivel) {
        case 1:
            Level1.draw();
            break;
        case 2:
            Level2.draw();
            break;
        case 3:
            Level3.draw();
            break;
        case 4:
            Level4.draw();
            break;
        case 5:
            Level5.draw();
            break;
        case 6: // NUEVO NIVEL 6
            Level6.draw();
            break;
        case 7:
            Level7.draw();
            break;
    }
}