'use strict';

// 1. IMPORTAMOS LA LÓGICA DE CADA NIVEL
import * as Level1 from './level1.js';
import * as Level2 from './level2.js';
import * as Level3 from './level3.js';
import * as Level4 from './level4.js';
import * as Level5 from './level5.js';
import * as Level6 from './level6.js';
import * as Level7 from './level7.js';
import * as Level8 from './level8.js';
import * as Level9 from './level9.js';
import * as Level10 from './level10.js';

// 2. CONFIGURACIÓN CENTRALIZADA DE NIVELES (Importada desde config.js)
import { CONFIG_NIVELES } from './config.js';
export { CONFIG_NIVELES };

// 3. MAPA DE MÓDULOS DE NIVEL
// Este objeto asocia el número de nivel con su módulo importado.
// Esto elimina la necesidad de usar 'switch' en todas partes.
const levelModules = {
    1: Level1,
    2: Level2,
    3: Level3,
    4: Level4,
    5: Level5,
    6: Level6,
    7: Level7,
    8: Level8,
    9: Level9,
    10: Level10,
};

// Guardamos una referencia al módulo del nivel que está activo
let activeLevelModule = null;


// --- FUNCIONES PRINCIPALES DEL GESTOR DE NIVELES ---

/**
 * Carga el módulo de un nivel, lo guarda como activo y llama a su función `init`.
 * @param {number} nivel - El número del nivel a iniciar.
 */
export function initLevel(nivel) {
    activeLevelModule = levelModules[nivel] || null;
    console.log(`[Levels.js] Intentando iniciar Nivel ${nivel}. activeLevelModule:`, activeLevelModule, `Tiene init?:`, activeLevelModule && typeof activeLevelModule.init === 'function');

    if (activeLevelModule && typeof activeLevelModule.init === 'function') {
        try {
            activeLevelModule.init();
        } catch (e) {
            console.error(`Error al inicializar el Nivel ${nivel}:`, e);
        }
    } else {
        console.warn(`El módulo para el nivel ${nivel} no existe o no tiene una función init().`);
    }
}

/**
 * Llama a la función 'update' del módulo de nivel activo.
 * @param {number} dt - Delta time.
 * @param {number} vx - Player velocity x.
 * @param {number} vy - Player velocity y.
 */
export function updateLevel(dt, vx, vy) {
    if (activeLevelModule && typeof activeLevelModule.update === 'function') {
        try {
            activeLevelModule.update(dt, vx, vy);
        } catch (e) {
            console.error(`Error en el update() del nivel activo:`, e);
        }
    }
}

/**
 * Llama a la función 'draw' del módulo de nivel activo.
 */
export function drawLevel() {
    if (activeLevelModule && typeof activeLevelModule.draw === 'function') {
        try {
            activeLevelModule.draw();
        } catch (e) {
            console.error(`Error en el draw() del nivel activo:`, e);
        }
    }
}

// --- FUNCIONES DELEGADAS ---
// Estas son las funciones que 'game.js' llamará.
// Actúan como un intermediario seguro hacia el módulo de nivel activo.

/**
 * Obtiene el estado de la misión desde el nivel activo.
 * Si el nivel no tiene misiones, devuelve null de forma segura.
 */
export function getEstadoMision() {
    if (activeLevelModule && typeof activeLevelModule.getEstadoMision === 'function') {
        try {
            return activeLevelModule.getEstadoMision();
        } catch (e) {
            console.error(`Error en getEstadoMision() del nivel activo:`, e);
        }
    }
    return null;
}

/**
 * Notifica al nivel activo que un animal fue cazado.
 * @param {string} tipoAnimal 
 */
export function onAnimalCazado(tipoAnimal) {
    if (activeLevelModule && typeof activeLevelModule.onAnimalCazado === 'function') {
        try {
            activeLevelModule.onAnimalCazado(tipoAnimal);
        } catch (e) {
            console.error(`Error en onAnimalCazado() del nivel activo:`, e);
        }
    }
}

/**
 * Notifica al nivel activo que un disparo ha fallado.
 */
export function onFallo() {
    if (activeLevelModule && typeof activeLevelModule.onFallo === 'function') {
        try {
            activeLevelModule.onFallo();
        } catch (e) {
            console.error(`Error en onFallo() del nivel activo:`, e);
        }
    }
}

/**
 * Notifica al nivel activo que un enemigo fue eliminado.
 * @param {string} tipoAnimal
 */
export function onKill(tipoAnimal) {
    if (activeLevelModule && typeof activeLevelModule.onKill === 'function') {
        try {
            activeLevelModule.onKill(tipoAnimal);
        } catch (e) {
            console.error(`Error en onKill() del nivel activo:`, e);
        }
    }
}


// --- FUNCIONES AUXILIARES DE NIVEL ---

/**
 * Calcula la velocidad de movimiento de los enemigos para el nivel actual.
 * @param {number} nivel - Número del nivel
 * @param {number} dificultad - Factor de dificultad base (0 a 1)
 */
export function getLevelSpeed(nivel = 1, dificultad = 0) {
    const config = CONFIG_NIVELES[(nivel || 1) - 1];
    const multiNivel = config ? config.speedMultiplier : 1.0;

    let spd = 260 + (520 - 260) * dificultad;
    return spd * multiNivel;
}