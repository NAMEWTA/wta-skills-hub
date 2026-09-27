---
name: gitea-repo
description: "操作 Gitea/Forgejo 实例的 issue、PR、标签、里程碑和 Release。用户明确指定这些平台，或当前仓库已确认托管于这些平台时使用；普通 Git 操作与 GitHub.com 不适用。"
license: MIT
---

# Gitea / Forgejo 仓库 API

环境要求：需要 Python 3.10+、目标实例网络访问和相应 API 权限。

先确认实例与仓库，用 API 操作托管资源；提交、分支和推送仍用 Git。以用户本次任务和已有授权为准，不把读取请求扩大为写入。

## 定位与执行

技能根目录是本文件所在目录，用其绝对路径作为 `SKILL_DIR`，不要假定安装位置。

```bash
python3 "$SKILL_DIR/scripts/gitea_api.py" --host https://gitea.example.com --repo owner/repo issue list
```

- 实例：`--host` → `GITEA_HOST` → 已确认的 Gitea/Forgejo remote。非 GitHub remote 本身不能证明服务是 Gitea，GitLab 等不适用。
- 仓库：`--repo owner/repo` → `GITEA_REPO` → remote。缺失时只询问尚无法确定的项。
- 令牌：优先 `GITEA_TOKEN` 或 `git credential`。脚本保留 `--token` 兼容接口，但不要将真实令牌拼入命令、日志或回复。
- SSH 端口不等于 HTTP API 端口；推断结果不明时使用明确的实例 URL。
- 正常校验证书；仅在用户明确接受该实例的证书例外时使用 `--insecure`。认证失败不通过关闭校验解决。
- `python3` 不可用时检查 `python` 版本；子命令和参数以脚本 `--help` 为准。`--json` 是全局参数，放在子命令之前。

## 按任务选入口

| 任务 | 脚本命令 | 按需材料 |
|---|---|---|
| issue / PR 查询或改动 | `issue` / `pr` | [端点与命令表](references/endpoint-map.md) |
| 标签、里程碑、Release | `label list` / `milestone list` / `release list`；其余用 `api` | [端点与命令表](references/endpoint-map.md) |
| 401 / 403、令牌来源 | `whoami` 或所需资源的只读查询 | [认证与 scopes](references/auth-and-scopes.md) |
| 全量列表、状态码或字段问题 | 列表命令 `--all` | [分页与错误](references/pagination-and-errors.md) |

详细字段以当前实例的 `/swagger.v1.json` 为准，不假设 Gitea 与 Forgejo 所有版本都一致。

## 必须保留的 API 约束

- issue 与 PR 共用编号。issue 列表使用 `type=issues`；不要把 PR 当普通 issue。
- 创建 issue 的 `labels` 为 ID 数组；脚本按名称全量分页解析标签。
- 合并 PR 使用区分大小写的 `Do` 字段，如 `{"Do":"merge"}`。
- 缺少 `read:user` 导致的 403 不代表令牌整体失效；可只读查询已指定仓库核实可见性，不能由此断言具备写权限。
- 删除 issue、分支、Release 或合并 PR，须有覆盖具体对象及动作的用户授权；已有明确授权不重复询问。删除 issue 不能用“关闭”掩饰，反之亦然。
- 写请求结果不明时先查询状态，不盲目重试创建、评论或合并。403 报告服务端所需权限并停止该动作。

## 完成标准

只报告实际查得或已复核的结果：目标实例与仓库、资源链接/编号、分页覆盖范围、已完成动作与失败原因。全量查询失败时明确为部分结果；不以成功发送请求代替状态验收。
