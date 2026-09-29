# Linux 区域

先读 `/etc/os-release`。有 `timedatectl` 才改时区；没有就停，不改时钟文件。`localectl` 不存在就不改系统 locale。

语言包、`paperconfig` 和下面的 GNOME 键只在 Ubuntu 且对应命令或 schema 存在时使用。其他发行版即使有 systemd，也不要编造包名或桌面键；时区以外做不了的项写入结果。

图形用户从 `loginctl` 里找正在使用的 seat 会话（Wayland 或 X11），不要假设用户名。下面用 `$GUI_UID` 和 `$GUI_USER` 表示该用户。GNOME 键通过该用户的会话总线执行：

```bash
sudo -u "$GUI_USER" env \
  XDG_RUNTIME_DIR=/run/user/$GUI_UID \
  DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$GUI_UID/bus \
  gsettings "$@"
```

没有 `/run/user/$GUI_UID/bus` 时，不要改 gsettings。账户服务仍可改，并说明桌面键要等该用户登录后再写。

## 回滚快照

在执行者可写的工作目录使用 `mktemp -d` 创建本轮独立回滚目录，权限设为 700。保留以前的记录，不覆盖固定名称。对每个将修改的文件保存原内容、权限/所有者和「原先不存在」状态。至少包含：

- `timedatectl`、`localectl status`、`locale`
- `/etc/locale.conf`、`/etc/default/locale`、`/etc/locale.gen`、`/etc/default/keyboard`；以及本轮实际会修改的其他文件
- `/etc/papersize` 的全文；文件不存在就写明不存在
- 能确认图形用户时：账户服务的 `Language`、`FormatsLocale`、`Languages`、`InputSources`，以及下文每个将要写入的 gsettings 键
- 本轮 Chrome 管理策略文件的原内容或不存在状态

无目标用户或无 session bus 时跳过相应项，不猜 UID。

## 选择 locale 和键盘

仅修改时区时跳过本节。用户选择美国英语且授权语言调整时，使用 `en_US.UTF-8`；键盘布局用 `us`，已有输入法保留在后面。

其他国家：在 `/etc/locale.gen` 或 `/usr/share/i18n/SUPPORTED` 里找 `_<国家代码>.UTF-8`。用户未指定语言且只有一个合理候选时才采用。有多个（例如加拿大、瑞士）先问。然后：

```bash
localectl list-x11-keymap-layouts
```

布局名与小写国家代码相同就用它（`us`、`de`、`fr`、`jp`）。英国的国家代码是 `GB`，布局是 `gb`。对不上就停下问，不要编一个布局。

Ubuntu 上再生成 locale，并在包存在时安装界面语言包：

```bash
sed -i "s/^# *\\(${LOCALE} UTF-8\\)/\\1/" /etc/locale.gen
locale-gen "$LOCALE"
apt-get install -y "language-pack-${LANGCODE}" "language-pack-gnome-${LANGCODE}"
```

`en_US.UTF-8` 的语言包是 `language-pack-en` 与 `language-pack-gnome-en`。不是 Ubuntu 或 `apt-get` 不存在时，不要猜包名；`locale-gen` 可用就只做生成。

## 系统时区、语言、键盘、纸张

```bash
localectl set-locale "LANG=${LOCALE}"
timedatectl set-timezone "$IANA_TZ"
```

`$IANA_TZ` 必须是 `timedatectl list-timezones` 里的名称。保留 RTC 为 UTC，不要 `timedatectl set-local-rtc 1`。

```bash
localectl set-keymap "$XKB"
localectl set-x11-keymap "$XKB" pc105
```

若 dbus 返回 `Access denied`，不要反复重试。直接改 `/etc/default/keyboard` 的 `XKBLAYOUT`。先看 `/etc/vconsole.conf` 是不是指向该文件，避免写成两份。改完用 `localectl status` 确认 `X11 Layout`。控制台映射若仍是 unset，就按原样留下并写进结果。

有 `paper` 和 `paperconfig` 时，libpaper 2 的优先级是：`PAPERSIZE` 环境变量、用户自己的 papersize、当前 locale 的 `LC_PAPER`，然后才是 `/etc/papersize`。两处都要设成同一个名字：

```bash
LC_ALL="$LOCALE" paper --no-size
paperconfig -p "$PAPER_NAME"
```

`paperconfig` 会写成规范名（美国是 `Letter`）。再用 `LC_ALL="$LOCALE" paper --no-size` 读回。没有 libpaper 就跳过纸张。

## 从 locale 读格式

在 `LC_ALL="$LOCALE"` 下读取，不要把美国格式写死到其他 locale：

| 键 | 怎么用 |
| --- | --- |
| `locale -k d_fmt` | 日期。`en_US` 是 `%m/%d/%Y` |
| `locale -k t_fmt` | 含 `%r` 或 `%I` 则 GNOME `clock-format` 为 `12h`，否则 `24h` |
| `locale -k measurement` | `2` 是美制，否则公制 |
| `locale -k int_prefix`、`tel_dom_fmt`、`country_name`、`postal_fmt` | 电话和地址，只核对，没有单独开关 |
| `locale -k first_weekday` 与 `abday` | `first_weekday=1` 且 `abday` 从 Sunday 起，则 GNOME `week-start-day` 为 `sunday`，否则 `monday` |

用固定样例日期核对，不要把某一天的输出当成格式本身。美国英语的数字和货币样例是 `1,234.56`、`$1,234.56`，以本机 libc 为准：

```bash
LC_ALL="$LOCALE" python3 - << 'PY'
import locale, time
locale.setlocale(locale.LC_ALL, "")
print(time.strftime("%x"))
print(locale.format_string("%.2f", 1234.56, grouping=True))
print(locale.currency(1234.56, grouping=True))
PY
```

某些 `date` 实现的 `%x` 只有两位年份。以 Python 或 libc 为准。

## 账户服务和桌面

只在有 `busctl` 和账户服务时做。账户服务会盖过 `/etc/locale.conf`。用方法调用，不要手改 `/var/lib/AccountsService/users/`：

```bash
busctl call org.freedesktop.Accounts \
  /org/freedesktop/Accounts/User$GUI_UID \
  org.freedesktop.Accounts.User SetLanguage s "$LOCALE"
busctl call org.freedesktop.Accounts \
  /org/freedesktop/Accounts/User$GUI_UID \
  org.freedesktop.Accounts.User SetFormatsLocale s "$LOCALE"
```

读回 `Languages` 和 `FormatsLocale`。`Language` 属性可能只显示 `en` 这种语言代码；以 `Languages` 里的 `en_US.UTF-8` 为准。

输入源保持「目标布局在前，原来的 IBus 引擎在后」。原来是 `xkb/cn` 加 `ibus/libpinyin`、目标是美国时，写成 `xkb/us` 加 `ibus/libpinyin`。没有第二种输入法就只留布局。调用前用 `busctl introspect` 核对签名，调用后读回 `InputSources`。

```bash
busctl call org.freedesktop.Accounts \
  /org/freedesktop/Accounts/User$GUI_UID \
  org.freedesktop.Accounts.User SetInputSources aa{ss} \
  2 1 xkb "$XKB" 1 ibus "$ENGINE"
```

只有一项时，把开头的 `2` 改成 `1` 并删掉第二种。

有会话总线且 schema 存在时再写 GNOME：

```bash
gsettings set org.gnome.desktop.input-sources sources \
  "[('xkb', '$XKB'), ('ibus', '$ENGINE')]"
gsettings set org.gnome.system.locale region "$LOCALE"
gsettings set org.gnome.desktop.interface clock-format "$CLOCK"
gsettings set org.gnome.desktop.calendar week-start-day "$WEEKDAY"
```

天气地点只用地理查询返回的城市名和坐标。类型是 `(ssm(dd))`。写完必须读回；被拒绝就保持原值并报告：

```bash
gsettings set org.gnome.GWeather4 default-location \
  "('$CITY', '', @m(dd) ($LAT, $LON))"
```

顶栏天气键的类型是 `av`：

```bash
gsettings set org.gnome.shell.weather locations \
  "[<('$CITY', '', @m(dd) ($LAT, $LON))>]"
```

拒绝则留空，让它使用 `default-location`。`automatic-location` 保持 false。把 `org.gnome.clocks geolocation` 设为 false，`org.gnome.system.location enabled` 保持 false，避免下一次自动定位覆盖刚写上的城市。

`measurement` 为 `2` 时，温度 `fahrenheit`、距离 `miles`、风速 `mph`、气压 `inch-hg`。否则用 `centigrade`、`km`、`kph`、`hpa`。schema 不存在就跳过该项。

## 浏览器

仅当用户要求包括浏览器界面语言时执行。Chrome 已安装时，先备份再合并 `/etc/opt/chrome/policies/managed/proxy-region-locale.json`，不要覆盖其他策略：

```json
{"ApplicationLocaleValue": "en-US"}
```

`en_US.UTF-8` 对应 `en-US`；其他 locale 把下划线换成连字符并去掉 `.UTF-8`。Chrome 正在运行时不要改用户的 `Preferences`。策略在下次启动生效。Firefox 没有单独的语言锁定时跟随系统 locale，不要预先写 `intl.locale.requested`。

## NTP 与结束

用本机已安装的服务只读查询同步状态，例如 `timedatectl show-timesync` 或 `timedatectl status`。不更换 NTP 源。时间服务器的特殊地址规则见技能正文。

不要重启 `gdm`，也不要替用户杀掉浏览器。请图形用户注销再登录。结果里写明：新会话才会变成新的 `LANG`；核对过的 libc 输出；纸张是否改过；键盘是 `localectl` 改的还是直接改的文件；NTP 是否真的同步。
