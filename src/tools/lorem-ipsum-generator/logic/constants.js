const GENERATION_MODES = {
  BY_PARAGRAPHS: 'by-paragraphs',
  BY_WORD_COUNT: 'by-word-count',
}

const PARAGRAPH_SEPARATION = {
  SINGLE_NEWLINE: 'single-newline',
  DOUBLE_NEWLINE: 'double-newline',
  HTML_PARAGRAPH: 'html-p',
}

const COUNT_MODES = {
  EXCLUDE_SPACES: 'exclude-spaces',
  INCLUDE_SPACES: 'include-spaces',
}

const SEED_MODES = {
  FIXED: 'fixed',
  RANDOM: 'random',
}

const MIN_PARAGRAPHS = 1
const MAX_PARAGRAPHS = 200

const MIN_WORDS_PER_PARAGRAPH = 1
const MAX_WORDS_PER_PARAGRAPH = 1000

const MIN_TOTAL_WORDS = 1
const MAX_TOTAL_WORDS = 50000

const MAX_PRODUCT = 50000

const STANDARD_SENTENCE_POOL = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
  'Nunc eget lorem dolor. Sed viverra tellus in hac habitasse platea dictumst.',
  'Vestibulum morbi blandit cursus risus at ultrices mi tempus imperdiet.',
  'Nulla malesuada pellentesque elit eget gravida cum sociis natoque.',
  'Sagittis id consectetur purus ut faucibus pulvinar elementum integer.',
  'Tincidunt praesent semper feugiat nibh sed pulvinar proin gravida.',
  'Egestas purus viverra accumsan in nisl nisi scelerisque eu.',
  'Tristique risus nec feugiat in fermentum posuere urna nec.',
  'Cursus vitae congue mauris rhoncus aenean vel elit scelerisque.',
  'Felis bibendum ut tristique et egestas quis ipsum suspendisse.',
  'Venenatis a condimentum vitae sapien pellentesque habitant morbi tristique.',
  'Fames ac turpis egestas integer eget aliquet nibh praesent.',
  'Consequat nisl vel pretium lectus quam id leo in vitae.',
  'Lacus vel facilisis volutpat est velit egestas dui id ornare.',
  'Et malesuada fames ac turpis egestas maecenas pharetra convallis posuere.',
  'Quam elementum pulvinar etiam non quam lacus suspendisse faucibus.',
  'Aliquam ut porttitor leo a diam sollicitudin tempor id eu.',
  'Amet consectetur adipiscing elit duis tristique sollicitudin nibh sit amet.',
  'Scelerisque in dictum non consectetur a erat nam at lectus.',
  'Sit amet dictum sit amet justo donec enim diam vulputate.',
  'Ut tellus elementum sagittis vitae et leo duis ut.',
  'Ac orci phasellus egestas tellus rutrum tellus pellentesque eu tincidunt.',
  'Suspendisse sed nisi lacus sed viverra tellus in hac habitasse.',
  'Risus quis varius quam quisque id diam vel quam elementum.',
  'Nisl rhoncus mattis rhoncus urna neque viverra justo nec ultrices.',
  'Fringilla urna porttitor rhoncus dolor purus non enim praesent.',
]

const STANDARD_WORD_POOL = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'pellentesque', 'nunc',
  'eget', 'viverra', 'tellus', 'hac', 'habitasse', 'platea', 'dictumst',
  'vestibulum', 'morbi', 'blandit', 'cursus', 'risus', 'at', 'ultrices', 'mi',
  'tempus', 'imperdiet', 'nulla', 'malesuada', 'gravida', 'cum', 'sociis',
  'natoque', 'sagittis', 'purus', 'faucibus', 'pulvinar', 'elementum', 'integer',
  'tincidunt', 'praesent', 'semper', 'feugiat', 'nibh', 'egestas', 'accumsan',
  'nisl', 'scelerisque', 'eu', 'tristique', 'fermentum', 'posuere', 'urna',
  'rhoncus', 'aenean', 'felis', 'bibendum', 'venenatis', 'condimentum', 'sapien',
  'habitant', 'fames', 'turpis', 'aliquet', 'pretium', 'lectus', 'leo',
  'facilisis', 'volutpat', 'ornare', 'pharetra', 'convallis', 'suspendisse',
  'aliquam', 'porttitor', 'diam', 'sollicitudin', 'justo', 'donec', 'vulputate',
  'orci', 'phasellus', 'rutrum', 'mattis', 'neque', 'fringilla',
]

const EXAMPLES = {
  SHORT_PARAGRAPHS: {
    mode: GENERATION_MODES.BY_PARAGRAPHS,
    params: {
      paragraphCount: 3,
      wordsPerParagraph: 30,
      includeTitle: false,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    },
    label: '3段短文（每段30词）',
  },
  LONG_PARAGRAPHS: {
    mode: GENERATION_MODES.BY_PARAGRAPHS,
    params: {
      paragraphCount: 10,
      wordsPerParagraph: 100,
      includeTitle: true,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    },
    label: '10段长文（每段100词 + 标题）',
  },
  FIXED_WORD_COUNT: {
    mode: GENERATION_MODES.BY_WORD_COUNT,
    params: {
      totalWords: 500,
      includeTitle: false,
      paragraphSeparation: PARAGRAPH_SEPARATION.SINGLE_NEWLINE,
    },
    label: '固定500词',
  },
  HTML_FORMAT: {
    mode: GENERATION_MODES.BY_PARAGRAPHS,
    params: {
      paragraphCount: 5,
      wordsPerParagraph: 50,
      includeTitle: true,
      paragraphSeparation: PARAGRAPH_SEPARATION.HTML_PARAGRAPH,
    },
    label: 'HTML格式（5段+标题）',
  },
}

export {
  GENERATION_MODES,
  PARAGRAPH_SEPARATION,
  COUNT_MODES,
  SEED_MODES,
  MIN_PARAGRAPHS,
  MAX_PARAGRAPHS,
  MIN_WORDS_PER_PARAGRAPH,
  MAX_WORDS_PER_PARAGRAPH,
  MIN_TOTAL_WORDS,
  MAX_TOTAL_WORDS,
  MAX_PRODUCT,
  STANDARD_SENTENCE_POOL,
  STANDARD_WORD_POOL,
  EXAMPLES,
}
