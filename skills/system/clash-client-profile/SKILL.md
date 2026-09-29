---
name: clash-client-profile
description: "为 Clash Verge Rev 或 FlClash 写入规则模板，启用 TUN（虚拟网卡）和规则模式，并调整客户端 DNS，使走代理的域名按节点出口解析。用于配置这两个客户端、导入规则、打开虚拟网卡或减少 DNS 泄漏。只查询出口、修改系统时区或语言、清理磁盘，以及不涉及这两个客户端的任务不适用。"
license: MIT
---

# 配置 Clash 客户端

先识别正在使用的客户端，只打开对应参考：[Clash Verge Rev](references/clash-verge.md)、[FlClash](references/flclash.md)。认不出就停，不套用另一份里的路径。

进程正在运行的客户端优先。两个都安装且都没在运行时停下来问。都没有就停。

用户只要求查看出口、节点或现有配置时只报告，不建回滚、不写文件。

规则以 [templates/ai-rules.yaml](templates/ai-rules.yaml) 为准。DNS 以 [templates/dns.yaml](templates/dns.yaml) 为准，只覆盖其中列出的键。不把规则写进 DNS 文件，也不把 DNS 写进规则文件。

## 选择目标

只处理当前订阅。从模板规则里收集策略组名，跳过 `DIRECT`、`REJECT` 和 `MATCH`。当前订阅缺少其中任何一个组时停，列出已有的 select 组名，不改模板，不改订阅。

不改订阅原文、订阅地址、节点、密码和当前选中的节点。不打开外部控制，不安装特权助手。助手缺失时只报告，TUN 是否真的接管流量标成未验证。

进程规则要求 `find-process-mode: always`。写到该客户端参考指定的位置。

用户还要求整台电脑的时区、语言或区域跟出口对齐时，客户端改完后按 `proxy-region-locale` 处理。本技能不改系统 DNS、NTP 或区域设置。

## 修改与回滚

确有修改请求时，每次修改前用 `mktemp -d` 建权限 700 的新目录，保存将改文件的原内容、权限和「原先不存在」。不覆盖旧回滚。恢复时，原先不存在的文件应删除。

不把订阅地址、节点密码和外部控制密钥写进回滚说明或最终报告。

Clash Verge 正在运行时不结束进程。可以写规则文件、`verge.yaml`、`config.yaml`、`dns_config.yaml` 和当前 Merge 文件。`profiles.yaml` 的结构要等客户端退出后再改。写完请用户在界面刷新当前订阅，再读回。被盖掉就停，说明需要先退出客户端，本轮不再写。

FlClash 正在运行时不写它的任何文件。请用户先退出，退出后再写。

规则合并：当前文件没有任何规则时，整文件换成模板。否则模板的 `prepend`、`append`、`delete` 各自按模板顺序放在最前；已有、尚未出现、且不在模板 `delete` 里的规则留在对应列表后面。相同规则不重复。合并后的文件保留模板开头的说明。

## 验收

读回 TUN 开关、系统代理、模式、IPv6、规则文件里模板的首条和末条规则、`respect-rules`、`find-process-mode`，并报告回滚目录。运行中的内核要等刷新后再看生成配置；没刷新就写「运行中的内核未验证」。

用现有出口做一次只读查询，例如 `curl -4 -fsS --max-time 8 https://ipinfo.io/json`。失败就写未验证，不改系统网络。

浏览器 WebRTC 仍可能暴露本机地址。不改浏览器配置。
