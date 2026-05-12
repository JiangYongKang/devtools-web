const QUOTE_CHAR = '"'

const ESCAPE_CHAR = '"'

const PRESET_DELIMITERS = {
  COMMA: ',',
  TAB: '\t',
  SEMICOLON: ';',
  PIPE: '|',
}

const INCONSISTENT_COLS_MODES = {
  ERROR: 'error',
  PAD_WITH_EMPTY: 'padWithEmpty',
  TRUNCATE: 'truncate',
}

const AUTO_DETECT_FALLBACK = {
  STRATEGY: 'useComma',
  MESSAGE: '分隔符自动探测失败，已回退为逗号 (,)',
}

const LARGE_TABLE_THRESHOLD_ROWS = 500
const LARGE_TABLE_THRESHOLD_COLS = 50
const VIRTUAL_SCROLL_VISIBLE_ROWS = 50

const EXAMPLES = {
  QUOTE_WITH_NEWLINE: `name,description,count
"Apple","A round
red fruit",100
Banana,"A yellow fruit
that is long",50
Cherry,"Small red
berry",25`,
  IRREGULAR_COLS: `header1,header2,header3
row1col1,row1col2
row2col1,row2col2,row2col3,row2col4
row3col1
row4col1,row4col2,row4col3`,
  MIXED_CONTENT: `ID,Name,"Price (USD)",Notes
1,"Apple, Inc.",199.99,"Premium 
quality"
2,"Test ""quoted"" value",49.50,"Contains ""escaped"" quotes"
3,Empty Value,0,`,
  TSV_SAMPLE: `Name\tAge\tCity
Alice\t25\tNew York
Bob\t30\tSan Francisco
Charlie\t22\tBoston`,
  LARGE_PREVIEW: generateLargeExample(),
}

function generateLargeExample() {
  const rows = []
  rows.push('col0,col1,col2,col3,col4')
  for (let i = 0; i < 200; i++) {
    rows.push(`val${i}a,val${i}b,val${i}c,val${i}d,val${i}e`)
  }
  return rows.join('\n')
}

export {
  QUOTE_CHAR,
  ESCAPE_CHAR,
  PRESET_DELIMITERS,
  INCONSISTENT_COLS_MODES,
  AUTO_DETECT_FALLBACK,
  LARGE_TABLE_THRESHOLD_ROWS,
  LARGE_TABLE_THRESHOLD_COLS,
  VIRTUAL_SCROLL_VISIBLE_ROWS,
  EXAMPLES,
}
