# macOS 区域

这些步骤在 macOS 26.6.2 上核对过。更早的系统设置路径可能仍叫「系统偏好设置」，命令以本机 `systemsetup` 和 `defaults` 的读回为准。

管理员命令需要密码。用一次授权完成全部需要 root 的写入；失败就停，不要反复重试，也不要关闭 SIP。

## 回滚快照

至少保存：

- 当前用户 `defaults export -g`，以及 `/Library/Preferences/.GlobalPreferences.plist`
- `/Library/Preferences/com.apple.timezone.auto.plist`
- 读得到时，`/private/var/db/timed/Library/Preferences/com.apple.timed.plist`
- `readlink /etc/localtime`，`systemsetup -gettimezone`，`systemsetup -getusingnetworktime`，`systemsetup -getnetworktimeserver`
- `com.apple.HIToolbox` 的 `AppleEnabledInputSources` 和 `AppleSelectedInputSources`
- 本轮会改的日历偏好、Chrome `Preferences`、听写偏好的原文件

## 时区

IANA 名称必须已存在于 `/var/db/timezone/zoneinfo`，例如纽约是 `America/New_York`。

先关闭自动时区，否则定位会把时区改回去：

```bash
sudo defaults write /Library/Preferences/com.apple.timezone.auto.plist Active -bool false
```

若 timed 偏好里已有 `TMAutomaticTimeZoneEnabled`，把它设为 false。不要改 `TMAutomaticTimeOnlyEnabled`，那是自动对时。

```bash
sudo systemsetup -settimezone America/New_York
```

这条命令可能向 stderr 打印 `Error:-99`，同时退出码为 0。以 `systemsetup -gettimezone` 和 `readlink /etc/localtime` 判断是否成功。

不手改 `com.apple.preferences.timezone.selected_city` 里的 `AppleMapID`，它是不透明值。`com.apple.TimeZonePref.Last_Selected_City` 自 10.6 起废弃，不能用它判断当前时区。

日历偏好里若有 `lastViewsTimeZone`，改成同一个 IANA 名称。不修改日历事件。

## 语言和区域

仅修改时区时跳过本节。美国英语写：

- 用户域和 `/Library/Preferences/.GlobalPreferences` 的 `AppleLanguages`：`(en-US, …原有其他语言)`
- `AppleLocale`：`en_US`（下划线字符串，不要写成数组）
- `Country`：`US`
- `AppleMeasurementUnits`：`Inches`
- `AppleMetricUnits`：false
- `AppleTemperatureUnit`：`Fahrenheit`

```bash
defaults write -g AppleLanguages -array en-US zh-Hans-CN
defaults write -g AppleLocale -string en_US
defaults write -g Country -string US
defaults write -g AppleMeasurementUnits -string Inches
defaults write -g AppleMetricUnits -bool false
defaults write -g AppleTemperatureUnit -string Fahrenheit
```

登录窗口用同一组键写 `/Library/Preferences/.GlobalPreferences`。已有的 `zh-Hans-CN` 只是示例；实际把目标语言放第一，其余原样保留。

不要用 `languagesetup`。它会把系统语言收成一种，丢掉列表里的其他语言。

不要另写 `AppleFirstWeekday` 或 `AppleICUForce24HourTime`，除非用户指定了和区域默认不同的值。`en_US` 的星期从 Sunday 开始。菜单栏 12 小时由区域默认和 `com.apple.menuextra.clock` 的 `ShowAMPM` 决定。macOS 的 libc 对 `en_US` 报告 `t_fmt=%H:%M:%S`，这不是把菜单栏改成 24 小时的理由。

其他国家不要套用上面的美国度量。先确定 BCP-47 语言标签和 `AppleLocale`，度量与温度跟该区域的系统默认，读回后再报告。

听写若要跟着界面语言改，把 `DictationIMPreferredLanguageIdentifiers` 的目标语言放第一，原语言留在后面。输入源不要删。美式布局的标识是 `com.apple.keylayout.US`（ABC）。已有的拼音或其他输入法保持启用。

## 浏览器

仅当用户要求包括浏览器语言，且 Chrome 没有运行时，改当前配置文件的 `Default/Preferences`：

- `intl.accept_languages`
- `intl.selected_languages`

目标语言放前面，原来的语言留在后面，例如 `en-US,zh-CN`。用精确替换，不要整文件重排。不写 Linux 的 `/etc/opt/chrome`。不改 Apple ID 或 App Store 国家。

## NTP 与结束

只读 `systemsetup -getusingnetworktime` 和 `-getnetworktimeserver`。不更换服务器，也不执行 `systemsetup -settime`。`sntp` 只说明某一次探测，不能单独证明系统是否在同步。

用 `en_US.UTF-8` 核对样例时应看到 `09/29/2026` 这种月/日/年、`1,234.56` 和 `$1,234.56`。界面菜单要等用户注销再登录才全部切换。不要重启，也不要结束浏览器。
