# 独立评估：修订版 automation 技能

## 仅据全部 7 项 frontmatter 的选择

先读取 `skills/*/*/SKILL.md` 的 YAML frontmatter，未读取模板或正文，随后冻结以下选择：

| 题 | 选择 | 依据 |
|---|---|---|
| 1 用 Herdr 查看另一个窗格输出 | herdr | 明确提及 Herdr 与窗格控制。 |
| 2 任务复杂，帮我并行实现，未提 Herdr | none | herdr 明确排除仅因后台或并行需要而启用；其他六项无匹配。 |
| 3 给当前 Grok Bot 团队备份 | grok-bot-team-steward | 导出 Grok Bot 团队配置、技能、记忆与对话。 |
| 4 对比两份 grok-bot-team dated 目录 | grok-bot-team-steward | 明确覆盖快照比较。 |
| 5 备份 Postgres 数据库 | none | Grok skill 明确排除数据库备份。 |
| 6 激活 grok-bot-team-steward，暂不导出 | grok-bot-team-steward | 明确支持显式设置管家。 |

以上是模拟路由决策；实际执行仅为文件读取与本报告写入。

## 场景评估（A–G）

### A — HERDR_ENV 缺失，请求读取另一个窗格

- 动作：首先执行 `test "${HERDR_ENV:-}" = 1`，失败即停止；不运行 `herdr --help`、pane read 或通过 UI 焦点绕行。向用户报告当前环境不是符合技能要求的 Herdr 托管窗格，需要在 `HERDR_ENV=1` 的托管窗格重新执行读取。不能通过自行设置变量伪造环境。
- 结果：拒绝从外部继续读窗格；没有窗格输出，不能报告已读取。
- 依据：`automation/herdr/SKILL.md` 首段“失败即停止，不从外部访问 UI 当前聚焦会话”。
- 实际执行：在独立子进程用 `env -u HERDR_ENV bash -c 'test "${HERDR_ENV:-}" = 1'` 实测，退出码 1、无输出。没有执行任何 Herdr CLI。后续停止/用户说明为模拟。
- 最短读取轨迹：frontmatter → herdr/SKILL.md → 环境前置检查失败即止；本次为覆盖其他题额外读取的资源，不是 A 必需。

### B — prompt 已发送，但 wait timeout

- 动作：对已确认的目标执行 `herdr agent get <实际在线唯一名称或pane-ID>` 与 `herdr agent read <同一目标> --source recent-unwrapped --lines 120`。若仍 working，继续有界等待并汇报进行中；若 blocked，先读具体问题，按既有授权处理，遇到新增权限或重要决定才交回用户；若 idle/done，核对输出是否对应本任务及验收条件。unknown 或没有完整结果时不宣称完成。
- 不盲目重发 prompt、不用 pane send 补 Enter、不取消目标现有工作；超时不能证明原 prompt 未送达。输出确实因 alternate screen 截断后才请求目标将完整结果写临时文件。
- 结果：timeout 被视为等待未得到证明，而非任务提交失败；实际是否完成取决于下一步状态和内容。
- 依据：herdr/SKILL.md“prompt 超时或 stalled 时先 agent get/read”；references/agents.md 明确描述 timeout 覆盖提交时间、wait 跟踪生命周期而非某一轮；references/panes.md 说明 alternate-screen 兜底。
- 实际执行/模拟：完全模拟；没有发送、读取或等待真实智能体。
- 最短读取轨迹：herdr 正文 → agents.md；仅遇输出截断时读 panes.md。

### C — 既定 WTA Herdr 环境，用户要求受限模式启动 Codex

- 动作：先验证环境，再查询安装版本的 `herdr --help` 和任务相关 agent/pane 帮助，并核对原生 Codex 支持的受限参数。发现当前 workspace、pane 和 agent 状态；优先使用现有空闲 shell 窗格，否则按布局在当前 tab 拆兄弟窗格，保留 cwd 和焦点：`herdr pane split --current --direction <按布局确定> --cwd "$PWD" --no-focus`。从响应取 pane ID，使用唯一在线名称启动 `herdr agent start <唯一名称> --kind codex --pane <返回ID> -- <经本机帮助确认的受限参数>`。待 idle 后才提交工作。
- 受限模式明确覆盖 WTA 默认；不使用 `--dangerously-bypass-approvals-and-sandbox`。用户未细化限制时可选择安装版本支持的保守只读模式，不凭空宣布某组参数已被当前版本验证。遇 blocked 不为消除它扩大权限。
- 结果：应得到受限 Codex，且保留原 cwd/tab/焦点；启动成功也需确认智能体身份和可交互状态。
- 依据：正文 WTA 段“用户指定受限/审批模式时优先遵从，且不得突破当前宿主权限”；agents.md 同样限定示例是完全授权环境；cli-and-targets.md 要求安装二进制为语法权威、返回 ID 为准。
- 实际执行/模拟：完全模拟；本评估禁止真实 Herdr，不执行 help、split 或 start，因此具体安装版本和受限 flags 未验证。
- 最短读取轨迹：herdr 正文 → agents.md → cli-and-targets.md。

### D — 仅激活 Grok 技能

- 动作：在当前会话读取技能，并说明模式：activate（加载）、setup（设置管家）、snapshot（导出）、restore（恢复）、diff（本地比较）。可交付：“已加载此技能供当前会话使用；可按需设置管家、导出、恢复或比较快照。尚未在 Grok 账号中启用或修改任何对象。”
- 结果：加载说明即完成。无 profile 修改、联系 Bot、建快照目录、自动导出；不用加载 setup/export 协议。
- 依据：Grok 正文模式表 activate 行；交付段明确“无账号工具时不能宣称已在账号中启用技能”。
- 实际执行/模拟：技能正文实际已读取；对用户的激活回复是场景模拟。没有账号操作。报告和测试目录是本次评估授权产物，不是 activate 自行建立的快照。
- 最短读取轨迹：grok-bot-team-steward/SKILL.md 即足够。

### E — 只比较两份快照，无账号工具

- 动作：读取用户指定两份 dated 目录的 MANIFEST.md 与 ROSTER.md，按二者差异定位、读取变更 Bot PROFILE、技能、routines、记忆、对话等资源。输出新增/删除/修改项，并把缺文件、不可读或清单覆盖不足标为不确定；仅在比较所需时读取 GAPS/完成状态以说明可靠性。不安装管家、不查账号、不写回。
- 结果：没有账号工具不构成阻塞，可完成本地 diff；没有给定实际两份目录时不能编造差异。
- 依据：正文模式表 diff 行明确“读取两份 MANIFEST、ROSTER 及变化资源”“不需要账号工具，不安装管家、不回写”。
- 实际执行/模拟：模拟流程；父任务未给两份实际快照，本次没有运行 diff，也没有声称完成特定快照比较。
- 最短读取轨迹：Grok 正文 → 两份 MANIFEST/ROSTER → 变化资源；不读 SETUP 或 restore 协议。

### F — 恢复快照，缺连接器，routines 已启用

- 动作：只读预览指定快照，列 Bot/技能/群聊/routines（目标状态均暂停）、GAPS、DROP-LIST、缺少的连接器。已有覆盖快照与具名清单的授权可沿用；仅上传文件不视为创建授权。缺连接器时停在连接步骤，列明待用户连接项目，不索取 token、不启动 OAuth、不继续创建团队。
- 若“已启用”指快照记录：不继承该状态；连接完成且授权充分后，按协议创建/核对 Bot → 技能 → 群聊 → 记忆/对话 → 暂停 routines，读回确认暂停。若指目标账号既有 routine：先标记其是否在恢复清单内；不更改清单外 routine，在连接未满足阶段也不擅自批量暂停现有对象。续作时先查恢复日志和已有 ID，避免重复创建；对恢复清单内的目标按授权确保暂停并验收。
- 结果：当前为连接器阻塞，不能报告“重建完成”；启用 routines 需要另行决定，不 Test run。验收存在 UNVERIFIED 时明确未完成。
- 依据：Grok 正文 restore 要点；03-restore-protocol.md 阶段顺序“只读预览 → 等人连插件 → 建空白 Bot”；08-verification.md 的 routine 暂停和无 UNVERIFIED 要求。
- 实际执行/模拟：完全模拟；没有查询真实账号、连接插件、联系 Bot 或修改 routine。
- 最短读取轨迹：Grok 正文 → 03-restore-protocol.md → 08-verification.md → 实际指定快照所需资源（本次未提供）。

### G — 模板快照只有 bots/_SLUG，缺 meta/COMPLETED.md

- 动作：将原模板完整复制到隔离临时 dated 目录，仅在副本删除 meta/COMPLETED.md，保持 bots 下唯一项 _SLUG；调用仓库原有 validate-snapshot.sh，不改脚本。
- 实际目录：`/tmp/wta-revised-automation-k9vqaldk/grok-bot-team-2026-09-27`。
- 实际命令：`bash /srv/wta-skills-hub/skills/automation/grok-bot-team-steward/scripts/validate-snapshot.sh /tmp/wta-revised-automation-k9vqaldk/grok-bot-team-2026-09-27`。
- 实际结果：退出码 **1**；stdout 如下，stderr 为空：

```text
FAIL missing meta/COMPLETED.md
FAIL placeholder bot _SLUG
FAIL no real bot slugs
```

- 判定：正确拒绝模板目录，不能宣称有效完成快照或开始恢复。真实导出应标 IN_PROGRESS、采集真实 Bot 数据并清理模板占位，内容与脱敏验收后写真实完成标记再校验；不能仅伪造 COMPLETED 让测试通过。
- 依据：Grok snapshot 要点；08-verification.md 要求完成标记、无占位、至少一个真实 Bot；原脚本同时检测以上三项。
- 实际执行/模拟：复制、删除副本完成标记与运行校验均真实执行；真实导出修复步骤仅模拟。仓库没有任何写入。
- 最短读取轨迹：Grok 正文 → 08-verification.md → validate-snapshot.sh → 复制模板目录（未读取模板技能正文）→ 运行脚本。

## 阅读轨迹与边界

实际顺序：

1. `rg --files` 列出路径，随后用 `Path.glob('*/*/SKILL.md')` 仅读全部 7 个 YAML frontmatter，未读 templates 中 SKILL.md；冻结 1–6 的选择并先写报告。
2. 读取 `automation/herdr/SKILL.md` 与 `automation/grok-bot-team-steward/SKILL.md` 正文。
3. 仅补读 Herdr 的 `references/agents.md`、`panes.md`、`cli-and-targets.md`，Grok 的 `references/03-restore-protocol.md`、`08-verification.md` 与 `scripts/validate-snapshot.sh`。
4. 在去除 HERDR_ENV 的独立进程测试环境门禁；复制原 snapshot 模板到 /tmp，运行原校验脚本。

未读其他五项技能正文、SETUP-INSTRUCTIONS、导出协议、模板中的技能正文；未访问真实 Herdr/Grok 服务。文件写入仅发生于 /tmp。

## 发现的文案歧义

Herdr 正文要求 blocked 时“依据现有授权处理；新的权限或重要决定交回用户”，但 agents.md 仍写“先查看 blocked UI，问过用户再回答”，后者字面上会引出不必要的再次询问。应按用户既有授权优先及正文适用范围解释，且实际区分新权限/重大决定；建议将 references/agents.md 对齐正文，消除执行者歧义。除此之外，本组题目在已检查范围内能得到清晰的模式路由、停止边界和模板拒绝结果。

## Revision 2 — Herdr B/C 与 blocked 授权分支重测

本节追加保留初次报告；初次“文案歧义”反映修订前状态，现已解决。此次只读技能文件，无任何真实 Herdr 操作。

### B 重测：prompt 已发送，wait timeout

- 模拟动作：使用已确认目标先 `agent get`、`agent read`；working 则继续有界等待，idle/done 则核验本任务输出，blocked 则按下述授权分支处理，unknown 不算完成。不盲目重发 prompt，不把 timeout 当作未送达证据。
- 结果：通过。修订没有改变提交与等待的语义，正文与 agents.md 一致；仍不会因超时引发重复任务。
- 依据：SKILL.md 的“prompt 超时或 stalled 时先 agent get/read”；agents.md 第 47 行和末段明确超时包含提交时间、生命周期等待不能保证对应某一轮、不要盲目重提。

### C 重测：既定 WTA 环境要求受限 Codex

- 模拟动作：确认 HERDR_ENV=1 和当前 CLI 支持参数；保留当前 cwd/tab/焦点，按布局选可用 shell 或拆兄弟 pane，从响应取 ID；将本机帮助确认的受限 Codex 参数置于 `agent start ... --` 后。不要使用 bypass 标志，不为消除 blocked 扩大权限；启动阻塞按实际 UI 和授权范围处理，等待可输入后才 prompt。
- 结果：通过。正文、agents.md 开头的示例限定，以及 safety.md 第 14 行都显式说明用户要求受限模式优先；重复出现的 bypass 命令是同段既定 WTA 完全授权示例，不能覆盖用户受限要求。
- 限制：未调用真实 CLI，因此具体安装版本及受限 flags 未实际验证；本项结论为规则执行模拟。

### blocked 分支一致性

| 情况 | 模拟动作与结果 | 是否矛盾 |
|---|---|---|
| UI 请求执行的动作已在用户授权的相同对象、范围、权限内 | 先读 UI；依据现有授权处理该项，处理后读回状态与输出，不要求用户重复授权。示例：用户已明确授权同一工作树的同一测试命令，UI 仅确认执行该命令，且不存在宿主权限禁令。 | 无。正文“依据现有授权处理”与 agents.md“已授权的同一范围内可按现有授权处理”完全对齐。 |
| UI 请求新增权限或超范围重要选择 | 先读 UI 并准确说明请求；保留 blocked，交回用户决定，不代答同意、不以完全绕过模式重启。示例：受限模式下要求扩大目录访问或关闭沙箱。 | 无。正文“新的权限或重要决定交回用户”与 agents.md“新增权限或重要选择才询问用户”对齐。 |
| UI 请求突破当前宿主禁止的权限 | 不执行被禁止的权限扩大；说明限制。用户确认也不能覆盖更高层宿主约束。 | 无。SKILL.md 明确不得突破当前宿主权限。 |

修订后的关键原文（agents.md 第 45 行）：

> 先查看 blocked UI；已授权的同一范围内可按现有授权处理，新增权限或重要选择才询问用户。

读取轨迹：重读 herdr/SKILL.md 与 references/agents.md → 对 herdr 子树运行仅涉及 blocked/授权/审批/受限/权限等关键词的 rg 检查 → 读取 references/safety.md 核对其完整上下文。未重跑 G，未访问真实服务，实际写入仅为本报告追加。

Revision 2 结论：原 B/C 保持通过；初评指出的 blocked 再次确认歧义已消除，已有授权与新增权限两分支未发现矛盾。
