// js/main.js
'use strict';

// Importamos las dos funciones principales que necesitamos del motor del juego
import { init, gameLoop } from './game.js';

// Inicializa toda la lógica del juego, los eventos, el estado y la UI.
init();

// Inicia el bucle de animación/juego que se ejecutará continuamente.
requestAnimationFrame(gameLoop);