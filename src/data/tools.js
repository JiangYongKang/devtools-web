/** 当前已落地的工具条目（001～080），与 ToolPage 实现一致 */
export const tools = [
  {
    id: '001',
    name: 'Unix 时间戳与时区转换',
    summary:
      'Unix 时间戳与常用时区的可读日期时间互转（页面：输入、时区选择、互转与复制）',
  },
  {
    id: '002',
    name: 'JSON 格式化与压缩',
    summary: 'JSON 文本的格式化展示与紧凑压缩（含大文本性能与错误提示）',
  },
  {
    id: '003',
    name: 'XML 排版与压缩',
    summary: 'XML 文档的缩进排版与空白压缩',
  },
  {
    id: '004',
    name: 'URL 编码与解码',
    summary: '文本的 URL 编码与解码',
  },
  {
    id: '005',
    name: 'Base64 互转',
    summary: '二进制数据与 Base64 字符串互转（文件/粘贴入口与结果区）',
  },
  {
    id: '006',
    name: '哈希摘要',
    summary: '常用哈希摘要（如 MD5、SHA 系列）生成（明确是否在浏览器内计算或调用后端）',
  },
  {
    id: '007',
    name: '随机 UUID',
    summary: '随机 UUID 生成与分段展示',
  },
  {
    id: '008',
    name: '正则匹配验证',
    summary: '正则表达式对样本文本的匹配与高亮验证',
  },
  {
    id: '009',
    name: 'HTML 美化与压缩',
    summary: 'HTML 源码的缩进美化与单行压缩',
  },
  {
    id: '010',
    name: 'CSS 排版与压缩',
    summary: 'CSS 规则的排版整理与压缩',
  },
  {
    id: '011',
    name: 'JavaScript 格式化与压缩',
    summary: 'JavaScript 源码的格式化与压缩',
  },
  {
    id: '012',
    name: 'Cron 可读说明',
    summary: 'Cron 表达式的人类可读说明',
  },
  {
    id: '013',
    name: '颜色格式互转',
    summary: 'HEX、RGB、HSL 等颜色表示互转',
  },
  {
    id: '014',
    name: 'JWT 载荷解码',
    summary: 'JWT 字符串的载荷解码展示（不涉及密钥保管；防 XSS 展示）',
  },
  {
    id: '015',
    name: '二维码生成',
    summary: '由文本或链接生成二维码图案（画布或图片下载）',
  },
  {
    id: '016',
    name: '文本差异对比',
    summary: '两段文本的行级或词级差异对比',
  },
  {
    id: '017',
    name: 'Markdown 预览',
    summary: 'Markdown 源码的即时预览渲染（安全渲染策略）',
  },
  {
    id: '018',
    name: 'SQL 排版与高亮',
    summary: 'SQL 语句的缩进与关键字高亮排版',
  },
  {
    id: '019',
    name: 'YAML / JSON 互换',
    summary: 'YAML 与 JSON 互换转换',
  },
  {
    id: '020',
    name: '进制转换',
    summary: '常用进制整数之间的转换',
  },
  {
    id: '021',
    name: 'Shell 转义参考',
    summary: 'Shell 特殊字符转义规则参考',
  },
  {
    id: '022',
    name: 'Unicode 查询',
    summary: 'Unicode 字符与码点、名称查询',
  },
  {
    id: '023',
    name: '字符串统计',
    summary: '字符串的字符数、行数与编码字节长度统计',
  },
  {
    id: '024',
    name: 'IPv4 与子网',
    summary: 'IPv4 地址与子网掩码、广播地址推算',
  },
  {
    id: '025',
    name: 'CIDR 解析',
    summary: 'CIDR 记法与地址范围解析',
  },
  {
    id: '026',
    name: 'User-Agent 拆解',
    summary: 'User-Agent 字符串的常见字段拆解',
  },
  {
    id: '027',
    name: 'HTTP 客户端',
    summary: '简易 HTTP 客户端：构造请求并查看响应概览（含 CORS 与错误说明）',
  },
  {
    id: '028',
    name: 'WebSocket 调试',
    summary: 'WebSocket 连接的发送、接收与心跳测试',
  },
  {
    id: '029',
    name: 'Webhook 调试',
    summary: '本地 Webhook 调试：接收并展示回调载荷（或说明与后端代理的配合方式）',
  },
  {
    id: '030',
    name: 'GraphQL 排版',
    summary: 'GraphQL 查询字符串的缩进排版',
  },
  {
    id: '031',
    name: '十六进制与文本互转',
    summary: '十六进制串与可打印文本互转（分隔符、编码与错误提示）',
  },
  {
    id: '032',
    name: 'PEM 证书摘要',
    summary: 'PEM 格式证书的字段摘要展示（浏览器内解析）',
  },
  {
    id: '033',
    name: '对称加密演示',
    summary: '对称密钥语境下的短文本加解密演示（浏览器侧与风险提示）',
  },
  {
    id: '034',
    name: '强口令生成',
    summary: '按规则生成随机强口令',
  },
  {
    id: '035',
    name: '占位假文生成',
    summary: '占位假文按段落或字数生成',
  },
  {
    id: '036',
    name: '日志字段抽取',
    summary: '日志样本文本的级别与时间字段抽取展示',
  },
  {
    id: '037',
    name: 'CSV 与表格互转',
    summary: 'CSV 与表格形文本的行列互转',
  },
  {
    id: '038',
    name: 'JSON 语法校验',
    summary: '粘贴 JSON 时的语法校验与错误定位',
  },
  {
    id: '039',
    name: '.env 解析',
    summary: '.env 风格键值行的解析与重复键提示',
  },
  {
    id: '040',
    name: '.gitignore 规则说明',
    summary: '.gitignore 风格通配模式的含义说明',
  },
  {
    id: '041',
    name: 'SemVer 比较与排序',
    summary:
      '语义化版本号的解析、两两比较、多版本稳定排序、范围算子与导出（纯浏览器）',
  },
  {
    id: '042',
    name: '变更说明草稿',
    summary: '变更说明条目按模板生成草稿（多模板、占位符与条目编排）',
  },
  {
    id: '043',
    name: '安全 URL / 路径拼接',
    summary: '多段 URL 或路径片段的安全拼接与规范化（含批量与诊断）',
  },
  {
    id: '044',
    name: 'IDN 与 Punycode',
    summary: '国际化域名与 Punycode 互转、批量处理与浏览器能力说明（纯前端）',
  },
  {
    id: '045',
    name: '扩展名与 MIME',
    summary: '扩展名与 MIME 类型对照查询（含本地表与可选魔数辅助）',
  },
  {
    id: '046',
    name: '标识符风格转换',
    summary: '标识符在 camelCase、snake_case、PascalCase 等风格间转换',
  },
  {
    id: '047',
    name: '路径规范化',
    summary: '跨平台文件路径的规范化与分隔符展示（字符串级、不访问真实文件系统）',
  },
  {
    id: '048',
    name: '指数退避推算',
    summary: '指数退避重试的间隔序列推算、抖动与导出（纯前端）',
  },
  {
    id: '049',
    name: 'REST Mock 规则草稿',
    summary: 'REST 接口 Mock 响应规则的配置草稿编辑与校验（不自动请求外网）',
  },
  {
    id: '050',
    name: '数据单位换算',
    summary: '常用数据单位与字节数换算（IEC/SI、批量与格式化）',
  },
  {
    id: '051',
    name: '应用壳',
    summary:
      '站点导航、工具索引与基础布局（顶栏/侧栏/响应式、搜索与示例、未知工具空态与无障碍）',
  },
  {
    id: '052',
    name: '工具工作台布局',
    summary:
      '工具页通用布局：输入/输出/操作区与示例说明位、拓扑切换、大文本与输出区分策略',
  },
  {
    id: '053',
    name: '主题与设计令牌',
    summary: '明/暗/跟随系统、设计令牌与仓库样式约定、对比度演示与 URL 临时覆盖',
  },
  {
    id: '054',
    name: '偏好与草稿持久化',
    summary:
      'localStorage/sessionStorage 策略、版本迁移、配额与 LRU、导入导出与损坏恢复演示',
  },
  {
    id: '055',
    name: '剪贴板桥接',
    summary: '读写剪贴板、权限与浏览器降级、富文本消毒与能力探测示例',
  },
  {
    id: '056',
    name: '下载与 Blob 助手',
    summary:
      '统一下载入口（Blob/流/文件名净化、revoke、Content-Disposition 解析与系统差异说明）',
  },
  {
    id: '057',
    name: 'HTTP 客户端封装',
    summary: '基址、拦截器、查询序列化、超时与 AbortController 取消、稳定错误码',
  },
  {
    id: '058',
    name: '反馈界面（加载/空态/通知）',
    summary: '全局加载态、空态模板族、toast/inline 通知与无障碍 live 区域示例',
  },
  {
    id: '059',
    name: '错误恢复',
    summary: '错误边界、未处理 Promise/全局 error、诊断包与限流聚合演示',
  },
  {
    id: '060',
    name: '路由与查询同步',
    summary: '工具状态与 URL 查询参数双向同步、分享链压缩与非法参数剔除演示',
  },
  {
    id: '061',
    name: '功能开关与远程配置',
    summary:
      '静态/远程配置合并、ETag 条件请求、冲突仲裁、脱敏导出与 HTTP 拦截器消费形状演示',
  },
  {
    id: '062',
    name: '请求关联与日志串联',
    summary:
      'Request-Id / Session / Trace 注入、环形日志缓冲、NDJSON 导出与敏感 query 不落盘',
  },
  {
    id: '063',
    name: '表单与查询参数同步',
    summary:
      '表单字段与 URL 双向绑定、schema 校验、防抖与 replace/push 策略、异步校验可取消',
  },
  {
    id: '064',
    name: '错误码与用户文案映射',
    summary:
      'HTTP/业务码分层映射、Retry-After、locale 回退、远程补丁与矩阵预览导出',
  },
  {
    id: '065',
    name: '大文本与长列表性能',
    summary:
      '分片迭代、防抖与 Worker 决策、虚拟列表示例、与工具工作台大文本控制器契约',
  },
  {
    id: '066',
    name: '轮询、重试与退避',
    summary: '可取消轮询、重试与指数退避、可见性暂停、尝试时间线与调试快照',
  },
  {
    id: '067',
    name: '文件选择与拖拽上传',
    summary:
      '选择/拖拽/粘贴文件入口、扩展名与魔数校验、大小与数量上界、进度与诊断',
  },
  {
    id: '068',
    name: '国际化（i18n）',
    summary:
      '命名空间与插值、懒加载语言包校验、回退链与 Intl 封装、与错误映射组合演示',
  },
  {
    id: '069',
    name: '安全富文本展示',
    summary:
      '白名单消毒、URL scheme 限制、剥离诊断、iframe sandbox 对照与样本一键载入',
  },
  {
    id: '070',
    name: '敏感输入遮罩',
    summary:
      '口令/令牌遮罩与短暂明文、剪贴板二次确认、禁止敏感内容写入本地存储与无障碍',
  },
]

export function getToolById(id) {
  return tools.find((t) => t.id === id)
}
