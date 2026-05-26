### 任务目标
- 行协议解析：粘贴 InfluxDB Line Protocol 文本（单行或多行），拆分为 measurement、tag set、field set、timestamp；逐行校验语法并定位错误行列。
- 类型推断：field value 后缀（i/u/布尔/字符串）识别与统一类型标注；timestamp 精度推断（ns/us/ms/s）与 ISO 可读时间互转。
- 统计与导出：汇总 measurement 分布、tag key 频率 Top-N、field key 频率；导出为 JSON 数组或 CSV；空行与注释行（`#`）策略可配置。
- 示例：内置「单 measurement 多行」「多 tag 组合」「混精度 timestamp 错误」三组一键填充；大文件行数上限说明。
- 单测：覆盖单行 parse、tag/field 拆分、类型后缀、timestamp 精度转换；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/influxdb-line-protocol-parser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/influxdb-line-protocol-parser/logic/`
- 测试文件夹：`devtools-web/src/tools/influxdb-line-protocol-parser/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/influxdb-line-protocol-parser/` 目录内文件；不得修改 NDJSON 校验其它任务目录。
### 验收标准
- 逐行解析、类型推断、统计导出均可演示；单测覆盖 parse 与 timestamp；示例可用。
