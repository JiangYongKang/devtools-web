export const TOKEN_TYPES = {
  TEXT: 'TEXT',
  VARIABLE: 'VARIABLE',
  IF_OPEN: 'IF_OPEN',
  IF_CLOSE: 'IF_CLOSE',
  EACH_OPEN: 'EACH_OPEN',
  EACH_CLOSE: 'EACH_CLOSE',
}

export const WARNING_TYPES = {
  MISSING_VARIABLE: 'MISSING_VARIABLE',
  UNUSED_VARIABLE: 'UNUSED_VARIABLE',
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  UNKNOWN_FILTER: 'UNKNOWN_FILTER',
}

export const ERROR_TYPES = {
  UNEXPECTED_TOKEN: 'UNEXPECTED_TOKEN',
  UNCLOSED_TAG: 'UNCLOSED_TAG',
  INVALID_SYNTAX: 'INVALID_SYNTAX',
  UNEXPECTED_EOF: 'UNEXPECTED_EOF',
}

export const HTML_WHITELIST = {
  tags: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'div', 'span'],
  attributes: [],
}

export const MAX_BLOCK_DEPTH = 100

export const FILTER_REGISTRY = {
  date: (value, format = 'YYYY-MM-DD') => {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) return String(value)
    return format
      .replace('YYYY', date.getFullYear())
      .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(date.getDate()).padStart(2, '0'))
      .replace('HH', String(date.getHours()).padStart(2, '0'))
      .replace('mm', String(date.getMinutes()).padStart(2, '0'))
  },
  currency: (value, symbol = '¥', decimals = 2) => {
    if (value === null || value === undefined) return ''
    const num = Number(value)
    if (isNaN(num)) return String(value)
    return `${symbol}${num.toFixed(decimals)}`
  },
  upper: (value) => {
    if (value === null || value === undefined) return ''
    return String(value).toUpperCase()
  },
  lower: (value) => {
    if (value === null || value === undefined) return ''
    return String(value).toLowerCase()
  },
  trim: (value) => {
    if (value === null || value === undefined) return ''
    return String(value).trim()
  },
  default: (value, defaultValue = '') => {
    return value === null || value === undefined || value === '' ? defaultValue : value
  },
}

export const SAMPLE_SCENARIOS = {
  orderNotification: {
    name: '订单通知',
    template: `尊敬的{{customer.name}}，

您的订单 #{{order.id}} 已确认。
下单时间：{{order.createdAt|date}}
订单金额：{{order.total|currency}}

{{#if order.items}}
订单明细：
{{#each order.items}}
- {{this.name}} x{{this.quantity}}: {{this.price|currency}}
{{/each}}
{{/if}}

感谢您的购买！
{{brand.name}} 团队`,
    context: {
      customer: { name: '张三' },
      order: {
        id: 'ORD-2024-001',
        createdAt: '2024-03-15T10:30:00',
        total: 1299.99,
        items: [
          { name: '无线耳机', quantity: 1, price: 899.99 },
          { name: '保护套', quantity: 2, price: 200 },
        ],
      },
      brand: { name: 'GoletaShop' },
    },
  },
  passwordReset: {
    name: '密码重置',
    template: `尊敬的{{user.name}}，

您正在申请重置密码。
重置链接：{{resetUrl}}
验证码：{{verificationCode|upper}}

{{#if expiresAt}}
此链接将在 {{expiresAt|date}} 失效。
{{/if}}

如果您没有发起此请求，请忽略此邮件。

此致，
{{brand.name}} 安全团队`,
    context: {
      user: { name: '李四', email: 'l***@******' },
      resetUrl: 'https://example.com/reset?token=abc123',
      verificationCode: 'xyz789',
      expiresAt: '2024-03-15T11:00:00',
      brand: { name: 'Goleta' },
    },
  },
  billingSummary: {
    name: '账单摘要',
    template: `{{customer.company}} 月度账单

账单周期：{{period.start|date}} 至 {{period.end|date}}

消费明细：
{{#each charges}}
- {{this.description}}: {{this.amount|currency}}
{{/each}}

小计：{{subtotal|currency}}
税费：{{tax|currency}}
总计：{{total|currency}}

{{#if pastDue}}
⚠️ 注意：此账单已逾期 {{daysOverdue}} 天！
{{/if}}

付款截止日期：{{dueDate|date}}`,
    context: {
      customer: { company: '科技有限公司' },
      period: { start: '2024-02-01', end: '2024-02-29' },
      charges: [
        { description: '云服务费用', amount: 5000 },
        { description: '技术支持', amount: 2000 },
        { description: '存储费用', amount: 500 },
      ],
      subtotal: 7500,
      tax: 675,
      total: 8175,
      pastDue: true,
      daysOverdue: 5,
      dueDate: '2024-03-10',
    },
  },
}
