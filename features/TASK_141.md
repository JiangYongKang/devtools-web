### 任务目标
- 方言对照：粘贴 SQL 片段，选择源方言（MySQL / PostgreSQL / SQLite）与目标方言，输出语法差异提示列表（不支持构造、关键字差异、引号/标识符规则）；内置常见 DDL/DML 模式识别。
- 函数映射：内置函数对照表（如 `IFNULL`↔`COALESCE`、`GROUP_CONCAT`↔`STRING_AGG`、`DATE_FORMAT`↔`TO_CHAR` 子集）；输入函数名查询映射建议与参数顺序差异说明。
- 转换草稿：对可机械转换的子集生成目标方言 SQL 草稿（标注「需人工复核」项）；结果可复制与下载；非法或不完整 SQL 定位至行列。
- 示例：内置「分页 LIMIT/OFFSET 差异」「自增主键定义」「布尔类型表达」三组一键填充；空输入与仅注释输入边界提示。
- 单测：覆盖方言探测启发式、函数映射 lookup、转换草稿关键规则、错误行列；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/sql-dialect-diff-guide/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/sql-dialect-diff-guide/logic/`
- 测试文件夹：`devtools-web/src/tools/sql-dialect-diff-guide/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/sql-dialect-diff-guide/` 目录内文件；不得修改 SQL 排版其它任务目录。
### 验收标准
- 三方言切换、函数映射、转换草稿与差异列表均可演示；单测覆盖映射与转换规则；示例可用。
