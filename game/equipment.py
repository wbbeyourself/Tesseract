import random
from dataclasses import dataclass, field
from typing import Optional


# === Equipment Quality Tiers ===
# To add a new quality tier, extend QUALITY_TIERS with a new entry.
QUALITY_TIERS = {
    "白": {"label": "[白]", "weapon_range": (5, 10),  "armor_range": (3, 6)},
    "蓝": {"label": "[蓝]", "weapon_range": (11, 20), "armor_range": (7, 12)},
    "紫": {"label": "[紫]", "weapon_range": (21, 30), "armor_range": (13, 20)},
}

# Quality drop weights (white:blue:purple)
QUALITY_WEIGHTS = [60, 30, 10]
QUALITY_NAMES   = ["白", "蓝", "紫"]

# === Equipment Types ===
# To add a new equipment type, extend EQUIPMENT_TYPES and handle the stat in Character.
EQUIPMENT_TYPES = ["武器", "防具"]

WEAPON_NAMES = [
    "铁剑", "钢刀", "寒冰长剑", "烈火战斧", "暗影匕首",
    "雷霆锤", "魔法杖", "骨刺", "幽灵刃", "神圣剑"
]
ARMOR_NAMES = [
    "皮甲", "锁甲", "板甲", "龙鳞甲", "暗影斗篷",
    "魔法长袍", "符文胸甲", "钢铁盾甲", "幽冥战甲", "圣光铠甲"
]


@dataclass
class Equipment:
    eq_type:  str   # "武器" or "防具"
    quality:  str   # "白", "蓝", "紫"
    name:     str
    bonus:    int   # attack bonus for weapon, defense bonus for armor

    def display(self) -> str:
        label = QUALITY_TIERS[self.quality]["label"]
        stat_label = "攻击" if self.eq_type == "武器" else "防御"
        return f"{label} {self.eq_type} — {self.name} (+{self.bonus} {stat_label})"


def generate_equipment(floor: int) -> Equipment:
    """
    Generate a random piece of equipment.
    Higher floors slightly increase the chance of better quality.
    """
    # Adjust weights slightly by floor: every 5 floors, shift weight toward higher tier
    tier_bonus = floor // 5
    weights = [
        max(10, QUALITY_WEIGHTS[0] - tier_bonus * 5),
        QUALITY_WEIGHTS[1],
        QUALITY_WEIGHTS[2] + tier_bonus * 5,
    ]
    quality = random.choices(QUALITY_NAMES, weights=weights, k=1)[0]
    eq_type = random.choice(EQUIPMENT_TYPES)

    tier = QUALITY_TIERS[quality]
    if eq_type == "武器":
        bonus = random.randint(*tier["weapon_range"])
        name  = random.choice(WEAPON_NAMES)
    else:
        bonus = random.randint(*tier["armor_range"])
        name  = random.choice(ARMOR_NAMES)

    return Equipment(eq_type=eq_type, quality=quality, name=name, bonus=bonus)


@dataclass
class Inventory:
    """Holds all items and equipped gear for a character."""
    equipment: list[Equipment] = field(default_factory=list)
    potions:   int = 0                      # heal +50 each
    equipped_weapon: Optional[Equipment] = None
    equipped_armor:  Optional[Equipment] = None

    # ── Potions ──────────────────────────────────────────────────────────────

    def add_potion(self, count: int = 1) -> None:
        self.potions += count

    def use_potion(self) -> bool:
        """Consume one potion. Returns True if successful."""
        if self.potions > 0:
            self.potions -= 1
            return True
        return False

    def has_potion(self) -> bool:
        return self.potions > 0

    # ── Equipment management ─────────────────────────────────────────────────

    def add_equipment(self, eq: Equipment) -> None:
        self.equipment.append(eq)

    def equip(self, eq: Equipment) -> Optional[Equipment]:
        """
        Equip an item. Returns the previously equipped item (if any) so the
        caller can decide what to do with it (put back in bag or discard).
        """
        if eq.eq_type == "武器":
            old = self.equipped_weapon
            self.equipped_weapon = eq
        else:
            old = self.equipped_armor
            self.equipped_armor = eq
        # Remove from bag
        if eq in self.equipment:
            self.equipment.remove(eq)
        return old

    # ── Stat helpers ─────────────────────────────────────────────────────────

    @property
    def attack_bonus(self) -> int:
        return self.equipped_weapon.bonus if self.equipped_weapon else 0

    @property
    def defense_bonus(self) -> int:
        return self.equipped_armor.bonus if self.equipped_armor else 0

    # ── Display ──────────────────────────────────────────────────────────────

    def show(self) -> None:
        print("  --- 已装备 ---")
        w_str = self.equipped_weapon.display() if self.equipped_weapon else "（空）"
        a_str = self.equipped_armor.display()  if self.equipped_armor  else "（空）"
        print(f"  武器槽: {w_str}")
        print(f"  防具槽: {a_str}")
        print(f"  回血药水 x{self.potions}")
        if self.equipment:
            print("  --- 背包物品 ---")
            for i, eq in enumerate(self.equipment, 1):
                print(f"  {i}. {eq.display()}")
        else:
            print("  --- 背包为空 ---")
