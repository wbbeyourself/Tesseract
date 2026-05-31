"""
Combat system — turn-based battle loop between Character and Monster.
Returns True if character wins, False if character dies.
"""
from .character import Character
from .monsters  import Monster
from .utils     import get_input, pause, short_pause, divider, header, section


POTION_HEAL = 50


def run_combat(character: Character, monster: Monster, floor: int) -> bool:
    """
    Execute a full combat encounter.
    Returns True  → character victorious.
    Returns False → character defeated (game over).
    """
    header(f"战斗开始！第 {floor} 层")
    print(f"  遭遇了 ——")
    monster.show()
    divider()
    pause()

    while character.is_alive and monster.is_alive:
        _print_battle_status(character, monster)

        # Build available choices
        choices = [1, 2]
        labels  = ["1. 攻击", "2. 防御"]
        if character.inventory.has_potion():
            choices.append(3)
            labels.append(f"3. 使用药水 (x{character.inventory.potions})")

        print("  " + "  ".join(labels))
        choice = get_input("  >> 选择行动: ", choices)

        defending = False

        if choice == 1:
            # Player attacks
            raw_dmg, is_crit = character.deal_damage()
            dealt = monster.take_damage(raw_dmg)  # monster.take_damage deducts defense
            crit_text = "  *** 暴击！***" if is_crit else ""
            print(f"  你对 [{monster.name}] 造成了 {dealt} 点伤害！{crit_text}")
            if not monster.is_alive:
                short_pause()
                print(f"  [{monster.name}] 被击败了！")
                break

        elif choice == 2:
            # Defend this round
            defending = True
            print("  你摆出防御姿态…")

        elif choice == 3:
            # Use potion
            healed = character.use_potion()
            if healed is not None:
                print(f"  使用药水，恢复了 {healed} 点血量！(HP: {character.hp}/{character.max_hp})")
            else:
                print("  背包里没有药水！")

        # Monster counter-attack
        if monster.is_alive:
            pause(0.4, 0.8)
            raw_incoming = monster.attack
            if defending:
                # 50 % damage reduction; guaranteed minimum 1
                reduced = max(1, raw_incoming // 2)
                actual  = character.take_damage(reduced - character.defense)
                print(f"  [{monster.name}] 攻击你，防御减伤后受到 {actual} 点伤害。"
                      f"(HP: {character.hp}/{character.max_hp})")
            else:
                actual = character.take_damage(raw_incoming - character.defense)
                print(f"  [{monster.name}] 攻击你，造成 {actual} 点伤害。"
                      f"(HP: {character.hp}/{character.max_hp})")

        short_pause()

    divider()
    if character.is_alive:
        return True
    else:
        print("  你在战斗中倒下了…")
        return False


def _print_battle_status(character: Character, monster: Monster) -> None:
    divider()
    print(f"  你: HP {character.hp}/{character.max_hp}  "
          f"攻击 {character.attack}  防御 {character.defense}")
    print(f"  [{monster.name}]: HP {monster.hp}  "
          f"攻击 {monster.attack}  防御 {monster.defense}")
    divider()
