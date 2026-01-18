'use strict';

// 1. IMPORTAMOS LAS DEPENDENCIAS DESDE EL MOTOR DEL JUEGO
import {
    estadoJuego, jugador, W, H, carriles, ctx, generarAnimal, S, clamp, infligirDanoJugador,
    perderJuego, NUM_CARRILES, generarExplosion, generarNubeDeTinta
} from '../game/game.js';
import {
    proyectiles, torpedos
} from '../game/armas/weapons.js';

// 2. FUNCIONES EXPORTADAS (LA "API" DEL NIVEL)

/**
 * Función de inicialización. Se llama una sola vez cuando comienza el nivel.
 * Crea al jefe, prepara sus tentáculos y configura las reglas del nivel.
 */
export function init() {
    // Creamos el objeto del jefe y lo añadimos al estado global del juego.
    estadoJuego.jefe = {
        x: W - 150,
        y: H / 2,
        w: 200,
        h: 300,
        hp: 150,
        maxHp: 150,
        estado: 'idle',
        enraged: false, // Fase 2
        timerAtaque: 3,
        timerGolpe: 0,
        tentaculos: [],
    };
    // Inicializamos los tentáculos con ángulos y largos aleatorios.
    for (let i = 0; i < 6; i++) {
        estadoJuego.jefe.tentaculos.push({
            angulo: (i / 5 - 0.5) * Math.PI * 0.8,
            largo: 150 + Math.random() * 50,
            fase: Math.random() * Math.PI * 2,
        });
    }

    // Reglas del nivel
    // Regla 1: El fondo no se mueve en este nivel.
    estadoJuego.levelFlags.scrollBackground = false;

    // Regla 2: La barra de vida del jefe debe ser visible.
    const bossHealthContainer = document.getElementById('bossHealthContainer');
    if (bossHealthContainer) bossHealthContainer.style.display = 'block';

    console.log("Nivel 3: La Guarida del Kraken iniciado.");
}

/**
 * Bucle de actualización del nivel. Se llama en cada frame.
 * Contiene la IA del jefe y la lógica de colisiones.
 * @param {number} dt - Delta time.
 */
export function update(dt) {
    if (!estadoJuego.jefe) return;

    const jefe = estadoJuego.jefe;

    // --- IA Y ATAQUES DEL JEFE ---
    jefe.timerGolpe = Math.max(0, jefe.timerGolpe - dt);

    // Movimiento
    const ondulacionBase = Math.sin(estadoJuego.tiempoTranscurrido * (jefe.enraged ? 1.5 : 0.5));
    jefe.y = H / 2 + ondulacionBase * 50;

    jefe.timerAtaque -= dt;

    // Check Fase 2 (Enraged)
    if (!jefe.enraged && jefe.hp <= jefe.maxHp * 0.5) {
        jefe.enraged = true;
        S.reproducir('boss_hit'); // Sonido al enfurecerse
        generarExplosion(jefe.x, jefe.y, '#ff0000', 100);
        jefe.timerAtaque = 1; // Atacar pronto
    }

    // Decide qué ataque realizar cuando el temporizador llega a cero.
    if (jefe.timerAtaque <= 0) {
        const r = Math.random();
        jefe.estado = 'idle';

        // Probabilidades de ataque cambian si está enfurecido
        // Normal: 40% Smash, 30% Ink, 30% Minion
        // Enraged: 30% Triple Smash, 30% Ink Rain, 20% Spiral, 20% Minion

        if (jefe.enraged) {
            if (r < 0.3) {
                iniciarAtaqueTripleSmash(jefe);
            } else if (r < 0.6) {
                iniciarAtaqueLluviaTinta(jefe);
            } else if (r < 0.8) {
                iniciarAtaqueEspiral(jefe);
            } else {
                iniciarAtaqueEsbirros(jefe, 4); // 4 esbirros en lugar de 2
            }
        } else {
            if (r < 0.45) {
                iniciarAtaqueSmash(jefe);
            } else if (r < 0.75) {
                iniciarAtaqueTinta(jefe);
            } else {
                iniciarAtaqueEsbirros(jefe, 2);
            }
        }
    }

    // --- LÓGICA DE ACTUALIZACIÓN DE ATAQUES (STATE MACHINE) ---

    // 1. Barrido (Smash) y Triple Barrido
    if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
        procesarAtaqueSmash(jefe, dt);
    }
    // 2. Lluvia de Tinta (Ink Rain)
    else if (jefe.estado === 'attacking_ink_rain') {
        // En realidad es instantáneo al inicio, pero podríamos mantener estado si es una ráfaga
        // Por ahora lo hacemos instantáneo en la función de inicio y volvemos a idle.
        jefe.estado = 'idle';
        jefe.timerAtaque = jefe.enraged ? 1.5 : 2.5;
    }
    // 3. Espiral de la muerte
    else if (jefe.estado === 'attacking_spiral') {
        procesarAtaqueEspiral(jefe, dt);
    }

    // --- LÓGICA DE PROYECTILES Y COLISIONES ---

    // Tinta
    for (let i = estadoJuego.proyectilesTinta.length - 1; i >= 0; i--) {
        const ink = estadoJuego.proyectilesTinta[i];
        // Movimiento simple si le falta vx
        if (ink.vx === undefined) ink.vx = -400; // Legacy support
        ink.x += ink.vx * dt;
        ink.y += (ink.vy || 0) * dt;

        if (Math.hypot(jugador.x - ink.x, jugador.y - ink.y) < jugador.r + ink.r) {
            infligirDanoJugador(1);
            generarNubeDeTinta(ink.x, ink.y, 60);
            estadoJuego.proyectilesTinta.splice(i, 1);
            continue;
        }
        if (ink.x < -100 || ink.y < -100 || ink.y > H + 100) {
            estadoJuego.proyectilesTinta.splice(i, 1);
        }
    }

    chequearColisionesProyectiles(jefe);
}

// --- FUNCIONES AUXILIARES DE ATAQUES ---

function iniciarAtaqueSmash(jefe) {
    jefe.estado = 'attacking_smash';
    const carrilObjetivo = Math.floor(Math.random() * NUM_CARRILES);
    jefe.datosAtaque = {
        carril: carrilObjetivo, carga: 1.2, y: carriles[carrilObjetivo], progreso: 0,
        jugadorGolpeado: false, tiempoEnRayo: 0, proximoDañoRayo: 0.4,
        smashCount: 1 // Solo 1 golpe
    };
    jefe.timerAtaque = 3;
}

function iniciarAtaqueTripleSmash(jefe) {
    jefe.estado = 'attacking_smash';
    const carrilObjetivo = Math.floor(Math.random() * NUM_CARRILES);
    jefe.datosAtaque = {
        carril: carrilObjetivo,
        carga: 0.6, // Carga más rápida
        y: carriles[carrilObjetivo],
        progreso: 0,
        jugadorGolpeado: false, tiempoEnRayo: 0, proximoDañoRayo: 0.2,
        smashCount: 3, // 3 golpes
        currentSmash: 0
    };
    jefe.timerAtaque = 4;
}

function iniciarAtaqueTinta(jefe) {
    jefe.estado = 'idle'; // Instantáneo
    estadoJuego.proyectilesTinta.push({ x: jefe.x - jefe.w / 2, y: jefe.y, vx: -400, r: 20 });
    jefe.timerAtaque = 3.5;
}

function iniciarAtaqueLluviaTinta(jefe) {
    jefe.estado = 'attacking_ink_rain';
    // Disparar en abanico
    const numBolitas = 7;
    for (let i = 0; i < numBolitas; i++) {
        const angle = ((i / (numBolitas - 1)) - 0.5) * Math.PI / 2; // -45 a 45 grados
        const speed = 450;
        estadoJuego.proyectilesTinta.push({
            x: jefe.x - jefe.w / 3,
            y: jefe.y,
            vx: -Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 15
        });
    }
}

function iniciarAtaqueEspiral(jefe) {
    jefe.estado = 'attacking_spiral';
    jefe.datosAtaque = {
        duration: 3.0,
        timerDisparo: 0,
        angle: 0
    };
    jefe.timerAtaque = 5;
}

function iniciarAtaqueEsbirros(jefe, cantidad) {
    jefe.estado = 'attacking_minion';
    for (let i = 0; i < cantidad; i++) {
        setTimeout(() => generarAnimal(true), i * 300);
    }
    jefe.timerAtaque = jefe.enraged ? 3 : 5;
}

function procesarAtaqueSmash(jefe, dt) {
    // FASE 1: RAYO DE ADVERTENCIA
    if (jefe.datosAtaque.carga > 0) {
        jefe.datosAtaque.carga -= dt;

        const rayoY = jefe.datosAtaque.y;
        const rayoAlturaMedia = 25; // Un poco más ancho

        if (jugador.y + jugador.r > rayoY - rayoAlturaMedia && jugador.y - jugador.r < rayoY + rayoAlturaMedia) {
            jefe.datosAtaque.tiempoEnRayo += dt;
            if (jefe.datosAtaque.tiempoEnRayo >= jefe.datosAtaque.proximoDañoRayo) {
                infligirDanoJugador(1);
                jefe.datosAtaque.proximoDañoRayo += 0.2;
            }
        }
    }
    // FASE 2: GOLPE
    else {
        jefe.datosAtaque.progreso += dt * (jefe.enraged ? 12 : 8); // Más rápido si enraged
        const tentaculoX = W - jefe.datosAtaque.progreso * W;

        if (!jefe.datosAtaque.jugadorGolpeado && Math.hypot(jugador.x - tentaculoX, jugador.y - jefe.datosAtaque.y) < jugador.r + 40) {
            jefe.datosAtaque.jugadorGolpeado = true;
            infligirDanoJugador(1);
            S.reproducir('choque');
        }

        if (jefe.datosAtaque.progreso >= 1.2) {
            // Verificar si quedan golpes (Triple Smash)
            if (jefe.datosAtaque.smashCount > 1) {
                jefe.datosAtaque.smashCount--;
                // Preparar siguiente golpe
                const carrilObjetivo = Math.floor(Math.random() * NUM_CARRILES);
                jefe.datosAtaque.carril = carrilObjetivo;
                jefe.datosAtaque.y = carriles[carrilObjetivo];
                jefe.datosAtaque.carga = 0.4; // Carga muy rápida entre golpes
                jefe.datosAtaque.progreso = 0;
                jefe.datosAtaque.jugadorGolpeado = false;
            } else {
                jefe.estado = 'idle';
                jefe.datosAtaque = null;
                jefe.timerAtaque = jefe.enraged ? 1.0 : (2 + Math.random() * 2);
            }
        }
    }
}

function procesarAtaqueEspiral(jefe, dt) {
    jefe.datosAtaque.duration -= dt;
    jefe.datosAtaque.timerDisparo -= dt;

    // Girar emisor
    jefe.datosAtaque.angle += dt * 3;

    if (jefe.datosAtaque.timerDisparo <= 0) {
        // Disparar proyectil
        const speed = 300;
        // Dos espirales opuestas
        for (let k = 0; k < 2; k++) {
            const a = jefe.datosAtaque.angle + k * Math.PI;
            estadoJuego.proyectilesTinta.push({
                x: jefe.x,
                y: jefe.y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                r: 12
            });
        }
        jefe.datosAtaque.timerDisparo = 0.15; // Cadencia alta
    }

    if (jefe.datosAtaque.duration <= 0) {
        jefe.estado = 'idle';
        jefe.timerAtaque = 2;
    }
}

function chequearColisionesProyectiles(jefe) {
    const hitbox = { x: jefe.x - jefe.w / 4, y: jefe.y - jefe.h / 2, w: jefe.w / 2, h: jefe.h };
    // Torpedos
    for (let i = torpedos.length - 1; i >= 0; i--) {
        const t = torpedos[i];
        if (t.x > hitbox.x && t.x < hitbox.x + hitbox.w && t.y > hitbox.y && t.y < hitbox.y + hitbox.h) {
            recibirDano(jefe, t, 10);
            torpedos.splice(i, 1);
        }
    }
    // Proyectiles jugador
    for (let i = proyectiles.length - 1; i >= 0; i--) {
        const p = proyectiles[i];
        if (p.x > hitbox.x && p.x < hitbox.x + hitbox.w && p.y > hitbox.y && p.y < hitbox.y + hitbox.h) {
            recibirDano(jefe, p, 1);
            proyectiles.splice(i, 1);
        }
    }
}

function recibirDano(jefe, proyectil, cantidad) {
    if (!estadoJuego.jefe || estadoJuego.jefe.hp <= 0) return;
    generarExplosion(proyectil.x, proyectil.y, proyectil.color || '#ff8833', 30);
    jefe.hp -= cantidad;
    jefe.timerGolpe = 0.15;
    S.reproducir('boss_hit');
    if (jefe.hp <= 0) {
        estadoJuego.valorObjetivoNivel = 1;
        estadoJuego.puntuacion += 5000;
        // Efecto muerte épica
        generarExplosion(jefe.x, jefe.y, '#ffffff', 300);
        for (let i = 0; i < 10; i++) generarExplosion(jefe.x + (Math.random() - 0.5) * 200, jefe.y + (Math.random() - 0.5) * 300, '#8a2be2', 100);
    }
}

// --- FUNCIONES AUXILIARES DE DIBUJO ---

function dibujarTentaculoDetallado(ctx, jefe, t, tiempo) {
    const speedMult = jefe.enraged ? 4 : 2;
    const ampMult = jefe.enraged ? 1.5 : 1.0;

    // Calcular puntos de control curvos
    const a = t.angulo + Math.sin(tiempo * speedMult + t.fase) * 0.3 * ampMult;
    const midX = jefe.x + Math.cos(a) * t.largo * 0.5;
    const midY = jefe.y + Math.sin(a) * t.largo * 0.5;
    const endX = jefe.x + Math.cos(a + Math.sin(tiempo * (speedMult * 0.8) + t.fase) * 0.5) * t.largo;
    const endY = jefe.y + Math.sin(a + Math.sin(tiempo * (speedMult * 0.8) + t.fase) * 0.5) * t.largo;

    // Dibujar el tentáculo usando curvas cuadráticas pero con grosor variable
    // Para simular grosor variable, dibujamos varios segmentos o un path relleno
    // Aproximación simple: dibujar línea gruesa base y línea fina encima + ventosas

    // Color base
    ctx.strokeStyle = jefe.enraged ? '#7f1d1d' : '#4a0e78'; // Más oscuro
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(jefe.x, jefe.y);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    // Color luz (volumen)
    ctx.strokeStyle = jefe.enraged ? '#b91c1c' : '#7c3aed';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(jefe.x, jefe.y);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    // Ventosas (Círculos a lo largo de la curva)
    // Aproximamos la curva tomando puntos intermedios
    ctx.fillStyle = jefe.enraged ? '#fca5a5' : '#e9d5ff'; // Ventosas claras
    for (let i = 0.2; i < 0.9; i += 0.15) {
        // Interpolar cuadrática simple (Bezier de 2do grado: (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2)
        const mt = 1 - i;
        const tx = mt * mt * jefe.x + 2 * mt * i * midX + i * i * endX;
        const ty = mt * mt * jefe.y + 2 * mt * i * midY + i * i * endY;

        ctx.beginPath();
        const rVentosa = (1 - i) * 6 + 2; // Más grandes cerca de la base
        ctx.arc(tx, ty, rVentosa, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Bucle de dibujado del nivel. Dibuja al jefe y sus ataques.
 */
export function draw() {
    if (!estadoJuego.jefe) return;

    const jefe = estadoJuego.jefe;
    const time = estadoJuego.tiempoTranscurrido;
    ctx.save();

    // Vibración si está enfurecido
    if (jefe.enraged) {
        ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    }

    // Efecto de brillo blanco al ser golpeado
    if (jefe.timerGolpe > 0) ctx.filter = 'brightness(2.5)';

    // --- 1. DIBUJAR TENTÁCULOS (Detrás del cuerpo) ---
    jefe.tentaculos.forEach(t => dibujarTentaculoDetallado(ctx, jefe, t, time));

    // --- 2. DIBUJAR CUERPO (Con volumen 3D) ---
    ctx.save();

    // Respiración (escalado suave)
    const breath = 1 + Math.sin(time * 2) * 0.03;
    ctx.translate(jefe.x, jefe.y);
    ctx.scale(breath, breath);

    // Gradiente Radial para dar efecto 3D esférico/ovoide
    const gradBody = ctx.createRadialGradient(-20, -20, 10, 0, 0, jefe.w / 2);
    if (jefe.enraged) {
        gradBody.addColorStop(0, '#ef4444'); // Centro rojo brillante
        gradBody.addColorStop(0.5, '#b91c1c'); // medio rojo oscuro
        gradBody.addColorStop(1, '#450a0a'); // Borde casi negro
    } else {
        gradBody.addColorStop(0, '#a78bfa'); // Centro violeta claro
        gradBody.addColorStop(0.5, '#7c3aed'); // medio violeta
        gradBody.addColorStop(1, '#4c1d95'); // Borde oscuro
    }

    ctx.fillStyle = gradBody;
    ctx.beginPath();
    // Usar el ancho original (sin offset) ya que hemos hecho translate
    ctx.ellipse(0, 0, jefe.w / 2, jefe.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Textura: Manchas / Poros
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let k = 0; k < 5; k++) {
        // Manchas estáticas relativas al cuerpo
        ctx.beginPath();
        const mx = Math.cos(k * 2.5) * 40;
        const my = Math.sin(k * 3.0) * 80;
        ctx.arc(mx, my, 8 + k, 0, Math.PI * 2);
        ctx.fill();
    }

    // Brillo interior especial si va a cargar Espiral
    if (jefe.estado === 'attacking_spiral') {
        const pulse = Math.sin(time * 15) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 100, 100, ${pulse * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- 3. DIBUJAR OJOS (Complejos) ---
    const eyeOffset = 40;
    const eyeY = -50;

    function dibujarOjo(x, y, tam) {
        ctx.save();
        ctx.translate(x, y);

        // Esclerótica (Blanco del ojo)
        ctx.fillStyle = '#fff';
        if (jefe.enraged) ctx.fillStyle = '#fef3c7'; // Amarillento infectado
        ctx.beginPath(); ctx.arc(0, 0, tam, 0, Math.PI * 2); ctx.fill();

        // Sombra interna ojo
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Iris
        const irisColor = jefe.enraged ? '#dc2626' : '#2563eb'; // Rojo sangre vs Azul
        ctx.fillStyle = irisColor;

        // Pupila que sigue al jugador (calculada antes, pero ahora local)
        // Necesitamos coordenadas mundo para clamp
        const worldEyeX = jefe.x + (x * breath); // Aprox
        const worldEyeY = jefe.y + (y * breath);

        const mirarX = clamp((jugador.x - worldEyeX) * 0.2, -tam * 0.4, tam * 0.4);
        const mirarY = clamp((jugador.y - worldEyeY) * 0.2, -tam * 0.4, tam * 0.4);

        ctx.beginPath();
        ctx.arc(mirarX, mirarY, tam * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Pupila
        ctx.fillStyle = '#000';
        // Enraged: pupila afilada (gato/reptil)
        if (jefe.enraged) {
            ctx.beginPath();
            ctx.ellipse(mirarX, mirarY, 3, tam * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(mirarX, mirarY, tam * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }

        // Brillo especular (Reflejo de luz, siempre arriba izquierda)
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(mirarX - 5, mirarY - 5, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    dibujarOjo(-eyeOffset, eyeY, 28);
    dibujarOjo(eyeOffset, eyeY, 28);

    ctx.restore(); // Restaurar transformaciones del cuerpo

    // --- 4. EFECTOS DE ATAQUE MUNDIALES (Fuera del transform del cuerpo) ---
    // Barrido Smash
    if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
        if (jefe.datosAtaque.carga > 0) { // Warning
            ctx.fillStyle = jefe.enraged ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 50, 50, 0.3)';
            // Barra parpadeante
            if (Math.floor(time * 10) % 2 === 0) {
                ctx.fillRect(0, jefe.datosAtaque.y - 30, W, 60);
            }

            // Línea guía
            ctx.strokeStyle = '#ef4444';
            ctx.setLineDash([20, 20]);
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(0, jefe.datosAtaque.y); ctx.lineTo(W, jefe.datosAtaque.y); ctx.stroke();
            ctx.setLineDash([]);
        } else { // Tentáculo gigante
            const tentaculoX = W - jefe.datosAtaque.progreso * (W + 200);

            // Dibujar tentáculo gigante de ataque
            ctx.fillStyle = jefe.enraged ? '#991b1b' : '#be123c';
            ctx.strokeStyle = jefe.enraged ? '#7f1d1d' : '#881337';
            ctx.lineWidth = 10;

            ctx.beginPath();
            ctx.moveTo(tentaculoX + 400, jefe.datosAtaque.y - 40); // Base fuera pantalla
            ctx.lineTo(tentaculoX, jefe.datosAtaque.y); // Punta
            ctx.lineTo(tentaculoX + 400, jefe.datosAtaque.y + 40);
            ctx.fill();
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * El Nivel 3 no tiene misiones, por lo que esta función devuelve null.
 */
export function getEstadoMision() {
    return null;
}

/**
 * El Nivel 3 no tiene misiones de racha o captura, por lo que estas funciones
 * pueden estar vacías, pero deben existir para mantener la consistencia de la API de niveles.
 */
export function onAnimalCazado(tipoAnimal) {
    // No aplica en este nivel
}

export function onFallo() {
    // No aplica en este nivel
}