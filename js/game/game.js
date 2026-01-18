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
import * as Levels from '../levels/levels.js';
import * as Weapons from './armas/weapons.js';

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

// --- NUEVO: Canvas Offscreen para optimización de renderizado ---
let offscreenCanvas = null;
let offscreenCtx = null;

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
// --- Funciones Matemáticas y de Utilidad ---
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dificultadBase() {
    if (!estadoJuego || !estadoJuego.enEjecucion) return 0;
    return estadoJuego.tiempoTranscurrido / 150;
}

// --- Cargadores de Recursos Asíncronos ---
export function cargarImagen(url, cb) {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => cb(im);
    im.onerror = () => {
        console.error(`Error al cargar la imagen: ${url}. Asegúrate de que el archivo existe en la ruta correcta y el nombre no tiene errores de tipeo.`);
        cb(null);
    };
    im.src = url;
}
function cargarJson(url, cb) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => cb(data))
        .catch(e => {
            console.error(`Error al cargar el JSON: ${url}.`, e);
            cb(null);
        });
}

// =================================================================================
//  2. CONFIGURACIÓN DE LIENZOS (CANVAS) Y REFERENCIAS A LA UI
// =================================================================================

// --- Lienzos (Canvas) ---
// Cada canvas representa una capa del juego para optimizar el renderizado.
const bgCanvas = document.getElementById('bgCanvas'), bgCtx = bgCanvas.getContext('2d');
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
//  3. GESTOR DE AUDIO (SINGLETON)
// =================================================================================
// El objeto 'S' (de Sonido) es un singleton que maneja toda la lógica de audio.
// Carga todos los sonidos al inicio y proporciona métodos para reproducir, detener, etc.
const THEME_SONG = 'canciones/dulcehermosa.mp3';
const GAME_PLAYLIST = [
    'canciones/Abismo_de_Acero.mp3',
    'canciones/Batalla_de_las_Profundidades.mp3',
    'canciones/Beneath_the_Waves.mp3',
    'canciones/Oceans_Code.mp3',
    'canciones/Pixel_Pandemonium.mp3'
];
export const S = (function () {

    let creado = false;
    const a = {}; // Almacenará { element: AudioElement, source: MediaElementAudioSourceNode | null }
    let _silenciado = false;
    let musicaActual = null;
    let audioCtx = null;
    let analyser = null; // prettier-ignore
    let dataArray = null;

    const mapaFuentes = {
        theme_main: THEME_SONG,
        arpon: 'sonidos/submarino/arpon.wav',
        choque: 'sonidos/choque.wav',
        gameover: 'sonidos/gameover.wav',
        torpedo: 'sonidos/submarino/torpedo.wav',
        boss_hit: 'sonidos/boss_hit.mp3',
        victory: 'sonidos/victoria.mp3',
        ink: 'sonidos/ink.wav',
        shotgun: 'sonidos/submarino/shotgun.wav',
        machinegun: 'sonidos/submarino/machinegun.wav',
        gatling_spinup: 'sonidos/submarino/boost.wav', // REUTILIZADO
        gatling_fire: 'sonidos/submarino/machinegun.wav', // REUTILIZADO
        reload: 'sonidos/submarino/reload.wav',
        laser_beam: 'sonidos/submarino/laser.wav',
        // Sonidos que faltaban (usados en los niveles pero no definidos aquí)
        choque_ligero: 'sonidos/choque_ligero.mp3',
        disparo_enemigo: 'sonidos/disparo_enemigo.mp3',
        explosion_grande: 'sonidos/explosion_grande.mp3',
        explosion_simple: 'sonidos/explosion_simple.mp3',
        powerup: 'sonidos/powerup.mp3',
        // Sonidos de ballena
        whale_song1: 'sonidos/ballena/ballenacanta1.mp3',
        whale_song2: 'sonidos/ballena/ballenacanta2.mp3',
        whale_song3: 'sonidos/ballena/ballenacanta3.mp3',
        whale_spout: 'sonidos/ballena/ballenachorro.mp3',
        boost: 'sonidos/submarino/boost.wav',
        sonar_ping: 'sonidos/sonar_ping.wav'
    };

    GAME_PLAYLIST.forEach((cancion, i) => { mapaFuentes[`music_${i}`] = cancion; });

    function initAudioContext() { // prettier-ignore
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128; // Potencia de 2, 32-32768. 128 es suficiente y eficiente.
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            analyser.connect(audioCtx.destination);
        } catch (e) {
            console.error("Web Audio API no es soportada en este navegador.", e);
            audioCtx = null; // Asegurarse de que es null si falla
        }
    }

    function init() {
        if (creado) return;
        creado = true;
        initAudioContext();
        for (const k in mapaFuentes) {
            try {
                const el = new Audio(mapaFuentes[k]);
                el.crossOrigin = "anonymous";
                el.preload = 'auto';
                if (k.startsWith('music_')) { el.loop = false; el.volume = 0.35; el.addEventListener('ended', playRandomMusic); }
                else if (k === 'theme_main') { el.loop = true; el.volume = 0.35; }
                // --- NUEVO: Sonidos de efectos que hacen loop --- // prettier-ignore
                else if (k === 'laser_beam' || k === 'boost' || k === 'gatling_spinup' || k === 'gatling_fire') {
                    el.loop = true; el.volume = 0.45; // Un volumen adecuado para efectos continuos
                }
                else { el.volume = 0.5; }
                el.addEventListener('error', function (e) { console.error(`Error al cargar el audio: ${el.src}. Asegúrate de que el archivo existe y la ruta es correcta.`); }); a[k] = { element: el, source: null };
            } catch (e) { console.warn(`No se pudo crear el objeto de audio para: ${mapaFuentes[k]}`); }
        }
    }
    function reproducir(k) {
        const audioObj = a[k];
        if (!audioObj) {
            console.warn(`Se intentó reproducir un sonido no cargado: '${k}'`);
            return;
        }
        const el = audioObj.element;

        // Conectar al analizador si es una pista de música y el contexto de audio existe
        if (k.startsWith('music_') || k === 'theme_main') {
            if (audioCtx && !audioObj.source) {
                try {
                    audioObj.source = audioCtx.createMediaElementSource(el);
                    audioObj.source.connect(analyser);
                } catch (e) {
                    console.error(`No se pudo conectar el audio '${k}' al analizador:`, e);
                }
            }
        }

        // Resumir el contexto de audio si está suspendido (política de autoplay de los navegadores)
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(e => console.error("Error al resumir el AudioContext:", e));
        }

        try {
            el.currentTime = 0;
            const promise = el.play();
            if (promise !== undefined) {
                promise.catch(error => {
                    if (error.name !== 'AbortError') {
                        // No mostrar error si es por interacción del usuario, es normal.
                        if (error.name !== 'NotAllowedError') {
                            console.error(`Error al reproducir el sonido '${k}':`, error);
                        }
                    }
                });
            }
        } catch (e) { console.error(`Error inesperado al intentar reproducir el sonido '${k}':`, e); }
    }
    function detener(k) {
        if (k === 'music' && musicaActual) k = musicaActual;
        const audioObj = a[k];
        if (!audioObj) return;
        try {
            if (k.startsWith('music_')) { audioObj.element.removeEventListener('ended', playRandomMusic); }
            audioObj.element.pause();
            audioObj.element.currentTime = 0;
            if (k.startsWith('music_')) { audioObj.element.addEventListener('ended', playRandomMusic); }
        } catch (e) { }
    }
    function startPlaylist() {
        if (musicaActual) detener(musicaActual);
        playRandomMusic();
    }
    function playRandomMusic() {
        let nuevaCancionKey; const posiblesCanciones = Object.keys(a).filter(k => k.startsWith('music_')); if (posiblesCanciones.length === 0) return; do { const indiceAleatorio = Math.floor(Math.random() * posiblesCanciones.length); nuevaCancionKey = posiblesCanciones[indiceAleatorio]; } while (posiblesCanciones.length > 1 && nuevaCancionKey === musicaActual);
        musicaActual = nuevaCancionKey;
        reproducir(musicaActual); // Usar la función `reproducir` que ya maneja el error
    }
    function playRandomWhaleSong() {
        const whaleSongs = Object.keys(a).filter(k => k.startsWith('whale_song'));
        if (whaleSongs.length === 0) return;
        const songToPlay = whaleSongs[Math.floor(Math.random() * whaleSongs.length)];
        reproducir(songToPlay);
    }
    function pausar(k) { if (k === 'music' && musicaActual) k = musicaActual; const audioObj = a[k]; if (!audioObj) return; try { audioObj.element.pause(); } catch (e) { } }
    function bucle(k) {
        if (k === 'music' && musicaActual) k = musicaActual;
        const audioObj = a[k];
        if (!audioObj || !audioObj.element.paused) return; const el = audioObj.element;
        try {
            const promise = el.play();
            if (promise !== undefined) {
                promise.catch(error => { });
            }
        } catch (e) { }
    }
    function getAudioData() {
        if (!analyser || !dataArray) return 0;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        // Promedio de las frecuencias bajas (graves) para detectar el "pulso"
        const bassBins = Math.floor(dataArray.length * 0.1); // Usar el 10% de las frecuencias más bajas
        for (let i = 0; i < bassBins; i++) {
            sum += dataArray[i];
        }
        return bassBins > 0 ? sum / bassBins : 0;
    }
    function setSilenciado(m) { for (const k in a) { try { a[k].element.muted = !!m; } catch (e) { } } _silenciado = !!m; }

    /**
     * Activa la vibración en el mando de juego conectado, si existe.
     * @param {number} duration Duración de la vibración en milisegundos.
     * @param {number} [weak=1.0] Intensidad del motor de vibración débil (0.0 a 1.0).
     * @param {number} [strong=1.0] Intensidad del motor de vibración fuerte (0.0 a 1.0).
     */
    function triggerVibration(duration, weak = 1.0, strong = 1.0) {
        if (!gamepadConectado || !estadoJuego || !estadoJuego.enEjecucion) return;

        const gamepads = navigator.getGamepads();
        if (!gamepads[0] || !gamepads[0].vibrationActuator) return;

        gamepads[0].vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: duration,
            weakMagnitude: weak,
            strongMagnitude: strong
        }).catch(e => { /* No hacer nada si falla, es una característica no esencial. */ });
    }
    function estaSilenciado() { return _silenciado; }
    function alternarSilenciado() { setSilenciado(!estaSilenciado()); }
    return { init, reproducir, detener, pausar, bucle, setSilenciado, estaSilenciado, alternarSilenciado, startPlaylist, playRandomWhaleSong, getAudioData, triggerVibration };
})();

// =================================================================================
//  4. GESTIÓN DE DATOS DEL JUGADOR (LOCALSTORAGE)
// =================================================================================
// Se encarga de guardar y recuperar la puntuación máxima y el nivel más alto
// alcanzado por el jugador, para persistir entre sesiones de juego.
const CLAVE_PUNTUACION = 'expedicion_hiscore_v2';
const CLAVE_NIVEL_MAX = 'expedicion_maxlevel_v2';
let puntuacionMaxima = 0; try { puntuacionMaxima = parseInt(localStorage.getItem(CLAVE_PUNTUACION) || '0', 10) || 0; } catch (e) { }
let nivelMaximoAlcanzado = 1; try { nivelMaximoAlcanzado = parseInt(localStorage.getItem(CLAVE_NIVEL_MAX) || '1', 10) || 1; } catch (e) { }
function guardarPuntuacionMaxima() { try { localStorage.setItem(CLAVE_PUNTUACION, String(puntuacionMaxima)); } catch (e) { } }
function guardarNivelMaximo() { try { const proximoNivelDesbloqueado = Math.min(estadoJuego.nivel + 1, Levels.CONFIG_NIVELES.length); if (proximoNivelDesbloqueado > nivelMaximoAlcanzado) { nivelMaximoAlcanzado = proximoNivelDesbloqueado; localStorage.setItem(CLAVE_NIVEL_MAX, String(nivelMaximoAlcanzado)); } } catch (e) { } }

// =================================================================================
//  5. CARGA DE RECURSOS DEL JUEGO (ASSETS)
// =================================================================================

// --- Sprites Principales ---
let robotImg = null, robotListo = false, spriteAncho = 96, spriteAlto = 64, robotEscala = 2;
cargarImagen('img/subastian.png', function (img) { if (img) { robotImg = img; robotListo = true; const altoObjetivo = 64; const ratio = img.width / img.height; spriteAlto = altoObjetivo; spriteAncho = Math.round(altoObjetivo * ratio); } });
let criaturasImg = null, criaturasListas = false, cFrameAncho = 0, cFrameAlto = 0, cFilas = 0;
cargarImagen('img/sprites/criaturas.png', function (img) { if (img) { criaturasImg = img; cFrameAncho = Math.floor(img.width / 2); cFilas = Math.max(1, Math.floor(img.height / cFrameAncho)); cFrameAlto = Math.floor(img.height / cFilas); criaturasListas = true; } });
let fgImg = null, fgListo = false, fgOffset = 0, fgAncho = 0, fgAlto = 0;
cargarImagen('img/Fondos/bg_front.png', function (img) { if (img) { fgImg = img; fgListo = true; fgAncho = img.width; fgAlto = img.height; } });

// --- Fondos con Parallax ---
let bgImg = null, bgListo = false, bgAncho = 0, bgAlto = 0;
let bgOffset = 0; // Offset para el scroll del fondo
const BG_DRIFT_SPEED = 8; // Velocidad de deriva constante para el fondo (píxeles/seg)
const FG_DRIFT_SPEED = 25; // Velocidad de deriva constante para el primer plano (píxeles/seg)

cargarImagen('img/Fondos/bg_back.png', function (img) {
    if (img) {
        bgImg = img;
        bgListo = true;
        bgAncho = img.width;
        bgAlto = img.height;
        console.log("Imagen de fondo cargada.");
        // >>> NUEVO: Forzar un redibujado del fondo <<<
        // Si el juego ya ha empezado a renderizar (lo que es probable),
        // esta llamada asegura que el fondo se dibuje inmediatamente
        // en lugar de esperar al siguiente ciclo del gameLoop.
        if (estadoJuego) {
            dibujarFondoParallax();
        }
    } else {
        console.error("No se pudo cargar 'img/Fondos/bg_back.png'. Asegúrate de que el archivo existe.");
    }
});

// --- Spritesheets Animados (con JSON) ---
// Cada uno de estos sprites tiene una imagen y un archivo JSON que define los frames.
// Se cargan de forma asíncrona y se usan banderas para saber cuándo están listos.
export let MIERDEI_SPRITE_DATA = null;
export let mierdeiImg = null, mierdeiListo = false;
let mierdeiImgCargada = false;
let mierdeiJsonCargado = false;
function comprobarMierdeiListo() {
    if (mierdeiImgCargada && mierdeiJsonCargado) {
        mierdeiListo = true;
    }
}
cargarImagen('img/sprites/mierdei.png', function (img) {
    if (img) {
        mierdeiImg = img;
        mierdeiImgCargada = true;
        comprobarMierdeiListo();
    } else {
        console.error("No se pudo cargar la imagen 'img/mierdei.png'. Asegúrate de que la ruta es correcta.");
    }
});
cargarJson('js/json_sprites/mierdei.json', function (data) {
    if (data) {
        MIERDEI_SPRITE_DATA = data;
        mierdeiJsonCargado = true;
        comprobarMierdeiListo();
    }
});

let SHARK_SPRITE_DATA = null;
let sharkImg = null, sharkListo = false;
let sharkImgCargada = false;
let sharkJsonCargado = false;
function comprobarSharkListo() {
    if (sharkImgCargada && sharkJsonCargado) {
        sharkListo = true;
    }
}
cargarImagen('img/sprites/tiburon.png', function (img) {
    if (img) {
        sharkImg = img;
        sharkImgCargada = true;
        comprobarSharkListo();
    }
});
cargarJson('js/json_sprites/shark.json', function (data) {
    if (data) {
        SHARK_SPRITE_DATA = data;
        sharkJsonCargado = true;
        comprobarSharkListo();
    }
});

export let WHALE_SPRITE_DATA = null;
export let whaleImg = null, whaleListo = false;
let whaleImgCargada = false;
let whaleJsonCargado = false;
function comprobarWhaleListo() {
    if (whaleImgCargada && whaleJsonCargado) {
        whaleListo = true;
    }
}
cargarImagen('img/sprites/ballena.png', function (img) {
    if (img) {
        whaleImg = img;
        whaleImgCargada = true;
        comprobarWhaleListo();
    }
});
cargarJson('js/json_sprites/whale.json', function (data) {
    if (data) {
        WHALE_SPRITE_DATA = data;
        whaleJsonCargado = true;
        comprobarWhaleListo();
    }
});

export let BABYWHALE_SPRITE_DATA = null;
export let babyWhaleImg = null, babyWhaleListo = false;
let babyWhaleImgCargada = false;
let babyWhaleJsonCargado = false;
function comprobarBabyWhaleListo() {
    if (babyWhaleImgCargada && babyWhaleJsonCargado) {
        babyWhaleListo = true;
    }
}
cargarImagen('img/sprites/ballenabebe.png', function (img) {
    if (img) {
        babyWhaleImg = img;
        babyWhaleImgCargada = true;
        comprobarBabyWhaleListo();
    }
});
cargarJson('js/json_sprites/ballenabebe.json', function (data) {
    if (data) {
        BABYWHALE_SPRITE_DATA = data;
        babyWhaleJsonCargado = true;
        comprobarBabyWhaleListo();
    }
});

export let ORCA_SPRITE_DATA = null;
export let orcaImg = null, orcaListo = false;
let orcaImgCargada = false;
let orcaJsonCargado = false;
function comprobarOrcaLista() {
    if (orcaImgCargada && orcaJsonCargado) {
        orcaListo = true;
    }
}
cargarImagen('img/sprites/orca.png', function (img) {
    if (img) {
        orcaImg = img;
        orcaImgCargada = true;
        comprobarOrcaLista();
    }
});
cargarJson('js/json_sprites/orca.json', function (data) {
    if (data) {
        ORCA_SPRITE_DATA = data;
        orcaJsonCargado = true;
        comprobarOrcaLista();
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
function calcularCarriles() { carriles.length = 0; const minY = H * 0.18, maxY = H * 0.82; for (let i = 0; i < NUM_CARRILES; i++) { const t = i / (NUM_CARRILES - 1); carriles.push(minY + t * (maxY - minY)); } }

// --- Sistema de Partículas ---
// Gestiona todos los efectos visuales como burbujas, explosiones, tinta, etc.
export let particulas = [], particulasExplosion = [], particulasTinta = [], particulasBurbujas = [], particulasCasquillos = [], whaleDebris = [], particulasPolvoMarino = [], pilotos = [], proyectilesEnemigos = [];
let trozosHumanos = [];
let escombrosSubmarino = [];
const SUBMARINE_DEBRIS_PATHS = [
    // Placas de metal retorcidas
    new Path2D('M-20,-15 L20,-20 L25,18 C 10,25 -10,22 -20,15 Z'), // Placa grande
    new Path2D('M-15,-10 L15,-12 L18,10 L-12,15 Z'), // Placa mediana
    new Path2D('M-10,-5 Q 5,-8 12,0 L5,8 Q -5,10 -10,5 Z'), // Trozo curvo
    // Tuberías y componentes
    new Path2D('M-25,-3 L25,-3 L25,3 L-25,3 Z'), // Tubo recto
    new Path2D('M-15,-5 L10,-5 L10,5 C -5,15 -15,5 -15,-5 Z'), // Tubo doblado
    // Fragmento de la cabina (vidrio roto)
    new Path2D('M-15,-15 L 0, -18 L 18, -10 L 15, 15 L -10, 10 Z'),
    // --- NUEVO: Fragmentos más pequeños y detallados ---
    new Path2D('M-5,-2 L5,-2 L5,2 L-5,2 Z'), // Remache o tornillo
    new Path2D('M-8,0 C-3,5 3,-5 8,0'), // Cable/alambre retorcido
    new Path2D('M-6,-6 L6,6 M6,-6 L-6,6'), // Cruz de metal rota
    new Path2D('M-5,-8 L5,0 L-5,8 Z'), // Esquirla pequeña y afilada
    new Path2D('M-4,-4 a 4 4 0 1 1 8 0 a 4 4 0 1 1 -8 0'), // Arandela o tuerca
];
const PILOT_DEBRIS_PATHS = [
    // Torsos (más gráficos)
    new Path2D('M-10,-15 C-5,-22 5,-22 10,-15 L12,8 L-12,8 Z'), // Torso con hombros
    new Path2D('M-8,-12 L8,-14 L10,10 C 5,15 -5,15 -10,10 Z'), // Torso desgarrado
    // Extremidades
    new Path2D('M-4,-20 L4,-18 L2,5 C -2,8 -5,2 -4,-20 Z'), // Brazo/Pierna con forma
    new Path2D('M-15,-4 L15,-3 L12,4 L-12,5 Z'), // Trozo de extremidad
    // Cabeza (semi-reconocible)
    new Path2D('M-10,-10 a 10 10 0 1 1 20 0 C 15,15 -15,15 -10,-10 Z'), // Cabeza rota
    // Trozos irreconocibles y sangrientos
    new Path2D('M-15,-10 L5, -12 L18, 5 C 10,15 -10,12 -15,-10 Z'), // Fragmento 1
    new Path2D('M0,0 C-20,-10 -15,10 0,15 C15,10 20,-10 0,0 Z'), // Fragmento 2 (curvo)
    new Path2D('M-10,-8 L10,-12 L15,10 L-12,15 Z'), // Fragmento 3 (afilado)
];



// --- Funciones de Partículas ---
// Funciones para crear, actualizar y dibujar las partículas.
export function generarParticula(arr, opts) { arr.push({ x: opts.x, y: opts.y, vx: opts.vx, vy: opts.vy, r: opts.r, vida: opts.vida, vidaMax: opts.vida, color: opts.color, tw: Math.random() * Math.PI * 2, baseA: opts.baseA || 1, ...opts }); }

/**
 * Genera un casquillo de bala expulsado desde el submarino.
 * @param {number} x - Posición X de expulsión.
 * @param {number} y - Posición Y de expulsión.
 * @param {boolean} isLevel5 - Si el nivel es vertical.
 */
export function generarCasquillo(x, y, isLevel5 = false) {
    let angulo;
    let velocidad;

    if (isLevel5) {
        // Nivel vertical, el submarino apunta hacia arriba. Expulsar hacia un lado (derecha).
        angulo = 0 + (Math.random() - 0.5) * 0.8; // Ángulo 0 es derecha.
        velocidad = 180 + Math.random() * 80;
    } else {
        // Nivel horizontal, el submarino apunta a la derecha. Expulsar hacia arriba y atrás.
        angulo = -Math.PI / 2 - 0.5 + Math.random(); // Ángulo -PI/2 es arriba.
        velocidad = 150 + Math.random() * 100;
    }

    const vRot = (Math.random() - 0.5) * 15;

    particulasCasquillos.push({
        x, y,
        vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad,
        vida: 2.0 + Math.random() * 1.0, vidaMax: 3.0,
        rotacion: Math.random() * Math.PI * 2, vRot: vRot,
        gravedad: 250, w: 8, h: 4, color: '#d4a14e', // Color latón
        smokeTimer: 0, dropletTimer: 0,
    });
}

/**
 * Genera un chorro de burbujas dañinas desde una posición.
 * Usado por la ballena para su ataque de "Spout".
 * @param {number} x - Posición inicial X.
 * @param {number} y - Posición inicial Y.
 * @param {number} dirY - Dirección vertical del chorro (-1 para arriba, 1 para abajo).
 */
function generarChorroDeAgua(x, y, dirY) {
    const numBurbujas = 45;
    const anguloCono = Math.PI / 7;
    const velocidadBase = 550;

    for (let i = 0; i < numBurbujas; i++) {
        const angulo = (Math.random() - 0.5) * anguloCono;
        const velocidad = velocidadBase * (0.7 + Math.random() * 0.6);
        const vx = Math.sin(angulo) * velocidad;
        const vy = Math.cos(angulo) * velocidad * dirY;

        generarParticula(particulasBurbujas, {
            x, y, vx, vy,
            r: 2 + Math.random() * 4,
            vida: 1.2 + Math.random() * 0.8,
            esChorroDañino: true // Flag para detectar colisión
        });
    }
    S.reproducir('whale_spout');
}

function iniciarParticulas() {
    particulas.length = 0;
    particulasBurbujas.length = 0;
    const densidad = Math.max(40, Math.min(140, Math.floor((W * H) / 28000)));
    for (let i = 0; i < densidad; i++) generarParticula(particulas, { x: Math.random() * W, y: Math.random() * H, vx: -(8 + Math.random() * 22), vy: -(10 + Math.random() * 25), r: Math.random() * 2 + 1.2, vida: 999, color: '#cfe9ff', baseA: 0.25 + Math.random() * 0.25 });
}

// --- NUEVO: Sistema de partículas de polvo/plancton para dar profundidad ---
function generarParticulaPolvoMarino(esInicio = false) {
    const profundidad = 0.2 + Math.random() * 0.8; // de 0.2 a 1.0
    particulasPolvoMarino.push({
        x: esInicio ? Math.random() * W : W + 10,
        y: Math.random() * H,
        profundidad: profundidad,
        r: (0.5 + Math.random() * 1.5) * profundidad,
        vy: (Math.random() - 0.5) * 10, // ligero deriva vertical
        opacidad: (0.1 + Math.random() * 0.4) * profundidad
    });
}

function iniciarPolvoMarino() {
    particulasPolvoMarino.length = 0;
    // Ajustar la densidad según el tamaño de la pantalla para un efecto consistente
    const densidad = Math.max(50, Math.min(200, Math.floor((W * H) / 12000)));
    for (let i = 0; i < densidad; i++) {
        generarParticulaPolvoMarino(true); // true = es la generación inicial
    }
}

function actualizarPolvoMarino(dt) {
    if (!estadoJuego || !estadoJuego.enEjecucion) return;

    const scrollFondo = estadoJuego.levelFlags.scrollBackground !== false;
    if (!scrollFondo) return; // No scroll, no dust movement

    // Calcula el cambio en la posición de la cámara desde el último frame
    const cameraDeltaX = estadoJuego.cameraX - (estadoJuego.prevCameraX || estadoJuego.cameraX);

    for (let i = particulasPolvoMarino.length - 1; i >= 0; i--) {
        const p = particulasPolvoMarino[i];
        // Las partículas más "profundas" (cercanas) se mueven más rápido
        p.x -= cameraDeltaX * p.profundidad;
        p.y += p.vy * dt;

        // Si una partícula se sale de la pantalla, la reciclamos en el otro lado
        if (p.x < -5) {
            p.x = W + 5;
            p.y = Math.random() * H;
        } else if (p.x > W + 5) {
            p.x = -5;
            p.y = Math.random() * H;
        }
        // Reciclaje vertical
        if (p.y < -5) { p.y = H + 5; } else if (p.y > H + 5) { p.y = -5; }
    }
}
// --- FIN NUEVO ---

function actualizarParticulas(dt) {
    for (let arr of [particulas, particulasExplosion, particulasTinta]) {
        for (let i = arr.length - 1; i >= 0; i--) {
            const p = arr[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; p.tw += dt * 2.0;
            if (arr === particulas) { if (p.x < -8 || p.y < -8) { p.x = W + 10 + Math.random() * 20; p.y = H * Math.random(); } }
            else { if (p.vida <= 0) { arr.splice(i, 1); } }
        }
    }
    // Bucle separado para las burbujas para manejar su lógica especial (flotación y colisión)
    for (let i = particulasBurbujas.length - 1; i >= 0; i--) {
        const p = particulasBurbujas[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; p.vy -= 40 * dt; p.vx *= 0.98;
        // Lógica de colisión para el chorro dañino de la ballena
        if (p.esChorroDañino && Math.hypot(jugador.x - p.x, jugador.y - p.y) < jugador.r + p.r) {
            infligirDanoJugador(1, 'choque_ligero');
            p.vida = 0; // La burbuja explota al impactar, independientemente de si el escudo absorbió el daño
        }
        if (p.vida <= 0 || p.y < -p.r) { particulasBurbujas.splice(i, 1); }
    }
}

function actualizarCasquillos(dt) {
    for (let i = particulasCasquillos.length - 1; i >= 0; i--) {
        const c = particulasCasquillos[i];
        c.vida -= dt;
        if (c.vida <= 0) {
            particulasCasquillos.splice(i, 1);
            continue;
        }

        // Física del casquillo
        c.vy += c.gravedad * dt; // Gravedad
        c.vx *= 0.98; // Fricción del agua
        c.vy *= 0.98;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rotacion += c.vRot * dt;

        // Efecto de humo
        c.smokeTimer -= dt;
        if (c.smokeTimer <= 0) {
            c.smokeTimer = 0.05 + Math.random() * 0.05;
            const alpha = (c.vida / c.vidaMax) * 0.4;
            if (alpha > 0) {
                generarParticula(particulasTinta, { // Reutilizamos el array de tinta para el humo
                    x: c.x, y: c.y,
                    vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 15,
                    r: 2 + Math.random() * 4, vida: 0.8 + Math.random() * 0.5,
                    color: `rgba(200, 200, 200, ${alpha})` // Humo grisáceo
                });
            }
        }

        // Efecto de gotas oscuras
        c.dropletTimer -= dt;
        if (c.dropletTimer <= 0) {
            c.dropletTimer = 0.1 + Math.random() * 0.1;
            const alpha = (c.vida / c.vidaMax) * 0.7;
            if (alpha > 0) {
                generarParticula(particulasExplosion, { // Reutilizamos explosiones para las gotas
                    x: c.x, y: c.y, vx: c.vx * 0.1, vy: c.vy * 0.1 + 30,
                    r: 1 + Math.random() * 1.5, vida: 0.5 + Math.random() * 0.3,
                    color: `rgba(20, 15, 10, ${alpha})` // Color oscuro, como aceite
                });
            }
        }
    }
}

function generarBurbujaPropulsion(x, y, isLevel5 = false) { if (Math.random() > 0.6) { const velocidadBaseX = isLevel5 ? 0 : 60; const velocidadBaseY = isLevel5 ? 60 : 0; const dispersion = 25; generarParticula(particulasBurbujas, { x: x, y: y, vx: velocidadBaseX + (Math.random() - 0.5) * dispersion, vy: velocidadBaseY + (Math.random() - 0.5) * dispersion - 20, r: Math.random() * 2 + 1, vida: 1 + Math.random() * 1.5, color: '' }); } }
function generarRafagaBurbujasDisparo(x, y, isLevel5 = false) { for (let i = 0; i < 8; i++) { const anguloBase = isLevel5 ? -Math.PI / 2 : 0; const dispersion = Math.PI / 4; const angulo = anguloBase + (Math.random() - 0.5) * dispersion; const velocidad = 30 + Math.random() * 40; generarParticula(particulasBurbujas, { x: x, y: y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad - 20, r: Math.random() * 2.5 + 1.5, vida: 0.8 + Math.random() * 0.5, color: '' }); } }

// --- Generadores de Efectos Especiales ---
export function generarExplosion(x, y, color = '#ff8833', size = 80) {
    const numParticulas = clamp(Math.floor(size / 4), 15, 60);
    for (let i = 0; i < numParticulas; i++) { const ang = Math.random() * Math.PI * 2, spd = 30 + Math.random() * (size * 1.5); generarParticula(particulasExplosion, { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: Math.random() * (size / 30) + 1, vida: 0.4 + Math.random() * 0.4, color }); }

    // --- NUEVO: Sacudida del HUD por explosiones ---
    if (jugador && estadoJuego && estadoJuego.enEjecucion) {
        const dist = Math.hypot(x - jugador.x, y - jugador.y);
        const maxDist = W * 0.8; // Explosiones más lejanas no afectan
        if (dist < maxDist) {
            // La intensidad depende del tamaño de la explosión y la proximidad al jugador
            const proximityFactor = 1 - (dist / maxDist);
            const sizeFactor = Math.min(size / 200, 1.0); // Normalizar tamaño
            const intensity = (10 + 50 * sizeFactor) * proximityFactor;
            triggerHudShake(intensity);
        }
    }
}

export function generarNubeDeTinta(x, y, size) { S.reproducir('ink'); for (let i = 0; i < 50; i++) { const ang = Math.random() * Math.PI * 2, spd = 20 + Math.random() * size; generarParticula(particulasTinta, { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 15 + Math.random() * size * 0.8, vida: 2.5 + Math.random() * 2, color: '#101010' }); } }

const WHALE_DEBRIS_PATHS = [
    new Path2D('M0,0 C10,-15 30,-15 40,0 C35,18 15,20 0,0 Z'),
    new Path2D('M0,0 L25,-10 L45,5 L20,25 Z'),
    new Path2D('M0,0 Q20,-20 35,-5 Q45,10 25,25 Q5,30 0,15 Z'),
    new Path2D('M0,-5 L15,-15 L30,-10 L40,5 L25,15 L10,20 Z')
];
export function generarTrozoBallena(x, y, numTrozos = 1, fuerza = 150, size = 0) {
    // --- OPTIMIZACIÓN: Limitar la frecuencia de generación de trozos ---
    if (estadoJuego && estadoJuego.chunkGenerationCooldown > 0) return;
    if (estadoJuego) estadoJuego.chunkGenerationCooldown = 0.1; // Máximo ~10 veces por segundo

    for (let i = 0; i < numTrozos; i++) {
        const ang = Math.random() * Math.PI * 2; // Salen en todas direcciones
        const spd = 50 + Math.random() * fuerza;
        const vida = 1.5 + Math.random() * 1.5;
        const coloresCarne = ['#ab4e52', '#8e3a46', '#6d2e37']; // Tonos de carne/sangre
        whaleDebris.push({
            x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, vRot: (Math.random() - 0.5) * 5, rotacion: Math.random() * Math.PI * 2, vida: vida, vidaMax: vida,
            color: coloresCarne[Math.floor(Math.random() * coloresCarne.length)], path: WHALE_DEBRIS_PATHS[Math.floor(Math.random() * WHALE_DEBRIS_PATHS.length)],
            trailCooldown: Math.random() * 0.1 // Stagger initial blood trail
        });
    }
}

function generarTrozosHumanos(x, y) {
    S.reproducir('choque'); // Sonido húmedo y crujiente
    // Aumentar la cantidad de trozos para un efecto más gore
    for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 120 + Math.random() * 280; // Más variación en la velocidad de explosión
        const vida = 1.8 + Math.random() * 2.5;
        const escala = 0.5 + Math.random() * 0.6; // Escala más variada (0.5 a 1.1)
        const coloresSangre = ['#b22222', '#8b0000', '#6d2e37', '#5c1f27'];
        trozosHumanos.push({
            x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            vRot: (Math.random() - 0.5) * 12, // Rotación más rápida
            rotacion: Math.random() * Math.PI * 2,
            vida: vida, vidaMax: vida, color: coloresSangre[Math.floor(Math.random() * coloresSangre.length)],
            path: PILOT_DEBRIS_PATHS[Math.floor(Math.random() * PILOT_DEBRIS_PATHS.length)],
            escala: escala // Guardar la escala individual
        });
    }
    // Generar una nube de sangre más densa
    generarGotasSangre(x, y, 40);
    generarBurbujasDeSangre(x, y);
}

function generarEscombrosSubmarino(x, y) {
    const numTrozos = 40; // Aumentamos la cantidad para una explosión más densa
    for (let i = 0; i < numTrozos; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 150 + Math.random() * 350;
        const vida = 2.5 + Math.random() * 2.5;
        const escala = 0.3 + Math.random() * 0.7; // Hacemos los trozos más pequeños y variados
        const colores = ['#f7b500', '#d69d00', '#ffc733', '#444', '#222', '#ff8c00']; // Amarillos, grises oscuros, naranja quemado
        escombrosSubmarino.push({
            x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            vRot: (Math.random() - 0.5) * 10,
            rotacion: Math.random() * Math.PI * 2,
            vida: vida, vidaMax: vida, color: colores[Math.floor(Math.random() * colores.length)],
            path: SUBMARINE_DEBRIS_PATHS[Math.floor(Math.random() * SUBMARINE_DEBRIS_PATHS.length)],
            escala: escala
        });
    }
    // Pequeñas chispas y humo
    for (let i = 0; i < 60; i++) { // Más chispas para mayor impacto visual
        const ang = Math.random() * Math.PI * 2;
        const spd = 50 + Math.random() * 200;
        generarParticula(particulasExplosion, { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 1 + Math.random() * 2.5, vida: 1.0 + Math.random() * 1.0, color: ['#ffc733', '#ff8c00', '#fff'][Math.floor(Math.random() * 3)] });
    }
}


export function generarGotasSangre(x, y, cantidad = 0) {
    // --- OPTIMIZACIÓN: Limitar la frecuencia de generación de sangre ---
    if (estadoJuego && estadoJuego.bloodGenerationCooldown > 0) return;
    if (estadoJuego) estadoJuego.bloodGenerationCooldown = 0.05; // Máximo ~20 veces por segundo

    const numGotas = cantidad > 0 ? cantidad : 10 + Math.random() * 10;
    for (let i = 0; i < numGotas; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 100;
        const r = 1.5 + Math.random() * 2.5;
        generarParticula(particulasExplosion, {
            x, y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: r,
            vida: 0.8 + Math.random() * 0.6,
            color: '#b22222' // Color sangre
        });
    }
}

export function generarBurbujasDeSangre(x, y) {
    for (let i = 0; i < 15 + Math.random() * 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 10 + Math.random() * 50;
        const r = 2 + Math.random() * 4;
        generarParticula(particulasBurbujas, {
            x: x, y: y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 30, // Tend to float up
            r: r,
            vida: 1.0 + Math.random() * 1.0,
            color: '#b22222' // Store blood color
        });
    }
}

function generarBurbujasEmbestidaTiburom(x, y) {
    // Generar una estela de burbujas más intensa durante la embestida
    for (let i = 0; i < 2; i++) {
        if (Math.random() > 0.4) {
            const offsetX = (Math.random() - 0.5) * 50; // Alrededor del cuerpo
            const offsetY = (Math.random() - 0.5) * 50;
            generarParticula(particulasBurbujas, {
                x: x + offsetX,
                y: y + offsetY,
                vx: (Math.random() - 0.5) * 40 - 60, // Hacia atrás principalmente
                vy: (Math.random() - 0.5) * 40,
                r: Math.random() * 3.5 + 2,
                vida: 0.7 + Math.random() * 0.7,
                color: '' // El color no se usa para las burbujas, solo el stroke
            });
        }
    }
}

// --- NUEVO: Función para generar humo/aceite cuando el submarino está dañado ---
function generarHumoDaño(x, y, isLevel5 = false) {
    // No generar en cada frame para un efecto más esporádico
    if (Math.random() > 0.6) return;

    const anguloBase = isLevel5 ? Math.PI / 2 : Math.PI; // Hacia abajo en nivel 5, hacia atrás en horizontal
    const angulo = anguloBase + (Math.random() - 0.5) * 0.9; // Un poco de dispersión
    const velocidad = 25 + Math.random() * 30;

    // Reutilizamos el array de partículas de tinta para el humo, ya que tienen un comportamiento similar (oscuro, se disipa)
    generarParticula(particulasTinta, {
        x: x,
        y: y,
        vx: Math.cos(angulo) * velocidad,
        vy: Math.sin(angulo) * velocidad - 25, // Tiende a flotar un poco hacia arriba
        r: 4 + Math.random() * 6, // Partículas de tamaño variable
        vida: 2.0 + Math.random() * 2.0, // Duran un poco más que las burbujas
        color: `rgba(25, 25, 25, ${0.4 + Math.random() * 0.3})` // Humo/aceite oscuro y semitransparente
    });
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

/**
 * Activa una sacudida en el HUD. La intensidad se acumula si ocurren varios eventos.
 * @param {number} intensity - La fuerza de la sacudida.
 */
function triggerHudShake(intensity) {
    if (!estadoJuego) return;
    // Acumula la intensidad para apilar sacudidas, con un límite para evitar excesos.
    estadoJuego.hudShakeIntensity = Math.min(60, estadoJuego.hudShakeIntensity + intensity);
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
let teclas = {}, gamepadConectado = false, prevGamepadButtons = [];
let modoSuperposicion = 'menu'; let estabaCorriendoAntesCreditos = false;
let __iniciando = false;
let menuFlyBy = null; // Para la animación del submarino en el menú
const INCLINACION_MAX = Math.PI / 24;
const JUGADOR_VELOCIDAD = 350;
const ENFRIAMIENTO_TORPEDO = 1.5;
const RANGOS_ASESINO = [{ bajas: 0, titulo: "NOVATO" }, { bajas: 10, titulo: "APRENDIZ" }, { bajas: 25, titulo: "MERCENARIO" }, { bajas: 50, titulo: "CAZADOR" }, { bajas: 75, titulo: "VETERANO" }, { bajas: 100, titulo: "DEPREDADOR" }, { bajas: 150, titulo: "LEYENDA ABISAL" }];

const SHARK_ANIMATION_SPEED = 0.05; // Segundos por frame. 0.05 = 20 FPS
const WHALE_ANIMATION_SPEED = 0.08; // Un poco más lento para la ballena
const MIERDEi_ANIMATION_SPEED = 0.06;
const BABYWHALE_ANIMATION_SPEED = 0.07;
const ORCA_ANIMATION_SPEED = 0.06;
const SONAR_SWEEP_SPEED = 2.0; // Radianes por segundo para el barrido del sonar

// =================================================================================
//  SISTEMA DE IA AVANZADA PARA HABITANTES MARINOS
// =================================================================================

// --- Constantes de Cardumen ---
const CARDUMEN_RADIO_COHESION = 200;   // Radio para calcular centro del grupo
const CARDUMEN_RADIO_SEPARACION = 50;  // Radio mínimo entre peces
const CARDUMEN_RADIO_ALINEACION = 150; // Radio para alinear velocidades
const CARDUMEN_RADIO_HUIDA = 300;      // Radio de detección de amenazas
const CARDUMEN_FUERZA_COHESION = 0.8;  // Fuerza de atracción al centro
const CARDUMEN_FUERZA_SEPARACION = 1.5; // Fuerza de repulsión (mayor para evitar solapamiento)
const CARDUMEN_FUERZA_ALINEACION = 0.6; // Fuerza de alineación
const CARDUMEN_FUERZA_HUIDA = 3.0;     // Fuerza de huida de amenazas
const CARDUMEN_VELOCIDAD_MAX = 180;    // Velocidad máxima de un pez en cardumen

// --- Constantes de Tiburón ---
const SHARK_ANGULO_FLANQUEO = Math.PI / 4; // 45 grados de flanqueo
const SHARK_RADIO_ACECHO = 400; // Radio para entrar en estado de acecho

// --- Constantes de Orca ---
const ORCA_RADIO_CERCO = 300; // Radio del cerco

/**
 * Calcula las fuerzas de cardumen para un pez (cohesión, separación, alineación).
 * @param {object} pez - El pez actual.
 * @returns {{fx: number, fy: number}} - Las fuerzas a aplicar.
 */
function calcularFuerzasCardumen(pez) {
    let cohesionX = 0, cohesionY = 0, cohesionCount = 0;
    let separacionX = 0, separacionY = 0;
    let alineacionVx = 0, alineacionVy = 0, alineacionCount = 0;

    for (const otro of animales) {
        if (otro === pez) continue;
        // Solo considerar peces normales del cardumen
        if (!['normal', 'rojo', 'aggressive'].includes(otro.tipo)) continue;

        const dx = otro.x - pez.x;
        const dy = otro.y - pez.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 1) continue; // Evitar división por cero

        // Cohesión: atraer hacia el centro del grupo
        if (dist < CARDUMEN_RADIO_COHESION) {
            cohesionX += otro.x;
            cohesionY += otro.y;
            cohesionCount++;
        }

        // Separación: repeler si está muy cerca
        if (dist < CARDUMEN_RADIO_SEPARACION) {
            const fuerza = (CARDUMEN_RADIO_SEPARACION - dist) / CARDUMEN_RADIO_SEPARACION;
            separacionX -= (dx / dist) * fuerza;
            separacionY -= (dy / dist) * fuerza;
        }

        // Alineación: igualar velocidad con vecinos
        if (dist < CARDUMEN_RADIO_ALINEACION) {
            alineacionVx += otro.vx || 0;
            alineacionVy += otro.vy || 0;
            alineacionCount++;
        }
    }

    let fx = 0, fy = 0;

    // Aplicar cohesión
    if (cohesionCount > 0) {
        const centroX = cohesionX / cohesionCount;
        const centroY = cohesionY / cohesionCount;
        fx += (centroX - pez.x) * CARDUMEN_FUERZA_COHESION * 0.01;
        fy += (centroY - pez.y) * CARDUMEN_FUERZA_COHESION * 0.01;
    }

    // Aplicar separación
    fx += separacionX * CARDUMEN_FUERZA_SEPARACION * 50;
    fy += separacionY * CARDUMEN_FUERZA_SEPARACION * 50;

    // Aplicar alineación
    if (alineacionCount > 0) {
        const avgVx = alineacionVx / alineacionCount;
        const avgVy = alineacionVy / alineacionCount;
        fx += (avgVx - (pez.vx || 0)) * CARDUMEN_FUERZA_ALINEACION * 0.1;
        fy += (avgVy - (pez.vy || 0)) * CARDUMEN_FUERZA_ALINEACION * 0.1;
    }

    return { fx, fy };
}

/**
 * Calcula la fuerza de huida de amenazas (jugador, tiburones, orcas).
 * @param {object} pez - El pez actual.
 * @returns {{fx: number, fy: number}} - La fuerza de huida.
 */
function calcularFuerzaHuida(pez) {
    let fx = 0, fy = 0;

    // Huir del jugador
    if (jugador && estadoJuego && estadoJuego.enEjecucion) {
        const dx = pez.x - jugador.x;
        const dy = pez.y - jugador.y;
        const dist = Math.hypot(dx, dy);

        if (dist < CARDUMEN_RADIO_HUIDA && dist > 1) {
            const fuerza = (CARDUMEN_RADIO_HUIDA - dist) / CARDUMEN_RADIO_HUIDA;
            fx += (dx / dist) * fuerza * CARDUMEN_FUERZA_HUIDA * 100;
            fy += (dy / dist) * fuerza * CARDUMEN_FUERZA_HUIDA * 100;
        }
    }

    // Huir de depredadores (tiburones, orcas)
    for (const depredador of animales) {
        if (!['shark', 'orca'].includes(depredador.tipo)) continue;

        const dx = pez.x - depredador.x;
        const dy = pez.y - depredador.y;
        const dist = Math.hypot(dx, dy);

        // Los depredadores tienen un radio de amenaza mayor
        const radioAmenaza = depredador.tipo === 'orca' ? CARDUMEN_RADIO_HUIDA * 1.5 : CARDUMEN_RADIO_HUIDA;

        if (dist < radioAmenaza && dist > 1) {
            const fuerza = (radioAmenaza - dist) / radioAmenaza;
            fx += (dx / dist) * fuerza * CARDUMEN_FUERZA_HUIDA * 120;
            fy += (dy / dist) * fuerza * CARDUMEN_FUERZA_HUIDA * 120;
        }
    }

    return { fx, fy };
}

/**
 * Alerta a peces cercanos cuando uno detecta peligro.
 * @param {object} pezAsustado - El pez que detectó el peligro.
 */
function alertarPecesCercanos(pezAsustado) {
    const RADIO_ALERTA = 250;

    for (const otro of animales) {
        if (otro === pezAsustado) continue;
        if (!['normal', 'rojo', 'aggressive'].includes(otro.tipo)) continue;

        const dist = Math.hypot(otro.x - pezAsustado.x, otro.y - pezAsustado.y);
        if (dist < RADIO_ALERTA) {
            // Marcar como alertado temporalmente
            otro.alertado = true;
            otro.alertaTimer = 2.0; // Alerta activa por 2 segundos
        }
    }
}

/**
 * Calcula el ángulo de flanqueo para tiburones seguidores.
 * @param {number} index - Índice del tiburón en la manada.
 * @param {number} baseAngle - Ángulo base hacia el objetivo.
 * @returns {number} - Ángulo ajustado para flanqueo.
 */
function calcularAnguloFlanqueoTiburon(index, baseAngle) {
    // Los tiburones pares flanquean por arriba, los impares por abajo
    const offset = (index % 2 === 0 ? 1 : -1) * SHARK_ANGULO_FLANQUEO * (Math.floor(index / 2) + 1) * 0.5;
    return baseAngle + offset;
}

/**
 * Calcula la posición de cerco para una orca en la manada.
 * @param {object} orca - La orca.
 * @param {object} objetivo - El objetivo del cerco.
 * @param {number} indexEnManada - Posición de la orca en la manada.
 * @param {number} tamanoManada - Tamaño total de la manada.
 * @returns {{x: number, y: number}} - Posición objetivo del cerco.
 */
function calcularPosicionCercoOrca(orca, objetivo, indexEnManada, tamanoManada) {
    // Distribuir las orcas en un círculo alrededor del objetivo
    const angulo = (Math.PI * 2 / tamanoManada) * indexEnManada;
    return {
        x: objetivo.x + Math.cos(angulo) * ORCA_RADIO_CERCO,
        y: objetivo.y + Math.sin(angulo) * ORCA_RADIO_CERCO
    };
}

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

    jugador = { x: W * 0.18, y: H / 2, r: 26, garra: null, vy: 0, inclinacion: 0 };
    jugador.direccion = 1; // 1 para derecha, -1 para izquierda
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
    iniciarParticulas();
    iniciarPolvoMarino();
    if (gameplayHints) gameplayHints.classList.remove('visible');
}

function velocidadActual() {
    if (!estadoJuego || !estadoJuego.enEjecucion) return 120;
    return Levels.getLevelSpeed();
}
function puntosPorRescate() { const p0 = clamp(estadoJuego.tiempoTranscurrido / 180, 0, 1); return Math.floor(lerp(100, 250, p0)); }

// --- Generación de Enemigos ---
export function generarAnimal(esEsbirroJefe = false, tipoForzado = null, overrides = {}, direccion = -1) {
    const minY = H * 0.15;
    // Con el sistema de cámara, el jugador puede estar en cualquier 'y', así que generamos en toda la altura.
    const usaCamera = estadoJuego.levelFlags.scrollBackground !== false;

    const maxY = H * 0.85;
    const y = overrides.y !== undefined ? overrides.y : (minY + Math.random() * (maxY - minY));
    let velocidad = overrides.velocidad || (velocidadActual() + 60);

    let tipo = tipoForzado || 'normal';

    // --- LÓGICA DE APARICIÓN MEJORADA ---
    // Si no se fuerza un tipo muy específico (como 'dorado' o 'mierdei'),
    // hay una probabilidad de que aparezca un enemigo especial en su lugar.
    const puedeSerEspecial = !tipoForzado || tipoForzado === 'normal' || tipoForzado === 'aggressive' || tipoForzado === 'rojo';

    if (puedeSerEspecial) {
        const r = Math.random();
        // La ballena y el tiburón ahora tienen probabilidades independientes y no se bloquean entre sí.
        if (whaleListo && r < 0.10) { // 10% de probabilidad de que aparezca una familia de ballenas
            tipo = 'whale';
        } else if (orcaListo && r > 0.80 && r < 0.90) { // 10% de probabilidad de que sea una orca
            tipo = 'orca';
        } else if (r > 0.70 && r < 0.80) { // 10% de probabilidad para el nuevo enemigo
            tipo = 'disparador';
        } else if (sharkListo && r > 0.90) { // 10% de probabilidad de que sea un tiburón.
            tipo = 'shark';
        }
    }

    const spawnX = direccion > 0 ? (usaCamera ? estadoJuego.cameraX - (overrides.ancho || 100) : -(overrides.ancho || 100)) : (usaCamera ? estadoJuego.cameraX + W + (overrides.ancho || 100) : W + (overrides.ancho || 100));

    if (tipo === 'disparador') {
        if (!criaturasListas) return; // Necesita la hoja de sprites de criaturas
        const tamano = 96;
        velocidad *= 0.4; // Se mueve más lento que los enemigos normales
        animales.push({
            x: spawnX, y, vx: velocidad * direccion, r: 44, w: tamano, h: tamano,
            capturado: false,
            fila: 3, // Usaremos la fila 4 (índice 3) de la hoja de sprites, asumiendo que existe y es adecuada.
            frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2,
            tipo: 'disparador',
            hp: 15, maxHp: 15, // Más resistente que un pez normal
            shootCooldown: 1.5 + Math.random() * 2, // Cooldown de disparo inicial
        });
    }
    // prettier-ignore
    else if (tipo === 'mierdei') {
        if (!mierdeiListo) return; // Evitar error si la imagen no ha cargado
        const anchoDeseado = overrides.ancho || 100;
        let altoDeseado = anchoDeseado; // Asumir cuadrado por defecto
        if (mierdeiImg.width > 0) {
            altoDeseado = anchoDeseado * (mierdeiImg.height / mierdeiImg.width);
        }
        animales.push({
            x: spawnX, y, vx: velocidad * 0.7 * direccion, r: anchoDeseado / 2,
            w: anchoDeseado, h: altoDeseado, capturado: false, tipo: 'mierdei',
            semillaFase: Math.random() * Math.PI * 2, // Kept for floating, might remove later if not needed
            frame: 0,
            timerFrame: 0,
        });
    } else if (tipo === 'shark') {
        const tamano = overrides.ancho || 128;
        velocidad *= 0.9; // Un poco más lentos al patrullar
        animales.push({
            x: spawnX, y, vx: velocidad * direccion, vy: 0, r: 50, w: tamano, h: tamano,
            capturado: false, frame: 0, timerFrame: 0, hp: 60, maxHp: 60,
            semillaFase: Math.random() * Math.PI * 2,
            tipo: 'shark',
            huntCooldown: 2.0 + Math.random(), // Cooldown inicial antes de la primera caza
            isHunting: false,
            isPackLeader: false,
        });
    } else if (tipo === 'orca') {
        if (!orcaListo) return;

        const packSize = 2 + Math.floor(Math.random() * 2); // Manada de 2 a 3 orcas
        const packId = `orca_pack_${Date.now()}_${Math.random()}`;

        for (let i = 0; i < packSize; i++) {
            const isLeader = (i === 0);
            const tamano = isLeader ? 190 : 170; // El líder es un poco más grande
            const orcaY = y + (i * 80) - ((packSize - 1) * 40); // Espaciarlas verticalmente
            const orcaX = spawnX + i * 100 * -direccion; // Y un poco horizontalmente
            const velocidadOrca = (velocidadActual() + 80) * (isLeader ? 1.1 : 1.0);

            animales.push({
                x: orcaX, y: orcaY, vx: velocidadOrca * direccion, vy: 0, r: 60, w: tamano, h: tamano,
                capturado: false, frame: 0, timerFrame: 0,
                semillaFase: Math.random() * Math.PI * 2,
                tipo: 'orca',
                hp: isLeader ? 120 : 80, maxHp: isLeader ? 120 : 80,
                huntCooldown: 2.0 + Math.random() * 2,
                isHunting: false, // True when hunting player
                isHuntingAnimal: false, // True when hunting other animals
                targetAnimal: null, // The animal it's hunting
                packId: packId,
                isPackLeader: isLeader,
                attackTimer: 0,
            });
        }
    } else if (tipo === 'whale') {
        const tamano = overrides.ancho || 250;
        velocidad *= 0.5; // Muy lentas        
        const patrolWidth = W * (0.8 + Math.random() * 0.4); // Patrullan un área de 80-120% del ancho de la pantalla
        const patrolMaxX = spawnX;
        const patrolMinX = spawnX - patrolWidth;

        const adultWhale = {
            x: spawnX, y, vx: velocidad * direccion, vy: 0, r: 100, w: tamano, h: tamano,
            capturado: false, frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2,
            tipo: 'whale',
            hp: 130, maxHp: 130, // Vida aumentada a 130
            isEnraged: false,
            // --- SUGERENCIA DE IA: NUEVOS ATAQUES PARA LA BALLENA ---
            spoutCooldown: 3.0 + Math.random() * 3, // Temporizador para el chorro de agua
            tailSwipeCooldown: 5.0 + Math.random() * 4, // Temporizador para el coletazo
            isTailSwiping: false,
            tailSwipeProgress: 0,
            songCooldown: 2.0 + Math.random() * 2, // Cooldown para el canto ambiental (REDUCIDO PARA PRUEBAS)
            // --- NUEVO: Estado de protección ---
            isProtecting: false,
            protectedBaby: null,
            isPatrolling: true,
            patrolMinX: patrolMinX,
            patrolMaxX: patrolMaxX,
            revengeTarget: null,
            collisionCooldown: 0,
        };
        animales.push(adultWhale);

        // --- NUEVO: Generar crías de ballena junto a la adulta ---
        if (babyWhaleListo) {
            const numBabies = 1 + Math.floor(Math.random() * 2); // 1 o 2 crías
            for (let i = 0; i < numBabies; i++) {
                const babyTamano = 140; // Un poco más grande que antes
                const babyVelocidad = velocidad * 1.4; // Ligeramente más rápidas que la madre
                const babyY = y + (i === 0 ? -80 : 80) + (Math.random() - 0.5) * 40;
                const babyX = spawnX + (120 + Math.random() * 80) * -direccion;

                animales.push({
                    x: babyX, y: babyY, vx: babyVelocidad * direccion, vy: 0, r: 55, w: babyTamano, h: babyTamano,
                    capturado: false, frame: 0, timerFrame: 0,
                    semillaFase: Math.random() * Math.PI * 2,
                    tipo: 'baby_whale',
                    hp: 40, // Ahora tiene vida y puede ser eliminada
                    maxHp: 40,
                    mother: adultWhale, // Referencia a su madre
                    // --- NUEVO: Estado de huida ---
                    isFleeing: false,
                    fleeTimer: 0,
                });
            }
        }
    } else {
        if (esEsbirroJefe) {
            tipo = 'aggressive';
        }

        if (tipo === 'aggressive') {
            velocidad *= 1.3;
        }

        const tamano = overrides.ancho || 96;
        const fila = (criaturasListas && cFilas > 0) ? ((Math.random() * cFilas) | 0) : 0;

        // --- SUGERENCIA DE IA: PATRONES DE MOVIMIENTO ---
        // En lugar de que todos se muevan en línea recta, asignamos un patrón de movimiento.
        let patronMovimiento = 'lineal';
        const randMov = Math.random();
        if (tipo !== 'aggressive' && randMov < 0.3) {
            patronMovimiento = 'sinusoidal';
        } else if (tipo !== 'aggressive' && randMov < 0.5) {
            patronMovimiento = 'pausa_acelera';
        }
        // --- FIN SUGERENCIA ---

        animales.push({
            x: spawnX, y, vx: velocidad * direccion, r: 44, w: tamano, h: tamano,
            capturado: false, fila, frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2, tipo: tipo, hp: 1, maxHp: 1,
            patronMovimiento: patronMovimiento, // Propiedad para el nuevo tipo de movimiento
            estadoMovimiento: 'moviendo',      // Estado para la IA de 'pausa_acelera'
            timerMovimiento: 0                 // Temporizador para la IA de 'pausa_acelera'
        });
    }
}

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

        // Actualizar tiburones perseguidores
        for (const shark of menuFlyBy.chasingSharks) {
            shark.x += shark.vx * dt;
            shark.y = lerp(shark.y, menuFlyBy.y, dt * 2.0); // Seguir suavemente en el eje Y
            shark.timerFrame += dt;
            if (shark.timerFrame >= SHARK_ANIMATION_SPEED) {
                shark.timerFrame -= SHARK_ANIMATION_SPEED;
                if (SHARK_SPRITE_DATA) {
                    shark.frame = (shark.frame + 1) % SHARK_SPRITE_DATA.frames.length;
                }
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

        // Desactivar cuando sale de la pantalla
        if ((menuFlyBy.vx > 0 && menuFlyBy.x > W + 200) || (menuFlyBy.vx < 0 && menuFlyBy.x < -200)) {
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
        menuFlyBy.cooldown -= dt;
        if (menuFlyBy.cooldown <= 0) {
            menuFlyBy.active = true;
            const desdeIzquierda = Math.random() > 0.5;
            menuFlyBy.vx = (desdeIzquierda ? 1 : -1) * (900 + Math.random() * 500); // Muy rápido
            menuFlyBy.x = desdeIzquierda ? -200 : W + 200;
            menuFlyBy.y = H * 0.2 + Math.random() * H * 0.6; // Altura aleatoria
            menuFlyBy.rotation = (Math.random() - 0.5) * 0.25; // Inclinación aleatoria
            S.reproducir('torpedo'); // Sonido de "whoosh"

            // --- ¡NUEVO! Generar tiburones perseguidores ---
            menuFlyBy.chasingSharks = [];
            menuFlyBy.fireCooldown = 0.1; // Disparar casi de inmediato
            if (sharkListo) {
                const numSharks = 2 + Math.floor(Math.random() * 2); // 2 o 3 tiburones
                for (let i = 0; i < numSharks; i++) {
                    const sharkX = menuFlyBy.x - (Math.sign(menuFlyBy.vx) * (150 + i * 80 + Math.random() * 50));
                    const sharkY = menuFlyBy.y + (Math.random() - 0.5) * 200;

                    const shark = {
                        x: sharkX, y: sharkY,
                        vx: menuFlyBy.vx * (0.85 + Math.random() * 0.1), // Un poco más lentos
                        vy: 0, r: 50, w: 128, h: 128,
                        capturado: false, frame: 0, timerFrame: 0,
                        semillaFase: Math.random() * Math.PI * 2,
                        tipo: 'shark',
                        isChaser: true // Bandera para identificarlos
                    };
                    animales.push(shark); // Añadir al array principal para que se dibujen
                    menuFlyBy.chasingSharks.push(shark);
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
        const offset = -40; // Detrás del centro del submarino

        const burbujaX = jugador.x + offset * Math.cos(finalAngle);
        const burbujaY = jugador.y + offset * Math.sin(finalAngle);
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
        // El jugador ahora está confinado a los límites verticales de la pantalla.
        jugador.y = clamp(jugador.y, jugador.r, H - jugador.r);

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

/**
 * Actualiza la posición del HUD para crear el efecto de sacudida.
 */
function actualizarLiveHUD() {
    if (!estadoJuego || !liveHudContainer) return;

    const s = estadoJuego;

    if (s.hudShakeIntensity > 0.1) {
        // Genera valores aleatorios para la sacudida basados en la intensidad
        s.hudShakeX = (Math.random() - 0.5) * s.hudShakeIntensity;
        s.hudShakeY = (Math.random() - 0.5) * s.hudShakeIntensity;

        liveHudContainer.style.transform = `translate(${s.hudShakeX.toFixed(2)}px, ${s.hudShakeY.toFixed(2)}px)`;

        // Reduce la intensidad para que la sacudida se desvanezca
        s.hudShakeIntensity *= 0.88; // Decaimiento rápido
    } else if (s.hudShakeIntensity !== 0) {
        s.hudShakeIntensity = 0;
        liveHudContainer.style.transform = 'translate(0, 0)';
    }
}

/**
 * OPTIMIZACIÓN: Calcula las posiciones de los pings del sonar y las guarda en caché.
 * Esta función es costosa y se llama a una frecuencia reducida (throttled) desde `actualizar`.
 */
function actualizarSonarPings() {
    if (!estadoJuego) return;

    estadoJuego.sonarPings = []; // Limpiar pings anteriores
    const SONAR_WORLD_RADIUS = 2800;

    // Jugador (siempre en el centro)
    estadoJuego.sonarPings.push({ tipo: 'jugador' });

    // Animales
    for (const a of animales) {
        const dx = a.x - jugador.x; const dy = a.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            const isHostile = a.hp !== undefined || a.tipo === 'shark' || a.tipo === 'mega_whale' || a.tipo === 'mierdei' || a.tipo === 'orca';
            const isBoss = a.tipo === 'mega_whale' || (estadoJuego.jefe && a === estadoJuego.jefe);
            estadoJuego.sonarPings.push({ tipo: 'animal', dx, dy, isHostile, isBoss });
        }
    }

    // Jefe (si existe y no está en la lista de animales)
    if (estadoJuego.jefe && !animales.includes(estadoJuego.jefe)) {
        const dx = estadoJuego.jefe.x - jugador.x; const dy = estadoJuego.jefe.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            estadoJuego.sonarPings.push({ tipo: 'animal', dx, dy, isHostile: true, isBoss: true });
        }
    }

    // Proyectiles y Minas
    const proyectilGrupos = [
        { lista: Weapons.proyectiles, tipo: 'proyectil_jugador' },
        { lista: Weapons.torpedos, tipo: 'torpedo_jugador' },
        { lista: proyectilesEnemigos, tipo: 'proyectil_enemigo' },
        { lista: Weapons.minas, tipo: 'mina' }
    ];
    for (const grupo of proyectilGrupos) {
        for (const p of grupo.lista) {
            const dx = p.x - jugador.x; const dy = p.y - jugador.y;
            if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                const pingData = { tipo: grupo.tipo, dx, dy };
                if (p.vx !== undefined) { pingData.vx = p.vx; pingData.vy = p.vy; }
                if (p.angle !== undefined) pingData.angle = p.angle;
                estadoJuego.sonarPings.push(pingData);
            }
        }
    }

    // Escombros
    for (const e of escombros) {
        const dx = e.x - jugador.x; const dy = e.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            estadoJuego.sonarPings.push({ tipo: 'escombro', dx, dy, tamano: (e.tamano || e.size) });
        }
    }

    // Ataques especiales (Láser, Kraken)
    if (estadoJuego.laserActivo) {
        const isLevel5 = estadoJuego.nivel === 5;
        const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
        const laserAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);
        estadoJuego.sonarPings.push({ tipo: 'laser_jugador', angle: laserAngle });
    }
    if (estadoJuego.jefe && estadoJuego.jefe.lasers) {
        for (const laser of estadoJuego.jefe.lasers) {
            const dx1 = laser.x - jugador.x; const dy1 = laser.y - jugador.y;
            if (Math.hypot(dx1, dy1) < SONAR_WORLD_RADIUS) {
                let endWorldX, endWorldY;
                if (laser.tipo === 'sweep') {
                    endWorldX = laser.x + Math.cos(laser.currentAngle) * laser.length;
                    endWorldY = laser.y + Math.sin(laser.currentAngle) * laser.length;
                } else { // snipe
                    endWorldX = laser.targetX; endWorldY = laser.targetY;
                }
                const dx2 = endWorldX - jugador.x; const dy2 = endWorldY - jugador.y;
                estadoJuego.sonarPings.push({ tipo: 'laser_enemigo', dx1, dy1, dx2, dy2 });
            }
        }
    }
    if (estadoJuego.nivel === 3 && estadoJuego.jefe) {
        for (const ink of estadoJuego.proyectilesTinta) {
            const dx = ink.x - jugador.x; const dy = ink.y - jugador.y;
            if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                estadoJuego.sonarPings.push({ tipo: 'tinta_kraken', dx, dy });
            }
        }
        if (estadoJuego.jefe.estado === 'attacking_smash' && estadoJuego.jefe.datosAtaque) {
            const ataque = estadoJuego.jefe.datosAtaque;
            const dy = ataque.y - jugador.y;
            if (ataque.carga > 0) {
                estadoJuego.sonarPings.push({ tipo: 'rayo_kraken', dy });
            } else {
                const tentacleWorldX = W - ataque.progreso * (W + 200);
                const dx = tentacleWorldX - jugador.x;
                estadoJuego.sonarPings.push({ tipo: 'barrido_kraken', dx, dy });
            }
        }
    }
}
// =================================================================================
//  9. BUCLE PRINCIPAL DE RENDERIZADO (DRAW)
// =================================================================================
// Se encarga de dibujar todo en la pantalla en el orden correcto (de atrás hacia adelante).
function renderizar(dt) {
    // La actualización de los offsets del fondo ahora se hace en `actualizar`.
    // La función de dibujado ya no necesita `dt`.
    if (estadoJuego) dibujarFondoParallax();
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (estadoJuego) {
        ctx.save();

        // --- NUEVO: Aplicar Zoom y Shake a la cámara ---
        // 1. Mover al centro de la pantalla para que el zoom sea centrado
        ctx.translate(W / 2, H / 2);
        // 2. Aplicar el zoom (si es diferente de 1.0)
        if (estadoJuego.cameraZoom !== 1.0) {
            ctx.scale(estadoJuego.cameraZoom, estadoJuego.cameraZoom);
        }
        // 3. Mover de vuelta desde el centro
        ctx.translate(-W / 2, -H / 2);
        // 4. Aplicar el temblor de pantalla (shake)
        if (estadoJuego.screenShake > 0.1) {
            const shakeX = (Math.random() - 0.5) * estadoJuego.screenShake;
            const shakeY = (Math.random() - 0.5) * estadoJuego.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        // Redondeamos la posición de la cámara para evitar temblores por subpíxeles.
        const camX = Math.round(estadoJuego.cameraX);
        const camY = Math.round(estadoJuego.cameraY);
        // Movemos todo el "mundo" en la dirección opuesta a la cámara.
        ctx.translate(-camX, -camY);

        // La llamada a drawLevel() es la que permitirá que level3.js dibuje al jefe.
        Levels.drawLevel();

        for (let i = 0; i < animales.length; i++) {
            const a = animales[i];
            const offsetFlotante = Math.sin(Math.PI * estadoJuego.tiempoTranscurrido * 0.8 + a.semillaFase) * 8;
            ctx.save();

            if (a.tipo === 'baby_whale') {
                // --- Dibuja la Ballena Bebé ---
                ctx.translate(a.x, a.y + offsetFlotante);
                if (babyWhaleListo && BABYWHALE_SPRITE_DATA) {
                    // Si está herida, mostrar un tinte rojo
                    if (a.hp < a.maxHp) {
                        const damageRatio = a.hp / a.maxHp;
                        if (damageRatio < 0.5) {
                            ctx.filter = 'hue-rotate(-15deg) brightness(1.2) saturate(2)';
                        }
                    }

                    // Barra de vida para la cría (solo si está dañada)
                    if (a.hp < a.maxHp) {
                        const barW = 60;
                        const barH = 5;
                        const barY = -a.h / 2.5 - 15;
                        ctx.fillStyle = '#555';
                        ctx.fillRect(-barW / 2, barY, barW, barH);
                        ctx.fillStyle = '#ff5c5c';
                        ctx.fillRect(-barW / 2, barY, barW * (a.hp / a.maxHp), barH);
                    }

                    const frameData = BABYWHALE_SPRITE_DATA.frames[a.frame];
                    if (frameData) {
                        const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                        const aspectRatio = sWidth / sHeight;
                        const dHeight = a.w / aspectRatio;
                        ctx.imageSmoothingEnabled = false;
                        if (a.vx > 0) { ctx.scale(-1, 1); }
                        ctx.drawImage(babyWhaleImg, sx, sy, sWidth, sHeight,
                            Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                    }
                }
            }
            else if (a.tipo === 'orca') {
                // --- Dibuja la Orca ---
                ctx.translate(a.x, a.y + offsetFlotante);
                if (orcaListo && ORCA_SPRITE_DATA) {
                    // Tinte rojo si está herida o cazando
                    if (a.isHunting || (a.hp < a.maxHp)) {
                        ctx.filter = 'hue-rotate(-10deg) brightness(1.2) saturate(1.5)';
                    }

                    // Barra de vida
                    if (a.hp < a.maxHp) {
                        const barW = 80;
                        const barH = 6;
                        const barY = -a.h / 2.5 - 15;
                        ctx.fillStyle = '#555';
                        ctx.fillRect(-barW / 2, barY, barW, barH);
                        ctx.fillStyle = '#ff5c5c';
                        ctx.fillRect(-barW / 2, barY, barW * (a.hp / a.maxHp), barH);
                    }

                    const frameData = ORCA_SPRITE_DATA.frames[a.frame];
                    if (frameData) {
                        const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                        const aspectRatio = sWidth / sHeight;
                        const dHeight = a.w / aspectRatio;
                        ctx.imageSmoothingEnabled = false;
                        // La orca puede moverse en cualquier dirección, así que la volteamos según su vx
                        if (a.vx > 0) { ctx.scale(-1, 1); }
                        ctx.drawImage(orcaImg, sx, sy, sWidth, sHeight,
                            Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                    }
                }
            }
            else if (a.tipo === 'mierdei') {
                if (mierdeiListo && MIERDEI_SPRITE_DATA) {
                    // --- Dibuja el Mierdei ---
                    ctx.translate(a.x, a.y + offsetFlotante);
                    const frameData = MIERDEI_SPRITE_DATA.frames[a.frame];
                    if (frameData) {
                        const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                        const aspectRatio = sWidth / sHeight;
                        const dHeight = a.w / aspectRatio;
                        ctx.imageSmoothingEnabled = false;
                        const dir = a.vx > 0 ? -1 : 1;
                        ctx.scale(dir, 1);
                        ctx.drawImage(mierdeiImg, sx, sy, sWidth, sHeight, Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                    }
                }
            } else if (a.tipo === 'shark') {
                // --- Dibuja el Tiburón ---
                ctx.translate(a.x, a.y);

                // Efecto visual para la caza en manada
                let tint = null;
                if (a.isHunting) {
                    tint = 'rgba(255, 0, 0, 0.3)';
                } else {
                    // Para que se vean mejor en el fondo oscuro, aumentamos su brillo.
                    // No tint
                }
                if (sharkListo && SHARK_SPRITE_DATA) {
                    const frameData = SHARK_SPRITE_DATA.frames[a.frame];
                    if (frameData) {
                        const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;

                        const aspectRatio = sWidth / sHeight;
                        const dHeight = a.w / aspectRatio;

                        ctx.imageSmoothingEnabled = false;
                        if (a.vx > 0) {
                            ctx.scale(-1, 1);
                        }
                        const dx = Math.round(-a.w / 2);
                        const dy = Math.round(-dHeight / 2);

                        if (tint) {
                            dibujarSpriteConTinte(sharkImg, sx, sy, sWidth, sHeight, dx, dy, a.w, dHeight, tint);
                        } else {
                            ctx.drawImage(sharkImg, sx, sy, sWidth, sHeight, dx, dy, a.w, dHeight);
                        }
                    }
                }
            } else if (a.tipo === 'whale') {
                // --- Dibuja la Ballena ---
                ctx.translate(a.x, a.y + offsetFlotante);

                // --- SUGERENCIA DE IA: Efecto visual del coletazo ---
                if (a.isTailSwiping) {
                    const progress = a.tailSwipeProgress; // 0 a 1
                    const alpha = Math.sin(progress * Math.PI); // Fade in and out

                    // Dibuja un arco para representar el área de barrido
                    ctx.beginPath();
                    const tailX = a.w / 2.5; // Origen del coletazo
                    ctx.arc(tailX, 0, 60, -Math.PI / 2, Math.PI / 2);
                    ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * 0.8})`;
                    ctx.lineWidth = 8;
                    ctx.stroke();
                }
                // --- FIN SUGERENCIA ---

                let tint = null;
                if (a.isEnraged) {
                    tint = 'rgba(255, 0, 0, 0.35)';
                }
                if (whaleListo && WHALE_SPRITE_DATA) {
                    const frameData = WHALE_SPRITE_DATA.frames[a.frame];
                    if (frameData) {
                        const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                        const aspectRatio = sWidth / sHeight;
                        const dHeight = a.w / aspectRatio;
                        ctx.imageSmoothingEnabled = false;
                        if (a.vx > 0) { ctx.scale(-1, 1); }
                        const dx = Math.round(-a.w / 2);
                        const dy = Math.round(-dHeight / 2);
                        if (tint) {
                            dibujarSpriteConTinte(whaleImg, sx, sy, sWidth, sHeight, dx, dy, a.w, dHeight, tint);
                        } else {
                            ctx.drawImage(whaleImg, sx, sy, sWidth, sHeight, dx, dy, a.w, dHeight);
                        }
                    }
                }
                // Barra de vida para la ballena
                if (a.hp > 0 && a.maxHp) {
                    const barW = 100;
                    const barH = 8;
                    const barX = -barW / 2;
                    const barY = -a.h / 2 - 20;
                    const hpRatio = a.hp / a.maxHp;
                    ctx.fillStyle = '#555';
                    ctx.fillRect(barX, barY, barW, barH);
                    ctx.fillStyle = hpRatio > 0.5 ? '#5cff5c' : (hpRatio > 0.2 ? '#ffc95c' : '#ff5c5c');
                    ctx.fillRect(barX, barY, barW * hpRatio, barH);
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(barX, barY, barW, barH);
                }

            } else {
                // --- Dibuja las Criaturas Genéricas ---
                let tint = null;
                if (a.tipo === 'aggressive') tint = 'rgba(0, 100, 255, 0.4)';
                if (a.tipo === 'rojo') tint = 'rgba(255, 50, 50, 0.5)';
                if (a.tipo === 'disparador') tint = 'rgba(0, 255, 200, 0.4)';
                if (a.tipo === 'dorado') tint = 'rgba(255, 220, 100, 0.5)';

                if (criaturasListas && cFilas > 0) {
                    const sx = (a.frame % 2) * cFrameAncho, sy = (a.fila % cFilas) * cFrameAlto;
                    ctx.imageSmoothingEnabled = false;
                    const dx = Math.round(a.x - a.w / 2);
                    const dy = Math.round(a.y + offsetFlotante - a.h / 2);
                    if (tint) {
                        dibujarSpriteConTinte(criaturasImg, sx, sy, cFrameAncho, cFrameAlto, dx, dy, a.w, a.h, tint);
                    } else {
                        ctx.drawImage(criaturasImg, sx, sy, cFrameAncho, cFrameAlto, dx, dy, a.w, a.h);
                    }
                } else {
                    // Fallback si la spritesheet no está lista
                    ctx.fillStyle = a.tipo === 'aggressive' ? '#ff5e5e' : '#ffd95e';
                    ctx.beginPath();
                    ctx.arc(a.x, a.y + offsetFlotante, a.r, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Barra de vida para el disparador (dibujada después del sprite)
                if (a.tipo === 'disparador' && a.hp < a.maxHp) {
                    const barW = 60;
                    const barH = 5;
                    const barX = a.x - barW / 2;
                    const barY = a.y + offsetFlotante - a.h / 2 - 15;
                    const hpRatio = a.hp / a.maxHp;
                    ctx.fillStyle = '#555';
                    ctx.fillRect(barX, barY, barW, barH);
                    ctx.fillStyle = hpRatio > 0.5 ? '#5cff5c' : (hpRatio > 0.2 ? '#ffc95c' : '#ff5c5c');
                    ctx.fillRect(barX, barY, barW * hpRatio, barH);
                }
            }
            ctx.restore();
        }

        // Dibuja el submarino de la animación del menú si no se está jugando
        if (estadoJuego && !estadoJuego.enEjecucion) {
            dibujarAnimacionMenu();
        }

        // --- Dibuja al Jugador y sus Efectos ---
        if (jugador && estadoJuego.enEjecucion) {
            const isLevel5 = estadoJuego && estadoJuego.nivel === 5;
            // Animación de flotación sutil
            const bobbingY = Math.sin(estadoJuego.tiempoTranscurrido * 2.5) * 3;
            const px = jugador.x;
            const py = jugador.y + bobbingY; // Aplicar flotación

            // --- FIX: Definir el ángulo final aquí para que esté disponible en todo el bloque ---
            const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
            const anguloFinal = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);

            ctx.save();
            ctx.translate(px, py);
            if (isLevel5) {
                // En el nivel 5, solo rotamos. El ángulo ya está calculado.
                ctx.rotate(anguloFinal);
            } else {
                // En niveles horizontales, volteamos el sprite y aplicamos una rotación corregida.
                ctx.scale(jugador.direccion, 1);
                ctx.rotate(jugador.inclinacion * jugador.direccion);
            }

            // --- Dibuja la Hélice ---
            if (propellerReady && propellerImg) {
                ctx.save();
                // El offset se aplica en el eje X local del submarino, que ya está escalado.
                const propOffsetX = -spriteAncho * robotEscala / 2 - 10;
                ctx.translate(propOffsetX, 0);
                const propSize = 40;

                // Efecto de desenfoque de movimiento (motion blur) a alta velocidad
                if (propellerCurrentSpeed > 35) {
                    ctx.globalAlpha = 0.35;
                    // Dibuja 2 estelas en ángulos ligeramente desfasados
                    ctx.save(); ctx.rotate(propellerRotation - 0.2); ctx.drawImage(propellerImg, -propSize / 2, -propSize / 2, propSize, propSize); ctx.restore();
                    ctx.save(); ctx.rotate(propellerRotation + 0.2); ctx.drawImage(propellerImg, -propSize / 2, -propSize / 2, propSize, propSize); ctx.restore();
                }

                // Hélice principal (siempre visible y nítida)
                ctx.globalAlpha = 1.0;
                ctx.rotate(propellerRotation);
                ctx.drawImage(propellerImg, -propSize / 2, -propSize / 2, propSize, propSize);
                ctx.restore();
            }

            // --- Dibuja el Submarino ---
            if (robotListo) {
                ctx.imageSmoothingEnabled = false;
                const dw = spriteAncho * robotEscala, dh = spriteAlto * robotEscala;
                ctx.drawImage(robotImg, Math.round(-dw / 2), Math.round(-dh / 2), dw, dh);
            } else {
                ctx.fillStyle = '#7ef';
                ctx.beginPath();
                ctx.arc(0, 0, jugador.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // --- Dibuja el Propulsor ---
            if (Weapons.thrusterPatternReady && Weapons.thrusterPattern && propellerCurrentSpeed > 6) { // Se dibuja si se mueve, no solo en ralentí
                const isBoosting = estadoJuego.boostActivo;
                const moveIntensity = clamp((propellerCurrentSpeed - 5) / 20, 0, 1); // 0 en ralentí, 1 a velocidad normal

                let baseLength = 60 * moveIntensity;
                let baseWidth = 40 * moveIntensity;

                ctx.save();
                ctx.translate(px, py);
                // Ahora podemos usar el `anguloFinal` que definimos antes, que es el ángulo del mundo.
                ctx.rotate(anguloFinal);
                ctx.translate(-35, 0); // Posicionar detrás del submarino

                if (isBoosting) {
                    // --- NUEVO EFECTO DE BOOST ESPECTACULAR ---
                    const boostIntensity = estadoJuego.boostEnergia / estadoJuego.boostMaxEnergia;
                    const flicker = 1 + (Math.random() - 0.5) * 0.4; // Parpadeo
                    const length = (180 + 120 * boostIntensity) * flicker;
                    const width = (50 + 25 * boostIntensity) * flicker;

                    // 1. Lens Flare en la base
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const flareRadius = width * 1.2;
                    const flareGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, flareRadius);
                    flareGrad.addColorStop(0, `rgba(220, 255, 255, ${0.9 * boostIntensity})`);
                    flareGrad.addColorStop(0.4, `rgba(100, 220, 255, ${0.5 * boostIntensity})`);
                    flareGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
                    ctx.fillStyle = flareGrad;
                    ctx.beginPath();
                    ctx.arc(10, 0, flareRadius, 0, Math.PI * 2); // Un poco hacia adelante para que se vea bien
                    ctx.fill();
                    ctx.restore(); // Fin Lens Flare

                    // 2. Resplandor exterior (más ancho y cian)
                    const glowWidth = width * 2.0;
                    const glowGrad = ctx.createLinearGradient(0, 0, -length, 0);
                    glowGrad.addColorStop(0, `rgba(0, 200, 255, ${0.5 * boostIntensity})`);
                    glowGrad.addColorStop(1, 'rgba(0, 200, 255, 0)');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-length * 1.1, -glowWidth / 2); ctx.lineTo(-length * 1.1, glowWidth / 2); ctx.closePath(); ctx.fill();

                    // 3. Llama principal (usando el patrón, pero más brillante)
                    ctx.save();
                    ctx.translate(Weapons.thrusterPatternOffsetX, 0);
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = Weapons.thrusterPattern;
                    ctx.globalAlpha = (0.8 + 0.2 * boostIntensity) * moveIntensity;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-length, -width / 2); ctx.lineTo(-length, width / 2); ctx.closePath(); ctx.fill();
                    ctx.restore(); // Fin Llama principal

                    // 4. Núcleo interior blanco y caliente
                    const coreLength = length * 0.9;
                    const coreWidth = width * 0.3;
                    const coreGrad = ctx.createLinearGradient(0, 0, -coreLength, 0);
                    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${1.0 * boostIntensity})`);
                    coreGrad.addColorStop(0.8, `rgba(200, 255, 255, ${0.8 * boostIntensity})`);
                    coreGrad.addColorStop(1, 'rgba(150, 240, 255, 0)');
                    ctx.fillStyle = coreGrad;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-coreLength, -coreWidth / 2); ctx.lineTo(-coreLength, coreWidth / 2); ctx.closePath(); ctx.fill();

                    // 5. Chispas Eléctricas
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const numSparks = 5 + Math.floor(Math.random() * 5);
                    for (let i = 0; i < numSparks; i++) {
                        const sparkStart = Math.random() * length * 0.8;
                        const sparkLength = 15 + Math.random() * 25;
                        const sparkY = (Math.random() - 0.5) * (width * (1 - sparkStart / length));

                        ctx.strokeStyle = `rgba(220, 255, 255, ${0.4 + Math.random() * 0.5})`;
                        ctx.lineWidth = 1 + Math.random() * 1.5;
                        ctx.beginPath();
                        ctx.moveTo(-sparkStart, sparkY);
                        ctx.lineTo(-(sparkStart + sparkLength), sparkY + (Math.random() - 0.5) * 10);
                        ctx.stroke();
                    }
                    ctx.restore(); // Fin Chispas

                    // 6. Emisión de partículas (MEJORADA)
                    if (Math.random() < 0.95) {
                        const numParticles = 4 + Math.floor(Math.random() * 4);
                        for (let i = 0; i < numParticles; i++) {
                            const particleAngle = anguloFinal + Math.PI + (Math.random() - 0.5) * 0.4;
                            const particleSpeed = 500 + Math.random() * 400;
                            const originX = px - 35 * Math.cos(anguloFinal);
                            const originY = py - 35 * Math.sin(anguloFinal);
                            generarParticula(particulasExplosion, { x: originX, y: originY, vx: Math.cos(particleAngle) * particleSpeed, vy: Math.sin(particleAngle) * particleSpeed, r: 1.5 + Math.random() * 2.5, vida: 0.5 + Math.random() * 0.5, color: ['#ffffff', '#afeeee', '#87ceeb'][Math.floor(Math.random() * 3)] });
                        }
                        for (let i = 0; i < 8; i++) { generarBurbujaPropulsion(px - 40 * Math.cos(anguloFinal), py - 40 * Math.sin(anguloFinal) + (Math.random() - 0.5) * 30, isLevel5); }
                    }
                } else {
                    // --- EFECTO NORMAL (SIN BOOST) ---
                    const glowWidth = baseWidth * 1.5;
                    const glowGrad = ctx.createLinearGradient(0, 0, -baseLength, 0);
                    glowGrad.addColorStop(0, 'rgba(0, 150, 255, 0.5)'); glowGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-baseLength * 1.1, -glowWidth / 2); ctx.lineTo(-baseLength * 1.1, glowWidth / 2); ctx.closePath(); ctx.fill();
                    ctx.save();
                    ctx.translate(Weapons.thrusterPatternOffsetX, 0);
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = Weapons.thrusterPattern;
                    ctx.globalAlpha = 0.7 * moveIntensity;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-baseLength, -baseWidth / 2); ctx.lineTo(-baseLength, baseWidth / 2); ctx.closePath(); ctx.fill();
                    ctx.restore();
                    const coreLength = baseLength * 0.6;
                    const coreWidth = baseWidth * 0.25;
                    const coreGrad = ctx.createLinearGradient(0, 0, -coreLength, 0);
                    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)'); coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = coreGrad;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-coreLength, -coreWidth / 2); ctx.lineTo(-coreLength, coreWidth / 2); ctx.closePath(); ctx.fill();
                }

                ctx.restore();
            }

            const drawContext = { ctx, estadoJuego, jugador, px, py, W, H };
            Weapons.drawWeapons(drawContext);

            // --- Dibuja el Escudo de Energía ---
            if (estadoJuego.shieldActivo || estadoJuego.shieldHitTimer > 0) {
                ctx.save();
                ctx.translate(px, py); // Usar las coordenadas de renderizado del jugador

                // --- MODIFICACIÓN: Aumentar el tamaño del escudo ---
                // El radio del escudo ahora se basa en el tamaño visual del submarino, no en su radio de colisión.
                // Esto asegura que el escudo cubra todo el sprite, incluyendo la hélice.
                const subVisualWidth = spriteAncho * robotEscala; // Ancho del sprite del submarino
                const shieldRadius = subVisualWidth * 0.65; // Un 65% del ancho visual es un buen tamaño

                const time = estadoJuego.tiempoTranscurrido;
                let baseAlpha = 0;

                if (estadoJuego.shieldActivo) {
                    const energyRatio = estadoJuego.shieldEnergia / estadoJuego.shieldMaxEnergia;
                    baseAlpha = 0.2 + energyRatio * 0.4; // El escudo es más visible con más energía
                }

                // Efecto de impacto
                if (estadoJuego.shieldHitTimer > 0) {
                    const hitProgress = estadoJuego.shieldHitTimer / 0.4;
                    baseAlpha = Math.max(baseAlpha, hitProgress * 0.9); // Flash brillante al ser golpeado

                    // Dibujar onda de choque en el punto de impacto
                    const rippleRadius = (1 - hitProgress) * shieldRadius * 1.5;
                    const rippleAlpha = hitProgress;
                    ctx.strokeStyle = `rgba(173, 216, 230, ${rippleAlpha})`; // Light blue
                    ctx.lineWidth = 3 * hitProgress;
                    ctx.beginPath();
                    ctx.arc(0, 0, shieldRadius + rippleRadius * 0.2, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Dibujar el escudo principal
                ctx.globalAlpha = baseAlpha;
                const grad = ctx.createRadialGradient(0, 0, shieldRadius * 0.7, 0, 0, shieldRadius);
                grad.addColorStop(0, 'rgba(173, 216, 230, 0.1)');
                grad.addColorStop(0.8, 'rgba(173, 216, 230, 0.8)');
                grad.addColorStop(1, 'rgba(220, 240, 255, 0.5)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
                ctx.fill();

                // Dibujar patrón hexagonal que se mueve
                ctx.strokeStyle = `rgba(200, 230, 255, ${baseAlpha * 0.7})`;
                ctx.lineWidth = 1.5;
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath();
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2 + time * 0.5;
                    ctx.moveTo(Math.cos(angle) * shieldRadius, Math.sin(angle) * shieldRadius);
                    ctx.lineTo(Math.cos(angle + Math.PI / 6) * shieldRadius * 0.9, Math.sin(angle + Math.PI / 6) * shieldRadius * 0.9);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        // --- Dibuja Proyectiles Enemigos ---
        ctx.save();
        for (const p of proyectilesEnemigos) {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();


        // --- Dibuja los Proyectiles ---
        ctx.fillStyle = '#101010';
        for (const ink of estadoJuego.proyectilesTinta) { ctx.beginPath(); ctx.arc(ink.x, ink.y, ink.r, 0, Math.PI * 2); ctx.fill(); }

        ctx.imageSmoothingEnabled = true;
    }

    // --- Dibuja Partículas y Efectos de Mundo (dentro de la cámara) ---
    dibujarParticulas();
    dibujarCasquillos();

    for (const d of whaleDebris) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotacion);
        ctx.scale(0.8, 0.8); // Hacerlos un poco más pequeños
        ctx.globalAlpha = clamp(d.vida / d.vidaMax, 0, 1);

        // Gradiente para un aspecto más orgánico y sangriento
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        grad.addColorStop(0, '#fee'); // Centro más claro (hueso/grasa)
        grad.addColorStop(0.4, '#ab4e52'); // Color principal de la carne
        grad.addColorStop(1, '#6d2e37'); // Borde más oscuro

        ctx.fillStyle = grad;
        ctx.strokeStyle = '#5c1f27'; // Borde rojo sangre muy oscuro
        ctx.lineWidth = 4;
        ctx.fill(d.path);
        ctx.stroke(d.path);
        ctx.restore();
    }

    // Dibujar gore de la muerte del jugador
    for (const p of pilotos) {
        dibujarPiloto(ctx, p);
    }
    for (const d of trozosHumanos) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotacion);
        ctx.scale(d.escala, d.escala);
        ctx.globalAlpha = clamp(d.vida / d.vidaMax, 0, 1);
        ctx.fillStyle = d.color;
        ctx.strokeStyle = '#3b0000';
        ctx.lineWidth = 3;
        ctx.fill(d.path);
        ctx.stroke(d.path);
        ctx.restore();
    }

    // Dibujar escombros del submarino
    for (const d of escombrosSubmarino) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotacion);
        ctx.scale(d.escala, d.escala);
        ctx.globalAlpha = clamp(d.vida / d.vidaMax, 0, 1);
        ctx.fillStyle = d.color;
        ctx.strokeStyle = '#1a1a1a'; // Borde oscuro, casi negro
        ctx.lineWidth = 3;
        ctx.fill(d.path);
        ctx.stroke(d.path);
        ctx.restore();
    }

    // Se restaura el contexto principal (que incluye la cámara, zoom y shake)
    ctx.restore();

    // --- Dibuja Efectos de Pantalla y Actualiza HUD (fuera de la cámara) ---
    dibujarSonar();
    dibujarMascaraLuz();
    dibujarPolvoMarino(); // Dibuja el polvo/plancton en el canvas de efectos
    actualizarHTMLHUD(); // ANTES: dibujarHUD()
}

// --- Funciones de Renderizado Auxiliares ---
function dibujarFondoParallax() {
    if (!estadoJuego || !bgCtx) return;

    // Colores para el ciclo día/noche
    // Día: Azul océano profundo (#1a4b6e -> r:26, g:75, b:110)
    // Noche: Azul casi negro (#06131f -> r:6, g:19, b:31)
    const factor = estadoJuego.dayNightFactor || 0; // 0 = día, 1 = noche

    const r = Math.round(26 + (6 - 26) * factor);
    const g = Math.round(75 + (19 - 75) * factor);
    const b = Math.round(110 + (31 - 110) * factor);

    bgCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    bgCtx.fillRect(0, 0, W, H);

    if (bgListo && bgAncho > 0) {
        bgCtx.imageSmoothingEnabled = false;
        const ratio = bgAncho / bgAlto;
        const alturaDibujoBg = H;
        const anchoDibujoBg = alturaDibujoBg * ratio;
        const bgOffsetLooping = ((bgOffset % anchoDibujoBg) + anchoDibujoBg) % anchoDibujoBg;
        for (let x = -bgOffsetLooping; x < W; x += anchoDibujoBg) {
            bgCtx.drawImage(bgImg, Math.round(x), 0, anchoDibujoBg, alturaDibujoBg);
        }
    }

    if (fgListo && fgAncho > 0 && fgAlto > 0) {
        const yBase = H - fgAlto;
        const fgOffsetLooping = ((fgOffset % fgAncho) + fgAncho) % fgAncho;
        for (let xx = -fgOffsetLooping; xx < W; xx += fgAncho) {
            bgCtx.drawImage(fgImg, Math.round(xx), Math.round(yBase), fgAncho, fgAlto);
        }
    }
}

function dibujarSonar() {
    if (!sonarCtx || !estadoJuego || !estadoJuego.enEjecucion || !estadoJuego.sonarActivo) {
        if (sonarCtx) sonarCtx.clearRect(0, 0, W, H);
        return;
    }

    sonarCtx.clearRect(0, 0, W, H);
    sonarCtx.save();

    // --- 1. Definir el centro y radio del sonar ---
    const SONAR_RADIUS = 100; // Radio en píxeles del minimapa
    const SONAR_WORLD_RADIUS = 2800; // Radio en unidades del juego que cubre el sonar
    const PADDING = 25;
    const centerX = W - SONAR_RADIUS - PADDING;
    const centerY = H - SONAR_RADIUS - PADDING;
    const time = estadoJuego.tiempoTranscurrido;

    // --- 2. Crear la forma base (Octágono) ---
    const octagonPath = new Path2D();
    const sides = 8;
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / sides;
        const x = centerX + SONAR_RADIUS * Math.cos(angle);
        const y = centerY + SONAR_RADIUS * Math.sin(angle);
        if (i === 0) {
            octagonPath.moveTo(x, y);
        } else {
            octagonPath.lineTo(x, y);
        }
    }
    octagonPath.closePath();

    // --- 3. Dibujar el fondo y la retícula ---
    sonarCtx.save();
    sonarCtx.clip(octagonPath); // Todo lo que se dibuje a partir de ahora estará dentro del octágono

    const bgGrad = sonarCtx.createLinearGradient(centerX - SONAR_RADIUS, centerY - SONAR_RADIUS, centerX + SONAR_RADIUS, centerY + SONAR_RADIUS);
    bgGrad.addColorStop(0, 'rgba(0, 59, 142, 0.7)');
    bgGrad.addColorStop(1, 'rgba(6, 19, 31, 0.5)');
    sonarCtx.fillStyle = bgGrad;
    sonarCtx.fill(octagonPath);

    // Retícula (círculos y líneas)
    sonarCtx.strokeStyle = 'rgba(126, 203, 255, 0.2)';
    sonarCtx.lineWidth = 1;
    sonarCtx.setLineDash([2, 4]); // Líneas discontinuas
    for (let i = 1; i <= 3; i++) { // 3 octágonos concéntricos
        const radius = SONAR_RADIUS * (i / 3);
        sonarCtx.beginPath();
        for (let j = 0; j < sides; j++) {
            const angle = (j / sides) * Math.PI * 2 - Math.PI / sides;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (j === 0) sonarCtx.moveTo(x, y);
            else sonarCtx.lineTo(x, y);
        }
        sonarCtx.closePath();
        sonarCtx.stroke();
    }
    sonarCtx.setLineDash([]); // Resetear

    sonarCtx.lineWidth = 0.5;
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / sides;
        sonarCtx.beginPath();
        sonarCtx.moveTo(centerX, centerY);
        sonarCtx.lineTo(centerX + Math.cos(angle) * SONAR_RADIUS, centerY + Math.sin(angle) * SONAR_RADIUS);
        sonarCtx.stroke();
    }

    // --- 4. Dibujar el barrido (sweep) ---
    const sweepAngle = (time * SONAR_SWEEP_SPEED) % (Math.PI * 2);
    const grad = sonarCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, SONAR_RADIUS);
    grad.addColorStop(0, 'rgba(120, 255, 170, 0.3)');
    grad.addColorStop(0.8, 'rgba(100, 255, 150, 0.05)');
    grad.addColorStop(1, 'rgba(100, 255, 150, 0)');
    sonarCtx.fillStyle = grad;
    sonarCtx.beginPath();
    sonarCtx.moveTo(centerX, centerY);
    sonarCtx.arc(centerX, centerY, SONAR_RADIUS, sweepAngle - Math.PI / 2, sweepAngle);
    sonarCtx.closePath();
    sonarCtx.fill();

    // Línea principal del barrido
    sonarCtx.strokeStyle = 'rgba(170, 255, 200, 0.9)';
    sonarCtx.lineWidth = 2;
    sonarCtx.beginPath();
    sonarCtx.moveTo(centerX, centerY);
    sonarCtx.lineTo(centerX + Math.cos(sweepAngle) * SONAR_RADIUS, centerY + Math.sin(sweepAngle) * SONAR_RADIUS);
    sonarCtx.stroke();

    // --- 5. Dibujar los "pings" de los enemigos y el jugador ---
    // El jugador está siempre en el centro del minimapa.
    sonarCtx.fillStyle = '#87CEEB'; // Color del jugador
    sonarCtx.shadowColor = '#87CEEB';
    sonarCtx.shadowBlur = 8;
    sonarCtx.fillRect(centerX - 6, centerY - 1.5, 12, 3); // Cruz horizontal
    sonarCtx.fillRect(centerX - 1.5, centerY - 6, 3, 12); // Cruz vertical
    sonarCtx.shadowBlur = 0;

    for (const a of animales) {
        const dx = a.x - jugador.x;
        const dy = a.y - jugador.y;
        const dist = Math.hypot(dx, dy);

        if (dist < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;

            const isHostile = a.hp !== undefined || a.tipo === 'shark' || a.tipo === 'mega_whale' || a.tipo === 'mierdei' || a.tipo === 'orca';
            const isBoss = a.tipo === 'mega_whale' || (estadoJuego.jefe && a === estadoJuego.jefe);

            const pulse = 1.0 + Math.sin(time * 5 + pingX) * 0.2;
            const pingSize = (isBoss ? 6 : (isHostile ? 4 : 3)) * pulse;

            sonarCtx.fillStyle = isHostile ? 'rgba(255, 80, 80, 0.9)' : 'rgba(100, 255, 150, 0.9)';
            sonarCtx.shadowColor = sonarCtx.fillStyle;
            sonarCtx.shadowBlur = 10;

            sonarCtx.save();
            sonarCtx.translate(pingX, pingY);

            if (isHostile) { // Dibujar como diamante
                sonarCtx.rotate(Math.PI / 4);
                sonarCtx.fillRect(-pingSize / 2, -pingSize / 2, pingSize, pingSize);
            } else { // Dibujar como círculo
                sonarCtx.beginPath();
                sonarCtx.arc(0, 0, pingSize / 2, 0, Math.PI * 2);
                sonarCtx.fill();
            }
            sonarCtx.restore();
        }
    }
    sonarCtx.shadowBlur = 0;

    // Si hay un jefe, marcarlo de forma especial
    if (estadoJuego.jefe) {
        const dx = estadoJuego.jefe.x - jugador.x;
        const dy = estadoJuego.jefe.y - jugador.y;
        const dist = Math.hypot(dx, dy);
        if (dist < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;

            sonarCtx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
            sonarCtx.lineWidth = 2;
            const pulse = 1.0 + Math.sin(time * 3) * 0.1;
            const size = 16 * pulse;
            sonarCtx.strokeRect(pingX - size / 2, pingY - size / 2, size, size);
        }
    }

    // --- NUEVO: Dibujar pings de proyectiles ---
    sonarCtx.shadowBlur = 5;

    // Proyectiles del jugador (balas)
    sonarCtx.fillStyle = 'rgba(200, 220, 255, 0.9)';
    sonarCtx.shadowColor = sonarCtx.fillStyle;
    for (const p of Weapons.proyectiles) {
        const dx = p.x - jugador.x;
        const dy = p.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const angle = Math.atan2(p.vy, p.vx);
            sonarCtx.save();
            sonarCtx.translate(pingX, pingY);
            sonarCtx.rotate(angle);
            sonarCtx.fillRect(-2, -1, 4, 2);
            sonarCtx.restore();
        }
    }

    // Torpedos del jugador
    sonarCtx.fillStyle = 'rgba(170, 230, 255, 1.0)';
    sonarCtx.shadowColor = sonarCtx.fillStyle;
    for (const t of Weapons.torpedos) {
        const dx = t.x - jugador.x;
        const dy = t.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            sonarCtx.save();
            sonarCtx.translate(pingX, pingY);
            sonarCtx.rotate(t.angle);
            sonarCtx.fillRect(-3, -1.5, 6, 3);
            sonarCtx.restore();
        }
    }

    // Proyectiles enemigos
    sonarCtx.fillStyle = 'rgba(255, 150, 150, 0.9)';
    sonarCtx.shadowColor = sonarCtx.fillStyle;
    for (const p of proyectilesEnemigos) {
        const dx = p.x - jugador.x;
        const dy = p.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            sonarCtx.beginPath();
            sonarCtx.arc(pingX, pingY, 2, 0, Math.PI * 2);
            sonarCtx.fill();
        }
    }

    // Minas del jugador
    sonarCtx.fillStyle = 'rgba(255, 180, 50, 0.9)';
    sonarCtx.shadowColor = sonarCtx.fillStyle;
    for (const m of Weapons.minas) {
        const dx = m.x - jugador.x;
        const dy = m.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;

            // Efecto de pulso/parpadeo
            const pulse = Math.floor(time * 3) % 2; // Parpadea
            if (pulse === 0) continue;

            const size = 4;
            sonarCtx.fillRect(pingX - size / 2, pingY - size / 2, size, size);
        }
    }

    // Láser del jugador
    if (estadoJuego.laserActivo) {
        const isLevel5 = estadoJuego.nivel === 5;
        const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
        const laserAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);

        const pulse = 0.8 + Math.sin(time * 40) * 0.2; // Pulso de intensidad

        sonarCtx.strokeStyle = `rgba(255, 100, 100, ${pulse})`;
        sonarCtx.shadowColor = 'rgba(255, 100, 100, 1)';
        sonarCtx.lineWidth = 3;

        sonarCtx.beginPath();
        sonarCtx.moveTo(centerX, centerY);
        sonarCtx.lineTo(centerX + Math.cos(laserAngle) * SONAR_RADIUS, centerY + Math.sin(laserAngle) * SONAR_RADIUS);
        sonarCtx.stroke();
    }

    // --- NUEVO: Dibujar escombros y rocas ---
    sonarCtx.fillStyle = 'rgba(160, 140, 120, 0.7)'; // Color marrón/gris para rocas
    sonarCtx.shadowColor = sonarCtx.fillStyle;
    sonarCtx.shadowBlur = 4;
    for (const e of escombros) {
        const dx = e.x - jugador.x;
        const dy = e.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const size = clamp((e.tamano || e.size) / 20, 2, 5); // Tamaño del ping basado en el tamaño del escombro
            sonarCtx.fillRect(pingX - size / 2, pingY - size / 2, size, size);
        }
    }

    // --- NUEVO: Dibujar láseres enemigos (del jefe) ---
    if (estadoJuego.jefe && estadoJuego.jefe.lasers) {
        const pulse = 0.7 + Math.sin(time * 20) * 0.3;
        sonarCtx.strokeStyle = `rgba(255, 120, 120, ${pulse})`;
        sonarCtx.shadowColor = 'rgba(255, 120, 120, 1)';
        sonarCtx.shadowBlur = 8;
        sonarCtx.lineWidth = 1.5;

        for (const laser of estadoJuego.jefe.lasers) {
            const dx1 = laser.x - jugador.x;
            const dy1 = laser.y - jugador.y;

            if (Math.hypot(dx1, dy1) < SONAR_WORLD_RADIUS) {
                const startPingX = centerX + (dx1 / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                const startPingY = centerY + (dy1 / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                let endPingX, endPingY;

                if (laser.tipo === 'sweep') {
                    const endWorldX = laser.x + Math.cos(laser.currentAngle) * laser.length;
                    const endWorldY = laser.y + Math.sin(laser.currentAngle) * laser.length;
                    endPingX = centerX + ((endWorldX - jugador.x) / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    endPingY = centerY + ((endWorldY - jugador.y) / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                } else { // snipe
                    endPingX = centerX + ((laser.targetX - jugador.x) / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    endPingY = centerY + ((laser.targetY - jugador.y) / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                }
                sonarCtx.beginPath();
                sonarCtx.moveTo(startPingX, startPingY);
                sonarCtx.lineTo(endPingX, endPingY);
                sonarCtx.stroke();
            }
        }
    }

    // --- NUEVO: Dibujar ataques del Kraken (Nivel 3) ---
    if (estadoJuego.nivel === 3 && estadoJuego.jefe) {
        const jefe = estadoJuego.jefe;

        // 1. Proyectiles de Tinta
        sonarCtx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        sonarCtx.shadowColor = 'black';
        sonarCtx.shadowBlur = 6;
        for (const ink of estadoJuego.proyectilesTinta) {
            const dx = ink.x - jugador.x;
            const dy = ink.y - jugador.y;
            if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                sonarCtx.beginPath();
                sonarCtx.arc(pingX, pingY, 4, 0, Math.PI * 2);
                sonarCtx.fill();
            }
        }

        // 2. Ataque de Barrido/Rayo
        if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
            const ataque = jefe.datosAtaque;
            const attackWorldY = ataque.y;
            const dy = attackWorldY - jugador.y;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;

            if (ataque.carga > 0) { // Fase de advertencia (rayo)
                const pulse = 0.5 + Math.sin(time * 15) * 0.5;
                sonarCtx.strokeStyle = `rgba(255, 80, 80, ${pulse})`;
                sonarCtx.lineWidth = 3;
                sonarCtx.shadowColor = 'red';
                sonarCtx.shadowBlur = 10;

                sonarCtx.beginPath();
                sonarCtx.moveTo(centerX - SONAR_RADIUS, pingY);
                sonarCtx.lineTo(centerX + SONAR_RADIUS, pingY);
                sonarCtx.stroke();

            } else { // Fase de barrido (tentáculo)
                const tentacleWorldX = W - ataque.progreso * (W + 200);
                const dx = tentacleWorldX - jugador.x;
                const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;

                const pulse = 1.0 + Math.sin(time * 10) * 0.2;
                const pingSize = 12 * pulse;

                sonarCtx.fillStyle = 'rgba(255, 60, 60, 0.9)';
                sonarCtx.shadowColor = sonarCtx.fillStyle;
                sonarCtx.shadowBlur = 12;

                sonarCtx.save();
                sonarCtx.translate(pingX, pingY);
                sonarCtx.rotate(Math.PI / 4); // Forma de diamante
                sonarCtx.fillRect(-pingSize / 2, -pingSize / 2, pingSize, pingSize);
                sonarCtx.restore();
            }
        }
    }

    sonarCtx.shadowBlur = 0;

    sonarCtx.restore(); // Quita el clipping

    // --- 6. Borde exterior y acentos ---
    sonarCtx.strokeStyle = 'rgba(126, 203, 255, 0.6)';
    sonarCtx.lineWidth = 2;
    sonarCtx.stroke(octagonPath);

    // Acento amarillo, como en el HUD
    sonarCtx.strokeStyle = 'rgba(255, 221, 119, 1)';
    sonarCtx.shadowColor = 'rgba(255, 221, 119, 0.7)';
    sonarCtx.shadowBlur = 10;
    sonarCtx.lineWidth = 4;
    sonarCtx.beginPath();
    // Dibujar el acento en el lado derecho
    const angle1 = (0 / sides) * Math.PI * 2 - Math.PI / sides;
    const angle2 = (1 / sides) * Math.PI * 2 - Math.PI / sides;
    sonarCtx.moveTo(centerX + SONAR_RADIUS * Math.cos(angle1), centerY + SONAR_RADIUS * Math.sin(angle1));
    sonarCtx.lineTo(centerX + SONAR_RADIUS * Math.cos(angle2), centerY + SONAR_RADIUS * Math.sin(angle2));
    sonarCtx.stroke();
    sonarCtx.shadowBlur = 0;

    sonarCtx.restore();
}

// --- NUEVO: Función para dibujar el polvo marino ---
function dibujarPolvoMarino() {
    // Esta función ahora está vacía porque su lógica se ha movido a `dibujarMascaraLuz`
    // para que las partículas de polvo solo aparezcan dentro del cono de luz del submarino,
    // creando un efecto volumétrico mucho más realista.
}

function dibujarAnimacionMenu() {
    if (!menuFlyBy || !menuFlyBy.active || !robotListo) return;

    ctx.save();
    ctx.translate(menuFlyBy.x, menuFlyBy.y);

    if (menuFlyBy.vx < 0) {
        ctx.scale(-1, 1);
    }
    ctx.rotate(menuFlyBy.rotation);

    ctx.imageSmoothingEnabled = false;
    const dw = spriteAncho * robotEscala;
    const dh = spriteAlto * robotEscala;
    ctx.drawImage(robotImg, -dw / 2, -dh / 2, dw, dh);

    ctx.restore();
}

function dibujarCasquillos() {
    if (!ctx) return;
    ctx.save();
    for (const c of particulasCasquillos) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotacion);

        const alpha = Math.min(1, c.vida / (c.vidaMax * 0.5)); // Se desvanecen
        ctx.globalAlpha = alpha;

        ctx.fillStyle = c.color;
        ctx.strokeStyle = '#a17b3a'; // Contorno más oscuro
        ctx.lineWidth = 1;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);

        ctx.fillStyle = '#3b2e1e';
        ctx.beginPath(); ctx.arc(c.w / 2 - 1, 0, c.h / 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function dibujarMascaraLuz() {
    if (!estadoJuego || !fx) return;
    fx.clearRect(0, 0, W, H);
    const isLevel5 = estadoJuego.nivel === 5;

    // --- NUEVO: Ciclo Día/Noche Dinámico ---
    // Ciclo completo cada 180 segundos (3 minutos)
    const CYCLE_DURATION = 180;
    // Usamos seno para una transición suave: -1 a 1, lo mapeamos a 0 a 1
    // offset de -Math.PI/2 para empezar en día (0) y subir a noche (1)
    const cyclePhase = (estadoJuego.tiempoTranscurrido % CYCLE_DURATION) / CYCLE_DURATION * Math.PI * 2;
    const cycleFactor = (Math.sin(cyclePhase - Math.PI / 2) + 1) / 2; // 0.0 (Día) a 1.0 (Noche)

    // La oscuridad máxima será 0.65 (65%) en lugar de 0.9, para que no sea tan oscuro.
    const MAX_DARKNESS = 0.65;

    // Si hay un override (ej. eventos), lo usamos, sino usamos el ciclo natural
    const oscuridadObjetivo = estadoJuego.darknessOverride !== undefined
        ? estadoJuego.darknessOverride
        : cycleFactor;

    const alpha = lerp(0, MAX_DARKNESS, clamp(oscuridadObjetivo, 0, 1));

    // Guardamos el factor de ciclo en el estado para que el fondo lo pueda usar
    estadoJuego.dayNightFactor = cycleFactor;

    if (alpha <= 0.001) return;

    fx.globalCompositeOperation = 'source-over';
    fx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(3) + ')';
    fx.fillRect(0, 0, W, H);
    if (estadoJuego.luzVisible && jugador && estadoJuego.enEjecucion) {
        const screenPx = jugador.x - Math.round(estadoJuego.cameraX);
        const screenPy = jugador.y - Math.round(estadoJuego.cameraY);

        const px = screenPx;
        const py = screenPy;

        const anguloBase = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
        const ang = anguloBase + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);

        const ux = Math.cos(ang), uy = Math.sin(ang);
        const vx = -Math.sin(ang), vy = Math.cos(ang);
        const ax = Math.round(px + ux * (spriteAlto * robotEscala * 0.5 - 11));
        const ay = Math.round(py + uy * (spriteAlto * robotEscala * 0.5 - 11));

        const time = estadoJuego.tiempoTranscurrido;
        let flicker = 1.0 + Math.sin(time * 20) * 0.02; // Parpadeo sutil

        let powerDrawAlpha = 1.0;
        if (estadoJuego.laserActivo || estadoJuego.shieldActivo) {
            powerDrawAlpha = 0.75 + Math.sin(time * 70) * 0.25; // Varía entre 0.5 y 1.0
        }

        const L = (isLevel5 ? Math.min(H * 0.65, 560) : Math.min(W * 0.65, 560)) * flicker;
        const theta = (Math.PI / 9) * (1.0 + Math.sin(time * 2) * 0.05); // El cono "respira"
        const endx = ax + ux * L, endy = ay + uy * L; const half = Math.tan(theta) * L; const pTopX = endx + vx * half, pTopY = endy + vy * half; const pBotX = endx - vx * half, pBotY = endy - vy * half;

        const conePath = new Path2D(); conePath.moveTo(ax, ay); conePath.lineTo(pTopX, pTopY); conePath.lineTo(pBotX, pBotY); conePath.closePath();

        fx.globalCompositeOperation = 'destination-out';
        let g = fx.createLinearGradient(ax, ay, endx, endy);
        g.addColorStop(0.00, `rgba(255,255,255,${1.0 * powerDrawAlpha})`);
        g.addColorStop(0.45, `rgba(255,255,255,${0.5 * powerDrawAlpha})`);
        g.addColorStop(1.00, 'rgba(255,255,255,0.0)');
        fx.fillStyle = g;
        fx.fill(conePath);

        const rg = fx.createRadialGradient(ax, ay, 0, ax, ay, 54 * flicker);
        rg.addColorStop(0, `rgba(255,255,255,${1.0 * powerDrawAlpha})`);
        rg.addColorStop(1, 'rgba(255,255,255,0.0)');
        fx.fillStyle = rg;
        fx.beginPath();
        fx.arc(ax, ay, 54 * flicker, 0, Math.PI * 2);
        fx.fill();

        fx.globalCompositeOperation = 'lighter';

        const gGlow = fx.createLinearGradient(ax, ay, endx, endy);
        gGlow.addColorStop(0.00, `rgba(200,220,255,${0.15 * powerDrawAlpha})`);
        gGlow.addColorStop(0.60, `rgba(200,220,255,${0.06 * powerDrawAlpha})`);
        gGlow.addColorStop(1.00, 'rgba(200,220,255,0.00)');
        fx.fillStyle = gGlow;
        fx.fill(conePath);

        const flareRadius = 25 * flicker;
        const flareGradient = fx.createRadialGradient(ax, ay, 0, ax, ay, flareRadius);
        flareGradient.addColorStop(0, `rgba(255, 255, 230, ${0.4 * powerDrawAlpha})`);
        flareGradient.addColorStop(0.3, `rgba(255, 255, 230, ${0.1 * powerDrawAlpha})`);
        flareGradient.addColorStop(1, 'rgba(255, 255, 230, 0)');
        fx.fillStyle = flareGradient;
        fx.beginPath();
        fx.arc(ax, ay, flareRadius, 0, Math.PI * 2);
        fx.fill();

        const numRays = 5;
        for (let i = 0; i < numRays; i++) {
            const rayAngleOffset = (Math.sin(time * 0.5 + i * 2) * 0.5 + 0.5) * (theta * 2) - theta;
            const rayAngle = ang + rayAngleOffset;
            const rayL = L * (1.0 + Math.random() * 0.2);
            const rayW = 1 + Math.random() * 2;
            const rayEndX = ax + Math.cos(rayAngle) * rayL;
            const rayEndY = ay + Math.sin(rayAngle) * rayL;
            const rayGrad = fx.createLinearGradient(ax, ay, rayEndX, rayEndY);
            rayGrad.addColorStop(0, `rgba(200, 220, 255, ${(0.05 + Math.random() * 0.05) * powerDrawAlpha})`);
            rayGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
            fx.strokeStyle = rayGrad;
            fx.lineWidth = rayW;
            fx.beginPath();
            fx.moveTo(ax, ay);
            fx.lineTo(rayEndX, rayEndY);
            fx.stroke();
        }

        fx.save();
        fx.clip(conePath); // ¡Magia! Solo se dibujará dentro del cono.
        for (const p of particulasPolvoMarino) {
            const particleAlpha = p.opacidad * (0.5 + p.profundidad * 0.5);
            fx.fillStyle = `rgba(207, 233, 255, ${particleAlpha})`;
            fx.beginPath();
            fx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            fx.fill();
        }
        fx.restore();

        fx.globalCompositeOperation = 'source-over';
    }
}

/**
 * OPTIMIZACIÓN: Actualiza los elementos HTML del HUD solo cuando sus valores cambian.
 * Esto evita la manipulación constante del DOM, que es una operación costosa.
 */
function actualizarHTMLHUD() {
    if (!estadoJuego || !estadoJuego.enEjecucion) return;
    const s = estadoJuego;

    // --- Misión y Nivel ---
    const mision = Levels.getEstadoMision();
    let objetivoHTML;
    if (mision) {
        hudLevelText.innerHTML = `<span class="mission-title">${mision.texto}</span>`;
        objetivoHTML = mision.progreso;
    } else {
        hudLevelText.textContent = `NIVEL ${s.nivel}`;
        const configNivel = Levels.CONFIG_NIVELES[s.nivel - 1];
        if (configNivel.tipo === 'capture') { objetivoHTML = `CAPTURAS: ${s.rescatados} / ${configNivel.meta}`; }
        else if (configNivel.tipo === 'survive') { objetivoHTML = `SUPERVIVENCIA: ${Math.floor(configNivel.meta - s.valorObjetivoNivel)}s`; }
        else if (configNivel.tipo === 'boss') { objetivoHTML = configNivel.objetivo.toUpperCase(); }
        else { objetivoHTML = ''; }
    }
    if (objetivoHTML !== s._prevMisionProgreso) {
        hudObjectiveText.innerHTML = objetivoHTML;
        s._prevMisionProgreso = objetivoHTML;
    }

    // --- Puntuación ---
    if (s.puntuacion !== s._prevPuntuacion) {
        statScoreValue.textContent = String(s.puntuacion || 0);
        s._prevPuntuacion = s.puntuacion;
    }

    // --- Profundidad ---
    const profundidadActual = Math.floor(s.profundidad_m || 0);
    if (profundidadActual !== s._prevProfundidad) {
        statDepthValue.textContent = `${profundidadActual} m`;
        s._prevProfundidad = profundidadActual;
    }

    // --- Distancia ---
    const distActual = Math.floor(s.distanciaRecorrida || 0);
    if (distActual !== s._prevDistancia) {
        statDistanceValue.textContent = distActual < 1000 ? `${distActual} m` : `${(distActual / 1000).toFixed(2)} km`;
        s._prevDistancia = distActual;
    }

    // --- Velocidad ---
    const speed_px_s = s.velocidad_actual || 0;
    const target_speed_km_h = (speed_px_s / 50) * 3.6;
    s.velocidad_mostrada_kmh = lerp(s.velocidad_mostrada_kmh, target_speed_km_h, 0.12);
    if (Math.abs(s.velocidad_mostrada_kmh - target_speed_km_h) < 0.1) s.velocidad_mostrada_kmh = target_speed_km_h;
    const velActual = Math.floor(Math.max(0, s.velocidad_mostrada_kmh));
    if (velActual !== s._prevVelocidad) {
        statSpeedValue.textContent = `${velActual} km/h`;
        s._prevVelocidad = velActual;
    }
    if (s.boostActivo) { statSpeedValue.classList.add('boosting'); triggerHudShake(2); }
    else { statSpeedValue.classList.remove('boosting'); }

    // --- Récord (solo se actualiza una vez al inicio) ---
    if (s._prevPuntuacion === -1) {
        statRecordValue.textContent = String(puntuacionMaxima);
    }

    // --- Vidas ---
    if (s.vidas !== s._prevVidas) {
        statLivesContainer.innerHTML = '';
        const maxHearts = 5;
        const currentLives = Math.min(s.vidas, maxHearts);
        for (let i = 0; i < maxHearts; i++) {
            const heart = document.createElement('span');
            heart.classList.add('heart-icon');
            if (i < currentLives) heart.classList.add('filled');
            statLivesContainer.appendChild(heart);
        }
        if (s.vidas > maxHearts) {
            const extraLives = document.createElement('span');
            extraLives.classList.add('extra-lives');
            extraLives.textContent = `+${s.vidas - maxHearts}`;
            statLivesContainer.appendChild(extraLives);
        }
        s._prevVidas = s.vidas;
    }

    // --- Arma ---
    const armaTexto = `${s.armaActual.toUpperCase()} ${s.enfriamientoArma > 0 ? '(RECARGA)' : '(LISTA)'}`;
    if (armaTexto !== s._prevArma) {
        statWeaponValue.textContent = armaTexto;
        statWeaponValue.className = `stat-value weapon-status ${s.enfriamientoArma > 0 ? 'reloading' : 'ready'}`;
        if (s.armaCambiandoTimer > 0) statWeaponValue.style.animation = 'weaponChangeAnim 0.3s forwards';
        else statWeaponValue.style.animation = 'none';
        s._prevArma = armaTexto;
    }

    // --- Torpedo ---
    const torpedoTexto = s.enfriamientoTorpedo <= 0 ? 'LISTO' : 'RECARGANDO';
    if (torpedoTexto !== s._prevTorpedo) {
        statTorpedoValue.textContent = torpedoTexto;
        statTorpedoValue.className = `stat-value weapon-status ${torpedoTexto === 'LISTO' ? 'ready' : 'reloading'}`;
        s._prevTorpedo = torpedoTexto;
    }

    // --- Rango ---
    if (s.asesinatos !== s._prevAsesinatos) {
        const rango = RANGOS_ASESINO.slice().reverse().find(r => s.asesinatos >= r.bajas) || RANGOS_ASESINO[0];
        statAssassinValue.textContent = rango.titulo;
        s._prevAsesinatos = s.asesinatos;
    }

    // --- Barras de Progreso ---
    const boostPercent = (s.boostEnergia / s.boostMaxEnergia) * 100;
    if (boostPercent !== s._prevBoostPercent) {
        boostProgressBar.style.width = `${boostPercent}%`;
        s._prevBoostPercent = boostPercent;
    }
    boostProgressBar.classList.toggle('reloading', s.boostEnfriamiento > 0);
    boostProgressBar.classList.toggle('low-energy', s.boostEnergia > 0 && s.boostEnergia < s.boostMaxEnergia * 0.25 && s.boostEnfriamiento <= 0);

    const laserPercent = (s.laserEnergia / s.laserMaxEnergia) * 100;
    if (laserPercent !== s._prevLaserPercent) {
        laserProgressBar.style.width = `${laserPercent}%`;
        s._prevLaserPercent = laserPercent;
    }
    laserProgressBar.classList.toggle('active', s.laserActivo);

    const shieldPercent = (s.shieldEnergia / s.shieldMaxEnergia) * 100;
    if (shieldPercent !== s._prevShieldPercent) {
        shieldProgressBar.style.width = `${shieldPercent}%`;
        const shieldRatio = s.shieldEnergia / s.shieldMaxEnergia;
        if (s.shieldEnfriamiento <= 0) {
            const hue = shieldRatio * 195;
            shieldProgressBar.style.background = `linear-gradient(to right, hsl(${hue}, 100%, 65%), hsl(${hue}, 100%, 45%))`;
        } else {
            shieldProgressBar.style.background = '';
        }
        s._prevShieldPercent = shieldPercent;
    }
    shieldProgressBar.classList.toggle('reloading', s.shieldEnfriamiento > 0);
    shieldProgressBar.classList.toggle('active', s.shieldActivo);
    shieldProgressBar.classList.toggle('hit', s.shieldHitTimer > 0);

    // --- Barra de vida del jefe ---
    const jefeHp = s.jefe ? s.jefe.hp : -1;
    if (jefeHp !== s._prevJefeHp) {
        if (jefeHp > -1) {
            bossHealthContainer.style.display = 'block';
            const hpProgress = clamp(jefeHp / s.jefe.maxHp, 0, 1);
            bossHealthBar.style.width = `${hpProgress * 100}%`;
        } else {
            bossHealthContainer.style.display = 'none';
        }
        s._prevJefeHp = jefeHp;
    }
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

    // Spawnea tiburones hambrientos
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
}

export function perderJuego() {
    if (!estadoJuego || estadoJuego.faseJuego === 'gameover' || estadoJuego.faseJuego === 'death_animation') return;
    estadoJuego.faseJuego = 'death_animation';
    iniciarAnimacionMuerte();
}

function mostrarPantallaGameOver() {
    if (estadoJuego.puntuacion > puntuacionMaxima) { puntuacionMaxima = estadoJuego.puntuacion; guardarPuntuacionMaxima(); }
    if (mainMenu) mainMenu.style.display = 'block'; if (levelTransition) levelTransition.style.display = 'none'; if (brandLogo) brandLogo.style.display = 'none';
    if (welcomeMessage) welcomeMessage.style.display = 'none'; if (promptEl) promptEl.style.display = 'none';
    if (titleEl) {
        titleEl.style.display = 'block';
        titleEl.textContent = 'Fin de la expedición';
        titleEl.style.color = '';
    }
    if (captainImage) captainImage.style.display = 'block';
    if (statScore) statScore.textContent = 'PUNTUACIÓN: ' + estadoJuego.puntuacion;
    if (statDepth) statDepth.textContent = 'PROFUNDIDAD MÁXIMA: ' + estadoJuego.profundidad_m + ' m';
    if (statSpecimens) statSpecimens.textContent = 'ESPECÍMENES: ' + estadoJuego.rescatados;
    const distanciaKm = (estadoJuego.distanciaRecorrida / 1000).toFixed(2);
    if (statDistance) statDistance.textContent = 'DISTANCIA RECORRIDA: ' + distanciaKm + ' km';
    if (finalStats) finalStats.style.display = 'block'; if (mainMenuContent) mainMenuContent.style.display = 'block'; if (levelSelectContent) levelSelectContent.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none'; if (restartBtn) restartBtn.style.display = 'inline-block';
    modoSuperposicion = 'gameover';
    // --- CAMBIO CLAVE: Añadir 'initial-menu' para un fondo claro y animado ---
    if (overlay) { overlay.style.display = 'grid'; overlay.classList.add('initial-menu'); }
    if (bossHealthContainer) bossHealthContainer.style.display = 'none'; if (gameplayHints) gameplayHints.classList.remove('visible'); estadoJuego.faseJuego = 'gameover'; S.reproducir('gameover'); setTimeout(() => S.reproducir('theme_main'), 1500);
    if (gameplayHints) gameplayHints.classList.remove('visible');
    // --- NUEVO: Activar las animaciones de fondo del menú ---
    if (menuFlyBy) {
        menuFlyBy.active = false;
        menuFlyBy.cooldown = 4.0 + Math.random() * 4;
    }
    animales.length = 0; // Limpiar animales del juego
    const tiposMenu = ['normal', 'normal', 'normal', sharkListo ? 'shark' : 'normal', whaleListo ? 'whale' : 'normal'];
    for (let i = 0; i < 4; i++) { const tipoAleatorio = tiposMenu[Math.floor(Math.random() * tiposMenu.length)]; setTimeout(() => generarAnimal(false, tipoAleatorio), i * 2500); }
}
function ganarJuego() {
    if (!estadoJuego || estadoJuego.faseJuego === 'gameover') return;
    nivelMaximoAlcanzado = Levels.CONFIG_NIVELES.length;
    try { localStorage.setItem(CLAVE_NIVEL_MAX, String(nivelMaximoAlcanzado)); } catch (e) { }
    estadoJuego.faseJuego = 'gameover';
    estadoJuego.enEjecucion = false;
    S.detener('music');
    S.detener('laser_beam');
    S.detener('boost');
    S.detener('gatling_fire');
    S.reproducir('victory'); setTimeout(() => S.reproducir('theme_main'), 2000);
    if (estadoJuego.puntuacion > puntuacionMaxima) { puntuacionMaxima = estadoJuego.puntuacion; guardarPuntuacionMaxima(); }
    if (mainMenu) mainMenu.style.display = 'block';
    if (levelTransition) levelTransition.style.display = 'none'; if (welcomeMessage) welcomeMessage.style.display = 'none';
    if (promptEl) promptEl.style.display = 'none';
    if (brandLogo) brandLogo.style.display = 'none';
    if (captainImage) captainImage.style.display = 'none';
    if (titleEl) { titleEl.style.display = 'block'; titleEl.textContent = '¡VICTORIA!'; titleEl.style.color = '#ffdd77'; }
    // if (finalP) finalP.textContent = '¡Has conquistado las profundidades!'; // Elemento 'finalP' no existe
    if (statScore) statScore.textContent = 'PUNTUACIÓN FINAL: ' + estadoJuego.puntuacion;
    if (statDepth) statDepth.textContent = 'PROFUNDIDAD MÁXIMA: ' + estadoJuego.profundidad_m + ' m';
    if (statSpecimens) statSpecimens.textContent = 'ESPECÍMENES TOTALES: ' + estadoJuego.rescatados;
    const distanciaKm = (estadoJuego.distanciaRecorrida / 1000).toFixed(2);
    if (statDistance) statDistance.textContent = 'DISTANCIA TOTAL: ' + distanciaKm + ' km';
    if (finalStats) finalStats.style.display = 'block';
    if (mainMenuContent) mainMenuContent.style.display = 'block';
    if (levelSelectContent) levelSelectContent.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'inline-block'; // prettier-ignore
    modoSuperposicion = 'gameover';
    if (overlay) { overlay.style.display = 'grid'; overlay.classList.remove('initial-menu'); }
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
    if (gameplayHints) gameplayHints.classList.remove('visible');
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
function iniciarSiguienteNivel(nivel) { if (!estadoJuego) return; estadoJuego.nivel = nivel; estadoJuego.valorObjetivoNivel = 0; animales = []; Weapons.initWeapons(); estadoJuego.proyectilesTinta = []; Levels.initLevel(nivel); if (overlay) overlay.style.display = 'none'; estadoJuego.faseJuego = 'playing'; estadoJuego.enEjecucion = true; estadoJuego.bloqueoEntrada = 0.5; if (gameplayHints) gameplayHints.classList.remove('visible'); }
function mostrarVistaMenuPrincipal(desdePausa) {
    if (!mainMenu) return;

    if (desdePausa) {
        S.pausar('music');
    } else {
        S.detener('music'); // Detiene cualquier música de juego que pudiera haber quedado
    }
    // Tanto el menú inicial como el de pausa ahora tendrán el fondo claro, sin desenfoque.
    if (overlay) overlay.classList.add('initial-menu');
    S.reproducir('theme_main');

    if (brandLogo) brandLogo.style.display = 'block';
    if (welcomeMessage) welcomeMessage.style.display = 'block';
    if (promptEl) promptEl.style.display = 'block';
    if (titleEl) titleEl.style.display = 'none';
    if (captainImage) captainImage.style.display = 'block';
    if (finalStats) finalStats.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
    if (restartBtn) restartBtn.style.display = 'none';
    modoSuperposicion = desdePausa ? 'pause' : 'menu';
    if (mainMenu) mainMenu.style.display = 'block';

    // Reiniciar la animación del submarino "fly-by"
    if (menuFlyBy) {
        menuFlyBy.active = false;
        menuFlyBy.cooldown = 4.0 + Math.random() * 4; // Primer paso en 4-8 segundos
    }

    // Generar criaturas de fondo si es el menú inicial (no en pausa)
    // Menos criaturas para un ambiente marino más realista y natural
    if (!desdePausa) {
        animales.length = 0; // Limpiar cualquier animal de una partida anterior
        const tiposMenu = [
            'normal', 'normal', 'normal',
            sharkListo ? 'shark' : 'normal',
            whaleListo ? 'whale' : 'normal',
        ];
        for (let i = 0; i < 4; i++) { // Solo 4 criaturas para un ambiente más realista
            const tipoAleatorio = tiposMenu[Math.floor(Math.random() * tiposMenu.length)];
            setTimeout(() => generarAnimal(false, tipoAleatorio), i * 2500); // Más espaciadas en el tiempo
        }
    }
    if (levelTransition) levelTransition.style.display = 'none';
    if (overlay) overlay.style.display = 'grid';
    if (mainMenuContent) mainMenuContent.style.display = 'block';
    if (levelSelectContent) levelSelectContent.style.display = 'none';
}

function poblarSelectorDeNiveles() {
    if (!levelSelectorContainer) return;
    levelSelectorContainer.innerHTML = '';

    Levels.CONFIG_NIVELES.forEach((config, index) => {
        const nivelNum = index + 1;
        const btn = document.createElement('button');
        btn.classList.add('levelbtn');
        btn.dataset.nivel = nivelNum;

        if (nivelNum <= nivelMaximoAlcanzado) {
            btn.textContent = nivelNum;
            btn.onclick = () => {
                iniciarJuego(nivelNum);
            };
        } else {
            btn.disabled = true;
        }
        levelSelectorContainer.appendChild(btn);
    });
}

/**
 * Actualiza la clase 'selected' en los botones de nivel según el índice guardado.
 */
function actualizarSeleccionNivelVisual() {
    if (!levelSelectorContainer || !estadoJuego) return;
    const botonesNivel = levelSelectorContainer.querySelectorAll('.levelbtn:not(:disabled)');
    botonesNivel.forEach((btn, index) => {
        btn.classList.toggle('selected', index === estadoJuego.nivelSeleccionadoIndex);
    });
}

function abrirMenuPrincipal() { if (estadoJuego && estadoJuego.enEjecucion) { estadoJuego.enEjecucion = false; mostrarVistaMenuPrincipal(true); if (gameplayHints) gameplayHints.classList.remove('visible'); } }
function puedeUsarPantallaCompleta() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled); } // prettier-ignore
function alternarPantallaCompleta() { if (!puedeUsarPantallaCompleta()) { document.body.classList.toggle('immersive'); return; } const el = document.documentElement; try { if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) { if (el.requestFullscreen) return el.requestFullscreen(); if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen(); } else { if (document.exitFullscreen) return document.exitFullscreen(); if (document.webkitExitFullscreen) return document.webkitExitFullscreen(); } } catch (err) { console.warn('Pantalla completa no disponible', err); } }

/**
 * Ajusta el tamaño de todos los lienzos (canvas) para que coincidan con el tamaño de la ventana.
 * Con el nuevo HUD de superposición, los lienzos deben ocupar toda la pantalla.
 */
function autoSize() {
    const v = { w: innerWidth, h: innerHeight }; // Los lienzos ahora ocupan toda la pantalla.
    [bgCanvas, cvs, fxCanvas, sonarCanvas, hudCanvas].forEach(c => { if (c) { c.width = v.w; c.height = v.h; } }); W = v.w; H = v.h; calcularCarriles(); if (!estadoJuego || !estadoJuego.enEjecucion) { renderizar(0); }
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

        // Actualiza las armas siempre, para efectos de menú y de juego.
        const weaponUpdateContext = {
            dtAjustado, estadoJuego, jugador, animales, W, H, S, Levels,
            generarExplosion, generarTrozoBallena, generarGotasSangre, generarParticula, particulasBurbujas, particulasExplosion,
            puntosPorRescate,
            teclas, generarCasquillo,
            triggerVibration: S.triggerVibration
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
/**
 * Lee el estado del gamepad conectado y traduce sus entradas a acciones del juego.
 */
function actualizarGamepad() {
    if (!gamepadConectado) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp) return;

    // --- Lógica de Menú (si el overlay está visible) ---
    if (overlay && overlay.style.display !== 'none') {
        actualizarGamepadMenu(gp);
    }
    // --- Lógica Durante el Juego ---
    else if (estadoJuego && estadoJuego.enEjecucion) {
        actualizarGamepadJuego(gp);
    }

    // --- Lógica Global del Gamepad (se aplica en cualquier estado) ---
    const isNewPress = (index) => gp.buttons[index].pressed && !prevGamepadButtons[index];
    if (isNewPress(9)) { // Start -> Pausa / Reanudar
        abrirMenuPausaDesdeMando();
    }
    if (isNewPress(8)) { // Select/Back -> Mostrar/Ocultar Controles
        if (helpBtn) helpBtn.click();
    }

    // Guardar estado de botones para el próximo frame
    prevGamepadButtons = gp.buttons.map(b => b.pressed);
}

function actualizarGamepadMenu(gp) {
    const isNewPress = (index) => gp.buttons[index].pressed && !prevGamepadButtons[index];

    // --- Menú Principal / Pausa / Game Over ---
    if (mainMenuContent && mainMenuContent.style.display !== 'none') {
        if (isNewPress(7)) { // RT -> Sumergirse / Reintentar
            if (startBtn && startBtn.style.display !== 'none') startBtn.click();
            else if (restartBtn && restartBtn.style.display !== 'none') restartBtn.click();
        }
        if (isNewPress(6)) { // LT -> Niveles
            if (levelSelectBtn && levelSelectBtn.style.display !== 'none') levelSelectBtn.click();
        }
    }

    // --- Selector de Niveles ---
    else if (levelSelectContent && levelSelectContent.style.display !== 'none') {
        const botonesNivel = levelSelectorContainer.querySelectorAll('.levelbtn:not(:disabled)');
        const axisX = gp.axes[0];
        const STICK_DEAD_ZONE = 0.6;

        const movedLeft = isNewPress(14) || (axisX < -STICK_DEAD_ZONE && estadoJuego.gamepadStickX >= -STICK_DEAD_ZONE);
        const movedRight = isNewPress(15) || (axisX > STICK_DEAD_ZONE && estadoJuego.gamepadStickX <= STICK_DEAD_ZONE);

        if (movedLeft) {
            if (botonesNivel.length > 0) {
                estadoJuego.nivelSeleccionadoIndex = (estadoJuego.nivelSeleccionadoIndex - 1 + botonesNivel.length) % botonesNivel.length;
                actualizarSeleccionNivelVisual();
            }
        }
        if (movedRight) {
            if (botonesNivel.length > 0) {
                estadoJuego.nivelSeleccionadoIndex = (estadoJuego.nivelSeleccionadoIndex + 1) % botonesNivel.length;
                actualizarSeleccionNivelVisual();
            }
        }
        if (isNewPress(0)) { // A -> Seleccionar Nivel
            if (botonesNivel[estadoJuego.nivelSeleccionadoIndex]) {
                botonesNivel[estadoJuego.nivelSeleccionadoIndex].click();
            }
        }
        if (isNewPress(1)) { // B -> Volver
            if (backToMainBtn) backToMainBtn.click();
        }
        estadoJuego.gamepadStickX = axisX; // Guardar estado del stick para el próximo frame
    }
}

function actualizarGamepadJuego(gp) {
    const DEAD_ZONE = 0.25;
    let axisX = gp.axes[0];
    let axisY = gp.axes[1];

    // Fallback to D-pad if left stick is not moving
    if (Math.abs(axisX) < DEAD_ZONE && Math.abs(axisY) < DEAD_ZONE) {
        if (gp.buttons[12] && gp.buttons[12].pressed) { // D-pad Up
            axisY = -1;
        } else if (gp.buttons[13] && gp.buttons[13].pressed) { // D-pad Down
            axisY = 1;
        }
        if (gp.buttons[14] && gp.buttons[14].pressed) { // D-pad Left
            axisX = -1;
        } else if (gp.buttons[15] && gp.buttons[15].pressed) { // D-pad Right
            axisX = 1;
        }
    }

    teclas['ArrowUp'] = axisY < -DEAD_ZONE;
    teclas['ArrowDown'] = axisY > DEAD_ZONE;
    teclas['ArrowLeft'] = axisX < -DEAD_ZONE;
    teclas['ArrowRight'] = axisX > DEAD_ZONE;

    teclas[' '] = gp.buttons[0].pressed; // A -> Disparar / Láser
    teclas['b'] = gp.buttons[1].pressed; // B -> Impulso (Boost)
    teclas['v'] = gp.buttons[3].pressed; // Y -> Escudo (Shield)

    const isNewPress = (index) => gp.buttons[index].pressed && !prevGamepadButtons[index];
    if (isNewPress(2)) { teclas['x'] = true; } // X -> Torpedo
    if (isNewPress(5)) { teclas['c'] = true; } // RB -> Cambiar Arma
}

function abrirMenuPausaDesdeMando() {
    // Esta función es un wrapper para asegurar que solo se active durante el juego
    if (estadoJuego && estadoJuego.enEjecucion) {
        abrirMenuPrincipal();
    } else if (estadoJuego && estadoJuego.faseJuego === 'pause') {
        // Si ya está en pausa, reanuda el juego (simula click en "Sumergirse")
        if (startBtn) startBtn.click();
    } else if (modoSuperposicion === 'menu' || modoSuperposicion === 'gameover') {
        // Si estamos en el menú principal, el botón Start también inicia el juego
        if (startBtn && startBtn.style.display !== 'none') startBtn.click();
        else if (restartBtn && restartBtn.style.display !== 'none') restartBtn.click();
    }
}

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
    }

    // Actualizar trozos humanos
    for (let i = trozosHumanos.length - 1; i >= 0; i--) {
        const d = trozosHumanos[i];
        d.vy += 250 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rotacion += d.vRot * dt; d.vida -= dt;
        if (d.vida <= 0 || d.y > H + 50) {
            trozosHumanos.splice(i, 1);
        }
    }

    // Actualizar escombros del submarino
    for (let i = escombrosSubmarino.length - 1; i >= 0; i--) {
        const d = escombrosSubmarino[i];
        d.vy += 200 * dt; // Gravedad un poco menor que los trozos humanos
        d.vx *= 0.99; // Fricción
        d.vy *= 0.99;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rotacion += d.vRot * dt;
        d.vida -= dt;
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

    // Actualizar tiburones cazadores
    for (const a of animales) {
        if (a.tipo === 'shark' && a.isPilotHunter) {
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
                const speed = 700; // Velocidad de caza
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
        if (a.timerFrame >= SHARK_ANIMATION_SPEED) { a.timerFrame -= SHARK_ANIMATION_SPEED; if (SHARK_SPRITE_DATA) { a.frame = (a.frame + 1) % SHARK_SPRITE_DATA.frames.length; } }
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
    infoAnimCtx.imageSmoothingEnabled = false;
    const dw = spriteAncho * 2.5;
    const dh = spriteAlto * 2.5;
    infoAnimCtx.drawImage(robotImg, -dw / 2, -dh / 2, dw, dh);
    infoAnimCtx.restore();

}

function dibujarParticulas() {
    if (!ctx) return;
    ctx.save();
    // Partículas de polvo y ambiente (detrás de todo)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particulas) { ctx.globalAlpha = clamp(p.baseA * (0.65 + 0.35 * Math.sin(p.tw)), 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); }

    // Partículas de explosión (brillantes)
    for (const p of particulasExplosion) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); }

    // Partículas de tinta/humo (oscuras)
    ctx.globalCompositeOperation = 'source-over';
    for (const p of particulasTinta) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1) * 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); }

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
//  11. INICIALIZACIÓN GENERAL Y GESTIÓN DE EVENTOS
// =================================================================================
// La función `init` se llama una sola vez cuando la página carga.
// Configura todos los listeners de eventos (teclado, ratón, botones de la UI).

let arrastreId = -1, arrastreActivo = false, arrastreY = 0;
function estaSobreUI(x, y) { const elementos = [muteBtn, helpBtn, infoBtn, fsBtn, shareBtn, githubBtn, overlay, infoOverlay, levelSelectBtn, backToMainBtn]; for (const el of elementos) { if (!el) continue; const style = getComputedStyle(el); if (style.display === 'none' || style.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true; } return false; }

export function init() {
    // --- 1. EVENTOS DE TECLADO Y RATÓN (Puntero) ---
    // Inicializar la animación del menú
    menuFlyBy = {
        active: false,
        x: -200,
        y: H / 2,
        vx: 0,
        cooldown: 5.0, // El primer "fly-by" ocurrirá después de 5 segundos
        rotation: 0,
        chasingSharks: [],
        fireCooldown: 0
    };

    // --- NUEVO: Eventos para conectar/desconectar el mando ---
    window.addEventListener('gamepadconnected', (e) => {
        console.log(`¡Mando conectado! ID: ${e.gamepad.id}`);
        gamepadConectado = true;
        // Inicializamos el estado de los botones
        prevGamepadButtons = e.gamepad.buttons.map(() => false);

        // >>> NUEVO: Reanudar el juego si estaba pausado por desconexión <<<
        if (estadoJuego && estadoJuego.juegoPausadoPorDesconexion) {
            estadoJuego.enEjecucion = true; // Reanudar el juego
            estadoJuego.juegoPausadoPorDesconexion = false; // Quitar la bandera
            S.bucle('music'); // Reanudar la música
            if (controllerDisconnectOverlay) {
                controllerDisconnectOverlay.style.display = 'none';
            }
        } else {
            // Comportamiento original: Mostrar los controles si no se están mostrando ya
            if (helpBtn && !gameplayHints.classList.contains('visible')) {
                helpBtn.click();
            }
        }
    });
    window.addEventListener('gamepaddisconnected', (e) => {
        console.log(`Mando desconectado. ID: ${e.gamepad.id}`);
        gamepadConectado = false;

        // >>> NUEVO: Pausar el juego y mostrar mensaje si se está jugando <<<
        if (estadoJuego && estadoJuego.enEjecucion) {
            estadoJuego.enEjecucion = false; // Pausar el juego
            estadoJuego.juegoPausadoPorDesconexion = true; // Poner una bandera
            S.pausar('music'); // Pausar la música del juego
            S.detener('boost'); // Detener sonidos en bucle
            S.detener('laser_beam');
            S.detener('gatling_fire');
            if (controllerDisconnectOverlay) {
                controllerDisconnectOverlay.style.display = 'grid';
            }
        }
    });

    addEventListener('keydown', function (e) { teclas[e.key] = true; if (e.code === 'Space') e.preventDefault(); if (e.key === 'Escape') { e.preventDefault(); abrirMenuPrincipal(); } });
    addEventListener('keyup', function (e) {
        teclas[e.key] = false;
        // --- NUEVO: Ocultar panel de ayuda con Escape ---
        if (e.key === '0') {
            if (jugador && estadoJuego.enEjecucion) {
                jugador.direccion *= -1;
            }
        }
        if (e.key === 'Escape') {
            if (gameplayHints && gameplayHints.classList.contains('visible')) {
                gameplayHints.classList.remove('visible');
            }
        }
    });
    window.addEventListener('blur', () => { teclas = {}; }); // Limpiar teclas si se pierde el foco
    window.addEventListener('pointerdown', (e) => {
        // Resumir el contexto de audio en la primera interacción del usuario
        S.init(); // Asegura que el audio context se cree

        if (estaSobreUI(e.clientX, e.clientY)) return;
        const isLevel5 = estadoJuego && estadoJuego.nivel === 5;
        if (isLevel5) {
            lanzarTorpedo();
            return;
        }
        const tapX = e.clientX;
        if (tapX < W * 0.4) { arrastreId = e.pointerId; arrastreActivo = true; arrastreY = e.clientY; e.preventDefault(); } // prettier-ignore
        else if (tapX > W * 0.6) { if (!estadoJuego || !estadoJuego.enEjecucion) return; if (estadoJuego.bloqueoEntrada === 0) { teclas[' '] = true; if (estadoJuego.armaActual === 'gatling') disparar({ estadoJuego, jugador, S, Levels }); } }
        else { lanzarTorpedo(); }
    }, { passive: false });
    window.addEventListener('pointermove', (e) => {
        if (estadoJuego && estadoJuego.nivel === 5) return;
        if (!arrastreActivo || e.pointerId !== arrastreId) return;
        arrastreY = e.clientY; e.preventDefault();
    }, { passive: false });
    window.addEventListener('pointerup', (e) => {
        if (estadoJuego && estadoJuego.nivel === 5) { return; }
        if (e.pointerId === arrastreId) { arrastreActivo = false; arrastreId = -1; } teclas[' '] = false; // Para armas sostenidas, esto detiene el fuego
    }, { passive: false });
    window.addEventListener('resize', autoSize);

    // --- 2. BOTONES DEL MENÚ PRINCIPAL ---
    if (startBtn) {
        startBtn.onclick = function (e) {
            e.stopPropagation();
            if (modoSuperposicion === 'pause') {
                S.detener('theme_main'); // Detenemos el tema del menú
                if (overlay) overlay.style.display = 'none';
                if (estadoJuego) {
                    estadoJuego.enEjecucion = true;
                    estadoJuego.bloqueoEntrada = 0.15;
                    if (gameplayHints) gameplayHints.classList.remove('visible');
                }
                S.bucle('music'); // Reanudamos la música del juego
            } else { // Si no es pausa, es un nuevo juego
                iniciarJuego(1);
            }
        };
    }
    if (restartBtn) {
        restartBtn.onclick = () => iniciarJuego(estadoJuego.nivel || 1);
    }
    if (levelSelectBtn) {
        levelSelectBtn.onclick = () => {
            if (mainMenuContent) mainMenuContent.style.display = 'none';
            if (levelSelectContent) levelSelectContent.style.display = 'block';
            poblarSelectorDeNiveles();
            // >>> NUEVO: Establecer la selección inicial para el mando <<<
            const botonesDisponibles = levelSelectorContainer.querySelectorAll('.levelbtn:not(:disabled)');
            estadoJuego.nivelSeleccionadoIndex = botonesDisponibles.length - 1; // Empezar en el último nivel desbloqueado
            actualizarSeleccionNivelVisual();
        };
    }
    if (backToMainBtn) {
        backToMainBtn.onclick = () => {
            if (mainMenuContent) mainMenuContent.style.display = 'block';
            if (levelSelectContent) levelSelectContent.style.display = 'none';
        };
    }

    // --- 3. BOTONES DE LA BARRA DE HUD SUPERIOR ---
    if (helpBtn) {
        helpBtn.onclick = function () {
            if (gameplayHints) {
                // Alternar la clase 'gamepad-active' según si hay un mando conectado
                gameplayHints.classList.toggle('gamepad-active', gamepadConectado);
                gameplayHints.classList.toggle('visible');
            }
        };
    }
    if (pauseBtn) {
        pauseBtn.onclick = function () {
            abrirMenuPrincipal(); // Esta función ya maneja la lógica de pausar el juego
        };
    }
    if (muteBtn) { muteBtn.onclick = function () { S.alternarSilenciado(); actualizarIconos(); }; }
    if (infoBtn) {
        infoBtn.onclick = () => {
            estabaCorriendoAntesCreditos = !!(estadoJuego && estadoJuego.enEjecucion);
            if (estadoJuego) estadoJuego.enEjecucion = false;
            S.pausar('music');
            S.reproducir('theme_main');
            if (infoOverlay) infoOverlay.style.display = 'grid';
            if (gameplayHints) gameplayHints.classList.remove('visible');
            animarSubmarino = true;

            // Iniciar slideshow de créditos
            const creatorPic = document.getElementById('creator-pic');
            if (creatorPic) {
                creatorPic.style.transition = 'opacity 0.5s ease-in-out';
                // Iniciar con una imagen aleatoria
                a_creditos_imagen_actual = Math.floor(Math.random() * a_creditos_imagenes.length);
                creatorPic.src = a_creditos_imagenes[a_creditos_imagen_actual];
                creatorPic.style.opacity = 1;

                a_creditos_intervalo = setInterval(() => {
                    let randomIndex;
                    do {
                        randomIndex = Math.floor(Math.random() * a_creditos_imagenes.length);
                    } while (randomIndex === a_creditos_imagen_actual && a_creditos_imagenes.length > 1);
                    a_creditos_imagen_actual = randomIndex;

                    creatorPic.style.opacity = 0;
                    setTimeout(() => {
                        creatorPic.src = a_creditos_imagenes[a_creditos_imagen_actual];
                        creatorPic.style.opacity = 1;
                    }, 500); // Coincide con la transición CSS
                }, 4000); // Cambiar imagen cada 4 segundos
            }
        };
    }
    if (githubBtn) { githubBtn.onclick = () => window.open('https://github.com/HectorDanielAyarachiFuentes', '_blank'); }
    if (fsBtn) { fsBtn.onclick = function () { alternarPantallaCompleta(); }; }
    if (shareBtn) {
        shareBtn.onclick = async function () {
            let estabaCorriendo = !!(estadoJuego && estadoJuego.enEjecucion);
            if (estabaCorriendo) { estadoJuego.enEjecucion = false; S.pausar('music'); }
            try {
                if (navigator.share) { await navigator.share({ title: 'La Expedición', text: '¡He conquistado las profundidades! ¿Puedes tú?', url: location.href }); }
            } catch (_) { }
            finally {
                if (estabaCorriendo && (!overlay || overlay.style.display === 'none')) { if (estadoJuego) estadoJuego.enEjecucion = true; S.bucle('music'); }
            }
        };
    }

    // --- 4. OTROS EVENTOS DE UI ---
    if (logoHUD) { logoHUD.addEventListener('click', abrirMenuPrincipal); }

    // >>> CORRECCIÓN: Lógica para el botón de "Volver al Juego" (desconexión) <<<
    if (resumeWithKeyboardButton) {
        resumeWithKeyboardButton.onclick = () => {
            if (estadoJuego && estadoJuego.juegoPausadoPorDesconexion) {
                estadoJuego.enEjecucion = true;
                estadoJuego.juegoPausadoPorDesconexion = false;
                S.bucle('music');
                if (controllerDisconnectOverlay) {
                    controllerDisconnectOverlay.style.display = 'none';
                }
            }
        };
    }

    // >>> NUEVO: Lógica para los botones del prompt de conexión de mando <<<
    if (useGamepadButton) {
        useGamepadButton.onclick = () => {
            if (estadoJuego && estadoJuego.juegoPausadoPorConexionMando) {
                gamepadConectado = true; // ACTIVAR MANDO
                const gamepads = navigator.getGamepads();
                if (gamepads[0]) {
                    prevGamepadButtons = gamepads[0].buttons.map(() => false);
                }

                estadoJuego.enEjecucion = true;
                estadoJuego.juegoPausadoPorConexionMando = false;
                S.bucle('music');
                if (controllerConnectPrompt) {
                    controllerConnectPrompt.style.display = 'none';
                }
            }
        };
    }
    if (stayOnKeyboardButton) {
        stayOnKeyboardButton.onclick = () => {
            if (estadoJuego && estadoJuego.juegoPausadoPorConexionMando) {
                gamepadConectado = false; // MANTENER MANDO DESACTIVADO (para esta sesión)

                estadoJuego.enEjecucion = true;
                estadoJuego.juegoPausadoPorConexionMando = false;
                S.bucle('music');
                if (controllerConnectPrompt) {
                    controllerConnectPrompt.style.display = 'none';
                }
            }
        };
    }

    if (closeInfo) {
        closeInfo.onclick = function () {
            S.detener('theme_main');
            if (infoOverlay) infoOverlay.style.display = 'none';
            if (estabaCorriendoAntesCreditos && (!overlay || overlay.style.display === 'none')) {
                if (estadoJuego) { estadoJuego.enEjecucion = true; }
                S.bucle('music');
                if (gameplayHints) gameplayHints.classList.remove('visible');
            }
            animarSubmarino = false;

            // Detener slideshow y resetear estilos
            if (a_creditos_intervalo) {
                clearInterval(a_creditos_intervalo);
                a_creditos_intervalo = null;
            }
        };
    }
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay && overlay.style.display !== 'none' && (!restartBtn || restartBtn.style.display === 'none') && estadoJuego && estadoJuego.faseJuego !== 'transition' && levelSelectContent.style.display === 'none') {
                if (modoSuperposicion === 'pause') {
                    S.detener('theme_main');
                    overlay.style.display = 'none';
                    if (estadoJuego) {
                        estadoJuego.enEjecucion = true;
                        estadoJuego.bloqueoEntrada = 0.15;
                        if (gameplayHints) gameplayHints.classList.remove('visible');
                    }
                    S.bucle('music');
                } else {
                    iniciarJuego(1);
                }
            }
        });
    }

    // --- 5. LÓGICA DE PESTAÑAS EN LA VENTANA DE INFORMACIÓN ---
    const infoTabs = document.querySelectorAll('.info-tab-btn');
    const infoPanels = document.querySelectorAll('.info-tab-panel');

    infoTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Evita que el click en el botón se propague al overlay y lo cierre.
            e.stopPropagation();

            // 1. Ocultar todos los paneles y desactivar todas las pestañas.
            infoTabs.forEach(t => t.classList.remove('active'));
            infoPanels.forEach(p => p.classList.remove('active'));

            // 2. Activar la pestaña y el panel seleccionados.
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const targetPanel = document.getElementById(`tab-${tabId}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // --- 7. INICIALIZACIÓN FINAL DEL JUEGO ---
    autoSize();
    S.init();
    inicializarCanvasOffscreen(); // >>> NUEVO: Inicializar el canvas para tintes
    actualizarIconos();
    reiniciar();
    mostrarVistaMenuPrincipal(false);

    // --- Carga de Recursos SVG (desde archivos) ---
    cargarImagen('js/svg/propeller.svg', function (img) {
        if (!img) return;
        propellerImg = img;
        propellerReady = true;
    });

    // Cargar assets de armas
    Weapons.loadWeaponAssets(cargarImagen, ctx);
}