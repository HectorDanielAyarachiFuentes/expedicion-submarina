'use strict';

// =================================================================================
//  SISTEMA DE CRIATURAS MARINAS E IA DE COMBATE (MÓDULO DESACOPLADO)
// =================================================================================

import { clamp, lerp } from './utils.js';
import {
    calcularFuerzasCardumen,
    calcularFuerzaHuida,
    alertarPecesCercanos,
    calcularAnguloFlanqueoTiburon,
    calcularPosicionCercoOrca,
    CARDUMEN_RADIO_HUIDA,
    CARDUMEN_VELOCIDAD_MAX
} from './ai.js';
import { generarParticula, generarTrozoBallena } from './particles.js';
import {
    SHARK_SPRITE_DATA,
    WHALE_SPRITE_DATA,
    MIERDEI_SPRITE_DATA,
    BABYWHALE_SPRITE_DATA,
    ORCA_SPRITE_DATA
} from './assets.js';

const SHARK_ANIMATION_SPEED = 0.05;
const WHALE_ANIMATION_SPEED = 0.08;
const MIERDEi_ANIMATION_SPEED = 0.06;
const BABYWHALE_ANIMATION_SPEED = 0.07;
const ORCA_ANIMATION_SPEED = 0.06;

/**
 * Actualiza el movimiento, máquinas de estado de IA y colisiones de todas las criaturas activas.
 */
export function actualizarCriaturas(dt, ctxData) {
    const {
        animales,
        jugador,
        estadoJuego,
        W,
        H,
        S,
        Levels,
        proyectilesEnemigos,
        particulasBurbujas,
        infligirDanoJugador,
        generarExplosion,
        generarChorroDeAgua,
        generarBurbujasEmbestidaTiburom,
        generarGotasSangre,
        generarBurbujasDeSangre,
        velocidadActual = () => 200,
        perderJuego = () => {}
    } = ctxData;

    if (!Array.isArray(animales) || !estadoJuego || !jugador) return;
    const usaCamera = estadoJuego.levelFlags && estadoJuego.levelFlags.scrollBackground !== false;

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
}
