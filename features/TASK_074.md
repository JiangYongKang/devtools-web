### 任务目标
- 表格导入「诊断级」预览 UI：支持粘贴 TSV/CSV 与拖拽 `.csv` 文件（纯文本解析路径必须存在）；可选扩展 `.xlsx` 通过惰性加载社区库（若引入须在 DOC 说明 bundle 影响），未加载库时给出明确降级卡片；解析结果为行对象数组 + 列 schema（推断 `string|number|boolean|date?`）并展示前 N 行预览（N 可配，默认 50）。
- 行级错误列表：逻辑层输出 `{ rowIndex, columnKey, code, message, raw }[]`，覆盖列数不一致、RFC 4180 引号转义错误、非法 UTF-8 替换字符、数字列溢出、重复主键列（用户可选指定 key 列）、空文件、仅表头；错误表支持按列/码过滤、导出为 CSV 诊断文件；与「成功行计数 / 跳过行计数」摘要联动。
- 编码与分隔符探测：实现 BOM 剥离、分隔符投票（`,`/`;`/`\t`）、小数点区域启发式（`,` 千分位 vs `.` 小数）并在 UI 展示置信度条；提供示例按钮：标准 CSV、欧洲小数 CSV、含坏行的混合样例。
- 大文件策略：文件字节上界与行扫描上界在逻辑层集中配置，超过阈值时切换为「仅统计 + 抽样预览」模式并在 UI 明示；使用 `requestIdleCallback` 或分帧解析避免长任务卡死；取消令牌贯穿解析 API。
- 边界：同步剪贴板读取失败走手动粘贴区；拖拽目录拒绝；无障碍：预览表 `caption`、错误列表 `aria-sort`；无跨任务写其它目录。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/tabular-import-diagnostics/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/tabular-import-diagnostics/logic/`
- 测试文件夹：`devtools-web/src/platform/tabular-import-diagnostics/__tests__/`
### API 信息
- 无 HTTP；若未来对接服务端校验，仅在本页保留 `POST /validate` 形状说明占位，不默认实现。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/tabular-import-diagnostics/` 目录内文件；不得修改任务 037 等既有 CSV 工具目录代码；可复用思路须在 DOC 说明，物理拷贝仅限本目录。
### 验收标准
- 任务目标五条均可演示；单测覆盖引号转义、BOM、分隔符推断、行级错误码全集、阈值抽样模式开关；示例按钮三种样例可一键加载。
