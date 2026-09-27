# 独立评估：coding 技能

## 先仅根据全部七项 frontmatter 路由

此表在读取任何正文之前写入；未读模板。

|题|选择|理由与行为|
|---|---|---|
|1 Gitea 当前仓库 issues|gitea-repo|明确平台且为 issue 操作；确定仓库后只读列出。|
|2 Forgejo bug 添加已有标签|gitea-repo|明确包含 Forgejo 及标签操作；定位 issue、标签后添加。|
|3 GitHub 创建 PR|none|github-repo-steward 明确排除 PR 协作，gitea-repo 排除 GitHub.com；使用通用工作流。|
|4 GitHub 所有个人仓库|github-repo-steward|个人账号仓库清单是核心范围；读取当前账号并完整分页盘点。|
|5 GitHub 仓库权限 403|none（当前表述）|描述只涵盖“这些操作”的 gh/PAT 权限，即仓库清单、归档、删除、star；未说明触发操作，先识别操作，若属于这些操作再启用该技能。|
|6 React 页面|none|vscode-fullstack 明确排除编写应用代码。|
|7 当前 VS Code Profile 补 Python Vue React Go|vscode-fullstack|当前 Profile 的四语言扩展、语言设置正好匹配。|
|8 Remote SSH 当前配置补全栈保留 Java|vscode-fullstack|支持 Remote Profile，要求保留已有配置。|
|9 只查 CPU 进程|none|没有相应技能；Windows 清理技能也明确排除一般性能排查。|

## 正文读取后，各路由的具体执行边界

1. `gitea-repo`：确认实例和 owner/repo 后，用 `python3 "$SKILL_DIR/scripts/gitea_api.py" --host "$INSTANCE" --repo "$REPOSITORY" --json issue list --all --state all`。这是请求所有状态的示例；若用户只需默认未关闭项则用默认 `open` 并明确状态范围。正文要求 issue 查询排除 PR，脚本使用 `type=issues`。本题没有真实执行。
2. `gitea-repo`：读取 bug 编号和完整标签目录，以真实 ID 追加标签，随后读取 issue 标签验收。已有标签添加授权足够，不再重复索要授权。不创建同名标签，不用 PUT 覆盖其他标签。见 B 的实际模拟。
3. `none`：以通用 GitHub PR 工作流检查当前分支、差异、base/head，准备标题与正文，再按用户已授权范围创建 PR。本评估禁止真实账号写入，只列工作流；不能误用账号生命周期技能。
4. `github-repo-steward`：先确认当前 gh 账号，运行该技能 `scripts/inventory.sh`；全量以 GraphQL cursor 分页，并明确是当前 token 可见的个人仓库范围，不保证不可见仓库。正文和 `01-inventory.md` 支持。未执行真实 gh 或盘点脚本。
5. `none`：先明确“哪个命令/动作返回 403”，索取不含 token 的错误与响应头。若是归档、删除、star 或盘点，再使用该技能的只读认证诊断；若是 PR 等协作权限，则通用工作流。不能仅见 GitHub/403 两词就启动整个仓库整理技能。
6. `none`：按项目现有 React 结构编写页面；不能为了写 React 页面安装编辑器插件。本评估没有项目写入。
7. `vscode-fullstack`：定位当前 CLI/窗口/Profile，读扩展与 JSONC，备份后只补缺失四语言设置/扩展。现有格式化器与语言工具选择优先。未安装扩展。
8. `vscode-fullstack`：确认 Remote SSH 的 server 和匹配 CLI，定位当前 Profile，不凭桌面目录推断远端。保留 Java/Maven 设置、Java 扩展与其他无关扩展。CLI Profile 支持和安装落点实际验证后才能登记，不猜内部清单格式。未连接远端或安装。
9. `none`：只读当前平台进程 CPU 快照，例如 Linux 可用 `ps -eo pid,comm,%cpu --sort=-%cpu`；不能据此清磁盘、杀进程或改变系统。未执行此命令。

## A：仅诊断归档权限不足，仓库已经 archived=true

**选择：github-repo-steward。** 该任务明确落在归档权限诊断范围。

精确计划（展示命令，未执行）：

```bash
gh auth status
gh api user --jq '{login,name,id}'
gh api -i repos/demo/repo
```

读取已有失败操作的 403 响应状态、message 和 `X-Accepted-Github-Permissions`；如果现有错误包含 `administration=write`，说明 Fine-grained PAT 的 Repository permissions → Administration → Read and write 是该失败操作要求，并检查仓库是否在 token repository access 范围内。若没有原失败响应，则将 token 写权限保留为未知，不能重新 PATCH 来制造 403。

示例交付：“仓库当前已归档（archived=true）。此次仅诊断，未改变归档状态。GET 中 admin=true 只能说明账号角色，不能证明当前 PAT 具备归档写权限。请提供原 403 的 message 与权限响应头（隐藏凭据），才能进一步核对缺少的权限。”如果已取得该响应头，直接报告缺少项即可，不重复索取。

技能依据：正文“盘点、权限诊断和清理建议保持只读”“禁止用 PATCH archived=false 等写入来探测权限”，认证参考区分角色权限与 token 能力。现存 archived=true 不授权取消归档，也不证明本次归档请求曾成功。

**实际运行：** 本地 fixture `{archived:true,permissions:{admin:true}}` 加只读命令计划断言，写调用数为 0。`github-plan.json` 保存计划。**仅推演：** gh 认证、真实仓库状态和响应头均未获取；不能据模拟宣称真实 PAT 缺 Administration。

## B：65 个标签，添加第 65 个

**选择：gitea-repo。** 先取完整目录，第 65 个只是目录顺序，不假定它的 ID 也是 65；本地 fixture 特意使用第 65 个名称 `label-65`、ID 65。

精确生产操作示例（未发真实请求）：

```bash
python3 "$SKILL_DIR/scripts/gitea_api.py" --host "$INSTANCE" --repo demo/repo --json label list --all
# 从完整结果确认 label-65 的实际 id，此示例为 65。
python3 "$SKILL_DIR/scripts/gitea_api.py" --host "$INSTANCE" --repo demo/repo --json api POST /repos/demo/repo/issues/12/labels --body '{"labels":[65]}'
python3 "$SKILL_DIR/scripts/gitea_api.py" --host "$INSTANCE" --repo demo/repo --json api GET /repos/demo/repo/issues/12/labels --paginate
```

先确认 issue #12 是用户指明的 bug；POST 追加，保留原标签；读回确认第 65 个已存在。如果写响应不明，先查询状态，不盲目再次 POST。

技能依据：正文“创建 issue 的 labels 为 ID 数组；脚本按名称全量分页解析标签”，端点表包含 issue labels 的 GET/POST；列表 `--all`，全量失败应标部分；写请求需复核。CLI 没有独立的“issue add-label”子命令，因此使用 `api POST`，不能编造命令。

**实际运行：** 载入真实技能脚本但替换 `api_request` 为纯内存函数；运行其真实 `resolve_label_ids`、parser、`cmd_api`。默认 limit 50：第 1 页 50 个，第 2 页 15 个，成功解析 `[65]`；模拟 POST 后 GET，标签 ID 为 `[2,65]`，原标签保留。请求轨迹在 `gitea-trace.json`，完全未网络通信。

**实际发现的限制：** 附加模拟服务端 cap=30（请求 limit=50）时，脚本第一页得到 30 个便因 `len(batch)<limit` 提前停止，第 65 个解析失败（退出 1）。所以 65 标签场景在默认/匹配 limit 下通过，但对较小实例分页上限不稳健。技能资源提及服务端可截断，却没有在脚本内利用 Link/x-total-count 校正。若已确认实例限额为 30，可明确 `label list --all --limit 30`，再使用取得的 ID 走 `api POST`；未在真实实例验证。

## C：JSONC 带注释/尾逗号/已有 Java 和 Python formatter

**选择：vscode-fullstack。** 已有 Python formatter 为 Black、tabSize 为 8；保留它们，不改成 Ruff。扩展清单中不新增 Black 不等于卸载已有 Black。Java 配置与扩展均保持。冲突值在交付中说明。

**实际运行：** 创建 `/tmp/wta-revised-coding-sim/settings.json` fixture，用独占创建方式写备份 `settings.json.before`。从技能参考读默认片段，对固定 fixture 进行局部文本插入：已有 Python 块只加缺键，ESLint 数组并集保留 `svelte`，Emmet 对象并集保留 `markdown:html`，其余缺失默认键添加到根对象。保留原注释、尾逗号、Java home、Java formatter、Black formatter、tabSize=8；未设置全局 formatOnSave。

产物实际内容包含：

```jsonc
"[python]": {
  // 用户选择 Black，不能覆盖
  "editor.defaultFormatter": "ms-python.black-formatter",
  "editor.tabSize": 8,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {"source.fixAll.ruff":"explicit","source.organizeImports.ruff":"explicit"},
},
```

其余完整结果见模拟目录的 `settings.json`，原始文件见 `.before`。备份不覆盖，原文件不存在时应另行记录而非伪造备份。

**验证口径：** 环境没有现成 json5/jsonc-parser，未安装依赖。使用本地字符串状态扫描器去掉字符串外注释和尾逗号，再严格 JSON 解析，并断言上述保留项及新增项。编辑步骤是局部文本补丁，没有严格 JSON 读取后整文件重序列化。这是固定 fixture 的验证，不是通用 JSONC 编辑库，也未验证 VS Code GUI 功能、保存、补全、扩展或 gopls。

技能依据：正文明确 JSONC、非覆盖备份、局部补丁、只补缺失、现有 formatter/tabSize/Java 优先；参考规定语言块按键合并和数组/对象并集。

## D：默认 Profile，storage.json 无 userDataProfiles

**选择：vscode-fullstack。** 缺少 userDataProfiles 不能推断没有 Profile；用户已明确默认 Profile，仍将当前窗口/CLI 信息与该目标核对。设置使用已确认 User 根目录的 `settings.json`，扩展使用当前 CLI 与该版本默认清单，不创建命名 Profile。

**实际运行：** 在临时目录创建 `User/globalStorage/storage.json`，仅有 theme、没有 userDataProfiles；fixture 显式标记当前为 Default，解析目标为 `User/settings.json` 并断言文件存在、`User/profiles` 未创建。

**仅推演：** 真实 VS Code User 根、窗口、CLI 版本、默认扩展目录、清单格式未检查，因此不能声称已识别用户实际 Profile 或扩展已补齐。正式操作会先用所处环境 CLI 的 `--version`、`--help`、`--list-extensions` 配合当前窗口信息核对；不凭单一命名 Profile 或目录猜激活状态。

技能依据：正文定位目标第 2 条直接覆盖无 userDataProfiles 的默认 Profile；参考“默认 Profile 没有这个 location，使用当前版本实际默认清单，不能凭空创建 profiles 子目录”。

## E：没有实例、仓库或 git remote

**选择：gitea-repo（请求本身已明确 Gitea 操作）。** 先检查是否已有 `GITEA_HOST`、`GITEA_REPO` 提供上下文；如果没有，只询问这两个尚缺字段：“请提供 Gitea/Forgejo 实例 URL，以及目标仓库 owner/repo。”不先索取明文 token、不猜公网服务、不在其他远端执行。

**实际运行：** 真实 `resolve_context` 函数，环境变量临时清空、`discover_remote` 替换为返回 None，凭据读取被替换为一旦触发就报错的函数。返回退出码 1，输出“未确定 Gitea 实例。请传 --host……”。没有触发凭据或网络。脚本先报缺实例，而面向用户应合并询问已知缺少的实例与仓库，以免两轮追问。

**仅推演：** 未读取真实 git remote 或环境凭据；输入缺失来自模拟前提。拿到目标后再安全读取已有 credential 或环境 token，且不要打印真实 token。

技能依据：正文优先级 `--host → GITEA_HOST → 已确认 remote`、`--repo → GITEA_REPO → remote`，缺失只问尚无法确定项；非 GitHub remote 不能自动判定 Gitea。

## 工具读取轨迹简表

|顺序|工具/动作|读取内容与用途|写入/网络|
|---|---|---|---|
|1|exec_command + Python|仅遍历 `skills/*/*/SKILL.md` 的七份 frontmatter；先路由|无|
|2|exec_command + cat|先落路由表，再读取 coding 三份 SKILL.md 正文|仅 `/tmp/wta-revised-coding-eval.md`|
|3|exec_command + cat|GitHub auth/inventory/lifecycle；Gitea endpoint/pagination；VS Code extensions-and-settings|无|
|4|exec_command + rg|Gitea 脚本的 label/page/context/API/parser 定位|无|
|5|exec_command + sed/Python|按需读取脚本函数段；检测 json5 是否存在|无|
|6|exec_command + node|只探测 jsonc-parser/typescript/json5 是否已安装|无|
|7|exec_command + Python|读取 Gitea 脚本（runpy、不调用 main）和 VS Code 参考，执行纯内存/API替身与临时 JSONC/Profile fixture|只写 `/tmp/wta-revised-coding-sim/`，无网络/账号/安装|
|8|exec_command + cat|写本报告|只写 `/tmp/wta-revised-coding-eval.md`|

未读模板，未读取其他技能正文；未调用真实 gh、网络 API、扩展安装、系统配置写入。项目文件全程只读。未接收改进建议或期待答案再评估。

实际运行日志：`/tmp/wta-revised-coding-sim/results.txt`；可复核模拟代码：`/tmp/wta-revised-coding-sim/evaluate.py`。模拟脚本独占创建备份，因此原目录直接二次执行会被已有备份阻止，这是防覆盖行为，重跑应使用新的临时输出目录。

# Revision 2：独立复测

## 先只读 frontmatter 的路由复判

本节在重新读取当前正文前追加，保留上文历史判断。

原第 5 题“我的 GitHub 仓库权限报 403”：**选择 github-repo-steward**。当前 description 将范围明确扩为“诊断 GitHub gh/PAT 认证与权限问题”“账号级仓库整理或权限排查”，不再限定“这些操作”的权限。因此该模糊 403 请求可以先启用认证诊断，再确定失败动作及具体权限；仍不能推定获得任何仓库写入授权。

## 第 5 题：正文后的操作与依据

**当前选择仍为 github-repo-steward。** 首先明确原失败命令/动作和目标仓库，用 `gh auth status` 确认账号，并按已有信息做 `gh api user --jq '{login,name,id}'`、`gh api -i repos/OWNER/REPO` 等只读查询；读取用户已有 403 的 message、`X-Accepted-Github-Permissions`，不通过写操作制造错误。不因 GET 成功或 admin=true 声称 token 具备写权限，也不在不知道失败动作时默认要求 Administration。

这里的命令全部是**计划示例，未实际执行**；评估仅实际读取技能内容。正文“读取与权限”仍明确只读诊断、不得 PATCH archived=false 探测，认证参考提供账号/token 区分和 403 响应头解释。因此扩大触发范围并未授予写操作权限。当前描述足以支持原第 5 题触发；普通“GitHub 创建 PR”依然被描述明确排除。

## 原 B 题与 cap=30 的实际复测

仍选择 **gitea-repo**。第 65 个标签为 fixture 的 `label-65`（ID=65），已有 issue 标签 ID=2。用当前真实脚本的 `resolve_label_ids` 获取标签 ID，再用真实 parser/`cmd_api` 发送到内存 API 替身的 POST，最后内存 GET 验证；没有真实 API 调用。

|情形|请求 limit|真实模拟返回的每页数量|解析结果|模拟 POST 后 GET|结论|
|---|---|---|---|---|---|
|原 B：65 标签，服务端 cap=50|50|50、15、0|[65]|[2,65]|通过，原标签保留|
|附加：65 标签，服务端 cap=30|50|30、30、5、0|[65]|[2,65]|通过，旧版提前终止问题在本用例已消除|

本轮读取的当前实现以空页作为全量结束条件，而非 `len(batch)<limit`。因此即使首批只有 30 个，仍继续第 2、3 页，并取第 4 页空列表确认结束。`pagination-and-errors.md` 同步说明服务端可以有更小上限、不能用短页判断结束。当前脚本内容 SHA-256：`b84bf16f43229af494d3a597f900f85ee2efc04336ae390cec45f2f85b893c86`。

生产操作方式仍是完整 `label list --all` 后使用实际 ID，`api POST /repos/OWNER/REPO/issues/N/labels --body '{"labels":[65]}'` 追加，再 GET 验证；此示例的 65 仅来自 fixture，不将顺序号普遍当作 ID。

**实际运行与限制：** 两种 cap 场景各执行了两次；第二次用于验证模拟材料可重跑、没有固定输出路径或备份冲突。每次都使用新临时目录，真实网络与 subprocess 调用被替换为一旦触发即失败的守卫。未调用真实 gh、git、网络 API、账号或安装扩展，没有项目写入。模拟验证分页和已存在标签的保留，不证明任何真实 Gitea/Forgejo 实例版本、API 权限或线上状态；未扩大本轮范围去验证其他新防护分支。

## 可重复材料与本轮实际读取轨迹

脚本：`/tmp/wta-revised-coding-revision2.py`。

```bash
python /tmp/wta-revised-coding-revision2.py
# 可选参数：--skill-root /path/to/skills/coding --output-parent /another/temp/parent
```

每次使用 `tempfile.mkdtemp` 生成独立 `wta-coding-revision2-*` 目录，不覆盖历史。输出 `summary.json`、`cap-50-trace.json`、`cap-30-trace.json`，包含每次方法、路径、query/body 和响应数量。

本轮两次实际输出：

- `/tmp/wta-coding-revision2-zo_43tde/`
- `/tmp/wta-coding-revision2-x2ak7ta6/`

|顺序|工具|实际读取/执行|写入|
|---|---|---|---|
|R2-1|exec_command/Python|只重读全部七份 SKILL.md frontmatter|无|
|R2-2|exec_command/cat、sed|先追加独立路由结论，再读 GitHub SKILL/auth reference、Gitea SKILL/pagination reference、脚本 paginate/resolve_label_ids 段|报告仅追加|
|R2-3|exec_command/Python|载入当前 Gitea 脚本；cap=50、cap=30 内存模拟并复核 POST/GET|模拟脚本及首个唯一临时输出目录|
|R2-4|exec_command/Python|重复同一模拟，确认新目录无冲突|第二个唯一临时输出目录|
|R2-5|exec_command/cat|追加结果、证据、复现方法与本表|报告仅追加|

结论仅依据此次读取和运行，不预设修订有效；原报告历史记录完整保留。
