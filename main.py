#!/usr/bin/env python3
"""
地牢爬塔 — 命令行文字RPG
运行方式: python main.py
Python 版本要求: 3.10+
"""
from game.dungeon import start_game

if __name__ == "__main__":
    try:
        start_game()
    except KeyboardInterrupt:
        print("\n\n  游戏已退出。")
