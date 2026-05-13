import {
  DEMO_TOOLS_COUNT,
  TOOL_STATUSES,
} from './constants.js'

function generateDemoTools(count = DEMO_TOOLS_COUNT) {
  const categories = ['格式化', '编码', '加密', '网络', '其他']
  const tagsPool = [
    'JSON', 'XML', 'HTML', 'CSS', 'SQL', 'YAML',
    'Base64', '进制', 'URL', 'Punycode',
    '哈希', '密码', 'JWT', 'PEM',
    'HTTP', 'WebSocket', 'Webhook', 'CIDR', 'IP',
  ]

  const tools = []

  for (let i = 1; i <= count; i++) {
    const id = String(i).padStart(3, '0')
    const category = categories[i % categories.length]
    const toolTags = tagsPool.filter((_, idx) => idx % (i % 5 + 1) === 0).slice(0, 3)

    tools.push({
      id,
      title: `演示工具 ${id} - ${category}`,
      summary: `这是一个${category}类别的演示工具，用于测试应用壳功能。`,
      path: `/tools/${id}`,
      tags: [...toolTags, category],
      status: i % 7 === 0 ? TOOL_STATUSES.BETA : TOOL_STATUSES.STABLE,
      source: 'demo',
    })
  }

  return tools
}

function generateInvalidEntries() {
  return [
    {},
    null,
    { id: null, title: '缺少 ID' },
    { id: 'dup01', name: '重复 ID 1' },
    { id: 'dup01', name: '重复 ID 2' },
    { id: 'bad-status', title: '错误状态', status: 'invalid' },
    { id: 'bad-tags', title: '错误 tags', tags: 'not-an-array' },
    { id: 'missing-title', summary: '没有标题' },
  ]
}

function getMergedDemoList() {
  const valid = generateDemoTools(15)
  const withDuplicates = [
    ...valid.slice(0, 5),
    { ...valid[0], title: '重复 ID 的新版本', source: 'extra' },
    { id: 'extra01', title: '额外工具 1', summary: '来自额外清单', tags: ['额外'] },
  ]

  return {
    baseList: valid,
    extraList: withDuplicates,
    invalidList: generateInvalidEntries(),
  }
}

export {
  generateDemoTools,
  generateInvalidEntries,
  getMergedDemoList,
}
