---
name: github-repo-steward
description: "管理个人 GitHub 账号的仓库清单、归档、删除与 star，诊断 GitHub gh/PAT 认证与权限问题。用于账号级仓库整理或权限排查；普通代码修改、issue 或 PR 创建不适用。"
license: MIT
---

# GitHub 仓库管家

环境要求：需要 GitHub CLI gh；盘点脚本另需 Bash。使用当前 gh 账号及其可见资源。

管理当前 `gh` 账号的仓库生命周期与 star。只做用户请求的动作；盘点、权限诊断和清理建议保持只读。技能目录以本文件位置为准。

## 选择任务

| 任务 | 入口 |
|---|---|
| 仓库盘点 | [盘点与只读脚本](references/01-inventory.md) |
| star 查询或具名批量修改 | [Stars](references/03-stars.md) |
| 归档、取消归档或删除 | [生命周期](references/02-lifecycle.md) |
| 哪些仓库值得整理 | [清理建议](references/04-hygiene.md) |
| 401 / 403、PAT 权限 | [认证诊断](references/00-auth-and-tokens.md) |

先 `gh auth status` 确认账号；不得输出真实 token。`gh` 与 MCP 可能使用不同账号/令牌，不能混用其权限结论。

```bash
gh api user --jq '{login,name,id}'
"$SKILL_DIR/scripts/inventory.sh"
```

## 读取与权限

- 权限诊断只使用读操作；禁止用 `PATCH archived=false` 等写入来“探测”权限。
- 读成功、`permissions.admin=true` 或可看到仓库，均不证明当前 token 能写入或删除。
- 在执行已授权动作时若遇 403，记录响应状态、消息与可用的 `X-Accepted-Github-Permissions`，停止该动作；不无限重试或换界面绕过。
- 用户更新同一 PAT 权限后可直接重试。新 token 通过 `gh auth login` 或受保护的 stdin/凭据环境提供，不能把 token 字面值写进 shell 命令。

## 修改与复核

先形成具名 `OWNER/REPO` 清单，核对用户授权覆盖的动作。已有明确清单和授权则直接继续；模糊“清理一下”只产生建议。新增目标不继承旧清单授权。

- 归档/取消归档：使用 `gh repo archive` 或 `gh api -X PATCH ... -F archived=true/false`，布尔值用 `-F`，不使用传字符串的 `-f`。
- 删除：先说明影响及恢复限制，再对已授权仓库执行。部分仓库在 90 天内符合恢复条件，不能承诺都可恢复，见生命周期参考。
- star/unstar：只改清单内的对象，缺写权限立即报告；已有授权无需再逐项确认。
- 复核必须结合修改响应和随后读取结果：归档看 `archived`；star 看资源状态；删除成功响应后再读应为 404。孤立的 404 也可能是无访问权限，不能据此宣布删除成功。

## 交付

报告账号、覆盖范围、具名成功/失败项、观察到的状态及尚缺的信息。列表必须分页取全或标明部分；不要将未知 CI、权限或仓库状态猜成正常。
