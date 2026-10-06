# 扩展与设置

这份清单是候选参考，不是无条件安装白名单。仅选择本次所需语言和功能；执行时核对官方 Marketplace 的发布者、当前支持版本及弃用信息。已有用户选择优先，不把本清单当成永久最新事实。

## 缺失才安装

Python 语言服务只安装 `ms-python.python`，让 CLI 拉上它声明的依赖（常见是 `ms-python.vscode-pylance`、`ms-python.debugpy`、`ms-python.vscode-python-envs`）。依赖没出现时再逐个补，不要为了补齐去升级已经装好的 Python 扩展。

| ID | 作用 |
| --- | --- |
| `ms-python.python` | Python 解释器、调试、测试 |
| `charliermarsh.ruff` | Python 格式化、导入排序、lint。Pylance 继续负责补全和类型 |
| `Vue.volar` | Vue - Official。Vue 2 的 Vetur 不能和它一起用 |
| `sdras.vue-vscode-snippets` | Vue SFC 片段 |
| `formulahendry.auto-rename-tag` | Vue 模板和 JSX 的成对标签重命名 |
| `bradlc.vscode-tailwindcss` | Tailwind 类名补全。项目不用 Tailwind 时不介入 |
| `dsznajder.es7-react-js-snippets` | React 片段（如 `rafce`）。JS/TS 语言服务用编辑器内置 |
| `dbaeumer.vscode-eslint` | JS / TS / Vue 诊断 |
| `esbenp.prettier-vscode` | JS / TS / Vue / JSON / HTML / CSS 格式化 |
| `golang.go` | Go 官方扩展，语言服务是 gopls |
| `usernamehw.errorlens` | 行内错误 |
| `EditorConfig.EditorConfig` | 尊重仓库 `.editorconfig` |
| `tamasfe.even-better-toml` | `pyproject.toml` 高亮和校验 |

下面这些只有用户点名才装：`eamodio.gitlens`（已有 Git Graph 时不要主动加）、`ms-azuretools.vscode-docker`、`humao.rest-client`、`redhat.vscode-yaml`、`ms-toolsai.jupyter`、`yoavbls.pretty-ts-errors`。

## 不要安装

- `octref.vetur`
- `Vue.vscode-typescript-vue-plugin`（Volar 2 起废弃）
- `ms-python.black-formatter`、`ms-python.isort`、`ms-python.flake8`、`ms-python.pylint`（与 Ruff 重复）
- 任何第三方 TypeScript 语言服务
- `wix.vscode-import-cost`

## 从当前 Profile 移除

只有确认真实冲突、且用户已批准该扩展的移除时才处理；仅“已经安装”不构成移除授权：

- `rvest.vs-code-prettier-eslint`（和官方 Prettier + ESLint 抢默认格式化器）
- `pmneo.tsimporter`（和内置 TypeScript 自动导入冲突）

Java 扩展包、Copilot、Git Graph、Path Intellisense、npm Intellisense，以及用户自己的扩展，都不在移除范围内。

## 用受支持的 Profile 接口

先用目标产品的 `--help` 验证 `--profile`、扩展安装/列出支持，确认实际 Profile 名和扩展主机。桌面 VS Code、Remote Server 与第三方 code-server 的版本/能力不能互推。

若当前 CLI 忽略或不支持 `--profile`，停在 GUI 的 Profiles/Extensions 工作流或该产品公开支持的导入导出方式。不向 `extensions.json`、内部数据库、UUID/location 清单手写条目来模拟注册；那不是稳定 API，也可能覆盖用户正在做的配置。

2026-10-06 核对入口：[VS Code Profiles](https://code.visualstudio.com/docs/configure/profiles)、[命令行](https://code.visualstudio.com/docs/configure/command-line)。这些是产品行为依据；现场仍以已安装版本为准。

## 设置片段

只从下面的候选片段选择本次语言需要的键，再合并进 Profile `settings.json`。已有键不要删。文件按 JSONC 处理，保留注释、尾逗号和无关设置；用局部补丁或 JSONC 编辑工具增量修改，不使用严格 JSON 整文件重写。`eslint.validate` 和 `emmet.includeLanguages` 与已有值取并集。

```json
{
  "python.languageServer": "Pylance",
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.autoImportCompletions": true,
  "go.useLanguageServer": true,
  "go.formatTool": "default",
  "go.lintTool": "staticcheck",
  "gopls": {
    "ui.semanticTokens": true,
    "ui.diagnostic.staticcheck": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue"
  ],
  "javascript.updateImportsOnFileMove.enabled": "always",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact",
    "vue": "html"
  },
  "emmet.triggerExpansionOnTab": true,
  "editor.linkedEditing": true,
  "editor.bracketPairColorization.enabled": true,
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.tabSize": 4,
    "editor.codeActionsOnSave": {
      "source.fixAll.ruff": "explicit",
      "source.organizeImports.ruff": "explicit"
    }
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[jsonc]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[scss]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[go]": {
    "editor.defaultFormatter": "golang.go",
    "editor.formatOnSave": true,
    "editor.insertSpaces": false,
    "editor.tabSize": 4,
    "editor.codeActionsOnSave": { "source.organizeImports": "explicit" }
  },
  "[go.mod]": {
    "editor.formatOnSave": true
  }
}
```

某个语言块已经存在时，只补缺的键，不要覆盖用户已经改过的 `editor.tabSize` 或 `editor.defaultFormatter`。

Vue + TypeScript 的项目如果需要工作区 TypeScript，写在**该仓库**的 `.vscode/settings.json`，不要写进用户 Profile：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

ESLint 和 Prettier 不互相改写代码，靠项目依赖 `eslint-config-prettier`（Vue 再加 `eslint-plugin-vue`，React 再加 `eslint-plugin-react`）。那不是 Profile 设置。

## 本机同步命令

在未连接 Remote 的窗口、目标 Profile 下执行。下面为候选模板，先查目标 Profile 已安装列表，再只保留缺失的 ID；不要依赖不同版本 CLI 都会保持已装版本不变。

```bash
code --profile "<已确认的本机 Profile 名称>" --install-extension ms-python.python \
  --install-extension charliermarsh.ruff \
  --install-extension Vue.volar \
  --install-extension sdras.vue-vscode-snippets \
  --install-extension formulahendry.auto-rename-tag \
  --install-extension bradlc.vscode-tailwindcss \
  --install-extension dsznajder.es7-react-js-snippets \
  --install-extension dbaeumer.vscode-eslint \
  --install-extension esbenp.prettier-vscode \
  --install-extension golang.go \
  --install-extension usernamehw.errorlens \
  --install-extension EditorConfig.EditorConfig \
  --install-extension tamasfe.even-better-toml
```
