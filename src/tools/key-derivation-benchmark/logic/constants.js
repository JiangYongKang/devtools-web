const ALGORITHMS = {
  PBKDF2: 'pbkdf2',
  SCRYPT: 'scrypt',
  ARGON2: 'argon2',
}

const HASH_ALGORITHMS = {
  SHA_256: 'SHA-256',
  SHA_512: 'SHA-512',
}

const OWASP_RECOMMENDATIONS = {
  PBKDF2: {
    SHA256: { iterations: 600000, description: 'PBKDF2-HMAC-SHA256 最小 600,000 次迭代' },
    SHA512: { iterations: 210000, description: 'PBKDF2-HMAC-SHA512 最小 210,000 次迭代' },
  },
  SCRYPT: {
    N: 131072,
    r: 8,
    p: 1,
    description: 'scrypt: N=2^17 (131072), r=8, p=1',
  },
  ARGON2: {
    id: {
      m: 12288,
      t: 3,
      p: 1,
      description: 'Argon2id: m=12288 KB, t=3, p=1',
    },
  },
}

const WEAK_PARAMETER_THRESHOLDS = {
  PBKDF2: {
    SHA256: { minIterations: 100000, warning: '低于 OWASP 推荐的 600,000 次迭代' },
    SHA512: { minIterations: 50000, warning: '低于 OWASP 推荐的 210,000 次迭代' },
  },
  SCRYPT: {
    minN: 32768,
    minR: 8,
    warning: '参数强度不足，容易被暴力破解',
  },
  ARGON2: {
    minMemory: 7168,
    minIterations: 2,
    warning: '参数强度不足，容易被暴力破解',
  },
}

const DEFAULT_PARAMS = {
  PBKDF2: {
    iterations: 100000,
    hash: 'SHA-256',
    keyLength: 32,
  },
  SCRYPT: {
    N: 32768,
    r: 8,
    p: 1,
    keyLength: 32,
  },
  ARGON2: {
    type: 'id',
    memory: 12288,
    iterations: 3,
    parallelism: 1,
    keyLength: 32,
  },
}

const EDUCATION_CONTENT = {
  saltExplanation: {
    title: '为什么需要盐值（Salt）？',
    points: [
      '盐值是一个随机字符串，与密码混合后进行哈希运算',
      '防止彩虹表攻击：相同密码在不同用户处会产生不同的哈希值',
      '增加暴力破解的成本：攻击者需要为每个盐值单独计算',
      '推荐长度：至少 16 字节（128 位），建议 32 字节（256 位）',
      '盐值不需要保密，只需与哈希后的密码一同存储',
    ],
  },
  pepperExplanation: {
    title: '什么是胡椒（Pepper）？',
    points: [
      '胡椒是一个全局密钥，存储在服务端配置中（而非数据库）',
      '与密码和盐值一同混合进行哈希运算',
      '即使数据库泄露，没有胡椒也无法破解密码',
      '胡椒必须严格保密：放在配置文件、环境变量或密钥管理服务中',
      '缺点：无法单独轮换，需要重新哈希所有用户密码',
    ],
  },
  passwordStorage: {
    title: '为什么不能明文存储密码？',
    points: [
      '数据库泄露风险：任何内部人员或攻击者都能直接获取用户密码',
      '密码复用问题：多数用户在多个网站使用相同密码',
      '合规要求：GDPR、PCI DSS 等法规禁止明文存储敏感数据',
      '零信任原则：即使系统被攻破，用户密码仍应保持安全',
      '正确做法：使用自适应密钥派生函数（如 Argon2、scrypt、PBKDF2）',
    ],
  },
  algorithmComparison: {
    title: '算法对比',
    algorithms: [
      {
        name: 'Argon2',
        pros: ['最新、最强的 KDF', '获得 Password Hashing Competition 冠军', '可配置内存和 CPU 成本', '抵抗 GPU/ASIC 攻击'],
        cons: ['需要 WASM 或原生支持', '浏览器原生支持有限'],
      },
      {
        name: 'scrypt',
        pros: ['内存硬化设计', '抵抗 GPU 攻击', '广泛支持'],
        cons: ['Web Crypto API 不原生支持', '高内存参数可能导致问题'],
      },
      {
        name: 'PBKDF2',
        pros: ['Web Crypto API 原生支持', '最广泛兼容', '标准算法'],
        cons: ['仅依赖 CPU，易受 GPU 攻击', '需要更高的迭代次数'],
      },
    ],
  },
}

const PARAMETER_PRESETS = [
  { name: '快速测试', label: '快速', pbkdf2Iterations: 10000, scryptN: 4096, warning: '仅用于开发测试，不安全！' },
  { name: '最低安全', label: '最低', pbkdf2Iterations: 100000, scryptN: 32768, warning: '生产环境建议使用更高参数' },
  { name: 'OWASP 推荐', label: '推荐', pbkdf2Iterations: 600000, scryptN: 131072, warning: '推荐用于生产环境' },
  { name: '高安全性', label: '高安全', pbkdf2Iterations: 1200000, scryptN: 262144, warning: '计算时间较长，请耐心等待' },
]

export {
  ALGORITHMS,
  HASH_ALGORITHMS,
  OWASP_RECOMMENDATIONS,
  WEAK_PARAMETER_THRESHOLDS,
  DEFAULT_PARAMS,
  EDUCATION_CONTENT,
  PARAMETER_PRESETS,
}
