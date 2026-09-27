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
