# 来源与适用范围

复核日期：2026-09-29。仓库读取基线为 1605708e3838ac085367dd06832641f4d7ce88a9。当前无通用网页/X 搜索能力；不声称做过全网调研、X 检索或用户 Mac 实测。

已读取本仓库旧 SKILL、Clash Verge/FlClash 参考及两份模板。可以确认旧流程包含关闭系统代理、单次 IPv4 echo 验收、固定 DNS 监听、广域关键词与进程路径假设；这些是设计风险，不是用户现场泄漏的直接证据。

需要实施时核验的上游入口（本轮没有成功核验其当前代理文档正文）：

- [Mihomo 文档](https://wiki.metacubex.one/)：规则匹配、TUN、DNS、controller 与配置校验的版本行为。
- [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev)：实际安装版本的扩展合并、服务和持久化格式。
- [FlClash](https://github.com/chen08209/FlClash)：实际版本的覆写语义与存储方式。
- [Claude Code 文档](https://code.claude.com/docs/)：已安装 CLI 的代理变量、登录/API 域名与网络要求。
- [curl 手册](https://curl.se/docs/manpage.html)：--proxy、--noproxy、--disable、socks5h、IP 地址族和超时。

一次 MetaCubeX/mihomo README 查询返回的正文实际介绍 Honkai: Star Rail Python 数据模型，与代理内核不匹配，已排除，不能引用为内核事实；docs/config.yaml 查询返回 404。不要把搜索命中或 URL 外观等同于来源身份已验证。

本次规则域名只是可编辑的最小基线，不标为官方完整 allowlist；根据真实连接补充，避免收集无关站点。诊断测试验证自身代码边界，不证明上游产品实现或服务地区可用性。
