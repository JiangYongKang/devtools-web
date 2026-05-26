### 任务目标
- Workflow 解析：粘贴 `.github/workflows/*.yml` 内容，解析 `on` 触发器摘要、`jobs` 名称、`runs-on`、`needs` 依赖；YAML 错误定位至行列。
- Job DAG：`needs` 构建 job 依赖有向图；检测环路与孤立 job；点击节点展示 steps 数量、`uses`/`run` 动作类型统计。
- Matrix 展开：解析 `strategy.matrix` 键值，展示笛卡尔积组合预览（上限如 20 组合，超出提示截断）；每个组合生成虚拟 job 标签。
- Secrets 说明：扫描 `secrets.`/`GITHUB_TOKEN` 引用，列出占位说明卡（不读取真实 secret）；`${{ }}` 表达式语法高亮；`permissions`/`concurrency` 块摘要。
- 示例：内置「单 job CI」「needs 链式部署」「matrix 多版本测试」三组一键填充；单测覆盖 job 图、matrix 展开、secret 引用扫描；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/github-actions-workflow-visualizer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/github-actions-workflow-visualizer/logic/`
- 测试文件夹：`devtools-web/src/tools/github-actions-workflow-visualizer/__tests__/`
### API 信息
- 无外部 API；不对接 GitHub API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/github-actions-workflow-visualizer/` 目录内文件；不得修改通用 DAG 组件其它任务目录（图布局可本目录自包含）。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- workflow 解析、job DAG、matrix 预览、secrets 占位说明均可演示；单测覆盖图与 matrix；示例可用。
