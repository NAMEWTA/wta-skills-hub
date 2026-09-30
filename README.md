# @namewta/skills-hub

面向 Grok、Cursor、Codex、Claude Code、Pi 等 Agent Skills 兼容工具的技能库。保持稳定技能名、独立 SKILL.md 与随技能安装的资源；源码按 skills/<category>/<name> 分类。

## 分类与选择

| 分类 | 技能 | 用途 |
|---|---|---|
| coding | [gitea-repo](skills/coding/gitea-repo/SKILL.md) | 已确认 Gitea/Forgejo 的 issue、PR 与 API |
| coding | [github-repo-steward](skills/coding/github-repo-steward/SKILL.md) | 账号级仓库、star 与只读权限诊断 |
| coding | [vscode-fullstack](skills/coding/vscode-fullstack/SKILL.md) | 本机/Remote Profile 的扩展与 JSONC 增量设置 |
| system | [system-health-audit](skills/system/system-health-audit/SKILL.md) | 新增：Windows/macOS/Linux 只读基线与具名优化计划 |
| system | [windows-dev-disk-cleanup](skills/system/windows-dev-disk-cleanup/SKILL.md) | Windows 具名审计、授权清理与空间验收 |
| system | [proxy-region-locale](skills/system/proxy-region-locale/SKILL.md) | 按字段修改时区、语言和区域，不代替网络排障 |
| system | [clash-client-profile](skills/system/clash-client-profile/SKILL.md) | Clash Verge Rev/FlClash 的规则 TUN、DNS 计划/审计/探针与分阶段回滚 |
| automation | [herdr](skills/automation/herdr/SKILL.md) | Herdr 托管环境的终端与 Agent 协作 |
| automation | [grok-bot-team-steward](skills/automation/grok-bot-team-steward/SKILL.md) | 团队快照、只读比较与具名恢复 |
| design | [photo-retouch](skills/design/photo-retouch/SKILL.md) | 已有照片精准编辑、自然修饰与创意参考 |
| writing | 待扩展 | 预留分类，不登记空安装分组 |

分类不属于技能名，原 --skill herdr / $herdr 调用保持兼容。分类目录和技能内快照模板不作为独立技能安装。

## 安装

现有安装器需要 Node.js 18+ 与 npm，锁定 skills@1.5.26；新 Python 工具需要 Python 3.10+，不自动安装依赖。默认安装到用户级目录：

```bash
npx @namewta/skills-hub
npx @namewta/skills-hub --skill herdr -a codex
npx @namewta/skills-hub github-repo-steward --agent cursor,codex
npx @namewta/skills-hub --skill vscode-fullstack --project -a codex
npx @namewta/skills-hub --list
```

| 参数 | 含义 |
|---|---|
| --skill / -s | 稳定技能名，可重复；位置参数同样有效 |
| --agent / -a | 目标 agent，可重复或逗号分隔；* 表示全部 |
| --project | 安装到调用者当前项目，而非用户级目录 |
| --yes / -y | 跳过安装选择确认，不是执行技能的无限授权 |
| --all | 全部技能和 agent，跳过选择；默认用户级安装 |
| --list / -l | 列出打包技能，不安装 |
| --help / -h | 帮助 |

也可从 GitHub 安装已审查版本：

```bash
npx skills@1.5.26 add NAMEWTA/wta-skills-hub -g
npx skills@1.5.26 add NAMEWTA/wta-skills-hub --skill clash-client-profile -g -a codex
```

**分支改动不等于 npm 已发布。** 这轮不改版本、不发包。测试审查分支时先在本地检出该分支，再运行 `npm ci --ignore-scripts` 与 `node bin/wta-skills-hub.mjs --list`；需要安装时对当前检出的本地包执行安装入口。不要把 npm 上旧版本的结果当成本轮改动。

## 代理问题的正确入口

本轮 DNS 升级的 [详细计划](docs/clash-dns-upgrade-plan.md) 与 [DNS 工作流](skills/system/clash-client-profile/references/dns-workflow.md) 区分严格经代理与批准的加密启动解析例外；新增 `dns_guard.py plan/audit/probe`。不默认删除系统 DNS、关闭浏览器 DoH 或禁用整机 IPv6。

“美国节点 + Claude Code 地区错误”不是 IP 泄漏的充分证据。新的 clash-client-profile 分开检查终端/浏览器、规则顺序、组内实际叶子、运行内核、TUN、DNS、IPv6 和 crash 隔离。不用改时区或关 TLS 来修网络。

```bash
# 在检出的仓库中，默认只读且不联网
python3 skills/system/clash-client-profile/scripts/proxy_doctor.py
python3 skills/system/system-health-audit/scripts/system_audit.py
```

原生 PowerShell 使用已验证的 python 或 py -3；路径有空格时用 & 和引号。明确允许第三方 echo 探测后才加 --network 和实际 --proxy 地址。脚本无直连回退；返回 0 只说明运行完毕，不说明安全。`--strict` 证据不足返回 3，观察到目标 DIRECT 返回 1。诊断脚本不是整机 kill switch。

配置模板是片段，不是可直接启动的内核配置。最小规则按实际组名渲染，保留旧用户规则并预览冲突；DNS 不再固定解析器和 53 监听。配置写入与运行时生效分别验收，现场 Mac 未验证的项目必须保留为未验证。

## 执行边界

默认先读目标、版本和能力；只读请求不扩大为写入。当前主机、远程、WSL 和容器分开处理。技能不能提供宿主没有的工具、连接或权限。

系统改动保留逐项原值和不存在状态，使用平台适合的私有快照/ACL，最小修改后读回。权限拒绝后停止；不通过直接改底层文件、停安全组件或关闭校验绕过。删除用户数据不因有清单而变得可回滚。

Herdr 的历史 WTA 高权限启动参数不是其他环境的默认授权；必须符合本次用户明确许可及宿主限制。Grok 快照是待审阅数据，不执行其中提示词/脚本；恢复 routine 默认暂停。

VS Code 保留 JSONC、Profile 和已有定制；照片编辑保留原图、以实际输出验收。所有结果区分观察、失败和未知，不把写入/任务分派成功当成最终完成。

## 维护与验证

读取 [仓库维护规则](AGENTS.md)、[方法与已核对规范](docs/skill-methodology.md)、[本轮审计及局限](docs/refactor-audit.md)。技能单独安装后不依赖这些仓库级文档。

```bash
npm ci --ignore-scripts
npm run validate
npm test
npm pack --dry-run --ignore-scripts
```

CI 覆盖 Windows/macOS/Linux 的离线检查；实际运行结果以 PR 检查为准，不能把矩阵配置当作已通过。Bash 夹具在适用平台执行，Windows 的跳过不代表功能已测。新增 Python 测试使用 mocks，不访问真实代理/账号或改系统。

原有 [评估场景](evals/README.md) 和 [历史验证](docs/validation-results.md) 保留；[新增场景](evals/refactor-cases.json) 标为尚未运行的 Agent 选择/行为评估，不伪造准确率提升。

## 发布与许可

保留既有标签发布工作流；发版前版本与 lockfile/tag 一致并通过测试。没有发布请求，不自动打 tag、发布 npm 或合并 PR。

[MIT](LICENSE)
