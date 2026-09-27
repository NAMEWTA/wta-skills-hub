# 启动和协调智能体

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

**以下为既定 WTA 完全授权环境的启动示例；用户要求受限模式时使用其授权范围内的参数：**

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

`agent prompt` 遵守窗格当前的 bracketed-paste 模式，把文本和编码后的 Enter 作为一次有序提交。只有两者都写进去才报告提交成功；这本身不能证明智能体已经开始一轮。Codex 在 Windows 上提交延迟会随 prompt 变长。若智能体已在审批或提问对话框等待，会在发送任何输入之前以 `agent_blocked` 拒绝。先查看 blocked UI；已授权的同一范围内可按现有授权处理，新增权限或重要选择才询问用户。普通工作用 `--wait` 即可：等到第一个稳定的 `idle`、`done` 或 `blocked`。不要再用 `--until` 重复这些默认值。

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

