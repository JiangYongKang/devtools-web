### 任务目标
- Transform 沙箱：输入源码与 Babel 插件链配置（JSON 描述 preset/plugin 名与 options，内置常用插件如 `@babel/plugin-transform-arrow-functions` 演示）；执行 transform 输出 code、ast 可选、错误栈。
- 对比视图：输入/输出并排或统一 diff；高亮变更行；支持「仅显示变更 hunk」切换；输出可复制与下载。
- Source Map：若插件链生成 map，展示 generated↔original 单行映射预览（点击输出行定位输入行）；无 map 时说明原因。
- 示例：内置「箭头函数转 function」「可选链降级草稿」「插件顺序影响」三组一键填充；非法插件配置 JSON 定位错误。
- 单测：覆盖插件链序列化、transform 错误归一化、diff 行对齐辅助、map 单行 lookup；所有纯函数中文注释；transform 在 Worker 可选说明。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/babel-transform-sandbox/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/babel-transform-sandbox/logic/`
- 测试文件夹：`devtools-web/src/tools/babel-transform-sandbox/__tests__/`
### API 信息
- 无外部 API；插件仅允许白名单内预打包模块，禁止运行时任意 `eval` 加载 npm 包。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/babel-transform-sandbox/` 目录内文件；不得修改 AST 可视化其它任务目录。
### 验收标准
- 插件链 transform、diff、source map 预览均可演示；白名单约束可验收；单测覆盖 diff 与 map lookup；示例可用。
