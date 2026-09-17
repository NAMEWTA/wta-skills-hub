# 验收

## 导出验收

- [ ] 目录名符合 `grok-bot-team-YYYY-MM-DD` 或 `...-HHMM`
- [ ] 存在 COMPLETED.md，不存在 IN_PROGRESS.md
- [ ] ROSTER 行数 = bots/ 下 slug 数
- [ ] 每个 slug 都有 PROFILE.md
- [ ] 每个 PROFILE 的 description 不是空的、不是「同上」
- [ ] 每个 slug 都有 GAPS.md（可以为「无」）
- [ ] 根目录有 DROP-LIST.md
- [ ] SANITIZER 已跑
- [ ] MANIFEST 的 complete=missing 项都能在 GAPS 找到解释

## 恢复验收

| slug | PROFILE 逐字 | skills 已启用 | 已进群 | 记忆三条复述 | 对话已喂 | routine 暂停 | 备注 |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

全表填完且无 UNVERIFIED，才能对用户说「重建完成，等待你决定是否启用 routine」。

## DROP LIST 固定五条（恢复结束必须再输出一次）

1. 插件登录态需要人在 Settings → Plugins 重连
2. 浏览器 cookie / 已登录网站不会回来
3. 官方聊天时间线不会回来，只有 conversations/*.md 参考件
4. 快照 GAPS 里写明缺失的记忆或对话不会凭空出现
5. 云电脑上当时临时安装、未写入 workspace-map 的软件不会回来
