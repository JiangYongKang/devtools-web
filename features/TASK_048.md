### 任务目标
- 支持指数退避与相关重试间隔序列推算：参数含初值 `initial`、乘数 `multiplier`、最大间隔 `max`、最大步数 `maxSteps`、可选「全抖动 / 等比抖动 / 无抖动」、抖动比例上下界、可选「整秒对齐」与「对齐到某网格 ms」；支持线性退避模式切换对比（同一参数面板内切换算法族）。
- 支持多场景预设：HTTP 429 建议、云 SDK 默认、自定义工作流；支持表格与折线图（纯 SVG 或 Canvas，数据不外出）双视图、累计等待时间列、最后一列剩余重试预算提示；支持将序列导出为 CSV/JSON 与复制为 `sleep` 伪代码（bash/PowerShell 片段页内模板）。
- 支持「目标总时长内最多几次重试」反算初值或乘数（若数学无解须 `errorCode`）；支持检测乘法溢出与 `Infinity`、非有限数、负参数、零乘数等；支持毫秒/秒单位切换与小数位格式化策略。
- 提供示例一键填充、随机合理参数「摇一摇」按钮（仅用 `Math.random` 生成 UI 演示参数并标明非密码学随机）、对比两次参数配置的 diff 表；大体量步数上界与 Worker 可选说明。
- 可选 URL 查询参数同步当前参数；可选将用户偏好存 `localStorage`；所有图表与表格纯前端；防 XSS。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/exponential-backoff-calculator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/exponential-backoff-calculator/logic/`
- 测试文件夹：`devtools-web/src/tools/exponential-backoff-calculator/__tests__/`
### API 信息
- 无后端 HTTP 调用；序列与反算均在浏览器内完成。
### 任务约束
- 当前任务只允许读取和修改 `exponential-backoff-calculator` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标中参数矩阵、抖动与对齐、图表与导出、反算、溢出检测、示例与 diff 均可逐条验收。
- 纯 JS 单测覆盖序列生成、抖动边界、封顶、溢出、非法参数与单位换算等导出函数。
