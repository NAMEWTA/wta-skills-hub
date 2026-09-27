# CLI、目标与状态

## 先学当前 CLI

已安装的二进制才是命令语法的权威。先运行：

```bash
herdr --help
```

只对当前任务需要的命令组查询帮助；以下是可选命令组，不要每轮全部运行：

```bash
herdr agent
herdr pane
herdr workspace
herdr tab
herdr worktree
herdr terminal
herdr notification
herdr integration
herdr session
herdr machine
```

不要用裸的 `herdr` 做发现；它会启动或附着 TUI。不要通过省略参数去试探会改状态的嵌套命令。像 `herdr workspace create` 这类命令在默认参数下就是有效执行。

多数控制命令返回 JSON。从这些响应里读取标识符和状态，不要自己猜。


## 理解布局、窗格和智能体

按任务选择原语：

- Workspace、tab、pane 拓扑描述终端位置。
- Pane 命令控制原始终端、shell、测试、服务、输入和输出。
- Agent 命令控制当前占据某个窗格的、已被识别的编程智能体。

窗格可以没有智能体。`agent start` 要求已有一个空闲的 shell 窗格，并且**不会**创建、拆分或移动布局。普通进程用 pane 命令。需要 Herdr 校验智能体身份，或解释 `idle`、`working`、`blocked`、`done`、`unknown` 生命周期时，用 agent 命令。

Agent 命令接受：唯一的在线智能体名字，或当前承载该智能体的 pane ID。不接受 terminal ID，也不接受光秃秃的 kind 标签。名字必须匹配 `[a-z][a-z0-9_-]{0,31}`，且在当前存活智能体中唯一。名字跟着当前窗格占用者；智能体退出、被 release 或被替换时名字会清除。

`idle` 和 `done` 都表示智能体可以接受输入。CLI/API 用 server 的 seen 状态区分二者；显式 focus 会把目标标为已看过，read 不会。每个 TUI 客户端独立跟踪已查看的完成项，所以 Done 徽章可以和 CLI 或另一个客户端不同。`blocked` 表示 Herdr 识别到了审批或提问界面。`unknown` 表示智能体在，但 Herdr 无法有把握分类；这不能证明任务已完成。


## 使用 ID 和调用方上下文

公开 ID 是不透明的稳定句柄：

- workspace: `w1`
- tab: `w1:t1`
- pane: `w1:p1`

已关闭的 tab / pane ID 不会复用。窗格搬到另一个 workspace 后会得到新的带 workspace 限定的 pane ID。`pane move` 之后，继续用 `.result.move_result.pane.pane_id` 或在线智能体名字。旧值在 `.result.move_result.previous_pane_id`；只有被搬走进程继承的调用方上下文还会解析那个旧 ID，不要把它当作通用 agent 目标。

Herdr 会向每个托管窗格注入调用方上下文：

```bash
printf '%s\n' "$HERDR_WORKSPACE_ID" "$HERDR_TAB_ID" "$HERDR_PANE_ID"
```

当 pane 命令应针对调用方自己的窗格时，优先 `--current`。省略目标可能会落到 UI 当前焦点窗格，那可能属于用户或另一个客户端。

发现在线状态：

```bash
herdr workspace list
herdr tab list --workspace "$HERDR_WORKSPACE_ID"
herdr pane current --current
herdr pane list --workspace "$HERDR_WORKSPACE_ID"
herdr agent list
```

创建类响应会给出下一步要用的 ID。`workspace create` 返回 `.result.workspace`、`.result.tab`、`.result.root_pane`。`tab create` 返回 `.result.tab` 和 `.result.root_pane`。`pane split` 把新窗格放在 `.result.pane`。

ID 和在线智能体名字的作用域是**一台 server**。两台已保存的 SSH 机器可以同时有 `w1:p1` 或名叫 `reviewer` 的智能体。在 TUI 里选中某台机器，不会改写你这个窗格里正在跑的命令的目标：它们仍使用继承来的 session 和 socket。要在目标主机上做远程控制，使用该主机明确的 session，并在那里重新发现 ID。

`herdr machine list` 列出的是已保存的连接配置，不是跨机器的窗格清单；脚本加 `--json`。只有用户要求时才添加、删除、启用或禁用配置。删除配置会断开客户端，但不会停止远端会话。添加机器时用远端默认 session，除非显式提供 `--remote-session`。安装流程在停止不兼容 server 之前会询问，默认是 No；未经用户同意不要批准替换。实验性 handoff 不是 `machine add` 的一部分。

