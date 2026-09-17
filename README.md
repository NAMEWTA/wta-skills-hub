# @namewta/skills-hub

给 Grok、Cursor、Codex、Claude Code、Pi 等编程智能体用的 Skills 仓库。每个 skill 是一份带 YAML 头的 `SKILL.md`，智能体按需加载，用来固定本团队的操作约定。

布局符合 [skills.sh](https://skills.sh) / Agent Skills 发现规则：每个 skill 在 `skills/<name>/SKILL.md`。npm 包 `@namewta/skills-hub` 把这些文件带上，并用官方安装器 [vercel-labs/skills](https://github.com/vercel-labs/skills) 写进各 agent 的全局配置目录。Windows、macOS、Linux 均可。

## 安装

默认写入本机已装智能体的**用户级** skills 目录。运行时会列出本包装好的 skill，并让你选择装到哪些 agent。

```bash
# 交互选择 skill 和 agent，安装到全局
npx @namewta/skills-hub

# 指定技能
npx @namewta/skills-hub --skill herdr
npx @namewta/skills-hub --skill windows-dev-disk-cleanup -a grok
npx @namewta/skills-hub --skill grok-bot-team-steward -a grok

# 指定智能体（可重复 -a；逗号分隔也可以；`*` 表示全部）
npx @namewta/skills-hub --skill herdr -a grok -a cursor -a codex
npx @namewta/skills-hub herdr --agent '*'

# 全部技能 → 本机检测到的全部智能体，跳过确认
npx @namewta/skills-hub --all

# 只看包装里有哪些 skill
npx @namewta/skills-hub --list
```

只装当前项目、不装全局时加 `--project`：

```bash
npx @namewta/skills-hub --skill herdr --project -a grok
```

也可以不经过本包 CLI，直接用官方安装器从 GitHub 装（同样默认建议加 `-g`）：

```bash
npx skills add NAMEWTA/wta-skills-hub -g
npx skills add NAMEWTA/wta-skills-hub --skill herdr -g -a grok
npx skills add NAMEWTA/wta-skills-hub --all
```

GitHub CLI 用户（优先最新 tagged release，其次默认分支 HEAD）：

```bash
gh skill install NAMEWTA/wta-skills-hub
gh skill install NAMEWTA/wta-skills-hub herdr
```

## 选项

`npx @namewta/skills-hub`：

| 选项 | 作用 |
|---|---|
| `--skill` / `-s` | 技能名，可多次传入；位置参数也当作技能名 |
| `--agent` / `-a` | 目标智能体 id，可多次传入；`*` 表示全部 |
| `--all` | 等价于 `--skill '*' --agent '*' -y`，且默认全局 |
| `--project` | 写入当前项目，而不是用户级全局目录 |
| `--yes` / `-y` | 跳过确认 |
| `--list` / `-l` | 列出包装内技能后退出 |

`npx skills add NAMEWTA/wta-skills-hub` 仍使用官方 CLI 选项：

| 选项 | 作用 |
|---|---|
| `-g` / `--global` | 写入各智能体的用户级 skills 目录，而不是当前项目 |
| `-a` / `--agent` | 目标智能体 id，可多次传入；`*` 表示全部 |
| `-s` / `--skill` | 技能名，可多次传入；`*` 表示全部 |
| `--all` | 等价于 `--skill '*' --agent '*' -y` |

## 全局目录

`-g` 写入各 agent 的用户级目录。Windows 上 `~` 对应 `%USERPROFILE%`。

| 智能体 | `--agent` id | 全局目录 | 环境变量覆盖 |
|---|---|---|---|
| Cursor | `cursor` | `~/.cursor/skills/` | — |
| Claude Code | `claude-code` | `~/.claude/skills/` | `$CLAUDE_CONFIG_DIR/skills` |
| Codex | `codex` | `~/.codex/skills/` | `$CODEX_HOME/skills` |
| Pi | `pi` | `~/.pi/agent/skills/` | — |
| Grok Build | `grok` | `~/.grok/skills/` | `$GROK_HOME/skills` |

## Skills

| Skill | 路径 | 作用 |
|---|---|---|
| **grok-bot-team-steward** | [`skills/grok-bot-team-steward/SKILL.md`](skills/grok-bot-team-steward/SKILL.md) | 把当前账号的 Grok Bot 团队导出为 dated 快照目录 `grok-bot-team-YYYY-MM-DD/`，或按该目录在新账号上重建花名册、技能、群聊、记忆与例行任务。用户说「快照」「备份团队」「持久化」「导出花名册」「换机初始化」「恢复团队」「激活管家技能」时使用。 |
| **herdr** | [`skills/herdr/SKILL.md`](skills/herdr/SKILL.md) | 在 Herdr 终端工作区里控制窗格、标签页、工作区，并协调多个编程智能体。只在用户明确提到 Herdr，或要求用 Herdr 查看/控制终端与其它智能体时启用。必须运行在 Herdr 窗格内（`HERDR_ENV=1`）。本仓库这份相对上游官方 skill 增加了一条团队约定：在 Herdr 里启动 Grok / Codex 时默认完全授权，使用 `grok --permission-mode bypassPermissions` 与 `codex --dangerously-bypass-approvals-and-sandbox`（或经 `herdr agent start ... --` 原样传入）。 |
| **windows-dev-disk-cleanup** | [`skills/windows-dev-disk-cleanup/SKILL.md`](skills/windows-dev-disk-cleanup/SKILL.md) | 审计、规划并安全执行 Windows 开发机磁盘清理：C 盘压力、大文件、开发工具链、缓存、已装应用、系统托管存储。斜杠命令 `/windows-dev-disk-cleanup`。只读排查与真正删除必须分开；任何删除、卸载或系统改动都要用户对清单或具名项明确授权。 |

### grok-bot-team-steward

Grok Bot 团队管家。装上后，智能体可以：

- **snapshot**：扫描当前 Bot、群聊、技能、例行任务、记忆和对话，写入 `/workspace/grok-bot-team-YYYY-MM-DD/`（同一天第二次运行带 `HHMM` 后缀，不覆盖已有目录）
- **restore**：读取一份 dated 目录，按文档重建花名册、技能、群聊和记忆参考；routine 一律先建成暂停
- **diff**：对比两份快照，只报告差异

硬规则：不发明花名册里没有的角色；不把密钥写入任何文件；恢复结束后必须给出 DROP LIST（登录态、cookie、未能导出的对话等带不回来的东西）。完整协议见 [`skills/grok-bot-team-steward/SKILL.md`](skills/grok-bot-team-steward/SKILL.md) 与 [`skills/grok-bot-team-steward/references/`](skills/grok-bot-team-steward/references/)。

### herdr

Herdr 是面向 AI 编程智能体的终端复用器（类似 tmux，但识别 agent 状态）。装上这个 skill 后，智能体可以：

- 确认自己在 Herdr 窗格内，再用 `herdr` CLI 操作当前会话
- 查看 workspace / tab / pane / agent 状态，从 JSON 响应读取 ID
- 拆分窗格、在兄弟窗格启动另一个智能体或普通命令，且不抢焦点
- 向已识别的 agent 发 prompt、等 `idle` / `blocked` / `done`、读取输出
- 遵守安全边界：不从 Herdr 外部控会话、不擅自关别人的窗格、不随便 `herdr server stop`

**本环境启动约定（强制）：**

```bash
grok --permission-mode bypassPermissions
codex --dangerously-bypass-approvals-and-sandbox
```

```bash
herdr agent start coder --kind grok --pane <pane-id> -- --permission-mode bypassPermissions
herdr agent start reviewer --kind codex --pane <pane-id> -- --dangerously-bypass-approvals-and-sandbox
```

用户明确要求受限/需审批模式时再改参数。

### windows-dev-disk-cleanup

Windows 开发机磁盘瘦身。智能体先只读盘点，把候选写进工作区根目录的 `清理清单.md`，分批问你怎么处理，得到明确授权后再动手。

- 规划与执行分开：未授权时不删除、不清缓存、不卸载、不停进程、不改环境变量或 Windows 功能
- 每个破坏性目标必须落到精确路径、产品 ID、包名或功能名；禁止宽泛 glob 和猜测目录
- 优先官方卸载器和所属包管理器；替换工具链（如 uv 替换 Conda）验证通过后才拆旧运行时
- 不把普通清理扩大到 WinSxS/`ResetBase`、pagefile、WinRE、Windows Update 数据或还原点，除非另做单独决定
- 完整发现、分类、分阶段执行与验收见 [`skills/windows-dev-disk-cleanup/references/windows-cleanup-workflow.md`](skills/windows-dev-disk-cleanup/references/windows-cleanup-workflow.md)

## 仓库结构

```text
wta-skills-hub/
  package.json
  README.md
  LICENSE
  skills.sh.json
  bin/wta-skills-hub.mjs
  lib/
  scripts/validate-skills.mjs
  test/cli.test.mjs
  .github/workflows/
    validate-skills.yml
    release.yml
  skills/
    grok-bot-team-steward/
      SKILL.md
      README.md
      INSTALL.md
      CHEATSHEET.md
      steward/
      references/
      templates/snapshot/
      scripts/
    herdr/
      SKILL.md
    windows-dev-disk-cleanup/
      SKILL.md
      agents/openai.yaml
      references/windows-cleanup-workflow.md
```

新增 skill：在 `skills/<name>/` 下放 `SKILL.md`（YAML 头含 `name` 与 `description`，`name` 必须与目录名一致、仅小写字母数字和连字符），并在本 README 的 Skills 表里补一行。本地校验：

```bash
node scripts/validate-skills.mjs
npm test
```

`skills.sh.json` 只影响 [skills.sh](https://skills.sh) 仓库页的分组展示，不改变 CLI 安装行为。

## 发布

打 `vX.Y.Z` 标签会触发 GitHub Release；若仓库配置了 `NPM_TOKEN` secret，同一 workflow 会把对应版本发到 npm。发版前把 `package.json` 的 `version` 改成与标签一致（不含 `v` 前缀）。

## License

[MIT](LICENSE)
