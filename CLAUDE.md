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
