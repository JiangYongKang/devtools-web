const TIMEZONE_OPTIONS = {
  UTC: 'UTC',
  LOCAL: 'local',
}

const LOG_LEVELS = [
  { name: 'TRACE', patterns: ['TRACE', 'trace', 'Trce', 'trce', 'TRC', 'trc'] },
  { name: 'DEBUG', patterns: ['DEBUG', 'debug', 'Dbg', 'dbg', 'DBG', 'D'] },
  { name: 'INFO', patterns: ['INFO', 'info', 'Inf', 'inf', 'INF', 'I', 'Information', 'information'] },
  { name: 'WARN', patterns: ['WARN', 'warn', 'Warning', 'warning', 'WRN', 'wrn', 'W'] },
  { name: 'ERROR', patterns: ['ERROR', 'error', 'Err', 'err', 'ERR', 'E'] },
  { name: 'FATAL', patterns: ['FATAL', 'fatal', 'Ftl', 'ftl', 'FTL', 'F', 'CRITICAL', 'critical', 'CRIT', 'crit'] },
]

const UNMATCHED_REASONS = {
  NO_LEVEL: '未匹配到日志级别',
  NO_TIME: '未匹配到时间戳',
  NEITHER: '未匹配到级别和时间戳',
  ILLEGAL_TIME: '时间戳格式不合法',
}

const EXAMPLES = {
  SIMPLE_LEVEL_PREFIX: `INFO Server started on port 8080
DEBUG Initializing database connection
WARN Memory usage exceeds 80%
ERROR Failed to process request
FATAL System shutdown
INFO User login successful
TRACE Detailed trace information`,

  JSON_LINE_LOG: `{"timestamp":"2025-05-10T14:30:01.123Z","level":"INFO","message":"Server started","port":8080}
{"time":"2025-05-10T14:30:02.456+08:00","level":"DEBUG","msg":"DB connected","host":"localhost"}
{"timestamp":"2025-05-10 14:30:03","level":"WARN","message":"High CPU usage","cpu":95}
{"ts":"2025-05-10T14:30:04","level":"ERROR","message":"Request timeout","path":"/api/users"}
{"level":"FATAL","timestamp":1715351405000,"message":"Out of memory"}`,

  NGINX_ACCESS: `127.0.0.1 - - [10/May/2025:14:30:01 +0800] "GET /index.html HTTP/1.1" 200 1234
192.168.1.100 - admin [10/May/2025:14:30:02 +0800] "POST /api/login HTTP/1.1" 200 567
10.0.0.5 - - [10/May/2025:14:30:03 +0800] "GET /api/users HTTP/1.1" 404 128
172.16.0.1 - - [10/May/2025:14:30:04 +0800] "PUT /api/data HTTP/1.1" 500 256`,

  KEY_VALUE_FORMAT: `level=INFO time="2025-05-10T14:30:01Z" msg="Application started"
level=DEBUG time="2025-05-10 14:30:02" module=database msg="Connection pool initialized"
level=WARN time=2025-05-10T14:30:03+08:00 msg="Slow query detected" duration=2.5s
level=ERROR time="2025-05-10T14:30:04.123456789Z" error="connection refused"`,

  ISO8601_TIMESTAMP: `2025-05-10T14:30:01Z INFO Processing request
2025-05-10T14:30:02.123+08:00 DEBUG Cache hit
2025-05-10T14:30:03,456 WARN Rate limit approaching
2025-05-10 14:30:04 ERROR Database timeout
2025-05-10T14:30:05.123456789+00:00 INFO Request completed`,

  MIXED_FORMATS: `[2025-05-10 14:30:01] INFO: Server started successfully
2025-05-10T14:30:02.123Z DEBUG Connection established
May 10 14:30:03 localhost WARN[1234]: High memory usage
level=ERROR time=2025-05-10T14:30:04+08:00 msg="Failed to save"
{"ts":"2025-05-10T14:30:05","lvl":"INFO","msg":"Done"}
This is a plain text line without format
127.0.0.1 - - [10/May/2025:14:30:06 +0800] "GET / HTTP/1.1" 200 100`,
}

export {
  TIMEZONE_OPTIONS,
  LOG_LEVELS,
  UNMATCHED_REASONS,
  EXAMPLES,
}
