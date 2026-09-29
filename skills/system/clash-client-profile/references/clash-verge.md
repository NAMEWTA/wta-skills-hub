# Clash Verge Rev

只处理数据目录里同时有 `verge.yaml` 和 `profiles.yaml` 的那一份。按顺序找，用第一个符合的：

| 系统 | 候选目录 |
|---|---|
| macOS | `~/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev` |
| Windows | `%APPDATA%\io.github.clash-verge-rev.clash-verge-rev` |
| Linux | `~/.local/share/io.github.clash-verge-rev.clash-verge-rev`，然后 `~/.config/clash-verge-rev` |

运行中的进程名包含 `Clash Verge`、`clash-verge` 或 `verge-mihomo` 时，就是这个客户端。

## 读当前订阅

`profiles.yaml` 的 `current` 是当前订阅 uid。在 `items` 里找到该 uid：

- `option.rules` 指向 `profiles/` 下的规则文件。类型是 `rules`，内容是 `prepend` / `append` / `delete`。这是 1.7 以后「编辑规则」的文件，不是 Merge 里的 `prepend-rules`。
- `option.merge` 指向 Merge 文件。
- 订阅正文是 `file` 指向的远程或本地配置。只从中读取 `proxy-groups` 的 `name` 和 `type`，用来核对模板里的策略组。不写这个文件。

`option.rules` 或 `option.merge` 还没有时，不要在客户端运行期间改 `profiles.yaml`。请用户退出后再补一条对应类型的条目并写上引用。新 uid 不要与已有 uid 重复。

## 可写字段

改现有文件的对应键，保留其余键、注释和顺序。不要整文件用 YAML 重新导出。不要改生成的 `clash-verge.yaml`；它只用来在刷新后核对。

`verge.yaml`：

- `enable_tun_mode: true`
- `enable_system_proxy: false`
- `enable_dns_settings: true`
- `profile_dns_settings.<当前 uid>.enabled: true`。没有这个 uid 就补上，不改其他 uid。

`config.yaml`：

- `mode: rule`
- `ipv6: false`
- `unified-delay: true`
- `tun.stack` 已有值就保留。没有时 macOS 和 Linux 写 `gvisor`，Windows 写 `mixed`。
- `tun.dns-hijack` 缺少时补 `any:53` 和 `tcp://any:53`。
- 不改 `tun.enable`、端口、密钥和 `external-controller`。TUN 开关以 `verge.yaml` 的 `enable_tun_mode` 为准。

DNS 写入 `dns_config.yaml` 的 `dns` 映射，键和值来自 [templates/dns.yaml](../templates/dns.yaml)。文件里模板没有的键保留。扩展配置里的 `dns` 会被客户端整段替换，不要写到 Merge。

`find-process-mode: always` 写进当前订阅的 Merge 文件。没有其他内容时保留原有注释再加这一键。

## 服务模式

macOS 上，下面两个路径有一个存在即可：

- `/Library/PrivilegedHelperTools/io.github.clash-verge-rev.clash-verge-rev.service.bundle`
- `/Library/LaunchDaemons/io.github.clash-verge-rev.clash-verge-rev.service.plist`

Windows 上查询服务 `clash_verge_service`。查不到就报告未安装服务模式。Linux 上在数据目录找不到服务助手时写未验证。

不创建服务，不提升权限。

## 刷新后核对

用户刷新当前订阅后，再读规则文件、`verge.yaml`、`config.yaml`、`dns_config.yaml` 和 Merge 文件。生成的 `clash-verge.yaml` 里应看到 `mode: rule`、`tun.enable: true`、`ipv6: false`。生成文件被旧内容盖住时，运行中的内核标成未验证。

客户端若在刷新时丢掉 `respect-rules`、`nameserver-policy` 或 `direct-nameserver`，报告丢掉的键。不要改去写订阅正文。
