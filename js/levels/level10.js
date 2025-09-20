'use strict';

// Importaciones del motor del juego
import { estadoJuego, jugador, S, W, H, ctx } from '../game/game.js';

// --- ESTADO DEL NIVEL 10 ---
let levelState = {};

// --- LÓGICA DEL BARRIL NUCLEAR ---
let barrilNuclear = {};

// SVG para el barril nuclear (creado como un objeto Path2D)
function crearSVGBarril() {
    const path = new Path2D();
    // Cuerpo del barril
    path.moveTo(0, -30);
    path.lineTo(0, 30);
    path.moveTo(-20, -25);
    path.bezierCurveTo(-25, -10, -25, 10, -20, 25);
    path.moveTo(20, -25);
    path.bezierCurveTo(25, -10, 25, 10, 20, 25);
    path.moveTo(-20, -25);
    path.lineTo(20, -25);
    path.moveTo(-20, 25);
    path.lineTo(20, 25);
    // Símbolo nuclear
    const r = 18;
    path.moveTo(0, 0);
    path.arc(0, 0, r, 0, Math.PI * 2);
    for (let i = 0; i < 3; i++) {
        const angle = i * (Math.PI * 2 / 3);
        path.moveTo(0, 0);
        path.arc(0, 0, r, angle - 0.5, angle + 0.5, false);
        path.arc(0, 0, r / 2, angle + 0.5, angle - 0.5, true);
        path.closePath();
    }
    return path;
}


// --- FUNCIONES EXPORTADAS DEL NIVEL ---

export function init() {
    console.log("Inicializando lógica del Nivel 10: Carrera Nuclear");

    // Reiniciar distancia y boost ilimitado
    if (estadoJuego) {
        estadoJuego.distanciaRecorrida = 0;
        estadoJuego.unlimitedBoost = false;
        // >>> CORRECCIÓN: Asegurar que el scroll esté activo para este nivel <<<
        // Esto permite que la cámara se mueva con el jugador y no se quede atascado en los bordes.
        estadoJuego.levelFlags.scrollBackground = true;
    }

    levelState = {
        tiempoRestante: 300, // 5 minutos en segundos
        distanciaObjetivo: 5000, // 5 km en metros
        powerUpRecogido: false,
        completado: false,
        fallado: false,
    };

    // Crear y posicionar el barril nuclear
    barrilNuclear = {
        x: jugador.x + 300,
        y: H / 2,
        r: 35,
        path: crearSVGBarril(),
        recogido: false,
        rotacion: 0,
        vRot: 0.5
    };
}

export function update(dt, vx = 0, vy = 0) {
    if (!estadoJuego || levelState.completado || levelState.fallado) return;

    // Actualizar rotación del barril
    if (!barrilNuclear.recogido) {
        barrilNuclear.rotacion += barrilNuclear.vRot * dt;
    }

    // 1. Comprobar si se recoge el barril
    if (!barrilNuclear.recogido) {
        const dist = Math.hypot(jugador.x - barrilNuclear.x, jugador.y - barrilNuclear.y);
        if (dist < jugador.r + barrilNuclear.r) {
            barrilNuclear.recogido = true;
            levelState.powerUpRecogido = true;
            estadoJuego.unlimitedBoost = true;
            estadoJuego.boostEnergia = estadoJuego.boostMaxEnergia; // Rellenar energía al máximo
            S.reproducir('powerup');
            // Activar el sonido de boost si el jugador ya lo está pulsando
            if (estadoJuego.teclasActivas['b'] || estadoJuego.teclasActivas['B']) {
                S.bucle('boost');
            }
        }
    }

    // 2. Si el barril ha sido recogido, el nivel está activo
    if (levelState.powerUpRecogido) {
        // Actualizar temporizador
        levelState.tiempoRestante -= dt;

        // Calcular distancia recorrida
        const forwardSpeed = Math.max(0, vx);
        const boostSpeed = (estadoJuego.boostActivo && vx > 0) ? 400 : 0; // 400 is from WEAPON_CONFIG.boost.fuerza
        const totalHorizontalSpeed = forwardSpeed + boostSpeed;
        
        // El factor de escala (40) es para que la distancia se sienta más como "metros"
        estadoJuego.distanciaRecorrida += totalHorizontalSpeed * dt / 40;


        // Comprobar condiciones de victoria/derrota
        if (estadoJuego.distanciaRecorrida >= levelState.distanciaObjetivo) {
            levelState.completado = true;
            estadoJuego.valorObjetivoNivel = levelState.distanciaObjetivo; // Para que el juego sepa que se cumplió la meta
            console.log("NIVEL 10 COMPLETADO!");
            levelState.tiempoRestante = Math.max(0, levelState.tiempoRestante);
            S.detener('boost');
        } else if (levelState.tiempoRestante <= 0) {
            levelState.fallado = true;
            levelState.tiempoRestante = 0;
            console.log("NIVEL 10 FALLADO!");
            estadoJuego.unlimitedBoost = false;
            S.detener('boost');
            // Aquí se podría llamar a perderJuego()
        }
    }
}

export function draw() {
    // La función draw ahora solo se encarga de dibujar entidades específicas del nivel
    // en el canvas principal (ctx). La información del HUD se maneja en getEstadoMision().
    if (!ctx) return;

    // Dibujar el barril nuclear si no ha sido recogido.
    if (!barrilNuclear.recogido) {
        ctx.save();
        ctx.translate(barrilNuclear.x, barrilNuclear.y);
        ctx.rotate(barrilNuclear.rotacion);
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#FFFF00';
        ctx.shadowBlur = 15;
        ctx.stroke(barrilNuclear.path);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fill(barrilNuclear.path);
        ctx.restore();
    }
}

// Funciones vacías para cumplir la API de niveles
export function onAnimalCazado(tipo) {}
export function onKill(tipo) {}
export function onFallo() {}

export function getEstadoMision() {
    if (!levelState.powerUpRecogido) {
        return { texto: "¡RECOGE EL BARRIL!", progreso: "Para iniciar la carrera nuclear" };
    }

    const minutos = Math.floor(levelState.tiempoRestante / 60);
    const segundos = Math.floor(levelState.tiempoRestante % 60);
    const tiempoStr = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    const distanciaStr = `${Math.floor(estadoJuego.distanciaRecorrida)}m`;

    return {
        texto: `DISTANCIA: ${distanciaStr} / ${levelState.distanciaObjetivo}m`,
        progreso: `TIEMPO RESTANTE: ${tiempoStr}`
    };
}