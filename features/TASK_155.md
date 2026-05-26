### 任务目标
- Playbook 解析：粘贴 Ansible Playbook YAML，提取 `hosts`、`become`、`vars`、`tasks` 列表（name、module/action 简写）；YAML 错误定位至行列。
- 任务链预览：按执行顺序展示 task 卡片（含 `when`、`loop`、`tags` 摘要）；`handlers` 节单独列表；解析 `notify` 指向的 handler 名称并绘制 task→handler 有向边。
- 变量插值：对 `{{ var }}` 与 `{{ lookup('...') }}` 做占位符高亮与未定义变量提示（基于 playbook 内 `vars`/`vars_files` 声明的静态分析，不执行 lookup）。
- Dry-run 命令：根据 `hosts` 与 playbook 文件名生成 `ansible-playbook -i inventory playbook.yml --check --diff` 草稿（inventory 占位符可编辑）；复制到剪贴板；说明 `--check` 限制。
- 示例：内置「含 handler 的部署」「when 条件任务」「vars 与 notify」三组一键填充；单测覆盖 task 提取、notify 边、变量引用扫描、命令拼装；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/ansible-playbook-preview/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/ansible-playbook-preview/logic/`
- 测试文件夹：`devtools-web/src/tools/ansible-playbook-preview/__tests__/`
### API 信息
- 无外部 API；不连接 Ansible 控制节点。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/ansible-playbook-preview/` 目录内文件；不得修改 YAML 编辑器其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 任务链、handler 关系、变量提示、dry-run 命令生成均可演示；单测覆盖解析与 notify 图；示例可用。
