'use strict';
// ============================================================
// main.js — 游戏流程控制 & 事件绑定
// ============================================================

// ── 游戏状态 ─────────────────────────────────────────────────
const G = {
  char:          null,
  floor:         1,
  monster:       null,
  eventLog:      [],
  merchantStock: null,
  pendingLoot:   null,
  combatLock:    false,   // 防止战斗动画时重复点击
};

// ── 初始化 ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  Audio.init();
  bindTitleScreen();
  bindCreateScreen();
  bindLobbyScreen();
  bindCombatScreen();
  bindBagModal();
  bindMerchantModal();
  bindEndScreen();
  showScreen('screen-title');
});

// ── 标题界面 ─────────────────────────────────────────────────
function bindTitleScreen() {
  document.getElementById('btn-start').addEventListener('click', () => {
    Audio.init();
    showScreen('screen-create');
    buildClassGrid();
  });
}

// ── 角色创建 ─────────────────────────────────────────────────
let selectedClass = null;

function buildClassGrid() {
  const grid = document.getElementById('class-grid');
  grid.innerHTML = '';
  Object.entries(CLASS_DATA).forEach(([name, d]) => {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.dataset.cls = name;
    card.innerHTML = `
      <div class="class-icon">${d.icon}</div>
      <div class="class-name">${name}</div>
      <div class="class-desc">${d.desc}</div>
      <div class="class-stats">
        <span>❤ ${d.hp}</span>
        <span>⚔ ${d.attack}</span>
        <span>🛡 ${d.defense}</span>
        ${d.crit ? `<span>⚡ 暴击${d.crit * 100}%</span>` : ''}
      </div>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedClass = name;
      document.getElementById('btn-create-confirm').disabled = !document.getElementById('char-name').value.trim();
    });
    grid.appendChild(card);
  });
}

function bindCreateScreen() {
  const nameInput = document.getElementById('char-name');
  const btnOK     = document.getElementById('btn-create-confirm');

  nameInput.addEventListener('input', () => {
    btnOK.disabled = !nameInput.value.trim() || !selectedClass;
  });

  btnOK.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name || !selectedClass) return;
    G.char      = createCharacter(name, selectedClass);
    G.floor     = 1;
    G.eventLog  = [];
    enterLobby();
  });
}

// ── 大厅 ─────────────────────────────────────────────────────
function enterLobby() {
  G.char.tempDefPenalty = 0;
  updateLobby(G.char, G.floor);
  showScreen('screen-lobby');
}

function bindLobbyScreen() {
  document.getElementById('btn-enter-floor').addEventListener('click', () => {
    const ev = rollEvent();
    if      (ev === 'monster')  startCombat();
    else if (ev === 'treasure') startTreasure();
    else                        startRandomEvent();
  });
  document.getElementById('btn-open-bag').addEventListener('click', openBag);
  document.getElementById('btn-quit-game').addEventListener('click', () => {
    if (confirm('确认退出游戏？')) {
      showEndScreen(G.char, G.floor - 1, G.eventLog, false);
    }
  });
}

function openBag() {
  function onEquip(item) {
    equipItem(G.char, item);
    Audio.equip();
    renderBagModal(G.char, onEquip);
    updateLobby(G.char, G.floor);
  }
  renderBagModal(G.char, onEquip);
  showModal('modal-bag');
}

// ── 战斗流程 ─────────────────────────────────────────────────
function startCombat() {
  G.monster    = spawnMonster(G.floor);
  G.combatLock = false;
  initCombatUI(G.char, G.monster, G.floor);
  setCombatButtons(true);
  addLog(`⚔ 遭遇了 ${G.monster.name}！`, 'encounter');
  showScreen('screen-combat');
}

function bindCombatScreen() {
  document.getElementById('btn-attack').addEventListener('click', () => handleCombat('attack'));
  document.getElementById('btn-defend').addEventListener('click', () => handleCombat('defend'));
  document.getElementById('btn-potion').addEventListener('click', () => handleCombat('potion'));
}

function setCombatButtons(enabled) {
  ['btn-attack', 'btn-defend', 'btn-potion'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = !enabled;
    btn.classList.toggle('btn-disabled', !enabled);
  });
  // 药水按钮
  const potBtn = document.getElementById('btn-potion');
  if (potBtn) {
    const hasPot = G.char.potions > 0;
    potBtn.disabled   = !enabled || !hasPot;
    potBtn.textContent = `🧪 药水 (${G.char.potions})`;
    potBtn.classList.toggle('btn-disabled', !enabled || !hasPot);
  }
}

async function handleCombat(action) {
  if (G.combatLock) return;
  G.combatLock = true;
  setCombatButtons(false);

  // ── 玩家行动 ─────────────────────────────────────────────
  let playerDefending = false;

  if (action === 'attack') {
    const { dmg, isCrit } = dealDmg(G.char);
    const dealt = monsterTakeDmg(G.monster, dmg);

    // 动画
    await animAttack('player-entity', 'right');
    if (isCrit) {
      Audio.critical();
      const { x, y } = entityCenter('monster-entity');
      Particles.critHit('monster-entity');
      addLog(`💥 暴击！你对 ${G.monster.name} 造成 ${dealt} 点伤害！`, 'crit');
      floatNumber('monster-entity', dealt, 'crit');
    } else {
      Audio.attack();
      addLog(`⚔ 你对 ${G.monster.name} 造成 ${dealt} 点伤害。`, 'damage');
      floatNumber('monster-entity', dealt, 'damage');
    }
    await animHit('monster-entity');
    refreshCombatHP(G.char, G.monster);

    if (G.monster.hp <= 0) {
      await combatVictory();
      return;
    }

  } else if (action === 'defend') {
    playerDefending = true;
    animDefend('player-entity');
    Audio.defend();
    addLog(`🛡 你摆出防御姿态…`, 'info');

  } else if (action === 'potion') {
    const healed = usePotion(G.char);
    if (healed !== null) {
      Audio.heal();
      animHeal('player-entity');
      addLog(`🧪 使用药水，恢复 ${healed} HP！`, 'heal');
      floatNumber('player-entity', healed, 'heal');
      refreshCombatHP(G.char, G.monster);
    } else {
      addLog('没有药水了！', 'warn');
      G.combatLock = false;
      setCombatButtons(true);
      return;
    }
  }

  await wait(600);

  // ── 怪物反击 ─────────────────────────────────────────────
  const dmgTaken = charTakeDmg(G.char, G.monster.atk, playerDefending);
  await animAttack('monster-entity', 'left');
  Audio.hit();
  screenShake();
  Particles.playerHit('player-entity');
  await animHit('player-entity');

  if (playerDefending) {
    addLog(`🛡 防御减伤！${G.monster.name} 对你造成 ${dmgTaken} 点伤害。`, 'damage');
  } else {
    addLog(`${G.monster.name} 对你造成 ${dmgTaken} 点伤害。`, 'damage');
  }
  floatNumber('player-entity', dmgTaken, 'damage');
  refreshCombatHP(G.char, G.monster);

  if (G.char.hp <= 0) {
    await combatDefeat();
    return;
  }

  await wait(300);
  G.combatLock = false;
  setCombatButtons(true);
}

async function combatVictory() {
  Audio.monDie();
  Particles.monsterDie('monster-entity');
  await animDie('monster-entity');

  const gold = G.floor * GOLD_PER_FLOOR;
  G.char.gold += gold;
  addLog(`✨ ${G.monster.name} 被击败！获得 ${gold} 金币。`, 'victory');
  await wait(800);

  // 装备掉落
  if (Math.random() < COMBAT_DROP_RATE) {
    const eq = genEquip(G.floor);
    G.pendingLoot = eq;
    showLootModal(
      '战斗掉落！',
      eq,
      () => { // 拾取
        hideModal('modal-loot');
        G.char.bag.push(eq);
        Audio.equip();
        Particles.equipPickup('combat-floor-info');
        G.eventLog.push(`第${G.floor}层: 击败${G.monster.name} 拾取${eq.name} +${gold}金`);
        afterFloorCleared();
      },
      () => { // 放弃
        hideModal('modal-loot');
        G.eventLog.push(`第${G.floor}层: 击败${G.monster.name} 放弃装备 +${gold}金`);
        afterFloorCleared();
      }
    );
  } else {
    G.eventLog.push(`第${G.floor}层: 击败${G.monster.name} +${gold}金`);
    afterFloorCleared();
  }
}

async function combatDefeat() {
  Audio.death();
  await animDie('player-entity');
  await wait(600);
  G.eventLog.push(`第${G.floor}层: 败于${G.monster.name}`);
  showEndScreen(G.char, G.floor, G.eventLog, false);
}

// ── 宝箱事件 ─────────────────────────────────────────────────
function startTreasure() {
  Audio.treasure();
  showEventScreen('📦', '宝箱', '你发现了一个神秘的宝箱…', () => {
    const roll = Math.random();
    let resultHTML = '';
    let logStr = '';

    if (roll < 0.33) {
      const gold = rand(10, 50);
      G.char.gold += gold;
      resultHTML = `<div class="event-reward gold">💰 获得 ${gold} 金币！</div>`;
      logStr = `宝箱 +${gold}金`;
      finishEvent(resultHTML, logStr);

    } else if (roll < 0.66) {
      G.char.potions++;
      Audio.heal();
      resultHTML = `<div class="event-reward">🧪 获得回血药水！(x${G.char.potions})</div>`;
      logStr = '宝箱 获得药水';
      finishEvent(resultHTML, logStr);

    } else {
      const eq = genEquip(G.floor);
      G.pendingLoot = eq;
      // 先关闭事件画面，再显示战利品模态
      showLootModal(
        '宝箱装备！',
        eq,
        () => {
          hideModal('modal-loot');
          G.char.bag.push(eq);
          Audio.equip();
          Particles.equipPickup('event-panel');
          G.eventLog.push(`第${G.floor}层: 宝箱拾取${eq.name}`);
          afterFloorCleared();
        },
        () => {
          hideModal('modal-loot');
          G.eventLog.push(`第${G.floor}层: 宝箱放弃装备`);
          afterFloorCleared();
        }
      );
    }
  });
}

// ── 随机事件 ─────────────────────────────────────────────────
function startRandomEvent() {
  const type = rollRandomEvent();
  if      (type === 'rest')     doRest();
  else if (type === 'trap')     doTrap();
  else                          doMerchant();
}

function doRest() {
  showEventScreen('🏕', '安全营地', '你找到了一处安静的角落，稍作休息…', () => {
    const healed = charHeal(G.char, 30);
    Audio.heal();
    finishEvent(`<div class="event-reward heal">❤ 恢复了 ${healed} 点血量！</div>`, `休息 +${healed}HP`);
  });
}

function doTrap() {
  showEventScreen('⚠️', '陷阱！', '脚下一滑，踩中了隐藏陷阱！', () => {
    const dmg = charTakeDmg(G.char, 20, false);
    G.char.tempDefPenalty = 5;
    Audio.hit();
    screenShake();
    finishEvent(
      `<div class="event-reward damage">💢 受到 ${dmg} 点伤害，且本层防御 -5！</div>`,
      `陷阱 -${dmg}HP 防御-5`
    );
    if (G.char.hp <= 0) {
      setTimeout(() => {
        G.eventLog.push(`第${G.floor}层: 陷阱致死`);
        showEndScreen(G.char, G.floor, G.eventLog, false);
      }, 2000);
    }
  });
}

function doMerchant() {
  G.merchantStock = genMerchantStock(G.floor);
  const purchases = [];

  function onBuy(key, stock) {
    if (key === 'potion' && G.char.gold >= POTION_COST) {
      G.char.gold -= POTION_COST;
      G.char.potions++;
      Audio.shop();
      purchases.push('买药水');
    } else if (key === 'weapon' && G.char.gold >= SHOP_WEAPON_COST) {
      G.char.gold -= SHOP_WEAPON_COST;
      G.char.bag.push(stock.weapon);
      purchases.push(`买${stock.weapon.name}`);
      G.merchantStock.weapon = genEquip(G.floor, '武器');
      Audio.equip();
    } else if (key === 'armor' && G.char.gold >= SHOP_ARMOR_COST) {
      G.char.gold -= SHOP_ARMOR_COST;
      G.char.bag.push(stock.armor);
      purchases.push(`买${stock.armor.name}`);
      G.merchantStock.armor = genEquip(G.floor, '防具');
      Audio.equip();
    }
    setText('merchant-gold-display', G.char.gold);
    renderMerchantModal(G.char, G.merchantStock, onBuy, onLeave);
  }

  function onLeave() {
    merchantLeave(purchases.join('、'));
  }

  renderMerchantModal(G.char, G.merchantStock, onBuy, onLeave);
  showModal('modal-merchant');
}

function merchantLeave(logStr) {
  hideModal('modal-merchant');
  G.eventLog.push(`第${G.floor}层: 商人 ${logStr || '未购买'}`);
  afterFloorCleared();
}

// ── 事件画面通用 ──────────────────────────────────────────────
function showEventScreen(icon, title, desc, onEnter) {
  setText('event-icon',  icon);
  setText('event-title', title);
  setText('event-desc',  desc);
  document.getElementById('event-result').innerHTML  = '';
  document.getElementById('event-actions').innerHTML = '';
  showScreen('screen-event');
  setTimeout(onEnter, 600); // 短暂停顿后触发
}

function finishEvent(resultHTML, logStr) {
  document.getElementById('event-result').innerHTML = resultHTML;
  const actions = document.getElementById('event-actions');
  actions.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = '继续前进 →';
  btn.addEventListener('click', () => {
    G.eventLog.push(`第${G.floor}层: ${logStr}`);
    afterFloorCleared();
  });
  actions.appendChild(btn);
}

// ── 层结算 & 升级 ─────────────────────────────────────────────
async function afterFloorCleared() {
  if (!G.char.hp || G.char.hp <= 0) return; // 死亡由各自路径处理

  if (G.floor === TOTAL_FLOORS) {
    // 通关！
    Audio.victory();
    Particles.levelUp('screen-end');
    G.eventLog.push(`第${G.floor}层: 通关！`);
    showEndScreen(G.char, G.floor, G.eventLog, true);
    return;
  }

  G.char.floorsBeaten++;

  // 每3层尝试升级
  if (G.char.floorsBeaten % 3 === 0) {
    const levelled = tryLevelUp(G.char);
    if (levelled) {
      Audio.levelUp();
      Particles.levelUp('screen-lobby');
      await showLevelUpOverlay(G.char.level);
    }
  }

  G.floor++;
  enterLobby();
}

// ── 背包模态绑定 ─────────────────────────────────────────────
function bindBagModal() {
  document.getElementById('modal-bag-close').addEventListener('click', () => hideModal('modal-bag'));
  document.getElementById('modal-bag-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-bag-overlay') hideModal('modal-bag');
  });
}

// ── 商人模态绑定 ─────────────────────────────────────────────
function bindMerchantModal() {
  // 离开按钮在 renderMerchantModal 中动态绑定
}

// ── 结算界面 ─────────────────────────────────────────────────
function bindEndScreen() {
  document.getElementById('btn-restart').addEventListener('click', () => {
    selectedClass = null;
    document.getElementById('char-name').value = '';
    document.getElementById('btn-create-confirm').disabled = true;
    showScreen('screen-create');
    buildClassGrid();
  });
}

// ── 小工具 ───────────────────────────────────────────────────
function entityCenter(id) {
  const el = document.getElementById(id);
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
