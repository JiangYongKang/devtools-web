### 任务目标
- 算法对比：并排配置 PBKDF2（SHA-256、iterations）、scrypt（N/r/p，Web Crypto 不支持时说明降级或 wasm 可选路径）、Argon2（wasm 子集或参数说明页）；统一 password、salt（随机或 hex 输入）。
- 耗时基准：各算法派生一次并记录 ms（可多次取中位数）；参数滑块联动预估耗时趋势；弱参数（低 iterations/小 N）警告。
- 输出展示：derived key hex/Base64、salt hex；参数 JSON 导出供后端复现；不持久化用户 password。
- 教育说明：salt 长度、pepper 须服务端保管、为何禁止明文存 password；OWASP 推荐参数参考表。
- 单测：覆盖 PBKDF2 已知向量、salt 编码、参数边界校验、计时结果结构；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/key-derivation-benchmark/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/key-derivation-benchmark/logic/`
- 测试文件夹：`devtools-web/src/tools/key-derivation-benchmark/__tests__/`
### API 信息
- 无外部 API；scrypt/Argon2 若用 wasm 须 bundled 本地资源，禁止远程加载不可信 wasm。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/key-derivation-benchmark/` 目录内文件；不得修改对称加密演示（033）或非对称密钥（130）其它任务目录。
### 验收标准
- PBKDF2 基准、参数对比与弱参数警告均可演示；单测覆盖 PBKDF2 向量；页面含 password 不落盘说明。
