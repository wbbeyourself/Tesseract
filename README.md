# Tesseract

Web 游戏与工具集，包含多种可直接在浏览器中游玩的小游戏及实用脚本。

## 游戏

### 地牢爬塔

暗黑奇幻风格的回合制文字爬塔游戏，提供命令行版和网页版。

**特点**：3 种职业、20 层地牢、装备系统、升级机制、暗黑霓虹 UI、粒子特效、Web Audio 音效

```bash
./web/play.sh       # 网页版
python main.py      # 命令行版
```

> 环境要求：Python 3.10+

### 贪吃蛇 (snake.html)

经典贪吃蛇单机版。

- 渐进加速，得分越高速度越快
- 石头障碍物，碰撞缩小机制
- 道具系统（加速/减速/穿墙/双倍得分）
- 3 分钟倒计时 + 3 次复活机会
- 蛇身炫彩流光效果

### 双人贪吃蛇 (snake-duo.html)

双人同屏对战版贪吃蛇。

- 玩家 1：WASD 方向 + 空格加速
- 玩家 2：方向键 + Enter 加速
- 生存至对方撞墙或撞身即可获胜

### 消消乐 (xiaoxiaole.html)

连连看式连接消除游戏。

- 点击两个相同图标，若路径转折不超过 2 次即可消除
- 支持选中 4 个/5 个以上图标一次性消除
- 路径支持棋盘外绕行
- 死局自动检测并洗牌
- 清空棋盘即为通关
- Web Audio API 音效系统

## 工具

### api-deepseek-v4.py

批量并行调用 DeepSeek API 的脚本。

```bash
python api-deepseek-v4.py --input data/input.jsonl --output data/output.jsonl
```

- 支持多线程并发请求
- 自动重试与错误处理
- 支持 temperature 等参数配置

### jsonl_to_md.py

将 DeepSeek 批量输出 JSONL 文件转换为美观的 Markdown 报告。

```bash
python jsonl_to_md.py --input data/output.jsonl --output output/report.md
```

## 项目结构

```
Tesseract/
├── main.py                  # 地牢爬塔命令行版入口
├── play.sh                  # 地牢爬塔启动脚本
├── game/                    # 地牢爬塔游戏逻辑
│   ├── character.py         # 角色与职业系统
│   ├── combat.py            # 回合制战斗
│   ├── dungeon.py           # 主游戏循环
│   ├── equipment.py         # 装备与背包
│   ├── events.py            # 非战斗事件
│   ├── monsters.py          # 怪物定义
│   └── utils.py             # 输入验证与工具函数
├── web/                     # 地牢爬塔网页版
│   ├── index.html
│   ├── style.css
│   ├── play.sh
│   └── js/
│       ├── audio.js
│       ├── particles.js
│       ├── game.js
│       ├── ui.js
│       └── main.js
├── snake.html               # 贪吃蛇（单人）
├── snake-duo.html           # 双人贪吃蛇
├── xiaoxiaole.html          # 消消乐
├── api-deepseek-v4.py       # DeepSeek API 批量调用
├── jsonl_to_md.py           # JSONL → Markdown 转换
├── data/
│   ├── input.jsonl
│   └── output.jsonl
└── output/
    └── report.md
```
