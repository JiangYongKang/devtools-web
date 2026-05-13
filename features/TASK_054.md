### 任务目标
- 定义站点级偏好存储契约：键名命名空间（`devtools:` 前缀 + 领域 + 版本）、`localStorage` 与 `sessionStorage` 选用矩阵（易失草稿 vs 长期偏好）、写入合并策略（浅合并 vs 深合并可配置）、以及「导出/导入 JSON 包」带版本与校验和字段（逻辑层实现序列化/反序列化与迁移管道）。
- 实现带版本的模式迁移：`v1 -> v2` 示例迁移函数须幂等，失败时保留上一份快照并暴露 `errorCode`；支持 `QuotaExceededError` 检测后的 LRU 键驱逐策略（仅驱逐本命名空间内低优先级键，顺序由逻辑层决定）与用户可见提示文案。
- 提供演示页与示例：一键生成「接近配额的大对象」模拟（不真写满磁盘，采用重复键与体积计数器替身）、一键导入损坏 JSON 与半合法 JSON 观察恢复路径；展示当前存储占用估算（`Blob` 字节长度近似）与「重置本域」危险操作。
- 与任务 052/060 的衔接：导出偏好包内可包含「布局拓扑」「侧栏折叠」等外键字段，但解析时须忽略未知字段并记录在诊断数组中；禁止跨站脚本通过导入包注入可执行内容（纯数据校验 + `structuredClone` 或 JSON 白名单）。
- 边界：隐私模式或第三方 Cookie 隔离导致 `localStorage` 不可用时完整降级到内存存储并显式提示；SSR 环境无 `window` 时所有 API 须 no-op 或抛出统一 `errorCode` 由宿主处理。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/preference-persistence/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/preference-persistence/logic/`
- 测试文件夹：`devtools-web/src/platform/preference-persistence/__tests__/`
### API 信息
- 无 HTTP；若未来同步到后端，仅在 DOC 描述加密与传输责任边界，本任务不实现网络层。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/preference-persistence/` 目录内文件；不得修改其他任务工具目录；不得读写其他命名空间键（除演示页显式展示的测试键外）以免污染宿主应用。
### 验收标准
- 任务目标五条均可通过演示页与单测验证；迁移幂等与配额错误路径有断言。
- 单测使用内存 `Storage` 替身覆盖：写入、读取、迁移、LRU、损坏导入、未知字段剥离。
