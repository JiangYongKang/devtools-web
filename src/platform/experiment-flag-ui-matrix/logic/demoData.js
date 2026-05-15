import { CONFIG_SCENARIOS, VARIANT_TYPES, RULE_OPERATORS } from './constants.js'

const GRADUAL_ROLLOUT_CONFIG = {
  name: '灰度放量',
  description: '新功能按用户分桶逐步放量，从 10% 到 100%',
  scenario: CONFIG_SCENARIOS.GRADUAL_ROLLOUT,
  flags: {
    new_checkout: {
      defaultValue: false,
      description: '新版结账流程',
      rules: [],
    },
    dark_mode: {
      defaultValue: false,
      description: '深色模式',
      rules: [],
    },
    ai_suggestions: {
      defaultValue: false,
      description: 'AI 智能推荐',
      rules: [],
    },
  },
  experiments: {
    checkout_v2: {
      enabled: true,
      name: '结账流程优化',
      description: '测试新版结账流程的转化率',
      rolloutPercentage: 30,
      variants: [
        { name: VARIANT_TYPES.CONTROL, weight: 50, payload: { buttonText: '立即支付' } },
        { name: VARIANT_TYPES.VARIANT_A, weight: 50, payload: { buttonText: '安全支付' } },
      ],
    },
    pricing_test: {
      enabled: true,
      name: '定价测试',
      description: '测试不同价格点的接受度',
      rolloutPercentage: 100,
      variants: [
        { name: VARIANT_TYPES.CONTROL, weight: 34, payload: { price: 99 } },
        { name: VARIANT_TYPES.VARIANT_A, weight: 33, payload: { price: 79 } },
        { name: VARIANT_TYPES.VARIANT_B, weight: 33, payload: { price: 129 } },
      ],
    },
  },
  rules: [
    {
      id: 'rule_001',
      name: '内部员工全部启用',
      description: '公司内部员工邮箱域名匹配时启用全部新功能',
      priority: 100,
      when: {
        operator: RULE_OPERATORS.ENDS_WITH,
        attribute: 'user.email',
        value: '@company.com',
      },
      then: {
        new_checkout: true,
        dark_mode: true,
        ai_suggestions: true,
      },
    },
    {
      id: 'rule_002',
      name: 'VIP 用户优先体验',
      description: 'VIP 级别用户优先体验 AI 推荐',
      priority: 80,
      when: {
        operator: RULE_OPERATORS.EQUALS,
        attribute: 'user.tier',
        value: 'vip',
      },
      then: {
        ai_suggestions: true,
      },
    },
    {
      id: 'rule_003',
      name: '北美地区放量',
      description: '北美地区用户体验深色模式',
      priority: 50,
      when: {
        operator: RULE_OPERATORS.IN,
        attribute: 'user.region',
        value: ['US', 'CA'],
      },
      then: {
        dark_mode: true,
      },
    },
  ],
}

const EMERGENCY_SHUTDOWN_CONFIG = {
  name: '紧急关停',
  description: '所有实验立即关闭，回归基线版本',
  scenario: CONFIG_SCENARIOS.EMERGENCY_SHUTDOWN,
  flags: {
    new_checkout: {
      defaultValue: false,
      description: '新版结账流程',
      rules: [],
    },
    dark_mode: {
      defaultValue: false,
      description: '深色模式',
      rules: [],
    },
    ai_suggestions: {
      defaultValue: false,
      description: 'AI 智能推荐',
      rules: [],
    },
    beta_features: {
      defaultValue: false,
      description: 'Beta 功能集合',
      rules: [],
    },
  },
  experiments: {
    checkout_v2: {
      enabled: false,
      name: '结账流程优化',
      description: '已紧急关停',
      rolloutPercentage: 0,
      variants: [
        { name: VARIANT_TYPES.CONTROL, weight: 100, payload: { buttonText: '立即支付' } },
      ],
    },
    pricing_test: {
      enabled: false,
      name: '定价测试',
      description: '已紧急关停',
      rolloutPercentage: 0,
      variants: [
        { name: VARIANT_TYPES.CONTROL, weight: 100, payload: { price: 99 } },
      ],
    },
  },
  rules: [
    {
      id: 'emergency_001',
      name: '紧急关停全部新功能',
      description: '生产环境问题，立即回滚',
      priority: 999,
      when: {
        operator: RULE_OPERATORS.EQUALS,
        attribute: 'env',
        value: 'production',
      },
      then: {
        new_checkout: false,
        dark_mode: false,
        ai_suggestions: false,
        beta_features: false,
      },
    },
  ],
  cacheControl: {
    etag: 'shutdown-v1',
    maxAge: 3600,
    lastModified: Date.now(),
  },
}

const LAYERED_EXPERIMENT_CONFIG = {
  name: '分层实验',
  description: '多层实验并行运行，支持流量正交分配',
  scenario: CONFIG_SCENARIOS.LAYERED_EXPERIMENT,
  flags: {
    ui_redesign: {
      defaultValue: false,
      description: 'UI 重新设计',
      rules: [],
    },
    search_v3: {
      defaultValue: false,
      description: '新版搜索引擎',
      rules: [],
    },
    onboarding_flow: {
      defaultValue: 'v1',
      description: '新手引导流程',
      rules: [],
    },
  },
  experiments: {
    homepage_layout: {
      enabled: true,
      name: '首页布局实验',
      description: '测试三种不同的首页布局',
      layer: 'ui_layer',
      variants: [
        { name: VARIANT_TYPES.CONTROL, weight: 34, payload: { layout: 'classic' } },
        { name: VARIANT_TYPES.VARIANT_A, weight: 33, payload: { layout: 'card' } },
        { name: VARIANT_TYPES.VARIANT_B, weight: 33, payload: { layout: 'magazine' } },
      ],
    },
    search_algorithm: {
      enabled: true,
      name: '搜索算法实验',
      description: '对比新旧搜索算法效果',
      layer: 'algorithm_layer',
      variants: [
        { name: VARIANT_TYPES.CONTROL, weight: 50, payload: { algorithm: 'v2' } },
        { name: VARIANT_TYPES.VARIANT_A, weight: 50, payload: { algorithm: 'v3' } },
      ],
    },
    pricing_display: {
      enabled: true,
      name: '价格展示实验',
      description: '测试价格展示方式',
      layer: 'ui_layer',
      variants: [
        { name: VARIANT_TYPES.CONTROL, weight: 50, payload: { showDiscount: false } },
        { name: VARIANT_TYPES.VARIANT_A, weight: 50, payload: { showDiscount: true } },
      ],
    },
  },
  rules: [
    {
      id: 'layer_001',
      name: '新用户参与全部实验',
      description: '注册不满 7 天的用户进入所有实验组',
      priority: 60,
      when: {
        operator: RULE_OPERATORS.LESS_THAN,
        attribute: 'user.daysSinceRegistered',
        value: 7,
      },
      then: {
        ui_redesign: true,
        search_v3: true,
        onboarding_flow: 'v2',
      },
    },
    {
      id: 'layer_002',
      name: '高活跃用户启用搜索 V3',
      description: '月活跃次数 > 10 的用户使用新搜索',
      priority: 70,
      when: {
        operator: RULE_OPERATORS.GREATER_THAN,
        attribute: 'user.monthlyActivity',
        value: 10,
      },
      then: {
        search_v3: true,
      },
    },
    {
      id: 'layer_003',
      name: '移动设备 UI 重设计',
      description: '移动端用户体验新 UI',
      priority: 50,
      when: {
        operator: RULE_OPERATORS.EQUALS,
        attribute: 'device.type',
        value: 'mobile',
      },
      then: {
        ui_redesign: true,
      },
    },
  ],
}

const UI_COMPONENT_MATRIX = [
  {
    id: 'price_display',
    name: '价格展示',
    description: '商品价格显示组件',
    variants: {
      [VARIANT_TYPES.CONTROL]: {
        price: '¥99.00',
        style: 'standard',
        showOriginalPrice: false,
      },
      [VARIANT_TYPES.VARIANT_A]: {
        price: '¥79.00',
        originalPrice: '¥99.00',
        style: 'highlight',
        showOriginalPrice: true,
      },
      [VARIANT_TYPES.VARIANT_B]: {
        price: '¥129.00',
        style: 'premium',
        showOriginalPrice: false,
      },
    },
  },
  {
    id: 'cta_button',
    name: 'CTA 按钮',
    description: '主要行动召唤按钮',
    variants: {
      [VARIANT_TYPES.CONTROL]: {
        text: '立即购买',
        color: 'blue',
        size: 'medium',
      },
      [VARIANT_TYPES.VARIANT_A]: {
        text: '加入购物车',
        color: 'green',
        size: 'large',
      },
      [VARIANT_TYPES.VARIANT_B]: {
        text: '立即体验',
        color: 'orange',
        size: 'medium',
      },
    },
  },
  {
    id: 'product_card',
    name: '商品卡片',
    description: '商品列表卡片布局',
    variants: {
      [VARIANT_TYPES.CONTROL]: {
        layout: 'vertical',
        showRating: true,
        imageSize: 'medium',
      },
      [VARIANT_TYPES.VARIANT_A]: {
        layout: 'horizontal',
        showRating: false,
        imageSize: 'small',
      },
      [VARIANT_TYPES.VARIANT_B]: {
        layout: 'gallery',
        showRating: true,
        imageSize: 'large',
      },
    },
  },
  {
    id: 'navigation_menu',
    name: '导航菜单',
    description: '顶部导航栏布局',
    variants: {
      [VARIANT_TYPES.CONTROL]: {
        items: ['首页', '分类', '购物车', '我的'],
        style: 'classic',
      },
      [VARIANT_TYPES.VARIANT_A]: {
        items: ['首页', '发现', '购物车', '消息', '我的'],
        style: 'modern',
      },
      [VARIANT_TYPES.VARIANT_B]: {
        items: ['首页', '分类', '搜索', '购物车'],
        style: 'minimal',
      },
    },
  },
]

const SAMPLE_USER_CONTEXTS = [
  {
    name: '内部员工',
    context: {
      userId: 'emp_12345',
      user: {
        email: 'john.doe@company.com',
        tier: 'employee',
        region: 'US',
        daysSinceRegistered: 365,
        monthlyActivity: 50,
      },
      device: { type: 'desktop' },
      env: 'production',
    },
  },
  {
    name: 'VIP 用户',
    context: {
      userId: 'vip_67890',
      user: {
        email: 'jane.smith@example.com',
        tier: 'vip',
        region: 'EU',
        daysSinceRegistered: 180,
        monthlyActivity: 25,
      },
      device: { type: 'mobile' },
      env: 'production',
    },
  },
  {
    name: '新用户',
    context: {
      userId: 'new_54321',
      user: {
        email: 'new.user@example.com',
        tier: 'normal',
        region: 'CN',
        daysSinceRegistered: 3,
        monthlyActivity: 5,
      },
      device: { type: 'mobile' },
      env: 'staging',
    },
  },
  {
    name: '普通用户',
    context: {
      userId: 'user_09876',
      user: {
        email: 'regular.user@example.com',
        tier: 'normal',
        region: 'JP',
        daysSinceRegistered: 90,
        monthlyActivity: 8,
      },
      device: { type: 'desktop' },
      env: 'production',
    },
  },
]

export {
  GRADUAL_ROLLOUT_CONFIG,
  EMERGENCY_SHUTDOWN_CONFIG,
  LAYERED_EXPERIMENT_CONFIG,
  UI_COMPONENT_MATRIX,
  SAMPLE_USER_CONTEXTS,
}
