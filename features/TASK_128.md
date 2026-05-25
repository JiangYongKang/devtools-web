### 任务目标
- 哈希生成：用户粘贴或上传脚本/样式文本或选择文件；计算 sha256/sha384/sha512 的 SRI  digest（Base64）；展示 `integrity="shaXXX-..."` 完整属性与 crossorigin 推荐值说明。
- 批量模式：多文件列表逐条 hash；复制全部 integrity 行；下载 manifest JSON（path、algorithm、integrity）。
- 校验模式：粘贴 HTML script/link 标签或 integrity 字符串 + 文件内容，比对 digest 是否一致；不匹配时展示 expected vs actual。
- 算法对比：同内容三算法 digest 并排；文件大小与计算耗时（Web Crypto）展示；大文件分片读取说明。
- 单测：覆盖三算法 digest 已知向量、integrity 字符串解析、校验比对；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/subresource-integrity-generator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/subresource-integrity-generator/logic/`
- 测试文件夹：`devtools-web/src/tools/subresource-integrity-generator/__tests__/`
### API 信息
- 无外部 API；不自动 fetch CDN 资源，由用户提供内容。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/subresource-integrity-generator/` 目录内文件；不得修改 CSP 解析（126）或其它安全任务目录。
### 验收标准
- 单文件/批量 hash、integrity 拼装与校验均可演示；单测覆盖 W3C 测试向量；示例 JS/CSS 一键填充可用。
