# 硬规则

本文件是技能的法律层。与 SKILL.md 冲突时以本文件为准。

## 目录与命名

- 快照只允许叫 `grok-bot-team-YYYY-MM-DD` 或同日第二次的 `grok-bot-team-YYYY-MM-DD-HHMM`
- 根路径：`/workspace/grok-bot-team-YYYY-MM-DD/`
- 禁止写进技能包目录内部冒充快照
- 禁止覆盖已有 dated 目录
- 禁止把多个日期混在一个目录里

## 真实性

- 不发明 Bot、群、技能、routine
- 不编造对话
- 推断必须标记 `source: steward-inferred`，并在 GAPS.md 出现
- PROFILE 的 name / title / description 恢复时逐字粘贴，禁止润色

## 敏感信息

写入前删除或改写：

- `apiKey` `token` `refresh_token` `bearer` `sk-` `xoxb-` `ghp_` `AKIA`
- `.env` `auth.json` `credentials` `cookie` `set-cookie`
- 含 `user:pass@` 的 URL
- 可直接定位到个人的邮箱、电话、地址、身份证、银行卡（CHARTER 允许保留的工作邮箱域名除外，且只保留域名）
- 客户名单、合同金额原文（改成「[REDACTED-CUSTOMER]」）

connectors.md 只保留：连接器名字、用途、需要它的 Bot、Settings → Plugins 重连步骤。

Share 链接写入前必须先扫 description / skills / routines。链接本身是公开的。

## 官方能力边界（按 docs.x.ai 2026-09）

- Duplicate / Share 复制：profile、settings、enabled skills、routines、avatar
- Duplicate / Share 不复制：对话、learned memory、附件、云电脑、登录态
- Skills 账号级可复用，Routines 属于单个 Bot，每 Bot 最多 50 条
- 账号最多约 50 个 Bot + 群聊合计
- 所有 Bot 共享一台电脑，Bot 不是安全边界
- 官方顺序：任务 → 技能 → routine；恢复时 routine 必须暂停待确认
- 附件约 25MB；更大就拆包或 Git

## 恢复主路径

空白 Bot + PROFILE.md。不要把 Duplicate 当主路径。Share 链接只作 PROFILE 缺失时的备选。

## 完成标准

没有 MANIFEST 对照表、没有 DROP LIST、没有 GAPS，就不能说完成。
