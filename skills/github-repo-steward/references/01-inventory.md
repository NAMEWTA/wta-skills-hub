# 仓库盘点

## 列出自己的仓

```bash
USER=$(gh api user --jq .login)

gh repo list "$USER" --limit 200 --json \
  name,description,isPrivate,isArchived,isFork,isEmpty,isTemplate,visibility,url,\
updatedAt,pushedAt,createdAt,defaultBranchRef,primaryLanguage,stargazerCount,forkCount,parent,repositoryTopics
```

过滤：

```bash
gh repo list "$USER" --limit 200 --source     # 原创
gh repo list "$USER" --limit 200 --fork       # fork
gh repo list "$USER" --limit 200 --archived
```

JSON 字段不够时再打 API：

```bash
gh api "repos/$USER/$REPO" --jq '{open_issues_count,archived,disabled,has_pages,homepage,pushed_at}'
gh pr list -R "$USER/$REPO" --state open --json number --jq length
gh run list -R "$USER/$REPO" --limit 1 --json workflowName,status,conclusion,updatedAt
```

`open_issues_count` **包含 PR**。要「真正的 issue」用 issues 数减去 open PR 数。

## 状态口径

按「今天」的日历算最近推送（`pushedAt`）：

| 标签 | 口径 |
|---|---|
| 活跃 | 近 14 天有 push，且未归档 |
| 维护中 | 近 60 天有 push |
| 较静默 | 近 90 天有 push |
| 停滞 | 超过 90 天无 push |
| 已归档 | `isArchived=true` |
| 空仓 | `isEmpty=true` |
| Fork | `isFork=true`，表里写上游 `parent.owner.login/parent.name` |

Actions：最近一次 run 的 `conclusion`：success / failure / cancelled / 无 CI。

## 输出表（给用户）

自有仓：

| 仓库 | 类型 | 可见性 | 状态 | 语言 | 最近推送 | Stars | Issues/PR | Actions | 说明 |
|---|---|---|---|---|---|---|---|---|---|

Star 列表另表，见 `03-stars.md`。

## 只读脚本

```bash
"$SKILL_DIR/scripts/inventory.sh"
"$SKILL_DIR/scripts/inventory.sh" --stars
```
