# Protocolo de Inteligencia de Código con GitNexus

Este proyecto cuenta con un grafo de conocimiento indexado por **GitNexus**. Los agentes de IA deben utilizar GitNexus como copiloto estructural antes de modificar cualquier lógica crítica.

## 1. ¿Por qué es obligatorio en este proyecto?
El archivo principal del motor (`js/game/game.js`) supera los 270 KB y contiene cientos de símbolos interconectados (física, entidades, colisiones, render, audio y estado). Modificar código sin analizar el radio de impacto puede generar regresiones críticas inadvertidas.

## 2. Flujo de Trabajo Obligatorio

### Fase 1: Comprensión y Exploración
Antes de asumir cómo se conecta una entidad o arma:
```bash
# Buscar conceptos o flujos de ejecución
node .gitnexus/run.cjs query "<concepto_o_mecanica>" --repo .

# Obtener visión 360° de un símbolo (llamadores, llamados, flujos)
node .gitnexus/run.cjs context "<NombreDelSimbolo>" --repo .
```

### Fase 2: Análisis de Impacto Pre-Edición
**NUNCA editar una función, clase o método sin medir su blast radius:**
```bash
# Saber qué romperías aguas arriba antes de modificar un símbolo
node .gitnexus/run.cjs impact "<NombreDelSimbolo>" --direction upstream --repo .
```
- Si el riesgo reportado es **HIGH** o **CRITICAL**, se debe advertir y justificar el cambio.
- Si el riesgo es **UNKNOWN**, no asumir que es bajo: verificar mediante búsqueda contextual.

### Fase 3: Detección de Cambios Pre-Commit
Antes de finalizar la tarea o proponer un commit:
```bash
# Validar qué símbolos y flujos fueron afectados por los cambios
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

### Fase 4: Mantener el Índice Actualizado
Si se agregaron nuevos módulos o archivos:
```bash
node .gitnexus/run.cjs analyze --index-only
```
