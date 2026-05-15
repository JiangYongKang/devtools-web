### 任务目标
- 日期控件抽象：在原生 `input type="date|datetime-local|time"` 与文本兜底之间自动选择；统一输出 `Temporal.PlainDate`/`PlainDateTime` 语义（若环境无 Temporal 则逻辑层 polyfill 子集自实现年月日运算，不引入重型依赖或说明限制）。
- 时区与偏移：用户选择 IANA 时区与「固定偏移」两种模式；展示「同一瞬间在不同区」对照表；处理仅有本地墙钟无偏移信息的输入时的警告。
- 校验：月末、闰年、1582 历制外推限制（若简化须列明）；`min`/`max` 与业务「不可选星期几」规则；跨 DST 间隙（不存在的小时）与高亮「重复小时」；所有校验函数中文注释。
- 示例：一键插入「 spring forward」「fall back」「UTC 年末」「南半球 DST」四例；与任务 089 的日期解析可互相粘贴（DOC 描述契约）。
- 单测：纯日期运算、闰秒无关的 wall-clock 测试、min/max 区间、禁用星期规则组合。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/calendar-timezone-edge-validator/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/calendar-timezone-edge-validator/logic/`
- 测试文件夹：`devtools-web/src/platform/calendar-timezone-edge-validator/__tests__/`
### API 信息
- 无 HTTP；可使用 `Intl.DateTimeFormat` 与 `timeZone` 选项做展示对照。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/calendar-timezone-edge-validator/` 目录内文件；不得修改其它任务目录。
### 验收标准
- DST 与月末用例在 UI 可见提示；单测覆盖闰年与禁用规则；无 Temporal 环境的降级路径有明确行为与测试。
