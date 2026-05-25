### 任务目标
- HAR 解析：粘贴或上传 HAR 1.2/1.3 JSON，校验 `log.entries` 结构；解析失败定位 JSON 路径与行列；大文件分片读取或条目数上限说明。
- 瀑布与时序：按 `startedDateTime` 与 `time` 绘制请求瀑布条（相对页面起始时间）；支持按域名/类型/状态码筛选；点击条目展开 request/response 摘要（method、url、status、mimeType、size）。
- 统计面板：状态码分布饼图或表格、总传输体积、DNS/Connect/Wait/Receive 各阶段均值；慢请求 Top-N 排行（可配置 N 与阈值 ms）；按域名聚合请求数与耗时。
- 导出与复制：选中条目生成 cURL 命令（含 headers、body、--compressed 等常用选项）；批量导出 cURL 为文本下载；HAR 条目 JSON 片段复制。
- 单测：覆盖 HAR 结构校验、瀑布时间轴计算、慢请求排序、cURL 生成边界（无 body、multipart 提示）；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/har-import-analyzer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/har-import-analyzer/logic/`
- 测试文件夹：`devtools-web/src/tools/har-import-analyzer/__tests__/`
### API 信息
- 无外部 API；仅解析用户提供的 HAR 文本或本地文件，禁止自动抓取目标站点。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/har-import-analyzer/` 目录内文件；不得修改 HTTP 请求 Playground 或其它网络工具任务目录。
### 验收标准
- HAR 导入、瀑布图、状态码统计、慢请求排行与 cURL 导出均可演示；单测覆盖时序与 cURL 生成；示例 HAR 一键填充可用。
