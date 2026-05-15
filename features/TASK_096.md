### 任务目标
- 设置快照格式：定义带 `schemaVersion`、`exportedAt`、`checksum`（对脱敏 payload 的哈希）与 `entries` 树的应用偏好导出 JSON；支持 gzip 压缩为 Blob 下载与拖拽导入解析。
- 版本迁移：实现 `migrateV1ToV2(snapshot)` 等纯函数链接；未知版本拒绝并给出升级指引；字段重命名与默认值填充表；破坏性变更须 `breaking[]` 列表展示。
- 校验：JSON Schema（手写轻量校验器或 AJV 若项目已有依赖则复用，否则手写）与最大深度/键数防爆；导入预览 diff（新增/删除/变更键路径）。
- UI：导出前「敏感键」勾选脱敏；导入后「合并 vs 覆盖」策略；示例文件一键下载与破坏 checksum 的负例。
- 单测：迁移链、校验失败路径、diff 算法、checksum 稳定性；所有方法中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/settings-snapshot-migration-ui/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/settings-snapshot-migration-ui/logic/`
- 测试文件夹：`devtools-web/src/platform/settings-snapshot-migration-ui/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/settings-snapshot-migration-ui/` 目录内文件；不得修改全局设置键名其它任务目录。
### 验收标准
- 导出/导入/迁移/校验四条主路径可演示；单测覆盖版本拒绝与迁移；diff 与脱敏在 UI 可见。
