### 任务目标
- 客户端模糊搜索、过滤与高亮组件：对 `string[]` 或「扁平化 `{id,text,tags[]}` 行模型」输入建立索引；实现基于 `ngram` 或 `Bitap`/`Levenshtein` 有界距离的模糊匹配评分，并支持前缀加权、连续子串 bonus、大小写折叠与 ASCII 近似（如 `o/0` 可选开关）；结果按分数与字典序二级排序，暴露 `highlightRanges` 供渲染层使用。
- UI 行为：输入框 debounce 可配、键盘上下选择、`Enter` 确认、`Esc` 清空；高亮渲染须防 XSS（纯文本节点切片或可信 span 包裹）；大列表（1e5 行）走 Web Worker 索引构建与查询（与主线程传 `ArrayBuffer` 转移策略在 DOC 说明），主线程仅接收前 `limit` 条命中；提供「仅过滤不高亮」模式降低开销。
- 示例与工具化：内置技术文档标题列表、代码符号表、带错别字的关键词样例三组示例按钮；展示查询耗时直方图（最近 20 次，`performance.now`）；支持导出当前过滤结果为 JSON。
- 纯逻辑层：`buildFuzzyIndex(corpus, options)` 与 `searchFuzzy(index, query, options)` 分离；选项包含 `maxEditDistance`、`tokenize`、`stopwords`；所有导出函数中文注释。
- 边界：空查询与全空白、仅符号查询的退化；Worker 构建失败回退主线程并显示警告；`prefers-reduced-motion` 下关闭高亮闪烁动画；内存上界（索引条目数）拒绝策略。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/fuzzy-text-filter-highlight/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/fuzzy-text-filter-highlight/logic/`
- 测试文件夹：`devtools-web/src/platform/fuzzy-text-filter-highlight/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/fuzzy-text-filter-highlight/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 任务目标五条均可核对；单测覆盖评分稳定性、边界距离、高亮区间不重叠合并、stopwords、索引拒绝大语料；示例按钮与 Worker 回退路径可演示。
