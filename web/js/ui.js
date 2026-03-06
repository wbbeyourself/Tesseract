'use strict';
// ============================================================
// ui.js — 所有 DOM 操作、动画触发、屏幕切换
// ============================================================

// ── 屏幕切换 ─────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); el.classList.remove('fade-out'); }
}

// ── 模态框 ───────────────────────────────────────────────────
function showModal(id)  { document.getElementById(id).style.display = 'flex'; }
function hideModal(id)  { document.getElementById(id).style.display = 'none';  }

// ── HP 条更新 ─────────────────────────────────────────────────
function updateHPBar(barId, textId, cur, max) {
  const pct = Math.max(0, Math.min(100, (cur / max) * 100));
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.style.width = pct + '%';
  if      (pct > 60) bar.style.background = 'var(--hp-hi)';
  else if (pct > 30) bar.style.background = 'var(--hp-mid)';
  else               bar.style.background = 'var(--hp-lo)';
  const txt = document.getElementById(textId);
  if (txt) txt.textContent = `${cur} / ${max}`;
}

// ── 浮动数字 ─────────────────────────────────────────────────
function floatNumber(anchorId, value, type = 'damage') {
  const el = document.getElementById(anchorId);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const num  = document.createElement('div');
  num.className = `float-num float-${type}`;
  num.textContent = (type === 'heal' ? '+' : '-') + Math.abs(value);
  // 随机横向偏移
  const ox = (Math.random() - 0.5) * 40;
  num.style.left = (rect.left + rect.width / 2 + ox) + 'px';
  num.style.top  = (rect.top  + rect.height / 4) + 'px';
  document.body.appendChild(num);
  setTimeout(() => num.remove(), 1200);
}

// ── 实体动画 ─────────────────────────────────────────────────
function animAttack(id, direction = 'right') {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('anim-attack-right', 'anim-attack-left');
  void el.offsetWidth; // reflow
  el.classList.add(direction === 'right' ? 'anim-attack-right' : 'anim-attack-left');
  return new Promise(res => setTimeout(() => { el.classList.remove('anim-attack-right', 'anim-attack-left'); res(); }, 500));
}
function animHit(id) {
  const el = document.getElementById(id);
  if (!el) return Promise.resolve();
  el.classList.remove('anim-hit');
  void el.offsetWidth;
  el.classList.add('anim-hit');
  return new Promise(res => setTimeout(() => { el.classList.remove('anim-hit'); res(); }, 500));
}
function animDie(id) {
  const el = document.getElementById(id);
  if (!el) return Promise.resolve();
  el.classList.add('anim-die');
  return new Promise(res => setTimeout(res, 700));
}
function animDefend(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('anim-defend');
  setTimeout(() => el.classList.remove('anim-defend'), 800);
}
function animHeal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('anim-heal');
  setTimeout(() => el.classList.remove('anim-heal'), 600);
}

// ── 屏幕抖动 ─────────────────────────────────────────────────
function screenShake() {
  const app = document.getElementById('app');
  app.classList.remove('shake');
  void app.offsetWidth;
  app.classList.add('shake');
  setTimeout(() => app.classList.remove('shake'), 500);
}

// ── 战斗日志 ─────────────────────────────────────────────────
function addLog(msg, type = '') {
  const log  = document.getElementById('combat-log');
  if (!log) return;
  const line = document.createElement('div');
  line.className = 'log-line' + (type ? ` log-${type}` : '');
  line.textContent = msg;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
  // 最多保留 30 条
  while (log.children.length > 30) log.removeChild(log.firstChild);
}

// ── 大厅界面更新 ─────────────────────────────────────────────
function updateLobby(char, floor) {
  setText('lobby-floor-title', `第 ${floor} 层`);
  setText('floor-count', `${floor} / ${TOTAL_FLOORS}`);
  const pct = ((floor - 1) / TOTAL_FLOORS * 100).toFixed(1);
  const fp = document.getElementById('floor-progress-fill');
  if (fp) fp.style.width = pct + '%';

  setText('lobby-char-name', char.name);
  setText('lobby-char-class', `${char.cls}  Lv.${char.level}`);
  updateHPBar('lobby-hp-bar', 'lobby-hp-text', char.hp, char.maxHp);
  setText('lobby-attack',  getAtk(char));
  setText('lobby-defense', getDef(char));
  setText('lobby-gold',    char.gold);
  setText('lobby-potions', char.potions);

  const equipRow = document.getElementById('lobby-equip-row');
  if (equipRow) {
    equipRow.innerHTML = '';
    const wEl = span(char.weapon ? equipLabel(char.weapon) : '武器: 无', char.weapon ? equipColor(char.weapon) : '');
    const aEl = span(char.armor  ? equipLabel(char.armor)  : '防具: 无', char.armor  ? equipColor(char.armor)  : '');
    equipRow.appendChild(wEl);
    equipRow.appendChild(aEl);
  }
}

// ── 战斗界面初始化 ───────────────────────────────────────────
function initCombatUI(char, monster, floor) {
  setText('combat-floor-info', `第 ${floor} 层`);

  // Player
  const clsData = CLASS_DATA[char.cls];
  setText('player-entity-icon', clsData.icon);
  setText('player-combat-name', `${char.name} · ${char.cls} Lv.${char.level}`);
  updateHPBar('combat-player-hp-bar', 'combat-player-hp-text', char.hp, char.maxHp);
  setText('player-combat-stats', `ATK ${getAtk(char)}  ·  DEF ${getDef(char)}`);

  // Monster
  setText('monster-entity-icon', monster.icon);
  setText('monster-combat-name', monster.name);
  updateHPBar('combat-monster-hp-bar', 'combat-monster-hp-text', monster.hp, monster.maxHp);
  setText('monster-combat-stats', `ATK ${monster.atk}  ·  DEF ${monster.def}`);

  // 怪物颜色主题
  const tierColors = { 1: '#60c060', 2: '#c0c060', 3: '#c08030', 4: '#c040c0' };
  const mZone = document.getElementById('monster-zone');
  if (mZone) mZone.style.setProperty('--zone-accent', tierColors[monster.tier] ?? '#888');

  // 清空日志
  const log = document.getElementById('combat-log');
  if (log) log.innerHTML = '';

  // 清除死亡动画
  ['player-entity', 'monster-entity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('anim-die');
  });
}

function refreshCombatHP(char, monster) {
  updateHPBar('combat-player-hp-bar', 'combat-player-hp-text', char.hp, char.maxHp);
  updateHPBar('combat-monster-hp-bar', 'combat-monster-hp-text', monster.hp, monster.maxHp);
  setText('player-combat-stats', `ATK ${getAtk(char)}  ·  DEF ${getDef(char)}`);
}

// ── 背包模态框 ───────────────────────────────────────────────
function renderBagModal(char, onEquip) {
  const body = document.getElementById('modal-bag-body');
  if (!body) return;
  body.innerHTML = '';

  // 已装备
  const equipped = document.createElement('div');
  equipped.className = 'bag-section';
  equipped.innerHTML = '<div class="bag-section-title">已装备</div>';
  const slots = [
    { label: '武器', item: char.weapon },
    { label: '防具', item: char.armor  },
  ];
  slots.forEach(({ label, item }) => {
    const row = document.createElement('div');
    row.className = 'bag-item equipped-item';
    row.innerHTML = `<span class="item-slot-label">${label}</span>
      <span class="item-label" style="color:${item ? equipColor(item) : '#666'}">${item ? equipLabel(item) : '（空）'}</span>`;
    equipped.appendChild(row);
  });

  // 药水
  const potRow = document.createElement('div');
  potRow.className = 'bag-item';
  potRow.innerHTML = `<span class="item-slot-label">🧪 药水</span><span class="item-label">x${char.potions}</span>`;
  equipped.appendChild(potRow);
  body.appendChild(equipped);

  // 背包物品
  const bagSec = document.createElement('div');
  bagSec.className = 'bag-section';
  bagSec.innerHTML = '<div class="bag-section-title">背包物品 ' + (char.bag.length ? `(${char.bag.length})` : '（空）') + '</div>';
  char.bag.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'bag-item bag-item-clickable';
    row.innerHTML = `<span class="item-label" style="color:${equipColor(item)}">${equipLabel(item)}</span>
      <button class="btn-equip-small">装备</button>`;
    row.querySelector('.btn-equip-small').addEventListener('click', () => onEquip(item));
    bagSec.appendChild(row);
  });
  body.appendChild(bagSec);
}

// ── 战利品模态框 ─────────────────────────────────────────────
function showLootModal(title, eq, onTake, onSkip) {
  setText('loot-modal-title', title);
  const body = document.getElementById('loot-modal-body');
  if (body) {
    body.innerHTML = `
      <div class="loot-icon">✨</div>
      <div class="loot-item-name" style="color:${equipColor(eq)}">${equipLabel(eq)}</div>`;
  }
  document.getElementById('btn-loot-take').onclick = onTake;
  document.getElementById('btn-loot-skip').onclick = onSkip;
  showModal('modal-loot');
}

// ── 商人模态框 ───────────────────────────────────────────────
function renderMerchantModal(char, stock, onBuy, onLeave) {
  setText('merchant-gold-display', char.gold);
  const body = document.getElementById('merchant-body');
  if (!body) return;
  body.innerHTML = '';

  const items = [
    { label: `🧪 回血药水  (+${POTION_HEAL} HP)`, cost: POTION_COST,      key: 'potion' },
    { label: equipLabel(stock.weapon),               cost: SHOP_WEAPON_COST, key: 'weapon', eq: stock.weapon },
    { label: equipLabel(stock.armor),                cost: SHOP_ARMOR_COST,  key: 'armor',  eq: stock.armor  },
  ];
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'shop-row';
    const canBuy = char.gold >= item.cost;
    const color  = item.eq ? equipColor(item.eq) : '#c0d0ff';
    row.innerHTML = `
      <span class="shop-item-label" style="color:${color}">${item.label}</span>
      <button class="btn btn-buy ${canBuy ? '' : 'btn-disabled'}" data-key="${item.key}">
        💰 ${item.cost}
      </button>`;
    if (canBuy) {
      row.querySelector('button').addEventListener('click', () => onBuy(item.key, stock, item.eq));
    }
    body.appendChild(row);
  });

  document.getElementById('btn-merchant-leave').onclick = onLeave;
}

// ── 升级覆盖层 ───────────────────────────────────────────────
function showLevelUpOverlay(level) {
  return new Promise(res => {
    setText('levelup-level', `Lv. ${level}`);
    const ov = document.getElementById('overlay-levelup');
    ov.style.display = 'flex';
    ov.classList.remove('fade-out-ov');
    setTimeout(() => {
      ov.classList.add('fade-out-ov');
      setTimeout(() => { ov.style.display = 'none'; res(); }, 800);
    }, 1800);
  });
}

// ── 结算界面 ─────────────────────────────────────────────────
function showEndScreen(char, floor, eventLog, won) {
  if (won) {
    setText('end-icon',  '🏆');
    setText('end-title', '恭喜通关！你成为地牢霸主！');
    document.getElementById('end-title').style.color = '#ffd700';
  } else {
    setText('end-icon',  '💀');
    setText('end-title', `你倒在了第 ${floor} 层…`);
    document.getElementById('end-title').style.color = '#ff6666';
  }

  const stats = document.getElementById('end-stats');
  if (stats) {
    stats.innerHTML = `
      <div class="end-stat-row"><span>职业</span><span>${char.cls}  Lv.${char.level}</span></div>
      <div class="end-stat-row"><span>到达层数</span><span>${floor} / ${TOTAL_FLOORS}</span></div>
      <div class="end-stat-row"><span>最终金币</span><span>💰 ${char.gold}</span></div>
      <div class="end-stat-row"><span>武器</span><span style="color:${char.weapon ? equipColor(char.weapon) : '#666'}">${char.weapon ? char.weapon.name : '无'}</span></div>
      <div class="end-stat-row"><span>防具</span><span style="color:${char.armor  ? equipColor(char.armor)  : '#666'}">${char.armor  ? char.armor.name  : '无'}</span></div>`;
  }

  const logEl = document.getElementById('end-log');
  if (logEl) {
    logEl.innerHTML = '';
    const recent = eventLog.slice(-12);
    recent.forEach(entry => {
      const d = document.createElement('div');
      d.className = 'end-log-entry';
      d.textContent = entry;
      logEl.appendChild(d);
    });
  }

  showScreen('screen-end');
}

// ── 辅助 ─────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function span(text, color) {
  const el = document.createElement('span');
  el.className = 'equip-chip';
  el.textContent = text;
  if (color) el.style.color = color;
  return el;
}

// 等待毫秒
function wait(ms) { return new Promise(res => setTimeout(res, ms)); }
