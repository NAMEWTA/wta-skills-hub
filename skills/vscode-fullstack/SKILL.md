---
name: vscode-fullstack
description: 配置 VS Code 或 VS Code Remote 的当前 Profile，补齐 Python、Vue、React、Go 的语言服务、格式化与保存动作，并保留已有的 Java 等配置。用户运行 /vscode-fullstack，或要求配置 VS Code Profile、安装全栈插件、补齐 Python/Vue/React/Golang 扩展与 settings.json 时使用。Remote SSH 里安装的扩展不会经 Settings Sync 上传。
license: MIT
---

# VS Code 全栈 Profile

让**当前正在使用的那一个** VS Code Profile 能写 Python、Vue、React 和 Go。已有语言（常见是 Java）的扩展和设置保持不动。扩展 ID、禁止安装项、settings 片段和 Profile 清单登记格式只在 [references/extensions-and-settings.md](references/extensions-and-settings.md)，改任何东西之前先读它。

## 先定位，再改

1. 找出这次要改的用户数据，不要猜目录。
   - 本机：Linux `~/.config/Code/User`，macOS `~/Library/Application Support/Code/User`，Windows `%APPDATA%\Code\User`。扩展目录在对应的 `~/.vscode/extensions`（Windows 为 `%USERPROFILE%\.vscode\extensions`）。
   - Remote SSH / `vscode-server`：远程机器上的 `~/.vscode-server/data/User`，扩展在 `~/.vscode-server/extensions`。用正在跑的那份 server 自带 CLI，不要用版本不同的桌面 `code` 往这个目录里装扩展。server 二进制在 `~/.vscode-server/cli/servers/Stable-<commit>/server/bin/code-server`，版本以旁边的 `product.json` 为准。
   - 本机和 remote 同时存在时，只改用户当前连着的那一份。看不清就停下来问。本技能不改 Cursor、Windsurf 或其它分支编辑器的目录，除非用户给出明确路径。
2. 读 `User/globalStorage/storage.json` 的 `userDataProfiles`。记下 Profile 的 `name` 和 `location`。用户口头说的名字（例如 fullstack）可能和磁盘上的 `name` 不一致。只有一个 Profile 时就改那一个，并在结果里写明磁盘名。有多个且对不上用户说的名字时，先问，不要新建空 Profile。不要重命名 Profile。
3. 读该 Profile 的 `settings.json` 和 `extensions.json`，再读扩展目录下的 `extensions.json`（CLI 的默认/旧清单）。两边分别记一份已安装 ID。
4. 改 `settings.json` 之前复制备份：`settings.json.bak-<YYYYMMDDHHMMSS>`，放在同一目录。
5. 只使用机器上已经存在的运行时（`python` / `uv`、`node`、`go`、`java`）。本技能不安装语言运行时，也不改已有的 `java.*`、`maven.*`、`python.defaultInterpreterPath`。

## 装扩展

按参考文件里的「缺失才安装」列表安装。已经存在的 ID 不要重装、不要升级，除非用户明确要求升级。

- 本机 `code` 可以带 `--profile "<磁盘上的 name>"`。
- `code-server` 会忽略 `--profile`（日志里是 `Ignoring option 'profile'`），扩展写进扩展目录的 `extensions.json`，**不会**写进 `User/profiles/<location>/extensions.json`。
- 无论用哪个 CLI，装完后都要核对 **当前 Profile** 的 `extensions.json`。缺的条目按参考文件「登记到 Profile」补进去。只出现在扩展目录清单里不算装到当前 Profile。
- 用与编辑器主版本匹配的 CLI 向 Marketplace 要包，这样 `engines.vscode` 才跟得上。不要拿更高版本的桌面 `code` 给旧的 `vscode-server` 装包。

参考文件「从当前 Profile 移除」里的 ID 如果出现在当前 Profile，从该 Profile 的清单去掉。扩展目录只在**没有任何** Profile 清单仍引用该 `relativeLocation` 时才删除。

## 合并设置

把参考文件里的设置片段合并进当前 Profile 的 `settings.json`，不要整文件覆盖。

- 不设置全局 `editor.formatOnSave` 和 `files.trimTrailingWhitespace`。格式化只写进各语言块，避免 Java 等已有语言在保存时被整文件重排。
- 不设置全局 `editor.tabSize`。JavaScript / TypeScript / Vue / JSON / HTML / CSS 用 2 个空格，Python 用 4 个空格，Go 用 Tab（`editor.insertSpaces: false`）。
- `eslint.validate`、`emmet.includeLanguages` 以及已有的 `terminal.integrated.env.*` 做并集。已有 `PATH` 覆盖时，把 `$(go env GOROOT)/bin` 和 `$(go env GOPATH)/bin` 插进去，不要删掉原来的项，也不要写死某台机器的绝对路径。没有 `PATH` 覆盖、且 `go` 已在默认 `PATH` 里时，不要新造一条 `PATH`。
- 用户设置里不写 `typescript.tsdk`、Ruff 行宽、Prettier 引号或分号、`eslint.useFlatConfig`。这些属于具体仓库的 `.prettierrc`、`pyproject.toml` 或该仓库的 `.vscode/settings.json`。
- `python.analysis.typeCheckingMode` 用 `basic`，除非用户要求 `strict`。
- 本机有 `go` 时执行 `go install golang.org/x/tools/gopls@latest`，并确认 `gopls version`。没有 `go` 时只装扩展，并说明 gopls 要等 Go 装好后再装。

不要改当前仓库的 `.vscode`，除非用户明确要求配置某一个项目。

## 同步

Settings Sync 不会把 Remote SSH、WSL、Dev Container 窗口里安装的扩展上传或下载。远程改完后，把参考文件里的本机安装命令交给用户，让他们在**未连接 Remote** 的窗口里、切到同一个 Profile 后执行，再在 Accounts 里确认 Settings、Extensions、Profiles 已勾选，并运行 **Settings Sync: Sync Now**。远程这份 `settings.json` 下次从本机同步下来时可能被覆盖；要进云端，同一段设置也得出现在本机 Profile 里。不要声称同步已经完成。

## 验收

- `settings.json` 能解析，原有 Java / Maven / 解释器键还在。
- 当前 Profile 的 `extensions.json` 含有本次新加的每个 ID，且不含这次从该 Profile 移除的冲突 ID。
- 配置了 Go 时，`gopls version` 成功。
- 告诉用户执行 **Developer: Reload Window**。没有图形界面时，不要声称补全、诊断或保存格式化已经在编辑器里验证过。
