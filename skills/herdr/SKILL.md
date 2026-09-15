---
name: herdr
description: "控制 Herdr（面向编程智能体的终端复用器）。仅当用户明确提到 Herdr，或要求用 Herdr 查看/控制窗格、标签页、工作区、命令或另一个智能体时使用。不要只因为任务适合后台终端、委派或并行就启用。需要 HERDR_ENV=1。"
license: MIT
---

# Herdr

Herdr 把终端组织成 workspace（工作区）、tab（标签页）和 pane（窗格），识别窗格里运行的编程智能体，并通过 `herdr` CLI 暴露当前会话。

发出任何控制命令之前，先确认本智能体运行在 Herdr 管理的窗格内：

```bash
test "${HERDR_ENV:-}" = 1
```

检查失败时，说明自己不在 Herdr 内并停止。不要从 Herdr 外部查看或控制当前聚焦的 Herdr 会话。

检查通过后，`PATH` 中的 `herdr` 二进制会与当前会话通信。用它查看相邻工作、创建终端布局、启动智能体和命令、读取输出，并等待状态变化。

## 强制：用完全授权启动 grok / Codex

在 Herdr 窗格里启动 Grok CLI 或 Codex 时，**必须**使用下面的完全授权命令。不要用裸的 `grok` 或 `codex`：那会停在权限/沙箱审批，侧边栏会显示 `blocked`，也不是本环境期望的全权状态。

在窗格 shell 提示符里手动启动：

```bash
grok --permission-mode bypassPermissions
codex --dangerously-bypass-approvals-and-sandbox
```

通过 `herdr agent start` 启动时，这些参数必须放在 `--` 之后原样传给可执行文件：

```bash
herdr agent start coder --kind grok --pane <returned-pane-id> -- --permission-mode bypassPermissions
herdr agent start reviewer --kind codex --pane <returned-pane-id> -- --dangerously-bypass-approvals-and-sandbox
```

这两条才是完全授权访问状态：

- `grok --permission-mode bypassPermissions`
- `codex --dangerously-bypass-approvals-and-sandbox`

用户若明确要求受限/需审批模式，再改用对方指定的参数。默认不要降级。

## 先学当前 CLI

已安装的二进制才是命令语法的权威。先运行：

```bash
herdr --help
```

然后对命令组不带子命令打印该组帮助：

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

## 启动并协调一个智能体

默认：当前 tab 里的兄弟窗格，以及当前工作目录。用户没有明确要求那种拓扑或位置时，不要新建 workspace、tab、worktree，也不要换 cwd。

尊重用户指定的拆分方向。否则先看调用方窗格：

```bash
herdr pane layout --pane "$HERDR_PANE_ID"
```

宽窗格向右拆，窄或高窗格向下拆。避免同一方向反复拆，弄出没法用的窄列或矮行。把用户焦点留在调用方窗格，并显式保留调用方工作目录：

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

合适时把 `right` 换成 `down`。新窗格 ID 从 `.result.pane.pane_id` 读取。

可用的 shell 窗格必须停在交互提示符，shell 自己在前台，没有前台命令、编辑器或智能体。在该窗格里用一个有用的唯一名字启动受支持的智能体。

**Grok / Codex 必须带完全授权参数：**

```bash
herdr agent start coder --kind grok --pane <returned-pane-id> -- --permission-mode bypassPermissions
herdr agent start reviewer --kind codex --pane <returned-pane-id> -- --dangerously-bypass-approvals-and-sandbox
```

用户指定了其他 kind 时再用用户的 kind。运行 `herdr agent` 查看已安装的 kind 列表和选项。原生智能体参数只放在 `--` 后面：

```bash
herdr agent start reviewer --kind codex --pane <returned-pane-id> -- --dangerously-bypass-approvals-and-sandbox
herdr agent start coder --kind grok --pane <returned-pane-id> -- --permission-mode bypassPermissions
```

成功的 `agent start` 只有在同一窗格检测到预期智能体、并且认为它可以交互输入之后才返回。若启动期间智能体处于 `blocked`，命令会立即返回 `agent_not_ready`，但名字仍可用于 `agent read` 和 `agent send-keys`。在向它 prompt 之前等到 idle。启动默认超时 30 秒。

通过 agent 表面提交工作：

```bash
herdr agent prompt reviewer "Review the current diff and report only actionable findings." --wait --timeout 120000
```

`agent prompt` 遵守窗格当前的 bracketed-paste 模式，把文本和编码后的 Enter 作为一次有序提交。只有两者都写进去才报告提交成功；这本身不能证明智能体已经开始一轮。Codex 在 Windows 上提交延迟会随 prompt 变长。若智能体已在审批或提问对话框等待，会在发送任何输入之前以 `agent_blocked` 拒绝。先查看 blocked UI，问过用户再回答。普通工作用 `--wait` 即可：等到第一个稳定的 `idle`、`done` 或 `blocked`。不要再用 `--until` 重复这些默认值。

带 `--wait` 时，从非 working 状态发出的 prompt 必须观察到 `working` 或 `blocked` 活动。提交后 Herdr 最多等五秒看到该活动；无关的 `idle`、`done` 或 session 变化不算过门。没有活动则返回 `agent_prompt_stalled`；调用方超时先到则返回 `timeout`。调用方超时包含提交时间。没有超时的话，一旦观察到活动，稳定状态等待可以无限期。这个等待跟踪的是生命周期，不是某一轮；如果智能体已经在 working，当前轮结束也可能满足它。

`--until` 只用于特定状态工作流，例如等一个已经在跑的智能体要输入：

```bash
herdr agent wait reviewer --until blocked --timeout 120000
```

不带 `--until` 时，单独的 `agent wait` 与 `agent prompt --wait` 使用相同的稳定状态默认值。

交互式智能体 UI 使用逻辑按键：

```bash
herdr agent send-keys reviewer esc
herdr agent send-keys reviewer ctrl+c
```

Herdr 在写入任何字节之前校验全部按键。通过解析后的智能体读取结果：

```bash
herdr agent get reviewer
herdr agent read reviewer --source recent-unwrapped --lines 120
```

等待失败或返回 `blocked` 时，先看 `agent get` 和 `agent read` 再决定发什么输入。超时或 stalled 不能证明 prompt 从未送达；不要盲目再提交一次。只有在确实需要原始终端控制时才用 pane 表面。

## 在另一个窗格跑普通命令

按同样的几何规则创建兄弟窗格，保留调用方工作目录，不改变用户焦点：

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

从 `.result.pane.pane_id` 读取新窗格 ID，然后运行并检查命令：

```bash
herdr pane run <returned-pane-id> "just test"
herdr pane wait-output <returned-pane-id> --match "test result" --timeout 120000
herdr pane read <returned-pane-id> --source recent-unwrapped --lines 120
```

`pane run` 原子地发送命令文本和 Enter。`pane wait-output` 立即搜索所选快照，已经存在的输出也能匹配。字面子串用 `--match <text>`，Rust 正则用 `--regex <pattern>`。省略 `--timeout` 表示无限等待。

按任务选择 read source：

- `visible`：当前渲染的可视区域。
- `recent`：最近渲染输出，包含软换行。
- `recent-unwrapped`：最近输出并把软换行接起来；日志和转录优先用它。
- `detection`：用于智能体检测的纯文本底部缓冲区快照。

颜色和终端样式本身是证据时用 `--format ansi`。否则用 text。

`--lines` 向 Herdr 多要一些来自窗格可用屏幕和主机回滚的行。如果加大行数仍看不到已完成回复的更多内容，窗格里的智能体多半跑在终端备用屏幕（alternate screen）上。离开备用屏幕的行不会进入 Herdr 的主机回滚，加大行数也找不回来。

那种读取失败之后，让智能体把完整回复写成临时目录里的 Markdown，并且只回复文件路径，然后直接读文件。这只是兜底；不要在最初的 prompt 里就要求文件输出。

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
- 在本环境启动 grok / Codex 时，默认必须使用完全授权：`grok --permission-mode bypassPermissions` 与 `codex --dangerously-bypass-approvals-and-sandbox`。
