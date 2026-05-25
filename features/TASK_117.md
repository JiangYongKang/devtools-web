### 任务目标
- 策略输入：编辑请求 URL、Method、Request Headers（Cache-Control、Authorization 等）、Response Headers（Cache-Control、ETag、Last-Modified、Age、Vary）；预设「强缓存」「协商缓存」「no-store」「private+CDN」四组模板一键填充。
- 304 判定：模拟两次请求流程——首次 200 存缓存条目（含 cache key：method+url+vary 相关头）；二次带 If-None-Match/If-Modified-Since，按 RFC 规则输出 304 或 200 及原因链步骤列表。
- 存储分区：说明 memory/disk、分区键（origin）、第三方 Cookie 对缓存的影响（文档面板）；可视化 cache entry 字段（etag、lastModified、maxAge、expires、stale 状态）。
- 时间线：可调整「当前时间」与 `max-age`/`s-maxage`/`stale-while-revalidate` 观察 fresh/stale/revalidate 状态；Age 头与 Date 计算说明。
- 单测：覆盖 cache key 生成、304 条件组合、max-age 过期计算、Vary 头匹配；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/http-cache-policy-simulator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/http-cache-policy-simulator/logic/`
- 测试文件夹：`devtools-web/src/tools/http-cache-policy-simulator/__tests__/`
### API 信息
- 无外部 API；纯本地状态机模拟，不发起真实 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/http-cache-policy-simulator/` 目录内文件；不得修改 HTTP 请求 Playground 其它任务目录。
### 验收标准
- 双请求模拟、304 原因链、缓存条目可视化均可演示；单测覆盖 ETag/Last-Modified 分支；四组预设模板可用。
