const CI_PIPELINE = {
  name: 'CI 流水线',
  description: '典型的持续集成流水线示例',
  nodes: [
    { id: 'clone', label: '代码检出', x: 0, y: 0, width: 120, height: 60 },
    { id: 'install', label: '依赖安装', x: 0, y: 0, width: 120, height: 60 },
    { id: 'lint', label: '代码检查', x: 0, y: 0, width: 120, height: 60 },
    { id: 'test', label: '单元测试', x: 0, y: 0, width: 120, height: 60 },
    { id: 'build', label: '构建打包', x: 0, y: 0, width: 120, height: 60 },
    { id: 'scan', label: '安全扫描', x: 0, y: 0, width: 120, height: 60 },
    { id: 'deploy', label: '部署发布', x: 0, y: 0, width: 120, height: 60 },
  ],
  edges: [
    { id: 'e1', from: 'clone', to: 'install', kind: 'dependency' },
    { id: 'e2', from: 'install', to: 'lint', kind: 'dependency' },
    { id: 'e3', from: 'install', to: 'test', kind: 'dependency' },
    { id: 'e4', from: 'lint', to: 'build', kind: 'dependency' },
    { id: 'e5', from: 'test', to: 'build', kind: 'dependency' },
    { id: 'e6', from: 'build', to: 'scan', kind: 'dependency' },
    { id: 'e7', from: 'scan', to: 'deploy', kind: 'dependency' },
  ],
}

const MICROSERVICE_DEPENDENCY = {
  name: '微服务依赖',
  description: '微服务架构中的服务依赖关系',
  nodes: [
    { id: 'gateway', label: 'API 网关', x: 0, y: 0, width: 120, height: 60 },
    { id: 'auth', label: '认证服务', x: 0, y: 0, width: 120, height: 60 },
    { id: 'user', label: '用户服务', x: 0, y: 0, width: 120, height: 60 },
    { id: 'order', label: '订单服务', x: 0, y: 0, width: 120, height: 60 },
    { id: 'payment', label: '支付服务', x: 0, y: 0, width: 120, height: 60 },
    { id: 'inventory', label: '库存服务', x: 0, y: 0, width: 120, height: 60 },
    { id: 'notification', label: '通知服务', x: 0, y: 0, width: 120, height: 60 },
    { id: 'analytics', label: '分析服务', x: 0, y: 0, width: 120, height: 60 },
  ],
  edges: [
    { id: 'e1', from: 'gateway', to: 'auth', kind: 'call' },
    { id: 'e2', from: 'gateway', to: 'user', kind: 'call' },
    { id: 'e3', from: 'gateway', to: 'order', kind: 'call' },
    { id: 'e4', from: 'user', to: 'auth', kind: 'call' },
    { id: 'e5', from: 'order', to: 'user', kind: 'call' },
    { id: 'e6', from: 'order', to: 'payment', kind: 'call' },
    { id: 'e7', from: 'order', to: 'inventory', kind: 'call' },
    { id: 'e8', from: 'order', to: 'notification', kind: 'event' },
    { id: 'e9', from: 'payment', to: 'notification', kind: 'event' },
    { id: 'e10', from: 'order', to: 'analytics', kind: 'event' },
    { id: 'e11', from: 'user', to: 'analytics', kind: 'event' },
  ],
}

const STATE_MACHINE = {
  name: '状态机',
  description: '订单状态流转状态机',
  nodes: [
    { id: 'created', label: '已创建', x: 0, y: 0, width: 120, height: 60 },
    { id: 'pending', label: '待支付', x: 0, y: 0, width: 120, height: 60 },
    { id: 'paid', label: '已支付', x: 0, y: 0, width: 120, height: 60 },
    { id: 'shipped', label: '已发货', x: 0, y: 0, width: 120, height: 60 },
    { id: 'delivered', label: '已送达', x: 0, y: 0, width: 120, height: 60 },
    { id: 'completed', label: '已完成', x: 0, y: 0, width: 120, height: 60 },
    { id: 'cancelled', label: '已取消', x: 0, y: 0, width: 120, height: 60 },
    { id: 'refunded', label: '已退款', x: 0, y: 0, width: 120, height: 60 },
  ],
  edges: [
    { id: 'e1', from: 'created', to: 'pending', kind: 'transition' },
    { id: 'e2', from: 'pending', to: 'paid', kind: 'transition' },
    { id: 'e3', from: 'paid', to: 'shipped', kind: 'transition' },
    { id: 'e4', from: 'shipped', to: 'delivered', kind: 'transition' },
    { id: 'e5', from: 'delivered', to: 'completed', kind: 'transition' },
    { id: 'e6', from: 'pending', to: 'cancelled', kind: 'transition' },
    { id: 'e7', from: 'paid', to: 'cancelled', kind: 'transition' },
    { id: 'e8', from: 'cancelled', to: 'refunded', kind: 'transition' },
    { id: 'e9', from: 'completed', to: 'refunded', kind: 'transition' },
  ],
}

const EXAMPLES = [
  CI_PIPELINE,
  MICROSERVICE_DEPENDENCY,
  STATE_MACHINE,
]

export {
  CI_PIPELINE,
  MICROSERVICE_DEPENDENCY,
  STATE_MACHINE,
  EXAMPLES,
}
