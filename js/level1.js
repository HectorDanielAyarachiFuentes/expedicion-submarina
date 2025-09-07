// js/level1.js
'use strict';

// ASUMIMOS que desde 'game.js' puedes importar estas funciones:
// generarAnimal(tipo): Genera un animal, opcionalmente de un tipo específico.
// dificultadBase(): Devuelve la dificultad seleccionada (0 a 1).
// limpiarTodosLosAnimales(): Elimina todos los animales de la pantalla.
// agregarPuntos(cantidad): Añade puntos al marcador del jugador.
import { generarAnimal, dificultadBase, limpiarTodosLosAnimales, agregarPuntos } from './game.js';

// --- VARIABLES DE ESTADO DEL NIVEL ---
let spawnTimer = 0;
let megaOleadaTimer = 0;
let tiempoDeJuego = 0;
let tiempoParaProximaMision = 0;

// --- VARIABLES DEL SISTEMA DE JUEGO ---
let velocidadJuego = 1.0; // 1.0 = normal, < 1.0 = lento (tiempo bala)
let slowMoTimer = 0;
let rachaAciertos = 0;

// --- CONSTANTES DE CONFIGURACIÓN DEL NIVEL ---
const MULTIPLICADOR_NIVEL = 1.0;
const PERIODO_SPAWN_INICIAL = 2.5;
const PERIODO_SPAWN_MINIMO = 0.35;
const FACTOR_ACELERACION = 0.05;
const PROBABILIDAD_OLEADA_PEQUENA = 0.15;
const TIEMPO_ENTRE_MEGA_OLEADAS = 35; // Aumentado para dar espacio a las misiones
const ANIMALES_EN_MEGA_OLEADA = 12;
const RETRASO_ENTRE_ANIMALES_OLEADA = 0.1;

// =================================================================
// --- GESTIÓN DE MISIONES ---
// =================================================================

let misionActual = null;
const TIEMPO_ENTRE_MISIONES = 15; // Una nueva misión puede aparecer cada 15 seg.

// --- Definición de todas las misiones posibles ---
const poolDeMisiones = [
    {
        id: 1,
        texto: "MISIÓN: ¡Caza 5 animales rojos!",
        tipo: 'CONTAR_TIPO',
        objetivo: { tipo: 'rojo', cantidad: 5 },
        recompensa: () => {
            console.log("RECOMPENSA: ¡Tiempo Bala!");
            activarSlowMotion(3); // 3 segundos de tiempo bala
        }
    },
    {
        id: 2,
        texto: "MISIÓN: ¡Elimina 10 animales en 20 segundos!",
        tipo: 'CONTAR_TOTAL',
        objetivo: { cantidad: 10 },
        tiempoLimite: 20,
        recompensa: () => {
            console.log("RECOMPENSA: ¡Pantalla Limpia!");
            limpiarTodosLosAnimales();
            agregarPuntos(500);
        }
    },
    {
        id: 3,
        texto: "MISIÓN: ¡Logra una racha de 7 aciertos!",
        tipo: 'RACHA',
        objetivo: { cantidad: 7 },
        recompensa: () => {
            console.log("RECOMPENSA: ¡Respiro!");
            spawnTimer += 5; // 5 segundos sin nuevos animales
            agregarPuntos(750);
        }
    },
    {
        id: 4,
        texto: "¡ESPECIAL! ¡Atrapa al animal DORADO!",
        tipo: 'CAZAR_ESPECIAL',
        objetivo: { tipo: 'dorado' },
        alIniciar: () => {
            // Genera el animal especial lejos del centro para que dé tiempo a reaccionar
            setTimeout(() => generarAnimal('dorado'), 1000);
        },
        recompensa: () => {
            console.log("RECOMPENSA: ¡Puntos masivos!");
            agregarPuntos(2000);
        }
    }
];

function iniciarNuevaMision() {
    if (misionActual) return; // No empezar una nueva si ya hay una activa

    const misionElegida = poolDeMisiones[Math.floor(Math.random() * poolDeMisiones.length)];
    misionActual = {
        ...misionElegida,
        progreso: 0,
        tiempoRestante: misionElegida.tiempoLimite || 0,
    };

    console.log(`Nueva Misión: ${misionActual.texto}`);
    if (misionActual.alIniciar) {
        misionActual.alIniciar();
    }
}

function completarMision() {
    console.log("¡MISIÓN CUMPLIDA!");
    misionActual.recompensa();
    misionActual = null;
    // Damos un respiro antes de que pueda empezar la siguiente misión
    tiempoParaProximaMision = TIEMPO_ENTRE_MISIONES + 5;
}

function fallarMision() {
    console.log("Misión fallada...");
    misionActual = null;
    tiempoParaProximaMision = TIEMPO_ENTRE_MISIONES;
}

function actualizarMisiones(dt) {
    if (!misionActual) {
        tiempoParaProximaMision -= dt;
        if (tiempoParaProximaMision <= 0) {
            iniciarNuevaMision();
        }
        return;
    }

    // Actualizar tiempo límite si la misión lo tiene
    if (misionActual.tiempoLimite) {
        misionActual.tiempoRestante -= dt;
        if (misionActual.tiempoRestante <= 0) {
            fallarMision();
            return;
        }
    }

    // Comprobar si se ha cumplido el objetivo
    if (misionActual.tipo.startsWith('CONTAR') && misionActual.progreso >= misionActual.objetivo.cantidad) {
        completarMision();
    } else if (misionActual.tipo === 'RACHA' && rachaAciertos >= misionActual.objetivo.cantidad) {
        completarMision();
    }
}


// --- FUNCIONES EXPORTADAS PARA CONTROLAR DESDE game.js ---

/**
 * Llama a esta función desde game.js cada vez que el jugador acierta a un animal.
 * @param {string} tipoAnimal - El tipo de animal que fue cazado (ej: 'rojo', 'normal', 'dorado').
 */
export function onAnimalCazado(tipoAnimal) {
    rachaAciertos++;
    if (!misionActual) return;

    // Lógica para cada tipo de misión
    if (misionActual.tipo === 'CONTAR_TIPO' && tipoAnimal === misionActual.objetivo.tipo) {
        misionActual.progreso++;
    }
    if (misionActual.tipo === 'CONTAR_TOTAL') {
        misionActual.progreso++;
    }
    if (misionActual.tipo === 'CAZAR_ESPECIAL' && tipoAnimal === misionActual.objetivo.tipo) {
        completarMision(); // Misión de caza especial se completa al instante
    }
}

/**
 * Llama a esta función desde game.js cuando el jugador falle un disparo.
 */
export function onFallo() {
    rachaAciertos = 0;
    if (misionActual && misionActual.tipo === 'RACHA') {
        fallarMision();
    }
}

/**
 * Devuelve el estado de la misión actual para mostrarlo en la UI.
 * @returns {object|null} Un objeto con {texto, progreso, objetivo} o null.
 */
export function getEstadoMision() {
    if (!misionActual) return null;
    
    let objetivoStr = '';
    if (misionActual.objetivo.cantidad) {
        objetivoStr = `${misionActual.progreso || rachaAciertos}/${misionActual.objetivo.cantidad}`;
    }
    if (misionActual.tiempoLimite) {
        objetivoStr += ` | Tiempo: ${Math.ceil(misionActual.tiempoRestante)}`;
    }

    return {
        texto: misionActual.texto,
        progreso: objetivoStr,
    };
}


// =================================================================
// --- LÓGICA PRINCIPAL DEL NIVEL (update, init, etc.) ---
// =================================================================

function getSpawnPeriod() {
    const base = PERIODO_SPAWN_INICIAL + (0.8 - PERIODO_SPAWN_INICIAL) * dificultadBase();
    const spawnPeriod = base * Math.exp(-tiempoDeJuego * FACTOR_ACELERACION);
    const variacion = spawnPeriod * 0.1 * (Math.random() - 0.5);
    return Math.max(PERIODO_SPAWN_MINIMO, (spawnPeriod + variacion) * MULTIPLICADOR_NIVEL);
}

function iniciarMegaOleada() {
    console.log("¡MEGA OLEADA!");
    for (let i = 0; i < ANIMALES_EN_MEGA_OLEADA; i++) {
        setTimeout(() => generarAnimal(), i * RETRASO_ENTRE_ANIMALES_OLEADA * 1000);
    }
}

function manejarSpawnNormal() {
    if (Math.random() < PROBABILIDAD_OLEADA_PEQUENA) {
        const cantidad = Math.random() < 0.7 ? 2 : 3;
        for (let i = 0; i < cantidad; i++) {
            setTimeout(() => generarAnimal(Math.random() < 0.2 ? 'rojo' : 'normal'), i * 200);
        }
    } else {
        generarAnimal(Math.random() < 0.2 ? 'rojo' : 'normal');
    }
    spawnTimer = getSpawnPeriod();
}

function activarSlowMotion(duracion) {
    velocidadJuego = 0.5; // El juego irá a la mitad de la velocidad
    slowMoTimer = duracion;
}

export function init() {
    tiempoDeJuego = 0;
    spawnTimer = PERIODO_SPAWN_INICIAL;
    megaOleadaTimer = TIEMPO_ENTRE_MEGA_OLEADAS;
    tiempoParaProximaMision = 8; // La primera misión aparecerá a los 8 segundos
    misionActual = null;
    rachaAciertos = 0;
    velocidadJuego = 1.0;
    slowMoTimer = 0;
}

export function update(dt) {
    // Ajustar el delta time por si hay tiempo bala
    const dtAjustado = dt * velocidadJuego;

    // Actualizar temporizador de slow motion
    if (slowMoTimer > 0) {
        slowMoTimer -= dt;
        if (slowMoTimer <= 0) {
            velocidadJuego = 1.0; // Se acabó el efecto
        }
    }
    
    tiempoDeJuego += dtAjustado;
    spawnTimer -= dtAjustado;
    megaOleadaTimer -= dtAjustado;
    
    // La lógica de las misiones se actualiza con el tiempo real (dt)
    actualizarMisiones(dt);

    if (megaOleadaTimer <= 0) {
        iniciarMegaOleada();
        megaOleadaTimer = TIEMPO_ENTRE_MEGA_OLEADAS;
        spawnTimer = getSpawnPeriod() * 2.5; // Más respiro tras mega oleada
    }

    if (spawnTimer <= 0) {
        manejarSpawnNormal();
    }
}

export function draw() {
    // El dibujado es manejado por el bucle principal en game.js
    // game.js debería usar getEstadoMision() para dibujar la UI de la misión
}