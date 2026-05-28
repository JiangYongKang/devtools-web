### 任务目标
- 矩阵运算：支持有理数/浮点输入（分数 `a/b` 可选）；加减、乘法、数乘、转置；维度不匹配精确报错。
- 高级：方阵行列式（LU 带部分主元，n≤8）；逆矩阵（可逆性检测与条件数 ‖A‖·‖A⁻¹‖ 估算）；特征值仅 2×2 解析解，更大 n 提示超出范围。
- 步骤说明：2×2/3×3 高斯消元逐步展示（增广矩阵行变换日志）；LU 分解结果展示 L/U/P。
- 交互：粘贴 JSON/嵌套数组；结果复制 LaTeX 草稿；奇异性与病态矩阵警告。
- 示例：内置「可逆 3×3」「奇异矩阵」「病态 Hilbert 3×3」三组；单测覆盖运算、行列式、逆、条件数边界；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/matrix-operations-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/matrix-operations-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/matrix-operations-workbench/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/matrix-operations-workbench/` 目录内文件；不得修改线性回归（任务 183）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 基本运算、行列式、逆、消元步骤与病态提示均可演示；单测覆盖 3×3 已知题；示例可用。
