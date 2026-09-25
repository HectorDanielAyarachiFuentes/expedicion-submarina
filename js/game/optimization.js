// =================================================================================
//  MÓDULO DE OPTIMIZACIÓN (ALTO RENDIMIENTO - GC ZERO ALLOCATION)
// =================================================================================
// Este archivo contiene clases y utilidades para garantizar 60 FPS estables sin pausas de GC.

export class ObjectPool {
    constructor(createFn, initialSize = 300) {
        this.createFn = createFn;
        this.pool = [];
        // Pre-alocar objetos para evitar allocs en runtime
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }

    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFn();
    }

    release(obj) {
        this.pool.push(obj);
    }
}

/**
 * Spatial Grid plano de alto rendimiento para optimización de colisiones.
 * Utiliza índices numéricos 1D y etiquetas de consulta para CERO asignación de memoria por frame.
 */
export class SpatialGrid {
    constructor(width = 3000, height = 2000, cellSize = 150) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize) + 2;
        this.rows = Math.ceil(height / cellSize) + 2;
        this.totalCells = this.cols * this.rows;

        // Celdas pre-alocadas en un array 1D continuo (0 allocations durante el juego)
        this.cells = new Array(this.totalCells);
        for (let i = 0; i < this.totalCells; i++) {
            this.cells[i] = [];
        }

        // Buffer reutilizable de resultados para evitar crear Arrays o Sets en cada consulta
        this.queryResults = [];
        this.queryId = 1;
    }

    clear() {
        for (let i = 0; i < this.totalCells; i++) {
            this.cells[i].length = 0;
        }
    }

    insert(obj) {
        if (!obj) return;
        const halfW = (obj.w || (obj.r ? obj.r * 2 : 20)) * 0.5;
        const halfH = (obj.h || (obj.r ? obj.r * 2 : 20)) * 0.5;

        const startCol = Math.max(0, Math.floor((obj.x - halfW) / this.cellSize));
        const endCol = Math.min(this.cols - 1, Math.floor((obj.x + halfW) / this.cellSize));
        const startRow = Math.max(0, Math.floor((obj.y - halfH) / this.cellSize));
        const endRow = Math.min(this.rows - 1, Math.floor((obj.y + halfH) / this.cellSize));

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const idx = c + r * this.cols;
                this.cells[idx].push(obj);
            }
        }
    }

    /**
     * Devuelve los candidatos a colisión usando el buffer interno reutilizable.
     * @param {Object} obj - El objeto a consultar con x, y, w, h o r.
     * @returns {Array} Array de candidatos sin duplicados (reutilizado).
     */
    retrieve(obj) {
        this.queryResults.length = 0;
        if (!obj) return this.queryResults;

        const qId = ++this.queryId;
        if (this.queryId > 1000000000) this.queryId = 1;

        const halfW = (obj.w || (obj.r ? obj.r * 2 : 20)) * 0.5;
        const halfH = (obj.h || (obj.r ? obj.r * 2 : 20)) * 0.5;

        const startCol = Math.max(0, Math.floor((obj.x - halfW) / this.cellSize));
        const endCol = Math.min(this.cols - 1, Math.floor((obj.x + halfW) / this.cellSize));
        const startRow = Math.max(0, Math.floor((obj.y - halfH) / this.cellSize));
        const endRow = Math.min(this.rows - 1, Math.floor((obj.y + halfH) / this.cellSize));

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const idx = c + r * this.cols;
                const cell = this.cells[idx];
                const len = cell.length;
                for (let i = 0; i < len; i++) {
                    const item = cell[i];
                    if (item && item._spatialTag !== qId) {
                        item._spatialTag = qId;
                        this.queryResults.push(item);
                    }
                }
            }
        }
        return this.queryResults;
    }
}

/**
 * Elimina un elemento de un array moviendo el último elemento a su posición.
 * O(1) en lugar de O(N) de splice(), sin desplazamientos de memoria.
 * @param {Array} arr - El array a modificar.
 * @param {number} index - El índice del elemento a eliminar.
 */
export function fastRemove(arr, index) {
    const lastIndex = arr.length - 1;
    if (index < lastIndex) {
        arr[index] = arr[lastIndex];
    }
    arr.pop();
}
