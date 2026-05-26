### 任务目标
- Compose 解析：粘贴 `docker-compose.yml`（v2/v3 常见字段），解析 `services` 名称、`image`/`build`、`ports`、`environment` 键数量摘要；YAML 错误定位至行列。
- 依赖图：`depends_on`（含 `condition: service_healthy`）与 `links` 遗留字段构建有向依赖图；检测环路与不可达服务；`healthcheck` 块解析为 test/interval/timeout/retries 摘要并标注未配置健康检查的服务。
- 启动顺序：基于拓扑排序输出建议启动批次（同批可并行）；对仅 `depends_on` 无 condition 与带 `service_healthy` 的差异说明；端口映射表（host:container/protocol）可排序、可复制。
- 示例：内置「Web+DB+Redis」「健康检查链」「循环依赖反例」三组一键填充；空 services 与仅 `version` 头边界提示。
- 单测：覆盖 depends_on 图构建、环检测、拓扑批次、ports 展平、healthcheck 摘要；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/docker-compose-dependency-graph/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/docker-compose-dependency-graph/logic/`
- 测试文件夹：`devtools-web/src/tools/docker-compose-dependency-graph/__tests__/`
### API 信息
- 无外部 API；不连接 Docker Engine。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/docker-compose-dependency-graph/` 目录内文件；不得修改依赖图通用组件其它任务目录（仅消费约定接口时须在 TASK 边界内自包含实现）。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 服务解析、依赖 DAG、启动批次、端口映射表、healthcheck 摘要均可演示；单测覆盖图与排序；示例可用。
