---
name: herdr
description: 仅在用户明确要求通过 Herdr 控制终端时，管理已识别的窗格、工作区与 Agent 协作。必须确认 Herdr 托管环境；不因普通任务适合并行或后台执行而自行启用。
license: MIT
compatibility: Requires HERDR_ENV=1 and a working Herdr CLI in the actual managed host/session; commands must match local --help.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-06'
  wta-explicit-only: 'true'
---
# Herdr

## 输入与输出契约

要求用户明确选择 Herdr；再定位 session、pane/agent ID、工作目录和任务边界。并行任务逐一给出可写文件范围、验收与停止条件。

报告实际目标 ID、发送/开始/完成三个状态、读取到的结果、文件变化和未知项。只有状态已核对且任务产物通过验收，才能说子任务完成。

示例：“请通过 Herdr 在当前 tab 的右侧启动一个受限 reviewer，保持当前焦点。”应进入本技能；“这个任务适合并行，你自己找办法加速吧。”不应由本技能接管。

必须处在 HERDR_ENV=1 的托管环境且 CLI 可用；环境标记不是额外权限。先核实所在主机/session，不能从外部接管 UI 聚焦窗口。

```bash
test "${HERDR_ENV:-}" = 1
herdr --help
```

原生 PowerShell 使用对应环境变量判断，不照搬 POSIX test。版本不支持的平台/命令就停止；裸 herdr 会启动/附着 TUI，不能当能力发现命令。

## 目标与按需工作流

先读实际 workspace/pane/agent 状态；使用 --current、返回的 pane ID 或唯一在线 agent 名。移动后重新读取 ID，不依赖 UI 焦点、示例 ID 或其他主机的 ID。

[CLI 与目标](references/cli-and-targets.md)、[Agent 工作流](references/agents.md)、[Pane 工作流](references/panes.md)、[协调边界](references/safety.md) 按任务读取。默认保留 cwd、tab、用户焦点，按实际尺寸和用户方向分屏。

## 权限与并发

沿用宿主当前权限。不得从历史团队默认值推导关闭审批或沙箱的授权；不为消除 blocked 扩大权限。用户指定受限模式始终优先。

多个 Agent 不同时修改同一文件或共享工作树中的重叠内容；先分配文件边界，确需隔离时使用经授权的独立 worktree。任务携带目标、验收和停止条件，不把父任务的授权无边界传递。实际 CLI 能力以当前 --help 为准，不编造后台接口。

## 完成与停止

prompt 超时/stalled 先 get/read，不盲重发导致重复操作；pane 接收输入不是任务成功。blocked 查实际需求，新权限决定交回用户；unknown 不是完成。输出截断才让目标写具名临时结果，不默认生成大量文件。

不关闭别人的 pane/session、不停止活动 server、不取消其他任务。实验使用独立测试 session。最终报告目标、动作、状态/输出证据、文件变化与未完成事项；分派成功不能冒充工作完成。
