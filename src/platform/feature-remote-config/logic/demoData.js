import { SOURCES } from './constants.js'

const DEFAULT_CONFIG = {
  flags: [
    {
      key: 'new_dashboard',
      value: false,
      version: 1,
      source: SOURCES.DEFAULT,
      payload: {
        feature: 'dashboard_v2',
        enabled: false,
      },
    },
    {
      key: 'dark_mode',
      value: 'auto',
      version: 1,
      source: SOURCES.DEFAULT,
      payload: {
        options: ['light', 'dark', 'auto'],
      },
    },
    {
      key: 'api_timeout',
      value: 30000,
      version: 1,
      source: SOURCES.DEFAULT,
    },
  ],
  version: 1,
}

const STATIC_CONFIG = {
  flags: {
    new_dashboard: {
      value: true,
      version: 2,
      source: SOURCES.STATIC,
      payload: {
        feature: 'dashboard_v2',
        enabled: true,
        rollout: 0.5,
      },
    },
    beta_features: {
      value: true,
      version: 1,
      source: SOURCES.STATIC,
      environment: 'dev',
    },
    beta_features_prod: {
      value: false,
      version: 1,
      source: SOURCES.STATIC,
      environment: 'prod',
    },
  },
  version: 2,
}

const REMOTE_CONFIG_MOCK = {
  flags: [
    {
      key: 'new_dashboard',
      value: true,
      version: 3,
      source: SOURCES.REMOTE,
      payload: {
        feature: 'dashboard_v2',
        enabled: true,
        rollout: 1.0,
        apiKey: 'sk_live_12345',
      },
    },
    {
      key: 'dark_mode',
      value: 'dark',
      version: 2,
      source: SOURCES.REMOTE,
    },
    {
      key: 'experiment_button_color',
      value: 'blue',
      version: 1,
      source: SOURCES.REMOTE,
      cohort: 'experiment_a',
    },
    {
      key: 'secret_config',
      value: true,
      version: 1,
      source: SOURCES.REMOTE,
      payload: {
        token: 'super_secret_token_123',
        password: 'admin123',
        secret: 'top_secret',
      },
    },
  ],
  version: 3,
  etag: 'mock-etag-123',
}

const SAMPLE_TYPE_ERROR_CONFIG = {
  flags: [
    {
      key: 'valid_flag',
      value: true,
      version: 1,
    },
    {
      key: 'missing_value',
      version: 1,
    },
    {
      key: 'invalid_type',
      value: { invalid: true },
      version: 1,
    },
    {
      value: 'missing_key',
      version: 1,
    },
  ],
  version: 1,
}

const SAMPLE_CIRCULAR_REF_CONFIG = (() => {
  const obj = { a: 1 }
  obj.self = obj
  return {
    flags: [
      {
        key: 'circular_flag',
        value: true,
        version: 1,
        payload: {
          data: obj,
        },
      },
    ],
    version: 1,
  }
})()

const SAMPLE_LARGE_PAYLOAD_CONFIG = (() => {
  const largePayload = {}
  for (let i = 0; i < 200; i++) {
    largePayload[`key_${i}`] = i
  }
  return {
    flags: [
      {
        key: 'large_payload_flag',
        value: true,
        version: 1,
        payload: largePayload,
      },
    ],
    version: 1,
  }
})()

const SAMPLE_DEEP_PAYLOAD_CONFIG = (() => {
  const deepPayload = {}
  let current = deepPayload
  for (let i = 0; i < 10; i++) {
    current.level = {}
    current = current.level
  }
  return {
    flags: [
      {
        key: 'deep_payload_flag',
        value: true,
        version: 1,
        payload: deepPayload,
      },
    ],
    version: 1,
  }
})()

const SAMPLE_SCRIPT_FIELD_CONFIG = {
  flags: [
    {
      key: 'script_flag',
      value: true,
      version: 1,
      payload: {
        script: 'alert("malicious")',
        onClick: 'doSomething()',
      },
    },
  ],
  version: 1,
}

const SAMPLE_EXPIRED_CONFIG = {
  flags: [
    {
      key: 'expired_flag',
      value: true,
      version: 1,
      expiresAt: Date.now() - 1000 * 60 * 60,
    },
    {
      key: 'active_flag',
      value: true,
      version: 1,
      expiresAt: Date.now() + 1000 * 60 * 60,
    },
  ],
  version: 1,
}

export {
  DEFAULT_CONFIG,
  STATIC_CONFIG,
  REMOTE_CONFIG_MOCK,
  SAMPLE_TYPE_ERROR_CONFIG,
  SAMPLE_CIRCULAR_REF_CONFIG,
  SAMPLE_LARGE_PAYLOAD_CONFIG,
  SAMPLE_DEEP_PAYLOAD_CONFIG,
  SAMPLE_SCRIPT_FIELD_CONFIG,
  SAMPLE_EXPIRED_CONFIG,
}
