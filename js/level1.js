'use strict';

// Importaciones desde el motor del juego
import { generarAnimal, dificultadBase, limpiarTodosLosAnimales, agregarPuntos, activarSlowMotion, estadoJuego } from './game.js';

// --- ESTADO DEL NIVEL 1 ---
let levelState = {};

// --- SISTEMA DE MISIONES ---
const TIEMPO_ENTRE_MISIONES = 18;
const poolDeMisiones = [
    // ... (el mismo pool de misiones que antes)
    {
        id: 1, texto: "MISIÓN: ¡Caza 5 animales rojos!", tipo: 'CONTAR_TIPO',
        objetivo: { tipo: 'rojo', cantidad: 5 },
        recompensa: () => { activarSlowMotion(3); agregarPuntos(200); }
    },
    {
        id: 2, texto: "MISIÓN: ¡Elimina 10 animales en 20 segundos!", tipo: 'CONTAR_TOTAL',
        objetivo: { cantidad: 10 }, tiempoLimite: 20,
        recompensa: () => { limpiarTodosLosAnimales(); agregarPuntos(500); }
    },
    {
        id: 3, texto: "MISIÓN: ¡Logra una racha de 7 capturas!", tipo: 'RACHA',
        objetivo: { cantidad: 7 },
        recompensa: () => { levelState.tiempoParaProximoEvento += 5; agregarPuntos(750); }
    },
    {
        id: 4, texto: "¡ESPECIAL! ¡Atrapa al animal DORADO!", tipo: 'CAZAR_ESPECIAL',
        objetivo: { tipo: 'dorado' },
        alIniciar: () => { setTimeout(() => generarAnimal(false, 'dorado'), 1000); },
        recompensa: () => { agregarPuntos(2000); }
    },
    {
        id: 5, texto: "SUPERVIVENCIA: ¡Sobrevive 25 segundos!", tipo: 'SUPERVIVENCIA',
        tiempoLimite: 25,
        recompensa: () => { limpiarTodosLosAnimales(); agregarPuntos(1000); }
    }
];

// --- Lógica de misiones (iniciar, completar, fallar, actualizar) ---
// ... (sin cambios, es la misma lógica de antes)

function iniciarNuevaMision() {
    if (levelState.misionActual) return;
    const misionElegida = poolDeMisiones[Math.floor(Math.random() * poolDeMisiones.length)];
    levelState.misionActual = {
        ...misionElegida,
        progreso: 0,
        tiempoRestante: misionElegida.tiempoLimite || 0,
    };
    if (levelState.misionActual.alIniciar) {
        levelState.misionActual.alIniciar();
    }
}

function completarMision() {
    if (!levelState.misionActual) return;
    levelState.misionActual.recompensa();
    levelState.misionActual = null;
    levelState.tiempoParaProximaMision = TIEMPO_ENTRE_MISIONES + 5;
}

function fallarMision() {
    levelState.misionActual = null;
    levelState.tiempoParaProximaMision = TIEMPO_ENTRE_MISIONES;
}

function actualizarMisiones(dt) {
    if (!levelState.misionActual) {
        levelState.tiempoParaProximaMision -= dt;
        if (levelState.tiempoParaProximaMision <= 0) {
            iniciarNuevaMision();
        }
        return;
    }
    const mision = levelState.misionActual;
    if (mision.tiempoLimite) {
        mision.tiempoRestante -= dt;
        if (mision.tiempoRestante <= 0) {
            if (mision.tipo === 'SUPERVIVENCIA') completarMision();
            else fallarMision();
            return;
        }
    }
    if ((mision.tipo.startsWith('CONTAR') && mision.progreso >= mision.objetivo.cantidad) ||
        (mision.tipo === 'RACHA' && levelState.rachaAciertos >= mision.objetivo.cantidad)) {
        completarMision();
    }
}


// --- FUNCIONES EXPORTADAS DEL NIVEL (API del nivel) ---

export function init() {
    console.log("Inicializando lógica del Nivel 1...");
    levelState = {
        tiempoDeJuego: 0,
        tiempoParaProximoEvento: 2, // Primer enemigo a los 2 segundos
        misionActual: null,
        rachaAciertos: 0,
        tiempoParaProximaMision: 8, // Primera misión a los 8 segundos
    };
}

export function update(dt) {
    levelState.tiempoDeJuego += dt;
    actualizarMisiones(dt);

    // Lógica de spawn mejorada y continua para el Nivel 1
    levelState.tiempoParaProximoEvento -= dt;
    if (levelState.tiempoParaProximoEvento <= 0) {
        // Lógica de spawn aleatoria pero controlada
        const r = Math.random();
        if (r < 0.1) { // 10% de probabilidad de una mini-oleada
            for (let i = 0; i < 3; i++) {
                setTimeout(() => generarAnimal(false, Math.random() < 0.4 ? 'rojo' : 'normal'), i * 200);
            }
        } else if (r < 0.15) { // 5% de probabilidad de un 'mierdei'
             generarAnimal(false, 'mierdei');
        }
        else { // 85% de un animal normal o rojo
            generarAnimal(false, Math.random() < 0.25 ? 'rojo' : 'normal');
        }
        
        // El tiempo para el siguiente spawn se acorta a medida que avanza el juego
        const spawnBase = 2.2;
        const spawnMin = 0.4;
        const factorDificultad = Math.min(1, levelState.tiempoDeJuego / 90); // Tarda 90s en alcanzar dificultad máx
        levelState.tiempoParaProximoEvento = spawnBase - (spawnBase - spawnMin) * factorDificultad;
    }
}

export function draw() {
    // Lógica de dibujado específica del Nivel 1 (si la hubiera)
}

export function onAnimalCazado(tipoAnimal) {
    levelState.rachaAciertos++;
    const mision = levelState.misionActual;
    if (!mision) return;

    if (mision.tipo === 'CONTAR_TIPO' && tipoAnimal === mision.objetivo.tipo) mision.progreso++;
    if (mision.tipo === 'CONTAR_TOTAL') mision.progreso++;
    if (mision.tipo === 'CAZAR_ESPECIAL' && tipoAnimal === mision.objetivo.tipo) completarMision();
}

export function onFallo() {
    levelState.rachaAciertos = 0;
    if (levelState.misionActual && levelState.misionActual.tipo === 'RACHA') {
        fallarMision();
    }
}

export function getEstadoMision() {
    if (!levelState.misionActual) return null;
    const mision = levelState.misionActual;
    let objetivoStr = '';

    if (mision.objetivo && mision.objetivo.cantidad) {
        const progreso = mision.tipo === 'RACHA' ? levelState.rachaAciertos : mision.progreso;
        objetivoStr = `${progreso} / ${mision.objetivo.cantidad}`;
    }

    if (mision.tiempoLimite) {
        objetivoStr += ` | TIEMPO: ${Math.ceil(mision.tiempoRestante)}`;
    }
    return { texto: mision.texto, progreso: objetivoStr };
}