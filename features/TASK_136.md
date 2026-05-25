### 任务目标
- 栈帧还原：粘贴 minified 堆栈文本与对应 `.map` JSON（或内嵌 sourceMappingURL base64）；解析后将 generated 行列映射至 original 文件/行/列；展示 names 数组 lookup 还原标识符名。
- 双向映射：输入 generated 位置查 original，或输入 original 查 generated；支持 `sections` 多段 map 链接（按 offset 选段）；mapping 解码错误定位至 VLQ 段。
- 交互：堆栈每帧可展开查看映射详情；一键复制还原后堆栈 Markdown；内置样例 minified 代码+map 一键加载。
- 边界：缺失 map、越界行列、sourcesContent 内联预览；list 型 map 与 indexed map 格式说明；大 map 惰性解码策略。
- 单测：覆盖 VLQ decode、单段/多段 lookup、堆栈行 regex 解析、names 索引；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/source-map-frame-resolver/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/source-map-frame-resolver/logic/`
- 测试文件夹：`devtools-web/src/tools/source-map-frame-resolver/__tests__/`
### API 信息
- 无外部 API；不自动 fetch 远程 `.map` 文件，用户须粘贴内容。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/source-map-frame-resolver/` 目录内文件；不得修改构建溯源其它任务目录。
### 验收标准
- 堆栈还原、双向 lookup、多段 map、names 解析均可演示；单测覆盖 VLQ 与堆栈解析；示例可用。
