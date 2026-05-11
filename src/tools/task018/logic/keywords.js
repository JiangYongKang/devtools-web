const STANDARD_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING', 'JOIN', 'INNER',
  'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON', 'AS', 'DISTINCT', 'ALL', 'UNION',
  'INTERSECT', 'EXCEPT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN', 'MODIFY', 'RENAME', 'CONSTRAINT',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'INDEX',
  'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION', 'RETURNS', 'BEGIN', 'END', 'IF', 'ELSE',
  'WHILE', 'FOR', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'CONVERT', 'EXISTS',
  'ANY', 'SOME', 'ALL', 'WITH', 'RECURSIVE', 'UNION', 'INTERSECT', 'EXCEPT', 'TOP',
  'PERCENT', 'WITH', 'TIES', 'OFFSET', 'FETCH', 'NEXT', 'FIRST', 'ONLY',
])

const MYSQL_KEYWORDS = new Set([
  ...STANDARD_KEYWORDS,
  'SHOW', 'DESCRIBE', 'EXPLAIN', 'USE', 'DATABASE', 'SCHEMA', 'ENGINE', 'AUTO_INCREMENT',
  'LIMIT', 'OFFSET', 'REPLACE', 'ON', 'DUPLICATE', 'KEY', 'UPDATE', 'IGNORE', 'FORCE',
  'STRAIGHT_JOIN', 'SQL_SMALL_RESULT', 'SQL_BIG_RESULT', 'SQL_BUFFER_RESULT',
  'SQL_CACHE', 'SQL_NO_CACHE', 'SQL_CALC_FOUND_ROWS',
])

const POSTGRESQL_KEYWORDS = new Set([
  ...STANDARD_KEYWORDS,
  'RETURNING', 'ILIKE', 'SIMILAR', 'TO', 'DISTINCT', 'ON', 'LIMIT', 'OFFSET', 'FETCH',
  'FIRST', 'NEXT', 'ONLY', 'WITH', 'RECURSIVE', 'MATERIALIZED', 'UNLOGGED',
  'TEMPORARY', 'TEMP', 'TABLESPACE', 'PARTITION', 'BY', 'RANGE', 'LIST', 'HASH',
])

const SQLITE_KEYWORDS = new Set([
  ...STANDARD_KEYWORDS,
  'AUTOINCREMENT', 'VACUUM', 'ATTACH', 'DETACH', 'REINDEX', 'ANALYZE', 'EXPLAIN',
  'QUERY', 'PLAN', 'PRAGMA', 'TEMP', 'TEMPORARY', 'GLOB', 'REGEXP', 'MATCH',
])

const ORACLE_KEYWORDS = new Set([
  ...STANDARD_KEYWORDS,
  'ROWNUM', 'ROWID', 'CONNECT', 'BY', 'PRIOR', 'START', 'WITH', 'MINUS', 'INTERSECT',
  'UNION', 'ALL', 'SYSDATE', 'SYSTIMESTAMP', 'CURRENT_TIMESTAMP', 'SEQUENCE',
  'NEXTVAL', 'CURRVAL', 'PACKAGE', 'BODY', 'TRIGGER', 'EXCEPTION', 'WHEN', 'OTHERS',
])

const SQLSERVER_KEYWORDS = new Set([
  ...STANDARD_KEYWORDS,
  'TOP', 'PERCENT', 'WITH', 'TIES', 'OFFSET', 'FETCH', 'NEXT', 'FIRST', 'ONLY',
  'IDENTITY', 'IDENTITY_INSERT', 'NOLOCK', 'ROWLOCK', 'PAGLOCK', 'TABLOCK',
  'XLOCK', 'UPDLOCK', 'HOLDLOCK', 'READPAST', 'READCOMMITTED', 'REPEATABLEREAD',
  'SERIALIZABLE', 'SNAPSHOT', 'READUNCOMMITTED',
])

const DIALECT_KEYWORDS = {
  standard: STANDARD_KEYWORDS,
  mysql: MYSQL_KEYWORDS,
  postgresql: POSTGRESQL_KEYWORDS,
  sqlite: SQLITE_KEYWORDS,
  oracle: ORACLE_KEYWORDS,
  sqlserver: SQLSERVER_KEYWORDS,
}

const TOKEN_TYPES = {
  KEYWORD: 'keyword',
  IDENTIFIER: 'identifier',
  STRING: 'string',
  NUMBER: 'number',
  OPERATOR: 'operator',
  PUNCTUATION: 'punctuation',
  COMMENT: 'comment',
  COMMENT_LINE: 'comment_line',
  WHITESPACE: 'whitespace',
  FUNCTION: 'function',
}

function isKeyword(word, dialect = 'standard') {
  const keywords = DIALECT_KEYWORDS[dialect] || STANDARD_KEYWORDS
  return keywords.has(word.toUpperCase())
}

function getKeywordsForDialect(dialect = 'standard') {
  return DIALECT_KEYWORDS[dialect] || STANDARD_KEYWORDS
}

function applyKeywordCase(word, keywordCase) {
  switch (keywordCase) {
    case 'upper':
      return word.toUpperCase()
    case 'lower':
      return word.toLowerCase()
    case 'preserve':
    default:
      return word
  }
}

export {
  STANDARD_KEYWORDS,
  MYSQL_KEYWORDS,
  POSTGRESQL_KEYWORDS,
  SQLITE_KEYWORDS,
  ORACLE_KEYWORDS,
  SQLSERVER_KEYWORDS,
  DIALECT_KEYWORDS,
  TOKEN_TYPES,
  isKeyword,
  getKeywordsForDialect,
  applyKeywordCase,
}
