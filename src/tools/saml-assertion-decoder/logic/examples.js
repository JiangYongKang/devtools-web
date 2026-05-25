function createValidAssertionXml(issuer, nameId, audience, sessionIndex) {
  const now = new Date()
  const notBefore = new Date(now.getTime() - 5 * 60 * 1000)
  const notOnOrAfter = new Date(now.getTime() + 60 * 60 * 1000)
  return `<saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_abc123"
    IssueInstant="${notBefore.toISOString()}"
    Version="2.0">
  <saml2:Issuer>${issuer}</saml2:Issuer>
  <saml2:Subject>
    <saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">${nameId}</saml2:NameID>
    <saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml2:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter.toISOString()}" Recipient="${audience}"/>
    </saml2:SubjectConfirmation>
  </saml2:Subject>
  <saml2:Conditions NotBefore="${notBefore.toISOString()}" NotOnOrAfter="${notOnOrAfter.toISOString()}">
    <saml2:AudienceRestriction>
      <saml2:Audience>${audience}</saml2:Audience>
    </saml2:AudienceRestriction>
  </saml2:Conditions>
  <saml2:AuthnStatement AuthnInstant="${notBefore.toISOString()}" SessionIndex="${sessionIndex}">
    <saml2:AuthnContext>
      <saml2:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml2:AuthnContextClassRef>
    </saml2:AuthnContext>
  </saml2:AuthnStatement>
</saml2:Assertion>`
}

function createExpiredAssertionXml(issuer, nameId, audience, sessionIndex) {
  const now = new Date()
  const notBefore = new Date(now.getTime() - 120 * 60 * 1000)
  const notOnOrAfter = new Date(now.getTime() - 60 * 60 * 1000)
  return `<saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_expired123"
    IssueInstant="${notBefore.toISOString()}"
    Version="2.0">
  <saml2:Issuer>${issuer}</saml2:Issuer>
  <saml2:Subject>
    <saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">${nameId}</saml2:NameID>
    <saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml2:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter.toISOString()}" Recipient="${audience}"/>
    </saml2:SubjectConfirmation>
  </saml2:Subject>
  <saml2:Conditions NotBefore="${notBefore.toISOString()}" NotOnOrAfter="${notOnOrAfter.toISOString()}">
    <saml2:AudienceRestriction>
      <saml2:Audience>${audience}</saml2:Audience>
    </saml2:AudienceRestriction>
  </saml2:Conditions>
  <saml2:AuthnStatement AuthnInstant="${notBefore.toISOString()}" SessionIndex="${sessionIndex}">
    <saml2:AuthnContext>
      <saml2:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml2:AuthnContextClassRef>
    </saml2:AuthnContext>
  </saml2:AuthnStatement>
</saml2:Assertion>`
}

function createWrongAudienceAssertionXml(issuer, nameId, wrongAudience, sessionIndex) {
  const now = new Date()
  const notBefore = new Date(now.getTime() - 5 * 60 * 1000)
  const notOnOrAfter = new Date(now.getTime() + 60 * 60 * 1000)
  return `<saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_wrong123"
    IssueInstant="${notBefore.toISOString()}"
    Version="2.0">
  <saml2:Issuer>${issuer}</saml2:Issuer>
  <saml2:Subject>
    <saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">${nameId}</saml2:NameID>
    <saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml2:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter.toISOString()}" Recipient="${wrongAudience}"/>
    </saml2:SubjectConfirmation>
  </saml2:Subject>
  <saml2:Conditions NotBefore="${notBefore.toISOString()}" NotOnOrAfter="${notOnOrAfter.toISOString()}">
    <saml2:AudienceRestriction>
      <saml2:Audience>${wrongAudience}</saml2:Audience>
    </saml2:AudienceRestriction>
  </saml2:Conditions>
  <saml2:AuthnStatement AuthnInstant="${notBefore.toISOString()}" SessionIndex="${sessionIndex}">
    <saml2:AuthnContext>
      <saml2:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml2:AuthnContextClassRef>
    </saml2:AuthnContext>
  </saml2:AuthnStatement>
</saml2:Assertion>`
}

const EXAMPLES = {
  validIdp: {
    name: 'IdP 签发有效断言',
    description: '正常有效的 SAML 2.0 断言示例',
    generate: () => createValidAssertionXml(
      'https://idp.example.com/metadata',
      'user@example.com',
      'https://sp.example.com/metadata',
      '_session_12345'
    ),
  },
  expired: {
    name: '过期断言',
    description: 'NotOnOrAfter 已过期的断言示例',
    generate: () => createExpiredAssertionXml(
      'https://idp.example.com/metadata',
      'user@example.com',
      'https://sp.example.com/metadata',
      '_session_67890'
    ),
  },
  wrongAudience: {
    name: 'Audience 不匹配',
    description: '受众与期望 SP Entity ID 不匹配的示例',
    generate: () => createWrongAudienceAssertionXml(
      'https://idp.example.com/metadata',
      'user@example.com',
      'https://wrong-sp.example.com/metadata',
      '_session_abcdef'
    ),
  },
}

function getExample(exampleKey) {
  const example = EXAMPLES[exampleKey]
  if (!example) return null
  return example.generate()
}

function getAllExamplesInfo() {
  return Object.entries(EXAMPLES).map(([key, example]) => ({
    key,
    name: example.name,
    description: example.description,
  }))
}

export {
  EXAMPLES,
  getExample,
  getAllExamplesInfo,
  createValidAssertionXml,
  createExpiredAssertionXml,
  createWrongAudienceAssertionXml,
}
