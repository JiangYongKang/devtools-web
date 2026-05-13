const PRERELEASE_KEYWORDS = [
  'alpha',
  'beta',
  'rc',
  'pre',
  'preview',
  'snapshot',
]

const PRERELEASE_KEYWORD_PRIORITY = {
  snapshot: 0,
  alpha: 1,
  beta: 2,
  rc: 3,
  pre: 4,
  preview: 5,
}

const RANGE_OPERATORS = [
  { symbol: '^', name: '兼容范围 (Caret)', description: '允许不改变最左侧非零位的变更' },
  { symbol: '~', name: '补丁范围 (Tilde)', description: '允许补丁级变更' },
  { symbol: '>', name: '大于', description: '严格大于指定版本' },
  { symbol: '>=', name: '大于等于', description: '大于或等于指定版本' },
  { symbol: '<', name: '小于', description: '严格小于指定版本' },
  { symbol: '<=', name: '小于等于', description: '小于或等于指定版本' },
  { symbol: '=', name: '等于', description: '精确匹配（可省略）' },
]

const SORT_KEY_OPTIONS = [
  { value: 'strict', label: '严格 semver' },
  { value: 'withBuild', label: '包含构建元数据' },
]

const TIEBREAKER_OPTIONS = [
  { value: 'insertion', label: '原始插入序' },
  { value: 'lexicographic', label: '字典序' },
]

const DELIMITER_OPTIONS = [
  { value: 'newline', label: '换行符', regex: /[\r\n]+/ },
  { value: 'comma', label: '逗号', regex: /,+/ },
  { value: 'semicolon', label: '分号', regex: /;+/ },
]

const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
}

const EXAMPLES = {
  PRERELEASE_CHAIN: `v1.0.0
1.0.1-alpha
1.0.1-alpha.1
1.0.1-beta
1.0.1-rc.1
1.0.1
1.1.0
2.0.0`,
  SAME_LENGTH_DIFF_PRERELEASE: `2.0.0-alpha
2.0.0-beta
2.0.0-rc
2.0.0-snapshot`,
  SAME_PATCH_DIFF_BUILD: `1.2.3+build.1
1.2.3+build.2
1.2.3+20240101
1.2.3`,
  MIXED_INVALID: `1.0.0
2.0.0.0
invalid
v1.2.3
1.2
1.2.3.4.5
not-a-version
3.0.0`,
  LARGE_PREVIEW: (function generateLargeSample() {
    const lines = []
    for (let major = 1; major <= 5; major++) {
      for (let minor = 0; minor <= 10; minor++) {
        for (let patch = 0; patch <= 20; patch += 5) {
          lines.push(`${major}.${minor}.${patch}`)
        }
      }
    }
    return lines.join('\n')
  })(),
}

const COMMENT_PREFIX = '#'

export {
  PRERELEASE_KEYWORDS,
  PRERELEASE_KEYWORD_PRIORITY,
  RANGE_OPERATORS,
  SORT_KEY_OPTIONS,
  TIEBREAKER_OPTIONS,
  DELIMITER_OPTIONS,
  SORT_ORDER,
  EXAMPLES,
  COMMENT_PREFIX,
}
