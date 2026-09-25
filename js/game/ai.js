'use strict';

// =================================================================================
//  SISTEMA DE IA AVANZADA PARA HABITANTES MARINOS (MÓDULO DESACOPLADO)
// =================================================================================

// --- Constantes de Cardumen ---
export const CARDUMEN_RADIO_COHESION = 200;   // Radio para calcular centro del grupo
export const CARDUMEN_RADIO_SEPARACION = 50;  // Radio mínimo entre peces
export const CARDUMEN_RADIO_ALINEACION = 150; // Radio para alinear velocidades
export const CARDUMEN_RADIO_HUIDA = 300;      // Radio de detección de amenazas
export const CARDUMEN_FUERZA_COHESION = 0.8;  // Fuerza de atracción al centro
export const CARDUMEN_FUERZA_SEPARACION = 1.5; // Fuerza de repulsión (mayor para evitar solapamiento)
export const CARDUMEN_FUERZA_ALINEACION = 0.6; // Fuerza de alineación
export const CARDUMEN_FUERZA_HUIDA = 3.0;     // Fuerza de huida de amenazas
export const CARDUMEN_VELOCIDAD_MAX = 180;    // Velocidad máxima de un pez en cardumen

// --- Constantes de Tiburón ---
export const SHARK_ANGULO_FLANQUEO = Math.PI / 4; // 45 grados de flanqueo
export const SHARK_RADIO_ACECHO = 400; // Radio para entrar en estado de acecho

// --- Constantes de Orca ---
export const ORCA_RADIO_CERCO = 300; // Radio del cerco

/**
 * Calcula las fuerzas de cardumen para un pez (cohesión, separación, alineación).
 * @param {object} pez - El pez actual.
 * @param {Array} animales - Lista de animales activos.
 * @returns {{fx: number, fy: number}} - Las fuerzas a aplicar.
 */
export function calcularFuerzasCardumen(pez, animales) {
    if (!Array.isArray(animales)) return { fx: 0, fy: 0 };

    let cohesionX = 0, cohesionY = 0, cohesionCount = 0;
    let separacionX = 0, separacionY = 0;
    let alineacionVx = 0, alineacionVy = 0, alineacionCount = 0;

    for (const otro of animales) {
        if (otro === pez) continue;
        // Solo considerar peces normales del cardumen
        if (!['normal', 'rojo', 'aggressive'].includes(otro.tipo)) continue;

        const dx = otro.x - pez.x;
        const dy = otro.y - pez.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 1) continue; // Evitar división por cero

        // Cohesión: atraer hacia el centro del grupo
        if (dist < CARDUMEN_RADIO_COHESION) {
            cohesionX += otro.x;
            cohesionY += otro.y;
            cohesionCount++;
        }

        // Separación: repeler si está muy cerca
        if (dist < CARDUMEN_RADIO_SEPARACION) {
            const fuerza = (CARDUMEN_RADIO_SEPARACION - dist) / CARDUMEN_RADIO_SEPARACION;
            separacionX -= (dx / dist) * fuerza;
            separacionY -= (dy / dist) * fuerza;
        }

        // Alineación: igualar velocidad con vecinos
        if (dist < CARDUMEN_RADIO_ALINEACION) {
            alineacionVx += otro.vx || 0;
            alineacionVy += otro.vy || 0;
            alineacionCount++;
        }
    }

    let fx = 0, fy = 0;

    // Aplicar cohesión
    if (cohesionCount > 0) {
        const centroX = cohesionX / cohesionCount;
        const centroY = cohesionY / cohesionCount;
        fx += (centroX - pez.x) * CARDUMEN_FUERZA_COHESION * 0.01;
        fy += (centroY - pez.y) * CARDUMEN_FUERZA_COHESION * 0.01;
    }

    // Aplicar separación
    fx += separacionX * CARDUMEN_FUERZA_SEPARACION * 50;
    fy += separacionY * CARDUMEN_FUERZA_SEPARACION * 50;

    // Aplicar alineación
    if (alineacionCount > 0) {
        const avgVx = alineacionVx / alineacionCount;
        const avgVy = alineacionVy / alineacionCount;
        fx += (avgVx - (pez.vx || 0)) * CARDUMEN_FUERZA_ALINEACION * 0.1;
        fy += (avgVy - (pez.vy || 0)) * CARDUMEN_FUERZA_ALINEACION * 0.1;
    }

    return { fx, fy };
}

/**
 * Calcula la fuerza de huida de amenazas (jugador, tiburones, orcas).
 * @param {object} pez - El pez actual.
 * @param {object} jugador - El submarino jugador.
 * @param {Array} animales - Lista de animales en el entorno.
 * @param {object} estadoJuego - Estado global de la partida.
 * @returns {{fx: number, fy: number}} - La fuerza de huida.
 */
export function calcularFuerzaHuida(pez, jugador, animales, estadoJuego) {
    let fx = 0, fy = 0;

    // Huir del jugador
    if (jugador && estadoJuego && estadoJuego.enEjecucion) {
        const dx = pez.x - jugador.x;
        const dy = pez.y - jugador.y;
        const dist = Math.hypot(dx, dy);

        if (dist < CARDUMEN_RADIO_HUIDA && dist > 1) {
            const fuerza = (CARDUMEN_RADIO_HUIDA - dist) / CARDUMEN_RADIO_HUIDA;
            fx += (dx / dist) * fuerza * CARDUMEN_FUERZA_HUIDA * 100;
            fy += (dy / dist) * fuerza * CARDUMEN_FUERZA_HUIDA * 100;
        }
    }

    // Huir de depredadores (tiburones, orcas)
    if (Array.isArray(animales)) {
        for (const depredador of animales) {
            if (!['shark', 'orca'].includes(depredador.tipo)) continue;

            const dx = pez.x - depredador.x;
            const dy = pez.y - depredador.y;
            const dist = Math.hypot(dx, dy);

            // Los depredadores tienen un radio de amenaza mayor
            const radioAmenaza = depredador.tipo === 'orca' ? CARDUMEN_RADIO_HUIDA * 1.5 : CARDUMEN_RADIO_HUIDA;

            if (dist < radioAmenaza && dist > 1) {
                const fuerza = (radioAmenaza - dist) / radioAmenaza;
                fx += (dx / dist) * fuerza * CARDUMEN_FUERZA_HUIDA * 120;
                fy += (dy / dist) * fuerza * CARDUMEN_FUERZA_HUIDA * 120;
            }
        }
    }

    return { fx, fy };
}

/**
 * Alerta a peces cercanos cuando uno detecta peligro.
 * @param {object} pezAsustado - El pez que detectó el peligro.
 * @param {Array} animales - Lista de animales en el entorno.
 */
export function alertarPecesCercanos(pezAsustado, animales) {
    if (!Array.isArray(animales)) return;
    const RADIO_ALERTA = 250;

    for (const otro of animales) {
        if (otro === pezAsustado) continue;
        if (!['normal', 'rojo', 'aggressive'].includes(otro.tipo)) continue;

        const dist = Math.hypot(otro.x - pezAsustado.x, otro.y - pezAsustado.y);
        if (dist < RADIO_ALERTA) {
            otro.alertado = true;
            otro.alertaTimer = 2.0; // Alerta activa por 2 segundos
        }
    }
}

/**
 * Calcula el ángulo de flanqueo para tiburones seguidores.
 * @param {number} index - Índice del tiburón en la manada.
 * @param {number} baseAngle - Ángulo base hacia el objetivo.
 * @returns {number} - Ángulo ajustado para flanqueo.
 */
export function calcularAnguloFlanqueoTiburon(index, baseAngle) {
    // Los tiburones pares flanquean por arriba, los impares por abajo
    const offset = (index % 2 === 0 ? 1 : -1) * SHARK_ANGULO_FLANQUEO * (Math.floor(index / 2) + 1) * 0.5;
    return baseAngle + offset;
}

/**
 * Calcula la posición de cerco para una orca en la manada.
 * @param {object} orca - La orca.
 * @param {object} objetivo - El objetivo del cerco.
 * @param {number} indexEnManada - Posición de la orca en la manada.
 * @param {number} tamanoManada - Tamaño total de la manada.
 * @returns {{x: number, y: number}} - Posición objetivo del cerco.
 */
export function calcularPosicionCercoOrca(orca, objetivo, indexEnManada, tamanoManada) {
    // Distribuir las orcas en un círculo alrededor del objetivo
    const angulo = (Math.PI * 2 / tamanoManada) * indexEnManada;
    return {
        x: objetivo.x + Math.cos(angulo) * ORCA_RADIO_CERCO,
        y: objetivo.y + Math.sin(angulo) * ORCA_RADIO_CERCO
    };
}
