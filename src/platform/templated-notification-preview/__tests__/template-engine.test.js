import { tokenize } from '../logic/tokenizer'
import { parse, parseVariableExpression } from '../logic/parser'
import { render, isFalsy, resolvePath, applyFilters } from '../logic/renderer'
import { compileTemplate } from '../logic'
import { TOKEN_TYPES } from '../logic/constants'

describe('Template Engine - Tokenizer', () => {
  test('应该正确分词纯文本', () => {
    const template = 'Hello World'
    const tokens = tokenize(template)
    expect(tokens).toHaveLength(1)
    expect(tokens[0].type).toBe(TOKEN_TYPES.TEXT)
    expect(tokens[0].value).toBe('Hello World')
  })

  test('应该正确分词简单变量', () => {
    const template = 'Hello {{name}}!'
    const tokens = tokenize(template)
    expect(tokens).toHaveLength(3)
    expect(tokens[1].type).toBe(TOKEN_TYPES.VARIABLE)
    expect(tokens[1].value).toBe('name')
  })

  test('应该正确分词嵌套路径变量', () => {
    const template = '{{user.profile.name}}'
    const tokens = tokenize(template)
    expect(tokens).toHaveLength(1)
    expect(tokens[0].value).toBe('user.profile.name')
  })

  test('应该正确分词带过滤器的变量', () => {
    const template = '{{createdAt|date}}'
    const tokens = tokenize(template)
    expect(tokens).toHaveLength(1)
    expect(tokens[0].value).toBe('createdAt|date')
  })

  test('应该正确分词if块', () => {
    const template = '{{#if condition}}content{{/if}}'
    const tokens = tokenize(template)
    expect(tokens).toHaveLength(3)
    expect(tokens[0].type).toBe(TOKEN_TYPES.IF_OPEN)
    expect(tokens[1].type).toBe(TOKEN_TYPES.TEXT)
    expect(tokens[2].type).toBe(TOKEN_TYPES.IF_CLOSE)
  })

  test('应该正确分词each块', () => {
    const template = '{{#each items}}item{{/each}}'
    const tokens = tokenize(template)
    expect(tokens).toHaveLength(3)
    expect(tokens[0].type).toBe(TOKEN_TYPES.EACH_OPEN)
    expect(tokens[2].type).toBe(TOKEN_TYPES.EACH_CLOSE)
  })

  test('应该记录正确的行列位置', () => {
    const template = 'Line1\n{{var}}'
    const tokens = tokenize(template)
    expect(tokens[0].line).toBe(1)
    expect(tokens[1].line).toBe(2)
  })
})

describe('Template Engine - Parser', () => {
  test('应该解析变量表达式', () => {
    const result = parseVariableExpression('user.name|date|upper')
    expect(result.path).toBe('user.name')
    expect(result.filters).toHaveLength(2)
    expect(result.filters[0].name).toBe('date')
    expect(result.filters[1].name).toBe('upper')
  })

  test('应该解析纯文本AST', () => {
    const tokens = [{ type: TOKEN_TYPES.TEXT, value: 'Hello', line: 1, column: 1 }]
    const ast = parse(tokens)
    expect(ast.children).toHaveLength(1)
    expect(ast.children[0].value).toBe('Hello')
  })

  test('应该解析嵌套if块', () => {
    const tokens = [
      { type: TOKEN_TYPES.IF_OPEN, value: 'show', line: 1, column: 1 },
      { type: TOKEN_TYPES.TEXT, value: 'Content', line: 1, column: 1 },
      { type: TOKEN_TYPES.IF_CLOSE, value: 'if', line: 1, column: 1 },
    ]
    const ast = parse(tokens)
    expect(ast.children[0].type).toBe('IF_BLOCK')
    expect(ast.children[0].condition).toBe('show')
  })

  test('应该解析each块', () => {
    const tokens = [
      { type: TOKEN_TYPES.EACH_OPEN, value: 'items', line: 1, column: 1 },
      { type: TOKEN_TYPES.TEXT, value: '- ', line: 1, column: 1 },
      { type: TOKEN_TYPES.EACH_CLOSE, value: 'each', line: 1, column: 1 },
    ]
    const ast = parse(tokens)
    expect(ast.children[0].type).toBe('EACH_BLOCK')
    expect(ast.children[0].listPath).toBe('items')
  })
})

describe('Template Engine - Renderer', () => {
  test('should handle falsy values correctly', () => {
    expect(isFalsy(false)).toBe(true)
    expect(isFalsy(0)).toBe(true)
    expect(isFalsy('')).toBe(true)
    expect(isFalsy(null)).toBe(true)
    expect(isFalsy(undefined)).toBe(true)
    expect(isFalsy('hello')).toBe(false)
    expect(isFalsy(1)).toBe(false)
    expect(isFalsy([])).toBe(false)
    expect(isFalsy({})).toBe(false)
  })

  test('should resolve nested paths', () => {
    const context = { user: { profile: { name: 'John' } } }
    expect(resolvePath(context, 'user.profile.name')).toBe('John')
    expect(resolvePath(context, 'user.nonexistent')).toBeUndefined()
    expect(resolvePath(context, 'nonexistent')).toBeUndefined()
  })

  test('should render simple variable', () => {
    const tokens = [{ type: TOKEN_TYPES.VARIABLE, value: 'name', line: 1, column: 1 }]
    const ast = parse(tokens)
    const context = { name: 'World' }
    const warnings = []
    const result = render(ast, context)
    expect(result.output).toBe('World')
  })

  test('should render nested path variable', () => {
    const tokens = [{ type: TOKEN_TYPES.VARIABLE, value: 'user.name', line: 1, column: 1 }]
    const ast = parse(tokens)
    const context = { user: { name: 'John' } }
    const result = render(ast, context)
    expect(result.output).toBe('John')
  })

  test('should handle missing variables with warnings', () => {
    const tokens = [{ type: TOKEN_TYPES.VARIABLE, value: 'missing', line: 1, column: 1 }]
    const ast = parse(tokens)
    const context = {}
    const result = render(ast, context)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].type).toBe('MISSING_VARIABLE')
  })

  test('should render if block when condition is truthy', () => {
    const template = '{{#if show}}Hello{{/if}}'
    const result = compileTemplate(template, { show: true })
    expect(result.output).toBe('Hello')
  })

  test('should not render if block when condition is falsy', () => {
    const template = '{{#if show}}Hello{{/if}}'
    const result = compileTemplate(template, { show: false })
    expect(result.output).toBe('')
  })

  test('should handle each with empty array', () => {
    const template = '{{#each items}}{{this}}{{/each}}'
    const result = compileTemplate(template, { items: [] })
    expect(result.output).toBe('')
  })

  test('should handle each with non-array value', () => {
    const template = '{{#each items}}{{this}}{{/each}}'
    const result = compileTemplate(template, { items: 'not array' })
    expect(result.warnings.some(w => w.type === 'TYPE_MISMATCH')).toBe(true)
  })

  test('should render each block with array', () => {
    const template = '{{#each items}}{{this}}{{/each}}'
    const result = compileTemplate(template, { items: ['a', 'b', 'c'] })
    expect(result.output).toBe('abc')
  })

  test('should handle boolean concatenation warning', () => {
    const template = '{{isActive}}'
    const result = compileTemplate(template, { isActive: true })
    expect(result.warnings.some(w => w.type === 'TYPE_MISMATCH')).toBe(true)
  })
})

describe('Template Engine - Filters', () => {
  test('should apply date filter', () => {
    const template = '{{date|date}}'
    const result = compileTemplate(template, { date: '2024-03-15' })
    expect(result.output).toContain('2024')
  })

  test('should apply currency filter', () => {
    const template = '{{price|currency}}'
    const result = compileTemplate(template, { price: 99.99 })
    expect(result.output).toContain('¥')
    expect(result.output).toContain('99.99')
  })

  test('should apply upper filter', () => {
    const template = '{{text|upper}}'
    const result = compileTemplate(template, { text: 'hello' })
    expect(result.output).toBe('HELLO')
  })

  test('should apply lower filter', () => {
    const template = '{{text|lower}}'
    const result = compileTemplate(template, { text: 'HELLO' })
    expect(result.output).toBe('hello')
  })

  test('should apply trim filter', () => {
    const template = '{{text|trim}}'
    const result = compileTemplate(template, { text: '  hello  ' })
    expect(result.output).toBe('hello')
  })

  test('should handle unknown filter gracefully', () => {
    const template = '{{text|nonexistent}}'
    const result = compileTemplate(template, { text: 'hello' })
    expect(result.warnings.some(w => w.type === 'UNKNOWN_FILTER')).toBe(true)
  })

  test('should chain multiple filters', () => {
    const template = '{{text|trim|upper}}'
    const result = compileTemplate(template, { text: '  hello  ' })
    expect(result.output).toBe('HELLO')
  })
})

describe('Template Engine - Error Handling', () => {
  test('should detect unclosed tags', () => {
    const template = '{{#if condition}}Hello'
    const result = compileTemplate(template, {})
    expect(result.success).toBe(false)
  })

  test('should handle syntax errors gracefully', () => {
    const template = '{{invalid'
    const result = compileTemplate(template, {})
    expect(result.success).toBeDefined()
  })

  test('should include line and column in error', () => {
    const template = 'Line1\n{{#if test}}Error'
    const result = compileTemplate(template, {})
    if (!result.success) {
      expect(result.error.line).toBeDefined()
      expect(result.error.column).toBeDefined()
    }
  })
})

describe('Template Engine - Integration', () => {
  test('should render order notification template', () => {
    const template = `尊敬的{{customer.name}}，
您的订单 #{{order.id}} 已确认。
下单时间：{{order.createdAt|date}}
订单金额：{{order.total|currency}}`

    const context = {
      customer: { name: '张三' },
      order: {
        id: 'ORD-001',
        createdAt: '2024-03-15',
        total: 99.99,
      },
    }

    const result = compileTemplate(template, context)
    expect(result.success).toBe(true)
    expect(result.output).toContain('张三')
    expect(result.output).toContain('ORD-001')
    expect(result.output).toContain('¥')
  })

  test('should render conditional each block', () => {
    const template = `{{#if hasItems}}
{{#each items}}- {{this.name}}
{{/each}}{{/if}}`

    const context = {
      hasItems: true,
      items: [{ name: 'Item1' }, { name: 'Item2' }],
    }

    const result = compileTemplate(template, context)
    expect(result.success).toBe(true)
    expect(result.output).toContain('Item1')
    expect(result.output).toContain('Item2')
  })

  test('should handle complex nested structure', () => {
    const template = `{{#if show}}
{{#each users}}
{{this.name}}: {{this.age}}
{{/each}}{{/if}}`

    const context = {
      show: true,
      users: [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
      ],
    }

    const result = compileTemplate(template, context)
    expect(result.success).toBe(true)
    expect(result.output).toContain('Alice')
    expect(result.output).toContain('Bob')
  })
})
