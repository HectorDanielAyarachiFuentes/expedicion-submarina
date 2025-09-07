'use strict';

// Importamos la lógica de niveles
import * as Levels from './levels.js';

// ========= Funciones Auxiliares (las que son de uso general) =========
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
export function dificultadBase() {
    if (!estadoJuego) return 0;
    return estadoJuego.tiempoTranscurrido / 150;
}
function cargarImagen(url, cb) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => cb(im); im.onerror = () => cb(null); im.src = url; }

// ========= Lienzos (Canvas) - Exportamos los que se necesitan en otros módulos (ctx) =========
const bgCanvas = document.getElementById('bgCanvas'), bgCtx = bgCanvas.getContext('2d');
export const cvs = document.getElementById('gameCanvas'), ctx = cvs.getContext('2d');
const fxCanvas = document.getElementById('fxCanvas'), fx = fxCanvas.getContext('2d');
const hudCanvas = document.getElementById('hudCanvas'), hud = hudCanvas.getContext('2d');

// ========= Referencias de la Interfaz de Usuario (UI) =========
const overlay = document.getElementById('overlay');
const mainMenu = document.getElementById('mainMenu');
const levelTransition = document.getElementById('levelTransition');
const levelTitle = document.getElementById('levelTitle');
const levelDesc = document.getElementById('levelDesc');
const startBtn = document.getElementById('start');
const restartBtn = document.getElementById('restart');
const titleEl = document.getElementById('gameOverTitle');
const brandLogo = document.getElementById('brandLogo');
const finalP = document.getElementById('final');
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

// ========= Audio (S) =========
const PLAYLIST = [
    'canciones/Abismo_de_Acero.mp3',
    'canciones/Batalla_de_las_Profundidades.mp3'
];
export const S = (function () {
    let creado = false;
    const a = {};
    let _silenciado = false;
    let musicaActual = null;

    const mapaFuentes = {
        arpon: 'sonidos/arpon.wav',
        choque: 'sonidos/choque.wav',
        gameover: 'sonidos/gameover.wav',
        torpedo: 'sonidos/torpedo.wav',
        boss_hit: 'sonidos/boss_hit.mp3',
        victory: 'sonidos/victoria.mp3',
        ink: 'sonidos/ink.wav',
        shotgun: 'sonidos/shotgun.wav',
        machinegun: 'sonidos/machinegun.wav',
        reload: 'sonidos/reload.wav'
    };

    PLAYLIST.forEach((cancion, i) => { mapaFuentes[`music_${i}`] = cancion; });
    function init() { if (creado) return; creado = true; for (const k in mapaFuentes) { try { const el = new Audio(mapaFuentes[k]); el.preload = 'auto'; if (k.startsWith('music_')) { el.loop = true; el.volume = 0.35; } else { el.volume = 0.5; } a[k] = el; } catch (e) { console.warn(`No se pudo cargar el audio: ${mapaFuentes[k]}`); } } }
    function reproducir(k) { const el = a[k]; if (!el) return; try { el.currentTime = 0; el.play(); } catch (e) { } }
    function detener(k) { if (k === 'music' && musicaActual) k = musicaActual; const el = a[k]; if (!el) return; try { el.pause(); el.currentTime = 0; } catch (e) { } }
    function playRandomMusic() { if (musicaActual) { detener(musicaActual); } let nuevaCancionKey; const posiblesCanciones = Object.keys(a).filter(k => k.startsWith('music_')); if (posiblesCanciones.length === 0) return; do { const indiceAleatorio = Math.floor(Math.random() * posiblesCanciones.length); nuevaCancionKey = posiblesCanciones[indiceAleatorio]; } while (posiblesCanciones.length > 1 && nuevaCancionKey === musicaActual); musicaActual = nuevaCancionKey; const el = a[musicaActual]; if (el) { try { el.currentTime = 0; el.play(); } catch (e) { } } }
    function pausar(k) { if (k === 'music' && musicaActual) k = musicaActual; const el = a[k]; if (!el) return; try { el.pause(); } catch (e) { } }
    function bucle(k) { if (k === 'music' && musicaActual) k = musicaActual; const el = a[k]; if (!el) return; if (el.paused) try { el.play(); } catch (e) { } }
    function setSilenciado(m) { for (const k in a) { try { a[k].muted = !!m; } catch (e) { } } _silenciado = !!m; }
    function estaSilenciado() { return _silenciado; }
    function alternarSilenciado() { setSilenciado(!estaSilenciado()); }
    return { init, reproducir, detener, pausar, bucle, setSilenciado, estaSilenciado, alternarSilenciado, playRandomMusic };
})();

// ========= Puntuación y Progreso del Jugador =========
const CLAVE_PUNTUACION = 'expedicion_hiscore_v2';
const CLAVE_NIVEL_MAX = 'expedicion_maxlevel_v2';
let puntuacionMaxima = 0; try { puntuacionMaxima = parseInt(localStorage.getItem(CLAVE_PUNTUACION) || '0', 10) || 0; } catch (e) { }
let nivelMaximoAlcanzado = 1; try { nivelMaximoAlcanzado = parseInt(localStorage.getItem(CLAVE_NIVEL_MAX) || '1', 10) || 1; } catch (e) { }
function guardarPuntuacionMaxima() { try { localStorage.setItem(CLAVE_PUNTUACION, String(puntuacionMaxima)); } catch (e) { } }
function guardarNivelMaximo() { try { const proximoNivelDesbloqueado = Math.min(estadoJuego.nivel + 1, Levels.CONFIG_NIVELES.length); if (proximoNivelDesbloqueado > nivelMaximoAlcanzado) { nivelMaximoAlcanzado = proximoNivelDesbloqueado; localStorage.setItem(CLAVE_NIVEL_MAX, String(nivelMaximoAlcanzado)); } } catch (e) { } }

// ========= Recursos (Assets) =========
let robotImg = null, robotListo = false, spriteAncho = 96, spriteAlto = 64, robotEscala = 2;
cargarImagen('img/subastian.png', function (img) { if (img) { robotImg = img; robotListo = true; const altoObjetivo = 64; const ratio = img.width / img.height; spriteAlto = altoObjetivo; spriteAncho = Math.round(altoObjetivo * ratio); } });
let criaturasImg = null, criaturasListas = false, cFrameAncho = 0, cFrameAlto = 0, cFilas = 0;
cargarImagen('img/DeepseaCreatures_spritesheet.png', function (img) { if (img) { criaturasImg = img; cFrameAncho = Math.floor(img.width / 2); cFilas = Math.max(1, Math.floor(img.height / cFrameAncho)); cFrameAlto = Math.floor(img.height / cFilas); criaturasListas = true; } });
let bgImg = null, bgListo = false, bgOffset = 0, bgAncho = 0, bgAlto = 0, BG_VELOCIDAD_BASE = 35;
cargarImagen('img/bg_back.png', function (img) { if (img) { bgImg = img; bgListo = true; bgAncho = img.width; bgAlto = img.height; } });
let fgImg = null, fgListo = false, fgOffset = 0, fgAncho = 0, fgAlto = 0, FG_VELOCIDAD_BASE = 60;
cargarImagen('img/bg_front.png', function (img) { if (img) { fgImg = img; fgListo = true; fgAncho = img.width; fgAlto = img.height; } });

export let mierdeiImg = null, mierdeiListo = false;
cargarImagen('img/mierdei.png', function(img) {
    if (img) {
        mierdeiImg = img;
        mierdeiListo = true;
    } else {
        console.error("No se pudo cargar la imagen 'img/mierdei.png'. Asegúrate de que la ruta es correcta.");
    }
});

// ========= Geometría y Utilidades (Exportamos las que se necesitan fuera) =========
export let W = innerWidth, H = innerHeight;
export const NUM_CARRILES = 5;
export let carriles = [];
function calcularCarriles() { carriles.length = 0; const minY = H * 0.18, maxY = H * 0.82; for (let i = 0; i < NUM_CARRILES; i++) { const t = i / (NUM_CARRILES - 1); carriles.push(minY + t * (maxY - minY)); } }

// ========= Partículas y Efectos =========
let particulas = [], particulasExplosion = [], particulasTinta = [], particulasBurbujas = [];
export let proyectiles = [];
function generarParticula(arr, opts) { arr.push({ x: opts.x, y: opts.y, vx: opts.vx, vy: opts.vy, r: opts.r, vida: opts.vida, vidaMax: opts.vida, color: opts.color, tw: Math.random() * Math.PI * 2, baseA: opts.baseA || 1 }); }
function iniciarParticulas() {
    particulas.length = 0;
    particulasBurbujas.length = 0;
    const densidad = Math.max(40, Math.min(140, Math.floor((W * H) / 28000)));
    for (let i = 0; i < densidad; i++) generarParticula(particulas, { x: Math.random() * W, y: Math.random() * H, vx: -(8 + Math.random() * 22), vy: -(10 + Math.random() * 25), r: Math.random() * 2 + 1.2, vida: 999, color: '#cfe9ff', baseA: 0.25 + Math.random() * 0.25 });
}
function actualizarParticulas(dt) { for (let arr of [particulas, particulasExplosion, particulasTinta, particulasBurbujas]) { for (let i = arr.length - 1; i >= 0; i--) { const p = arr[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; p.tw += dt * 2.0; if (arr === particulasBurbujas) { p.vy -= 40 * dt; p.vx *= 0.98; } if (arr === particulas) { if (p.x < -8 || p.y < -8) { p.x = W + 10 + Math.random() * 20; p.y = H * Math.random(); } } else { if (p.vida <= 0) { arr.splice(i, 1); } } } } }
function dibujarParticulas() { if (!ctx) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const p of particulas) { ctx.globalAlpha = clamp(p.baseA * (0.65 + 0.35 * Math.sin(p.tw)), 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); } for (const p of particulasExplosion) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; for (const p of particulasTinta) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1) * 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); } ctx.strokeStyle = '#aae2ff'; ctx.lineWidth = 1.5; for (const p of particulasBurbujas) { ctx.globalAlpha = clamp(p.vida / p.vidaMax, 0, 1) * 0.7; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); }
function generarBurbujaPropulsion(x, y, isLevel5 = false) { if (Math.random() > 0.6) { const velocidadBaseX = isLevel5 ? 0 : 60; const velocidadBaseY = isLevel5 ? 60 : 0; const dispersion = 25; generarParticula(particulasBurbujas, { x: x, y: y, vx: velocidadBaseX + (Math.random() - 0.5) * dispersion, vy: velocidadBaseY + (Math.random() - 0.5) * dispersion - 20, r: Math.random() * 2 + 1, vida: 1 + Math.random() * 1.5, color: '' }); } }
function generarRafagaBurbujasDisparo(x, y, isLevel5 = false) { for (let i = 0; i < 8; i++) { const anguloBase = isLevel5 ? -Math.PI / 2 : 0; const dispersion = Math.PI / 4; const angulo = anguloBase + (Math.random() - 0.5) * dispersion; const velocidad = 30 + Math.random() * 40; generarParticula(particulasBurbujas, { x: x, y: y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad - 20, r: Math.random() * 2.5 + 1.5, vida: 0.8 + Math.random() * 0.5, color: '' }); } }
export function generarExplosion(x, y, color = '#ff8833') { for (let i = 0; i < 20; i++) { const ang = Math.random() * Math.PI * 2, spd = 30 + Math.random() * 100; generarParticula(particulasExplosion, { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: Math.random() * 2 + 1, vida: 0.4 + Math.random() * 0.4, color }); } }
export function generarNubeDeTinta(x, y, size) { S.reproducir('ink'); for (let i = 0; i < 50; i++) { const ang = Math.random() * Math.PI * 2, spd = 20 + Math.random() * size; generarParticula(particulasTinta, { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 15 + Math.random() * size * 0.8, vida: 2.5 + Math.random() * 2, color: '#101010' }); } }

// ========= Funciones de Recompensa (disponibles para los niveles) =========
export function limpiarTodosLosAnimales() {
    animales.forEach(a => generarExplosion(a.x, a.y, '#aaffff'));
    animales = [];
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

// ========= Lógica del Juego (Estado y Entidades - Exportamos los necesarios) =========
export let estadoJuego = null, jugador, animales;
let teclas = {};
let modoSuperposicion = 'menu'; let estabaCorriendoAntesCreditos = false;
let inclinacionRobot = 0, inclinacionRobotObjetivo = 0; const INCLINACION_MAX = Math.PI / 24;
const JUGADOR_VELOCIDAD = 350;
const ENFRIAMIENTO_TORPEDO = 1.5;
export let torpedos = [];
const WEAPON_ORDER = ['garra', 'shotgun', 'metralleta'];
const RANGOS_ASESINO = [{ bajas: 0, titulo: "NOVATO" }, { bajas: 10, titulo: "APRENDIZ" }, { bajas: 25, titulo: "MERCENARIO" }, { bajas: 50, titulo: "CAZADOR" }, { bajas: 75, titulo: "VETERANO" }, { bajas: 100, titulo: "DEPREDADOR" }, { bajas: 150, titulo: "LEYENDA ABISAL" }];

function reiniciar(nivelDeInicio = 1) {
    estadoJuego = {
        faseJuego: 'menu', enEjecucion: false, rescatados: 0, puntuacion: 0, profundidad_m: 0, vidas: 3, animVida: 0, velocidad: 260, tiempoTranscurrido: 0, bloqueoEntrada: 0.2,
        faseLuz: 'off', luzVisible: false, timerLuz: 0, cambiosLuz: 0, ultimaMusicaT: 0,
        enfriamientoTorpedo: 0,
        nivel: nivelDeInicio,
        valorObjetivoNivel: 0,
        jefe: null,
        proyectilesTinta: [],
        armaActual: 'garra',
        enfriamientoArma: 0,
        asesinatos: 0,
        teclasActivas: {},
        velocidadJuego: 1.0,
        slowMoTimer: 0,
        levelFlags: {}, // >>> CAMBIO CLAVE <<< Objeto para que los niveles comuniquen flags al motor (ej: no mover el fondo)
    };
    
    delete estadoJuego.darknessOverride; // Limpiamos la oscuridad del nivel 2, si existiera.

    jugador = { x: W * 0.18, y: H / 2, r: 26, garra: null, vy: 0 };
    
    Levels.initLevel(nivelDeInicio);
    
    animales = [];
    torpedos = [];
    proyectiles = [];
    particulasTinta = [];

    autoSize();
    iniciarParticulas();
    if (gameplayHints) gameplayHints.style.display = 'none';
    mostrarVistaMenuPrincipal(false);
}

function velocidadActual() { return Levels.getLevelSpeed(); }
function puntosPorRescate() { const p0 = clamp(estadoJuego.tiempoTranscurrido / 180, 0, 1); return Math.floor(lerp(100, 250, p0)); }

export function generarAnimal(esEsbirroJefe = false, tipoForzado = null) {
    const minY = H * 0.15;
    const maxY = H * 0.85;
    const y = minY + Math.random() * (maxY - minY);
    let velocidad = velocidadActual() + 60;

    let tipo = tipoForzado || 'normal';
    if (tipoForzado === null && mierdeiListo && Math.random() < 0.15) {
        tipo = 'mierdei';
    }

    if (tipo === 'mierdei') {
        const anchoDeseado = 350;
        let altoDeseado = anchoDeseado * (mierdeiImg.height / mierdeiImg.width);
        animales.push({
            x: W + anchoDeseado, y, vx: -velocidad * 0.7, r: anchoDeseado / 2,
            w: anchoDeseado, h: altoDeseado, capturado: false, tipo: 'mierdei',
            semillaFase: Math.random() * Math.PI * 2,
        });
    } else {
        if (esEsbirroJefe) {
            tipo = 'aggressive';
        }

        if (tipo === 'aggressive') {
            velocidad *= 1.3;
        }
        
        const tamano = 96;
        const fila = (criaturasListas && cFilas > 0) ? ((Math.random() * cFilas) | 0) : 0;
        animales.push({
            x: W + tamano, y, vx: -velocidad, r: 44, w: tamano, h: tamano,
            capturado: false, fila, frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2, tipo: tipo
        });
    }
}

function dispararGarfio() {
    if (!jugador || jugador.garra || !estadoJuego || estadoJuego.bloqueoEntrada > 0) return;
    const isLevel5 = estadoJuego.nivel === 5;
    const baseX = isLevel5 ? jugador.x : jugador.x;
    const baseY = isLevel5 ? jugador.y : jugador.y;
    const cannonX = isLevel5 ? baseX : baseX + 45;
    const cannonY = isLevel5 ? baseY - 45 : baseY;
    generarRafagaBurbujasDisparo(cannonX, cannonY, isLevel5);
    const dx = isLevel5 ? 0 : 1;
    const dy = isLevel5 ? -1 : 0;
    jugador.garra = { x: baseX, y: baseY, dx, dy, velocidad: 1400, fase: 'ida', golpeado: null, alcance: H * 0.7, recorrido: 0 };
    S.reproducir('arpon');
}

function dispararShotgun() {
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return;
    const isLevel5 = estadoJuego.nivel === 5;
    const px = isLevel5 ? jugador.x : jugador.x + 40;
    const py = isLevel5 ? jugador.y - 40 : jugador.y;
    generarRafagaBurbujasDisparo(px, py, isLevel5);
    for (let i = 0; i < 25; i++) {
        const anguloBase = isLevel5 ? -Math.PI / 2 : 0;
        const dispersion = 1.5;
        const angulo = anguloBase + (Math.random() - 0.5) * dispersion;
        const velocidad = 700 + Math.random() * 400;
        proyectiles.push({ x: px, y: py, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, w: 8, h: 3, color: '#ffb733', vida: 0.5 + Math.random() * 0.3 });
    }
    estadoJuego.enfriamientoArma = 2.5;
    S.reproducir('shotgun');
    setTimeout(() => S.reproducir('reload'), 500);
}

function dispararMetralleta() {
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return;
    const isLevel5 = estadoJuego.nivel === 5;
    const px = isLevel5 ? jugador.x : jugador.x + 40;
    const py = isLevel5 ? jugador.y - 40 : jugador.y;
    generarRafagaBurbujasDisparo(px, py, isLevel5);
    const numBalas = 30;
    for (let i = 0; i < numBalas; i++) {
        const anguloBase = isLevel5 ? -Math.PI / 2 : 0;
        const dispersion = 0.2;
        const angulo = anguloBase + (Math.random() - 0.5) * dispersion;
        const velocidad = 1600;
        const offset = (i / numBalas) * velocidad * 0.05;
        const offsetX = isLevel5 ? Math.cos(angulo + Math.PI / 2) * offset : offset;
        const offsetY = isLevel5 ? Math.sin(angulo + Math.PI / 2) * offset : 0;
        proyectiles.push({ x: px + offsetX, y: py + offsetY, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, w: 12, h: 2, color: '#ff6363', vida: 0.8 });
    }
    estadoJuego.enfriamientoArma = 3.0;
    let soundCount = 0;
    const soundInterval = setInterval(() => { S.reproducir('machinegun'); soundCount++; if (soundCount >= 5) clearInterval(soundInterval); }, 60);
    setTimeout(() => S.reproducir('reload'), 800);
}

function disparar() {
    if (!estadoJuego) return;
    switch (estadoJuego.armaActual) {
        case 'garra':
            if (!jugador.garra) dispararGarfio();
            else if (jugador.garra.fase === 'ida') {
                jugador.garra.fase = 'retorno';
                Levels.onFallo();
            }
            break;
        case 'shotgun': dispararShotgun(); break;
        case 'metralleta': dispararMetralleta(); break;
    }
}

function lanzarTorpedo() {
    if (!estadoJuego || !estadoJuego.enEjecucion || estadoJuego.enfriamientoTorpedo > 0) return;
    const isLevel5 = estadoJuego.nivel === 5;
    const px = isLevel5 ? jugador.x : jugador.x;
    const py = isLevel5 ? jugador.y : jugador.y;
    if (isLevel5) {
        torpedos.push({ x: px, y: py, w: 6, h: 20, isVertical: true });
    } else {
        torpedos.push({ x: px, y: py, w: 20, h: 6, isVertical: false });
    }
    estadoJuego.enfriamientoTorpedo = ENFRIAMIENTO_TORPEDO;
    S.reproducir('torpedo');
}

function actualizar(dt) {
    if (!estadoJuego || !estadoJuego.enEjecucion) return;

    if (estadoJuego.slowMoTimer > 0) {
        estadoJuego.slowMoTimer -= dt;
        if (estadoJuego.slowMoTimer <= 0) {
            estadoJuego.velocidadJuego = 1.0;
        }
    }
    const dtAjustado = dt * estadoJuego.velocidadJuego;

    estadoJuego.tiempoTranscurrido += dtAjustado;
    estadoJuego.bloqueoEntrada = Math.max(0, estadoJuego.bloqueoEntrada - dtAjustado);
    if (estadoJuego.enfriamientoTorpedo > 0) estadoJuego.enfriamientoTorpedo -= dtAjustado;
    if (estadoJuego.enfriamientoArma > 0) estadoJuego.enfriamientoArma -= dtAjustado;
    estadoJuego.teclasActivas = teclas;
    
    const progresoProfundidad = clamp(estadoJuego.tiempoTranscurrido / 180, 0, 1);
    estadoJuego.profundidad_m = Math.max(estadoJuego.profundidad_m, Math.floor(lerp(0, 3900, progresoProfundidad)));
    
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
    jugador.x += vx * dtAjustado;
    jugador.y += vy * dtAjustado;
    
    Levels.updateLevel(dtAjustado);
    
    jugador.x = clamp(jugador.x, jugador.r, W - jugador.r);
    jugador.y = clamp(jugador.y, jugador.r, H - jugador.r);
    if (vy < 0) inclinacionRobotObjetivo = -INCLINACION_MAX;
    else if (vy > 0) inclinacionRobotObjetivo = INCLINACION_MAX;
    else inclinacionRobotObjetivo = 0;

    const isLevel5 = estadoJuego.nivel === 5;
    if(isLevel5){
        if (teclas['ArrowLeft']) inclinacionRobotObjetivo -= INCLINACION_MAX * 1.5;
        else if (teclas['ArrowRight']) inclinacionRobotObjetivo += INCLINACION_MAX * 1.5;
    }
    inclinacionRobot += (inclinacionRobotObjetivo - inclinacionRobot) * Math.min(1, 8 * dtAjustado);

    if (teclas[' '] && estadoJuego.bloqueoEntrada === 0) { disparar(); teclas[' '] = false; }
    if ((teclas['x'] || teclas['X']) && estadoJuego.bloqueoEntrada === 0) { lanzarTorpedo(); teclas['x'] = teclas['X'] = false; }
    if (teclas['1']) { estadoJuego.armaActual = 'garra'; }
    if (teclas['2']) { estadoJuego.armaActual = 'shotgun'; }
    if (teclas['3']) { estadoJuego.armaActual = 'metralleta'; }
    if (teclas['c'] || teclas['C']) { const currentIndex = WEAPON_ORDER.indexOf(estadoJuego.armaActual); const nextIndex = (currentIndex + 1) % WEAPON_ORDER.length; estadoJuego.armaActual = WEAPON_ORDER[nextIndex]; teclas['c'] = teclas['C'] = false; }
    
    const configNivel = Levels.CONFIG_NIVELES[estadoJuego.nivel - 1];
    if (configNivel.tipo === 'capture') estadoJuego.valorObjetivoNivel = estadoJuego.rescatados;
    else if (configNivel.tipo === 'survive') estadoJuego.valorObjetivoNivel = Math.min(estadoJuego.valorObjetivoNivel + dtAjustado, configNivel.meta);
    
    for (let i = animales.length - 1; i >= 0; i--) { 
        const a = animales[i]; 
        a.x += a.vx * dtAjustado; 
        
        if (a.tipo !== 'mierdei') {
            a.timerFrame += dtAjustado; 
            if (a.timerFrame >= 0.2) { 
                a.timerFrame -= 0.2; a.frame ^= 1; 
            }
        }
        
        if (!a.capturado && Math.hypot(jugador.x - a.x, jugador.y - a.y) < jugador.r + a.r * 0.5) { 
            animales.splice(i, 1); 
            const antes = estadoJuego.vidas; 
            if (estadoJuego.vidas > 0) estadoJuego.vidas--; 
            if (estadoJuego.vidas < antes) { 
                estadoJuego.animVida = 0.6; 
                S.reproducir('choque'); 
            } 
            if (estadoJuego.vidas <= 0) perderJuego(); 
            continue; 
        } 
        
        if (a.x < -a.w) { 
            animales.splice(i, 1); 
        } 
    }
    
    if (jugador.garra) {
        const g = jugador.garra;
        const spd = g.velocidad * dtAjustado;
        if (g.fase === 'ida') {
            g.x += g.dx * spd;
            g.y += g.dy * spd;
            g.recorrido += spd;
            if (estadoJuego.nivel !== 5) {
                for (let j = 0; j < animales.length; j++) {
                    const aa = animales[j];
                    const esCapturable = (aa.tipo !== 'aggressive');
                    if (!g.golpeado && !aa.capturado && esCapturable && Math.hypot(aa.x - g.x, aa.y - g.y) < aa.r) {
                        g.golpeado = aa;
                        aa.capturado = true;
                        g.fase = 'retorno';
                        break;
                    }
                }
            }
            if (g.recorrido >= g.alcance) g.fase = 'retorno';
        } else {
            g.recorrido -= spd;
            const targetX = jugador.x;
            const targetY = jugador.y;
            g.x += (targetX - g.x) * 0.1;
            g.y += (targetY - g.y) * 0.1;
            if (g.golpeado) {
                g.golpeado.x = g.x;
                g.golpeado.y = g.y;
            }
            if (g.recorrido <= 0) {
                if (g.golpeado) {
                    estadoJuego.rescatados++;
                    const puntos = g.golpeado.tipo === 'mierdei' ? 1000 : puntosPorRescate();
                    estadoJuego.puntuacion += puntos;
                    Levels.onAnimalCazado(g.golpeado.tipo);
                    const idx = animales.indexOf(g.golpeado);
                    if (idx !== -1) animales.splice(idx, 1);
                } else {
                    Levels.onFallo();
                }
                jugador.garra = null;
            }
        }
    }
    
    // >>> CAMBIO CLAVE <<<
    // Esta función ahora SÓLO se encarga de las colisiones con animales normales.
    // La colisión con el jefe es responsabilidad del módulo level3.js.
    function chequearColisionProyectil(proyectil) {
        for (let j = animales.length - 1; j >= 0; j--) {
            const a = animales[j];
            if (!a.capturado && proyectil.x < a.x + a.w/2 && proyectil.x + (proyectil.w || 0) > a.x - a.w/2 && proyectil.y < a.y + a.h/2 && proyectil.y + (proyectil.h || 0) > a.y - a.h/2) {
                generarExplosion(a.x, a.y, proyectil.color);
                Levels.onAnimalCazado(a.tipo);
                animales.splice(j, 1);
                estadoJuego.asesinatos++;
                return true;
            }
        }
        return false;
    }

    for (let i = torpedos.length - 1; i >= 0; i--) {
        const t = torpedos[i];
        t.x += (t.isVertical ? 0 : 1200) * dtAjustado;
        t.y -= (t.isVertical ? 1200 : 0) * dtAjustado;
        if (t.y < -t.h || t.x > W + t.w) { 
            torpedos.splice(i, 1); 
            continue; 
        }
        if (chequearColisionProyectil(t)) {
            torpedos.splice(i, 1);
        }
    }

    for (let i = proyectiles.length - 1; i >= 0; i--) {
        const p = proyectiles[i];
        p.x += p.vx * dtAjustado; p.y += p.vy * dtAjustado; p.vida -= dtAjustado;
        if (p.vida <= 0 || p.x > W + 20 || p.x < -20 || p.y < -20 || p.y > H + 20) {
            proyectiles.splice(i, 1);
            continue;
        }
        if (chequearColisionProyectil(p)) {
            proyectiles.splice(i, 1);
        }
    }
    
    for (let i = estadoJuego.proyectilesTinta.length - 1; i >= 0; i--) { const ink = estadoJuego.proyectilesTinta[i]; ink.x += ink.vx * dtAjustado; if (ink.x < 0) { generarNubeDeTinta(ink.x + Math.random() * 100, ink.y, 80); estadoJuego.proyectilesTinta.splice(i, 1); } }
    estadoJuego.animVida = Math.max(0, estadoJuego.animVida - dtAjustado);
    
    actualizarParticulas(dtAjustado);
    comprobarCompletadoNivel();
}

function renderizar(dt) {
    if (estadoJuego) dibujarFondo(dt);
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (estadoJuego) {
        // La llamada a drawLevel() es la que permitirá que level3.js dibuje al jefe.
        Levels.drawLevel();

        for (let i = 0; i < animales.length; i++) {
            const a = animales[i];
            const offsetFlotante = Math.sin(Math.PI * estadoJuego.tiempoTranscurrido * 0.8 + a.semillaFase) * 8;
            ctx.save();
            
            if (a.tipo === 'mierdei') {
                const angulo = estadoJuego.tiempoTranscurrido * 0.5 + a.semillaFase;
                ctx.translate(a.x, a.y + offsetFlotante);
                ctx.rotate(angulo);
                ctx.drawImage(mierdeiImg, -a.w / 2, -a.h / 2, a.w, a.h);

            } else {
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
        
        if (jugador) {
            const isLevel5 = estadoJuego && estadoJuego.nivel === 5;
            const px = jugador.x;
            const py = jugador.y;
            ctx.save();
            ctx.translate(px, py);
            const anguloFinal = isLevel5 ? -Math.PI / 2 + inclinacionRobot : inclinacionRobot;
            ctx.rotate(anguloFinal);
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
        }
        if (jugador && jugador.garra) {
            const isLevel5 = estadoJuego.nivel === 5;
            const hx0 = jugador.x;
            const hy0 = jugador.y;
            ctx.save();
            ctx.strokeStyle = '#8ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx0, hy0);
            ctx.lineTo(jugador.garra.x, jugador.garra.y);
            ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.translate(jugador.garra.x, jugador.garra.y);
            if (isLevel5) ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = '#8ff';
            ctx.beginPath();
            ctx.moveTo(0, -6); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = '#ffcc00';
        for (const t of torpedos) { ctx.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h); }
        for (const p of proyectiles) { ctx.fillStyle = p.color; ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h); }
        ctx.fillStyle = '#101010';
        for (const ink of estadoJuego.proyectilesTinta) { ctx.beginPath(); ctx.arc(ink.x, ink.y, ink.r, 0, Math.PI * 2); ctx.fill(); }
        ctx.imageSmoothingEnabled = true;
    }
    dibujarParticulas();
    dibujarMascaraLuz();
    dibujarHUD();
}

function dibujarFondo(dt) {
    if (!estadoJuego || !bgCtx) return;
    // >>> CAMBIO CLAVE <<<
    // La decisión de si el fondo se mueve o no, ahora depende de un flag que el nivel puede activar/desactivar.
    // Por defecto, se mueve. El Nivel 3 lo pondrá en `false`.
    const scrollFondo = estadoJuego.levelFlags.scrollBackground !== false;
    
    bgCtx.clearRect(0, 0, W, H);
    if (bgListo && bgAncho > 0 && bgAlto > 0) {
        const spd = BG_VELOCIDAD_BASE * (1 + 0.6 * clamp(estadoJuego.tiempoTranscurrido / 180, 0, 2));
        if (scrollFondo) bgOffset = (bgOffset + spd * dt) % bgAncho;
        bgCtx.imageSmoothingEnabled = false;
        for (let x = -bgOffset; x < W + bgAncho; x += bgAncho) {
            for (let y = 0; y < H + bgAlto; y += bgAlto) {
                bgCtx.drawImage(bgImg, Math.round(x), Math.round(y), bgAncho, bgAlto);
            }
        }
        if (fgListo && fgAncho > 0 && fgAlto > 0) {
            const fspd = FG_VELOCIDAD_BASE * (1 + 0.6 * clamp(estadoJuego.tiempoTranscurrido / 180, 0, 2));
            if (scrollFondo) fgOffset = (fgOffset + fspd * dt) % fgAncho;
            const yBase = H - fgAlto;
            for (let xx = -fgOffset; xx < W + fgAncho; xx += fgAncho) {
                bgCtx.drawImage(fgImg, Math.round(xx), Math.round(yBase), fgAncho, fgAlto);
            }
        }
    } else {
        bgCtx.fillStyle = '#06131f';
        bgCtx.fillRect(0, 0, W, H);
    }
}

function dibujarMascaraLuz() {
    if (!estadoJuego || !fx) return;
    fx.clearRect(0, 0, W, H);
    const isLevel5 = estadoJuego.nivel === 5;

    const oscuridadBase = estadoJuego.tiempoTranscurrido / 180;
    const oscuridadObjetivo = estadoJuego.darknessOverride !== undefined 
        ? estadoJuego.darknessOverride 
        : oscuridadBase;

    const alpha = lerp(0, 0.9, clamp(oscuridadObjetivo, 0, 1));
    if (alpha <= 0.001) return;
    
    fx.globalCompositeOperation = 'source-over';
    fx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(3) + ')';
    fx.fillRect(0, 0, W, H);
    if (estadoJuego.luzVisible && jugador) {
        const px = jugador.x; const py = jugador.y; const anguloBase = isLevel5 ? -Math.PI / 2 : 0; const ang = anguloBase + inclinacionRobot; const ux = Math.cos(ang), uy = Math.sin(ang); const vx = -Math.sin(ang), vy = Math.cos(ang); const ax = Math.round(px + ux * (spriteAlto * robotEscala * 0.5 - 11)); const ay = Math.round(py + uy * (spriteAlto * robotEscala * 0.5 - 11)); const L = isLevel5 ? Math.min(H * 0.65, 560) : Math.min(W * 0.65, 560); const theta = Math.PI / 9; const endx = ax + ux * L, endy = ay + uy * L; const half = Math.tan(theta) * L; const pTopX = endx + vx * half, pTopY = endy + vy * half; const pBotX = endx - vx * half, pBotY = endy - vy * half; let g = fx.createLinearGradient(ax, ay, endx, endy); g.addColorStop(0.00, 'rgba(255,255,255,1.0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.5)'); g.addColorStop(1.00, 'rgba(255,255,255,0.0)'); fx.globalCompositeOperation = 'destination-out'; fx.fillStyle = g; fx.beginPath(); fx.moveTo(ax, ay); fx.lineTo(pTopX, pTopY); fx.lineTo(pBotX, pBotY); fx.closePath(); fx.fill(); const rg = fx.createRadialGradient(ax, ay, 0, ax, ay, 54); rg.addColorStop(0, 'rgba(255,255,255,1.0)'); rg.addColorStop(1, 'rgba(255,255,255,0.0)'); fx.fillStyle = rg; fx.beginPath(); fx.arc(ax, ay, 54, 0, Math.PI * 2); fx.fill(); fx.globalCompositeOperation = 'lighter'; const gGlow = fx.createLinearGradient(ax, ay, endx, endy); gGlow.addColorStop(0.00, 'rgba(255,255,255,0.14)'); gGlow.addColorStop(0.60, 'rgba(255,255,255,0.06)'); gGlow.addColorStop(1.00, 'rgba(255,255,255,0.00)'); fx.fillStyle = gGlow; fx.beginPath(); fx.moveTo(ax, ay); fx.lineTo(pTopX, pTopY); fx.lineTo(pBotX, pBotY); fx.closePath(); fx.fill(); fx.globalCompositeOperation = 'source-over';
    }
}

function dibujarHUD() {
    if (!estadoJuego || !hudLevelText || !hudObjectiveText) return;

    if (estadoJuego.enEjecucion) {
        hudLevelText.textContent = `NIVEL ${estadoJuego.nivel}`;
        
        const mision = Levels.getEstadoMision();
        if (mision) {
            hudObjectiveText.innerHTML = `<span class="mission-title">${mision.texto}</span>${mision.progreso}`;
        } else {
            hudObjectiveText.innerHTML = '';
            const configNivel = Levels.CONFIG_NIVELES[estadoJuego.nivel - 1];
            let textoObjetivo = '';
            if (configNivel.tipo === 'capture') { textoObjetivo = `CAPTURAS: ${estadoJuego.rescatados} / ${configNivel.meta}`; } 
            else if (configNivel.tipo === 'survive') { textoObjetivo = `SUPERVIVENCIA: ${Math.floor(configNivel.meta - estadoJuego.valorObjetivoNivel)}s`; } 
            else if (configNivel.tipo === 'boss') { textoObjetivo = `JEFE: Derrota al Kraken`; }
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
    const totalFilas = filas.length + 4;
    const y0 = H - padY - lh * totalFilas;
    let maxAnchoEtiqueta = 0;
    const todasLasEtiquetas = [...filas.map(f => f.label), 'VIDAS', 'TORPEDO', 'ARMA', 'ASESINO'];
    for (const label of todasLasEtiquetas) { maxAnchoEtiqueta = Math.max(maxAnchoEtiqueta, hud.measureText(label).width); }
    const gap = 16;
    const valueX = padX + maxAnchoEtiqueta + gap;
    let currentY = y0;
    for (let i = 0; i < filas.length; i++) { hud.fillText(filas[i].label, padX, currentY); hud.fillText(filas[i].value, valueX, currentY); currentY += lh; }
    hud.fillText('VIDAS', padX, currentY);
    hud.fillStyle = '#ff4d4d';
    hud.fillText('♥'.repeat(valorVidas) + '♡'.repeat(Math.max(0, 3 - valorVidas)), valueX, currentY);
    hud.fillStyle = '#ffffff';
    currentY += lh;
    hud.fillText('TORPEDO', padX, currentY);
    const torpedoListo = s.enfriamientoTorpedo <= 0;
    hud.fillStyle = torpedoListo ? '#66ff66' : '#ff6666';
    hud.fillText(torpedoListo ? 'LISTO' : 'RECARGANDO...', valueX, currentY);
    currentY += lh;
    hud.fillStyle = '#ffffff';
    hud.fillText('ARMA', padX, currentY);
    let armaTexto = s.armaActual.toUpperCase();
    if (s.armaActual === 'shotgun' || s.armaActual === 'metralleta') {
        if (s.enfriamientoArma > 0) { armaTexto += " (RECARGANDO)"; hud.fillStyle = '#ff6666'; } 
        else { armaTexto += " (LISTA)"; hud.fillStyle = '#ffdd77'; }
    } else { hud.fillStyle = '#aaddff'; }
    hud.fillText(armaTexto, valueX, currentY);
    currentY += lh;
    hud.fillStyle = '#ffffff';
    hud.fillText('ASESINO', padX, currentY);
    const rango = RANGOS_ASESINO.slice().reverse().find(r => s.asesinatos >= r.bajas) || RANGOS_ASESINO[0];
    hud.fillStyle = '#ff5e5e';
    hud.fillText(rango.titulo, valueX, currentY);
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

let __iniciando = false;
function iniciarJuego(nivel = 1) {
    if (__iniciando) return; __iniciando = true;
    if (estadoJuego && estadoJuego.enEjecucion) { __iniciando = false; return; }
    reiniciar(nivel);
    estadoJuego.bloqueoEntrada = 0.2;
    estadoJuego.faseJuego = 'playing';
    estadoJuego.enEjecucion = true;
    estadoJuego.luzVisible = true;
    S.init();
    S.playRandomMusic();
    if (overlay) overlay.style.display = 'none';
    if (gameplayHints) {
        gameplayHints.style.display = 'flex';
        gameplayHints.querySelectorAll('[data-hint-type]').forEach(h => h.style.display = 'flex');
    }
    setTimeout(function () { __iniciando = false; }, 200);
}

export function perderJuego() { if (!estadoJuego || estadoJuego.faseJuego === 'gameover') return; estadoJuego.faseJuego = 'gameover'; estadoJuego.enEjecucion = false; S.detener('music'); S.reproducir('gameover'); if (estadoJuego.puntuacion > puntuacionMaxima) { puntuacionMaxima = estadoJuego.puntuacion; guardarPuntuacionMaxima(); } if (mainMenu) mainMenu.style.display = 'block'; if (levelTransition) levelTransition.style.display = 'none'; if (brandLogo) brandLogo.style.display = 'none'; if (titleEl) { titleEl.style.display = 'block'; titleEl.textContent = 'Fin de la expedición'; titleEl.style.color = ''; } if (finalP) finalP.textContent = 'Gracias por ser parte.'; if (statScore) statScore.textContent = 'PUNTUACIÓN: ' + estadoJuego.puntuacion; if (statDepth) statDepth.textContent = 'PROFUNDIDAD: ' + estadoJuego.profundidad_m + ' m'; if (statSpecimens) statSpecimens.textContent = 'ESPECÍMENES: ' + estadoJuego.rescatados; if (finalStats) finalStats.style.display = 'block'; if (mainMenuContent) mainMenuContent.style.display = 'block'; if (levelSelectContent) levelSelectContent.style.display = 'none'; if (startBtn) startBtn.style.display = 'none'; if (restartBtn) restartBtn.style.display = 'inline-block'; modoSuperposicion = 'gameover'; if (overlay) overlay.style.display = 'grid'; if (bossHealthContainer) bossHealthContainer.style.display = 'none'; if (gameplayHints) gameplayHints.style.display = 'none'; }
function ganarJuego() {
    if (!estadoJuego || estadoJuego.faseJuego === 'gameover') return;
    nivelMaximoAlcanzado = Levels.CONFIG_NIVELES.length;
    try { localStorage.setItem(CLAVE_NIVEL_MAX, String(nivelMaximoAlcanzado)); } catch (e) { }
    estadoJuego.faseJuego = 'gameover';
    estadoJuego.enEjecucion = false;
    S.detener('music');
    S.reproducir('victory');
    if (estadoJuego.puntuacion > puntuacionMaxima) { puntuacionMaxima = estadoJuego.puntuacion; guardarPuntuacionMaxima(); }
    if (mainMenu) mainMenu.style.display = 'block';
    if (levelTransition) levelTransition.style.display = 'none';
    if (brandLogo) brandLogo.style.display = 'none';
    if (titleEl) { titleEl.style.display = 'block'; titleEl.textContent = '¡VICTORIA!'; titleEl.style.color = '#ffdd77'; }
    if (finalP) finalP.textContent = '¡Has conquistado las profundidades!';
    if (statScore) statScore.textContent = 'PUNTUACIÓN: ' + estadoJuego.puntuacion;
    if (statDepth) statDepth.textContent = 'PROFUNDIDAD: ' + estadoJuego.profundidad_m + ' m';
    if (statSpecimens) statSpecimens.textContent = 'ESPECÍMENES: ' + estadoJuego.rescatados;
    if (finalStats) finalStats.style.display = 'block';
    if (mainMenuContent) mainMenuContent.style.display = 'block';
    if (levelSelectContent) levelSelectContent.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'inline-block';
    modoSuperposicion = 'gameover';
    if (overlay) overlay.style.display = 'grid';
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
function activarTransicionNivel(proximoNivel) { estadoJuego.faseJuego = 'transition'; estadoJuego.enEjecucion = false; const config = Levels.CONFIG_NIVELES[proximoNivel - 1]; if (mainMenu) mainMenu.style.display = 'none'; if (levelTitle) levelTitle.textContent = config.nombre; if (levelDesc) levelDesc.textContent = config.objetivo; if (levelTransition) levelTransition.style.display = 'block'; if (overlay) overlay.style.display = 'grid'; setTimeout(() => { iniciarSiguienteNivel(proximoNivel); }, 4000); }
function iniciarSiguienteNivel(nivel) { if (!estadoJuego) return; estadoJuego.nivel = nivel; estadoJuego.valorObjetivoNivel = 0; animales = []; torpedos = []; proyectiles = []; estadoJuego.proyectilesTinta = []; Levels.initLevel(nivel); if (overlay) overlay.style.display = 'none'; estadoJuego.faseJuego = 'playing'; estadoJuego.enEjecucion = true; estadoJuego.bloqueoEntrada = 0.5; if (gameplayHints) { gameplayHints.querySelectorAll('.hint[data-hint-type]').forEach(h => { h.style.display = 'flex'; }); } }
function mostrarVistaMenuPrincipal(desdePausa) {
    if (!mainMenu) return;
    if (brandLogo) brandLogo.style.display = 'block';
    if (finalP) finalP.innerHTML = 'Captura tantos especímenes<br/>como puedas, o matalos.';
    if (titleEl) titleEl.style.display = 'none';
    if (finalStats) finalStats.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
    if (restartBtn) restartBtn.style.display = 'none';
    modoSuperposicion = desdePausa ? 'pause' : 'menu';
    if (mainMenu) mainMenu.style.display = 'block';
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


function abrirMenuPrincipal() { if (estadoJuego && estadoJuego.enEjecucion) { estadoJuego.enEjecucion = false; S.pausar('music'); mostrarVistaMenuPrincipal(true); if (gameplayHints) gameplayHints.style.display = 'none'; } }
function puedeUsarPantallaCompleta() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled); }
function alternarPantallaCompleta() { if (!puedeUsarPantallaCompleta()) { document.body.classList.toggle('immersive'); return; } const el = document.documentElement; try { if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) { if (el.requestFullscreen) return el.requestFullscreen(); if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen(); } else { if (document.exitFullscreen) return document.exitFullscreen(); if (document.webkitExitFullscreen) return document.webkitExitFullscreen(); } } catch (err) { console.warn('Pantalla completa no disponible', err); } }

function autoSize() { const topHud = document.getElementById('top-hud'); const alturaTotalHud = topHud ? topHud.offsetHeight : 70; const v = { w: innerWidth, h: innerHeight - alturaTotalHud }; [bgCanvas, cvs, fxCanvas, hudCanvas].forEach(c => { if (c) { c.width = v.w; c.height = v.h; } }); W = v.w; H = v.h; calcularCarriles(); if (!estadoJuego || !estadoJuego.enEjecucion) { renderizar(0); } }

// ========= Función de Bucle de Juego (se exporta a main.js) =========
let ultimo = 0;
export function gameLoop(t) {
    const dt = Math.min(0.033, (t - ultimo) / 1000 || 0);
    ultimo = t;
    if (estadoJuego && estadoJuego.faseJuego === 'playing') {
        actualizar(dt);
    }
    renderizar(dt);

    if (animarSubmarino) {
        renderizarSubmarinoBailarin(t);
    }

    requestAnimationFrame(gameLoop);
}

function renderizarSubmarinoBailarin(t) {
    if (!infoAnimCtx || !robotListo) return;
    const w = infoAnimCanvas.width;
    const h = infoAnimCanvas.height;
    infoAnimCtx.clearRect(0, 0, w, h);
    const tiempo = t / 1000;
    const danceX = Math.sin(tiempo * 5) * 10;
    const danceY = Math.cos(tiempo * 7) * 8 + 5;
    const danceRot = Math.sin(tiempo * 4) * (Math.PI / 16);
    for (let i = 0; i < 5; i++) {
        const r = (Math.sin(tiempo * 3 + i * 2) + 1) / 2 * 3 + 1;
        const x = (w / 2) - 30 + i * 15 + Math.sin(tiempo + i) * 5;
        const y = h - ((tiempo * 20 + i * 30) % h);
        infoAnimCtx.beginPath();
        infoAnimCtx.arc(x, y, r, 0, Math.PI * 2);
        infoAnimCtx.fillStyle = `rgba(207, 233, 255, ${r / 5})`;
        infoAnimCtx.fill();
    }
    infoAnimCtx.save();
    infoAnimCtx.translate(w / 2 + danceX, h / 2 + danceY);
    infoAnimCtx.rotate(danceRot);
    infoAnimCtx.imageSmoothingEnabled = false;
    const dw = spriteAncho * 2.5;
    const dh = spriteAlto * 2.5;
    infoAnimCtx.drawImage(robotImg, -dw / 2, -dh / 2, dw, dh);
    infoAnimCtx.restore();
}

// ========= Inicialización y Eventos =========
let arrastreId = -1, arrastreActivo = false, arrastreY = 0;
function estaSobreUI(x, y) { const elementos = [muteBtn, infoBtn, fsBtn, shareBtn, githubBtn, overlay, infoOverlay, levelSelectBtn, backToMainBtn]; for (const el of elementos) { if (!el) continue; const style = getComputedStyle(el); if (style.display === 'none' || style.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true; } return false; }

export function init() {
    // 1. EVENTOS DE TECLADO Y RATÓN (Puntero)
    addEventListener('keydown', function (e) { teclas[e.key] = true; if (e.code === 'Space') e.preventDefault(); if (e.key === 'Escape') { e.preventDefault(); abrirMenuPrincipal(); } });
    addEventListener('keyup', function (e) { teclas[e.key] = false; });
    window.addEventListener('pointerdown', (e) => {
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

    // 2. BOTONES DEL MENÚ PRINCIPAL
    if (startBtn) {
        startBtn.onclick = function (e) {
            e.stopPropagation();
            if (modoSuperposicion === 'pause') {
                if (overlay) overlay.style.display = 'none';
                if (estadoJuego) {
                    estadoJuego.enEjecucion = true;
                    estadoJuego.bloqueoEntrada = 0.15;
                    if (gameplayHints) gameplayHints.style.display = 'flex';
                }
                S.bucle('music');
            } else {
                iniciarJuego(1);
            }
        };
    }
    if (restartBtn) {
        restartBtn.onclick = () => iniciarJuego(1);
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

    // 3. BOTONES DE LA BARRA DE HUD SUPERIOR
    if (muteBtn) { muteBtn.onclick = function () { S.alternarSilenciado(); actualizarIconos(); }; }
    if (infoBtn) {
        infoBtn.onclick = () => {
            estabaCorriendoAntesCreditos = !!(estadoJuego && estadoJuego.enEjecucion);
            if (estadoJuego) estadoJuego.enEjecucion = false;
            S.pausar('music');
            if (infoOverlay) infoOverlay.style.display = 'grid';
            if (gameplayHints) gameplayHints.style.display = 'none';
            animarSubmarino = true;
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
    
    // 4. OTROS EVENTOS DE UI
    if (logoHUD) { logoHUD.addEventListener('click', abrirMenuPrincipal); }
    if (closeInfo) {
        closeInfo.onclick = function () {
            if (infoOverlay) infoOverlay.style.display = 'none';
            if (estabaCorriendoAntesCreditos && (!overlay || overlay.style.display === 'none')) {
                if (estadoJuego) { estadoJuego.enEjecucion = true; }
                S.bucle('music');
                if (gameplayHints) gameplayHints.style.display = 'flex';
            }
            animarSubmarino = false;
        };
    }
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay && overlay.style.display !== 'none' && (!restartBtn || restartBtn.style.display === 'none') && estadoJuego && estadoJuego.faseJuego !== 'transition' && levelSelectContent.style.display === 'none') {
                if (modoSuperposicion === 'pause') {
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

    // 5. INICIALIZACIÓN FINAL DEL JUEGO
    autoSize();
    S.init();
    actualizarIconos();
    reiniciar();
}