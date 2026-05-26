### 任务目标
- 命令模拟：输入 Redis 命令序列（RESP 风格或单行 `SET key val`），内存模拟执行 STRING/HASH/LIST/SET/ZSET 常用命令；不支持命令列表明确说明。
- 键空间：键名空间树或表格浏览当前内存状态（type、TTL、size 估算）；支持 `KEYS`/`SCAN` 模式过滤；选中键展示值预览（大 value 截断策略）。
- TTL 时间线：对带 TTL 的键展示剩余秒数与模拟时间轴事件（EXPIRE/PERSIST）；可调整「模拟当前时间」推进 TTL。
- 示例：内置「购物车 HASH」「排行榜 ZSET」「列队 LIST」三组命令序列一键填充；语法错误定位至命令序号。
- 单测：覆盖五类型核心命令、TTL 递减、键空间快照、错误命令分类；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/redis-command-simulator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/redis-command-simulator/logic/`
- 测试文件夹：`devtools-web/src/tools/redis-command-simulator/__tests__/`
### API 信息
- 无外部 API；不连接真实 Redis。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/redis-command-simulator/` 目录内文件；不得修改其它 KV 存储工具目录。
### 验收标准
- 命令模拟、键空间浏览、TTL 时间线均可演示；单测覆盖五类型与 TTL；示例可用。
