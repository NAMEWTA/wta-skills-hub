# @namewta/skills-hub

13 个可独立安装的 Agent Skills，以及面向 **Codex、Claude Code、通用 `.agents/skills`** 的中文交互式安装器。

安装器使用 TypeScript + `@clack/prompts` + `citty`，与 [fastcli](https://github.com/NAMEWTA/fastcli) 的交互技术栈一致。直接复制当前 NPM 包内的技能，不再委托另一个 `npx skills` 下载器；安装不会执行技能脚本或更改 AI 工具权限。

## 快速开始

要求 **Node.js 22.16+** 和 npm。以下 registry 命令在 **0.1.0 正式发布后**可用；分支修改、构建、创建 PR、提交 staged package 都不代表新版本已上线。

```bash
# 进入交互菜单
npx @namewta/skills-hub@0.1.0

# 也可把安装器本身装到 npm 全局，再启动菜单
npm install -g @namewta/skills-hub@0.1.0
wta-skills-hub
```

交互顺序：**多选 skills → 多选 AI CLI → 全局/项目 → 路径与冲突预览 → 确认安装**。方向键移动，空格选择，回车继续；取消操作不会开始写入。确认默认是否定，存在同名不同内容时默认保留已有技能。

`npm install -g` 是安装 **CLI 程序**，菜单中的“全局”是安装 **当前用户的技能**，两者不是一回事；项目安装不修改 `package.json` 或客户端配置文件。

### 安装目标

| 选择 | 全局（当前用户） | 项目（当前目录或 `--cwd`） |
|---|---|---|
| Codex | `~/.agents/skills/<name>` | `.agents/skills/<name>` |
| Claude Code | `~/.claude/skills/<name>` | `.claude/skills/<name>` |
| 通用 `.agents/skills` | `~/.agents/skills/<name>` | `.agents/skills/<name>` |

Codex 和通用选项写入同一位置，同时选择会自动去重。目录按 2026-10-06 的 [Codex 官方文档](https://learn.chatgpt.com/docs/build-skills) 和 [Claude Code 官方文档](https://code.claude.com/docs/en/skills) 核对；不是旧版 `.codex/skills` 路径。安装后的发现与实际调用要在目标客户端验证，不能把“文件写入成功”当成“模型已经使用技能”。

Windows 中 `~` 表示当前用户主目录。项目目录按启动时的工作目录定位，不猜测 Git 上级根目录。检测到自定义 `CLAUDE_CONFIG_DIR` 时，全局 Claude 安装会停止，避免写到错误位置；当前版本可使用默认目录或项目安装。

### 非交互和自动化

```bash
# 具名技能，用户级；Codex 和 Claude 各安装一份
wta-skills-hub -s herdr -a codex,claude-code --global --yes

# 明确项目目录，保留该项目现有的同名技能
wta-skills-hub --all -a codex,agents --project --cwd "/path/to/project" --existing skip --yes

# 仅预览，不创建任何目录
wta-skills-hub --all -a codex,claude-code,agents --global --dry-run --json

# 显式保存备份后替换
wta-skills-hub -s vscode-fullstack -a claude-code --project --overwrite --yes

# 查看包内目录和帮助
wta-skills-hub list --json
wta-skills-hub --help
```

| 参数 | 语义 |
|---|---|
| `--skill/-s`、位置参数 | 技能名，可重复或逗号分隔 |
| `--agent/-a` | `codex`、`claude-code`、`agents`；可多选；兼容 `claude`、`universal` 别名 |
| `--global/-g` / `--project` | 必须二选一；未指定时由菜单询问 |
| `--cwd` | 已存在的项目目录，只能配合 `--project` |
| `--all` | 只选全部技能，不代选工具、作用域或授权覆盖 |
| `--yes/-y` | 跳过最终确认，不补全缺少的选择，不自动覆盖 |
| `--existing` | `error`（默认）、`skip`、`backup` |
| `--overwrite` | 等价 `--existing backup`，不提供无备份强制覆盖 |
| `--dry-run` / `--json` | 只预览 / 机器可读输出；JSON 不进入菜单 |
| `--list/-l` / `--version/-v` / `--help/-h` | 列表 / 版本 / 帮助 |

没有 TTY 时必须明确技能、工具、作用域；写入还需 `--yes`。输入错误退出 2，菜单取消退出 130，成功退出 0。`install`、`list`、`help` 子命令可选。首次 `npx` 和安装 npm 依赖需要网络；**安装器自身**不会联网、拉 Git 仓库、收集遥测、调用其他安装器或自动更新文件。

## 技能目录

| 分类 | 技能 | 适用边界 |
|---|---|---|
| coding | [gitea-repo](skills/coding/gitea-repo/SKILL.md) | 已确认的 Gitea/Forgejo issue、PR、API 与分页 |
| coding | [github-repo-steward](skills/coding/github-repo-steward/SKILL.md) | GitHub 账号级仓库、star 和只读权限诊断 |
| coding | [vscode-fullstack](skills/coding/vscode-fullstack/SKILL.md) | 指定主机/Profile 的扩展与 JSONC 增量配置 |
| system | [system-health-audit](skills/system/system-health-audit/SKILL.md) | Windows/macOS/Linux 只读基线及具名优化计划 |
| system | [windows-dev-disk-cleanup](skills/system/windows-dev-disk-cleanup/SKILL.md) | Windows 具名审计、授权清理、容量验收 |
| system | [linux-dev-disk-cleanup](skills/system/linux-dev-disk-cleanup/SKILL.md) | Linux 根分区审计、具名授权清理与容量验收 |
| system | [proxy-region-locale](skills/system/proxy-region-locale/SKILL.md) | 按字段调整区域、语言、时区，不代替代理排障 |
| system | [clash-client-profile](skills/system/clash-client-profile/SKILL.md) | Clash/Mihomo 的 TUN、按订阅 DNS 覆写、AI 路径与回滚 |
| automation | [herdr](skills/automation/herdr/SKILL.md) | 用户明确选择且已验证的 Herdr 托管终端协作 |
| automation | [grok-bot-team-steward](skills/automation/grok-bot-team-steward/SKILL.md) | Grok 团队快照、只读差异、具名恢复 |
| design | [photo-retouch](skills/design/photo-retouch/SKILL.md) | 已有图像的修饰、修复和创意编辑 |
| writing | [job-application](skills/writing/job-application/SKILL.md) | 扫描指定知识库建成经历原件，再按岗位派生简历、自我介绍和提升计划 |
| writing | [ste-zh](skills/writing/ste-zh/SKILL.md) | 按 STE 原则做中文结论汇报，或按 strict 与 80% 改写英文 |

分类不是技能名。每个技能携带 `SKILL.md`、`agents/openai.yaml`、完整相对资源和 LICENSE；不依赖根目录 `AGENTS.md` 或另一个已安装技能。Grok 内部快照里的示例 `SKILL.md` 不会被当作额外的可安装技能。

源文件只使用 Agent Skills 通用 frontmatter。Herdr 声明本库的显式调用元数据；Codex 使用 `policy.allow_implicit_invocation: false`，Claude 安装副本增加 `disable-model-invocation: true`。这些是调用策略，不是权限授权。`agents/openai.yaml` 也不等同于 Claude 的 `.claude/agents/*.md` 子智能体定义。

## 升级、冲突和恢复

内容完全相同则不重写；内容不同默认报冲突。`--overwrite` 会将整个旧技能目录移动到当前用户或项目根下的 `.wta-skills-hub/backups/<portable|claude>/<批次>/<技能>`，再写入新内容。备份不在任何 `skills` 扫描目录中，避免被模型误加载。

批次先完成预检和暂存，持有排他锁；提交失败时逆序恢复。新数据若已被外部编辑，不会强行删除，而是保留目标和备份，报告人工恢复路径。进程强杀、断电、磁盘故障不保证自动恢复；权限拒绝或跨设备 rename 失败会停止，不提权、不改权限策略。详细恢复步骤及限制见源码中的 [安装设计](docs/installer.md)。

从 0.0.x 迁移：技能名和主命令不变；安装目标收窄到本次要求的三个选项，Cursor/Grok/Pi 不再作为内建安装目标；`--all` 不再隐含“所有工具并跳过确认”；旧目录不会自动移动或删除。请先 `--dry-run`，审查旧安装及自定义内容后选择备份替换。

## 本地开发与发布前验证

尚未发布时，从本分支源码构建，或使用本分支生成的 `.tgz`，不能用 registry 旧版本验收新功能：

```bash
npm ci --ignore-scripts
npm run build
node bin/wta-skills-hub.mjs
npm run typecheck
npm run validate
npm test
npm run smoke:package
npm pack

# 测试实际 tarball，无需发布；首次取运行依赖可能需要网络
npx --package ./namewta-skills-hub-0.1.0.tgz wta-skills-hub
```

默认 smoke 从真实 tarball 解包，在仓库外复制已安装的生产依赖、隔离 HOME、禁用可执行 PATH，验证 13 个技能 × 两个独立目标 × 两种作用域。`npm run smoke:package -- --network` 进一步执行全新的 npm 生产安装；它明确需要 registry 网络。CI 在 Windows/macOS/Linux × Node 22/24 执行后者。

维护入口：[AGENTS.md](AGENTS.md)、[规范与审计](docs/standards-and-audit.md)、[发布步骤](docs/publishing.md)、[评估说明](evals/README.md)。规范检查 `npm run standards:check` 显式联网；每周工作流检查关键标记与人工核对期限，过期或失败创建/更新一个审查 Issue，绝不自动改技能或发布。每 30 天重新阅读官方页面再更新核对日期；依赖更新由 Dependabot 提交 PR。

离线结构/脚本/安装测试不等于真实 Agent 选择评估或真人设备验收。52 个行为场景保留 `not-run` 状态，历史评估不覆盖。

## 许可

[MIT](LICENSE)。独立复制每个技能时一并保留其中的 LICENSE。
