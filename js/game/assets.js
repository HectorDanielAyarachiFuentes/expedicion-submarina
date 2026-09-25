'use strict';

// =================================================================================
//  CARGA DE RECURSOS DEL JUEGO (ASSETS) (MÓDULO DESACOPLADO)
// =================================================================================

import { cargarImagen, cargarJson } from './utils.js';

// --- Sprites Principales ---
export let robotImg = null;
export let robotListo = false;
export const spriteAncho = 506;
export const spriteAlto = 527;
export const robotEscala = 0.35;
export let HECTOR_SPRITE_DATA = null;
export let HECTOR_FRAME_KEYS = [];

let robotImgCargada = false;
let robotJsonCargado = false;

function comprobarRobotListo() {
    if (robotImgCargada && robotJsonCargado) {
        HECTOR_FRAME_KEYS = Object.keys(HECTOR_SPRITE_DATA.frames).sort((a, b) => {
            const numA = parseInt(a.replace('sprite_', ''), 10);
            const numB = parseInt(b.replace('sprite_', ''), 10);
            return numA - numB;
        });
        robotListo = true;
    }
}

cargarImagen('img/sprites/Hector.png', function (img) {
    if (img) {
        robotImg = img;
        robotImgCargada = true;
        comprobarRobotListo();
    } else {
        console.error("No se pudo cargar la imagen 'img/sprites/Hector.png'.");
    }
});

cargarJson('js/json_sprites/Hector.json', function (data) {
    if (data) {
        HECTOR_SPRITE_DATA = data;
        robotJsonCargado = true;
        comprobarRobotListo();
    }
});

/**
 * Función auxiliar para dibujar el submarino Hector con su animación.
 * @param {CanvasRenderingContext2D} targetCtx - Contexto de destino
 * @param {number} x - Posición X
 * @param {number} y - Posición Y
 * @param {number} escala - Escala del dibujo
 * @param {number} frame - Frame actual
 * @param {boolean} smoothing - Si se debe activar suavizado
 */
export function dibujarHector(targetCtx, x, y, escala, frame, smoothing = true) {
    if (!robotListo || !HECTOR_SPRITE_DATA || HECTOR_FRAME_KEYS.length === 0) {
        targetCtx.fillStyle = '#7ef';
        targetCtx.beginPath();
        targetCtx.arc(x, y, 26 * escala, 0, Math.PI * 2);
        targetCtx.fill();
        return;
    }

    targetCtx.imageSmoothingEnabled = smoothing;
    const frameKey = HECTOR_FRAME_KEYS[frame % HECTOR_FRAME_KEYS.length];
    const frameData = HECTOR_SPRITE_DATA.frames[frameKey];

    if (frameData) {
        const f = frameData.frame;
        const dw = f.w * escala, dh = f.h * escala;
        targetCtx.drawImage(robotImg, f.x, f.y, f.w, f.h, Math.round(x - dw / 2), Math.round(y - dh / 2), dw, dh);
    }
}

// --- Criaturas básicas ---
export let criaturasImg = null;
export let criaturasListas = false;
export let cFrameAncho = 0;
export let cFrameAlto = 0;
export let cFilas = 0;

cargarImagen('img/sprites/criaturas.png', function (img) {
    if (img) {
        criaturasImg = img;
        cFrameAncho = Math.floor(img.width / 2);
        cFilas = Math.max(1, Math.floor(img.height / cFrameAncho));
        cFrameAlto = Math.floor(img.height / cFilas);
        criaturasListas = true;
    }
});

// --- Fondos Temáticos ---
export const FONDOS_TEMAS = {
    'default': { back: null, front: null },
    'abyssal': { back: null, front: null },
    'kelp': { back: null, front: null },
    'volcanic': { back: null, front: null }
};

export let bgImg = null, bgListo = false, bgAncho = 0, bgAlto = 0, bgOffset = 0;
export let fgImg = null, fgListo = false, fgAncho = 0, fgAlto = 0, fgOffset = 0;

export function setBgImg(img) { bgImg = img; }
export function setFgImg(img) { fgImg = img; }
export function setBgListo(v) { bgListo = v; }
export function setFgListo(v) { fgListo = v; }
export function setBgAncho(w) { bgAncho = w; }
export function setBgAlto(h) { bgAlto = h; }
export function setFgAncho(w) { fgAncho = w; }
export function setFgAlto(h) { fgAlto = h; }
export function setBgOffset(v) { bgOffset = v; }
export function setFgOffset(v) { fgOffset = v; }

export let bgOffsetY = 0;
export let fgOffsetY = 0;
export function setBgOffsetY(v) { bgOffsetY = v; }
export function setFgOffsetY(v) { fgOffsetY = v; }

export const BG_DRIFT_SPEED = 8;
export const FG_DRIFT_SPEED = 25;

let onDefaultFondoCargado = null;
export function setOnDefaultFondoCargado(cb) {
    onDefaultFondoCargado = cb;
}

export function cargarTema(tema, bPath, fPath) {
    cargarImagen(bPath, function (img) {
        if (img) {
            FONDOS_TEMAS[tema].back = img;
            if (tema === 'default') {
                bgImg = img; bgListo = true; bgAncho = img.width; bgAlto = img.height;
                if (typeof onDefaultFondoCargado === 'function') onDefaultFondoCargado();
            }
        }
    });
    cargarImagen(fPath, function (img) {
        if (img) {
            FONDOS_TEMAS[tema].front = img;
            if (tema === 'default') {
                fgImg = img; fgListo = true; fgAncho = img.width; fgAlto = img.height;
            }
        }
    });
}

// Cargar todos los temas de fondo al inicio
cargarTema('default', 'img/Fondos/bg_back.png', 'img/Fondos/bg_front.png');
cargarTema('abyssal', 'img/Fondos/bg_abyssal_back.png', 'img/Fondos/bg_abyssal_front.png');
cargarTema('kelp', 'img/Fondos/bg_kelp_back.png', 'img/Fondos/bg_kelp_front.png');
cargarTema('volcanic', 'img/Fondos/bg_volcanic_back.png', 'img/Fondos/bg_volcanic_front.png');

// --- Spritesheets Animados (con JSON) ---

// 1. Mierdei
export let MIERDEI_SPRITE_DATA = null;
export let mierdeiImg = null, mierdeiListo = false;
let mierdeiImgCargada = false, mierdeiJsonCargado = false;
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
        console.error("No se pudo cargar la imagen 'img/sprites/mierdei.png'.");
    }
});
cargarJson('js/json_sprites/mierdei.json', function (data) {
    if (data) {
        MIERDEI_SPRITE_DATA = data;
        mierdeiJsonCargado = true;
        comprobarMierdeiListo();
    }
});

// 2. Tiburón
export let SHARK_SPRITE_DATA = null;
export let sharkImg = null, sharkListo = false;
let sharkImgCargada = false, sharkJsonCargado = false;
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

// 3. Ballena
export let WHALE_SPRITE_DATA = null;
export let whaleImg = null, whaleListo = false;
let whaleImgCargada = false, whaleJsonCargado = false;
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

// 4. Cría de Ballena (Baby Whale)
export let BABYWHALE_SPRITE_DATA = null;
export let babyWhaleImg = null, babyWhaleListo = false;
let babyWhaleImgCargada = false, babyWhaleJsonCargado = false;
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

// 5. Orca
export let ORCA_SPRITE_DATA = null;
export let orcaImg = null, orcaListo = false;
let orcaImgCargada = false, orcaJsonCargado = false;
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

// --- Elementos Auxiliares (Propulsor y Patrón) ---
export let thrusterPattern = null;
export let thrusterPatternReady = false;
export let thrusterPatternOffsetX = 0;

export let propellerImg = null;
export let propellerReady = false;
export let propellerRotation = 0;
export let propellerCurrentSpeed = 0;
