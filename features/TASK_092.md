### 任务目标
- 在仓库内给出「按工具拆分路由」的可落地范式：本任务目录导出 `toolRouteManifest`（工具 id、人类标题、动态 `import()` 工厂、预加载提示优先级）；提供 Playground 页面对比「同步打包 vs 动态 import」的体积与加载瀑布模拟（Performance API + 手工标记）。
- 代码分割策略文档化：列出 Vite `manualChunks` 候选边界、共享依赖上浮规则、React.lazy + Suspense fallback 一致性；提供「错误边界包裹懒路由」示例组件仅在本目录。
- 预取与可访问性：`requestIdleCallback` 或超时降级下按 hover/focus 预取下一工具 chunk；路由切换时 Announcer 读取工具名；失败加载可重试三次并记录最后错误码。
- 示例：注册至少五个假工具入口（纯占位导出），演示其中两个互斥 chunk 与三个共享 chunk 的图（构建分析 JSON 可手贴导入可视化表格）。
- 单测：纯函数 `buildChunkGraph(manifest) -> edges`、`selectPreloadCandidates(navHistory, cfg)`；禁止在单测中真实动态 import（使用注入工厂）；所有方法中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/route-lazy-chunking-playbook/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/route-lazy-chunking-playbook/logic/`
- 测试文件夹：`devtools-web/src/platform/route-lazy-chunking-playbook/__tests__/`
### API 信息
- 无业务 HTTP；若读取 `stats.html` 或 bundle 分析 JSON，仅通过用户粘贴上传字符串完成解析。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/route-lazy-chunking-playbook/` 目录内文件；对 `vite.config.js` 与全局路由的改动必须在 DOC 中以「集成清单」形式描述而不在本任务中直接改仓库根配置（除非用户另授权集成任务）。
### 验收标准
- Playground 可展示 manifest 驱动的懒加载与失败重试；单测覆盖 chunk 图构建与预取候选；DOC 写清将 playbook 接入主应用的最小步骤。
