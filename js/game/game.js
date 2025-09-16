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
export const cvs = document.getElementById('gameCanvas'), ctx = cvs.getContext('2d');
const fxCanvas = document.getElementById('fxCanvas'), fx = fxCanvas.getContext('2d');
const hudCanvas = document.getElementById('hudCanvas'), hud = hudCanvas.getContext('2d');
const sonarCanvas = document.getElementById('sonarCanvas'), sonarCtx = sonarCanvas.getContext('2d');

// --- Referencias a Elementos del DOM ---
// Obtenemos todas las referencias a los elementos HTML para manipular la UI.
const overlay = document.getElementById('overlay');
const mainMenu = document.getElementById('mainMenu');
const levelTransition = document.getElementById('levelTransition');
const levelTitle = document.getElementById('levelTitle');
const levelDesc = document.getElementById('levelDesc');
const startBtn = document.getElementById('start');
const restartBtn = document.getElementById('restart');
const titleEl = document.getElementById('gameOverTitle');
const brandLogo = document.getElementById('brandLogo');
const welcomeMessage = document.getElementById('welcomeMessage');
const promptEl = document.getElementById('prompt');
const finalStats = document.getElementById('finalStats');
const statScore = document.getElementById('statScore');
const statDepth = document.getElementById('statDepth');
const statSpecimens = document.getElementById('statSpecimens');
const muteBtn = document.getElementById('muteBtn');
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

const mainMenuContent = document.getElementById('mainMenuContent');
const levelSelectContent = document.getElementById('levelSelectContent');
const levelSelectBtn = document.getElementById('levelSelectBtn');
const levelSelectorContainer = document.getElementById('level-selector-container');
const backToMainBtn = document.getElementById('backToMainBtn');
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
        whale_spout: 'sonidos/ballena/ballenachorro.mp3'
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
                else { el.volume = 0.5; }
                el.addEventListener('error', function(e) { console.error(`Error al cargar el audio: ${el.src}. Asegúrate de que el archivo existe y la ruta es correcta.`); }); a[k] = { element: el, source: null }; } catch (e) { console.warn(`No se pudo crear el objeto de audio para: ${mapaFuentes[k]}`); } } }
    function reproducir(k) {
        const audioObj = a[k];
        if (!audioObj) {
            console.warn(`Se intentó reproducir un sonido no cargado: '${k}'`);
            return;
        }
        const el = audioObj.element;

        // Conectar al analizador si es la música del menú y el contexto de audio existe
        if (k === 'theme_main' && audioCtx && !audioObj.source) {
            try {
                audioObj.source = audioCtx.createMediaElementSource(el);
                audioObj.source.connect(analyser);
            } catch (e) {
                console.error(`No se pudo conectar el audio '${k}' al analizador:`, e);
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
        } catch (e) {}
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
                promise.catch(error => {});
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
    function estaSilenciado() { return _silenciado; }
    function alternarSilenciado() { setSilenciado(!estaSilenciado()); } 
    return { init, reproducir, detener, pausar, bucle, setSilenciado, estaSilenciado, alternarSilenciado, startPlaylist, playRandomWhaleSong, getAudioData };
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
cargarImagen('img/sprites/mierdei.png', function(img) {
    if (img) {
        mierdeiImg = img;
        mierdeiImgCargada = true;
        comprobarMierdeiListo();
    } else {
        console.error("No se pudo cargar la imagen 'img/mierdei.png'. Asegúrate de que la ruta es correcta.");
    }
});
cargarJson('js/json_sprites/mierdei.json', function(data) {
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
cargarJson('js/json_sprites/shark.json', function(data) {
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
cargarJson('js/json_sprites/whale.json', function(data) {
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
cargarJson('js/json_sprites/ballenabebe.json', function(data) {
    if (data) {
        BABYWHALE_SPRITE_DATA = data;
        babyWhaleJsonCargado = true;
        comprobarBabyWhaleListo();
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
export let particulas = [], particulasExplosion = [], particulasTinta = [], particulasBurbujas = [], whaleDebris = [], particulasPolvoMarino = [];

// --- Funciones de Partículas ---
// Funciones para crear, actualizar y dibujar las partículas.
export function generarParticula(arr, opts) { arr.push({ x: opts.x, y: opts.y, vx: opts.vx, vy: opts.vy, r: opts.r, vida: opts.vida, vidaMax: opts.vida, color: opts.color, tw: Math.random() * Math.PI * 2, baseA: opts.baseA || 1, ...opts }); }

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
        // Lógica de colisión para el chorro de la ballena
        if (p.esChorroDañino && Math.hypot(jugador.x - p.x, jugador.y - p.y) < jugador.r + p.r) {
            if (estadoJuego.vidas > 0) { estadoJuego.vidas--; estadoJuego.animVida = 0.6; S.reproducir('choque_ligero'); }
            if (estadoJuego.vidas <= 0) perderJuego();
            p.vida = 0; // La burbuja explota al impactar
        }
        if (p.vida <= 0) { particulasBurbujas.splice(i, 1); }
    }
}
function dibujarParticulas() { if (!ctx) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const p of particulas) { ctx.globalAlpha = clamp(p.baseA * (0.65 + 0.35 * Math.sin(p.tw)), 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); } for (const p of particulasExplosion) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; for (const p of particulasTinta) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1) * 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); } ctx.strokeStyle = '#aae2ff'; ctx.lineWidth = 1.5; for (const p of particulasBurbujas) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1) * 0.7; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); }
function generarBurbujaPropulsion(x, y, isLevel5 = false) { if (Math.random() > 0.6) { const velocidadBaseX = isLevel5 ? 0 : 60; const velocidadBaseY = isLevel5 ? 60 : 0; const dispersion = 25; generarParticula(particulasBurbujas, { x: x, y: y, vx: velocidadBaseX + (Math.random() - 0.5) * dispersion, vy: velocidadBaseY + (Math.random() - 0.5) * dispersion - 20, r: Math.random() * 2 + 1, vida: 1 + Math.random() * 1.5, color: '' }); } }
function generarRafagaBurbujasDisparo(x, y, isLevel5 = false) { for (let i = 0; i < 8; i++) { const anguloBase = isLevel5 ? -Math.PI / 2 : 0; const dispersion = Math.PI / 4; const angulo = anguloBase + (Math.random() - 0.5) * dispersion; const velocidad = 30 + Math.random() * 40; generarParticula(particulasBurbujas, { x: x, y: y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad - 20, r: Math.random() * 2.5 + 1.5, vida: 0.8 + Math.random() * 0.5, color: '' }); } }

// --- Generadores de Efectos Especiales ---
export function generarExplosion(x, y, color = '#ff8833') { for (let i = 0; i < 20; i++) { const ang = Math.random() * Math.PI * 2, spd = 30 + Math.random() * 100; generarParticula(particulasExplosion, { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: Math.random() * 2 + 1, vida: 0.4 + Math.random() * 0.4, color }); } }
export function generarNubeDeTinta(x, y, size) { S.reproducir('ink'); for (let i = 0; i < 50; i++) { const ang = Math.random() * Math.PI * 2, spd = 20 + Math.random() * size; generarParticula(particulasTinta, { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 15 + Math.random() * size * 0.8, vida: 2.5 + Math.random() * 2, color: '#101010' }); } }

const WHALE_DEBRIS_PATHS = [
    new Path2D('M0,0 C10,-15 30,-15 40,0 C35,18 15,20 0,0 Z'),
    new Path2D('M0,0 L25,-10 L45,5 L20,25 Z'),
    new Path2D('M0,0 Q20,-20 35,-5 Q45,10 25,25 Q5,30 0,15 Z'),
    new Path2D('M0,-5 L15,-15 L30,-10 L40,5 L25,15 L10,20 Z')
];
export function generarTrozoBallena(x, y, numTrozos = 3, fuerza = 150) {
    for (let i = 0; i < numTrozos + Math.random() * numTrozos; i++) {
        const ang = Math.random() * Math.PI * 2; // Salen en todas direcciones
        const spd = 50 + Math.random() * fuerza;
        const vida = 1.5 + Math.random() * 1.5;
        const coloresCarne = ['#ab4e52', '#8e3a46', '#6d2e37']; // Tonos de carne/sangre
        whaleDebris.push({
            x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            vRot: (Math.random() - 0.5) * 5, rotacion: Math.random() * Math.PI * 2,
            vida: vida, vidaMax: vida, color: coloresCarne[Math.floor(Math.random() * coloresCarne.length)],
            path: WHALE_DEBRIS_PATHS[Math.floor(Math.random() * WHALE_DEBRIS_PATHS.length)]
        });
    }
}

export function generarGotasSangre(x, y) {
    for (let i = 0; i < 10 + Math.random() * 10; i++) {
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

// --- Estado Principal y Entidades ---
export let estadoJuego = null, jugador, animales;
let teclas = {};
let modoSuperposicion = 'menu'; let estabaCorriendoAntesCreditos = false; // prettier-ignore
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
        proyectilesTinta: [],
        armaActual: estadoJuego ? estadoJuego.armaActual : 'garra', // Preservar arma
        enfriamientoArma: 0,
        asesinatos: 0,
        teclasActivas: {},
        boostActivo: false,
        boostEnergia: 100,
        boostMaxEnergia: 100,
        boostEnfriamiento: 0,
        laserEnergia: 100,
        laserMaxEnergia: 100,
        laserActivo: false,
        velocidadJuego: 1.0,
        slowMoTimer: 0, 
        levelFlags: {}, // >>> CAMBIO CLAVE <<< Objeto para que los niveles comuniquen flags al motor (ej: no mover el fondo)
        screenShake: 0,
        cameraZoom: 1.0,
    };
    estadoJuego.cameraX = 0;
    estadoJuego.cameraY = 0;
    estadoJuego.prevCameraX = 0;
    
    delete estadoJuego.darknessOverride; // Limpiamos la oscuridad del nivel 2, si existiera.

    jugador = { x: W * 0.18, y: H / 2, r: 26, garra: null, vy: 0, inclinacion: 0 };
    
    Levels.initLevel(nivelDeInicio);
    
    animales = [];
    Weapons.initWeapons();
    whaleDebris = [];
    particulasTinta = [];
    particulasPolvoMarino = [];

    autoSize();
    iniciarParticulas();
    iniciarPolvoMarino();
    if (gameplayHints) gameplayHints.style.display = 'none';
}

function velocidadActual() {
    if (!estadoJuego || !estadoJuego.enEjecucion) return 120;
    return Levels.getLevelSpeed();
}
function puntosPorRescate() { const p0 = clamp(estadoJuego.tiempoTranscurrido / 180, 0, 1); return Math.floor(lerp(100, 250, p0)); }

// --- Generación de Enemigos ---
export function generarAnimal(esEsbirroJefe = false, tipoForzado = null, overrides = {}) {
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
        if (whaleListo && r < 0.15) { // 15% de probabilidad de que aparezca una familia de ballenas
            tipo = 'whale';
        } else if (sharkListo && r > 0.85) { // 15% de probabilidad de que sea un tiburón.
            tipo = 'shark';
        }
    }

    const spawnX = usaCamera ? estadoJuego.cameraX + W + (overrides.ancho || 100) : W + (overrides.ancho || 100);

    if (tipo === 'mierdei') {
        if (!mierdeiListo) return; // Evitar error si la imagen no ha cargado
        const anchoDeseado = overrides.ancho || 100;
        let altoDeseado = anchoDeseado; // Asumir cuadrado por defecto
        if (mierdeiImg.width > 0) {
            altoDeseado = anchoDeseado * (mierdeiImg.height / mierdeiImg.width);
        }
        animales.push({
            x: spawnX, y, vx: -velocidad * 0.7, r: anchoDeseado / 2,
            w: anchoDeseado, h: altoDeseado, capturado: false, tipo: 'mierdei',
            semillaFase: Math.random() * Math.PI * 2, // Kept for floating, might remove later if not needed
            frame: 0, 
            timerFrame: 0,
        });
    } else if (tipo === 'shark') {
        const tamano = overrides.ancho || 128;
        velocidad *= 0.9; // Un poco más lentos al patrullar
        animales.push({
            x: spawnX, y, vx: -velocidad, vy: 0, r: 50, w: tamano, h: tamano,
            capturado: false, frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2, 
            tipo: 'shark',
            huntCooldown: 2.0 + Math.random(), // Cooldown inicial antes de la primera caza
            isHunting: false,
            isPackLeader: false,
        });
    } else if (tipo === 'whale') {
        const tamano = overrides.ancho || 250;
        velocidad *= 0.5; // Muy lentas        
        const adultWhale = {
            x: spawnX, y, vx: -velocidad, vy: 0, r: 100, w: tamano, h: tamano,
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
        };
        animales.push(adultWhale);

        // --- NUEVO: Generar crías de ballena junto a la adulta ---
        if (babyWhaleListo) {
            const numBabies = 1 + Math.floor(Math.random() * 2); // 1 o 2 crías
            for (let i = 0; i < numBabies; i++) {
                const babyTamano = 140; // Un poco más grande que antes
                const babyVelocidad = velocidad * 1.4; // Ligeramente más rápidas que la madre
                const babyY = y + (i === 0 ? -80 : 80) + (Math.random() - 0.5) * 40;
                const babyX = spawnX + 120 + Math.random() * 80;

                animales.push({
                    x: babyX, y: babyY, vx: -babyVelocidad, vy: 0, r: 55, w: babyTamano, h: babyTamano,
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
            x: spawnX, y, vx: -velocidad, r: 44, w: tamano, h: tamano,
            capturado: false, fila, frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2, tipo: tipo,
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
        Levels
    };
    Weapons.disparar(fireContext);
}

function lanzarTorpedo() {
    const torpedoContext = {
        estadoJuego,
        jugador,
        S
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

        // Animación de frame
        a.timerFrame += dt;
        if (a.timerFrame >= 0.25) { a.timerFrame -= 0.25; a.frame ^= 1; }

        // Reciclar si sale de la pantalla para mantener el ambiente vivo
        if (a.x < -a.w) {
            animales.splice(i, 1);
            if (modoSuperposicion === 'menu' && !__iniciando) {
                const tiposMenu = ['normal'];
                if (sharkListo) tiposMenu.push('shark');
                if (whaleListo) tiposMenu.push('whale');
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

    if (estadoJuego.slowMoTimer > 0) {
        estadoJuego.slowMoTimer -= dt;
        if (estadoJuego.slowMoTimer <= 0) {
            estadoJuego.velocidadJuego = 1.0;
        }
    }
    const dtAjustado = dt * estadoJuego.velocidadJuego;

    // --- Determinar si se usa el sistema de cámara para este nivel ---
    const usaCamera = estadoJuego.levelFlags.scrollBackground !== false;

    // --- Actualización de Timers y Estado General ---
    estadoJuego.tiempoTranscurrido += dtAjustado;
    estadoJuego.bloqueoEntrada = Math.max(0, estadoJuego.bloqueoEntrada - dtAjustado);
    if (estadoJuego.enfriamientoTorpedo > 0) estadoJuego.enfriamientoTorpedo -= dtAjustado;
    if (estadoJuego.armaCambiandoTimer > 0) {
        estadoJuego.armaCambiandoTimer -= dtAjustado;
    }
    if (estadoJuego.enfriamientoArma > 0) estadoJuego.enfriamientoArma -= dtAjustado;
    estadoJuego.teclasActivas = teclas;
    
    const progresoProfundidad = clamp(estadoJuego.tiempoTranscurrido / 180, 0, 1);
    estadoJuego.profundidad_m = Math.max(estadoJuego.profundidad_m, Math.floor(lerp(0, 3900, progresoProfundidad)));
    
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
        generarBurbujaPropulsion(jugador.x - 30, jugador.y, false);
    }
    
    // --- Animación de la Hélice ---
    const isMoving = len > 0;
    let targetSpeed = 5; // Velocidad de ralentí
    if (estadoJuego.boostActivo) {
        targetSpeed = 70; // Velocidad de impulso
    } else if (isMoving) {
        targetSpeed = 25; // Velocidad de movimiento normal
    }
    // Suavizar la transición de velocidad
    propellerCurrentSpeed = lerp(propellerCurrentSpeed, targetSpeed, dtAjustado * 8);
    propellerRotation += propellerCurrentSpeed * dtAjustado;

    // Llama a la lógica de actualización del nivel actual
    Levels.updateLevel(dtAjustado);
    
    // Aplicar el movimiento calculado a partir de las teclas
    jugador.x += vx * dtAjustado;
    jugador.y += vy * dtAjustado;

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

        estadoJuego.cameraX = lerp(estadoJuego.cameraX, targetCameraX, dtAjustado * 4);
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

    const isLevel5 = estadoJuego.nivel === 5;
    if(isLevel5){
        if (teclas['ArrowLeft']) inclinacionRobotObjetivo -= INCLINACION_MAX * 1.5;
        else if (teclas['ArrowRight']) inclinacionRobotObjetivo += INCLINACION_MAX * 1.5;
    }
    jugador.inclinacion += (inclinacionRobotObjetivo - jugador.inclinacion) * Math.min(1, 8 * dtAjustado);

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
    if (teclas[' '] && estadoJuego.bloqueoEntrada === 0 && estadoJuego.armaActual !== 'laser') { disparar(); teclas[' '] = false; }
    if ((teclas['x'] || teclas['X']) && estadoJuego.bloqueoEntrada === 0) { lanzarTorpedo(); teclas['x'] = teclas['X'] = false; }
    if (teclas['1']) { estadoJuego.armaActual = 'garra'; }
    if (teclas['2']) { estadoJuego.armaActual = 'shotgun'; }
    if (teclas['3']) { estadoJuego.armaActual = 'metralleta'; }
    if (teclas['4']) { estadoJuego.armaActual = 'laser'; }
    if ((teclas['c'] || teclas['C']) && estadoJuego.bloqueoEntrada === 0) {
        const currentIndex = Weapons.WEAPON_ORDER.indexOf(estadoJuego.armaActual);
        const nextIndex = (currentIndex + 1) % Weapons.WEAPON_ORDER.length;
        estadoJuego.armaActual = Weapons.WEAPON_ORDER[nextIndex];
        teclas['c'] = teclas['C'] = false;
        S.reproducir('reload');
        estadoJuego.armaCambiandoTimer = 0.3;
    }
    
    // --- Actualización del Progreso del Nivel ---
    const configNivel = Levels.CONFIG_NIVELES[estadoJuego.nivel - 1];
    if (configNivel.tipo === 'capture') estadoJuego.valorObjetivoNivel = estadoJuego.rescatados;
    else if (configNivel.tipo === 'survive') estadoJuego.valorObjetivoNivel = Math.min(estadoJuego.valorObjetivoNivel + dtAjustado, configNivel.meta);
    
    // --- Lógica de Habilidades: Impulso (Boost) ---
    estadoJuego.boostActivo = (teclas['b'] || teclas['B']) && estadoJuego.boostEnergia > 0 && estadoJuego.boostEnfriamiento <= 0;

    // --- NUEVO: Lógica de efectos de cámara para el impulso ---
    if (estadoJuego.boostActivo) {
        estadoJuego.boostEnergia -= Weapons.WEAPON_CONFIG.boost.consumo * dtAjustado;
        estadoJuego.screenShake = 5; // Activa el temblor de pantalla
        estadoJuego.cameraZoom = 0.95; // Activa el zoom out
        
        let boostVx = 1, boostVy = 0;
        if (len > 0) {
            boostVx = vx / JUGADOR_VELOCIDAD; // Normalizar el vector de velocidad
            boostVy = vy / JUGADOR_VELOCIDAD;
        }
        jugador.x += boostVx * Weapons.WEAPON_CONFIG.boost.fuerza * dtAjustado;
        jugador.y += boostVy * Weapons.WEAPON_CONFIG.boost.fuerza * dtAjustado;
    } else {
        if (estadoJuego.boostEnfriamiento <= 0) {
            estadoJuego.boostEnergia += Weapons.WEAPON_CONFIG.boost.regeneracion * dtAjustado; // Regeneración de energía
            estadoJuego.boostEnergia = Math.min(estadoJuego.boostEnergia, estadoJuego.boostMaxEnergia);
        }
        estadoJuego.screenShake = lerp(estadoJuego.screenShake, 0, dtAjustado * 5);
        estadoJuego.cameraZoom = lerp(estadoJuego.cameraZoom, 1.0, dtAjustado * 5);
    }

    if (estadoJuego.boostEnergia <= 0) {
        estadoJuego.boostEnergia = 0;
        if (estadoJuego.boostEnfriamiento <= 0) { // Iniciar enfriamiento solo una vez
             estadoJuego.boostEnfriamiento = 2.0; // 2 segundos de enfriamiento
        }
    }

    if (estadoJuego.boostEnfriamiento > 0) {
        estadoJuego.boostEnfriamiento -= dtAjustado;
    }

    // --- Lógica de Habilidades: Arma Láser ---
    if (estadoJuego.armaActual === 'laser') {
        if (teclas[' '] && estadoJuego.laserEnergia > 0) {
            estadoJuego.laserActivo = true;
            estadoJuego.laserEnergia = Math.max(0, estadoJuego.laserEnergia - Weapons.WEAPON_CONFIG.laser.consumoEnergia * dtAjustado);
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
        estadoJuego.laserEnergia += Weapons.WEAPON_CONFIG.laser.regeneracionEnergia * dtAjustado;
        estadoJuego.laserEnergia = Math.min(estadoJuego.laserEnergia, estadoJuego.laserMaxEnergia);
    }

    // --- Actualización de Enemigos (Animales) ---
    for (let i = animales.length - 1; i >= 0; i--) { 
        const a = animales[i]; 
        if (a.laserHitTimer > 0) a.laserHitTimer -= dtAjustado;
        
        // --- IA y Movimiento Específico por Tipo de Enemigo ---        
        if (a.tipo === 'baby_whale') {
            // --- NUEVO: Lógica de huida ---
            const FLEE_RADIUS = 250;
            const playerDist = Math.hypot(jugador.x - a.x, jugador.y - a.y);

            // Si el jugador se acerca y la cría no está huyendo, inicia la huida.
            if (playerDist < FLEE_RADIUS && !a.isFleeing && a.mother && animales.includes(a.mother)) {
                a.isFleeing = true;
                a.fleeTimer = 2.5; // Huirá durante 2.5 segundos.
            }

            // Actualizar el temporizador de huida.
            if (a.isFleeing) {
                a.fleeTimer -= dtAjustado;
                if (a.fleeTimer <= 0) {
                    a.isFleeing = false;
                }
            }

            // --- Movimiento ---
            if (a.mother && animales.includes(a.mother)) {
                let targetX, targetY, speed;
                if (a.isFleeing) {
                    // Objetivo: un punto seguro detrás de la madre.
                    targetX = a.mother.x + 200;
                    targetY = a.mother.y;
                    speed = 2.2; // Se mueve más rápido para escapar.
                } else {
                    // Comportamiento normal: seguir a la madre.
                    targetX = a.mother.x + 150;
                    targetY = a.mother.y;
                    speed = 0.8;
                }
                a.x = lerp(a.x, targetX, dtAjustado * speed);
                a.y = lerp(a.y, targetY, dtAjustado * speed);
            } else {
                // Si no hay madre, se mueve por su cuenta
                a.x += a.vx * dtAjustado;
            }

            // Movimiento sinusoidal para que sea más natural
            a.y += Math.sin(estadoJuego.tiempoTranscurrido * 2.5 + a.semillaFase) * 60 * dtAjustado;

            a.timerFrame += dtAjustado;
            if (a.timerFrame >= BABYWHALE_ANIMATION_SPEED) {
                a.timerFrame -= BABYWHALE_ANIMATION_SPEED;
                if (BABYWHALE_SPRITE_DATA) {
                    a.frame = (a.frame + 1) % BABYWHALE_SPRITE_DATA.frames.length;
                }
            }
        } else if (a.tipo === 'shark') {
            if (a.isHunting) {
                // El tiburón está cazando, se mueve en su vector de ataque
                a.x += a.vx * dtAjustado;
                a.y += a.vy * dtAjustado;
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
                a.x += a.vx * dtAjustado;
                a.huntCooldown -= dtAjustado;
                // Si ve al jugador y no está en cooldown, inicia la caza en manada
                if (a.huntCooldown <= 0 && jugador.x < a.x && a.x < W) {
                    // --- INICIO DE LA NUEVA LÓGICA DE CAZA EN MANADA ---
                    a.isHunting = true;
                    a.isPackLeader = true; // Este es el líder de la manada
                    const angle = Math.atan2(jugador.y - a.y, jugador.x - a.x);
                    a.vx = Math.cos(angle) * 600; // Velocidad de embestida
                    a.vy = Math.sin(angle) * 600;
                    a.huntCooldown = 5.0 + Math.random() * 3; // Cooldown más largo para el líder

                    // El líder "llama" a otros tiburones cercanos para que se unan al ataque
                    const PACK_CALL_RADIUS = W * 0.5; // Radio de llamada de la manada
                    for (const otherShark of animales) {
                        if (otherShark !== a && otherShark.tipo === 'shark' && !otherShark.isHunting) {
                            const distance = Math.hypot(a.x - otherShark.x, a.y - otherShark.y);
                            if (distance < PACK_CALL_RADIUS) {
                                // Este tiburón se une a la caza como seguidor
                                otherShark.isHunting = true;
                                otherShark.isPackLeader = false;
                                const targetX = jugador.x + (Math.random() - 0.5) * 200; // Apunta a una zona cercana al jugador
                                const targetY = jugador.y + (Math.random() - 0.5) * 200;
                                const followerAngle = Math.atan2(targetY - otherShark.y, targetX - otherShark.x);
                                const followerSpeed = 550 + Math.random() * 100; // Velocidad ligeramente variable
                                otherShark.vx = Math.cos(followerAngle) * followerSpeed;
                                otherShark.vy = Math.sin(followerAngle) * followerSpeed;
                                otherShark.huntCooldown = 3.0 + Math.random() * 2; // Cooldown para el seguidor
                            }
                        }
                    }
                    // --- FIN DE LA NUEVA LÓGICA ---
                }
            }
            // Animación específica para el tiburón
            a.timerFrame += dtAjustado;
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
            a.spoutCooldown -= dtAjustado;
            if (a.spoutCooldown <= 0 && !a.isTailSwiping) {
                // Dispara un chorro de agua hacia arriba o abajo
                const dirY = a.y > H / 2 ? -1 : 1; // Dispara lejos del centro de la pantalla
                generarChorroDeAgua(a.x - a.w * 0.2, a.y, dirY);
                a.spoutCooldown = 3.5 + Math.random() * 2.5; // Reinicia el temporizador
            }

            // --- LÓGICA DE CANTO AMBIENTAL ---
            if (a.songCooldown > 0) {
                a.songCooldown -= dtAjustado;
            } else {
                S.playRandomWhaleSong();
                // Reinicia el temporizador para el próximo canto (REDUCIDO PARA PRUEBAS)
                a.songCooldown = 5.0 + Math.random() * 5.0;
            }

            // 2. Ataque de coletazo (Tail Swipe)
            a.tailSwipeCooldown -= dtAjustado;
            // El coletazo solo ocurre si el jugador está detrás de la ballena
            if (a.tailSwipeCooldown <= 0 && !a.isTailSwiping && jugador.x > a.x) {
                a.isTailSwiping = true;
                a.tailSwipeProgress = 0;
                a.tailSwipeCooldown = 6.0 + Math.random() * 4.0;
            }

            if (a.isTailSwiping) {
                a.tailSwipeProgress += dtAjustado * 4; // El coletazo dura 0.25s
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
            } else if (a.isProtecting && a.protectedBaby) {
                // --- MOVIMIENTO DE PROTECCIÓN ---
                // La ballena se interpone entre el jugador y la cría.
                const baby = a.protectedBaby;
                const dx = jugador.x - baby.x;
                const dy = jugador.y - baby.y;
                const dist = Math.hypot(dx, dy);
                
                // El objetivo es un punto delante de la cría, en la línea hacia el jugador
                const offset = 120; // A qué distancia se interpone
                const targetX = baby.x + (dx / dist) * offset;
                const targetY = baby.y + (dy / dist) * offset;

                // Moverse hacia el objetivo más rápido de lo normal
                const protectionSpeed = 2.5;
                a.x = lerp(a.x, targetX, dtAjustado * protectionSpeed);
                a.y = lerp(a.y, targetY, dtAjustado * protectionSpeed);

                // Si está protegiendo, puede intentar un coletazo si el jugador se acerca demasiado a la ballena
                if (a.tailSwipeCooldown <= 0 && Math.hypot(jugador.x - a.x, jugador.y - a.y) < 200) {
                    a.isTailSwiping = true; a.tailSwipeProgress = 0; a.tailSwipeCooldown = 4.0 + Math.random() * 3.0;
                }
            } else {
                a.x += a.vx * dtAjustado; // Movimiento normal de patrulla
            }
            // --- FIN SUGERENCIA ---

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
            a.timerFrame += dtAjustado;
            if (a.timerFrame >= WHALE_ANIMATION_SPEED) {
                a.timerFrame -= WHALE_ANIMATION_SPEED;
                a.frame = (a.frame + 1) % WHALE_SPRITE_DATA.frames.length;
            }
        } else if (a.tipo === 'mierdei') {
            a.x += a.vx * dtAjustado;
            a.timerFrame += dtAjustado;
            if (a.timerFrame >= MIERDEi_ANIMATION_SPEED) {
                a.timerFrame -= MIERDEi_ANIMATION_SPEED;
                a.frame = (a.frame + 1) % MIERDEI_SPRITE_DATA.frames.length;
            }
        } else {
            // --- SUGERENCIA DE IA: LÓGICA DE MOVIMIENTO VARIADO ---
            switch (a.patronMovimiento) {
                case 'sinusoidal':
                    a.x += a.vx * dtAjustado;
                    // Usamos el tiempo de juego y una semilla para que cada pez tenga una onda única
                    a.y += Math.sin(estadoJuego.tiempoTranscurrido * 3 + a.semillaFase) * 80 * dtAjustado;
                    break;
                case 'pausa_acelera':
                    if (a.estadoMovimiento === 'moviendo') {
                        a.x += a.vx * dtAjustado;
                        // Si cruza cierto punto de la pantalla, entra en estado de pausa
                        if (a.x < W * 0.85) {
                            a.estadoMovimiento = 'pausado';
                            a.timerMovimiento = 0.5 + Math.random() * 0.8; // Pausa entre 0.5 y 1.3s
                        }
                    } else if (a.estadoMovimiento === 'pausado') {
                        a.timerMovimiento -= dtAjustado;
                        if (a.timerMovimiento <= 0) {
                            a.estadoMovimiento = 'acelerando';
                            // Acelera hacia la Y del jugador
                            const angulo = Math.atan2(jugador.y - a.y, jugador.x - a.x);
                            a.vx = Math.cos(angulo) * velocidadActual() * 1.5;
                            a.vy = Math.sin(angulo) * velocidadActual() * 1.5;
                        }
                    } else { // 'acelerando'
                        a.x += a.vx * dtAjustado;
                        a.y += a.vy * dtAjustado;
                    }
                    break;
                default: // 'lineal'
                    a.x += a.vx * dtAjustado;
                    break;
            }
            // --- FIN SUGERENCIA ---
            // >>> NUEVO: Estela de burbujas para los peces <<<
            if (Math.random() < 0.15) { // No generar en cada frame para un efecto más sutil
                const tailX = a.x + a.w / 2; // La cola del pez
                const tailY = a.y;
                generarParticula(particulasBurbujas, {
                    x: tailX,
                    y: tailY,
                    vx: 20 + Math.random() * 20, // Burbujas van un poco hacia la derecha (quedan atrás)
                    vy: (Math.random() - 0.5) * 20 - 15, // Tienden a flotar hacia arriba
                    r: Math.random() * 1.5 + 0.5, // Burbujas pequeñas
                    vida: 0.8 + Math.random() * 0.7,
                    color: '' // El color no se usa para las burbujas, solo el stroke
                });
            }
            // Animación para otras criaturas
            a.timerFrame += dtAjustado; 
            if (a.timerFrame >= 0.2) { a.timerFrame -= 0.2; a.frame ^= 1; }
        }
        
        // --- Colisión Jugador-Enemigo ---
        if (!a.capturado && Math.hypot(jugador.x - a.x, jugador.y - a.y) < jugador.r + a.r * 0.5) {
            const damage = a.tipo === 'whale' ? 7 : 1;

            // Efectos de sangre y trozos al chocar
            const collisionX = (jugador.x + a.x) / 2;
            const collisionY = (jugador.y + a.y) / 2;
            generarBurbujasDeSangre(collisionX, collisionY);
            generarTrozoBallena(collisionX, collisionY, 4, 120);
            generarGotasSangre(collisionX, collisionY);

            Levels.onKill(a.tipo); // Notificar al sistema de niveles sobre la muerte

            animales.splice(i, 1);
            const antes = estadoJuego.vidas;
            if (estadoJuego.vidas > 0) {
                estadoJuego.vidas = Math.max(0, estadoJuego.vidas - damage);
            }
            if (estadoJuego.vidas < antes) {
                estadoJuego.animVida = 0.6;
                S.reproducir('choque');
            }
            if (estadoJuego.vidas <= 0) perderJuego();
            continue;
        } 
        
        // --- Limpieza de Enemigos Fuera de Pantalla ---
        const despawnLimit = usaCamera ? estadoJuego.cameraX - a.w : -a.w;
        if (a.x < despawnLimit) { 
            animales.splice(i, 1); 
        }
    }
    
    // --- Actualización de Otros Proyectiles y Efectos ---
    for (let i = estadoJuego.proyectilesTinta.length - 1; i >= 0; i--) { const ink = estadoJuego.proyectilesTinta[i]; ink.x += ink.vx * dtAjustado; if (ink.x < 0) { generarNubeDeTinta(ink.x + Math.random() * 100, ink.y, 80); estadoJuego.proyectilesTinta.splice(i, 1); } }

    estadoJuego.animVida = Math.max(0, estadoJuego.animVida - dtAjustado);
    
    // Actualizar trozos de ballena
    for (let i = whaleDebris.length - 1; i >= 0; i--) {
        const d = whaleDebris[i];
        d.vy += 250 * dtAjustado; // Gravedad
        d.x += d.vx * dtAjustado;
        d.y += d.vy * dtAjustado;
        d.rotacion += d.vRot * dtAjustado;
        d.vida -= dtAjustado;

        // Dejar un rastro de sangre
        if (Math.random() < 0.4) { // 40% de probabilidad por frame de soltar una partícula
            generarParticula(particulasExplosion, {
                x: d.x, y: d.y,
                vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
                r: 1 + Math.random() * 2,
                vida: 0.5 + Math.random() * 0.5,
                color: '#8b0000' // Rojo oscuro
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

    comprobarCompletadoNivel();
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
            else if (a.tipo === 'mierdei') {
                // --- Dibuja el Mierdei ---
                ctx.translate(a.x, a.y + offsetFlotante);
                if (mierdeiListo && MIERDEI_SPRITE_DATA) {
                    const frameData = MIERDEI_SPRITE_DATA.frames[a.frame];
                    if (frameData) {
                        const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                        const aspectRatio = sWidth / sHeight;
                        const dHeight = a.w / aspectRatio;
                        ctx.imageSmoothingEnabled = false;
                        if (a.vx > 0) { ctx.scale(-1, 1); }
                        ctx.drawImage(mierdeiImg, sx, sy, sWidth, sHeight, 
                            Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                    }
                }
            } else if (a.tipo === 'shark') {
                // --- Dibuja el Tiburón ---
                ctx.translate(a.x, a.y);

                // Efecto visual para la caza en manada
                if (a.isHunting) {
                    // Un tinte rojizo y más brillante para indicar furia
                    ctx.filter = 'hue-rotate(-20deg) brightness(1.3) saturate(2)';
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
                        ctx.drawImage(sharkImg, 
                            sx, sy, sWidth, sHeight, 
                            Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight
                        );
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
                    ctx.arc(tailX, 0, 60, -Math.PI/2, Math.PI/2);
                    ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * 0.8})`;
                    ctx.lineWidth = 8;
                    ctx.stroke();
                }
                // --- FIN SUGERENCIA ---

                if (a.isEnraged) {
                    ctx.filter = 'hue-rotate(-25deg) brightness(1.4) saturate(3)';
                }
                if (whaleListo && WHALE_SPRITE_DATA) {
                    const frameData = WHALE_SPRITE_DATA.frames[a.frame];
                    if (frameData) {
                        const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                        const aspectRatio = sWidth / sHeight;
                        const dHeight = a.w / aspectRatio;
                        ctx.imageSmoothingEnabled = false;
                        if (a.vx > 0) { ctx.scale(-1, 1); }
                        ctx.drawImage(whaleImg, sx, sy, sWidth, sHeight, Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
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
                if (a.tipo === 'aggressive') ctx.filter = 'hue-rotate(180deg) brightness(1.2)';
                if (a.tipo === 'rojo') ctx.filter = 'sepia(1) saturate(5) hue-rotate(-40deg)';
                if (a.tipo === 'dorado') ctx.filter = 'brightness(1.5) saturate(3) hue-rotate(15deg)';

                if (criaturasListas && cFilas > 0) {
                    const sx = (a.frame % 2) * cFrameAncho, sy = (a.fila % cFilas) * cFrameAlto;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(criaturasImg, sx, sy, cFrameAncho, cFrameAlto, Math.round(a.x - a.w / 2), Math.round(a.y + offsetFlotante - a.h / 2), a.w, a.h);
                } else {
                    ctx.fillStyle = a.tipo === 'aggressive' ? '#ff5e5e' : '#ffd95e';
                    ctx.beginPath();
                    ctx.arc(a.x, a.y + offsetFlotante, a.r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
        
        // Dibuja el submarino de la animación del menú si no se está jugando
        if (estadoJuego && !estadoJuego.enEjecucion) {
            dibujarAnimacionMenu();
        }

        // --- Dibuja al Jugador y sus Efectos ---
        if (jugador) {
            const isLevel5 = estadoJuego && estadoJuego.nivel === 5;
            // Animación de flotación sutil
            const bobbingY = Math.sin(estadoJuego.tiempoTranscurrido * 2.5) * 3;
            const px = jugador.x;
            const py = jugador.y + bobbingY; // Aplicar flotación

            ctx.save();
            ctx.translate(px, py);
            const anguloFinal = isLevel5 ? -Math.PI / 2 + jugador.inclinacion : jugador.inclinacion;
            ctx.rotate(anguloFinal); // prettier-ignore

            // --- Dibuja la Hélice ---
            if (propellerReady && propellerImg) {
                ctx.save();
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
                        for(let i = 0; i < 8; i++) { generarBurbujaPropulsion(px - 40 * Math.cos(anguloFinal), py - 40 * Math.sin(anguloFinal) + (Math.random() - 0.5) * 30, isLevel5); }
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
        }

        // --- Dibuja los Proyectiles ---
        ctx.fillStyle = '#101010';
        for (const ink of estadoJuego.proyectilesTinta) { ctx.beginPath(); ctx.arc(ink.x, ink.y, ink.r, 0, Math.PI * 2); ctx.fill(); }

        ctx.imageSmoothingEnabled = true;
    }

    // --- Dibuja Partículas y Efectos de Mundo (dentro de la cámara) ---
    dibujarParticulas();

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
    
    // Se restaura el contexto principal (que incluye la cámara, zoom y shake)
    ctx.restore();

    // --- Dibuja Efectos de Pantalla (fuera de la cámara) ---
    dibujarSonar();
    dibujarMascaraLuz();
    dibujarPolvoMarino(); // Dibuja el polvo/plancton en el canvas de efectos
    dibujarHUD();
}

// --- Funciones de Renderizado Auxiliares ---
/**
 * Dibuja el fondo y el primer plano con efecto de paralaje,
 * asegurando que las imágenes mantengan su proporción.
 */
function dibujarFondoParallax() {
    if (!estadoJuego || !bgCtx) return;

    // 1. Limpiar el canvas y dibujar el color de fondo base
    bgCtx.fillStyle = '#06131f';
    bgCtx.fillRect(0, 0, W, H);

    // 2. Dibujar la capa de fondo (background)
    if (bgListo && bgAncho > 0) {
        bgCtx.imageSmoothingEnabled = false;
        
        // Calcular el alto y ancho manteniendo la proporción para que cubra la altura del canvas
        const ratio = bgAncho / bgAlto;
        const alturaDibujoBg = H;
        const anchoDibujoBg = alturaDibujoBg * ratio;

        // Usar el operador de módulo para que el scroll sea infinito
        const bgOffsetLooping = bgOffset % anchoDibujoBg;

        // Dibujar las imágenes necesarias para cubrir la pantalla
        for (let x = -bgOffsetLooping; x < W; x += anchoDibujoBg) {
            bgCtx.drawImage(bgImg, Math.round(x), 0, anchoDibujoBg, alturaDibujoBg);
        }
    }

    // 3. Dibujar la capa de primer plano (foreground)
    if (fgListo && fgAncho > 0 && fgAlto > 0) {
        // El primer plano se alinea abajo y no se escala, para que el suelo siempre esté en su sitio.
        const yBase = H - fgAlto;
        const fgOffsetLooping = fgOffset % fgAncho;

        for (let xx = -fgOffsetLooping; xx < W; xx += fgAncho) {
            bgCtx.drawImage(fgImg, Math.round(xx), Math.round(yBase), fgAncho, fgAlto);
        }
    }
}

/**
 * Dibuja la superposición del efecto de sonar en su propio canvas.
 */
function dibujarSonar() {
    if (!sonarCtx || !estadoJuego || !estadoJuego.enEjecucion) {
        if (sonarCtx) sonarCtx.clearRect(0, 0, W, H);
        return;
    }

    const SONAR_COLOR_FAINT = 'rgba(100, 255, 150, 0.3)';
    const SONAR_COLOR_BORDER = 'rgba(126, 203, 255, 0.4)';
    const SWEEP_SPEED = 3.0; // Radianes por segundo

    sonarCtx.clearRect(0, 0, W, H);
    sonarCtx.save();

    // --- 1. Definir el centro y radio del sonar (MINIMAPA) ---
    const SONAR_RADIUS = 90; // Radio en píxeles del minimapa
    const SONAR_WORLD_RADIUS = 2800; // Radio en unidades del juego que cubre el sonar
    const PADDING = 20;
    const centerX = W - SONAR_RADIUS - PADDING;
    const centerY = H - SONAR_RADIUS - PADDING;

    // --- 2. Dibujar el fondo y la retícula ---
    // Fondo oscuro semitransparente
    sonarCtx.fillStyle = 'rgba(6, 19, 31, 0.75)';
    sonarCtx.beginPath();
    sonarCtx.arc(centerX, centerY, SONAR_RADIUS, 0, Math.PI * 2);
    sonarCtx.fill();

    // Retícula (círculos y líneas)
    sonarCtx.strokeStyle = SONAR_COLOR_FAINT;
    sonarCtx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) { // 3 círculos concéntricos
        sonarCtx.beginPath();
        sonarCtx.arc(centerX, centerY, SONAR_RADIUS * (i / 3), 0, Math.PI * 2);
        sonarCtx.stroke();
    }
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        sonarCtx.beginPath();
        sonarCtx.moveTo(centerX, centerY);
        sonarCtx.lineTo(centerX + Math.cos(angle) * SONAR_RADIUS, centerY + Math.sin(angle) * SONAR_RADIUS);
        sonarCtx.stroke();
    }

    // --- 3. Dibujar el barrido (sweep) ---
    const sweepAngle = (estadoJuego.tiempoTranscurrido * SWEEP_SPEED) % (Math.PI * 2);
    const grad = sonarCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, SONAR_RADIUS);
    grad.addColorStop(0, 'rgba(120, 255, 170, 0.4)');
    grad.addColorStop(0.8, 'rgba(100, 255, 150, 0.05)');
    grad.addColorStop(1, 'rgba(100, 255, 150, 0)');
    sonarCtx.fillStyle = grad;
    sonarCtx.beginPath();
    sonarCtx.moveTo(centerX, centerY);
    sonarCtx.arc(centerX, centerY, SONAR_RADIUS, sweepAngle - Math.PI / 2, sweepAngle);
    sonarCtx.closePath();
    sonarCtx.fill();

    // --- 4. Dibujar los "pings" de los enemigos y el jugador ---
    // El jugador está siempre en el centro del minimapa.
    sonarCtx.fillStyle = '#87CEEB'; // Color del jugador
    sonarCtx.fillRect(centerX - 5, centerY - 1, 10, 2); // Cruz horizontal
    sonarCtx.fillRect(centerX - 1, centerY - 5, 2, 10); // Cruz vertical

    for (const a of animales) {
        const dx = a.x - jugador.x;
        const dy = a.y - jugador.y;
        const dist = Math.hypot(dx, dy);

        if (dist < SONAR_WORLD_RADIUS) {
            // Convertir coordenadas del mundo relativas al jugador a coordenadas del minimapa
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;

            // Asegurarse de que el ping no se salga del círculo
            const distFromCenter = Math.hypot(pingX - centerX, pingY - centerY);
            if (distFromCenter > SONAR_RADIUS) continue;

            const isHostile = a.hp !== undefined || a.tipo === 'shark' || a.tipo === 'mega_whale' || a.tipo === 'mierdei';
            const isBoss = a.tipo === 'mega_whale' || (estadoJuego.jefe && a === estadoJuego.jefe);

            sonarCtx.fillStyle = isHostile ? 'rgba(255, 80, 80, 0.9)' : 'rgba(100, 255, 150, 0.9)';
            sonarCtx.beginPath();
            sonarCtx.arc(pingX, pingY, isBoss ? 6 : (isHostile ? 4 : 3), 0, Math.PI * 2);
            sonarCtx.fill();
        }
    }
    
    // Si hay un jefe, marcarlo de forma especial
    if (estadoJuego.jefe) {
        const dx = estadoJuego.jefe.x - jugador.x;
        const dy = estadoJuego.jefe.y - jugador.y;
        const dist = Math.hypot(dx, dy);
        if (dist < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const distFromCenter = Math.hypot(pingX - centerX, pingY - centerY);
            if (distFromCenter <= SONAR_RADIUS) {
                sonarCtx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
                sonarCtx.lineWidth = 2;
                sonarCtx.strokeRect(pingX - 7, pingY - 7, 14, 14);
            }
        }
    }

    // --- 5. Máscara circular y borde ---
    // Máscara para que nada se salga del círculo
    sonarCtx.globalCompositeOperation = 'destination-in';
    sonarCtx.beginPath();
    sonarCtx.arc(centerX, centerY, SONAR_RADIUS, 0, Math.PI * 2);
    sonarCtx.fillStyle = 'black'; // El color no importa, solo la forma
    sonarCtx.fill();
    sonarCtx.globalCompositeOperation = 'source-over';

    // Borde exterior
    sonarCtx.strokeStyle = SONAR_COLOR_BORDER;
    sonarCtx.lineWidth = 2;
    sonarCtx.beginPath();
    sonarCtx.arc(centerX, centerY, SONAR_RADIUS, 0, Math.PI * 2);
    sonarCtx.stroke();

    sonarCtx.restore();
}

// --- NUEVO: Función para dibujar el polvo marino ---
function dibujarPolvoMarino() {
    // Dibuja en el canvas de efectos (fx) para que aparezca por encima del juego
    if (!fx || !estadoJuego || !estadoJuego.enEjecucion) return;
    fx.save();
    fx.globalCompositeOperation = 'lighter'; // Un modo de mezcla que queda bien para partículas de luz/polvo

    for (const p of particulasPolvoMarino) {
        // La opacidad ya está calculada en la partícula
        fx.fillStyle = `rgba(207, 233, 255, ${p.opacidad})`;
        fx.beginPath();
        fx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        fx.fill();
    }
    fx.restore();
}

/**
 * Dibuja el submarino de la animación del menú si está activo.
 */
function dibujarAnimacionMenu() {
    if (!menuFlyBy || !menuFlyBy.active || !robotListo) return;

    ctx.save();
    ctx.translate(menuFlyBy.x, menuFlyBy.y);

    // Voltear el sprite si va de izquierda a derecha (el sprite mira a la derecha)
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
function dibujarMascaraLuz() {
    if (!estadoJuego || !fx) return;
    fx.clearRect(0, 0, W, H);
    const isLevel5 = estadoJuego.nivel === 5;

    const oscuridadBase = estadoJuego.tiempoTranscurrido / 180; // prettier-ignore
    const oscuridadObjetivo = estadoJuego.darknessOverride !== undefined 
        ? estadoJuego.darknessOverride 
        : oscuridadBase;

    const alpha = lerp(0, 0.9, clamp(oscuridadObjetivo, 0, 1));
    if (alpha <= 0.001) return;
    
    fx.globalCompositeOperation = 'source-over';
    fx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(3) + ')';
    fx.fillRect(0, 0, W, H);
    if (estadoJuego.luzVisible && jugador) { // prettier-ignore
        // --- CORRECCIÓN: Convertir coordenadas del mundo a coordenadas de pantalla ---
        // La luz se dibuja en el canvas 'fx', que no se mueve con la cámara.
        // Por lo tanto, debemos restar la posición de la cámara a la del jugador.
        const screenPx = jugador.x - Math.round(estadoJuego.cameraX);
        const screenPy = jugador.y - Math.round(estadoJuego.cameraY);

        const px = screenPx; const py = screenPy; const anguloBase = isLevel5 ? -Math.PI / 2 : 0; const ang = anguloBase + jugador.inclinacion; const ux = Math.cos(ang), uy = Math.sin(ang); const vx = -Math.sin(ang), vy = Math.cos(ang); const ax = Math.round(px + ux * (spriteAlto * robotEscala * 0.5 - 11)); const ay = Math.round(py + uy * (spriteAlto * robotEscala * 0.5 - 11)); const L = isLevel5 ? Math.min(H * 0.65, 560) : Math.min(W * 0.65, 560); const theta = Math.PI / 9; const endx = ax + ux * L, endy = ay + uy * L; const half = Math.tan(theta) * L; const pTopX = endx + vx * half, pTopY = endy + vy * half; const pBotX = endx - vx * half, pBotY = endy - vy * half; let g = fx.createLinearGradient(ax, ay, endx, endy); g.addColorStop(0.00, 'rgba(255,255,255,1.0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.5)'); g.addColorStop(1.00, 'rgba(255,255,255,0.0)'); fx.globalCompositeOperation = 'destination-out'; fx.fillStyle = g; fx.beginPath(); fx.moveTo(ax, ay); fx.lineTo(pTopX, pTopY); fx.lineTo(pBotX, pBotY); fx.closePath(); fx.fill(); const rg = fx.createRadialGradient(ax, ay, 0, ax, ay, 54); rg.addColorStop(0, 'rgba(255,255,255,1.0)'); rg.addColorStop(1, 'rgba(255,255,255,0.0)'); fx.fillStyle = rg; fx.beginPath(); fx.arc(ax, ay, 54, 0, Math.PI * 2); fx.fill(); fx.globalCompositeOperation = 'lighter'; const gGlow = fx.createLinearGradient(ax, ay, endx, endy); gGlow.addColorStop(0.00, 'rgba(255,255,255,0.14)'); gGlow.addColorStop(0.60, 'rgba(255,255,255,0.06)'); gGlow.addColorStop(1.00, 'rgba(255,255,255,0.00)'); fx.fillStyle = gGlow; fx.beginPath(); fx.moveTo(ax, ay); fx.lineTo(pTopX, pTopY); fx.lineTo(pBotX, pBotY); fx.closePath(); fx.fill(); fx.globalCompositeOperation = 'source-over';
    }
}

function dibujarHUD() {
    // Esta función es compleja. Se encarga de actualizar todo el texto y las barras de la UI.
    if (!estadoJuego || !hudLevelText || !hudObjectiveText) return;

    if (estadoJuego.enEjecucion) {
        hudLevelText.textContent = `NIVEL ${estadoJuego.nivel}`;

        const mision = Levels.getEstadoMision();
        if (mision) {
            // --- REFACTORIZACIÓN DE SEGURIDAD (CSP) ---
            // Se evita usar innerHTML para construir elementos. En su lugar, se crean
            // y añaden de forma segura, lo que es una mejor práctica y evita problemas
            // con políticas de seguridad de contenido (CSP) estrictas.
            hudObjectiveText.innerHTML = ''; // Limpiar contenido anterior
            const titleSpan = document.createElement('span');
            titleSpan.className = 'mission-title';
            titleSpan.textContent = mision.texto;
            hudObjectiveText.appendChild(titleSpan);
            hudObjectiveText.appendChild(document.createTextNode(mision.progreso));
        } else {
            hudObjectiveText.innerHTML = '';
            const configNivel = Levels.CONFIG_NIVELES[estadoJuego.nivel - 1];
            let textoObjetivo = '';
            if (configNivel.tipo === 'capture') { textoObjetivo = `CAPTURAS: ${estadoJuego.rescatados} / ${configNivel.meta}`; } 
            else if (configNivel.tipo === 'survive') { textoObjetivo = `SUPERVIVENCIA: ${Math.floor(configNivel.meta - estadoJuego.valorObjetivoNivel)}s`; } 
            else if (configNivel.tipo === 'boss') { textoObjetivo = configNivel.objetivo.toUpperCase(); }
            hudObjectiveText.textContent = textoObjetivo;
        }
    }

    if (!hud) return;
    hud.clearRect(0, 0, W, H);
    if (!estadoJuego.enEjecucion) return;

    const s = estadoJuego, valorPuntuacion = s.puntuacion || 0, valorVidas = s.vidas || 3, valorProfundidad = Math.floor(s.profundidad_m || 0);
    const padX = 18, padY = 18, lh = 22;
    hud.save();
    hud.fillStyle = '#ffffff';
    hud.font = '18px "Press Start 2P", monospace';
    hud.textAlign = 'left';
    hud.textBaseline = 'alphabetic';
    hud.shadowColor = 'rgba(0,0,0,0.7)';
    hud.shadowBlur = 4;
    const filas = [{ label: 'SCORE', value: String(valorPuntuacion) }, { label: 'DEPTH', value: valorProfundidad + ' m' }, { label: 'RECORD', value: String(puntuacionMaxima) }];
    const totalFilas = filas.length + 6;
    const y0 = H - padY - lh * totalFilas;
    let maxAnchoEtiqueta = 0;
    const todasLasEtiquetas = [...filas.map(f => f.label), 'VIDAS', 'TORPEDO', 'ARMA', 'ASESINO', 'IMPULSO'];
    for (const label of todasLasEtiquetas) { maxAnchoEtiqueta = Math.max(maxAnchoEtiqueta, hud.measureText(label).width); }
    const gap = 16;
    const valueX = padX + maxAnchoEtiqueta + gap;
    let currentY = y0;
    for (let i = 0; i < filas.length; i++) { hud.fillText(filas[i].label, padX, currentY); hud.fillText(filas[i].value, valueX, currentY); currentY += lh; }
    hud.fillText('VIDAS', padX, currentY);
    hud.fillStyle = '#ff4d4d';

    // Dibuja el corazón más grande y luego el número
    const originalFont = hud.font;
    hud.font = '22px "Press Start 2P", monospace'; // Un poco más grande para el corazón
    hud.fillText('♥', valueX, currentY);
    const heartWidth = hud.measureText('♥ ').width; // Medir el ancho del corazón con un espacio
    hud.font = originalFont; // Volver a la fuente original para el número
    hud.fillText(String(valorVidas), valueX + heartWidth, currentY);

    hud.fillStyle = '#ffffff';
    currentY += lh;
    hud.fillText('TORPEDO', padX, currentY);
    const torpedoListo = s.enfriamientoTorpedo <= 0;
    hud.fillStyle = torpedoListo ? '#66ff66' : '#ff6666';
    hud.fillText(torpedoListo ? 'LISTO' : 'RECARGANDO', valueX, currentY);
    currentY += lh;
    hud.fillStyle = '#ffffff';
    hud.fillText('ARMA', padX, currentY); // prettier-ignore
    let armaTexto = s.armaActual.toUpperCase(), armaColor = '#aaddff';
    if (s.armaActual === 'shotgun' || s.armaActual === 'metralleta' || s.armaActual === 'mina') { if (s.enfriamientoArma > 0) { armaTexto += " (RECARGA)"; armaColor = '#ff6666'; } else { armaTexto += " (LISTA)"; armaColor = '#ffdd77'; } }
    
    if (s.armaCambiandoTimer > 0) {
        const scale = 1 + Math.sin((1 - (s.armaCambiandoTimer / 0.3)) * Math.PI) * 0.5;
        const alpha = s.armaCambiandoTimer / 0.3;
        hud.save();
        const textWidth = hud.measureText(armaTexto).width;
        hud.translate(valueX + textWidth / 2, currentY - 5);
        hud.scale(scale, scale);
        hud.globalAlpha = alpha;
        hud.fillStyle = '#FFFFFF';
        hud.fillText(armaTexto, -textWidth / 2, 0);
        hud.restore();
    } else {
        hud.fillStyle = armaColor;
        hud.fillText(armaTexto, valueX, currentY);
    }
    currentY += lh;
    hud.fillStyle = '#ffffff';
    hud.fillText('ASESINO', padX, currentY);
    const rango = RANGOS_ASESINO.slice().reverse().find(r => s.asesinatos >= r.bajas) || RANGOS_ASESINO[0];
    hud.fillStyle = '#ff5e5e';
    hud.fillText(rango.titulo, valueX, currentY);
    currentY += lh;
    hud.fillStyle = '#ffffff';
    hud.fillText('IMPULSO', padX, currentY);
    const barX = valueX;
    const barW = 150;
    const barH = 10;
    const barY = currentY - barH;
    hud.fillStyle = '#333';
    hud.fillRect(barX, barY, barW, barH); // prettier-ignore
    const boostRatio = s.boostEnergia / s.boostMaxEnergia;
    const boostColor = s.boostEnfriamiento > 0 ? '#ff6666' : '#7ecbff';
    hud.fillStyle = boostColor;
    hud.fillRect(barX, barY, barW * boostRatio, barH);
    hud.strokeStyle = '#fff';
    hud.lineWidth = 2;
    hud.strokeRect(barX, barY, barW, barH);
    currentY += lh;
    hud.fillStyle = '#ffffff';
    hud.fillText('LASER', padX, currentY);
    const laserBarX = valueX;
    const laserBarW = 150;
    const laserBarH = 10;
    const laserBarY = currentY - laserBarH;
    hud.fillStyle = '#333';
    hud.fillRect(laserBarX, laserBarY, laserBarW, laserBarH);
    const laserRatio = s.laserEnergia / s.laserMaxEnergia;
    hud.fillStyle = '#ff4d4d';
    hud.fillRect(laserBarX, laserBarY, laserBarW * laserRatio, laserBarH);
    hud.strokeStyle = '#fff'; hud.lineWidth = 2; hud.strokeRect(laserBarX, laserBarY, laserBarW, laserBarH);
    hud.restore();
    
    // >>> CAMBIO CLAVE <<<
    // Esta lógica se mantiene, pero ahora es más genérica. No comprueba el nivel,
    // solo si existe un jefe en el estado del juego. Como solo level3.js crea un jefe,
    // esta barra solo aparecerá en el nivel 3.
    if (s.jefe) {
        if (bossHealthContainer) bossHealthContainer.style.display = 'block';
        const hpProgress = clamp(s.jefe.hp / s.jefe.maxHp, 0, 1);
        if (bossHealthBar) bossHealthBar.style.width = (hpProgress * 100) + '%';
    } else {
        if (bossHealthContainer && bossHealthContainer.style.display !== 'none') bossHealthContainer.style.display = 'none';
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
    S.detener('theme_main'); // prettier-ignore
    S.startPlaylist(); if (overlay) { overlay.style.display = 'none'; overlay.classList.remove('initial-menu'); }
    if (gameplayHints) {
        gameplayHints.style.display = 'flex';
        gameplayHints.querySelectorAll('[data-hint-type]').forEach(h => h.style.display = 'flex');
    }
    setTimeout(function () { __iniciando = false; }, 200);
}

export function perderJuego() {
    if (!estadoJuego || estadoJuego.faseJuego === 'gameover') return;
    estadoJuego.faseJuego = 'gameover'; estadoJuego.enEjecucion = false; S.detener('music'); S.reproducir('gameover'); setTimeout(() => S.reproducir('theme_main'), 1500);
    if (estadoJuego.puntuacion > puntuacionMaxima) { puntuacionMaxima = estadoJuego.puntuacion; guardarPuntuacionMaxima(); }
    if (mainMenu) mainMenu.style.display = 'block'; if (levelTransition) levelTransition.style.display = 'none'; if (brandLogo) brandLogo.style.display = 'none';
    if (welcomeMessage) welcomeMessage.style.display = 'none'; if (promptEl) promptEl.style.display = 'none';
    if (titleEl) { titleEl.style.display = 'block'; titleEl.textContent = 'Fin de la expedición'; titleEl.style.color = ''; } // prettier-ignore
    if (statScore) statScore.textContent = 'PUNTUACIÓN: ' + estadoJuego.puntuacion; if (statDepth) statDepth.textContent = 'PROFUNDIDAD: ' + estadoJuego.profundidad_m + ' m'; if (statSpecimens) statSpecimens.textContent = 'ESPECÍMENES: ' + estadoJuego.rescatados;
    if (finalStats) finalStats.style.display = 'block'; if (mainMenuContent) mainMenuContent.style.display = 'block'; if (levelSelectContent) levelSelectContent.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none'; if (restartBtn) restartBtn.style.display = 'inline-block';
    modoSuperposicion = 'gameover'; if (overlay) { overlay.style.display = 'grid'; overlay.classList.remove('initial-menu'); } if (bossHealthContainer) bossHealthContainer.style.display = 'none'; if (gameplayHints) gameplayHints.style.display = 'none';
}
function ganarJuego() {
    if (!estadoJuego || estadoJuego.faseJuego === 'gameover') return;
    nivelMaximoAlcanzado = Levels.CONFIG_NIVELES.length;
    try { localStorage.setItem(CLAVE_NIVEL_MAX, String(nivelMaximoAlcanzado)); } catch (e) { }
    estadoJuego.faseJuego = 'gameover';
    estadoJuego.enEjecucion = false;
    S.detener('music');
    S.reproducir('victory'); setTimeout(() => S.reproducir('theme_main'), 2000);
    if (estadoJuego.puntuacion > puntuacionMaxima) { puntuacionMaxima = estadoJuego.puntuacion; guardarPuntuacionMaxima(); }
    if (mainMenu) mainMenu.style.display = 'block';
    if (levelTransition) levelTransition.style.display = 'none'; if (welcomeMessage) welcomeMessage.style.display = 'none';
    if (promptEl) promptEl.style.display = 'none';
    if (brandLogo) brandLogo.style.display = 'none';
    if (titleEl) { titleEl.style.display = 'block'; titleEl.textContent = '¡VICTORIA!'; titleEl.style.color = '#ffdd77'; }
    // if (finalP) finalP.textContent = '¡Has conquistado las profundidades!'; // Elemento 'finalP' no existe
    if (statScore) statScore.textContent = 'PUNTUACIÓN: ' + estadoJuego.puntuacion;
    if (statDepth) statDepth.textContent = 'PROFUNDIDAD: ' + estadoJuego.profundidad_m + ' m';
    if (statSpecimens) statSpecimens.textContent = 'ESPECÍMENES: ' + estadoJuego.rescatados;
    if (finalStats) finalStats.style.display = 'block';
    if (mainMenuContent) mainMenuContent.style.display = 'block';
    if (levelSelectContent) levelSelectContent.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'inline-block'; // prettier-ignore
    modoSuperposicion = 'gameover';
    if (overlay) { overlay.style.display = 'grid'; overlay.classList.remove('initial-menu'); }
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
    if (gameplayHints) gameplayHints.style.display = 'none';
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
function iniciarSiguienteNivel(nivel) { if (!estadoJuego) return; estadoJuego.nivel = nivel; estadoJuego.valorObjetivoNivel = 0; animales = []; Weapons.initWeapons(); estadoJuego.proyectilesTinta = []; Levels.initLevel(nivel); if (overlay) overlay.style.display = 'none'; estadoJuego.faseJuego = 'playing'; estadoJuego.enEjecucion = true; estadoJuego.bloqueoEntrada = 0.5; if (gameplayHints) { gameplayHints.querySelectorAll('.hint[data-hint-type]').forEach(h => { h.style.display = 'flex'; }); } }
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
    if (!desdePausa) {
        animales.length = 0; // Limpiar cualquier animal de una partida anterior
        const tiposMenu = ['normal', 'normal', 'normal', sharkListo ? 'shark' : 'normal', whaleListo ? 'whale' : 'normal'];
        for (let i = 0; i < 7; i++) { // Más criaturas para un fondo más vivo
            const tipoAleatorio = tiposMenu[Math.floor(Math.random() * tiposMenu.length)];
            setTimeout(() => generarAnimal(false, tipoAleatorio), i * 1800);
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

function abrirMenuPrincipal() { if (estadoJuego && estadoJuego.enEjecucion) { estadoJuego.enEjecucion = false; mostrarVistaMenuPrincipal(true); if (gameplayHints) gameplayHints.style.display = 'none'; } }
function puedeUsarPantallaCompleta() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled); }
function alternarPantallaCompleta() { if (!puedeUsarPantallaCompleta()) { document.body.classList.toggle('immersive'); return; } const el = document.documentElement; try { if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) { if (el.requestFullscreen) return el.requestFullscreen(); if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen(); } else { if (document.exitFullscreen) return document.exitFullscreen(); if (document.webkitExitFullscreen) return document.webkitExitFullscreen(); } } catch (err) { console.warn('Pantalla completa no disponible', err); } }


function autoSize() { const topHud = document.getElementById('top-hud'); const alturaTotalHud = topHud ? topHud.offsetHeight : 70; const v = { w: innerWidth, h: innerHeight - alturaTotalHud }; [bgCanvas, cvs, fxCanvas, sonarCanvas, hudCanvas].forEach(c => { if (c) { c.width = v.w; c.height = v.h; } }); W = v.w; H = v.h; calcularCarriles(); if (!estadoJuego || !estadoJuego.enEjecucion) { renderizar(0); } }
// ========= Función de Bucle de Juego (se exporta a main.js) =========
// Este es el corazón del juego, el bucle que se ejecuta continuamente.
let ultimo = 0;
export function gameLoop(t) {
    // Calcula el delta time (dt) para un movimiento consistente independientemente de los FPS.
    const dt = Math.min(0.033, (t - ultimo) / 1000 || 0);
    ultimo = t;

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

        // Actualiza las armas siempre, para efectos de menú y de juego.
        const weaponUpdateContext = {
            dtAjustado, estadoJuego, jugador, animales, W, H, S, Levels,
            generarExplosion, generarTrozoBallena, generarGotasSangre, generarParticula, particulasBurbujas,
            puntosPorRescate
        };
        Weapons.updateWeapons(weaponUpdateContext);

        if (estadoJuego && estadoJuego.enEjecucion) {
            actualizar(dtAjustado);
        } else {
            actualizarCriaturasMenu(dtAjustado);
            actualizarAnimacionMenu(dtAjustado);
        }

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

    // --- NUEVO: Animar foto de perfil con la música ---
    const creatorPicContainer = document.querySelector('.profile-pic-container');
    if (creatorPicContainer && S.getAudioData) { // Comprobar que la función exista
        const audioLevel = S.getAudioData();
        if (typeof audioLevel === 'number') {
            // Normalizar el nivel de audio (0-255) a un factor de escala
            const scale = 1 + (audioLevel / 255) * 0.08; // Reacción sutil de hasta 8%
            const rotation = Math.sin(tiempo * 0.5) * 1.5; // Un bamboleo lento

            creatorPicContainer.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        }
    }
}

// =================================================================================
//  11. INICIALIZACIÓN GENERAL Y GESTIÓN DE EVENTOS
// =================================================================================
// La función `init` se llama una sola vez cuando la página carga.
// Configura todos los listeners de eventos (teclado, ratón, botones de la UI).

let arrastreId = -1, arrastreActivo = false, arrastreY = 0;
function estaSobreUI(x, y) { const elementos = [muteBtn, infoBtn, fsBtn, shareBtn, githubBtn, overlay, infoOverlay, levelSelectBtn, backToMainBtn]; for (const el of elementos) { if (!el) continue; const style = getComputedStyle(el); if (style.display === 'none' || style.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true; } return false; }

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

    addEventListener('keydown', function (e) { teclas[e.key] = true; if (e.code === 'Space') e.preventDefault(); if (e.key === 'Escape') { e.preventDefault(); abrirMenuPrincipal(); } });
    addEventListener('keyup', function (e) { teclas[e.key] = false; });
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
        if (tapX < W * 0.4) { arrastreId = e.pointerId; arrastreActivo = true; arrastreY = e.clientY; e.preventDefault(); }
        else if (tapX > W * 0.6) { if (!estadoJuego || !estadoJuego.enEjecucion) return; if (estadoJuego.bloqueoEntrada === 0) { teclas[' '] = true; } }
        else { lanzarTorpedo(); }
    }, { passive: false });
    window.addEventListener('pointermove', (e) => {
        if (estadoJuego && estadoJuego.nivel === 5) return;
        if (!arrastreActivo || e.pointerId !== arrastreId) return;
        arrastreY = e.clientY; e.preventDefault();
    }, { passive: false });
    window.addEventListener('pointerup', (e) => {
        if (estadoJuego && estadoJuego.nivel === 5) { return; }
        if (e.pointerId === arrastreId) { arrastreActivo = false; arrastreId = -1; } teclas[' '] = false;
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
                    if (gameplayHints) gameplayHints.style.display = 'flex';
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
        };
    }
    if (backToMainBtn) {
        backToMainBtn.onclick = () => {
            if (mainMenuContent) mainMenuContent.style.display = 'block';
            if (levelSelectContent) levelSelectContent.style.display = 'none';
        };
    }

    // --- 3. BOTONES DE LA BARRA DE HUD SUPERIOR ---
    if (muteBtn) { muteBtn.onclick = function () { S.alternarSilenciado(); actualizarIconos(); }; }
    if (infoBtn) {
        infoBtn.onclick = () => {
            estabaCorriendoAntesCreditos = !!(estadoJuego && estadoJuego.enEjecucion);
            if (estadoJuego) estadoJuego.enEjecucion = false;
            S.pausar('music');
            S.reproducir('theme_main');
            if (infoOverlay) infoOverlay.style.display = 'grid';
            if (gameplayHints) gameplayHints.style.display = 'none';
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
    if (closeInfo) {
        closeInfo.onclick = function () {
            S.detener('theme_main');
            if (infoOverlay) infoOverlay.style.display = 'none';
            if (estabaCorriendoAntesCreditos && (!overlay || overlay.style.display === 'none')) {
                if (estadoJuego) { estadoJuego.enEjecucion = true; }
                S.bucle('music');
                if (gameplayHints) gameplayHints.style.display = 'flex';
            }
            animarSubmarino = false;

            // Detener slideshow y resetear estilos
            if (a_creditos_intervalo) {
                clearInterval(a_creditos_intervalo);
                a_creditos_intervalo = null;
            }
            const creatorPicContainer = document.querySelector('.profile-pic-container');
            if (creatorPicContainer) {
                creatorPicContainer.style.transform = 'scale(1) rotate(0deg)';
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
                        if (gameplayHints) gameplayHints.style.display = 'flex';
                    }
                    S.bucle('music');
                } else {
                    iniciarJuego(1);
                }
            }
        });
    }

    // --- 5. INICIALIZACIÓN FINAL DEL JUEGO ---
    autoSize();
    S.init();
    actualizarIconos();
    reiniciar();
    mostrarVistaMenuPrincipal(false);

    // --- Carga de Recursos SVG (desde archivos) ---
    cargarImagen('js/svg/propeller.svg', function(img) {
        if (!img) return;
        propellerImg = img;
        propellerReady = true;
    });

    // Cargar assets de armas
    Weapons.loadWeaponAssets(cargarImagen, ctx);
}