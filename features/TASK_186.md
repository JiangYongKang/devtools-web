### 任务目标
- BigInt 运算：任意大整数加减乘、mod、幂（模幂）、gcd、扩展欧几里得；支持十进制/十六进制输入；除零与负数 mod 语义明确。
- 高精度小数：实现或封装 decimal 语义（≥34 位有效数字可配置）；加减乘除、sqrt、compare；科学计数法解析；除不尽时指定 scale 与 rounding mode。
- 对比模式：同一表达式在 Number、BigInt（整数部分）、Decimal 三路求值并列；溢出/精度丢失/Infinity 高亮；二进制浮点展示（Number 时）。
- 表达式：安全解析算术 AST（非 eval）；括号与函数 min/max/abs；错误定位至 token。
- 示例：内置「斐波那契 1000」「0.1+0.2」「模幂 RSA 小指数」三组；单测覆盖大数、decimal 舍入、溢出检测；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/arbitrary-precision-calculator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/arbitrary-precision-calculator/logic/`
- 测试文件夹：`devtools-web/src/tools/arbitrary-precision-calculator/__tests__/`
### API 信息
- 无外部 API；若引入 decimal 库须锁定版本并在本目录封装。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/arbitrary-precision-calculator/` 目录内文件；不得修改进制转换（任务 020）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- BigInt/Decimal/Number 对比、表达式解析、溢出提示均可演示；单测覆盖舍入与模幂；示例可用。
