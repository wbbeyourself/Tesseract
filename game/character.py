import random
from dataclasses import dataclass, field
from typing import Optional
from .equipment import Inventory, Equipment


# === Class Definitions ===
# To add a new class, append an entry here.
CLASS_DEFINITIONS = {
    "战士": {
        "index":       1,
        "desc":        "血厚防高，稳扎稳打",
        "base_hp":     150,
        "base_attack": 25,
        "base_defense": 15,
        "crit_chance": 0.0,
    },
    "法师": {
        "index":       2,
        "desc":        "攻高血薄，爆发强",
        "base_hp":     100,
        "base_attack": 40,
        "base_defense": 5,
        "crit_chance": 0.0,
    },
    "刺客": {
        "index":       3,
        "desc":        "暴击率高(20%)，灵活",
        "base_hp":     120,
        "base_attack": 30,
        "base_defense": 10,
        "crit_chance": 0.20,
    },
}

# Stat gains per level-up
LEVEL_UP_STAT_BONUS = 5      # +5 atk, +5 def
LEVEL_UP_HP_BONUS   = 20     # max HP grows by 20 per level


@dataclass
class Character:
    name:          str
    class_name:    str
    level:         int = 1
    gold:          int = 0
    floors_beaten: int = 0      # total floors beaten (used for level-up trigger)
    temp_def_penalty: int = 0   # temporary defense penalty (reset each floor)
    inventory:     Inventory = field(default_factory=Inventory)

    # Raw base stats (before equipment)
    _base_hp:      int = field(init=False)
    _base_attack:  int = field(init=False)
    _base_defense: int = field(init=False)
    _crit_chance:  float = field(init=False)
    _max_hp:       int = field(init=False)
    _hp:           int = field(init=False)

    def __post_init__(self) -> None:
        defn = CLASS_DEFINITIONS[self.class_name]
        self._base_hp      = defn["base_hp"]
        self._base_attack  = defn["base_attack"]
        self._base_defense = defn["base_defense"]
        self._crit_chance  = defn["crit_chance"]
        self._max_hp       = self._base_hp
        self._hp           = self._max_hp

    # ── Computed stats (base + level bonus + equipment) ──────────────────────

    @property
    def max_hp(self) -> int:
        return self._max_hp

    @property
    def hp(self) -> int:
        return self._hp

    @property
    def attack(self) -> int:
        level_bonus = (self.level - 1) * LEVEL_UP_STAT_BONUS
        return self._base_attack + level_bonus + self.inventory.attack_bonus

    @property
    def defense(self) -> int:
        level_bonus = (self.level - 1) * LEVEL_UP_STAT_BONUS
        base = self._base_defense + level_bonus + self.inventory.defense_bonus
        return max(0, base - self.temp_def_penalty)

    @property
    def crit_chance(self) -> float:
        return self._crit_chance

    @property
    def is_alive(self) -> bool:
        return self._hp > 0

    # ── HP management ────────────────────────────────────────────────────────

    def heal(self, amount: int) -> int:
        """Heal by amount. Returns actual HP recovered."""
        before = self._hp
        self._hp = min(self._max_hp, self._hp + amount)
        return self._hp - before

    def take_damage(self, amount: int) -> int:
        """Apply damage (guaranteed minimum 1). Returns actual damage taken."""
        dmg = max(1, amount)
        self._hp = max(0, self._hp - dmg)
        return dmg

    def heal_full(self) -> None:
        self._hp = self._max_hp

    # ── Level up ─────────────────────────────────────────────────────────────

    def try_level_up(self) -> bool:
        """
        Called after each floor cleared. Every 3 floors beaten there is a
        50 % chance to level up. Returns True if levelled up.
        """
        if self.floors_beaten % 3 == 0 and random.random() < 0.5:
            self.level += 1
            self._max_hp += LEVEL_UP_HP_BONUS
            self.heal_full()
            return True
        return False

    # ── Combat helpers ────────────────────────────────────────────────────────

    def deal_damage(self) -> tuple[int, bool]:
        """
        Calculate outgoing attack damage.
        Returns (damage, is_crit).
        """
        is_crit = random.random() < self._crit_chance
        dmg = self.attack * (2 if is_crit else 1)
        return dmg, is_crit

    def use_potion(self) -> Optional[int]:
        """Use a potion if available. Returns HP healed or None."""
        if self.inventory.use_potion():
            return self.heal(50)
        return None

    # ── Display ──────────────────────────────────────────────────────────────

    def show_status(self) -> None:
        print(f"  姓名: {self.name}  职业: {self.class_name}  等级: {self.level}")
        print(f"  HP: {self.hp}/{self.max_hp}  金币: {self.gold}")
        print(f"  攻击: {self.attack}  防御: {self.defense}", end="")
        if self.temp_def_penalty:
            print(f"  (防御 -{self.temp_def_penalty} 本层生效)", end="")
        print()
        if self.crit_chance:
            print(f"  暴击率: {int(self.crit_chance * 100)}%")
