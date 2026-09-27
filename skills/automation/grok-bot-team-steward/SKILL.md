---
name: grok-bot-team-steward
description: "导出、恢复或比较 Grok Bot 团队的配置、技能、记忆与对话快照，也支持显式设置管家。仅用于 Grok Bot 团队或 grok-bot-team 快照；数据库备份、普通文件归档不适用。"
license: MIT
---

# Grok Bot 团队快照管家

技能根目录是本文件所在目录，快照是独立的数据目录。默认工作区 `/workspace`，用户明确指定其他可写工作区时优先。先判定模式，仅加载所需协议。

| 请求 | 模式与材料 |
|---|---|
| 仅激活/加载技能 | activate：读取并说明可用模式，不自动修改 profile、联系 Bot、建目录或导出 |
| 明确要求设置管家 | setup：[设置说明](steward/SETUP-INSTRUCTIONS.md)，已有管家优先复用 |
| 导出当前 Grok 团队 | snapshot：[导出协议](references/02-export-protocol.md)、[目录规范](references/01-snapshot-schema.md) |
| 从指定快照重建 | restore：[恢复协议](references/03-restore-protocol.md)、[验收](references/08-verification.md) |
| 比较两份本地快照 | diff：读取两份 MANIFEST、ROSTER 及变化资源，报告差异；不需要账号工具，不安装管家、不回写 |

## 共同边界

- 用户指令及已有授权优先于本技能默认约定；仅当目标、动作或范围尚未明确时澄清。
- 不发明 Bot、群聊、技能、routine 或对话。缺失记入 GAPS，摘要标为摘要，不能冒充原文或官方聊天历史。
- 秘密、凭据、登录态和客户敏感信息不进入快照。字段处理见 [脱敏](references/06-sanitizer.md)；扫描脚本只是辅助，不是“无秘密”的证明。
- 平台操作依赖当前可用工具和权限；不能访问时报告缺口，不编造 API 或声称已操作。
- 账号能力、文件大小和 Bot 数量限制需核对当前平台；参考中的历史数值仅用于规划。[来源与平台边界](references/09-sources.md)

## snapshot 要点

- 先只读盘点并形成花名册；范围已明确则继续，无需固定口令确认。[盘点清单](references/04-inventory.md)
- 使用 [命名脚本](scripts/snapshot-name.sh) 生成不覆盖的目录名，日期按用户时区；用户指定非默认工作区时传入该目录。
- 从 [模板](templates/snapshot/) 复制骨架，立即删掉模板 COMPLETED 并写 `meta/IN_PROGRESS.md`；模板 `_SLUG`/`_SKILL` 不是实际数据，完成前移除占位项。
- 仅在用户授权联系团队 Bot 的范围内请求自述；否则从可读数据导出并说明覆盖范围。[导出提示词](references/07-prompts.md)、[对话导出](references/05-conversations.md)
- 导出结果填写 MANIFEST、ROSTER、GAPS、DROP-LIST 和脱敏记录。收集完成后移除 IN_PROGRESS、填写真实完成时间，再运行 [快照校验](scripts/validate-snapshot.sh)；失败则恢复未完成标记并修复。

## restore 要点

- 优先用户指定快照；多份且未指定时列出完成信息供选择，不擅自合并。
- 先做只读预览，列出 Bot、技能、群聊、暂停态 routines、GAPS、DROP-LIST 和缺少的连接器。已有对该快照及创建清单的明确授权可继续；仅上传文件不等于授权重建。
- 缺连接器时停在连接步骤，报告需用户连接的项目，不索要 token 或自行发起 OAuth。
- 依次按原 PROFILE 创建或核对 Bot、安装技能、配置群聊、导入记忆参考、提供对话参考，最后建立暂停的 routines；恢复日志记录对象 ID 和状态，重试先检查已创建项，避免重复。
- routine 不继承快照的启用状态；启用属于用户另行决定。不得修改恢复清单以外的既有 routine。
- 按 [验收表](references/08-verification.md) 逐项复核，含 UNVERIFIED 时不报告全部完成。明确哪些资料无法恢复。

## 交付

报告实际模式、目录、已完成/受阻项及需要用户补充的事项。activate/diff 可直接交付读取或差异结果；无账号工具时不能宣称已在账号中启用技能。
