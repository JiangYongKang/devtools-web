### 任务目标
- 表达式求值：输入 JSON 数据集与 JSONata 表达式，输出求值结果 JSON；语法错误定位至表达式偏移；运行时类型错误展示 JSONata 消息与上下文路径。
- 中间步骤：可选开启「逐步评估」模式，展示主要阶段（如 filter/map/transform 简化 trace，至少记录子表达式求值序列）；步骤列表可展开查看中间值（大值截断策略说明）。
- 编辑器：常用 JSONata 片段插入（`$map`、`$filter`、`$sum`、`$sort`）；表达式与数据集历史可选 localStorage；结果区格式化/复制/下载。
- 示例：内置官方风格样例（订单列表聚合、条件 transform、字符串函数）三组一键填充；空数据集与 `undefined` 结果边界说明。
- 单测：覆盖基础路径、filter/map、类型错误捕获、trace 序列长度上限；所有纯函数中文注释；不依赖 DOM。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/jsonata-expression-evaluator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/jsonata-expression-evaluator/logic/`
- 测试文件夹：`devtools-web/src/tools/jsonata-expression-evaluator/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/jsonata-expression-evaluator/` 目录内文件；不得修改 JSON 查询表达式其它任务目录。
### 验收标准
- 求值、错误定位、逐步评估 trace、示例填充均可验收；单测覆盖聚合与错误；大值截断有说明。
