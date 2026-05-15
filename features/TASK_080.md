### 任务目标
- 上传文件「第一道闸」校验管线：在用户选择或拖拽文件后，串联执行「声明 MIME / 扩展名」「文件大小 tier（可配软警告与硬拒绝）」「魔数（file signature）抽样读取前 64～512 字节」三重校验；输出结构化报告 `{ ok, issues[{code,severity,message,hint}], detectedMime, declaredMime }`；对 `application/octet-stream` 与真实内容不匹配给出高优先级 issue。
- 魔数库与可扩展性：逻辑层内置 PNG/JPEG/GIF/WebP/ZIP/PDF/WASM/ELF 等常见签名表（偏移与魔数数组），并支持运行时注册自定义规则（纯内存，不落库）；对复合容器（ZIP）仅检测本地头不解压内部，避免 Zip bomb，须明示「未扫描压缩包内部」；文本类（UTF-8）可选启发式检测与 BOM 识别。
- UI 与示例：多文件队列列表展示每项状态徽章、重试移除、展开查看十六进制预览（截断）；示例按钮挂载小型合成 `Blob`（正确 PNG 头、伪装成 png 的文本、超大零填充虚拟文件仅元数据不真分配）— 超大用 `size` 伪造对象仅在支持路径下演示；拖拽目录与 0 字节文件单独提示。
- 与异步 IO：`File.slice` 读取与 `AbortController` 取消；进度回调用于批量目录（若未来扩展）；`showOpenFilePicker` 可用性探测与降级到 `<input type="file" multiple>`；所有异步方法中文注释。
- 边界：浏览器不提供 `lastModified` 时的降级；超过并行读取上限排队； WASM/可执行 MIME 在 UI 标红风险提示（教育性质）；不得将文件内容上传任何远端（本任务无 HTTP）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/upload-magic-byte-gate/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/upload-magic-byte-gate/logic/`
- 测试文件夹：`devtools-web/src/platform/upload-magic-byte-gate/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/upload-magic-byte-gate/` 目录内文件；不得修改任务 067 通用上传入口目录中的文件（行为对齐说明写 DOC）；不得引入服务端病毒扫描承诺文案。
### 验收标准
- 任务目标五条均可演示；单测覆盖各魔数表偏移、MIME 冲突码、大小 tier、空文件、扩展注册 API；示例按钮覆盖匹配/不匹配/超大元数据三类路径。
