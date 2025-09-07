// js/level3.js
'use strict';

// Importamos dependencias de game.js
import { estadoJuego, jugador, W, H, carriles, ctx, generarAnimal, S, clamp, perderJuego, NUM_CARRILES } from './game.js';

export function init() {
  estadoJuego.jefe = { x: W - 150, y: H / 2, w: 200, h: 300, hp: 150, maxHp: 150, estado: 'idle', timerAtaque: 3, timerGolpe: 0, tentaculos: [], };
  for (let i = 0; i < 6; i++) {
    estadoJuego.jefe.tentaculos.push({ angulo: (i / 5 - 0.5) * Math.PI * 0.8, largo: 150 + Math.random() * 50, fase: Math.random() * Math.PI * 2, });
  }
  const bossHealthContainer = document.getElementById('bossHealthContainer');
  if (bossHealthContainer) bossHealthContainer.style.display = 'block';
}

export function update(dt) {
  if (!estadoJuego.jefe) return;
  const jefe = estadoJuego.jefe;
  jefe.timerGolpe = Math.max(0, jefe.timerGolpe - dt);
  jefe.y = H / 2 + Math.sin(estadoJuego.tiempoTranscurrido * 0.5) * 50;
  jefe.timerAtaque -= dt;
  if (jefe.timerAtaque <= 0) {
    const tipoAtaque = Math.random();
    jefe.estado = 'idle';
    if (tipoAtaque < 0.45) {
      jefe.estado = 'attacking_smash';
      const carrilObjetivo = Math.floor(Math.random() * NUM_CARRILES);
      jefe.datosAtaque = { carril: carrilObjetivo, carga: 1.2, y: carriles[carrilObjetivo], progreso: 0 };
      jefe.timerAtaque = 3;
    } else if (tipoAtaque < 0.75) {
      jefe.estado = 'attacking_ink';
      estadoJuego.proyectilesTinta.push({ x: jefe.x, y: jefe.y, vx: -400, r: 20 });
      jefe.timerAtaque = 3.5;
    } else {
      jefe.estado = 'attacking_minion';
      for (let i = 0; i < 2; i++) {
        setTimeout(() => generarAnimal(true), i * 300);
      }
      jefe.timerAtaque = 5;
    }
  }
  if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
    jefe.datosAtaque.carga -= dt;
    if (jefe.datosAtaque.carga <= 0) {
      jefe.datosAtaque.progreso += dt * 8;
      const tentaculoX = W - jefe.datosAtaque.progreso * W;
      if (Math.hypot(jugador.x - tentaculoX, jugador.y - jefe.datosAtaque.y) < jugador.r + 30) {
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
}

export function draw() {
  if (!estadoJuego.jefe) return;
  const jefe = estadoJuego.jefe;
  ctx.save();
  if (jefe.timerGolpe > 0) ctx.filter = 'brightness(2.5)';
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
  ctx.fillStyle = '#8a2be2'; 
  ctx.beginPath(); 
  ctx.ellipse(jefe.x, jefe.y, jefe.w / 2, jefe.h / 2, 0, 0, Math.PI * 2); 
  ctx.fill();
  ctx.fillStyle = '#fff'; 
  ctx.beginPath(); 
  ctx.arc(jefe.x - 40, jefe.y - 50, 25, 0, Math.PI * 2); 
  ctx.arc(jefe.x + 40, jefe.y - 50, 25, 0, Math.PI * 2); 
  ctx.fill();
  ctx.fillStyle = '#000'; 
  ctx.beginPath(); 
  let pupilaX = clamp(jugador.x, jefe.x - 50, jefe.x - 30); 
  ctx.arc(pupilaX, jefe.y - 50, 10, 0, Math.PI * 2); 
  pupilaX = clamp(jugador.x, jefe.x + 30, jefe.x + 50); 
  ctx.arc(pupilaX, jefe.y - 50, 10, 0, Math.PI * 2); 
  ctx.fill();
  if (jefe.estado === 'attacking_smash' && jefe.datosAtaque) {
    if (jefe.datosAtaque.carga > 0) {
      ctx.fillStyle = 'rgba(255, 50, 50, 0.4)'; 
      ctx.fillRect(0, jefe.datosAtaque.y - 20, W, 40); 
      ctx.strokeStyle = '#e04040'; 
      ctx.lineWidth = 40; 
      ctx.beginPath(); 
      ctx.moveTo(W, jefe.datosAtaque.y); 
      ctx.lineTo(W - 100, jefe.datosAtaque.y + (Math.random() - 0.5) * 20); 
      ctx.stroke();
    } else {
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