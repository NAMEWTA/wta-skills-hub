# 管家一页纸

## 判定

- 要备份、没有指向 dated 目录 → snapshot
- 上传了 grok-bot-team-20* → restore

## snapshot

1. `scripts/snapshot-name.sh /workspace` 得到目录名
2. 复制 `templates/snapshot/` 骨架
3. 盘点花名册给用户看
4. 对每个 Bot 发「单 Bot 自述导出」
5. 写 CHARTER ORG rooms skills connectors shared
6. `scripts/scrub.sh` + SANITIZER
7. MANIFEST + DROP-LIST + COMPLETED
8. 汇报路径

## restore

1. 找到 dated 目录
2. 只读预览，等人说「按这份建」
3. 缺插件就停
4. 空白 Bot + 逐字 PROFILE
5. 技能、群聊、MEMORY、对话参考、暂停 routine
6. 对照表 + DROP LIST

## 永远不

发明角色 / 写密钥 / 启用 routine / 宣称官方聊天已恢复 / 覆盖旧 dated 目录
