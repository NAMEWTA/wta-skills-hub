# 导出协议（snapshot）

## 阶段

```
盘点 → 命名目录 → 建骨架 → 逐 Bot 自述 → 对话落盘 → 共享层 → 脱敏 → MANIFEST → 汇报
```

中途崩溃：保留 `meta/IN_PROGRESS.md`，下一轮从该文件记录的「已完成 slug」续跑，不另开日期目录，除非用户要求新快照。

## 盘点

1. 列出本账号全部可见 Bot（含隐藏的，如果能看到）
2. 列出群聊与成员
3. 列出 Settings → Plugins → Yours 里能枚举的技能
4. 列出 `/workspace` 顶层目录
5. 写成 ROSTER 草稿给用户看一眼——用户说「漏了 X / 不要 Y」以用户为准

## 让 Bot 自述（首选）

对每个 slug 发送 `references/07-prompts.md` 里的「单 Bot 自述导出」，并把目标绝对路径写进提示词。

超时或拒绝：

- 再催一次，缩短为只要 PROFILE + routines 名称
- 仍失败则 steward 代写能看到的部分，GAPS.md 标记

不要让两个 Bot 同时写同一个文件。

## 管家自己写的部分

- CHARTER / ORG / rooms / connectors / workspace-map / MANIFEST / 根 GAPS / DROP-LIST
- 某个 Bot 确认无法访问自己的 memory-log 时，管家能读到什么就写什么

## 工作区文件

`shared/workspace-map.md` 记录路径、是否已复制进快照、体积。

默认复制：

- 各 Bot 家目录里的非密钥文件
- `/workspace/skills` 下的技能包
- 用户点名的项目目录

默认不复制：

- `node_modules`、浏览器 profile、`.git` 对象过大时只记 remote URL
- 任何匹配脱敏规则的文件

## 结束

1. 脱敏扫描
2. 写 MANIFEST
3. 删 IN_PROGRESS，写 COMPLETED
4. 问用户：推私有 Git，还是拆 zip
