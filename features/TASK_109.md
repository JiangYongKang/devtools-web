### 任务目标
- 三路输入：JSON、YAML、TOML 各一栏解析为统一对象模型；解析失败时仅阻塞该路并显示行列错误，不影响其它路就绪状态。
- 合并策略：至少实现 `deepMerge`（数组策略可选 concat/replace/by-index-merge 可配置）、`shallowMerge`、`priorityOrder`（用户排序三路优先级）；输出合并结果 JSON 树预览。
- 冲突 diff：检测同路径类型冲突与值冲突，列出冲突路径列表；并排展示各路取值与合并结果；支持「以某一路为准」一键解决单条冲突（批量解决可选）。
- 示例：内置「三路互补键」「同键不同类型冲突」「数组策略差异」三组一键填充；合并结果复制/下载；大对象合并性能与循环引用检测。
- 单测：覆盖三解析器入口、各合并策略、冲突检测、priority 覆盖顺序；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/multi-source-config-merge-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/multi-source-config-merge-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/multi-source-config-merge-workbench/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/multi-source-config-merge-workbench/` 目录内文件；不得修改 TOML/YAML 单格式任务目录实现文件（可文档说明复用思路，代码独立）。
### 验收标准
- 三路解析、策略切换、冲突 diff 与单条解决均可演示；单测覆盖冲突与数组策略；示例可用。
