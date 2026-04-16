// js/main.js
'use strict';

// Importamos las dos funciones principales que necesitamos del motor del juego
import { init, gameLoop } from './game/game.js';

// Inicializa toda la lógica del juego, los eventos, el estado y la UI.
init();

// Inicia el bucle de animación/juego que se ejecutará continuamente.
requestAnimationFrame(gameLoop);

// Manejar la pantalla de carga inicial
window.addEventListener('load', () => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
        // Añadimos un pequeño retraso para asegurar que la barra de carga se muestre bien
        setTimeout(() => {
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.remove();
            }, 800); // 800ms coincide con la transición en CSS
        }, 500);
    }
});