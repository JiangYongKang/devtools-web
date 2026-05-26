### 任务目标
- 规则解析：粘贴 Prometheus 告警/录制规则 YAML（`groups[].rules[]`），提取 `alert`/`record`、`expr`、`for`、`labels`、`annotations`；YAML 错误定位至行列。
- Expr 检查：对 PromQL 子集做括号匹配、函数名白名单、字符串引号配对；常见错误（未闭合聚合、非法字符）行列提示；不连接真实 Prometheus。
- 标签模板：预览 `labels`/`annotations` 中 `{{ $labels.xxx }}`/`{{ $value }}` 占位符；提供模拟 labelset 输入，输出渲染后字符串。
- Firing 样例：用户输入指标样本值（简化的 labelset + value），演示规则是否「触发」的布尔结果与说明（基于 expr 的最小求值器，支持 `>`/`<`、`and`、`rate` 等教学子集并标注未实现函数）。
- 示例：内置「高 CPU 告警」「录制规则」「带 for 的延迟触发」三组一键填充；单测覆盖 YAML 提取、expr 校验、模板渲染、样例求值；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/prometheus-alert-rules-validator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/prometheus-alert-rules-validator/logic/`
- 测试文件夹：`devtools-web/src/tools/prometheus-alert-rules-validator/__tests__/`
### API 信息
- 无外部 API；不对接 Prometheus HTTP API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/prometheus-alert-rules-validator/` 目录内文件；不得修改 YAML 校验其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 规则解析、expr 检查、标签模板预览、firing 样例均可演示；单测覆盖解析与 expr 校验；示例可用。
