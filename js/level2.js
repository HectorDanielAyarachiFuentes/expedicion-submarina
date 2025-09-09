'use strict';

// 1. IMPORTAMOS LAS HERRAMIENTAS QUE NECESITA EL NIVEL DESDE EL MOTOR DEL JUEGO
// - generarAnimal: Para crear enemigos.
// - dificultadBase: Para que el nivel se vuelva más difícil con el tiempo.
// - estadoJuego: Para modificar propiedades globales como la oscuridad.
import { generarAnimal, dificultadBase, estadoJuego } from './game/game.js';

// 2. ESTADO INTERNO DEL NIVEL
// Usamos un objeto para guardar las variables de este nivel. Es más limpio que tenerlas sueltas.
let levelState = {};

/**
 * Calcula el tiempo entre la aparición de cada animal para este nivel.
 * El ritmo es más rápido que en el Nivel 1 (multiNivel = 0.6).
 * Se acorta a medida que aumenta la dificultad base del juego.
 */
function getSpawnPeriod() {
    const multiNivel = 0.6; // Este valor hace que los enemigos aparezcan más rápido.
    let base = 2.5 + (0.6 - 2.5) * dificultadBase();
    const periodo = Math.max(0.4, base * multiNivel); // El mínimo es 0.4 segundos entre apariciones.
    return periodo;
}

// 3. FUNCIONES EXPORTADAS (LA "API" DEL NIVEL)
// Estas son las funciones que el gestor 'levels.js' llamará.

/**
 * Función de inicialización. Se llama una sola vez cuando comienza el nivel.
 * Prepara el estado inicial del nivel.
 */
export function init() {
    levelState = {
        spawnTimer: getSpawnPeriod(), // Inicia el primer temporizador para el primer enemigo.
    };
    console.log("Nivel 2: Fosa Abisal iniciado. Lógica de nivel cargada.");
}

/**
 * Bucle de actualización del nivel. Se llama en cada frame desde game.js.
 * Aquí reside toda la lógica de juego del Nivel 2.
 * @param {number} dt - Delta time, el tiempo transcurrido desde el último frame.
 */
export function update(dt) {
    if (!estadoJuego) return;

    // --- LÓGICA DE NIVEL 2: ESTÉTICA DE OSCURIDAD ---
    // Esta es la primera pieza de lógica que le pertenece al Nivel 2.
    // Le decimos al motor de juego que este nivel debe ser muy oscuro.
    // El motor leerá este valor en su función dibujarMascaraLuz().
    estadoJuego.darknessOverride = 0.95;

    // --- LÓGICA DE NIVEL 2: APARICIÓN DE ENEMIGOS ---
    levelState.spawnTimer -= dt;
    if (levelState.spawnTimer <= 0) {
        
        // Esta es la segunda pieza de lógica que le pertenece al Nivel 2.
        // REGLA CLAVE DEL NIVEL: Hay un 30% de probabilidad de que el animal sea agresivo.
        const esAgresivo = Math.random() < 0.3;
        const tipoAnimal = esAgresivo ? 'aggressive' : 'normal';

        // Le pedimos al motor que cree un animal con el tipo que hemos decidido.
        generarAnimal(false, tipoAnimal);
        
        // Reiniciamos el temporizador para el siguiente animal.
        levelState.spawnTimer = getSpawnPeriod();
    }
}

/**
 * Bucle de dibujado del nivel. Se llama en cada frame.
 * Útil para efectos visuales o fondos específicos del nivel.
 */
export function draw() {
    // Por ahora, el Nivel 2 no tiene elementos visuales únicos que dibujar.
    // El dibujado de los animales, partículas y la máscara de luz son manejados
    // de forma genérica por el motor en game.js. Este es el comportamiento correcto.
}

/**
 * Maneja el evento de un animal cazado.
 * El Nivel 2 no tiene misiones, por lo que esta función puede estar vacía,
 * pero debe existir para que el juego no falle si la llama.
 * @param {string} tipoAnimal 
 */
export function onAnimalCazado(tipoAnimal) {
    // No hay lógica de misión en este nivel.
}

/**
 * Maneja el evento de un disparo fallido.
 */
export function onFallo() {
    // No hay lógica de racha en este nivel.
}

/**
 * Devuelve información de la misión actual para el HUD.
 */
export function getEstadoMision() {
    // El Nivel 2 no tiene misiones, por lo que siempre devuelve null.
    // Esto hace que el HUD muestre el objetivo normal del nivel.
    return null;
}