import {
  flattenObject,
  unflattenObject,
  validateField,
  validateForm,
} from '../logic/formBinding.js'
import { ValidationError } from '../logic/errors.js'

describe('formBinding - flattenObject', () => {
  it('将嵌套对象扁平化为路径-值对', () => {
    const obj = {
      a: {
        b: {
          c: 'value',
        },
        d: 123,
      },
    }

    const flat = flattenObject(obj)
    expect(flat['a.b.c']).toBe('value')
    expect(flat['a.d']).toBe(123)
  })

  it('处理数组', () => {
    const obj = {
      items: [{ name: 'a' }, { name: 'b' }],
    }

    const flat = flattenObject(obj)
    expect(flat['items[0].name']).toBe('a')
    expect(flat['items[1].name']).toBe('b')
  })
})

describe('formBinding - unflattenObject', () => {
  it('将扁平对象重建为嵌套结构', () => {
    const flat = {
      'a.b.c': 'value',
      'a.d': 123,
    }

    const nested = unflattenObject(flat)
    expect(nested.a.b.c).toBe('value')
    expect(nested.a.d).toBe(123)
  })

  it('处理数组路径', () => {
    const flat = {
      'items[0].name': 'a',
      'items[1].name': 'b',
    }

    const nested = unflattenObject(flat)
    expect(nested.items[0].name).toBe('a')
    expect(nested.items[1].name).toBe('b')
  })
})

describe('formBinding - validateField', () => {
  it('验证必填字段', () => {
    const errors = validateField('', { required: true }, 'field')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].rule).toBe('required')
  })

  it('验证类型', () => {
    const errors = validateField('not a number', { type: 'number' }, 'field')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].rule).toBe('type')
  })

  it('验证数字最小值', () => {
    const errors = validateField(5, { type: 'number', min: 10 }, 'field')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].rule).toBe('min')
  })

  it('验证数字最大值', () => {
    const errors = validateField(15, { type: 'number', max: 10 }, 'field')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].rule).toBe('max')
  })

  it('验证字符串最小长度', () => {
    const errors = validateField('ab', { minLength: 5 }, 'field')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].rule).toBe('minLength')
  })

  it('验证字符串最大长度', () => {
    const errors = validateField('abcdef', { maxLength: 5 }, 'field')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].rule).toBe('maxLength')
  })

  it('验证正则表达式模式', () => {
    const errors = validateField('not-email', { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, 'field')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].rule).toBe('pattern')
  })

  it('有效值不返回错误', () => {
    const errors = validateField('test@example.com', {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    }, 'email')
    expect(errors.length).toBe(0)
  })
})

describe('formBinding - validateForm', () => {
  it('验证有效表单不抛出错误', () => {
    const formData = {
      user: {
        profile: {
          name: {
            first: 'John',
          },
          contact: {
            email: 'john@example.com',
          },
        },
      },
    }

    const schema = {
      'user.profile.name.first': { required: true, type: 'string' },
      'user.profile.contact.email': { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    }

    expect(() => validateForm(formData, schema)).not.toThrow()
  })

  it('无效表单抛出 ValidationError', () => {
    const formData = {
      user: {
        profile: {
          name: {
            first: '',
          },
          contact: {
            email: 'invalid-email',
          },
        },
      },
    }

    const schema = {
      'user.profile.name.first': { required: true, type: 'string' },
      'user.profile.contact.email': { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    }

    expect(() => validateForm(formData, schema)).toThrow(ValidationError)
  })

  it('使用通配符批量验证数组', () => {
    const formData = {
      items: [
        { qty: 5 },
        { qty: -1 },
        { qty: 10 },
      ],
    }

    const schema = {
      'items[].qty': { type: 'number', min: 0 },
    }

    try {
      validateForm(formData, schema)
      expect(false).toBe(true)
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError)
      expect(e.fieldErrors['items[1].qty']).toBeDefined()
    }
  })
})
