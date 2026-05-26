### 任务目标
- Manifest 解析：粘贴单文档或多文档 `---` 分隔的 Kubernetes YAML，解析 `apiVersion`、`kind`、`metadata.name/namespace` 摘要列表；YAML 语法错误定位至行列；可选一键转为缩进 JSON 预览（只读）。
- 字段检查：对 Deployment/StatefulSet/DaemonSet 检测 `livenessProbe`/`readinessProbe`/`startupProbe` 是否存在及 `httpGet`/`tcpSocket` 关键子字段；对 Pod 模板检测 `resources.requests/limits` 缺失或仅设其一；对 Service 检测 `type` 与 `ports` 一致性（targetPort 命名引用提示）。
- 风险摘要：未设置 probe、未设 resource limits、`latest` 镜像 tag、`hostNetwork: true` 等按规则生成警告/信息分级列表；点击条目跳转至对应文档块。
- 示例与交互：内置「最小 Deployment」「缺 probe 的样例」「多资源清单」三组一键填充；支持按 kind 过滤摘要表；结果可复制校验报告 Markdown。
- 单测：覆盖 YAML 切分、apiVersion/kind 提取、probe/resources 规则、警告聚合；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/kubernetes-manifest-validator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/kubernetes-manifest-validator/logic/`
- 测试文件夹：`devtools-web/src/tools/kubernetes-manifest-validator/__tests__/`
### API 信息
- 无外部 API；不对接真实集群 API Server。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/kubernetes-manifest-validator/` 目录内文件；不得修改 YAML/JSON 互转其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 多文档解析、字段检查、风险摘要、YAML→JSON 预览均可演示；单测覆盖解析与规则；示例可用。
