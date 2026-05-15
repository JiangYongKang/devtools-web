### 任务目标
- 金额：基于 `Intl.NumberFormat` 与可插拔 `currency`/`minimumFractionDigits`；解析自由文本金额（千分位、括号负数、币种符号前缀/后缀混淆）；输出 `{ valueMinorUnits, currency, warnings[] }`；非法输入结构化错误。
- 比率：支持 `%`、`‰`、小数与分数输入（`1/3` 有理数近似策略须明示）；与金额组合时的运算预览（不含税务建议免责声明）。
- 日期：解析 ISO、RFC3339 常见子集、`dd/MM/yyyy` 与 `MM/dd/yyyy` 歧义显式策略选择；展示侧支持用户时区、`Intl.DateTimeFormat` 与相对时间 `Intl.RelativeTimeFormat`；夏令时边界样例一键插入。
- UI：三栏联动（原始输入、规范化展示、调试 JSON）；BCP-47 语言标签可选；所有解析器中文注释。
- 单测：固定 `Intl` 用假时钟与注入 locale 数据（可 stub）验证四舍五入银行家 vs 半入争议时的明确选择；覆盖非十进制货币 minor units（如 JPY）与超大数科学计数拒绝策略。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/i18n-money-ratio-datetime/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/i18n-money-ratio-datetime/logic/`
- 测试文件夹：`devtools-web/src/platform/i18n-money-ratio-datetime/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/i18n-money-ratio-datetime/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 金额/比率/日期三条主链与边界示例可验收；单测覆盖歧义日期、括号负数、JPY、DST 样例；警告与错误码表在页面可查。
