"""
Main game loop — manages floor progression, menus, and overall game state.
"""
import random
import sys
from .character import Character, CLASS_DEFINITIONS
from .monsters  import spawn_monster
from .combat    import run_combat
from .events    import event_treasure, event_random, offer_combat_drop
from .utils     import get_input, pause, short_pause, divider, header, section

TOTAL_FLOORS     = 20
COMBAT_DROP_RATE = 0.15   # 15 % chance of equipment drop after combat win
GOLD_PER_FLOOR   = 10     # base gold = floor * GOLD_PER_FLOOR


# ── Entry point ───────────────────────────────────────────────────────────────

def start_game() -> None:
    header("地牢爬塔")
    print("  欢迎来到地牢！能否登顶，就看你的了。")
    divider()

    choices = [1, 2]
    print("  1. 创建角色")
    print("  2. 退出游戏")
    choice = get_input("  >> 选择: ", choices)
    if choice == 2:
        print("  再见！")
        sys.exit(0)

    character = _create_character()
    _game_loop(character)


# ── Character creation ────────────────────────────────────────────────────────

def _create_character() -> Character:
    header("创建角色")
    name = _input_name()

    print("  选择职业：")
    divider()
    for class_name, defn in CLASS_DEFINITIONS.items():
        idx = defn["index"]
        print(f"  {idx}. {class_name} — {defn['desc']}")
        print(f"     HP:{defn['base_hp']}  攻击:{defn['base_attack']}  "
              f"防御:{defn['base_defense']}", end="")
        if defn["crit_chance"]:
            print(f"  暴击:{int(defn['crit_chance']*100)}%", end="")
        print()
    divider()

    class_map = {defn["index"]: name for name, defn in CLASS_DEFINITIONS.items()}
    idx = get_input("  >> 选择职业: ", list(class_map.keys()))
    class_name = class_map[idx]

    character = Character(name=name, class_name=class_name)
    print(f"\n  角色创建成功！{name} — {class_name}")
    pause()
    return character


def _input_name() -> str:
    """Get a non-empty name from the player."""
    while True:
        raw = input("  输入角色名称: ").strip()
        if raw:
            return raw
        print("  [!] 名称不能为空，请重新输入")


# ── Main game loop ────────────────────────────────────────────────────────────

def _game_loop(character: Character) -> None:
    event_log: list[str] = []   # accumulated summary for end screen

    for floor in range(1, TOTAL_FLOORS + 1):
        # Reset per-floor temporary effects
        character.temp_def_penalty = 0

        # Floor lobby menu
        if not _floor_lobby(character, floor):
            # Player chose to quit
            _show_summary(character, floor - 1, event_log, quit_early=True)
            return

        # Roll event for this floor
        event_type = random.choice(["monster", "treasure", "random"])
        result = _run_floor_event(character, floor, event_type)
        event_log.append(f"第{floor}层: {result}")

        if not character.is_alive:
            _show_summary(character, floor, event_log, won=False)
            return

        # Floor cleared
        character.floors_beaten += 1
        print(f"  第 {floor} 层通过！")
        pause()

        # Level-up check
        if character.floors_beaten % 3 == 0:
            levelled = character.try_level_up()
            if levelled:
                print(f"  *** 等级提升！你现在是 {character.class_name} Lv.{character.level} ***")
                print(f"      HP已回满: {character.hp}/{character.max_hp}")
                print(f"      攻击: {character.attack}  防御: {character.defense}")
                pause()

        if floor == TOTAL_FLOORS:
            _show_summary(character, floor, event_log, won=True)
            return


# ── Floor lobby ───────────────────────────────────────────────────────────────

def _floor_lobby(character: Character, floor: int) -> bool:
    """
    Show pre-floor menu. Returns False if the player wants to quit.
    """
    while True:
        header(f"第 {floor} 层 / {TOTAL_FLOORS} 层")
        print(f"  {character.name} | {character.class_name} Lv.{character.level} | "
              f"HP {character.hp}/{character.max_hp} | 金币 {character.gold}")
        divider()
        print("  1. 进入本层")
        print("  2. 查看状态")
        print("  3. 查看背包 / 装备")
        print("  4. 退出游戏")
        choice = get_input("  >> 选择: ", [1, 2, 3, 4])

        if choice == 1:
            return True
        elif choice == 2:
            _show_status(character)
        elif choice == 3:
            _show_bag_menu(character)
        else:
            print("  确认退出游戏？(1. 确认  2. 取消)")
            if get_input("  >> ", [1, 2]) == 1:
                return False


def _show_status(character: Character) -> None:
    section("角色状态")
    character.show_status()
    divider()
    short_pause()


# ── Bag & equip menu ──────────────────────────────────────────────────────────

def _show_bag_menu(character: Character) -> None:
    while True:
        section("背包 / 装备管理")
        character.inventory.show()
        divider()

        bag = character.inventory.equipment
        options = [1]   # 1 = back
        print("  1. 返回")
        if bag:
            print("  2. 装备物品")
            options.append(2)

        choice = get_input("  >> 选择: ", options)
        if choice == 1:
            break
        elif choice == 2:
            _equip_menu(character)


def _equip_menu(character: Character) -> None:
    bag = character.inventory.equipment
    if not bag:
        print("  背包为空，没有可装备的物品。")
        short_pause()
        return

    section("选择要装备的物品")
    for i, eq in enumerate(bag, 1):
        print(f"  {i}. {eq.display()}")
    back = len(bag) + 1
    print(f"  {back}. 返回")

    choice = get_input("  >> 选择: ", list(range(1, back + 1)))
    if choice == back:
        return

    selected = bag[choice - 1]
    old = character.inventory.equip(selected)
    print(f"  装备了 {selected.name}！")
    if old:
        print(f"  旧装备 [{old.name}] 已放回背包。")
        character.inventory.add_equipment(old)
    pause()


# ── Floor event dispatch ──────────────────────────────────────────────────────

def _run_floor_event(character: Character, floor: int, event_type: str) -> str:
    """
    Dispatch to the correct event handler. Returns a log string.
    """
    if event_type == "monster":
        return _run_monster_event(character, floor)
    elif event_type == "treasure":
        return event_treasure(character, floor)
    else:
        return event_random(character, floor)


def _run_monster_event(character: Character, floor: int) -> str:
    monster = spawn_monster(floor)
    won = run_combat(character, monster, floor)

    if won:
        # Gold reward
        gold_reward = floor * GOLD_PER_FLOOR
        character.gold += gold_reward
        print(f"  获得金币 {gold_reward}！(当前: {character.gold})")
        pause()

        # Equipment drop
        if random.random() < COMBAT_DROP_RATE:
            log = offer_combat_drop(character, floor)
            return f"击败{monster.name}，{log}，+{gold_reward}金"
        return f"击败{monster.name}，+{gold_reward}金"
    else:
        return f"败于{monster.name}"


# ── End screen ────────────────────────────────────────────────────────────────

def _show_summary(
    character: Character,
    floor: int,
    event_log: list[str],
    won: bool = False,
    quit_early: bool = False,
) -> None:
    divider("═")
    if won:
        print("  *** 恭喜通关！你成为地牢霸主 ***")
    elif quit_early:
        print("  你选择离开地牢。")
    else:
        print(f"  你倒在了第 {floor} 层…")
    divider("─")
    print(f"  职业: {character.class_name}  等级: {character.level}")
    print(f"  到达层数: {floor} / {TOTAL_FLOORS}")
    print(f"  最终金币: {character.gold}")
    divider("─")

    # Equipped gear
    inv = character.inventory
    if inv.equipped_weapon or inv.equipped_armor:
        print("  已装备:")
        if inv.equipped_weapon:
            print(f"    武器: {inv.equipped_weapon.display()}")
        if inv.equipped_armor:
            print(f"    防具: {inv.equipped_armor.display()}")
    else:
        print("  没有装备任何物品。")

    # Bag items
    if inv.equipment:
        print(f"  背包物品 ({len(inv.equipment)} 件):")
        for eq in inv.equipment:
            print(f"    {eq.display()}")

    divider("─")
    print("  本次探索记录:")
    for entry in event_log[-10:]:    # show last 10 events to avoid clutter
        print(f"    {entry}")
    if len(event_log) > 10:
        print(f"    …（共 {len(event_log)} 层）")
    divider("═")
