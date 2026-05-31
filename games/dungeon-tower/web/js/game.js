'use strict';
// ============================================================
// game.js — 纯游戏逻辑，不依赖 DOM
// 扩展点：CLASS_DATA / MONSTER_TEMPLATES / QUALITY_DATA 均可直接添加
// ============================================================

const TOTAL_FLOORS     = 20;
const GOLD_PER_FLOOR   = 10;
const COMBAT_DROP_RATE = 0.15;
const POTION_HEAL      = 50;
const LEVEL_UP_STAT    = 5;
const LEVEL_UP_HP      = 20;
const POTION_COST      = 30;
const SHOP_WEAPON_COST = 50;
const SHOP_ARMOR_COST  = 50;

// ── 职业数据 ── 新增职业在此追加 ─────────────────────────────
const CLASS_DATA = {
  '战士': { hp: 150, attack: 25, defense: 15, crit: 0.00, icon: '⚔',  desc: '血厚防高，稳扎稳打' },
  '法师': { hp: 100, attack: 40, defense:  5, crit: 0.00, icon: '✦',  desc: '攻高血薄，爆发强'   },
  '刺客': { hp: 120, attack: 30, defense: 10, crit: 0.20, icon: '◈',  desc: '暴击率高(20%)，灵活' },
};

// ── 装备品质 ── 新增品质在此追加 ─────────────────────────────
const QUALITY_DATA = {
  '白': { name: '普通', color: '#b0b0c0', wRange: [5,  10], aRange: [3,  6]  },
  '蓝': { name: '稀有', color: '#5090ff', wRange: [11, 20], aRange: [7,  12] },
  '紫': { name: '史诗', color: '#c050ff', wRange: [21, 30], aRange: [13, 20] },
};

// ── 怪物模板 ── 新增怪物在此追加 ─────────────────────────────
const MONSTER_TEMPLATES = [
  { name: '史莱姆',   hp:  30, atk:  8, def:  2, tier: 1, icon: '🫧' },
  { name: '哥布林',   hp:  40, atk: 10, def:  3, tier: 1, icon: '👺' },
  { name: '蝙蝠',     hp:  25, atk:  7, def:  1, tier: 1, icon: '🦇' },
  { name: '骷髅战士', hp:  60, atk: 15, def:  6, tier: 2, icon: '💀' },
  { name: '食人魔',   hp:  80, atk: 18, def:  5, tier: 2, icon: '👹' },
  { name: '石像鬼',   hp:  70, atk: 16, def:  8, tier: 2, icon: '🗿' },
  { name: '暗影猎手', hp: 100, atk: 24, def: 10, tier: 3, icon: '🌑' },
  { name: '冰霜巨人', hp: 130, atk: 22, def: 14, tier: 3, icon: '❄️' },
  { name: '烈焰恶魔', hp: 110, atk: 28, def:  9, tier: 3, icon: '🔥' },
  { name: '地牢守卫', hp: 160, atk: 32, def: 16, tier: 4, icon: '⚔️' },
  { name: '混沌魔王', hp: 200, atk: 38, def: 18, tier: 4, icon: '🌀' },
  { name: '死亡骑士', hp: 180, atk: 35, def: 20, tier: 4, icon: '☠️' },
];

const WEAPON_NAMES = ['铁剑','钢刀','寒冰长剑','烈火战斧','暗影匕首','雷霆锤','魔法杖','幽灵刃','神圣剑','龙牙剑'];
const ARMOR_NAMES  = ['皮甲','锁甲','板甲','龙鳞甲','暗影斗篷','符文胸甲','幽冥战甲','圣光铠甲','钢铁盾甲','魔法长袍'];

// ── 工具函数 ─────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr)      { return arr[Math.floor(Math.random() * arr.length)]; }
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

// ── 装备 ─────────────────────────────────────────────────────
function genEquip(floor, forceType = null) {
  const tb = Math.floor(floor / 5);
  const q  = weightedPick(['白', '蓝', '紫'], [Math.max(10, 60 - tb * 5), 30, 10 + tb * 5]);
  const type = forceType ?? (Math.random() < 0.5 ? '武器' : '防具');
  const tier = QUALITY_DATA[q];
  const [lo, hi] = type === '武器' ? tier.wRange : tier.aRange;
  return {
    type,
    quality: q,
    name:    pick(type === '武器' ? WEAPON_NAMES : ARMOR_NAMES),
    bonus:   rand(lo, hi),
  };
}

function equipLabel(eq) {
  const q    = QUALITY_DATA[eq.quality];
  const stat = eq.type === '武器' ? '攻击' : '防御';
  return `[${q.name}] ${eq.type} · ${eq.name}  +${eq.bonus} ${stat}`;
}
function equipColor(eq) { return QUALITY_DATA[eq.quality].color; }

// ── 角色 ─────────────────────────────────────────────────────
function createCharacter(name, cls) {
  const d = CLASS_DATA[cls];
  return {
    name, cls,
    level: 1,
    maxHp: d.hp, hp: d.hp,
    baseAtk: d.attack, baseDef: d.defense, crit: d.crit,
    gold: 0, floorsBeaten: 0, tempDefPenalty: 0,
    bag: [], potions: 0, weapon: null, armor: null,
  };
}

function getAtk(c) {
  return c.baseAtk + (c.level - 1) * LEVEL_UP_STAT + (c.weapon?.bonus ?? 0);
}
function getDef(c) {
  return Math.max(0, c.baseDef + (c.level - 1) * LEVEL_UP_STAT + (c.armor?.bonus ?? 0) - c.tempDefPenalty);
}

function dealDmg(c) {
  const isCrit = Math.random() < c.crit;
  return { dmg: getAtk(c) * (isCrit ? 2 : 1), isCrit };
}
function charTakeDmg(c, monAtk, defending) {
  let raw = monAtk - getDef(c);
  if (defending) raw = Math.floor(raw / 2);
  const actual = Math.max(1, raw);
  c.hp = Math.max(0, c.hp - actual);
  return actual;
}
function charHeal(c, amount) {
  const before = c.hp;
  c.hp = Math.min(c.maxHp, c.hp + amount);
  return c.hp - before;
}
function usePotion(c) {
  if (c.potions <= 0) return null;
  c.potions--;
  return charHeal(c, POTION_HEAL);
}
function tryLevelUp(c) {
  if (c.floorsBeaten % 3 === 0 && Math.random() < 0.5) {
    c.level++;
    c.maxHp += LEVEL_UP_HP;
    c.hp = c.maxHp;
    return true;
  }
  return false;
}
function equipItem(c, item) {
  let old = null;
  if (item.type === '武器') { old = c.weapon; c.weapon = item; }
  else                      { old = c.armor;  c.armor  = item; }
  const idx = c.bag.indexOf(item);
  if (idx >= 0) c.bag.splice(idx, 1);
  if (old) c.bag.push(old);
  return old;
}

// ── 怪物 ─────────────────────────────────────────────────────
function spawnMonster(floor) {
  const tier   = floor <= 5 ? 1 : floor <= 10 ? 2 : floor <= 15 ? 3 : 4;
  const tmpl   = pick(MONSTER_TEMPLATES.filter(m => m.tier === tier));
  const start  = { 1: 1, 2: 6, 3: 11, 4: 16 }[tier];
  const s      = 1 + (floor - start) * 0.08;
  return {
    name:  tmpl.name,
    icon:  tmpl.icon,
    tier,
    maxHp: Math.max(1, Math.floor(tmpl.hp  * s)),
    hp:    Math.max(1, Math.floor(tmpl.hp  * s)),
    atk:   Math.max(1, Math.floor(tmpl.atk * s)),
    def:   Math.max(0, Math.floor(tmpl.def * s)),
  };
}
function monsterTakeDmg(m, atkPow) {
  const dmg = Math.max(1, atkPow - m.def);
  m.hp = Math.max(0, m.hp - dmg);
  return dmg;
}

// ── 事件掷骰 ─────────────────────────────────────────────────
function rollEvent() {
  const r = Math.random();
  if (r < 0.333) return 'monster';
  if (r < 0.667) return 'treasure';
  return 'random';
}
function rollRandomEvent() { return pick(['rest', 'trap', 'merchant']); }

function genMerchantStock(floor) {
  return {
    weapon: genEquip(floor, '武器'),
    armor:  genEquip(floor, '防具'),
  };
}
