### 任务目标
- 构建「Web Crypto / SubtleCrypto」能力矩阵页：在 `window.isSecureContext` 前提下逐项探测 `digest`、`generateKey`、`deriveKey`、`deriveBits`、`encrypt`/`decrypt`、`sign`/`verify`、`importKey`/`exportKey`、`wrapKey`/`unwrapKey` 等 API 的存在性与最小可运行用例（使用一次性随机材料，不落盘）；对 `RSA-OAEP`、`AES-GCM`、`ECDSA`、`HKDF`、`PBKDF2` 等算法组合给出「支持 / 不支持 / 部分支持」三元枚举与失败原因码（`NotSupportedError`、`InvalidAccessError` 等归一化）。
- 环境与策略说明：区分 `http://localhost` 与内网 IP、`file://`、被混合内容降级、第三方 iframe 无 `allow="crypto-key*"` 等场景；展示 `crypto.subtle` 缺失时的 Polyfill 不可行声明与「迁移到 HTTPS / 调整 iframe sandbox」的可复制检查清单；提供「导出诊断 JSON」按钮（脱敏：仅布尔与错误名，不含密钥材料）。
- 与性能及 Worker 边界：主线程探测与 `Worker` 内重复探测结果对照表（若 Worker 不可用则显式降级说明）；对 `SharedArrayBuffer` 与 COOP/COEP 关系仅做只读说明卡片，避免与安全头配置任务耦合；内置 2～3 组示例按钮（现代浏览器预期全绿、刻意缩短 RSA 模数导致失败、禁用算法名触发 `SyntaxError` 路径）。
- 纯逻辑层：实现 `probeSubtleCapabilities(options)` 返回结构化报告（含版本字段、耗时上界、可取消 `AbortSignal`）；实现「探测计划」可配置（跳过 RSA2048 以上重量级操作或延长超时）；所有异步路径中文注释说明意图与参数语义。
- 边界与无障碍：探测失败不得导致页面崩溃；连续点击「重新探测」须防抖与进行中禁用；结果表格支持键盘导航与屏幕阅读器友好的摘要行；超大循环探测前须字节/次数预算并在 UI 明示中止条件。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/web-crypto-capability-matrix/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/web-crypto-capability-matrix/logic/`
- 测试文件夹：`devtools-web/src/platform/web-crypto-capability-matrix/__tests__/`
### API 信息
- 无 HTTP；禁止向外发送任何密钥或随机数种子。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/web-crypto-capability-matrix/` 目录内文件；不得修改其它任务编号目录下的实现或路由注册（若需接入导航，仅在 DOC 中说明由集成方拷贝契约，本任务目录内可提供独立演示入口组件导出约定）。
### 验收标准
- 任务目标五条均可逐条在页面或单测中核对；单测覆盖报告 schema 版本、错误码归一、`AbortSignal` 取消后无悬挂 Promise、安全上下文为 false 时的早退分支；示例按钮可一键复现至少三种探测结果形态。
