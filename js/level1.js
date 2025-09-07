// js/level1.js
'use strict';

import { generarAnimal, dificultadBase } from './game.js';

// --- VARIABLES DE ESTADO DEL NIVEL ---

// Temporizador para la aparición normal de animales.
let spawnTimer = 0;
// Temporizador para controlar el evento especial de "Mega Oleada".
let megaOleadaTimer = 0;
// Contador de tiempo total de la partida para incrementar la dificultad.
let tiempoDeJuego = 0;

// --- CONSTANTES DE CONFIGURACIÓN DEL NIVEL ---

// Multiplicador de dificultad base del nivel. Ajústalo para cambiar el desafío general.
const MULTIPLICADOR_NIVEL = 1.0;
// Tiempo inicial entre la aparición de cada animal (en segundos).
const PERIODO_SPAWN_INICIAL = 2.5;
// Tiempo mínimo que puede haber entre apariciones. Para evitar que sea imposible.
const PERIODO_SPAWN_MINIMO = 0.35;
// Factor de aceleración. Cuanto más alto, más rápido se reduce el tiempo de aparición.
const FACTOR_ACELERACION = 0.05;

// Configuración de las oleadas.
const PROBABILIDAD_OLEADA_PEQUENA = 0.15; // 15% de probabilidad de que aparezca un grupo.

// Configuración del evento "Mega Oleada".
const TIEMPO_ENTRE_MEGA_OLEADAS = 25; // Sucede cada 25 segundos.
const ANIMALES_EN_MEGA_OLEADA = 10; // Cantidad de animales que aparecen.
const RETRASO_ENTRE_ANIMALES_OLEADA = 0.1; // Tiempo muy corto entre cada animal de la mega oleada.

/**
 * Calcula el tiempo de espera para la próxima aparición de un animal.
 * El tiempo se reduce a medida que avanza el juego (tiempoDeJuego).
 * @returns {number} El tiempo de espera en segundos.
 */
function getSpawnPeriod() {
    // La dificultad base (de 0 a 1) influye en el tiempo inicial.
    const base = PERIODO_SPAWN_INICIAL + (0.8 - PERIODO_SPAWN_INICIAL) * dificultadBase();
    // El tiempo se reduce exponencialmente a medida que 'tiempoDeJuego' aumenta.
    const spawnPeriod = base * Math.exp(-tiempoDeJuego * FACTOR_ACELERACION);
    // Se añade una pequeña variación aleatoria para que no sea predecible.
    const variacion = spawnPeriod * 0.1 * (Math.random() - 0.5); // +/- 5% de variación

    // Nos aseguramos de que el tiempo de aparición nunca sea menor que el mínimo.
    return Math.max(PERIODO_SPAWN_MINIMO, (spawnPeriod + variacion) * MULTIPLICADOR_NIVEL);
}

/**
 * Inicia una "Mega Oleada", generando una gran cantidad de animales
 * en un corto período de tiempo.
 */
function iniciarMegaOleada() {
    console.log("¡MEGA OLEADA!");
    for (let i = 0; i < ANIMALES_EN_MEGA_OLEADA; i++) {
        // Usamos setTimeout para generar cada animal con un pequeño retraso,
        // creando un efecto de "tren" de animales.
        setTimeout(() => {
            // Se podría pasar un tipo de animal especial para las oleadas.
            // Ejemplo: generarAnimal('rapido');
            generarAnimal();
        }, i * RETRASO_ENTRE_ANIMALES_OLEADA * 1000);
    }
}

/**
 * Gestiona la aparición normal de animales. Puede generar uno solo
 * o una pequeña oleada de forma aleatoria.
 */
function manejarSpawnNormal() {
    // Hay una probabilidad de que en lugar de 1 animal, aparezcan 2 o 3.
    if (Math.random() < PROBABILIDAD_OLEADA_PEQUENA) {
        const cantidad = Math.random() < 0.7 ? 2 : 3; // 70% de probabilidad de 2, 30% de 3
        for (let i = 0; i < cantidad; i++) {
            setTimeout(() => generarAnimal(), i * 200); // Pequeño retraso entre ellos
        }
    } else {
        // Lo más común es que solo aparezca un animal.
        generarAnimal();
    }
    // Reiniciamos el temporizador con el nuevo cálculo de dificultad.
    spawnTimer = getSpawnPeriod();
}

/**
 * Inicializa las variables del nivel.
 */
export function init() {
    tiempoDeJuego = 0;
    spawnTimer = PERIODO_SPAWN_INICIAL;
    megaOleadaTimer = TIEMPO_ENTRE_MEGA_OLEADAS;
}

/**
 * Actualiza la lógica del nivel en cada frame.
 * @param {number} dt - El tiempo delta desde el último frame (en segundos).
 */
export function update(dt) {
    // Incrementamos los contadores de tiempo.
    tiempoDeJuego += dt;
    spawnTimer -= dt;
    megaOleadaTimer -= dt;

    // Comprobamos si es momento de una Mega Oleada.
    if (megaOleadaTimer <= 0) {
        iniciarMegaOleada();
        // Reiniciamos ambos contadores para dar un respiro al jugador tras la oleada.
        megaOleadaTimer = TIEMPO_ENTRE_MEGA_OLEADAS;
        spawnTimer = getSpawnPeriod() * 2; // Damos un poco más de tiempo antes del siguiente animal.
    }

    // Comprobamos si es momento de una aparición normal.
    if (spawnTimer <= 0) {
        manejarSpawnNormal();
    }
}

/**
 * Función de dibujado (actualmente no se usa aquí).
 */
export function draw() {
    // El dibujado de animales es manejado por el bucle principal en game.js
}