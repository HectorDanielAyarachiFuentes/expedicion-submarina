'use strict';

// =================================================================================
//  SISTEMA HUD, MENÚS Y FLUJO DE ESTADO DE LA INTERFAZ (MÓDULO DESACOPLADO)
// =================================================================================

import { clamp, lerp } from './utils.js';
import { CLAVE_NIVEL_MAX } from './storage.js';

export const RANGOS_ASESINO = [
    { bajas: 0, titulo: "NOVATO" },
    { bajas: 10, titulo: "APRENDIZ" },
    { bajas: 25, titulo: "MERCENARIO" },
    { bajas: 50, titulo: "CAZADOR" },
    { bajas: 75, titulo: "VETERANO" },
    { bajas: 100, titulo: "DEPREDADOR" },
    { bajas: 150, titulo: "LEYENDA ABISAL" }
];

export function actualizarIconos(muteBtn, S) {
    if (!muteBtn || !S) return;
    const icono = muteBtn.querySelector('.icon-sonido');
    if (!icono) return;
    if (S.silenciado) {
        icono.classList.remove('fa-volume-high');
        icono.classList.add('fa-volume-xmark');
    } else {
        icono.classList.remove('fa-volume-xmark');
        icono.classList.add('fa-volume-high');
    }
}

export function triggerHudShake(intensity, estadoJuego, liveHudContainer) {
    if (!estadoJuego || !liveHudContainer) return;
    estadoJuego.hudShakeIntensity = Math.min(estadoJuego.hudShakeIntensity + intensity, 30);
}

export function actualizarLiveHUD(estadoJuego, liveHudContainer) {
    if (!estadoJuego || !liveHudContainer) return;

    const s = estadoJuego;
    if (s.hudShakeIntensity > 0.1) {
        s.hudShakeX = (Math.random() - 0.5) * s.hudShakeIntensity;
        s.hudShakeY = (Math.random() - 0.5) * s.hudShakeIntensity;
        liveHudContainer.style.transform = `translate(${s.hudShakeX.toFixed(2)}px, ${s.hudShakeY.toFixed(2)}px)`;
        s.hudShakeIntensity *= 0.88;
    } else if (s.hudShakeIntensity !== 0) {
        s.hudShakeIntensity = 0;
        liveHudContainer.style.transform = 'translate(0, 0)';
    }
}

export function actualizarHTMLHUD(ctxData) {
    const {
        estadoJuego,
        Levels,
        puntuacionMaxima,
        uiElements,
        onHudShake
    } = ctxData;

    if (!estadoJuego || !estadoJuego.enEjecucion || !Levels || !uiElements) return;
    const s = estadoJuego;
    const {
        hudLevelText,
        hudObjectiveText,
        statScoreValue,
        statDepthValue,
        statDistanceValue,
        statSpeedValue,
        statRecordValue,
        statLivesContainer,
        statWeaponValue,
        statTorpedoValue,
        statAssassinValue,
        boostProgressBar,
        laserProgressBar,
        shieldProgressBar,
        bossHealthContainer,
        bossHealthBar
    } = uiElements;

    // --- Misión y Nivel ---
    const mision = Levels.getEstadoMision ? Levels.getEstadoMision() : null;
    let objetivoHTML;
    if (mision) {
        if (hudLevelText) hudLevelText.innerHTML = `<span class="mission-title">${mision.texto}</span>`;
        objetivoHTML = mision.progreso;
    } else {
        if (hudLevelText) hudLevelText.textContent = `NIVEL ${s.nivel}`;
        const configNivel = (Levels.CONFIG_NIVELES && Levels.CONFIG_NIVELES[s.nivel - 1]) || {};
        if (configNivel.tipo === 'capture') { objetivoHTML = `CAPTURAS: ${s.rescatados} / ${configNivel.meta}`; }
        else if (configNivel.tipo === 'survive') { objetivoHTML = `SUPERVIVENCIA: ${Math.floor(configNivel.meta - s.valorObjetivoNivel)}s`; }
        else if (configNivel.tipo === 'boss') { objetivoHTML = (configNivel.objetivo || '').toUpperCase(); }
        else { objetivoHTML = ''; }
    }
    if (objetivoHTML !== s._prevMisionProgreso) {
        if (hudObjectiveText) hudObjectiveText.innerHTML = objetivoHTML;
        s._prevMisionProgreso = objetivoHTML;
    }

    // --- Puntuación ---
    if (s.puntuacion !== s._prevPuntuacion && statScoreValue) {
        statScoreValue.textContent = String(s.puntuacion || 0);
        s._prevPuntuacion = s.puntuacion;
    }

    // --- Profundidad ---
    const profundidadActual = Math.floor(s.profundidad_m || 0);
    if (profundidadActual !== s._prevProfundidad && statDepthValue) {
        statDepthValue.textContent = `${profundidadActual} m`;
        s._prevProfundidad = profundidadActual;
    }

    // --- Distancia ---
    const distActual = Math.floor(s.distanciaRecorrida || 0);
    if (distActual !== s._prevDistancia && statDistanceValue) {
        statDistanceValue.textContent = distActual < 1000 ? `${distActual} m` : `${(distActual / 1000).toFixed(2)} km`;
        s._prevDistancia = distActual;
    }

    // --- Velocidad ---
    const speed_px_s = s.velocidad_actual || 0;
    const target_speed_km_h = (speed_px_s / 50) * 3.6;
    s.velocidad_mostrada_kmh = lerp(s.velocidad_mostrada_kmh || 0, target_speed_km_h, 0.12);
    if (Math.abs(s.velocidad_mostrada_kmh - target_speed_km_h) < 0.1) s.velocidad_mostrada_kmh = target_speed_km_h;
    const velActual = Math.floor(Math.max(0, s.velocidad_mostrada_kmh));
    if (velActual !== s._prevVelocidad && statSpeedValue) {
        statSpeedValue.textContent = `${velActual} km/h`;
        s._prevVelocidad = velActual;
    }
    if (statSpeedValue) {
        if (s.boostActivo) {
            statSpeedValue.classList.add('boosting');
            if (typeof onHudShake === 'function') onHudShake(2);
        } else {
            statSpeedValue.classList.remove('boosting');
        }
    }

    // --- Récord ---
    if (s._prevPuntuacion === -1 && statRecordValue) {
        statRecordValue.textContent = String(puntuacionMaxima || 0);
    }

    // --- Vidas ---
    if (s.vidas !== s._prevVidas && statLivesContainer) {
        statLivesContainer.innerHTML = '';
        const maxHearts = 5;
        const currentLives = Math.min(s.vidas, maxHearts);
        for (let i = 0; i < maxHearts; i++) {
            const heart = document.createElement('span');
            heart.classList.add('heart-icon');
            if (i < currentLives) heart.classList.add('filled');
            statLivesContainer.appendChild(heart);
        }
        if (s.vidas > maxHearts) {
            const extraLives = document.createElement('span');
            extraLives.classList.add('extra-lives');
            extraLives.textContent = `+${s.vidas - maxHearts}`;
            statLivesContainer.appendChild(extraLives);
        }
        s._prevVidas = s.vidas;
    }

    // --- Arma ---
    const armaTexto = `${(s.armaActual || 'normal').toUpperCase()} ${s.enfriamientoArma > 0 ? '(RECARGA)' : '(LISTA)'}`;
    if (armaTexto !== s._prevArma && statWeaponValue) {
        statWeaponValue.textContent = armaTexto;
        statWeaponValue.className = `stat-value weapon-status ${s.enfriamientoArma > 0 ? 'reloading' : 'ready'}`;
        if (s.armaCambiandoTimer > 0) statWeaponValue.style.animation = 'weaponChangeAnim 0.3s forwards';
        else statWeaponValue.style.animation = 'none';
        s._prevArma = armaTexto;
    }

    // --- Torpedo ---
    const torpedoTexto = s.enfriamientoTorpedo <= 0 ? 'LISTO' : 'RECARGANDO';
    if (torpedoTexto !== s._prevTorpedo && statTorpedoValue) {
        statTorpedoValue.textContent = torpedoTexto;
        statTorpedoValue.className = `stat-value weapon-status ${torpedoTexto === 'LISTO' ? 'ready' : 'reloading'}`;
        s._prevTorpedo = torpedoTexto;
    }

    // --- Rango ---
    if (s.asesinatos !== s._prevAsesinatos && statAssassinValue) {
        const rango = RANGOS_ASESINO.slice().reverse().find(r => s.asesinatos >= r.bajas) || RANGOS_ASESINO[0];
        statAssassinValue.textContent = rango.titulo;
        s._prevAsesinatos = s.asesinatos;
    }

    // --- Barras de Progreso ---
    if (boostProgressBar) {
        const boostPercent = (s.boostEnergia / s.boostMaxEnergia) * 100;
        if (boostPercent !== s._prevBoostPercent) {
            boostProgressBar.style.width = `${boostPercent}%`;
            s._prevBoostPercent = boostPercent;
        }
        boostProgressBar.classList.toggle('reloading', s.boostEnfriamiento > 0);
        boostProgressBar.classList.toggle('low-energy', s.boostEnergia > 0 && s.boostEnergia < s.boostMaxEnergia * 0.25 && s.boostEnfriamiento <= 0);
    }

    if (laserProgressBar) {
        const laserPercent = (s.laserEnergia / s.laserMaxEnergia) * 100;
        if (laserPercent !== s._prevLaserPercent) {
            laserProgressBar.style.width = `${laserPercent}%`;
            s._prevLaserPercent = laserPercent;
        }
        laserProgressBar.classList.toggle('active', !!s.laserActivo);
    }

    if (shieldProgressBar) {
        const shieldPercent = (s.shieldEnergia / s.shieldMaxEnergia) * 100;
        if (shieldPercent !== s._prevShieldPercent) {
            shieldProgressBar.style.width = `${shieldPercent}%`;
            const shieldRatio = s.shieldEnergia / s.shieldMaxEnergia;
            if (s.shieldEnfriamiento <= 0) {
                const hue = shieldRatio * 195;
                shieldProgressBar.style.background = `linear-gradient(to right, hsl(${hue}, 100%, 65%), hsl(${hue}, 100%, 45%))`;
            } else {
                shieldProgressBar.style.background = '';
            }
            s._prevShieldPercent = shieldPercent;
        }
        shieldProgressBar.classList.toggle('reloading', s.shieldEnfriamiento > 0);
        shieldProgressBar.classList.toggle('active', !!s.shieldActivo);
        shieldProgressBar.classList.toggle('hit', s.shieldHitTimer > 0);
    }

    // --- Barra de vida del jefe ---
    if (bossHealthContainer && bossHealthBar) {
        const jefeHp = s.jefe ? s.jefe.hp : -1;
        if (jefeHp !== s._prevJefeHp) {
            if (jefeHp > -1) {
                bossHealthContainer.style.display = 'block';
                const hpProgress = clamp(jefeHp / s.jefe.maxHp, 0, 1);
                bossHealthBar.style.width = `${hpProgress * 100}%`;
            } else {
                bossHealthContainer.style.display = 'none';
            }
            s._prevJefeHp = jefeHp;
        }
    }
}

export function poblarSelectorDeNiveles(container, configs, maxNivel, onSelect) {
    if (!container || !Array.isArray(configs)) return;
    container.innerHTML = '';

    configs.forEach((config, index) => {
        const nivelNum = index + 1;
        const btn = document.createElement('button');
        btn.classList.add('levelbtn');
        btn.dataset.nivel = nivelNum;

        if (nivelNum <= maxNivel) {
            btn.textContent = nivelNum;
            btn.onclick = () => {
                if (typeof onSelect === 'function') onSelect(nivelNum);
            };
        } else {
            btn.disabled = true;
        }
        container.appendChild(btn);
    });
}

export function actualizarSeleccionNivelVisual(container, seleccionadoIndex) {
    if (!container) return;
    const botonesNivel = container.querySelectorAll('.levelbtn:not(:disabled)');
    botonesNivel.forEach((btn, index) => {
        btn.classList.toggle('selected', index === seleccionadoIndex);
    });
}

export function mostrarVistaMenuPrincipal(desdePausa, ctxData) {
    const {
        S,
        overlay,
        uiElements,
        menuFlyBy,
        animales,
        sharkListo,
        whaleListo,
        generarAnimal,
        setModoSuperposicion
    } = ctxData;

    const {
        mainMenu,
        brandLogo,
        welcomeMessage,
        promptEl,
        titleEl,
        captainImage,
        finalStats,
        startBtn,
        restartBtn,
        levelTransition,
        mainMenuContent,
        levelSelectContent
    } = uiElements;

    if (!mainMenu) return;

    if (desdePausa) {
        S.pausar('music');
    } else {
        S.detener('music');
    }

    if (overlay) overlay.classList.add('initial-menu');
    S.reproducir('theme_main');

    if (brandLogo) brandLogo.style.display = 'block';
    if (welcomeMessage) welcomeMessage.style.display = 'block';
    if (promptEl) promptEl.style.display = 'block';
    if (titleEl) titleEl.style.display = 'none';
    if (captainImage) captainImage.style.display = 'block';
    if (finalStats) finalStats.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
    if (restartBtn) restartBtn.style.display = 'none';

    if (typeof setModoSuperposicion === 'function') {
        setModoSuperposicion(desdePausa ? 'pause' : 'menu');
    }

    if (mainMenu) mainMenu.style.display = 'block';

    if (menuFlyBy) {
        menuFlyBy.active = false;
        menuFlyBy.cooldown = 4.0 + Math.random() * 4;
    }

    if (!desdePausa && Array.isArray(animales)) {
        animales.length = 0;
        const tiposMenu = [
            'normal', 'normal', 'normal',
            sharkListo ? 'shark' : 'normal',
            whaleListo ? 'whale' : 'normal',
        ];
        for (let i = 0; i < 4; i++) {
            const tipoAleatorio = tiposMenu[Math.floor(Math.random() * tiposMenu.length)];
            setTimeout(() => {
                if (typeof generarAnimal === 'function') generarAnimal(false, tipoAleatorio);
            }, i * 2500);
        }
    }
    if (levelTransition) levelTransition.style.display = 'none';
    if (overlay) overlay.style.display = 'grid';
    if (mainMenuContent) mainMenuContent.style.display = 'block';
    if (levelSelectContent) levelSelectContent.style.display = 'none';
}

export function mostrarPantallaGameOver(ctxData) {
    const {
        estadoJuego,
        guardarPuntuacionMaxima,
        getPuntuacionMaxima,
        setPuntuacionMaxima,
        uiElements,
        S,
        overlay,
        menuFlyBy,
        animales,
        sharkListo,
        whaleListo,
        generarAnimal,
        setModoSuperposicion
    } = ctxData;

    if (!estadoJuego) return;

    let pMax = getPuntuacionMaxima();
    if (estadoJuego.puntuacion > pMax) {
        setPuntuacionMaxima(estadoJuego.puntuacion);
        if (typeof guardarPuntuacionMaxima === 'function') guardarPuntuacionMaxima();
    }

    const {
        mainMenu,
        levelTransition,
        brandLogo,
        welcomeMessage,
        promptEl,
        titleEl,
        captainImage,
        statScore,
        statDepth,
        statSpecimens,
        statDistance,
        finalStats,
        mainMenuContent,
        levelSelectContent,
        startBtn,
        restartBtn,
        bossHealthContainer,
        gameplayHints
    } = uiElements;

    if (mainMenu) mainMenu.style.display = 'block';
    if (levelTransition) levelTransition.style.display = 'none';
    if (brandLogo) brandLogo.style.display = 'none';
    if (welcomeMessage) welcomeMessage.style.display = 'none';
    if (promptEl) promptEl.style.display = 'none';

    if (titleEl) {
        titleEl.style.display = 'block';
        titleEl.textContent = 'Fin de la expedición';
        titleEl.style.color = '';
    }
    if (captainImage) captainImage.style.display = 'block';
    if (statScore) statScore.textContent = 'PUNTUACIÓN: ' + estadoJuego.puntuacion;
    if (statDepth) statDepth.textContent = 'PROFUNDIDAD MÁXIMA: ' + estadoJuego.profundidad_m + ' m';
    if (statSpecimens) statSpecimens.textContent = 'ESPECÍMENES: ' + estadoJuego.rescatados;
    const distanciaKm = (estadoJuego.distanciaRecorrida / 1000).toFixed(2);
    if (statDistance) statDistance.textContent = 'DISTANCIA RECORRIDA: ' + distanciaKm + ' km';
    if (finalStats) finalStats.style.display = 'block';
    if (mainMenuContent) mainMenuContent.style.display = 'block';
    if (levelSelectContent) levelSelectContent.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'inline-block';

    if (typeof setModoSuperposicion === 'function') setModoSuperposicion('gameover');

    if (overlay) {
        overlay.style.display = 'grid';
        overlay.classList.add('initial-menu');
    }
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
    if (gameplayHints) gameplayHints.classList.remove('visible');

    estadoJuego.faseJuego = 'gameover';
    S.reproducir('gameover');
    setTimeout(() => S.reproducir('theme_main'), 1500);

    if (menuFlyBy) {
        menuFlyBy.active = false;
        menuFlyBy.cooldown = 4.0 + Math.random() * 4;
    }
    if (Array.isArray(animales)) {
        animales.length = 0;
        const tiposMenu = ['normal', 'normal', 'normal', sharkListo ? 'shark' : 'normal', whaleListo ? 'whale' : 'normal'];
        for (let i = 0; i < 4; i++) {
            const tipoAleatorio = tiposMenu[Math.floor(Math.random() * tiposMenu.length)];
            setTimeout(() => {
                if (typeof generarAnimal === 'function') generarAnimal(false, tipoAleatorio);
            }, i * 2500);
        }
    }
}

export function ganarJuego(ctxData) {
    const {
        estadoJuego,
        Levels,
        setNivelMaximoAlcanzado,
        getPuntuacionMaxima,
        setPuntuacionMaxima,
        guardarPuntuacionMaxima,
        uiElements,
        S,
        overlay,
        setModoSuperposicion
    } = ctxData;

    if (!estadoJuego || estadoJuego.faseJuego === 'gameover') return;

    const maxNivel = Levels && Levels.CONFIG_NIVELES ? Levels.CONFIG_NIVELES.length : 10;
    if (typeof setNivelMaximoAlcanzado === 'function') setNivelMaximoAlcanzado(maxNivel);
    try { localStorage.setItem(CLAVE_NIVEL_MAX, String(maxNivel)); } catch (e) { }

    estadoJuego.faseJuego = 'gameover';
    estadoJuego.enEjecucion = false;
    S.detener('music');
    S.detener('laser_beam');
    S.detener('boost');
    S.detener('gatling_fire');
    S.reproducir('victory');
    setTimeout(() => S.reproducir('theme_main'), 2000);

    let pMax = getPuntuacionMaxima();
    if (estadoJuego.puntuacion > pMax) {
        setPuntuacionMaxima(estadoJuego.puntuacion);
        if (typeof guardarPuntuacionMaxima === 'function') guardarPuntuacionMaxima();
    }

    const {
        mainMenu,
        levelTransition,
        welcomeMessage,
        promptEl,
        brandLogo,
        captainImage,
        titleEl,
        statScore,
        statDepth,
        statSpecimens,
        statDistance,
        finalStats,
        mainMenuContent,
        levelSelectContent,
        startBtn,
        restartBtn,
        bossHealthContainer,
        gameplayHints
    } = uiElements;

    if (mainMenu) mainMenu.style.display = 'block';
    if (levelTransition) levelTransition.style.display = 'none';
    if (welcomeMessage) welcomeMessage.style.display = 'none';
    if (promptEl) promptEl.style.display = 'none';
    if (brandLogo) brandLogo.style.display = 'none';
    if (captainImage) captainImage.style.display = 'none';
    if (titleEl) {
        titleEl.style.display = 'block';
        titleEl.textContent = '¡VICTORIA!';
        titleEl.style.color = '#ffdd77';
    }
    if (statScore) statScore.textContent = 'PUNTUACIÓN FINAL: ' + estadoJuego.puntuacion;
    if (statDepth) statDepth.textContent = 'PROFUNDIDAD MÁXIMA: ' + estadoJuego.profundidad_m + ' m';
    if (statSpecimens) statSpecimens.textContent = 'ESPECÍMENES TOTALES: ' + estadoJuego.rescatados;
    const distanciaKm = (estadoJuego.distanciaRecorrida / 1000).toFixed(2);
    if (statDistance) statDistance.textContent = 'DISTANCIA TOTAL: ' + distanciaKm + ' km';
    if (finalStats) finalStats.style.display = 'block';
    if (mainMenuContent) mainMenuContent.style.display = 'block';
    if (levelSelectContent) levelSelectContent.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'inline-block';

    if (typeof setModoSuperposicion === 'function') setModoSuperposicion('gameover');
    if (overlay) {
        overlay.style.display = 'grid';
        overlay.classList.remove('initial-menu');
    }
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
    if (gameplayHints) gameplayHints.classList.remove('visible');
}
