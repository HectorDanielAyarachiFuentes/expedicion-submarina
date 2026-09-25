# Reglas de Desarrollo: La Expedición (Submarine Arcade)

Este documento define las directrices y estándares para el desarrollo, mantenimiento y refactorización del videojuego retro **La Expedición**.

## 1. Arquitectura del Proyecto
- **Tecnologías Core**: HTML5 Canvas (2D Context), JavaScript puro (ES Modules), CSS3 Vanilla.
- **Punto de Entrada**: `index.html` → `js/main.js` → `js/game/game.js`.
- **Estructura Modular**:
  - `js/game/game.js`: Motor del juego, bucle principal (`gameLoop`), bucle de física, spawn de entidades y HUD.
  - `js/game/weapons.js` / `js/game/armas/`: Lógica de proyectiles, cadencia, munición y daño.
  - `js/game/optimization.js`: Control de rendimiento y optimizaciones de renderizado.
  - `js/levels/`: Definiciones de niveles, oleadas de enemigos y objetivos.
  - `css/`: Paneles de control, overlays, estadísticas y responsividad.

## 2. Reglas del Game Loop y Renderizado
- **Target 60 FPS Estable**: Mantener el presupuesto de renderizado bajo 16.6ms por frame.
- **Evitar Garbarge Collection (GC) en juego activo**:
  - Reutilizar objetos y arrays cuando sea posible (Object Pooling para proyectiles y partículas).
  - Nunca instanciar arrays masivos o crear funciones anónimas dentro de `gameLoop` o `draw()`.
- **Física basada en Delta Time**:
  - Todas las velocidades, aceleraciones y cadencias deben sincronizarse con `deltaTime` para evitar desincronizaciones en monitores con tasas de refresco altas (75Hz, 120Hz, 144Hz).
- **Separación de Capas de Canvas**:
  - Fondo (`bgCanvas`): Renderizado de paralaje y efectos ambientales profundos.
  - Primer plano (`canvas`): Entidades activas, submarino 'Subastian', proyectiles, enemigos y partículas.

## 3. Estado, Progreso y Almacenamiento
- El progreso del jugador (nivel máximo desbloqueado, puntuaciones récord) se almacena en `localStorage` con claves prefijadas (ej. `expedicion_*`).
- Toda modificación al esquema de almacenamiento debe mantener retrocompatibilidad con los datos existentes del usuario.

## 4. Audio y Experiencia de Usuario
- Respetar la política de Autoplay del navegador: El audio solo debe reproducirse tras la primera interacción del usuario.
- Gestionar excepciones de audio de forma silenciosa para que la falta de un códec o un fallo de reproducción nunca congele el bucle del juego.

## 5. Control Multi-Plataforma
- Mantener paridad y soporte simultáneo para:
  - Teclado (flechas, espacio, X, C, etc.).
  - Controles táctiles virtuales en pantallas táctiles / móviles.
  - Mando / Gamepad API con detección de conexión y desconexión dinámica.
