'use strict';

// =================================================================================
//  SISTEMA DE GENERACIÓN Y SPAWN DE CRIATURAS MARINAS (MÓDULO DESACOPLADO)
// =================================================================================

import {
    whaleListo,
    orcaListo,
    sharkListo,
    criaturasListas,
    cFilas,
    mierdeiListo,
    mierdeiImg,
    babyWhaleListo
} from './assets.js';

let getContext = () => ({
    W: window.innerWidth,
    H: window.innerHeight,
    estadoJuego: null,
    animales: [],
    velocidadActual: () => 120
});

export function setSpawnerContextGetter(fn) {
    if (typeof fn === 'function') getContext = fn;
}

/**
 * Genera una criatura o manada de criaturas en el mundo submarino.
 * @param {boolean} [esEsbirroJefe=false]
 * @param {string|null} [tipoForzado=null]
 * @param {object} [overrides={}]
 * @param {number} [direccion=-1]
 */
export function generarAnimal(esEsbirroJefe = false, tipoForzado = null, overrides = {}, direccion = -1) {
    const { W, H, estadoJuego, animales, velocidadActual } = getContext();
    if (!estadoJuego || !Array.isArray(animales)) return;

    const minY = H * 0.15;
    const usaCamera = estadoJuego.levelFlags && estadoJuego.levelFlags.scrollBackground !== false;
    const maxY = H * 0.85;
    const y = overrides.y !== undefined ? overrides.y : (minY + Math.random() * (maxY - minY));
    let velocidad = overrides.velocidad || ((typeof velocidadActual === 'function' ? velocidadActual() : 120) + 60);

    let tipo = tipoForzado || 'normal';

    const puedeSerEspecial = !tipoForzado || tipoForzado === 'normal' || tipoForzado === 'aggressive' || tipoForzado === 'rojo';

    if (puedeSerEspecial) {
        const r = Math.random();
        if (whaleListo && r < 0.10) {
            tipo = 'whale';
        } else if (orcaListo && r > 0.80 && r < 0.90) {
            tipo = 'orca';
        } else if (r > 0.70 && r < 0.80) {
            tipo = 'disparador';
        } else if (sharkListo && r > 0.90) {
            tipo = 'shark';
        }
    }

    const spawnX = direccion > 0
        ? (usaCamera ? estadoJuego.cameraX - (overrides.ancho || 100) : -(overrides.ancho || 100))
        : (usaCamera ? estadoJuego.cameraX + W + (overrides.ancho || 100) : W + (overrides.ancho || 100));

    if (tipo === 'disparador') {
        if (!criaturasListas) return;
        const tamano = 96;
        velocidad *= 0.4;
        animales.push({
            x: spawnX, y, vx: velocidad * direccion, r: 44, w: tamano, h: tamano,
            capturado: false,
            fila: 3,
            frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2,
            tipo: 'disparador',
            hp: 15, maxHp: 15,
            shootCooldown: 1.5 + Math.random() * 2
        });
    } else if (tipo === 'mierdei') {
        if (!mierdeiListo) return;
        const anchoDeseado = overrides.ancho || 100;
        let altoDeseado = anchoDeseado;
        if (mierdeiImg && mierdeiImg.width > 0) {
            altoDeseado = anchoDeseado * (mierdeiImg.height / mierdeiImg.width);
        }
        animales.push({
            x: spawnX, y, vx: velocidad * 0.7 * direccion, r: anchoDeseado / 2,
            w: anchoDeseado, h: altoDeseado, capturado: false, tipo: 'mierdei',
            semillaFase: Math.random() * Math.PI * 2,
            frame: 0,
            timerFrame: 0
        });
    } else if (tipo === 'shark') {
        const tamano = overrides.ancho || 128;
        velocidad *= 0.9;
        animales.push({
            x: spawnX, y, vx: velocidad * direccion, vy: 0, r: 50, w: tamano, h: tamano,
            capturado: false, frame: 0, timerFrame: 0, hp: 60, maxHp: 60,
            semillaFase: Math.random() * Math.PI * 2,
            tipo: 'shark',
            huntCooldown: 2.0 + Math.random(),
            isHunting: false,
            isPackLeader: false
        });
    } else if (tipo === 'orca') {
        if (!orcaListo) return;

        const packSize = 2 + Math.floor(Math.random() * 2);
        const packId = `orca_pack_${Date.now()}_${Math.random()}`;

        for (let i = 0; i < packSize; i++) {
            const isLeader = (i === 0);
            const tamano = isLeader ? 190 : 170;
            const orcaY = y + (i * 80) - ((packSize - 1) * 40);
            const orcaX = spawnX + i * 100 * -direccion;
            const velocidadOrca = ((typeof velocidadActual === 'function' ? velocidadActual() : 120) + 80) * (isLeader ? 1.1 : 1.0);

            animales.push({
                x: orcaX, y: orcaY, vx: velocidadOrca * direccion, vy: 0, r: 60, w: tamano, h: tamano,
                capturado: false, frame: 0, timerFrame: 0,
                semillaFase: Math.random() * Math.PI * 2,
                tipo: 'orca',
                hp: isLeader ? 120 : 80, maxHp: isLeader ? 120 : 80,
                huntCooldown: 2.0 + Math.random() * 2,
                isHunting: false,
                isHuntingAnimal: false,
                targetAnimal: null,
                packId: packId,
                isPackLeader: isLeader,
                attackTimer: 0
            });
        }
    } else if (tipo === 'whale') {
        const tamano = overrides.ancho || 250;
        velocidad *= 0.5;
        const patrolWidth = W * (0.8 + Math.random() * 0.4);
        const patrolMaxX = spawnX;
        const patrolMinX = spawnX - patrolWidth;

        const adultWhale = {
            x: spawnX, y, vx: velocidad * direccion, vy: 0, r: 100, w: tamano, h: tamano,
            capturado: false, frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2,
            tipo: 'whale',
            hp: 130, maxHp: 130,
            isEnraged: false,
            spoutCooldown: 3.0 + Math.random() * 3,
            tailSwipeCooldown: 5.0 + Math.random() * 4,
            isTailSwiping: false,
            tailSwipeProgress: 0,
            songCooldown: 2.0 + Math.random() * 2,
            isProtecting: false,
            protectedBaby: null,
            isPatrolling: true,
            patrolMinX: patrolMinX,
            patrolMaxX: patrolMaxX,
            revengeTarget: null,
            collisionCooldown: 0
        };
        animales.push(adultWhale);

        if (babyWhaleListo) {
            const numBabies = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numBabies; i++) {
                const babyTamano = 140;
                const babyVelocidad = velocidad * 1.4;
                const babyY = y + (i === 0 ? -80 : 80) + (Math.random() - 0.5) * 40;
                const babyX = spawnX + (120 + Math.random() * 80) * -direccion;

                animales.push({
                    x: babyX, y: babyY, vx: babyVelocidad * direccion, vy: 0, r: 55, w: babyTamano, h: babyTamano,
                    capturado: false, frame: 0, timerFrame: 0,
                    semillaFase: Math.random() * Math.PI * 2,
                    tipo: 'baby_whale',
                    hp: 40,
                    maxHp: 40,
                    mother: adultWhale,
                    isFleeing: false,
                    fleeTimer: 0
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

        let patronMovimiento = 'lineal';
        const randMov = Math.random();
        if (tipo !== 'aggressive' && randMov < 0.3) {
            patronMovimiento = 'sinusoidal';
        } else if (tipo !== 'aggressive' && randMov < 0.5) {
            patronMovimiento = 'pausa_acelera';
        }

        animales.push({
            x: spawnX, y, vx: velocidad * direccion, r: 44, w: tamano, h: tamano,
            capturado: false, fila, frame: 0, timerFrame: 0,
            semillaFase: Math.random() * Math.PI * 2, tipo: tipo, hp: 1, maxHp: 1,
            patronMovimiento: patronMovimiento,
            estadoMovimiento: 'moviendo',
            timerMovimiento: 0
        });
    }
}
