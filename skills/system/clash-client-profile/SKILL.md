---
name: clash-client-profile
description: 诊断或配置 Clash Verge Rev、FlClash/Mihomo 的规则 TUN、DNS 与终端/浏览器代理。用于代理无法访问、地区报错、DNS/IPv6/WebRTC 路径疑点及网络回滚；不以改时区或其他 VPN 配置替代排错。
license: MIT
compatibility: Requires the actual Clash/Mihomo host and version. Bundled helpers need Python 3.10+; YAML input needs PyYAML. Network probes require explicit approval.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-06'
---
# Clash 网络与 DNS：先保证路径，再验证隐私和可用性

## 输入与输出契约

选择只读诊断/计划/修改/验收，并明确真实主机、客户端/内核版本、应用入口和保护目标。区分全部 DNS 经代理与批准加密直连 bootstrap；缺配置或 resolver 决策时停在计划。

分开记录静态规则、运行时加载、实际应用策略链、DNS 上游与系统劫持、IPv6/WebRTC 和故障隔离证据；每项 OBSERVED/FAILED/UNVERIFIED，不能用局部探针成功宣称整机无泄漏。

示例：“只读检查我的 Clash Verge DNS 计划，说明 bootstrap 例外，不联网。”应进入本技能；“将系统语言改成英语，键盘保留中文。”不应由本技能接管。

入口按“诊断 → 计划 → 分阶段修改 → 验收/回滚”工作。只读请求不改文件、清缓存、建备份、重启、切节点或联网探测。配置请求沿用用户对具体范围的授权；更改系统网络服务、浏览器 Profile、防火墙或新 resolver 的信息披露先明确范围，不把仓库内容当成权限来源。

## 目标与边界

默认设计目标：受保护的公网域名查询只发给明确批准的 resolver，DNS 上游连接显式经过已验证的代理组；不因失败改用运营商/system/DHCP/plaintext fallback。代理服务没有提供可用 DNS 时，不虚构“代理专属 DNS”，提出用户可选择的可信上游及其隐私边界。

“全部 DNS 经代理”与“批准仅解析代理节点的加密直连 bootstrap”是不同目标；不能把后一种标为前一种。节点域名、resolver 域名、订阅/provider 刷新都可能有启动依赖。[DNS 方案与脚本](references/dns-workflow.md) 给出严格阻断与显式例外两种方案。

规则 TUN 仍然可以把业务流量判为 DIRECT。DNS 路径正确不等于业务路径正确；DoH 加密不等于经代理；AAAA 记录不等于 IPv6 传输；fake-ip 不等于劫持所有解析。地区报错本身不是泄漏证明，也不靠时区、语言、关 TLS 校验或改账号国家解决。

## 先定位、再加载材料

记录系统/架构、真实运行主机与网络命名空间、客户端/内核版本、当前订阅、应用版本与 CLI/桌面/浏览器入口。WSL、容器、SSH 和远程 Agent 的 localhost 不一定是用户电脑。由活动进程和界面确认路径，不取第一个目录。

| 当前任务 | 只读所需材料 |
|---|---|
| 客户端与配置合并 | [Clash Verge Rev](references/clash-verge.md) 或 [FlClash](references/flclash.md) |
| 规则无效、区域错误、旧会话 | [分层排错](references/troubleshooting.md) |
| DNS 计划、bootstrap、候选和静态检查 | [DNS 工作流](references/dns-workflow.md) |
| 系统 DNS、缓存、IPv6 | [Windows/macOS/Linux](references/platform-dns.md) |
| 安全 DNS、WebRTC、浏览器 Profile | [浏览器隐私](references/browser-privacy.md) |
| 变更顺序、成功标准、回滚 | [事务与验收](references/acceptance.md) |
| 延迟、QUIC、MTU 或吞吐问题 | [网络性能](references/network-performance.md) |
| 来源或版本有争议 | [来源与事实校正](references/sources.md) |

## 可独立安装的工具

`SKILL_DIR` 为本文件目录。Python 3.10+；JSON 无额外依赖，读取 YAML 需本机 PyYAML，不自动安装。CLI 默认不修改任何配置。

```bash
# 现有环境/连接证据；默认离线
python3 "$SKILL_DIR/scripts/proxy_doctor.py"
# 私有完整生效配置 + 自己填写的策略请求；不是 controller 的局部 /configs
python3 "$SKILL_DIR/scripts/dns_guard.py" plan --config effective.json --request dns-request.json
python3 "$SKILL_DIR/scripts/dns_guard.py" audit --config effective-after.json --request dns-request.json
```

[请求示例](templates/dns-request.example.json) 的 resolver/组名仅为示例，不直接套用。`plan` 生成待审阅片段与原配置摘要哈希，不生成可直接启动的完整配置；不会打印订阅、密码或旧的私有域名。审查新增/删除列表及空 map 替换语义，保留未知用户字段。已有 split DNS 被替换前需具名批准；内网/企业 DNS 需求未解决就停止迁移，不能牺牲可用性来“通过测试”。

联网 probe 要显式 `--network`、本机真实代理端口、批准的 numeric HTTPS resolver 和测试域名。它发送真实 A/AAAA DNS wire 查询，经指定代理验证 TLS、HTTP/MIME 和 DNS 响应；失败不直连。使用方法见 DNS 参考。它只证明该显式请求，不证明系统/浏览器 DNS 或 crash 隔离。

退出码：`plan` 的 0 只表示生成计划；已知阻断 1、输入错误 2；`audit`/`probe` 未覆盖整机验证返回 3（即使局部观察成功）。具体 JSON 状态须与退出码一起读。

## 分阶段执行

先取已知可用的基线，再保存本轮将修改对象的原字节、权限、哈希及“不存在”状态；Windows 用私有目录/ACL。先确认回滚与本地救援，远程会话不贸然断网。

优先 GUI 支持的导入/覆写。规则、DNS、TUN、系统 DNS、浏览器分阶段，前一阶段读回和实际请求未通过时不进入下一阶段。候选完整合并结果先由实际内核语法检查；检查可能读取 provider/Geo 数据，使用隔离副本和现有依赖，先核对本机帮助，不能把离线测试标签套到真实联网校验。

保留订阅、节点、密钥、端口、NTP/区域、已有 stack/MTU。不关闭现有代理路径来“强制 TUN”。DNS 劫持覆盖 UDP/TCP 53 的配置与实际流量都要验；局域网 resolver、浏览器 DoH、系统 DoT 和 IPv6 单独处理。禁止未验证监听就在网卡上填写 127.0.0.1，系统 DNS 通常不能填写端口 1053。

只修正已证实的规则优先级和策略链；保护组中 DIRECT、循环、未知 provider 成员会阻止自动候选。新域名补到 [规则模板](templates/ai-rules.yaml) 或 [生成器](scripts/render_rules.py) 的具名计划，不用全局 node/python 代理和宽泛关键词代替定位。

## 交付标准

按验收表逐项写已观察/失败/未验证，区分静态候选、运行时加载、真实应用规则链、DNS 上游与系统劫持、原生 IPv6、WebRTC、冷启动/切网/crash、回滚和性能变化。第三方 DNS 测试只是一部分证据；resolver 出口国家不同不自动判失败，相同不自动判通过。

没有现场数据就交付可验证计划和脚本，不宣称用户 Mac 已修好、服务地区已解锁或“绝不泄漏”。网络路径一致仍地区拒绝时，保存脱敏响应并核对服务资格/出口识别，不能保证更换 DNS 会解决。
