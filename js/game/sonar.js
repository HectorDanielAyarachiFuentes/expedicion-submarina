'use strict';

// =================================================================================
//  SISTEMA DE RADAR Y SONAR SUBMARINO (MÓDULO DESACOPLADO)
// =================================================================================

import { clamp } from './utils.js';

export const SONAR_SWEEP_SPEED = 2.0; // Radianes por segundo para el barrido del sonar
export const SONAR_RADIUS = 65;       // Radio en píxeles del minimapa
export const SONAR_WORLD_RADIUS = 2800; // Radio en unidades del juego que cubre el sonar
export const PADDING = 20;

/**
 * Precalcula y recopila los pings en el rango del sonar acústico.
 */
export function actualizarSonarPings({ estadoJuego, jugador, animales, escombros, Weapons, proyectilesEnemigos, W }) {
    if (!estadoJuego) return;

    estadoJuego.sonarPings = [];
    estadoJuego.sonarPings.push({ tipo: 'jugador' });

    // Animales
    if (Array.isArray(animales) && jugador) {
        for (const a of animales) {
            const dx = a.x - jugador.x;
            const dy = a.y - jugador.y;
            if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                const isHostile = a.hp !== undefined || a.tipo === 'shark' || a.tipo === 'mega_whale' || a.tipo === 'mierdei' || a.tipo === 'orca';
                const isBoss = a.tipo === 'mega_whale' || (estadoJuego.jefe && a === estadoJuego.jefe);
                estadoJuego.sonarPings.push({ tipo: 'animal', dx, dy, isHostile, isBoss });
            }
        }
    }

    // Jefe (si existe y no está en la lista de animales)
    if (estadoJuego.jefe && jugador && (!animales || !animales.includes(estadoJuego.jefe))) {
        const dx = estadoJuego.jefe.x - jugador.x;
        const dy = estadoJuego.jefe.y - jugador.y;
        if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
            estadoJuego.sonarPings.push({ tipo: 'animal', dx, dy, isHostile: true, isBoss: true });
        }
    }

    // Proyectiles y Minas
    if (Weapons && jugador) {
        const proyectilGrupos = [
            { lista: Weapons.proyectiles || [], tipo: 'proyectil_jugador' },
            { lista: Weapons.torpedos || [], tipo: 'torpedo_jugador' },
            { lista: proyectilesEnemigos || [], tipo: 'proyectil_enemigo' },
            { lista: Weapons.minas || [], tipo: 'mina' }
        ];
        for (const grupo of proyectilGrupos) {
            for (const p of grupo.lista) {
                const dx = p.x - jugador.x;
                const dy = p.y - jugador.y;
                if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                    const pingData = { tipo: grupo.tipo, dx, dy };
                    if (p.vx !== undefined) { pingData.vx = p.vx; pingData.vy = p.vy; }
                    if (p.angle !== undefined) pingData.angle = p.angle;
                    estadoJuego.sonarPings.push(pingData);
                }
            }
        }
    }

    // Escombros
    if (Array.isArray(escombros) && jugador) {
        for (const e of escombros) {
            const dx = e.x - jugador.x;
            const dy = e.y - jugador.y;
            if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                estadoJuego.sonarPings.push({ tipo: 'escombro', dx, dy, tamano: (e.tamano || e.size) });
            }
        }
    }

    // Ataques especiales (Láser, Kraken)
    if (estadoJuego.laserActivo && jugador) {
        const isLevel5 = estadoJuego.nivel === 5;
        const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
        const laserAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);
        estadoJuego.sonarPings.push({ tipo: 'laser_jugador', angle: laserAngle });
    }
    if (estadoJuego.jefe && estadoJuego.jefe.lasers && jugador) {
        for (const laser of estadoJuego.jefe.lasers) {
            const dx1 = laser.x - jugador.x;
            const dy1 = laser.y - jugador.y;
            if (Math.hypot(dx1, dy1) < SONAR_WORLD_RADIUS) {
                let endWorldX, endWorldY;
                if (laser.tipo === 'sweep') {
                    endWorldX = laser.x + Math.cos(laser.currentAngle) * laser.length;
                    endWorldY = laser.y + Math.sin(laser.currentAngle) * laser.length;
                } else {
                    endWorldX = laser.targetX;
                    endWorldY = laser.targetY;
                }
                const dx2 = endWorldX - jugador.x;
                const dy2 = endWorldY - jugador.y;
                estadoJuego.sonarPings.push({ tipo: 'laser_enemigo', dx1, dy1, dx2, dy2 });
            }
        }
    }
    if (estadoJuego.nivel === 3 && estadoJuego.jefe && jugador) {
        if (Array.isArray(estadoJuego.proyectilesTinta)) {
            for (const ink of estadoJuego.proyectilesTinta) {
                const dx = ink.x - jugador.x;
                const dy = ink.y - jugador.y;
                if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                    estadoJuego.sonarPings.push({ tipo: 'tinta_kraken', dx, dy });
                }
            }
        }
        if (estadoJuego.jefe.estado === 'attacking_smash' && estadoJuego.jefe.datosAtaque) {
            const ataque = estadoJuego.jefe.datosAtaque;
            const dy = ataque.y - jugador.y;
            if (ataque.carga > 0) {
                estadoJuego.sonarPings.push({ tipo: 'rayo_kraken', dy });
            } else {
                const tentacleWorldX = (W || 1200) - ataque.progreso * ((W || 1200) + 200);
                const dx = tentacleWorldX - jugador.x;
                estadoJuego.sonarPings.push({ tipo: 'barrido_kraken', dx, dy });
            }
        }
    }
}

/**
 * Renderiza la interfaz táctica del sonar circular y los ecos de proximidad.
 */
export function dibujarSonar({ sonarCtx, estadoJuego, jugador, animales, escombros, Weapons, proyectilesEnemigos, W, H }) {
    if (!sonarCtx || !estadoJuego || !estadoJuego.enEjecucion || !estadoJuego.sonarActivo) {
        if (sonarCtx) sonarCtx.clearRect(0, 0, W, H);
        return;
    }

    sonarCtx.clearRect(0, 0, W, H);
    sonarCtx.save();

    const centerX = W - SONAR_RADIUS - PADDING;
    const centerY = H - SONAR_RADIUS - PADDING;
    const time = estadoJuego.tiempoTranscurrido;

    // Crear la forma base (Octágono)
    const octagonPath = new Path2D();
    const sides = 8;
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / sides;
        const x = centerX + SONAR_RADIUS * Math.cos(angle);
        const y = centerY + SONAR_RADIUS * Math.sin(angle);
        if (i === 0) octagonPath.moveTo(x, y);
        else octagonPath.lineTo(x, y);
    }
    octagonPath.closePath();

    sonarCtx.save();
    sonarCtx.clip(octagonPath);

    const bgGrad = sonarCtx.createLinearGradient(centerX - SONAR_RADIUS, centerY - SONAR_RADIUS, centerX + SONAR_RADIUS, centerY + SONAR_RADIUS);
    bgGrad.addColorStop(0, 'rgba(0, 59, 142, 0.7)');
    bgGrad.addColorStop(1, 'rgba(6, 19, 31, 0.5)');
    sonarCtx.fillStyle = bgGrad;
    sonarCtx.fill(octagonPath);

    // Retícula
    sonarCtx.strokeStyle = 'rgba(126, 203, 255, 0.2)';
    sonarCtx.lineWidth = 1;
    sonarCtx.setLineDash([2, 4]);
    for (let i = 1; i <= 3; i++) {
        const radius = SONAR_RADIUS * (i / 3);
        sonarCtx.beginPath();
        for (let j = 0; j < sides; j++) {
            const angle = (j / sides) * Math.PI * 2 - Math.PI / sides;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (j === 0) sonarCtx.moveTo(x, y);
            else sonarCtx.lineTo(x, y);
        }
        sonarCtx.closePath();
        sonarCtx.stroke();
    }
    sonarCtx.setLineDash([]);

    sonarCtx.lineWidth = 0.5;
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / sides;
        sonarCtx.beginPath();
        sonarCtx.moveTo(centerX, centerY);
        sonarCtx.lineTo(centerX + Math.cos(angle) * SONAR_RADIUS, centerY + Math.sin(angle) * SONAR_RADIUS);
        sonarCtx.stroke();
    }

    // Barrido
    const sweepAngle = (time * SONAR_SWEEP_SPEED) % (Math.PI * 2);
    const grad = sonarCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, SONAR_RADIUS);
    grad.addColorStop(0, 'rgba(120, 255, 170, 0.3)');
    grad.addColorStop(0.8, 'rgba(100, 255, 150, 0.05)');
    grad.addColorStop(1, 'rgba(100, 255, 150, 0)');
    sonarCtx.fillStyle = grad;
    sonarCtx.beginPath();
    sonarCtx.moveTo(centerX, centerY);
    sonarCtx.arc(centerX, centerY, SONAR_RADIUS, sweepAngle - Math.PI / 2, sweepAngle);
    sonarCtx.closePath();
    sonarCtx.fill();

    sonarCtx.strokeStyle = 'rgba(170, 255, 200, 0.9)';
    sonarCtx.lineWidth = 2;
    sonarCtx.beginPath();
    sonarCtx.moveTo(centerX, centerY);
    sonarCtx.lineTo(centerX + Math.cos(sweepAngle) * SONAR_RADIUS, centerY + Math.sin(sweepAngle) * SONAR_RADIUS);
    sonarCtx.stroke();

    // Cruz del jugador
    sonarCtx.fillStyle = '#87CEEB';
    sonarCtx.fillRect(centerX - 6, centerY - 1.5, 12, 3);
    sonarCtx.fillRect(centerX - 1.5, centerY - 6, 3, 12);

    // Ecos de animales
    if (Array.isArray(animales) && jugador) {
        for (const a of animales) {
            const dx = a.x - jugador.x;
            const dy = a.y - jugador.y;
            const dist = Math.hypot(dx, dy);

            if (dist < SONAR_WORLD_RADIUS) {
                const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;

                const isHostile = a.hp !== undefined || a.tipo === 'shark' || a.tipo === 'mega_whale' || a.tipo === 'mierdei' || a.tipo === 'orca';
                const isBoss = a.tipo === 'mega_whale' || (estadoJuego.jefe && a === estadoJuego.jefe);

                const pulse = 1.0 + Math.sin(time * 5 + pingX) * 0.2;
                const pingSize = (isBoss ? 6 : (isHostile ? 4 : 3)) * pulse;

                sonarCtx.fillStyle = isHostile ? 'rgba(255, 80, 80, 0.9)' : 'rgba(100, 255, 150, 0.9)';

                sonarCtx.save();
                sonarCtx.translate(pingX, pingY);
                if (isHostile) {
                    sonarCtx.rotate(Math.PI / 4);
                    sonarCtx.fillRect(-pingSize / 2, -pingSize / 2, pingSize, pingSize);
                } else {
                    sonarCtx.beginPath();
                    sonarCtx.arc(0, 0, pingSize / 2, 0, Math.PI * 2);
                    sonarCtx.fill();
                }
                sonarCtx.restore();
            }
        }
    }

    // Jefe
    if (estadoJuego.jefe && jugador) {
        const dx = estadoJuego.jefe.x - jugador.x;
        const dy = estadoJuego.jefe.y - jugador.y;
        const dist = Math.hypot(dx, dy);
        if (dist < SONAR_WORLD_RADIUS) {
            const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;

            sonarCtx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
            sonarCtx.lineWidth = 2;
            const pulse = 1.0 + Math.sin(time * 3) * 0.1;
            const size = 16 * pulse;
            sonarCtx.strokeRect(pingX - size / 2, pingY - size / 2, size, size);
        }
    }

    // Proyectiles y Armas
    if (Weapons && jugador) {
        if (Array.isArray(Weapons.proyectiles)) {
            sonarCtx.fillStyle = 'rgba(200, 220, 255, 0.9)';
            for (const p of Weapons.proyectiles) {
                const dx = p.x - jugador.x;
                const dy = p.y - jugador.y;
                if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                    const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    const angle = Math.atan2(p.vy, p.vx);
                    sonarCtx.save();
                    sonarCtx.translate(pingX, pingY);
                    sonarCtx.rotate(angle);
                    sonarCtx.fillRect(-2, -1, 4, 2);
                    sonarCtx.restore();
                }
            }
        }

        if (Array.isArray(Weapons.torpedos)) {
            sonarCtx.fillStyle = 'rgba(170, 230, 255, 1.0)';
            for (const t of Weapons.torpedos) {
                const dx = t.x - jugador.x;
                const dy = t.y - jugador.y;
                if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                    const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    sonarCtx.save();
                    sonarCtx.translate(pingX, pingY);
                    sonarCtx.rotate(t.angle || 0);
                    sonarCtx.fillRect(-3, -1.5, 6, 3);
                    sonarCtx.restore();
                }
            }
        }

        if (Array.isArray(Weapons.minas)) {
            sonarCtx.fillStyle = 'rgba(255, 180, 50, 0.9)';
            for (const m of Weapons.minas) {
                const dx = m.x - jugador.x;
                const dy = m.y - jugador.y;
                if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                    const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    const pulse = Math.floor(time * 3) % 2;
                    if (pulse === 0) continue;
                    sonarCtx.fillRect(pingX - 2, pingY - 2, 4, 4);
                }
            }
        }
    }

    if (Array.isArray(proyectilesEnemigos) && jugador) {
        sonarCtx.fillStyle = 'rgba(255, 150, 150, 0.9)';
        for (const p of proyectilesEnemigos) {
            const dx = p.x - jugador.x;
            const dy = p.y - jugador.y;
            if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                sonarCtx.beginPath();
                sonarCtx.arc(pingX, pingY, 2, 0, Math.PI * 2);
                sonarCtx.fill();
            }
        }
    }

    // Láser del jugador
    if (estadoJuego.laserActivo && jugador) {
        const isLevel5 = estadoJuego.nivel === 5;
        const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
        const laserAngle = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);
        const pulse = 0.8 + Math.sin(time * 40) * 0.2;
        sonarCtx.strokeStyle = `rgba(255, 100, 100, ${pulse})`;
        sonarCtx.lineWidth = 3;
        sonarCtx.beginPath();
        sonarCtx.moveTo(centerX, centerY);
        sonarCtx.lineTo(centerX + Math.cos(laserAngle) * SONAR_RADIUS, centerY + Math.sin(laserAngle) * SONAR_RADIUS);
        sonarCtx.stroke();
    }

    // Escombros
    if (Array.isArray(escombros) && jugador) {
        sonarCtx.fillStyle = 'rgba(160, 140, 120, 0.7)';
        for (const e of escombros) {
            const dx = e.x - jugador.x;
            const dy = e.y - jugador.y;
            if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                const size = clamp((e.tamano || e.size || 20) / 20, 2, 5);
                sonarCtx.fillRect(pingX - size / 2, pingY - size / 2, size, size);
            }
        }
    }

    // Láseres del jefe
    if (estadoJuego.jefe && estadoJuego.jefe.lasers && jugador) {
        const pulse = 0.7 + Math.sin(time * 20) * 0.3;
        sonarCtx.strokeStyle = `rgba(255, 120, 120, ${pulse})`;
        sonarCtx.lineWidth = 1.5;
        for (const laser of estadoJuego.jefe.lasers) {
            const dx1 = laser.x - jugador.x;
            const dy1 = laser.y - jugador.y;
            if (Math.hypot(dx1, dy1) < SONAR_WORLD_RADIUS) {
                const startPingX = centerX + (dx1 / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                const startPingY = centerY + (dy1 / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                let endPingX, endPingY;
                if (laser.tipo === 'sweep') {
                    const endWorldX = laser.x + Math.cos(laser.currentAngle) * laser.length;
                    const endWorldY = laser.y + Math.sin(laser.currentAngle) * laser.length;
                    endPingX = centerX + ((endWorldX - jugador.x) / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    endPingY = centerY + ((endWorldY - jugador.y) / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                } else {
                    endPingX = centerX + ((laser.targetX - jugador.x) / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    endPingY = centerY + ((laser.targetY - jugador.y) / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                }
                sonarCtx.beginPath();
                sonarCtx.moveTo(startPingX, startPingY);
                sonarCtx.lineTo(endPingX, endPingY);
                sonarCtx.stroke();
            }
        }
    }

    // Ataques del Kraken
    if (estadoJuego.nivel === 3 && estadoJuego.jefe && jugador) {
        const jefe = estadoJuego.jefe;
        if (Array.isArray(estadoJuego.proyectilesTinta)) {
            sonarCtx.fillStyle = 'rgba(50, 50, 50, 0.8)';
            for (const ink of estadoJuego.proyectilesTinta) {
                const dx = ink.x - jugador.x;
                const dy = ink.y - jugador.y;
                if (Math.hypot(dx, dy) < SONAR_WORLD_RADIUS) {
                    const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                    sonarCtx.beginPath();
                    sonarCtx.arc(pingX, pingY, 4, 0, Math.PI * 2);
                    sonarCtx.fill();
                }
            }
        }
        if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
            const ataque = jefe.datosAtaque;
            const dy = ataque.y - jugador.y;
            const pingY = centerY + (dy / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
            if (ataque.carga > 0) {
                const pulse = 0.5 + Math.sin(time * 15) * 0.5;
                sonarCtx.strokeStyle = `rgba(255, 80, 80, ${pulse})`;
                sonarCtx.lineWidth = 3;
                sonarCtx.beginPath();
                sonarCtx.moveTo(centerX - SONAR_RADIUS, pingY);
                sonarCtx.lineTo(centerX + SONAR_RADIUS, pingY);
                sonarCtx.stroke();
            } else {
                const tentacleWorldX = (W || 1200) - ataque.progreso * ((W || 1200) + 200);
                const dx = tentacleWorldX - jugador.x;
                const pingX = centerX + (dx / SONAR_WORLD_RADIUS) * SONAR_RADIUS;
                const pulse = 1.0 + Math.sin(time * 10) * 0.2;
                const pingSize = 12 * pulse;
                sonarCtx.fillStyle = 'rgba(255, 60, 60, 0.9)';
                sonarCtx.save();
                sonarCtx.translate(pingX, pingY);
                sonarCtx.rotate(Math.PI / 4);
                sonarCtx.fillRect(-pingSize / 2, -pingSize / 2, pingSize, pingSize);
                sonarCtx.restore();
            }
        }
    }

    sonarCtx.restore();

    // Borde exterior y acentos
    sonarCtx.strokeStyle = 'rgba(126, 203, 255, 0.6)';
    sonarCtx.lineWidth = 2;
    sonarCtx.stroke(octagonPath);

    sonarCtx.strokeStyle = 'rgba(255, 221, 119, 1)';
    sonarCtx.lineWidth = 4;
    sonarCtx.beginPath();
    const angle1 = (0 / sides) * Math.PI * 2 - Math.PI / sides;
    const angle2 = (1 / sides) * Math.PI * 2 - Math.PI / sides;
    sonarCtx.moveTo(centerX + SONAR_RADIUS * Math.cos(angle1), centerY + SONAR_RADIUS * Math.sin(angle1));
    sonarCtx.lineTo(centerX + SONAR_RADIUS * Math.cos(angle2), centerY + SONAR_RADIUS * Math.sin(angle2));
    sonarCtx.stroke();

    sonarCtx.restore();
}
