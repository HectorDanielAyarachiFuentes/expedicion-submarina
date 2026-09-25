'use strict';

// =================================================================================
//  GESTIÓN DE DATOS DEL JUGADOR Y PERSISTENCIA (LOCALSTORAGE)
// =================================================================================

export const CLAVE_PUNTUACION = 'expedicion_hiscore_v2';
export const CLAVE_NIVEL_MAX = 'expedicion_maxlevel_v2';

let puntuacionMaxima = 0;
try {
    puntuacionMaxima = parseInt(localStorage.getItem(CLAVE_PUNTUACION) || '0', 10) || 0;
} catch (e) {}

let nivelMaximoAlcanzado = 1;
try {
    nivelMaximoAlcanzado = parseInt(localStorage.getItem(CLAVE_NIVEL_MAX) || '1', 10) || 1;
} catch (e) {}

export function getPuntuacionMaxima() {
    return puntuacionMaxima;
}

export function setPuntuacionMaxima(val) {
    puntuacionMaxima = val;
    guardarPuntuacionMaxima();
}

export function getNivelMaximoAlcanzado() {
    return nivelMaximoAlcanzado;
}

export function setNivelMaximoAlcanzado(val) {
    nivelMaximoAlcanzado = val;
    try {
        localStorage.setItem(CLAVE_NIVEL_MAX, String(nivelMaximoAlcanzado));
    } catch (e) {}
}

export function guardarPuntuacionMaxima() {
    try {
        localStorage.setItem(CLAVE_PUNTUACION, String(puntuacionMaxima));
    } catch (e) {}
}

export function guardarNivelMaximo(nivelActual, maxNivelConfigurado = 10) {
    try {
        const proximoNivelDesbloqueado = Math.min(nivelActual + 1, maxNivelConfigurado);
        if (proximoNivelDesbloqueado > nivelMaximoAlcanzado) {
            nivelMaximoAlcanzado = proximoNivelDesbloqueado;
            localStorage.setItem(CLAVE_NIVEL_MAX, String(nivelMaximoAlcanzado));
        }
    } catch (e) {}
}
