# INSTALL

本文件夹就是技能。安装目标路径：

```
/workspace/grok-bot-team-steward/
├── SKILL.md
├── README.md
├── INSTALL.md
├── steward/
├── references/
├── templates/
└── scripts/
```

解压 zip 后如果多了一层同名目录，把内层 `grok-bot-team-steward/` 整夹放到 `/workspace/`。管家必须能直接打开：

```
/workspace/grok-bot-team-steward/SKILL.md
```

## 当前账号：第一次快照

1. 创建 Bot，Name=`管家`，Title=`Grok Bot 团队管家`。Description 用 `steward/STEWARD-PROFILE.md` 里那一整段。
2. 把本技能夹放到 `/workspace/grok-bot-team-steward/`。
3. 把 `steward/ACTIVATE.md` 的「当前机器」整段发给管家。也可以直接发 `steward/SETUP-INSTRUCTIONS.md`。
4. 核对它列出的花名册，回复可以落盘。
5. 等它写出 `/workspace/grok-bot-team-YYYY-MM-DD/`。
6. 把 dated 目录推私有 Git 或下载。技能夹可以一起带走，但团队真相源是 dated 目录。

同一天再备一次，目录变成 `grok-bot-team-YYYY-MM-DD-HHMM`，旧目录不动。

## 新账号：按快照初始化

1. 登录 Grok Bot。
2. 上传 dated 目录到 `/workspace/grok-bot-team-YYYY-MM-DD/`，不要改名。
3. 上传本技能夹到 `/workspace/grok-bot-team-steward/`。
4. 创建同样的「管家」，贴同一段 Description。
5. 按快照里的 `connectors.md` 在 Settings → Plugins 连接插件。登录态带不走。
6. 把 `steward/ACTIVATE.md` 的「新机器」那段发给管家。
7. 看预览，回复「按这份建」。
8. 按快照内 `RESTORE.md` 勾验收。routine 保持暂停，两次成功试跑后再启用。

快照里自带 `INIT.md` 和 `RESTORE.md`。万一技能夹没一起传，管家仍可按目录自己的说明书建队。

## 装进 Settings → Plugins → Yours

1. 打开本夹 `SKILL.md`。
2. 新建私有技能，名称必须是 `grok-bot-team-steward`。
3. 正文粘贴 SKILL.md（含 frontmatter）。
4. 对管家启用。
5. 告诉管家：references / templates / steward 在 `/workspace/grok-bot-team-steward/`，按需去读，不要一次性全塞进上下文。

没有图形界面保存技能时，把 `SKILL.md` 当本轮说明书贴给管家也可以跑。下一轮还要再贴，所以优先保存成技能。

## Git

技能夹和 dated 快照建议分目录或分 tag：

```
git add grok-bot-team-steward
git add grok-bot-team-2026-09-16
```

提交前可跑 `scripts/scrub.sh`。不要提交 `.env`、cookie、浏览器 profile、`auth.json`。
