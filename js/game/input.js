'use strict';

// =================================================================================
//  SISTEMA DE CONTROLES, EVENTOS E INPUT (MÓDULO DESACOPLADO)
// =================================================================================

import { S } from './audio.js';
import { CLAVE_NIVEL_MAX } from './storage.js';

export let teclas = {};
export let gamepadConectado = false;
export let prevGamepadButtons = [];

let arrastreId = -1;
let arrastreActivo = false;
let arrastreY = 0;

let getContext = () => ({
    W: window.innerWidth,
    H: window.innerHeight,
    estadoJuego: null,
    jugador: null,
    Levels: null,
    iniciarJuego: () => {},
    abrirMenuPrincipal: () => {},
    lanzarTorpedo: () => {},
    disparar: () => {},
    autoSize: () => {},
    actualizarIconos: () => {},
    alternarPantallaCompleta: () => {},
    mostrarVistaMenuPrincipal: () => {},
    poblarSelectorDeNiveles: () => {},
    actualizarSeleccionNivelVisual: () => {},
    elementosUI: {},
    creditosState: {}
});

export function setInputContextGetter(fn) {
    if (typeof fn === 'function') getContext = fn;
}

export function setGamepadConectado(val) {
    gamepadConectado = !!val;
}

export function setPrevGamepadButtons(btns) {
    prevGamepadButtons = btns;
}

export function getArrastreState() {
    return { arrastreId, arrastreActivo, arrastreY };
}

export function estaSobreUI(x, y) {
    const { elementosUI } = getContext();
    const {
        muteBtn, helpBtn, infoBtn, fsBtn, shareBtn, githubBtn,
        overlay, infoOverlay, levelSelectBtn, backToMainBtn
    } = elementosUI || {};

    const elementos = [muteBtn, helpBtn, infoBtn, fsBtn, shareBtn, githubBtn, overlay, infoOverlay, levelSelectBtn, backToMainBtn];
    for (const el of elementos) {
        if (!el) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    return false;
}

/**
 * Lee el estado del gamepad conectado y traduce sus entradas a acciones del juego.
 */
export function actualizarGamepad() {
    if (!gamepadConectado) return;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return;

    const { overlay, estadoJuego, helpBtn } = getContext();

    // --- Lógica de Menú (si el overlay está visible) ---
    if (overlay && overlay.style.display !== 'none') {
        actualizarGamepadMenu(gp);
    }
    // --- Lógica Durante el Juego ---
    else if (estadoJuego && estadoJuego.enEjecucion) {
        actualizarGamepadJuego(gp);
    }

    // --- Lógica Global del Gamepad (se aplica en cualquier estado) ---
    const isNewPress = (index) => gp.buttons[index] && gp.buttons[index].pressed && !prevGamepadButtons[index];
    if (isNewPress(9)) { // Start -> Pausa / Reanudar
        abrirMenuPausaDesdeMando();
    }
    if (isNewPress(8)) { // Select/Back -> Mostrar/Ocultar Controles
        if (helpBtn) helpBtn.click();
    }

    // Guardar estado de botones para el próximo frame
    prevGamepadButtons = gp.buttons.map(b => b.pressed);
}

export function actualizarGamepadMenu(gp) {
    const isNewPress = (index) => gp.buttons[index] && gp.buttons[index].pressed && !prevGamepadButtons[index];
    const {
        mainMenuContent,
        levelSelectContent,
        levelSelectorContainer,
        startBtn,
        restartBtn,
        levelSelectBtn,
        backToMainBtn,
        estadoJuego,
        actualizarSeleccionNivelVisual
    } = getContext();

    // --- Menú Principal / Pausa / Game Over ---
    if (mainMenuContent && mainMenuContent.style.display !== 'none') {
        if (isNewPress(7)) { // RT -> Sumergirse / Reintentar
            if (startBtn && startBtn.style.display !== 'none') startBtn.click();
            else if (restartBtn && restartBtn.style.display !== 'none') restartBtn.click();
        }
        if (isNewPress(6)) { // LT -> Niveles
            if (levelSelectBtn && levelSelectBtn.style.display !== 'none') levelSelectBtn.click();
        }
    }
    // --- Selector de Niveles ---
    else if (levelSelectContent && levelSelectContent.style.display !== 'none') {
        const botonesNivel = levelSelectorContainer ? levelSelectorContainer.querySelectorAll('.levelbtn:not(:disabled)') : [];
        const axisX = gp.axes[0] || 0;
        const STICK_DEAD_ZONE = 0.6;

        const stickX = (estadoJuego && estadoJuego.gamepadStickX !== undefined) ? estadoJuego.gamepadStickX : 0;
        const movedLeft = isNewPress(14) || (axisX < -STICK_DEAD_ZONE && stickX >= -STICK_DEAD_ZONE);
        const movedRight = isNewPress(15) || (axisX > STICK_DEAD_ZONE && stickX <= STICK_DEAD_ZONE);

        if (movedLeft) {
            if (botonesNivel.length > 0 && estadoJuego) {
                estadoJuego.nivelSeleccionadoIndex = (estadoJuego.nivelSeleccionadoIndex - 1 + botonesNivel.length) % botonesNivel.length;
                if (typeof actualizarSeleccionNivelVisual === 'function') actualizarSeleccionNivelVisual();
            }
        }
        if (movedRight) {
            if (botonesNivel.length > 0 && estadoJuego) {
                estadoJuego.nivelSeleccionadoIndex = (estadoJuego.nivelSeleccionadoIndex + 1) % botonesNivel.length;
                if (typeof actualizarSeleccionNivelVisual === 'function') actualizarSeleccionNivelVisual();
            }
        }
        if (isNewPress(0)) { // A -> Seleccionar Nivel
            if (estadoJuego && botonesNivel[estadoJuego.nivelSeleccionadoIndex]) {
                botonesNivel[estadoJuego.nivelSeleccionadoIndex].click();
            }
        }
        if (isNewPress(1)) { // B -> Volver
            if (backToMainBtn) backToMainBtn.click();
        }
        if (estadoJuego) {
            estadoJuego.gamepadStickX = axisX; // Guardar estado del stick para el próximo frame
        }
    }
}

export function actualizarGamepadJuego(gp) {
    const DEAD_ZONE = 0.25;
    let axisX = gp.axes[0] || 0;
    let axisY = gp.axes[1] || 0;

    // Fallback to D-pad if left stick is not moving
    if (Math.abs(axisX) < DEAD_ZONE && Math.abs(axisY) < DEAD_ZONE) {
        if (gp.buttons[12] && gp.buttons[12].pressed) { // D-pad Up
            axisY = -1;
        } else if (gp.buttons[13] && gp.buttons[13].pressed) { // D-pad Down
            axisY = 1;
        }
        if (gp.buttons[14] && gp.buttons[14].pressed) { // D-pad Left
            axisX = -1;
        } else if (gp.buttons[15] && gp.buttons[15].pressed) { // D-pad Right
            axisX = 1;
        }
    }

    teclas['ArrowUp'] = axisY < -DEAD_ZONE;
    teclas['ArrowDown'] = axisY > DEAD_ZONE;
    teclas['ArrowLeft'] = axisX < -DEAD_ZONE;
    teclas['ArrowRight'] = axisX > DEAD_ZONE;

    teclas[' '] = !!(gp.buttons[0] && gp.buttons[0].pressed); // A -> Disparar / Láser
    teclas['b'] = !!(gp.buttons[1] && gp.buttons[1].pressed); // B -> Impulso (Boost)
    teclas['v'] = !!(gp.buttons[3] && gp.buttons[3].pressed); // Y -> Escudo (Shield)

    const isNewPress = (index) => gp.buttons[index] && gp.buttons[index].pressed && !prevGamepadButtons[index];
    if (isNewPress(2)) { teclas['x'] = true; } // X -> Torpedo
    if (isNewPress(5)) { teclas['c'] = true; } // RB -> Cambiar Arma
}

export function abrirMenuPausaDesdeMando() {
    const { estadoJuego, abrirMenuPrincipal, startBtn, restartBtn, modoSuperposicion } = getContext();
    if (estadoJuego && estadoJuego.enEjecucion) {
        abrirMenuPrincipal();
    } else if (estadoJuego && estadoJuego.faseJuego === 'pause') {
        if (startBtn) startBtn.click();
    } else if (modoSuperposicion === 'menu' || modoSuperposicion === 'gameover') {
        if (startBtn && startBtn.style.display !== 'none') startBtn.click();
        else if (restartBtn && restartBtn.style.display !== 'none') restartBtn.click();
    }
}

/**
 * Inicializa los controladores de eventos (teclado, ratón, mandos, UI)
 */
export function inicializarEventosInput() {
    const ctxData = getContext();
    const {
        W,
        H,
        estadoJuego,
        jugador,
        Levels,
        iniciarJuego,
        abrirMenuPrincipal,
        lanzarTorpedo,
        disparar,
        autoSize,
        actualizarIconos,
        alternarPantallaCompleta,
        mostrarVistaMenuPrincipal,
        poblarSelectorDeNiveles,
        actualizarSeleccionNivelVisual,
        elementosUI,
        creditosState
    } = ctxData;

    const {
        controllerDisconnectOverlay,
        controllerConnectPrompt,
        gameplayHints,
        helpBtn,
        startBtn,
        restartBtn,
        levelSelectBtn,
        backToMainBtn,
        pauseBtn,
        muteBtn,
        infoBtn,
        infoOverlay,
        cheatBtn,
        githubBtn,
        fsBtn,
        shareBtn,
        logoHUD,
        resumeWithKeyboardButton,
        useGamepadButton,
        stayOnKeyboardButton,
        closeInfo,
        overlay,
        mainMenuContent,
        levelSelectContent,
        levelSelectorContainer
    } = elementosUI;

    // --- NUEVO: Eventos para conectar/desconectar el mando ---
    window.addEventListener('gamepadconnected', (e) => {
        console.log(`¡Mando conectado! ID: ${e.gamepad.id}`);
        gamepadConectado = true;
        prevGamepadButtons = e.gamepad.buttons.map(() => false);

        const current = getContext();
        if (current.estadoJuego && current.estadoJuego.juegoPausadoPorDesconexion) {
            current.estadoJuego.enEjecucion = true;
            current.estadoJuego.juegoPausadoPorDesconexion = false;
            S.bucle('music');
            if (controllerDisconnectOverlay) {
                controllerDisconnectOverlay.style.display = 'none';
            }
        } else {
            if (helpBtn && gameplayHints && !gameplayHints.classList.contains('visible')) {
                helpBtn.click();
            }
        }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        console.log(`Mando desconectado. ID: ${e.gamepad.id}`);
        gamepadConectado = false;

        const current = getContext();
        if (current.estadoJuego && current.estadoJuego.enEjecucion) {
            current.estadoJuego.enEjecucion = false;
            current.estadoJuego.juegoPausadoPorDesconexion = true;
            S.pausar('music');
            S.detener('boost');
            S.detener('laser_beam');
            S.detener('gatling_fire');
            if (controllerDisconnectOverlay) {
                controllerDisconnectOverlay.style.display = 'grid';
            }
        }
    });

    window.addEventListener('keydown', function (e) {
        teclas[e.key] = true;
        if (e.code === 'Space') e.preventDefault();
        if (e.key === 'Escape') {
            e.preventDefault();
            const current = getContext();
            if (typeof current.abrirMenuPrincipal === 'function') current.abrirMenuPrincipal();
        }
    });

    window.addEventListener('keyup', function (e) {
        teclas[e.key] = false;
        const current = getContext();
        if (e.key === '0') {
            if (current.jugador && current.estadoJuego && current.estadoJuego.enEjecucion) {
                current.jugador.direccion *= -1;
            }
        }
        if (e.key === 'Escape') {
            if (gameplayHints && gameplayHints.classList.contains('visible')) {
                gameplayHints.classList.remove('visible');
            }
        }
    });

    window.addEventListener('blur', () => { teclas = {}; });

    window.addEventListener('pointerdown', (e) => {
        S.init();
        if (estaSobreUI(e.clientX, e.clientY)) return;
        const current = getContext();
        const isLevel5 = current.estadoJuego && current.estadoJuego.nivel === 5;
        if (isLevel5) {
            current.lanzarTorpedo();
            return;
        }
        const tapX = e.clientX;
        const screenW = current.W || window.innerWidth;
        if (tapX < screenW * 0.4) {
            arrastreId = e.pointerId;
            arrastreActivo = true;
            arrastreY = e.clientY;
            e.preventDefault();
        } else if (tapX > screenW * 0.6) {
            if (!current.estadoJuego || !current.estadoJuego.enEjecucion) return;
            if (current.estadoJuego.bloqueoEntrada === 0) {
                teclas[' '] = true;
                if (current.estadoJuego.armaActual === 'gatling') {
                    current.disparar({
                        estadoJuego: current.estadoJuego,
                        jugador: current.jugador,
                        S,
                        Levels: current.Levels
                    });
                }
            }
        } else {
            current.lanzarTorpedo();
        }
    }, { passive: false });

    window.addEventListener('pointermove', (e) => {
        const current = getContext();
        if (current.estadoJuego && current.estadoJuego.nivel === 5) return;
        if (!arrastreActivo || e.pointerId !== arrastreId) return;
        arrastreY = e.clientY;
        e.preventDefault();
    }, { passive: false });

    window.addEventListener('pointerup', (e) => {
        const current = getContext();
        if (current.estadoJuego && current.estadoJuego.nivel === 5) return;
        if (e.pointerId === arrastreId) {
            arrastreActivo = false;
            arrastreId = -1;
        }
        teclas[' '] = false;
    }, { passive: false });

    window.addEventListener('resize', autoSize);

    // --- BOTONES DEL MENÚ PRINCIPAL ---
    if (startBtn) {
        startBtn.onclick = function (e) {
            e.stopPropagation();
            const current = getContext();
            if (current.modoSuperposicion === 'pause') {
                S.detener('theme_main');
                if (overlay) overlay.style.display = 'none';
                if (current.estadoJuego) {
                    current.estadoJuego.enEjecucion = true;
                    current.estadoJuego.bloqueoEntrada = 0.15;
                    if (gameplayHints) gameplayHints.classList.remove('visible');
                }
                S.bucle('music');
            } else {
                current.iniciarJuego(1);
            }
        };
    }

    if (restartBtn) {
        restartBtn.onclick = () => {
            const current = getContext();
            current.iniciarJuego(current.estadoJuego ? current.estadoJuego.nivel || 1 : 1);
        };
    }

    if (levelSelectBtn) {
        levelSelectBtn.onclick = () => {
            if (mainMenuContent) mainMenuContent.style.display = 'none';
            if (levelSelectContent) levelSelectContent.style.display = 'block';
            const current = getContext();
            if (typeof current.poblarSelectorDeNiveles === 'function') current.poblarSelectorDeNiveles();
            if (levelSelectorContainer) {
                const botonesDisponibles = levelSelectorContainer.querySelectorAll('.levelbtn:not(:disabled)');
                if (current.estadoJuego) {
                    current.estadoJuego.nivelSeleccionadoIndex = botonesDisponibles.length - 1;
                    if (typeof current.actualizarSeleccionNivelVisual === 'function') {
                        current.actualizarSeleccionNivelVisual();
                    }
                }
            }
        };
    }

    if (backToMainBtn) {
        backToMainBtn.onclick = () => {
            if (mainMenuContent) mainMenuContent.style.display = 'block';
            if (levelSelectContent) levelSelectContent.style.display = 'none';
        };
    }

    // --- BOTONES DE LA BARRA DE HUD ---
    if (helpBtn) {
        helpBtn.onclick = function () {
            if (gameplayHints) {
                gameplayHints.classList.toggle('gamepad-active', gamepadConectado);
                gameplayHints.classList.toggle('visible');
            }
        };
    }

    if (pauseBtn) {
        pauseBtn.onclick = function () {
            const current = getContext();
            if (typeof current.abrirMenuPrincipal === 'function') current.abrirMenuPrincipal();
        };
    }

    if (muteBtn) {
        muteBtn.onclick = function () {
            S.alternarSilenciado();
            const current = getContext();
            if (typeof current.actualizarIconos === 'function') current.actualizarIconos();
        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => {
            const current = getContext();
            if (creditosState) {
                creditosState.estabaCorriendoAntesCreditos = !!(current.estadoJuego && current.estadoJuego.enEjecucion);
            }
            if (current.estadoJuego) current.estadoJuego.enEjecucion = false;
            S.pausar('music');
            S.reproducir('theme_main');
            if (infoOverlay) infoOverlay.style.display = 'grid';
            if (gameplayHints) gameplayHints.classList.remove('visible');
            if (creditosState) creditosState.animarSubmarino = true;

            const creatorPic = document.getElementById('creator-pic');
            if (creatorPic && creditosState && Array.isArray(creditosState.a_creditos_imagenes)) {
                creatorPic.style.transition = 'opacity 0.5s ease-in-out';
                creditosState.a_creditos_imagen_actual = Math.floor(Math.random() * creditosState.a_creditos_imagenes.length);
                creatorPic.src = creditosState.a_creditos_imagenes[creditosState.a_creditos_imagen_actual];
                creatorPic.style.opacity = 1;

                if (creditosState.a_creditos_intervalo) clearInterval(creditosState.a_creditos_intervalo);
                creditosState.a_creditos_intervalo = setInterval(() => {
                    let randomIndex;
                    do {
                        randomIndex = Math.floor(Math.random() * creditosState.a_creditos_imagenes.length);
                    } while (randomIndex === creditosState.a_creditos_imagen_actual && creditosState.a_creditos_imagenes.length > 1);
                    creditosState.a_creditos_imagen_actual = randomIndex;

                    creatorPic.style.opacity = 0;
                    setTimeout(() => {
                        creatorPic.src = creditosState.a_creditos_imagenes[creditosState.a_creditos_imagen_actual];
                        creatorPic.style.opacity = 1;
                    }, 500);
                }, 4000);
            }
        };
    }

    if (cheatBtn) {
        cheatBtn.onclick = () => {
            const current = getContext();
            const cheat = prompt("Introduce un código secreto (o escribe 'nemo' para desbloquear todos los niveles):");
            if (cheat && (cheat.toLowerCase() === 'nemo' || cheat.toLowerCase() === 'desbloquear')) {
                const maxLv = current.Levels ? current.Levels.CONFIG_NIVELES.length : 10;
                try { localStorage.setItem(CLAVE_NIVEL_MAX, String(maxLv)); } catch (e) { }
                alert(`¡Código Mágico Aceptado!\nHas desbloqueado los ${maxLv} niveles escondidos en la región abisal.`);
                if (!current.estadoJuego || !current.estadoJuego.enEjecucion) {
                    if (typeof current.mostrarVistaMenuPrincipal === 'function') current.mostrarVistaMenuPrincipal(false);
                }
            } else if (cheat) {
                alert("Secuencia de comandos no reconocida.");
            }
        };
    }

    if (githubBtn) {
        githubBtn.onclick = () => window.open('https://github.com/HectorDanielAyarachiFuentes', '_blank');
    }

    if (fsBtn) {
        fsBtn.onclick = function () {
            const current = getContext();
            if (typeof current.alternarPantallaCompleta === 'function') current.alternarPantallaCompleta();
        };
    }

    if (shareBtn) {
        shareBtn.onclick = async function () {
            const current = getContext();
            let estabaCorriendo = !!(current.estadoJuego && current.estadoJuego.enEjecucion);
            if (estabaCorriendo) {
                current.estadoJuego.enEjecucion = false;
                S.pausar('music');
            }
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: 'La Expedición',
                        text: '¡He conquistado las profundidades! ¿Puedes tú?',
                        url: location.href
                    });
                }
            } catch (_) { }
            finally {
                if (estabaCorriendo && (!overlay || overlay.style.display === 'none')) {
                    if (current.estadoJuego) current.estadoJuego.enEjecucion = true;
                    S.bucle('music');
                }
            }
        };
    }

    if (logoHUD) {
        logoHUD.addEventListener('click', () => {
            const current = getContext();
            if (typeof current.abrirMenuPrincipal === 'function') current.abrirMenuPrincipal();
        });
    }

    if (resumeWithKeyboardButton) {
        resumeWithKeyboardButton.onclick = () => {
            const current = getContext();
            if (current.estadoJuego && current.estadoJuego.juegoPausadoPorDesconexion) {
                current.estadoJuego.enEjecucion = true;
                current.estadoJuego.juegoPausadoPorDesconexion = false;
                S.bucle('music');
                if (controllerDisconnectOverlay) {
                    controllerDisconnectOverlay.style.display = 'none';
                }
            }
        };
    }

    if (useGamepadButton) {
        useGamepadButton.onclick = () => {
            const current = getContext();
            if (current.estadoJuego && current.estadoJuego.juegoPausadoPorConexionMando) {
                gamepadConectado = true;
                const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
                if (gamepads[0]) {
                    prevGamepadButtons = gamepads[0].buttons.map(() => false);
                }
                current.estadoJuego.enEjecucion = true;
                current.estadoJuego.juegoPausadoPorConexionMando = false;
                S.bucle('music');
                if (controllerConnectPrompt) {
                    controllerConnectPrompt.style.display = 'none';
                }
            }
        };
    }

    if (stayOnKeyboardButton) {
        stayOnKeyboardButton.onclick = () => {
            const current = getContext();
            if (current.estadoJuego && current.estadoJuego.juegoPausadoPorConexionMando) {
                gamepadConectado = false;
                current.estadoJuego.enEjecucion = true;
                current.estadoJuego.juegoPausadoPorConexionMando = false;
                S.bucle('music');
                if (controllerConnectPrompt) {
                    controllerConnectPrompt.style.display = 'none';
                }
            }
        };
    }

    if (closeInfo) {
        closeInfo.onclick = function () {
            S.detener('theme_main');
            if (infoOverlay) infoOverlay.style.display = 'none';
            const current = getContext();
            if (creditosState && creditosState.estabaCorriendoAntesCreditos && (!overlay || overlay.style.display === 'none')) {
                if (current.estadoJuego) current.estadoJuego.enEjecucion = true;
                S.bucle('music');
                if (gameplayHints) gameplayHints.classList.remove('visible');
            }
            if (creditosState) creditosState.animarSubmarino = false;

            if (creditosState && creditosState.a_creditos_intervalo) {
                clearInterval(creditosState.a_creditos_intervalo);
                creditosState.a_creditos_intervalo = null;
            }
        };
    }

    if (overlay) {
        overlay.addEventListener('click', function (e) {
            const current = getContext();
            if (e.target === overlay && overlay.style.display !== 'none' && (!restartBtn || restartBtn.style.display === 'none') && current.estadoJuego && current.estadoJuego.faseJuego !== 'transition' && levelSelectContent && levelSelectContent.style.display === 'none') {
                if (current.modoSuperposicion === 'pause') {
                    S.detener('theme_main');
                    overlay.style.display = 'none';
                    if (current.estadoJuego) {
                        current.estadoJuego.enEjecucion = true;
                        current.estadoJuego.bloqueoEntrada = 0.15;
                        if (gameplayHints) gameplayHints.classList.remove('visible');
                    }
                    S.bucle('music');
                } else {
                    current.iniciarJuego(1);
                }
            }
        });
    }

    // --- PESTAÑAS DE VENTANA DE INFORMACIÓN ---
    const infoTabs = document.querySelectorAll('.info-tab-btn');
    const infoPanels = document.querySelectorAll('.info-tab-panel');

    infoTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            infoTabs.forEach(t => t.classList.remove('active'));
            infoPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const targetPanel = document.getElementById(`tab-${tabId}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}
