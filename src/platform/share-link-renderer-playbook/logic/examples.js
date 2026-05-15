const EXAMPLES = [
  {
    id: 'idn-domain',
    title: '国际化域名 (IDN)',
    description: '包含 Punycode 编码的中文域名',
    url: 'https://xn--fiqs8s.xn--fiqz9s/',
    tags: ['punycode', 'idn'],
  },
  {
    id: 'suspicious-port',
    title: '异常端口号',
    description: '使用非标准端口的 URL',
    url: 'https://example.com:8080/admin/login',
    tags: ['port'],
  },
  {
    id: 'long-query',
    title: '超长查询参数',
    description: '包含大量参数的 URL',
    url: 'https://example.com/search?q=test&page=1&sort=desc&filter=active&category=all&lang=zh-CN&theme=dark&limit=50&offset=0&timestamp=1699999999999',
    tags: ['long-url', 'query'],
  },
  {
    id: 'oauth-state',
    title: 'OAuth 回调链接',
    description: '包含 state 参数的 OAuth 回调',
    url: 'https://example.com/callback?code=auth_code_12345&state=abcdefghijklmnopqrstuvwxyz0123456789',
    tags: ['oauth', 'sensitive'],
  },
  {
    id: 'utm-tags',
    title: 'UTM 追踪参数',
    description: '包含市场营销追踪参数的链接',
    url: 'https://blog.example.com/post-123?utm_source=twitter&utm_medium=social&utm_campaign=summer_sale&utm_content=banner_top',
    tags: ['utm', 'tracking'],
  },
  {
    id: 'credentials',
    title: '嵌入凭证的 URL',
    description: '⚠️ 演示用，切勿在实际链接中包含密码',
    url: 'https://user:password@example.com/protected',
    tags: ['credentials', 'high-risk'],
  },
  {
    id: 'ipv6-literal',
    title: 'IPv6 字面量',
    description: '使用 IPv6 地址作为主机名',
    url: 'http://[2001:db8:85a3:8d3:1319:8a2e:370:7348]/',
    tags: ['ipv6'],
  },
  {
    id: 'mailto-link',
    title: 'mailto 链接',
    description: '邮件协议链接',
    url: 'mailto:support@example.com?subject=Help&body=Hello',
    tags: ['mailto', 'custom-scheme'],
  },
  {
    id: 'tel-link',
    title: 'tel 链接',
    description: '电话协议链接',
    url: 'tel:+8613800138000',
    tags: ['tel', 'custom-scheme'],
  },
  {
    id: 'custom-scheme',
    title: '自定义协议',
    description: 'VS Code 深度链接示例',
    url: 'vscode://file/path/to/project/src/index.js',
    tags: ['custom-scheme', 'deeplink'],
  },
  {
    id: 'complex-fragment',
    title: '复杂 Fragment',
    description: '包含复杂路径和锚点的 URL',
    url: 'https://spa.example.com/app/#/dashboard/users/123/profile?tab=security&modal=edit',
    tags: ['fragment', 'spa'],
  },
  {
    id: 'shortlink',
    title: '短链服务',
    description: '常见短链域名示例',
    url: 'https://bit.ly/3abcXYZ',
    tags: ['shortlink'],
  },
]

function getExampleById(id) {
  return EXAMPLES.find(ex => ex.id === id)
}

function getExamplesByTag(tag) {
  return EXAMPLES.filter(ex => ex.tags.includes(tag))
}

function getRandomExamples(count = 3) {
  const shuffled = [...EXAMPLES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export {
  EXAMPLES,
  getExampleById,
  getExamplesByTag,
  getRandomExamples,
}
