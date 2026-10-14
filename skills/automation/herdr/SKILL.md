---
name: herdr
description: 仅在用户明确提到 Herdr，或要求用 Herdr 查看/控制窗格、标签页、工作区、命令或另一个智能体时使用；默认以 claude --dangerously-skip-permissions 启动 Claude Code 子智能体。不因任务适合后台终端、委派或并行而自行启用。需要 HERDR_ENV=1。
license: MIT
compatibility: Requires HERDR_ENV=1 and a working Herdr CLI (checked against herdr 0.9.0) in the actual managed host/session; commands must match local --help.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-14'
  wta-explicit-only: 'true'
---
# Herdr

Herdr 是面向编程智能体的终端复用器：把终端组织成 workspace → tab → pane，识别窗格里运行的编程智能体，并通过 `herdr` CLI 暴露当前会话。Herdr 不提供智能体本身，只在窗格里启动本机已安装的智能体程序（如 `claude`）并跟踪其状态。

## 1. 前置检查

只有用户明确选择 Herdr 时才使用。任何控制命令之前，先确认本智能体运行在 Herdr 托管窗格中：

```bash
test "${HERDR_ENV:-}" = 1
```

原生 PowerShell 用 `$env:HERDR_ENV -eq '1'` 判断。检查失败就告诉用户"当前不在 Herdr 中"并停止；不要从 Herdr 外部查看或控制聚焦中的 Herdr 会话。检查通过后，`PATH` 中的 `herdr` 会连到当前会话。

## 2. 学习当前 CLI

已安装的二进制是语法的唯一权威。先运行 `herdr --help`，再只查询本次需要的命令组（不带子命令运行即打印帮助）：

```bash
herdr agent      # 也包括 pane / workspace / tab / worktree / terminal /
                 # notification / integration / session / machine
```

- 不要运行裸 `herdr`：它会启动或附着 TUI。
- 不要靠省略参数试探会改状态的嵌套命令；`herdr workspace create` 在默认参数下就会真的执行。可用 `herdr <组> <子命令> --help` 查看详细参数。
- 多数控制命令返回 JSON。ID 和状态从响应里读，不要猜。

## 3. 布局、窗格与智能体

| 原语 | 用途 |
|---|---|
| workspace / tab / pane 拓扑 | 组织终端位置 |
| `pane` 命令 | 控制原始终端：shell、测试、服务、输入与输出 |
| `agent` 命令 | 控制当前占据某窗格、已被识别的编程智能体，并解释其生命周期 |

窗格可以没有智能体。`agent start` 只能用于已存在的空闲 shell 窗格，**不会**创建、拆分或移动布局。普通进程用 pane 命令；需要 Herdr 校验智能体身份或解释状态时用 agent 命令。

智能体状态：

- `idle` / `done`：通常可以接收输入，但不保证一个陌生的审批对话框已被识别，也不保证保留身份的智能体在前台。二者由 server 的 seen 状态区分：显式 focus 会标记已看，read 不会；各 TUI 客户端的 Done 徽章独立跟踪，可能与 CLI 不同。
- `working`：正在处理。
- `blocked`：Herdr 识别到审批或提问界面。
- `unknown`：有智能体但无法有把握分类，**不能证明已完成**。
- 部分智能体在后台任务或子智能体仍运行时就显示 `idle`，所以稳定状态不等于后台工作全部结束。

智能体目标：`agent` 命令接受唯一的在线智能体名字，或当前承载该智能体的 pane ID；不接受 terminal ID，也不接受 `claude` 这类 kind 标签。名字须匹配 `[a-z][a-z0-9_-]{0,31}`，在存活智能体中唯一。名字跟随当前窗格占用者；智能体退出、被 release 或被替换时清除。用 Ctrl+Z 挂起后运行非智能体命令，只要原进程存活就保留身份，但保留身份不代表它在前台，发送输入前先看窗格。

## 4. ID 与调用方上下文

公开 ID 是不透明的稳定句柄：workspace `w1`，tab `w1:t1`，pane `w1:p1`。已关闭的 tab/pane ID 不复用。

- 窗格移到其他 workspace 后得到新 ID。`pane move` 之后改用 `.result.move_result.pane.pane_id` 或智能体名字；旧值 `.result.move_result.previous_pane_id` 只对被移动进程自身的继承上下文有效，不能当通用目标。
- Herdr 向每个托管窗格注入调用方上下文：

  ```bash
  printf '%s\n' "$HERDR_WORKSPACE_ID" "$HERDR_TAB_ID" "$HERDR_PANE_ID"
  ```

- pane 命令要作用于自己所在窗格时优先 `--current`。`pane split` 省略目标时，有 `HERDR_PANE_ID` 就用调用方窗格，否则用聚焦窗格；其他命令可能落到 UI 聚焦窗格，而那可能属于用户或另一个客户端。
- 发现在线状态：

  ```bash
  herdr workspace list
  herdr tab list --workspace "$HERDR_WORKSPACE_ID"
  herdr pane current --current
  herdr pane list --workspace "$HERDR_WORKSPACE_ID"
  herdr agent list
  ```

- 创建响应给出下一步的 ID：`workspace create` → `.result.workspace`、`.result.tab`、`.result.root_pane`；`tab create` → `.result.tab`、`.result.root_pane`；`pane split` → `.result.pane`。

## 5. 启动 Claude 智能体（默认流程）

除非用户明确要求其他 kind，否则子智能体一律使用 Claude Code，并以 `claude --dangerously-skip-permissions` 启动。这是本技能所有者选择的默认方式，适用范围仅限通过本技能启动的 Claude 子智能体；不改变当前宿主（你自己）的审批或沙箱。

**第 1 步：选位置。** 默认在当前 tab 开兄弟窗格，并保持当前工作目录。用户没有明确要求时，不新建 workspace、tab、worktree，也不换 cwd。尊重用户指定的方向；否则先看调用方窗格：

```bash
herdr pane layout --pane "$HERDR_PANE_ID"
```

宽窗格向右拆，窄或高窗格向下拆；避免同方向反复拆出过窄的列或过矮的行。

**第 2 步：拆分窗格，保持用户焦点：**

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

合适时把 `right` 换成 `down`。新窗格 ID 取自 `.result.pane.pane_id`。

**第 3 步：启动 Claude。** 窗格必须停在交互 shell 提示符，前台没有命令、编辑器或智能体。给它一个有意义的唯一名字，原生参数放在 `--` 之后：

```bash
herdr agent start reviewer --kind claude --pane <返回的-pane-id> -- --dangerously-skip-permissions
```

`--kind claude` 对应可执行文件 `claude`，相当于在该窗格里输入 `claude --dangerously-skip-permissions`。不同的是，Herdr 会等到在同一窗格检测到 Claude 且可以交互输入才返回成功，并分配名字、跟踪状态。默认超时 30 秒，可用 `--timeout <ms>` 调整，上限 300000。

**启动例外：**

- 用户要求受限、只读或保留审批时，去掉 `-- --dangerously-skip-permissions`。
- 用户指定其他 kind 时用 `--kind <kind>`，可选值以 `herdr agent start --help` 为准，不自动套用 Claude 参数。
- 启动时出现确认或信任界面（例如首次使用该参数时的风险确认），`agent start` 会立即返回 `agent_not_ready`，但名字仍可用于 `agent read` 和 `agent send-keys`。先读取界面内容，交给用户决定；不要擅自确认。等它变为 `idle` 后再发送任务。
- 找不到 `claude` 或启动超时时，读取窗格输出并报告，不换用其他 kind 或其他权限参数重试。

## 6. 下发任务与读取结果

由于子智能体跳过了权限确认，任务 prompt 要写清目标、允许修改的文件范围、验收标准和停止条件。多个智能体不能同时修改同一文件或共享工作树中的重叠内容。

```bash
herdr agent prompt reviewer "Review the current diff and report only actionable findings." --wait --timeout 120000
```

- `agent prompt` 按窗格当前的 bracketed-paste 模式，把文本和 Enter 作为一次有序提交写入。提交成功不代表智能体已开始一轮工作。
- 智能体已停在审批或提问界面时，会以 `agent_blocked` 拒绝，不写入任何内容。先检查界面，回答前询问用户。
- `--wait` 等第一个稳定的 `idle`、`done` 或 `blocked`，普通任务用它就够，不要再用 `--until` 重复这些默认值。从非 working 状态发出时，提交后 5 秒内必须观察到 `working` 或 `blocked`，否则返回 `agent_prompt_stalled`。调用方超时先到则返回 `timeout`；超时包含提交时间。不设超时时，观察到活动后会无限等待。这个等待跟踪的是生命周期而不是某一轮；智能体已在 working 时，当前轮结束也可能满足它。
- `--until` 只用于特定状态流程，例如等待一个已在运行的智能体请求输入：

  ```bash
  herdr agent wait reviewer --until blocked --timeout 120000
  ```

  单独的 `agent wait` 不带 `--until` 时，与 `prompt --wait` 使用同一组默认状态。
- 界面控制用逻辑按键；Herdr 会先校验全部按键再写入：

  ```bash
  herdr agent send-keys reviewer esc
  herdr agent send-keys reviewer ctrl+c
  ```

- 读取结果：

  ```bash
  herdr agent get reviewer
  herdr agent read reviewer --source recent-unwrapped --lines 120
  ```

等待失败或返回 `blocked` 时，先 `agent get` 和 `agent read`，再决定发送什么。timeout 或 stalled 不能证明 prompt 没有送达，**不要盲目重发**，尤其是会改文件的任务。只有确实需要原始终端控制时才改用 pane 命令。

## 7. 在其他窗格运行普通命令

按第 5 节的几何规则 `pane split ... --no-focus` 拆出窗格，取 `.result.pane.pane_id`，然后：

```bash
herdr pane run <pane-id> "just test"
herdr pane wait-output <pane-id> --match "test result" --timeout 120000
herdr pane read <pane-id> --source recent-unwrapped --lines 120
```

- `pane run` 把命令文本和 Enter 一起排队；成功只表示已被接受，不表示命令已执行。在 macOS 上，超过终端当前规范行输入长度的命令会在排队前被拒绝；等 shell 提示符出现后再重试。
- `pane wait-output` 立即搜索所选快照，已有的输出也能匹配。`--match` 匹配字面子串，`--regex` 使用 Rust 正则。省略 `--timeout` 表示无限等待。
- `--source` 的选择：`visible` 是当前可视区域；`recent` 是最近输出，含软换行；`recent-unwrapped` 是最近输出并接上软换行，适合日志和对话记录；`detection` 是智能体检测用的底部纯文本快照。
- 颜色和样式本身是证据时加 `--format ansi`，否则用文本格式。
- `--lines` 会从屏幕和主机回滚缓冲区多取行。备用屏幕（alternate screen）的内容不进入回滚；对受支持的 idle 智能体，Herdr 能取回部分应用自身的历史，但不保证都能取回。
- 加大读取范围后仍看不到完整回复时，作为兜底，让智能体把结果写成临时目录里的 Markdown，只回复文件路径，再在同一台机器上读取该文件。不要在第一次 prompt 里就要求写文件。

## 8. 远程机器（SSH）

ID 和智能体名字只在一个 server 内有效；两台机器可以同时有 `w1:p1` 或 `reviewer`。在 TUI 里切换机器不会改变你所在窗格中命令的目标。控制已保存的 SSH 机器时，发现和后续每条命令都加同一个全局前缀：

```bash
herdr --machine <label-or-id> agent list
herdr --machine <label-or-id> pane list
herdr --machine <label-or-id> agent prompt <远端智能体名> "Reply with your current status." --wait --timeout 120000
```

- 选择器必须是已启用的保存配置 ID 或唯一标签（区分大小写），不能是任意 SSH 主机名。不能与 `--session` 或 `--remote` 组合。本地 ID 和 `--current` 不能指向远端窗格。
- 远端 server 必须已在运行且 API 兼容。转发不会安装、启动或重启 server，也不会回退到本地。本地配置、会话管理、安装命令和交互附着不会被转发。远端 worktree 路径须为绝对路径、`~` 或以 `~/` 开头；插件链接路径须为绝对路径。
- 连接失败不能证明写操作没有生效；重试前先检查远端状态。
- `herdr machine list`（脚本加 `--json`）列出连接配置，不是跨机器窗格清单。诊断用 `herdr machine status [<label-or-id>] --json`。
- 只有用户要求时才添加、删除、启用或禁用配置；删除配置不会停止远端会话。`herdr machine reconnect` 需要用户在自己的终端完成 SSH 认证，不要代为运行。setup 停止不兼容 server 前会询问，默认 No，未经用户同意不要批准替换。

## 9. 安全与协调规则

- 后台工作用 `--no-focus`，除非用户要求切换上下文。
- 只用 `--current`、明确的 pane ID 或唯一智能体名字作为目标；不依赖其他客户端的聚焦窗格；ID 从 JSON 解析，不从侧边栏顺序或示例推导。
- 不关闭不是自己创建的 workspace、tab、pane 或 session，除非用户明确要求。CLI/API 关闭不会像 TUI 那样确认最后一个窗格。`workspace close --group` 会同时关闭主 workspace 和关联的 worktree workspace；不要为了绕过 `workspace_group_close_required` 而加它。
- 只在用户核实过仓库后才用 `--trust-repository`；它授予单次 Git 信任，不是 worktree 命令失败后的常规重试。
- 不为消除 `blocked` 而加入新的权限参数或替用户回答审批。
- 客户端与 server 版本可能不同；依赖新功能前先 `herdr status`。缺少某个方法不构成停止或升级 server 的许可。
- 不在活动会话中运行 `herdr server stop`，除非用户明确要停止 server 及其所有窗格进程。永远不要杀主 Herdr 进程；需要隔离的实验使用命名测试 session。
- 退出码：server 错误以 JSON 写到 stderr，退出码 1；CLI 语法错误退出码 2。

## 10. 完成与报告

报告实际目标 ID 或名字、执行的动作、发送/开始/完成三个状态的证据、读取到的输出、文件变化和未知项。注明子智能体是否以 `--dangerously-skip-permissions` 运行。只有状态已核对且产物通过验收，才能说子任务完成；派发成功不等于工作完成。
