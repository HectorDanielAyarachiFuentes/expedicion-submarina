'use strict';

// Importaciones desde el motor del juego
import { generarAnimal, dificultadBase, limpiarTodosLosAnimales, agregarPuntos, activarSlowMotion, estadoJuego } from '../game/game.js';

// --- ESTADO DEL NIVEL 8 ---
let levelState = {};

// --- SUBNIVELES ---
const SUBNIVELES = [
    { nombre: 'SUBNIVEL 1: TIROTEO INTENSO', objetivo: 'Elimina 20 enemigos', meta: 20, tipo: 'kill', tiempoLimite: 0 },
    { nombre: 'SUBNIVEL 2: ESCAPE DEL ABISMO', objetivo: 'Sobrevive 60 segundos', meta: 60, tipo: 'survive', tiempoLimite: 60 },
    { nombre: 'SUBNIVEL 3: FURIA PROFUNDA', objetivo: 'Elimina 30 enemigos agresivos', meta: 30, tipo: 'kill_aggressive', tiempoLimite: 0 }
];

// --- FUNCIONES EXPORTADAS DEL NIVEL (API del nivel) ---

export function init() {
    console.log("Inicializando lógica del Nivel 8...");
    levelState = {
        subnivelActual: 0,
        progresoSubnivel: 0,
        tiempoDeJuego: 0,
        tiempoParaProximoEvento: 1.0,
        kills: 0,
        tiempoLimite: SUBNIVELES[0].tiempoLimite,
        tiempoRestante: SUBNIVELES[0].tiempoLimite
    };

    // Limpiar el estado del jefe del nivel anterior (Nivel 7)
    estadoJuego.jefe = null;
    const bossHealthContainer = document.getElementById('bossHealthContainer');
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
}

export function update(dt) {
    if (levelState.subnivelActual >= SUBNIVELES.length) return; // Nivel completado, no actualizar más

    levelState.tiempoDeJuego += dt;

    const sub = SUBNIVELES[levelState.subnivelActual];
    if (sub.tipo === 'survive') {
        levelState.tiempoRestante -= dt;
        if (levelState.tiempoRestante <= 0) {
            // Completar subnivel
            completarSubnivel();
        }
    }

    // Lógica de spawn
    levelState.tiempoParaProximoEvento -= dt;
    if (levelState.tiempoParaProximoEvento <= 0) {
        let tipo = 'normal';
        if (sub.tipo === 'kill_aggressive') {
            tipo = 'aggressive';
        } else {
            const r = Math.random();
            if (r < 0.3) tipo = 'rojo';
            else if (r < 0.4) tipo = 'mierdei';
        }
        generarAnimal(false, tipo);

        const spawnBase = sub.tipo === 'kill_aggressive' ? 1.2 : 1.5;
        const spawnMin = 0.2;
        const factor = Math.min(1, levelState.tiempoDeJuego / 60);
        levelState.tiempoParaProximoEvento = spawnBase - (spawnBase - spawnMin) * factor;
    }
}

export function draw() {
    // Dibujar indicador de subnivel si es necesario
}

export function onAnimalCazado(tipoAnimal) {
    // No se usa captura, solo kills
}

export function onFallo() {
    // Reset racha si aplica
}

// Esta función se llama cuando se mata un enemigo (desde game.js via levels.js)
export function onKill() {
    if (levelState.subnivelActual >= SUBNIVELES.length) return; // Evita errores si el nivel ya terminó

    levelState.kills++;
    const sub = SUBNIVELES[levelState.subnivelActual];
    if (sub.tipo === 'kill' || sub.tipo === 'kill_aggressive') {
        levelState.progresoSubnivel++;
        if (levelState.progresoSubnivel >= sub.meta) {
            completarSubnivel();
        }
    }
}

function completarSubnivel() {
    levelState.subnivelActual++;
    if (levelState.subnivelActual >= SUBNIVELES.length) {
        // Nivel completado, marcar el objetivo global como alcanzado
        if (estadoJuego) {
            estadoJuego.valorObjetivoNivel = 25;
            // Llamar a la función para indicar que el nivel fue completado
            if (typeof window !== 'undefined' && window.nivel8Completado) {
                window.nivel8Completado();
            }
        }
        return;
    }
    const nuevoSub = SUBNIVELES[levelState.subnivelActual];
    levelState.progresoSubnivel = 0;
    levelState.tiempoRestante = nuevoSub.tiempoLimite;
    levelState.tiempoParaProximoEvento = 1.0;
    // En lugar de limpiar aquí y causar un error, le pedimos al motor que lo haga.
    estadoJuego.levelFlags.clearScreen = true;
    agregarPuntos(500 * levelState.subnivelActual);
}

export function getEstadoMision() {
    const sub = SUBNIVELES[levelState.subnivelActual];
    if (!sub) {
        // Nivel completado, devolver estado por defecto
        return { texto: 'NIVEL 8 COMPLETADO', progreso: '¡Felicidades!' };
    }
    let progreso = '';
    if (sub.tipo === 'survive') {
        progreso = `TIEMPO: ${Math.ceil(levelState.tiempoRestante)}`;
    } else {
        progreso = `${levelState.progresoSubnivel} / ${sub.meta}`;
    }
    return { texto: sub.nombre + ' - ' + sub.objetivo, progreso };
}
