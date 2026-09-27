# 普通命令与输出

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

