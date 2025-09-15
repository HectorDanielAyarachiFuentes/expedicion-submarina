'use strict';

// Este módulo encapsula toda la lógica de las armas del jugador.

// --- State & Config ---
export let proyectiles = [];
export let torpedos = [];
export let minas = [];

export const WEAPON_ORDER = ['garra', 'shotgun', 'metralleta', 'laser', 'mina'];

export const WEAPON_CONFIG = {
    garra: { velocidad: 1400, alcance: 0.7 }, // Alcance como % del ancho de pantalla
    shotgun: {
        enfriamiento: 2.5,
        balas: 25,
        dispersion: 1.5,
        velocidadProyectil: { min: 700, max: 1100 },
        vidaProyectil: { min: 0.5, max: 0.8 }
    },
    metralleta: {
        enfriamiento: 3.0,
        balas: 30,
        dispersion: 0.2,
        velocidadProyectil: 1600,
        vidaProyectil: 0.8
    },
    laser: {
        consumoEnergia: 30, // por segundo
        regeneracionEnergia: 20, // por segundo
        danoPorTick: 2,
        cooldownTick: 0.1
    },
    mina: {
        enfriamiento: 2.0,
        velocidadCaida: 50,
        radioProximidad: 150,
        radioExplosion: 200,
        dano: 10
    },
    torpedo: { enfriamiento: 1.5, velocidad: 1200, dano: 5 },
    boost: { fuerza: 400, consumo: 35, regeneracion: 15, enfriamiento: 2.0 }
};

// --- Assets ---
export let thrusterPattern = null;
export let thrusterPatternReady = false;
export let thrusterPatternOffsetX = 0;

export function loadWeaponAssets(cargarImagen, ctx) {
    cargarImagen('js/svg/thruster.svg', function(img) {
        if (!img) return;
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = img.width;
        patternCanvas.height = img.height;
        const patternCtx = patternCanvas.getContext('2d');
        if (!patternCtx) return;
        patternCtx.drawImage(img, 0, 0);
        thrusterPattern = ctx.createPattern(patternCanvas, 'repeat-x');
        thrusterPatternReady = true;
    });
}

export function initWeapons() {
    proyectiles = [];
    torpedos = [];
    minas = [];
}

// --- Funciones de Disparo ---

function dispararGarfio(ctx) {
    const { jugador, estadoJuego, S, W, generarRafagaBurbujasDisparo, Levels } = ctx;
    if (!jugador || jugador.garra || !estadoJuego || estadoJuego.bloqueoEntrada > 0) return;
    const isLevel5 = estadoJuego.nivel === 5;
    const baseX = jugador.x;
    const baseY = isLevel5 ? jugador.y : jugador.y;
    const cannonX = isLevel5 ? baseX : baseX + 45;
    const cannonY = isLevel5 ? baseY - 45 : baseY;
    generarRafagaBurbujasDisparo(cannonX, cannonY, isLevel5);
    const dx = isLevel5 ? 0 : 1;
    const dy = isLevel5 ? -1 : 0; // prettier-ignore
    jugador.garra = { x: baseX, y: baseY, dx, dy, velocidad: WEAPON_CONFIG.garra.velocidad, fase: 'ida', golpeado: null, alcance: W * WEAPON_CONFIG.garra.alcance, recorrido: 0 };
    S.reproducir('arpon');
}

function dispararShotgun(ctx) {
    const { estadoJuego, jugador, S, generarRafagaBurbujasDisparo } = ctx;
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return;
    const isLevel5 = estadoJuego.nivel === 5;
    const px = isLevel5 ? jugador.x : jugador.x + 40;
    const py = isLevel5 ? jugador.y - 40 : jugador.y;
    generarRafagaBurbujasDisparo(px, py, isLevel5);
    const config = WEAPON_CONFIG.shotgun;
    for (let i = 0; i < config.balas; i++) {
        const anguloBase = isLevel5 ? -Math.PI / 2 : 0;
        const angulo = anguloBase + (Math.random() - 0.5) * config.dispersion;
        const velocidad = config.velocidadProyectil.min + Math.random() * (config.velocidadProyectil.max - config.velocidadProyectil.min);
        const vida = config.vidaProyectil.min + Math.random() * (config.vidaProyectil.max - config.vidaProyectil.min);
        proyectiles.push({ x: px, y: py, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, w: 8, h: 3, color: '#ffb733', vida: vida });
    }
    estadoJuego.enfriamientoArma = config.enfriamiento;
    S.reproducir('shotgun');
    setTimeout(() => S.reproducir('reload'), 500);
}

function dispararMetralleta(ctx) {
    const { estadoJuego, jugador, S, generarRafagaBurbujasDisparo } = ctx;
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return;
    const config = WEAPON_CONFIG.metralleta;
    const isLevel5 = estadoJuego.nivel === 5;
    const px = isLevel5 ? jugador.x : jugador.x + 40;
    const py = isLevel5 ? jugador.y - 40 : jugador.y;
    generarRafagaBurbujasDisparo(px, py, isLevel5);
    const numBalas = 30;
    for (let i = 0; i < numBalas; i++) {
        const anguloBase = isLevel5 ? -Math.PI / 2 : 0;
        const angulo = anguloBase + (Math.random() - 0.5) * config.dispersion;
        const velocidad = config.velocidadProyectil;
        const offset = (i / numBalas) * velocidad * 0.05; // Efecto de ráfaga
        const offsetX = isLevel5 ? Math.cos(angulo + Math.PI / 2) * offset : offset;
        const offsetY = isLevel5 ? Math.sin(angulo + Math.PI / 2) * offset : 0;
        proyectiles.push({ x: px + offsetX, y: py + offsetY, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, w: 12, h: 2, color: '#ff6363', vida: config.vidaProyectil });
    }
    estadoJuego.enfriamientoArma = config.enfriamiento;
    let soundCount = 0;
    const soundInterval = setInterval(() => { S.reproducir('machinegun'); soundCount++; if (soundCount >= 5) clearInterval(soundInterval); }, 60);
    setTimeout(() => S.reproducir('reload'), 800);
}

function lanzarMina(ctx) {
    const { estadoJuego, jugador, S } = ctx;
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return;
    const isLevel5 = estadoJuego.nivel === 5;
    const px = isLevel5 ? jugador.x : jugador.x + 40;
    const py = isLevel5 ? jugador.y - 40 : jugador.y;

    minas.push({
        x: px,
        y: py,
        r: 12, // Radio visual de la mina
        vida: 15, // La mina desaparece después de 15 segundos si no se activa
    });

    estadoJuego.enfriamientoArma = WEAPON_CONFIG.mina.enfriamiento;
    S.reproducir('torpedo'); // Reutilizamos el sonido del torpedo por ahora
}

export function disparar(ctx) {
    const { estadoJuego, jugador, Levels } = ctx;
    if (!estadoJuego) return;
    switch (estadoJuego.armaActual) {
        case 'garra': if (!jugador.garra) dispararGarfio(ctx); else if (jugador.garra.fase === 'ida') { jugador.garra.fase = 'retorno'; Levels.onFallo(); } break;
        case 'shotgun': dispararShotgun(ctx); break;
        case 'metralleta': dispararMetralleta(ctx); break;
        case 'laser': break; 
        case 'mina': lanzarMina(ctx); break;
    }
}

export function lanzarTorpedo(ctx) {
    const { estadoJuego, jugador, S } = ctx;
    if (!estadoJuego || !estadoJuego.enEjecucion || estadoJuego.enfriamientoTorpedo > 0) return;
    const isLevel5 = estadoJuego.nivel === 5;
    const px = isLevel5 ? jugador.x : jugador.x;
    const py = isLevel5 ? jugador.y : jugador.y;
    if (isLevel5) {
        torpedos.push({ x: px, y: py, w: 6, h: 20, isVertical: true });
    } else {
        torpedos.push({ x: px, y: py, w: 20, h: 6, isVertical: false });
    }
    estadoJuego.enfriamientoTorpedo = WEAPON_CONFIG.torpedo.enfriamiento;
    S.reproducir('torpedo');
}


// --- Lógica de Actualización ---

export function updateWeapons(ctx) {
    const { dtAjustado, estadoJuego, jugador, animales, W, H, S, Levels, generarExplosion, generarTrozoBallena, generarGotasSangre, generarParticula, particulasBurbujas, puntosPorRescate } = ctx;

    // --- Lógica del Garfio ---
    if (jugador.garra) { 
        const g = jugador.garra;
        const spd = g.velocidad * dtAjustado;
        if (g.fase === 'ida') {
            g.x += g.dx * spd;
            g.y += g.dy * spd;
            g.recorrido += spd;
            if (estadoJuego.nivel !== 5) {
                for (let j = 0; j < animales.length; j++) {
                    const a = animales[j];
                    if (!g.golpeado && !a.capturado && Math.hypot(a.x - g.x, a.y - g.y) < a.r) {
                        if (a.hp !== undefined) {
                            a.hp -= 15;
                            generarTrozoBallena(g.x, g.y, 5, 200);
                            S.reproducir('boss_hit');
                            if (a.hp <= 0) {
                                generarExplosion(a.x, a.y, '#aaffff', a.w);
                                Levels.onKill(a.tipo);
                                animales.splice(j, 1);
                                estadoJuego.asesinatos++;
                                estadoJuego.puntuacion += 500;
                            }
                            g.golpeado = 'chunk';
                            g.fase = 'retorno';
                            break;
                        } else {
                            g.golpeado = a;
                            a.capturado = true;
                            g.fase = 'retorno';
                            break;
                        }
                    }
                }
            }
            if (g.recorrido >= g.alcance) g.fase = 'retorno';
        } else {
            g.recorrido -= spd;
            const targetX = jugador.x, targetY = jugador.y;
            g.x += (targetX - g.x) * 0.1;
            g.y += (targetY - g.y) * 0.1;
            if (g.golpeado && g.golpeado !== 'chunk') {
                g.golpeado.x = g.x;
                g.golpeado.y = g.y;
            }
            if (g.recorrido <= 0) {
                if (g.golpeado && g.golpeado !== 'chunk') {
                    estadoJuego.rescatados++;
                    const puntos = g.golpeado.tipo === 'mierdei' ? 1000 : puntosPorRescate();
                    estadoJuego.puntuacion += puntos;
                    Levels.onAnimalCazado(g.golpeado.tipo);
                    const idx = animales.indexOf(g.golpeado);
                    if (idx !== -1) animales.splice(idx, 1);
                } else if (!g.golpeado) {
                    Levels.onFallo();
                }
                jugador.garra = null;
            }
        }
    }

    // --- Lógica de Daño del Láser ---
    if (estadoJuego.laserActivo) {
        const isLevel5 = estadoJuego.nivel === 5;
        let laserHitbox;

        if (isLevel5) {
            const laserStartX = jugador.x;
            const laserStartY = jugador.y - 40;
            const laserLength = laserStartY;
            const laserWidth = 10;
            laserHitbox = { x: laserStartX - laserWidth / 2, y: 0, w: laserWidth, h: laserLength };
        } else {
            const laserStartX = jugador.x + 40;
            const laserStartY = jugador.y;
            const laserLength = W;
            const laserWidth = 10;
            laserHitbox = { x: laserStartX, y: laserStartY - laserWidth / 2, w: laserLength, h: laserWidth };
        }

        for (let j = animales.length - 1; j >= 0; j--) {
            const a = animales[j];
            if (!a.capturado && laserHitbox.x < a.x + a.w / 2 && laserHitbox.x + laserHitbox.w > a.x - a.w / 2 && laserHitbox.y < a.y + a.h / 2 && laserHitbox.y + laserHitbox.h > a.y - a.h / 2) {
                if (a.hp !== undefined) {
                    if (!a.laserHitTimer || a.laserHitTimer <= 0) {
                        a.hp -= WEAPON_CONFIG.laser.danoPorTick;
                        a.laserHitTimer = WEAPON_CONFIG.laser.cooldownTick;
                        if (a.tipo === 'whale') generarGotasSangre(a.x, a.y);
                        generarExplosion(a.x, a.y, '#ff5555', 5);
                    }
                    if (a.hp <= 0) {
                        generarExplosion(a.x, a.y, '#aaffff', a.w);
                        Levels.onKill(a.tipo);
                        animales.splice(j, 1);
                        estadoJuego.asesinatos++;
                        estadoJuego.puntuacion += 500;
                    }
                } else {
                    generarExplosion(a.x, a.y, '#ff5555');
                    Levels.onKill(a.tipo);
                    animales.splice(j, 1);
                    estadoJuego.asesinatos++;
                }
            }
        }
    }

    // --- Lógica de Colisión de Proyectiles ---
    function chequearColisionProyectil(proyectil) {
        for (let j = animales.length - 1; j >= 0; j--) {
            const a = animales[j];
            if (!a.capturado && proyectil.x < a.x + a.w / 2 && proyectil.x + (proyectil.w || 0) > a.x - a.w / 2 && proyectil.y < a.y + a.h / 2 && proyectil.y + (proyectil.h || 0) > a.y - a.h / 2) {
                if (a.hp !== undefined) {
                    const damage = proyectil.isVertical !== undefined ? WEAPON_CONFIG.torpedo.dano : 1;
                    a.hp -= damage;
                    if (a.tipo === 'whale' || a.tipo === 'shark') {
                        generarTrozoBallena(proyectil.x, proyectil.y);
                        generarGotasSangre(proyectil.x, proyectil.y);
                    }
                    generarExplosion(proyectil.x, proyectil.y, '#dddddd');
                    if (a.hp <= 0) {
                        generarExplosion(a.x, a.y, '#aaffff', a.w);
                        Levels.onKill(a.tipo);
                        animales.splice(j, 1);
                        estadoJuego.asesinatos++;
                        estadoJuego.puntuacion += 500;
                    }
                    return true;
                }
                generarExplosion(a.x, a.y, proyectil.color || '#ff8833');
                Levels.onKill(a.tipo);
                animales.splice(j, 1);
                estadoJuego.asesinatos++;
                return true;
            }
        }
        return false;
    }

    // --- Actualización de Proyectiles (Torpedos y Balas) ---
    for (let i = torpedos.length - 1; i >= 0; i--) {
        const t = torpedos[i];
        t.x += (t.isVertical ? 0 : WEAPON_CONFIG.torpedo.velocidad) * dtAjustado;
        t.y -= (t.isVertical ? WEAPON_CONFIG.torpedo.velocidad : 0) * dtAjustado;

        if (Math.random() < 0.9) {
            const bubbleX = t.x - (t.isVertical ? 0 : t.w / 2);
            const bubbleY = t.y + (t.isVertical ? t.h / 2 : 0);
            generarParticula(particulasBurbujas, { x: bubbleX, y: bubbleY, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30 + 20, r: Math.random() * 2.5 + 1, vida: 0.8 + Math.random() * 0.8, color: '' });
        }
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
        if (Math.random() < 0.4) {
            generarParticula(particulasBurbujas, { x: p.x, y: p.y, vx: p.vx * 0.05 + (Math.random() - 0.5) * 20, vy: p.vy * 0.05 - 20 - Math.random() * 20, r: Math.random() * 1.5 + 0.5, vida: 0.4 + Math.random() * 0.4, color: '' });
        }

        if (p.isMenuEffect) {
            if (p.vida <= 0) { proyectiles.splice(i, 1); }
            continue;
        }

        if (p.vida <= 0 || p.x > W + 20 || p.x < -20 || p.y < -20 || p.y > H + 20) {
            proyectiles.splice(i, 1);
            continue;
        }
        if (chequearColisionProyectil(p)) {
            proyectiles.splice(i, 1);
        }
    }
    
    // --- Actualización de Minas de Proximidad ---
    for (let i = minas.length - 1; i >= 0; i--) {
        const m = minas[i];
        m.y += WEAPON_CONFIG.mina.velocidadCaida * dtAjustado;
        m.vida -= dtAjustado;

        let explotar = false;

        for (const a of animales) {
            if (Math.hypot(a.x - m.x, a.y - m.y) < WEAPON_CONFIG.mina.radioProximidad) {
                explotar = true;
                break;
            }
        }

        if (m.vida <= 0 || m.y > H + m.r) {
            minas.splice(i, 1);
            continue;
        }

        if (explotar) {
            generarExplosion(m.x, m.y, '#ff9933', WEAPON_CONFIG.mina.radioExplosion / 2);
            S.reproducir('explosion_grande');

            const numBurbujas = 35 + Math.floor(Math.random() * 15);
            for (let k = 0; k < numBurbujas; k++) {
                const angulo = Math.random() * Math.PI * 2;
                const velocidad = 80 + Math.random() * 200;
                const vida = 1.8 + Math.random() * 1.2;
                const radio = 3 + Math.random() * 6;
                generarParticula(particulasBurbujas, { x: m.x, y: m.y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad - 60, r: radio, vida: vida, color: '' });
            }

            for (let j = animales.length - 1; j >= 0; j--) {
                const a = animales[j];
                if (Math.hypot(a.x - m.x, a.y - m.y) < WEAPON_CONFIG.mina.radioExplosion) {
                    generarExplosion(a.x, a.y, '#ff8833');
                    Levels.onKill(a.tipo);
                    animales.splice(j, 1);
                    estadoJuego.asesinatos++;
                }
            }
            minas.splice(i, 1);
        }
    }

    // Animar el patrón del propulsor/láser
    thrusterPatternOffsetX = (thrusterPatternOffsetX - dtAjustado * 800) % 512;
}

// --- Lógica de Dibujado ---

export function drawWeapons(dCtx) {
    const { ctx, estadoJuego, jugador, W, H, inclinacionRobot } = dCtx;
    const px = jugador.x;
    const py = jugador.y + (Math.sin(estadoJuego.tiempoTranscurrido * 2.5) * 3);

    // --- Dibuja el Láser ---
    if (estadoJuego.laserActivo) {
        const isLevel5 = estadoJuego.nivel === 5;
        const energyRatio = estadoJuego.laserEnergia / estadoJuego.laserMaxEnergia;
        const time = estadoJuego.tiempoTranscurrido;
        const baseWidth = 20;
        const pulse = Math.sin(time * 60) * 3;
        const beamWidth = (baseWidth + pulse) * energyRatio;
        const laserStartX = isLevel5 ? px : px + 40;
        const laserStartY = isLevel5 ? py - 40 : py;
        const angle = isLevel5 ? -Math.PI / 2 : 0;
        const length = isLevel5 ? laserStartY : W - laserStartX;

        ctx.save();
        ctx.translate(laserStartX, laserStartY);
        ctx.rotate(angle);

        const glowWidth = beamWidth * 2.5;
        const glowGrad = ctx.createLinearGradient(0, -glowWidth / 2, 0, glowWidth / 2);
        glowGrad.addColorStop(0, 'rgba(255, 100, 100, 0)');
        glowGrad.addColorStop(0.5, `rgba(255, 100, 100, ${energyRatio * 0.4})`);
        glowGrad.addColorStop(1, 'rgba(255, 100, 100, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, -glowWidth / 2, length, glowWidth);

        if (thrusterPatternReady && thrusterPattern) {
            ctx.save();
            ctx.translate(thrusterPatternOffsetX, 0);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = thrusterPattern;
            ctx.globalAlpha = 0.6 * energyRatio;
            ctx.fillRect(-thrusterPatternOffsetX, -beamWidth / 2, length + thrusterPatternOffsetX, beamWidth);
            ctx.restore();
        }

        const coreWidth = beamWidth * 0.25;
        const coreGrad = ctx.createLinearGradient(0, -coreWidth / 2, 0, coreWidth / 2);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        coreGrad.addColorStop(0.5, `rgba(255, 255, 220, ${energyRatio})`);
        coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, -coreWidth / 2, length, coreWidth);

        ctx.globalCompositeOperation = 'lighter';
        const flareRadius = beamWidth * 0.8;
        const flareGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, flareRadius);
        flareGrad.addColorStop(0, `rgba(255, 255, 255, ${energyRatio * 0.9})`);
        flareGrad.addColorStop(0.3, `rgba(255, 255, 200, ${energyRatio * 0.7})`);
        flareGrad.addColorStop(1, 'rgba(255, 100, 100, 0)');
        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(0, 0, flareRadius, 0, Math.PI * 2);
        ctx.fill();

        const numParticles = 10;
        for (let i = 0; i < numParticles; i++) {
            const pLife = Math.random();
            if (pLife > energyRatio) continue;
            const pX = Math.random() * length;
            const pY = (Math.random() - 0.5) * beamWidth;
            const pSize = Math.random() * 2 + 1;
            ctx.fillStyle = `rgba(255, 255, 220, ${Math.random() * 0.8})`;
            ctx.beginPath();
            ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // --- Dibuja el Garfio ---
    if (jugador.garra) {
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

    // --- Dibuja Torpedos ---
    for (const t of torpedos) {
        ctx.save();
        ctx.translate(t.x, t.y);
        const angle = t.isVertical ? -Math.PI / 2 : 0;
        ctx.rotate(angle);
        const grad = ctx.createLinearGradient(-t.w / 2, 0, t.w / 2, 0);
        grad.addColorStop(0, '#ffdd99');
        grad.addColorStop(0.5, '#ffcc00');
        grad.addColorStop(1, '#ffaa00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-t.w / 2, -t.h / 2);
        ctx.lineTo(t.w / 2 - t.h, -t.h / 2);
        ctx.arc(t.w / 2 - t.h, 0, t.h / 2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-t.w / 2, t.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 200, 100, 0.7)';
        ctx.beginPath();
        ctx.arc(-t.w / 2, 0, t.h / 1.5, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Dibuja Proyectiles ---
    for (const p of proyectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        const grad = ctx.createLinearGradient(-p.w / 2, 0, p.w / 2, 0);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.8, p.color);
        grad.addColorStop(1, 'white');
        ctx.fillStyle = grad;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
    }

    // --- Dibuja Minas ---
    for (const m of minas) {
        ctx.save();
        ctx.translate(m.x, m.y);
        const pulso = 1 + Math.sin(estadoJuego.tiempoTranscurrido * 10) * 0.15;
        ctx.scale(pulso, pulso);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angulo = (i / 8) * Math.PI * 2 + estadoJuego.tiempoTranscurrido * 0.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angulo) * m.r * 1.6, Math.sin(angulo) * m.r * 1.6);
            ctx.stroke();
        }
        const grad = ctx.createRadialGradient(-m.r * 0.3, -m.r * 0.3, 0, 0, 0, m.r * 1.5);
        grad.addColorStop(0, '#777');
        grad.addColorStop(0.5, '#555');
        grad.addColorStop(1, '#2a2a2a');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, m.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const luzActiva = Math.floor(estadoJuego.tiempoTranscurrido * 3) % 2 === 0;
        if (luzActiva) {
            const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, m.r * 0.6);
            glowGrad.addColorStop(0, 'rgba(255, 100, 100, 0.8)');
            glowGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath(); ctx.arc(0, 0, m.r * 0.6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff4444';
            ctx.beginPath(); ctx.arc(0, 0, m.r * 0.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}