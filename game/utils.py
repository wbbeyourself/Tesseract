import time
import random


def get_input(prompt: str, valid_choices: list[int]) -> int:
    """Get validated integer input from user. Loops until a valid choice is made."""
    while True:
        try:
            raw = input(prompt).strip()
            value = int(raw)
            if value in valid_choices:
                return value
            else:
                print(f"  [!] 输入错误，请输入 {valid_choices} 中的一个数字")
        except (ValueError, EOFError):
            print(f"  [!] 输入错误，请重新选择")


def pause(low: float = 0.5, high: float = 1.0) -> None:
    """Sleep a random amount between low and high seconds."""
    time.sleep(random.uniform(low, high))


def short_pause() -> None:
    pause(0.3, 0.6)


def divider(char: str = "─", width: int = 45) -> None:
    print(char * width)


def header(title: str, width: int = 45) -> None:
    divider("═", width)
    print(f"  {title}")
    divider("─", width)


def section(title: str, width: int = 45) -> None:
    divider("─", width)
    print(f"  {title}")
    divider("─", width)
