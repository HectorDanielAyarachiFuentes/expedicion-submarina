'use strict';

// =================================================================================
//  FUNCIONES MATEMÁTICAS Y DE CARGA ASÍNCRONA DE RECURSOS
// =================================================================================

/**
 * Restringe un valor numérico entre un mínimo y un máximo.
 * @param {number} v Valor a restringir
 * @param {number} a Límite inferior
 * @param {number} b Límite superior
 */
export function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

/**
 * Interpolación lineal entre dos valores.
 * @param {number} a Valor inicial
 * @param {number} b Valor final
 * @param {number} t Factor de interpolación (0 a 1)
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Carga asíncrona de imagen con soporte CORS.
 * @param {string} url Ruta de la imagen
 * @param {function} cb Callback receptor
 */
export function cargarImagen(url, cb) {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => cb(im);
    im.onerror = () => {
        console.error(`Error al cargar imagen: ${url}`);
        cb(null);
    };
    im.src = url;
}

/**
 * Carga asíncrona de datos JSON.
 * @param {string} url Ruta del archivo JSON
 * @param {function} cb Callback receptor
 */
export function cargarJson(url, cb) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => cb(data))
        .catch(e => {
            console.error(`Error al cargar JSON: ${url}`, e);
            cb(null);
        });
}
