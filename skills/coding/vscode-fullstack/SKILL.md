---
name: vscode-fullstack
description: "配置当前或指定 VS Code/Remote Profile 的 Python、Vue、React、Go 扩展和 JSONC 设置并保留定制。用于编辑器环境配置；应用代码编写、安装语言运行时或修改项目规范不适用。"
license: MIT
---

# VS Code 全栈 Profile

只处理确认的 Profile。按需读取 [扩展与设置](references/extensions-and-settings.md)，用户已有 formatter、解释器和项目约定优先，不因模板覆盖现有选择。

## 环境与定位

先确认 Stable/Insiders/便携版、系统、CPU 架构、当前 CLI 与窗口，区分本机、SSH、WSL、Container 扩展主机。不同环境的 localhost、PATH 和文件系统不能混用；macOS 从 Dock 启动的环境可能与 shell 不同。

CLI 先 --help/--version，不要用版本不匹配的桌面 CLI 管理旧 server。默认 Profile 不要求 userDataProfiles：常见 User/settings.json；命名 Profile 从当前实例的实际存储定位，不因只有一个就认定当前激活。便携版和 Insiders 不套用 Stable 路径。

常见根目录：macOS ~/Library/Application Support/Code/User，Windows %APPDATA%\Code\User，Linux $XDG_CONFIG_HOME/Code/User（默认 ~/.config）。Remote 从活动 server 确认，不能猜目录或手改内部数据库解决不支持的 --profile。

## 最小编辑

备份本轮文件/清单，记录原先不存在和权限。settings.json 是 JSONC，保留注释、尾逗号和用户键，使用 JSONC 编辑或精确补丁再校验，禁止严格 JSON 整文件重排。Profile 未确认时不新建或重命名。

只补缺失项；数组去重并集，对象按键合并，冲突保留原值并报告。不要全局开启格式化、改缩进或重写 workspace 规范。扩展来源与目标版本确认后安装，不能因需要扩展而关闭 Workspace Trust、安全检查或静默运行项目脚本。

不安装语言运行时。Go 已存在且用户任务需要缺失的 gopls 时，只安装兼容版本，禁止隐式升级 Go toolchain。架构不同的扩展/工具不得以路径存在当可运行。

## 验收

检查实际目标 Profile 的扩展清单和无关设置保留情况；需要 Go 时核对 gopls version。Reload Window、GUI 补全、Remote 功能分别标记实测/待验证。Remote 扩展不宣称已通过 Settings Sync 同步；没有本机验证就只提供本机缺失项方案。
