### 任务目标
- 现金流：输入 dated cashflow 表（日期+金额，支出负/收入正）；计算 NPV（可配置贴现率与日计数 Act/365、30/360 教学子集）、IRR 与 XIRR（Newton–Raphson + 多初值防发散）；MIRR 可选。
- 分期/贷款：等额本息、等额本金摊还表生成；总利息、首期/末期 breakdown；提前还款一笔模拟。
- 敏感性：贴现率 ±Δ、关键现金流 ±% 对 NPV/IRR 的二维表格；热力色阶；CSV 导出。
- 边界：无 IRR 解、多重 IRR 场景提示；非规整日期排序与重复日期校验；与任务 089 金额展示格式可本地复用逻辑但不得跨目录 import。
- 示例：内置「项目 NPV」「房贷 30 年」「多重 IRR 反例」三组；单测覆盖 NPV/XIRR 已知案例、摊还表余额守恒；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/financial-cashflow-calculator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/financial-cashflow-calculator/logic/`
- 测试文件夹：`devtools-web/src/tools/financial-cashflow-calculator/__tests__/`
### API 信息
- 无外部 API；结果仅供参考，页面须含非投资建议声明。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/financial-cashflow-calculator/` 目录内文件；不得修改金额本地化（任务 089）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- NPV/IRR/XIRR、摊还表、敏感性表均可演示；单测覆盖标准金融样例；示例可用。
