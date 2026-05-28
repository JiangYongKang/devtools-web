### 任务目标
- 分布采样：实现可复现 PRNG（seed 输入）；支持正态（Box-Muller 或 Ziggurat）、泊松、二项、指数、均匀分布参数化采样；单次最大样本量可配置（如 10⁶）并分块生成以防主线程卡顿（Worker 可选）。
- 统计量：对样本计算 mean/variance/skewness/kurtosis（在线算法）；与理论 PDF/CDF 曲线叠加绘制；直方图可调 bin 数（Freedman–Diaconis 或 Sturges 规则可选）。
- 拟合检验：对正态样本输出 Shapiro–Wilk 简化统计或 Kolmogorov–Smirnov 与理论 CDF 的最大偏差（教学精度，标注与 scipy 差异）；p-value 区间说明而非伪精确。
- 交互导出：参数变更实时重采样；导出 CSV 样本与 PNG 图表；复制摘要 Markdown。
- 示例：内置「标准正态」「高 λ 泊松」「小 n 二项」三组；单测覆盖各分布矩、种子可复现、分位数逆 CDF 边界；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/probability-distribution-sampler/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/probability-distribution-sampler/logic/`
- 测试文件夹：`devtools-web/src/tools/probability-distribution-sampler/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/probability-distribution-sampler/` 目录内文件；不得修改蒙特卡洛（任务 182）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 多分布采样、直方图+理论曲线、拟合检验摘要、种子复现均可演示；单测覆盖已知分布矩；示例可用。
