### 任务目标
- 在浏览器内使用 Web Crypto（或等价能力）完成对称加密的短文本演示：支持算法族与模式在页内固定切片（如 AES-GCM）、密钥与 IV 的 Base64/十六进制输入或一键生成随机材料、明文与密文的加解密双向操作与长度上界提示。
- 提供显著风险提示（演示用途、勿粘贴生产密钥、不持久化默认行为）、示例一键填充、复制密文与元数据；当 `crypto.subtle` 不可用或参数不合法时给出降级说明与 `errorCode`。
- 所有敏感字段支持遮罩与「短暂显示」类交互（若与全局组件冲突则在本页用一致模式实现）；禁止将密钥写入 `localStorage` 除非用户显式勾选并再次警示。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/symmetric-crypto-demo/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/symmetric-crypto-demo/logic/`
- 测试文件夹：`devtools-web/src/tools/symmetric-crypto-demo/__tests__/`
### API 信息
- 无后端 HTTP 调用；加解密与随机数仅在浏览器内完成。
### 任务约束
- 当前任务只允许读取和修改 `symmetric-crypto-demo` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标中加解密主路径、随机材料、风险提示、示例、错误与不可用环境说明均可逐条验收。
- 纯 JS 单测覆盖参数校验、错误码、Base64/十六进制编解码辅助函数（不对真实 subtle 做强依赖时可注入替身或仅测纯函数分支）。
