const STANDARD_CSV = `id,name,age,email,join_date,is_active
1,Alice Smith,28,alice@example.com,2023-01-15,true
2,Bob Johnson,35,bob@example.com,2023-02-20,false
3,Carol Williams,42,carol@example.com,2023-03-10,true
4,David Brown,31,david@example.com,2023-04-05,true
5,Eva Davis,26,eva@example.com,2023-05-12,false`

const EUROPEAN_CSV = `id;name;age;salary;join_date
1;Anna Müller;28;45.500,50;2023-01-15
2;Jean Dupont;35;52.300,75;2023-02-20
3;Hans Schmidt;42;61.800,00;2023-03-10
4;Maria Garcia;31;48.200,25;2023-04-05
5;Luca Rossi;26;43.900,00;2023-05-12`

const MIXED_WITH_ERRORS = `id,name,value,date,notes
1,"Valid quoted",100,2023-01-01,"Good row"
2,Unterminated quote start,"123,2023-02-02,"This has an unclosed quote
3,Wrong column count
4,Valid row again,456,2023-04-04,"Has UTF-8 � replacement char"
5,Duplicate key,789,2023-05-05,"Another good row"
5,Duplicate key again,999,2023-06-06,"Same ID as above"
6,Big number,9007199254740993,2023-07-07,"Exceeds MAX_SAFE_INTEGER"
7,Empty columns,,2023-08-08,"Previous column was empty"
8,Tab\tseparator,555,2023-09-09,"Has tab in text"`

function getExample(name) {
  switch (name) {
    case 'standard':
      return STANDARD_CSV
    case 'european':
      return EUROPEAN_CSV
    case 'errors':
      return MIXED_WITH_ERRORS
    default:
      return STANDARD_CSV
  }
}

export {
  STANDARD_CSV,
  EUROPEAN_CSV,
  MIXED_WITH_ERRORS,
  getExample,
}
