# FlClash

先退出客户端再写。进程还在时只报告路径和将要改的项，不写文件。

按顺序找数据目录，用第一个同时有 `shared_preferences.json` 或 `database.sqlite` 的：

| 系统 | 候选目录 |
|---|---|
| macOS | `~/Library/Application Support/FlClash`，然后 `~/Library/Application Support/com.follow.clash` |
| Windows | `%APPDATA%\FlClash`，然后 `%APPDATA%\com.follow.clash` |
| Linux | `~/.config/FlClash`，然后 `~/.config/com.follow.clash` |

进程名包含 `FlClash` 或 `flclash` 时就是这个客户端。不要把它和 Clash Verge 的 `verge-mihomo` 算成同一个。

## 找到当前订阅

从 `shared_preferences.json` 或数据库里读 `currentProfileId`，以及该配置的策略组名。组名核对方式与正文相同。订阅 YAML 只读组名，不写。

配置 JSON 可能把整个配置再存成一段字符串。先解析外层；某个字符串值还能解析成带 `patchClashConfig` 的对象时，改那个对象，并按原来的形式写回（原来是字符串就继续存成字符串）。其他键保留。

读不到 `currentProfileId` 或 `patchClashConfig` 时停，说明看到的顶层键，不新建一份配置。

## 应用设置

在 `patchClashConfig` 里写：

- `mode: rule`
- `ipv6: false`
- `find-process-mode: always`
- `tun.enable: true`
- `tun.stack` 已有值就保留。没有时 macOS 和 Linux 写 `gvisor`，Windows 写 `mixed`。
- `tun.dns-hijack` 缺少时补 `any:53` 和 `tcp://any:53`。

`vpnProps` 已经存在时，把它的 `enable` 设为 true、`ipv6` 设为 false。没有 `vpnProps` 就不添加。

DNS 写入 `patchClashConfig.dns`，键和值来自 [templates/dns.yaml](../templates/dns.yaml)，并设 `overrideDns: true`，这样界面 DNS 使用这份内容。已有覆写脚本时不要删脚本；在报告里说明开启 DNS 覆写后，脚本写的 DNS 会被这份内容替换。

不改端口、订阅地址和节点。

## 规则放在覆写里

模板的 `prepend` / `append` / `delete` 不要写进订阅 YAML。

先找已经存在、且含有 `addedRules` 或 `standardOverwrite` 的 JSON。规则是字符串，或对象里有一条规则文本时，按正文的合并方式写入 `addedRules`：模板顺序在前，用户多出来的规则在后。`delete` 里的规则从覆写列表去掉，并记入该版本已有的禁用或删除字段；没有这样的字段就停，不要另造字段名。

只有 `database.sqlite` 时，先只读列出表名和列名。某列明确保存规则文本时才合并进该列。列名对不上就停，报告表名，不导出含有订阅地址的行，也不猜着写。

## 核对

写完后读回 `mode`、`tun.enable`、`ipv6`、`find-process-mode`、`overrideDns` 和合并后的覆写规则。客户端尚未重新打开时，运行中的内核标成未验证。
