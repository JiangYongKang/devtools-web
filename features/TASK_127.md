### 任务目标
- 请求分类：输入 Origin、Method、Request Headers（Content-Type、Authorization 等）；判定简单请求 vs 需预检的非简单请求；列出触发预检的条件链（custom header、content-type 非 safelist 等）。
- 预检模拟：构造 OPTIONS 预检请求/响应头（Access-Control-Allow-Origin/Methods/Headers、Max-Age、Credentials）；模拟浏览器是否放行实际请求；Vary: Origin 说明。
- 修复建议：根据失败原因生成修复项（缺少 Allow-Origin、Method 未列出、Credentials 与 * 冲突）；支持多 Origin 场景表格。
- 示例：内置「GET 简单请求」「POST application/json 预检」「带 Authorization 预检」三组一键填充；wildcard vs 具体 Origin 对比面板。
- 单测：覆盖 safelist method/header/content-type 判定、Allow-Origin 匹配（含 null）、credentials 规则；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/cors-preflight-diagnostics/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/cors-preflight-diagnostics/logic/`
- 测试文件夹：`devtools-web/src/tools/cors-preflight-diagnostics/__tests__/`
### API 信息
- 无外部 API；不发起真实跨域请求。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/cors-preflight-diagnostics/` 目录内文件；不得修改 CSRF 对比（125）或 HTTP 客户端其它任务目录。
### 验收标准
- 简单/非简单判定、预检模拟与修复建议均可演示；单测覆盖 safelist 与 credentials；三组示例可用。
