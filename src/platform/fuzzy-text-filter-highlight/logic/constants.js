/**
 * 编辑距离阈值（Levenshtein 距离和 Bitap 算法使用
 * @type {number}
 */
const MAX_EDIT_DISTANCE = 2

/**
 * n-gram 分词的窗口大小
 * @type {number}
 */
const NGRAM_SIZE = 2

/**
 * 默认返回结果数量限制
 * @type {number}
 */
const DEFAULT_LIMIT = 50

/**
 * 索引最大条目数限制
 * @type {number}
 */
const MAX_INDEX_ENTRIES = 100000

/**
 * 输入防抖延迟毫秒数
 * @type {number}
 */
const DEBOUNCE_DEFAULT = 150

/**
 * Worker 模式启用阈值（大于等于此数量的条目数启用 Worker
 * @type {number}
 */
const WORKER_THRESHOLD = 100000

/**
 * 保留的性能历史记录最大数量
 * @type {number}
 */
const MAX_HISTORY_SIZE = 20

/**
 * 最小查询长度阈值
 * @type {number}
 */
const MIN_QUERY_LENGTH = 1

/**
 * 连续子匹配奖励系数
 * @type {number}
 */
const CONTINUITY_BONUS = 0.3

/**
 * 前缀匹配奖励系数
 * @type {number}
 */
const PREFIX_BONUS = 0.2

/**
 * ASCII 近似字符映射表（如 o 与 0 互转
 * @type {Object.<string, string[]>}
 */
const ASCII_FOLDING_MAP = {
  '0': ['o', 'O'],
  'o': ['0'],
  'O': ['0'],
  '1': ['i', 'I', 'l', 'L'],
  'i': ['1', 'l'],
  'I': ['1', 'L'],
  'l': ['1', 'i'],
  'L': ['1', 'I'],
  '2': ['z', 'Z'],
  'z': ['2'],
  'Z': ['2'],
  '5': ['s', 'S'],
  's': ['5'],
  'S': ['5'],
  '8': ['b'],
  'b': ['8'],
}

/**
 * 默认停用词表（中英文混合）
 * @type {string[]}
 */
const STOPWORDS_DEFAULT = [
  '的', '了', '和', '是', '在', '我', '有', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '这个', '那个', '个', '之', '而', '与', '及', '或', '以', '为',
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'he', 'she', 'it', 'they', 'we', 'you', 'this', 'that', 'these', 'those', 'am', 'if', 'because', 'until', 'while', 'about', 'against'
]

/**
 * Worker 消息类型枚举
 * @type {Object.<string, string>}
 */
const WORKER_MESSAGE_TYPES = {
  INIT: 'init',
  BUILD_INDEX: 'buildIndex',
  SEARCH: 'search',
  RESULT: 'result',
  PROGRESS: 'progress',
  ERROR: 'error',
  CANCEL: 'cancel',
}

/**
 * 错误代码枚举
 * @type {Object.<string, string>}
 */
const ERROR_CODES = {
  INDEX_TOO_LARGE: 'INDEX_TOO_LARGE',
  WORKER_INIT_FAILED: 'WORKER_INIT_FAILED',
  WORKER_TIMEOUT: 'WORKER_TIMEOUT',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
}

export {
  MAX_EDIT_DISTANCE,
  NGRAM_SIZE,
  DEFAULT_LIMIT,
  MAX_INDEX_ENTRIES,
  DEBOUNCE_DEFAULT,
  WORKER_THRESHOLD,
  MAX_HISTORY_SIZE,
  MIN_QUERY_LENGTH,
  CONTINUITY_BONUS,
  PREFIX_BONUS,
  ASCII_FOLDING_MAP,
  STOPWORDS_DEFAULT,
  WORKER_MESSAGE_TYPES,
  ERROR_CODES,
}
