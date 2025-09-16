// js/level9.js
'use strict';

import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, generarAnimal, limpiarTodosLosAnimales, agregarPuntos, whaleImg, whaleListo, WHALE_SPRITE_DATA, generarTrozoBallena, generarGotasSangre, generarBurbujasDeSangre, lerp } from '../game/game.js';
import { 
    torpedos, proyectiles 
} from '../game/armas/weapons.js';

// --- ESTADO DEL NIVEL 9 ---
let levelState = {};

// --- EFECTO DE DERROTA ÉPICO (SVG Paths) ---
const WHALE_PIECES_PATHS = [
    // Cabeza
    new Path2D('M-70,-40 C-50,-65 30,-60 60,-30 L80,20 C50,55 -40,50 -70,20 Z'),
    // Cola
    new Path2D('M0,0 C-40,-25 -60,-20 -80,-40 L-90,-30 C-70,5 -50,10 0,0 Z'),
    // Trozo de cuerpo 1
    new Path2D('M-40,-30 L40,-25 L45,30 L-35,35 Z'),
    // Trozo de cuerpo 2
    new Path2D('M-25,-35 Q25,-40 45,-15 L35,35 Q-15,45 -30,25 Z'),
    // Trozo de cuerpo 3 (más pequeño)
    new Path2D('M-15,-20 L20,-25 L25,15 L-10,20 Z'),
    // Aleta (simulada)
    new Path2D('M0,0 C10,-30 30,-25 40,-5 L10,15 Z')
];

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
        estado: 'alive', // 'alive', 'muriendo'
        timerMuerte: 0,
        chargeDuration: 0,
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
        whalePieces: [], // Para la animación de muerte
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

        if (jefe.estado === 'muriendo') {
            // --- LÓGICA DE MUERTE ÉPICA ---
            jefe.timerMuerte -= dt;

            // Actualizar trozos
            for (const piece of levelState.whalePieces) {
                piece.vy += 200 * dt; // Gravedad
                piece.x += piece.vx * dt;
                piece.y += piece.vy * dt;
                piece.rotacion += piece.vRot * dt;
                piece.vida -= dt;

                // Dejar rastro de sangre y burbujas
                if (Math.random() < 0.5) {
                    generarGotasSangre(piece.x, piece.y);
                }
            }

            // Generar explosiones continuas
            if (Math.random() < 0.8) {
                const explosionX = jefe.x + (Math.random() - 0.5) * jefe.w;
                const explosionY = jefe.y + (Math.random() - 0.5) * jefe.h;
                generarExplosion(explosionX, explosionY, '#FFFFFF', 50 + Math.random() * 100);
            }

            if (jefe.timerMuerte <= 0) {
                levelState.progresoSubnivel = 1;
                completarSubnivel();
                levelState.jefe = null; // El jefe desaparece
            }
            return; // No hacer nada más si está muriendo
        }

        jefe.timerGolpe = Math.max(0, jefe.timerGolpe - dt);

        jefe.timerFrame += dt;
        if (jefe.timerFrame >= 0.08) { // WHALE_ANIMATION_SPEED
            jefe.timerFrame -= 0.08;
            jefe.frame = (jefe.frame + 1) % WHALE_SPRITE_DATA.frames.length;
        }

        if (!jefe.isCharging) {
            jefe.x += jefe.vx * dt;
            jefe.y = H / 2 + Math.sin(levelState.tiempoDeJuego * 0.4) * (H * 0.25);
            
            // --- CORRECCIÓN: La ballena debe rebotar en los bordes, no hacer wrap ---
            if ((jefe.x < jefe.w / 2 && jefe.vx < 0) || (jefe.x > W - jefe.w / 2 && jefe.vx > 0)) {
                jefe.vx *= -1;
            }

            jefe.chargeTimer -= dt;
            if (jefe.chargeTimer <= 0) {
                jefe.isCharging = true;
                jefe.chargeDuration = 3.0; // La carga dura 3 segundos
                S.reproducir('boss_hit');
            }
        } else {
            // --- LÓGICA DE PERSECUCIÓN MEJORADA ---
            const angulo = Math.atan2(jugador.y - jefe.y, jugador.x - jefe.x);
            const velocidadCarga = 450;
            // Suavizar el giro para que no sea instantáneo
            const targetVx = Math.cos(angulo) * velocidadCarga;
            const targetVy = Math.sin(angulo) * velocidadCarga;
            jefe.vx = lerp(jefe.vx, targetVx, dt * 2.0); // El 2.0 es la velocidad de giro
            jefe.vy = lerp(jefe.vy, targetVy, dt * 2.0);

            jefe.x += jefe.vx * dt;
            jefe.y += jefe.vy * dt;
            generarGotasSangre(jefe.x, jefe.y);

            jefe.chargeDuration -= dt;
            if (jefe.chargeDuration <= 0) {
                jefe.isCharging = false;
                jefe.vx = -50; // Vuelve a patrullar
                jefe.vy = 0;
                jefe.chargeTimer = 4.0 + Math.random() * 2; // Cooldown para la próxima carga
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
    if (!jefe || jefe.hp <= 0 || jefe.estado === 'muriendo') return;
    
    jefe.hp -= cantidad;
    jefe.timerGolpe = 0.15;
    S.reproducir('boss_hit');
    generarTrozoBallena(proyectil.x, proyectil.y, 3, 100);
    generarGotasSangre(proyectil.x, proyectil.y);
    
    if (jefe.hp <= 0) {
        jefe.estado = 'muriendo';
        jefe.timerMuerte = 5.0; // 5 segundos de animación de muerte
        jefe.hp = 0; // Para que la barra de vida no se vaya a negativo

        // --- CORRECCIÓN: Marcar el objetivo como cumplido inmediatamente ---
        // Esto evita que el juego se quede atascado si se sigue disparando al jefe.
        levelState.progresoSubnivel = 1;
        if (levelState.progresoSubnivel >= SUBNIVELES[levelState.subnivelActual].meta) {
             // No llamamos a completarSubnivel() aquí para permitir que la animación de muerte termine.
             // La animación llamará a completarSubnivel() cuando finalice.
        }
        startWhaleBreakup(jefe);
    }
}

function startWhaleBreakup(jefe) {
    levelState.whalePieces = [];
    S.reproducir('choque'); // Sonido inicial de la ruptura

    for (const path of WHALE_PIECES_PATHS) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 200 + Math.random() * 300;
        const vida = 4.0 + Math.random() * 2.0;
        const coloresCarne = ['#ab4e52', '#8e3a46', '#6d2e37'];

        levelState.whalePieces.push({
            path: path,
            x: jefe.x + (Math.random() - 0.5) * 50,
            y: jefe.y + (Math.random() - 0.5) * 50,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 200, // Impulso inicial hacia arriba
            vRot: (Math.random() - 0.5) * 4,
            rotacion: Math.random() * Math.PI * 2,
            vida: vida,
            vidaMax: vida,
            color: coloresCarne[Math.floor(Math.random() * coloresCarne.length)],
            strokeColor: '#5c1f27'
        });
    }
}

export function draw() {
    if (!ctx || !whaleListo || !levelState.jefe || SUBNIVELES[levelState.subnivelActual].tipo !== 'kill_boss_whale') return;

    const jefe = levelState.jefe;

    if (jefe.estado === 'muriendo') {
        // --- DIBUJAR LA MUERTE ÉPICA ---
        ctx.save();
        for (const piece of levelState.whalePieces) {
            if (piece.vida <= 0) continue;
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotacion);
            ctx.globalAlpha = clamp(piece.vida / piece.vidaMax, 0, 1);
            
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
            grad.addColorStop(0, '#fefefe'); // Centro claro (hueso)
            grad.addColorStop(0.5, piece.color);
            grad.addColorStop(1, piece.strokeColor);

            ctx.fillStyle = grad;
            ctx.strokeStyle = piece.strokeColor;
            ctx.lineWidth = 5;
            ctx.fill(piece.path);
            ctx.stroke(piece.path);
            ctx.restore();
        }
        ctx.restore();
        return; // No dibujar el jefe normal
    }

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
        levelState.spawnTimer = 999; // No más spawns normales

        // --- TRANSICIÓN A MODO ARENA ---
        // 1. Congelar el scroll
        estadoJuego.levelFlags.scrollBackground = false;
        // 2. Calcular el offset para mover todo al nuevo origen (0,0)
        const worldOffset = estadoJuego.cameraX;
        // 3. Mover al jugador a la nueva coordenada de mundo
        jugador.x -= worldOffset;
        // 4. Resetear la cámara a 0. El motor del juego se encargará de mantenerla ahí.
        estadoJuego.cameraX = 0;
        // 5. Ahora que el mundo está en (0,0), spawnear al jefe fuera de la pantalla.
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