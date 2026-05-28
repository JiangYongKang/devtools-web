### 任务目标
- 数据输入：表格/CSV 粘贴两列 (x,y)；支持加权最小二乘（可选权重列）；缺失与非数值行定位；异常点标记（|标准化残差|>阈值）。
- 回归计算：OLS 闭式解或 QR 思路实现；输出斜率、截距、R²、调整 R²、残差标准误差；x 均值处预测区间（可配置置信水平 90/95/99%）。
- 可视化：散点+拟合线+置信带；残差–拟合值图、残差直方图；杠杆值/Cook 距离摘要（小样本完整计算）。
- 诊断：多重共线性提示（仅单变量 x 时跳过）；Durbin–Watson 统计（教学）；导出系数表 Markdown 与 CSV 预测列。
- 示例：内置「线性趋势」「含离群点」「异方差形态」三组；单测覆盖已知数据集系数、R²、残差向量；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/linear-regression-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/linear-regression-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/linear-regression-workbench/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/linear-regression-workbench/` 目录内文件；不得修改矩阵运算（任务 184）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- OLS、区间带、残差诊断、离群检测均可演示；单测覆盖教科书数据集；示例可用。
