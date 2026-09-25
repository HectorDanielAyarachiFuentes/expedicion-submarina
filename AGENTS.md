<!-- gitnexus:start -->
# GitNexus — Inteligencia de Código

Este proyecto está indexado por GitNexus como **expedicion-submarina** (1042 símbolos, 3452 relaciones, 91 flujos de ejecución).

> ¿Índice desactualizado? Ejecuta `node .gitnexus/run.cjs analyze --index-only` desde la raíz del proyecto — seleccionará automáticamente el ejecutor disponible. Si aún no existe `.gitnexus/run.cjs`, inicialízalo con `npx`, `bunx` o `pnpm dlx` (ej. `bunx gitnexus@latest analyze`).

## Siempre Hacer (Obligatorio)

- **OBLIGATORIO ejecutar análisis de impacto antes de editar.** Usa `impact({target: "nombreSimbolo", direction: "upstream"})` o `node .gitnexus/run.cjs impact "nombreSimbolo" --direction upstream --repo .`; reporta llamadores, procesos y riesgo. Nunca sustituyas el análisis de grafo por un simple grep.
- **OBLIGATORIO analizar cambios en el grafo antes de hacer commit.** Usa `detect_changes({scope: "all"})` (MCP) o `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI). Si devuelve `partial: true` o `truncated: true`, no es una comprobación limpia — un cero significa no visto, no inafectado; vuelve a ejecutarlo. Para revisión de regresiones: `detect_changes({scope: "compare", base_ref: "main"})` o `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- **OBLIGATORIO advertir sobre `risk: HIGH` o `risk: CRITICAL` antes de editar;** nunca descartes una advertencia de riesgo ALTO o CRÍTICO.
- **OBLIGATORIO tratar `risk: UNKNOWN` como no resuelto, no como bajo.** Un conjunto vacío de llamadores no es evidencia de que el símbolo no se use — puede significar que los llamadores no son resolubles por el índice (acceso a propiedades de objetos planos, despacho dinámico). `impact` acompaña `UNKNOWN` con una nota explicando esto. Confirma con una búsqueda de texto antes de considerar el símbolo seguro de modificar o eliminar; nunca procedas solo porque devuelva cero.
- **OBLIGATORIO usar `query({search_query: "concepto"})` para conceptos/flujos, `context({name: "nombreSimbolo"})` para un símbolo específico, o `impact` para radio de impacto.** Primero el grafo; la búsqueda de texto solo para resultados vacíos/`UNKNOWN`/literales.
- Para revisión de seguridad, `explain({target: "archivoOSimbolo"})` lista hallazgos de propagación de flujo (necesita `analyze --pdg`).

## Nunca Hacer (Prohibido)

- NUNCA editar una función, clase o método antes del análisis de impacto MCP/CLI.
- NUNCA ignorar advertencias de riesgo HIGH o CRITICAL en el análisis de impacto, y nunca interpretar `UNKNOWN` como vía libre — requiere confirmación contextual.
- NUNCA renombrar símbolos con buscar-y-reemplazar a ciegas — usa `rename` que comprende el grafo de llamadas.
- NUNCA hacer commit antes del análisis de cambios en el grafo (`detect-changes`).

## Recursos

| Recurso | Uso |
| --- | --- |
| `gitnexus://repo/expedicion-submarina/context` | Vista general del código, verificar frescura del índice |
| `gitnexus://repo/expedicion-submarina/clusters` | Todas las áreas funcionales |
| `gitnexus://repo/expedicion-submarina/processes` | Todos los flujos de ejecución |
| `gitnexus://repo/expedicion-submarina/process/{name}` | Traza de ejecución paso a paso |

## CLI

| Tarea | Archivo de habilidad de referencia |
| --- | --- |
| Entender arquitectura / "¿Cómo funciona X?" | `.agents/skills/gitnexus-exploring/SKILL.md` |
| Radio de impacto / "¿Qué se rompe si cambio X?" | `.agents/skills/gitnexus-impact-analysis/SKILL.md` |
| Trazar errores / "¿Por qué falla X?" | `.agents/skills/gitnexus-debugging/SKILL.md` |
| Renombrar / extraer / dividir / refactorizar | `.agents/skills/gitnexus-refactoring/SKILL.md` |
| Herramientas, recursos y referencia de esquema | `.agents/skills/gitnexus-guide/SKILL.md` |
| Comandos CLI de indexación, estado, limpieza y wiki | `.agents/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

---

# Reglas del Agente — La Expedición (Submarine Arcade)

Este repositorio contiene el código fuente de **La Expedición**, un shooter arcade retro 2D desarrollado en **HTML5 Canvas** y **Vanilla JavaScript (ES Modules)**.

Cualquier agente de IA que interactúe con este repositorio debe acatar estas directrices obligatorias para preservar la estabilidad, rendimiento y estética del juego.

---

## 🏛️ 1. Arquitectura y Estándares del Proyecto

- **Stack Tecnológico**:
  - `HTML5` para maquetación, overlays HUD y menús modales.
  - `CSS3 Vanilla` (`css/`) para estilos retro pixel art, adaptabilidad responsiva y controles táctiles.
  - `JavaScript ES Modules` sin bundlers pesados ni transpiladores.
- **Flujo de Ejecución**:
  - `index.html` → Carga módulos vía `<script type="module" src="js/main.js">`.
  - `js/main.js` → Inicializa el motor (`init()`) y arranca el ciclo `requestAnimationFrame(gameLoop)`.
  - `js/game/game.js` → Controlador nuclear: máquinas de estado, bucle de física, spawn de enemigos, jefes y HUD.
  - `js/game/weapons.js` y `js/game/armas/` → Sistema balístico (garfio, escopeta, metralleta, láser, torpedos).
  - `js/levels/` → Configuración de niveles (1 al 9), oleadas, condiciones de victoria y captura de especímenes.
  - `js/game/optimization.js` → Limitación de entidades y optimizaciones de rendimiento.

---

## ⚡ 2. Reglas Críticas del Game Loop y Rendimiento

1. **Objetivo de 60 FPS Constantes**:
   - Todo código en la ruta crítica del frame (`gameLoop`, `update`, `draw`) debe ejecutarse en menos de **16ms**.
2. **Cero Alojamientos de Memoria en el Frame (GC Zero Allocation)**:
   - Prohibido instanciar objetos (`new Array()`, `{}`), closures anónimos o expresiones regulares dentro de las funciones de actualización o renderizado.
   - Reutilizar estructuras de datos mediante patrones de **Object Pooling** (para partículas, proyectiles y burbujas).
3. **Física Basada en Delta Time (`dt`)**:
   - Todo desplazamiento, aceleración, desaceleración o cuenta regresiva debe estar multiplicado por el factor de tiempo transcurrido (`dt` o `deltaTime`). Esto garantiza que el juego no se acelere en pantallas de 120Hz/144Hz ni se ralentice en caídas de frames.
4. **Respeto a la Separación de Canvas**:
   - `bgCanvas`: Exclusivo para capas de fondo, efectos de profundidad y gradientes marinos.
   - `canvas` (Foreground): Exclusivo para entidades dinámicas, colisiones, efectos de partículas y jugador.

---

## 🎮 3. Reglas de Controles, Audio y Persistencia

1. **Paridad de Controles**:
   - Cualquier cambio en controles debe contemplar y verificar simultáneamente:
     - Teclado (escritorio).
     - Controles táctiles virtuales (móviles/tablets).
     - Gamepad API (mandos USB/Bluetooth).
2. **Políticas de Audio del Navegador**:
   - Las pistas de sonido y efectos (`sonidos/`, `canciones/`) deben respetar la política de interacción previa del usuario (Autoplay Policy).
   - Los fallos o bloqueos de audio deben capturarse (`try...catch` o `.catch()`) sin abortar el bucle principal.
3. **Persistencia Local Segura**:
   - El progreso (`expedicion_max_level`, high score) se gestiona en `localStorage`.
   - **Regla de Oro**: Nunca alterar o invalidar las claves de guardado existentes para no resetear el progreso de los jugadores.

---

## 🧠 4. Sinergia con GitNexus (Complementariedad Obligatoria)

Dado que `js/game/game.js` es un monolito extenso (~277 KB) con alta densidad de interdependencias:

1. **Prohibición de Ediciones a Ciegas**:
   - **Antes de modificar cualquier método o variable global**: Ejecuta `impact` con GitNexus para evaluar el riesgo (`node .gitnexus/run.cjs impact "<simbolo>" --direction upstream --repo .`).
2. **Exploración Mediante Grafo de Conocimiento**:
   - Para entender cómo se conectan las armas, jefes o niveles, usa las herramientas del grafo:
     - `node .gitnexus/run.cjs query "<concepto>"`
     - `node .gitnexus/run.cjs context "<simbolo>"`
3. **Verificación Estructural Pre-Commit**:
   - Antes de dar por concluida una refactorización o corrección, verifica los efectos colaterales:
     - `node .gitnexus/run.cjs detect-changes --scope all --repo .`
4. **Regeneración de Índice**:
   - Si creas nuevos módulos en `js/`, actualiza el grafo con `node .gitnexus/run.cjs analyze --index-only`.

