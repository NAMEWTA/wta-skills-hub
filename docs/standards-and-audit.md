# 规范核对与全量 Skills 审计

核对日期：**2026-10-06**。基线为 `NAMEWTA/wta-skills-hub` main 的 `18d6b9254e26b5587616ae2a12fb65fbf4467b30`；保留 10 个稳定 skill name、原有脚本和历史评估。本文的核对日期指格式、宿主入口和本轮引用的具体规则，不表示每个第三方产品、客户端版本或设备已经重新实测。

## 一手依据与规则层级

| 来源（本轮亲自读取） | 用于本库的结论 |
|---|---|
| [Agent Skills specification](https://agentskills.io/specification) | name/description 为必需；name 与目录一致；description 写具体触发条件；compatibility 限长、metadata 为字符串映射；按需加载引用与资源 |
| [Codex skills](https://learn.chatgpt.com/docs/build-skills)（原 developers.openai.com/codex/skills 重定向） | 用户和项目使用 `.agents/skills`；`agents/openai.yaml` 是消费者扩展；可禁用隐式调用 |
| [OpenAI skill-creator 的 openai_yaml 指南](https://github.com/openai/skills/blob/main/skills/.system/skill-creator/references/openai_yaml.md) | 字符串值加引号、key 不加引号；短说明 25–64 字符；默认提示需包含 `$skill-name` 的有用示例 |
| [Claude Code skills](https://code.claude.com/docs/en/skills) | `.claude/skills`、显式调用开关、消费者专属字段；不占用 synced/anthropic-skills 保留名称和根 manifest.json |
| [Claude Code memory](https://code.claude.com/docs/en/memory) | 新版可直接读取 AGENTS.md，但受版本/配置影响；本库用短 CLAUDE.md 的 `@AGENTS.md` 导入共享维护规则 |
| [Claude subagents](https://code.claude.com/docs/en/sub-agents) | `.claude/agents` 中的子智能体定义与 skill、OpenAI UI 元数据不是同一种格式 |
| [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | 仓库级维护指令与安装后的独立技能职责分离 |
| [VS Code Profiles](https://code.visualstudio.com/docs/configure/profiles) / [CLI](https://code.visualstudio.com/docs/configure/command-line) | 用公开 Profile/UI/CLI 机制管理扩展，不手写内部 UUID/location 清单 |
| [NPM trusted publishers](https://docs.npmjs.com/trusted-publishers/) / [staged publishing](https://docs.npmjs.com/staged-publishing/) | 发布改为 OIDC，stage 与实际上线分开，显式维护者批准 |

**通用格式要求**与**宿主扩展**分开执行。源 SKILL.md 只允许六个通用顶层字段；Herdr 的安装适配再生成 Claude 专属开关。500 行上限和必备 LICENSE 是本库额外质量门禁，不把所有作者建议宣传为标准强制条款。`allowed-tools` 即使格式有效，也不是绕过宿主权限的授权。

官方文档是滚动更新页面，不伪造未读取的版本号或固定 commit。`docs/standards-sources.json` 保存 URL、人工核对时间和关键字段标记；日期变更必须伴随真实重读和影响分析。技能 metadata 的 `wta-format-reviewed` 只表示格式核对，旧产品引用中的历史日期保持不变。

## 全部 10 个技能的具体变化

| Skill | 优化及修复 |
|---|---|
| gitea-repo | 明确 Gitea/Forgejo 与 GitHub 边界，实例/API/分页输入输出契约；SSH URL 推导不再默认私网 HTTP，不把 SSH 端口误当 API 端口，IPv6 host 正确加括号 |
| github-repo-steward | 区分账号级仓库治理与代码 PR 工作；最小 repo/权限范围，不默认 All repositories 或制造测试资源验证权限 |
| vscode-fullstack | 明确主机、Profile、JSONC 增量修改和可验证输出；参考资料移除手写内部扩展 UUID/location；扩展列表改为按任务和版本核对的候选而非强制全装 |
| system-health-audit | 输入绑定目标 OS/主机/只读范围；输出观察—计划—未知分离，不把只读审计升级为自动清理或系统修改 |
| windows-dev-disk-cleanup | 明确只删除具名且授权的内容，保护开发数据与不可回滚删除边界；验收以实际释放与保留项为准 |
| proxy-region-locale | 语言/区域/时区逐字段，不用地区设置“修复”网络或规避访问限制；记录原先不存在值与读回证据 |
| clash-client-profile | 保留已有 DNS/TUN 多阶段诊断与离线脚本；强化实际客户端/内核、流量路径和验收契约，不把美国节点、写入成功或单次探针当无泄漏证明 |
| herdr | 明确仅用户主动选择并验证托管环境；默认禁用隐式调用；移除参考文档与入口冲突的默认高权限 Agent 启动参数，分开发送、开始和完成状态 |
| grok-bot-team-steward | 对齐 README/INSTALL/CHEATSHEET、steward 与快照协议；移除 `/workspace` 强制假设和整个 Bots 家目录默认导出；文件安装不等于创建/激活 Bot，恢复默认暂停 |
| photo-retouch | 明确现有可用图像、编辑范围、保留原件和实际输出验收；没有图像/编辑能力不能声称已处理，提示词交付与图像输出分开 |

每个入口均补充针对本技能的输入、输出证据、正例和近邻反例。所有技能随包携带 LICENSE；OpenAI UI 短说明、字符串引用和 `$skill` 默认示例统一校验。保留原有有用的深层领域参考，不把所有内容堆进 SKILL.md。

## CLI 技术选型

读取 [fastcli/package.json](https://github.com/NAMEWTA/fastcli/blob/master/package.json) 与其 menu/first-run 源码，确认 TypeScript、Clack、Citty。对照 [Clack](https://github.com/bombshell-dev/clack)、[Citty](https://github.com/unjs/citty)、[Inquirer](https://github.com/SBoudrias/Inquirer.js)、[Vercel skills/package.json](https://github.com/vercel-labs/skills/blob/main/package.json)。Clack 在这类引导式安装器中已有实际采用，能直接覆盖多选、确认、取消和提示；Inquirer 也是成熟方案，但切换不会改善本需求。

选择 **TypeScript + @clack/prompts + citty**，不是声称统计意义上的“全行业第一”。保留 Node:test 和 tsc，避免为简单菜单引入完整 TUI/组件框架。2026-10-06 实际解析并锁定 Clack 1.8.1、Citty 0.2.2、YAML 2.9.1、TypeScript 7.0.2；后续版本交给锁文件、Dependabot PR 和 CI，不在安装时自动追随 latest。

## 自动门禁、持续核对与未验证项

结构校验覆盖 YAML 真实解析、重复 key、字段/类型/长度、稳定目录与保留名、独立资源路径、完整目录和许可；拒绝 symlink 资源。打包包含所有 10 个完整技能，不把嵌套快照模板误算成技能。

安装回归覆盖备份、失败回滚、同名保护、目录链接、取消、无 TTY、中文空格路径和跨工具物理去重。tarball 在独立目录运行，网络生产依赖安装与离线依赖复用分别标记。跨平台结果以 GitHub Actions 的实际运行记录为准，不由矩阵配置推定通过。

每周 Standards review 工作流显式联网，检查官方 URL 的可用性、关键标记和 30 天人工核对期限；失败或过期创建/更新一个审查 Issue。检查成功仅表示这些检查通过，**不表示页面没有语义变化**。没有自动生成/合并修改或自动发布。Dependabot 的 npm 和 Actions 更新同样必须通过审查及 CI。

新增 `evals/quality-cases.json`：每技能正例、反例、边界、失败，共 40 项，初始均为 `not-run`。它们是实际 Agent 会话的评估输入，不是静态测试能“通过”的正确率；结构测试只验证覆盖和格式。尚未声称完成模型选择/行为评分、真人设备验收、真实账号恢复、真实网络代理测试或 NPM 认证发布。历史 `evals/results/*` 与旧核对记录保留，不能用新结论覆盖原证据。
