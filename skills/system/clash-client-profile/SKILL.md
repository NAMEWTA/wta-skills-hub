---
name: clash-client-profile
description: "诊断和配置 Clash Verge Rev、FlClash 的规则模式、TUN、DNS 与终端代理。用户提到 Clash/VPN crash、Mac 上 Claude Code 区域错误、规则不生效或疑似 IP/DNS/IPv6 泄漏时使用；先确认客户端。仅查普通出口、改时区语言或其他 VPN 产品的任务不适用。"
license: MIT
---

# Clash 规则与代理诊断

先分清用户是在说 Clash 客户端还是进程 crash。记录实际操作系统、架构、客户端和内核版本、当前订阅、CLI/桌面/浏览器入口，以及是否在 WSL、容器或远程主机。没有证据不把“美国节点 + 区域错误”直接判定为 IP 泄漏。

## 选择工作流

只读排查不改文件、不建快照、不重启、不切节点；配置请求才进入修改流程。只加载当前产品的 [Clash Verge Rev](references/clash-verge.md) 或 [FlClash](references/flclash.md)。多份安装以活动进程及实际配置路径为准，不选第一个目录。识别不了客户端/版本或配置格式就停在诊断。

区域错误、终端绕过、DNS/IPv6、crash 与多系统排查读 [诊断与验收](references/troubleshooting.md)。能力和来源边界见 [来源](references/sources.md)。

Python 3.10+ 的 [只读诊断脚本](scripts/proxy_doctor.py) 可独立安装使用。`SKILL_DIR` 是本文件目录，不能假设 cwd：

```bash
python3 "$SKILL_DIR/scripts/proxy_doctor.py"
# 只有明确允许网络探测后，使用界面显示的实际端口；7890 只是示例
python3 "$SKILL_DIR/scripts/proxy_doctor.py" --network --proxy http://127.0.0.1:7890
```

原生 PowerShell 用已验证的 `python` 或 `py -3` 和 `&` 调用，参考中提供示例。默认不联网；联网仅发指定代理的 IPv4/IPv6 echo 请求，绝不失败后重试直连。IP 默认隐藏。脚本返回 0 仅表示诊断运行完，不能解释成“无泄漏”；`--strict` 对证据不足返回 3，观察到目标 DIRECT 返回 1，参数错误返回 2。

## 先取证，再改动

检查应用真实连接、HTTP_PROXY/HTTPS_PROXY/ALL_PROXY 大小写与 NO_PROXY、当前模式、规则顺序、策略组逐层选择和最终节点。运行中的内核、TUN 路由、DNS 与 GUI 开关分别验收。组名或节点名称不是出口国家证明；进程名可能是 node 或辅助进程，不能把所有 node/python 进程全局代理。

有已启用且授权读取的 loopback controller 才用 GET；不新开控制接口，不修改密钥，不导出原始订阅或全部连接日志。脚本只读 `/connections`，自动隐藏节点名、目标 IP、进程和原始错误。没有 controller 就使用 GUI 的 Connections/日志按单次目标请求核对；不能把无连接记录当成安全。

## 最小配置与回滚

修改前保存原字节、权限/所有者、哈希与原先不存在状态到新的私有目录；Windows 使用用户私有目录及 ACL，不执行 chmod/mktemp。回滚仅恢复本轮字段，不覆盖后续用户修改。

保留订阅原文、订阅地址、节点、密码、端口、系统 DNS/NTP/区域。不安装助手、不提升权限、不关闭现有系统代理；TUN 迁移必须先验证，再在授权范围内调整。运行中不直接改客户端托管状态；优先支持的 GUI/导入扩展，未知内部 schema 不猜字段、不写 SQLite。

[最小规则模板](templates/ai-rules.yaml) 使用精确后缀，不再默认附带宽泛品牌词、进程通配和无关 DIRECT IP。使用 [规则生成器](scripts/render_rules.py) 指定真实已有组名，预览后合并；不自动选择/更换节点。沿策略组追到实际叶子，发现 DIRECT、循环或未知引用就停止受影响任务。

```bash
python3 "$SKILL_DIR/scripts/render_rules.py" --group '🔰 节点选择'
```

模板不是完整域名清单，也不是可直接启动的内核配置。已安装的旧扩展不能被静默删除；把新规则、旧规则保留项、优先级冲突和待用户决定项列出。现有批准的规则保持含义；业务需求明确的进程规则须来自实际观察且经当前内核语法测试。

[DNS 片段](templates/dns.yaml) 仅提供保守参考，不覆盖现有解析器/监听地址/策略。候选配置先用实际内核 `-t -f`（以本机帮助为准）校验完整合并结果；通过后刷新，再核对生效状态。解析失败或客户端覆盖改动就回滚并停止，不反复写入。

## 完成标准

分别报告：持久配置、运行时加载、目标域名规则与最终链、显式代理探测、真实应用操作、DNS、IPv6 和 crash 隔离。每项用已观察/失败/未验证，附脱敏证据和回滚位置。

没有用户 Mac 上的真实请求与连接日志，只能交付修复与验收路径，不能宣布现场问题已解决。改变系统时区、浏览器语言或账号国家不能证明网络修复；实际出口路径一致而服务仍拒绝时，保存脱敏错误并核对服务支持地区/账号政策，不承诺代理能解决。
