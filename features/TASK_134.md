### 任务目标
- 配置编辑：扁平 ESLint config（eslint.config.js 导出 JSON 等价物）可视化编辑——rules 启停、severity、options JSON；支持 extends 模拟为 rules 合并预览（说明与真实 ESLint 差异）。
- 诊断运行：对样例 JS/TS 代码运行内置 linter 引擎（eslint 浏览器构建或精简规则子集）；列表展示 ruleId、message、severity、fixable 标记；点击定位行列。
- Fix 预览：对可 fix 项展示 before/after 片段 diff；「应用全部 fix」生成修正后源码（内存，不写盘）；与规则变更联动即时重跑。
- 示例：内置「unused vars」「no-console」「import/order 简化」三组 config+代码一键填充；非法 rules JSON 校验。
- 单测：覆盖 config 合并、diagnostic 归一化、fix 应用顺序、rule 启停过滤；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/eslint-flat-config-editor/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/eslint-flat-config-editor/logic/`
- 测试文件夹：`devtools-web/src/tools/eslint-flat-config-editor/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/eslint-flat-config-editor/` 目录内文件；不得修改 Prettier 格式化其它任务目录。
### 验收标准
- 规则编辑、诊断列表、fix diff 均可演示；单测覆盖 merge 与 fix；示例可用。
