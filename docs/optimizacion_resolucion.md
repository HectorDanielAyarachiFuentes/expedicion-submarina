# Solución al Rendimiento en Web (Canvas Fill-rate Optimization)

El problema de rendimiento que experimentas cuando juegas la versión web (y no en la local) se debe a cómo HTML5 Canvas maneja las **resoluciones altas**.

Cuando abres el juego localmente, es probable que lo hagas en una ventana más pequeña (por ejemplo, en un panel de vista previa o una ventana no maximizada). Pero cuando lo abres en la web, el navegador lo ejecuta a **pantalla completa o en un monitor grande (ej. 1080p, 2K o 4K)**. 

Tu función actual `autoSize()` obliga a los 5 lienzos de tu juego a renderizarse **píxel por píxel** al tamaño completo del monitor:
```javascript
function autoSize() {
    const v = { w: innerWidth, h: innerHeight }; 
    [bgCanvas, cvs, fxCanvas, ...].forEach(c => { c.width = v.w; c.height = v.h; });
    W = v.w; H = v.h; 
    ...
}
```
Si un jugador abre el juego en un monitor 4K (3840x2160), tu juego intenta dibujar internamente **más de 40 millones de píxeles por frame** (5 lienzos $\times$ 3840 $\times$ 2160), lo que hunde los FPS (fotogramas por segundo) de cualquier navegador, produciendo ese "Game Loop Lento".

## Proposed Changes

La solución estándar en la industria de los videojuegos retro HTML5 es **separar la resolución lógica (la del juego interno) de la resolución física (la del monitor CSS)**.

Limitaremos la resolución lógica máxima a **1920 píxeles de ancho**. Si el monitor es más grande que eso, el canvas mantendrá internamente una resolución baja, y el CSS (`width: 100vw; height: 100vh;`) se encargará de **estirarlo mágicamente y sin coste de rendimiento**.

### js/game/game.js
Modificaremos la función `autoSize()` para incluir un cálculo de límite de escalado inteligente.

#### [MODIFY] js/game/game.js
Reemplazaremos la actual función `autoSize` por:
```javascript
function autoSize() {
    // Definimos un ancho lógico máximo (Full HD). 
    // Evita que el juego consuma toda la CPU/GPU en monitores 4K.
    const MAX_LOGICAL_WIDTH = 1920; 
    let scale = 1;
    
    // Si la pantalla es más ancha que 1920px, calculamos cuánto hay que reducirla
    if (innerWidth > MAX_LOGICAL_WIDTH) {
        scale = MAX_LOGICAL_WIDTH / innerWidth;
    }
    
    const v = { 
        w: Math.round(innerWidth * scale), 
        h: Math.round(innerHeight * scale) 
    }; 
    
    [bgCanvas, cvs, fxCanvas, sonarCanvas, hudCanvas].forEach(c => { 
        if (c) { 
            c.width = v.w; 
            c.height = v.h; 
        } 
    }); 
    
    W = v.w; 
    H = v.h; 
    calcularCarriles(); 
    
    if (!estadoJuego || !estadoJuego.enEjecucion) { 
        renderizar(0); 
    }
}
```

## Verification Plan

### Manual Verification
1. Aplicaré los cambios a `game.js`.
2. Una vez aplicados, te pediré que subas o pruebes esta versión en un monitor grande o la pongas a pantalla completa (Fullscreen).
3. Verás que los FPS se mantienen estables de nuevo. La calidad gráfica no se verá afectada porque tu juego está diseñado con _Pixel Art_, por lo que escalar la imagen con CSS se verá exactamente igual, ¡pero rindiendo a una fracción del coste!
