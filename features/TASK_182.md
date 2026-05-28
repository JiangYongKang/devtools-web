### 任务目标
- 估算核心：单位圆内随机点法与 Buffon 针（可选）估算 π；记录样本量 N、命中数、当前 π 估计、标准误差 σ/√N；支持批量增量采样。
- 收敛分析：实时绘制 |π̂−π| 与 95% 置信带随 N 变化曲线；标注达到目标精度所需 N 的预测（基于当前方差）；对比不同方差缩减策略（分层采样/对偶变量，至少实现一种）。
- 并行：Web Worker 分片合并计数（可配置 worker 数）；主线程聚合与取消；进度与每秒样本率展示。
- 实验复现：固定 seed 列表；导出 CSV（N, estimate, error）；大 N 上限与内存保护说明。
- 示例：内置「快速 1e4」「高精度 1e6 分片」「Buffon 演示」三组参数；单测覆盖命中概率、置信区间公式、Worker 合并逻辑（mock）；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/monte-carlo-pi-estimator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/monte-carlo-pi-estimator/logic/`
- 测试文件夹：`devtools-web/src/tools/monte-carlo-pi-estimator/__tests__/`
### API 信息
- 无外部 API；Worker 脚本须放在本任务目录内。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/monte-carlo-pi-estimator/` 目录内文件；不得修改概率分布（任务 181）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- π 估计、收敛曲线、Worker 并行、方差缩减对比均可演示；单测覆盖统计公式；示例可用。
