---
name: github-repo-steward
description: 盘点并安全执行个人 GitHub 仓库的全生命周期管理：列出自有仓与 star、诊断 PAT/gh 权限、归档与取消归档、删除与 90 天恢复、批量 star/unstar、清理 fork 与停滞仓。用户说管理 GitHub 仓库、列出我的仓库、归档、删除仓库、取消 star、仓库盘点、gh 权限、/github-repo-steward 时使用。破坏性操作必须先盘点并得到对具名仓库的明确授权。
license: MIT
---

# GitHub 仓库管家

管理**当前 `gh` 已登录账号**名下的仓库与 star。优先用 `gh` / `gh api`，不要猜 flag 或 GraphQL。同类 skill（`github-cli`、issue/PR 工作流）管的是开发协作；本技能管的是**账号级仓库卫生与生命周期**。

按需读同目录 `references/`。本文件足够开工。

## 先判定模式

| 用户信号 | 模式 |
|---|---|
| 列出我的仓库 / 仓库什么状态 / 盘点 | inventory |
| 列出 star / 我 star 了什么 | stars-list |
| 取消 star / unstar / 给这些仓库取消 star | stars-mutate |
| 归档 / archive / 取消归档 | archive |
| 删除仓库 / delete repo | delete |
| 清理仓库 / 哪些该归档该删 | hygiene |
| 权限不够 / 403 / PAT / token | auth |

破坏性模式（archive / delete / stars-mutate）必须：**盘点 → 具名清单 → 用户点头 → 执行 → 复核**。不要把「列出来」当成「做掉」。

## 硬规则

1. 动手前 `gh auth status`，记下 login、token 种类（`github_pat_` fine-grained / `ghp_` classic）、过期时间。
2. 只对**具名** `OWNER/REPO` 做归档、删除、star/unstar。禁止对「那一类仓库」模糊动手。
3. 删除不可逆（约 90 天内可申请恢复，同名仓会被锁一段时间）。归档可逆。unstar 可再 star。向用户说清楚再执行。
4. 403 `Resource not accessible by personal access token` 时读响应头 `X-Accepted-Github-Permissions`，按 `references/00-auth-and-tokens.md` 让用户补权限，**不要改用网页替用户点**，除非用户明确说自己去网页做。
5. 不要把 token 字符串写进仓库、skill、日志或聊天记录。
6. 改完必须用 API 复核：归档看 `archived=true`；删除看 404；unstar 看 `GET user/starred/OWNER/REPO` 为 404。
7. 不要猜 `gh` flag。复杂命令先 `gh <cmd> --help`。
8. Fine-grained PAT 的 **Starring 是 Account 权限**，不是 Repository 权限。只开了 Administration 仍不能 star/unstar。

## 0. 鉴权与权限探针

```bash
gh auth status
gh api user --jq '{login,name,id}'
```

按即将做的动作探针（成功=有权限；403 则停）：

```bash
# 改仓库设置 / 归档（需要 administration=write）
gh api -i -X PATCH repos/OWNER/REPO -f archived=false | head -20

# 删除（需要 administration=write）
# 只看头，不要真删。用一个不存在的探测不了；缺权限时对真实仓 DELETE 也会 403。
# 有归档探针成功即可认为删除权限同类，但仍须用户点名后才 DELETE。

# star/unstar（需要 starring=write + metadata=read）
gh api -i -X GET user/starred/OWNER/REPO | head -20
```

403 时把 `X-Accepted-Github-Permissions` 原样告诉用户，并给出 token 设置页：

- Fine-grained：https://github.com/settings/personal-access-tokens
- Classic：https://github.com/settings/tokens

用户说「已更新」后**直接重试当前 token**（同 PAT 改权限不用重新 login）。若用户新建了 token，才 `echo TOKEN | gh auth login --with-token`。

## 1. inventory

列出登录账号自己的仓（含私有，取决于 token）：

```bash
gh repo list USER --limit 200 --json name,description,isPrivate,isArchived,isFork,isEmpty,isTemplate,visibility,url,updatedAt,pushedAt,createdAt,defaultBranchRef,primaryLanguage,stargazerCount,forkCount,parent
```

也可用 `scripts/inventory.sh`。分类口径见 `references/01-inventory.md`。

向用户输出表：名字、原创/Fork、公开/私有、归档、最近推送、语言、Stars、开放 Issue/PR、最近 Actions、一句话说明。Fork 写上游 `parent`。

## 2. stars-list

```bash
gh api --paginate -H "Accept: application/vnd.github.star+json" user/starred \
  --jq '.[] | [.starred_at,.repo.full_name,(.repo.stargazers_count|tostring),(.repo.language // "-"),(.repo.description // "")] | @tsv'
```

按主题分组，每条一句话说明（不要只贴 README）。标出自己的仓、已归档仓。

## 3. stars-mutate

用户给出清单后，逐个：

```bash
gh api -X DELETE user/starred/OWNER/REPO    # 204 成功；404 本来就没 star
gh api -X PUT    user/starred/OWNER/REPO    # 204 star
gh api -X GET    user/starred/OWNER/REPO    # 204 仍 star；404 已取消
```

缺 `starring=write` 时整批会 403。停下来让用户在 Fine-grained token 的 **Account permissions → Starring → Read and write** 打开，保存后再跑。不要把失败的 403 报成「已取消」。

## 4. archive / unarchive

```bash
gh repo archive OWNER/REPO --yes
gh api -X PATCH repos/OWNER/REPO -f archived=true
gh api -X PATCH repos/OWNER/REPO -f archived=false   # 取消归档
```

归档后只读：不能推送、不能改 collaborator。要改必须先 unarchive。详见 `references/02-lifecycle.md`。

建议归档：自己的原创仓、还有人 star/fork、短期不维护但内容仍有价值。

## 5. delete

```bash
gh repo delete OWNER/REPO --yes
```

删除前向用户复述：不可逆、约 90 天内可找 GitHub Support 恢复、同名仓库会被保留一段时间不能新建。建议删除：已被替代的 fork、空仓、明确废弃且不想留 gravestone 的仓。有 star 的原创仓默认走归档而不是删除。

## 6. hygiene（清理建议）

只出建议清单，等用户点名再执行。分类：

| 标签 | 含义 | 默认动作 |
|---|---|---|
| 活跃 | 近 2 周有推送 | 保留 |
| 维护中 | 近 1–2 个月有推送 | 保留 |
| 停滞 | 数月无推送 | 建议归档（原创）或删除（无价值 fork） |
| 已归档 | `isArchived` | 保留，除非用户要删 |
| 已替代 | 上游已迁到新仓 | 建议删除旧 fork/文档仓 |

示例（来自真实操作）：停滞但有 star 的原创仓归档；迁到新 monorepo 后的旧 fork/docs 删除。

## 7. 回复格式

每轮结束只给这四块：

1. **模式**
2. **账号** `login`（不要打印 token）
3. **结果** 成功/失败的具名仓库；失败写状态码和缺的 permission
4. **需要你的** 补权限、确认删除、无
