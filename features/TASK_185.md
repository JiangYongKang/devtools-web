### 任务目标
- 量纲解析：解析复合单位字符串（如 `kg·m/s²`、`N`、`km/h`）；归约到 SI 七个基维指数向量；识别无量纲与非法单位符号。
- 链式换算：用户输入数值与源单位、目标单位，输出换算结果；支持中间步骤展开（m/s² → g 展示换算链）；有效数字与舍入模式（half-up、bankers 可选）。
- 单位库：内置常用工程单位表（质量、长度、时间、温度需 affine 变换如 °C↔K 单独处理）；允许用户扩展自定义别名（会话内，不持久化也可）。
- 冲突检测：加减速不同量纲相加报错；温度与非温度混淆提示；导出换算审计日志 Markdown。
- 示例：内置「牛顿→lbf」「km/h→m/s」「°C→°F」三组；单测覆盖维向量乘法、温度仿射、精度策略；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/dimensional-unit-converter/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/dimensional-unit-converter/logic/`
- 测试文件夹：`devtools-web/src/tools/dimensional-unit-converter/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/dimensional-unit-converter/` 目录内文件；不得修改数据单位换算（任务 050）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 量纲归约、链式换算、温度特例、精度策略均可演示；单测覆盖维向量与温度；示例可用。
