### 任务目标
- Unit 解析：粘贴 systemd `.service`/`.timer`/`.socket` 等内容，按 `[Unit]`/`[Service]`/`[Install]`（及 `[Timer]`/`[Socket]`）分段展示键值表；未知段保留原始文本。
- 依赖说明：解析 `Requires`/`Wants`/`After`/`Before`/`PartOf`/`Conflicts` 关系，绘制单元间有向依赖图；检测自依赖与环；输出建议启动顺序批次（拓扑排序）。
- 字段摘要：`Type`/`ExecStart`/`Restart`/`User`/`Environment` 等常用键高亮；`ExecStartPre`/`ExecStartPost` 链式列表；`WantedBy`/`RequiredBy` 与 target 关联说明。
- 示例：内置「简单 oneshot 服务」「多单元 After 链」「timer 激活 service」三组一键填充；非法 ini （重复键、未闭合段）报错定位。
- 单测：覆盖段解析、依赖图、环检测、拓扑批次、timer/socket 段识别；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/systemd-unit-parser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/systemd-unit-parser/logic/`
- 测试文件夹：`devtools-web/src/tools/systemd-unit-parser/__tests__/`
### API 信息
- 无外部 API；不调用 `systemctl`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/systemd-unit-parser/` 目录内文件；不得修改 Docker/systemd 其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 分段展示、依赖图、启动顺序、字段摘要均可演示；单测覆盖解析与图算法；示例可用。
