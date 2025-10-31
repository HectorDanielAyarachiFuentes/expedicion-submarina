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

// Importamos dependencias de game.js
import { estadoJuego, dificultadBase, animales, S, generarGotasSangre } from '../game/game.js';

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
  { nombre: "NIVEL 9: EL ASESINO DE BALLENAS", objetivo: "Completa la cacería", meta: 1, tipo: 'boss', speedMultiplier: 1.1 },
  { nombre: "NIVEL 10: CARRERA NUCLEAR", objetivo: "Recorre 5km en menos de 5 minutos", meta: 5000, tipo: 'distancia', speedMultiplier: 1.0 }
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
    // --- LÓGICA GLOBAL AL MATAR UNA CRIATURA ---
    // Si se mata una cría de ballena, todas las ballenas adultas en pantalla se enfurecen.
    if (tipoAnimal === 'baby_whale') {
        S.reproducir('boss_hit'); // Sonido de furia
        for (const animal of animales) {
            if (animal.tipo === 'whale' && !animal.isEnraged) {
                animal.isEnraged = true;
                animal.vx *= 2.5; // Aumenta su velocidad drásticamente
                // Efecto visual de furia
                generarGotasSangre(animal.x, animal.y);
            }
        }
    }
    // --- FIN DE LA LÓGICA GLOBAL ---

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
 * Ahora usa el multiplicador definido en CONFIG_NIVELES para mayor claridad.
 */
export function getLevelSpeed() {
    if (!estadoJuego) return 260;
    
    const config = CONFIG_NIVELES[estadoJuego.nivel - 1];
    const multiNivel = config ? config.speedMultiplier : 1.0;

    let spd = 260 + (520 - 260) * dificultadBase();
    return spd * multiNivel;
}