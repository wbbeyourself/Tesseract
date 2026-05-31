# 坦克大战网页版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-featured HTML5 Canvas recreation of classic Battle City (坦克大战) with modern pixel-art visuals, progressive AI, skill tree, power-ups, and 80 stages.

**Architecture:** Single HTML file (`tank-battle/index.html`) with all JS/CSS embedded, plus a separate `tank-battle/data/maps.js` for map data. Classic game-loop architecture at 60fps with a state machine driving scenes (menu → playing → paused → stage-clear → game-over). All sprites are code-defined pixel arrays rendered to offscreen canvases at init time.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript (ES6+), Web Audio API, localStorage. Zero external dependencies.

**Design Spec:** `docs/superpowers/specs/2026-05-29-tank-battle-design.md`

---

## File Structure

```
tank-battle/
  index.html          ← 游戏主文件（内嵌 CSS + 全部 JS）
  data/
    maps.js           ← 80 关地图数据（var MAPS = [...]）
```

`index.html` 内部 JS 结构（用注释 `// ===== SECTION =====` 分区）：

| Section | 内容 |
|---|---|
| CONSTANTS | 所有游戏常量（格子大小、速度、颜色等） |
| UTILS | 工具函数（矩形碰撞、随机数等） |
| SPRITES | 像素精灵数据数组和精灵图集生成 |
| INPUT | InputManager（键盘状态缓存） |
| AUDIO | AudioManager（Web Audio API 合成音） |
| SAVE | SaveManager（localStorage 读写） |
| MAP | GameMap（地图数据解析、地形管理） |
| ENTITY | Entity 基类、Tank、Bullet、PowerUp、Explosion |
| PLAYER | PlayerTank（玩家控制、等级、技能效果） |
| ENEMY | EnemyTank、BossTank、敌人类型定义 |
| AI | AIController（4 层级 AI 决策） |
| PARTICLE | ParticleEngine（爆炸、火花粒子） |
| HUD | HUD（左侧敌人计数、右侧信息面板） |
| UI | UIManager（主菜单、暂停、设置、结算等界面） |
| ENGINE | GameEngine（主循环、状态机、帧率控制） |
| BOOT | 初始化入口（DOMContentLoaded → new GameEngine） |

---

## Phase 1: Core Engine Foundation

### Task 1: HTML Skeleton + Canvas + Constants + Game Loop

**Files:**
- Create: `tank-battle/index.html`
- Create: `tank-battle/data/maps.js` (placeholder with 1 test map)

- [ ] **Step 1: Create maps.js with one test map**

Create `tank-battle/data/maps.js`:

```javascript
// Tank Battle - Map Data
// Terrain: 0=空地 1=砖墙 2=钢墙 3=水域 4=树林 5=冰面 9=基地(鹰)
// Grid: 26 columns × 26 rows, each cell 16×16 px
// Base is at row 24-25, columns 12-13 (bottom center)

var MAPS = [];

// Stage 1 - Test map
MAPS[0] = [
  "00000000000000000000000000",
  "00000000000000000000000000",
  "00110000001100001100000011",
  "00110000001100001100000011",
  "00110000001100001100000011",
  "00110000001100001100000011",
  "00110000111111001111000011",
  "00110000111111001111000011",
  "00110000000000000000000011",
  "00110000000000000000000011",
  "00000000000000000000000000",
  "00000000000000000000000000",
  "11000011001100110011000011",
  "11000011001100110011000011",
  "00000011001100110011000000",
  "00000011001100110011000000",
  "00000000000000000000000000",
  "00000000000000000000000000",
  "00110000001100001100000011",
  "00110000001100001100000011",
  "00110000001100001100000011",
  "00110000001100001100000011",
  "00000000001100000000000000",
  "00000000001100000000000000",
  "00000000011911000000000000",
  "00000000011911000000000000",
];
```

- [ ] **Step 2: Create index.html with full skeleton and game loop**

Create `tank-battle/index.html` with the following structure. This is the complete skeleton — every section has a stub so later tasks fill them in.

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>坦克大战 - Battle City</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #111;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: hidden;
  font-family: monospace;
}
#gameContainer {
  position: relative;
  display: flex;
}
#gameCanvas {
  border: 2px solid #555;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
#leftPanel, #rightPanel {
  width: 80px;
  background: #1a1a1a;
  border: 2px solid #555;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
</head>
<body>
<div id="gameContainer">
  <div id="leftPanel"></div>
  <canvas id="gameCanvas"></canvas>
  <div id="rightPanel"></div>
</div>

<script src="data/maps.js"></script>
<script>
"use strict";

// ===== CONSTANTS =====
const C = {
  // Grid
  COLS: 26,
  ROWS: 26,
  TILE: 16,          // base tile size in pixels
  SCALE: 2,          // render at 2x
  STAGE_W: 26 * 16,  // 416 base pixels
  STAGE_H: 26 * 16,

  // Directions
  UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3,
  DX: [0, 1, 0, -1],
  DY: [-1, 0, 1, 0],

  // Game
  FPS: 60,
  TANK_SIZE: 16,
  BOSS_SIZE: 32,
  BULLET_SIZE: 4,
  POWERUP_SIZE: 16,

  // Terrain codes
  T_EMPTY: 0, T_BRICK: 1, T_STEEL: 2, T_WATER: 3,
  T_TREE: 4, T_ICE: 5, T_BASE: 9,

  // Player
  P_SPEED: [0, 1.0, 1.5, 1.5, 2.0],  // speed per level (index 0 unused)
  P_BULLET_SPEED: [0, 2.5, 3.5, 3.5, 4.0],
  P_MAX_BULLETS: [0, 1, 1, 2, 2],
  P_INIT_LIVES: 3,

  // Enemy types: [name, color, hp, speed, bulletSpeed, aiLevel]
  E_TYPES: {
    basic:   { name: 'basic',   color: '#888', hp: 1, speed: 0.8, bulletSpeed: 2.0, minStage: 1 },
    fast:    { name: 'fast',    color: '#ddd', hp: 1, speed: 1.8, bulletSpeed: 2.5, minStage: 3 },
    power:   { name: 'power',   color: '#4a4', hp: 2, speed: 1.0, bulletSpeed: 3.0, minStage: 5 },
    armor:   { name: 'armor',   color: '#da3', hp: 4, speed: 0.7, bulletSpeed: 2.0, minStage: 8 },
    elite:   { name: 'elite',   color: '#d44', hp: 3, speed: 1.2, bulletSpeed: 2.5, minStage: 12 },
  },

  // Power-up types
  PU_STAR: 0, PU_BOMB: 1, PU_SHOVEL: 2, PU_HELMET: 3,
  PU_CLOCK: 4, PU_TANK: 5, PU_SPREAD: 6, PU_MISSILE: 7,
  PU_SPEED: 8, PU_SHIELD: 9,
  PU_DURATION: 10000, // ms, power-up stays on field
  PU_NAMES: ['star','bomb','shovel','helmet','clock','tank','spread','missile','speed','shield'],

  // Colors
  COL_BG: '#000',
  COL_BRICK: '#8B4513',
  COL_STEEL: '#C0C0C0',
  COL_WATER: '#4488CC',
  COL_TREE: '#228B22',
  COL_ICE: '#ADD8E6',
  COL_BASE_OK: '#FFD700',
  COL_BASE_DEAD: '#555',
  COL_PLAYER: '#FFD700',
  COL_TEXT: '#FFF',
  COL_HUD_BG: '#1a1a1a',
};

// ===== UTILS =====
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function randFloat(lo, hi) { return lo + Math.random() * (hi - lo); }
function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function tileToPixel(t) { return t * C.TILE; }
function pixelToTile(p) { return Math.floor(p / C.TILE); }

// ===== SPRITES =====
// (Filled in Task 2)

// ===== INPUT =====
const Input = {
  keys: {},
  justPressed: {},
  init() {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  },
  isDown(code) { return !!this.keys[code]; },
  wasPressed(code) { return !!this.justPressed[code]; },
  clearFrame() { this.justPressed = {}; },
};

// ===== AUDIO =====
// (Filled in Task 11)

// ===== SAVE =====
// (Filled in Task 12)

// ===== MAP =====
// (Filled in Task 3)

// ===== ENTITY =====
// (Filled in Tasks 4-7)

// ===== PLAYER =====
// (Filled in Task 5)

// ===== ENEMY =====
// (Filled in Task 6)

// ===== AI =====
// (Filled in Task 8)

// ===== PARTICLE =====
// (Filled in Task 13)

// ===== HUD =====
// (Filled in Task 10)

// ===== UI =====
// (Filled in Task 9)

// ===== ENGINE =====
const Engine = {
  canvas: null,
  ctx: null,
  state: 'menu', // menu | loading | playing | paused | stageClear | gameOver | settings | leaderboard | skillTree
  stage: 1,
  lastTime: 0,
  accumulator: 0,
  TICK: 1000 / C.FPS,

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.canvas.width = C.STAGE_W;
    this.canvas.height = C.STAGE_H;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    // Scale via CSS for crisp pixels
    this.canvas.style.width = (C.STAGE_W * C.SCALE) + 'px';
    this.canvas.style.height = (C.STAGE_H * C.SCALE) + 'px';
    Input.init();
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },

  loop(now) {
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += dt;

    while (this.accumulator >= this.TICK) {
      this.update();
      this.accumulator -= this.TICK;
    }
    this.render();
    Input.clearFrame();
    requestAnimationFrame(t => this.loop(t));
  },

  update() {
    // dispatch by state — filled in later tasks
    switch (this.state) {
      case 'menu': break;
      case 'playing': break;
      case 'paused': break;
      default: break;
    }
  },

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = C.COL_BG;
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);

    switch (this.state) {
      case 'menu':
        ctx.fillStyle = '#FFF';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('坦克大战 BATTLE CITY', C.STAGE_W / 2, 100);
        ctx.fillText('按 Enter 开始游戏', C.STAGE_W / 2, 200);
        break;
      default: break;
    }
  },

  setState(s) { this.state = s; },
};

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  Engine.init();
});
</script>
</body>
</html>
```

- [ ] **Step 3: Verify in browser**

Open `tank-battle/index.html` in a browser. You should see a black canvas (416×416 scaled to 832×832) with flanking dark panels, displaying "坦克大战 BATTLE CITY" and "按 Enter 开始游戏" in white text.

- [ ] **Step 4: Commit**

```bash
cd tank-battle
git add index.html data/maps.js
git commit -m "feat: 游戏骨架 - Canvas、游戏循环、常量、输入管理"
```

---

### Task 2: Sprite System — Pixel Art Data + Sprite Atlas

**Files:**
- Modify: `tank-battle/index.html` (SPRITES section)

This task creates the sprite rendering system. All sprites are defined as 2D pixel arrays (hex color strings) and rendered onto offscreen canvases at boot. A `Sprites.draw()` function blits them to the game canvas.

- [ ] **Step 1: Define sprite data format and helper**

Replace the SPRITES section stub with:

```javascript
// ===== SPRITES =====
const Sprites = {
  atlas: {},  // key: 'player_0_0' (entity_direction_frame) → offscreen canvas

  // Define a sprite from a 2D array of hex colors ('.' = transparent)
  define(key, pixels, size) {
    size = size || C.TILE;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    for (let y = 0; y < pixels.length; y++) {
      for (let x = 0; x < pixels[y].length; x++) {
        if (pixels[y][x] !== '.') {
          ctx.fillStyle = pixels[y][x];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    this.atlas[key] = c;
  },

  draw(ctx, key, x, y) {
    const sprite = this.atlas[key];
    if (sprite) ctx.drawImage(sprite, Math.round(x), Math.round(y));
  },

  init() {
    this._buildTerrain();
    this._buildPlayerTanks();
    this._buildEnemyTanks();
    this._buildBullets();
    this._buildPowerUps();
    this._buildExplosions();
    this._buildBase();
    this._buildMisc();
  },

  // --- TERRAIN SPRITES (16x16) ---
  _buildTerrain() {
    const B = '#8B4513'; // brick
    const BD = '#6B3410';
    const S = '#C0C0C0'; // steel
    const SD = '#888';
    const W = '#4488CC'; // water
    const WL = '#66AAEE';
    const T = '#228B22'; // tree
    const TD = '#1A6B1A';
    const I = '#ADD8E6'; // ice
    const IL = '#C8E8F8';

    // Brick wall - 4 sub-blocks pattern
    const brick = [
      [B,B,B,B,B,B,B,'.',B,B,B,B,B,B,B,'.'],
      [B,BD,BD,BD,B,B,B,'.',B,BD,BD,BD,B,B,B,'.'],
      [B,BD,BD,BD,B,B,B,'.',B,BD,BD,BD,B,B,B,'.'],
      [B,B,B,B,B,B,B,'.',B,B,B,B,B,B,B,'.'],
      ['.',B,B,B,B,B,B,'.','.',B,B,B,B,B,B,'.'],
      ['.',B,BD,BD,BD,B,B,'.','.',B,BD,BD,BD,B,B,'.'],
      ['.',B,BD,BD,BD,B,B,'.','.',B,BD,BD,BD,B,B,'.'],
      ['.',B,B,B,B,B,B,'.','.',B,B,B,B,B,B,'.'],
      [B,B,B,B,B,B,B,'.',B,B,B,B,B,B,B,'.'],
      [B,BD,BD,BD,B,B,B,'.',B,BD,BD,BD,B,B,B,'.'],
      [B,BD,BD,BD,B,B,B,'.',B,BD,BD,BD,B,B,B,'.'],
      [B,B,B,B,B,B,B,'.',B,B,B,B,B,B,B,'.'],
      ['.',B,B,B,B,B,B,'.','.',B,B,B,B,B,B,'.'],
      ['.',B,BD,BD,BD,B,B,'.','.',B,BD,BD,BD,B,B,'.'],
      ['.',B,BD,BD,BD,B,B,'.','.',B,BD,BD,BD,B,B,'.'],
      ['.',B,B,B,B,B,B,'.','.',B,B,B,B,B,B,'.'],
    ];
    this.define('terrain_brick', brick);

    // Steel wall
    const steel = [
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
      [S,SD,S,S,S,S,S,S,S,S,S,S,S,S,SD,S],
      [S,S,S,S,S,SD,S,S,S,S,SD,S,S,S,S,S],
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
      [S,S,S,SD,S,S,S,S,S,S,S,S,SD,S,S,S],
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
      [S,S,S,S,S,S,S,SD,S,S,S,S,S,S,S,S],
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
      [S,SD,S,S,S,S,S,S,S,S,S,S,S,S,SD,S],
      [S,S,S,S,S,SD,S,S,S,S,SD,S,S,S,S,S],
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
      [S,S,S,SD,S,S,S,S,S,S,S,S,SD,S,S,S],
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
      [S,S,S,S,S,S,S,SD,S,S,S,S,S,S,S,S],
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
    ];
    this.define('terrain_steel', steel);

    // Water
    const water = [
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,WL,W,W,W,WL,W,W,W,WL,W,W,W,WL,W,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [WL,W,W,W,WL,W,W,W,WL,W,W,W,WL,W,W,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,WL,W,W,W,WL,W,W,W,WL,W,W,W,WL,W,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [WL,W,W,W,WL,W,W,W,WL,W,W,W,WL,W,W,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,WL,W,W,W,WL,W,W,W,WL,W,W,W,WL,W,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [WL,W,W,W,WL,W,W,W,WL,W,W,W,WL,W,W,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,WL,W,W,W,WL,W,W,W,WL,W,W,W,WL,W,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [WL,W,W,W,WL,W,W,W,WL,W,W,W,WL,W,W,W],
    ];
    this.define('terrain_water', water);

    // Tree
    const tree = [
      ['.',T,T,'.','.',T,T,'.','.','.',T,T,'.','.',T,T,'.'],
      [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
      [T,TD,T,TD,T,T,TD,T,T,TD,T,T,TD,T,T,TD,T],
      [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
      [T,T,TD,T,T,T,T,TD,T,T,T,TD,T,T,T,T,T],
      ['.',T,T,T,T,T,T,T,T,T,T,T,T,T,T,'.'],
      ['.',T,TD,T,T,TD,T,T,T,T,TD,T,T,TD,T,'.','.'],
      ['.','.',T,T,T,T,T,T,T,T,T,T,T,T,'.','.','.'],
      ['.',T,T,'.','.',T,T,'.','.','.',T,T,'.','.',T,T,'.'],
      [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
      [T,TD,T,TD,T,T,TD,T,T,TD,T,T,TD,T,T,TD,T],
      [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
      [T,T,TD,T,T,T,T,TD,T,T,T,TD,T,T,T,T,T],
      ['.',T,T,T,T,T,T,T,T,T,T,T,T,T,T,'.'],
      ['.',T,TD,T,T,TD,T,T,T,T,TD,T,T,TD,T,'.','.'],
      ['.','.',T,T,T,T,T,T,T,T,T,T,T,T,'.','.','.'],
    ];
    this.define('terrain_tree', tree);

    // Ice
    const ice = [
      [I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I],
      [I,IL,I,I,IL,I,I,I,I,IL,I,I,IL,I,I,I],
      [I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I],
      [I,IL,I,I,I,I,IL,I,I,I,I,IL,I,I,I,I],
      [I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I],
      [I,I,IL,I,I,I,I,I,I,I,I,I,I,IL,I,I],
      [I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I],
      [I,IL,I,I,IL,I,I,I,I,IL,I,I,IL,I,I,I],
      [I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I],
      [I,IL,I,I,I,I,IL,I,I,I,I,IL,I,I,I,I],
      [I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I],
      [I,I,IL,I,I,I,I,I,I,I,I,I,I,IL,I,I],
      [I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I],
      [I,IL,I,I,IL,I,I,I,I,IL,I,I,IL,I,I,I],
      [I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I],
      [I,IL,I,I,I,I,IL,I,I,I,I,IL,I,I,I,I],
    ];
    this.define('terrain_ice', ice);
  },

  // --- PLAYER TANK SPRITES ---
  _buildPlayerTanks() {
    // Player tanks: 4 levels × 4 directions × 2 animation frames
    // Level colors: Lv1=#AAA Lv2=#FFD700 Lv3=#FF8C00 Lv4=#FF4444
    const levelColors = ['#AAA', '#FFD700', '#FF8C00', '#FF4444'];
    const DK = ['#777', '#CC9900', '#CC6600', '#CC2222'];

    for (let lv = 0; lv < 4; lv++) {
      const c = levelColors[lv];
      const d = DK[lv];
      // Each tank is a 16x16 sprite, simplified pixel tank shape
      // Frame 0 and 1 differ by tread pattern
      for (let dir = 0; dir < 4; dir++) {
        for (let frame = 0; frame < 2; frame++) {
          const pixels = this._makeTankPixels(c, d, dir, frame);
          this.define(`player_${lv}_${dir}_${frame}`, pixels);
        }
      }
    }
  },

  _makeTankPixels(mainC, darkC, dir, frame) {
    // Create a 16x16 tank sprite
    // Base tank shape (facing up), then rotated by dir
    const px = Array.from({length:16}, () => Array(16).fill('.'));
    const M = mainC, D = darkC, G = '#555'; // gun barrel

    // Treads (left and right columns 0-2 and 13-15)
    const treadPat = frame === 0
      ? [D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D]
      : ['.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D];
    for (let y = 0; y < 16; y++) {
      px[y][0] = D; px[y][1] = treadPat[y];
      px[y][14] = treadPat[y]; px[y][15] = D;
    }
    // Body (columns 3-12)
    for (let y = 2; y < 14; y++) {
      for (let x = 3; x < 13; x++) {
        px[y][x] = M;
      }
    }
    // Turret center detail
    for (let y = 5; y < 11; y++) {
      for (let x = 5; x < 11; x++) {
        px[y][x] = D;
      }
    }
    // Gun barrel
    if (dir === C.UP) {
      for (let y = 1; y < 6; y++) { px[y][7] = G; px[y][8] = G; }
    } else if (dir === C.DOWN) {
      for (let y = 10; y < 15; y++) { px[y][7] = G; px[y][8] = G; }
    } else if (dir === C.LEFT) {
      for (let x = 1; x < 6; x++) { px[7][x] = G; px[8][x] = G; }
    } else {
      for (let x = 10; x < 15; x++) { px[7][x] = G; px[8][x] = G; }
    }
    return px;
  },

  // --- ENEMY TANK SPRITES ---
  _buildEnemyTanks() {
    const types = {
      basic:  { m: '#888', d: '#555' },
      fast:   { m: '#DDD', d: '#AAA' },
      power:  { m: '#4A4', d: '#282' },
      armor:  { m: '#DA3', d: '#A72' },
      elite:  { m: '#D44', d: '#A22' },
    };
    for (const [name, col] of Object.entries(types)) {
      for (let dir = 0; dir < 4; dir++) {
        for (let frame = 0; frame < 2; frame++) {
          const pixels = this._makeTankPixels(col.m, col.d, dir, frame);
          this.define(`enemy_${name}_${dir}_${frame}`, pixels);
        }
      }
    }
    // Boss: 32×32 sprite (simplified large tank)
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 2; frame++) {
        const pixels = this._makeBossPixels('#D00', '#900', dir, frame);
        this.define(`boss_${dir}_${frame}`, pixels, C.BOSS_SIZE);
      }
    }
  },

  _makeBossPixels(mainC, darkC, dir, frame) {
    const sz = C.BOSS_SIZE;
    const px = Array.from({length:sz}, () => Array(sz).fill('.'));
    const M = mainC, D = darkC, G = '#444';
    const treadPat = frame === 0
      ? [D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D]
      : ['.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D,D,'.',D];
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < 3; x++) { px[y][x] = x === 0 ? D : treadPat[y]; }
      for (let x = sz-3; x < sz; x++) { px[y][x] = x === sz-1 ? D : treadPat[y]; }
    }
    for (let y = 4; y < sz-4; y++) {
      for (let x = 4; x < sz-4; x++) { px[y][x] = M; }
    }
    for (let y = 8; y < sz-8; y++) {
      for (let x = 8; x < sz-8; x++) { px[y][x] = D; }
    }
    // Gun barrel (wider)
    if (dir === C.UP) { for (let y = 1; y < 10; y++) { px[y][14]=G; px[y][15]=G; px[y][16]=G; px[y][17]=G; } }
    else if (dir === C.DOWN) { for (let y = sz-10; y < sz-1; y++) { px[y][14]=G; px[y][15]=G; px[y][16]=G; px[y][17]=G; } }
    else if (dir === C.LEFT) { for (let x = 1; x < 10; x++) { px[14][x]=G; px[15][x]=G; px[16][x]=G; px[17][x]=G; } }
    else { for (let x = sz-10; x < sz-1; x++) { px[14][x]=G; px[15][x]=G; px[16][x]=G; px[17][x]=G; } }
    return px;
  },

  // --- BULLET SPRITES ---
  _buildBullets() {
    const BC = '#FFF';
    for (let dir = 0; dir < 4; dir++) {
      const px = Array.from({length:4}, () => Array(4).fill('.'));
      if (dir === C.UP || dir === C.DOWN) {
        px[1][1] = BC; px[1][2] = BC; px[2][1] = BC; px[2][2] = BC;
      } else {
        px[1][1] = BC; px[1][2] = BC; px[2][1] = BC; px[2][2] = BC;
      }
      this.define(`bullet_${dir}`, px, C.BULLET_SIZE);
    }
  },

  // --- POWER-UP SPRITES ---
  _buildPowerUps() {
    // Each power-up: 16x16 with a colored icon on dark red background
    const puColors = ['#FFD700','#FF4400','#AABBCC','#FFD700',
                      '#44AAFF','#FF4466','#FF8844','#FF0000',
                      '#44FF44','#8888FF'];
    for (let i = 0; i < 10; i++) {
      const px = Array.from({length:16}, () => Array(16).fill('#8B0000'));
      const col = puColors[i];
      // Draw a simple icon shape in the center (8x8 area)
      for (let y = 4; y < 12; y++) {
        for (let x = 4; x < 12; x++) {
          px[y][x] = col;
        }
      }
      // Border
      for (let y = 0; y < 16; y++) { px[y][0] = '#555'; px[y][15] = '#555'; }
      for (let x = 0; x < 16; x++) { px[0][x] = '#555'; px[15][x] = '#555'; }
      this.define(`powerup_${i}`, px);
    }
  },

  // --- EXPLOSION SPRITES ---
  _buildExplosions() {
    const frames = 5;
    for (let f = 0; f < frames; f++) {
      const size = 16 + f * 4;
      const px = Array.from({length:size}, () => Array(size).fill('.'));
      const cx = Math.floor(size / 2);
      const radius = 2 + f * 2;
      const colors = ['#FF4400', '#FF8800', '#FFCC00', '#FFFFFF'];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dist = Math.abs(x - cx) + Math.abs(y - cx);
          if (dist <= radius) {
            const ci = Math.min(Math.floor(dist / Math.max(1, radius / 4)), 3);
            px[y][x] = colors[ci];
          }
        }
      }
      this.define(`explosion_${f}`, px, size);
    }
  },

  // --- BASE SPRITE ---
  _buildBase() {
    // Base OK: golden eagle shape
    const px = Array.from({length:16}, () => Array(16).fill('.'));
    const G = C.COL_BASE_OK;
    // Simple eagle pixel art
    const eagle = [
      [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,1,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,0,0,0,0,1,1,1,1,1,0],
      [0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0],
      [0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],
      [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
      [0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    ];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (eagle[y][x]) px[y][x] = G;
      }
    }
    this.define('base_ok', px);
    // Base destroyed: grey version
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (px[y][x] !== '.') px[y][x] = C.COL_BASE_DEAD;
      }
    }
    this.define('base_dead', px);
  },

  // --- MISC SPRITES ---
  _buildMisc() {
    // Spawn flash star (8-pointed star, 16x16)
    const px = Array.from({length:16}, () => Array(16).fill('.'));
    const W = '#FFFFFF';
    for (let i = 0; i < 16; i++) { px[7][i] = W; px[8][i] = W; px[i][7] = W; px[i][8] = W; }
    px[4][4]=W; px[4][11]=W; px[11][4]=W; px[11][11]=W;
    px[5][5]=W; px[5][10]=W; px[10][5]=W; px[10][10]=W;
    this.define('spawn_star', px);
    // Shield effect (circle outline, 16x16)
    const sp = Array.from({length:16}, () => Array(16).fill('.'));
    const SC = 'rgba(100,200,255,0.5)';
    for (let a = 0; a < 360; a += 10) {
      const x = Math.round(7.5 + 6 * Math.cos(a * Math.PI / 180));
      const y = Math.round(7.5 + 6 * Math.sin(a * Math.PI / 180));
      if (x >= 0 && x < 16 && y >= 0 && y < 16) sp[y][x] = SC;
    }
    this.define('shield', sp);
  },
};
```

- [ ] **Step 2: Call Sprites.init() in BOOT section**

In the BOOT section, add `Sprites.init();` before `Engine.init();`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  Sprites.init();
  Engine.init();
});
```

- [ ] **Step 3: Verify in browser**

Open `tank-battle/index.html`. The page should look the same as before (menu text). Open browser console — no errors. Verify sprites were created by typing `Object.keys(Sprites.atlas).length` in console — should show ~100+ entries.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: 精灵系统 - 像素精灵数据、图集、坦克/地形/道具精灵"
```

---

## Phase 2: Map & World

### Task 3: GameMap — Map Loading, Terrain Grid, Rendering

**Files:**
- Modify: `tank-battle/index.html` (MAP section, ENGINE render)

- [ ] **Step 1: Implement GameMap class**

Replace the MAP section stub with:

```javascript
// ===== MAP =====
const GameMap = {
  grid: null,           // 26×26 array of terrain codes
  brickHP: null,        // 26×26 array, brick sub-block HP (0-4, 4=full)
  baseAlive: true,

  load(stageIndex) {
    this.baseAlive = true;
    const data = MAPS[stageIndex % MAPS.length];
    this.grid = [];
    this.brickHP = [];
    for (let r = 0; r < C.ROWS; r++) {
      this.grid[r] = [];
      this.brickHP[r] = [];
      for (let c = 0; c < C.COLS; c++) {
        const ch = data[r] ? parseInt(data[r][c]) || 0 : 0;
        this.grid[r][c] = ch;
        this.brickHP[r][c] = ch === C.T_BRICK ? 4 : 0;
      }
    }
  },

  get(r, c) {
    if (r < 0 || r >= C.ROWS || c < 0 || c >= C.COLS) return C.T_STEEL; // out of bounds = solid
    return this.grid[r][c];
  },

  isSolid(r, c) {
    const t = this.get(r, c);
    return t === C.T_BRICK || t === C.T_STEEL || t === C.T_WATER || t === C.T_BASE;
  },

  // Check if a rectangle (pixel coords) collides with solid terrain
  collides(x, y, w, h) {
    const r1 = pixelToTile(y), r2 = pixelToTile(y + h - 1);
    const c1 = pixelToTile(x), c2 = pixelToTile(x + w - 1);
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (this.isSolid(r, c)) return true;
      }
    }
    return false;
  },

  // Bullet hits terrain at pixel (x,y). Returns: 'none','brick','steel','base'
  bulletHit(bx, by, power) {
    const r = pixelToTile(by);
    const c = pixelToTile(bx);
    const t = this.get(r, c);
    if (t === C.T_BRICK) {
      this.destroyBrick(r, c);
      return 'brick';
    }
    if (t === C.T_STEEL) {
      if (power >= 4) { // Lv4 can destroy steel
        this.grid[r][c] = C.T_EMPTY;
        return 'brick'; // same visual effect
      }
      return 'steel';
    }
    if (t === C.T_BASE && this.baseAlive) {
      this.baseAlive = false;
      this.grid[r][c] = C.T_EMPTY;
      return 'base';
    }
    return 'none';
  },

  destroyBrick(r, c) {
    if (this.get(r, c) === C.T_BRICK) {
      this.grid[r][c] = C.T_EMPTY;
    }
  },

  // Temporarily fortify base surroundings (shovel power-up)
  fortifyBase(isSteel) {
    // Base is at row 24-25, cols 12-13. Surround with brick/steel.
    const br = 23, bc = 11; // top-left of base wall ring
    const wallType = isSteel ? C.T_STEEL : C.T_BRICK;
    for (let r = br; r <= br+3; r++) {
      for (let c = bc; c <= bc+4; c++) {
        if (r === br || r === br+3 || c === bc || c === bc+4) {
          if (this.get(r, c) !== C.T_BASE) {
            this.grid[r][c] = wallType;
          }
        }
      }
    }
  },

  render(ctx) {
    // Layer 1: ground + terrain (except trees)
    for (let r = 0; r < C.ROWS; r++) {
      for (let c = 0; c < C.COLS; c++) {
        const t = this.grid[r][c];
        const x = tileToPixel(c);
        const y = tileToPixel(r);
        if (t === C.T_EMPTY) continue;
        if (t === C.T_ICE) {
          Sprites.draw(ctx, 'terrain_ice', x, y);
        } else if (t === C.T_BRICK) {
          Sprites.draw(ctx, 'terrain_brick', x, y);
        } else if (t === C.T_STEEL) {
          Sprites.draw(ctx, 'terrain_steel', x, y);
        } else if (t === C.T_WATER) {
          Sprites.draw(ctx, 'terrain_water', x, y);
        } else if (t === C.T_BASE) {
          Sprites.draw(ctx, this.baseAlive ? 'base_ok' : 'base_dead', x, y);
        }
      }
    }
  },

  // Trees render on a separate pass (above tanks)
  renderTrees(ctx) {
    for (let r = 0; r < C.ROWS; r++) {
      for (let c = 0; c < C.COLS; c++) {
        if (this.grid[r][c] === C.T_TREE) {
          Sprites.draw(ctx, 'terrain_tree', tileToPixel(c), tileToPixel(r));
        }
      }
    }
  },
};
```

- [ ] **Step 2: Update Engine render to draw the map**

In `Engine.render()`, replace the `default: break;` in the switch with a `case 'playing':` case that draws the map:

```javascript
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = C.COL_BG;
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);

    switch (this.state) {
      case 'menu':
        ctx.fillStyle = '#FFF';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('坦克大战 BATTLE CITY', C.STAGE_W / 2, 100);
        ctx.fillText('按 Enter 开始游戏', C.STAGE_W / 2, 200);
        break;
      case 'playing':
      case 'paused':
        GameMap.render(ctx);
        // Trees, tanks, bullets, particles rendered here in later tasks
        GameMap.renderTrees(ctx);
        if (this.state === 'paused') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
          ctx.fillStyle = '#FFF';
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('暂停 - 按 P 继续', C.STAGE_W / 2, C.STAGE_H / 2);
        }
        break;
      default: break;
    }
  },
```

- [ ] **Step 3: Add Enter key to start game in Engine.update**

In `Engine.update()`, add logic to transition from menu to playing:

```javascript
  update() {
    switch (this.state) {
      case 'menu':
        if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
          this.stage = 1;
          GameMap.load(this.stage - 1);
          this.setState('playing');
        }
        break;
      case 'playing':
        if (Input.wasPressed('KeyP') || Input.wasPressed('Escape')) {
          this.setState('paused');
        }
        break;
      case 'paused':
        if (Input.wasPressed('KeyP') || Input.wasPressed('Escape')) {
          this.setState('playing');
        }
        break;
      default: break;
    }
  },
```

- [ ] **Step 4: Verify in browser**

Open `tank-battle/index.html`. Press Enter. You should see the test map rendered with brick walls and the base (golden eagle) at the bottom center. Press P to pause (dark overlay + "暂停" text). Press P again to resume.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: 地图系统 - 加载、碰撞检测、地形渲染"
```

---

## Phase 3: Player Tank

### Task 4: Player Tank — Movement, Shooting, Level System

**Files:**
- Modify: `tank-battle/index.html` (ENTITY + PLAYER sections, ENGINE update/render)

- [ ] **Step 1: Define Bullet and Tank entity classes**

Replace the ENTITY section stub:

```javascript
// ===== ENTITY =====

class Bullet {
  constructor(x, y, dir, speed, owner, power) {
    this.x = x; this.y = y;
    this.dir = dir;
    this.speed = speed;
    this.owner = owner; // 'player' or 'enemy'
    this.power = power || 1;
    this.alive = true;
    this.w = C.BULLET_SIZE;
    this.h = C.BULLET_SIZE;
  }

  update() {
    this.x += C.DX[this.dir] * this.speed;
    this.y += C.DY[this.dir] * this.speed;
    // Out of bounds
    if (this.x < 0 || this.x > C.STAGE_W - this.w || this.y < 0 || this.y > C.STAGE_H - this.h) {
      this.alive = false;
      return;
    }
    // Terrain collision
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const hit = GameMap.bulletHit(cx, cy, this.power);
    if (hit !== 'none') {
      this.alive = false;
      // Spawn small explosion at impact point
      if (hit === 'base') {
        Engine.onBaseDestroyed();
      }
    }
  }

  render(ctx) {
    Sprites.draw(ctx, `bullet_${this.dir}`, this.x, this.y);
  }

  getRect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class Explosion {
  constructor(x, y, size) {
    this.x = x; this.y = y;
    this.size = size || 'small'; // small, medium, large
    this.frame = 0;
    this.maxFrame = 5;
    this.timer = 0;
    this.frameDur = 3; // ticks per frame
    this.alive = true;
  }

  update() {
    this.timer++;
    if (this.timer >= this.frameDur) {
      this.timer = 0;
      this.frame++;
      if (this.frame >= this.maxFrame) this.alive = false;
    }
  }

  render(ctx) {
    const spr = Sprites.atlas[`explosion_${this.frame}`];
    if (spr) {
      const ox = this.x - spr.width / 2;
      const oy = this.y - spr.height / 2;
      ctx.drawImage(spr, Math.round(ox), Math.round(oy));
    }
  }
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type;
    this.alive = true;
    this.timer = 0;
    this.maxTimer = C.PU_DURATION / (1000 / C.FPS); // convert ms to ticks
    this.blinkTimer = 0;
  }

  update() {
    this.timer++;
    this.blinkTimer++;
    if (this.timer >= this.maxTimer) this.alive = false;
  }

  render(ctx) {
    // Blink when about to expire (last 3 seconds)
    const remaining = this.maxTimer - this.timer;
    if (remaining < 180 && Math.floor(this.blinkTimer / 8) % 2 === 0) return;
    Sprites.draw(ctx, `powerup_${this.type}`, this.x, this.y);
  }

  getRect() { return { x: this.x, y: this.y, w: C.POWERUP_SIZE, h: C.POWERUP_SIZE }; }
}
```

- [ ] **Step 2: Implement PlayerTank**

Replace the PLAYER section stub:

```javascript
// ===== PLAYER =====
const Player = {
  x: 0, y: 0,
  dir: C.UP,
  level: 1,         // 1-4 weapon level
  lives: C.P_INIT_LIVES,
  alive: true,
  invincible: false,
  invincibleTimer: 0,
  shieldHP: 0,       // from skill tree defense Lv1
  spawnTimer: 0,
  moving: false,
  animFrame: 0,
  animTimer: 0,
  shootCooldown: 0,
  bullets: [],
  // Timed power-up states
  spreadShots: 0,
  hasMissile: false,
  speedBoost: false,
  speedBoostTimer: 0,
  shieldAbsorb: false,

  // Skill tree state (modified by skill system later)
  skills: { fire: 0, defense: 0, mobility: 0 },

  reset() {
    this.level = 1;
    this.lives = C.P_INIT_LIVES;
    this.alive = true;
    this.invincible = false;
    this.shieldHP = 0;
    this.skills = { fire: 0, defense: 0, mobility: 0 };
  },

  spawn() {
    // Spawn at bottom center-left
    this.x = tileToPixel(8);
    this.y = tileToPixel(24);
    this.dir = C.UP;
    this.alive = true;
    this.invincible = true;
    this.invincibleTimer = 120; // 2 seconds at 60fps
    this.spawnTimer = 120;
    this.moving = false;
    this.bullets = [];
    this.shootCooldown = 0;
    this.spreadShots = 0;
    this.hasMissile = false;
    this.speedBoost = false;
    this.speedBoostTimer = 0;
    this.shieldAbsorb = false;
    // Reset shield HP from skill tree
    this.shieldHP = this.skills.defense >= 1 ? 1 : 0;
  },

  getSpeed() {
    let spd = C.P_SPEED[this.level];
    if (this.skills.mobility >= 1) spd *= 1.15;
    if (this.speedBoost) spd *= 2;
    return spd;
  },

  getBulletSpeed() {
    let spd = C.P_BULLET_SPEED[this.level];
    if (this.skills.fire >= 1) spd *= 1.15;
    return spd;
  },

  getMaxBullets() {
    return C.P_MAX_BULLETS[this.level];
  },

  getShootCooldown() {
    let cd = 12; // base cooldown in ticks
    if (this.skills.fire >= 2) cd = Math.floor(cd * 0.8);
    return cd;
  },

  update() {
    if (!this.alive) return;

    // Spawn protection animation
    if (this.spawnTimer > 0) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0) {
        this.invincible = false;
      }
    }

    // Invincibility countdown
    if (this.invincible && this.spawnTimer <= 0) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    // Speed boost countdown
    if (this.speedBoost) {
      this.speedBoostTimer--;
      if (this.speedBoostTimer <= 0) this.speedBoost = false;
    }

    // Movement
    this.moving = false;
    let nx = this.x, ny = this.y;
    const spd = this.getSpeed();

    if (Input.isDown('ArrowUp'))    { this.dir = C.UP;    ny -= spd; this.moving = true; }
    else if (Input.isDown('ArrowDown'))  { this.dir = C.DOWN;  ny += spd; this.moving = true; }
    else if (Input.isDown('ArrowLeft'))  { this.dir = C.LEFT;  nx -= spd; this.moving = true; }
    else if (Input.isDown('ArrowRight')) { this.dir = C.RIGHT; nx += spd; this.moving = true; }

    // Snap to grid perpendicular axis for smooth lane movement
    if (this.dir === C.UP || this.dir === C.DOWN) {
      // Snap X to nearest 8-pixel boundary
      const targetX = Math.round(this.x / 8) * 8;
      if (nx !== this.x) {
        // Changing direction, snap
      } else {
        nx = this.x + (targetX - this.x) * 0.25;
      }
    } else {
      const targetY = Math.round(this.y / 8) * 8;
      if (ny !== this.y) {
        // Changing direction, snap
      } else {
        ny = this.y + (targetY - this.y) * 0.25;
      }
    }

    // Collision check
    nx = clamp(nx, 0, C.STAGE_W - C.TANK_SIZE);
    ny = clamp(ny, 0, C.STAGE_H - C.TANK_SIZE);
    if (!GameMap.collides(nx, ny, C.TANK_SIZE, C.TANK_SIZE) && !this.collidesWithTanks(nx, ny)) {
      this.x = nx;
      this.y = ny;
    }

    // Animation
    if (this.moving) {
      this.animTimer++;
      if (this.animTimer >= 6) {
        this.animTimer = 0;
        this.animFrame = 1 - this.animFrame;
      }
    }

    // Shooting
    if (this.shootCooldown > 0) this.shootCooldown--;
    if ((Input.isDown('Space') || Input.isDown('KeyJ')) && this.shootCooldown <= 0) {
      const activeBullets = this.bullets.filter(b => b.alive).length;
      if (activeBullets < this.getMaxBullets()) {
        this.shoot();
        this.shootCooldown = this.getShootCooldown();
      }
    }

    // Update bullets
    for (const b of this.bullets) {
      if (b.alive) b.update();
    }
    this.bullets = this.bullets.filter(b => b.alive);
  },

  shoot() {
    const cx = this.x + C.TANK_SIZE / 2;
    const cy = this.y + C.TANK_SIZE / 2;
    const speed = this.getBulletSpeed();
    const power = this.level;

    if (this.hasMissile) {
      // Missile: pierces through bricks
      const bx = cx + C.DX[this.dir] * (C.TANK_SIZE / 2) - C.BULLET_SIZE / 2;
      const by = cy + C.DY[this.dir] * (C.TANK_SIZE / 2) - C.BULLET_SIZE / 2;
      const b = new Bullet(bx, by, this.dir, speed, 'player', power);
      b.pierce = true; // custom flag for missile
      this.bullets.push(b);
      this.hasMissile = false;
      return;
    }

    if (this.spreadShots > 0) {
      // Spread: 3 bullets in a fan
      const dirs = [this.dir, (this.dir + 3) % 4, (this.dir + 1) % 4];
      for (const d of dirs) {
        const bx = cx + C.DX[d] * (C.TANK_SIZE / 2) - C.BULLET_SIZE / 2;
        const by = cy + C.DY[d] * (C.TANK_SIZE / 2) - C.BULLET_SIZE / 2;
        this.bullets.push(new Bullet(bx, by, d, speed, 'player', power));
      }
      this.spreadShots--;
    } else {
      const bx = cx + C.DX[this.dir] * (C.TANK_SIZE / 2) - C.BULLET_SIZE / 2;
      const by = cy + C.DY[this.dir] * (C.TANK_SIZE / 2) - C.BULLET_SIZE / 2;
      this.bullets.push(new Bullet(bx, by, this.dir, speed, 'player', power));
    }
  },

  collidesWithTanks(nx, ny) {
    // Check collision with enemy tanks
    for (const e of Engine.enemies) {
      if (!e.alive) continue;
      if (rectOverlap(
        { x: nx, y: ny, w: C.TANK_SIZE, h: C.TANK_SIZE },
        { x: e.x, y: e.y, w: e.size, h: e.size }
      )) return true;
    }
    return false;
  },

  hit() {
    if (this.invincible) return;
    // Shield absorb from power-up
    if (this.shieldAbsorb) {
      this.shieldAbsorb = false;
      this.invincible = true;
      this.invincibleTimer = 60;
      return;
    }
    // Shield HP from skill tree
    if (this.shieldHP > 0) {
      this.shieldHP--;
      this.invincible = true;
      this.invincibleTimer = 60;
      return;
    }
    // Dodge from skill tree
    if (this.skills.defense >= 4 && Math.random() < 0.2) return;

    // Downgrade level
    if (this.level > 1) {
      this.level--;
      this.invincible = true;
      this.invincibleTimer = 90;
    } else {
      // Lose a life
      this.die();
    }
  },

  die() {
    this.lives--;
    Engine.explosions.push(new Explosion(
      this.x + C.TANK_SIZE / 2,
      this.y + C.TANK_SIZE / 2,
      'medium'
    ));
    if (this.lives <= 0) {
      this.alive = false;
      Engine.onPlayerDead();
    } else {
      // Respawn
      this.spawn();
    }
  },

  render(ctx) {
    if (!this.alive) return;
    // Spawn flash
    if (this.spawnTimer > 0 && Math.floor(this.spawnTimer / 4) % 2 === 0) {
      Sprites.draw(ctx, 'spawn_star', this.x, this.y);
      return;
    }
    // Draw tank
    const lv = this.level - 1;
    Sprites.draw(ctx, `player_${lv}_${this.dir}_${this.animFrame}`, this.x, this.y);
    // Invincibility shield
    if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
      Sprites.draw(ctx, 'shield', this.x, this.y);
    }
    // Draw bullets
    for (const b of this.bullets) {
      if (b.alive) b.render(ctx);
    }
  },

  getRect() { return { x: this.x, y: this.y, w: C.TANK_SIZE, h: C.TANK_SIZE }; },

  applyPowerUp(type) {
    switch (type) {
      case C.PU_STAR:
        if (this.level < 4) this.level++;
        break;
      case C.PU_BOMB:
        // Kill all on-screen enemies
        for (const e of Engine.enemies) {
          if (e.alive) {
            e.alive = false;
            Engine.explosions.push(new Explosion(e.x + e.size/2, e.y + e.size/2, 'medium'));
            Engine.addScore(e.typeDef.hp * 50);
            Engine.kills++;
            Engine.addXP(e.xpValue || 10);
          }
        }
        break;
      case C.PU_SHOVEL:
        GameMap.fortifyBase(true);
        // Schedule revert after 10 seconds
        setTimeout(() => { if (Engine.state === 'playing') GameMap.fortifyBase(false); }, 10000);
        break;
      case C.PU_HELMET:
        this.invincible = true;
        this.invincibleTimer = 600; // 10 seconds
        break;
      case C.PU_CLOCK:
        Engine.freezeEnemies = 300; // 5 seconds
        break;
      case C.PU_TANK:
        this.lives++;
        break;
      case C.PU_SPREAD:
        this.spreadShots = 3;
        break;
      case C.PU_MISSILE:
        this.hasMissile = true;
        break;
      case C.PU_SPEED:
        this.speedBoost = true;
        this.speedBoostTimer = 600; // 10 seconds
        break;
      case C.PU_SHIELD:
        this.shieldAbsorb = true;
        break;
    }
  },
};
```

- [ ] **Step 3: Update Engine to manage player and entities**

Add entity arrays and game state to Engine object. Replace the full ENGINE section:

```javascript
// ===== ENGINE =====
const Engine = {
  canvas: null, ctx: null,
  state: 'menu',
  stage: 1,
  lastTime: 0, accumulator: 0,
  TICK: 1000 / C.FPS,
  // Entity management
  enemies: [],
  explosions: [],
  powerUps: [],
  // Stage state
  enemiesLeft: 0,      // total enemies remaining to spawn
  maxOnScreen: 4,
  spawnTimer: 0,
  spawnInterval: 180,  // ticks between spawns
  freezeEnemies: 0,
  // Scoring
  score: 0,
  kills: 0,
  xp: 0,
  skillPoints: 0,
  // Timing
  stageStartTime: 0,
  stageTime: 0,
  // Shovel timer
  shovelTimer: 0,

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.canvas.width = C.STAGE_W;
    this.canvas.height = C.STAGE_H;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.canvas.style.width = (C.STAGE_W * C.SCALE) + 'px';
    this.canvas.style.height = (C.STAGE_H * C.SCALE) + 'px';
    Input.init();
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },

  loop(now) {
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += Math.min(dt, 100); // cap to prevent spiral
    while (this.accumulator >= this.TICK) {
      this.update();
      this.accumulator -= this.TICK;
    }
    this.render();
    Input.clearFrame();
    requestAnimationFrame(t => this.loop(t));
  },

  update() {
    switch (this.state) {
      case 'menu':
        if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
          this.startGame();
        }
        break;
      case 'playing':
        this.updatePlaying();
        break;
      case 'paused':
        if (Input.wasPressed('KeyP') || Input.wasPressed('Escape')) {
          this.setState('playing');
        }
        break;
      default: break;
    }
  },

  startGame() {
    this.stage = 1;
    this.score = 0;
    this.kills = 0;
    this.xp = 0;
    this.skillPoints = 0;
    Player.reset();
    this.loadStage();
  },

  loadStage() {
    GameMap.load(this.stage - 1);
    Player.spawn();
    this.enemies = [];
    this.explosions = [];
    this.powerUps = [];
    this.freezeEnemies = 0;
    this.shovelTimer = 0;
    // Difficulty params
    this.enemiesLeft = 10 + Math.floor(this.stage * 1.5);
    this.maxOnScreen = Math.min(4 + Math.floor(this.stage / 4), 8);
    this.spawnInterval = Math.max(90, Math.floor(240 - this.stage * 6));
    this.spawnTimer = 60;
    this.stageStartTime = Date.now();
    this.stageTime = 0;
    this.setState('playing');
  },

  updatePlaying() {
    if (Input.wasPressed('KeyP') || Input.wasPressed('Escape')) {
      this.setState('paused');
      return;
    }

    // Update timer
    this.stageTime = Date.now() - this.stageStartTime;

    // Freeze countdown
    if (this.freezeEnemies > 0) this.freezeEnemies--;

    // Spawn enemies
    this.updateSpawning();

    // Update player
    Player.update();

    // Update enemies
    for (const e of this.enemies) {
      if (e.alive) {
        if (this.freezeEnemies <= 0) e.update();
        e.renderAnim(); // animate even when frozen
      }
    }

    // Bullet-enemy collision (player bullets vs enemies)
    for (const b of Player.bullets) {
      if (!b.alive) continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (rectOverlap(b.getRect(), e.getRect())) {
          b.alive = false;
          e.hp--;
          if (e.hp <= 0) {
            e.alive = false;
            this.explosions.push(new Explosion(e.x + e.size/2, e.y + e.size/2, e.isBoss ? 'large' : 'medium'));
            this.addScore(e.typeDef.hp * 50);
            this.kills++;
            this.addXP(e.xpValue);
            // Drop power-up if special enemy
            if (e.dropsPowerUp) {
              this.spawnPowerUp(e.x, e.y);
            }
          }
          this.explosions.push(new Explosion(b.x + b.w/2, b.y + b.h/2, 'small'));
          break;
        }
      }
    }

    // Bullet-player collision (enemy bullets vs player)
    for (const e of this.enemies) {
      for (const b of e.bullets) {
        if (!b.alive) continue;
        if (Player.alive && rectOverlap(b.getRect(), Player.getRect())) {
          b.alive = false;
          Player.hit();
          this.explosions.push(new Explosion(b.x + b.w/2, b.y + b.h/2, 'small'));
        }
      }
    }

    // Player bullet vs enemy bullet collision
    for (const pb of Player.bullets) {
      if (!pb.alive) continue;
      for (const e of this.enemies) {
        for (const eb of e.bullets) {
          if (!eb.alive) continue;
          if (rectOverlap(pb.getRect(), eb.getRect())) {
            pb.alive = false;
            eb.alive = false;
          }
        }
      }
    }

    // Power-up collection
    if (Player.alive) {
      for (const pu of this.powerUps) {
        if (!pu.alive) continue;
        if (rectOverlap(Player.getRect(), pu.getRect())) {
          pu.alive = false;
          Player.applyPowerUp(pu.type);
        }
      }
    }

    // Update explosions
    for (const ex of this.explosions) ex.update();
    this.explosions = this.explosions.filter(e => e.alive);

    // Update power-ups
    for (const pu of this.powerUps) pu.update();
    this.powerUps = this.powerUps.filter(p => p.alive);

    // Clean up dead enemies and their bullets
    this.enemies = this.enemies.filter(e => {
      if (!e.alive) return false;
      e.bullets = e.bullets.filter(b => b.alive);
      return true;
    });

    // Check stage clear
    if (this.enemiesLeft <= 0 && this.enemies.length === 0) {
      this.onStageClear();
    }
  },

  updateSpawning() {
    if (this.enemiesLeft <= 0) return;
    if (this.enemies.filter(e => e.alive).length >= this.maxOnScreen) return;
    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval;
      this.spawnEnemy();
    }
  },

  spawnEnemy() {
    // Pick spawn point (top: left=col 1, center=col 12, right=col 23)
    const spawnCols = [1, 12, 23];
    const col = spawnCols[this.enemies.length % 3];
    // Pick enemy type based on stage
    const type = this.pickEnemyType();
    const enemy = new EnemyTank(tileToPixel(col), 0, type, this.stage);
    // Check if spawn point is blocked
    if (GameMap.collides(enemy.x, enemy.y, enemy.size, enemy.size) ||
        this.enemies.some(e => e.alive && rectOverlap(enemy.getRect(), e.getRect())) ||
        (Player.alive && rectOverlap(enemy.getRect(), Player.getRect()))) {
      return; // skip this spawn, try next tick
    }
    this.enemies.push(enemy);
    this.enemiesLeft--;
  },

  pickEnemyType() {
    const available = Object.entries(C.E_TYPES).filter(([k,v]) => this.stage >= v.minStage);
    if (available.length === 0) return C.E_TYPES.basic;
    // Weight towards weaker enemies, with some randomness
    const weights = available.map(([k, v]) => {
      const diff = this.stage - v.minStage;
      return Math.max(1, 10 - diff * 2);
    });
    const total = weights.reduce((a,b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < available.length; i++) {
      r -= weights[i];
      if (r <= 0) return available[i][1];
    }
    return available[0][1];
  },

  spawnPowerUp(x, y) {
    const type = randInt(0, 9);
    const puX = clamp(x, 0, C.STAGE_W - C.POWERUP_SIZE);
    const puY = clamp(y, 0, C.STAGE_H - C.POWERUP_SIZE);
    // Make sure it's on empty ground
    if (!GameMap.collides(puX, puY, C.POWERUP_SIZE, C.POWERUP_SIZE)) {
      this.powerUps.push(new PowerUp(puX, puY, type));
    }
  },

  addScore(pts) { this.score += pts; },
  addXP(xp) {
    this.xp += xp;
    const needed = 100 * (this.skillPoints + 1);
    if (this.xp >= needed) {
      this.xp -= needed;
      this.skillPoints++;
    }
  },

  onBaseDestroyed() {
    this.explosions.push(new Explosion(C.STAGE_W / 2, C.STAGE_H - C.TILE, 'large'));
    this.setState('gameOver');
  },

  onPlayerDead() {
    this.setState('gameOver');
  },

  onStageClear() {
    this.setState('stageClear');
    // Auto-advance after 3 seconds (or press Enter)
    setTimeout(() => {
      if (this.state === 'stageClear') this.nextStage();
    }, 3000);
  },

  nextStage() {
    this.stage++;
    if (this.stage > MAPS.length) {
      this.setState('gameOver'); // all stages beaten
    } else {
      this.loadStage();
    }
  },

  setState(s) { this.state = s; },

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = C.COL_BG;
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);

    switch (this.state) {
      case 'menu':
        this.renderMenu(ctx);
        break;
      case 'playing':
      case 'paused':
        this.renderGame(ctx);
        if (this.state === 'paused') this.renderPauseOverlay(ctx);
        break;
      case 'stageClear':
        this.renderGame(ctx);
        this.renderStageClear(ctx);
        break;
      case 'gameOver':
        this.renderGame(ctx);
        this.renderGameOver(ctx);
        break;
      default: break;
    }
  },

  renderMenu(ctx) {
    ctx.fillStyle = '#FFF';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('坦克大战 BATTLE CITY', C.STAGE_W / 2, 100);
    ctx.font = '10px monospace';
    ctx.fillText('按 Enter 开始游戏', C.STAGE_W / 2, 200);
  },

  renderGame(ctx) {
    GameMap.render(ctx);
    // Power-ups
    for (const pu of this.powerUps) pu.render(ctx);
    // Enemies
    for (const e of this.enemies) if (e.alive) e.render(ctx);
    // Player
    Player.render(ctx);
    // Trees (above tanks)
    GameMap.renderTrees(ctx);
    // Explosions
    for (const ex of this.explosions) ex.render(ctx);
  },

  renderPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    ctx.fillStyle = '#FFF';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('暂停', C.STAGE_W / 2, C.STAGE_H / 2 - 10);
    ctx.font = '8px monospace';
    ctx.fillText('按 P 继续', C.STAGE_W / 2, C.STAGE_H / 2 + 10);
  },

  renderStageClear(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    ctx.fillStyle = '#FFD700';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${this.stage} 关 通过!`, C.STAGE_W / 2, C.STAGE_H / 2 - 20);
    ctx.fillStyle = '#FFF';
    ctx.font = '8px monospace';
    ctx.fillText(`击杀: ${this.kills}  得分: ${this.score}`, C.STAGE_W / 2, C.STAGE_H / 2 + 10);
    ctx.fillText('按 Enter 进入下一关', C.STAGE_W / 2, C.STAGE_H / 2 + 30);
    // Allow Enter to advance
    if (Input.wasPressed('Enter')) this.nextStage();
  },

  renderGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    ctx.fillStyle = '#FF4444';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', C.STAGE_W / 2, C.STAGE_H / 2 - 30);
    ctx.fillStyle = '#FFF';
    ctx.font = '8px monospace';
    ctx.fillText(`最终得分: ${this.score}`, C.STAGE_W / 2, C.STAGE_H / 2 + 10);
    ctx.fillText(`到达关卡: ${this.stage}`, C.STAGE_W / 2, C.STAGE_H / 2 + 25);
    ctx.fillText('按 Enter 返回主菜单', C.STAGE_W / 2, C.STAGE_H / 2 + 50);
    if (Input.wasPressed('Enter')) this.setState('menu');
  },
};
```

- [ ] **Step 4: Verify in browser**

Open `tank-battle/index.html`. Press Enter. You should see the player tank (gold) at the bottom of the map. Use arrow keys to move it around. Press Space to shoot — yellow bullets should fly. Bullets should destroy brick walls on impact. P pauses/resumes.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: 玩家坦克 - 移动、射击、升级系统、子弹碰撞"
```

---

## Phase 4: Enemy System

### Task 5: Enemy Tanks — Types, Spawning, Basic AI

**Files:**
- Modify: `tank-battle/index.html` (ENEMY + AI sections)

- [ ] **Step 1: Implement EnemyTank class and BossTank**

Replace the ENEMY section stub:

```javascript
// ===== ENEMY =====
class EnemyTank {
  constructor(x, y, typeDef, stage) {
    this.x = x; this.y = y;
    this.typeDef = typeDef;
    this.hp = typeDef.hp;
    this.speed = typeDef.speed;
    this.bulletSpeed = typeDef.bulletSpeed;
    this.dir = C.DOWN;
    this.alive = true;
    this.size = C.TANK_SIZE;
    this.isBoss = false;
    this.moving = true;
    this.animFrame = 0;
    this.animTimer = 0;
    this.bullets = [];
    this.shootCooldown = 0;
    this.shootInterval = 60 + randInt(0, 60);
    this.dirChangeTimer = randInt(60, 180);
    this.spawnTimer = 60;
    this.dropsPowerUp = Math.random() < 0.15; // 15% chance to be special
    this.xpValue = {basic:10,fast:15,power:20,armor:30,elite:40}[typeDef.name] || 10;
    // AI
    this.aiLevel = this.calcAILevel(stage);
    this.targetDir = this.dir;
    this.stuckTimer = 0;
    this.lastX = x;
    this.lastY = y;
  }

  calcAILevel(stage) {
    if (stage <= 4) return 0;
    if (stage <= 9) return 1;
    if (stage <= 14) return 2;
    return 3;
  }

  update() {
    if (this.spawnTimer > 0) { this.spawnTimer--; return; }

    // AI decision
    this.aiUpdate();

    // Movement
    if (this.moving) {
      const nx = this.x + C.DX[this.dir] * this.speed;
      const ny = this.y + C.DY[this.dir] * this.speed;
      const cnx = clamp(nx, 0, C.STAGE_W - this.size);
      const cny = clamp(ny, 0, C.STAGE_H - this.size);
      const blocked = GameMap.collides(cnx, cny, this.size, this.size) ||
                      this.collidesWithTanks(cnx, cny) ||
                      (Player.alive && rectOverlap(
                        {x:cnx, y:cny, w:this.size, h:this.size},
                        Player.getRect()
                      ));
      if (!blocked) {
        this.x = cnx; this.y = cny;
      } else {
        this.stuckTimer++;
        if (this.stuckTimer > 15) {
          this.changeDir();
          this.stuckTimer = 0;
        }
      }
    }

    // Check if stuck
    if (Math.abs(this.x - this.lastX) < 0.1 && Math.abs(this.y - this.lastY) < 0.1) {
      this.stuckTimer++;
    } else {
      this.stuckTimer = 0;
    }
    this.lastX = this.x;
    this.lastY = this.y;

    // Shooting
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.shootCooldown <= 0 && this.shouldShoot()) {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }

    // Update bullets
    for (const b of this.bullets) {
      if (b.alive) b.update();
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }

  aiUpdate() {
    this.dirChangeTimer--;
    if (this.dirChangeTimer <= 0 || this.stuckTimer > 30) {
      this.changeDir();
      this.dirChangeTimer = randInt(60, 180);
    }
  }

  changeDir() {
    // Base: random direction
    const dirs = [C.UP, C.DOWN, C.LEFT, C.RIGHT];

    if (this.aiLevel === 0) {
      this.dir = dirs[randInt(0, 3)];
    } else if (this.aiLevel === 1) {
      // 30% chance toward base (down)
      if (Math.random() < 0.3) {
        this.dir = C.DOWN;
      } else {
        this.dir = dirs[randInt(0, 3)];
      }
    } else if (this.aiLevel === 2) {
      // Aim at player 50%, base 30%, random 20%
      const r = Math.random();
      if (r < 0.5 && Player.alive) {
        this.dir = this.dirToward(Player.x, Player.y);
      } else if (r < 0.8) {
        this.dir = C.DOWN; // toward base
      } else {
        this.dir = dirs[randInt(0, 3)];
      }
    } else {
      // Expert: aim at player 70%, base 20%, flank 10%
      const r = Math.random();
      if (r < 0.7 && Player.alive) {
        this.dir = this.dirToward(Player.x, Player.y);
      } else if (r < 0.9) {
        this.dir = this.dirToward(C.STAGE_W / 2, C.STAGE_H);
      } else {
        this.dir = dirs[randInt(0, 3)];
      }
    }
  }

  dirToward(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? C.RIGHT : C.LEFT;
    }
    return dy > 0 ? C.DOWN : C.UP;
  }

  shouldShoot() {
    if (this.aiLevel === 0) return Math.random() < 0.02;
    if (this.aiLevel === 1) {
      // 50% chance to shoot toward player
      if (Player.alive && this.isAlignedWith(Player.x, Player.y)) return true;
      return Math.random() < 0.03;
    }
    // Level 2+: shoot when aligned with player or base
    if (Player.alive && this.isAlignedWith(Player.x, Player.y)) return Math.random() < 0.15;
    if (this.isAlignedWith(C.STAGE_W / 2, C.STAGE_H - C.TILE)) return Math.random() < 0.1;
    return Math.random() < 0.04;
  }

  isAlignedWith(tx, ty) {
    const margin = C.TANK_SIZE;
    if (this.dir === C.UP || this.dir === C.DOWN) {
      return Math.abs(this.x - tx) < margin;
    }
    return Math.abs(this.y - ty) < margin;
  }

  shoot() {
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    const bx = cx + C.DX[this.dir] * (this.size / 2) - C.BULLET_SIZE / 2;
    const by = cy + C.DY[this.dir] * (this.size / 2) - C.BULLET_SIZE / 2;
    this.bullets.push(new Bullet(bx, by, this.dir, this.bulletSpeed, 'enemy', 1));
  }

  collidesWithTanks(nx, ny) {
    for (const e of Engine.enemies) {
      if (e === this || !e.alive) continue;
      if (rectOverlap({x:nx,y:ny,w:this.size,h:this.size}, e.getRect())) return true;
    }
    return false;
  }

  renderAnim() {
    if (this.moving) {
      this.animTimer++;
      if (this.animTimer >= 8) { this.animTimer = 0; this.animFrame = 1 - this.animFrame; }
    }
  }

  render(ctx) {
    if (this.spawnTimer > 0) {
      if (Math.floor(this.spawnTimer / 4) % 2 === 0) {
        Sprites.draw(ctx, 'spawn_star', this.x, this.y);
      }
      return;
    }
    // Flashing if drops power-up
    const name = this.typeDef.name;
    Sprites.draw(ctx, `enemy_${name}_${this.dir}_${this.animFrame}`, this.x, this.y);
    if (this.dropsPowerUp && Math.floor(Date.now() / 200) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,0,0,0.3)';
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
    // Boss HP bar rendered by HUD
    for (const b of this.bullets) if (b.alive) b.render(ctx);
  }

  getRect() { return { x: this.x, y: this.y, w: this.size, h: this.size }; }
}

class BossTank extends EnemyTank {
  constructor(x, y, stage) {
    super(x, y, { name:'armor', color:'#D00', hp: 10 + stage, speed: 0.6, bulletSpeed: 2.5, minStage:1 }, stage);
    this.size = C.BOSS_SIZE;
    this.isBoss = true;
    this.hp = 10 + stage;
    this.dropsPowerUp = true;
    this.xpValue = 100;
    this.shootInterval = 40;
    this.burstCooldown = 0;
  }

  update() {
    super.update();
    // Boss special: burst fire
    if (this.burstCooldown > 0) this.burstCooldown--;
    if (this.burstCooldown <= 0 && this.spawnTimer <= 0) {
      if (Math.random() < 0.01) {
        this.burstFire();
        this.burstCooldown = 120;
      }
    }
  }

  burstFire() {
    // Fire 3 bullets in a spread
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    const dirs = [this.dir, (this.dir + 3) % 4, (this.dir + 1) % 4];
    for (const d of dirs) {
      const bx = cx + C.DX[d] * (this.size / 2) - C.BULLET_SIZE / 2;
      const by = cy + C.DY[d] * (this.size / 2) - C.BULLET_SIZE / 2;
      this.bullets.push(new Bullet(bx, by, d, this.bulletSpeed, 'enemy', 1));
    }
  }

  render(ctx) {
    if (this.spawnTimer > 0) {
      if (Math.floor(this.spawnTimer / 4) % 2 === 0) {
        Sprites.draw(ctx, 'spawn_star', this.x, this.y);
      }
      return;
    }
    Sprites.draw(ctx, `boss_${this.dir}_${this.animFrame}`, this.x, this.y);
    for (const b of this.bullets) if (b.alive) b.render(ctx);
  }
}
```

- [ ] **Step 2: Add Boss spawn logic to Engine**

In `Engine.spawnEnemy()`, add boss check at the top:

```javascript
  spawnEnemy() {
    const spawnCols = [1, 12, 23];
    const col = spawnCols[this.enemies.length % 3];

    // Boss every 5 stages
    if (this.stage % 5 === 0 && this.enemiesLeft === 10 + Math.floor(this.stage * 1.5)) {
      const boss = new BossTank(tileToPixel(10), 0, this.stage);
      this.enemies.push(boss);
      this.enemiesLeft--;
      return;
    }

    const type = this.pickEnemyType();
    const enemy = new EnemyTank(tileToPixel(col), 0, type, this.stage);
    if (GameMap.collides(enemy.x, enemy.y, enemy.size, enemy.size) ||
        this.enemies.some(e => e.alive && rectOverlap(enemy.getRect(), e.getRect())) ||
        (Player.alive && rectOverlap(enemy.getRect(), Player.getRect()))) {
      return;
    }
    this.enemies.push(enemy);
    this.enemiesLeft--;
  },
```

- [ ] **Step 3: Verify in browser**

Open the game, press Enter. Enemies should spawn from the top and move around. They should shoot at you. Your bullets should destroy them (they explode). When all enemies are defeated, "第 X 关 通过!" appears. Press Enter for next stage. Game over when base is destroyed or all lives lost.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: 敌人系统 - 5种敌人类型、Boss、4层AI、生成系统"
```

---

## Phase 5: UI & HUD

### Task 6: HUD Panels — Enemy Counter, Player Info, Boss HP

**Files:**
- Modify: `tank-battle/index.html` (HUD section, HTML panels)

- [ ] **Step 1: Implement HUD rendering**

Replace the HUD section stub:

```javascript
// ===== HUD =====
const HUD = {
  render(ctx) {
    // This renders the side panels using DOM manipulation
    this.updateLeftPanel();
    this.updateRightPanel();
  },

  updateLeftPanel() {
    const panel = document.getElementById('leftPanel');
    const remaining = Engine.enemiesLeft + Engine.enemies.filter(e => e.alive).length;
    let html = '<div style="color:#888;font-size:10px;margin-bottom:4px;text-align:center;">ENEMY</div>';
    // Show small tank icons for remaining enemies
    for (let i = 0; i < remaining; i++) {
      html += '<div style="width:10px;height:10px;background:#888;display:inline-block;margin:1px;"></div>';
      if ((i + 1) % 2 === 0) html += '<br>';
    }
    panel.innerHTML = html;
  },

  updateRightPanel() {
    const panel = document.getElementById('rightPanel');
    const xpNeeded = 100 * (Engine.skillPoints + 1);
    const xpPct = Math.min(100, Math.floor(Engine.xp / xpNeeded * 100));
    let html = `
      <div style="color:#FFD700;font-size:9px;text-align:center;">ST ${Engine.stage}</div>
      <div style="color:#FFF;font-size:9px;margin-top:6px;">♥ ${Player.lives}</div>
      <div style="color:#FFD700;font-size:9px;margin-top:4px;">Lv ${Player.level}</div>
      <div style="margin-top:4px;width:60px;height:6px;background:#333;border:1px solid #555;">
        <div style="width:${xpPct}%;height:100%;background:#4A4;"></div>
      </div>
      <div style="color:#888;font-size:7px;margin-top:1px;">XP ${Engine.xp}/${xpNeeded}</div>
      <div style="color:#FFF;font-size:9px;margin-top:6px;">${Engine.score}</div>
      <div style="color:#888;font-size:7px;">SCORE</div>
    `;
    // Skill overview
    html += `
      <div style="margin-top:8px;color:#888;font-size:7px;">SKILLS</div>
      <div style="color:#F44;font-size:7px;">🔫${Player.skills.fire}</div>
      <div style="color:#4AF;font-size:7px;">🛡${Player.skills.defense}</div>
      <div style="color:#4F4;font-size:7px;">⚡${Player.skills.mobility}</div>
    `;
    // Boss HP bar
    const boss = Engine.enemies.find(e => e.isBoss && e.alive);
    if (boss) {
      const maxHP = 10 + Engine.stage;
      const pct = Math.floor(boss.hp / maxHP * 100);
      html += `
        <div style="margin-top:8px;color:#F44;font-size:7px;">BOSS</div>
        <div style="width:60px;height:8px;background:#333;border:1px solid #F00;">
          <div style="width:${pct}%;height:100%;background:#F44;"></div>
        </div>
      `;
    }
    panel.innerHTML = html;
  },
};
```

- [ ] **Step 2: Call HUD.render() in Engine.renderGame()**

Add `HUD.render();` at the end of `Engine.renderGame()`:

```javascript
  renderGame(ctx) {
    GameMap.render(ctx);
    for (const pu of this.powerUps) pu.render(ctx);
    for (const e of this.enemies) if (e.alive) e.render(ctx);
    Player.render(ctx);
    GameMap.renderTrees(ctx);
    for (const ex of this.explosions) ex.render(ctx);
    HUD.render(ctx);
  },
```

- [ ] **Step 3: Verify in browser**

Play the game. Left panel should show enemy count icons. Right panel should show stage, lives, level, XP bar, score, and skill overview. Boss HP bar appears on boss stages.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: HUD面板 - 敌人计数、玩家信息、Boss血条"
```

---

### Task 7: Main Menu, Pause Menu, Settings, Game Over — Full UI

**Files:**
- Modify: `tank-battle/index.html` (UI section, ENGINE update/render)

- [ ] **Step 1: Implement full UI system**

Replace the UI section stub:

```javascript
// ===== UI =====
const UI = {
  menuIndex: 0,
  menuItems: ['开始游戏', '继续游戏', '排行榜', '设置'],
  settings: {
    sfxVolume: 0.7,
    bgmVolume: 0.5,
    keyBindings: {
      up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
      shoot: 'Space', pause: 'KeyP',
    },
  },
  hasSave: false,
  leaderboard: [],
  nameInput: '',
  nameInputActive: false,

  init() {
    this.loadSettings();
    this.loadLeaderboard();
    this.hasSave = !!localStorage.getItem('tankBattle_save');
  },

  loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('tankBattle_settings'));
      if (s) Object.assign(this.settings, s);
    } catch(e) {}
  },

  saveSettings() {
    localStorage.setItem('tankBattle_settings', JSON.stringify(this.settings));
  },

  loadLeaderboard() {
    try {
      this.leaderboard = JSON.parse(localStorage.getItem('tankBattle_records')) || [];
    } catch(e) { this.leaderboard = []; }
  },

  saveLeaderboard() {
    localStorage.setItem('tankBattle_records', JSON.stringify(this.leaderboard.slice(0, 10)));
  },

  addRecord(name, score, stage, kills) {
    this.leaderboard.push({ name, score, stage, kills, date: new Date().toLocaleDateString() });
    this.leaderboard.sort((a,b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 10);
    this.saveLeaderboard();
  },

  saveGame() {
    const data = {
      stage: Engine.stage,
      lives: Player.lives,
      level: Player.level,
      xp: Engine.xp,
      skillPoints: Engine.skillPoints,
      skills: Player.skills,
      totalScore: Engine.score,
    };
    localStorage.setItem('tankBattle_save', JSON.stringify(data));
    this.hasSave = true;
  },

  loadGame() {
    try {
      const data = JSON.parse(localStorage.getItem('tankBattle_save'));
      if (!data) return false;
      Engine.stage = data.stage;
      Engine.score = data.totalScore || 0;
      Engine.xp = data.xp || 0;
      Engine.skillPoints = data.skillPoints || 0;
      Player.lives = data.lives;
      Player.level = data.level;
      Player.skills = data.skills || { fire: 0, defense: 0, mobility: 0 };
      Player.reset();
      Player.lives = data.lives;
      Player.level = data.level;
      Player.skills = data.skills || { fire: 0, defense: 0, mobility: 0 };
      Engine.loadStage();
      return true;
    } catch(e) { return false; }
  },

  renderMenu(ctx) {
    ctx.fillStyle = C.COL_BG;
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('坦克大战', C.STAGE_W / 2, 80);
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText('BATTLE CITY', C.STAGE_W / 2, 100);

    // Menu items
    const items = this.hasSave ? this.menuItems : this.menuItems.filter((_,i) => i !== 1);
    for (let i = 0; i < items.length; i++) {
      const y = 160 + i * 28;
      if (i === this.menuIndex) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('▶ ', C.STAGE_W / 2 - 60, y);
      }
      ctx.fillStyle = i === this.menuIndex ? '#FFF' : '#888';
      ctx.fillText(items[i], C.STAGE_W / 2, y);
    }

    // Controls hint
    ctx.fillStyle = '#555';
    ctx.font = '7px monospace';
    ctx.fillText('↑↓ 选择  Enter 确认', C.STAGE_W / 2, C.STAGE_H - 30);
  },

  updateMenu() {
    const items = this.hasSave ? this.menuItems : this.menuItems.filter((_,i) => i !== 1);
    if (Input.wasPressed('ArrowUp')) this.menuIndex = (this.menuIndex - 1 + items.length) % items.length;
    if (Input.wasPressed('ArrowDown')) this.menuIndex = (this.menuIndex + 1) % items.length;
    if (Input.wasPressed('Enter')) {
      const item = items[this.menuIndex];
      if (item === '开始游戏') { Engine.startGame(); }
      else if (item === '继续游戏') { this.loadGame(); }
      else if (item === '排行榜') { Engine.setState('leaderboard'); }
      else if (item === '设置') { Engine.setState('settings'); }
    }
  },

  renderLeaderboard(ctx) {
    ctx.fillStyle = C.COL_BG;
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    ctx.fillStyle = '#FFD700';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('排 行 榜', C.STAGE_W / 2, 30);
    ctx.fillStyle = '#888';
    ctx.font = '8px monospace';
    for (let i = 0; i < this.leaderboard.length; i++) {
      const r = this.leaderboard[i];
      const y = 60 + i * 18;
      ctx.fillStyle = i === 0 ? '#FFD700' : '#FFF';
      ctx.textAlign = 'left';
      ctx.fillText(`${i+1}. ${r.name}`, 30, y);
      ctx.fillText(`${r.score}`, 120, y);
      ctx.fillText(`St${r.stage}`, 200, y);
      ctx.fillText(`${r.kills}K`, 260, y);
    }
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText('按 Esc 返回', C.STAGE_W / 2, C.STAGE_H - 20);
  },

  updateLeaderboard() {
    if (Input.wasPressed('Escape') || Input.wasPressed('Enter')) {
      Engine.setState('menu');
    }
  },

  renderSettings(ctx) {
    ctx.fillStyle = C.COL_BG;
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    ctx.fillStyle = '#FFD700';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('设 置', C.STAGE_W / 2, 30);
    ctx.fillStyle = '#FFF';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`音效音量: ${Math.round(this.settings.sfxVolume * 100)}%`, 30, 70);
    ctx.fillText(`音乐音量: ${Math.round(this.settings.bgmVolume * 100)}%`, 30, 95);
    ctx.fillText('按 ← → 调整', 30, 130);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.fillText('按 Esc 返回', C.STAGE_W / 2, C.STAGE_H - 20);
  },

  updateSettings() {
    if (Input.wasPressed('Escape')) {
      this.saveSettings();
      Engine.setState('menu');
    }
    if (Input.wasPressed('ArrowLeft')) {
      this.settings.sfxVolume = Math.max(0, this.settings.sfxVolume - 0.1);
      this.settings.bgmVolume = Math.max(0, this.settings.bgmVolume - 0.1);
    }
    if (Input.wasPressed('ArrowRight')) {
      this.settings.sfxVolume = Math.min(1, this.settings.sfxVolume + 0.1);
      this.settings.bgmVolume = Math.min(1, this.settings.bgmVolume + 0.1);
    }
  },

  renderGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    ctx.fillStyle = '#FF4444';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', C.STAGE_W / 2, 100);

    ctx.fillStyle = '#FFF';
    ctx.font = '8px monospace';
    ctx.fillText(`最终得分: ${Engine.score}`, C.STAGE_W / 2, 140);
    ctx.fillText(`到达关卡: ${Engine.stage}`, C.STAGE_W / 2, 158);
    ctx.fillText(`总击杀: ${Engine.kills}`, C.STAGE_W / 2, 176);

    if (this.nameInputActive) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('输入名字 (3字母):', C.STAGE_W / 2, 220);
      ctx.font = '14px monospace';
      ctx.fillText(this.nameInput + '_', C.STAGE_W / 2, 245);
      ctx.font = '7px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText('按字母键输入, Enter 确认', C.STAGE_W / 2, 265);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('按 Enter 保存记录', C.STAGE_W / 2, 220);
      ctx.fillStyle = '#888';
      ctx.fillText('按 Esc 返回主菜单', C.STAGE_W / 2, 240);
    }
  },

  updateGameOver() {
    if (this.nameInputActive) {
      // Capture letter input
      for (const code of Object.keys(Input.justPressed)) {
        if (code.startsWith('Key') && this.nameInput.length < 3) {
          this.nameInput += code.replace('Key', '');
        }
      }
      if (Input.wasPressed('Enter') && this.nameInput.length >= 1) {
        this.addRecord(
          this.nameInput.padEnd(3, 'A').substring(0, 3),
          Engine.score, Engine.stage, Engine.kills
        );
        this.nameInputActive = false;
        this.nameInput = '';
        Engine.setState('leaderboard');
      }
      if (Input.wasPressed('Backspace')) {
        this.nameInput = this.nameInput.slice(0, -1);
      }
    } else {
      if (Input.wasPressed('Enter')) {
        this.nameInputActive = true;
        this.nameInput = '';
      }
      if (Input.wasPressed('Escape')) {
        Engine.setState('menu');
      }
    }
  },

  renderSkillTree(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    ctx.fillStyle = '#FFD700';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('技能树', C.STAGE_W / 2, 20);
    ctx.font = '7px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(`可用技能点: ${Engine.skillPoints}`, C.STAGE_W / 2, 35);

    const branches = [
      { key: 'fire', name: '🔫 火力', skills: ['弹速+15%','射速+20%','穿透+1','暴击15%','散射弹'] },
      { key: 'defense', name: '🛡️ 防御', skills: ['护甲+1','无敌+1s','铲子翻倍','闪避20%','复活'] },
      { key: 'mobility', name: '⚡ 机动', skills: ['速度+15%','转向+30%','弹射弹','冲刺','瞬移'] },
    ];

    for (let bi = 0; bi < branches.length; bi++) {
      const b = branches[bi];
      const bx = 30 + bi * 130;
      ctx.fillStyle = '#FFF';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(b.name, bx, 60);
      for (let si = 0; si < 5; si++) {
        const y = 80 + si * 20;
        const unlocked = Player.skills[b.key] > si;
        const isNext = Player.skills[b.key] === si;
        ctx.fillStyle = unlocked ? '#4F4' : (isNext ? '#FFD700' : '#555');
        ctx.fillText(`${unlocked ? '●' : (isNext ? '○' : '·')} ${b.skills[si]}`, bx, y);
      }
    }

    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.font = '7px monospace';
    ctx.fillText('1/2/3 升级对应分支  Esc 返回', C.STAGE_W / 2, C.STAGE_H - 15);
  },

  updateSkillTree() {
    const branches = ['fire', 'defense', 'mobility'];
    const keys = ['Digit1', 'Digit2', 'Digit3'];
    for (let i = 0; i < 3; i++) {
      if (Input.wasPressed(keys[i])) {
        const b = branches[i];
        if (Engine.skillPoints > 0 && Player.skills[b] < 5) {
          // Check max-per-branch rule: max half of total points
          const totalSpent = Player.skills.fire + Player.skills.defense + Player.skills.mobility;
          const maxInBranch = Math.ceil((totalSpent + 1) / 2);
          if (Player.skills[b] < maxInBranch || totalSpent === 0) {
            Player.skills[b]++;
            Engine.skillPoints--;
          }
        }
      }
    }
    if (Input.wasPressed('Escape')) {
      Engine.setState(Engine._prevState || 'paused');
    }
  },
};
```

- [ ] **Step 2: Update Engine to use UI system**

Add `UI.init()` to BOOT, wire up all states in update/render. Replace the full ENGINE section's `update()`, `render()`, and state-related methods. Add `_prevState` for skill tree navigation:

In `Engine.init()`, add after `Input.init()`:
```javascript
    UI.init();
```

In `Engine.update()`, replace the switch:
```javascript
  update() {
    switch (this.state) {
      case 'menu': UI.updateMenu(); break;
      case 'playing': this.updatePlaying(); break;
      case 'paused':
        if (Input.wasPressed('KeyP') || Input.wasPressed('Escape')) this.setState('playing');
        if (Input.wasPressed('KeyT')) { this._prevState = 'paused'; this.setState('skillTree'); }
        break;
      case 'stageClear':
        this.renderStageClear; // keep timer running
        if (Input.wasPressed('Enter')) this.nextStage();
        break;
      case 'gameOver': UI.updateGameOver(); break;
      case 'settings': UI.updateSettings(); break;
      case 'leaderboard': UI.updateLeaderboard(); break;
      case 'skillTree': UI.updateSkillTree(); break;
    }
  },
```

In `Engine.render()`, replace the switch:
```javascript
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = C.COL_BG;
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);

    switch (this.state) {
      case 'menu': UI.renderMenu(ctx); break;
      case 'playing':
      case 'paused':
        this.renderGame(ctx);
        if (this.state === 'paused') this.renderPauseOverlay(ctx);
        break;
      case 'stageClear':
        this.renderGame(ctx);
        this.renderStageClearOverlay(ctx);
        break;
      case 'gameOver':
        this.renderGame(ctx);
        UI.renderGameOver(ctx);
        break;
      case 'settings': UI.renderSettings(ctx); break;
      case 'leaderboard': UI.renderLeaderboard(ctx); break;
      case 'skillTree': UI.renderSkillTree(ctx); break;
    }
  },
```

Add a stage clear overlay (separate from the previous inline version):
```javascript
  renderStageClearOverlay(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    ctx.fillStyle = '#FFD700';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${this.stage} 关 通过!`, C.STAGE_W / 2, C.STAGE_H / 2 - 20);
    ctx.fillStyle = '#FFF';
    ctx.font = '8px monospace';
    const timeSec = Math.floor(this.stageTime / 1000);
    ctx.fillText(`击杀: ${this.kills}  用时: ${timeSec}s  得分: ${this.score}`, C.STAGE_H / 2, C.STAGE_H / 2 + 10);
    if (Engine.skillPoints > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`有 ${Engine.skillPoints} 个技能点可用! 按 T 打开技能树`, C.STAGE_W / 2, C.STAGE_H / 2 + 30);
    }
    ctx.fillStyle = '#888';
    ctx.fillText('按 Enter 进入下一关', C.STAGE_W / 2, C.STAGE_H / 2 + 50);
  },
```

Update `Engine.onStageClear()` to not use setTimeout:
```javascript
  onStageClear() {
    this.saveGame();
    this.setState('stageClear');
  },
```

Add `saveGame` call in `Engine.loadStage()` after state is set:
```javascript
    this.setState('playing');
    // Don't save here - save on stage clear
```

- [ ] **Step 3: Add T key for skill tree during stage clear**

In `Engine.update()`, add to the `stageClear` case:
```javascript
      case 'stageClear':
        if (Input.wasPressed('Enter')) this.nextStage();
        if (Input.wasPressed('KeyT')) { this._prevState = 'stageClear'; this.setState('skillTree'); }
        break;
```

- [ ] **Step 4: Verify in browser**

Full UI flow: Main menu with ↑↓ navigation → start game → play → pause (P) → resume → complete stage → stage clear screen → press T for skill tree → press 1/2/3 to upgrade → Esc back → Enter for next stage → die → game over → enter name → leaderboard → back to menu.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: UI系统 - 主菜单、暂停、设置、排行榜、技能树、游戏结束"
```

---

## Phase 6: Audio System

### Task 8: Web Audio API — Synthesized 8-bit Sound Effects

**Files:**
- Modify: `tank-battle/index.html` (AUDIO section)

- [ ] **Step 1: Implement AudioManager with Web Audio API**

Replace the AUDIO section stub:

```javascript
// ===== AUDIO =====
const Audio = {
  ctx: null,
  sfxGain: null,
  bgmGain: null,
  enabled: true,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.bg mGain = this.ctx.createGain();
      this.bgmGain.connect(this.ctx.destination);
      this.setVolumes();
    } catch(e) { this.enabled = false; }
  },

  setVolumes() {
    if (!this.enabled) return;
    this.sfxGain.gain.value = UI.settings.sfxVolume;
    this.bgmGain.gain.value = UI.settings.bgmVolume;
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  // Play a simple tone burst
  playTone(freq, duration, type, vol) {
    if (!this.enabled) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.value = (vol || 0.3) * UI.settings.sfxVolume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  },

  // Sound effects
  shoot()      { this.playTone(880, 0.08, 'square', 0.2); },
  shootStrong(){ this.playTone(440, 0.12, 'sawtooth', 0.25); },
  explode()    { this.noiseBurst(0.2, 0.3); },
  explodeBig() { this.noiseBurst(0.4, 0.5); },
  hit()        { this.playTone(200, 0.05, 'square', 0.15); },
  powerUp()    { this.playTone(523, 0.1, 'square', 0.2); setTimeout(() => this.playTone(784, 0.15, 'square', 0.2), 100); },
  levelUp()    { [523,659,784].forEach((f,i) => setTimeout(() => this.playTone(f, 0.15, 'square', 0.25), i * 100)); },
  menuSelect() { this.playTone(660, 0.05, 'square', 0.15); },
  menuConfirm(){ this.playTone(880, 0.1, 'square', 0.2); },
  gameOver()   { [440,330,220].forEach((f,i) => setTimeout(() => this.playTone(f, 0.3, 'square', 0.25), i * 200)); },
  bulletWall() { this.playTone(150, 0.03, 'square', 0.1); },
  bulletSteel(){ this.playTone(400, 0.05, 'triangle', 0.15); },

  noiseBurst(duration, vol) {
    if (!this.enabled) return;
    this.resume();
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // decay
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = vol * UI.settings.sfxVolume;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  },

  // Simple BGM loop
  bgmPlaying: false,
  bgmOsc: null,
  startBGM() {
    if (!this.enabled || this.bgmPlaying) return;
    this.bgmPlaying = true;
    this._bgmLoop();
  },
  stopBGM() {
    this.bgmPlaying = false;
  },
  _bgmLoop() {
    if (!this.bgmPlaying) return;
    // Simple 8-bit melody loop
    const melody = [262,294,330,349,392,349,330,294,262,247,220,247,262,294,330,349];
    let i = 0;
    const play = () => {
      if (!this.bgmPlaying) return;
      this.playTone(melody[i % melody.length], 0.15, 'square', 0.08);
      i++;
      setTimeout(play, 180);
    };
    play();
  },
};
```

**Note:** Fix the typo `this.bg mGain` to `this.bgmGain` before committing.

- [ ] **Step 2: Wire audio calls into game events**

Add audio triggers:
- In `Player.shoot()`: add `Audio.shoot();` at start
- In `Player.die()`: add `Audio.explodeBig();` after creating explosion
- In `Player.applyPowerUp()`: add `Audio.powerUp();` at start
- In `Engine.loadStage()`: add `Audio.startBGM();`
- In `Engine.setState('menu')`: add `Audio.stopBGM();`
- In bullet terrain collision in `Bullet.update()`: add `Audio.bulletWall()` for brick, `Audio.bulletSteel()` for steel
- In `UI.updateMenu()` confirm: add `Audio.menuConfirm()`
- In `UI.updateMenu()` navigate: add `Audio.menuSelect()`
- In `Engine.onStageClear()`: add `Audio.levelUp()`
- In `Engine.renderGameOver()` initial: add `Audio.gameOver()`

- [ ] **Step 3: Add Audio.init() to BOOT**

```javascript
document.addEventListener('DOMContentLoaded', () => {
  Sprites.init();
  Audio.init();
  UI.init();
  Engine.init();
});
```

Also add `Audio.resume()` on first user interaction — add to Engine.update menu case:

```javascript
      case 'menu':
        UI.updateMenu();
        Audio.resume(); // unlock audio context on first interaction
        break;
```

- [ ] **Step 4: Verify in browser**

Play the game. You should hear 8-bit sound effects: shooting, explosions, power-up collection, menu navigation, background music during gameplay. Adjusting volume in settings should affect audio levels.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: 音效系统 - Web Audio API合成音、射击/爆炸/道具/BGM"
```

---

## Phase 7: Map Data

### Task 9: All 80 Stage Maps

**Files:**
- Modify: `tank-battle/data/maps.js`

- [ ] **Step 1: Add classic 35 maps (stages 1-35)**

Research and encode the original Battle City 35 stage maps into the compact string format. Each map is 26 rows of 26 characters. The classic maps use only brick (1), steel (2), water (3), tree (4), and base (9).

Key reference patterns for classic maps:
- Base always at rows 24-25, columns 12-13
- Enemy spawn points: top-left (col 1), top-center (col 12), top-right (col 23)
- Player spawn: bottom area, col 8

Add all 35 classic maps as `MAPS[0]` through `MAPS[34]`.

- [ ] **Step 2: Add 45 new maps (stages 36-80)**

Design new maps using all terrain types including ice (5). Create varied map themes:

- Stages 36-44: Maze type (dense brick corridors)
- Stages 45-53: Open type (large empty spaces, minimal cover)
- Stages 54-62: Water type (rivers dividing the map)
- Stages 63-71: Fortress type (steel wall fortresses with entry points)
- Stages 72-80: Mixed type (all terrain types combined)

Each map must follow these rules:
- Base at rows 24-25, columns 12-13 (surrounded by bricks)
- Row 0 must be mostly empty (enemy spawn row)
- At least one navigable path from each spawn point to the base
- Playable and fair (not impossible)

- [ ] **Step 3: Verify maps load correctly**

Open the game, advance through stages (or modify stage number in code temporarily). Verify each map renders correctly with proper terrain types. Check that the base is always present and accessible.

- [ ] **Step 4: Commit**

```bash
git add data/maps.js
git commit -m "feat: 80关地图数据 - 经典35关 + 新设计45关"
```

---

## Phase 8: Polish & Integration

### Task 10: Particle Effects, Screen Shake, Visual Polish

**Files:**
- Modify: `tank-battle/index.html` (PARTICLE section, ENGINE render)

- [ ] **Step 1: Implement particle engine**

Replace the PARTICLE section stub:

```javascript
// ===== PARTICLE =====
const Particles = {
  list: [],

  emit(x, y, count, color, speed, life) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random());
      this.list.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: life || 30,
        maxLife: life || 30,
        color: color || '#FF8800',
        size: 1 + Math.random() * 2,
      });
    }
  },

  update() {
    for (const p of this.list) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
    }
    this.list = this.list.filter(p => p.life > 0);
  },

  render(ctx) {
    for (const p of this.list) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.size), Math.ceil(p.size));
    }
    ctx.globalAlpha = 1;
  },

  clear() { this.list = []; },
};
```

- [ ] **Step 2: Add screen shake and particle triggers**

Add shake state to Engine:
```javascript
  shakeTimer: 0,
  shakeIntensity: 0,

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  },
```

In `Engine.updatePlaying()`, add particle update:
```javascript
    Particles.update();
    if (this.shakeTimer > 0) this.shakeTimer--;
```

In `Engine.renderGame()`, add camera shake offset:
```javascript
  renderGame(ctx) {
    let ox = 0, oy = 0;
    if (this.shakeTimer > 0) {
      ox = (Math.random() - 0.5) * this.shakeIntensity;
      oy = (Math.random() - 0.5) * this.shakeIntensity;
    }
    ctx.save();
    ctx.translate(ox, oy);
    GameMap.render(ctx);
    for (const pu of this.powerUps) pu.render(ctx);
    for (const e of this.enemies) if (e.alive) e.render(ctx);
    Player.render(ctx);
    GameMap.renderTrees(ctx);
    for (const ex of this.explosions) ex.render(ctx);
    Particles.render(ctx);
    ctx.restore();
    HUD.render(ctx);
  },
```

Add particle emission to explosion creation:
- In `Explosion` constructor or wherever `new Explosion()` is called, also call `Particles.emit(x, y, 6, '#FF8800', 2, 20);`
- In `Engine.onBaseDestroyed()`: add `Engine.shake(8, 30); Particles.emit(C.STAGE_W/2, C.STAGE_H-C.TILE, 20, '#FF0000', 3, 40);`
- In `Player.die()`: add `Particles.emit(this.x+8, this.y+8, 10, '#FFD700', 2, 25);`
- In enemy death (in `Engine.updatePlaying()` bullet-enemy collision): add `Particles.emit(e.x+e.size/2, e.y+e.size/2, 8, '#FF4400', 2, 20);`

- [ ] **Step 3: Verify in browser**

Play the game. Explosions should emit colored particles. Base destruction should shake the screen. Particle effects fade smoothly. Trees render above tanks (hiding them). Everything looks polished.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: 粒子效果、屏幕震动、视觉打磨"
```

---

## Task Dependency Order

```
Task 1 (skeleton) → Task 2 (sprites) → Task 3 (map) → Task 4 (player)
→ Task 5 (enemies) → Task 6 (HUD) → Task 7 (full UI)
→ Task 8 (audio) → Task 9 (maps) → Task 10 (polish)
```

Tasks 6-10 can partially overlap but must follow the numbered order since each builds on the previous.

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Task |
|---|---|
| 1. 项目概述 | Task 1 (skeleton covers all) |
| 2. 文件结构 | Task 1 |
| 3. 核心架构 (游戏循环、状态机、模块) | Task 1 |
| 4. 地图系统 (编码、地形、渲染) | Task 3, Task 9 |
| 5. 实体系统 (玩家、敌人、Boss、子弹) | Task 4, Task 5 |
| 6. 道具系统 (10种道具) | Task 4 (Player.applyPowerUp) |
| 7. 技能树 (3分支×5级) | Task 7 (UI.renderSkillTree) |
| 8. 敌人AI (4层级) | Task 5 |
| 9. UI (菜单、HUD、暂停、设置、结算) | Task 6, Task 7 |
| 10. 音效系统 | Task 8 |
| 11. 存档与排行榜 | Task 7 (UI.saveGame/loadGame) |
| 12. 渲染 (精灵、层次、特效) | Task 2, Task 10 |

### Placeholder Scan
- No TBD/TODO found
- Task 9 has descriptive instructions for map creation rather than placeholder data

### Type Consistency
- All entity classes use consistent method names: `update()`, `render(ctx)`, `getRect()`
- `Engine.enemies` array contains `EnemyTank` and `BossTank` instances (BossTank extends EnemyTank)
- `Player.bullets` and `enemy.bullets` both contain `Bullet` instances
- HUD references `Engine.*` and `Player.*` properties that exist
- Sprite keys follow consistent naming: `{entity}_{variant}_{dir}_{frame}`
