'use strict';

// =================================================================================
//  0. GESTOR DE ERRORES GLOBAL
// =================================================================================
// Este manejador atrapará cualquier error no capturado en el código,
// lo mostrará en la consola y evitará que el juego se bloquee por completo.
window.onerror = function (message, source, lineno, colno, error) {
    console.error("!! ERROR NO CAPTURADO !!");
    console.error("Mensaje:", message);
    console.error("Fuente:", source);
    console.error("Línea:", lineno, "Columna:", colno);
    console.error("Objeto Error:", error);
    // Para evitar que el navegador muestre su propio diálogo de error
    return true;
};

// =================================================================================
//  1. IMPORTACIONES Y FUNCIONES AUXILIARES GLOBALES
// =================================================================================

// --- Módulos ---
import { CONFIG_NIVELES } from '../levels/config.js';
import * as Weapons from './armas/weapons.js';

// Gestor de niveles desacoplado (inyección de dependencias para eliminar ciclos)
let Levels = {
    initLevel: () => {},
    updateLevel: () => {},
    drawLevel: () => {},
    getEstadoMision: () => null,
    onAnimalCazado: () => {},
    onFallo: () => {},
    onKill: () => {},
    getLevelSpeed: (n = 1, d = 0) => {
        const config = CONFIG_NIVELES[(n || 1) - 1];
        const multi = config ? config.speedMultiplier : 1.0;
        return (260 + (520 - 260) * (d || 0)) * multi;
    },
    CONFIG_NIVELES
};

export function setLevelManager(manager) {
    if (manager) {
        Levels = manager;
        if (!Levels.CONFIG_NIVELES) Levels.CONFIG_NIVELES = CONFIG_NIVELES;
        const originalOnKill = manager.onKill;
        Levels.onKill = (tipo) => {
            verificarFuriaBallenas(tipo);
            if (typeof originalOnKill === 'function') originalOnKill(tipo);
        };
    }
}

export function verificarFuriaBallenas(tipoAnimal) {
    if (tipoAnimal === 'baby_whale') {
        if (S && typeof S.reproducir === 'function') S.reproducir('boss_hit');
        if (Array.isArray(animales)) {
            for (const animal of animales) {
                if (animal.tipo === 'whale' && !animal.isEnraged) {
                    animal.isEnraged = true;
                    animal.vx *= 2.5;
                    if (typeof generarGotasSangre === 'function') {
                        generarGotasSangre(animal.x, animal.y);
                    }
                }
            }
        }
    }
}

// --- Variables para la Galería de Créditos ---
// Puedes agregar más imágenes aquí si tienes más archivos (ej: 'img/imgcreditos/dulce2.jpg')
const a_creditos_imagenes = [
    'img/imgcreditos/dulce.jpg',
    'img/imgcreditos/dulce1.jpg',
    'img/imgcreditos/dulce2.jpg',
    'img/imgcreditos/dulce3.jpg',
    'img/imgcreditos/dulce4.jpg'
];
let a_creditos_intervalo = null;
let a_creditos_imagen_actual = 0;

let offscreenCtx = null;
let offscreenCanvas = null;

// --- OPTIMIZACIÓN Y SISTEMA DE PARTÍCULAS ---
import { SpatialGrid, fastRemove } from './optimization.js';
import {
    particlePool,
    particulas,
    particulasExplosion,
    particulasTinta,
    particulasBurbujas,
    particulasCasquillos,
    whaleDebris,
    particulasPolvoMarino,
    pilotos,
    proyectilesEnemigos,
    trozosHumanos,
    escombrosSubmarino,
    SUBMARINE_DEBRIS_PATHS,
    PILOT_DEBRIS_PATHS,
    WHALE_DEBRIS_PATHS,
    generarParticula,
    actualizarCasquillos,
    generarBurbujaPropulsion,
    generarRafagaBurbujasDisparo,
    generarChorroDeAgua,
    generarExplosion,
    generarNubeDeTinta,
    generarTrozoBallena,
    generarTrozosHumanos,
    generarEscombrosSubmarino,
    generarGotasSangre,
    generarBurbujasDeSangre,
    generarBurbujasEmbestidaTiburom,
    generarHumoDaño,
    setOnHudShake,
    setContextGetters
} from './particles.js';
import { generarAnimal as spawnerGenerarAnimal, setSpawnerContextGetter } from './spawner.js';
import {
    teclas,
    gamepadConectado,
    prevGamepadButtons,
    actualizarGamepad,
    actualizarGamepadMenu,
    actualizarGamepadJuego,
    abrirMenuPausaDesdeMando,
    inicializarEventosInput,
    setInputContextGetter,
    estaSobreUI
} from './input.js';
import {
    triggerHudShake as _triggerHudShake,
    actualizarLiveHUD as _actualizarLiveHUD,
    actualizarHTMLHUD as _actualizarHTMLHUD,
    poblarSelectorDeNiveles as _poblarSelectorDeNiveles,
    actualizarSeleccionNivelVisual as _actualizarSeleccionNivelVisual,
    mostrarVistaMenuPrincipal as _mostrarVistaMenuPrincipal,
    mostrarPantallaGameOver as _mostrarPantallaGameOver,
    ganarJuego as _ganarJuego,
    RANGOS_ASESINO
} from './hud.js';
import {
    dibujarPiloto,
    iniciarPolvoMarino as _iniciarPolvoMarino,
    actualizarPolvoMarino as _actualizarPolvoMarino,
    dibujarPolvoMarino as _dibujarPolvoMarino,
    dibujarCasquillos as _dibujarCasquillos,
    dibujarFondoParallax as _dibujarFondoParallax,
    dibujarMascaraLuz as _dibujarMascaraLuz,
    dibujarAnimales,
    dibujarJugadorSubmarino,
    dibujarEscombrosMundo
} from './renderer.js';

export {
    particlePool,
    particulas,
    particulasExplosion,
    particulasTinta,
    particulasBurbujas,
    particulasCasquillos,
    whaleDebris,
    particulasPolvoMarino,
    pilotos,
    proyectilesEnemigos,
    trozosHumanos,
    escombrosSubmarino,
    SUBMARINE_DEBRIS_PATHS,
    PILOT_DEBRIS_PATHS,
    WHALE_DEBRIS_PATHS,
    generarParticula,
    actualizarCasquillos,
    generarBurbujaPropulsion,
    generarRafagaBurbujasDisparo,
    generarChorroDeAgua,
    generarExplosion,
    generarNubeDeTinta,
    generarTrozoBallena,
    generarTrozosHumanos,
    generarEscombrosSubmarino,
    generarGotasSangre,
    generarBurbujasDeSangre,
    generarBurbujasEmbestidaTiburom,
    generarHumoDaño
};

export const spatialGrid = new SpatialGrid(3000, 2000, 150); // Ajustar tamaño según mundo

/**
 * Inicializa un canvas oculto que se usará para operaciones de renderizado
 * que son costosas, como aplicar tintes a los sprites.
 */
function inicializarCanvasOffscreen() {
    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement('canvas');
        offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
}

/**
 * Dibuja un sprite con un tinte de color. Es mucho más rápido que usar ctx.filter.
 * @param {CanvasImageSource} img La imagen/spritesheet a dibujar.
 * @param {number} sx Source X. @param {number} sy Source Y.
 * @param {number} sWidth Source Width. @param {number} sHeight Source Height.
 * @param {number} dx Destination X. @param {number} dy Destination Y.
 * @param {number} dWidth Destination Width. @param {number} dHeight Destination Height.
 * @param {string} tintColor El color del tinte (e.g., 'rgba(255, 0, 0, 0.5)').
 */
function dibujarSpriteConTinte(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, tintColor) {
    if (!offscreenCtx || !offscreenCanvas) { ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight); return; }
    if (offscreenCanvas.width < sWidth || offscreenCanvas.height < sHeight) { offscreenCanvas.width = sWidth; offscreenCanvas.height = sHeight; }
    offscreenCtx.clearRect(0, 0, sWidth, sHeight);
    offscreenCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    offscreenCtx.globalCompositeOperation = 'source-atop';
    offscreenCtx.fillStyle = tintColor; offscreenCtx.fillRect(0, 0, sWidth, sHeight);
    offscreenCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(offscreenCanvas, 0, 0, sWidth, sHeight, dx, dy, dWidth, dHeight);
}
// --- Funciones Matemáticas y de Utilidad (Módulo utils.js) ---
import { clamp, lerp, cargarImagen, cargarJson } from './utils.js';
export { clamp, lerp, cargarImagen, cargarJson };

export function dificultadBase() {
    if (!estadoJuego || !estadoJuego.enEjecucion) return 0;
    return estadoJuego.tiempoTranscurrido / 150;
}

// =================================================================================
//  2. CONFIGURACIÓN DE LIENZOS (CANVAS) Y REFERENCIAS A LA UI
// =================================================================================

// --- Lienzos (Canvas) ---
// Cada canvas representa una capa del juego para optimizar el renderizado.
const bgCanvas = document.getElementById('bgCanvas'), bgCtx = bgCanvas.getContext('2d', { alpha: false });
export const cvs = document.getElementById('gameCanvas');
export const ctx = cvs.getContext('2d');
const fxCanvas = document.getElementById('fxCanvas'), fx = fxCanvas.getContext('2d');
export const hudCanvas = document.getElementById('hudCanvas');
export const hud = hudCanvas.getContext('2d');
const sonarCanvas = document.getElementById('sonarCanvas'), sonarCtx = sonarCanvas.getContext('2d');

// --- Referencias a Elementos del DOM ---
const liveHudContainer = document.getElementById('live-hud-container');
// Obtenemos todas las referencias a los elementos HTML para manipular la UI.
const overlay = document.getElementById('overlay');
const mainMenu = document.getElementById('mainMenu');
const levelTransition = document.getElementById('levelTransition');
const levelTitle = document.getElementById('levelTitle');
const levelDesc = document.getElementById('levelDesc');
const startBtn = document.getElementById('start');
const restartBtn = document.getElementById('restart');
const titleEl = document.getElementById('gameOverTitle');
const captainImage = document.getElementById('captainImage');
const brandLogo = document.getElementById('brandLogo');
const welcomeMessage = document.getElementById('welcomeMessage');
const promptEl = document.getElementById('prompt');
const finalStats = document.getElementById('finalStats');
const statScore = document.getElementById('statScore');
const statDepth = document.getElementById('statDepth');
const statDistance = document.getElementById('statDistance');
const statSpecimens = document.getElementById('statSpecimens');
const muteBtn = document.getElementById('muteBtn');
const helpBtn = document.getElementById('helpBtn');
const pauseBtn = document.getElementById('pauseBtn');
const infoBtn = document.getElementById('infoBtn');
const cheatBtn = document.getElementById('cheatBtn');
const githubBtn = document.getElementById('githubBtn');
const fsBtn = document.getElementById('fsBtn');
const shareBtn = document.getElementById('shareBtn');
const infoOverlay = document.getElementById('infoOverlay');
const closeInfo = document.getElementById('closeInfo');
const logoHUD = document.getElementById('logoHUD');
const mainExtras = document.getElementById('mainExtras');
const bossHealthContainer = document.getElementById('bossHealthContainer');
const bossHealthBar = document.getElementById('bossHealthBar');
const gameplayHints = document.getElementById('gameplay-hints');
const hudLevelText = document.getElementById('hud-level-text');
const hudObjectiveText = document.getElementById('hud-objective-text');

// --- Referencias a Elementos de Overlay de Desconexión ---
const controllerDisconnectOverlay = document.getElementById('controller-disconnect-overlay');
const resumeWithKeyboardButton = document.getElementById('resume-with-keyboard-btn');
// --- NUEVO: Referencias a Elementos de Prompt de Conexión ---
const controllerConnectPrompt = document.getElementById('controller-connect-prompt');
const useGamepadButton = document.getElementById('use-gamepad-btn');
const stayOnKeyboardButton = document.getElementById('stay-on-keyboard-btn');

// --- Referencias a Elementos del HUD dinámico (NUEVOS) ---
const statScoreValue = document.getElementById('statScoreValue');
const statDepthValue = document.getElementById('statDepthValue');
const statSpeedValue = document.getElementById('statSpeedValue'); // >>> NUEVO: Para la velocidad
const statDistanceValue = document.getElementById('statDistanceValue'); // >>> NUEVO: Para la distancia recorrida
const statRecordValue = document.getElementById('statRecordValue');
const statLivesContainer = document.getElementById('statLivesContainer');
const statWeaponValue = document.getElementById('statWeaponValue');
const statTorpedoValue = document.getElementById('statTorpedoValue');
const statAssassinValue = document.getElementById('statAssassinValue');
const boostProgressBar = document.getElementById('boostProgressBar');
const laserProgressBar = document.getElementById('laserProgressBar');
const shieldProgressBar = document.getElementById('shieldProgressBar');



const mainMenuContent = document.getElementById('mainMenuContent');
const levelSelectContent = document.getElementById('levelSelectContent');
const levelSelectBtn = document.getElementById('levelSelectBtn');
const levelSelectorContainer = document.getElementById('level-selector-container');
const backToMainBtn = document.getElementById('backToMainBtn');
const levelSelectImage = document.getElementById('levelSelectImage');
const infoAnimCanvas = document.getElementById('infoAnimCanvas');
const infoAnimCtx = infoAnimCanvas ? infoAnimCanvas.getContext('2d') : null;
let animarSubmarino = false;

function actualizarIconos() {
    // Esta función cambia la apariencia del botón de silencio
    // para reflejar si el sonido está activado o no.
    if (!muteBtn) return;
    const slash = document.getElementById('muteSlash');
    if (S.estaSilenciado()) {
        muteBtn.classList.add('muted');
        if (slash) slash.style.display = 'block';
    } else {
        muteBtn.classList.remove('muted');
        if (slash) slash.style.display = 'none';
    }
}

// =================================================================================
//  3. GESTOR DE AUDIO (Módulo audio.js)
// =================================================================================
import { S, THEME_SONG, GAME_PLAYLIST } from './audio.js';
export { S, THEME_SONG, GAME_PLAYLIST };

// =================================================================================
//  4. GESTIÓN DE DATOS DEL JUGADOR (Módulo storage.js)
// =================================================================================
import {
    CLAVE_PUNTUACION,
    CLAVE_NIVEL_MAX,
    getPuntuacionMaxima,
    setPuntuacionMaxima,
    getNivelMaximoAlcanzado,
    setNivelMaximoAlcanzado,
    guardarPuntuacionMaxima as _guardarPuntuacionMaxima,
    guardarNivelMaximo as _guardarNivelMaximo
} from './storage.js';

let puntuacionMaxima = getPuntuacionMaxima();
let nivelMaximoAlcanzado = getNivelMaximoAlcanzado();

function guardarPuntuacionMaxima() {
    setPuntuacionMaxima(puntuacionMaxima);
    _guardarPuntuacionMaxima();
}

function guardarNivelMaximo() {
    const maxNivel = Levels && Levels.CONFIG_NIVELES ? Levels.CONFIG_NIVELES.length : 10;
    _guardarNivelMaximo(estadoJuego ? estadoJuego.nivel : 1, maxNivel);
    nivelMaximoAlcanzado = getNivelMaximoAlcanzado();
}

// =================================================================================
//  5. CARGA DE RECURSOS DEL JUEGO (Módulo assets.js)
// =================================================================================
import {
    robotImg,
    robotListo,
    spriteAncho,
    spriteAlto,
    robotEscala,
    HECTOR_SPRITE_DATA,
    HECTOR_FRAME_KEYS,
    dibujarHector,
    criaturasImg,
    criaturasListas,
    cFrameAncho,
    cFrameAlto,
    cFilas,
    FONDOS_TEMAS,
    cargarTema,
    setOnDefaultFondoCargado,
    MIERDEI_SPRITE_DATA,
    mierdeiImg,
    mierdeiListo,
    SHARK_SPRITE_DATA,
    sharkImg,
    sharkListo,
    WHALE_SPRITE_DATA,
    whaleImg,
    whaleListo,
    BABYWHALE_SPRITE_DATA,
    babyWhaleImg,
    babyWhaleListo,
    ORCA_SPRITE_DATA,
    orcaImg,
    orcaListo
} from './assets.js';

export {
    robotImg,
    robotListo,
    spriteAncho,
    spriteAlto,
    robotEscala,
    HECTOR_SPRITE_DATA,
    HECTOR_FRAME_KEYS,
    dibujarHector,
    criaturasImg,
    criaturasListas,
    cFrameAncho,
    cFrameAlto,
    cFilas,
    FONDOS_TEMAS,
    cargarTema,
    MIERDEI_SPRITE_DATA,
    mierdeiImg,
    mierdeiListo,
    SHARK_SPRITE_DATA,
    sharkImg,
    sharkListo,
    WHALE_SPRITE_DATA,
    whaleImg,
    whaleListo,
    BABYWHALE_SPRITE_DATA,
    babyWhaleImg,
    babyWhaleListo,
    ORCA_SPRITE_DATA,
    orcaImg,
    orcaListo
};

// --- Estado de Renderizado Parallax y Fondos ---
let bgImg = null, bgListo = false, bgAncho = 0, bgAlto = 0, bgOffset = 0;
let fgImg = null, fgListo = false, fgAncho = 0, fgAlto = 0, fgOffset = 0;

export let bgOffsetY = 0;
export let fgOffsetY = 0;
export function setBgOffsetY(v) { bgOffsetY = v; }
export function setFgOffsetY(v) { fgOffsetY = v; }

const BG_DRIFT_SPEED = 8;
const FG_DRIFT_SPEED = 25;

setOnDefaultFondoCargado(() => {
    if (FONDOS_TEMAS['default'] && FONDOS_TEMAS['default'].back) {
        bgImg = FONDOS_TEMAS['default'].back;
        bgListo = true;
        bgAncho = bgImg.width;
        bgAlto = bgImg.height;
        if (estadoJuego) dibujarFondoParallax();
    }
    if (FONDOS_TEMAS['default'] && FONDOS_TEMAS['default'].front) {
        fgImg = FONDOS_TEMAS['default'].front;
        fgListo = true;
        fgAncho = fgImg.width;
        fgAlto = fgImg.height;
    }
});

let thrusterPattern = null;
let thrusterPatternReady = false;
let thrusterPatternOffsetX = 0;

let propellerImg = null;
let propellerReady = false;
let propellerRotation = 0;
let propellerCurrentSpeed = 0;

// =================================================================================
//  6. GEOMETRÍA DEL JUEGO Y SISTEMA DE PARTÍCULAS
// =================================================================================

// --- Geometría y Carriles ---
export let W = innerWidth, H = innerHeight;
export const NUM_CARRILES = 5;
export let carriles = [];
function calcularCarriles() {
    carriles.length = 0;
    const minY = H * 0.18, maxY = H * 0.82;
    for (let i = 0; i < NUM_CARRILES; i++) {
        const t = i / (NUM_CARRILES - 1);
        carriles.push(minY + t * (maxY - minY));
    }
}

// --- Sistema de Partículas (Módulo particles.js) ---
setContextGetters(() => jugador, () => estadoJuego, () => ({ W, H }));
setOnHudShake((intensity) => { if (typeof triggerHudShake === 'function') triggerHudShake(intensity); });

function actualizarParticulas(dt) {
    for (let arr of [particulas, particulasExplosion, particulasTinta]) {
        for (let i = arr.length - 1; i >= 0; i--) {
            const p = arr[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; p.tw += dt * 2.0;

            if (arr === particulas) {
                // Las partículas de ambiente se reciclan al salir de pantalla
                if (p.x < -8 || p.y < -8) { p.x = W + 10 + Math.random() * 20; p.y = H * Math.random(); }
            } else {
                if (p.vida <= 0) {
                    p.active = false;
                    particlePool.release(p);
                    fastRemove(arr, i);
                }
            }
        }
    }
    // Bucle separado para las burbujas para manejar su lógica especial (flotación y colisión)
    for (let i = particulasBurbujas.length - 1; i >= 0; i--) {
        const p = particulasBurbujas[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; p.vy -= 40 * dt; p.vx *= 0.98;

        // Lógica de colisión para el chorro dañino de la ballena
        if (p.esChorroDañino && Math.hypot(jugador.x - p.x, jugador.y - p.y) < jugador.r + p.r) {
            infligirDanoJugador(1, 'choque_ligero');
            p.vida = 0; // La burbuja explota al impactar
        }

        if (p.vida <= 0 || p.y < -p.r) {
            p.active = false;
            particlePool.release(p);
            fastRemove(particulasBurbujas, i);
        }
    }
}



// =================================================================================
//  7. FUNCIONES DE ACCIÓN Y ESTADO DEL JUEGO
// =================================================================================

// --- Funciones de Recompensa y Power-ups ---
export function limpiarTodosLosAnimales() {
    animales.forEach(a => generarExplosion(a.x, a.y, '#aaffff'));
    // Modificamos el array existente en lugar de crear uno nuevo. Es más seguro.
    animales.length = 0;
}
export function agregarPuntos(cantidad) {
    if (estadoJuego) estadoJuego.puntuacion += cantidad;
}
export function activarSlowMotion(duracion) {
    if (estadoJuego) {
        estadoJuego.velocidadJuego = 0.5;
        estadoJuego.slowMoTimer = duracion;
    }
}

export function triggerHudShake(intensity) {
    _triggerHudShake(intensity, estadoJuego, liveHudContainer);
}
/**
 * Centraliza la lógica de aplicar daño al jugador, teniendo en cuenta el escudo.
 * @param {number} [cantidad=1] - La cantidad de vidas a restar.
 * @param {string} [tipoSonido='choque'] - El sonido a reproducir si el jugador recibe daño.
 * @returns {boolean} - Devuelve `true` si el jugador recibió daño, `false` si fue bloqueado por el escudo.
 */
export function infligirDanoJugador(cantidad = 1, tipoSonido = 'choque') {
    if (!estadoJuego || !estadoJuego.enEjecucion) return false;

    // Si el escudo está activo, absorbe el daño.
    if (estadoJuego.shieldActivo) {
        estadoJuego.shieldEnergia -= Weapons.WEAPON_CONFIG.shield.danoAbsorbido * cantidad;
        estadoJuego.shieldHitTimer = 0.4; // Duración del efecto de impacto
        S.reproducir('choque_ligero'); // Sonido de impacto en el escudo

        if (estadoJuego.shieldEnergia <= 0) {
            estadoJuego.shieldEnergia = 0;
            estadoJuego.shieldActivo = false;
            estadoJuego.shieldEnfriamiento = Weapons.WEAPON_CONFIG.shield.enfriamiento;
            S.detener('laser_beam'); // El escudo usa el sonido del láser
            S.reproducir('boss_hit'); // Sonido de escudo roto
        }
        triggerHudShake(8 * cantidad); // Sacudida ligera por impacto en el escudo
        S.triggerVibration(100, 0.8, 0.2); // Vibración de impacto en escudo
        return false; // Daño bloqueado
    }

    // Si no hay escudo, el jugador recibe el daño.
    const antes = estadoJuego.vidas;
    if (estadoJuego.vidas > 0) estadoJuego.vidas = Math.max(0, estadoJuego.vidas - cantidad);
    if (estadoJuego.vidas < antes) { estadoJuego.animVida = 0.6; S.reproducir(tipoSonido); S.triggerVibration(300, 1.0, 1.0); }
    if (estadoJuego.vidas <= 0) {
        perderJuego();
    } else {
        triggerHudShake(20 * cantidad); // Sacudida fuerte por daño al casco
    }
    return true; // Daño aplicado
}

// --- Estado Principal y Entidades ---
export let estadoJuego = null, jugador, animales, escombros;
setSpawnerContextGetter(() => ({ W, H, estadoJuego, animales, velocidadActual }));
export { teclas, gamepadConectado, prevGamepadButtons, estaSobreUI };
let modoSuperposicion = 'menu'; let estabaCorriendoAntesCreditos = false;
let __iniciando = false;
let menuFlyBy = null; // Para la animación del submarino en el menú
const INCLINACION_MAX = Math.PI / 24;
const JUGADOR_VELOCIDAD = 350;
export { RANGOS_ASESINO };

const SHARK_ANIMATION_SPEED = 0.05; // Segundos por frame. 0.05 = 20 FPS
const WHALE_ANIMATION_SPEED = 0.08; // Un poco más lento para la ballena
const MIERDEi_ANIMATION_SPEED = 0.06;
const BABYWHALE_ANIMATION_SPEED = 0.07;
const ORCA_ANIMATION_SPEED = 0.06;
import {
    SONAR_SWEEP_SPEED,
    actualizarSonarPings as _actualizarSonarPings,
    dibujarSonar as _dibujarSonar
} from './sonar.js';
export { SONAR_SWEEP_SPEED };

// =================================================================================
// =================================================================================
//  SISTEMA DE IA AVANZADA PARA HABITANTES MARINOS (Módulo ai.js)
// =================================================================================
import {
    CARDUMEN_RADIO_COHESION,
    CARDUMEN_RADIO_SEPARACION,
    CARDUMEN_RADIO_ALINEACION,
    CARDUMEN_RADIO_HUIDA,
    CARDUMEN_FUERZA_COHESION,
    CARDUMEN_FUERZA_SEPARACION,
    CARDUMEN_FUERZA_ALINEACION,
    CARDUMEN_FUERZA_HUIDA,
    CARDUMEN_VELOCIDAD_MAX,
    SHARK_ANGULO_FLANQUEO,
    SHARK_RADIO_ACECHO,
    ORCA_RADIO_CERCO,
    calcularFuerzasCardumen as _calcularFuerzasCardumen,
    calcularFuerzaHuida as _calcularFuerzaHuida,
    alertarPecesCercanos as _alertarPecesCercanos,
    calcularAnguloFlanqueoTiburon,
    calcularPosicionCercoOrca
} from './ai.js';

export function calcularFuerzasCardumen(pez) {
    return _calcularFuerzasCardumen(pez, animales);
}
export function calcularFuerzaHuida(pez) {
    return _calcularFuerzaHuida(pez, jugador, animales, estadoJuego);
}
export function alertarPecesCercanos(pezAsustado) {
    return _alertarPecesCercanos(pezAsustado, animales);
}
export {
    CARDUMEN_RADIO_COHESION,
    CARDUMEN_RADIO_SEPARACION,
    CARDUMEN_RADIO_ALINEACION,
    CARDUMEN_RADIO_HUIDA,
    CARDUMEN_FUERZA_COHESION,
    CARDUMEN_FUERZA_SEPARACION,
    CARDUMEN_FUERZA_ALINEACION,
    CARDUMEN_FUERZA_HUIDA,
    CARDUMEN_VELOCIDAD_MAX,
    SHARK_ANGULO_FLANQUEO,
    SHARK_RADIO_ACECHO,
    ORCA_RADIO_CERCO,
    calcularAnguloFlanqueoTiburon,
    calcularPosicionCercoOrca
};

// --- Funciones de Control del Juego ---
function reiniciar(nivelDeInicio = 1) {
    estadoJuego = {
        faseJuego: 'menu', enEjecucion: false, rescatados: 0, puntuacion: 0, profundidad_m: 0, vidas: 30, animVida: 0, velocidad: 260, tiempoTranscurrido: 0, bloqueoEntrada: 0.2,
        faseLuz: 'off', luzVisible: false, timerLuz: 0, cambiosLuz: 0,
        enfriamientoTorpedo: 0,
        nivel: nivelDeInicio,
        valorObjetivoNivel: 0,
        armaCambiandoTimer: 0,
        jefe: null,
        chunkGenerationCooldown: 0, // Para optimizar trozos de carne
        bloodGenerationCooldown: 0, // Para optimizar gotas de sangre
        proyectilesTinta: [],
        armaActual: estadoJuego ? estadoJuego.armaActual : 'garra', // Preservar arma
        enfriamientoArma: 0,
        asesinatos: 0,
        teclasActivas: {},
        gatlingState: {
            isSpinning: false,
            isFiring: false,
            spinTimer: 0,
            fireTimer: 0,
            bulletTimer: 0,
            isDeployed: false,
            isDeploying: false,
            isRetracting: false,
            deployProgress: 0,
        },
        boostActivo: false, // prettier-ignore
        boostEnergia: 100,
        boostMaxEnergia: 100,
        boostEnfriamiento: 0,
        unlimitedBoost: false, // Para Nivel 10
        velocidad_actual: 0, // Velocidad actual en px/s
        velocidad_mostrada_kmh: 0, // Para el efecto del tacómetro
        distanciaRecorrida: 0, // Para Nivel 10
        laserEnergia: 100,
        laserMaxEnergia: 100,
        laserActivo: false,
        velocidadJuego: 1.0,
        slowMoTimer: 0,
        levelFlags: {}, // >>> CAMBIO CLAVE <<< Objeto para que los niveles comuniquen flags al motor (ej: no mover el fondo)
        shieldActivo: false,
        shieldEnergia: 100,
        shieldMaxEnergia: 100,
        shieldEnfriamiento: 0,
        shieldHitTimer: 0,
        screenShake: 0,
        cameraZoom: 1.0,
        sonarPingTimer: 0,
        sonarActivo: true,
        sonarToggleCooldown: 0,
        hudShakeX: 0,
        juegoPausadoPorConexionMando: false, // <-- NUEVO
        juegoPausadoPorDesconexion: false,
        hudShakeY: 0,
        hudShakeIntensity: 0,
        nivelSeleccionadoIndex: 0, // Para el menú de niveles con mando
        sonarUpdateTimer: 0, // Para optimización del sonar
        sonarPings: [],      // Para optimización del sonar
        gamepadStickX: 0, // Para el stick del mando en menús
        // --- NUEVO: Propiedades para optimización del HUD ---
        _prevPuntuacion: -1,
        _prevProfundidad: -1,
        _prevDistancia: -1,
        _prevVelocidad: -1,
        _prevVidas: -1,
        _prevArma: '',
        _prevTorpedo: '',
        _prevAsesinatos: -1,
        _prevBoostPercent: -1,
        _prevLaserPercent: -1,
        _prevShieldPercent: -1,
        _prevJefeHp: -1,
        _prevMisionTexto: '',
        _prevMisionProgreso: '',
    };
    estadoJuego.cameraX = 0;
    estadoJuego.cameraY = 0;
    estadoJuego.prevCameraX = 0;

    pilotos = [];
    trozosHumanos = [];
    delete estadoJuego.darknessOverride; // Limpiamos la oscuridad del nivel 2, si existiera.

    jugador = { x: W * 0.18, y: H / 2, r: 26, garra: null, vy: 0, inclinacion: 0, frame: 0, timerFrame: 0 };
    jugador.direccion = 1; // 1 para derecha, -1 para izquierda
    
    // Configurar tema del nivel inicial
    const configInicial = Levels.CONFIG_NIVELES[nivelDeInicio - 1];
    configurarTemaFondo(configInicial ? configInicial.theme : 'default');
    
    Levels.initLevel(nivelDeInicio);

    escombros = [];
    animales = [];
    proyectilesEnemigos = [];
    particulasCasquillos = [];
    Weapons.initWeapons();
    whaleDebris = [];
    particulasTinta = [];
    particulasPolvoMarino = [];

    autoSize();
    autoSize();
    // iniciarParticulas(); // REMOVIDO: Ahora usamos un ObjectPool que se autogestiona
    iniciarPolvoMarino();
    if (gameplayHints) gameplayHints.classList.remove('visible');
}

function velocidadActual() {
    if (!estadoJuego || !estadoJuego.enEjecucion) return 120;
    return Levels.getLevelSpeed(estadoJuego.nivel, dificultadBase());
}
function puntosPorRescate() { const p0 = clamp(estadoJuego.tiempoTranscurrido / 180, 0, 1); return Math.floor(lerp(100, 250, p0)); }

// --- Generación de Enemigos (Módulo spawner.js) ---
export const generarAnimal = (esEsbirroJefe = false, tipoForzado = null, overrides = {}, direccion = -1) => {
    return spawnerGenerarAnimal(esEsbirroJefe, tipoForzado, overrides, direccion);
};

// --- Acciones del Jugador (Disparos) ---
function disparar() {
    const fireContext = {
        estadoJuego,
        jugador,
        S,
        W,
        generarRafagaBurbujasDisparo,
        generarCasquillo,
        Levels,
        triggerVibration: S.triggerVibration
    };
    Weapons.disparar(fireContext);
}

function lanzarTorpedo() {
    const torpedoContext = {
        estadoJuego,
        jugador,
        S,
        generarCasquillo,
        triggerVibration: S.triggerVibration
    };
    Weapons.lanzarTorpedo(torpedoContext);
}

// =================================================================================
//  8. BUCLE PRINCIPAL DE ACTUALIZACIÓN (UPDATE)
// =================================================================================

/**
 * Actualiza las criaturas decorativas del menú principal.
 * @param {number} dt - Delta Time.
 */
function actualizarCriaturasMenu(dt) {
    if (!estadoJuego) return;
    // Mover criaturas del menú (que están en el array 'animales')
    for (let i = animales.length - 1; i >= 0; i--) {
        const a = animales[i];

        if (a.isChaser) continue; // Los tiburones perseguidores se actualizan en `actualizarAnimacionMenu`
        // Usar un movimiento sinusoidal simple para que se sientan más naturales
        a.x += a.vx * dt;
        a.y += Math.sin(estadoJuego.tiempoTranscurrido * 2 + a.semillaFase) * 40 * dt;

        // --- Animación de frame y estela de burbujas (específico por tipo) ---
        a.timerFrame += dt;

        if (a.tipo === 'whale') {
            if (a.timerFrame >= WHALE_ANIMATION_SPEED) {
                a.timerFrame -= WHALE_ANIMATION_SPEED;
                if (WHALE_SPRITE_DATA) {
                    a.frame = (a.frame + 1) % WHALE_SPRITE_DATA.frames.length;
                }
            }
            // Estela de burbujas
            if (Math.random() < 0.25) {
                const tailX = a.x + a.w / 2.5;
                const tailY = a.y + (Math.random() - 0.5) * (a.h * 0.3);
                generarParticula(particulasBurbujas, {
                    x: tailX, y: tailY,
                    vx: 20 + Math.random() * 30,
                    vy: (Math.random() - 0.5) * 20 - 15,
                    r: Math.random() * 2.5 + 1, vida: 1.2 + Math.random() * 1.0, color: ''
                });
            }
        } else if (a.tipo === 'baby_whale') {
            if (a.timerFrame >= BABYWHALE_ANIMATION_SPEED) {
                a.timerFrame -= BABYWHALE_ANIMATION_SPEED;
                if (BABYWHALE_SPRITE_DATA) {
                    a.frame = (a.frame + 1) % BABYWHALE_SPRITE_DATA.frames.length;
                }
            }
            // Estela de burbujas para la cría
            if (Math.random() < 0.2) {
                const tailX = a.x + a.w / 2.2;
                const tailY = a.y + (Math.random() - 0.5) * (a.h * 0.25);
                generarParticula(particulasBurbujas, { x: tailX, y: tailY, vx: 15 + Math.random() * 25, vy: (Math.random() - 0.5) * 15 - 10, r: Math.random() * 1.8 + 0.8, vida: 1.0 + Math.random() * 0.8, color: '' });
            }
        } else if (a.tipo === 'orca') {
            // Estela de burbujas para la orca
            if (Math.random() < 0.25) {
                const tailX = a.x + a.w / 2;
                const tailY = a.y + (Math.random() - 0.5) * (a.h * 0.15);
                generarParticula(particulasBurbujas, { x: tailX, y: tailY, vx: 35 + Math.random() * 35, vy: (Math.random() - 0.5) * 25 - 10, r: Math.random() * 2.2 + 1.2, vida: 1.0 + Math.random() * 0.8, color: '' });
            }
        } else if (a.tipo === 'shark') {
            if (a.timerFrame >= SHARK_ANIMATION_SPEED) {
                a.timerFrame -= SHARK_ANIMATION_SPEED;
                if (SHARK_SPRITE_DATA) {
                    a.frame = (a.frame + 1) % SHARK_SPRITE_DATA.frames.length;
                }
            }
            // Estela de burbujas para el tiburón
            if (Math.random() < 0.1) {
                const tailX = a.x + a.w / 2;
                const tailY = a.y + (Math.random() - 0.5) * (a.h * 0.1);
                generarParticula(particulasBurbujas, { x: tailX, y: tailY, vx: 30 + Math.random() * 30, vy: (Math.random() - 0.5) * 25 - 10, r: Math.random() * 2.0 + 1.0, vida: 0.9 + Math.random() * 0.7, color: '' });
            }
        } else { // Criaturas normales ('normal', 'rojo', etc.)
            if (a.timerFrame >= 0.2) {
                a.timerFrame -= 0.2;
                a.frame ^= 1;
            }
            // Estela de burbujas
            if (Math.random() < 0.15) {
                const tailX = a.x + a.w / 2;
                const tailY = a.y;
                generarParticula(particulasBurbujas, {
                    x: tailX, y: tailY,
                    vx: 20 + Math.random() * 20,
                    vy: (Math.random() - 0.5) * 20 - 15,
                    r: Math.random() * 1.5 + 0.5,
                    vida: 0.8 + Math.random() * 0.7,
                    color: ''
                });
            }
        }

        // Reciclar si sale de la pantalla para mantener el ambiente vivo
        // Pero solo si no hay demasiados animales (límite para un ambiente marino realista)
        if (a.x < -a.w) {
            animales.splice(i, 1);
            const MAX_CRIATURAS_MENU = 8; // Límite para un ambiente marino más natural
            if (modoSuperposicion === 'menu' && !__iniciando && animales.length < MAX_CRIATURAS_MENU) {
                const tiposMenu = ['normal'];
                if (sharkListo) tiposMenu.push('shark');
                if (whaleListo) tiposMenu.push('whale');
                if (orcaListo) tiposMenu.push('orca');
                const tipoAleatorio = tiposMenu[Math.floor(Math.random() * tiposMenu.length)];
                // Generar el nuevo animal fuera de la pantalla para que entre suavemente
                generarAnimal(false, tipoAleatorio, { y: Math.random() * H });
            }
        }
    }
}

/**
 * Actualiza la animación del submarino que cruza la pantalla en el menú.
 * @param {number} dt - Delta Time.
 */
function actualizarAnimacionMenu(dt) {
    if (!menuFlyBy) return;

    if (menuFlyBy.active) {
        menuFlyBy.x += menuFlyBy.vx * dt;
        // Generar una estela de burbujas
        if (Math.random() < 0.8) {
            const bubbleX = menuFlyBy.x - (40 * Math.sign(menuFlyBy.vx));
            generarBurbujaPropulsion(bubbleX, menuFlyBy.y, false);
        }

        // Lógica de disparo defensivo
        menuFlyBy.fireCooldown -= dt;
        if (menuFlyBy.fireCooldown <= 0) {
            menuFlyBy.fireCooldown = 0.4 + Math.random() * 0.5; // Resetear cooldown

            // Disparar hacia atrás
            const fireDirection = -Math.sign(menuFlyBy.vx);
            const px = menuFlyBy.x + (fireDirection * 50); // Desde la parte trasera del submarino
            const py = menuFlyBy.y;

            S.reproducir('shotgun');
            generarRafagaBurbujasDisparo(px, py, false);

            // Crear proyectiles solo visuales
            for (let i = 0; i < 8; i++) {
                const angle = (fireDirection > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.8;
                const speed = 800 + Math.random() * 400;
                Weapons.proyectiles.push({
                    x: px, y: py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    w: 8, h: 3,
                    color: '#ffb733',
                    vida: 0.5 + Math.random() * 0.3,
                    isMenuEffect: true // Bandera para evitar colisiones
                });
            }
        }

        // Actualizar depredadores perseguidores
        for (const shark of menuFlyBy.chasingSharks) {
            shark.x += shark.vx * dt;
            shark.y = lerp(shark.y, menuFlyBy.y, dt * 2.0); // Seguir suavemente en el eje Y
            shark.timerFrame += dt;
            
            const animSpeed = shark.tipo === 'orca' ? ORCA_ANIMATION_SPEED : SHARK_ANIMATION_SPEED;
            const spriteData = shark.tipo === 'orca' ? ORCA_SPRITE_DATA : SHARK_SPRITE_DATA;
            if (shark.timerFrame >= animSpeed) {
                shark.timerFrame -= animSpeed;
                if (spriteData) {
                    shark.frame = (shark.frame + 1) % spriteData.frames.length;
                }
            }
            
            // Generar estela si son orcas
            if (shark.tipo === 'orca' && Math.random() < 0.2) {
                generarParticula(particulasBurbujas, { x: shark.x - Math.sign(shark.vx)*20, y: shark.y + (Math.random() - 0.5) * 20, vx: shark.vx * 0.2, vy: (Math.random() - 0.5) * 20, r: Math.random() * 2 + 1, vida: 0.5 + Math.random() * 0.5, color: '' });
            }
        }

        // Asustar a las criaturas cercanas
        for (const a of animales) {
            const dist = Math.hypot(a.x - menuFlyBy.x, a.y - menuFlyBy.y);
            if (dist < 250) { // Si el submarino está cerca
                // Empujar a la criatura para que se aleje
                const angle = Math.atan2(a.y - menuFlyBy.y, a.x - menuFlyBy.x);
                a.x += Math.cos(angle) * 200 * dt;
                a.y += Math.sin(angle) * 200 * dt;
            }
        }

        // Desactivar cuando sale de la pantalla relativa a la cámara
        const currentCamX = estadoJuego ? estadoJuego.cameraX : 0;
        if ((menuFlyBy.vx > 0 && menuFlyBy.x > currentCamX + W + 200) || (menuFlyBy.vx < 0 && menuFlyBy.x < currentCamX - 200)) {
            menuFlyBy.active = false;
            menuFlyBy.cooldown = 8.0 + Math.random() * 10; // Enfriamiento de 8 a 18 segundos

            // Limpiar los tiburones perseguidores que queden
            for (const shark of menuFlyBy.chasingSharks) {
                const indexInAnimales = animales.indexOf(shark);
                if (indexInAnimales > -1) {
                    animales.splice(indexInAnimales, 1);
                }
            }
            menuFlyBy.chasingSharks = [];
        }
    } else {
        if (!robotListo || !sharkListo) return; // Esperar a que las imágenes estén cargadas en la web
        menuFlyBy.cooldown -= dt;
        if (menuFlyBy.cooldown <= 0) {
            menuFlyBy.active = true;
            const currentCamX = estadoJuego ? estadoJuego.cameraX : 0;
            const currentCamY = estadoJuego ? estadoJuego.cameraY : 0;
            const desdeIzquierda = Math.random() > 0.5;
            menuFlyBy.vx = (desdeIzquierda ? 1 : -1) * (900 + Math.random() * 500); // Muy rápido
            menuFlyBy.x = desdeIzquierda ? currentCamX - 200 : currentCamX + W + 200;
            menuFlyBy.y = currentCamY + H * 0.2 + Math.random() * H * 0.6; // Altura aleatoria
            menuFlyBy.rotation = (Math.random() - 0.5) * 0.25; // Inclinación aleatoria
            S.reproducir('torpedo'); // Sonido de "whoosh"

            // --- ¡NUEVO! Generar perseguidores ---
            menuFlyBy.chasingSharks = [];
            menuFlyBy.fireCooldown = 0.1; // Disparar casi de inmediato
            
            // 30% de probabilidad de que sean Orcas en lugar de tiburones
            menuFlyBy.chaserType = (orcaListo && Math.random() < 0.3) ? 'orca' : 'shark';
            
            if ((menuFlyBy.chaserType === 'shark' && sharkListo) || (menuFlyBy.chaserType === 'orca' && orcaListo)) {
                const numChasers = 2 + Math.floor(Math.random() * 2); // 2 o 3 persiguiendo
                for (let i = 0; i < numChasers; i++) {
                    const chX = menuFlyBy.x - (Math.sign(menuFlyBy.vx) * (150 + i * 80 + Math.random() * 50));
                    const chY = menuFlyBy.y + (Math.random() - 0.5) * 200;

                    const chaser = {
                        x: chX, y: chY,
                        vx: menuFlyBy.vx * (0.85 + Math.random() * 0.1), // Un poco más lentos
                        vy: 0, 
                        r: menuFlyBy.chaserType === 'orca' ? 60 : 50, 
                        w: menuFlyBy.chaserType === 'orca' ? 160 : 128, 
                        h: menuFlyBy.chaserType === 'orca' ? 160 : 128,
                        capturado: false, frame: 0, timerFrame: 0,
                        semillaFase: Math.random() * Math.PI * 2,
                        tipo: menuFlyBy.chaserType,
                        isChaser: true // Bandera para identificarlos
                    };
                    animales.push(chaser); // Añadir al array principal para que se dibujen
                    menuFlyBy.chasingSharks.push(chaser);
                }
            }
        }
    }
}
// Esta es la función más importante. Se ejecuta en cada frame y actualiza el estado de todo el juego.
function actualizar(dt) {
    if (!estadoJuego || !estadoJuego.enEjecucion) return;

    // Guardar la posición de la cámara del frame anterior para calcular el delta del parallax.
    estadoJuego.prevCameraX = estadoJuego.cameraX;

    // --- Determinar si se usa el sistema de cámara para este nivel ---
    const usaCamera = estadoJuego.levelFlags.scrollBackground !== false;

    // --- Actualización de Timers y Estado General ---
    estadoJuego.bloqueoEntrada = Math.max(0, estadoJuego.bloqueoEntrada - dt);
    if (estadoJuego.enfriamientoTorpedo > 0) estadoJuego.enfriamientoTorpedo -= dt;
    if (estadoJuego.armaCambiandoTimer > 0) estadoJuego.armaCambiandoTimer -= dt;
    if (estadoJuego.enfriamientoArma > 0) estadoJuego.enfriamientoArma -= dt;
    if (estadoJuego.chunkGenerationCooldown > 0) estadoJuego.chunkGenerationCooldown -= dt;
    if (estadoJuego.bloodGenerationCooldown > 0) estadoJuego.bloodGenerationCooldown -= dt;
    estadoJuego.teclasActivas = teclas;

    // --- LÓGICA DE PROFUNDIDAD CORREGIDA ---
    // La profundidad ahora se basa en la posición Y del jugador, no en el tiempo.
    // Esto hace que solo cambie cuando el jugador se mueve verticalmente.
    const MAX_PROFUNDIDAD = 4000; // Profundidad máxima en metros para el fondo del mapa.
    estadoJuego.profundidad_m = Math.floor((jugador.y / H) * MAX_PROFUNDIDAD);

    // --- Procesamiento de la Entrada del Jugador (Movimiento) ---
    let vx = 0, vy = 0;
    if (teclas['ArrowUp']) vy -= 1;
    if (teclas['ArrowDown']) vy += 1;
    if (teclas['ArrowLeft']) vx -= 1;
    if (teclas['ArrowRight']) vx += 1;
    const len = Math.hypot(vx, vy);

    if (len > 0) {
        vx = (vx / len) * JUGADOR_VELOCIDAD;
        vy = (vy / len) * JUGADOR_VELOCIDAD;
        const isLevel5 = estadoJuego.nivel === 5;
        // La posición de las burbujas debe considerar la inclinación y dirección
        const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
        const finalAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);
        const localX = -40; // Detrás del centro del submarino
        const localY = 32;  // Abajo hacia la tobera de escape

        let burbujaX, burbujaY;
        if (isLevel5) {
            burbujaX = jugador.x + localX * Math.cos(finalAngle) - localY * Math.sin(finalAngle);
            burbujaY = jugador.y + localX * Math.sin(finalAngle) + localY * Math.cos(finalAngle);
        } else {
            const inc = jugador.inclinacion;
            if (jugador.direccion === 1) {
                burbujaX = jugador.x + localX * Math.cos(inc) - localY * Math.sin(inc);
                burbujaY = jugador.y + localX * Math.sin(inc) + localY * Math.cos(inc);
            } else {
                burbujaX = jugador.x - localX * Math.cos(inc) + localY * Math.sin(inc);
                burbujaY = jugador.y + localX * Math.sin(inc) + localY * Math.cos(inc);
            }
        }
        generarBurbujaPropulsion(burbujaX, burbujaY, isLevel5, -jugador.direccion);
    }

    // --- LÓGICA DE VELOCIDAD ACTUAL ---
    let currentSpeed = 0;
    if (len > 0) { // Si hay input de movimiento
        currentSpeed = JUGADOR_VELOCIDAD;
        if (estadoJuego.boostActivo) {
            currentSpeed += Weapons.WEAPON_CONFIG.boost.fuerza;
        }
    }
    estadoJuego.velocidad_actual = currentSpeed;

    // --- Animación de la Hélice ---
    const isMoving = len > 0;
    let targetSpeed = 5; // Velocidad de ralentí
    if (estadoJuego.boostActivo) {
        targetSpeed = 70; // Velocidad de impulso
    } else if (isMoving) {
        targetSpeed = 25; // Velocidad de movimiento normal
    }
    // Suavizar la transición de velocidad
    propellerCurrentSpeed = lerp(propellerCurrentSpeed, targetSpeed, dt * 8);
    propellerRotation += propellerCurrentSpeed * dt;

    // --- NUEVO: Efecto de humo con vida baja ---
    const isLevel5 = estadoJuego.nivel === 5;
    if (estadoJuego.vidas <= 1 && estadoJuego.vidas > 0) {
        // Generar humo desde la parte trasera del submarino
        const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
        const anguloFinal = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);
        const offsetX = -45; // Offset hacia atrás, cerca de la hélice
        const offsetY = (Math.random() - 0.5) * 25; // Un poco de variación vertical

        const humoX = jugador.x + offsetX * Math.cos(anguloFinal) - offsetY * Math.sin(anguloFinal);
        const humoY = jugador.y + offsetX * Math.sin(anguloFinal) + offsetY * Math.cos(anguloFinal);

        generarHumoDaño(humoX, humoY, isLevel5);
    }


    // Llama a la lógica de actualización del nivel actual
    Levels.updateLevel(dt, vx, vy);

    // Aplicar el movimiento calculado a partir de las teclas
    jugador.x += vx * dt;
    jugador.y += vy * dt;

    // --- LÓGICA DE CÁMARA Y POSICIÓN DEL JUGADOR ---
    if (usaCamera) {
        // En niveles con scroll, el jugador se mantiene en el centro y el mundo se mueve.
        // En el Nivel 5 (ascenso vertical), aplicamos un "techo" para no permitir
        // que el jugador suba hasta el borde superior, tipo "runner".
        const limiteSuperior = isLevel5 ? H * 0.35 : jugador.r;
        jugador.y = clamp(jugador.y, limiteSuperior, H - jugador.r);

        // --- NUEVA LÓGICA DE CÁMARA CON "ZONA MUERTA" ---
        // La cámara solo se mueve si el jugador sale de una zona central,
        // dándole más libertad de movimiento sin que el fondo se desplace constantemente.
        const deadZoneLeft = W * 0.25;
        const deadZoneRight = W * 0.60;

        // Posición del jugador relativa a la vista de la cámara actual
        const playerViewX = jugador.x - estadoJuego.cameraX;

        let targetCameraX = estadoJuego.cameraX;

        if (playerViewX < deadZoneLeft) {
            targetCameraX = jugador.x - deadZoneLeft;
        } else if (playerViewX > deadZoneRight) {
            targetCameraX = jugador.x - deadZoneRight;
        }

        estadoJuego.cameraX = lerp(estadoJuego.cameraX, targetCameraX, dt * 4);
        estadoJuego.cameraY = 0; // Cámara vertical bloqueada para un movimiento más estable y predecible.

    } else {
        // En niveles de jefe (sin scroll), el jugador se mueve dentro de la pantalla.
        jugador.x = clamp(jugador.x, jugador.r, W - jugador.r);
        jugador.y = clamp(jugador.y, jugador.r, H - jugador.r);
        // La cámara se queda fija.
        estadoJuego.cameraX = 0;
        estadoJuego.cameraY = 0;
    }
    let inclinacionRobotObjetivo = 0;
    if (vy < 0) inclinacionRobotObjetivo = -INCLINACION_MAX;
    else if (vy > 0) inclinacionRobotObjetivo = INCLINACION_MAX;

    if (isLevel5) {
        if (teclas['ArrowLeft']) inclinacionRobotObjetivo -= INCLINACION_MAX * 1.5;
        else if (teclas['ArrowRight']) inclinacionRobotObjetivo += INCLINACION_MAX * 1.5;
    }
    jugador.inclinacion += (inclinacionRobotObjetivo - jugador.inclinacion) * Math.min(1, 8 * dt);

    // --- Actualización de los Offsets de Fondo/Primer Plano ---
    if (usaCamera) {
        // El offset total es la suma de una deriva constante (corriente) y el paralaje de la cámara.
        const timeDriftBg = estadoJuego.tiempoTranscurrido * BG_DRIFT_SPEED;
        const timeDriftFg = estadoJuego.tiempoTranscurrido * FG_DRIFT_SPEED;

        bgOffset = (estadoJuego.cameraX * 0.3) + timeDriftBg;
        fgOffset = (estadoJuego.cameraX * 1.0) + timeDriftFg;

        // En niveles no verticales, resetear el offset vertical para que no se acumule
        if (!isLevel5) {
            bgOffsetY = 0;
            fgOffsetY = 0;
        }

    } else {
        // En niveles de jefe, todo está estático.
        bgOffset = 0;
        fgOffset = 0;
    }

    // --- Procesamiento de la Entrada del Jugador (Acciones) ---
    if (estadoJuego.sonarToggleCooldown > 0) estadoJuego.sonarToggleCooldown -= dt;
    if ((teclas['m'] || teclas['M']) && estadoJuego.sonarToggleCooldown <= 0) {
        estadoJuego.sonarActivo = !estadoJuego.sonarActivo; // prettier-ignore
        estadoJuego.sonarToggleCooldown = 0.3;
        teclas['m'] = teclas['M'] = false;
    }

    const prevWeapon = estadoJuego.armaActual;

    if (teclas[' '] && estadoJuego.bloqueoEntrada === 0) {
        // Las armas sostenidas (láser, gatling) manejan su propia lógica en `updateWeapons`
        if (estadoJuego.armaActual !== 'laser' && estadoJuego.armaActual !== 'gatling') {
            disparar(); teclas[' '] = false; // Armas de un solo disparo
        } else if (estadoJuego.armaActual === 'gatling') { disparar(); } // La gatling necesita un pulso inicial para empezar a girar
    }
    if ((teclas['x'] || teclas['X']) && estadoJuego.bloqueoEntrada === 0) { lanzarTorpedo(); teclas['x'] = teclas['X'] = false; }
    if (teclas['1']) { estadoJuego.armaActual = 'garra'; teclas['1'] = false; }
    if (teclas['2']) { estadoJuego.armaActual = 'escopeta'; teclas['2'] = false; }
    if (teclas['3']) { estadoJuego.armaActual = 'gatling'; teclas['3'] = false; }
    if (teclas['4']) { estadoJuego.armaActual = 'laser'; teclas['4'] = false; }
    if ((teclas['c'] || teclas['C']) && estadoJuego.bloqueoEntrada === 0) {
        const currentIndex = Weapons.WEAPON_ORDER.indexOf(estadoJuego.armaActual);
        const nextIndex = (currentIndex + 1) % Weapons.WEAPON_ORDER.length;
        estadoJuego.armaActual = Weapons.WEAPON_ORDER[nextIndex];
        teclas['c'] = teclas['C'] = false;
        S.reproducir('reload');
        estadoJuego.armaCambiandoTimer = 0.3; // Este timer es para la animación del HUD
    }

    // --- Lógica de Despliegue/Repliegue de la Gatling al cambiar de arma ---
    if (estadoJuego.armaActual !== prevWeapon) {
        const gatlingState = estadoJuego.gatlingState;
        // Si cambiamos DESDE la Gatling y estaba desplegada/desplegándose
        if (prevWeapon === 'gatling' && (gatlingState.isDeployed || gatlingState.isDeploying)) {
            gatlingState.isRetracting = true; gatlingState.isDeploying = false; gatlingState.isSpinning = false; gatlingState.isFiring = false; S.detener('gatling_spinup'); S.detener('gatling_fire'); S.reproducir('reload');
        }
        // Si cambiamos HACIA la Gatling y no está ya desplegada/desplegándose
        if (estadoJuego.armaActual === 'gatling' && !gatlingState.isDeployed && !gatlingState.isDeploying) {
            gatlingState.isDeploying = true; gatlingState.isRetracting = false; S.reproducir('reload');
        }
    }

    // --- Lógica de Habilidades: Escudo de Energía ---
    const eraShieldActivo = estadoJuego.shieldActivo;
    // El escudo se activa con la tecla 'v' y si tiene energía y no está en enfriamiento.
    estadoJuego.shieldActivo = (teclas['v'] || teclas['V']) && estadoJuego.shieldEnergia > 0 && estadoJuego.shieldEnfriamiento <= 0; // prettier-ignore

    // Lógica de sonidos de activación/desactivación
    if (estadoJuego.shieldActivo && !eraShieldActivo) {
        S.reproducir('powerup'); // Sonido de activación
        S.bucle('laser_beam'); // Reutilizamos el sonido del láser para el zumbido del escudo
    } else if (!estadoJuego.shieldActivo && eraShieldActivo) {
        S.detener('laser_beam'); // Detener el zumbido si se desactiva manualmente
    }

    if (estadoJuego.shieldActivo) {
        estadoJuego.shieldEnergia -= Weapons.WEAPON_CONFIG.shield.consumo * dt;
        if (estadoJuego.shieldEnergia <= 0) {
            estadoJuego.shieldEnergia = 0;
            estadoJuego.shieldActivo = false;
            estadoJuego.shieldEnfriamiento = Weapons.WEAPON_CONFIG.shield.enfriamiento;
            S.detener('laser_beam');
            S.reproducir('boss_hit'); // Sonido de escudo roto
        }
    } else {
        // Regenerar energía si no está activo y no está en enfriamiento
        if (estadoJuego.shieldEnfriamiento <= 0) {
            estadoJuego.shieldEnergia += Weapons.WEAPON_CONFIG.shield.regeneracion * dt;
            estadoJuego.shieldEnergia = Math.min(estadoJuego.shieldEnergia, estadoJuego.shieldMaxEnergia);
        }
    }

    if (estadoJuego.shieldEnfriamiento > 0) {
        estadoJuego.shieldEnfriamiento -= dt;
    }
    if (estadoJuego.shieldHitTimer > 0) estadoJuego.shieldHitTimer -= dt;

    // --- Actualización del Progreso del Nivel ---
    const configNivel = Levels.CONFIG_NIVELES[estadoJuego.nivel - 1];
    if (configNivel.tipo === 'capture') { estadoJuego.valorObjetivoNivel = estadoJuego.rescatados; }
    else if (configNivel.tipo === 'survive') { estadoJuego.valorObjetivoNivel = Math.min(estadoJuego.valorObjetivoNivel + dt, configNivel.meta); }

    // --- Lógica de Habilidades: Impulso (Boost) ---
    const eraBoostActivo = estadoJuego.boostActivo;
    estadoJuego.boostActivo = (teclas['b'] || teclas['B']) && estadoJuego.boostEnergia > 0 && estadoJuego.boostEnfriamiento <= 0;

    // --- NUEVO: Lógica de sonido del impulso ---
    // Comprueba si el estado del impulso ha cambiado para iniciar o detener el sonido.
    if (estadoJuego.boostActivo && !eraBoostActivo) {
        S.bucle('boost');
    } else if (!estadoJuego.boostActivo && eraBoostActivo) {
        S.detener('boost');
    }

    // --- NUEVO: Lógica de efectos de cámara para el impulso ---
    if (estadoJuego.boostActivo) {
        if (!estadoJuego.unlimitedBoost) {
            estadoJuego.boostEnergia -= Weapons.WEAPON_CONFIG.boost.consumo * dt;
        }
        estadoJuego.screenShake = 5; // Activa el temblor de pantalla
        estadoJuego.cameraZoom = 0.95; // Activa el zoom out

        let boostVx = 1, boostVy = 0;
        if (len > 0) {
            boostVx = vx / JUGADOR_VELOCIDAD; // Normalizar el vector de velocidad
            boostVy = vy / JUGADOR_VELOCIDAD;
        }
        jugador.x += boostVx * Weapons.WEAPON_CONFIG.boost.fuerza * dt;
        jugador.y += boostVy * Weapons.WEAPON_CONFIG.boost.fuerza * dt;
    } else {
        if (estadoJuego.boostEnfriamiento <= 0) {
            estadoJuego.boostEnergia += Weapons.WEAPON_CONFIG.boost.regeneracion * dt; // Regeneración de energía
            estadoJuego.boostEnergia = Math.min(estadoJuego.boostEnergia, estadoJuego.boostMaxEnergia);
        }
        estadoJuego.screenShake = lerp(estadoJuego.screenShake, 0, dt * 5);
        estadoJuego.cameraZoom = lerp(estadoJuego.cameraZoom, 1.0, dt * 5);
    }

    if (estadoJuego.boostEnergia <= 0) {
        estadoJuego.boostEnergia = 0;
        if (estadoJuego.boostEnfriamiento <= 0) { // Iniciar enfriamiento solo una vez
            estadoJuego.boostEnfriamiento = 2.0; // 2 segundos de enfriamiento
        }
    }

    if (estadoJuego.boostEnfriamiento > 0) {
        estadoJuego.boostEnfriamiento -= dt;
    }

    // --- Lógica de Habilidades: Arma Láser ---
    if (estadoJuego.armaActual === 'laser') {
        if (teclas[' '] && estadoJuego.laserEnergia > 0) {
            estadoJuego.laserActivo = true;
            estadoJuego.laserEnergia = Math.max(0, estadoJuego.laserEnergia - Weapons.WEAPON_CONFIG.laser.consumoEnergia * dt);
            S.bucle('laser_beam');
        } else {
            estadoJuego.laserActivo = false;
            S.detener('laser_beam');
        }
    } else {
        if (estadoJuego.laserActivo) {
            estadoJuego.laserActivo = false;
            S.detener('laser_beam');
        }
    }
    // Regeneración de energía del láser
    if (!estadoJuego.laserActivo && estadoJuego.laserEnergia < estadoJuego.laserMaxEnergia) {
        estadoJuego.laserEnergia += Weapons.WEAPON_CONFIG.laser.regeneracionEnergia * dt;
        estadoJuego.laserEnergia = Math.min(estadoJuego.laserEnergia, estadoJuego.laserMaxEnergia);
    }

    // --- Actualización de Enemigos (Animales) ---
    for (let i = animales.length - 1; i >= 0; i--) {
        const a = animales[i];
        // --- CORRECCIÓN: Añadir una guarda para prevenir el crash ---
        // Si 'a' es undefined por alguna razón (un bug sutil de splice en otro lugar),
        // esta comprobación evitará que el juego se bloquee.
        if (!a) continue;

        if (a.laserHitTimer > 0) a.laserHitTimer -= dt;

        // --- IA y Movimiento Específico por Tipo de Enemigo ---        
        if (a.tipo === 'disparador') {
            // Movimiento: Flota en su sitio con un ligero vaivén vertical
            a.x += a.vx * dt;
            a.y += Math.sin(estadoJuego.tiempoTranscurrido * 1.2 + a.semillaFase) * 60 * dt;

            // Lógica de disparo
            a.shootCooldown -= dt;
            if (a.shootCooldown <= 0 && jugador.x < a.x) { // Solo dispara si el jugador está delante
                const angulo = Math.atan2(jugador.y - a.y, jugador.x - a.x);
                const velocidadProyectil = 450;
                proyectilesEnemigos.push({
                    x: a.x, y: a.y,
                    vx: Math.cos(angulo) * velocidadProyectil, vy: Math.sin(angulo) * velocidadProyectil,
                    r: 8, color: '#9dffb0', // Un color verde-azulado para distinguirlo
                    vida: 4.0 // 4 segundos de vida
                });
                S.reproducir('disparo_enemigo');
                a.shootCooldown = 2.0 + Math.random() * 1.5; // Resetea el cooldown
            }

            // Animación
            a.timerFrame += dt; if (a.timerFrame >= 0.2) { a.timerFrame -= 0.2; a.frame ^= 1; }
        } else
            if (a.tipo === 'baby_whale') {
                // ==============================================================
                // SISTEMA DE IA MEJORADO PARA CRÍAS DE BALLENA
                // Estados: juguetona -> curiosa -> huyendo -> normal
                // ==============================================================

                const FLEE_RADIUS = 250;
                const CURIOSITY_RADIUS = 400;
                const playerDist = Math.hypot(jugador.x - a.x, jugador.y - a.y);
                const motherNearby = a.mother && animales.includes(a.mother);
                const distToMother = motherNearby ? Math.hypot(a.x - a.mother.x, a.y - a.mother.y) : Infinity;

                // Inicializar estado si no existe
                if (!a.estadoCria) a.estadoCria = 'normal';
                if (!a.curiosidadTimer) a.curiosidadTimer = 0;
                if (!a.juegoTimer) a.juegoTimer = 5 + Math.random() * 10; // Timer para comportamiento juguetón

                // Actualizar timers
                a.juegoTimer -= dt;
                if (a.curiosidadTimer > 0) a.curiosidadTimer -= dt;
                if (a.fleeTimer > 0) a.fleeTimer -= dt;
                else a.isFleeing = false;

                // --- MÁQUINA DE ESTADOS ---
                if (playerDist < FLEE_RADIUS && !a.isFleeing) {
                    // Jugador muy cerca: HUIR
                    a.isFleeing = true;
                    a.fleeTimer = 2.5;
                    a.estadoCria = 'huyendo';
                    // Alertar a la madre si está cerca
                    if (motherNearby && !a.mother.isProtecting) {
                        a.mother.isProtecting = true;
                        a.mother.protectedBaby = a;
                        S.reproducir('whale_song1'); // Llamada de auxilio
                    }
                } else if (a.estadoCria === 'huyendo' && !a.isFleeing) {
                    // Terminó de huir: volver a normal
                    a.estadoCria = 'normal';
                } else if (a.estadoCria === 'normal' && motherNearby && distToMother < 300) {
                    // Si está cerca de mamá y el jugador está a media distancia: CURIOSIDAD
                    if (playerDist < CURIOSITY_RADIUS && playerDist > FLEE_RADIUS && Math.random() < 0.002) {
                        a.estadoCria = 'curiosa';
                        a.curiosidadTimer = 1.5 + Math.random(); // Curiosa por 1.5 a 2.5 segundos
                    }
                    // Comportamiento juguetón aleatorio
                    if (a.juegoTimer <= 0 && Math.random() < 0.3) {
                        a.estadoCria = 'juguetona';
                        a.juegoTimer = 3 + Math.random() * 2;
                    }
                } else if (a.estadoCria === 'curiosa' && a.curiosidadTimer <= 0) {
                    a.estadoCria = 'normal';
                } else if (a.estadoCria === 'juguetona' && a.juegoTimer <= 2) {
                    a.estadoCria = 'normal';
                }

                // --- MOVIMIENTO SEGÚN ESTADO ---
                let targetX, targetY, speed;

                switch (a.estadoCria) {
                    case 'huyendo':
                        // Huir hacia atrás de la madre
                        if (motherNearby) {
                            targetX = a.mother.x + 250;
                            targetY = a.mother.y;
                        } else {
                            targetX = a.x + 100;
                            targetY = a.y;
                        }
                        speed = 2.5;
                        break;

                    case 'curiosa':
                        // Acercarse ligeramente al jugador
                        targetX = a.x + (jugador.x - a.x) * 0.1;
                        targetY = a.y + (jugador.y - a.y) * 0.1;
                        speed = 1.0;
                        break;

                    case 'juguetona':
                        // Nadar en círculos alrededor de la madre
                        if (motherNearby) {
                            const angle = estadoJuego.tiempoTranscurrido * 2 + a.semillaFase;
                            targetX = a.mother.x + Math.cos(angle) * 100;
                            targetY = a.mother.y + Math.sin(angle) * 80;
                        } else {
                            targetX = a.x;
                            targetY = a.y;
                        }
                        speed = 1.5;
                        break;

                    default: // 'normal'
                        // Seguir a la madre
                        if (motherNearby) {
                            targetX = a.mother.x + 150;
                            targetY = a.mother.y;
                        } else {
                            a.x += a.vx * dt;
                            targetX = a.x;
                            targetY = a.y;
                        }
                        speed = 0.8;
                        break;
                }

                a.x = lerp(a.x, targetX, dt * speed);
                a.y = lerp(a.y, targetY, dt * speed);

                // Movimiento sinusoidal para que sea más natural
                a.y += Math.sin(estadoJuego.tiempoTranscurrido * 2.5 + a.semillaFase) * 50 * dt;

                // Animación
                a.timerFrame += dt;
                if (a.timerFrame >= BABYWHALE_ANIMATION_SPEED) {
                    a.timerFrame -= BABYWHALE_ANIMATION_SPEED;
                    if (BABYWHALE_SPRITE_DATA) {
                        a.frame = (a.frame + 1) % BABYWHALE_SPRITE_DATA.frames.length;
                    }
                }
            } else if (a.tipo === 'orca') {
                a.huntCooldown -= dt;
                a.attackTimer -= dt;

                // --- Lógica de estado de la Orca ---
                // 1. Si está cazando un animal, continuar
                if (a.isHuntingAnimal && a.targetAnimal && animales.includes(a.targetAnimal) && a.targetAnimal.hp > 0) {
                    const target = a.targetAnimal;
                    const angle = Math.atan2(target.y - a.y, target.x - a.x);
                    const speed = 800;
                    a.vx = lerp(a.vx, Math.cos(angle) * speed, dt * 4.0);
                    a.vy = lerp(a.vy, Math.sin(angle) * speed, dt * 4.0);

                    // Ataque al impactar
                    if (Math.hypot(a.x - target.x, a.y - target.y) < a.r + target.r * 0.8) {
                        if (a.attackTimer <= 0) {
                            const damage = a.isPackLeader ? 35 : 25;
                            target.hp -= damage;
                            a.attackTimer = 0.8;
                            generarGotasSangre(target.x, target.y);
                            S.reproducir('boss_hit');

                            // Si la presa es una cría o un pez normal, las ballenas adultas cercanas se enfurecen.
                            const esPresaProtegida = target.tipo === 'baby_whale' || ['normal', 'rojo', 'aggressive'].includes(target.tipo);
                            if (esPresaProtegida) {
                                const AGGRO_RADIUS = W * 0.7; // Radio de "grito de auxilio" de la presa
                                for (const otherAnimal of animales) {
                                    // Buscar a todas las ballenas adultas en el radio de agresión.
                                    if (otherAnimal.tipo === 'whale') {
                                        const dist = Math.hypot(a.x - otherAnimal.x, a.y - otherAnimal.y);
                                        if (dist < AGGRO_RADIUS) {
                                            // Si la ballena no está ya enfurecida, la enfurecemos.
                                            if (!otherAnimal.isEnraged) {
                                                otherAnimal.isEnraged = true;
                                                otherAnimal.vx *= 2.0; // Aumentar su velocidad
                                            }
                                            // Asignar (o reasignar) el objetivo de venganza a la orca atacante.
                                            otherAnimal.revengeTarget = a;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // 2. Si está cazando al jugador, continuar
                else if (a.isHunting) {
                    const angle = Math.atan2(jugador.y - a.y, jugador.x - a.x);
                    const targetVx = Math.cos(angle) * 700;
                    const targetVy = Math.sin(angle) * 700;
                    a.vx = lerp(a.vx, targetVx, dt * 3.0);
                    a.vy = lerp(a.vy, targetVy, dt * 3.0);
                    if (a.x < -a.w || a.x > W + a.w || a.y < -a.h || a.y > H + a.h) {
                        a.isHunting = false;
                    }
                }
                // 3. Si está inactiva, buscar una presa
                else {
                    // Resetear estados de caza
                    a.isHuntingAnimal = false;
                    a.targetAnimal = null;
                    a.isHunting = false;

                    // Movimiento de patrulla
                    a.vx = -(velocidadActual() + 80) * (a.isPackLeader ? 1.1 : 1.0);
                    a.vy = Math.sin(estadoJuego.tiempoTranscurrido * 1.5 + a.semillaFase) * 50;

                    // Lógica de búsqueda de presas si no está en cooldown
                    if (a.huntCooldown <= 0) {
                        let bestTarget = null;
                        let minDistance = Infinity;
                        const SIGHT_RADIUS = W * 0.8;

                        // Prioridad 1: Ballenas bebé
                        for (const other of animales) {
                            if (other.tipo === 'baby_whale' && other.hp > 0) {
                                const dist = Math.hypot(a.x - other.x, a.y - other.y);
                                if (dist < SIGHT_RADIUS && dist < minDistance) {
                                    minDistance = dist;
                                    bestTarget = other;
                                }
                            }
                        }

                        // Prioridad 2: Peces pequeños (si no hay ballenas bebé)
                        if (!bestTarget) {
                            minDistance = Infinity;
                            for (const other of animales) {
                                if (['normal', 'rojo', 'aggressive'].includes(other.tipo)) {
                                    const dist = Math.hypot(a.x - other.x, a.y - other.y);
                                    if (dist < SIGHT_RADIUS && dist < minDistance) {
                                        minDistance = dist;
                                        bestTarget = other;
                                    }
                                }
                            }
                        }

                        if (bestTarget) {
                            a.isHuntingAnimal = true;
                            a.targetAnimal = bestTarget;
                            a.huntCooldown = 8.0 + Math.random() * 4;

                            // ESTRATEGIA DE CERCO: Coordinación de manada mejorada
                            if (a.isPackLeader) {
                                // Contar miembros de la manada
                                const manada = animales.filter(o =>
                                    o.tipo === 'orca' && o.packId === a.packId
                                );

                                manada.forEach((packMate, index) => {
                                    if (packMate !== a) {
                                        packMate.isHuntingAnimal = true;
                                        packMate.targetAnimal = bestTarget;
                                        // Cada orca toma una posición en el cerco
                                        packMate.posicionCerco = calcularPosicionCercoOrca(
                                            packMate, bestTarget, index, manada.length
                                        );
                                        packMate.faseCerco = 'aproximando'; // aproximando -> atacando
                                    }
                                });
                                a.faseCerco = 'liderando';
                            }
                        } else if (jugador.x < a.x && a.x < W) {
                            // Prioridad 3: Cazar al jugador si no hay otra presa
                            a.isHunting = true;
                            a.huntCooldown = 4.0 + Math.random() * 2;
                        }
                    }
                }

                // Movimiento y animación final
                a.x += a.vx * dt;
                a.y += a.vy * dt;

                a.timerFrame += dt;
                if (a.timerFrame >= ORCA_ANIMATION_SPEED) {
                    a.timerFrame -= ORCA_ANIMATION_SPEED;
                    if (ORCA_SPRITE_DATA) {
                        a.frame = (a.frame + 1) % ORCA_SPRITE_DATA.frames.length;
                    }
                }
            } else if (a.tipo === 'shark') {
                if (a.isHunting) {
                    // El tiburón está cazando, se mueve en su vector de ataque
                    a.x += a.vx * dt;
                    a.y += a.vy * dt;
                    generarBurbujasEmbestidaTiburom(a.x, a.y);
                    // Si sale de la pantalla, deja de cazar
                    if (a.x < -a.w || a.x > W + a.w || a.y < -a.h || a.y > H + a.h) {
                        a.isHunting = false;
                        a.isPackLeader = false;
                        a.vx = -(velocidadActual() + 60) * 0.9; // Resetea a velocidad de patrulla
                        a.vy = 0;
                    }
                } else {
                    // Modo patrulla: se mueve de derecha a izquierda
                    a.x += a.vx * dt;
                    // Estela de burbujas en modo patrulla
                    if (Math.random() < 0.1) {
                        const tailX = a.x + a.w / 2;
                        const tailY = a.y + (Math.random() - 0.5) * (a.h * 0.1);
                        generarParticula(particulasBurbujas, { x: tailX, y: tailY, vx: 30 + Math.random() * 30, vy: (Math.random() - 0.5) * 25 - 10, r: Math.random() * 2.0 + 1.0, vida: 0.9 + Math.random() * 0.7, color: '' });
                    }
                    a.huntCooldown -= dt;
                    // Si ve al jugador y no está en cooldown, inicia la caza en manada
                    if (a.huntCooldown <= 0 && jugador.x < a.x && a.x < W) {
                        // --- SISTEMA DE CAZA EN MANADA CON FLANQUEO ---
                        a.isHunting = true;
                        a.isPackLeader = true;
                        const baseAngle = Math.atan2(jugador.y - a.y, jugador.x - a.x);
                        a.vx = Math.cos(baseAngle) * 600;
                        a.vy = Math.sin(baseAngle) * 600;
                        a.huntCooldown = 5.0 + Math.random() * 3;
                        S.reproducir('choque_ligero'); // Sonido de llamada de caza

                        // El líder llama a otros tiburones con flanqueo estratégico
                        const PACK_CALL_RADIUS = W * 0.6;
                        let followerIndex = 0;

                        for (const otherShark of animales) {
                            if (otherShark !== a && otherShark.tipo === 'shark' && !otherShark.isHunting) {
                                const distance = Math.hypot(a.x - otherShark.x, a.y - otherShark.y);
                                if (distance < PACK_CALL_RADIUS) {
                                    otherShark.isHunting = true;
                                    otherShark.isPackLeader = false;

                                    // Usar flanqueo: cada seguidor ataca desde un ángulo diferente
                                    const flanqueoAngle = calcularAnguloFlanqueoTiburon(followerIndex, baseAngle);
                                    const followerSpeed = 550 + Math.random() * 100;

                                    otherShark.vx = Math.cos(flanqueoAngle) * followerSpeed;
                                    otherShark.vy = Math.sin(flanqueoAngle) * followerSpeed;
                                    otherShark.huntCooldown = 3.0 + Math.random() * 2;

                                    followerIndex++;
                                }
                            }
                        }
                        // --- FIN CAZA CON FLANQUEO ---
                    }
                }
                // Animación específica para el tiburón
                a.timerFrame += dt;
                if (a.timerFrame >= SHARK_ANIMATION_SPEED) {
                    a.timerFrame -= SHARK_ANIMATION_SPEED; // Más preciso que resetear a 0
                    a.frame = (a.frame + 1) % SHARK_SPRITE_DATA.frames.length;
                }
            } else if (a.tipo === 'whale') {
                // Lógica de enfurecimiento
                if (!a.isEnraged && a.hp > 0 && a.hp <= a.maxHp * 0.35) {
                    a.isEnraged = true;
                    a.vx *= 2.5; // Se vuelve mucho más rápida
                    S.reproducir('boss_hit'); // Sonido de furia
                    generarGotasSangre(a.x, a.y); // Salpica sangre
                }

                // --- NUEVO: Lógica de protección de crías ---
                const PROTECTION_RADIUS = 400;
                let closestThreatenedBaby = null;
                let minPlayerDist = PROTECTION_RADIUS;

                // Buscar la cría más amenazada que le pertenezca
                for (const other of animales) {
                    if (other.tipo === 'baby_whale' && other.mother === a) {
                        const dist = Math.hypot(jugador.x - other.x, jugador.y - other.y);
                        if (dist < minPlayerDist) {
                            minPlayerDist = dist;
                            closestThreatenedBaby = other;
                        }
                    }
                }

                // Actualizar estado de protección
                a.isProtecting = !!closestThreatenedBaby;
                a.protectedBaby = closestThreatenedBaby;
                // --- FIN Lógica de protección ---

                // --- SUGERENCIA DE IA: LÓGICA DE NUEVOS ATAQUES ---
                // 1. Ataque de chorro de agua (Spout)
                a.spoutCooldown -= dt;
                if (a.spoutCooldown <= 0 && !a.isTailSwiping) {
                    // Dispara un chorro de agua hacia arriba o abajo
                    const dirY = a.y > H / 2 ? -1 : 1; // Dispara lejos del centro de la pantalla
                    generarChorroDeAgua(a.x - a.w * 0.2, a.y, dirY);
                    a.spoutCooldown = 3.5 + Math.random() * 2.5; // Reinicia el temporizador
                }

                // --- LÓGICA DE CANTO AMBIENTAL ---
                if (a.songCooldown > 0) {
                    a.songCooldown -= dt;
                } else {
                    S.playRandomWhaleSong();
                    // Reinicia el temporizador para el próximo canto (REDUCIDO PARA PRUEBAS)
                    a.songCooldown = 5.0 + Math.random() * 5.0;
                }

                // 2. Ataque de coletazo (Tail Swipe)
                a.tailSwipeCooldown -= dt;
                // El coletazo solo ocurre si el jugador está detrás de la ballena
                if (a.tailSwipeCooldown <= 0 && !a.isTailSwiping && jugador.x > a.x) {
                    a.isTailSwiping = true;
                    a.tailSwipeProgress = 0;
                    a.tailSwipeCooldown = 6.0 + Math.random() * 4.0;
                }

                if (a.isTailSwiping) {
                    a.tailSwipeProgress += dt * 4; // El coletazo dura 0.25s
                    // Hitbox del coletazo
                    const tailX = a.x + a.w / 2;
                    const tailY = a.y;
                    const tailRadius = 60; // Radio del área de efecto
                    if (Math.hypot(jugador.x - tailX, jugador.y - tailY) < jugador.r + tailRadius) {
                        if (estadoJuego.vidas > 0) {
                            estadoJuego.vidas--;
                            estadoJuego.animVida = 0.6;
                            S.reproducir('choque');
                        }
                        if (estadoJuego.vidas <= 0) perderJuego();
                        a.isTailSwiping = false; // El coletazo golpea solo una vez
                    }

                    if (a.tailSwipeProgress >= 1) {
                        a.isTailSwiping = false;
                    }
                } else if (a.revengeTarget) {
                    // --- LÓGICA DE VENGANZA ---
                    const target = a.revengeTarget;
                    const angle = Math.atan2(target.y - a.y, target.x - a.x);
                    const revengeSpeed = 500; // Velocidad de venganza
                    a.vx = lerp(a.vx, Math.cos(angle) * revengeSpeed, dt * 3.5);
                    a.vy = lerp(a.vy, Math.sin(angle) * revengeSpeed, dt * 3.5);

                    // Colisión y daño al objetivo de venganza (la orca)
                    if (a.collisionCooldown <= 0 && Math.hypot(a.x - target.x, a.y - target.y) < a.r + target.r * 0.8) {
                        const damage = 40; // Fuerte daño por embestida
                        target.hp -= damage;
                        a.collisionCooldown = 1.0; // Enfriamiento para no infligir daño en cada frame
                        S.reproducir('choque');
                        generarGotasSangre(target.x, target.y, 20);

                        // Si el objetivo muere, dejar de perseguirlo
                        if (target.hp <= 0) {
                            a.revengeTarget = null;
                            a.isEnraged = false; // Se calma
                        }
                    }
                } else if (a.isProtecting && a.protectedBaby) {
                    // --- MOVIMIENTO DE PROTECCIÓN ---
                    // La ballena se interpone entre el jugador y la cría.
                    const baby = a.protectedBaby;
                    const dxToPlayer = jugador.x - baby.x;
                    const dyToPlayer = jugador.y - baby.y;
                    const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer);

                    // El objetivo es un punto delante de la cría, en la línea hacia el jugador
                    const offset = 120; // A qué distancia se interpone
                    const targetX = baby.x + (dxToPlayer / distToPlayer) * offset;
                    const targetY = baby.y + (dyToPlayer / distToPlayer) * offset;

                    // --- CORRECCIÓN: Actualizar vx/vy para que la ballena se voltee ---
                    const angleToTarget = Math.atan2(targetY - a.y, targetX - a.x);
                    const protectionSpeed = 450; // Velocidad de protección
                    a.vx = lerp(a.vx, Math.cos(angleToTarget) * protectionSpeed, dt * 3.0);
                    a.vy = lerp(a.vy, Math.sin(angleToTarget) * protectionSpeed, dt * 3.0);

                    // Si está protegiendo, puede intentar un coletazo si el jugador se acerca demasiado a la ballena
                    if (a.tailSwipeCooldown <= 0 && Math.hypot(jugador.x - a.x, jugador.y - a.y) < 200) {
                        a.isTailSwiping = true; a.tailSwipeProgress = 0; a.tailSwipeCooldown = 4.0 + Math.random() * 3.0;
                    }
                } else {
                    // Movimiento normal de patrulla con rebote en su zona
                    if (a.isPatrolling) {
                        if ((a.x < a.patrolMinX && a.vx < 0) || (a.x > a.patrolMaxX && a.vx > 0)) {
                            a.vx *= -1; // Invertir dirección
                        }
                    }
                    // Movimiento vertical sinusoidal para que no sea tan rígido
                    a.vy = Math.sin(estadoJuego.tiempoTranscurrido * 0.5 + a.semillaFase) * 20;
                }
                // --- FIN SUGERENCIA ---

                if (a.collisionCooldown > 0) a.collisionCooldown -= dt;

                // Si el objetivo de venganza muere o desaparece, volver a la normalidad
                if (a.revengeTarget && (!animales.includes(a.revengeTarget) || a.revengeTarget.hp <= 0)) {
                    a.revengeTarget = null;
                    a.isEnraged = false; // Se calma
                }

                // --- APLICAR MOVIMIENTO ---
                // Solo no se mueve si está en medio de un coletazo
                if (!a.isTailSwiping) {
                    a.x += a.vx * dt;
                    a.y += a.vy * dt;
                }

                // Efecto de burbujas de la cola
                if (Math.random() < 0.25) { // Controlar la frecuencia para no sobrecargar
                    const tailX = a.x + a.w / 2.5; // Origen de las burbujas en la cola
                    const tailY = a.y + (Math.random() - 0.5) * (a.h * 0.3); // Variación vertical
                    generarParticula(particulasBurbujas, {
                        x: tailX, y: tailY,
                        vx: 20 + Math.random() * 30, // Las burbujas se quedan un poco atrás
                        vy: (Math.random() - 0.5) * 20 - 15, // Tienden a subir
                        r: Math.random() * 2.5 + 1, vida: 1.2 + Math.random() * 1.0, color: ''
                    });
                }

                // Animación
                a.timerFrame += dt;
                if (a.timerFrame >= WHALE_ANIMATION_SPEED) {
                    a.timerFrame -= WHALE_ANIMATION_SPEED;
                    a.frame = (a.frame + 1) % WHALE_SPRITE_DATA.frames.length;
                }
            } else if (a.tipo === 'mierdei') {
                a.x += a.vx * dt;
                a.timerFrame += dt;
                if (a.timerFrame >= MIERDEi_ANIMATION_SPEED) {
                    a.timerFrame -= MIERDEi_ANIMATION_SPEED;
                    a.frame = (a.frame + 1) % MIERDEI_SPRITE_DATA.frames.length;
                }
            } else {
                // =================================================================
                // SISTEMA DE CARDUMEN - Comportamiento de grupo para peces normales
                // =================================================================

                // Inicializar vy si no existe (para compatibilidad)
                if (a.vy === undefined) a.vy = 0;

                // Actualizar timer de alerta si existe
                if (a.alertaTimer !== undefined && a.alertaTimer > 0) {
                    a.alertaTimer -= dt;
                    if (a.alertaTimer <= 0) {
                        a.alertado = false;
                    }
                }

                // Calcular fuerzas de cardumen
                const fuerzasCardumen = calcularFuerzasCardumen(a);
                const fuerzasHuida = calcularFuerzaHuida(a);

                // Detectar si hay amenaza cercana para alertar a otros
                const distJugador = jugador ? Math.hypot(a.x - jugador.x, a.y - jugador.y) : Infinity;
                if (distJugador < CARDUMEN_RADIO_HUIDA * 0.5 && !a.yaAlerto) {
                    alertarPecesCercanos(a);
                    a.yaAlerto = true; // Prevenir alertas repetidas
                }
                if (distJugador > CARDUMEN_RADIO_HUIDA) {
                    a.yaAlerto = false; // Resetear cuando está lejos
                }

                // Aplicar fuerzas según estado
                let vxFinal = a.vx;
                let vyFinal = a.vy;

                // Si está alertado o hay amenaza cercana, priorizar huida
                const hayAmenaza = Math.hypot(fuerzasHuida.fx, fuerzasHuida.fy) > 50;

                if (hayAmenaza || a.alertado) {
                    // Modo huida: fuerzas de huida dominan
                    vxFinal += fuerzasHuida.fx * dt;
                    vyFinal += fuerzasHuida.fy * dt;
                    // Agregar fuerzas de cardumen más sutiles para mantener grupo
                    vxFinal += fuerzasCardumen.fx * dt * 0.3;
                    vyFinal += fuerzasCardumen.fy * dt * 0.3;
                } else {
                    // Modo normal: usar patrón de movimiento + cardumen
                    switch (a.patronMovimiento) {
                        case 'sinusoidal':
                            vyFinal = Math.sin(estadoJuego.tiempoTranscurrido * 3 + a.semillaFase) * 80;
                            break;
                        case 'pausa_acelera':
                            if (a.estadoMovimiento === 'moviendo') {
                                if (a.x < W * 0.85) {
                                    a.estadoMovimiento = 'pausado';
                                    a.timerMovimiento = 0.5 + Math.random() * 0.8;
                                }
                            } else if (a.estadoMovimiento === 'pausado') {
                                a.timerMovimiento -= dt;
                                vxFinal = 0; // Detenerse durante pausa
                                if (a.timerMovimiento <= 0) {
                                    a.estadoMovimiento = 'acelerando';
                                    const angulo = Math.atan2(jugador.y - a.y, jugador.x - a.x);
                                    vxFinal = Math.cos(angulo) * velocidadActual() * 1.5;
                                    vyFinal = Math.sin(angulo) * velocidadActual() * 1.5;
                                }
                            }
                            break;
                        default: // 'lineal' - agregar ondulación sutil
                            vyFinal += Math.sin(estadoJuego.tiempoTranscurrido * 2 + a.semillaFase) * 30;
                            break;
                    }

                    // Agregar fuerzas de cardumen
                    vxFinal += fuerzasCardumen.fx * dt;
                    vyFinal += fuerzasCardumen.fy * dt;
                }

                // Limitar velocidad máxima
                const velocidadActualPez = Math.hypot(vxFinal, vyFinal);
                if (velocidadActualPez > CARDUMEN_VELOCIDAD_MAX * 2) {
                    const factor = (CARDUMEN_VELOCIDAD_MAX * 2) / velocidadActualPez;
                    vxFinal *= factor;
                    vyFinal *= factor;
                }

                // Aplicar movimiento con suavizado
                a.vx = lerp(a.vx, vxFinal, dt * 3);
                a.vy = lerp(a.vy, vyFinal, dt * 3);
                a.x += a.vx * dt;
                a.y += a.vy * dt;

                // Mantener dentro de límites verticales
                a.y = clamp(a.y, 50, H - 50);

                // >>> Estela de burbujas para los peces <<<
                if (Math.random() < 0.15) {
                    const tailX = a.x + a.w / 2;
                    const tailY = a.y;
                    generarParticula(particulasBurbujas, {
                        x: tailX,
                        y: tailY,
                        vx: 20 + Math.random() * 20,
                        vy: (Math.random() - 0.5) * 20 - 15,
                        r: Math.random() * 1.5 + 0.5,
                        vida: 0.8 + Math.random() * 0.7,
                        color: ''
                    });
                }

                // Animación
                a.timerFrame += dt;
                if (a.timerFrame >= 0.2) { a.timerFrame -= 0.2; a.frame ^= 1; }
            }

        // --- Colisión Jugador-Enemigo ---
        if (!a.capturado && Math.hypot(jugador.x - a.x, jugador.y - a.y) < jugador.r + a.r * 0.5) {
            // --- REINTEGRACIÓN DE EFECTOS DE COLISIÓN ---
            // Calcular el punto de impacto
            const collisionX = (jugador.x + a.x) / 2;
            const collisionY = (jugador.y + a.y) / 2;

            // Generar efectos visuales de gore, independientemente de si el escudo absorbe el daño.
            // El impacto físico ocurre de todos modos.
            if (a.tipo === 'whale' || a.tipo === 'baby_whale' || a.tipo === 'shark' || a.tipo === 'orca') {
                generarBurbujasDeSangre(collisionX, collisionY);
                generarTrozoBallena(collisionX, collisionY, 4, 120, a.w);
                generarGotasSangre(collisionX, collisionY);
            } else {
                // Para criaturas más pequeñas, una explosión genérica
                generarExplosion(collisionX, collisionY, '#ff5e5e', a.w);
            }

            let damage = 1;
            if (a.tipo === 'whale') damage = 7;
            if (a.tipo === 'orca') damage = 3;

            // Infligir daño al jugador (el escudo puede absorberlo)
            infligirDanoJugador(damage);
            Levels.onKill(a.tipo); // Notificar al sistema de niveles que el animal fue "eliminado" por colisión
            animales.splice(i, 1); // El animal se destruye al chocar
            continue;
        }

        // --- Limpieza de Enemigos Fuera de Pantalla ---
        const despawnLimit = usaCamera ? estadoJuego.cameraX - a.w : -a.w;
        if (a.x < despawnLimit) {
            animales.splice(i, 1);
        }
    }

    // --- Actualización de Proyectiles Enemigos ---
    for (let i = proyectilesEnemigos.length - 1; i >= 0; i--) {
        const p = proyectilesEnemigos[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.vida) p.vida -= dt;

        // Colisión con el jugador
        if (Math.hypot(jugador.x - p.x, jugador.y - p.y) < jugador.r + p.r) {
            infligirDanoJugador(1, 'choque_ligero');
            generarExplosion(p.x, p.y, p.color);
            proyectilesEnemigos.splice(i, 1);
            continue;
        }

        // Limpieza si sale de pantalla o se acaba su vida
        if ((p.vida && p.vida <= 0) || p.y < -p.r || p.y > H + p.r || p.x < estadoJuego.cameraX - p.r || p.x > estadoJuego.cameraX + W + p.r) {
            proyectilesEnemigos.splice(i, 1);
        }
    }
    // --- Actualización de Otros Proyectiles y Efectos ---
    for (let i = estadoJuego.proyectilesTinta.length - 1; i >= 0; i--) { const ink = estadoJuego.proyectilesTinta[i]; ink.x += ink.vx * dt; if (ink.x < 0) { generarNubeDeTinta(ink.x + Math.random() * 100, ink.y, 80); estadoJuego.proyectilesTinta.splice(i, 1); } }

    estadoJuego.animVida = Math.max(0, estadoJuego.animVida - dt);

    // Actualizar trozos de ballena
    for (let i = whaleDebris.length - 1; i >= 0; i--) {
        const d = whaleDebris[i];
        d.vy += 250 * dt; // Gravedad
        d.vx *= 0.99; // Fricción del agua para que la caída sea más notable
        d.vy *= 0.99; // Fricción del agua
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rotacion += d.vRot * dt;
        d.vida -= dt;
        if (d.trailCooldown > 0) d.trailCooldown -= dt;

        // --- MEJORA VISUAL: Rastro de sangre dinámico ---
        if (d.trailCooldown <= 0) {
            d.trailCooldown = 0.05 + Math.random() * 0.05; // Siguiente gota en 50-100ms
            const trailAngle = Math.atan2(d.vy, d.vx) + Math.PI; // Dirección opuesta al movimiento
            const spread = 1.2; // Dispersión del rastro
            const trailSpeed = 30 + Math.random() * 40; // Velocidad de las gotas de sangre

            generarParticula(particulasExplosion, {
                x: d.x, y: d.y,
                vx: d.vx * 0.1 + Math.cos(trailAngle + (Math.random() - 0.5) * spread) * trailSpeed, vy: d.vy * 0.1 + Math.sin(trailAngle + (Math.random() - 0.5) * spread) * trailSpeed,
                r: 1 + Math.random() * 2.5,
                vida: 0.6 + Math.random() * 0.6,
                color: ['#b22222', '#8b0000'][Math.floor(Math.random() * 2)] // Dos tonos de sangre
            });
        }

        if (d.vida <= 0 || d.y > H + 50) {
            whaleDebris.splice(i, 1);
        }
    }

    // Limpieza de pantalla diferida (solicitada por los niveles para evitar errores)
    // Esto se ejecuta después de todos los bucles de actualización de entidades.
    if (estadoJuego.levelFlags.clearScreen) {
        limpiarTodosLosAnimales();
        estadoJuego.levelFlags.clearScreen = false;
    }

    // --- Lógica del Sonar (Ping y Activación) ---
    if (estadoJuego.sonarActivo) {
        // El timer se descuenta en cada frame. Cuando llega a cero, suena el "ping"
        // y se reinicia para la siguiente vuelta del barrido del sonar.
        estadoJuego.sonarPingTimer -= dt;
        if (estadoJuego.sonarPingTimer <= 0) {
            const sweepDuration = (Math.PI * 2) / SONAR_SWEEP_SPEED;
            // Reiniciar el timer con un pequeño offset aleatorio para que no sea tan repetitivo
            estadoJuego.sonarPingTimer = sweepDuration + (Math.random() - 0.5) * 0.1;
            S.reproducir('sonar_ping');
        }
    }

    // --- Actualización de Timers Globales ---
    // El tiempo transcurrido del juego y el slow-motion se actualizan aquí,
    // usando el `dt` ajustado que se pasó a la función.
    estadoJuego.tiempoTranscurrido += dt;
    if (estadoJuego.slowMoTimer > 0) {
        estadoJuego.slowMoTimer -= dt;
        if (estadoJuego.slowMoTimer <= 0) {
            estadoJuego.velocidadJuego = 1.0;
        }
    }

    // --- LÓGICA DE DISTANCIA RECORRIDA ---
    // Se calcula de forma genérica para todos los niveles, excepto para el 10 que tiene su propia lógica.
    if (estadoJuego.nivel !== 10) {
        const cameraDeltaX = estadoJuego.cameraX - estadoJuego.prevCameraX;
        // >>> CORRECCIÓN: Contar la distancia tanto hacia adelante como hacia atrás <<<
        // Usamos el valor absoluto del cambio de la cámara para sumar siempre la distancia recorrida.
        estadoJuego.distanciaRecorrida += Math.abs(cameraDeltaX) / 50; // Escala de 50px por metro
    }

    comprobarCompletadoNivel();
}

export function actualizarLiveHUD() {
    _actualizarLiveHUD(estadoJuego, liveHudContainer);
}

/**
 * OPTIMIZACIÓN: Calcula las posiciones de los pings del sonar delegando en sonar.js.
 */
function actualizarSonarPings() {
    _actualizarSonarPings({ estadoJuego, jugador, animales, escombros, Weapons, proyectilesEnemigos, W });
}
// =================================================================================
//  9. BUCLE PRINCIPAL DE RENDERIZADO (DRAW)
// =================================================================================
// Se encarga de dibujar todo en la pantalla en el orden correcto (de atrás hacia adelante).
function renderizar(dt) {
    if (estadoJuego) dibujarFondoParallax();
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (estadoJuego) {
        ctx.save();

        // 1. Zoom centrado
        ctx.translate(W / 2, H / 2);
        if (estadoJuego.cameraZoom !== 1.0) {
            ctx.scale(estadoJuego.cameraZoom, estadoJuego.cameraZoom);
        }
        ctx.translate(-W / 2, -H / 2);

        // 2. Shake de pantalla
        if (estadoJuego.screenShake > 0.1) {
            const shakeX = (Math.random() - 0.5) * estadoJuego.screenShake;
            const shakeY = (Math.random() - 0.5) * estadoJuego.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        // 3. Traslación de cámara centrada
        const camX = Math.round(estadoJuego.cameraX);
        const camY = Math.round(estadoJuego.cameraY);
        ctx.translate(-camX, -camY);

        Levels.drawLevel();

        // 4. Dibujar Criaturas Marinas
        dibujarAnimales(ctx, { animales, estadoJuego, W, H });

        // 5. Animación del Menú
        if (!estadoJuego.enEjecucion) {
            dibujarAnimacionMenu();
        }

        // 6. Submarino del Jugador, Hélice, Armas y Escudo
        dibujarJugadorSubmarino(ctx, {
            jugador,
            estadoJuego,
            W,
            H,
            propellerReady,
            propellerImg,
            propellerCurrentSpeed,
            propellerRotation,
            spriteAncho,
            spriteAlto,
            robotEscala
        });

        // 7. Proyectiles Enemigos
        ctx.save();
        for (const p of proyectilesEnemigos) {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
        ctx.restore();

        // 8. Proyectiles de Tinta
        ctx.fillStyle = '#101010';
        for (const ink of estadoJuego.proyectilesTinta) {
            ctx.beginPath();
            ctx.arc(ink.x, ink.y, ink.r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.imageSmoothingEnabled = true;
    }

    // Efectos de Mundo
    dibujarParticulas();
    dibujarCasquillos();

    // Escombros, Ballenas, Pilotos y Restos
    dibujarEscombrosMundo(ctx, { whaleDebris, pilotos, trozosHumanos, escombrosSubmarino });

    ctx.restore();

    // Efectos de Pantalla y HUD
    dibujarSonar();
    dibujarMascaraLuz();
    dibujarPolvoMarino();
    actualizarHTMLHUD();
}

function dibujarFondoParallax() {
    _dibujarFondoParallax({
        estadoJuego,
        bgCtx,
        W,
        H,
        bgImg,
        bgListo,
        bgAncho,
        bgAlto,
        fgImg,
        fgListo,
        fgAncho,
        fgAlto,
        bgOffset,
        fgOffset,
        bgOffsetY,
        fgOffsetY
    });
}

function dibujarSonar() {
    _dibujarSonar({ sonarCtx, estadoJuego, jugador, animales, escombros, Weapons, proyectilesEnemigos, W, H });
}

function iniciarPolvoMarino() {
    _iniciarPolvoMarino(particulasPolvoMarino, W, H);
}

function actualizarPolvoMarino(dt) {
    _actualizarPolvoMarino(particulasPolvoMarino, W, H, dt, velocidadActual());
}

function dibujarPolvoMarino() {
    _dibujarPolvoMarino();
}

function dibujarAnimacionMenu() {
    if (!menuFlyBy || !menuFlyBy.active || !robotListo) return;

    ctx.save();
    ctx.translate(menuFlyBy.x, menuFlyBy.y);

    if (menuFlyBy.vx < 0) {
        ctx.scale(-1, 1);
    }
    ctx.rotate(menuFlyBy.rotation);

    const frame = Math.floor(estadoJuego.tiempoTranscurrido * 20) % (HECTOR_FRAME_KEYS.length || 1);
    dibujarHector(ctx, 0, 0, 0.35, frame);

    ctx.restore();
}

function generarCasquillo(x, y, direccion, tipo) {
    const angulo = (Math.random() - 0.5) * 1.5 - Math.PI / 2; // Salen hacia arriba con variación
    const velocidad = Math.random() * 150 + 100;

    // Configuración según tipo
    let color = '#dceebb'; // Por defecto
    let w = 6, h = 12;

    if (tipo === 'fuego_rapido') { color = '#ffcc22'; w = 5; h = 10; }
    else if (tipo === 'escopeta') { color = '#aa3333'; w = 8; h = 16; }
    else if (tipo === 'torpedo') { return; } // Torpedos no dejan casquillos

    // Añadimos a la lista (podríamos optimizar con Object Pool si son muchos, pero suelen ser pocos)
    particulasCasquillos.push({
        x: x, y: y,
        vx: Math.cos(angulo) * velocidad + (direccion * -50), // Impulso lateral contrario al disparo
        vy: Math.sin(angulo) * velocidad,
        rotacion: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 15,
        vida: 1.5,
        vidaMax: 1.5,
        color: color,
        w: w, h: h
    });
}



function dibujarCasquillos() {
    _dibujarCasquillos(ctx, particulasCasquillos);
}

function dibujarMascaraLuz() {
    _dibujarMascaraLuz({
        estadoJuego,
        fx,
        jugador,
        W,
        H,
        spriteAlto,
        robotEscala,
        particulasPolvoMarino
    });
}

export function actualizarHTMLHUD() {
    _actualizarHTMLHUD({
        estadoJuego,
        Levels,
        puntuacionMaxima,
        uiElements: {
            hudLevelText,
            hudObjectiveText,
            statScoreValue,
            statDepthValue,
            statDistanceValue,
            statSpeedValue,
            statRecordValue,
            statLivesContainer,
            statWeaponValue,
            statTorpedoValue,
            statAssassinValue,
            boostProgressBar,
            laserProgressBar,
            shieldProgressBar,
            bossHealthContainer,
            bossHealthBar
        },
        onHudShake: triggerHudShake
    });
}
// =================================================================================
//  10. CONTROL DEL FLUJO DEL JUEGO
// =================================================================================
// Estas funciones manejan los estados principales: inicio, fin, pausa, transiciones.

function iniciarJuego(nivel = 1) {
    if (__iniciando) return; __iniciando = true;
    if (estadoJuego && estadoJuego.enEjecucion) { __iniciando = false; return; }
    reiniciar(nivel);
    estadoJuego.bloqueoEntrada = 0.2;
    estadoJuego.faseJuego = 'playing';
    estadoJuego.enEjecucion = true;
    estadoJuego.luzVisible = true;
    S.init();
    S.detener('theme_main');
    S.startPlaylist();
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('initial-menu');
    }
    if (gameplayHints) gameplayHints.classList.remove('visible'); // Ocultar panel de controles
    setTimeout(function () { __iniciando = false; }, 200);
}

function dibujarPiloto(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotacion);
    ctx.scale(1.2, 1.2); // Hacerlo un poco más grande

    const headR = 5;
    const bodyH = 10;
    const bodyW = 8;
    const limbL = 9;
    const limbW = 3;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dibuja las extremidades primero (detrás del cuerpo)
    ctx.strokeStyle = '#a5682a'; // Un tono de piel más oscuro para el contorno
    ctx.lineWidth = limbW;

    // Piernas (animadas)
    const legAngle = Math.sin(estadoJuego.tiempoTranscurrido * 15 + p.x) * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, bodyH / 2);
    ctx.lineTo(Math.cos(legAngle) * limbL, bodyH / 2 + Math.sin(legAngle) * limbL);
    ctx.moveTo(0, bodyH / 2);
    ctx.lineTo(Math.cos(-legAngle) * limbL, bodyH / 2 + Math.sin(-legAngle) * limbL);
    ctx.stroke();

    // Brazos (animados)
    const armAngle = Math.cos(estadoJuego.tiempoTranscurrido * 12 + p.y) * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -bodyH / 4);
    ctx.lineTo(-limbL, armAngle * 4);
    ctx.moveTo(0, -bodyH / 4);
    ctx.lineTo(limbL, -armAngle * 4);
    ctx.stroke();

    // Dibuja el cuerpo y la cabeza
    ctx.fillStyle = '#fce1c3'; // Color piel
    ctx.strokeStyle = '#a5682a';
    ctx.lineWidth = 2;

    // Torso
    ctx.beginPath();
    ctx.rect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
    ctx.fill();
    ctx.stroke();

    // Cabeza
    ctx.beginPath();
    ctx.arc(0, -bodyH / 2 - headR, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function iniciarAnimacionMuerte() {
    estadoJuego.enEjecucion = false;
    estadoJuego.deathAnimTimer = 8.0; // 8 segundos de carnicería

    // --- NUEVO: Iniciar en cámara lenta ---
    estadoJuego.velocidadJuego = 0.2; // 20% de la velocidad normal
    estadoJuego.slowMoDeathDuration = 2.5; // Duración en tiempo real de la cámara lenta

    S.detener('music');
    S.detener('laser_beam');
    S.detener('boost');
    S.detener('gatling_fire');
    S.reproducir('explosion_grande');

    // Limpiar entidades existentes para la escena de muerte
    animales.length = 0;
    pilotos.length = 0;
    trozosHumanos.length = 0;
    escombrosSubmarino.length = 0;
    particulasCasquillos = [];
    Weapons.initWeapons(); // Limpiar proyectiles, etc.

    // Explosión del submarino
    generarExplosion(jugador.x, jugador.y, '#ffcc33', 250);
    generarEscombrosSubmarino(jugador.x, jugador.y);
    for (let i = 0; i < 5; i++) {
        setTimeout(() => generarExplosion(jugador.x + (Math.random() - 0.5) * 150, jugador.y + (Math.random() - 0.5) * 150, '#ff8833', 100), i * 100);
    }

    // Expulsar a los pilotos
    for (let i = 0; i < 3; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 200 + Math.random() * 200;
        pilotos.push({
            x: jugador.x, y: jugador.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 8,
            vida: 999,
            targetBy: null,
            rotacion: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 6
        });
    }

    // Selección aleatoria de la escena de muerte (0: Tiburones, 1: Orcas, 2: Ahogamiento)
    estadoJuego.deathSceneType = Math.floor(Math.random() * 3);
    
    // Fallback: si salen orcas pero no están cargadas, usamos tiburones.
    if (estadoJuego.deathSceneType === 1 && !orcaListo) {
        estadoJuego.deathSceneType = 0;
    }

    if (estadoJuego.deathSceneType === 0) {
        // Escena 0: Tiburones hambrientos
        const numSharks = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numSharks; i++) {
            const y = Math.random() * H;
            const x = (i % 2 === 0) ? (estadoJuego.cameraX - 200) : (estadoJuego.cameraX + W + 200);
            animales.push({
                x: x, y: y, vx: (x > W / 2 ? -1 : 1) * 400, vy: 0, r: 50, w: 128, h: 128,
                capturado: false, frame: 0, timerFrame: 0,
                semillaFase: Math.random() * Math.PI * 2,
                tipo: 'shark',
                isPilotHunter: true, // ¡Bandera especial!
                targetPilot: null
            });
        }
    } else if (estadoJuego.deathSceneType === 1) {
        // Escena 1: Horda de Orcas
        const numOrcas = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numOrcas; i++) {
            const y = Math.random() * H;
            const x = (i % 2 === 0) ? (estadoJuego.cameraX - 300) : (estadoJuego.cameraX + W + 300);
            animales.push({
                x: x, y: y, vx: (x > W / 2 ? -1 : 1) * 500, vy: 0, r: 60, w: 160, h: 160,
                capturado: false, frame: 0, timerFrame: 0,
                semillaFase: Math.random() * Math.PI * 2,
                tipo: 'orca',
                isPilotHunter: true, // ¡Bandera especial!
                targetPilot: null
            });
        }
    }
    // Escena 2: Ahogamiento (no spawneamos cazadores, se hunden solos)
}

export function perderJuego() {
    if (!estadoJuego || estadoJuego.faseJuego === 'gameover' || estadoJuego.faseJuego === 'death_animation') return;
    estadoJuego.faseJuego = 'death_animation';
    iniciarAnimacionMuerte();
}

function mostrarPantallaGameOver() {
    _mostrarPantallaGameOver({
        estadoJuego,
        guardarPuntuacionMaxima,
        getPuntuacionMaxima: () => puntuacionMaxima,
        setPuntuacionMaxima: (v) => { puntuacionMaxima = v; },
        uiElements: {
            mainMenu, levelTransition, brandLogo, welcomeMessage, promptEl, titleEl,
            captainImage, statScore, statDepth, statSpecimens, statDistance,
            finalStats, mainMenuContent, levelSelectContent, startBtn, restartBtn,
            bossHealthContainer, gameplayHints
        },
        S,
        overlay,
        menuFlyBy,
        animales,
        sharkListo,
        whaleListo,
        generarAnimal,
        setModoSuperposicion: (m) => { modoSuperposicion = m; }
    });
}

function ganarJuego() {
    _ganarJuego({
        estadoJuego,
        Levels,
        setNivelMaximoAlcanzado: (n) => { nivelMaximoAlcanzado = n; },
        getPuntuacionMaxima: () => puntuacionMaxima,
        setPuntuacionMaxima: (v) => { puntuacionMaxima = v; },
        guardarPuntuacionMaxima,
        uiElements: {
            mainMenu, levelTransition, welcomeMessage, promptEl, brandLogo,
            captainImage, titleEl, statScore, statDepth, statSpecimens,
            statDistance, finalStats, mainMenuContent, levelSelectContent,
            startBtn, restartBtn, bossHealthContainer, gameplayHints
        },
        S,
        overlay,
        setModoSuperposicion: (m) => { modoSuperposicion = m; }
    });
}
function comprobarCompletadoNivel() {
    if (!estadoJuego || estadoJuego.faseJuego !== 'playing') return;
    const config = Levels.CONFIG_NIVELES[estadoJuego.nivel - 1];
    if (estadoJuego.valorObjetivoNivel >= config.meta) {
        guardarNivelMaximo();
        const proximoNivel = estadoJuego.nivel + 1;
        if (proximoNivel > Levels.CONFIG_NIVELES.length) {
            ganarJuego();
        } else {
            activarTransicionNivel(proximoNivel);
        }
    }
}
function activarTransicionNivel(proximoNivel) { estadoJuego.faseJuego = 'transition'; estadoJuego.enEjecucion = false; const config = Levels.CONFIG_NIVELES[proximoNivel - 1]; if (mainMenu) mainMenu.style.display = 'none'; if (levelTitle) levelTitle.textContent = config.nombre; if (levelDesc) levelDesc.textContent = config.objetivo; if (levelTransition) levelTransition.style.display = 'block'; if (overlay) { overlay.style.display = 'grid'; overlay.classList.remove('initial-menu'); } setTimeout(() => { iniciarSiguienteNivel(proximoNivel); }, 4000); }
function iniciarSiguienteNivel(nivel) { if (!estadoJuego) return; estadoJuego.nivel = nivel; estadoJuego.valorObjetivoNivel = 0; animales = []; Weapons.initWeapons(); estadoJuego.proyectilesTinta = []; Levels.initLevel(nivel); const config = Levels.CONFIG_NIVELES[nivel - 1]; configurarTemaFondo(config ? config.theme : 'default'); if (overlay) overlay.style.display = 'none'; estadoJuego.faseJuego = 'playing'; estadoJuego.enEjecucion = true; estadoJuego.bloqueoEntrada = 0.5; if (gameplayHints) gameplayHints.classList.remove('visible'); }

// Funcio auxiliar para cambiar el tema
export function configurarTemaFondo(tema) {
    const t = FONDOS_TEMAS[tema] || FONDOS_TEMAS['default'];
    if (t.back) { bgImg = t.back; bgListo = true; bgAncho = t.back.width; bgAlto = t.back.height; }
    if (t.front) { fgImg = t.front; fgListo = true; fgAncho = t.front.width; fgAlto = t.front.height; }
    if (estadoJuego) dibujarFondoParallax();
}

function mostrarVistaMenuPrincipal(desdePausa) {
    _mostrarVistaMenuPrincipal(desdePausa, {
        S,
        overlay,
        uiElements: {
            mainMenu, brandLogo, welcomeMessage, promptEl, titleEl,
            captainImage, finalStats, startBtn, restartBtn,
            levelTransition, mainMenuContent, levelSelectContent
        },
        menuFlyBy,
        animales,
        sharkListo,
        whaleListo,
        generarAnimal,
        setModoSuperposicion: (m) => { modoSuperposicion = m; }
    });
}

function poblarSelectorDeNiveles() {
    _poblarSelectorDeNiveles(levelSelectorContainer, Levels.CONFIG_NIVELES, nivelMaximoAlcanzado, iniciarJuego);
}

function actualizarSeleccionNivelVisual() {
    _actualizarSeleccionNivelVisual(levelSelectorContainer, estadoJuego ? estadoJuego.nivelSeleccionadoIndex : 0);
}

function abrirMenuPrincipal() { if (estadoJuego && estadoJuego.enEjecucion) { estadoJuego.enEjecucion = false; mostrarVistaMenuPrincipal(true); if (gameplayHints) gameplayHints.classList.remove('visible'); } }
function puedeUsarPantallaCompleta() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled); } // prettier-ignore
function alternarPantallaCompleta() { if (!puedeUsarPantallaCompleta()) { document.body.classList.toggle('immersive'); return; } const el = document.documentElement; try { if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) { if (el.requestFullscreen) return el.requestFullscreen(); if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen(); } else { if (document.exitFullscreen) return document.exitFullscreen(); if (document.webkitExitFullscreen) return document.webkitExitFullscreen(); } } catch (err) { console.warn('Pantalla completa no disponible', err); } }

/**
 * Ajusta el tamaño de todos los lienzos (canvas) para que coincidan con el tamaño de la ventana.
 * Con el nuevo HUD de superposición, los lienzos deben ocupar toda la pantalla.
 * OPTIMIZACIÓN: Límite de resolución lógica para evitar la asfixia de fill-rate en monitores 4K.
 */
function autoSize() {
    // Definimos un ancho lógico máximo (Full HD). 
    // Evita que el juego consuma toda la CPU/GPU en monitores enormes dibujando 20M píxeles/frame.
    const MAX_LOGICAL_WIDTH = 1920; 
    let scale = 1;

    // Si la pantalla física es más ancha de lo permitido, bajamos la escala.
    // El tamaño visual (CSS width/height = 100vw/100vh) no cambia, por lo que el navegador estira la imagen automáticamente.
    if (innerWidth > MAX_LOGICAL_WIDTH) {
        scale = MAX_LOGICAL_WIDTH / innerWidth;
    }

    const v = { w: Math.round(innerWidth * scale), h: Math.round(innerHeight * scale) }; 
    [bgCanvas, cvs, fxCanvas, sonarCanvas, hudCanvas].forEach(c => { 
        if (c) { 
            c.width = v.w; 
            c.height = v.h; 
        } 
    }); 
    
    W = v.w; 
    H = v.h; 
    calcularCarriles(); 
    
    if (!estadoJuego || !estadoJuego.enEjecucion) { 
        renderizar(0); 
    }
}
// ========= Función de Bucle de Juego (se exporta a main.js) =========
// Este es el corazón del juego, el bucle que se ejecuta continuamente.
let ultimo = 0;
export function gameLoop(t) {
    // Calcula el delta time (dt) para un movimiento consistente independientemente de los FPS.
    const dt = Math.min(0.033, (t - ultimo) / 1000 || 0);
    ultimo = t;
    actualizarGamepad(); // <<< NUEVO: Leer la entrada del mando en cada frame

    let dtAjustado = dt;
    if (estadoJuego) {
        // El tiempo transcurrido ahora avanza siempre para animar el menú
        estadoJuego.tiempoTranscurrido += dt;
        if (estadoJuego.slowMoTimer > 0) {
            estadoJuego.slowMoTimer -= dt;
            if (estadoJuego.slowMoTimer <= 0) estadoJuego.velocidadJuego = 1.0;
        }
        dtAjustado = dt * estadoJuego.velocidadJuego;
    }

    try {
        actualizarParticulas(dtAjustado);
        actualizarCasquillos(dtAjustado);

        // --- OPTIMIZACIÓN: Actualizar Spatial Grid ---
        spatialGrid.clear();
        for (const a of animales) {
            // Solo insertar si está en pantalla o cerca (opcional, por ahora todos)
            // Asumiendo que 'a' tiene x, y, r (radio) o w/h (ancho/alto)
            spatialGrid.insert(a);
        }
        if (estadoJuego.jefe) {
            spatialGrid.insert(estadoJuego.jefe);
        }

        // Actualiza las armas siempre, para efectos de menú y de juego.
        const weaponUpdateContext = {
            dtAjustado, estadoJuego, jugador, animales, W, H, S, Levels,
            generarExplosion, generarTrozoBallena, generarGotasSangre, generarParticula, particulasBurbujas, particulasExplosion,
            puntosPorRescate,
            teclas, generarCasquillo,
            triggerVibration: S.triggerVibration,
            spatialGrid // Pasar el grid a weapons.js
        };
        Weapons.updateWeapons(weaponUpdateContext);

        if (estadoJuego && estadoJuego.enEjecucion) {
            actualizar(dtAjustado);
        } else if (estadoJuego && estadoJuego.faseJuego === 'death_animation') {
            actualizarAnimacionMuerte(dtAjustado, dt); // Pasamos el dt original también
        } else { // Menú
            actualizarCriaturasMenu(dtAjustado);
            actualizarAnimacionMenu(dtAjustado);
        }

        actualizarLiveHUD();

        // Actualiza el polvo de paralaje después de que la cámara se haya movido.
        actualizarPolvoMarino(dtAjustado);
        renderizar(dt);

        if (animarSubmarino) {
            renderizarSubmarinoBailarin(t);
        }
    } catch (e) {
        console.error("Error en el bucle principal del juego:", e);
    }
    // Solicita al navegador que vuelva a llamar a esta función en el próximo frame.
    requestAnimationFrame(gameLoop);
}
// --- Lógica del Gamepad (delegada a input.js) ---
export { actualizarGamepad, actualizarGamepadMenu, actualizarGamepadJuego, abrirMenuPausaDesdeMando };

function actualizarAnimacionMuerte(dt, originalDt) {
    // --- Lógica de cámara lenta ---
    if (estadoJuego.slowMoDeathDuration > 0) {
        estadoJuego.slowMoDeathDuration -= originalDt; // Usar el tiempo real para el contador
        if (estadoJuego.slowMoDeathDuration <= 0) {
            // Cuando el tiempo de slow-mo se acaba, la velocidad del juego empezará
            // a interpolar de vuelta a 1.0 en el bloque 'else'.
        }
    } else {
        // Suavemente volver a la velocidad normal para que los tiburones ataquen más rápido.
        estadoJuego.velocidadJuego = lerp(estadoJuego.velocidadJuego, 1.0, originalDt * 2.5);
    }

    estadoJuego.deathAnimTimer -= dt;
    if (estadoJuego.deathAnimTimer <= 0) {
        mostrarPantallaGameOver();
        return;
    }

    // Actualizar pilotos
    for (const p of pilotos) {
        p.vy += 60 * dt; // Gravedad ligera
        p.vx *= 0.98; // Fricción del agua
        p.vy *= 0.98;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotacion += p.vRot * dt;

        // Si la escena es de ahogamiento (2), soltamos burbujas mientras mueren ahogados
        if (estadoJuego.deathSceneType === 2 && Math.random() < 0.15) {
            generarParticula(particulasBurbujas, {
                x: p.x + (Math.random() - 0.5) * 5,
                y: p.y - 5,
                vx: (Math.random() - 0.5) * 10,
                vy: -30 - Math.random() * 20,
                r: Math.random() * 2 + 1,
                vida: 1 + Math.random(),
                color: '' // Blanca (burbuja normal)
            });
        }
    }

    // Actualizar trozos humanos
    for (let i = trozosHumanos.length - 1; i >= 0; i--) {
        const d = trozosHumanos[i];
        d.vy += 250 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rotacion += d.vRot * dt; d.vida -= dt;
        if (d.vida <= 0 || d.y > H + 50) {
            trozosHumanos.splice(i, 1);
        }
    }

    // Actualizar escombros masivos del submarino en el agua
    for (let i = escombrosSubmarino.length - 1; i >= 0; i--) {
        const d = escombrosSubmarino[i];
        d.vy += 220 * dt; // Gravedad hundiendo los pesados escombros de naufragio
        d.vx *= 0.99; // Fricción
        d.vy *= 0.99;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rotacion += d.vRot * dt;
        d.vida -= dt;

        // Si están rociados de sangre, van soltando el rastro sangriento a medida que caen
        if (d.tieneSangre && d.vida > 0 && Math.random() < 0.15 * (estadoJuego.velocidadJuego)) {
             generarParticula(particulasExplosion, { 
                x: d.x + (Math.random()-0.5)*10, y: d.y + (Math.random()-0.5)*10, 
                vx: d.vx*0.2, vy: d.vy*0.3 - 20, // Sangre flota un poquito más lento que el plomo
                r: 1 + Math.random()*2.5, vida: 0.5 + Math.random(), color: '#8b0000' 
            });
        }

        if (d.vida <= 0 || d.y > H + 100) {
            escombrosSubmarino.splice(i, 1);
        }
    }

    // Actualizar trozos de ballena (gore de colisión)
    for (let i = whaleDebris.length - 1; i >= 0; i--) {
        const d = whaleDebris[i];
        d.vy += 250 * dt; // Gravedad
        d.vx *= 0.99; // Fricción del agua
        d.vy *= 0.99;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rotacion += d.vRot * dt;
        d.vida -= dt;

        // Dejar un rastro de sangre
        if (Math.random() < 0.4) {
            generarParticula(particulasExplosion, {
                x: d.x, y: d.y,
                vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
                r: 1 + Math.random() * 2, vida: 0.5 + Math.random() * 0.5, color: '#8b0000'
            });
        }

        if (d.vida <= 0 || d.y > H + 50) { whaleDebris.splice(i, 1); }
    }

    // Actualizar cazadores (Tiburones o Orcas)
    for (const a of animales) {
        if ((a.tipo === 'shark' || a.tipo === 'orca') && a.isPilotHunter) {
            if (!a.targetPilot || pilotos.indexOf(a.targetPilot) === -1) {
                // Buscar nuevo piloto
                let closestPilot = null;
                let minDis = Infinity;
                for (const p of pilotos) {
                    if (!p.targetBy) {
                        const dis = Math.hypot(p.x - a.x, p.y - a.y);
                        if (dis < minDis) { minDis = dis; closestPilot = p; }
                    }
                }
                if (closestPilot) { a.targetPilot = closestPilot; closestPilot.targetBy = a; }
            }

            if (a.targetPilot) {
                const target = a.targetPilot;
                const angle = Math.atan2(target.y - a.y, target.x - a.x);
                const speed = a.tipo === 'orca' ? 850 : 700; // Velocidad de caza (orcas son más rápidas)
                a.vx = lerp(a.vx, Math.cos(angle) * speed, dt * 5);
                a.vy = lerp(a.vy, Math.sin(angle) * speed, dt * 5);
                if (Math.hypot(target.x - a.x, target.y - a.y) < a.r * 0.7) { generarTrozosHumanos(target.x, target.y); const pilotIndex = pilotos.indexOf(target); if (pilotIndex > -1) pilotos.splice(pilotIndex, 1); a.targetPilot = null; }
            } else {
                // No hay pilotos, nadar fuera de la pantalla
                a.vx = lerp(a.vx, Math.sign(a.vx) * 400, dt);
                a.vy = lerp(a.vy, 0, dt);
            }
        }
        // Movimiento y animación
        a.x += a.vx * dt; a.y += a.vy * dt; a.timerFrame += dt;
        if (a.tipo === 'shark') {
            if (a.timerFrame >= SHARK_ANIMATION_SPEED) { a.timerFrame -= SHARK_ANIMATION_SPEED; if (SHARK_SPRITE_DATA) { a.frame = (a.frame + 1) % SHARK_SPRITE_DATA.frames.length; } }
        } else if (a.tipo === 'orca') {
            const ORCA_ANIMATION_SPEED = 0.06;
            if (a.timerFrame >= ORCA_ANIMATION_SPEED) { a.timerFrame -= ORCA_ANIMATION_SPEED; if (ORCA_SPRITE_DATA) { a.frame = (a.frame + 1) % ORCA_SPRITE_DATA.frames.length; } }
            // Generar estela burbujas al cazar
            if (a.isPilotHunter && Math.random() < 0.2) {
                generarParticula(particulasBurbujas, { x: a.x - Math.sign(a.vx)*40, y: a.y + (Math.random() - 0.5) * 20, vx: a.vx * 0.2, vy: (Math.random() - 0.5) * 20, r: Math.random() * 2 + 1, vida: 0.5 + Math.random() * 0.5, color: '' });
            }
        }
    }

    // Actualizar partículas de fondo
    actualizarParticulas(dt);
    actualizarPolvoMarino(dt);
}

// --- Animación especial para la pantalla de información ---
function renderizarSubmarinoBailarin(t) {
    if (!infoAnimCtx || !robotListo) return;
    const w = infoAnimCanvas.width;
    const h = infoAnimCanvas.height;
    infoAnimCtx.clearRect(0, 0, w, h);
    const tiempo = t / 1000;

    // 1. Movimiento del submarino más orgánico
    const posX = w / 2 + Math.sin(tiempo * 0.7) * 25;
    const posY = h / 2 + Math.cos(tiempo * 1.1) * 12;

    // 2. Rotación sutil y natural
    const rotacion = Math.sin(tiempo * 0.9) * (Math.PI / 20);

    // 3. Efecto de escala (respiración)
    const escala = 1 + Math.sin(tiempo * 1.5) * 0.04;

    // 4. Burbujas mejoradas
    // Posición trasera del submarino para el origen de las burbujas
    const popaX = posX - (spriteAncho * 1.1) * Math.cos(rotacion);

    for (let i = 0; i < 7; i++) {
        // Cada burbuja tiene su propio ciclo de vida basado en el tiempo
        const cicloBurbuja = (tiempo * (20 + i * 5) + i * 40) % (h + 50);

        const x = popaX + Math.sin(tiempo * 2 + i) * 15; // Oscilan un poco horizontalmente
        const y = h - cicloBurbuja; // Suben desde abajo

        const r = Math.max(1, (1 - y / h) * (4 + Math.sin(tiempo + i))); // Más pequeñas arriba
        const opacidad = Math.max(0.1, (1 - y / h) * 0.7);

        infoAnimCtx.beginPath();
        infoAnimCtx.arc(x, y, r, 0, Math.PI * 2);
        infoAnimCtx.fillStyle = `rgba(207, 233, 255, ${opacidad})`;
        infoAnimCtx.fill();
    }

    // Dibujar el submarino
    infoAnimCtx.save();
    infoAnimCtx.translate(posX, posY);
    infoAnimCtx.rotate(rotacion);
    infoAnimCtx.scale(escala, escala);
    const frameCount = HECTOR_FRAME_KEYS.length || 1;
    const frame = Math.floor(tiempo * 20) % frameCount;
    dibujarHector(infoAnimCtx, 0, 0, 0.8, frame);
    infoAnimCtx.restore();

}

function dibujarParticulas() {
    if (!ctx) return;
    ctx.save();
    // Partículas de polvo y ambiente (detrás de todo)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particulas) { ctx.globalAlpha = clamp(p.baseA * (0.65 + 0.35 * Math.sin(p.tw)), 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }

    // Partículas de explosión (brillantes)
    for (const p of particulasExplosion) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }

    // Partículas de tinta/humo (oscuras)
    ctx.globalCompositeOperation = 'source-over';
    for (const p of particulasTinta) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1) * 0.8; ctx.fillStyle = p.color; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }

    // Burbujas (solo contorno)
    ctx.strokeStyle = '#aae2ff';
    ctx.lineWidth = 1.5;
    for (const p of particulasBurbujas) {
        ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1) * (p.color === '#b22222' ? 0.9 : 0.7); // Burbujas de sangre más opacas
        ctx.strokeStyle = p.color === '#b22222' ? '#ff8080' : '#aae2ff'; // Color del borde
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

// =================================================================================
//  11. INICIALIZACIÓN GENERAL Y GESTIÓN DE EVENTOS (Módulo input.js)
// =================================================================================

export function init() {
    menuFlyBy = {
        active: false,
        x: -200,
        y: H / 2,
        vx: 0,
        cooldown: 5.0,
        rotation: 0,
        chasingSharks: [],
        fireCooldown: 0
    };

    setInputContextGetter(() => ({
        W,
        H,
        estadoJuego,
        jugador,
        Levels,
        iniciarJuego,
        abrirMenuPrincipal,
        lanzarTorpedo,
        disparar,
        autoSize,
        actualizarIconos,
        alternarPantallaCompleta,
        mostrarVistaMenuPrincipal,
        poblarSelectorDeNiveles,
        actualizarSeleccionNivelVisual,
        modoSuperposicion,
        elementosUI: {
            controllerDisconnectOverlay,
            controllerConnectPrompt,
            gameplayHints,
            helpBtn,
            startBtn,
            restartBtn,
            levelSelectBtn,
            backToMainBtn,
            pauseBtn,
            muteBtn,
            infoBtn,
            infoOverlay,
            cheatBtn,
            githubBtn,
            fsBtn,
            shareBtn,
            logoHUD,
            resumeWithKeyboardButton,
            useGamepadButton,
            stayOnKeyboardButton,
            closeInfo,
            overlay,
            mainMenuContent,
            levelSelectContent,
            levelSelectorContainer
        },
        creditosState: {
            a_creditos_imagenes,
            a_creditos_intervalo,
            a_creditos_imagen_actual,
            estabaCorriendoAntesCreditos,
            animarSubmarino
        }
    }));

    inicializarEventosInput();

    // --- Inicialización Final del Juego ---
    autoSize();
    S.init();
    inicializarCanvasOffscreen();
    actualizarIconos();
    reiniciar();
    mostrarVistaMenuPrincipal(false);

    cargarImagen('js/svg/propeller.svg', function (img) {
        if (!img) return;
        propellerImg = img;
        propellerReady = true;
    });

    Weapons.loadWeaponAssets(cargarImagen, ctx);
}