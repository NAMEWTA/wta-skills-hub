# Orca CLI 单文件技能：调研与验证

日期：2026-10-15。产物为 [skills/automation/orca/SKILL.md](../skills/automation/orca/SKILL.md)，稳定名称 `orca`，目录中仅有这一个文件。仓库索引、测试、评估和本记录是维护材料，不是安装后的运行时依赖。

## 调研结论

目标是 **stablyai/Orca 编辑器及其 CLI**。官方把技能分成若干发现入口，实际完整指南打包在对应构建的可执行文件中，以 `skills get` 读取。因此，本技能合并操作入口和关键语义，但仍要求通过当前 CLI 查询详细参数及能力；不把上游最新参数承诺给所有旧版本。

| 官方技能/接口 | 本技能中的处理 |
| --- | --- |
| `orca-cli` | 主体：可执行文件定位、worktree/项目/终端、启动与移交、引用、文件、浏览器、自动化、搜索及分享 |
| `orchestration` | Run/Task/Dispatch、监督循环、消息与 ack、远程归属、结算与资源回收；不把普通移交自动变成持续监督 |
| `computer-use` | 桌面能力、窗口与元素定位、坐标缩放、输入发出与已验证效果的区别 |
| `orca-linear` / `orca-jira` | 工单命令族、元数据发现、增量字段修改、不可盲重试的写入 |
| `linear-tickets` / `jira-tickets` | 标明旧入口与别名，实际命名空间仍是 linear/jira |
| `orca-emulator` / `orca-emulator-android` | 区分 iOS 与 Android 平台、设备定位、输入限制与清理范围 |
| `orca-per-workspace-env` | 静态 doctor 与真实 provision 分开，复杂 recipe 读取同构建的指南 |
| CLI 维护接口 | host/environment/account、serve/service、hooks、profile 恢复、terminal-daemon 与 diagnostics 的发现路径和副作用 |

参考 Herdr 的具体方法是：先验证实际会话与入口，发现目标并保留返回的 ID，执行后读回，区分输入接受与任务完成，未知结果先观察。没有复制 Herdr 的环境前提、pane/workspace 语法、JSON 字段、方向名或跳过审批参数。Herdr 原文件保持不变。

新技能保留正常自动发现，仅在任务确实涉及 Orca 状态时触发；不继承 Herdr 的显式调用元数据。单文件没有消费者扩展 `agents/openai.yaml`，也没有辅助脚本或本地 reference。

## 来源与证据范围

本仓库维护基线：`1a217048752faaaf87cb4915f63cf02a6eeed47b`。参考的 Herdr 文件 blob：`02a7615298cc48bded756ee81198586d3844e540`。

上游固定为 [stablyai/orca@0ec009a8779814287f489e352d041ea5877762da](https://github.com/stablyai/orca/tree/0ec009a8779814287f489e352d041ea5877762da)，通过 GitHub API 取得 commit 和文件树，再按该 commit 下载文件；未执行上游代码。以下“读取”均发生于 2026-10-15。

| 状态 | 文件/资料 | 用途与限制 |
| --- | --- | --- |
| 亲自读取 | 本仓库 `AGENTS.md`、`package.json`、Herdr `SKILL.md`、目录/安装/打包测试和 CI | 确认单文件支持、安装边界及维护要求 |
| 亲自读取 | 官方 [CLI overview](https://www.onorca.dev/docs/cli/overview)、固定提交的 [CLI 文档目录](https://github.com/stablyai/orca/tree/0ec009a8779814287f489e352d041ea5877762da/docs/site/content/docs/cli) 中 reference/skills | 识别项目、官方技能机制与公开命令分类；网页内容不等同当前安装版 |
| 亲自读取 | [skills/orca-cli/SKILL.md](https://github.com/stablyai/orca/blob/0ec009a8779814287f489e352d041ea5877762da/skills/orca-cli/SKILL.md)、orchestration 入口、两种 tickets 旧入口 | 验证入口定位、内置指南加载及旧名称；不采纳其中“提权重试”作为宿主授权 |
| 亲自读取 | [skill-guides](https://github.com/stablyai/orca/tree/0ec009a8779814287f489e352d041ea5877762da/skill-guides) 的 orca-cli、orchestration、computer-use、orca-linear、orca-jira、两种 emulator 正文 | 按主题提炼操作、状态和恢复语义 |
| 亲自读取 | orca-cli 的 browser/automations/publishing references；orchestration 的 placement-and-remote/messaging-and-gates/recovery-and-cleanup | 核对页面定位、发布开关、跨 host 操作、FIFO ack 与不确定结果 |
| 亲自读取部分 | orca-per-workspace-env 的入口/前提、鉴权与秘密、recipe 合同及 doctor 段落 | 仅提炼 CLI 操作边界；没有验证 provider 计费、配额或部署效果 |
| 亲自检查 | [src/cli/specs](https://github.com/stablyai/orca/tree/0ec009a8779814287f489e352d041ea5877762da/src/cli/specs) 的命令路径清单；重点读取 agent-launch、core、skills、browser-basic、account、managed-server、profile-state、terminal-daemon、serve、vm 的定义 | 补齐指南未列出的命令族及关键限制；这是静态定义核对，不是运行测试 |
| 亲自读取 | `src/cli/command-spec.ts`、`handler-group-manifest.ts`、`browser-handler-groups.ts` | 交叉检查命令注册与命名，不声称审计全部实现或测试 |
| 仅下载、未完整核验 | 其余上游 reference、生成器、生成后的 bundled-skill-guides 和测试文件 | 不将下载成功计为已阅读或验证；技能使用时按任务读取匹配版本 |
| 排除 | GNOME Orca、其他同名 Rust/tmux orchestrator、第三方技能聚合镜像 | 只用于辨认同名歧义；未用作命令语义依据 |

没有全网/X 检索、性能对比或真实设备验收结论。搜索仅用于发现相关公开项目与官方来源。

## 当前会话只读观察

当前 PATH 中的 Orca 是已存在的 SSH relay 包装器。只读检查包装器类型和入口后，仅运行 `--help` 与 `skills get orca-cli`；没有读取 credential 文件、运行 status 清单、启动 agent、向终端发送文本或修改 Orca 状态。

relay 握手标识为 `0.1.0+239293179b77`。这只是观察到的 relay 构建标识，不声称已查得整个桌面/远端安装版本。

| 捕获内容 | SHA-256 |
| --- | --- |
| 当前 relay 的 `--help` stdout | `ce053898ef4657e353953148cf91b5b9de12d1584c8ad9367663c0cee98c6d67` |
| 当前 relay 的 `skills get orca-cli` stdout | `9b6a6ae9712a666b3fbb062c2c5ddbb6c67a8e60a213897c27abafbb5dc474e3` |

当前指南仍通过 `terminal create` 启动已有 checkout 中的 agent，并明确 worktree create 没有逐次 model/effort 参数；上游固定提交增加 `agent launch`、structured/terminal 区分、model/effort 和 `retry-launch`。技能为此保留能力发现与旧版路径，不把新返回结构套到旧版。源码声明的 `skills install/update` 默认全局且实际安装拒绝 `--json`，也已独立注明。

## 工程验证

运行环境：Linux，Node `26.11.1`，npm `12.2.0`。工程测试仅使用仓库内离线夹具、本地已安装依赖和临时目录；不连接真实 Orca、账号、代理或外网，不更改系统设置。

| 层次 | 结果 |
| --- | --- |
| `skill-creator` 的 `quick_validate.py` | 通过；使用已有 `/usr/bin/python3` 与 PyYAML，无安装依赖 |
| 仓库结构：`npm run validate` | 通过，15 个技能；名称、frontmatter、分组和本地资源边界均有效 |
| 仓库测试：`npm test` | 110 项中 109 通过、0 失败、1 跳过；跳过的是原生 Windows writer 平台检查，Linux 不冒充该平台结果 |
| 打包：`npm pack --dry-run --ignore-scripts --json` | 通过；Orca 仅打包 `skills/automation/orca/SKILL.md` |
| 仓库外 tarball smoke：`npm run smoke:package` | 离线通过，15 技能 × 2 目标 × 2 作用域，共 60 个安装目录；重复安装为 identical；复用已安装生产依赖，不访问 registry |
| 仅安装 Orca 的隔离 smoke | 仓库外含中文/空格临时项目、空 PATH 下实际 CLI 安装到 Codex/Claude 两个目录；各自只有 Orca，无兄弟技能；正文逐字节相同、私有文件权限、本地资源边界、重复安装 identical 均通过。安装器自己的隐藏来源清单不算技能资源；未验证宿主模型发现与调用 |
| 选择与行为评估 | 四个通用质量场景及 [15 个 Orca 专项场景](../evals/orca-cases.json) 均为 `not-run`；只编写并检查材料，没有独立模型执行 |
| 跨平台 CI | 现有 Windows/macOS/Linux × Node 22/24 矩阵保留；尚未观察本分支执行结果 |
| 真实 Orca 操作/真人设备 | 未验证；读取帮助和指南不证明浏览器、agent、编排、远程写入或模拟器操作可用 |

没有新增运行时脚本；仅同步现有 smoke 的技能计数。历史评估及验证记录保持不变。本次修改不合并、不发布 npm、不打版本标签。
