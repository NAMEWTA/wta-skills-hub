# 本轮验证记录

2026-09-27。当前工作区含原有未提交修改，基线保存了这些内容；未重置用户工作、未发布 npm 或 GitHub Release。

## 工程检查

| 检查 | 结果 |
|---|---|
| 原始基线 | 19 项 Node 测试中 18 通过；旧预期未包含新增 proxy-region-locale |
| 分类、YAML、唯一名称、资源链接、展示分组 | 7 个真实技能通过；快照内 SKILL.md 不作为技能发现 |
| 本机 skill-creator quick_validate | 7/7 通过 |
| Node 测试 | 实际 Node 18.20.8 与 Node 24.21.0 均 30/30 通过，其中一项运行完整 Python helper 套件 |
| Python/helper 回归 | 11/11 通过；仅临时文件、纯内存 API 和 mock gh |
| npm 打包 | 包含七项技能与所需模板、资源；排除历史 __pycache__/pyc |
| 隔离真实安装 | 从生成的 npm tarball 解包，安装依赖，在带空格的临时项目调用包 CLI；skills@1.5.26 成功安装全部 7 项到项目 .agents/skills |
| 项目安装目标 | mock 与上述实际安装均确认使用调用者 cwd，包目录只作来源 |
| CI | 配置 Ubuntu/Windows × Node 18/22，以及 Python 3.10；尚未触发远端 Actions |

实际安装夹具：`/tmp/wta-install-check-bixevm4w/project with spaces`。该安装验证了目录、脚本来源和资源打包，不代表各技能在真实平台的业务操作已集成验证。

## 独立新旧对照

使用相同会话继承模型、独立上下文和固定 prompts；先读七项 frontmatter 做选择，再读所选正文。共 22 个选择样例、18 个行为场景。完整新版报告保留首次结果及 revision 2，未覆盖失败历史：

- [代码类评估](../evals/results/coding.md)
- [系统类评估](../evals/results/system.md)
- [自动化类评估](../evals/results/automation.md)
- [基线摘要与入口指纹](../evals/baseline.json)

| 场景 | 基线证据 | 最终结果 |
|---|---|---|
| Gitea 第 65 个标签 | 原名称解析实际只读第一页，模拟返回找不到 | 按服务端 limit=50 和 cap=30 两种情况均完整读取、解析并在模拟写入后保留原标签 |
| Gitea 完整分页 | 较小服务端上限会提前停止，且原代码静默限制 200 页 | 取到空页；重复页及意外格式明确失败；超过 200 页有回归覆盖 |
| GitHub 只读权限诊断 | 文档提供 PATCH 取消归档探针；评估者发现冲突并拒绝写入 | 新指令明确禁止写探针；仅凭读成功不宣称 token 可写 |
| GitHub 通用 403 选择 | 基线匹配；第一版收窄后独立评估漏选 | 描述恢复独立认证/权限诊断范围，revision 2 正确选中 |
| VS Code JSONC/默认 Profile | 评估者需自行补充 JSONC 与默认路径分支 | 指令显式覆盖；临时 JSONC fixture 保留注释、尾逗号和用户 formatter/Java 设置 |
| Ubuntu 回滚/NTP | 固定回滚文件可能覆盖；NTP 措辞可能误报全局状态 | 每轮唯一回滚、无图形会话跳过相应项、源可达性与同步状态分开报告 |
| Grok 模板验收 | 仅 bots/_SLUG 且缺 COMPLETED 时真实脚本返回 0 | 新脚本返回 1；真实 Bot 与有效格式完成标记的正向夹具通过 |
| Grok 激活与本地 diff | 正文有自我安装/盘点歧义，评估者依靠用户范围约束 | 明确 activate/diff 不修改账号、不创建目录或联系 Bot |
| Herdr 授权与重试 | 超时不重发、受限模式优先已有规则 | 保留规则；评估发现参考中的重复批准措辞后已修正并复测 |

最终 22 个描述选择样例与既定预期一致；Windows 区域配置返回 none，体现 Ubuntu 技能的真实支持范围。这里只测试评估模型读取描述后的选择，未测宿主自动调用的端到端触发率。

行为结论中，Gitea 标签/缺失输入、JSONC fixture、默认 Profile fixture及快照验证器有本地执行证据；其余平台动作是明确标注的模拟推演。未测试真实 GitHub/Gitea 写接口、Windows 系统清理、桌面 GUI、实际 Herdr 会话或 Grok 账号恢复，不将这些计作真实任务完成率。

## 入口体积

单位为 UTF-8 字节，不是 tokenizer 计数。共用入口从 51,075 降至 20,749 字节（约 59.4%）；详细知识保留在按需参考中，实际上下文花费仍取决于任务读取了哪些材料。

| 技能 | 基线 | 新版 | 入口减少 |
|---|---:|---:|---:|
| gitea-repo | 5,945 | 3,309 | 44.3% |
| github-repo-steward | 6,537 | 2,887 | 55.8% |
| grok-bot-team-steward | 12,839 | 4,059 | 68.4% |
| herdr | 13,231 | 2,675 | 79.8% |
| proxy-region-locale | 2,516 | 2,505 | 0.4% |
| vscode-fullstack | 5,960 | 2,944 | 50.6% |
| windows-dev-disk-cleanup | 4,047 | 2,370 | 41.4% |

## 新增照片编辑技能（2026-09-27）

新增 `design/photo-retouch`，入口按任务读取基础修图、旅行创意、社媒效果三份参考，覆盖 12 种玩法及多区域精修、宠物驾驶合成。同步登记分类、网站分组、界面元数据与目录。

- `skill-creator/scripts/quick_validate.py skills/design/photo-retouch`：通过。
- `npm run validate`：当前 8 项技能的目录、元数据、资源链接与分组通过。
- `npm test`：30/30 通过，包括 CLI 发现、现有 helper 回归及 npm 打包检查；新增技能的元数据与三份参考均进入包。
- 新增 5 个选择场景、8 个行为场景；仅完成场景编写与人工指令核对，未执行独立模型评估或真实出图。上述工程检查不证明模型的修图效果、像素保真或输出分辨率。

前文保留原有七项技能的历史验证记录；本次没有重跑其中的隔离真实安装或独立新旧对照。

## 照片编辑延伸场景（2026-09-27）

`design/photo-retouch` 增加四份按需参考：证件照与人物换背景、电商商品图、老照片修复与摄影调色、物体/服装/文字/扩图。原有 01–12 的三份参考未改写。入口描述、界面短说明、README 用途和打包清单已同步。

场景取舍来自公开编辑指南与提示词库的交叉核对，包括 Google Nano Banana 的「改什么、留什么」、OpenAI 图像编辑的局部修改与保留项、Flux Kontext 的摄影质感锁定、Qwen-Image-Edit 的文字与外观编辑，以及商品图和证件照流程里反复出现的底色、标签和身份约束。X 上笼统的「专业增强」和未复核的效果分数没有写进模板。模板是按本技能口吻重写的变量，不是第三方提示词原文。

- `npm test`：30/30 通过。
- `npm run validate`：8 项技能的目录、元数据、资源链接与分组通过。
- 选择场景现为 31 个，行为场景现为 30 个；设计类新增 4 个选择和 4 个行为，只完成编写与人工核对，未做独立模型评估或真实出图。工程检查不证明修图效果、像素保真或输出分辨率。

## 新增 Clash 客户端技能（2026-09-29）

新增 `system/clash-client-profile`。规则模板来自既有的 `prepend` / `append` / `delete` 文件；DNS 单独放在 `templates/dns.yaml`。入口只在 Clash Verge Rev 与 FlClash 的规则、TUN 规则模式和客户端 DNS 上触发，系统时区语言仍留给 `proxy-region-locale`。

- `npm run validate`：9 项技能的目录、元数据、资源链接与分组通过。
- `npm test`：30 项中 29 项通过。失败的是既有的 macOS 安装委托用例：临时目录的 `/var` 与进程里的 `/private/var` 不一致，与本技能无关。打包用例确认新技能的模板、两份参考和界面元数据进入包内。
- 选择场景现为 34 个，行为场景现为 34 个；系统类新增 3 个选择和 4 个行为，只完成编写与人工核对，未做独立模型评估，也没有改这台机器上正在运行的 Clash Verge。

## Linux 开发机清理（2026-10-08）

新增 `system/linux-dev-disk-cleanup`。入口要求清单授权、精确路径和硬停；测量与命令在 `references/linux-cleanup-workflow.md`。选择场景「Ubuntu 的 npm 缓存多大」改为该技能。另增 4 个行为场景，覆盖只读审计、未点名父目录、volume prune 后的挂载核对、内核不参与 autoremove，以及不安排 volume prune 定时任务。`quality-cases.json` 同步增加 4 个 `not-run` 场景。这些场景只完成编写与人工核对，未做独立模型评估或真实清理。

`baseline.json` 仍是分类迁移前的历史指纹，不加入本技能。

- `npm run validate`：13 项技能的目录、元数据、资源链接与分组通过。
- `npm test`：61/61 通过。打包用例确认该技能的入口、LICENSE、界面元数据和清理工作流进入包。
- `npm run smoke:package`：离线 tarball 安装 13 个技能、52 个目标目录，重复安装为 identical。本机 npm 12 的 `npm pack --json` 返回对象而不是数组，smoke 同时接受两种形状。
- 选择场景仍为 34 个，行为场景现为 38 个。工程检查不证明真实磁盘清理的释放量或安全性。
