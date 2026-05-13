### 任务目标
- 提供统一下载入口：从 `string`、`Blob`、`ArrayBuffer`、`ReadableStream`（若环境支持）生成对象 URL，自动在 `finally` 或超时后 `revokeObjectURL`；支持可选 UTF-8 BOM 前缀（CSV 场景）、`text/plain` 与 `application/json` 的 MIME 推断与覆盖。
- 文件名处理：逻辑层实现 Windows/macOS/Linux 保留字与非法字符剥离、首尾空格与点号修剪、最大长度截断（超出部分用稳定短哈希后缀拼接避免碰撞）、以及 RFC 5987 `filename*` 百分号编码辅助函数（供未来从 `Content-Disposition` 解析复用）；中文与 Emoji 文件名在演示页验证各浏览器行为表。
- 提供演示页与示例：小文本即时下载、大 `Blob` 分片合成下载（使用 `Blob` 数组与 `setTimeout` 分帧生成）、故意触发 `revoke` 过早与正常路径对照；支持「仅生成 `href` 由宿主打开」模式以服务 SSR 受限环境。
- 与任务 052 对齐：导出 `buildDownloadDescriptor(payload) -> { url, filename, mime, revoke }` 纯数据结构，页面负责创建 `<a download>` 或调用 `showSaveFilePicker`（若可用）并统一错误 `errorCode`；`showSaveFilePicker` 拒绝或 `AbortError` 不得记为致命错误。
- 边界：内存压力提示（`Blob` size 上界配置）；下载属性在 iOS Safari 的限制说明；禁止对用户提供的路径字符串做 shell 拼接（本任务无后端，但须在注释中强调防注入习惯）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/download-helper/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/download-helper/logic/`
- 测试文件夹：`devtools-web/src/platform/download-helper/__tests__/`
### API 信息
- 无 HTTP；若从 `fetch` 响应头解析文件名，逻辑层提供纯函数 `parseContentDisposition(header: string)`，单测覆盖多段 `filename*` 与编码样例。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/download-helper/` 目录内文件；不得修改其他任务工具目录。
### 验收标准
- 任务目标五条均可演示；`revoke` 与内存提示路径可复现。
- 单测覆盖文件名净化、`Content-Disposition` 解析、MIME 推断、哈希后缀稳定性。
