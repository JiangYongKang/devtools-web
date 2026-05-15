### 任务目标
- 通用文件入口：点击选择、`input[type=file]` 程序化重置、拖拽进入/离开/放置高亮状态机（防止子元素抖动）、以及「粘贴文件」从剪贴板 `ClipboardItem` 提取（与 055 能力矩阵对齐时在 DOC 说明依赖或复制最小逻辑到本任务目录自包含二选一，禁止跨任务改文件）。
- 校验管道：扩展名白名单、声明 `MIME` 与魔数字节切片交叉判定（与 080 语义对齐的子集表，本任务内置精简魔数表）、单文件大小上界、总字节上界、文件数量上界；每项失败须 `errorCode` 与行级诊断（文件名、原因、可重试提示）；部分通过策略（丢弃非法项继续）可切换。
- 演示页与示例：多文件拖拽、故意混入 `.exe` 改扩展名文本文件、超大文件替身（`Blob` 大小伪造）；展示读取进度（`FileReader` 分块或 `stream().getReader()` 计数，可配）；支持「仅校验不读内容」快速路径。
- 与任务 056 衔接：校验通过后输出 `DownloadDescriptor` 兼容结构或 `File` 句柄列表供宿主下载/上传，类型在逻辑层定义；不得实现实际上传到服务器的 multipart（仅 UI 与元数据）。
- 边界：目录拖拽（`webkitGetAsEntry` 若不可用则提示）；空文件；同名文件去重策略（后缀 `_1`）；非 UTF-8 文件名在 zip 场景外的展示用 `errorCode`；移动端无拖拽时的等价 UX 说明。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/file-upload-surface/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/file-upload-surface/logic/`
- 测试文件夹：`devtools-web/src/platform/file-upload-surface/__tests__/`
### API 信息
- 无 HTTP；若未来直传 OSS，TASK 仅定义 `prepareUpload(fileMeta) -> { url, fields }` 占位类型，本迭代不调用外网。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/file-upload-surface/` 目录内文件；不得修改 `clipboard-bridge`、`download-helper` 等其它任务目录。
### 验收标准
- 任务目标五条均可演示；单测覆盖魔数、扩展名冲突、大小上界、去重、空文件。
