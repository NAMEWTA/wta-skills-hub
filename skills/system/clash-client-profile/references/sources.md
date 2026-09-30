# 来源台账与事实校正

本轮仓库基线：`4edc8118bf2ccc4a892bded392123e965098a634`。通用网页/X 搜索不可用；以下是通过 GitHub 连接器实际读取的仓库资料，不称作“全网研究”。文档与代码分支会变动，记录 blob 以区分本轮读到的内容；部署以用户实际客户端/内核为准。

## 已读取的直接依据

| 来源 | 路径与本轮 blob | 用于哪些结论 |
|---|---|---|
| [MetaCubeX DNS 文档](https://github.com/MetaCubeX/Meta-Docs/blob/main/docs/config/dns/index.md) | `a5d963ddd440387299b67c7f4ee39210e1ac4e99` | DNS 字段作用/优先级、respect-rules 的节点解析依赖、DNS 指定代理/接口、H3 警告 |
| [MetaCubeX TUN 文档](https://github.com/MetaCubeX/Meta-Docs/blob/main/docs/config/inbound/tun.md) | `115206e85663b0acaa0c0fe3072aefd669979d95` | UDP/TCP DNS 劫持、Mac/Windows LAN DNS 限制、strict-route 的平台差异与兼容风险 |
| [DNS 类型](https://github.com/MetaCubeX/Meta-Docs/blob/main/docs/config/dns/type.md) | `1af102b318922129708518570709284f5d1be5a4` | UDP/TCP/DoH/DoT/system/dhcp/rcode 类型，rcode://refused 为内核支持的类型 |
| [Mihomo Alpha DNS 解析实现](https://github.com/MetaCubeX/mihomo/blob/Alpha/config/config.go) | `707114a337a2d3f865b687363ef264ac950d785b`；读取开头及约 1160–1365、1400–1710 行 | URL fragment 的代理名、rcode 解析、default-nameserver numeric 校验、respect-rules 与非空 proxy-server-nameserver 约束 |
| [curl SOCKS5 hostname](https://github.com/curl/curl/blob/master/docs/cmdline-opts/socks5-hostname.md) | `f8ee9fe13797572cf274eab07375bb38297df067` | socks5h/--socks5-hostname 让代理解析，不把所有 SOCKS 用法都当成本地解析 |
| 本仓库 AGENTS、Clash 主入口/脚本/模板/参考与测试 | 基线同上；主入口 blob `48495b1f16c4d00e2465c1cc41064e18a834702f` | 保留稳定名字、独立安装、只读/修改边界、实际缺口与回归行为 |

Alpha 是本轮参考的代码分支，不是建议用户切换到开发版，也不是已验证的客户端版本范围。已经读取的格式说明仍需实际内核 `--help`/配置检查；没有在本轮沙箱运行 Mihomo 或连接用户代理。

## 用户提供资料：采用目标，修正绝对化说法

| 原说法/建议 | 本技能采用的精确边界 |
|---|---|
| 开代理后只用代理提供 DNS | 保留“不用未经批准的本地解析”目标；代理商未提供 DNS 时不虚构地址。resolver 身份与连接是否走代理分别验收 |
| 关浏览器安全 DNS 就能避免泄漏 | 集中解析方案要先证明系统已接管，再关获准 Profile 的 DoH；走代理的获准 DoH 不必关闭 |
| Mac 删除手填 DNS 即自动接管 | 可能恢复 DHCP resolver；要读 scoped resolver 与实际路由 |
| flushdns/flushcache 修复泄漏 | 只清旧答案，不改变 resolver 或隧道路由 |
| DNS 劫持或 fake-ip 可以接管所有查询 | fake-ip 是映射；53 劫持不覆盖所有 LAN DNS/DoH/DoT/DoQ；要看系统和应用路径 |
| HTTP/SOCKS 只转 TCP，必先本地解析 | HTTP CONNECT 可携带域名，SOCKS5 也有远端解析与 UDP 能力；取决于客户端/代理支持与用法 |
| AAAA 泄漏等于 IPv6 DNS 传输 | DNS 记录类型与传输地址族独立，分别测试 |
| DoH 隐私最高、很难封 | 加密保护到 resolver 的内容，不隐藏所有连接元数据、不保证可达或经过代理 |
| DNS 显示节点所在国家就是成功 | 检测的是递归解析出口；anycast、转发链和地理库会影响显示，国家不能证明路径 |
| WebRTC 总会暴露真实 IP | 取决于 ICE candidate、浏览器策略、UDP/TUN、STUN/TURN 等；分别验收，不把私有地址直接判作公网泄漏 |

这些校正用于防止误配置，不是评判用户引用页面的整体质量。没有读取其完整实现、当前菜单或隐私说明，不宣称验证了该站检测精度。

## 标准背景与仍需现场/外部核对

[DNS 消息格式 RFC 1035](https://www.rfc-editor.org/rfc/rfc1035) 与 [DoH wire-format RFC 8484](https://www.rfc-editor.org/rfc/rfc8484) 是协议背景；本轮未通过通用网页重新抓取。脚本只实现受限 A/AAAA 探针，不是完整 resolver，不做 DNSSEC 认证。

Clash Verge Rev/FlClash 的具体安装版本、GUI 的 map/数组合并语义、浏览器当前设置/扩展、系统 DNS 管理策略、DNS 服务商端点可用性/证书/隐私政策、Claude Code 当前网络与地区资格，都需现场或可用的正式资料继续核对。本轮未拿静态域名基线冒充官方完整 allowlist，也未按节点名称证明出口国家。

上一轮默认分支 Mihomo README 返回同名游戏数据内容，作为无关来源排除；本轮显式读取 Alpha 得到了代理内核 Go 实现，并读取 Meta-Docs DNS/TUN 正文，补上了此前缺失的依据。一次 Mozilla policy 文档片段不涉及 DNS，未用来支持浏览器设置结论；DNS 目录旁的不存在路径与默认分支搜索空结果也不是证据。
