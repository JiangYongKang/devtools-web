### 任务目标
- 密钥生成：选择 RSA（2048/4096）、EC（P-256/P-384）、Ed25519；Web Crypto `generateKey` 生成密钥对；展示生成耗时与算法用途说明（sign/encrypt 分离提示）。
- 格式互转：导出/导入 PEM（PKCS#8/PKCS#1/SPKI）、JWK JSON；公钥私钥分栏；PEM↔JWK↔SPKI（Raw）往返；非法 PEM 定位 BEGIN/END 块错误。
- 指纹摘要：公钥 SHA-256 fingerprint（hex/colon 格式可选）；与 SSH authorized_keys 风格说明对照。
- 风险提示：私钥勿粘贴生产环境、仅浏览器本地处理、clipboard 清除建议；生成后默认折叠私钥区域。
- 单测：覆盖 PEM 编解码、JWK RSA/EC 字段映射、指纹计算 mock；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/asymmetric-key-converter/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/asymmetric-key-converter/logic/`
- 测试文件夹：`devtools-web/src/tools/asymmetric-key-converter/__tests__/`
### API 信息
- 无外部 API；仅 Web Crypto，禁止上传密钥至服务器。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/asymmetric-key-converter/` 目录内文件；不得修改 PEM 证书查看（032）或密钥派生（129）其它任务目录。
### 验收标准
- 生成、PEM/JWK/SPKI 互转与指纹均可演示；单测覆盖 PEM 往返；RSA/EC 样例密钥一键填充可用。
