'use strict';

// 1. IMPORTAMOS LAS DEPENDENCIAS DESDE EL MOTOR DEL JUEGO
import { 
    estadoJuego, jugador, W, H, carriles, ctx, generarAnimal, S, clamp, 
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
    jefe.y = H / 2 + Math.sin(estadoJuego.tiempoTranscurrido * 0.5) * 50; // Movimiento ondulante
    jefe.timerAtaque -= dt;

    // Decide qué ataque realizar cuando el temporizador llega a cero.
    if (jefe.timerAtaque <= 0) {
        const tipoAtaque = Math.random();
        jefe.estado = 'idle';

        if (tipoAtaque < 0.45) { // Ataque de barrido / rayo
            jefe.estado = 'attacking_smash';
            const carrilObjetivo = Math.floor(Math.random() * NUM_CARRILES);
            jefe.datosAtaque = {
                carril: carrilObjetivo, carga: 1.2, y: carriles[carrilObjetivo], progreso: 0,
                jugadorGolpeado: false,   // Para el barrido final
                tiempoEnRayo: 0,          // Cuánto tiempo ha pasado el jugador dentro del rayo
                proximoDañoRayo: 0.4      // El umbral de tiempo para el siguiente tick de daño
            };
            jefe.timerAtaque = 3;
        } else if (tipoAtaque < 0.75) { // Lanzar tinta
            jefe.estado = 'attacking_ink';
            estadoJuego.proyectilesTinta.push({ x: jefe.x - jefe.w / 2, y: jefe.y, vx: -400, r: 20 });
            jefe.timerAtaque = 3.5;
        } else { // Invocar esbirros
            jefe.estado = 'attacking_minion';
            for (let i = 0; i < 2; i++) {
                setTimeout(() => generarAnimal(true), i * 300); // `true` indica que es un esbirro
            }
            jefe.timerAtaque = 5;
        }
    }

    // --- LÓGICA DE DAÑO DE CADA ATAQUE ---

    // 1. Lógica del ataque combinado de rayo y barrido
    if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
        // --- FASE 1: EL RAYO DE ADVERTENCIA (AHORA HACE DAÑO) ---
        if (jefe.datosAtaque.carga > 0) {
            jefe.datosAtaque.carga -= dt;
            
            const rayoY = jefe.datosAtaque.y;
            const rayoAlturaMedia = 20;
            
            // Comprobamos si el jugador está dentro de la zona del rayo
            if (jugador.y + jugador.r > rayoY - rayoAlturaMedia && jugador.y - jugador.r < rayoY + rayoAlturaMedia) {
                jefe.datosAtaque.tiempoEnRayo += dt;
                
                if (jefe.datosAtaque.tiempoEnRayo >= jefe.datosAtaque.proximoDañoRayo) {
                    if (estadoJuego.vidas > 0) {
                        estadoJuego.vidas--;
                        S.reproducir('choque');
                        estadoJuego.animVida = 0.6;
                    }
                    if (estadoJuego.vidas <= 0) perderJuego();
                    jefe.datosAtaque.proximoDañoRayo += 0.4;
                }
            } else {
                jefe.datosAtaque.tiempoEnRayo = 0;
                jefe.datosAtaque.proximoDañoRayo = 0.4;
            }

        // --- FASE 2: EL BARRIDO DEL TENTÁCULO ---
        } else {
            jefe.datosAtaque.progreso += dt * 8;
            const tentaculoX = W - jefe.datosAtaque.progreso * W;
            
            if (!jefe.datosAtaque.jugadorGolpeado && Math.hypot(jugador.x - tentaculoX, jugador.y - jefe.datosAtaque.y) < jugador.r + 30) {
                jefe.datosAtaque.jugadorGolpeado = true;
                if (estadoJuego.vidas > 0) {
                    estadoJuego.vidas--;
                    S.reproducir('choque');
                    estadoJuego.animVida = 0.6;
                }
                if (estadoJuego.vidas <= 0) perderJuego();
            }

            if (jefe.datosAtaque.progreso >= 1.2) {
                jefe.estado = 'idle';
                jefe.datosAtaque = null;
                jefe.timerAtaque = 2 + Math.random() * 2;
            }
        }
    }

    // 2. Lógica del ataque de tinta
    for (let i = estadoJuego.proyectilesTinta.length - 1; i >= 0; i--) {
        const ink = estadoJuego.proyectilesTinta[i];
        if (Math.hypot(jugador.x - ink.x, jugador.y - ink.y) < jugador.r + ink.r) {
            if (estadoJuego.vidas > 0) {
                estadoJuego.vidas--;
                S.reproducir('choque'); 
                estadoJuego.animVida = 0.6;
            }
            if (estadoJuego.vidas <= 0) perderJuego();
            generarNubeDeTinta(ink.x, ink.y, 60);
            estadoJuego.proyectilesTinta.splice(i, 1);
            break; 
        }
    }

    // --- LÓGICA DE COLISIONES: JUGADOR ATACANDO AL JEFE ---
    function chequearColisionesProyectiles() {
        const hitbox = { x: jefe.x - jefe.w / 4, y: jefe.y - jefe.h / 2, w: jefe.w / 2, h: jefe.h };
        for (let i = torpedos.length - 1; i >= 0; i--) {
            const t = torpedos[i];
            if (t.x > hitbox.x && t.x < hitbox.x + hitbox.w && t.y > hitbox.y && t.y < hitbox.y + hitbox.h) {
                recibirDano(t, 10);
                torpedos.splice(i, 1);
            }
        }
        for (let i = proyectiles.length - 1; i >= 0; i--) {
            const p = proyectiles[i];
            if (p.x > hitbox.x && p.x < hitbox.x + hitbox.w && p.y > hitbox.y && p.y < hitbox.y + hitbox.h) {
                recibirDano(p, 1);
                proyectiles.splice(i, 1);
            }
        }
    }

    function recibirDano(proyectil, cantidad) {
        if (!estadoJuego.jefe || estadoJuego.jefe.hp <= 0) return;
        generarExplosion(proyectil.x, proyectil.y, proyectil.color || '#ff8833');
        jefe.hp -= cantidad;
        jefe.timerGolpe = 0.15;
        S.reproducir('boss_hit');
        if (jefe.hp <= 0) {
            estadoJuego.valorObjetivoNivel = 1;
            estadoJuego.puntuacion += 5000;
        }
    }
    
    chequearColisionesProyectiles();
}

/**
 * Bucle de dibujado del nivel. Dibuja al jefe y sus ataques.
 */
export function draw() {
    if (!estadoJuego.jefe) return;

    const jefe = estadoJuego.jefe;
    ctx.save();
    
    // Efecto de parpadeo blanco al ser golpeado
    if (jefe.timerGolpe > 0) ctx.filter = 'brightness(2.5)';
    
    // Dibuja los tentáculos
    ctx.strokeStyle = '#6a0dad'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    jefe.tentaculos.forEach(t => { 
        ctx.beginPath(); 
        ctx.moveTo(jefe.x, jefe.y); 
        const a = t.angulo + Math.sin(estadoJuego.tiempoTranscurrido * 2 + t.fase) * 0.3; 
        const midX = jefe.x + Math.cos(a) * t.largo * 0.5; 
        const midY = jefe.y + Math.sin(a) * t.largo * 0.5; 
        const endX = jefe.x + Math.cos(a + Math.sin(estadoJuego.tiempoTranscurrido * 1.5 + t.fase) * 0.5) * t.largo; 
        const endY = jefe.y + Math.sin(a + Math.sin(estadoJuego.tiempoTranscurrido * 1.5 + t.fase) * 0.5) * t.largo; 
        ctx.quadraticCurveTo(midX, midY, endX, endY); 
        ctx.stroke(); 
    });
    
    // Dibuja el cuerpo del jefe
    ctx.fillStyle = '#8a2be2'; 
    ctx.beginPath(); 
    ctx.ellipse(jefe.x, jefe.y, jefe.w / 2, jefe.h / 2, 0, 0, Math.PI * 2); 
    ctx.fill();
    
    // Dibuja los ojos
    ctx.fillStyle = '#fff'; 
    ctx.beginPath(); 
    ctx.arc(jefe.x - 40, jefe.y - 50, 25, 0, Math.PI * 2); 
    ctx.arc(jefe.x + 40, jefe.y - 50, 25, 0, Math.PI * 2); 
    ctx.fill();
    
    // Dibuja las pupilas que siguen al jugador
    ctx.fillStyle = '#000'; 
    ctx.beginPath(); 
    let pupilaX = clamp(jugador.x, jefe.x - 50, jefe.x - 30); 
    ctx.arc(pupilaX, jefe.y - 50, 10, 0, Math.PI * 2); 
    pupilaX = clamp(jugador.x, jefe.x + 30, jefe.x + 50); 
    ctx.arc(pupilaX, jefe.y - 50, 10, 0, Math.PI * 2); 
    ctx.fill();
    
    // Dibuja los efectos del ataque de barrido
    if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
        if (jefe.datosAtaque.carga > 0) { // Dibuja la zona de advertencia
            ctx.fillStyle = 'rgba(255, 50, 50, 0.4)'; 
            ctx.fillRect(0, jefe.datosAtaque.y - 20, W, 40); 
            ctx.strokeStyle = '#e04040'; 
            ctx.lineWidth = 40; 
            ctx.beginPath(); 
            ctx.moveTo(W, jefe.datosAtaque.y); 
            ctx.lineTo(W - 100, jefe.datosAtaque.y + (Math.random() - 0.5) * 20); 
            ctx.stroke();
        } else { // Dibuja el tentáculo de ataque
            const tentaculoX = W - jefe.datosAtaque.progreso * (W + 200); 
            ctx.strokeStyle = '#e04040'; 
            ctx.lineWidth = 40; 
            ctx.beginPath(); 
            ctx.moveTo(tentaculoX + 200, jefe.datosAtaque.y - 20); 
            ctx.lineTo(tentaculoX, jefe.datosAtaque.y); 
            ctx.lineTo(tentaculoX + 200, jefe.datosAtaque.y + 20); 
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