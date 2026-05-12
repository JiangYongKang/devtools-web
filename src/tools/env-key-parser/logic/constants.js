const MAX_LINE_COUNT = 1000
const MAX_LINE_LENGTH = 10000

const EXAMPLES = {
  basic: `# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp

# 服务配置
export APP_ENV=development
export LOG_LEVEL=info`,
  quotesAndComments: `# 带引号和注释的配置
API_KEY="sk-1234567890abcdef"
SECRET='my secret value'
COMMENTED=value # 这是一个行尾注释
EMPTY_VALUE=

# 嵌套引号
MESSAGE="He said \"Hello\""
SINGLE='It\\'s a test'`,
  continuation: `# 反斜杠续行示例
MULTI_LINE_KEY=first line \
second line \
third line

JSON_CONFIG={"name": "test", \
  "value": 123}`,
  duplicateKeys: `# 重复键示例
APP_NAME=MyApp
DEBUG=true
APP_NAME=OverrideApp
DEBUG=false
API_URL=http://api.example.com
APP_NAME=FinalApp`,
  full: `# 完整示例 - 包含所有特性

# 基础键值对
DB_HOST=localhost
DB_PORT=5432

# 带 export 前缀
export NODE_ENV=production
export PORT=3000

# 带引号
SECRET_KEY="your-secret-key-here"
API_TOKEN='another-token-value'

# 行尾注释
TIMEOUT=30 # 超时时间（秒）
RETRY_COUNT=5  # 重试次数

# 反斜杠续行
LONG_MESSAGE=This is a very \
long message that \
spans multiple lines

# 重复键（将被标记）
LOG_LEVEL=info
LOG_LEVEL=debug
LOG_LEVEL=warn

# 嵌套引号
DESCRIPTION="He said: \"It's working\""
PATH='C:\\Program Files\\App'`,
}

export { MAX_LINE_COUNT, MAX_LINE_LENGTH, EXAMPLES }
