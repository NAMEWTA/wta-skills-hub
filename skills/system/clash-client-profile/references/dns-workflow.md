# DNS 设计与可执行工作流

## 1. 明确“只用代理 DNS”的含义

要控制两个独立维度：**谁解析**（批准的 resolver）与**怎么到达它**（指定代理组/隧道）。第三方公共 DoH 不因为配置进客户端就成了“代理商提供的 DNS”；代理商未发布 DNS 地址时不能猜。优先使用其正式提供且在代理内可达的 DNS；没有时让用户选择可信上游，并说明它仍能看到查询。

本技能自动生成器刻意只支持公开 numeric DoH/DoT 上游、不带账号/query/额外 DNS 参数，以避免隐式 bootstrap 和敏感信息输出。私有 provider DNS、带认证 URL、域名形式 DoH 或复杂企业 split DNS 可人工设计，但不擅自换成公共服务。**不要把域名 DoH 的 URL 生硬改成 IP**：证书/SNI 未必支持；保持证书校验，以实际服务信息为准。

规则模式中业务可 DIRECT，但其公共 DNS 也可全部从代理发出。若用户要求业务也全不直连，必须另定义受保护应用/域名和断线隔离，不用 DNS 配置冒充业务 kill switch。`.local` mDNS、企业域、路由器名和 DHCP 是独立网络需求，不把它们当成必须送公共 resolver 的网站；严格目标与这些需求不兼容时先停止，不静默加例外。

## 2. 解析路径与启动依赖

分别记录：应用 DNS → OS stub/实际网络服务 → TUN DNS 劫持 → Mihomo resolver → resolver 的 TLS 连接 → 代理组 → 最终节点。业务请求另记录目标规则与最终链。

Mihomo DNS 字段含义以读取的上游文档/本机内核为准：

| 字段 | 作用 | 容易遗漏的问题 |
|---|---|---|
| `nameserver` | 普通域名的默认上游 | 只填国外 DoH，连接仍可能 DIRECT |
| `nameserver-policy` | 特定域名优先上游 | 比默认上游优先；旧 `geosite:cn`/system 仍会生效 |
| `direct-nameserver` | DIRECT 业务出口的域名解析 | `system` 会破坏“全部公网 DNS 经代理”的目标 |
| `default-nameserver` | 解析 resolver 域名的引导 DNS | 文档要求 IP，可加密；遗漏会引入额外路径 |
| `proxy-server-nameserver` | 解析代理节点的域名 | 若仍经尚未启动的同一代理，会产生循环依赖 |
| `proxy-server-nameserver-policy` | 节点域名的专门策略 | 可覆盖节点 bootstrap，必须一起审阅 |
| `respect-rules` | DNS 连接遵守路由规则 | 不等于强制代理；文档要求非空 proxy-server-nameserver |
| `URL#组名` | 指定 DNS 连接走该代理/组 | 组不存在时可能按接口名解释；必须核对真实组 |
| `fallback` | 额外解析路径 | 不要假设只有失败才查询；本方案不注入直连 fallback |
| `fake-ip` | 向应用提供映射地址 | 不保证 OS/浏览器解析都到达内核 |

因此自动候选将普通、DIRECT 业务解析和 resolver 引导 DNS 都显式绑定批准组，而不是只依赖 `respect-rules`。IPv4/IPv6 numeric 上游必须自己提供；不会发起本地 DNS 来寻找服务器。

### A. strict-no-bootstrap：严格但有前置条件

请求 `"bootstrap": {"mode": "deny"}`。候选使用 `proxy-server-nameserver: ["rcode://refused"]` 拒绝意外的节点域名解析；所有静态节点地址须已确定，动态 providers、域名节点或未知成员会阻止自动计划。不能为通过检查而静默把节点域名替换成旧 IP，证书/SNI、地址变动和订阅更新仍需管理。

`default-nameserver` 与一般上游使用显式 `#组名` 的 numeric 加密地址；不会依赖本地 resolver 去解析 DoH 主机名。无已可用节点时不能保证启动。候选语法依据当前读取的 Mihomo Alpha 解析实现，不保证旧内核；**必须用用户实际版本检查与冷启动测试**。`rcode://refused` 的存在不代表已经完成 OS 防泄漏或 crash 隔离。

### B. encrypted-bootstrap-exception：可审计的启动例外

当订阅依赖节点域名，且用户批准启动解析在隧道外进行，可填：

```json
{
  "mode": "encrypted-direct",
  "resolvers": ["tls://9.9.9.9"],
  "acknowledge_direct_bootstrap": true
}
```

这里的地址仅演示格式，不是替用户选择。该列表只填经过认可的加密 numeric resolver，不填运营商、`system`、DHCP 或明文地址。仍只用于节点域名；普通、DIRECT 业务和 resolver 引导 DNS 继续显式走代理。**此模式存在直连 DNS 连接，不能报告“全部 DNS 经代理”**；运营商仍看到与 resolver 的连接元数据，resolver 会看到本地出口和节点查询。没有例外授权就阻止应用，不自动降级。

若连批准的 bootstrap 也不可达，先保留原配置并报告受阻。不要关证书校验、随意改端口或回退明文。

## 3. 生成、合并与检查

工具：Python 3.10+。[dns_guard.py](../scripts/dns_guard.py) 无网络的 `plan/audit` 可读 JSON；YAML 需 PyYAML（可用时以 SafeLoader、拒绝重复键/别名、限制大小解析）。没有依赖时从可信本地解析器导出有效 JSON，不自行用正则解析 YAML。不要把生产配置交给在线转换网站。

从客户端导出**完整的实际生成配置**到用户私有目录；不要把只有模式/端口的 `/configs` 响应当成完整配置。保存所有必要的组/节点/TUN/DNS 信息，但原文件可能含密码，只在本机使用，不加入 Git。动态 provider 成员缺失时人工确认、取得可信展开视图后再继续，不从不完整摘要推测。

复制 [请求示例](../templates/dns-request.example.json) 到自己的私有工作目录，填写实际 group、批准 resolver、IPv6 策略和保护域名。`targets` 是域名后缀的业务规则范围；DNS 方案覆盖全部公网解析，并不是只保护 targets 的 DNS。

```bash
python3 "$SKILL_DIR/scripts/dns_guard.py" plan \
  --config effective-before.yaml --request dns-request.json
```

Windows PowerShell 用已验证的 `python` 或 `py -3`，如：

```powershell
& python "$SKILL_DIR\scripts\dns_guard.py" plan --config effective-before.json --request dns-request.json
```

输出含 `input_profile_sha256`、`candidate_fragment`、`rules_extension`、`merge_contract`、`findings` 和待验项目。已知危险返回 `BLOCKED`，不输出可应用候选；正常输出为 `REVIEW_REQUIRED`，不是完整配置。0 只表示计划生成完成。

候选不设置 `dns.listen`、system proxy、stack、MTU 或 DNS 缓存调优；保留原 DNS filter 和无关设置。启用 fake-ip 前检查与 LAN/VPN 的地址冲突以及 DNS 缓存中的旧真实/fake 地址，不把整个 `198.18.0.0/15` 标记成公网目标。

**空 map 的合并陷阱：** `nameserver-policy: {}` 在一些递归 Merge 中不会删除旧键。计划要求替换两类策略 map，列表整体替换；导出最终生成配置重新 `audit`，不能只看自己写的片段。原先有 split DNS 时默认 `BLOCKED`；先审查其用途，确实批准替换才将请求的 `replace_existing_dns_policies` 改为 true。企业内部域名仍需本地解析时，不用这个严格自动候选覆盖它；保留旧配置，制定标明例外的人工方案。

合并规则要检查已有第一命中规则，特别是进程规则、IP 规则、GEOIP、RULE-SET 与 MATCH。不合并新 GROUP、不改节点选择，不擅自删除旧业务规则。生成后通过真实内核校验，再在支持的 GUI 层导入。客户端当前生效文件只读；不要覆盖生成文件来绕过客户端。

```bash
python3 "$SKILL_DIR/scripts/dns_guard.py" audit \
  --config effective-after.yaml --request dns-request.json
```

`audit` 返回 1 表示检测到配置风险，3 表示静态检查未发现这些风险但现场仍未验证。不把后者改成“检测通过，无泄漏”。脚本不是 Mihomo 完整模拟器，不展开远程规则、验证 schema 的所有版本或证明组的地理位置。

## 4. 发出真实 DoH wire 查询（显式同意后）

下面 `7890` 为示例端口，resolver 为用户选择的测试端点；先核对可用性、TLS/IP 证书和信息披露。外部 resolver 会看到测试域名和代理出口 IP；不携带 Claude API key、Cookie 或节点密码。

```bash
python3 "$SKILL_DIR/scripts/dns_guard.py" probe --network \
  --proxy http://127.0.0.1:7890 \
  --resolver https://1.1.1.1/dns-query \
  --domain example.com --qtype both
```

用 RFC 8484 DNS wire POST，不使用各家私有 JSON API。分别查询 A/AAAA，检查 TLS、HTTP 200、DNS MIME、事务 ID、question、压缩指针和响应长度，区分 ANSWER、NODATA、NXDOMAIN、DNS_ERROR。不使用 `-k`，不跟重定向，不读 `.curlrc`，不采用环境 NO_PROXY，不失败后直连。支持 numeric-loopback HTTP/HTTPS/socks5h；不支持远程代理/需认证的代理时明确停下，不要求公开 secret。

DoT 配置可做静态审查，但该探针仅测试 DoH，不把它称作 DoT 实测。上游没有提供 numeric HTTPS 时交付人工方案，不改服务地址欺骗 TLS。IPv6 literal resolver 可用于测试其地址族连通性；AAAA 查询本身可能仍在 IPv4 传输，不能据此认定本机 IPv6 正常。

0/3 与输出观察分开解释：该 `probe` 总体维持 UNVERIFIED；局部成功显示 OBSERVED，正常 DNS 的 NXDOMAIN/NODATA 不是 IP 泄漏；请求失败没有直连补救。**显式使用 Clash 的 HTTP/mixed 端口只证明进入本地代理，仍可能被其业务规则判为 DIRECT；必须核对这一请求的最终链。它也没有调用内核内部 DNS 模块，因此不能替代对候选 nameserver/#组名 的生效验证。**

**它不测试 OS TUN 的 DNS 拦截**，因为请求显式指定代理。系统路径需要验收参考中的原生解析 + 物理接口/内核证据。

## 5. 为什么不能只看网页上的 DNS 国家

检测站通常通过随机域名观察递归 resolver 的出口，可能与业务节点不同。Anycast、转发链、服务商出口和地理数据库可能影响显示。正确证据是：批准 resolver、观察到 DNS 的路由路径、物理接口没有该测试的未授权外发，以及真实应用规则链；IP 所在国家只是线索。

不要声称普通 DoH“很难被封”“隐私性最高”或绝对隐藏目的。DoH/DoT 保护到 resolver 的内容，但 resolver 自己可见，连接元数据仍可见；明文 DNS 经加密隧道到 VPN resolver 与本地明文外发也不能混为一谈。清缓存仅去掉旧答案，不改变这些路径。
