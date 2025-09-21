'use strict';

// Este módulo encapsula toda la lógica de las armas del jugador.

// --- State & Config ---
export let proyectiles = [];
export let torpedos = [];
export let minas = [];
export let muzzleFlashes = []; // NUEVO: Para los fogonazos

export const WEAPON_ORDER = ['garra', 'escopeta', 'gatling', 'laser', 'mina'];

export const WEAPON_CONFIG = {
    garra: { velocidad: 1400, alcance: 0.7 }, // Alcance como % del ancho de pantalla
    escopeta: {
        enfriamiento: 2.5,
        balas: 25,
        dispersion: 1.2,
        velocidadProyectil: { min: 700, max: 1100 },
        vidaProyectil: { min: 0.5, max: 0.8 }
    },
    gatling: {
        enfriamiento: 4.0,      // Cooldown después de una ráfaga completa
        spinUpTime: 0.35,       // Tiempo en segundos para que el cañón empiece a girar
        fireDuration: 3.5,      // Cuánto tiempo dispara en una ráfaga
        bulletsPerSecond: 45,   // Balas por segundo
        dispersion: 0.3,        // Dispersión de las balas
        velocidadProyectil: 1800,
        vidaProyectil: 0.9,
        deployTime: 0.4         // Tiempo para la animación de despliegue/repliegue
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
    boost: { fuerza: 400, consumo: 35, regeneracion: 15, enfriamiento: 2.0 },
    shield: { consumo: 25, regeneracion: 12, enfriamiento: 3.0, danoAbsorbido: 5 } // consumo por segundo, regeneracion por segundo, cooldown al agotarse, energia perdida por golpe
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
    muzzleFlashes = [];
}

/**
 * Calcula la posición y el ángulo del cañón del submarino en el mundo.
 * @param {number} baseX - La coordenada X base del submarino (mundo).
 * @param {number} baseY - La coordenada Y base del submarino (mundo).
 * @param {object} jugador - El objeto del jugador (para la inclinación).
 * @param {object} estadoJuego - El estado actual del juego.
 * @returns {{x: number, y: number, angle: number}} - Posición y ángulo del cañón.
 */
function getCannonTransform(baseX, baseY, jugador, estadoJuego) {
    const isLevel5 = estadoJuego.nivel === 5;
    const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
    const finalAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);

    // El cañón está a un offset del centro del submarino.
    // En el sistema de coordenadas local del submarino (apuntando a la derecha), está en (45, 0).
    const cannonOffsetX = 45;
    const cannonOffsetY = 0;

    // Rotamos este offset para encontrar la posición mundial del cañón.
    const cannonX = baseX + cannonOffsetX * Math.cos(finalAngle) - cannonOffsetY * Math.sin(finalAngle);
    const cannonY = baseY + cannonOffsetX * Math.sin(finalAngle) + cannonOffsetY * Math.cos(finalAngle);

    return {
        x: cannonX,
        y: cannonY,
        angle: finalAngle
    };
}

/**
 * Calcula la posición y el ángulo del soporte ventral de la Gatling.
 * @param {number} baseX - La coordenada X base del submarino (mundo).
 * @param {number} baseY - La coordenada Y base del submarino (mundo).
 * @param {object} jugador - El objeto del jugador (para la inclinación).
 * @param {object} estadoJuego - El estado actual del juego.
 * @returns {{x: number, y: number, angle: number}} - Posición y ángulo del soporte.
 */
function getGatlingMountTransform(baseX, baseY, jugador, estadoJuego) {
    const isLevel5 = estadoJuego.nivel === 5;
    const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
    const finalAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);

    // El soporte está debajo y un poco hacia adelante del centro del submarino.
    // Coordenadas locales: (20, 35) -> 20px adelante, 35px abajo.
    const mountOffsetX = 20;
    const mountOffsetY = 35;

    // Rotamos este offset para encontrar la posición mundial.
    const mountX = baseX + mountOffsetX * Math.cos(finalAngle) - mountOffsetY * Math.sin(finalAngle);
    const mountY = baseY + mountOffsetX * Math.sin(finalAngle) + mountOffsetY * Math.cos(finalAngle);

    return { x: mountX, y: mountY, angle: finalAngle };
}
/**
 * Calcula la posición y el ángulo del puerto de eyección de casquillos.
 * @param {number} baseX - La coordenada X base del submarino (mundo).
 * @param {number} baseY - La coordenada Y base del submarino (mundo).
 * @param {object} jugador - El objeto del jugador (para la inclinación).
 * @param {object} estadoJuego - El estado actual del juego.
 * @returns {{x: number, y: number, angle: number}} - Posición y ángulo del puerto.
 */
function getEjectionPortTransform(baseX, baseY, jugador, estadoJuego) {
    const isLevel5 = estadoJuego.nivel === 5;
    const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
    const finalAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);
    
    // El puerto de eyección está en la parte superior del submarino.
    // Coordenadas locales: (0, -25) -> 0 en X, 25 píxeles hacia arriba.
    const portOffsetX = 0;
    const portOffsetY = -25;

    // Rotamos este offset para encontrar la posición mundial.
    const portX = baseX + portOffsetX * Math.cos(finalAngle) - portOffsetY * Math.sin(finalAngle);
    const portY = baseY + portOffsetX * Math.sin(finalAngle) + portOffsetY * Math.cos(finalAngle);

    return { x: portX, y: portY, angle: finalAngle };
}

/**
 * Genera un efecto de chispas al impactar una bala.
 * @param {number} x - Posición X del impacto.
 * @param {number} y - Posición Y del impacto.
 * @param {number} impactAngle - Ángulo de la bala que impacta.
 * @param {object} ctx - El contexto de `updateWeapons` que contiene `generarParticula` y `particulasExplosion`.
 */
function generarImpactoBala(x, y, impactAngle, ctx) {
    const { generarParticula, particulasExplosion } = ctx;
    const numChispas = 8 + Math.floor(Math.random() * 5);
    const dispersion = Math.PI / 2; // 90 grados de cono de chispas

    for (let i = 0; i < numChispas; i++) {
        // Las chispas rebotan en la dirección opuesta al impacto
        const anguloSalida = impactAngle + Math.PI + (Math.random() - 0.5) * dispersion;
        const velocidad = 200 + Math.random() * 250;
        const vida = 0.2 + Math.random() * 0.3;
        const radio = 1 + Math.random() * 2;
        
        generarParticula(particulasExplosion, { x, y, vx: Math.cos(anguloSalida) * velocidad, vy: Math.sin(anguloSalida) * velocidad, r: radio, vida: vida, color: ['#ffffff', '#ffdd77', '#ffb733'][Math.floor(Math.random() * 3)] });
    }
}

// --- Funciones de Disparo ---

function dispararGarfio(ctx) {
    const { jugador, estadoJuego, S, W, generarRafagaBurbujasDisparo, Levels, triggerVibration } = ctx;
    if (!jugador || jugador.garra || !estadoJuego || estadoJuego.bloqueoEntrada > 0) return;

    const cannon = getCannonTransform(jugador.x, jugador.y, jugador, estadoJuego);
    generarRafagaBurbujasDisparo(cannon.x, cannon.y, estadoJuego.nivel === 5);

    const dx = Math.cos(cannon.angle);
    const dy = Math.sin(cannon.angle);

    jugador.garra = { x: cannon.x, y: cannon.y, dx, dy, velocidad: WEAPON_CONFIG.garra.velocidad, fase: 'ida', golpeado: null, alcance: W * WEAPON_CONFIG.garra.alcance, recorrido: 0 };
    S.reproducir('arpon');
    triggerVibration(120, 0.1, 0.6);
}

function dispararShotgun(ctx) {
    const { estadoJuego, jugador, S, generarRafagaBurbujasDisparo, generarCasquillo, triggerVibration } = ctx;
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return; // prettier-ignore

    const cannon = getCannonTransform(jugador.x, jugador.y, jugador, estadoJuego);
    generarRafagaBurbujasDisparo(cannon.x, cannon.y, estadoJuego.nivel === 5);

    // Expulsar un casquillo
    if (generarCasquillo) {
        const port = getEjectionPortTransform(jugador.x, jugador.y, jugador, estadoJuego);
        generarCasquillo(port.x, port.y, estadoJuego.nivel === 5);
    }

    const config = WEAPON_CONFIG.escopeta;
    for (let i = 0; i < config.balas; i++) {
        const angulo = cannon.angle + (Math.random() - 0.5) * config.dispersion;
        const velocidad = config.velocidadProyectil.min + Math.random() * (config.velocidadProyectil.max - config.velocidadProyectil.min);
        const vida = config.vidaProyectil.min + Math.random() * (config.vidaProyectil.max - config.vidaProyectil.min);
        // Añadimos vidaMax para el efecto tracer
        proyectiles.push({ x: cannon.x, y: cannon.y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, w: 8, h: 3, color: '#ffb733', vida: vida, vidaMax: vida });
    }
    estadoJuego.enfriamientoArma = config.enfriamiento;
    S.reproducir('shotgun');
    triggerVibration(200, 0.8, 1.0);
    setTimeout(() => S.reproducir('reload'), 500);
}

function lanzarMina(ctx) {
    const { estadoJuego, jugador, S } = ctx;
    if (!estadoJuego || estadoJuego.enfriamientoArma > 0) return;
    const cannon = getCannonTransform(jugador.x, jugador.y, jugador, estadoJuego);

    minas.push({
        x: cannon.x,
        y: cannon.y,
        r: 12, // Radio visual de la mina
        vida: 15, // La mina desaparece después de 15 segundos si no se activa
    });

    estadoJuego.enfriamientoArma = WEAPON_CONFIG.mina.enfriamiento;
    S.reproducir('torpedo'); // Reutilizamos el sonido del torpedo por ahora
}

export function disparar(ctx) {
    const { estadoJuego, jugador, Levels, S } = ctx;
    if (!estadoJuego) return;
    switch (estadoJuego.armaActual) {
        case 'garra': if (!jugador.garra) dispararGarfio(ctx); else if (jugador.garra.fase === 'ida') { jugador.garra.fase = 'retorno'; Levels.onFallo(); } break;
        case 'escopeta': dispararShotgun(ctx); break;
        case 'gatling': {
            // La lógica de la gatling se maneja en updateWeapons por ser un arma sostenida.
            // Al presionar el botón, se inicia el 'spin-up'.
            const gatlingState = estadoJuego.gatlingState;
            // Solo se puede empezar a disparar si está desplegada y lista.
            if (gatlingState.isDeployed && !gatlingState.isSpinning && !gatlingState.isFiring && estadoJuego.enfriamientoArma <= 0) {
                gatlingState.isSpinning = true;
                gatlingState.spinTimer = WEAPON_CONFIG.gatling.spinUpTime;
                S.reproducir('gatling_spinup');
            }
            break;
        }
        case 'laser': break;
        case 'mina': lanzarMina(ctx); break;
    }
}

export function lanzarTorpedo(ctx) {
    const { estadoJuego, jugador, S, generarCasquillo, triggerVibration } = ctx;
    if (!estadoJuego || !estadoJuego.enEjecucion || estadoJuego.enfriamientoTorpedo > 0) return;

    // --- NUEVO: Expulsar un casquillo al lanzar un torpedo ---
    // Para consistencia visual, los torpedos también expulsan un casquillo desde el puerto superior.
    if (generarCasquillo) {
        const port = getEjectionPortTransform(jugador.x, jugador.y, jugador, estadoJuego);
        generarCasquillo(port.x, port.y, estadoJuego.nivel === 5);
    }

    // Los torpedos salen de la parte inferior del submarino.
    const isLevel5 = estadoJuego.nivel === 5;
    const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
    const finalAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);
    
    // Offset local: debajo del centro del submarino
    const torpedoBayOffsetX = 0;
    const torpedoBayOffsetY = 30; // Debajo del centro

    const px = jugador.x + torpedoBayOffsetX * Math.cos(finalAngle) - torpedoBayOffsetY * Math.sin(finalAngle);
    const py = jugador.y + torpedoBayOffsetX * Math.sin(finalAngle) + torpedoBayOffsetY * Math.cos(finalAngle);

    // El torpedo siempre dispara hacia adelante
    const torpedoAngle = finalAngle;
    
    torpedos.push({ 
        x: px, y: py, w: 20, h: 6, angle: torpedoAngle
    });
    estadoJuego.enfriamientoTorpedo = WEAPON_CONFIG.torpedo.enfriamiento;
    S.reproducir('torpedo');
    triggerVibration(180, 0.3, 0.9);
}


// --- Lógica de Actualización ---

export function updateWeapons(ctx) {
    const { dtAjustado, estadoJuego, jugador, animales, W, H, S, Levels, generarExplosion, generarTrozoBallena, generarGotasSangre, generarParticula, particulasBurbujas, particulasExplosion, puntosPorRescate, triggerVibration, teclas, generarCasquillo } = ctx;

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
        const cannon = getCannonTransform(jugador.x, jugador.y, jugador, estadoJuego);
        const laserAngle = cannon.angle;
        const laserStartX = cannon.x;
        const laserStartY = cannon.y;
        const laserLength = W * 1.5; // Long enough to cross the screen
        const laserEndX = laserStartX + Math.cos(laserAngle) * laserLength;
        const laserEndY = laserStartY + Math.sin(laserAngle) * laserLength;

        for (let j = animales.length - 1; j >= 0; j--) {
            const a = animales[j];
            if (a.capturado) continue;

            // Simple circle-line segment collision
            const animalRadius = a.r || a.w / 2;

            // Vector from start of laser to animal
            const toAnimalX = a.x - laserStartX;
            const toAnimalY = a.y - laserStartY;

            // Vector of the laser beam
            const laserDX = laserEndX - laserStartX;
            const laserDY = laserEndY - laserStartY;
            
            const laserLenSq = laserDX * laserDX + laserDY * laserDY;
            
            // Project animal's center onto the laser line
            const t = (toAnimalX * laserDX + toAnimalY * laserDY) / laserLenSq;
            
            let closestX, closestY;
            if (t < 0) {
                closestX = laserStartX;
                closestY = laserStartY;
            } else if (t > 1) {
                closestX = laserEndX;
                closestY = laserEndY;
            } else {
                closestX = laserStartX + t * laserDX;
                closestY = laserStartY + t * laserDY;
            }

            const distSq = (a.x - closestX) * (a.x - closestX) + (a.y - closestY) * (a.y - closestY);

            if (distSq < animalRadius * animalRadius) {
                if (a.hp !== undefined) {
                    if (!a.laserHitTimer || a.laserHitTimer <= 0) {
                        a.hp -= WEAPON_CONFIG.laser.danoPorTick;
                        a.laserHitTimer = WEAPON_CONFIG.laser.cooldownTick;
                        if (a.tipo === 'whale' || a.tipo === 'baby_whale') generarGotasSangre(a.x, a.y);
                        generarExplosion(a.x, a.y, '#ff5555', 5);
                    }
                    if (a.hp <= 0) {
                        generarExplosion(a.x, a.y, '#aaffff', a.w);
                        Levels.onKill(a.tipo);
                        animales.splice(j, 1);
                        estadoJuego.asesinatos++; // prettier-ignore
                        estadoJuego.puntuacion += 500;
                    }
                } else {
                    generarExplosion(a.x, a.y, '#ff5555', a.w);
                    Levels.onKill(a.tipo);
                    animales.splice(j, 1);
                    estadoJuego.asesinatos++;
                }
            }
        }
    }

    // --- Lógica de Despliegue/Repliegue de la Gatling ---
    // Se ejecuta siempre, incluso si no es el arma activa, para poder replegarla.
    const gatlingState = estadoJuego.gatlingState;
    const gatlingConfig = WEAPON_CONFIG.gatling;
    if (gatlingState.isDeploying) {
        gatlingState.deployProgress += dtAjustado / gatlingConfig.deployTime;
        if (gatlingState.deployProgress >= 1) {
            gatlingState.deployProgress = 1;
            gatlingState.isDeploying = false;
            gatlingState.isDeployed = true;
        }
    } else if (gatlingState.isRetracting) {
        gatlingState.deployProgress -= dtAjustado / gatlingConfig.deployTime;
        if (gatlingState.deployProgress <= 0) {
            gatlingState.deployProgress = 0;
            gatlingState.isRetracting = false;
            gatlingState.isDeployed = false;
        }
    }

    // --- Lógica de la Ametralladora Gatling ---
    if (estadoJuego.armaActual === 'gatling' && gatlingState.isDeployed) {
        const firePressed = teclas && teclas[' '];

        // Si se suelta el gatillo, se detiene todo
        if (!firePressed && (gatlingState.isSpinning || gatlingState.isFiring)) {
            S.detener('gatling_spinup');
            S.detener('gatling_fire');
            gatlingState.isSpinning = false;
            gatlingState.isFiring = false;
            // Si estaba disparando, poner en enfriamiento parcial
            if (gatlingState.fireTimer > 0) {
                estadoJuego.enfriamientoArma = gatlingConfig.enfriamiento / 2;
            }
        }

        // Actualizar estado de giro
        if (gatlingState.isSpinning) {
            gatlingState.spinTimer -= dtAjustado;
            if (gatlingState.spinTimer <= 0) {
                gatlingState.isSpinning = false;
                gatlingState.isFiring = true;
                gatlingState.fireTimer = gatlingConfig.fireDuration;
                gatlingState.bulletTimer = 0;
                S.detener('gatling_spinup');
                S.bucle('gatling_fire');
            }
        }

        // Actualizar estado de disparo
        if (gatlingState.isFiring) {
            gatlingState.fireTimer -= dtAjustado;
            gatlingState.bulletTimer -= dtAjustado;

            // Disparar balas
            if (gatlingState.bulletTimer <= 0) {
                gatlingState.bulletTimer += 1 / gatlingConfig.bulletsPerSecond;
                
                const mount = getGatlingMountTransform(jugador.x, jugador.y, jugador, estadoJuego);

                // --- CÁLCULO CORREGIDO DE LA BOCA DEL CAÑÓN ---
                // Replicamos la transformación del canvas para encontrar la posición correcta.
                const gunDeployOffset = 30; // Cuando dispara, siempre está desplegado (deployProgress = 1)
                const barrelLength = 35;    // Longitud de los cañones
                
                // 1. Centro del ensamblaje de cañones (el punto que rota)
                const assemblyCenterX = mount.x - gunDeployOffset * Math.sin(mount.angle);
                const assemblyCenterY = mount.y + gunDeployOffset * Math.cos(mount.angle);
                // 2. Posición de la boca del cañón (al final de los cañones)
                const muzzleX = assemblyCenterX + barrelLength * Math.cos(mount.angle);
                const muzzleY = assemblyCenterY + barrelLength * Math.sin(mount.angle);
                const angulo = mount.angle + (Math.random() - 0.5) * gatlingConfig.dispersion;
                const velocidad = gatlingConfig.velocidadProyectil;
                
                // --- NUEVO: Generar Fogonazo y Humo ---
                muzzleFlashes.push({
                    x: muzzleX, y: muzzleY,
                    angle: angulo,
                    size: 25 + Math.random() * 15,
                    vida: 0.08, vidaMax: 0.08 // Vida muy corta para un flash rápido
                });
                generarParticula(particulasBurbujas, { // Reutilizamos burbujas para el humo
                    x: muzzleX, y: muzzleY,
                    vx: Math.cos(angulo) * 150 + (Math.random() - 0.5) * 50, vy: Math.sin(angulo) * 150 + (Math.random() - 0.5) * 50,
                    r: 8 + Math.random() * 10, vida: 0.6, color: 'rgba(100, 100, 100, 0.5)'
                });

                proyectiles.push({ x: muzzleX, y: muzzleY, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, w: 14, h: 4, color: '#ffdd77', vida: gatlingConfig.vidaProyectil, vidaMax: gatlingConfig.vidaProyectil });

                if (generarCasquillo) {
                    const port = getEjectionPortTransform(jugador.x, jugador.y, jugador, estadoJuego);
                    generarCasquillo(port.x, port.y, estadoJuego.nivel === 5);
                }

                triggerVibration(30, 0.5, 0.1);
            }

            if (gatlingState.fireTimer <= 0) {
                gatlingState.isFiring = false;
                estadoJuego.enfriamientoArma = gatlingConfig.enfriamiento;
                S.detener('gatling_fire');
                S.reproducir('reload');
            }
        }

    } else if (estadoJuego.gatlingState.isSpinning || estadoJuego.gatlingState.isFiring) {
        estadoJuego.gatlingState.isSpinning = false;
        estadoJuego.gatlingState.isFiring = false;
        S.detener('gatling_spinup');
        S.detener('gatling_fire');
    }

    // --- NUEVO: Actualizar Fogonazos ---
    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
        const flash = muzzleFlashes[i];
        flash.vida -= dtAjustado;
        if (flash.vida <= 0) {
            muzzleFlashes.splice(i, 1);
        }
    }


    // --- Lógica de Colisión de Proyectiles ---
    function chequearColisionProyectil(proyectil, ctx) {
        for (let j = animales.length - 1; j >= 0; j--) {
            const a = animales[j];
            if (!a.capturado && proyectil.x < a.x + a.w / 2 && proyectil.x + (proyectil.w || 0) > a.x - a.w / 2 && proyectil.y < a.y + a.h / 2 && proyectil.y + (proyectil.h || 0) > a.y - a.h / 2) {
                if (a.hp !== undefined) {
                    const damage = proyectil.isVertical !== undefined ? WEAPON_CONFIG.torpedo.dano : 1;
                    a.hp -= damage;
                    if (a.tipo === 'whale' || a.tipo === 'shark' || a.tipo === 'baby_whale') {
                        generarTrozoBallena(proyectil.x, proyectil.y);
                        generarGotasSangre(proyectil.x, proyectil.y);
                    }
                    const impactAngle = Math.atan2(proyectil.vy, proyectil.vx);
                    generarImpactoBala(proyectil.x, proyectil.y, impactAngle, ctx);
                    if (a.hp <= 0) {
                        generarExplosion(a.x, a.y, '#aaffff', a.w);
                        Levels.onKill(a.tipo);
                        animales.splice(j, 1);
                        estadoJuego.asesinatos++;
                        estadoJuego.puntuacion += 500;
                    }
                    return true;
                }
                generarExplosion(a.x, a.y, proyectil.color || '#ff8833', a.w);
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
        t.x += Math.cos(t.angle) * WEAPON_CONFIG.torpedo.velocidad * dtAjustado;
        t.y += Math.sin(t.angle) * WEAPON_CONFIG.torpedo.velocidad * dtAjustado;

        if (Math.random() < 0.9) {
            const bubbleX = t.x - Math.cos(t.angle) * (t.w / 2);
            const bubbleY = t.y - Math.sin(t.angle) * (t.w / 2);
            generarParticula(particulasBurbujas, { x: bubbleX, y: bubbleY, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30 + 20, r: Math.random() * 2.5 + 1, vida: 0.8 + Math.random() * 0.8, color: '' });
        }
        // --- CORRECCIÓN: La comprobación de fuera de pantalla debe ser relativa a la cámara ---
        const offscreenRight = estadoJuego.cameraX + W + t.w;
        const offscreenLeft = estadoJuego.cameraX - t.w;

        if (t.y < -t.h || t.x > offscreenRight || t.x < offscreenLeft) { 
            torpedos.splice(i, 1); 
            continue; 
        }
        if (chequearColisionProyectil(t, ctx)) {
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

        // --- CORRECCIÓN: La comprobación de fuera de pantalla debe ser relativa a la cámara ---
        const offscreenRight = estadoJuego.cameraX + W + 20;
        const offscreenLeft = estadoJuego.cameraX - 20;

        if (p.vida <= 0 || p.x > offscreenRight || p.x < offscreenLeft || p.y < -20 || p.y > H + 20) {
            proyectiles.splice(i, 1);
            continue;
        }
        if (chequearColisionProyectil(p, ctx)) {
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

            // --- NUEVO: Vibración por explosión de mina ---
            const dist = Math.hypot(m.x - jugador.x, m.y - jugador.y);
            const vibrationRadius = WEAPON_CONFIG.mina.radioExplosion * 2.0;
            if (dist < vibrationRadius) {
                const intensity = 1.0 - (dist / vibrationRadius);
                triggerVibration(500, intensity, intensity);
            }

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
                    generarExplosion(a.x, a.y, '#ff8833', a.w);
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
    const { ctx, estadoJuego, jugador, px, py, W, H } = dCtx;

    // --- Dibuja la Ametralladora Gatling y su compartimento ---
    // Se dibuja si es el arma actual O si se está replegando.
    if (estadoJuego.armaActual === 'gatling' || estadoJuego.gatlingState.isRetracting) {
        const gatlingState = estadoJuego.gatlingState;
        const deployProgress = gatlingState.deployProgress;

        // 1. Obtener la posición del soporte ventral
        const mount = getGatlingMountTransform(px, py, jugador, estadoJuego);

        ctx.save();
        ctx.translate(mount.x, mount.y);
        ctx.rotate(mount.angle);

        // 2. Dibujar la compuerta abriéndose
        const hatchWidth = 50;
        const hatchHeight = 18;
        const openAngle = Math.PI / 2.2;

        // --- MEJORA VISUAL: Gradiente para dar profundidad a las compuertas ---
        const hatchGrad = ctx.createLinearGradient(0, -hatchHeight, 0, hatchHeight);
        hatchGrad.addColorStop(0, '#555');
        hatchGrad.addColorStop(0.5, '#3d3d3d');
        hatchGrad.addColorStop(1, '#2a2a2a');

        ctx.fillStyle = hatchGrad;
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 2;

        // Parte superior de la compuerta
        ctx.save(); ctx.rotate(-openAngle * deployProgress); ctx.beginPath(); ctx.rect(-hatchWidth / 2, -hatchHeight, hatchWidth, hatchHeight); ctx.fill(); ctx.stroke(); ctx.restore();
        // Parte inferior de la compuerta
        ctx.save(); ctx.rotate(openAngle * deployProgress); ctx.beginPath(); ctx.rect(-hatchWidth / 2, 0, hatchWidth, hatchHeight); ctx.fill(); ctx.stroke(); ctx.restore();

        // 3. Dibujar la Gatling saliendo del compartimento
        if (deployProgress > 0) {
            const gunDeployOffset = 30 * deployProgress; // Se mueve "hacia abajo" (eje Y local)
            ctx.translate(0, gunDeployOffset);

            // Lógica de rotación de los cañones
            let rotation = 0;
            if (gatlingState.isSpinning) {
                const spinProgress = 1 - (gatlingState.spinTimer / WEAPON_CONFIG.gatling.spinUpTime);
                rotation = spinProgress * spinProgress * 40 * estadoJuego.tiempoTranscurrido; // Acelera
            } else if (gatlingState.isFiring) {
                rotation = 40 * estadoJuego.tiempoTranscurrido; // Velocidad constante
            }

            // Dibujar los cañones
            const numBarrels = 6;
            const barrelLength = 35;
            const barrelDist = 7; // Distancia del centro
            for (let i = 0; i < numBarrels; i++) {
                const angle = (i / numBarrels) * Math.PI * 2 + rotation;
                const barrelX = Math.cos(angle) * barrelDist;
                const barrelY = Math.sin(angle) * barrelDist;
                ctx.fillStyle = '#4a4a4a';
                ctx.fillRect(barrelX, barrelY - 2.5, barrelLength, 5);
            }
        }
        ctx.restore();
    }

    // --- NUEVO: Dibuja los Fogonazos ---
    for (const flash of muzzleFlashes) {
        ctx.save();
        ctx.translate(flash.x, flash.y);
        ctx.rotate(flash.angle + Math.random() * 0.5 - 0.25); // Rotación aleatoria para dinamismo

        const alpha = (flash.vida / flash.vidaMax);
        const size = flash.size * alpha;

        // Gradiente para un efecto más brillante en el centro
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        grad.addColorStop(0, `rgba(255, 255, 220, ${alpha})`);
        grad.addColorStop(0.3, `rgba(255, 220, 180, ${alpha * 0.8})`);
        grad.addColorStop(1, `rgba(255, 180, 100, 0)`);
        ctx.fillStyle = grad;

        // Dibujar una estrella de 4 puntas
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.3, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // --- Dibuja el Láser ---
    if (estadoJuego.laserActivo) {
        // Usa las coordenadas de renderizado (px, py) que incluyen el efecto de flotación.
        const cannon = getCannonTransform(px, py, jugador, estadoJuego);
        const isLevel5 = estadoJuego.nivel === 5;
        const energyRatio = estadoJuego.laserEnergia / estadoJuego.laserMaxEnergia;
        const time = estadoJuego.tiempoTranscurrido;
        const baseWidth = 20;
        const pulse = Math.sin(time * 60) * 3;
        const beamWidth = (baseWidth + pulse) * energyRatio;

        const laserStartX = cannon.x;
        const laserStartY = cannon.y;
        const angle = cannon.angle;
        // Usamos una longitud grande para que siempre se salga de la pantalla.
        const length = W * 1.5;

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
        // El origen del garfio también debe usar las coordenadas de renderizado.
        const cannon = getCannonTransform(px, py, jugador, estadoJuego);
        const hx0 = cannon.x;
        const hy0 = cannon.y;
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
        ctx.rotate(Math.atan2(jugador.garra.dy, jugador.garra.dx));
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
        ctx.rotate(t.angle);
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

    // --- Dibuja Proyectiles (con efecto Tracer) ---
    for (const p of proyectiles) {
        // Los proyectiles del menú no necesitan el efecto complejo
        if (p.isMenuEffect) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
            continue;
        }

        ctx.save();
        
        const tailLength = p.w * 3.5;
        const angle = Math.atan2(p.vy, p.vx);
        const alpha = p.vida / (p.vidaMax || 1.0);
        
        // Mover el canvas al punto de la punta de la bala
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);

        // El shadow simula el resplandor exterior
        ctx.shadowColor = `rgba(255, 221, 119, ${alpha * 0.8})`;
        ctx.shadowBlur = 12;

        // --- OPTIMIZACIÓN: Dibujar con rectángulos en lugar de gradientes ---
        // Es mucho más rápido que crear un gradiente por cada bala.

        // 1. Dibujar la estela (cola) con un color semitransparente
        ctx.fillStyle = `rgba(255, 235, 205, ${alpha * 0.6})`;
        ctx.fillRect(-tailLength, -p.h / 2, tailLength, p.h);

        // 2. Dibujar el cuerpo principal de la bala
        ctx.fillStyle = `rgba(255, 221, 119, ${alpha * 0.9})`;
        ctx.fillRect(-p.w, -p.h / 2, p.w, p.h);

        // 3. Dibujar la punta blanca y brillante para dar el efecto de "cabeza caliente"
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(0, -p.h / 2, p.w * 0.5, p.h);

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