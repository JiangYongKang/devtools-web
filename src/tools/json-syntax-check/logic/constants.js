const JSON_STANDARD_NOTICE = `
本工具严格遵循 ECMA-404 / RFC 8259 JSON 标准，使用浏览器原生 JSON.parse 进行校验。
- 不支持：单引号字符串、尾逗号（trailing comma）、注释（// 或 /* */）
- 字符串必须使用双引号
- 数值不支持前导零（如 "0123"）和八进制/十六进制字面量
- top-level 必须是 object、array、string、number、true、false 或 null
`

const EXAMPLES = {
  VALID_OBJECT_ARRAY: `[
  {
    "id": 1,
    "name": "张三",
    "age": 28,
    "isActive": true,
    "hobbies": ["读书", "编程", "旅行"],
    "address": {
      "city": "北京",
      "district": "朝阳区"
    }
  },
  {
    "id": 2,
    "name": "李四",
    "age": 32,
    "isActive": false,
    "hobbies": ["音乐", "运动"],
    "address": {
      "city": "上海",
      "district": "浦东新区"
    }
  }
]`,

  ERROR_TRAILING_COMMA: `{
  "name": "张三",
  "age": 28,
  "hobbies": ["读书", "编程",],
}`,

  ERROR_MISSING_QUOTE: `{
  "name": 张三,
  "age": 28
}`,

  ERROR_SINGLE_QUOTE: `{
  'name': '张三',
  'age': 28
}`,

  ERROR_UNTERMINATED_STRING: `{
  "name": "张三,
  "age": 28
}`,

  ERROR_INVALID_NUMBER: `{
  "count": 0123
}`,
}

export {
  JSON_STANDARD_NOTICE,
  EXAMPLES,
}
