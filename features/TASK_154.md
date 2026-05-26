### 任务目标
- HCL 格式化：粘贴 Terraform `.tf` 或 HCL 片段，执行缩进/对齐排版（字符串与 heredoc 保护）；语法错误定位至行列；支持选中块单独格式化。
- Plan 文本解析：粘贴 `terraform plan` 文本输出（含 `No changes`/`Plan:` 头），解析 resource 变更列表：`create`/`update`/`delete`/`replace` 动作、地址、关键 attribute diff 行摘要。
- Drift 标记：识别 `forces replacement`、`known after apply`、`-/+` 销毁重建；对仅 `~` 更新与 `+/-` 替换分级展示；统计各动作数量与涉及 provider 类型（从 resource 地址启发式提取）。
- 示例：内置「单资源 create」「多资源 mixed plan」「无变更 plan」三组一键填充；HCL 与 plan 分栏输入；报告可复制。
- 单测：覆盖 HCL 缩进规则、plan 段落切分、动作分类、drift 关键字检测；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/terraform-hcl-plan-parser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/terraform-hcl-plan-parser/logic/`
- 测试文件夹：`devtools-web/src/tools/terraform-hcl-plan-parser/__tests__/`
### API 信息
- 无外部 API；不执行真实 `terraform plan`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/terraform-hcl-plan-parser/` 目录内文件；不得修改 HCL/YAML 其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- HCL 格式化、plan 解析、drift 分级、变更统计均可演示；单测覆盖 plan 解析与动作分类；示例可用。
