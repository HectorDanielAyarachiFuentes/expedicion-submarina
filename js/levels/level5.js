'use strict';

// Importamos lo que necesitamos de game.js
import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, generarParticula, particulasBurbujas, proyectilesEnemigos } from '../game/game.js';
import { 
    torpedos, proyectiles 
} from '../game/armas/weapons.js';

// --- ESTADO Y ENTIDADES DEL NIVEL 5 ---
let escombros = [];
let corrientes = [];

let spawnTimerEscombros = 0;
let spawnTimerCorrientes = 0;
let levelTimer = 0; // Timer para aumentar la dificultad progresivamente

const VELOCIDAD_ASCENSO_INICIAL = 200;
let velocidadAscensoActual = VELOCIDAD_ASCENSO_INICIAL;

// --- Formas SVG de múltiples capas para más realismo ---
const formasEscombrosSVG = [];

function crearFormasSVGComplejas() {
    formasEscombrosSVG.length = 0;
    // Cada "forma" es ahora un objeto con una base y una capa de detalle/grietas.
    // Usamos curvas (Q) para formas más orgánicas.
    const svgData = [
        { // Forma 1
            base: "M -25 -20 L 25 -25 Q 35 0 20 28 L -20 25 Q -40 10 -30 0 Z",
            detalle: "M -10 -15 L 10 -5 M 0 0 L -5 15 M 10 5 L 20 15"
        },
        { // Forma 2
            base: "M -20 -25 Q 10 -30 35 -5 L 20 20 Q 0 35 -25 10 Z",
            detalle: "M 0 -15 L 15 -5 M -10 0 Q 0 0 5 15"
        },
        { // Forma 3
            base: "M -15 -30 L 20 -28 Q 35 0 22 24 L 0 32 L -28 15 Q -35 -10 -15 -30 Z",
            detalle: "M -20 -10 L 0 0 L 15 5 M -10 10 L 5 20"
        }
    ];

    svgData.forEach(data => {
        formasEscombrosSVG.push({
            base: new Path2D(data.base),
            detalle: new Path2D(data.detalle)
        });
    });
    console.log("Formas SVG complejas de escombros creadas.");
}

// --- FUNCIONES DE GENERACIÓN DE ENTIDADES ---

function generarFragmentos(x, y, tamanoOriginal) {
    const numFragmentos = 4 + Math.floor(Math.random() * 4); // Entre 4 y 7 fragmentos
    for (let i = 0; i < numFragmentos; i++) {
        const angulo = Math.random() * Math.PI * 2;
        const velocidad = 200 + Math.random() * 200;
        const tamano = tamanoOriginal / 4 + Math.random() * 5;
        const svgId = Math.floor(Math.random() * formasEscombrosSVG.length);

        escombros.push({
            x, y,
            vx: Math.cos(angulo) * velocidad, // Se mueven por sí mismos
            vy: Math.sin(angulo) * velocidad,
            tamano,
            rotacion: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 15, // Rotan rápido
            hp: 1,
            svgId,
            tipo: 'fragmento',
            vidaUtil: 1.5 + Math.random() // Desaparecen después de un tiempo
        });
    }
}

function generarEscombro() {
    const x = estadoJuego.cameraX + Math.random() * W;
    const tamano = 35 + Math.random() * 70;
    const svgId = Math.floor(Math.random() * formasEscombrosSVG.length);
    let tipo = 'normal';
    const rand = Math.random();
    if (rand < 0.20) { // 20% de probabilidad de ser hostil
        tipo = 'hostil';
    } else if (rand < 0.35) { // 15% de probabilidad de ser explosivo
        tipo = 'explosivo';
    }

    escombros.push({
        x: x,
        y: -tamano,
        vx: 0,
        vy: 450 + Math.random() * 500, // Velocidad de caída
        tamano: tamano,
        rotacion: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 4,
        hp: Math.ceil(tamano / 20),
        svgId: svgId,
        tipo: tipo, // Sistema de tipos más versátil
        tiempoDisparo: tipo === 'hostil' ? 1.5 + Math.random() * 1.5 : 0
    });
}

function generarCorriente() {
    const desdeIzquierda = Math.random() > 0.5;
    const y = H * 0.1 + Math.random() * H * 0.8;
    const fuerza = (300 + Math.random() * 250) * (desdeIzquierda ? 1 : -1);
    const ancho = 180 + Math.random() * 150;
    const duracion = 2 + Math.random() * 2;
    corrientes.push({ 
        y, 
        fuerza, 
        ancho, 
        duracion, 
        maxDuracion: duracion, 
        isLeft: desdeIzquierda,
        bubbleTimer: 0 // Para generar burbujas
    });
    S.reproducir('ink');
}


// --- INTERFAZ PÚBLICA DEL MÓDULO ---

export function init() {
    console.log("Inicializando Nivel 5: El Colapso de la Fosa (HIPERREALISTA)");
    crearFormasSVGComplejas();
    
    escombros = [];
    corrientes = [];
    proyectilesEnemigos = [];
    
    spawnTimerEscombros = 0.5;
    spawnTimerCorrientes = 3.0;
    levelTimer = 0;
    velocidadAscensoActual = VELOCIDAD_ASCENSO_INICIAL;
    
    jugador.x = W / 2;
    jugador.y = H - 100;
}

export function update(dt) {
    if (!estadoJuego || estadoJuego.nivel !== 5) return;

    // --- AUMENTO DE DIFICULTAD PROGRESIVO ---
    levelTimer += dt;
    velocidadAscensoActual = Math.min(VELOCIDAD_ASCENSO_INICIAL * 2.5, VELOCIDAD_ASCENSO_INICIAL + levelTimer * 4);

    // --- LÓGICA DEL NIVEL 5 ---

    // 1. SCROLL VERTICAL y movimiento de entidades
    // jugador.y -= velocidadAscensoActual * dt; // Eliminado el ascenso automático. ¡Ahora tú tienes el control!
    escombros.forEach(e => e.y += velocidadAscensoActual * dt);
    corrientes.forEach(c => c.y += velocidadAscensoActual * dt);
    proyectilesEnemigos.forEach(p => p.y += velocidadAscensoActual * dt);
    
    // 2. Aplicar fuerza de corrientes y generar efectos
    for (const corriente of corrientes) {
        // Generar burbujas en la corriente
        corriente.bubbleTimer -= dt;
        if (corriente.bubbleTimer <= 0) {
            const numBurbujas = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numBurbujas; i++) {
                const x = corriente.isLeft ? Math.random() * 450 : W - Math.random() * 450;
                const y = corriente.y - corriente.ancho / 2 + Math.random() * corriente.ancho;
                
                generarParticula(particulasBurbujas, {
                    x: x, y: y,
                    vx: corriente.fuerza * (0.5 + Math.random() * 0.5),
                    vy: (Math.random() - 0.5) * 50 - 20,
                    r: Math.random() * 3 + 1,
                    vida: 1.5 + Math.random() * 1.5,
                    color: ''
                });
            }
            corriente.bubbleTimer = 0.05; // Generar burbujas frecuentemente
        }

        // Comprobar si el jugador está en la corriente
        if (jugador.y > corriente.y - corriente.ancho / 2 && jugador.y < corriente.y + corriente.ancho / 2) {
            jugador.x += corriente.fuerza * dt;

            // Generar burbujas de impacto en el jugador
            if (Math.random() < 0.8) { // No en cada frame para que no sea abrumador
                const ladoImpacto = corriente.isLeft ? jugador.x - jugador.r : jugador.x + jugador.r;
                generarParticula(particulasBurbujas, { x: ladoImpacto, y: jugador.y + (Math.random() - 0.5) * 40, vx: corriente.fuerza * (0.2 + Math.random() * 0.3), vy: (Math.random() - 0.5) * 80 - 30, r: Math.random() * 2.5 + 1, vida: 0.8 + Math.random() * 0.6, color: '' });
            }
        }
    }
    
    // 3. Comprobar si el jugador se queda atrás
    if (jugador.y > H + jugador.r) {
        if (estadoJuego.vidas > 0) {
            estadoJuego.vidas--;
            estadoJuego.animVida = 0.6;
            S.reproducir('choque');
            jugador.y = H - 50;
        }
        if (estadoJuego.vidas <= 0) {
            perderJuego();
        }
    }
    
    // 4. Manejar spawners
    spawnTimerEscombros -= dt;
    if (spawnTimerEscombros <= 0) {
        generarEscombro();
        spawnTimerEscombros = Math.max(0.2, 1.0 - levelTimer * 0.02);
    }
    spawnTimerCorrientes -= dt;
    if (spawnTimerCorrientes <= 0) {
        generarCorriente();
        spawnTimerCorrientes = Math.max(2.0, 4.5 - levelTimer * 0.05);
    }

    // 5. Actualizar proyectiles enemigos y colisión con jugador
    for (let i = proyectilesEnemigos.length - 1; i >= 0; i--) {
        const p = proyectilesEnemigos[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (Math.hypot(jugador.x - p.x, jugador.y - p.y) < jugador.r + p.r) {
            proyectilesEnemigos.splice(i, 1);
            if (estadoJuego.vidas > 0) {
                estadoJuego.vidas--;
                estadoJuego.animVida = 0.6;
                S.reproducir('choque_ligero'); // Idealmente, un sonido de impacto de proyectil
            }
            if (estadoJuego.vidas <= 0) {
                perderJuego();
            }
            continue;
        }

        if (p.y > H + 20 || p.y < -20 || p.x < -20 || p.x > W + 20) {
            proyectilesEnemigos.splice(i, 1);
        }
    }

    // 6. Actualizar y comprobar colisiones para cada escombro
    for (let i = escombros.length - 1; i >= 0; i--) {
        const escombro = escombros[i];
        escombro.y += escombro.vy * dt;
        escombro.x += (escombro.vx || 0) * dt; // Para los fragmentos
        escombro.rotacion += escombro.vRot * dt;

        // Lógica de vida útil para fragmentos
        if (escombro.tipo === 'fragmento') {
            escombro.vidaUtil -= dt;
            if (escombro.vidaUtil <= 0) {
                escombros.splice(i, 1);
                continue;
            }
        }
        
        // Lógica de disparo para escombros hostiles
        if (escombro.tipo === 'hostil') {
            escombro.tiempoDisparo -= dt;
            if (escombro.tiempoDisparo <= 0) {
                const angulo = Math.atan2(jugador.y - escombro.y, jugador.x - escombro.x);
                proyectilesEnemigos.push({
                    x: escombro.x, y: escombro.y, r: 5,
                    vx: Math.cos(angulo) * 350, vy: Math.sin(angulo) * 350,
                    nearMissTriggered: false
                });
                S.reproducir('disparo_enemigo');
                escombro.tiempoDisparo = 2.0 + Math.random();
            }
        }

        // Colisión con el jugador
        if (Math.hypot(jugador.x - escombro.x, jugador.y - escombro.y) < jugador.r + escombro.tamano / 2) {
            generarExplosion(escombro.x, escombro.y, '#D3B89F', escombro.tamano);
            escombros.splice(i, 1);
            if (estadoJuego.vidas > 1) {
                estadoJuego.vidas -= 2;
                estadoJuego.animVida = 0.6;
                S.reproducir('choque');
            } else if (estadoJuego.vidas > 0) {
                estadoJuego.vidas = 0;
                S.reproducir('choque');
                perderJuego();
            }
            continue;
        }

        // Colisiones con proyectiles del jugador
        let escombroDestruido = false;
        [torpedos, proyectiles].forEach((listaProyectiles, tipo) => {
            if (escombroDestruido) return;
            for (let j = listaProyectiles.length - 1; j >= 0; j--) {
                const p = listaProyectiles[j];
                if (Math.hypot(p.x - escombro.x, p.y - escombro.y) < escombro.tamano / 2 + 10) {
                    escombro.hp -= (tipo === 0) ? 3 : 1; // tipo 0 = torpedos
                    listaProyectiles.splice(j, 1);
                    if (escombro.hp <= 0) {
                        estadoJuego.puntuacion += Math.floor(escombro.tamano);
                        
                        // Lógica de destrucción por tipo
                        if (escombro.tipo === 'explosivo') {
                            S.reproducir('explosion_grande'); // Sonido especial
                            generarFragmentos(escombro.x, escombro.y, escombro.tamano);
                        } else {
                            S.reproducir('explosion_simple');
                            generarExplosion(escombro.x, escombro.y, '#D3B89F', escombro.tamano);
                        }

                        escombros.splice(i, 1);
                        escombroDestruido = true;
                        break;
                    }
                }
            }
        });
        if (escombroDestruido) continue;

        // Limpieza de escombros que salen de pantalla
        if (escombros[i] && escombros[i].y > H + escombros[i].tamano) {
            escombros.splice(i, 1);
        }
    }
    
    // Limpieza de corrientes
    for (let i = corrientes.length - 1; i >= 0; i--) {
        corrientes[i].duracion -= dt;
        if (corrientes[i].duracion <= 0 || corrientes[i].y > H + corrientes[i].ancho) {
            corrientes.splice(i, 1);
        }
    }
}

export function draw() {
    if (!ctx) return;
    
    // Dibujar corrientes (NUEVO ESTILO MEJORADO)
    for (const corriente of corrientes) {
        const alpha = clamp(corriente.duracion / corriente.maxDuracion, 0, 1) * 0.4;
        const xStart = corriente.isLeft ? estadoJuego.cameraX : estadoJuego.cameraX + W;
        const xEnd = corriente.isLeft ? estadoJuego.cameraX + 450 : estadoJuego.cameraX + W - 450;
        const direction = corriente.isLeft ? 1 : -1;

        // Dibujar múltiples líneas onduladas para dar sensación de flujo
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(xStart, corriente.y - corriente.ancho / 2 + (i * corriente.ancho / 4));
            
            const waveAmplitude = 15;
            const waveFrequency = 0.02;
            const waveOffset = levelTimer * 150 * direction;

            // Usamos una curva cuadrática para un flujo suave
            const controlX = (xStart + xEnd) / 2;
            const controlY = corriente.y + Math.sin((controlX * waveFrequency) + waveOffset) * waveAmplitude;

            ctx.quadraticCurveTo(controlX, controlY, xEnd, corriente.y);
            
            ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * (0.5 + Math.random() * 0.5)})`;
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.stroke();
        }
    }
    
    // Dibujar escombros
    for (const escombro of escombros) {
        ctx.save();
        ctx.translate(escombro.x, escombro.y);
        ctx.rotate(escombro.rotacion);
        
        const escala = escombro.tamano / 60;
        ctx.scale(escala, escala);
        
        const forma = formasEscombrosSVG[escombro.svgId];
        
        // Colores y efectos por tipo
        if (escombro.tipo === 'explosivo') {
            const pulso = 0.5 + (Math.sin(levelTimer * 5) + 1) / 4;
            ctx.fillStyle = '#4B0082'; // Indigo
            ctx.strokeStyle = `rgba(255, 20, 147, ${pulso})`; // Rosa brillante pulsante
            ctx.lineWidth = 8;
            ctx.stroke(forma.base);
        } else if (escombro.tipo === 'hostil') {
            ctx.fillStyle = '#8B4513';
            ctx.strokeStyle = '#413529';
            ctx.lineWidth = 5;
        } else { // Normal y fragmentos
            ctx.fillStyle = '#6D5A46';
            ctx.strokeStyle = '#413529';
            ctx.lineWidth = 5;
        }

        ctx.fill(forma.base);
        
        // Dibujar la capa de detalle (grietas/brillos)
        ctx.strokeStyle = escombro.tipo === 'explosivo' ? 'rgba(230, 230, 250, 0.8)' : '#332a21';
        ctx.lineWidth = 3;
        ctx.stroke(forma.detalle);
        
        ctx.restore();
    }
    
    // Dibujar proyectiles enemigos
    ctx.fillStyle = '#FF4500'; // Naranja rojizo
    for(const p of proyectilesEnemigos) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
}