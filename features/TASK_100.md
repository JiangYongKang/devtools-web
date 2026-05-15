### 任务目标
- 运行时版本面板：聚合 `import.meta.env`（若可用）、`package.json` 版本字段（构建期注入 `__APP_BUILD__` 占位符的契约在本目录示例 vite 插件片段仅作文档与类型声明，不强制改根配置）、Git commit（由 CI 注入）、构建时间；展示依赖许可证摘要表（来自预生成 `licenses.json` 用户粘贴或内置小样例解析）。
- Source Map 策略说明卡：枚举 `hidden-source-map`、`nosources-source-map`、线上禁用等策略利弊；与错误上报栈还原流程的时序图（Mermaid 字符串渲染为文本）。
- 安全审计入口：集成 `pnpm audit` / `npm audit` 输出 JSON 的解析视图（用户粘贴）；CVSS 颜色分级、按包聚合、可导出 CSV；不得执行任意 shell，仅解析静态 JSON。
- 风险清单：检测「已知泄露 sourcemap 的常见错误配置」检查表（启发式，非扫描整个磁盘）；与 SBOM CycloneDX 片段导入预览（可选字段）。
- 单测：对 SemVer 比较、`audit.json` 解析聚合、`licenseAllowlist` 冲突检测；所有解析函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/build-provenance-audit-console/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/build-provenance-audit-console/logic/`
- 测试文件夹：`devtools-web/src/platform/build-provenance-audit-console/__tests__/`
### API 信息
- 无自动外呼；审计数据来自用户粘贴或内置 demo fixture。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/build-provenance-audit-console/` 目录内文件；不得修改 CI 工作流文件本体（提供 `.github/workflows` 片段仅存在于 DOC 或本目录 `samples/` 下若允许——为遵守「仅改本目录」，样本以字符串常量内嵌于页面或 logic 的 `fixtures/` 文件名放在本任务测试fixtures 同目录）。
### 验收标准
- 版本与审计视图在粘贴样例下可全功能演示；单测覆盖 audit 聚合与许可证冲突；Source Map 策略卡内容与「不得执行 shell」约束在验收清单可勾选。
