---
name: gitea-repo
description: "用 Gitea HTTP API（/api/v1）操作任意 Gitea 或 Forgejo 实例上的仓库：issue、评论、标签、里程碑、PR、Release、仓库信息与任意 API 透传，对齐 gh。用户说 Gitea、Forgejo、gitea api、tea、issue、PR、pull request、合并 PR、标签、里程碑、release、swagger、/gitea-repo 时使用。Git 提交与推送仍走 git；GitHub.com 用 gh / github-repo-steward。"
license: MIT
---

# Gitea 仓库 API

对 Gitea / Forgejo 的 issue、PR、Release、标签、里程碑走 HTTP API（`/api/v1`），不要用 `git log` / `git fetch` 去找这些资源。Git 提交、分支、推送仍用 `git`。GitHub.com 不要走本技能。

先判定实例与仓库，再动手。本文件足够开工；按需读 `references/`。

## 强制入口

本技能根目录就是本 `SKILL.md` 所在文件夹（安装后常见 `~/.grok/skills/gitea-repo` 或项目 `.grok/skills/gitea-repo`）。默认用包装脚本，不要每次手写 curl：

```bash
python3 "$SKILL_DIR/scripts/gitea_api.py" <subcommand>
```

`python3` 不可用时改 `python`。令牌只从 `--token` / `GITEA_TOKEN` / `git credential fill` 读取，**禁止把令牌写进命令行历史、URL 查询串、技能文件或对话回显**。

解析优先级（高 → 低）：

| 项 | 来源 |
|---|---|
| 实例 | `--host` → `GITEA_HOST` → 当前仓非 GitHub 的 git remote |
| 仓库 | `--repo owner/repo` → `GITEA_REPO` → 同上 remote 的最后两段路径 |
| 令牌 | `--token` → `GITEA_TOKEN` → `git credential fill`（host 含端口） |

缺实例或仓库就停，向用户要 `--host` / `--repo`，不要猜。自签 HTTPS 加 `--insecure` 或 `GITEA_INSECURE=1`。SSH remote 在私网 IP/localhost 上推断 `http://`，其余推断 `https://`；不对时显式传 `--host`。

指定仓库：

```bash
python3 "$SKILL_DIR/scripts/gitea_api.py" --host https://gitea.example.com --repo owner/repo issue list
```

## 认证

请求头只用：

```http
Authorization: token <PAT>
Accept: application/json
Content-Type: application/json
```

不要用 `?token=` / `?access_token=`（Gitea 1.23 起移除）。OAuth JWT 才用 `Authorization: bearer ...`；本技能默认 PAT。

令牌按 scope 授权：缺 scope 是 **403** 不是 401。`GET /user` 需要 `read:user`，没有时 `whoami` 会说明并改探测仓库权限，**不要把这次 403 当成令牌整体失效**。

完整 scope 与 401/403 判定见 [references/auth-and-scopes.md](references/auth-and-scopes.md)。

## 日常命令（gh 对照）

| 意图 | gh | 本技能 |
|------|----|--------|
| 当前用户 | `gh api user` | `gitea_api.py whoami` |
| 列 issue | `gh issue list` | `gitea_api.py issue list --state open` |
| 看 issue | `gh issue view 1` | `gitea_api.py issue view 1` |
| 建 issue | `gh issue create` | `gitea_api.py issue create --title "..." --body-file ./body.md` |
| 关/开 issue | `gh issue close/reopen` | `gitea_api.py issue close 1` / `issue reopen 1` |
| 评论 | `gh issue comment` | `gitea_api.py issue comment 1 --body-file ./comment.md` |
| 列 PR | `gh pr list` | `gitea_api.py pr list --state open` |
| 建 PR | `gh pr create` | `gitea_api.py pr create --title "..." --head <branch> --base <base>` |
| 合并 PR | `gh pr merge` | `gitea_api.py pr merge 1 --style merge`（需用户明确要求） |
| 仓库 | `gh repo view` | `gitea_api.py repo view` |
| 任意 API | `gh api` | `gitea_api.py api GET /repos/{owner}/{repo}/issues` |

列全量加 `--all`（按 `page`/`limit` 翻页，默认 limit 50）。原始 JSON 加 `--json`。路径里的 `{owner}` `{repo}` 由脚本替换。

## 硬规则

1. **issue 与 PR 共用同一套 index**。列 issue 必须带 `type=issues`（脚本 `issue list` 默认已带）；列 PR 用 `pr list` 或 `type=pulls`。不要把带 `pull_request` 字段的项当成普通 issue 展示。
2. **创建 issue 的 `labels` 是标签 ID 数组，不是名字**。脚本 `--label` 可传名字，由脚本解析成 ID。
3. **合并 PR 的 JSON 字段名是 `Do`**（不是 `do`）：`{"Do":"merge"}`。可选 `merge` / `squash` / `rebase` / `rebase-merge`。
4. **写 issue/评论/标签/里程碑** 需要 `write:issue`；**写 PR / 文件 / Release** 需要 `write:repository`。缺 scope 时把服务端 `message` 原样告诉用户，不要改成 retry 循环。
5. **破坏性操作**（删除 issue、合并 PR、删分支、删 Release）必须用户明确要求后才执行。删除 issue 是永久删除，默认只 `PATCH state=closed`。
6. Git 提交 / 分支 / 推送用 `git`。本技能只覆盖 Gitea HTTP 资源。
7. 实时契约是当前实例：`$HOST/api/swagger` 与 `$HOST/swagger.v1.json`。手册端点见 [references/endpoint-map.md](references/endpoint-map.md)。

## 手写请求（仅脚本不够用时）

```http
GET /api/v1/repos/{owner}/{repo}/issues?state=all&type=issues&page=1&limit=50
POST /api/v1/repos/{owner}/{repo}/issues
{"title":"...","body":"..."}
PATCH /api/v1/repos/{owner}/{repo}/issues/{index}
{"state":"closed"}
POST /api/v1/repos/{owner}/{repo}/issues/{index}/comments
{"body":"..."}
GET /api/v1/repos/{owner}/{repo}/pulls?state=open
POST /api/v1/repos/{owner}/{repo}/pulls
{"title":"...","head":"feature-branch","base":"main"}
POST /api/v1/repos/{owner}/{repo}/pulls/{index}/merge
{"Do":"merge"}
```

分页、状态码与字段陷阱见 [references/pagination-and-errors.md](references/pagination-and-errors.md)。

## 资源

| 文件 | 何时读 |
|------|--------|
| [scripts/gitea_api.py](scripts/gitea_api.py) | 任何 Gitea 读写，默认入口 |
| [references/auth-and-scopes.md](references/auth-and-scopes.md) | 401/403、scope、令牌来源、sudo |
| [references/endpoint-map.md](references/endpoint-map.md) | 脚本没有的端点、gh 对照、Swagger 分类 |
| [references/pagination-and-errors.md](references/pagination-and-errors.md) | 翻页、错误体、字段陷阱 |
