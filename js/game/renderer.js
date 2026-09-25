'use strict';

// =================================================================================
//  SISTEMA DE RENDERIZADO Y MOTOR GRÁFICO (MÓDULO DESACOPLADO)
// =================================================================================

import { clamp, lerp } from './utils.js';
import * as Weapons from './armas/weapons.js';
import {
    whaleListo,
    orcaListo,
    sharkListo,
    criaturasListas,
    cFilas,
    cFrameAncho,
    cFrameAlto,
    mierdeiListo,
    mierdeiImg,
    sharkImg,
    whaleImg,
    babyWhaleListo,
    babyWhaleImg,
    orcaImg,
    criaturasImg,
    dibujarHector,
    dibujarSpriteConTinte,
    BABYWHALE_SPRITE_DATA,
    ORCA_SPRITE_DATA,
    SHARK_SPRITE_DATA,
    WHALE_SPRITE_DATA,
    MIERDEI_SPRITE_DATA
} from './assets.js';

export function dibujarPiloto(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotacion);
    ctx.scale(p.escala, p.escala);

    ctx.fillStyle = '#ffccaa';
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(2, -6, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.roundRect(-4, -1, 8, 10, 2);
    ctx.fill();

    const legAngle = Math.sin(p.rotacion * 2) * 0.4;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-2, 9);
    ctx.lineTo(-2 + Math.sin(legAngle) * 6, 15);
    ctx.moveTo(2, 9);
    ctx.lineTo(2 - Math.sin(legAngle) * 6, 15);
    ctx.stroke();

    const armAngle = Math.cos(p.rotacion * 2) * 0.6;
    ctx.beginPath();
    ctx.moveTo(-4, 1);
    ctx.lineTo(-7, 5 + Math.sin(armAngle) * 4);
    ctx.moveTo(4, 1);
    ctx.lineTo(7, 5 - Math.sin(armAngle) * 4);
    ctx.stroke();

    ctx.restore();
}

export function iniciarPolvoMarino(particulasPolvoMarino, W, H) {
    if (!Array.isArray(particulasPolvoMarino)) return;
    particulasPolvoMarino.length = 0;
    for (let i = 0; i < 150; i++) {
        particulasPolvoMarino.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() * 20) + 5,
            r: Math.random() * 2 + 1,
            alpha: Math.random() * 0.4 + 0.1
        });
    }
}

export function actualizarPolvoMarino(particulasPolvoMarino, W, H, dt, velocidadActual = 120) {
    if (!Array.isArray(particulasPolvoMarino)) return;
    for (const p of particulasPolvoMarino) {
        p.x += (p.vx - velocidadActual * 0.5) * dt;
        p.y += p.vy * dt;

        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
    }
}

export function dibujarPolvoMarino() {
    // La lógica de renderizado está integrada en dibujarMascaraLuz para efecto volumétrico
}

export function dibujarCasquillos(ctx, particulasCasquillos) {
    if (!ctx || !Array.isArray(particulasCasquillos)) return;
    ctx.save();
    for (const c of particulasCasquillos) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotacion);

        const alpha = Math.min(1, c.vida / (c.vidaMax * 0.5));
        ctx.globalAlpha = alpha;

        ctx.fillStyle = c.color;
        ctx.strokeStyle = '#a17b3a';
        ctx.lineWidth = 1;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);

        ctx.fillStyle = '#3b2e1e';
        ctx.beginPath();
        ctx.arc(c.w / 2 - 1, 0, c.h / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

export function dibujarFondoParallax(ctxData) {
    const {
        estadoJuego,
        bgCtx,
        W,
        H,
        bgImg,
        bgListo,
        bgAncho,
        bgAlto,
        fgImg,
        fgListo,
        fgAncho,
        fgAlto,
        bgOffset,
        fgOffset,
        bgOffsetY,
        fgOffsetY
    } = ctxData;

    if (!estadoJuego || !bgCtx) return;

    const factor = estadoJuego.dayNightFactor || 0;
    const r = Math.round(26 + (6 - 26) * factor);
    const g = Math.round(75 + (19 - 75) * factor);
    const b = Math.round(110 + (31 - 110) * factor);

    bgCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    bgCtx.fillRect(0, 0, W, H);

    const isLevel5 = estadoJuego.nivel === 5;

    if (bgListo && bgAncho > 0) {
        bgCtx.imageSmoothingEnabled = false;
        const bgZoomFactor = 1.0;
        const ratio = bgAncho / bgAlto;
        const alturaDibujoBg = Math.ceil(H * bgZoomFactor);
        const anchoDibujoBg = Math.ceil(alturaDibujoBg * ratio);

        let subBgOffset = bgOffset % anchoDibujoBg;
        if (subBgOffset < 0) subBgOffset += anchoDibujoBg;
        const startX = -Math.floor(subBgOffset);

        if (isLevel5) {
            const tileH = alturaDibujoBg;
            const baseWorldIndex = Math.floor(bgOffsetY / tileH);
            const subY = bgOffsetY % tileH;

            for (let x = startX; x < W; x += anchoDibujoBg) {
                for (let i = -1; i <= 2; i++) {
                    const tileWorldIndex = baseWorldIndex - i;
                    const isNormal = Math.abs(tileWorldIndex % 2) === 0;
                    const tileY = Math.floor(H - tileH) + subY - (i * tileH);

                    bgCtx.save();
                    if (!isNormal) {
                        bgCtx.translate(0, tileY + tileH);
                        bgCtx.scale(1, -1);
                        bgCtx.drawImage(bgImg, x, 0, anchoDibujoBg, tileH);
                    } else {
                        bgCtx.drawImage(bgImg, x, tileY, anchoDibujoBg, tileH);
                    }
                    bgCtx.restore();
                }
            }
        } else {
            for (let x = startX; x < W; x += anchoDibujoBg) {
                bgCtx.drawImage(bgImg, x, Math.floor(H - alturaDibujoBg), anchoDibujoBg, alturaDibujoBg);
            }
        }
    }

    if (fgListo && fgAncho > 0) {
        bgCtx.imageSmoothingEnabled = false;
        const fgZoomFactor = 1.0;
        const ratioFg = fgAncho / fgAlto;
        const alturaDibujoFg = Math.ceil(H * fgZoomFactor);
        const anchoDibujoFg = Math.ceil(alturaDibujoFg * ratioFg);

        let subFgOffset = fgOffset % anchoDibujoFg;
        if (subFgOffset < 0) subFgOffset += anchoDibujoFg;
        const startXFg = -Math.floor(subFgOffset);

        if (isLevel5) {
            const tileH = alturaDibujoFg;
            const baseWorldIndex = Math.floor(fgOffsetY / tileH);
            const subY = fgOffsetY % tileH;

            for (let x = startXFg; x < W; x += anchoDibujoFg) {
                for (let i = -1; i <= 2; i++) {
                    const tileWorldIndex = baseWorldIndex - i;
                    const isNormal = Math.abs(tileWorldIndex % 2) === 0;
                    const tileY = Math.floor(H - tileH) + subY - (i * tileH);

                    bgCtx.save();
                    if (!isNormal) {
                        bgCtx.translate(0, tileY + tileH);
                        bgCtx.scale(1, -1);
                        bgCtx.drawImage(fgImg, x, 0, anchoDibujoFg, tileH);
                    } else {
                        bgCtx.drawImage(fgImg, x, tileY, anchoDibujoFg, tileH);
                    }
                    bgCtx.restore();
                }
            }
        } else {
            for (let x = startXFg; x < W; x += anchoDibujoFg) {
                bgCtx.drawImage(fgImg, x, Math.floor(H - alturaDibujoFg), anchoDibujoFg, alturaDibujoFg);
            }
        }
    }
}

export function dibujarMascaraLuz(ctxData) {
    const {
        estadoJuego,
        fx,
        jugador,
        W,
        H,
        spriteAlto,
        robotEscala,
        particulasPolvoMarino
    } = ctxData;

    if (!estadoJuego || !fx) return;
    fx.clearRect(0, 0, W, H);
    const isLevel5 = estadoJuego.nivel === 5;

    const CYCLE_DURATION = 180;
    const cyclePhase = (estadoJuego.tiempoTranscurrido % CYCLE_DURATION) / CYCLE_DURATION * Math.PI * 2;
    const cycleFactor = (Math.sin(cyclePhase - Math.PI / 2) + 1) / 2;

    const MAX_DARKNESS = 0.65;
    const oscuridadObjetivo = estadoJuego.darknessOverride !== undefined
        ? estadoJuego.darknessOverride
        : cycleFactor;

    const alpha = lerp(0, MAX_DARKNESS, clamp(oscuridadObjetivo, 0, 1));
    estadoJuego.dayNightFactor = cycleFactor;

    if (alpha <= 0.001) return;

    fx.globalCompositeOperation = 'source-over';
    fx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(3) + ')';
    fx.fillRect(0, 0, W, H);

    if (estadoJuego.luzVisible && jugador && estadoJuego.enEjecucion) {
        const screenPx = jugador.x - Math.round(estadoJuego.cameraX);
        const screenPy = jugador.y - Math.round(estadoJuego.cameraY);

        const px = screenPx;
        const py = screenPy;

        const anguloBase = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
        const ang = anguloBase + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);

        const ux = Math.cos(ang), uy = Math.sin(ang);
        const vx = -Math.sin(ang), vy = Math.cos(ang);
        const ax = Math.round(px + ux * (spriteAlto * robotEscala * 0.5 - 11));
        const ay = Math.round(py + uy * (spriteAlto * robotEscala * 0.5 - 11));

        const time = estadoJuego.tiempoTranscurrido;
        const flicker = 1.0 + Math.sin(time * 20) * 0.02;

        let powerDrawAlpha = 1.0;
        if (estadoJuego.laserActivo || estadoJuego.shieldActivo) {
            powerDrawAlpha = 0.75 + Math.sin(time * 70) * 0.25;
        }

        const L = (isLevel5 ? Math.min(H * 0.65, 560) : Math.min(W * 0.65, 560)) * flicker;
        const theta = (Math.PI / 9) * (1.0 + Math.sin(time * 2) * 0.05);
        const endx = ax + ux * L, endy = ay + uy * L;
        const half = Math.tan(theta) * L;
        const pTopX = endx + vx * half, pTopY = endy + vy * half;
        const pBotX = endx - vx * half, pBotY = endy - vy * half;

        const conePath = new Path2D();
        conePath.moveTo(ax, ay);
        conePath.lineTo(pTopX, pTopY);
        conePath.lineTo(pBotX, pBotY);
        conePath.closePath();

        fx.globalCompositeOperation = 'destination-out';
        const g = fx.createLinearGradient(ax, ay, endx, endy);
        g.addColorStop(0.00, `rgba(255,255,255,${1.0 * powerDrawAlpha})`);
        g.addColorStop(0.45, `rgba(255,255,255,${0.5 * powerDrawAlpha})`);
        g.addColorStop(1.00, 'rgba(255,255,255,0.0)');
        fx.fillStyle = g;
        fx.fill(conePath);

        const rg = fx.createRadialGradient(ax, ay, 0, ax, ay, 54 * flicker);
        rg.addColorStop(0, `rgba(255,255,255,${1.0 * powerDrawAlpha})`);
        rg.addColorStop(1, 'rgba(255,255,255,0.0)');
        fx.fillStyle = rg;
        fx.beginPath();
        fx.arc(ax, ay, 54 * flicker, 0, Math.PI * 2);
        fx.fill();

        fx.globalCompositeOperation = 'lighter';

        const gGlow = fx.createLinearGradient(ax, ay, endx, endy);
        gGlow.addColorStop(0.00, `rgba(200,220,255,${0.15 * powerDrawAlpha})`);
        gGlow.addColorStop(0.60, `rgba(200,220,255,${0.06 * powerDrawAlpha})`);
        gGlow.addColorStop(1.00, 'rgba(200,220,255,0.00)');
        fx.fillStyle = gGlow;
        fx.fill(conePath);

        const flareRadius = 25 * flicker;
        const flareGradient = fx.createRadialGradient(ax, ay, 0, ax, ay, flareRadius);
        flareGradient.addColorStop(0, `rgba(255, 255, 230, ${0.4 * powerDrawAlpha})`);
        flareGradient.addColorStop(0.3, `rgba(255, 255, 230, ${0.1 * powerDrawAlpha})`);
        flareGradient.addColorStop(1, 'rgba(255, 255, 230, 0)');
        fx.fillStyle = flareGradient;
        fx.beginPath();
        fx.arc(ax, ay, flareRadius, 0, Math.PI * 2);
        fx.fill();

        const numRays = 5;
        for (let i = 0; i < numRays; i++) {
            const rayAngleOffset = (Math.sin(time * 0.5 + i * 2) * 0.5 + 0.5) * (theta * 2) - theta;
            const rayAngle = ang + rayAngleOffset;
            const rayL = L * (1.0 + Math.random() * 0.2);
            const rayW = 1 + Math.random() * 2;
            const rayEndX = ax + Math.cos(rayAngle) * rayL;
            const rayEndY = ay + Math.sin(rayAngle) * rayL;
            const rayGrad = fx.createLinearGradient(ax, ay, rayEndX, rayEndY);
            rayGrad.addColorStop(0, `rgba(200, 220, 255, ${(0.05 + Math.random() * 0.05) * powerDrawAlpha})`);
            rayGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
            fx.strokeStyle = rayGrad;
            fx.lineWidth = rayW;
            fx.beginPath();
            fx.moveTo(ax, ay);
            fx.lineTo(rayEndX, rayEndY);
            fx.stroke();
        }

        if (Array.isArray(particulasPolvoMarino)) {
            fx.save();
            fx.clip(conePath);
            for (const p of particulasPolvoMarino) {
                const particleAlpha = (p.opacidad || p.alpha || 0.3) * (0.5 + (p.profundidad || 0.5) * 0.5);
                fx.fillStyle = `rgba(207, 233, 255, ${particleAlpha})`;
                fx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
            }
            fx.restore();
        }

        fx.globalCompositeOperation = 'source-over';
    }
}

/**
 * Renderiza todas las criaturas marinas con frustum culling.
 */
export function dibujarAnimales(ctx, ctxData) {
    const { animales, estadoJuego, W, H } = ctxData;
    if (!ctx || !Array.isArray(animales) || !estadoJuego) return;

    for (let i = 0; i < animales.length; i++) {
        const a = animales[i];
        const margin = 300;
        if (
            a.x + margin < estadoJuego.cameraX ||
            a.x - margin > estadoJuego.cameraX + W ||
            a.y + margin < estadoJuego.cameraY ||
            a.y - margin > estadoJuego.cameraY + H
        ) {
            continue;
        }

        const offsetFlotante = Math.sin(Math.PI * estadoJuego.tiempoTranscurrido * 0.8 + a.semillaFase) * 8;
        ctx.save();

        if (a.tipo === 'baby_whale') {
            ctx.translate(a.x, a.y + offsetFlotante);
            if (babyWhaleListo && BABYWHALE_SPRITE_DATA) {
                if (a.hp < a.maxHp) {
                    const damageRatio = a.hp / a.maxHp;
                    if (damageRatio < 0.5) {
                        ctx.filter = 'hue-rotate(-15deg) brightness(1.2) saturate(2)';
                    }
                }
                if (a.hp < a.maxHp) {
                    const barW = 60;
                    const barH = 5;
                    const barY = -a.h / 2.5 - 15;
                    ctx.fillStyle = '#555';
                    ctx.fillRect(-barW / 2, barY, barW, barH);
                    ctx.fillStyle = '#ff5c5c';
                    ctx.fillRect(-barW / 2, barY, barW * (a.hp / a.maxHp), barH);
                }
                const frameData = BABYWHALE_SPRITE_DATA.frames[a.frame];
                if (frameData) {
                    const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                    const aspectRatio = sWidth / sHeight;
                    const dHeight = a.w / aspectRatio;
                    ctx.imageSmoothingEnabled = false;
                    if (a.vx > 0) ctx.scale(-1, 1);
                    ctx.drawImage(babyWhaleImg, sx, sy, sWidth, sHeight,
                        Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                }
            }
        } else if (a.tipo === 'orca') {
            ctx.translate(a.x, a.y + offsetFlotante);
            if (orcaListo && ORCA_SPRITE_DATA) {
                if (a.isHunting || (a.hp < a.maxHp)) {
                    ctx.filter = 'hue-rotate(-10deg) brightness(1.2) saturate(1.5)';
                }
                if (a.hp < a.maxHp) {
                    const barW = 80;
                    const barH = 6;
                    const barY = -a.h / 2 - 15;
                    ctx.fillStyle = '#555';
                    ctx.fillRect(-barW / 2, barY, barW, barH);
                    ctx.fillStyle = '#ff5c5c';
                    ctx.fillRect(-barW / 2, barY, barW * (a.hp / a.maxHp), barH);
                }
                const frameData = ORCA_SPRITE_DATA.frames[a.frame];
                if (frameData) {
                    const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                    const aspectRatio = sWidth / sHeight;
                    const dHeight = a.w / aspectRatio;
                    ctx.imageSmoothingEnabled = false;
                    if (a.vx > 0) ctx.scale(-1, 1);
                    ctx.drawImage(orcaImg, sx, sy, sWidth, sHeight,
                        Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                }
            }
        } else if (a.tipo === 'whale') {
            ctx.translate(a.x, a.y + offsetFlotante);
            if (whaleListo && WHALE_SPRITE_DATA) {
                if (a.isEnraged) {
                    ctx.filter = 'hue-rotate(-20deg) brightness(1.3) saturate(2)';
                }
                if (a.hp < a.maxHp) {
                    const barW = 100;
                    const barH = 8;
                    const barY = -a.h / 2 - 20;
                    ctx.fillStyle = '#555';
                    ctx.fillRect(-barW / 2, barY, barW, barH);
                    ctx.fillStyle = a.isEnraged ? '#ff2222' : '#ff5c5c';
                    ctx.fillRect(-barW / 2, barY, barW * (a.hp / a.maxHp), barH);
                }
                const frameData = WHALE_SPRITE_DATA.frames[a.frame];
                if (frameData) {
                    const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                    const aspectRatio = sWidth / sHeight;
                    const dHeight = a.w / aspectRatio;
                    ctx.imageSmoothingEnabled = false;
                    if (a.vx > 0) ctx.scale(-1, 1);
                    ctx.drawImage(whaleImg, sx, sy, sWidth, sHeight,
                        Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                }
            }
        } else if (a.tipo === 'shark') {
            ctx.translate(a.x, a.y + offsetFlotante);
            if (sharkListo && SHARK_SPRITE_DATA) {
                if (a.hp < a.maxHp) {
                    const barW = 70;
                    const barH = 5;
                    const barY = -a.h / 2 - 15;
                    ctx.fillStyle = '#555';
                    ctx.fillRect(-barW / 2, barY, barW, barH);
                    ctx.fillStyle = '#ff5c5c';
                    ctx.fillRect(-barW / 2, barY, barW * (a.hp / a.maxHp), barH);
                }
                const frameData = SHARK_SPRITE_DATA.frames[a.frame];
                if (frameData) {
                    const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                    const aspectRatio = sWidth / sHeight;
                    const dHeight = a.w / aspectRatio;
                    ctx.imageSmoothingEnabled = false;
                    if (a.vx > 0) ctx.scale(-1, 1);
                    ctx.drawImage(sharkImg, sx, sy, sWidth, sHeight,
                        Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                }
            }
        } else if (a.tipo === 'mierdei') {
            ctx.translate(a.x, a.y + offsetFlotante);
            if (mierdeiListo && MIERDEI_SPRITE_DATA) {
                const frameData = MIERDEI_SPRITE_DATA.frames[a.frame];
                if (frameData) {
                    const { x: sx, y: sy, w: sWidth, h: sHeight } = frameData.rect;
                    const aspectRatio = sWidth / sHeight;
                    const dHeight = a.w / aspectRatio;
                    ctx.imageSmoothingEnabled = false;
                    if (a.vx > 0) ctx.scale(-1, 1);
                    ctx.drawImage(mierdeiImg, sx, sy, sWidth, sHeight,
                        Math.round(-a.w / 2), Math.round(-dHeight / 2), a.w, dHeight);
                }
            }
        } else {
            let tint = null;
            if (a.tipo === 'aggressive') tint = 'rgba(0, 100, 255, 0.4)';
            if (a.tipo === 'rojo') tint = 'rgba(255, 50, 50, 0.5)';
            if (a.tipo === 'disparador') tint = 'rgba(0, 255, 200, 0.4)';
            if (a.tipo === 'dorado') tint = 'rgba(255, 220, 100, 0.5)';

            if (criaturasListas && cFilas > 0) {
                const sx = (a.frame % 2) * cFrameAncho, sy = (a.fila % cFilas) * cFrameAlto;
                ctx.imageSmoothingEnabled = false;
                const dx = Math.round(a.x - a.w / 2);
                const dy = Math.round(a.y + offsetFlotante - a.h / 2);
                if (tint) {
                    dibujarSpriteConTinte(criaturasImg, sx, sy, cFrameAncho, cFrameAlto, dx, dy, a.w, a.h, tint);
                } else {
                    ctx.drawImage(criaturasImg, sx, sy, cFrameAncho, cFrameAlto, dx, dy, a.w, a.h);
                }
            } else {
                ctx.fillStyle = a.tipo === 'aggressive' ? '#ff5e5e' : '#ffd95e';
                ctx.beginPath();
                ctx.arc(a.x, a.y + offsetFlotante, a.r, 0, Math.PI * 2);
                ctx.fill();
            }

            if (a.tipo === 'disparador' && a.hp < a.maxHp) {
                const barW = 60;
                const barH = 5;
                const barX = a.x - barW / 2;
                const barY = a.y + offsetFlotante - a.h / 2 - 15;
                const hpRatio = a.hp / a.maxHp;
                ctx.fillStyle = '#555';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = hpRatio > 0.5 ? '#5cff5c' : (hpRatio > 0.2 ? '#ffc95c' : '#ff5c5c');
                ctx.fillRect(barX, barY, barW * hpRatio, barH);
            }
        }
        ctx.restore();
    }
}

/**
 * Renderiza al submarino del jugador, hélice, armas y escudo.
 */
export function dibujarJugadorSubmarino(ctx, ctxData) {
    const {
        jugador,
        estadoJuego,
        W,
        H,
        propellerReady,
        propellerImg,
        propellerCurrentSpeed,
        propellerRotation,
        spriteAncho,
        spriteAlto,
        robotEscala
    } = ctxData;

    if (!ctx || !jugador || !estadoJuego || !estadoJuego.enEjecucion) return;

    const isLevel5 = estadoJuego.nivel === 5;
    const bobbingY = Math.sin(estadoJuego.tiempoTranscurrido * 2.5) * 3;
    const px = jugador.x;
    const py = jugador.y + bobbingY;

    const baseAngle = isLevel5 ? -Math.PI / 2 : (jugador.direccion === -1 ? Math.PI : 0);
    const anguloFinal = baseAngle + (isLevel5 ? jugador.inclinacion : jugador.inclinacion * jugador.direccion);

    ctx.save();
    ctx.translate(px, py);
    if (isLevel5) {
        ctx.rotate(anguloFinal);
    } else {
        ctx.scale(jugador.direccion, 1);
        ctx.rotate(jugador.inclinacion * jugador.direccion);
    }

    // --- Hélice ---
    if (propellerReady && propellerImg) {
        ctx.save();
        const propOffsetX = -spriteAncho * robotEscala / 2 - 10;
        ctx.translate(propOffsetX, 0);
        const propSize = 40;

        ctx.save();
        ctx.fillStyle = '#4a555c';
        ctx.fillRect(0, -3, 20, 6);
        ctx.fillStyle = '#2d333b';
        ctx.fillRect(0, 1, 20, 2);
        ctx.fillStyle = '#6a737d';
        ctx.fillRect(14, -5, 8, 10);
        ctx.restore();

        if (propellerCurrentSpeed > 35) {
            ctx.globalAlpha = 0.35;
            ctx.save(); ctx.rotate(propellerRotation - 0.2); ctx.drawImage(propellerImg, -propSize / 2, -propSize / 2, propSize, propSize); ctx.restore();
            ctx.save(); ctx.rotate(propellerRotation + 0.2); ctx.drawImage(propellerImg, -propSize / 2, -propSize / 2, propSize, propSize); ctx.restore();
        }

        ctx.globalAlpha = 1.0;
        ctx.rotate(propellerRotation);
        ctx.drawImage(propellerImg, -propSize / 2, -propSize / 2, propSize, propSize);
        ctx.restore();
    }

    // --- Hector ---
    if (!estadoJuego.juegoPausadoPorDesconexion && !estadoJuego.juegoPausadoPorConexionMando) {
        const dt = 1/60;
        jugador.timerFrame += dt;
        if (jugador.timerFrame > 0.05) {
            jugador.frame = (jugador.frame + 1);
            jugador.timerFrame = 0;
        }
    }
    dibujarHector(ctx, 0, 0, 0.35, jugador.frame);

    // --- Carcasa de la Luz Frontal ---
    ctx.save();
    const lightDist = spriteAlto * robotEscala * 0.5 - 11;
    ctx.translate(lightDist - 5, 0);
    ctx.fillStyle = '#4a555c';
    ctx.fillRect(-4, -6, 6, 12);
    ctx.fillStyle = '#2d333b';
    ctx.fillRect(-4, 0, 6, 6);
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.moveTo(2, -8); ctx.lineTo(8, -5); ctx.lineTo(8, 5); ctx.lineTo(2, 8); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cc8c00';
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(8, 2); ctx.lineTo(8, 5); ctx.lineTo(2, 8); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = estadoJuego.luzVisible ? '#e0f7fa' : '#334455';
    ctx.beginPath();
    ctx.ellipse(8, 0, 2.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (estadoJuego.luzVisible) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(9, -1, 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // --- Fuego de Propulsión (Boost) ---
    if (estadoJuego.boostActivo) {
        ctx.save();
        const boostOffsetX = -spriteAncho * robotEscala / 2 - 25;
        ctx.translate(boostOffsetX, 0);

        const boostIntensity = estadoJuego.boostEnergia / estadoJuego.boostMaxEnergia;
        const time = estadoJuego.tiempoTranscurrido;
        const flicker = (Math.sin(time * 60) + Math.cos(time * 45)) * 0.15;
        const mainLength = (60 + boostIntensity * 50) * (1.0 + flicker);
        const mainWidth = (22 + boostIntensity * 12) * (1.0 + flicker * 0.5);

        const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, mainLength * 0.8);
        glowGrad.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
        glowGrad.addColorStop(0.3, 'rgba(0, 180, 255, 0.4)');
        glowGrad.addColorStop(1, 'rgba(0, 50, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, mainLength * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-mainLength, -mainWidth / 2);
        ctx.lineTo(-mainLength * 1.2, 0);
        ctx.lineTo(-mainLength, mainWidth / 2);
        ctx.closePath();
        ctx.fill();

        const coreLength = mainLength * 0.6;
        const coreWidth = mainWidth * 0.4;
        const coreGrad = ctx.createLinearGradient(0, 0, -coreLength, 0);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.7, '#a7f3d0');
        coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-coreLength, -coreWidth / 2);
        ctx.lineTo(-coreLength, coreWidth / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    ctx.restore();

    // --- Armas del jugador ---
    const drawContext = { ctx, estadoJuego, jugador, px, py, W, H };
    Weapons.drawWeapons(drawContext);

    // --- Escudo de Energía ---
    if (estadoJuego.shieldActivo || estadoJuego.shieldHitTimer > 0) {
        ctx.save();
        ctx.translate(px, py);

        const subVisualWidth = spriteAncho * robotEscala;
        const shieldRadius = subVisualWidth * 0.65;
        const time = estadoJuego.tiempoTranscurrido;
        let baseAlpha = 0;

        if (estadoJuego.shieldActivo) {
            const energyRatio = estadoJuego.shieldEnergia / estadoJuego.shieldMaxEnergia;
            baseAlpha = 0.2 + energyRatio * 0.4;
        }

        if (estadoJuego.shieldHitTimer > 0) {
            const hitProgress = estadoJuego.shieldHitTimer / 0.4;
            baseAlpha = Math.max(baseAlpha, hitProgress * 0.9);
            const rippleRadius = (1 - hitProgress) * shieldRadius * 1.5;
            const rippleAlpha = hitProgress;
            ctx.strokeStyle = `rgba(173, 216, 230, ${rippleAlpha})`;
            ctx.lineWidth = 3 * hitProgress;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius + rippleRadius * 0.2, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalAlpha = baseAlpha;
        const grad = ctx.createRadialGradient(0, 0, shieldRadius * 0.7, 0, 0, shieldRadius);
        grad.addColorStop(0, 'rgba(173, 216, 230, 0.1)');
        grad.addColorStop(0.8, 'rgba(173, 216, 230, 0.8)');
        grad.addColorStop(1, 'rgba(220, 240, 255, 0.5)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(200, 230, 255, ${baseAlpha * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + time * 0.5;
            ctx.moveTo(Math.cos(angle) * shieldRadius, Math.sin(angle) * shieldRadius);
            ctx.lineTo(Math.cos(angle + Math.PI / 6) * shieldRadius * 0.9, Math.sin(angle + Math.PI / 6) * shieldRadius * 0.9);
        }
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * Renderiza escombros de ballena, pilotos, restos de naufragio y trozos humanos.
 */
export function dibujarEscombrosMundo(ctx, ctxData) {
    const { whaleDebris, pilotos, trozosHumanos, escombrosSubmarino } = ctxData;
    if (!ctx) return;

    for (const d of whaleDebris) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotacion);
        ctx.scale(0.8, 0.8);
        ctx.globalAlpha = clamp(d.vida / d.vidaMax, 0, 1);

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        grad.addColorStop(0, '#fee');
        grad.addColorStop(0.4, '#ab4e52');
        grad.addColorStop(1, '#6d2e37');

        ctx.fillStyle = grad;
        ctx.strokeStyle = '#5c1f27';
        ctx.lineWidth = 4;
        ctx.fill(d.path);
        ctx.stroke(d.path);
        ctx.restore();
    }

    for (const p of pilotos) {
        dibujarPiloto(ctx, p);
    }

    for (const d of trozosHumanos) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotacion);
        ctx.scale(d.escala, d.escala);
        ctx.globalAlpha = clamp(d.vida / d.vidaMax, 0, 1);
        ctx.fillStyle = d.color;
        ctx.strokeStyle = '#3b0000';
        ctx.lineWidth = 3;
        ctx.fill(d.path);
        ctx.stroke(d.path);
        ctx.restore();
    }

    for (const d of escombrosSubmarino) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotacion);
        ctx.scale(d.escala, d.escala);
        ctx.globalAlpha = clamp(d.vida / d.vidaMax, 0, 1);

        const info = d.pathInfo;
        if (info.isGlass) {
            ctx.fillStyle = 'rgba(150, 220, 255, 0.3)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.fill(info.path);
            ctx.stroke(info.path);
        } else {
            ctx.fillStyle = '#050505';
            ctx.translate(3, 4);
            ctx.fill(info.path);
            ctx.translate(-3, -4);

            ctx.fillStyle = d.color;
            ctx.strokeStyle = '#151515';
            ctx.lineWidth = 2.5;
            ctx.fill(info.path);
            ctx.stroke(info.path);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1;
            ctx.stroke(info.path);

            if (info.detail) {
                ctx.strokeStyle = '#000';
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = 1.5;
                ctx.fill(info.detail);
                ctx.stroke(info.detail);
            }
            if (info.cables) {
                ctx.strokeStyle = '#c75b39';
                ctx.lineWidth = 2;
                ctx.stroke(info.path);
            }
            if (info.isEngine) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fill(info.path);
            }
        }

        if (d.tieneSangre && !info.isGlass) {
            ctx.fillStyle = 'rgba(139, 0, 0, 0.85)';
            ctx.beginPath();
            ctx.arc(2, 2, 6, 0, Math.PI * 2);
            ctx.arc(-4, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
