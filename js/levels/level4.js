// js/level4.js
'use strict';

// Importamos todo lo que necesitamos, incluyendo proyectiles y torpedos
import { estadoJuego, jugador, W, H, ctx, S, clamp, perderJuego, generarExplosion, escombros } from '../game/game.js';
import {
    torpedos, proyectiles
} from '../game/armas/weapons.js';

let spawnTimer = 0;

// --- FUNCIONES DEL NIVEL 4 ---

function generarPoligonoIrregular(tamano, lados = 6) {
    const puntos = [];
    for (let i = 0; i < lados; i++) {
        const angulo = (i / lados) * Math.PI * 2;
        const radio = tamano / 2 * (0.6 + Math.random() * 0.4); // Radio variable
        puntos.push({
            x: Math.cos(angulo) * radio,
            y: Math.sin(angulo) * radio
        });
    }
    return puntos;
}

function generarEscombro(xOverride, yOverride, sizeOverride, tipoOverride) {
    const y = yOverride !== undefined ? yOverride : Math.random() * (H - 100) + 50; // Evitar bordes extremos
    const x = xOverride !== undefined ? xOverride : estadoJuego.cameraX + W + 100;

    // Probabilidades según progreso
    const progreso = estadoJuego.valorObjetivoNivel / 90; // 0 a 1 aprox
    let tipo = 'normal';

    if (!tipoOverride) {
        const r = Math.random();
        // Aumentar probabilidad de especiales con el tiempo
        const chanceSpecial = 0.2 + progreso * 0.4;

        if (r < chanceSpecial) {
            const subR = Math.random();
            if (subR < 0.33) tipo = 'magnetica';
            else if (subR < 0.66) tipo = 'ondulante';
            else tipo = 'splitter';
        }
    } else {
        tipo = tipoOverride;
    }

    const tamanoBase = sizeOverride || (20 + Math.random() * 50);
    const tamano = tipo === 'splitter' ? tamanoBase * 1.5 : tamanoBase; // Splitters son más grandes

    const velocidadBase = 200 + Math.random() * 400;
    let velocidad = velocidadBase;
    if (tipo === 'magnetica') velocidad *= 0.8; // Un poco más lentas para maniobrar
    if (tipo === 'splitter') velocidad *= 0.7; // Más pesadas

    escombros.push({
        x: x,
        y: y,
        vx: -velocidad,
        vy: 0, // Para magnéticas
        initialY: y, // Para ondulantes
        timeOffset: Math.random() * 10, // Para ondulantes
        tamano: tamano,
        rotacion: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 3,
        tipo: tipo,
        // Visuales
        puntos: generarPoligonoIrregular(tamano, Math.floor(5 + Math.random() * 3)),
        color: obtenerColorPorTipo(tipo)
    });
}

function obtenerColorPorTipo(tipo) {
    switch (tipo) {
        case 'magnetica': return '#ff6b6b'; // Rojizo
        case 'ondulante': return '#4ecdc4'; // Turquesa/Verdoso
        case 'splitter': return '#ffe66d'; // Amarillo oscuro
        case 'fragmento': return '#ffcc00'; // Amarillo brillante
        default: return '#8B8B8B'; // Gris normal
    }
}

/**
 * Comprueba si un proyectil (o torpedo) colisiona con un escombro.
 */
function proyectilColisionaConEscombro(proyectil, escombro) {
    // Aproximación circular es suficiente y más justa para formas irregulares
    const dist = Math.hypot(proyectil.x - escombro.x, proyectil.y - escombro.y);
    const radioProyectil = (proyectil.w + proyectil.h) / 4; // Promedio
    return dist < (escombro.tamano / 2) + radioProyectil;
}

// --- INTERFAZ PÚBLICA DEL MÓDULO ---

export function init() {
    console.log("Inicializando Nivel 4: Campo de Escombros Inteligente");
    escombros.length = 0;
    spawnTimer = 1.0;
    estadoJuego.jefe = null;
    const bossHealthContainer = document.getElementById('bossHealthContainer');
    if (bossHealthContainer) bossHealthContainer.style.display = 'none';
}

export function update(dt) {
    if (!estadoJuego || estadoJuego.nivel !== 4) return;

    // 1. Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        generarEscombro();
        const progreso = estadoJuego.valorObjetivoNivel / 90;
        const maxSpawnRate = 0.3; // Más frenético
        const minSpawnRate = 1.0;
        spawnTimer = minSpawnRate - (minSpawnRate - maxSpawnRate) * progreso;
    }

    // 2. Actualizar escombros
    for (let i = escombros.length - 1; i >= 0; i--) {
        const e = escombros[i];

        // --- LÓGICA DE MOVIMIENTO POR TIPO ---
        if (e.tipo === 'magnetica' && jugador) {
            // Se acercan lentamente a la Y del jugador
            const dy = jugador.y - e.y;
            e.vy = lerp(e.vy, Math.sign(dy) * 100, dt * 2);
            e.y += e.vy * dt;
        }
        else if (e.tipo === 'ondulante') {
            e.timeOffset += dt;
            const waveAmplitude = 180;
            const waveSpeed = 3;
            // Movimiento sinusoidal base + offset
            e.y = e.initialY + Math.sin(e.timeOffset * waveSpeed) * waveAmplitude;
        }

        e.x += e.vx * dt;
        e.rotacion += e.vRot * dt;

        // --- COLISIONES ---

        // Colisión con Jugador
        const dist = Math.hypot(jugador.x - e.x, jugador.y - e.y);
        // Hitbox un poco más pequeña que el tamaño visual para ser generosos
        if (dist < jugador.r + e.tamano * 0.4) {
            generarExplosion(e.x, e.y, e.color, e.tamano);

            // Efecto especial al chocar con jugador
            if (e.tipo === 'splitter') {
                // Dividirse al chocar también (castigo extra)
                spawnFragmentos(e);
            }

            escombros.splice(i, 1);
            if (estadoJuego.vidas > 0) {
                // Las rocas especiales hacen más daño? Por ahora igual.
                estadoJuego.vidas -= (e.tipo === 'splitter' ? 2 : 1);
                estadoJuego.animVida = 0.6;
                S.reproducir('choque');
            }
            if (estadoJuego.vidas <= 0) perderJuego();
            continue;
        }

        // Colisión con armas
        let destruido = false;

        // Torpedos
        for (let j = torpedos.length - 1; j >= 0; j--) {
            if (proyectilColisionaConEscombro(torpedos[j], e)) {
                destruirEscombro(i, e, torpedos[j].color);
                torpedos.splice(j, 1);
                estadoJuego.puntuacion += 50;
                destruido = true;
                break;
            }
        }
        if (destruido) continue;

        // Proyectiles
        for (let k = proyectiles.length - 1; k >= 0; k--) {
            if (proyectilColisionaConEscombro(proyectiles[k], e)) {
                destruirEscombro(i, e, proyectiles[k].color);
                proyectiles.splice(k, 1);
                estadoJuego.puntuacion += 10;
                destruido = true;
                break;
            }
        }
        if (destruido) continue;

        // Despawn
        if (e.x < estadoJuego.cameraX - 200) {
            escombros.splice(i, 1);
        }
    }
}

function spawnFragmentos(padre) {
    for (let k = 0; k < 3; k++) {
        const angle = (Math.PI / 4) * (k - 1); // -45, 0, +45 grados relativo a izquierda
        escombros.push({
            x: padre.x,
            y: padre.y,
            vx: padre.vx * 1.5 + Math.cos(angle) * -100, // Más rápidas hacia la izquierda
            vy: Math.sin(angle) * 200, // Dispersión
            initialY: padre.y,
            tamano: padre.tamano / 2.5,
            rotacion: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 8, // Giran rápido
            tipo: 'fragmento',
            puntos: generarPoligonoIrregular(padre.tamano / 2.5, 4),
            color: obtenerColorPorTipo('fragmento')
        });
    }
}

function destruirEscombro(index, e, colorExplosion) {
    generarExplosion(e.x, e.y, e.color, e.tamano); // Usar color de la roca
    if (e.tipo === 'splitter') {
        S.reproducir('explosion'); // Sonido extra
        spawnFragmentos(e);
    }
    escombros.splice(index, 1);
}

// Función lerp simple local si no se importa, pero game.js suele exportar utilidades.
// Asumimos que game.js expone lerp globalmente o via import si se añadió, 
// pero level4.js original no importaba lerp. Vamos a definirlo o usar Math simple.
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

export function draw() {
    if (!ctx) return;

    for (const e of escombros) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotacion);

        // Dibujar polígono irregular
        ctx.fillStyle = e.color;

        // Efecto de brillo para especiales
        if (e.tipo === 'magnetica') {
            ctx.shadowColor = '#ff6b6b';
            ctx.shadowBlur = 10;
        } else if (e.tipo === 'ondulante') {
            ctx.shadowColor = '#4ecdc4';
            ctx.shadowBlur = 5;
        }

        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;

        ctx.beginPath();
        if (e.puntos && e.puntos.length > 0) {
            ctx.moveTo(e.puntos[0].x, e.puntos[0].y);
            for (let i = 1; i < e.puntos.length; i++) {
                ctx.lineTo(e.puntos[i].x, e.puntos[i].y);
            }
        } else {
            // Fallback cuadrado
            ctx.rect(-e.tamano / 2, -e.tamano / 2, e.tamano, e.tamano);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Detalle interior
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(e.tamano * 0.2, -e.tamano * 0.2, e.tamano * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}