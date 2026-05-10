### 任务目标

1. 提供站内「Unix 时间戳」与「人类可读日期时间」在指定常用时区下的互转能力，用户可输入一侧数据并得到另一侧结果。
2. 通过调用后端时间戳转换 REST 接口完成核心换算，页面负责参数组织、加载与错误呈现、结果展示与复制。
3. 交互信息与验收口径与仓库 `FEATURE.md` 中任务 001 一致。

### 任务要求

1. 页面级能力至少包含：时间戳输入、日期时间字符串输入、目标时区选择（IANA 标识，可参考常见城市/地区与本站文案习惯展示）、秒级/毫秒级粒度选择、与接口约定一致的 `formatPattern`、触发「时间戳→日期时间」与「日期时间→时间戳」两种转换、对主要结果提供一键复制。
2. 所有换算请求经统一 HTTP 出口访问后端，基础路径为 `/api/timestamp`。不得在前端实现与后端规则冲突的换算作为界面上的「权威结果」；若存在纯本地推算，仅可作为辅助对照，且不替代接口返回。
3. 请求与响应须符合下列约定。  

   **统一响应包络**（业务失败时多为 HTTP 400，仍使用同一 JSON 形状，`success` 为 false）：  
   - `success`（布尔）  
   - `data`（成功时为负载；失败时常为 null）  
   - `errorCode`（失败时字符串，如 `NULL_INPUT`、`INVALID_TIMEZONE`、`INVALID_FORMAT_PATTERN`、`PARSE_FAILED`、`INVALID_PARAMETER`）  
   - `errorMessage`（失败时人类可读说明）  

   **`POST /api/timestamp/toDateTime`**  
   - 请求体 JSON：`timestamp`（必填，数值）、`granularity`（可选，缺省按秒级处理，取值 `SECONDS` / `MILLISECONDS`）、`timezoneId`（必填）、`formatPattern`（可选，示例展示模式：`YYYY-mm-dd HH:mm:ss`、`YYYY/mm/dd HH:mm:ss`；实际服务可能还支持更多枚举名或模式字符串，联调以接口校验与错误信息为准）。  
   - 成功时 `data` 对象字段：`formattedDateTime`、`timezoneId`、`formatPattern`、`year`、`month`、`day`、`hour`、`minute`、`second`。  

   **`POST /api/timestamp/toTimestamp`**  
   - 请求体 JSON：`dateTimeString`（必填）、`timezoneId`（必填）、`formatPattern`（可选）、`granularity`（可选，同上）。  
   - 成功时 `data` 对象字段：`timestamp`（数值）、`granularity`（与请求同枚举语义）、`originalDateTimeString`、`timezoneId`。  

   **`POST /api/timestamp/batch/toDateTime`**、**`POST /api/timestamp/batch/toTimestamp`**（可选接入）  
   - 请求体为 JSON 数组；每项字段与对应单项接口相同，且可带 `failFast`（布尔）。批量失败策略：取**数组第一项**的 `failFast`；未给出则按「继续处理全部项、逐条标记成败」处理。  
   - 成功时 `data` 对象建议按下列结构解析：`success`（布尔）、`totalCount`、`successCount`、`failureCount`、`items`（数组）。`items` 每一项含：`index`（整数）、`success`（布尔）、`result`（成功时与单项成功 `data` 同形）、`errorCode` 与 `errorMessage`（失败时）。若本迭代不做批量 UI，可不调用，但不得编造与上述不符的请求体。  
4. 错误处理：根据 `success` 与 `errorCode`、`errorMessage` 向用户给出可读说明；上述错误码及同类接口错误须在提示层有明确反馈。  
5. 展示安全：用户输入与接口返回的错误文案以安全方式展示，避免不安全 HTML 注入。

### 任务约束

1. 样式、路由挂载方式与站内现有 devtools-web 约定一致；改动范围以完成本工具页及相关请求封装调用为限。
2. `formatPattern` 与 `granularity` 的合法取值须与运行中后端接口一致，以联调与接口返回的校验错误为准。
3. 需考虑跨域（CORS）与 API 基址：开发/生产环境须有可操作的配置方式，并在验收环境下能稳定访问约定后端。
4. 时区建议使用完整 IANA 标识，不推荐三字母缩写；夏令时、歧义时刻与极大时间范围等以后端日期时间实现为准，界面可对边缘情况作简要说明。

### 交付产物

1. 可用的「时间戳⇄可读时间」工具页（或等价导航入口），满足输入、时区与格式选项、双向转换与复制。
2. 与 `/api/timestamp` 对齐的请求构造与响应解析逻辑（含错误路径），放置在项目约定的统一 HTTP 出口或模块中，避免散落在页面内的重复拼装。
3. 与同任务编号配套的实现与验证说明（路径按本仓库前端文档约定），记录联调地址、环境与验证步骤。

### 注释规范

1. 新增或修改的非显而易见逻辑须有简洁中文注释（业务含义、边界与为何走后端）。
2. 与用户可见文案、错误码映射相关的常量或映射表建议注明数据来源（如对应后端错误码）。

### 验收标准

1. 任选一组参数验证 `toDateTime`：例如 `timestamp` 为 `1609459200`、`granularity` 为 `SECONDS`、`timezoneId` 为 `UTC`、`formatPattern` 为 `YYYY-mm-dd HH:mm:ss`，成功时 `data.formattedDateTime` 应为 `2021-01-01 00:00:00`，且分量字段与该字符串一致。
2. 反向：用上一步得到的等价日期时间在相同时区与格式下调用 `toTimestamp`，在秒级粒度下 `data.timestamp` 应与原始输入一致。
3. 无效时区、空必填字段、非法格式模式下，前端能展示失败包络中的 `errorMessage`（及必要时 `errorCode`），不出现未处理崩溃或空白错误。
4. 用户可复制主要输出（格式化日期时间字符串或时间戳文本），并在常见浏览器下有一次成功反馈或明确失败原因（如权限类降级说明若存在）。
5. 页面状态可理解：加载中、成功、失败区分明确；大数字时间戳输入不与后端 `long` 语义冲突（避免错误截断或精度误解）。
