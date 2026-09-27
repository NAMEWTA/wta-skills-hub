# 会话与协调边界

## 安全与协调规则

- 后台工作用 `--no-focus`，除非用户要求切换上下文。
- 使用 `--current`、明确的 pane ID、或唯一的智能体名字。不要依赖另一个客户端的焦点窗格。
- 从 JSON 响应解析 ID。不要从侧边栏顺序或示例推导。
- 除非用户明确要求，不要关闭你没有创建的 workspace、tab、pane 或 session。`workspace close --group` 会关闭主 workspace 及其关联的 worktree workspace；不要只为了绕过 `workspace_group_close_required` 就加上它。
- 只有在用户已经核实仓库之后才用 `--trust-repository`。它授予单次请求的 Git trust；不是失败 worktree 命令的常规重试。
- 更新之后 client 和 server 版本可能不同。依赖新的 server 功能前先 `herdr status`。缺少某个方法，不构成停止或升级 server 的许可。
- 除非用户明确要停止 server 及其窗格进程，否则不要从活动会话里运行 `herdr server stop`。
- 永远不要杀掉主 Herdr 进程。需要隔离 server 的实验，使用命名的测试 session。
- CLI server 错误是 stderr 上的 JSON，退出码 1。CLI 语法错误退出码 2。
- 仅在既定 WTA 完全授权环境启动 grok / Codex 时沿用团队默认（用户明确要求受限模式时优先遵从）：`grok --permission-mode bypassPermissions` 与 `codex --dangerously-bypass-approvals-and-sandbox`。
