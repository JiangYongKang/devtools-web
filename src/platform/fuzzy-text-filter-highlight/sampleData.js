/**
 * 技术文档标题示例数据集（20条）
 * 用于演示模糊搜索对技术词汇的匹配能力
 * @type {Array<{id: string, text: string, tags: Array<string>>}
 */
const technicalTitles = [
  { id: '1', text: 'React Hooks 深度解析', tags: ['React', 'JavaScript', 'Hooks'] },
  { id: '2', text: 'TypeScript 类型体操完全指南', tags: ['TypeScript', '类型系统'] },
  { id: '3', text: 'Node.js 性能优化实战', tags: ['Node.js', '性能', '后端'] },
  { id: '4', text: 'CSS Grid 布局详解', tags: ['CSS', '布局', '前端'] },
  { id: '5', text: 'WebAssembly 入门到精通', tags: ['WASM', 'WebAssembly', '性能'] },
  { id: '6', text: 'GraphQL 服务端开发', tags: ['GraphQL', 'API', '后端'] },
  { id: '7', text: 'Docker 容器化部署实践', tags: ['Docker', 'DevOps', '部署'] },
  { id: '8', text: 'Kubernetes 集群管理', tags: ['K8s', 'Kubernetes', '集群'] },
  { id: '9', text: 'Redis 缓存设计模式', tags: ['Redis', '缓存', '数据库'] },
  { id: '10', text: 'MongoDB 聚合管道详解', tags: ['MongoDB', '数据库', 'NoSQL'] },
  { id: '11', text: 'Vue 3 Composition API 实战', tags: ['Vue', 'JavaScript', '前端'] },
  { id: '12', text: 'Angular 信号系统深度解析', tags: ['Angular', '信号', '前端'] },
  { id: '13', text: 'Rust 编程语言入门', tags: ['Rust', '编程语言', '系统'] },
  { id: '14', text: 'Go 语言并发编程', tags: ['Go', 'Golang', '并发'] },
  { id: '15', text: 'Python 数据分析实战', tags: ['Python', '数据分析', 'Pandas'] },
  { id: '16', text: '机器学习算法原理', tags: ['ML', '机器学习', '算法'] },
  { id: '17', text: '深度学习神经网络', tags: ['DL', '深度学习', '神经网络'] },
  { id: '18', text: '微服务架构设计模式', tags: ['微服务', '架构', '设计模式'] },
  { id: '19', text: 'DDD 领域驱动设计', tags: ['DDD', '领域驱动', '架构'] },
  { id: '20', text: '事件驱动架构实战', tags: ['EDA', '事件驱动', '架构'] },
]

/**
 * 代码符号表示例数据集（20条）
 * 用于演示模糊搜索对 API 名称的匹配能力
 * @type {Array<{id: string, text: string, tags: Array<string>>}
 */
const codeSymbols = [
  { id: '101', text: 'useState - React状态钩子', tags: ['React', 'Hook', '状态'] },
  { id: '102', text: 'useEffect - React副作用钩子', tags: ['React', 'Hook', '副作用'] },
  { id: '103', text: 'useMemo - React记忆化钩子', tags: ['React', 'Hook', '性能'] },
  { id: '104', text: 'useCallback - React回调记忆化', tags: ['React', 'Hook', '性能'] },
  { id: '105', text: 'useContext - React上下文钩子', tags: ['React', 'Hook', '上下文'] },
  { id: '106', text: 'useReducer - React状态管理', tags: ['React', 'Hook', '状态管理'] },
  { id: '107', text: 'useRef - React引用钩子', tags: ['React', 'Hook', '引用'] },
  { id: '108', text: 'useImperativeHandle - React暴露实例', tags: ['React', 'Hook', '实例'] },
  { id: '109', text: 'useLayoutEffect - React布局副作用', tags: ['React', 'Hook', '布局'] },
  { id: '110', text: 'useDebugValue - React调试工具', tags: ['React', 'Hook', '调试'] },
  { id: '111', text: 'Promise - JavaScript异步编程', tags: ['JavaScript', '异步', 'Promise'] },
  { id: '112', text: 'async/await - JavaScript异步语法', tags: ['JavaScript', '异步', '语法'] },
  { id: '113', text: 'Map - 键值对集合', tags: ['JavaScript', '数据结构', '集合'] },
  { id: '114', text: 'Set - 唯一值集合', tags: ['JavaScript', '数据结构', '集合'] },
  { id: '115', text: 'WeakMap - 弱引用映射', tags: ['JavaScript', '数据结构', '弱引用'] },
  { id: '116', text: 'Proxy - 对象代理', tags: ['JavaScript', '元编程', '代理'] },
  { id: '117', text: 'Reflect - 反射API', tags: ['JavaScript', '元编程', '反射'] },
  { id: '118', text: 'Generator - 生成器函数', tags: ['JavaScript', '迭代器', '生成器'] },
  { id: '119', text: 'Iterator - 迭代器协议', tags: ['JavaScript', '迭代器', '协议'] },
  { id: '120', text: 'Symbol - 唯一标识符', tags: ['JavaScript', '基础', '标识符'] },
]

/**
 * 含错别字关键词示例数据集（20条）
 * 用于演示模糊搜索对拼写错误的容错能力
 * @type {Array<{id: string, text: string, tags: Array<string>>}
 */
const typosKeywords = [
  { id: '201', text: 'JacaScript 入门教程', tags: ['错别字', 'JavaScript'] },
  { id: '202', text: 'TypeScirpt 类型系统', tags: ['错别字', 'TypeScript'] },
  { id: '203', text: 'Nodejs 服务端开发', tags: ['错别字', 'Node.js'] },
  { id: '204', text: 'Reat 框架基础', tags: ['错别字', 'React'] },
  { id: '205', text: 'Veu 响应式原理', tags: ['错别字', 'Vue'] },
  { id: '206', text: 'Angualr 组件化', tags: ['错别字', 'Angular'] },
  { id: '207', text: 'Pyhton 数据分析', tags: ['错别字', 'Python'] },
  { id: '208', text: 'Ruts 所有权系统', tags: ['错别字', 'Rust'] },
  { id: '209', text: 'Doker 容器化技术', tags: ['错别字', 'Docker'] },
  { id: '210', text: 'Kubernets 编排', tags: ['错别字', 'Kubernetes'] },
  { id: '211', text: 'Redius 缓存应用', tags: ['错别字', 'Redis'] },
  { id: '212', text: 'MogoDB 数据库', tags: ['错别字', 'MongoDB'] },
  { id: '213', text: 'GrapQL 查询语言', tags: ['错别字', 'GraphQL'] },
  { id: '214', text: 'WebAsembly 性能优化', tags: ['错别字', 'WebAssembly'] },
  { id: '215', text: 'CSS Grid 布具详解', tags: ['错别字', '布局'] },
  { id: '216', text: '微服务架够设计', tags: ['错别字', '架构'] },
  { id: '217', text: '领域驱东设计', tags: ['错别字', 'DDD'] },
  { id: '218', text: '事件驱东架构', tags: ['错别字', 'EDA'] },
  { id: '219', text: '机器学习算发', tags: ['错别字', '算法'] },
  { id: '220', text: '深度学系神经网络', tags: ['错别字', '深度学习'] },
]

/**
 * 生成大规模测试数据集（用于演示 Web Worker 性能）
 * @param {number} [count=100000] - 数据条数
 * @returns {Array<{id: string, text: string, tags: Array<string>>} 生成的数据集
 */
function generateLargeData(count = 100000) {
  const prefixes = ['高级', '深入', '实战', '入门', '精通', '详解', '指南', '原理', '模式', '最佳']
  const topics = ['React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Go', 'Rust', 'Docker', 'Kubernetes', 'Redis', 'MongoDB', 'GraphQL', 'CSS', 'HTML', 'WebAssembly']
  const suffixes = ['开发', '编程', '设计', '优化', '部署', '架构', '管理', '分析', '学习', '应用']
  const tagPool = ['前端', '后端', '全栈', '性能', '架构', '数据库', 'DevOps', 'AI', '机器学习', '云计算']

  const result = []
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const topic = topics[Math.floor(Math.random() * topics.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    const tagCount = Math.floor(Math.random() * 3) + 1
    const tags = []
    for (let j = 0; j < tagCount; j++) {
      const tag = tagPool[Math.floor(Math.random() * tagPool.length)]
      if (!tags.includes(tag)) tags.push(tag)
    }

    result.push({
      id: `large-${i}`,
      text: `${prefix}${topic}${suffix}`,
      tags,
    })
  }

  return result
}

/**
 * 导出搜索结果为 JSON 文件
 * @param {Array} results - 要导出的搜索结果
 * @param {string} [filename='search-results.json'] - 导出文件名
 */
function exportResultsToJSON(results, filename = 'search-results.json') {
  const data = JSON.stringify(results, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export {
  technicalTitles,
  codeSymbols,
  typosKeywords,
  generateLargeData,
  exportResultsToJSON,
}
