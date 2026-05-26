### 任务目标
- Chart 结构：粘贴 Helm `Chart.yaml` + `values.yaml` + 模板目录下多文件文本（或打包为单输入多 Tab），解析 chart 名称、version、依赖 `dependencies` 摘要。
- Values 注入：用户编辑 `values.yaml` 后，对模板中的 `{{ .Values.xxx }}`/`{{ .Release.Name }}` 等做静态替换预览（支持嵌套路径与 `default`/`required` 函数的最小子集解释）；未解析键列表提示。
- Manifest 预览：合并渲染后的多文档 YAML 列表（`---` 分隔）只读展示；语法错误定位至模板行；不支持 `helm install` 真集群。
- tpl 调试：单独输入 `tpl` 函数字符串与 values 上下文，输出二次渲染结果；说明 `tpl` 与 `include` 差异。
- 示例：内置「Deployment 模板」「带 tpl 的 ConfigMap」「子 chart values 覆盖」三组一键填充；单测覆盖 values 路径解析、模板替换、tpl 求值、多文档切分；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/helm-chart-template-renderer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/helm-chart-template-renderer/logic/`
- 测试文件夹：`devtools-web/src/tools/helm-chart-template-renderer/__tests__/`
### API 信息
- 无外部 API；不调用 `helm template` CLI。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/helm-chart-template-renderer/` 目录内文件；不得修改 Kubernetes Manifest 校验（任务 152）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- values 注入、manifest 预览、tpl 调试、chart 元信息摘要均可演示；单测覆盖替换与 tpl；示例可用。
