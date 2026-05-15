### 任务目标
- 定义表单字段与 URL 查询参数的双向绑定契约：逻辑层导出「字段 schema」（类型、必填、默认值、同义 query 键名、序列化格式）、`formToQuery`/`queryToForm` 往返、`partialUpdate` 与脏检查；支持嵌套字段展平为 `user[name]` 风格 query（策略固定并单测）；非法 query 剔除并返回 `warnings` 与 `errorCode` 不混用。
- 与任务 060 对齐：复用或适配相同「点号路径」「数组编码」规则须在逻辑层集中为 `sharedEncoding` 模块（本任务目录内自包含，不得修改 `route-sync` 文件）；若规则与 060 子集等价，须在 DOC 写明差异表（如日期格式）。
- 演示页与示例：登录式伪表单（用户名、筛选 tags、页码）；一键「从当前 URL 恢复」「写入 URL（replace/push 切换）」「注入冲突键与重复数组」；展示防抖写入与「用户编辑中暂停 URL 回写」锁；提供与 HTTP 027 工具页字段形状对齐的示例 JSON（仅文档与演示数据，不 import 027 目录）。
- 校验与无障碍：同步校验错误映射到 `aria-invalid` 与 `aria-describedby` 的 id 列表（页面层）；异步校验（模拟 300ms）须可取消（`AbortController`）；提交按钮在「仅 query 变更未触发表单 dirty」时的启用规则页内说明。
- 边界：长 query 超过配置长度时拒绝写入并提示；`+` 与空格；`File`/`Blob` 字段禁止进入 query（显式拒绝 `errorCode`）；浏览器后退栈污染检测（连续 push 计数阈值提示）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/form-query-sync/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/form-query-sync/logic/`
- 测试文件夹：`devtools-web/src/platform/form-query-sync/__tests__/`
### API 信息
- 无 HTTP；异步校验演示使用 `Promise` 与计时器替身。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/form-query-sync/` 目录内文件；不得修改 `route-sync`、`http-request-playground` 等其它任务目录。
### 验收标准
- 任务目标五条均可逐条验收；单测覆盖往返、嵌套、数组、非法键、防抖合并、超长拒绝。
