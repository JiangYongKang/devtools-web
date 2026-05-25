### 任务目标
- 双模式补丁：RFC 6902 JSON Patch 与 RFC 7396 JSON Merge Patch  Tab 切换；支持对两份 JSON 文档生成 patch、对 patch 应用至源文档预览结果、以及「正向应用 + 逆操作草稿」说明（test 操作须预检失败则整批拒绝）。
- 冲突检测：应用前模拟执行并收集 `path missing`/`test mismatch`/`type conflict`；Merge Patch 与 Patch 对同一对文档的差异对比面板（并排 diff）；禁止静默丢弃未知 op。
- 交互与示例：内置「增删改 move/copy」与「Merge 嵌套对象覆盖」样例一键填充；patch 序列可编辑（JSON 数组）；结果区支持格式化/紧凑切换与复制下载。
- 健壮性：非法 patch JSON、非数组 patch、越界 index 须定位至 patch 条目序号；空文档与 `null` 根节点边界说明；大文档应用采用不可变结构或分步预览避免卡顿。
- 单测：覆盖 `add`/`remove`/`replace`/`move`/`copy`/`test`、Merge Patch 递归合并、`generatePatch`/`applyPatch` 往返一致性；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/json-patch-merge-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/json-patch-merge-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/json-patch-merge-workbench/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/json-patch-merge-workbench/` 目录内文件；不得修改通用 diff 或其它 JSON 任务目录。
### 验收标准
- 两种 patch 模式均可生成、应用、预检失败 rollback；冲突样例可演示；单测覆盖 RFC 6902 六 op 与 Merge 覆盖语义；示例按钮可用。
