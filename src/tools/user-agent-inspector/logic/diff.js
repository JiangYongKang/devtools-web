function computeDiffFields(parseResult1, parseResult2) {
  const diffFields = []

  if (!parseResult1 || !parseResult2) {
    return diffFields
  }

  const table1 = parseResult1.normalizedTable || []
  const table2 = parseResult2.normalizedTable || []

  const map1 = new Map()
  const map2 = new Map()

  for (const item of table1) {
    map1.set(item.key, item)
  }

  for (const item of table2) {
    map2.set(item.key, item)
  }

  const allKeys = new Set([...map1.keys(), ...map2.keys()])

  for (const key of allKeys) {
    const item1 = map1.get(key)
    const item2 = map2.get(key)

    const value1 = item1?.value ?? null
    const value2 = item2?.value ?? null

    const exists1 = item1 != null
    const exists2 = item2 != null

    let type = 'equal'
    if (exists1 && !exists2) {
      type = 'removed'
    } else if (!exists1 && exists2) {
      type = 'added'
    } else if (value1 !== value2) {
      type = 'changed'
    }

    if (type !== 'equal') {
      diffFields.push({
        key,
        label: item1?.label || item2?.label || key,
        category: item1?.category || item2?.category || 'unknown',
        value1,
        value2,
        type,
      })
    }
  }

  return diffFields
}

function groupDiffFieldsByCategory(diffFields) {
  const groups = {}

  for (const field of diffFields) {
    const category = field.category || 'unknown'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(field)
  }

  return groups
}

function getCategoryLabel(category) {
  const labels = {
    browser: '浏览器',
    engine: '渲染引擎',
    os: '操作系统',
    device: '设备',
    bot: '爬虫',
    meta: '元数据',
    extracted: '提取字段',
    token: 'Token',
    unknown: '其他',
  }
  return labels[category] || category
}

export {
  computeDiffFields,
  groupDiffFieldsByCategory,
  getCategoryLabel,
}
