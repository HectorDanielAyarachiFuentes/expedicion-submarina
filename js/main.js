// js/main.js
'use strict';

// Importamos las dos funciones principales que necesitamos del motor del juego
import { init, gameLoop } from './game/game.js';

// Inicializa toda la lógica del juego, los eventos, el estado y la UI.
init();

// Inicia el bucle de animación/juego que se ejecutará continuamente.
requestAnimationFrame(gameLoop);

// Revelamos el bgCanvas sólo cuando el primer frame ya está pintado,
// así nunca se ve el color sólido azul de fondo del body.
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        const bg = document.getElementById('bgCanvas');
        if (bg) bg.style.visibility = 'visible';
    });
});

// Manejar la pantalla de carga inicial
window.addEventListener('load', () => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
        // Verificamos si es la primera carga de la sesión
        if (!sessionStorage.getItem('expedicion_loaded')) {
            // Guardamos que ya se cargó para los próximos reinicios sutiles
            sessionStorage.setItem('expedicion_loaded', 'true');
            // Añadimos un pequeño retraso la primera vez para asegurar que la barra se aprecie
            setTimeout(() => {
                loader.classList.add('fade-out');
                setTimeout(() => loader.remove(), 800); // 800ms coincide con la transición CSS
            }, 500);
        } else {
            // Si ya se ha cargado antes (reinicio de página), eliminamos de inmediato sin animación retrasada
            loader.remove();
        }
    }
});