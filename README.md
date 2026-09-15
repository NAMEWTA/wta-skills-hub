# wta-skills-hub

给 Grok、Cursor、Codex、Claude Code、Pi 等编程智能体用的 Skills 仓库。每个 skill 是一份带 YAML 头的 `SKILL.md`，智能体按需加载，用来固定本团队的操作约定。

当前布局符合 [skills.sh](https://skills.sh) / `npx skills add` 的发现规则：每个 skill 在 `skills/<name>/SKILL.md`。不需要做成可执行 npm 包；官方安装器是 [vercel-labs/skills](https://github.com/vercel-labs/skills)。

发布到 GitHub 之后，可用：

```bash
# 全局安装全部技能，覆盖本机已装的智能体
npx skills add NAMEWTA/wta-skills-hub -g

# 指定技能
npx skills add NAMEWTA/wta-skills-hub --skill herdr -g
npx skills add NAMEWTA/wta-skills-hub --skill windows-dev-disk-cleanup -g

# 指定智能体（可重复 -a；`*` 表示全部）
npx skills add NAMEWTA/wta-skills-hub --skill herdr -g -a grok -a cursor -a codex
npx skills add NAMEWTA/wta-skills-hub -g --agent '*' --skill '*'

# 跳过确认、装到每个受支持智能体
npx skills add NAMEWTA/wta-skills-hub --all
```

只装当前项目、不装全局时去掉 `-g`。发布前也可以从本仓库本地路径安装：

```bash
npx skills add ./ --skill herdr -g -a grok
```

GitHub CLI 用户（优先最新 tagged release，其次默认分支 HEAD）：

```bash
gh skill install NAMEWTA/wta-skills-hub
gh skill install NAMEWTA/wta-skills-hub herdr
```

## 选项

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
| **herdr** | [`skills/herdr/SKILL.md`](skills/herdr/SKILL.md) | 在 Herdr 终端工作区里控制窗格、标签页、工作区，并协调多个编程智能体。只在用户明确提到 Herdr，或要求用 Herdr 查看/控制终端与其它智能体时启用。必须运行在 Herdr 窗格内（`HERDR_ENV=1`）。本仓库这份相对上游官方 skill 增加了一条团队约定：在 Herdr 里启动 Grok / Codex 时默认完全授权，使用 `grok --permission-mode bypassPermissions` 与 `codex --dangerously-bypass-approvals-and-sandbox`（或经 `herdr agent start ... --` 原样传入）。 |
| **windows-dev-disk-cleanup** | [`skills/windows-dev-disk-cleanup/SKILL.md`](skills/windows-dev-disk-cleanup/SKILL.md) | 审计、规划并安全执行 Windows 开发机磁盘清理：C 盘压力、大文件、开发工具链、缓存、已装应用、系统托管存储。斜杠命令 `/windows-dev-disk-cleanup`。只读排查与真正删除必须分开；任何删除、卸载或系统改动都要用户对清单或具名项明确授权。 |

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
  README.md
  LICENSE
  skills.sh.json
  scripts/validate-skills.mjs
  .github/workflows/
    validate-skills.yml
    release.yml
  skills/
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
```

`skills.sh.json` 只影响 [skills.sh](https://skills.sh) 仓库页的分组展示，不改变 CLI 安装行为。

## License

[MIT](LICENSE)
