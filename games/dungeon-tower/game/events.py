"""
Non-combat floor events:
  - Treasure chest
  - Random events (rest / trap / merchant)

Each function returns a short result string for the summary log.
"""
import random
from .character import Character
from .equipment import generate_equipment
from .utils     import get_input, pause, short_pause, divider, header, section


POTION_COST  = 30   # gold cost to buy a potion from merchant
WEAPON_COST  = 50   # gold cost to buy a weapon from merchant
ARMOR_COST   = 50   # gold cost to buy armor from merchant


# ── Treasure Chest ────────────────────────────────────────────────────────────

def event_treasure(character: Character, floor: int) -> str:
    header("宝箱")
    print("  你发现了一个宝箱，打开它…")
    pause()

    roll = random.random()
    if roll < 0.33:
        # Gold
        gold = random.randint(10, 50)
        character.gold += gold
        print(f"  获得金币 {gold}！(当前金币: {character.gold})")
        pause()
        return f"宝箱获得金币 {gold}"

    elif roll < 0.66:
        # Potion
        character.inventory.add_potion()
        print(f"  获得回血药水！(当前药水: {character.inventory.potions})")
        pause()
        return "宝箱获得回血药水"

    else:
        # Equipment
        eq = generate_equipment(floor)
        print(f"  获得装备: {eq.display()}")
        pause()
        return _offer_equipment(character, eq, source="宝箱")


# ── Random Events ─────────────────────────────────────────────────────────────

def event_random(character: Character, floor: int) -> str:
    """Pick one of: rest / trap / merchant."""
    # === To add new random events, extend this list ===
    events = [_rest, _trap, _merchant]
    chosen = random.choice(events)
    return chosen(character, floor)


def _rest(character: Character, floor: int) -> str:
    header("休息处")
    print("  你找到了一处安静的角落，稍作休息…")
    pause()
    healed = character.heal(30)
    print(f"  恢复了 {healed} 点血量。(HP: {character.hp}/{character.max_hp})")
    pause()
    return f"休息恢复 {healed} HP"


def _trap(character: Character, floor: int) -> str:
    header("陷阱！")
    print("  脚下一滑，踩中了陷阱！")
    pause()
    actual = character.take_damage(20)
    character.temp_def_penalty = 5
    print(f"  受到 {actual} 点伤害，且本层防御临时 -5！")
    print(f"  (HP: {character.hp}/{character.max_hp}  当前防御: {character.defense})")
    pause()
    return f"踩中陷阱 -{actual} HP，防御临时 -5"


def _merchant(character: Character, floor: int) -> str:
    header("神秘商人")
    print("  一位神秘商人出现在你面前！")
    print(f"  当前金币: {character.gold}")
    divider()

    log_parts = []

    # Generate one weapon and one armor to sell
    weapon = generate_equipment(floor)
    weapon.eq_type = "武器"
    armor  = generate_equipment(floor)
    armor.eq_type = "防具"

    while True:
        print(f"  当前金币: {character.gold}  药水: {character.inventory.potions}")
        print(f"  1. 购买回血药水 ({POTION_COST} 金币)")
        print(f"  2. 购买武器: {weapon.display()} ({WEAPON_COST} 金币)")
        print(f"  3. 购买防具: {armor.display()} ({ARMOR_COST} 金币)")
        print(f"  4. 离开商店")
        choice = get_input("  >> 选择: ", [1, 2, 3, 4])

        if choice == 1:
            if character.gold >= POTION_COST:
                character.gold -= POTION_COST
                character.inventory.add_potion()
                print(f"  购买成功！(药水 x{character.inventory.potions})")
                log_parts.append("买药水")
            else:
                print("  金币不足！")
            short_pause()

        elif choice == 2:
            if character.gold >= WEAPON_COST:
                character.gold -= WEAPON_COST
                character.inventory.add_equipment(weapon)
                print(f"  购买成功！{weapon.display()} 已放入背包。")
                log_parts.append(f"买{weapon.name}")
                weapon = generate_equipment(floor)   # restock
                weapon.eq_type = "武器"
            else:
                print("  金币不足！")
            short_pause()

        elif choice == 3:
            if character.gold >= ARMOR_COST:
                character.gold -= ARMOR_COST
                character.inventory.add_equipment(armor)
                print(f"  购买成功！{armor.display()} 已放入背包。")
                log_parts.append(f"买{armor.name}")
                armor = generate_equipment(floor)
                armor.eq_type = "防具"
            else:
                print("  金币不足！")
            short_pause()

        else:
            print("  感谢光临，再见！")
            pause()
            break

    summary = "商人: " + "、".join(log_parts) if log_parts else "商人: 未购买"
    return summary


# ── Equipment Drop Offer ──────────────────────────────────────────────────────

def offer_combat_drop(character: Character, floor: int) -> str:
    """Called after a combat victory when equipment drops (15% chance)."""
    eq = generate_equipment(floor)
    print(f"  怪物掉落装备: {eq.display()}")
    return _offer_equipment(character, eq, source="战斗掉落")


def _offer_equipment(character: Character, eq, source: str) -> str:
    """Ask player to pick up or discard an equipment piece."""
    print("  1. 拾取    2. 放弃")
    choice = get_input("  >> 选择: ", [1, 2])
    if choice == 1:
        character.inventory.add_equipment(eq)
        print(f"  [{eq.name}] 已放入背包。")
        pause()
        return f"{source}: 拾取 {eq.name}"
    else:
        print("  放弃了装备。")
        pause()
        return f"{source}: 放弃 {eq.name}"
