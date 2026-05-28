### 任务目标
- SDP 解析：粘贴 WebRTC SDP，解析 m= 行（媒体类型、端口、proto、payload）、c= 连接信息、ICE ufrag/pwd、fingerprint、setup；分组展示 audio/video/application。
- Candidate 解析：解析 `a=candidate` 行 typ host/srflx/relay、foundation、priority、ip/port、related address；按 RFC 5245 priority 公式重算并对比声明值；component/id 关联。
- 连通性检查说明：由同一 media 的 candidate 列表生成候选对矩阵（简化 checklist），标注 Server Reflexive / Relay 路径；STUN Binding Request/Response 十六进制模板解析（可选粘贴）。
- TURN 摘要：自 sdp 提取 ice-servers 风格 URL 列表（若 present）；说明 relay candidate 与权限分配流程（文字+示意图数据，不发起真实 TURN allocate）。
- 示例：内置「单 host」「srflx+relay」「Trickle 不完整」三组 SDP；单测覆盖 SDP tokenize、candidate 字段、priority 公式；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/webrtc-ice-sdp-analyzer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/webrtc-ice-sdp-analyzer/logic/`
- 测试文件夹：`devtools-web/src/tools/webrtc-ice-sdp-analyzer/__tests__/`
### API 信息
- 无外部 API；不建立真实 PeerConnection。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/webrtc-ice-sdp-analyzer/` 目录内文件；不得修改 WebSocket（任务 028）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- SDP/candidate 解析、priority 校验、候选对矩阵、STUN 模板说明均可演示；单测覆盖解析与公式；示例可用。
