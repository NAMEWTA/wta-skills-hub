---
name: herdr
description: "控制 Herdr 的窗格、标签页、工作区和已识别智能体。仅在用户明确提及 Herdr 或要求通过 Herdr 控制终端时使用；不因任务适合后台或并行而启用。"
license: MIT
---

# Herdr

环境要求：必须在 HERDR_ENV=1 的 Herdr 托管窗格中，并有可用 herdr CLI。

只控制用户任务所需的终端对象。先确认本智能体处在 Herdr 托管环境：

```bash
test "${HERDR_ENV:-}" = 1
```

失败即停止，不从外部访问 UI 当前聚焦会话。通过后运行 `herdr --help`，仅查询当前任务相关命令组的帮助；裸 `herdr` 会启动/附着 TUI，不能用来发现能力。

## 目标与工作流

- 使用 `--current`、实际响应返回的 pane ID 或唯一在线 agent 名称，不依赖 UI 焦点或示例 ID。移动 pane 后重读新 ID。
- 先看 workspace/pane/agent 的实际状态。ID 只在一台 server 中有效；远程目标须在目标主机对应 session 重新发现。[CLI 与目标语义](references/cli-and-targets.md)
- 启动或向智能体提交任务时读 [智能体工作流](references/agents.md)。默认保留当前 cwd、tab 与用户焦点，按窗格尺寸和用户指定方向拆分。
- 普通 shell 命令及输出读取使用 [pane 工作流](references/panes.md)。pane 成功接收输入不等于任务成功。
- 关闭、移动、worktree、远程机器或版本兼容问题先读 [协调边界](references/safety.md)。

## WTA 启动约定

仅在本仓库既定、已授权的 WTA Herdr 工作环境，Grok/Codex 默认启动参数如下：

```bash
herdr agent start coder --kind grok --pane <returned-pane-id> -- --permission-mode bypassPermissions
herdr agent start reviewer --kind codex --pane <returned-pane-id> -- --dangerously-bypass-approvals-and-sandbox
```

这不是其他机器的通用授权。用户指定受限/审批模式时优先遵从，且不得突破当前宿主权限；参数以安装版本的帮助为准。不要仅为消除 blocked 状态而扩大权限。

## 验收与停止

- prompt 超时或 stalled 时先 `agent get/read`，不能假设未送达并盲目重发。
- `blocked` 先读取实际界面，依据现有授权处理；新的权限或重要决定交回用户。`unknown` 不是完成证据。
- 结合状态和输出判断结果；输出因 alternate screen 截断时才让目标写临时结果文件，不要求所有任务默认写文件。
- 不擅自关闭别人的 pane/session、不停止活动 server；实验使用独立命名测试 session。
- 最终报告实际目标、已执行动作、观察到的结果和未完成事项，不将提交成功当作任务完成。
