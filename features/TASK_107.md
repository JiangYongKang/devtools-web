### 任务目标
- 逐行校验：NDJSON/JSON Lines 输入，每行独立 `JSON.parse`；汇总总行数、合法行数、失败行号与错误消息列表；点击失败行滚动定位并高亮该行。
- 流式分片：大文本按 configurable chunk（如 512KB）分片逐行处理，报告进度条与可取消；Worker 可选路径说明主线程回退策略。
- 抽样统计：对合法行可选 JSON Schema（简化）或键路径频率 Top-N 统计；数值字段 min/max/avg 摘要（表驱动，仅当用户启用统计且抽样行数上限内）。
- 示例：内置「全部合法」「中间一行损坏」「空行与注释行策略（默认空行跳过、# 开头可选跳过）」三组一键填充；合法行合并导出为标准 JSON 数组下载。
- 单测：覆盖分片边界（行被截断）、错误行号、空行策略、统计抽样上限；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/ndjson-line-validator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/ndjson-line-validator/logic/`
- 测试文件夹：`devtools-web/src/tools/ndjson-line-validator/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/ndjson-line-validator/` 目录内文件；不得修改 JSON 校验其它任务目录。
### 验收标准
- 逐行校验、失败定位、分片进度、合并导出均可演示；单测覆盖跨 chunk 断行；示例可用。
