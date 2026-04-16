# 🎮 Hoja de Ruta: Migración a Phaser.js

> **Estado actual:** El juego usa Canvas 2D puro + ES Modules nativos.  
> **Objetivo futuro:** Migrar el motor de renderizado y física a **Phaser 3** para escalar el proyecto más fácilmente.

---

## ¿Por qué Phaser?

Phaser es el framework de juegos 2D más usado en JavaScript/TypeScript. Ofrece:

| Característica | Canvas Puro (actual) | Phaser 3 (futuro) |
|---|---|---|
| Renderizado | Canvas 2D manual | WebGL + Canvas automático |
| Física | Implementación propia | Arcade, Matter.js o Impact |
| Animaciones | Spritesheet manual | Sistema nativo de frames |
| Tilemaps | No hay | Tiled Map Editor integrado |
| Audio | Web Audio API manual | Plugin de audio completo |
| Input | Event listeners manuales | Sistema unificado (teclado, gamepad, táctil) |
| Gamepad | Implementación propia | `Phaser.Input.Gamepad` nativo |
| Partículas | Sistema propio | `Phaser.GameObjects.Particles` |
| Escenas | Niveles manuales | Sistema de `Scene` con lifecycle |

---

## Estructura de Carpetas Propuesta

```
expedicion-submarina/
├── src/
│   ├── main.js                  ← Inicializa Phaser.Game
│   ├── config.js                ← GameConfig (width, height, physics, scenes)
│   │
│   ├── scenes/
│   │   ├── BootScene.js         ← Carga de assets mínimos (loader)
│   │   ├── PreloadScene.js      ← Carga de todos los sprites y audios
│   │   ├── MenuScene.js         ← Menú principal
│   │   ├── GameScene.js         ← Escena principal de juego
│   │   ├── HUDScene.js          ← HUD superpuesto (corre en paralelo)
│   │   ├── LevelTransScene.js   ← Pantalla de transición entre niveles
│   │   └── GameOverScene.js     ← Pantalla de fin del juego
│   │
│   ├── entities/
│   │   ├── Player.js            ← Sprite del submarino (extiende Phaser.Physics.Arcade.Sprite)
│   │   ├── Whale.js             ← Ballena normal
│   │   ├── MegaWhale.js         ← Jefe Mega Ballena (nivel 9)
│   │   ├── Shark.js             ← Tiburón
│   │   ├── Kraken.js            ← Jefe Kraken (nivel 3)
│   │   └── Projectile.js        ← Torpedos y balas
│   │
│   ├── levels/
│   │   ├── Level1.js            ← Lógica específica del nivel 1
│   │   ├── Level9.js            ← Lógica del nivel 9 (cacería de ballenas)
│   │   └── ...
│   │
│   ├── systems/
│   │   ├── WeaponSystem.js      ← Gestión de armas (reemplaza armas/weapons.js)
│   │   ├── ParticleSystem.js    ← Efectos de partículas (sangre, burbujas)
│   │   └── AudioSystem.js       ← Wrapping del sistema de audio
│   │
│   └── ui/
│       ├── BossHealthBar.js     ← Barra de vida del jefe
│       └── MissionDisplay.js    ← Texto de misión HUD
│
├── assets/                      ← Igual que ahora (img/, audio/, etc.)
├── index.html
└── package.json
```

---

## Paso 1 — Instalación de Phaser

```bash
# Con npm
npm install phaser

# O con npm y Vite (recomendado para desarrollo)
npm create vite@latest expedicion-submarina -- --template vanilla
cd expedicion-submarina
npm install phaser
npm run dev
```

---

## Paso 2 — Configuración Base (`src/config.js`)

```javascript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';

export const GameConfig = {
    type: Phaser.AUTO,          // WebGL si disponible, sino Canvas
    width: 1920,
    height: 1080,
    backgroundColor: '#020b18',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },  // El océano no tiene gravedad por defecto
            debug: false,
        },
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, HUDScene],
};
```

---

## Paso 3 — Punto de Entrada (`src/main.js`)

```javascript
import Phaser from 'phaser';
import { GameConfig } from './config.js';

const game = new Phaser.Game(GameConfig);

// Exponer globalmente para debug en consola (opcional)
window.__game = game;
```

---

## Paso 4 — Escena de Precarga (`src/scenes/PreloadScene.js`)

```javascript
export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Barra de carga
        const bar = this.add.graphics();
        this.load.on('progress', (value) => {
            bar.clear();
            bar.fillStyle(0x00ccff, 1);
            bar.fillRect(100, this.scale.height / 2, (this.scale.width - 200) * value, 20);
        });

        // Spritesheets (equivalente a los actuales)
        this.load.spritesheet('whale', 'assets/img/whale_sheet.png', {
            frameWidth: 256,
            frameHeight: 256,
        });

        this.load.spritesheet('submarine', 'assets/img/sub_sheet.png', {
            frameWidth: 128,
            frameHeight: 64,
        });

        // Fondos
        this.load.image('bg_default', 'assets/img/bg/ocean_bg.webp');
        this.load.image('fg_default', 'assets/img/bg/ocean_fg.webp');

        // Audio
        this.load.audio('theme_main', 'assets/audio/theme_main.ogg');
        this.load.audio('boss_hit', 'assets/audio/boss_hit.wav');
        this.load.audio('explosion', 'assets/audio/explosion.wav');
    }

    create() {
        this.scene.start('MenuScene');
    }
}
```

---

## Paso 5 — Entidad Player (`src/entities/Player.js`)

```javascript
// Reemplaza toda la lógica del objeto `jugador` actual
export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'submarine');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Propiedades equivalentes al estado actual
        this.vidas = 20;
        this.direccion = 1;
        this.inclinacion = 0;
        this.armaActual = 'garra';
        this.boostEnergia = 100;

        // Hitbox
        this.setCircle(30, 14, 17); // Radio, offsetX, offsetY
        this.setCollideWorldBounds(true);

        // Animaciones
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('submarine', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1,
        });
        this.play('idle');
    }

    update(cursors, dt) {
        const speed = 300;
        this.setVelocity(0);

        if (cursors.left.isDown) {
            this.setVelocityX(-speed);
            this.setFlipX(true);
        } else if (cursors.right.isDown) {
            this.setVelocityX(speed);
            this.setFlipX(false);
        }
        if (cursors.up.isDown) this.setVelocityY(-speed);
        if (cursors.down.isDown) this.setVelocityY(speed);
    }
}
```

---

## Paso 6 — Jefe Mega Ballena (`src/entities/MegaWhale.js`)

```javascript
// Equivalente a levelState.jefe del nivel 9 actual
export class MegaWhale extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'whale');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.hp = 400;
        this.maxHp = 400;
        this.estado = 'alive'; // 'alive' | 'muriendo'
        this.chargeTimer = 5.0;
        this.isCharging = false;
        this.chargeDuration = 0;

        this.setSize(300, 150);

        // Anims
        this.anims.create({
            key: 'swim',
            frames: this.anims.generateFrameNumbers('whale', { start: 0, end: 7 }),
            frameRate: 12,
            repeat: -1,
        });
        this.play('swim');
    }

    recibirDano(cantidad) {
        if (this.estado === 'muriendo') return;
        this.hp = Math.max(0, this.hp - cantidad);
        this.setTint(0xffffff); // Flash blanco al recibir daño
        this.scene.time.delayedCall(150, () => this.clearTint());

        if (this.hp <= 0) {
            this.morir();
        }
    }

    morir() {
        this.estado = 'muriendo';
        this.scene.cameras.main.shake(500, 0.02);

        // Emitter de partículas de muerte
        const particles = this.scene.add.particles(this.x, this.y, 'blood_drop', {
            speed: { min: 100, max: 400 },
            lifespan: 2000,
            quantity: 30,
            scale: { start: 1, end: 0 },
        });

        // Timer para completar el nivel
        this.scene.time.delayedCall(5000, () => {
            particles.destroy();
            this.destroy();
            this.scene.events.emit('bossDefeated');
        });
    }

    update(player, dt) {
        if (this.estado === 'muriendo') return;

        this.chargeTimer -= dt;
        if (this.chargeTimer <= 0 && !this.isCharging) {
            this.isCharging = true;
            this.chargeDuration = 3.0;
        }

        if (this.isCharging) {
            this.scene.physics.moveToObject(this, player, 450);
            this.chargeDuration -= dt;
            if (this.chargeDuration <= 0) {
                this.isCharging = false;
                this.setVelocity(-50, 0);
                this.chargeTimer = 4.0 + Math.random() * 2;
            }
        }
    }
}
```

---

## Paso 7 — Sistema de Armas (`src/systems/WeaponSystem.js`)

```javascript
// Reemplaza armas/weapons.js
export class WeaponSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Grupos de física para colisiones automáticas
        this.torpedoGroup = scene.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 20,
        });

        this.bulletGroup = scene.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 200,
        });

        this.armaActual = 'torpedo';
    }

    lanzarTorpedo() {
        const torpedo = this.torpedoGroup.get(this.player.x, this.player.y, 'torpedo');
        if (!torpedo) return;

        torpedo.setActive(true).setVisible(true);
        this.scene.physics.velocityFromAngle(
            this.player.direccion === 1 ? 0 : 180,
            1200,
            torpedo.body.velocity
        );

        // Auto-destruir al salir de pantalla
        torpedo.body.setMaxVelocity(1200);
    }

    // Configurar colisiones con el jefe
    setupBossCollisions(bossSprite) {
        this.scene.physics.add.overlap(
            this.torpedoGroup,
            bossSprite,
            (torpedo, boss) => {
                torpedo.setActive(false).setVisible(false);
                boss.recibirDano(10);
            }
        );

        this.scene.physics.add.overlap(
            this.bulletGroup,
            bossSprite,
            (bullet, boss) => {
                bullet.setActive(false).setVisible(false);
                boss.recibirDano(1);
            }
        );
    }
}
```

---

## Paso 8 — GameScene con Nivel 9 (`src/scenes/GameScene.js`)

```javascript
import { Player } from '../entities/Player.js';
import { MegaWhale } from '../entities/MegaWhale.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create(data) {
        this.nivel = data.nivel || 1;

        // Fondo parallax
        this.bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'bg_default')
            .setOrigin(0, 0);
        this.fg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'fg_default')
            .setOrigin(0, 0);

        // Jugador
        this.player = new Player(this, this.scale.width * 0.3, this.scale.height / 2);
        this.cursors = this.input.keyboard.createCursorKeys();

        // Armas
        this.weapons = new WeaponSystem(this, this.player);
        this.input.keyboard.on('keydown-X', () => this.weapons.lanzarTorpedo());

        // Si es nivel 9, iniciar modo arena
        if (this.nivel === 9) {
            this.iniciarNivel9();
        }

        // HUD en escena paralela
        this.scene.launch('HUDScene', { nivel: this.nivel });
    }

    iniciarNivel9() {
        this.boss = new MegaWhale(this, this.scale.width + 200, this.scale.height / 2);
        this.weapons.setupBossCollisions(this.boss);

        // Evento cuando el jefe muere
        this.events.on('bossDefeated', () => {
            this.time.delayedCall(1000, () => {
                this.scene.start('LevelTransScene', { proximoNivel: 10 });
            });
        });

        // Colisión jugador-jefe (daño al jugador)
        this.physics.add.overlap(this.player, this.boss, () => {
            this.player.vidas -= 5;
            this.player.x -= 50;
            if (this.player.vidas <= 0) {
                this.scene.start('GameOverScene');
            }
        });
    }

    update(time, delta) {
        const dt = delta / 1000; // Convertir de ms a segundos

        // Parallax
        this.bg.tilePositionX += 0.3;
        this.fg.tilePositionX += 0.8;

        // Actualizar entidades
        this.player.update(this.cursors, dt);
        if (this.boss) this.boss.update(this.player, dt);
    }
}
```

---

## Equivalencias clave: código actual → Phaser

| Concepto actual | Equivalente en Phaser 3 |
|---|---|
| `estadoJuego` | Variables en `GameScene` + registro de datos `this.registry` |
| `animales[]` | `Phaser.Physics.Arcade.Group` con objetos activos |
| `levelState.jefe` | Instancia de clase (`MegaWhale`) en la escena |
| `generarExplosion()` | `this.add.particles()` + emitters |
| `generarGotasSangre()` | Particle emitter con textura de gota |
| `S.reproducir()` | `this.sound.play()` |
| `S.bucle()` | `this.sound.play('key', { loop: true })` |
| `comprobarCompletadoNivel()` | `this.events.emit('nivelCompletado')` |
| `Levels.updateLevel(dt)` | `Scene.update(time, delta)` + plugins de nivel |
| Gamepad manual | `this.input.gamepad.once('connected', ...)` nativo |
| `spatialGrid` | Arcade Physics Groups (manejo automático) |
| `lerp()` | `Phaser.Math.Linear()` o `tweens` |
| `clamp()` | `Phaser.Math.Clamp()` |
| Parallax manual | `TileSprite.tilePositionX +=` |
| Camera scroll | `this.cameras.main.scrollX +=` |
| Screen shake | `this.cameras.main.shake(duration, intensity)` |

---

## Plan de Migración por Fases

### Fase 1 — Setup (1-2 días)
- [ ] Instalar Phaser via npm + Vite
- [ ] Crear `BootScene`, `PreloadScene` y `MenuScene` básicas
- [ ] Migrar el sistema de carga de assets (imágenes, spritesheets, audio)

### Fase 2 — Motor (3-5 días)
- [ ] Implementar `Player` como Sprite con Arcade Physics
- [ ] Implementar `WeaponSystem` con grupos de tornados/balas
- [ ] Portear el sistema de parallax a `TileSprite`
- [ ] Implementar la lógica de cámara con `cameras.main`

### Fase 3 — Entidades (5-7 días)
- [ ] Migrar cada tipo de animal a su propia clase Sprite
- [ ] Migrar al jefe Kraken (Nivel 3) con su sistema de tentáculos
- [ ] Migrar la Mega Ballena (Nivel 9) con IA de carga
- [ ] Configurar colisiones via `physics.add.overlap`

### Fase 4 — Niveles (7-10 días)
- [ ] Crear una escena base `LevelScene` con lifecycle estándar
- [ ] Portear los 10 niveles usando el sistema de escenas de Phaser
- [ ] Implementar transiciones entre niveles

### Fase 5 — HUD y UI (2-3 días)
- [ ] Crear `HUDScene` corriendo en paralelo con la escena del juego
- [ ] Migrar la barra de vida del jefe
- [ ] Migrar el display de misión, vidas, armas

### Fase 6 — Polish (2-3 días)
- [ ] Migrar el sistema de partículas (sangre, burbujas, explosiones)
- [ ] Implementar screenshake, zoom y efectos de cámara
- [ ] Ajustar el gamepad con el plugin nativo de Phaser

---

## Recursos

- 📖 [Documentación oficial Phaser 3](https://newdocs.phaser.io/docs/3.88.2)
- 🎮 [Phaser 3 Examples](https://phaser.io/examples)
- 🔌 [Vite + Phaser template](https://github.com/phaser-default-template)
- 📦 [npm: phaser](https://www.npmjs.com/package/phaser)
- 🎯 [Arcade Physics guide](https://newdocs.phaser.io/docs/3.88.2/Phaser.Physics.Arcade)
- 🔊 [Sound Manager guide](https://newdocs.phaser.io/docs/3.88.2/Phaser.Sound.WebAudioSoundManager)

---

> **Nota:** La migración NO implica reescribir todo desde cero. Se recomienda hacerla **incrementalmente por nivel**, manteniendo el motor actual funcionando mientras se portan los activos y la lógica.
