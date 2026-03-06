import random
from dataclasses import dataclass


# === Monster Definitions ===
# To add new monsters, append entries to MONSTER_POOL.
# Each monster has a tier (1-4) indicating which floor range it appears in.
# Stats scale with floor multiplier on top of the base values.

@dataclass
class Monster:
    name:    str
    hp:      int
    attack:  int
    defense: int
    tier:    int

    @property
    def is_alive(self) -> bool:
        return self.hp > 0

    def take_damage(self, amount: int) -> int:
        """Apply damage. Returns actual damage dealt."""
        dmg = max(1, amount - self.defense)
        # If attacker's power is so high defense becomes irrelevant, floor at 1
        self.hp = max(0, self.hp - dmg)
        return dmg

    def show(self) -> None:
        print(f"  [{self.name}]  HP: {self.hp}  攻击: {self.attack}  防御: {self.defense}")


# Raw monster templates (base stats before floor scaling)
MONSTER_POOL: list[dict] = [
    # tier 1 — floors 1-5
    {"name": "史莱姆",   "hp": 30,  "attack": 8,  "defense": 2,  "tier": 1},
    {"name": "哥布林",   "hp": 40,  "attack": 10, "defense": 3,  "tier": 1},
    {"name": "蝙蝠",     "hp": 25,  "attack": 7,  "defense": 1,  "tier": 1},
    # tier 2 — floors 6-10
    {"name": "骷髅战士", "hp": 60,  "attack": 15, "defense": 6,  "tier": 2},
    {"name": "食人魔",   "hp": 80,  "attack": 18, "defense": 5,  "tier": 2},
    {"name": "石像鬼",   "hp": 70,  "attack": 16, "defense": 8,  "tier": 2},
    # tier 3 — floors 11-15
    {"name": "暗影猎手", "hp": 100, "attack": 24, "defense": 10, "tier": 3},
    {"name": "冰霜巨人", "hp": 130, "attack": 22, "defense": 14, "tier": 3},
    {"name": "烈焰恶魔", "hp": 110, "attack": 28, "defense": 9,  "tier": 3},
    # tier 4 — floors 16-20
    {"name": "地牢守卫", "hp": 160, "attack": 32, "defense": 16, "tier": 4},
    {"name": "混沌魔王", "hp": 200, "attack": 38, "defense": 18, "tier": 4},
    {"name": "死亡骑士", "hp": 180, "attack": 35, "defense": 20, "tier": 4},
]


def _floor_to_tier(floor: int) -> int:
    if floor <= 5:
        return 1
    elif floor <= 10:
        return 2
    elif floor <= 15:
        return 3
    else:
        return 4


def spawn_monster(floor: int) -> Monster:
    """
    Spawn a monster appropriate for the given floor.
    Stats are scaled slightly above the base to match floor progression.
    """
    tier = _floor_to_tier(floor)
    candidates = [m for m in MONSTER_POOL if m["tier"] == tier]
    template = random.choice(candidates)

    # Scale factor: within a tier, each floor adds ~8% to stats
    tier_start = {1: 1, 2: 6, 3: 11, 4: 16}[tier]
    scale = 1.0 + (floor - tier_start) * 0.08

    hp      = max(1, int(template["hp"]      * scale))
    attack  = max(1, int(template["attack"]  * scale))
    defense = max(0, int(template["defense"] * scale))

    return Monster(
        name=template["name"],
        hp=hp,
        attack=attack,
        defense=defense,
        tier=tier,
    )
