### 任务目标
- 策略对比：并排演示 Double Submit Cookie、Synchronizer Token、SameSite Cookie 三种 CSRF 防护模型；每模型含「合法请求」「跨站伪造请求」交互剧本与通过/拦截判定。
- Cookie 模拟：可编辑 cookie 名、token 值、SameSite（Strict/Lax/None）、Secure、HttpOnly；展示浏览器发送 Cookie 头与自定义 header 是否携带 token。
- Origin/Referer：模拟跨站与同源 POST；校验 Origin/Referer 与站点关系；缺失 Referer 时的降级策略说明。
- 修复建议：根据用户当前配置生成 checklist（需 CSRF token、SameSite、自定义头、CORS 不误配等）；导出 Markdown。
- 单测：覆盖 token 比对逻辑、SameSite 发送规则表驱动、Origin 白名单匹配；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/csrf-protection-comparison/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/csrf-protection-comparison/logic/`
- 测试文件夹：`devtools-web/src/tools/csrf-protection-comparison/__tests__/`
### API 信息
- 无外部 API；纯前端状态机模拟，不发起真实跨站请求。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/csrf-protection-comparison/` 目录内文件；不得修改 CORS 诊断（127）或其它安全任务目录。
### 验收标准
- 三种策略剧本、Cookie/Origin 模拟与修复 checklist 均可演示；单测覆盖 token 与 SameSite 规则；预设场景一键加载可用。
