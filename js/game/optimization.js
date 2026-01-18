
// =================================================================================
//  MÓDULO DE OPTIMIZACIÓN
// =================================================================================
// Este archivo contiene clases y utilidades para mejorar el rendimiento del juego.

export class ObjectPool {
    constructor(createFn, initialSize = 10) {
        this.createFn = createFn;
        this.pool = [];
        // Pre-alocar objetos
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }

    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        } else {
            // Si el pool está vacío, crear uno nuevo (crecimiento bajo demanda)
            return this.createFn();
        }
    }

    release(obj) {
        this.pool.push(obj);
    }
}

/**
 * Spatial Grid para optimización de colisiones.
 * Divide el mundo en celdas para evitar comprobaciones O(N^2).
 */
export class SpatialGrid {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Map(); // Usamos Map para celdas dispersas o array plano
        this.objects = []; // Lista plana para iteración general si se necesita
    }

    clear() {
        this.grid.clear();
        this.objects = [];
    }

    _getCellKey(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return `${col},${row}`;
    }

    _getCellIndices(x, y) {
        return {
            col: Math.floor(x / this.cellSize),
            row: Math.floor(y / this.cellSize)
        };
    }

    insert(obj) {
        this.objects.push(obj);
        // Un objeto puede ocupar múltiples celdas si es grande
        // Por simplicidad inicial, lo insertamos en la celda de su centro
        // Mejora: Insertar en todas las celdas que toca su AABB

        const halfW = (obj.w || obj.r * 2) / 2;
        const halfH = (obj.h || obj.r * 2) / 2;

        const startCol = Math.floor((obj.x - halfW) / this.cellSize);
        const endCol = Math.floor((obj.x + halfW) / this.cellSize);
        const startRow = Math.floor((obj.y - halfH) / this.cellSize);
        const endRow = Math.floor((obj.y + halfH) / this.cellSize);

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const key = `${c},${r}`;
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                this.grid.get(key).push(obj);
            }
        }
    }

    /**
     * Devuelve los posibles candidatos a colisión para un objeto dado.
     * @param {Object} obj - El objeto a consultar.
     */
    retrieve(obj) {
        // Obtenemos candidatos de las celdas que ocupa el objeto
        const candidates = new Set();

        const halfW = (obj.w || obj.r * 2) / 2;
        const halfH = (obj.h || obj.r * 2) / 2;

        const startCol = Math.floor((obj.x - halfW) / this.cellSize);
        const endCol = Math.floor((obj.x + halfW) / this.cellSize);
        const startRow = Math.floor((obj.y - halfH) / this.cellSize);
        const endRow = Math.floor((obj.y + halfH) / this.cellSize);

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const key = `${c},${r}`;
                const cellObjects = this.grid.get(key);
                if (cellObjects) {
                    for (let i = 0; i < cellObjects.length; i++) {
                        candidates.add(cellObjects[i]);
                    }
                }
            }
        }
        return candidates;
    }
}

/**
 * Elimina un elemento de un array moviendo el último elemento a su posición.
 * O(1) en lugar de O(N) de splice(), pero no mantiene el orden.
 * Ideal para listas de partículas o entidades donde el orden de dibujado no es crucial.
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
