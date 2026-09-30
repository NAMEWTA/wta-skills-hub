# Skill 创建、优化与迭代方法

## 本轮直接核对的规范

2026-09-29 通过 GitHub 连接器读取下列正文，记录 blob SHA（不是发布版本号；以下默认分支链接可能变化）。未使用通用网页或 X 检索。

| 来源 | 核对内容 | 读取 blob SHA |
|---|---|---|
| [Agent Skills specification](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx) | 必填 name/description、名字/长度、可选 compatibility、独立资源、渐进加载 | d9a2db099d905da8b879a5c6f996728073985279 |
| [OpenAI skill-creator](https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md) | 精简主体、按风险决定指令精度、scripts/references、UI metadata、避免重复 | 72bc0b97e7a6476254a9d5c424c9971748402ec3 |
| [Anthropic skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) | 触发描述、真实测试、基线对照、迭代与逐步扩展评估 | 65b3a402dbd09b8e83f9d637c6b553875189085c |

Agent Skills 格式、具体消费方行为和本仓库约定是不同层。compatibility 是规范允许的可选字段，不能因为某个旧验证器不支持就称它不合规范；本仓库目前仍以正文声明依赖，避免引入不必要的消费者兼容变化。allowed-tools 不应视为跨宿主权限许可。

## 重构方法

从可观察失败开始：记录最小复现、任务范围和证据缺口；区分库自身缺陷、环境差异与服务端拒绝。先修危险默认值与错误验收，再补平台分支，不用更多关键词或更多正文掩盖问题。

name 稳定；description 说明真实触发场景及近邻排除；SKILL 主体保留决策和停止条件，平台/产品细节按需读 references。脚本负责重复且确定的逻辑，默认离线只读，参数/错误与输出可测试。所有运行资源随单个 skill 安装，维护文档不作为执行依赖。

修改遵循读取 → 预览 → 具名授权 → 私有快照 → 版本校验 → 最小写入 → 运行时验证 → 必要时回滚。权限拒绝后不换底层路径绕过；历史团队约定不能替代当前宿主授权。

## 测试证据分层

结构校验验证元数据、链接与打包；单元测试验证脚本确定性和失败边界；跨平台 CI 验证运行兼容；真实设备验收验证产品行为；技能选择/行为评估验证 Agent 是否正确应用工作流。这些结果不能互相替代。

现有 evals 的历史记录保留。本轮新增场景覆盖正常、相邻不触发、未授权修改、未知版本、缺工具、网络命名空间、部分成功、回滚与不确定结果。没有运行独立 Agent 对照评估就不报告选择准确率提升。

## 来源诚信与后续维护

本仓库先前方法文件中的网页/X 核验宣称属于历史提交，不自动继承为本轮事实；需要可复现正文后才采信。本轮排除了一份正文属于同名游戏数据项目的 Mihomo 检索返回，不能按 URL 外观引用。客户端 schema、CLI 支持域名、OS 私有偏好及服务地区政策需在部署版本重新核验。

详见 [本轮审计与验证边界](refactor-audit.md)。更新来源时记录读取日期、身份匹配、版本、实际观察和局限，不把社区经验或单机结果提升为普遍保证。
