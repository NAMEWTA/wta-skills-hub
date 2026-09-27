# @namewta/skills-hub

给 Grok、Cursor、Codex、Claude Code、Pi 等 Agent Skills 兼容工具使用的技能库。每个技能保留独立的 `SKILL.md`、资源及稳定名称，按工作方向存放在 `skills/<category>/<name>/`。

## 分类与技能

| 分类 | 技能 | 用途 |
|---|---|---|
| 代码开发 `coding` | [gitea-repo](skills/coding/gitea-repo/SKILL.md) | Gitea/Forgejo 的 issue、PR、标签、里程碑及 Release API |
| 代码开发 `coding` | [github-repo-steward](skills/coding/github-repo-steward/SKILL.md) | GitHub 个人仓库与星标盘点、生命周期和权限诊断 |
| 代码开发 `coding` | [vscode-fullstack](skills/coding/vscode-fullstack/SKILL.md) | 当前 VS Code/Remote Profile 的全栈扩展与 JSONC 设置 |
| 机器优化 `system` | [windows-dev-disk-cleanup](skills/system/windows-dev-disk-cleanup/SKILL.md) | Windows 开发机空间审计、具名授权清理与验收 |
| 机器优化 `system` | [proxy-region-locale](skills/system/proxy-region-locale/SKILL.md) | 按代理出口配置 Ubuntu 区域，保留用户偏好与回滚记录 |
| 智能体与自动化 `automation` | [herdr](skills/automation/herdr/SKILL.md) | Herdr 托管环境中的终端与智能体协作 |
| 智能体与自动化 `automation` | [grok-bot-team-steward](skills/automation/grok-bot-team-steward/SKILL.md) | Grok Bot 团队快照、恢复、对比与显式管家设置 |
| 人生与文章写作 `writing` | 待扩展 | 预留分类，目前没有可安装技能 |

分类是源码组织与展示信息，不属于技能名称。原来的 `--skill herdr`、`$herdr` 等调用不变；分类目录没有 `SKILL.md`，不会被安装为技能。技能内部的快照模板也不属于可安装项。

## 安装

需要 Node.js 18+ 和 npm。包内安装器锁定 `skills@1.5.26`，支持分类目录。默认安装到用户级目录：

```bash
# 交互选择技能与目标 agent
npx @namewta/skills-hub

# 指定技能与 agent
npx @namewta/skills-hub --skill herdr -a codex
npx @namewta/skills-hub --skill gitea-repo -a grok
npx @namewta/skills-hub github-repo-steward --agent cursor,codex

# 安装到运行命令时的当前项目
npx @namewta/skills-hub --skill vscode-fullstack --project -a codex

# 分类列表；不会执行安装
npx @namewta/skills-hub --list

# 全部技能与 agent，跳过选择确认
npx @namewta/skills-hub --all
```

也可使用 [Vercel Skills 安装器](https://github.com/vercel-labs/skills) 从 GitHub 安装：

```bash
npx skills@1.5.26 add NAMEWTA/wta-skills-hub -g
npx skills@1.5.26 add NAMEWTA/wta-skills-hub --skill herdr -g -a codex
```

| 参数 | 作用 |
|---|---|
| `--skill` / `-s` | 技能名，可重复；位置参数也视为技能名 |
| `--agent` / `-a` | 目标 agent，可重复或用逗号分隔；`*` 表示全部 |
| `--all` | 等价于 `--skill '*' --agent '*' -y`，默认全局安装 |
| `--project` | 安装到调用者的当前项目 |
| `--yes` / `-y` | 跳过安装选择确认 |
| `--list` / `-l` | 按分类列出打包技能并退出 |
| `--help` / `-h` | 查看帮助 |

技能安装仍由安装器按技能名处理；不要手工把分类目录作为一个技能复制到 agent 目录。不同 agent 的安装路径由锁定安装器决定。技能可按名称显式调用或按描述匹配，具体入口语法以使用的 agent 为准。

## 团队约定与能力边界

- Herdr 必须处于 `HERDR_ENV=1`。既定且已授权的 WTA Herdr 环境保留 Grok `--permission-mode bypassPermissions` 与 Codex `--dangerously-bypass-approvals-and-sandbox` 启动约定；其他环境不自动继承授权，用户指定受限模式时优先遵从。
- GitHub/Gitea 修改操作沿用用户对具体目标及动作的授权；权限诊断不写入。工具看不到或没有验证的结果应明确报告。
- Windows 清理保留候选清单和决策历史；不删除活动智能体运行时、不强制处理被锁文件。
- Ubuntu 区域设置按用户要求的字段修改，每轮独立保留回滚记录；不会因改变区域而自动更换 NTP 源。
- VS Code 设置按 JSONC 增量修改。默认 Profile 与命名 Profile 分别定位；Remote 扩展不声称已经经 Settings Sync 同步。
- Grok 仅加载技能或本地比较快照不修改账号；恢复 routines 始终先建成暂停。快照结构校验不能证明内容真实、完整或已彻底脱敏。

## 维护与验证

```text
skills/
  coding/<skill-name>/
  system/<skill-name>/
  automation/<skill-name>/
  writing/.gitkeep
```

新增技能时放入合适分类，YAML 中的 `name` 必须与技能目录名一致并全局唯一。入口写清任务、触发条件、完成标准和按需参考；大型操作细节放在 `references/`，确定性逻辑放在 `scripts/`。

本仓库为每个技能提供 `agents/openai.yaml`，但不强制其他 Agent Skills 消费方支持此文件。同步更新上方目录、`skills.sh.json` 与评估场景。网站分组只登记非空分类；新增第一个写作技能时再登记 writing 分组。

```bash
npm ci --ignore-scripts
npm run validate
npm test
npm pack --dry-run --ignore-scripts
```

测试需要 Python 3.10+；Bash 夹具在 POSIX 上执行，Windows 上跳过并明确报告。测试不调用真实账号写接口或改系统配置。

- [方法论、来源与迭代记录](docs/skill-methodology.md)
- [评估场景与复现说明](evals/README.md)
- [本轮验证结果](docs/validation-results.md)

## 发布

打 `vX.Y.Z` 标签会触发 GitHub Release；配置了 `NPM_TOKEN` 时，同一工作流发布 npm。发版前让 `package.json` 和 lockfile 中的版本与标签一致，并通过校验和测试。本次分类改造不自动发版。

## License

[MIT](LICENSE)
