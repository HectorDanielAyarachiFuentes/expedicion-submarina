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

// Importamos dependencias de game.js
import { estadoJuego, dificultadBase } from './game/game.js';

// 2. CONFIGURACIÓN CENTRALIZADA DE NIVELES
// He movido el multiplicador de velocidad aquí para que toda la configuración esté en un solo lugar.
export const CONFIG_NIVELES = [
  { nombre: 'NIVEL 1: CAÑÓN DE MAR DEL PLATA', objetivo: 'Captura 10 especímenes', meta: 10, tipo: 'capture', speedMultiplier: 1.0 },
  { nombre: 'NIVEL 2: FOSA ABISAL', objetivo: 'Sobrevive 60 segundos', meta: 60, tipo: 'survive', speedMultiplier: 1.4 },
  { nombre: 'NIVEL 3: LA GUARIDA DEL KRAKEN', objetivo: 'Derrota al jefe', meta: 1, tipo: 'boss', speedMultiplier: 1.0 },
  { nombre: 'NIVEL 4: CAMPO DE ESCOMBROS', objetivo: 'Sobrevive 90 segundos', meta: 90, tipo: 'survive', speedMultiplier: 1.0 },
  { nombre: 'NIVEL 5: COLAPSO DE LA FOSA', objetivo: 'Escapa durante 60 segundos', meta: 60, tipo: 'survive', speedMultiplier: 0 }, // Velocidad controlada por el nivel
  { nombre: 'NIVEL 6: EL VORTEX DE LAS PROFUNDIDADES', objetivo: 'Sobrevive 120 segundos', meta: 120, tipo: 'survive', speedMultiplier: 0 }, // Velocidad controlada por el nivel
  { nombre: "NIVEL 7: LA FOSA DE MIERDEI", objetivo: "¡Nivel de bonus! Supera el desafío.", meta: 1, tipo: 'boss', speedMultiplier: 1.2 },
  { nombre: "NIVEL 8: ABISMO PROFUNDO", objetivo: "Supera los desafíos del abismo", meta: 25, tipo: 'boss', speedMultiplier: 1.5 },
  { nombre: "NIVEL 9: EL ASESINO DE BALLENAS", objetivo: "Completa la cacería", meta: 1, tipo: 'boss', speedMultiplier: 1.1 }
];

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

    if (activeLevelModule && typeof activeLevelModule.init === 'function') {
        activeLevelModule.init();
    } else {
        console.warn(`El módulo para el nivel ${nivel} no existe o no tiene una función init().`);
    }
}

/**
 * Llama a la función 'update' del módulo de nivel activo.
 * @param {number} dt - Delta time.
 */
export function updateLevel(dt) {
    if (activeLevelModule && typeof activeLevelModule.update === 'function') {
        activeLevelModule.update(dt);
    }
}

/**
 * Llama a la función 'draw' del módulo de nivel activo.
 */
export function drawLevel() {
    if (activeLevelModule && typeof activeLevelModule.draw === 'function') {
        activeLevelModule.draw();
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
        return activeLevelModule.getEstadoMision();
    }
    return null;
}

/**
 * Notifica al nivel activo que un animal fue cazado.
 * @param {string} tipoAnimal 
 */
export function onAnimalCazado(tipoAnimal) {
    if (activeLevelModule && typeof activeLevelModule.onAnimalCazado === 'function') {
        activeLevelModule.onAnimalCazado(tipoAnimal);
    }
}

/**
 * Notifica al nivel activo que un disparo ha fallado.
 */
export function onFallo() {
    if (activeLevelModule && typeof activeLevelModule.onFallo === 'function') {
        activeLevelModule.onFallo();
    }
}

/**
 * Notifica al nivel activo que un enemigo fue eliminado.
 * @param {string} tipoAnimal
 */
export function onKill(tipoAnimal) {
    if (activeLevelModule && typeof activeLevelModule.onKill === 'function') {
        activeLevelModule.onKill(tipoAnimal);
    }
}


// --- FUNCIONES AUXILIARES DE NIVEL ---

/**
 * Calcula la velocidad de movimiento de los enemigos para el nivel actual.
 * Ahora usa el multiplicador definido en CONFIG_NIVELES para mayor claridad.
 */
export function getLevelSpeed() {
    if (!estadoJuego) return 260;
    
    const config = CONFIG_NIVELES[estadoJuego.nivel - 1];
    const multiNivel = config ? config.speedMultiplier : 1.0;

    let spd = 260 + (520 - 260) * dificultadBase();
    return spd * multiNivel;
}

/*
 * NOTA SOBRE getLevelSpawnPeriod():
 * He eliminado esta función. Como cada módulo de nivel (level1.js, level2.js, etc.)
 * ahora controla su propia lógica de aparición de enemigos, ya no es necesario
 * que el gestor de niveles tenga una función genérica para esto. Esto hace que
 * el diseño sea más limpio y que cada nivel sea verdaderamente autónomo.
 */