### 任务目标
- 实现浏览器侧「大对象导出」编排器：从内存中的 `Blob`/`ReadableStream`/`string` 三源统一抽象为 `ExportSource`；支持按字节窗口分块（可配 `chunkSize`）、`Content-Disposition` 文件名消毒（去路径、非法字符替换）、MIME 类型显式选择与「下载失败重试一次」策略；主线程使用 `URL.createObjectURL` 分片合并或 `streamSaver` 风格占位（若未引入第三方则实现「多 Blob 顺序触发下载」降级路径并在 UI 标注浏览器限制）。
- 进度与取消：`ReadableStream` 路径须基于 `AbortController` 传播取消，UI 展示百分比、已写字节、ETA 粗略估计（基于最近窗口吞吐）；暂停/继续若不可实现则禁用按钮并解释；完成后释放 object URL 与 `revokeObjectURL` 防泄漏单测。
- 示例与压测开关：一键生成可配置大小伪文本（使用重复模式压缩内存占用并声明「非加密随机」）；提供「模拟慢速网络」节流器仅作用于导出管道（`delayMs` 可配）；展示 `QuotaExceeded` 与「用户取消下载」分支文案。
- 纯逻辑层：导出 `planChunkedDownload(options)` 返回异步迭代器或事件 emitter 类型契约（中文 JSDoc）；包含 `maxTotalBytes` 预算与 `onProgress` 回调节流（`requestAnimationFrame` 合并）；对 Safari 与 Chromium 差异列对照表（仅文档区 + 特性探测布尔值）。
- 边界：同步字符串超过 `maxTotalBytes` 拒绝并给 `errorCode`；`beforeunload` 在导出进行中提示（与任务 094 概念对齐但实现限定本目录）；SSR 不调用 Blob API；无障碍：进度条 `aria-valuenow` 更新频率受节流约束。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/chunked-download-orchestrator/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/chunked-download-orchestrator/logic/`
- 测试文件夹：`devtools-web/src/platform/chunked-download-orchestrator/__tests__/`
### API 信息
- 无 HTTP；不触发真实远端下载。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/chunked-download-orchestrator/` 目录内文件；不得修改任务 056 等其它目录中的下载辅助实现（若需对齐行为，在 DOC 记录差异，由集成方后续统一）。
### 验收标准
- 任务目标五条均可核对；单测覆盖分块边界、取消后资源释放、文件名消毒表、`maxTotalBytes` 拒绝；页面示例可展示进度条走动与取消恢复初始态。
