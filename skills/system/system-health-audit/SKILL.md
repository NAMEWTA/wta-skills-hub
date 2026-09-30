---
name: system-health-audit
description: "只读审计 Windows、macOS、Linux 开发机的资源、工具链和环境边界，定位慢、空间紧张、WSL/容器与主机混淆，并形成具名优化计划。一般系统健康与性能排查使用；实际 Windows 磁盘删除、代理配置、时区语言修改和编辑器 Profile 配置转交对应技能，不自动调参或清理。"
license: MIT
---

# 跨平台系统健康审计

先确认目标是用户本机、远程主机、WSL 还是容器；工具所在环境不能替代用户设备。默认仅审计。已有明确具体改动授权也不直接套用一键优化；先验证前置条件和回滚。

Python 3.10+ 的 [基线脚本](scripts/system_audit.py) 不联网、不提权、不递归扫描、不调用包管理器、不改设置。`SKILL_DIR` 为本文件目录：

```bash
python3 "$SKILL_DIR/scripts/system_audit.py"
python3 "$SKILL_DIR/scripts/system_audit.py" --path /path/on/target/volume
```

PowerShell 使用 `& python "$SKILL_DIR\scripts\system_audit.py" --path 'C:\'`，先验证解释器；有 py launcher 可用 `py -3`。路径包含空格必须引用。输出隐藏用户名和路径，只说明所选文件系统；CPU 数量和磁盘余量不是性能评分。

按系统读取 [平台工作流](references/platforms.md)，采集与症状相关的短时证据。复用已有结果，避免反复全盘扫描。记录版本、架构、权限、工具存在性、采样时间/负载、磁盘可用量以及失败/未知项。默认不导出完整环境、进程命令行、凭据或日志。

## 优化计划

先给基线与瓶颈假设，再给具名动作、预期收益、影响、授权、回滚和验证命令。区分缓存/用户数据/活动运行时，不能凭目录名删除。系统更新、驱动、固件、内核参数、杀毒、swap/pagefile、索引、Docker/WSL 虚拟盘与服务开关都不在一般审计授权内。

Windows 具名空间清理由 windows-dev-disk-cleanup；Clash 网络由 clash-client-profile；系统时区/语言由 proxy-region-locale；VS Code Profile 由 vscode-fullstack。未安装其他技能时交付清单，不假定兄弟目录存在。

## 完成标准

提交症状、目标环境、已观察基线、证据支持的假设、分优先级动作与未验证项。优化收益应在可比工作负载下前后测量；没有修改就明确“仅审计”，不报告已提速。
