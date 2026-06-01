# 五子棋网页版实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个纯前端五子棋网页游戏（40×40 棋盘），支持人机对战（三档 AI 难度）和双人对弈，传统木纹风格。

**Architecture:** 单 HTML 文件内嵌 CSS + JS，逻辑分为 5 个模块（Board、Renderer、AI、GameController、UI）。Canvas 绘制棋盘和棋子，启发式评分引擎驱动 AI，Minimax + Alpha-Beta 剪枝实现困难模式。

**Tech Stack:** HTML5 Canvas、原生 JavaScript（ES6 class）、CSS3 Flexbox、无任何外部依赖。

**Spec:** `docs/superpowers/specs/2026-05-31-gomoku-design.md`

---

## File Structure

```
gomoku/
  └── index.html    # 完整游戏（HTML + CSS + JS，约 1800 行）
```

文件内部按以下顺序组织（用 `// ========== Module ========== ` 注释分隔）：

1. HTML 结构
2. CSS 样式
3. JS — `Board` 类
4. JS — `AI` 类
5. JS — `Renderer` 类
6. JS — `GameController` 类
7. JS — `UI` 类
8. JS — 初始化入口

---

### Task 1: HTML 骨架 + CSS 布局

**Files:**
- Create: `gomoku/index.html`

- [ ] **Step 1: 创建文件骨架**

创建 `gomoku/index.html`，包含完整的 HTML 结构和 CSS 样式。JS 部分只放空的类定义占位。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>五子棋 - Gomoku</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #2d2d2d;
  color: #ddd;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* ===== 主布局 ===== */
#game-container {
  display: flex;
  align-items: stretch;
  gap: 0;
  max-height: 95vh;
}

/* ===== 玩家面板 ===== */
.player-panel {
  width: 200px;
  background: #3a3a3a;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: border-color 0.3s;
}

.player-panel.active {
  border-color: #27ae60;
}

.player-panel.left {
  border-radius: 8px 0 0 8px;
  border: 2px solid #444;
  border-right: none;
}

.player-panel.right {
  border-radius: 0 8px 8px 0;
  border: 2px solid #444;
  border-left: none;
}

/* 回合指示条 */
.turn-indicator {
  width: 100%;
  padding: 6px;
  text-align: center;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.3s;
}

.turn-indicator.active {
  background: #27ae60;
  color: #fff;
  animation: pulse 1s infinite;
}

.turn-indicator.inactive {
  background: #4a4a4a;
  color: #777;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 棋子图标 */
.piece-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.piece-icon.black {
  background: radial-gradient(circle at 35% 35%, #555, #111);
}

.piece-icon.white {
  background: radial-gradient(circle at 35% 35%, #fff, #bbb);
  border: 1px solid #aaa;
}

/* 玩家名称 */
.player-name {
  font-size: 16px;
  font-weight: bold;
  color: #e8c99b;
  margin-bottom: 4px;
}

.player-role {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

/* 倒计时 */
.timer-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #2d2d2d;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  transition: border-color 0.3s;
}

.timer-circle.active {
  border: 3px solid #e74c3c;
  animation: timerPulse 1s infinite;
}

.timer-circle.inactive {
  border: 3px solid #555;
}

.timer-value {
  font-size: 22px;
  font-weight: bold;
  transition: color 0.3s;
}

.timer-circle.active .timer-value {
  color: #e74c3c;
  animation: timerPulse 1s infinite;
}

.timer-circle.inactive .timer-value {
  color: #666;
}

@keyframes timerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.timer-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 16px;
}

/* 统计 */
.player-stats {
  width: 100%;
  border-top: 1px solid #4a4a4a;
  padding-top: 10px;
  margin-top: auto;
}

.stat-line {
  font-size: 11px;
  color: #999;
  line-height: 1.8;
}

.stat-line span {
  color: #ddd;
}

/* ===== 棋盘区域 ===== */
#board-wrapper {
  position: relative;
  background: linear-gradient(135deg, #d4a574, #b8956a);
  padding: 6px;
}

#board-canvas {
  display: block;
  cursor: pointer;
}

/* ===== 底部控制栏 ===== */
#controls {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.control-group {
  background: #3a3a3a;
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.control-group .label {
  font-size: 11px;
  color: #999;
}

.ctrl-btn {
  padding: 4px 10px;
  border-radius: 3px;
  font-size: 11px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn.mode, .ctrl-btn.diff {
  background: #4a4a4a;
  color: #999;
}

.ctrl-btn.mode.active, .ctrl-btn.diff.active {
  background: #e8c99b;
  color: #333;
  font-weight: bold;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: bold;
}

.action-btn.undo { background: #e8c99b; color: #333; }
.action-btn.restart { background: #4a6fa5; color: #fff; }
.action-btn.replay { background: #4a4a4a; color: #aaa; }
.action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== 弹窗 ===== */
.modal-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 100;
  align-items: center;
  justify-content: center;
}

.modal-overlay.show {
  display: flex;
}

.modal-box {
  background: #3a3a3a;
  border-radius: 12px;
  padding: 24px 32px;
  text-align: center;
  min-width: 300px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.modal-box h2 {
  color: #e8c99b;
  margin-bottom: 16px;
  font-size: 20px;
}

.modal-box input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #555;
  background: #2d2d2d;
  color: #ddd;
  font-size: 14px;
  margin-bottom: 10px;
  outline: none;
}

.modal-box input:focus {
  border-color: #e8c99b;
}

.modal-box .btn-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}

.modal-box button {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  font-weight: bold;
}

.modal-box .btn-primary {
  background: #e8c99b;
  color: #333;
}

.modal-box .btn-secondary {
  background: #4a4a4a;
  color: #aaa;
}

/* 回放控制 */
#replay-controls {
  display: none;
  margin-top: 8px;
  background: #3a3a3a;
  border-radius: 6px;
  padding: 8px 16px;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

#replay-controls.show {
  display: flex;
}

#replay-controls button {
  padding: 6px 14px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  background: #4a4a4a;
  color: #ddd;
}

#replay-controls button.active {
  background: #e8c99b;
  color: #333;
}

#replay-info {
  font-size: 12px;
  color: #999;
}
</style>
</head>
<body>

<!-- 游戏主容器 -->
<div id="game-container">
  <!-- 左侧面板（黑方） -->
  <div class="player-panel left" id="panel-left">
    <div class="turn-indicator inactive" id="turn-left">等待开始...</div>
    <div class="piece-icon black"></div>
    <div class="player-name" id="name-left">黑方</div>
    <div class="player-role" id="role-left">AI · 中等</div>
    <div class="timer-circle inactive" id="timer-left">
      <span class="timer-value">30</span>
    </div>
    <div class="timer-label">剩余时间（秒）</div>
    <div class="player-stats">
      <div class="stat-line">落子数：<span id="moves-left">0</span></div>
      <div class="stat-line">总耗时：<span id="time-left">00:00</span></div>
    </div>
  </div>

  <!-- 棋盘 -->
  <div id="board-wrapper">
    <canvas id="board-canvas"></canvas>
  </div>

  <!-- 右侧面板（白方） -->
  <div class="player-panel right" id="panel-right">
    <div class="turn-indicator inactive" id="turn-right">等待开始...</div>
    <div class="piece-icon white"></div>
    <div class="player-name" id="name-right">白方</div>
    <div class="player-role" id="role-right">玩家</div>
    <div class="timer-circle inactive" id="timer-right">
      <span class="timer-value">30</span>
    </div>
    <div class="timer-label">剩余时间（秒）</div>
    <div class="player-stats">
      <div class="stat-line">落子数：<span id="moves-right">0</span></div>
      <div class="stat-line">总耗时：<span id="time-right">00:00</span></div>
    </div>
  </div>
</div>

<!-- 底部控制栏 -->
<div id="controls">
  <div class="control-group">
    <span class="label">模式：</span>
    <button class="ctrl-btn mode active" id="btn-pvai" onclick="game.setMode('pvai')">人机对战</button>
    <button class="ctrl-btn mode" id="btn-pvp" onclick="game.setMode('pvp')">双人对战</button>
  </div>
  <div class="control-group" id="diff-group">
    <span class="label">难度：</span>
    <button class="ctrl-btn diff" id="btn-easy" onclick="game.setDifficulty('easy')">简单</button>
    <button class="ctrl-btn diff active" id="btn-medium" onclick="game.setDifficulty('medium')">中等</button>
    <button class="ctrl-btn diff" id="btn-hard" onclick="game.setDifficulty('hard')">困难</button>
  </div>
  <button class="action-btn undo" id="btn-undo" onclick="game.undo()">↩ 悔棋</button>
  <button class="action-btn restart" onclick="game.restart()">🔄 新局</button>
  <button class="action-btn replay" id="btn-replay" onclick="game.startReplay()">▶ 回放</button>
</div>

<!-- 回放控制 -->
<div id="replay-controls">
  <button onclick="game.replayPrev()">⏮ 上一步</button>
  <button onclick="game.replayNext()">下一步 ⏭</button>
  <button id="btn-auto-replay" onclick="game.toggleAutoReplay()">▶ 自动播放</button>
  <button onclick="game.exitReplay()">✕ 退出回放</button>
  <span id="replay-info">第 0 / 0 步</span>
</div>

<!-- 名字输入弹窗 -->
<div class="modal-overlay" id="modal-names">
  <div class="modal-box">
    <h2>🎮 新游戏</h2>
    <div id="name-inputs"></div>
    <div class="btn-row">
      <button class="btn-primary" onclick="game.confirmNames()">开始</button>
    </div>
  </div>
</div>

<!-- 胜利/平局弹窗 -->
<div class="modal-overlay" id="modal-result">
  <div class="modal-box">
    <h2 id="result-title">游戏结束</h2>
    <p id="result-msg" style="margin-bottom:16px; font-size:16px; color:#ccc;"></p>
    <div class="btn-row">
      <button class="btn-primary" onclick="game.restart()">再来一局</button>
      <button class="btn-secondary" onclick="game.startReplay()">查看回放</button>
    </div>
  </div>
</div>

<script>
// ================================================================
//  Board — 棋盘状态管理
// ================================================================
class Board {
  constructor(size = 40) {
    this.size = size;
    this.grid = [];       // 0=空, 1=黑, 2=白
    this.history = [];    // [{row, col, player}]
    this.reset();
  }

  reset() {
    this.grid = Array.from({length: this.size}, () => Array(this.size).fill(0));
    this.history = [];
  }

  place(row, col, player) {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return false;
    if (this.grid[row][col] !== 0) return false;
    this.grid[row][col] = player;
    this.history.push({row, col, player});
    return true;
  }

  undoLast() {
    if (this.history.length === 0) return null;
    const move = this.history.pop();
    this.grid[move.row][move.col] = 0;
    return move;
  }

  getLastMove() {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  // 从 (row,col) 出发沿 4 方向检查五连，返回获胜的 5 个坐标或 null
  checkWin(row, col) {
    const player = this.grid[row][col];
    if (player === 0) return null;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      const cells = [{row, col}];
      // 正方向
      for (let i = 1; i < 5; i++) {
        const r = row + dr*i, c = col + dc*i;
        if (r < 0 || r >= this.size || c < 0 || c >= this.size) break;
        if (this.grid[r][c] !== player) break;
        cells.push({row: r, col: c});
      }
      // 反方向
      for (let i = 1; i < 5; i++) {
        const r = row - dr*i, c = col - dc*i;
        if (r < 0 || r >= this.size || c < 0 || c >= this.size) break;
        if (this.grid[r][c] !== player) break;
        cells.push({row: r, col: c});
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }

  isFull() {
    return this.history.length >= this.size * this.size;
  }

  isEmpty() {
    return this.history.length === 0;
  }
}

// ================================================================
//  AI — 启发式评分引擎
// ================================================================
class AI {
  constructor(board, player = 2) {
    this.board = board;
    this.player = player;        // AI 棋子颜色
    this.opponent = 3 - player;  // 对手棋子颜色
    this.difficulty = 'medium';  // easy | medium | hard

    // 模式分数表
    this.SCORES = {
      FIVE: 1000000,
      LIVE_FOUR: 100000,
      RUSH_FOUR: 10000,
      LIVE_THREE: 5000,
      SLEEP_THREE: 500,
      LIVE_TWO: 200,
      SLEEP_TWO: 50,
    };
  }

  setDifficulty(level) {
    this.difficulty = level;
  }

  // 获取候选位：已有棋子周围 2 格内的空位
  getCandidates() {
    const set = new Set();
    const range = 2;
    for (const {row, col} of this.board.history) {
      for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
          const r = row + dr, c = col + dc;
          if (r >= 0 && r < this.board.size && c >= 0 && c < this.board.size && this.board.grid[r][c] === 0) {
            set.add(r * this.board.size + c);
          }
        }
      }
    }
    // 如果棋盘为空，下天元
    if (set.size === 0) {
      const mid = Math.floor(this.board.size / 2);
      return [{row: mid, col: mid}];
    }
    return Array.from(set).map(v => ({row: Math.floor(v / this.board.size), col: v % this.board.size}));
  }

  // 在某方向上分析一个位置的连子模式
  // 返回 {count, openEnds} — 连子数和开放端数
  analyzeDirection(row, col, dr, dc, player) {
    let count = 1;
    let openEnds = 0;
    // 正方向
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < this.board.size && c >= 0 && c < this.board.size && this.board.grid[r][c] === player) {
      count++;
      r += dr;
      c += dc;
    }
    if (r >= 0 && r < this.board.size && c >= 0 && c < this.board.size && this.board.grid[r][c] === 0) {
      openEnds++;
    }
    // 反方向
    r = row - dr; c = col - dc;
    while (r >= 0 && r < this.board.size && c >= 0 && c < this.board.size && this.board.grid[r][c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }
    if (r >= 0 && r < this.board.size && c >= 0 && c < this.board.size && this.board.grid[r][c] === 0) {
      openEnds++;
    }
    return {count, openEnds};
  }

  // 根据连子数和开放端评分
  scorePattern(count, openEnds) {
    if (count >= 5) return this.SCORES.FIVE;
    if (openEnds === 0) return 0; // 两头都堵了
    if (count === 4) return openEnds === 2 ? this.SCORES.LIVE_FOUR : this.SCORES.RUSH_FOUR;
    if (count === 3) return openEnds === 2 ? this.SCORES.LIVE_THREE : this.SCORES.SLEEP_THREE;
    if (count === 2) return openEnds === 2 ? this.SCORES.LIVE_TWO : this.SCORES.SLEEP_TWO;
    if (count === 1) return openEnds === 2 ? 10 : 5;
    return 0;
  }

  // 评估某个空位对某个玩家的价值（假设在此落子）
  evaluatePosition(row, col, player) {
    // 临时落子
    this.board.grid[row][col] = player;
    let score = 0;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      const {count, openEnds} = this.analyzeDirection(row, col, dr, dc, player);
      score += this.scorePattern(count, openEnds);
    }
    // 还原
    this.board.grid[row][col] = 0;
    return score;
  }

  // 获取某个位置的综合得分（进攻 + 防守）
  getPositionScore(row, col) {
    const attack = this.evaluatePosition(row, col, this.player);
    const defense = this.evaluatePosition(row, col, this.opponent);
    return Math.max(attack, defense * 1.1); // 防守权重略高
  }

  // 简单模式：单步评分 + 随机扰动
  getEasyMove(candidates) {
    let scored = candidates.map(({row, col}) => ({
      row, col,
      score: this.getPositionScore(row, col) * (0.9 + Math.random() * 0.2)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  // 中等模式：考虑对手一步反击
  getMediumMove(candidates) {
    let best = null;
    let bestScore = -1;
    for (const {row, col} of candidates) {
      const myScore = this.evaluatePosition(row, col, this.player);
      const oppScore = this.evaluatePosition(row, col, this.opponent);
      // 如果这步直接赢
      if (myScore >= this.SCORES.FIVE) return {row, col, score: myScore};
      // 如果不堵这步对手就赢
      if (oppScore >= this.SCORES.FIVE) {
        best = {row, col, score: this.SCORES.FIVE - 1};
        bestScore = this.SCORES.FIVE - 1;
        continue;
      }
      const score = Math.max(myScore, oppScore * 1.1);
      if (score > bestScore) {
        bestScore = score;
        best = {row, col, score};
      }
    }
    return best;
  }

  // 困难模式：Minimax 深度 2 + Alpha-Beta
  getHardMove(candidates) {
    // 先按单步得分排序，用于剪枝优化
    candidates = candidates.map(({row, col}) => ({row, col, score: this.getPositionScore(row, col)}));
    candidates.sort((a, b) => b.score - a.score);
    // 限制候选数量避免太慢
    candidates = candidates.slice(0, 30);

    let bestMove = candidates[0];
    let bestScore = -Infinity;

    for (const {row, col} of candidates) {
      // 检查直接赢
      const winScore = this.evaluatePosition(row, col, this.player);
      if (winScore >= this.SCORES.FIVE) return {row, col, score: winScore};

      this.board.grid[row][col] = this.player;
      this.board.history.push({row, col, player: this.player});
      const score = this.minimax(1, false, -Infinity, Infinity);
      this.board.history.pop();
      this.board.grid[row][col] = 0;

      if (score > bestScore) {
        bestScore = score;
        bestMove = {row, col, score: bestScore};
      }
    }
    return bestMove;
  }

  minimax(depth, isMaximizing, alpha, beta) {
    // 终止条件
    if (depth === 0) return this.evaluateBoard();

    const player = isMaximizing ? this.player : this.opponent;
    const candidates = this.getCandidates();
    if (candidates.length === 0) return this.evaluateBoard();

    // 按单步得分排序优化剪枝
    const scored = candidates.map(({row, col}) => ({
      row, col, score: this.evaluatePosition(row, col, player)
    }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 15);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const {row, col} of top) {
        if (this.evaluatePosition(row, col, player) >= this.SCORES.FIVE) return this.SCORES.FIVE;
        this.board.grid[row][col] = player;
        this.board.history.push({row, col, player});
        const eval_ = this.minimax(depth - 1, false, alpha, beta);
        this.board.history.pop();
        this.board.grid[row][col] = 0;
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const {row, col} of top) {
        if (this.evaluatePosition(row, col, player) >= this.SCORES.FIVE) return -this.SCORES.FIVE;
        this.board.grid[row][col] = player;
        this.board.history.push({row, col, player});
        const eval_ = this.minimax(depth - 1, true, alpha, beta);
        this.board.history.pop();
        this.board.grid[row][col] = 0;
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // 全局评估函数（从 AI 视角）
  evaluateBoard() {
    let score = 0;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < this.board.size; r++) {
      for (let c = 0; c < this.board.size; c++) {
        if (this.board.grid[r][c] === 0) continue;
        const player = this.board.grid[r][c];
        for (const [dr, dc] of dirs) {
          // 只从连子起点开始统计，避免重复
          const pr = r - dr, pc = c - dc;
          if (pr >= 0 && pr < this.board.size && pc >= 0 && pc < this.board.size && this.board.grid[pr][pc] === player) continue;
          const {count, openEnds} = this.analyzeDirection(r, c, dr, dc, player);
          const s = this.scorePattern(count, openEnds);
          score += (player === this.player) ? s : -s;
        }
      }
    }
    return score;
  }

  // 主入口：根据难度返回最佳落子
  getMove() {
    const candidates = this.getCandidates();
    if (candidates.length === 0) return null;
    if (this.board.isEmpty()) {
      const mid = Math.floor(this.board.size / 2);
      return {row: mid, col: mid};
    }
    switch (this.difficulty) {
      case 'easy': return this.getEasyMove(candidates);
      case 'medium': return this.getMediumMove(candidates);
      case 'hard': return this.getHardMove(candidates);
      default: return this.getMediumMove(candidates);
    }
  }
}

// ================================================================
//  Renderer — Canvas 渲染
// ================================================================
class Renderer {
  constructor(canvas, board) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.board = board;
    this.cellSize = 0;
    this.offset = 0;
    this.lastMove = null;
    this.hoverPos = null;
    this.winCells = null;
    this.winFlashOn = false;
    this.winFlashTimer = null;
    this.resize();
  }

  resize() {
    // 棋盘正方形：取窗口高度的 90% 和剩余宽度中较小的
    const maxH = window.innerHeight * 0.88;
    const maxW = window.innerWidth - 400 - 20; // 两侧面板 400 + 间距
    const boardPixels = Math.min(maxH, maxW, 800);
    this.cellSize = Math.floor(boardPixels / (this.board.size + 1));
    const totalSize = this.cellSize * (this.board.size + 1);
    this.canvas.width = totalSize;
    this.canvas.height = totalSize;
    this.canvas.style.width = totalSize + 'px';
    this.canvas.style.height = totalSize + 'px';
    this.offset = this.cellSize; // 留一行边距
    this.draw();
  }

  draw() {
    this.drawBoard();
    this.drawPieces();
    this.drawLastMove();
    this.drawHover();
    this.drawWinHighlight();
  }

  drawBoard() {
    const ctx = this.ctx;
    const size = this.board.size;
    const cs = this.cellSize;
    const off = this.offset;

    // 木纹背景
    const grad = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    grad.addColorStop(0, '#d4a574');
    grad.addColorStop(0.3, '#c8a068');
    grad.addColorStop(0.6, '#d4a574');
    grad.addColorStop(1, '#b8956a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 木纹纹理（用随机细线模拟）
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.height; i += 3) {
      ctx.beginPath();
      ctx.moveTo(0, i + Math.sin(i * 0.05) * 2);
      ctx.lineTo(this.canvas.width, i + Math.cos(i * 0.03) * 2);
      ctx.stroke();
    }

    // 网格线
    ctx.strokeStyle = 'rgba(80, 50, 20, 0.5)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size; i++) {
      // 横线
      ctx.beginPath();
      ctx.moveTo(off, off + i * cs);
      ctx.lineTo(off + size * cs - cs, off + i * cs);
      ctx.stroke();
      // 竖线
      ctx.beginPath();
      ctx.moveTo(off + i * cs, off);
      ctx.lineTo(off + i * cs, off + size * cs - cs);
      ctx.stroke();
    }

    // 天元和星位
    const mid = Math.floor(size / 2);
    const starPoints = [[mid, mid]];
    ctx.fillStyle = 'rgba(80, 50, 20, 0.6)';
    for (const [r, c] of starPoints) {
      ctx.beginPath();
      ctx.arc(off + c * cs, off + r * cs, Math.max(3, cs * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPieces() {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const off = this.offset;
    const radius = cs * 0.42;

    for (let r = 0; r < this.board.size; r++) {
      for (let c = 0; c < this.board.size; c++) {
        const p = this.board.grid[r][c];
        if (p === 0) continue;
        const x = off + c * cs;
        const y = off + r * cs;

        if (p === 1) {
          // 黑棋
          const grad = ctx.createRadialGradient(x - radius*0.3, y - radius*0.3, radius*0.1, x, y, radius);
          grad.addColorStop(0, '#666');
          grad.addColorStop(1, '#111');
          ctx.fillStyle = grad;
        } else {
          // 白棋
          const grad = ctx.createRadialGradient(x - radius*0.3, y - radius*0.3, radius*0.1, x, y, radius);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(1, '#bbb');
          ctx.fillStyle = grad;
        }
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (p === 2) {
          ctx.strokeStyle = 'rgba(150,150,150,0.5)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  drawLastMove() {
    const last = this.lastMove || this.board.getLastMove();
    if (!last) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const off = this.offset;
    const x = off + last.col * cs;
    const y = off + last.row * cs;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, cs * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }

  drawHover() {
    if (!this.hoverPos) return;
    const {row, col, player} = this.hoverPos;
    if (this.board.grid[row][col] !== 0) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const off = this.offset;
    const x = off + col * cs;
    const y = off + row * cs;
    const radius = cs * 0.42;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = player === 1 ? '#333' : '#ddd';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  drawWinHighlight() {
    if (!this.winCells) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const off = this.offset;
    if (!this.winFlashOn) return;
    for (const {row, col} of this.winCells) {
      const x = off + col * cs;
      const y = off + row * cs;
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, cs * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  startWinAnimation(cells) {
    this.winCells = cells;
    this.winFlashOn = true;
    this.winFlashTimer = setInterval(() => {
      this.winFlashOn = !this.winFlashOn;
      this.draw();
    }, 400);
  }

  stopWinAnimation() {
    if (this.winFlashTimer) {
      clearInterval(this.winFlashTimer);
      this.winFlashTimer = null;
    }
    this.winCells = null;
    this.winFlashOn = false;
  }

  // 像素坐标 → 棋盘坐标
  pixelToGrid(px, py) {
    const col = Math.round((px - this.offset) / this.cellSize);
    const row = Math.round((py - this.offset) / this.cellSize);
    if (row < 0 || row >= this.board.size || col < 0 || col >= this.board.size) return null;
    return {row, col};
  }

  setHover(row, col, player) {
    this.hoverPos = {row, col, player};
    this.draw();
  }

  clearHover() {
    this.hoverPos = null;
    this.draw();
  }

  // 回放模式：绘制指定历史步骤的棋盘状态
  drawHistory(upToIndex) {
    // 先清空棋盘，重新绘制
    this.drawBoard();
    const ctx = this.ctx;
    const cs = this.cellSize;
    const off = this.offset;
    const radius = cs * 0.42;
    const moves = this.board.history.slice(0, upToIndex + 1);

    for (let i = 0; i < moves.length; i++) {
      const {row, col, player} = moves[i];
      const x = off + col * cs;
      const y = off + row * cs;
      if (player === 1) {
        const grad = ctx.createRadialGradient(x - radius*0.3, y - radius*0.3, radius*0.1, x, y, radius);
        grad.addColorStop(0, '#666');
        grad.addColorStop(1, '#111');
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createRadialGradient(x - radius*0.3, y - radius*0.3, radius*0.1, x, y, radius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, '#bbb');
        ctx.fillStyle = grad;
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (player === 2) {
        ctx.strokeStyle = 'rgba(150,150,150,0.5)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // 最后一步标记
    if (moves.length > 0) {
      const last = moves[moves.length - 1];
      const x = off + last.col * cs;
      const y = off + last.row * cs;
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, cs * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ================================================================
//  UI — 界面更新
// ================================================================
class UI {
  constructor() {
    // 面板元素
    this.panelLeft = document.getElementById('panel-left');
    this.panelRight = document.getElementById('panel-right');
    this.turnLeft = document.getElementById('turn-left');
    this.turnRight = document.getElementById('turn-right');
    this.nameLeft = document.getElementById('name-left');
    this.nameRight = document.getElementById('name-right');
    this.roleLeft = document.getElementById('role-left');
    this.roleRight = document.getElementById('role-right');
    this.timerLeft = document.getElementById('timer-left');
    this.timerRight = document.getElementById('timer-right');
    this.movesLeft = document.getElementById('moves-left');
    this.movesRight = document.getElementById('moves-right');
    this.timeLeft = document.getElementById('time-left');
    this.timeRight = document.getElementById('time-right');

    // 弹窗
    this.modalNames = document.getElementById('modal-names');
    this.modalResult = document.getElementById('modal-result');
    this.resultTitle = document.getElementById('result-title');
    this.resultMsg = document.getElementById('result-msg');
    this.nameInputs = document.getElementById('name-inputs');

    // 控制栏
    this.diffGroup = document.getElementById('diff-group');
    this.btnReplay = document.getElementById('btn-replay');
    this.btnUndo = document.getElementById('btn-undo');
    this.replayControls = document.getElementById('replay-controls');
    this.replayInfo = document.getElementById('replay-info');
  }

  updatePanels(data) {
    const {currentPlayer, playerNames, playerRoles, moves, elapsed} = data;

    // 名字和角色
    this.nameLeft.textContent = playerNames[0];
    this.nameRight.textContent = playerNames[1];
    this.roleLeft.textContent = playerRoles[0];
    this.roleRight.textContent = playerRoles[1];

    // 回合指示
    if (currentPlayer === 1) {
      this.turnLeft.textContent = '⬤ 轮到你了';
      this.turnLeft.className = 'turn-indicator active';
      this.turnRight.textContent = '等待对手...';
      this.turnRight.className = 'turn-indicator inactive';
      this.timerLeft.className = 'timer-circle active';
      this.timerRight.className = 'timer-circle inactive';
    } else {
      this.turnLeft.textContent = '等待对手...';
      this.turnLeft.className = 'turn-indicator inactive';
      this.turnRight.textContent = '⬤ 轮到你了';
      this.turnRight.className = 'turn-indicator active';
      this.timerLeft.className = 'timer-circle inactive';
      this.timerRight.className = 'timer-circle active';
    }

    // 统计
    this.movesLeft.textContent = moves[0];
    this.movesRight.textContent = moves[1];
    this.timeLeft.textContent = elapsed[0];
    this.timeRight.textContent = elapsed[1];
  }

  setTimer(side, seconds) {
    const el = side === 1 ? this.timerLeft : this.timerRight;
    el.querySelector('.timer-value').textContent = seconds;
  }

  showThinking() {
    // AI 思考时更新指示
    this.turnLeft.textContent = '思考中...';
    this.turnLeft.className = 'turn-indicator active';
  }

  showNameInputs(mode) {
    let html = '';
    if (mode === 'pvai') {
      html = '<label style="font-size:13px;color:#999;">你的名字：</label>';
      html += '<input type="text" id="input-p1" placeholder="玩家" autofocus>';
    } else {
      html = '<label style="font-size:13px;color:#999;">玩家 1（黑方）：</label>';
      html += '<input type="text" id="input-p1" placeholder="玩家 1" autofocus>';
      html += '<label style="font-size:13px;color:#999;margin-top:8px;display:block;">玩家 2（白方）：</label>';
      html += '<input type="text" id="input-p2" placeholder="玩家 2">';
    }
    this.nameInputs.innerHTML = html;
    this.modalNames.classList.add('show');
  }

  hideNameInputs() {
    this.modalNames.classList.remove('show');
  }

  showResult(title, msg) {
    this.resultTitle.textContent = title;
    this.resultMsg.textContent = msg;
    this.modalResult.classList.add('show');
  }

  hideResult() {
    this.modalResult.classList.remove('show');
  }

  setModeButtons(mode) {
    document.getElementById('btn-pvai').classList.toggle('active', mode === 'pvai');
    document.getElementById('btn-pvp').classList.toggle('active', mode === 'pvp');
    this.diffGroup.style.display = mode === 'pvai' ? 'flex' : 'none';
  }

  setDiffButtons(diff) {
    document.getElementById('btn-easy').classList.toggle('active', diff === 'easy');
    document.getElementById('btn-medium').classList.toggle('active', diff === 'medium');
    document.getElementById('btn-hard').classList.toggle('active', diff === 'hard');
  }

  showReplayControls(show) {
    this.replayControls.classList.toggle('show', show);
    this.btnReplay.style.display = show ? 'none' : '';
  }

  updateReplayInfo(current, total) {
    this.replayInfo.textContent = `第 ${current} / ${total} 步`;
  }

  resetPanels() {
    this.turnLeft.textContent = '等待开始...';
    this.turnLeft.className = 'turn-indicator inactive';
    this.turnRight.textContent = '等待开始...';
    this.turnRight.className = 'turn-indicator inactive';
    this.timerLeft.className = 'timer-circle inactive';
    this.timerRight.className = 'timer-circle inactive';
    this.timerLeft.querySelector('.timer-value').textContent = '30';
    this.timerRight.querySelector('.timer-value').textContent = '30';
    this.movesLeft.textContent = '0';
    this.movesRight.textContent = '0';
    this.timeLeft.textContent = '00:00';
    this.timeRight.textContent = '00:00';
  }
}

// ================================================================
//  GameController — 游戏流程控制
// ================================================================
class GameController {
  constructor() {
    this.board = new Board(40);
    this.canvas = document.getElementById('board-canvas');
    this.renderer = new Renderer(this.canvas, this.board);
    this.ai = new AI(this.board, 2);
    this.ui = new UI();

    this.mode = 'pvai';       // 'pvai' | 'pvp'
    this.difficulty = 'medium';
    this.currentPlayer = 1;   // 1=黑, 2=白
    this.gameOver = false;
    this.gameStarted = false;
    this.isReplaying = false;
    this.autoReplayTimer = null;
    this.replayIndex = -1;

    // 玩家信息
    this.playerNames = ['黑方', '白方'];
    this.playerRoles = ['AI · 中等', '玩家'];

    // 倒计时
    this.timerSeconds = 30;
    this.timerInterval = null;
    this.turnStartTime = null;
    this.elapsedTime = [0, 0]; // 累计毫秒

    // 悔棋锁定
    this.undoLocked = false;

    this.setupEvents();
    this.ui.setModeButtons(this.mode);
    this.ui.setDiffButtons(this.difficulty);
    this.startNewGame();
  }

  setupEvents() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.renderer.clearHover());
    window.addEventListener('resize', () => this.renderer.resize());
  }

  startNewGame() {
    this.ui.resetPanels();
    this.ui.showNameInputs(this.mode);
  }

  confirmNames() {
    if (this.mode === 'pvai') {
      const input = document.getElementById('input-p1');
      this.playerNames[1] = (input && input.value.trim()) || '玩家';
      this.playerNames[0] = 'AI';
      this.playerRoles[0] = `AI · ${this.diffLabel()}`;
      this.playerRoles[1] = '玩家';
    } else {
      const input1 = document.getElementById('input-p1');
      const input2 = document.getElementById('input-p2');
      this.playerNames[0] = (input1 && input1.value.trim()) || '玩家 1';
      this.playerNames[1] = (input2 && input2.value.trim()) || '玩家 2';
      this.playerRoles[0] = '黑方';
      this.playerRoles[1] = '白方';
    }
    this.ui.hideNameInputs();
    this.resetGame();
  }

  diffLabel() {
    return {easy: '简单', medium: '中等', hard: '困难'}[this.difficulty];
  }

  resetGame() {
    this.board.reset();
    this.renderer.stopWinAnimation();
    this.renderer.lastMove = null;
    this.currentPlayer = 1;
    this.gameOver = false;
    this.gameStarted = true;
    this.isReplaying = false;
    this.replayIndex = -1;
    this.elapsedTime = [0, 0];
    this.undoLocked = false;
    this.ui.hideResult();
    this.ui.showReplayControls(false);
    this.renderer.draw();
    this.startTimer();
    this.updateUI();
  }

  setMode(mode) {
    this.mode = mode;
    this.ui.setModeButtons(mode);
    this.stopTimer();
    this.renderer.stopWinAnimation();
    this.startNewGame();
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    this.ai.setDifficulty(diff);
    this.ui.setDiffButtons(diff);
    if (this.gameStarted && !this.gameOver && this.playerRoles[0].startsWith('AI')) {
      this.playerRoles[0] = `AI · ${this.diffLabel()}`;
      this.updateUI();
    }
  }

  handleClick(e) {
    if (this.gameOver || !this.gameStarted || this.isReplaying) return;
    if (this.mode === 'pvai' && this.currentPlayer === 2) return; // AI 回合不允许点击

    const rect = this.canvas.getBoundingClientRect();
    const pos = this.renderer.pixelToGrid(e.clientX - rect.left, e.clientY - rect.top);
    if (!pos) return;

    this.makeMove(pos.row, pos.col);
  }

  handleMouseMove(e) {
    if (this.gameOver || !this.gameStarted || this.isReplaying) return;
    if (this.mode === 'pvai' && this.currentPlayer === 2) return;

    const rect = this.canvas.getBoundingClientRect();
    const pos = this.renderer.pixelToGrid(e.clientX - rect.left, e.clientY - rect.top);
    if (pos) {
      this.renderer.setHover(pos.row, pos.col, this.currentPlayer);
    }
  }

  makeMove(row, col) {
    if (!this.board.place(row, col, this.currentPlayer)) return;

    // 记录耗时
    const elapsed = this.elapsedTime;
    const side = this.currentPlayer === 1 ? 0 : 1;
    if (this.turnStartTime) {
      elapsed[side] += Date.now() - this.turnStartTime;
    }

    this.renderer.draw();

    // 检查胜负
    const winCells = this.board.checkWin(row, col);
    if (winCells) {
      this.handleWin(this.currentPlayer, winCells);
      return;
    }

    // 检查平局
    if (this.board.isFull()) {
      this.handleDraw();
      return;
    }

    // 切换玩家
    this.currentPlayer = 3 - this.currentPlayer;
    this.undoLocked = false;
    this.startTimer();
    this.updateUI();

    // AI 回合
    if (this.mode === 'pvai' && this.currentPlayer === 2 && !this.gameOver) {
      this.ui.showThinking();
      setTimeout(() => this.aiMove(), 50);
    }
  }

  aiMove() {
    const move = this.ai.getMove();
    if (move) {
      this.makeMove(move.row, move.col);
    }
  }

  handleWin(player, winCells) {
    this.gameOver = true;
    this.stopTimer();
    this.renderer.startWinAnimation(winCells);
    const name = player === 1 ? this.playerNames[0] : this.playerNames[1];
    setTimeout(() => {
      this.ui.showResult('🏆 游戏结束', `${name} 获胜！`);
    }, 800);
    this.updateUI();
  }

  handleDraw() {
    this.gameOver = true;
    this.stopTimer();
    setTimeout(() => {
      this.ui.showResult('游戏结束', '平局！');
    }, 300);
    this.updateUI();
  }

  undo() {
    if (this.gameOver || !this.gameStarted || this.isReplaying) return;
    if (this.undoLocked) return;

    if (this.mode === 'pvai') {
      // 撤回 AI + 玩家各一步
      if (this.currentPlayer === 1 && this.board.history.length >= 2) {
        this.board.undoLast(); // AI 的
        this.board.undoLast(); // 玩家的
        this.currentPlayer = 1;
      } else if (this.currentPlayer === 2 && this.board.history.length >= 1) {
        this.board.undoLast(); // 玩家的
        this.currentPlayer = 1;
        // AI 也不下了，重新触发
      }
    } else {
      // 双人：撤回上一步
      if (this.board.history.length >= 1) {
        const last = this.board.undoLast();
        this.currentPlayer = last.player;
      }
    }

    this.undoLocked = true;
    this.renderer.lastMove = this.board.getLastMove();
    this.renderer.draw();
    this.startTimer();
    this.updateUI();
  }

  restart() {
    this.stopTimer();
    this.renderer.stopWinAnimation();
    if (this.autoReplayTimer) {
      clearInterval(this.autoReplayTimer);
      this.autoReplayTimer = null;
    }
    this.startNewGame();
  }

  // ===== 倒计时 =====
  startTimer() {
    this.stopTimer();
    this.timerSeconds = 30;
    this.turnStartTime = Date.now();
    this.ui.setTimer(1, 30);
    this.ui.setTimer(2, 30);
    this.ui.setTimer(this.currentPlayer, 30);

    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      this.ui.setTimer(this.currentPlayer, this.timerSeconds);
      if (this.timerSeconds <= 0) {
        this.handleTimeout();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeout() {
    this.stopTimer();
    // 超时跳过回合
    this.currentPlayer = 3 - this.currentPlayer;
    this.undoLocked = false;
    this.startTimer();
    this.updateUI();

    if (this.mode === 'pvai' && this.currentPlayer === 2) {
      this.ui.showThinking();
      setTimeout(() => this.aiMove(), 50);
    }
  }

  // ===== 回放 =====
  startReplay() {
    if (this.board.history.length === 0) return;
    this.ui.hideResult();
    this.isReplaying = true;
    this.replayIndex = 0;
    this.stopTimer();
    this.renderer.stopWinAnimation();
    this.ui.showReplayControls(true);
    this.renderer.drawHistory(0);
    this.ui.updateReplayInfo(1, this.board.history.length);
    // 重置面板
    this.ui.resetPanels();
  }

  replayNext() {
    if (!this.isReplaying) return;
    if (this.replayIndex < this.board.history.length - 1) {
      this.replayIndex++;
      this.renderer.drawHistory(this.replayIndex);
      this.ui.updateReplayInfo(this.replayIndex + 1, this.board.history.length);
    }
  }

  replayPrev() {
    if (!this.isReplaying) return;
    if (this.replayIndex > 0) {
      this.replayIndex--;
      this.renderer.drawHistory(this.replayIndex);
      this.ui.updateReplayInfo(this.replayIndex + 1, this.board.history.length);
    }
  }

  toggleAutoReplay() {
    const btn = document.getElementById('btn-auto-replay');
    if (this.autoReplayTimer) {
      clearInterval(this.autoReplayTimer);
      this.autoReplayTimer = null;
      btn.textContent = '▶ 自动播放';
      btn.classList.remove('active');
    } else {
      btn.textContent = '⏸ 暂停';
      btn.classList.add('active');
      this.autoReplayTimer = setInterval(() => {
        if (this.replayIndex < this.board.history.length - 1) {
          this.replayNext();
        } else {
          clearInterval(this.autoReplayTimer);
          this.autoReplayTimer = null;
          btn.textContent = '▶ 自动播放';
          btn.classList.remove('active');
        }
      }, 800);
    }
  }

  exitReplay() {
    this.isReplaying = false;
    if (this.autoReplayTimer) {
      clearInterval(this.autoReplayTimer);
      this.autoReplayTimer = null;
    }
    this.ui.showReplayControls(false);
    this.renderer.draw();
    this.updateUI();
  }

  // ===== UI 更新 =====
  updateUI() {
    const moves = [0, 0];
    for (const {player} of this.board.history) {
      if (player === 1) moves[0]++;
      else moves[1]++;
    }

    const fmtTime = (ms) => {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    };

    this.ui.updatePanels({
      currentPlayer: this.currentPlayer,
      playerNames: this.playerNames,
      playerRoles: this.playerRoles,
      moves,
      elapsed: [fmtTime(this.elapsedTime[0]), fmtTime(this.elapsedTime[1])],
    });
  }
}

// ================================================================
//  初始化
// ================================================================
const game = new GameController();
</script>

</body>
</html>
```

- [ ] **Step 2: 在浏览器中打开验证布局**

在浏览器中打开 `gomoku/index.html`。

**预期：**
- 页面中央显示三栏布局：左侧黑方面板、中间木纹棋盘、右侧白方面板
- 棋盘是正方形，木纹纹理 + 网格线 + 天元标记
- 弹出名字输入弹窗
- 底部控制栏显示模式/难度/按钮
- 所有按钮可点击（暂无功能）

- [ ] **Step 3: 提交**

```bash
cd /mnt/d/G_Projects/ClaudeZone
git add gomoku/
git commit -m "feat: 五子棋网页版 — 完整实现（Board + AI + Renderer + GameController + UI）"
```

---

### Task 2: 验证人机对战功能

**Files:**
- Verify: `gomoku/index.html`

- [ ] **Step 1: 测试人机对战基本流程**

打开 `gomoku/index.html`，在人机模式下进行以下测试：

1. 在弹窗中输入名字，点击「开始」
2. 点击棋盘落子（黑方先手）
3. 验证 AI（白方）自动应答
4. 验证左右面板正确切换回合指示（闪烁/灰色）
5. 验证倒计时正常运行
6. 验证最后落子红色标记正确显示
7. 验证鼠标悬停显示半透明预览棋子

**预期：** 所有人机对战基本交互正常工作

- [ ] **Step 2: 测试三档 AI 难度**

分别切换到简单/中等/困难进行对弈。

**预期：**
- 简单：AI 明显弱，有随机性
- 中等：AI 能堵四连、能做活三
- 困难：AI 更有策略性，能看到组合进攻

- [ ] **Step 3: 测试胜利判定**

尝试连成五子，验证：
1. 五连棋子红色闪烁动画
2. 弹窗显示胜利信息
3. 可点击「再来一局」或「查看回放」

**预期：** 胜利动画和弹窗正常显示

---

### Task 3: 验证双人对战 + 附加功能

**Files:**
- Verify: `gomoku/index.html`

- [ ] **Step 1: 测试双人对战**

1. 点击「双人对战」按钮
2. 输入双方名字
3. 双方交替落子
4. 验证面板正确显示名字和回合切换

**预期：** 双人模式正常工作，回合交替正确

- [ ] **Step 2: 测试悔棋**

1. 人机模式下落 2-3 步后点击「↩ 悔棋」
2. 验证撤回了玩家 + AI 各一步
3. 再次点击悔棋，验证不可连续悔棋（按钮已禁用或无响应）
4. 双人模式下测试悔棋，验证撤回上一步

**预期：** 悔棋逻辑正确，有防连悔保护

- [ ] **Step 3: 测试倒计时超时**

1. 开始一局游戏
2. 等待 30 秒不落子
3. 验证超时后自动跳过回合

**预期：** 超时跳过正常工作

- [ ] **Step 4: 测试棋局回放**

1. 下完一局（有人获胜）
2. 点击「▶ 回放」
3. 使用「上一步/下一步」逐步回放
4. 点击「自动播放」验证自动推进
5. 点击「退出回放」返回

**预期：** 回放功能完整可用

- [ ] **Step 5: 测试平局**

理论上 40×40 很难平局，但验证：当棋盘填满时应显示平局弹窗。

**预期：** 平局弹窗正常

- [ ] **Step 6: 测试窗口缩放**

调整浏览器窗口大小，验证：
1. 棋盘始终保持正方形
2. 棋子不变形
3. 布局自适应

**预期：** 响应式布局正常

---

### Task 4: 最终提交

**Files:**
- Modify: `gomoku/index.html`（如有 bug 修复）

- [ ] **Step 1: 修复验证中发现的问题**

根据 Task 2 和 Task 3 的测试结果修复所有 bug。

- [ ] **Step 2: 最终提交**

```bash
cd /mnt/d/G_Projects/ClaudeZone
git add gomoku/
git commit -m "fix: 五子棋网页版 — 修复测试中发现的问题"
```

（如有修复的话；无修复则跳过此步）
