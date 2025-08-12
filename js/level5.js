// js/level5.js
'use strict';

// Importamos lo que necesitamos de game.js
import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, torpedos, proyectiles } from './game.js';

// --- ESTADO Y ENTIDADES DEL NIVEL 5 ---
let escombrosCayendo = [];
let corrientes = [];

let spawnTimerEscombros = 0;
let spawnTimerCorrientes = 0;

const VELOCIDAD_ASCENSO = 200; // Píxeles por segundo que la "cámara" sube

// --- FUNCIONES DEL NIVEL 5 ---

function generarEscombro() {
    const x = Math.random() * W;
    const velocidad = 400 + Math.random() * 400; // Caen más rápido que el ascenso
    const tamano = 30 + Math.random() * 60;
    const velocidadRotacion = (Math.random() - 0.5) * 4;

    escombrosCayendo.push({
        x: x,
        y: -tamano, // Empiezan justo arriba de la pantalla
        vy: velocidad,
        tamano: tamano,
        rotacion: Math.random() * Math.PI * 2,
        vRot: velocidadRotacion,
        hp: Math.ceil(tamano / 30) // Escombros más grandes necesitan más golpes
    });
}

function generarCorriente() {
    const desdeIzquierda = Math.random() > 0.5;
    const y = H * 0.1 + Math.random() * H * 0.8;
    const fuerza = (250 + Math.random() * 200) * (desdeIzquierda ? 1 : -1);
    const ancho = 150 + Math.random() * 150;
    const duracion = 1.5 + Math.random() * 2;

    corrientes.push({
        y,
        fuerza,
        ancho,
        duracion,
        maxDuracion: duracion,
        isLeft: desdeIzquierda
    });
    S.reproducir('ink'); // Reutilizamos un sonido para la corriente
}


// --- INTERFAZ PÚBLICA DEL MÓDULO ---

export function init() {
    console.log("Inicializando Nivel 5: El Colapso de la Fosa");
    escombrosCayendo = [];
    corrientes = [];
    spawnTimerEscombros = 0.5;
    spawnTimerCorrientes = 3.0;
    // Sobreescribimos la posición del jugador para que sea relativa a toda la pantalla
    jugador.x = W / 2;
    jugador.y = H - 100;
}

export function update(dt) {
    if (!estadoJuego || estadoJuego.nivel !== 5) return;
    
    // 1. SCROLL VERTICAL: Mover todo hacia abajo para simular ascenso
    for (const escombro of escombrosCayendo) {
        escombro.y += VELOCIDAD_ASCENSO * dt;
    }
    for (const corriente of corrientes) {
        corriente.y += VELOCIDAD_ASCENSO * dt;
    }
    const jugadorPX = { x: jugador.x, y: jugador.y };

    // 2. Control del jugador (modificado para movimiento libre)
    const teclas = estadoJuego.teclasActivas;
    let vx = 0;
    let vy = -VELOCIDAD_ASCENSO;

    if (teclas['ArrowUp']) vy -= 400;
    if (teclas['ArrowDown']) vy += 400;
    if (teclas['ArrowLeft']) vx -= 400;
    if (teclas['ArrowRight']) vx += 400;

    jugadorPX.x += vx * dt;
    jugadorPX.y += vy * dt;
    
    // 3. Aplicar fuerza de corrientes
    for (const corriente of corrientes) {
        if (jugadorPX.y > corriente.y - corriente.ancho/2 && jugadorPX.y < corriente.y + corriente.ancho/2) {
            jugadorPX.x += corriente.fuerza * dt;
        }
    }

    // 4. Mantener al jugador en pantalla y comprobar si se queda atrás
    jugadorPX.x = clamp(jugadorPX.x, jugador.r, W - jugador.r);
    
    if (jugadorPX.y > H + jugador.r) { // Da un pequeño margen para salir
         if (estadoJuego.vidas > 0) {
            estadoJuego.vidas--;
            estadoJuego.animVida = 0.6;
            S.reproducir('choque'); // <-- MODIFICADO
            jugadorPX.y = H - 50; // Reposicionar para darle una oportunidad
        }
        if (estadoJuego.vidas <= 0) {
            perderJuego();
        }
    }
    // Sujetar la posición Y del jugador para que no suba por encima de la pantalla
    jugadorPX.y = clamp(jugadorPX.y, jugador.r, H + jugador.r);


    // Actualizamos el objeto jugador global
    jugador.x = jugadorPX.x;
    jugador.y = jugadorPX.y;


    // 5. Manejar spawners
    spawnTimerEscombros -= dt;
    if (spawnTimerEscombros <= 0) {
        generarEscombro();
        spawnTimerEscombros = 0.5 + Math.random() * 0.5;
    }
    spawnTimerCorrientes -= dt;
    if (spawnTimerCorrientes <= 0) {
        generarCorriente();
        spawnTimerCorrientes = 2.5 + Math.random() * 2;
    }


    // 6. Actualizar y comprobar colisiones para cada escombro
    for (let i = escombrosCayendo.length - 1; i >= 0; i--) {
        const escombro = escombrosCayendo[i];
        escombro.y += escombro.vy * dt;
        escombro.rotacion += escombro.vRot * dt;

        // Colisión con el jugador
        const dist = Math.hypot(jugador.x - escombro.x, jugador.y - escombro.y);
        if (dist < jugador.r + escombro.tamano / 2) {
            generarExplosion(escombro.x, escombro.y, '#cccccc');
            escombrosCayendo.splice(i, 1);
            if (estadoJuego.vidas > 1) { // Daño masivo, pierde 2 vidas
                estadoJuego.vidas -= 2;
                estadoJuego.animVida = 0.6;
                S.reproducir('choque'); // <-- MODIFICADO
            } else if (estadoJuego.vidas > 0) {
                S.reproducir('choque'); // <-- MODIFICADO
                estadoJuego.vidas = 0;
                perderJuego();
            }
            continue;
        }

        // Colisión con torpedos y proyectiles
        let destruido = false;
        const proyectilesTotales = [...torpedos, ...proyectiles];
        for (let j = proyectilesTotales.length - 1; j >= 0; j--) {
            const p = proyectilesTotales[j];
             if (p.x < escombro.x + escombro.tamano / 2 && p.x + (p.w || 0) > escombro.x - escombro.tamano / 2 &&
                 p.y < escombro.y + escombro.tamano / 2 && p.y + (p.h || 0) > escombro.y - escombro.tamano / 2) {
                escombro.hp -= (p.w > 15) ? 3 : 1;
                
                if (torpedos.includes(p)) torpedos.splice(torpedos.indexOf(p), 1);
                if (proyectiles.includes(p)) proyectiles.splice(proyectiles.indexOf(p), 1);

                if (escombro.hp <= 0) {
                    generarExplosion(escombro.x, escombro.y, '#cccccc');
                    escombrosCayendo.splice(i, 1);
                    estadoJuego.puntuacion += Math.floor(escombro.tamano);
                    destruido = true;
                    break;
                }
            }
        }
        if (destruido) continue;

        if (escombrosCayendo[i] && escombrosCayendo[i].y > H + escombrosCayendo[i].tamano) {
            escombrosCayendo.splice(i, 1);
        }
    }
    
    // Actualizar corrientes
    for (let i = corrientes.length - 1; i >= 0; i--) {
        corrientes[i].duracion -= dt;
        if (corrientes[i].duracion <= 0 || corrientes[i].y > H + corrientes[i].ancho) {
            corrientes.splice(i, 1);
        }
    }
}


export function draw() {
    if (!ctx) return;
    
    // Dibujar corrientes de agua
    for (const corriente of corrientes) {
        const alpha = clamp(corriente.duracion / corriente.maxDuracion, 0, 1) * 0.3;
        const gradX_start = corriente.isLeft ? 0 : W;
        const gradX_end = corriente.isLeft ? 400 : W - 400;
        
        let grad = ctx.createLinearGradient(gradX_start, corriente.y, gradX_end, corriente.y);
        grad.addColorStop(0, `rgba(200, 230, 255, ${alpha * 2})`);
        grad.addColorStop(1, `rgba(200, 230, 255, 0)`);
        ctx.fillStyle = grad;

        ctx.beginPath();
        if(corriente.isLeft) {
            ctx.moveTo(0, corriente.y - corriente.ancho / 2);
            ctx.lineTo(400, corriente.y);
            ctx.lineTo(0, corriente.y + corriente.ancho / 2);
        } else {
            ctx.moveTo(W, corriente.y - corriente.ancho / 2);
            ctx.lineTo(W - 400, corriente.y);
            ctx.lineTo(W, corriente.y + corriente.ancho / 2);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Dibujar escombros
    ctx.fillStyle = '#6D5A46';
    ctx.strokeStyle = '#413529';
    ctx.lineWidth = 2;
    for (const escombro of escombrosCayendo) {
        ctx.save();
        ctx.translate(escombro.x, escombro.y);
        ctx.rotate(escombro.rotacion);
        ctx.fillRect(-escombro.tamano / 2, -escombro.tamano / 2, escombro.tamano, escombro.tamano);
        ctx.strokeRect(-escombro.tamano / 2, -escombro.tamano / 2, escombro.tamano, escombro.tamano);
        ctx.restore();
    }
}