### 任务目标
1. 提供二维码内容输入与参数配置界面，支持文本或 URL 生成二维码图像。
2. 在前端本地实现图像生成与元数据计算流程，支持图像预览/下载并展示尺寸、纠错级别和摘要信息。
3. 对参数冲突和输入越界等场景做清晰错误反馈，确保用户可快速修正请求。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/task015/`（内容输入、参数区、图片预览区、元数据区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/task015/logic/`（参数组装、元数据映射、错误映射）。
- 测试文件夹：`devtools-web/src/tools/task015/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 输入参数：`content`、`errorLevel`、`margin`、`moduleSize`、`nominalSizeMm`、`outputFormat`。
- 图像元信息：`contentDigest`、`errorLevel`、`margin`、`moduleSize`、`pixelWidth`、`pixelHeight`、`mimeType`、`outputBytes`。
- 错误约定：处理并展示 `NULL_INPUT`、`CONTENT_TOO_SHORT`、`CONTENT_TOO_LONG`、`INVALID_MARGIN`、`INVALID_MODULE_SIZE`、`INVALID_NOMINAL_SIZE`、`INVALID_FORMAT`、`OPTION_CONFLICT`、`OUTPUT_TOO_LARGE`、`ENCODE_FAILED`、`INVALID_PARAMETER`。
### 任务约束
- 当前任务只允许读取和修改 `task015` 目录下文件，不可读取、不可修改其他任务编号目录。
- 图像下载与预览逻辑归页面层，参数校验与字段解释归纯逻辑层。
### 验收标准
- 可生成并预览二维码图像，能展示关键元数据。
- 冲突参数（如 `moduleSize` 与 `nominalSizeMm` 同时传入）有明确错误反馈。
- 纯 JS 函数单测通过，覆盖参数规则与元数据映射。
