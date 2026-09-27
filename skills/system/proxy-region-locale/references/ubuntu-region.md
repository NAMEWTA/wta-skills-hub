# Ubuntu 区域对齐

只在 systemd 的 Ubuntu上使用。其它发行版或 Windows / macOS 没有在这台机器上核对过，不要照搬命令。

图形用户从 `loginctl` 里找正在使用的 seat 会话（Wayland 或 X11），不要假设用户名。下面用 `$GUI_UID` 和 `$GUI_USER` 表示该用户。GNOME 键通过该用户的会话总线执行：

```bash
sudo -u "$GUI_USER" env \
  XDG_RUNTIME_DIR=/run/user/$GUI_UID \
  DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$GUI_UID/bus \
  gsettings "$@"
```

没有 `/run/user/$GUI_UID/bus` 时，不要改 gsettings。账户服务仍可改，并说明桌面键要等该用户登录后再写。

## 回滚快照

在执行者可写的工作目录使用 `mktemp -d` 创建本轮独立回滚目录，权限设为 700。保留以前的记录，不覆盖固定名称。对每个将修改的文件保存原内容、权限/所有者和“原先不存在”状态，恢复时不存在项应删除而非造默认值。至少包含：

- `timedatectl`、`localectl status`、`locale`
- `/etc/locale.conf`、`/etc/default/locale`、`/etc/locale.gen`、`/etc/default/keyboard`；以及本轮实际会修改的其他文件
- `/etc/papersize` 的全文；文件不存在就写明不存在，回滚时删除而不是写回 A4
- `busctl get-property org.freedesktop.Accounts /org/freedesktop/Accounts/User$GUI_UID org.freedesktop.Accounts.User Language`
- 同上路径的 `FormatsLocale`、`Languages`、`InputSources`
- 下文每个 gsettings 键的当前值
- 本轮 Chrome 管理策略文件的原内容或不存在状态；其他策略保持不变
- 若能确认图形用户，再记录该用户的账户与会话键。无目标用户或无 session bus 时跳过相应项，不猜 UID

## 选择 locale 和键盘

在用户选择美国英语且授权语言/键盘调整时，使用 `en_US.UTF-8` 和 `us`；用户已有明确偏好优先。仅修改时区不执行本节。

其它国家：在 `/etc/locale.gen` 或 `/usr/share/i18n/SUPPORTED` 里找 `_<国家代码>.UTF-8`。用户未指定语言且只有一个合理候选时才采用。有多个（例如加拿大、瑞士）先问。然后：

```bash
localectl list-x11-keymap-layouts
```

布局名与小写国家代码相同就用它（`us`、`de`、`fr`、`jp`）。英国的国家代码是 `GB`，布局是 `gb`。对不上就停下问，不要编一个布局。

生成并安装界面语言包（包名不存在就只做 `locale-gen`）：

```bash
sed -i "s/^# *\\(${LOCALE} UTF-8\\)/\\1/" /etc/locale.gen
locale-gen "$LOCALE"
apt-get install -y "language-pack-${LANGCODE}" "language-pack-gnome-${LANGCODE}"
```

`en_US.UTF-8` 的语言包是 `language-pack-en` 与 `language-pack-gnome-en`。语言包可能顺带生成同一语言的其它国家 locale，可以留下。

## 系统时区、语言、键盘、纸张

```bash
localectl set-locale "LANG=${LOCALE}"
timedatectl set-timezone "$IANA_TZ"
```

保留 RTC 为 UTC，不要 `timedatectl set-local-rtc 1`。

```bash
localectl set-keymap "$XKB"
localectl set-x11-keymap "$XKB" pc105
```

若 dbus 返回 `Access denied`，不要重试个没完。直接改 `/etc/default/keyboard` 的 `XKBLAYOUT`。先看 `/etc/vconsole.conf` 是不是指向该文件，避免写成两份。改完用 `localectl status` 确认 `X11 Layout`。控制台映射若仍是 unset，就按原样留下并写进结果。

libpaper 2 的优先级是：`PAPERSIZE` 环境变量、用户自己的 papersize、**当前 locale 的 LC_PAPER**、然后才是 `/etc/papersize`。所以两处都要设成同一个名字：

```bash
LC_ALL="$LOCALE" paper --no-size
paperconfig -p "$PAPER_NAME"
```

`paperconfig` 会写成规范名（美国是 `Letter`）。再用 `LC_ALL="$LOCALE" paper --no-size` 读回。

## 从 locale 读格式，不要写死美国

`LC_ALL="$LOCALE"` 下读取：

| 键 | 怎么用 |
| --- | --- |
| `locale -k d_fmt` | 日期。`en_US` 是 `%m/%d/%Y` |
| `locale -k t_fmt` | 含 `%r` 或 `%I` 则 GNOME `clock-format` 为 `12h`，否则 `24h` |
| `locale -k measurement` | `2` 是美制，否则公制 |
| `locale -k int_prefix`、`tel_dom_fmt`、`country_name`、`postal_fmt` | 电话和地址，只核对，没有单独开关 |
| `locale -k first_weekday` 与 `abday` | `first_weekday=1` 且 `abday` 从 Sunday 起，则 GNOME `week-start-day` 为 `sunday`，否则 `monday` |

用 Python 核对，不要用 `date +%x` 当唯一证据。这台机器的 `date` 是 uutils，`%x` 会印成两位年份；libc 仍是四位年：

```bash
LC_ALL="$LOCALE" python3 - << 'PY'
import locale, time
locale.setlocale(locale.LC_ALL, "")
print(time.strftime("%x"))
print(locale.format_string("%.2f", 1234.56, grouping=True))
print(locale.currency(1234.56, grouping=True))
PY
```

用固定样例日期验证日期格式，避免把某个历史日期当作当前输出。美国英语的数字/货币样例为 `1,234.56`、`$1,234.56`，以本机 libc/locale 数据为准。

## 账户服务和桌面

账户服务会盖过 `/etc/locale.conf`。用方法调用，不要手改 `/var/lib/AccountsService/users/`：

```bash
busctl call org.freedesktop.Accounts \
  /org/freedesktop/Accounts/User$GUI_UID \
  org.freedesktop.Accounts.User SetLanguage s "$LOCALE"
busctl call org.freedesktop.Accounts \
  /org/freedesktop/Accounts/User$GUI_UID \
  org.freedesktop.Accounts.User SetFormatsLocale s "$LOCALE"
```

读回 `Languages` 和 `FormatsLocale`。`Language` 属性可能只显示 `en` 这种语言代码；以 `Languages` 里的 `en_US.UTF-8` 为准。

输入源保持「国家布局在前，原来的 IBus 引擎在后」。原来是 `xkb/cn` 加 `ibus/libpinyin` 时，写成 `xkb/us` 加 `ibus/libpinyin`。没有第二种输入法就只留布局。参数类型是 `aa{ss}`，读回形状是 `2 1 "xkb" "us" 1 "ibus" "libpinyin"`：

```bash
busctl call org.freedesktop.Accounts \
  /org/freedesktop/Accounts/User$GUI_UID \
  org.freedesktop.Accounts.User SetInputSources aa{ss} \
  2 1 xkb "$XKB" 1 ibus "$ENGINE"
```

只有一项时，把开头的 `2` 改成 `1` 并删掉第二种。调用前用 `busctl introspect` 核对签名，调用后读回 `InputSources`。

会话里同步：

```bash
gsettings set org.gnome.desktop.input-sources sources \
  "[('xkb', '$XKB'), ('ibus', '$ENGINE')]"
gsettings set org.gnome.system.locale region "$LOCALE"
gsettings set org.gnome.desktop.interface clock-format "$CLOCK"
gsettings set org.gnome.desktop.calendar week-start-day "$WEEKDAY"
```

天气地点用地理查询返回的城市名和坐标，不要编机场代码。类型是 `(ssm(dd))`。写完必须读回；被拒绝就保持原值并报告：

```bash
gsettings set org.gnome.GWeather4 default-location \
  "('$CITY', '', @m(dd) ($LAT, $LON))"
```

顶栏天气键的类型是 `av`。可用的写法是：

```bash
gsettings set org.gnome.shell.weather locations \
  "[<('$CITY', '', @m(dd) ($LAT, $LON))>]"
```

拒绝则留空，让它使用上面的 `default-location`。`automatic-location` 保持 false。把 `org.gnome.clocks geolocation` 设为 false，`org.gnome.system.location enabled` 保持 false，避免下一次自动定位覆盖刚写上的城市。

度量：`measurement` 为 `2` 时，温度 `fahrenheit`、距离 `miles`、风速 `mph`、气压 `inch-hg`。否则用 `centigrade`、`km`、`kph`、`hpa`。

## 浏览器

仅当用户要求包括浏览器界面语言时执行。先备份目标策略文件，合并而非覆盖现有策略；Chrome 已安装时写入 `/etc/opt/chrome/policies/managed/proxy-region-locale.json`：

```json
{"ApplicationLocaleValue": "en-US"}
```

`en_US.UTF-8` 对应 `en-US`；其它 locale 把下划线换成连字符并去掉 `.UTF-8`。Chrome 正在运行时不要改 `Preferences`，退出时会被写回。策略在下次启动生效。Firefox 没有单独的语言锁定时，跟随系统 locale，不要预先写 `intl.locale.requested`。

## NTP

调整时区/区域不需要更换 NTP 源。只读查询当前同步状态（使用机器实际安装的服务），分别报告同步状态和源可达性。

若排查的域名返回 `198.18.0.0/15`，停止使用该候选源，不写配置、不执行 `date -s`、不改代理或 DNS。单个候选源不可用不证明系统未同步；无法读取实际状态时写“未验证”。

## 结束

不要重启 `gdm`，也不要替用户杀掉浏览器。请图形用户注销再登录。结果里写明：新会话才会变成新的 `LANG`；这次核对过的 libc 输出；纸张文件名；键盘是 `localectl` 改的还是直接改的文件；NTP 是否真的同步。
