### 任务目标
- NTP 报文：解析 48 字节 SNTP/NTPv4 报文（hex 粘贴或上传）；展示 leap indicator、version、mode、stratum、poll、precision、root delay/dispersion、reference ID；各时间戳（T1–T4）解码为 UTC 与本地。
- 偏移计算：由 originate/receive/transmit/reference 计算 offset 与 round-trip delay（RFC 5905 公式）；异常 stratum 16（unsynchronized）与 kiss-o'-death 码（ASCII reference ID）说明。
- 客户端模拟：用户输入本地发送时刻与收到的响应报文，推算校正后时钟；与 `Date.now()` 对比展示偏差毫秒数；多次样本滑动平均与离群剔除（可选 3σ）。
- 公共源说明：文档化 pool.ntp.org 与浏览器无法直接 UDP 的限制；可选通过用户自建 HTTPS 时间 API（仅说明契约，默认不绑定密钥）；内置合法/非法报文 hex 示例。
- 单测：覆盖各字段位域解码、offset/delay 已知向量、stratum 边界；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/ntp-offset-analyzer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/ntp-offset-analyzer/logic/`
- 测试文件夹：`devtools-web/src/tools/ntp-offset-analyzer/__tests__/`
### API 信息
- 默认无外部 API；若提供可选 HTTP 时间端点须在 TASK 实现中注明超时与误差免责声明。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/ntp-offset-analyzer/` 目录内文件；不得修改 Unix 时间戳工具（任务 001）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 报文解析、offset/delay、模拟校时、stratum 说明均可演示；单测覆盖公式与位域；示例可用。
