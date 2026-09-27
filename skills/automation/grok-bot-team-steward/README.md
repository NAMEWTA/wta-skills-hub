# grok-bot-team-steward

这一个文件夹就是完整技能。把它放到 Grok Bot 能读到的位置（建议 `/workspace/grok-bot-team-steward/`），对管家说「安装并启用这个技能」即可。

不要把本文件夹当成团队档案。本技能是相机；照片是管家另外写出的：

```
/workspace/grok-bot-team-YYYY-MM-DD/
```

同一天第二次导出：`/workspace/grok-bot-team-YYYY-MM-DD-HHMM/`。旧目录不覆盖。

## 文件夹本身

```
grok-bot-team-steward/          ← 安装单位
├── SKILL.md                    技能入口（发现本技能只看这个文件）
├── README.md                   本文件
├── INSTALL.md                  安装与换机
├── CHEATSHEET.md
├── steward/
│   ├── STEWARD-PROFILE.md      管家 Bot 三栏
│   ├── ACTIVATE.md             激活口令
│   └── SETUP-INSTRUCTIONS.md   一份文件自安装
├── references/                 硬规则、导出、恢复、对话、脱敏、提示词
├── templates/snapshot/         快照骨架，导出时复制到 dated 目录
└── scripts/                    日期命名、校验、扫密钥
```

## 两种模式

| 你说 | 管家做 |
|---|---|
| 快照 / 备份 / 持久化 | 扫描当前团队，写 `grok-bot-team-YYYY-MM-DD/` |
| 换机初始化 / 恢复 / 读这份目录 | 读取 dated 目录，重建 Bot、技能、群聊、记忆参考、暂停态 routine |
| 对比两天 | 只报 diff，不改 Bot |

步骤见 `INSTALL.md`。口令见 `steward/ACTIVATE.md`。
