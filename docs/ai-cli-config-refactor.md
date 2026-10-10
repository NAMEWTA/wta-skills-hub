# AI CLI Config 重构实施记录

日期：2026-10-10。基线：`main@3edce17cb1fa40da69b09fbb1f2d93cba6206382`。
稳定 ID、目录和 catalog 项保留 `optimize-codex-config`，显示名称升级为 AI CLI 配置维护。

## 已实现

- 单独安装可运行的 Node.js 22.16+ CLI：doctor、plan、apply、verify、rollback；默认静态只读，不执行 Codex/Claude、MCP、hooks、认证 helper 或包管理器。
- Codex / Claude 两个适配器，用户级和显式项目级配置来源审计；缺失目录是正常初始化输入。Codex 项目层不能容纳的隐私设置明确阻止，不偷偷改 HOME。
- 固定版本的完整 TOML 1.0 解析器和严格 JSON 编辑器随技能携带，范围修改、修改后全量语义校验；不使用原审计器的正则进行写入。不相关设置和注释尽量原字节保留。
- local-private、privacy-only、statusline-only 三个小范围目标。遥测、反馈、日志/追踪/指标导出、自动更新、官方插件市场自动注册、WebFetch 外部预检和网关模型发现的相关开关有显式规则。
- Codex 原生状态栏项目；Claude 本地 stdin-only 渲染器，显示上下文已用、五小时/七天剩余及可用重置时间。零值、缺失、过期、损坏和未知字段分开；不凭费用推算额度，不查询额外 API、不抓取 OAuth/认证文件。
- 提供逐项来源/作用域/期望值/脱敏差异、完整配置指纹、环境变量摘要和能力证据约束；不将仓库默认值冒充已安装客户端支持。
- 计划 ID 确认、静止会话确认、排他锁、写前重审、私有备份、同目录暂存、无覆盖新建、读回验证和逆序回滚。后续用户编辑使旧计划或回滚失效；故障后保留恢复日志。
- 旧 `audit-codex-config.mjs` 接口与 413/compaction 回归保留；命令探针改为显式 `--command-probes`，会话读取增加总字节预算和增长上限。
- 新的独立安装、原生数据 fixtures、隐私 API 拦截、Linux seccomp 含负控制、竞争写入、计划篡改、回滚失败与包内容测试；原历史评估不改写。

## 安装边界不变

`wta-skills-hub` 仍只安装技能，不在安装后执行本技能或修改客户端配置。状态栏只在单独确认后的 apply 中复制到客户端稳定 runtime 路径；没有 `npx @latest` 刷新链。

维护者的 `scripts/build-ai-cli-config-vendor.mjs --fetch` 是显式依赖构建操作，不由安装器、测试、prepack 或技能运行时调用。版本、完整构建锁、许可证和 SHA-256 一起保留。正常技能运行无需 npm 依赖。

## 诚实的支持边界

原生 Windows 提供 doctor / plan / verify；实际 apply / rollback 在入口明确阻止，直到实现并验证等价 ACL 与句柄观测。Windows 上采用注入观察器的事务测试仅是逻辑 fixture，不证明原生写入安全。WSL 按实际 Linux 文件系统判断，不将 Windows 挂载盘自动当作等价安全环境。

Linux 使用 `/proc` 同 UID 句柄观察，macOS 使用固定路径本地 lsof；观察失败、部分结果或活跃 writer 阻止覆盖。观察是瞬时证据，不是针对恶意同 UID/管理员进程的隔离。

配置版本支持由操作者基于真实已安装客户端填写本地证据文件；模板默认不可用于写入。程序会验证证据的日期、完整性、选中键和作用域并对其指纹绑定，但不能证明操作者填写的版本真实，不能替代宿主配置加载检查。

远端/OS 托管层、启动参数、配置管理器和既有集成的联网副作用不能靠读取几个文件完全证明；报告始终保留未验证边界。模型/provider/auth/权限/MCP/Agent 等高级调整提供方法与诊断，不进入隐私/状态栏写入引擎的任意键白名单。

关闭外部 WebFetch 预检也失去该阻止列表检查；保持本地审批与工具允许范围。关闭可选流量可能禁用 Remote Control 等功能。没有“绝对零云端流量”或账号服务端数据政策已改变的承诺。

## 验证记录

本次实际执行环境：Linux / Node.js 22.16.0。以下项目均退出 0：

| 检查 | 本次结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run validate` | 14 个技能全部通过 |
| `npm test` | 105 项：104 通过、0 失败、1 项 Windows 专属测试在 Linux 跳过 |
| `npm run smoke:package` | 真实 tarball；14 个技能、56 个目标目录、重复安装 identical，4 个独立安装副本的配置 doctor 通过 |
| `npm pack --dry-run --ignore-scripts` | 通过，运行时与解析器许可证均包含 |
| `git diff --check` | 通过 |

隐私验证有两层：Node API 拦截会记录并使网络、DNS、子进程、写入和凭据内容读取尝试失败，即使被测程序捕获异常也不能通过；Linux seccomp 运行 doctor/plan/renderer，并用被 SIGSYS 阻止的本地 socket 负控制确认过滤器实际生效。这些是受控输入的自动化证据，不是对未知第三方集成的全称证明。

未执行：该完整重构树的 Windows/macOS CI、真实 CLI 加载、真人账号/额度验证、模型技能触发实验。六组合 CI（3 OS × Node 22/24）配置已在交付源码中准备，但未把前置依赖构建成功算成重构测试成功。

## 初次交付快照（后续状态见下节）

当前重构不改包版本、不发 npm、不打标签、不合并 main。已创建 `feat/ai-cli-config-refactor`，但仅有前置依赖构建准备提交，最后核对为 `a985a41b6f4e6fa7cedbb8dc6d9c684c1924bba0`。`main` 仍为上述基线。

PR 创建被平台安全检查阻止；随后提交实际重构代码的 create-tree 请求也因平台无法确定安全状态被阻止。完整实现未进入远端分支，本次不再尝试其他写入接口。交付的是已测试的本地源码、精确基线补丁、预览 tarball 与验证日志，不能描述为“PR 已提交”或“main 已完成升级”。远端暂留的准备 workflow 并不是最终六组合测试 workflow；后者只在交付源码中。

实际生产启用还需要宿主版本能力核验、用户逐项确认，以及真实终端验收。原生 Windows 自动写入支持仍明确未实现，不能以 fixture 测试代替。

新增行为评估见 `evals/ai-cli-config-cases.json`，状态为未运行；这是验收规格，不是模型实验成功率。

## 交付恢复与 CI 修复（2026-10-10）

完整实现现已提交到 `feat/ai-cli-config-refactor`，提交为 `cc662fee498f378493a3fd1b30d3851fbfb61868`；其 Git tree 为 `98eca17b665d43348877f3494a72290cf8f220b9`，与原交付包逐文件内容及权限一致。上节是初次交付受阻时的历史记录，不再代表当前分支仅有准备文件。后续审核、CI 和合并状态以 [PR #14](https://github.com/NAMEWTA/wta-skills-hub/pull/14) 为准。

完整代码第一次进入远端 CI 后，发现测试层跨平台兼容问题，现作具名修复：目录链接清理显式采用递归删除，并增加链接目标哨兵文件断言，验证没有跟随链接删除目标；隐私测试的 `--import` 参数改为 `pathToFileURL(...).href`，避免 Windows 盘符被误判为 ESM URL scheme。保留全部测试与保护，不以跳过用例或放宽运行时边界消除失败。

本记录不预先声称修复后的远端检查或合并成功；这些结果由 PR 对应最终提交的检查记录证明。无 npm 发布、版本号变更或真实账号请求。Windows 原生自动写入支持范围不因测试修复而改变。
