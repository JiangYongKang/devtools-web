function generateCurl({
  url = 'https://example.com/webhook',
  method = 'POST',
  headers = {},
  body = null,
  contentType = 'application/json',
}) {
  const lines = [`curl -X ${method.toUpperCase()} "${url}"`]

  const allHeaders = { ...headers }
  if (body && !allHeaders['Content-Type'] && !allHeaders['content-type']) {
    allHeaders['Content-Type'] = contentType
  }

  for (const [key, value] of Object.entries(allHeaders)) {
    lines.push(`  -H "${key}: ${value}"`)
  }

  if (body) {
    const bodyStr = typeof body === 'object' ? JSON.stringify(body) : String(body)
    const escapedBody = bodyStr.replace(/"/g, '\\"')
    lines.push(`  -d "${escapedBody}"`)
  }

  return lines.join(' \\\n')
}

function generateFetch({
  url = 'https://example.com/webhook',
  method = 'POST',
  headers = {},
  body = null,
  contentType = 'application/json',
}) {
  const options = {
    method: method.toUpperCase(),
    headers: { ...headers },
  }

  if (body) {
    if (!options.headers['Content-Type'] && !options.headers['content-type']) {
      options.headers['Content-Type'] = contentType
    }
    options.body = typeof body === 'object' ? JSON.stringify(body) : String(body)
  }

  const lines = [`fetch("${url}", {`]
  lines.push(`  method: "${options.method}",`)

  if (Object.keys(options.headers).length > 0) {
    lines.push(`  headers: {`)
    for (const [key, value] of Object.entries(options.headers)) {
      lines.push(`    "${key}": "${value}",`)
    }
    lines.push(`  },`)
  }

  if (options.body) {
    const bodyStr = options.body
    const escapedBody = bodyStr
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
    lines.push(`  body: "${escapedBody}",`)
  }

  lines.push(`})`)
  lines.push(`  .then((response) => response.text())`)
  lines.push(`  .then((text) => console.log(text))`)
  lines.push(`  .catch((error) => console.error("Error:", error))`)

  return lines.join('\n')
}

function generateSampleRequest(webhookType = 'GITHUB_PUSH') {
  const samples = {
    GITHUB_PUSH: {
      url: 'https://your-domain.com/webhook/github',
      method: 'POST',
      headers: {
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
        'X-Hub-Signature-256': 'sha256=YOUR_SECRET_SIGNATURE',
      },
      body: {
        ref: 'refs/heads/main',
        repository: {
          name: 'Hello-World',
          full_name: 'octocat/Hello-World',
        },
        pusher: {
          name: 'octocat',
          email: 'octocat@github.com',
        },
      },
      contentType: 'application/json',
    },
    STRIPE: {
      url: 'https://your-domain.com/webhook/stripe',
      method: 'POST',
      headers: {
        'Stripe-Signature': 't=1492774577,v1=YOUR_SIGNATURE,v0=...',
      },
      body: {
        id: 'evt_test_123456',
        type: 'charge.succeeded',
        data: {
          object: {
            amount: 2000,
            currency: 'usd',
            status: 'succeeded',
          },
        },
      },
      contentType: 'application/json',
    },
    SLACK: {
      url: 'https://your-domain.com/webhook/slack',
      method: 'POST',
      headers: {
        'X-Slack-Signature': 'v0=YOUR_SIGNATURE',
        'X-Slack-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
      },
      body: {
        token: 'YOUR_VERIFICATION_TOKEN',
        challenge: '3eZbrw1aBm2rZgRNO...',
        type: 'url_verification',
      },
      contentType: 'application/json',
    },
    GENERIC_JSON: {
      url: 'https://your-domain.com/webhook',
      method: 'POST',
      headers: {
        'X-Webhook-Signature': 'sha256=YOUR_SIGNATURE',
        'X-Webhook-Timestamp': String(Math.floor(Date.now() / 1000)),
      },
      body: {
        event: 'test.event',
        data: {
          message: 'Hello, World!',
          timestamp: new Date().toISOString(),
        },
      },
      contentType: 'application/json',
    },
    FORM_URLENCODED: {
      url: 'https://your-domain.com/webhook',
      method: 'POST',
      headers: {},
      body: 'name=John+Doe&email=john%40example.com&message=Hello%21',
      contentType: 'application/x-www-form-urlencoded',
    },
  }

  return samples[webhookType] || samples.GITHUB_PUSH
}

function isSameOrigin(url) {
  try {
    const urlObj = new URL(url, window.location.origin)
    return urlObj.origin === window.location.origin
  } catch {
    return false
  }
}

export {
  generateCurl,
  generateFetch,
  generateSampleRequest,
  isSameOrigin,
}
