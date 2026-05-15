### 任务目标
- 与实际上传链路解耦的「图片工作台」：本地 `File`/`Blob`/Data URL 载入后提供 GPU 友好缩放（滚轮/捏合/键盘步进）、平移边界钳制、像素网格对齐开关、EXIF 方向元数据（若可读）与「重置视图」；大图采用 `createImageBitmap` 或离屏策略并给出内存预算与降级路径说明。
- 水印参数预览（不落服务端）：可配置文本水印（内容、字体族、字号、颜色含透明度、旋转角、平铺间距、抗锯齿开关）、图片角标水印（九宫格锚点、边距、最大宽高比缩放）；逻辑层输出「合成参数摘要」与 `OffscreenCanvas`/`canvas` 合成预览帧；支持对比「原图 / 叠加水印」分屏与导出 PNG（单次下载，不上传）。
- 示例与可复现：至少三组示例按钮（小图标、宽幅照片、透明 PNG）；示例须覆盖「水印超出画布」「极小字号」「高 DPI `devicePixelRatio`」边界；所有异步与合成路径方法带中文注释。
- 安全与展示：对用户提供的图片文件名与文本水印做 XSS 安全展示策略；禁止自动请求外网图片 URL（若提供 URL 输入则仅允许 `blob:`/`data:` 或显式「用户粘贴」路径并提示风险）；合成失败时结构化错误码。
- 纯逻辑与测试：实现 `buildWatermarkPlan(config, imageMeta) -> { layers, warnings, memoryEstimate }`、`rasterizePreview(plan, signal)` 等可单测单元；单测覆盖角度归一、平铺奇偶行偏移、空字符串水印、0 尺寸图片早退。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/image-preview-watermark-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/image-preview-watermark-workbench/logic/`
- 测试文件夹：`devtools-web/src/platform/image-preview-watermark-workbench/__tests__/`
### API 信息
- 无 HTTP；不得将用户图片发往远端。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/image-preview-watermark-workbench/` 目录内文件；不得修改其它任务编号目录下的实现或全局路由注册（集成方式仅在 DOC 说明）。
### 验收标准
- 任务目标五条均可逐条演示或单测核对；页面可完成缩放平移、参数调参、预览与导出；单测覆盖计划构建、内存估算边界、至少一种合成失败码；示例按钮一键复现三种素材形态。
