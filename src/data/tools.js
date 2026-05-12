/** 当前已落地的工具条目（001～030），与 ToolPage 实现一致 */
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
]

export function getToolById(id) {
  return tools.find((t) => t.id === id)
}
