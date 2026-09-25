'use strict';

/**
 * CONFIGURACIÓN CENTRALIZADA DE NIVELES
 * Archivo puramente declarativo sin dependencias externas para evitar ciclos de importación.
 */
export const CONFIG_NIVELES = [
  { nombre: 'NIVEL 1: CAÑÓN DE MAR DEL PLATA', objetivo: 'Captura 10 especímenes', meta: 25, tipo: 'capture', speedMultiplier: 1.0, theme: 'default' },
  { nombre: 'NIVEL 2: FOSA ABISAL', objetivo: 'Sobrevive 60 segundos', meta: 60, tipo: 'survive', speedMultiplier: 1.4, theme: 'abyssal' },
  { nombre: 'NIVEL 3: LA GUARIDA DEL KRAKEN', objetivo: 'Derrota al jefe', meta: 1, tipo: 'boss', speedMultiplier: 1.0, theme: 'volcanic' },
  { nombre: 'NIVEL 4: CAMPO DE ESCOMBROS', objetivo: 'Sobrevive 90 segundos', meta: 90, tipo: 'survive', speedMultiplier: 1.0, theme: 'default' },
  { nombre: 'NIVEL 5: COLAPSO DE LA FOSA', objetivo: 'Escapa durante 60 segundos', meta: 60, tipo: 'survive', speedMultiplier: 0, theme: 'abyssal' }, 
  { nombre: 'NIVEL 6: EL VORTEX DE LAS PROFUNDIDADES', objetivo: 'Sobrevive 120 segundos', meta: 120, tipo: 'survive', speedMultiplier: 0, theme: 'kelp' }, 
  { nombre: "NIVEL 7: LA FOSA DE MIERDEI", objetivo: "¡Nivel de bonus! Supera el desafío.", meta: 1, tipo: 'boss', speedMultiplier: 1.2, theme: 'kelp' },
  { nombre: "NIVEL 8: ABISMO PROFUNDO", objetivo: "Supera los desafíos del abismo", meta: 25, tipo: 'boss', speedMultiplier: 1.5, theme: 'abyssal' },
  { nombre: "NIVEL 9: EL ASESINO DE BALLENAS", objetivo: "Completa la cacería", meta: 1, tipo: 'boss', speedMultiplier: 1.1, theme: 'default' },
  { nombre: "NIVEL 10: CARRERA NUCLEAR", objetivo: "Recorre 5km en menos de 5 minutos", meta: 5000, tipo: 'distancia', speedMultiplier: 1.0, theme: 'volcanic' }
];
