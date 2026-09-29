# Skill 创建、优化与迭代方法

检索与核对日期：2026-09-26 至 2026-09-27。研究覆盖 OpenAI 官方资料、Agent Skills 规范、GitHub 官方仓库及公开可检索的 X 讨论；不声称穷尽互联网内容。

## 采用的方法

| 方法 | 在本项目中的应用 | 来源 |
|---|---|---|
| 从真实任务和失败出发 | 保留已有平台知识、团队约定，优先修正基线暴露的缺陷 | [Agent Skills 最佳实践](https://agentskills.io/skill-creation/best-practices) |
| 描述专注触发条件 | 区分 Gitea/GitHub、开发与编辑器配置、Windows 清理与跨平台时区及区域 | [OpenAI 技能指南](https://learn.chatgpt.com/docs/build-skills) |
| 分层加载 | Herdr 操作细节分任务存放；Grok 按 activate/setup/snapshot/restore/diff 选择流程 | [OpenAI 关于技能上下文的建议](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) |
| 指令精度匹配任务风险 | 开放式任务保留判断空间；分页、快照校验、权限和活动运行时保护使用明确约束 | [openai/skills 的 skill-creator](https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md) |
| 评估后迭代 | 固定选择与行为样例，独立评估新旧版本，实际脚本结果与推演分开记录 | [OpenAI Skills Evals](https://developers.openai.com/blog/eval-skills)、[Anthropic skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) |
| 遵守开放结构 | YAML 元数据、技能名与目录一致，脚本/资源随技能独立安装 | [Agent Skills 规范](https://agentskills.io/specification) |

X 检索发现 [Dominik Kundel 关于 Skills/MCP 配合的帖子](https://x.com/dkundel/status/2018436269907603590) 与 [Axiom 关于 eval skill 的帖子](https://x.com/AxiomFM/status/2032110416625877465)。搜索索引返回了正文摘录，但直接打开失败；因此仅作为研究线索，未将社交帖中的效果宣称作为本项目的验收依据。

没有套用所有技能都必须同样长、每次都读全部参考、每个动作都重新批准、所有任务都强制子智能体等规则。技能提供可复用的领域知识，并承接用户当前意图及已有授权。

## 分类及安装事实

`skills/<category>/<name>` 采用五个分类：coding、system、automation、design、writing。design 用于照片编辑与视觉创意；分类不进入 skill name，安装选择参数继续兼容。

锁定的 [Vercel Skills v1.5.26 发现实现](https://github.com/vercel-labs/skills/blob/v1.5.26/src/skills.ts) 会遍历分类容器，并在发现技能包后停止向内扫描。本项目发现逻辑对齐此边界，避免模板里的 SKILL.md 成为独立技能。

[skills.sh 分组 schema](https://skills.sh/schemas/skills.sh.schema.json) 要求每组至少一个技能，因此 writing 只预留目录和展示说明，不写空 groupings 项。仓库目录校验与网站分组同步校验，但分组文件不改变安装参数。

## 本轮改造依据

- GitHub：权限诊断中的写探针与只读请求冲突，改用只读信息及实际授权操作的错误响应。布尔 API 字段使用 `-F`；90 天恢复存在条件，不能保证。[gh api](https://cli.github.com/manual/gh_api)、[仓库恢复条件](https://docs.github.com/en/repositories/creating-and-managing-repositories/restoring-a-deleted-repository)
- Gitea：原标签名称解析只读 50 项，在 65 标签模拟场景失败；改为全量分页。后续独立评估又复现服务端较小分页上限造成早停，修正为取到空页、拒绝重复页，并移除静默 200 页截断。
- VS Code：默认 Profile 不要求 userDataProfiles 条目；settings 是 JSONC，需保留注释和用户键；Remote 扩展同步有独立限制。[Profiles](https://code.visualstudio.com/docs/configure/profiles)、[JSONC](https://code.visualstudio.com/Docs/languages/json)
- 系统技能：明确支持的平台与授权字段，保留原输入法和已有回滚记录；候选 NTP 源失败不等于全局同步失败。
- 自动化技能：保留 Herdr 真实状态/目标语义与既定团队启动参数；明确 Grok 激活和本地 diff 的范围；结构脚本拒绝占位 Bot 与不完整完成标记。

环境要求放在正文，元数据使用各消费方共同支持的字段；本机 skill-creator 的 quick_validate 尚不接受规范中可选的 compatibility 字段，移入正文后七项均通过校验。

## 后续迭代

新技能从具体重复任务和样例开始；描述决定何时选用，正文决定怎么做，脚本负责确需确定性的操作。出现真实失败时先加入可观察场景，再做小范围修正，复测关联场景。新平台须补相应来源和实际或模拟验证，不将单台机器的经验提升成通用事实。

结果与局限见 [验证记录](validation-results.md)。
