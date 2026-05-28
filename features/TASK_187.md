### 任务目标
- 日历模型：支持 ISO 国家工作日规则（周一至五）+ 用户 JSON 节假日表（固定日期与规则如「农历」仅静态表，不实现天文农历算法则须在 UI 声明）；排除周末与假日。
- 日期运算：给定起始 UTC/IANA 时区时刻，加 N 个工作日/自然日；向前/向后；cutoff 时间（如 17:00 前算当日）可配置。
- DST 边界：使用 `Temporal` 或 `Intl`/手工表处理 America/New_York、Europe/London 等示例区的 DST 跳变；展示「不存在的时间」与「重复一小时」警告。
- SLA 计算：输入 SLA 小时数/工作日截止，输出截止时刻；多里程碑列表；与任务 001 时间工具互补不修改其目录。
- 示例：内置「中国法定假日样表」「US DST 跳变」「跨月工作日加 10 天」三组；单测覆盖工作日滚动、DST 样例、cutoff；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/business-date-rules-engine/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/business-date-rules-engine/logic/`
- 测试文件夹：`devtools-web/src/tools/business-date-rules-engine/__tests__/`
### API 信息
- 无外部 API；时区数据内置 IANA 子集或浏览器 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/business-date-rules-engine/` 目录内文件；不得修改日历控件（任务 090）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 工作日运算、假日跳过、DST 提示、SLA 截止均可演示；单测含 DST 边界用例；示例可用。
