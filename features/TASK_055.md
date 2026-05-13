### 任务目标
- 封装剪贴板读写：`navigator.clipboard.readText` / `writeText` 与 `document.execCommand('copy')` 降级链；权限模型须区分安全上下文（`https`/`localhost`）与非安全上下文的明确 `errorCode`；对 `NotAllowedError`、`SecurityError`、Safari 部分版本缺 API 等情况给出可复现的用户文案与「手动复制」弹层兜底。
- 支持富文本片段：`ClipboardItem` 写入 `text/html` + `text/plain`（HTML 须先经逻辑层白名单消毒函数处理，单测覆盖典型 XSS 向量）；读取时若存在 HTML，提供「仅文本」「原始 HTML 开发者预览（转义展示）」二态切换，默认安全侧为纯文本。
- 提供演示页与示例：一键写入多行表格 TSV、一键写入「含制表符与换行的大段日志」、一键模拟权限拒绝（通过可切换的替身对象注入）；展示各浏览器能力矩阵（运行特性探测并缓存结果，缓存 TTL 可配置）。
- 与任务 056 协作：从剪贴板读取的图片 `ClipboardItem` types 若包含 `image/png`，生成 `Blob` 句柄与建议文件名（逻辑层导出 MIME 到扩展名映射），页面仅负责展示体积与哈希预览占位，不上传。
- 边界：大文本写入前检测粗略字节长度并警告；防抖连续写入；禁止在无用户手势触发的路径静默读取剪贴板（须在 API 层断言调用栈或要求显式 `userGestureToken` 参数由页面传入）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/clipboard-bridge/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/clipboard-bridge/logic/`
- 测试文件夹：`devtools-web/src/platform/clipboard-bridge/__tests__/`
### API 信息
- 无后端；所有能力探测与错误映射在浏览器内完成。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/clipboard-bridge/` 目录内文件；不得修改其他任务工具目录；不得在降级路径中引入会改变用户剪贴板非预期内容的隐式行为（除用户点击触发外）。
### 验收标准
- 任务目标五条均可对照演示页与替身环境验收；权限与手势约束在代码审查中可指认。
- 单测覆盖 HTML 消毒、MIME 映射、错误分类、`ClipboardItem` 组装序列化（使用 mock）。
