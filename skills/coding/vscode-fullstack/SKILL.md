---
name: vscode-fullstack
description: "配置当前 VS Code 或 Remote Profile 的 Python、Vue、React、Go 扩展和语言设置，同时保留已有配置。用于编辑器环境配置；编写应用代码、安装运行时或修改项目规范不适用。"
license: MIT
---

# VS Code 全栈 Profile

只配置用户指定或当前可确认的 Profile。扩展与设置以 [扩展和设置参考](references/extensions-and-settings.md) 为准；不覆盖用户已有选择，不顺便配置其他编辑器或项目。

## 定位目标

1. 确认桌面 VS Code 或 Remote SSH/WSL/Container 的目标环境与 CLI 版本。使用该环境现有 CLI，查 `--help` 确认 Profile 支持；不要用版本不匹配的桌面 CLI 给旧 server 安装扩展。
2. 结合当前窗口、CLI 和 `User/globalStorage/storage.json` 定位 Profile。没有 `userDataProfiles` 不代表没有 Profile：默认 Profile 使用 `User/settings.json`，扩展以当前 CLI 与默认清单为准。
3. 命名 Profile 使用 `User/profiles/<location>`。仅有一个命名 Profile 也不能证明它当前激活；存在多个合理目标而无法确认时，询问目标，不新建或重命名。
4. 读取目标设置、扩展清单及所用扩展目录。Settings 尚不存在可以创建；定位不明不能猜目录。

常见 `User` 根目录：Linux `~/.config/Code/User`、macOS `~/Library/Application Support/Code/User`、Windows `%APPDATA%\Code\User`；Remote 的实际路径从运行中的 server/CLI 确认，常见为 `~/.vscode-server/data/User`。

## 最小修改

- 修改前对每个将写入的设置/清单做不覆盖的备份，记录原先不存在的文件。
- `settings.json` 是 JSONC，可能包含注释、尾逗号。使用 JSONC 编辑器或局部文本补丁；禁止用严格 JSON 读取后整文件序列化，丢失注释或用户配置。编辑后按 JSONC 验证。
- 只补缺失扩展和设置。现有 formatter、tabSize、Java/Maven、解释器路径以及仓库规范优先；冲突时保留原值并报告。
- 数组取并集，对象按键合并；不设置全局保存格式化、缩进或去尾空白。详细片段按语言读取参考文件。
- Profile 支持与清单格式按当前版本核实。若 server CLI 不支持 `--profile`，按参考文件补登记并读回；没有验证格式时不手改内部数据库。
- 不安装语言运行时。Go 已存在且缺少可用 `gopls` 时才安装兼容版本；不要因配置 Profile 升级已有工具或隐式切换 Go toolchain。

## 验收与同步

核对目标 Profile 含所需扩展，原设置和无关扩展仍保留；配置了 Go 时验证 `gopls version`。记录需要 Reload Window 或人工确认的编辑器功能。

Remote 扩展不经 Settings Sync 同步。只有用户需要本机同步时，交付本机目标 Profile 的缺失项命令；未实际检查同步结果或 GUI，不宣称同步、补全或保存动作已验证。
