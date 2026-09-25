'use strict';

// =================================================================================
//  SISTEMA DE PARTÍCULAS Y EFECTOS VISUALES (MÓDULO DESACOPLADO)
// =================================================================================

import { ObjectPool, fastRemove } from './optimization.js';
import { clamp } from './utils.js';
import { S } from './audio.js';

// Pool de partículas reutilizables
export const particlePool = new ObjectPool(() => ({
    x: 0, y: 0, vx: 0, vy: 0, r: 0, vida: 0, vidaMax: 0,
    color: '', active: false, tw: 0, baseA: 1
}), 200);

// Arrays de entidades de partículas
export const particulas = [];
export const particulasExplosion = [];
export const particulasTinta = [];
export const particulasBurbujas = [];
export const particulasCasquillos = [];
export const whaleDebris = [];
export const particulasPolvoMarino = [];
export const pilotos = [];
export const proyectilesEnemigos = [];
export const trozosHumanos = [];
export const escombrosSubmarino = [];

// Geometrías y trazados vectoriales para escombros
export const SUBMARINE_DEBRIS_PATHS = [
    { 
        path: new Path2D('M-22,-18 L22,-20 L27,15 L15,8 L5,22 L-10,14 -22,12 Z'), 
        detail: new Path2D('M-12,-8 A 2 2 0 1 1 -8,-8 M8,-10 A 2 2 0 1 1 12,-10'),
        isGlass: false 
    },
    { 
        path: new Path2D('M-18,-12 L15,-15 L20,0 L18,12 L-5,18 L-18,6 Z'), 
        detail: new Path2D('M-8,-2 L8,-2 M-8,2 L8,2'),
        isGlass: false 
    },
    { 
        path: new Path2D('M-12,-12 L-5,-16 L5,-16 L12,-12 L16,-5 L16,5 L12,12 L5,16 L-5,16 L-12,12 L-16,5 L-16,-5 Z'), 
        detail: new Path2D('M0,-6 A 6 6 0 1 0 0,6 A 6 6 0 1 0 0,-6 M0,-2 A 2 2 0 1 1 0,2 A 2 2 0 1 1 0,-2'),
        isGlass: false, 
        isEngine: true 
    },
    { 
        path: new Path2D('M-25,-5 L25,-5 L22,5 L-20,5 Z'), 
        cables: true, 
        isGlass: false 
    },
    { 
        path: new Path2D('M-15,-6 L12,-6 L12,15 L0,15 L0,6 L-15,6 Z'), 
        detail: new Path2D('M-8,-6 L-8,6 M5,-6 L5,6'),
        isGlass: false 
    },
    { 
        path: new Path2D('M-20,-15 L0,-20 L15,-5 L10,15 L-15,10 Z'), 
        isGlass: true 
    },
    { 
        path: new Path2D('M-8,-12 L10,-15 L15,0 L5,10 L-8,0 Z'), 
        isGlass: true 
    },
    { path: new Path2D('M-6,-3 L6,-3 L6,3 L-6,3 Z'), isGlass: false },
    { path: new Path2D('M-8,-8 L6,4 M6,-8 L-6,4'), isGlass: false, cables: true },
    { path: new Path2D('M-5,-4 L5,0 L-5,6 Z'), isGlass: false }
];

export const PILOT_DEBRIS_PATHS = [
    new Path2D('M-10,-15 C-5,-22 5,-22 10,-15 L12,8 L-12,8 Z'),
    new Path2D('M-8,-12 L8,-14 L10,10 C 5,15 -5,15 -10,10 Z'),
    new Path2D('M-4,-20 L4,-18 L2,5 C -2,8 -5,2 -4,-20 Z'),
    new Path2D('M-15,-4 L15,-3 L12,4 L-12,5 Z'),
    new Path2D('M-10,-10 a 10 10 0 1 1 20 0 C 15,15 -15,15 -10,-10 Z'),
    new Path2D('M-15,-10 L5, -12 L18, 5 C 10,15 -10,12 -15,-10 Z'),
    new Path2D('M0,0 C-20,-10 -15,10 0,15 C15,10 20,-10 0,0 Z'),
    new Path2D('M-10,-8 L10,-12 L15,10 L-12,15 Z')
];

export const WHALE_DEBRIS_PATHS = [
    new Path2D('M0,0 C10,-15 30,-15 40,0 C35,18 15,20 0,0 Z'),
    new Path2D('M0,0 L25,-10 L45,5 L20,25 Z'),
    new Path2D('M0,0 Q20,-20 35,-5 Q45,10 25,25 Q5,30 0,15 Z'),
    new Path2D('M0,-5 L15,-15 L30,-10 L40,5 L25,15 L10,20 Z')
];

// Callbacks para desacoplar el bucle principal
let onHudShake = null;
export function setOnHudShake(callback) {
    onHudShake = callback;
}

let getJugadorContext = () => null;
let getEstadoJuegoContext = () => null;
let getScreenBounds = () => ({ W: window.innerWidth, H: window.innerHeight });

export function setContextGetters(jugadorGetter, estadoJuegoGetter, boundsGetter) {
    if (jugadorGetter) getJugadorContext = jugadorGetter;
    if (estadoJuegoGetter) getEstadoJuegoContext = estadoJuegoGetter;
    if (boundsGetter) getScreenBounds = boundsGetter;
}

/**
 * Genera una partícula individual reciclándola del pool.
 */
export function generarParticula(arr, opts) {
    const p = particlePool.get();
    p.x = opts.x;
    p.y = opts.y;
    p.vx = opts.vx;
    p.vy = opts.vy;
    p.r = opts.r;
    p.vida = opts.vida;
    p.vidaMax = opts.vida;
    p.color = opts.color;
    p.tw = Math.random() * Math.PI * 2;
    p.baseA = opts.baseA || 1;
    p.active = true;

    if (opts.esChorroDañino) p.esChorroDañino = true;
    else p.esChorroDañino = undefined;

    arr.push(p);
}

/**
 * Actualiza la física y ciclo de vida de los casquillos expulsados por armas balísticas.
 */
export function actualizarCasquillos(dt) {
    for (let i = particulasCasquillos.length - 1; i >= 0; i--) {
        const c = particulasCasquillos[i];
        c.vida -= dt;
        if (c.vida <= 0) {
            fastRemove(particulasCasquillos, i);
            continue;
        }

        c.vy += c.gravedad * dt;
        c.vx *= 0.98;
        c.vy *= 0.98;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rotacion += c.vRot * dt;

        c.smokeTimer -= dt;
        if (c.smokeTimer <= 0) {
            c.smokeTimer = 0.05 + Math.random() * 0.05;
            const alpha = (c.vida / c.vidaMax) * 0.4;
            if (alpha > 0) {
                generarParticula(particulasTinta, {
                    x: c.x, y: c.y,
                    vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 15,
                    r: 2 + Math.random() * 4, vida: 0.8 + Math.random() * 0.5,
                    color: `rgba(200, 200, 200, ${alpha})`
                });
            }
        }

        c.dropletTimer -= dt;
        if (c.dropletTimer <= 0) {
            c.dropletTimer = 0.1 + Math.random() * 0.1;
            const alpha = (c.vida / c.vidaMax) * 0.7;
            if (alpha > 0) {
                generarParticula(particulasExplosion, {
                    x: c.x, y: c.y, vx: c.vx * 0.1, vy: c.vy * 0.1 + 30,
                    r: 1 + Math.random() * 1.5, vida: 0.5 + Math.random() * 0.3,
                    color: `rgba(20, 15, 10, ${alpha})`
                });
            }
        }
    }
}

export function generarBurbujaPropulsion(x, y, isLevel5 = false) {
    if (Math.random() > 0.6) {
        const velocidadBaseX = isLevel5 ? 0 : 60;
        const velocidadBaseY = isLevel5 ? 60 : 0;
        const dispersion = 25;
        generarParticula(particulasBurbujas, {
            x: x, y: y,
            vx: velocidadBaseX + (Math.random() - 0.5) * dispersion,
            vy: velocidadBaseY + (Math.random() - 0.5) * dispersion - 20,
            r: Math.random() * 2 + 1,
            vida: 1 + Math.random() * 1.5,
            color: ''
        });
    }
}

export function generarRafagaBurbujasDisparo(x, y, isLevel5 = false) {
    for (let i = 0; i < 8; i++) {
        const anguloBase = isLevel5 ? -Math.PI / 2 : 0;
        const dispersion = Math.PI / 4;
        const angulo = anguloBase + (Math.random() - 0.5) * dispersion;
        const velocidad = 30 + Math.random() * 40;
        generarParticula(particulasBurbujas, {
            x: x, y: y,
            vx: Math.cos(angulo) * velocidad,
            vy: Math.sin(angulo) * velocidad - 20,
            r: Math.random() * 2.5 + 1.5,
            vida: 0.8 + Math.random() * 0.5,
            color: ''
        });
    }
}

export function generarChorroDeAgua(x, y, dirY) {
    const numParticulas = 40;
    for (let i = 0; i < numParticulas; i++) {
        generarParticula(particulasBurbujas, {
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            vx: (Math.random() - 0.5) * 80,
            vy: dirY * (150 + Math.random() * 250),
            r: Math.random() * 3 + 1,
            vida: 0.8 + Math.random() * 1.2,
            color: '#aaddff'
        });
    }
}

export function generarExplosion(x, y, color = '#ff8833', size = 80) {
    const numParticulas = clamp(Math.floor(size / 4), 15, 60);
    for (let i = 0; i < numParticulas; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * (size * 1.5);
        generarParticula(particulasExplosion, {
            x, y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: Math.random() * (size / 30) + 1,
            vida: 0.4 + Math.random() * 0.4,
            color
        });
    }

    const jugador = getJugadorContext();
    const estadoJuego = getEstadoJuegoContext();
    const bounds = getScreenBounds();

    if (jugador && estadoJuego && estadoJuego.enEjecucion && typeof onHudShake === 'function') {
        const dist = Math.hypot(x - jugador.x, y - jugador.y);
        const maxDist = (bounds.W || 800) * 0.8;
        if (dist < maxDist) {
            const proximityFactor = 1 - (dist / maxDist);
            const sizeFactor = Math.min(size / 200, 1.0);
            const intensity = (10 + 50 * sizeFactor) * proximityFactor;
            onHudShake(intensity);
        }
    }
}

export function generarNubeDeTinta(x, y, size) {
    S.reproducir('ink');
    for (let i = 0; i < 50; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * size;
        generarParticula(particulasTinta, {
            x, y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 15 + Math.random() * size * 0.8,
            vida: 2.5 + Math.random() * 2,
            color: '#101010'
        });
    }
}

export function generarTrozoBallena(x, y, numTrozos = 1, fuerza = 150, size = 0) {
    const estadoJuego = getEstadoJuegoContext();
    if (estadoJuego && estadoJuego.chunkGenerationCooldown > 0) return;
    if (estadoJuego) estadoJuego.chunkGenerationCooldown = 0.1;

    for (let i = 0; i < numTrozos; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 50 + Math.random() * fuerza;
        const vida = 1.5 + Math.random() * 1.5;
        const coloresCarne = ['#ab4e52', '#8e3a46', '#6d2e37'];
        whaleDebris.push({
            x: x, y: y,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            vRot: (Math.random() - 0.5) * 5, rotacion: Math.random() * Math.PI * 2,
            vida: vida, vidaMax: vida,
            color: coloresCarne[Math.floor(Math.random() * coloresCarne.length)],
            path: WHALE_DEBRIS_PATHS[Math.floor(Math.random() * WHALE_DEBRIS_PATHS.length)],
            trailCooldown: Math.random() * 0.1
        });
    }
}

export function generarGotasSangre(x, y, cantidad = 0) {
    const estadoJuego = getEstadoJuegoContext();
    if (estadoJuego && estadoJuego.bloodGenerationCooldown > 0) return;
    if (estadoJuego) estadoJuego.bloodGenerationCooldown = 0.05;

    const numGotas = cantidad > 0 ? cantidad : 10 + Math.random() * 10;
    for (let i = 0; i < numGotas; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 100;
        const r = 1.5 + Math.random() * 2.5;
        generarParticula(particulasExplosion, {
            x, y,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            r: r,
            vida: 0.8 + Math.random() * 0.6,
            color: '#b22222'
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
            vy: Math.sin(ang) * spd - 30,
            r: r,
            vida: 1.0 + Math.random() * 1.0,
            color: '#b22222'
        });
    }
}

export function generarTrozosHumanos(x, y) {
    S.reproducir('choque');
    for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 120 + Math.random() * 280;
        const vida = 1.8 + Math.random() * 2.5;
        const escala = 0.5 + Math.random() * 0.6;
        const coloresSangre = ['#b22222', '#8b0000', '#6d2e37', '#5c1f27'];
        trozosHumanos.push({
            x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            vRot: (Math.random() - 0.5) * 12,
            rotacion: Math.random() * Math.PI * 2,
            vida: vida, vidaMax: vida,
            color: coloresSangre[Math.floor(Math.random() * coloresSangre.length)],
            path: PILOT_DEBRIS_PATHS[Math.floor(Math.random() * PILOT_DEBRIS_PATHS.length)],
            escala: escala
        });
    }
    generarGotasSangre(x, y, 40);
    generarBurbujasDeSangre(x, y);
}

export function generarEscombrosSubmarino(x, y) {
    const numTrozos = 45;
    for (let i = 0; i < numTrozos; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 100 + Math.random() * 450;
        const vida = 3.5 + Math.random() * 3.0;
        const escala = 0.4 + Math.random() * 0.9;
        const coloresAcero = ['#6a737d', '#444c56', '#2f363d', '#ffc733', '#d69d00'];
        const objPath = SUBMARINE_DEBRIS_PATHS[Math.floor(Math.random() * SUBMARINE_DEBRIS_PATHS.length)];

        escombrosSubmarino.push({
            x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            vRot: (Math.random() - 0.5) * 15,
            rotacion: Math.random() * Math.PI * 2,
            vida: vida, vidaMax: vida,
            color: objPath.isGlass ? 'rgba(150, 220, 255, 0.4)' : coloresAcero[Math.floor(Math.random() * coloresAcero.length)],
            pathInfo: objPath,
            escala: escala,
            tieneSangre: Math.random() < 0.35
        });
    }

    for (let i = 0; i < 80; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 50 + Math.random() * 300;
        generarParticula(particulasExplosion, { 
            x, y, 
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, 
            r: 2 + Math.random() * 4.5, vida: 1.0 + Math.random() * 1.5, 
            color: ['#ffc733', '#ff4500', '#fff', '#222'][Math.floor(Math.random() * 4)] 
        });
    }
}

export function generarBurbujasEmbestidaTiburom(x, y) {
    for (let i = 0; i < 2; i++) {
        if (Math.random() > 0.4) {
            const offsetX = (Math.random() - 0.5) * 50;
            const offsetY = (Math.random() - 0.5) * 50;
            generarParticula(particulasBurbujas, {
                x: x + offsetX,
                y: y + offsetY,
                vx: (Math.random() - 0.5) * 40 - 60,
                vy: (Math.random() - 0.5) * 40,
                r: Math.random() * 3.5 + 2,
                vida: 0.7 + Math.random() * 0.7,
                color: ''
            });
        }
    }
}

export function generarHumoDaño(x, y, isLevel5 = false) {
    if (Math.random() > 0.6) return;

    const anguloBase = isLevel5 ? Math.PI / 2 : Math.PI;
    const angulo = anguloBase + (Math.random() - 0.5) * 0.9;
    const velocidad = 25 + Math.random() * 30;

    generarParticula(particulasTinta, {
        x: x,
        y: y,
        vx: Math.cos(angulo) * velocidad,
        vy: Math.sin(angulo) * velocidad - 25,
        r: 4 + Math.random() * 6,
        vida: 2.0 + Math.random() * 2.0,
        color: `rgba(25, 25, 25, ${0.4 + Math.random() * 0.3})`
    });
}
