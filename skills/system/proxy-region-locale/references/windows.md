# Windows 区域

这些命令来自 Microsoft 对 `tzutil`、时区自动设置和语言 PowerShell 的文档，没有在编写这份参考的 Mac 上执行过。到 Windows 上先读回，再改，并用该机的列表核对 ID。

用管理员 PowerShell。授权失败就停，不要反复弹窗。

## 回滚快照

保存本轮会改的值，而不是整个注册表：

- `tzutil /g` 与 `Get-TimeZone | Format-List Id,DisplayName,SupportsDaylightSavingTime`
- `HKLM\SYSTEM\CurrentControlSet\Services\tzautoupdate` 的 `Start`
- `Get-WinUserLanguageList | ConvertTo-Json -Depth 6`
- `Get-Culture`、`Get-WinSystemLocale`、`Get-WinHomeLocation`
- 本轮准备修改的 `HKCU\Control Panel\International` 值
- 若会改浏览器语言，该偏好文件的原内容

## 时区

Windows 时区 ID 不是 IANA 名称。纽约是 `Eastern Standard Time`，必须出现在 `tzutil /l` 或 `Get-TimeZone -ListAvailable` 里才可以写。不要把 `America/New_York` 传给 `tzutil`。

```powershell
tzutil /s "Eastern Standard Time"
```

或 `Set-TimeZone -Id "Eastern Standard Time"`。不要加 `_dstoff`，那个后缀会关闭夏令时。

要固定在所选时区时，把自动时区关掉。Microsoft 的说明是：`tzautoupdate` 的 `Start` 为 `3` 表示自动时区开，`4` 表示关。

```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\tzautoupdate" -Name Start -Value 4
```

不要改 `HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Parameters` 的 `Type`。那是自动对时，不是时区。也不要停用 Time Synchronization 计划任务。

读回 `tzutil /g`。显示名可以是「东部时间」，ID 仍应是 `Eastern Standard Time`。

## 语言和区域

仅修改时区时跳过本节。先读列表。目标语言已存在时，把那个对象移到第一位，保留它的 `InputMethodTips`。不存在时，用 `New-WinUserLanguageList` 得到新的第一项，再按原顺序加回其他语言。不要写成只有一种语言的新列表。

```powershell
$Existing = @(Get-WinUserLanguageList)
$List = New-WinUserLanguageList -Language "en-US"
$Current = $Existing | Where-Object LanguageTag -eq "en-US" | Select-Object -First 1
if ($Current) { $List[0] = $Current }
foreach ($Lang in $Existing) {
  if ($Lang.LanguageTag -ne "en-US") { [void]$List.Add($Lang) }
}
Set-WinUserLanguageList -LanguageList $List -Force
Set-Culture en-US
```

写完读回 `Get-WinUserLanguageList`。输入法提示变空时，从回滚恢复，不要再猜一个键盘布局。

`Set-WinSystemLocale en-US` 写入系统区域，新登录后才完整生效；不要为此重启。

美国的 Home Location GeoID 是 244：

```powershell
Set-WinHomeLocation -GeoId 244
```

这不是 Microsoft 账户国家，也不是应用商店区域。后两者不改。其他国家不要写 244；先查该系统接受的 GeoID。

`Set-Culture` 之后读 `HKCU\Control Panel\International`。短日期、时间和纸张若已经是 `en-US` 的值，就不要再按记忆覆盖。只有用户指定了某个格式、且当前值不同时，才改对应的值，并在回滚里留下原值。

## 浏览器与结束

浏览器语言的条件见技能正文：用户要求包含它，且进程没在运行。Chrome 的用户语言在该配置文件的 Preferences 里，改 `intl.accept_languages` 和 `intl.selected_languages`，目标语言在前，原语言保留。不要整文件重排。

用 `w32tm /query /status` 只读报告时间服务。不执行 `w32tm /config`，也不改 NTP 服务器。

新登录前，不宣称开始菜单和已打开的程序已经换成新语言。不要重启。
