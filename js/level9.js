// js/level9.js
'use strict';

import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, torpedos, proyectiles, generarAnimal, limpiarTodosLosAnimales, agregarPuntos, whaleImg, whaleListo, WHALE_SPRITE_DATA, generarTrozoBallena, generarGotasSangre } from './game.js';

// --- ESTADO DEL NIVEL 9 ---
let levelState = {};

// --- SUBNIVELES ---
const SUBNIVELES = [
    { nombre: 'LA CACERÍA COMIENZA', objetivo: 'Elimina 3 ballenas', meta: 3, tipo: 'kill_whale' },
    { nombre: 'FRENESÍ DE TIBURONES', objetivo: 'Sobrevive 45 segundos', meta: 45, tipo: 'survive' },
    { nombre: 'LA BESTIA BLANCA', objetivo: 'Derrota a la Mega Ballena', meta: 1, tipo: 'kill_boss_whale' }
];

// --- FUNCIONES DEL NIVEL ---

function spawnWhale() {
    generarAnimal(false, 'whale');
}

function spawnShark() {
    generarAnimal(false, 'shark');
}

function spawnMegaWhale() {
    levelState.jefe = {
        x: W + 200,
        y: H / 2,
        w: 350,
        h: 180,
        hp: 400,
        maxHp: 400,
        vx: -50, // Se mueve lento pero seguro
        vy: 0,
        tipo: 'mega_whale',
        frame: 0,
        timerFrame: 0,
        timerGolpe: 0,
        isEnraged: true, // Siempre enfurecida
        chargeTimer: 5.0, // Temporizador para la embestida
        isCharging: false,
    };
    // Sincronizar con el estado global para la barra de vida
    estadoJuego.jefe = levelState.jefe;
}

// --- FUNCIONES EXPORTADAS DEL NIVEL (API del nivel) ---

export function init() {
    console.log("Inicializando Nivel 9: El Asesino de Ballenas");
    const sub = SUBNIVELES[0];
    levelState = {
        subnivelActual: 0,
        progresoSubnivel: 0,
        tiempoDeJuego: 0,
        spawnTimer: 4.0,
        tiempoRestante: sub.meta,
        jefe: null,
    };

    estadoJuego.jefe = null;
    const bossHealthContainer = document.getElementById('bossHealthContainer');
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
    
    spawnWhale();
}

export function update(dt) {
    if (levelState.subnivelActual >= SUBNIVELES.length) return;

    levelState.tiempoDeJuego += dt;
    const sub = SUBNIVELES[levelState.subnivelActual];

    if (sub.tipo === 'survive') {
        levelState.tiempoRestante -= dt;
        if (levelState.tiempoRestante <= 0) {
            completarSubnivel();
            return;
        }
    }

    levelState.spawnTimer -= dt;
    if (levelState.spawnTimer <= 0) {
        if (sub.tipo === 'kill_whale') {
            spawnWhale();
            levelState.spawnTimer = 8.0 + Math.random() * 4.0;
        } else if (sub.tipo === 'survive') {
            spawnShark();
            levelState.spawnTimer = 1.5 + Math.random() * 1.0;
        }
    }

    // Lógica del jefe
    if (sub.tipo === 'kill_boss_whale' && levelState.jefe) {
        const jefe = levelState.jefe;
        jefe.timerGolpe = Math.max(0, jefe.timerGolpe - dt);

        jefe.timerFrame += dt;
        if (jefe.timerFrame >= 0.08) { // WHALE_ANIMATION_SPEED
            jefe.timerFrame -= 0.08;
            jefe.frame = (jefe.frame + 1) % WHALE_SPRITE_DATA.frames.length;
        }

        if (!jefe.isCharging) {
            jefe.x += jefe.vx * dt;
            jefe.y = H / 2 + Math.sin(levelState.tiempoDeJuego * 0.4) * (H * 0.25);
            if (jefe.x < -jefe.w) jefe.x = W + jefe.w;

            jefe.chargeTimer -= dt;
            if (jefe.chargeTimer <= 0) {
                jefe.isCharging = true;
                const angle = Math.atan2(jugador.y - jefe.y, jugador.x - jefe.x);
                jefe.vx = Math.cos(angle) * 450;
                jefe.vy = Math.sin(angle) * 450;
                S.reproducir('boss_hit');
            }
        } else {
            jefe.x += jefe.vx * dt;
            jefe.y += jefe.vy * dt;
            generarGotasSangre(jefe.x, jefe.y);
            if (jefe.x < -jefe.w || jefe.x > W + jefe.w || jefe.y < -jefe.h || jefe.y > H + jefe.h) {
                jefe.isCharging = false;
                jefe.vx = -50;
                jefe.vy = 0;
                jefe.chargeTimer = 5.0 + Math.random() * 3;
            }
        }

        if (Math.hypot(jugador.x - jefe.x, jugador.y - jefe.y) < jugador.r + jefe.w / 3) {
            if (estadoJuego.vidas > 0) {
                estadoJuego.vidas -= 5;
                estadoJuego.animVida = 0.6;
                S.reproducir('choque');
            }
            if (estadoJuego.vidas <= 0) perderJuego();
            jugador.x -= 50;
        }

        const hitbox = { x: jefe.x - jefe.w / 2, y: jefe.y - jefe.h / 2, w: jefe.w, h: jefe.h };
        for (let i = torpedos.length - 1; i >= 0; i--) {
            const t = torpedos[i];
            if (t.x > hitbox.x && t.x < hitbox.x + hitbox.w && t.y > hitbox.y && t.y < hitbox.y + hitbox.h) {
                recibirDanoJefe(t, 10);
                torpedos.splice(i, 1);
            }
        }
        for (let i = proyectiles.length - 1; i >= 0; i--) {
            const p = proyectiles[i];
            if (p.x > hitbox.x && p.x < hitbox.x + hitbox.w && p.y > hitbox.y && p.y < hitbox.y + hitbox.h) {
                recibirDanoJefe(p, 1);
                proyectiles.splice(i, 1);
            }
        }
    }
}

function recibirDanoJefe(proyectil, cantidad) {
    const jefe = levelState.jefe;
    if (!jefe || jefe.hp <= 0) return;
    
    jefe.hp -= cantidad;
    jefe.timerGolpe = 0.15;
    S.reproducir('boss_hit');
    generarTrozoBallena(proyectil.x, proyectil.y, 3, 100);
    generarGotasSangre(proyectil.x, proyectil.y);

    if (jefe.hp <= 0) {
        generarExplosion(jefe.x, jefe.y, '#FFFFFF', jefe.w);
        levelState.progresoSubnivel = 1;
        completarSubnivel();
    }
}

export function draw() {
    if (!ctx || !whaleListo || !levelState.jefe || SUBNIVELES[levelState.subnivelActual].tipo !== 'kill_boss_whale') return;

    const jefe = levelState.jefe;
    const offsetFlotante = Math.sin(levelState.tiempoDeJuego * 0.8) * 15;
    
    ctx.save();
    ctx.translate(jefe.x, jefe.y + offsetFlotante);
    
    let filter = 'grayscale(1) brightness(1.8) contrast(1.2)';
    if (jefe.timerGolpe > 0) {
        filter += ' brightness(3)';
    }
    ctx.filter = filter;

    const frameData = WHALE_SPRITE_DATA.frames[jefe.frame];
    if (frameData) {
        const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
        const aspectRatio = sWidth / sHeight;
        const dHeight = jefe.w / aspectRatio;
        ctx.imageSmoothingEnabled = false;
        if (jefe.vx > 0) ctx.scale(-1, 1);
        ctx.drawImage(whaleImg, sx, sy, sWidth, sHeight, -jefe.w / 2, -dHeight / 2, jefe.w, dHeight);
    }
    ctx.restore();
}

export function onKill(tipoAnimal) {
    if (levelState.subnivelActual >= SUBNIVELES.length) return;
    const sub = SUBNIVELES[levelState.subnivelActual];

    if (sub.tipo === 'kill_whale' && tipoAnimal === 'whale') {
        levelState.progresoSubnivel++;
        if (levelState.progresoSubnivel >= sub.meta) {
            completarSubnivel();
        }
    }
}

function completarSubnivel() {
    // En lugar de limpiar aquí y causar un error, le pedimos al motor que lo haga.
    estadoJuego.levelFlags.clearScreen = true;
    agregarPuntos(1000 * (levelState.subnivelActual + 1));
    
    levelState.subnivelActual++;
    if (levelState.subnivelActual >= SUBNIVELES.length) {
        estadoJuego.valorObjetivoNivel = 1;
        const bossHealthContainer = document.getElementById('bossHealthContainer');
        if (bossHealthContainer) bossHealthContainer.style.display = 'none';
        estadoJuego.jefe = null;
        return;
    }

    const nuevoSub = SUBNIVELES[levelState.subnivelActual];
    levelState.progresoSubnivel = 0;
    levelState.tiempoRestante = nuevoSub.meta;
    
    if (nuevoSub.tipo === 'kill_whale') {
        levelState.spawnTimer = 2.0;
        spawnWhale();
    } else if (nuevoSub.tipo === 'survive') {
        levelState.spawnTimer = 1.0;
        spawnShark();
    } else if (nuevoSub.tipo === 'kill_boss_whale') {
        levelState.spawnTimer = 999;
        spawnMegaWhale();
        const bossHealthContainer = document.getElementById('bossHealthContainer');
        if (bossHealthContainer) bossHealthContainer.style.display = 'block';
    }
}

export function getEstadoMision() {
    if (levelState.subnivelActual >= SUBNIVELES.length) {
        return { texto: 'NIVEL 9 COMPLETADO', progreso: '¡Masacre completada!' };
    }
    
    const sub = SUBNIVELES[levelState.subnivelActual];
    let progresoStr;
    
    if (sub.tipo === 'survive') {
        progresoStr = `TIEMPO: ${Math.ceil(levelState.tiempoRestante)}`;
    } else if (sub.tipo === 'kill_boss_whale') {
        progresoStr = levelState.jefe ? `JEFE: ${Math.max(0, Math.ceil(levelState.jefe.hp))}/${levelState.jefe.maxHp} HP` : 'Derrotado';
    } else {
        progresoStr = `${levelState.progresoSubnivel} / ${sub.meta}`;
    }
    
    return { texto: `${sub.nombre}`, progreso: `${sub.objetivo}: ${progresoStr}` };
}

export function onAnimalCazado(tipoAnimal) {}
export function onFallo() {}