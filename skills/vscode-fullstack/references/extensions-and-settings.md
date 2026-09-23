# 扩展与设置

这份清单是 `vscode-fullstack` 的唯一扩展和设置来源。ID 以 Marketplace 标识为准。版本不锁死，用与当前 VS Code / `vscode-server` 主版本匹配的 CLI 安装稳定版。

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

仅当它们已经装在当前 Profile 时移除：

- `rvest.vs-code-prettier-eslint`（和官方 Prettier + ESLint 抢默认格式化器）
- `pmneo.tsimporter`（和内置 TypeScript 自动导入冲突）

Java 扩展包、Copilot、Git Graph、Path Intellisense、npm Intellisense，以及用户自己的扩展，都不在移除范围内。

## 登记到 Profile

`code-server --install-extension` 写的是 `<extensions-dir>/extensions.json`。当前 Profile 用的是 `User/profiles/<location>/extensions.json`。把只出现在前者、且属于「缺失才安装」的条目追加到后者。不要改已有条目的版本。

新条目用 Profile 里已有条目的形状。`identifier.uuid` 和 `metadata.id` 都用 CLI 写下的 `metadata.id`。`location` 只保留 `$mid`、`path`、`scheme`：

```json
{
  "identifier": { "id": "<publisher.name>", "uuid": "<metadata.id>" },
  "version": "<version>",
  "location": { "$mid": 1, "path": "<extensions-dir>/<relativeLocation>", "scheme": "file" },
  "relativeLocation": "<relativeLocation>",
  "metadata": { }
}
```

`metadata` 从 CLI 清单原样复制，并补上 `"pinned": false`（如果没有）。写完后确认 ID 不重复，且 `location.path` 是实际目录。

## 设置片段

合并进 Profile `settings.json`。已有键不要删。`eslint.validate` 和 `emmet.includeLanguages` 与已有值取并集。

```json
{
  "python.languageServer": "Pylance",
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.autoImportCompletions": true,
  "go.useLanguageServer": true,
  "go.toolsManagement.autoUpdate": true,
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

在未连接 Remote 的窗口、目标 Profile 下执行。已安装的 ID 可以留在命令里，CLI 会跳过或保持现状。

```bash
code --install-extension ms-python.python \
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
