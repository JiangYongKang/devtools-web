/** 与 features/FEATURE.md 中 001～050 工具条目对应 */
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
    name: '十六进制与文本',
    summary: '十六进制串与可打印文本互转',
  },
  {
    id: '032',
    name: 'PEM 证书摘要',
    summary: 'PEM 格式证书的字段摘要展示',
  },
  {
    id: '033',
    name: '对称加解密演示',
    summary: '对称密钥语境下的短文本加解密演示入口（仅浏览器侧演示与风险提示）',
  },
  {
    id: '034',
    name: '随机强口令',
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
    name: 'CSV 行列互转',
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
    name: '.gitignore 说明',
    summary: '.gitignore 风格通配模式的含义说明',
  },
  {
    id: '041',
    name: '语义化版本',
    summary: '语义化版本号的比较与排序',
  },
  {
    id: '042',
    name: '变更说明草稿',
    summary: '变更说明条目按模板生成草稿',
  },
  {
    id: '043',
    name: 'URL 路径拼接',
    summary: '多段 URL 或路径片段的安全拼接与规范化',
  },
  {
    id: '044',
    name: 'Punycode 互转',
    summary: '国际化域名与 Punycode 互转',
  },
  {
    id: '045',
    name: '扩展名与 MIME',
    summary: '扩展名与 MIME 类型对照查询',
  },
  {
    id: '046',
    name: '标识符命名风格',
    summary: '标识符在 camelCase、snake_case、PascalCase 间转换',
  },
  {
    id: '047',
    name: '跨平台路径',
    summary: '跨平台文件路径的规范化与分隔符展示',
  },
  {
    id: '048',
    name: '指数退避推算',
    summary: '指数退避重试的间隔序列推算',
  },
  {
    id: '049',
    name: 'REST Mock 草稿',
    summary: 'REST 接口 Mock 响应规则的配置草稿（可与本地 mock 服务或静态场景结合）',
  },
  {
    id: '050',
    name: '数据单位换算',
    summary: '常用数据单位与字节数换算',
  },
]

export function getToolById(id) {
  return tools.find((t) => t.id === id)
}
