const MAX_EVENTS = 50

const STORAGE_KEY = 'webhook-debug-receiver:events'

const EVENT_ERROR_CODES = {
  INVALID_HTTP: 'INVALID_HTTP',
  EMPTY_BODY: 'EMPTY_BODY',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_FORM: 'INVALID_FORM',
  INVALID_MULTIPART: 'INVALID_MULTIPART',
  INVALID_IMPORT: 'INVALID_IMPORT',
  TOO_MANY_EVENTS: 'TOO_MANY_EVENTS',
}

const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM_DATA: 'multipart/form-data',
  TEXT_PLAIN: 'text/plain',
  TEXT_HTML: 'text/html',
  XML: 'application/xml',
  TEXT_XML: 'text/xml',
}

const HEADER_CATEGORIES = {
  COMMON: [
    'Host',
    'User-Agent',
    'Content-Type',
    'Content-Length',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Connection',
    'Cache-Control',
    'Date',
    'Referer',
  ],
  SECURITY: [
    'X-Forwarded-For',
    'X-Forwarded-Proto',
    'X-Real-IP',
    'X-Request-Id',
    'X-Correlation-Id',
    'X-Trace-Id',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
  ],
  SIGNATURE: [
    'X-Hub-Signature',
    'X-Hub-Signature-256',
    'Stripe-Signature',
    'X-Stripe-Signature',
    'X-GitHub-Event',
    'X-GitHub-Delivery',
    'X-GitHub-Hook-ID',
    'X-Slack-Signature',
    'X-Slack-Request-Timestamp',
    'X-Telegram-Bot-Api-Secret-Token',
    'X-Discord-Interaction-Signature',
    'X-Discord-Interaction-Timestamp',
    'X-Webhook-Signature',
    'X-Webhook-Timestamp',
  ],
}

const SAMPLE_WEBHOOKS = {
  GITHUB_PUSH: {
    name: 'GitHub Push',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'push',
      'X-GitHub-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
      'X-Hub-Signature-256': 'sha256=YOUR_SIGNATURE_HERE',
    },
    body: {
      ref: 'refs/heads/main',
      before: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      after: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b3',
      repository: {
        id: 1296269,
        name: 'Hello-World',
        full_name: 'octocat/Hello-World',
        owner: {
          name: 'octocat',
          email: 'octocat@github.com',
          login: 'octocat',
          id: 1,
        },
        html_url: 'https://github.com/octocat/Hello-World',
      },
      pusher: {
        name: 'octocat',
        email: 'octocat@github.com',
      },
      sender: {
        login: 'octocat',
        id: 1,
        type: 'User',
      },
    },
  },
  STRIPE_CHARGE: {
    name: 'Stripe Charge',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': 't=1492774577,v1=YOUR_SIGNATURE_HERE,v0=...',
    },
    body: {
      id: 'evt_test_1234567890',
      object: 'event',
      api_version: '2020-08-27',
      created: 1620000000,
      data: {
        object: {
          id: 'ch_test_1234567890',
          object: 'charge',
          amount: 2000,
          amount_captured: 2000,
          currency: 'usd',
          description: 'Test payment',
          paid: true,
          status: 'succeeded',
          customer: 'cus_test_123456',
          payment_method: 'pm_test_123456',
        },
      },
      type: 'charge.succeeded',
      livemode: false,
      request: {
        id: 'req_test_123456',
        idempotency_key: 'test_key_123',
      },
    },
  },
  FORM_URLENCODED: {
    name: 'Form URL-Encoded',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    bodyRaw: 'name=John+Doe&email=john%40example.com&message=Hello%2C+World%21&age=30&subscribe=on',
  },
  XSS_ATTACK: {
    name: 'XSS Attack Demo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      user_id: 123,
      username: '<script>alert("XSS")</script>',
      email: 'test@example.com',
      bio: '<img src=x onerror=alert(1)>',
      profile: '<iframe src="http://evil.com"></iframe>',
    },
  },
}

export {
  MAX_EVENTS,
  STORAGE_KEY,
  EVENT_ERROR_CODES,
  CONTENT_TYPES,
  HEADER_CATEGORIES,
  SAMPLE_WEBHOOKS,
}
