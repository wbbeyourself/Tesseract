# Tesseract

Web 游戏与工具集，包含多种可直接在浏览器中游玩的小游戏及实用脚本。

## 游戏

### 贪吃蛇 (`games/snake/`)

经典贪吃蛇单机版。

- 渐进加速，得分越高速度越快
- 石头障碍物，碰撞缩小机制
- 道具系统（加速/减速/穿墙/双倍得分）
- 3 分钟倒计时 + 3 次复活机会
- 蛇身炫彩流光效果

### 双人贪吃蛇 (`games/snake-duo/`)

双人同屏对战版贪吃蛇。

- 玩家 1：WASD 方向 + 空格加速
- 玩家 2：方向键 + Enter 加速
- 生存至对方撞墙或撞身即可获胜

### 消消乐 (`games/xiaoxiaole/`)

连连看式连接消除游戏。

- 点击两个相同图标，若路径转折不超过 2 次即可消除
- 支持选中 4 个/5 个以上图标一次性消除
- 路径支持棋盘外绕行
- 死局自动检测并洗牌
- 清空棋盘即为通关
- Web Audio API 音效系统

### 五子棋 (`games/gomoku/`)

经典五子棋对战游戏。

- 人机对战 / 双人对战模式
- AI 棋力评估与策略决策
- 胜负判定与悔棋功能

### 坦克大战 (`games/tank-battle/`)

经典坦克大战游戏。

- 多关卡地图
- 音效系统
- 数据驱动的地图配置

## 工具 (`tools/`)

### api-deepseek-v4.py

批量并行调用 DeepSeek API 的脚本。

```bash
python tools/api-deepseek-v4.py --input tools/data/input.jsonl --output tools/data/output.jsonl
```

- 支持多线程并发请求
- 自动重试与错误处理
- 支持 temperature 等参数配置

### jsonl_to_md.py

将 DeepSeek 批量输出 JSONL 文件转换为美观的 Markdown 报告。

```bash
python tools/jsonl_to_md.py --input tools/data/output.jsonl --output tools/output/report.md
```

## 项目结构

```
Tesseract/
├── games/
│   ├── snake/                # 贪吃蛇（单人）
│   │   └── index.html
│   ├── snake-duo/            # 双人贪吃蛇
│   │   └── index.html
│   ├── tank-battle/         # 坦克大战
│   │   ├── index.html
│   │   ├── data/
│   │   │   └── maps.js
│   │   └── sounds/
│   │       ├── death.mp3
│   │       ├── kill.mp3
│   │       ├── 偷家.mp3
│   │       └── 过关.mp3
│   ├── gomoku/              # 五子棋
│   │   ├── index.html
│   │   └── docs/
│   │       ├── gomoku-specs-design.md
│   │       └── plans.md
│   └── xiaoxiaole/          # 消消乐
│       └── index.html
├── tools/
│   ├── api-deepseek-v4.py   # DeepSeek API 批量调用
│   ├── jsonl_to_md.py       # JSONL → Markdown 转换
│   ├── run-api.sh            # 工具运行脚本
│   ├── data/
│   │   ├── input.jsonl
│   │   └── output.jsonl
│   └── output/
│       └── report.md
├── README.md
└── .gitignore
```
