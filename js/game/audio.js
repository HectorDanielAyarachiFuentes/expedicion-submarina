'use strict';

// =================================================================================
//  GESTOR DE AUDIO Y EFECTOS HÁPTICOS (MÓDULO DESACOPLADO)
// =================================================================================

export const THEME_SONG = 'canciones/dulcehermosa.mp3';
export const GAME_PLAYLIST = [
    'canciones/Abismo_de_Acero.mp3',
    'canciones/Batalla_de_las_Profundidades.mp3',
    'canciones/Beneath_the_Waves.mp3',
    'canciones/Oceans_Code.mp3',
    'canciones/Pixel_Pandemonium.mp3'
];

export const S = (function () {
    let creado = false;
    const a = {}; // Almacena { element: AudioElement, source: MediaElementAudioSourceNode | null }
    let _silenciado = false;
    let musicaActual = null;
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;

    const mapaFuentes = {
        theme_main: THEME_SONG,
        arpon: 'sonidos/submarino/arpon.wav',
        choque: 'sonidos/choque.wav',
        gameover: 'sonidos/gameover.wav',
        torpedo: 'sonidos/submarino/torpedo.wav',
        boss_hit: 'sonidos/boss_hit.mp3',
        victory: 'sonidos/victoria.mp3',
        ink: 'sonidos/ink.wav',
        shotgun: 'sonidos/submarino/shotgun.wav',
        machinegun: 'sonidos/submarino/machinegun.wav',
        gatling_spinup: 'sonidos/submarino/boost.wav',
        gatling_fire: 'sonidos/submarino/machinegun.wav',
        reload: 'sonidos/submarino/reload.wav',
        laser_beam: 'sonidos/submarino/laser.wav',
        choque_ligero: 'sonidos/choque_ligero.mp3',
        disparo_enemigo: 'sonidos/disparo_enemigo.mp3',
        explosion_grande: 'sonidos/explosion_grande.mp3',
        explosion_simple: 'sonidos/explosion_simple.mp3',
        powerup: 'sonidos/powerup.mp3',
        whale_song1: 'sonidos/ballena/ballenacanta1.mp3',
        whale_song2: 'sonidos/ballena/ballenacanta2.mp3',
        whale_song3: 'sonidos/ballena/ballenacanta3.mp3',
        whale_spout: 'sonidos/ballena/ballenachorro.mp3',
        boost: 'sonidos/submarino/boost.wav',
        sonar_ping: 'sonidos/sonar_ping.wav'
    };

    GAME_PLAYLIST.forEach((cancion, i) => { mapaFuentes[`music_${i}`] = cancion; });

    function initAudioContext() {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            analyser.connect(audioCtx.destination);
        } catch (e) {
            console.error("Web Audio API no soportada:", e);
            audioCtx = null;
        }
    }

    function init() {
        if (creado) return;
        creado = true;
        initAudioContext();
        for (const k in mapaFuentes) {
            try {
                const el = new Audio(mapaFuentes[k]);
                el.crossOrigin = "anonymous";
                if (k.startsWith('music_')) {
                    el.preload = 'none';
                    el.loop = false;
                    el.volume = 0.35;
                    el.addEventListener('ended', playRandomMusic);
                } else if (k === 'theme_main') {
                    el.preload = 'auto';
                    el.loop = true;
                    el.volume = 0.35;
                } else if (k === 'laser_beam' || k === 'boost' || k === 'gatling_spinup' || k === 'gatling_fire') {
                    el.preload = 'auto';
                    el.loop = true;
                    el.volume = 0.45;
                } else if (k === 'shotgun') {
                    el.preload = 'auto';
                    el.volume = 0.2;
                } else {
                    el.preload = 'auto';
                    el.volume = 0.5;
                }
                el.addEventListener('error', function () {
                    console.error(`Error al cargar el audio: ${el.src}`);
                });
                a[k] = { element: el, source: null };
            } catch (e) {
                console.warn(`No se pudo crear el objeto de audio para: ${mapaFuentes[k]}`);
            }
        }
    }

    function reproducir(k) {
        const audioObj = a[k];
        if (!audioObj) {
            console.warn(`Se intentó reproducir un sonido no cargado: '${k}'`);
            return;
        }
        const el = audioObj.element;

        if (k.startsWith('music_') || k === 'theme_main') {
            if (audioCtx && !audioObj.source) {
                try {
                    audioObj.source = audioCtx.createMediaElementSource(el);
                    audioObj.source.connect(analyser);
                } catch (e) {
                    console.error(`No se pudo conectar el audio '${k}' al analizador:`, e);
                }
            }
        }

        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(e => console.error("Error al resumir AudioContext:", e));
        }

        try {
            el.currentTime = 0;
            const promise = el.play();
            if (promise !== undefined) {
                promise.catch(error => {
                    if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                        console.error(`Error al reproducir sonido '${k}':`, error);
                    }
                });
            }
        } catch (e) {
            console.error(`Error inesperado al reproducir '${k}':`, e);
        }
    }

    function detener(k) {
        if (k === 'music' && musicaActual) k = musicaActual;
        const audioObj = a[k];
        if (!audioObj) return;
        try {
            if (k.startsWith('music_')) { audioObj.element.removeEventListener('ended', playRandomMusic); }
            audioObj.element.pause();
            audioObj.element.currentTime = 0;
            if (k.startsWith('music_')) { audioObj.element.addEventListener('ended', playRandomMusic); }
        } catch (e) {}
    }

    function startPlaylist() {
        if (musicaActual) detener(musicaActual);
        playRandomMusic();
    }

    function playRandomMusic() {
        const posiblesCanciones = Object.keys(a).filter(k => k.startsWith('music_'));
        if (posiblesCanciones.length === 0) return;
        let nuevaCancionKey;
        do {
            const idx = Math.floor(Math.random() * posiblesCanciones.length);
            nuevaCancionKey = posiblesCanciones[idx];
        } while (posiblesCanciones.length > 1 && nuevaCancionKey === musicaActual);
        musicaActual = nuevaCancionKey;
        reproducir(musicaActual);
    }

    function playRandomWhaleSong() {
        const whaleSongs = Object.keys(a).filter(k => k.startsWith('whale_song'));
        if (whaleSongs.length === 0) return;
        const songToPlay = whaleSongs[Math.floor(Math.random() * whaleSongs.length)];
        reproducir(songToPlay);
    }

    function pausar(k) {
        if (k === 'music' && musicaActual) k = musicaActual;
        const audioObj = a[k];
        if (!audioObj) return;
        try { audioObj.element.pause(); } catch (e) {}
    }

    function bucle(k) {
        if (k === 'music' && musicaActual) k = musicaActual;
        const audioObj = a[k];
        if (!audioObj || !audioObj.element.paused) return;
        try {
            const promise = audioObj.element.play();
            if (promise !== undefined) promise.catch(() => {});
        } catch (e) {}
    }

    function getAudioData() {
        if (!analyser || !dataArray) return 0;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const bassBins = Math.floor(dataArray.length * 0.1);
        for (let i = 0; i < bassBins; i++) {
            sum += dataArray[i];
        }
        return bassBins > 0 ? sum / bassBins : 0;
    }

    function setSilenciado(m) {
        for (const k in a) {
            try { a[k].element.muted = !!m; } catch (e) {}
        }
        _silenciado = !!m;
    }

    function triggerVibration(duration, weak = 1.0, strong = 1.0) {
        try {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            if (gamepads && gamepads[0] && gamepads[0].vibrationActuator) {
                gamepads[0].vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: duration,
                    weakMagnitude: weak,
                    strongMagnitude: strong
                }).catch(() => {});
            }
        } catch (e) {}
    }

    function estaSilenciado() { return _silenciado; }
    function alternarSilenciado() { setSilenciado(!estaSilenciado()); }

    return {
        init,
        reproducir,
        detener,
        pausar,
        bucle,
        setSilenciado,
        estaSilenciado,
        alternarSilenciado,
        startPlaylist,
        playRandomWhaleSong,
        getAudioData,
        triggerVibration
    };
})();
