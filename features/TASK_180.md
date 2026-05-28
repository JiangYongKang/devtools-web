### 任务目标
- BER/ASN.1：解析 SNMP v2c/v3 报文（hex 粘贴）：version、community/USM 占位、PDU 类型（Get/GetNext/GetBulk/Set/Trap/Inform/Response）、request-id、error-status/index；varbind 列表 OID+值类型+值解码（INTEGER/OCTET STRING/OID/Counter/Gauge/TimeTicks 等）。
- OID 树：内置常用 MIB-II 子集（system/interfaces/ip/tcp/udp）+ 用户粘贴 SMIv2 MIB 片段增量导入（OBJECT-TYPE 名称→OID 前缀）；树形浏览、搜索、复制 OID 与名称。
- 操作模拟：对选定 OID 列表生成 Get/GetNext 请求 BER（不发送 UDP）；展示预期 Response 结构；GetBulk non-repeaters/max-repetitions 参数说明。
- Trap 解析：SNMPv2-Trap 与 Inform 的 snmpTrapOID.0、sysUpTime.0、varbind 绑定展示；时间戳与 severity 映射（若 MIB 含 NOTIFICATION-TYPE）。
- 示例：内置「ifTable 遍历」「linkDown trap」「错误 community」三组 hex；单测覆盖 BER 编解码、OID 编解码、MIB 行解析、varbind 往返；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/snmp-oid-mib-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/snmp-oid-mib-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/snmp-oid-mib-workbench/__tests__/`
### API 信息
- 无外部 UDP API；可选文档说明 snmpwalk 对照，默认纯离线。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/snmp-oid-mib-workbench/` 目录内文件；不得修改 ASN.1 其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 报文解析、OID 树、Get/GetNext 生成、Trap varbind 均可演示；单测覆盖 BER 与 OID；示例可用。
