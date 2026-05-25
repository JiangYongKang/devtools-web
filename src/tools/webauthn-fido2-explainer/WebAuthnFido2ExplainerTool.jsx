import { useCallback, useEffect, useState } from 'react'
import {
  generateChallenge,
  generateUserId,
  uint8ArrayToBase64Url,
} from './logic/base64url.js'
import {
  parseClientDataJSON,
  getClientDataTypeDescription,
} from './logic/clientData.js'
import { parseAuthData } from './logic/authData.js'
import { parseAttestationObject } from './logic/attestation.js'
import {
  createRegistrationOptions,
  createAuthenticationOptions,
  PASSKEY_REGISTRATION_TEMPLATE,
  PASSKEY_AUTHENTICATION_TEMPLATE,
  AUTHENTICATOR_ATTACHMENTS,
  USER_VERIFICATION_REQUIREMENTS,
  RESIDENT_KEY_REQUIREMENTS,
  ATTESTATION_CONVEYANCE_PREFERENCES,
} from './logic/options.js'
import {
  checkWebAuthnSupport,
  WEBAUTHN_ERRORS,
  RP_ID_DOCUMENTATION,
} from './logic/capability.js'
import './WebAuthnFido2ExplainerTool.css'

export default function WebAuthnFido2ExplainerTool() {
  const [activeTab, setActiveTab] = useState('registration')
  const [capability, setCapability] = useState(null)

  const [regRpName, setRegRpName] = useState('示例应用')
  const [regRpId, setRegRpId] = useState('')
  const [regUserName, setRegUserName] = useState('user@example.com')
  const [regUserDisplayName, setRegUserDisplayName] = useState('示例用户')
  const [regUserId, setRegUserId] = useState('')
  const [regChallenge, setRegChallenge] = useState('')
  const [regAuthenticatorAttachment, setRegAuthenticatorAttachment] = useState('')
  const [regUserVerification, setRegUserVerification] = useState('preferred')
  const [regResidentKey, setRegResidentKey] = useState('preferred')
  const [regRequireResidentKey, setRegRequireResidentKey] = useState(false)
  const [regAttestation, setRegAttestation] = useState('none')
  const [regTimeout, setRegTimeout] = useState(60000)
  const [regOptionsJson, setRegOptionsJson] = useState('')
  const [regCredential, setRegCredential] = useState(null)

  const [authRpId, setAuthRpId] = useState('')
  const [authChallenge, setAuthChallenge] = useState('')
  const [authUserVerification, setAuthUserVerification] = useState('preferred')
  const [authTimeout, setAuthTimeout] = useState(60000)
  const [authCredentialId, setAuthCredentialId] = useState('')
  const [authOptionsJson, setAuthOptionsJson] = useState('')
  const [authResult, setAuthResult] = useState(null)

  const [parseClientDataInput, setParseClientDataInput] = useState('')
  const [parsedClientData, setParsedClientData] = useState(null)
  const [parseAttestationInput, setParseAttestationInput] = useState('')
  const [parsedAttestation, setParsedAttestation] = useState(null)

  const [copyStatus, setCopyStatus] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const cap = checkWebAuthnSupport()
    setCapability(cap)
    setRegRpId(window.location.hostname)
    setAuthRpId(window.location.hostname)
  }, [])

  const handleCopy = useCallback(async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.width = '1px'
      textarea.style.height = '1px'
      document.body.appendChild(textarea)
      try {
        textarea.select()
        document.execCommand('copy')
        setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
      } catch {
        setCopyStatus({ type: 'error', message: `复制失败：${err?.message || '未知错误'}` })
      }
      document.body.removeChild(textarea)
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

  const regenerateRegistrationFields = useCallback(() => {
    setRegChallenge(generateChallenge(32))
    setRegUserId(generateUserId(16))
  }, [])

  const regenerateAuthenticationFields = useCallback(() => {
    setAuthChallenge(generateChallenge(32))
  }, [])

  useEffect(() => {
    regenerateRegistrationFields()
    regenerateAuthenticationFields()
  }, [regenerateRegistrationFields, regenerateAuthenticationFields])

  const generateRegistrationOptions = useCallback(() => {
    const options = createRegistrationOptions({
      rpName: regRpName,
      rpId: regRpId,
      userName: regUserName,
      userDisplayName: regUserDisplayName,
      userId: regUserId,
      challenge: regChallenge,
      authenticatorAttachment: regAuthenticatorAttachment,
      userVerification: regUserVerification,
      residentKey: regResidentKey,
      requireResidentKey: regRequireResidentKey,
      attestation: regAttestation,
      timeout: regTimeout,
    })
    setRegOptionsJson(JSON.stringify(options, null, 2))
  }, [
    regRpName,
    regRpId,
    regUserName,
    regUserDisplayName,
    regUserId,
    regChallenge,
    regAuthenticatorAttachment,
    regUserVerification,
    regResidentKey,
    regRequireResidentKey,
    regAttestation,
    regTimeout,
  ])

  const generateAuthenticationOptions = useCallback(() => {
    const allowCredentials = authCredentialId
      ? [{ type: 'public-key', id: authCredentialId }]
      : []
    const options = createAuthenticationOptions({
      rpId: authRpId,
      challenge: authChallenge,
      userVerification: authUserVerification,
      timeout: authTimeout,
      allowCredentials,
    })
    setAuthOptionsJson(JSON.stringify(options, null, 2))
  }, [authRpId, authChallenge, authUserVerification, authTimeout, authCredentialId])

  const loadPasskeyRegistrationTemplate = useCallback(() => {
    setRegRpName(PASSKEY_REGISTRATION_TEMPLATE.rpName)
    setRegUserName(PASSKEY_REGISTRATION_TEMPLATE.userName)
    setRegUserDisplayName(PASSKEY_REGISTRATION_TEMPLATE.userDisplayName)
    setRegAuthenticatorAttachment(PASSKEY_REGISTRATION_TEMPLATE.authenticatorAttachment)
    setRegUserVerification(PASSKEY_REGISTRATION_TEMPLATE.userVerification)
    setRegResidentKey(PASSKEY_REGISTRATION_TEMPLATE.residentKey)
    setRegRequireResidentKey(PASSKEY_REGISTRATION_TEMPLATE.requireResidentKey)
    setRegAttestation(PASSKEY_REGISTRATION_TEMPLATE.attestation)
  }, [])

  const loadPasskeyAuthenticationTemplate = useCallback(() => {
    setAuthUserVerification(PASSKEY_AUTHENTICATION_TEMPLATE.userVerification)
    setAuthCredentialId('')
  }, [])

  const convertCredentialToJSON = useCallback((credential) => {
    const response = credential.response
    return {
      id: credential.id,
      rawId: uint8ArrayToBase64Url(new Uint8Array(credential.rawId)),
      type: credential.type,
      response: {
        clientDataJSON: uint8ArrayToBase64Url(new Uint8Array(response.clientDataJSON)),
        attestationObject: response.attestationObject
          ? uint8ArrayToBase64Url(new Uint8Array(response.attestationObject))
          : undefined,
        authenticatorData: response.authenticatorData
          ? uint8ArrayToBase64Url(new Uint8Array(response.authenticatorData))
          : undefined,
        signature: response.signature
          ? uint8ArrayToBase64Url(new Uint8Array(response.signature))
          : undefined,
        userHandle: response.userHandle
          ? uint8ArrayToBase64Url(new Uint8Array(response.userHandle))
          : undefined,
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    }
  }, [])

  const performRegistration = useCallback(async () => {
    setErrorMessage('')
    setRegCredential(null)
    setIsLoading(true)

    try {
      const options = createRegistrationOptions({
        rpName: regRpName,
        rpId: regRpId,
        userName: regUserName,
        userDisplayName: regUserDisplayName,
        userId: regUserId,
        challenge: regChallenge,
        authenticatorAttachment: regAuthenticatorAttachment,
        userVerification: regUserVerification,
        residentKey: regResidentKey,
        requireResidentKey: regRequireResidentKey,
        attestation: regAttestation,
        timeout: regTimeout,
      })

      const challengeBytes = Uint8Array.from(atob(options.publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - options.publicKey.challenge.length % 4) % 4)), c => c.charCodeAt(0))
      const userIdBytes = Uint8Array.from(atob(options.publicKey.user.id.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - options.publicKey.user.id.length % 4) % 4)), c => c.charCodeAt(0))

      const credential = await navigator.credentials.create({
        publicKey: {
          ...options.publicKey,
          challenge: challengeBytes,
          user: {
            ...options.publicKey.user,
            id: userIdBytes,
          },
        },
      })

      const credentialJson = convertCredentialToJSON(credential)
      setRegCredential(credentialJson)
      setAuthCredentialId(credentialJson.rawId)
    } catch (err) {
      setErrorMessage(`注册失败：${err.name} - ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [
    regRpName,
    regRpId,
    regUserName,
    regUserDisplayName,
    regUserId,
    regChallenge,
    regAuthenticatorAttachment,
    regUserVerification,
    regResidentKey,
    regRequireResidentKey,
    regAttestation,
    regTimeout,
    convertCredentialToJSON,
  ])

  const performAuthentication = useCallback(async () => {
    setErrorMessage('')
    setAuthResult(null)
    setIsLoading(true)

    try {
      const allowCredentials = authCredentialId
        ? [{ type: 'public-key', id: authCredentialId }]
        : []
      const options = createAuthenticationOptions({
        rpId: authRpId,
        challenge: authChallenge,
        userVerification: authUserVerification,
        timeout: authTimeout,
        allowCredentials,
      })

      const challengeBytes = Uint8Array.from(atob(options.publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - options.publicKey.challenge.length % 4) % 4)), c => c.charCodeAt(0))
      const credential = await navigator.credentials.get({
        publicKey: {
          ...options.publicKey,
          challenge: challengeBytes,
          allowCredentials: allowCredentials.map(c => ({
            ...c,
            id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - c.id.length % 4) % 4)), char => char.charCodeAt(0)),
          })),
        },
      })

      const credentialJson = convertCredentialToJSON(credential)
      setAuthResult(credentialJson)
    } catch (err) {
      setErrorMessage(`认证失败：${err.name} - ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [authRpId, authChallenge, authUserVerification, authTimeout, authCredentialId, convertCredentialToJSON])

  const handleParseClientData = useCallback(() => {
    if (!parseClientDataInput.trim()) {
      setParsedClientData(null)
      return
    }
    try {
      const parsed = parseClientDataJSON(parseClientDataInput.trim())
      setParsedClientData(parsed)
      setErrorMessage('')
    } catch (err) {
      setErrorMessage(`解析失败：${err.message}`)
      setParsedClientData(null)
    }
  }, [parseClientDataInput])

  const handleParseAttestation = useCallback(() => {
    if (!parseAttestationInput.trim()) {
      setParsedAttestation(null)
      return
    }
    try {
      const parsed = parseAttestationObject(parseAttestationInput.trim())
      setParsedAttestation(parsed)
      setErrorMessage('')
    } catch (err) {
      setErrorMessage(`解析失败：${err.message}`)
      setParsedAttestation(null)
    }
  }, [parseAttestationInput])

  return (
    <div className="webauthn-explainer">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'registration' ? 'active' : ''}`}
          onClick={() => setActiveTab('registration')}
        >
          注册流程
        </button>
        <button
          className={`tab-btn ${activeTab === 'authentication' ? 'active' : ''}`}
          onClick={() => setActiveTab('authentication')}
        >
          断言流程
        </button>
        <button
          className={`tab-btn ${activeTab === 'parser' ? 'active' : ''}`}
          onClick={() => setActiveTab('parser')}
        >
          字段摘要
        </button>
        <button
          className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          说明文档
        </button>
      </div>

      {errorMessage && (
        <div className="error-box">
          <strong>错误</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {capability && !capability.supported && (
        <div className="warning-box">
          <strong>浏览器不支持 WebAuthn</strong>
          <p>您的浏览器不支持 WebAuthn API，请使用现代浏览器（Chrome、Firefox、Safari、Edge）访问。</p>
        </div>
      )}

      {capability && capability.supported && !capability.isSecureContext && (
        <div className="warning-box">
          <strong>非安全上下文</strong>
          <p>WebAuthn 需要 HTTPS 或 localhost 环境才能正常工作。当前页面不在安全上下文中。</p>
        </div>
      )}

      {activeTab === 'registration' && (
        <section className="tool-section">
          <h2>WebAuthn 注册流程</h2>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="reg-rp-name">RP 名称</label>
              <input
                id="reg-rp-name"
                type="text"
                value={regRpName}
                onChange={(e) => setRegRpName(e.target.value)}
                className="text-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-rp-id">RP ID</label>
              <input
                id="reg-rp-id"
                type="text"
                value={regRpId}
                onChange={(e) => setRegRpId(e.target.value)}
                className="text-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-user-name">用户名</label>
              <input
                id="reg-user-name"
                type="text"
                value={regUserName}
                onChange={(e) => setRegUserName(e.target.value)}
                className="text-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-user-display-name">用户显示名</label>
              <input
                id="reg-user-display-name"
                type="text"
                value={regUserDisplayName}
                onChange={(e) => setRegUserDisplayName(e.target.value)}
                className="text-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-user-id">user.id (Base64URL)</label>
              <div className="input-with-btn">
                <input
                  id="reg-user-id"
                  type="text"
                  value={regUserId}
                  onChange={(e) => setRegUserId(e.target.value)}
                  className="text-input"
                />
                <button
                  className="small-btn"
                  onClick={() => setRegUserId(generateUserId(16))}
                  title="重新生成"
                >
                  🔄
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-challenge">Challenge (Base64URL)</label>
              <div className="input-with-btn">
                <input
                  id="reg-challenge"
                  type="text"
                  value={regChallenge}
                  onChange={(e) => setRegChallenge(e.target.value)}
                  className="text-input"
                />
                <button
                  className="small-btn"
                  onClick={() => setRegChallenge(generateChallenge(32))}
                  title="重新生成"
                >
                  🔄
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-authenticator-attachment">认证器挂载方式</label>
              <select
                id="reg-authenticator-attachment"
                value={regAuthenticatorAttachment}
                onChange={(e) => setRegAuthenticatorAttachment(e.target.value)}
                className="select-input"
              >
                <option value="">不限制</option>
                {AUTHENTICATOR_ATTACHMENTS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reg-user-verification">用户验证要求</label>
              <select
                id="reg-user-verification"
                value={regUserVerification}
                onChange={(e) => setRegUserVerification(e.target.value)}
                className="select-input"
              >
                {USER_VERIFICATION_REQUIREMENTS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reg-resident-key">常驻密钥要求</label>
              <select
                id="reg-resident-key"
                value={regResidentKey}
                onChange={(e) => setRegResidentKey(e.target.value)}
                className="select-input"
              >
                {RESIDENT_KEY_REQUIREMENTS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reg-attestation">Attestation 传递</label>
              <select
                id="reg-attestation"
                value={regAttestation}
                onChange={(e) => setRegAttestation(e.target.value)}
                className="select-input"
              >
                {ATTESTATION_CONVEYANCE_PREFERENCES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reg-timeout">超时时间 (ms)</label>
              <input
                id="reg-timeout"
                type="number"
                min="10000"
                max="300000"
                value={regTimeout}
                onChange={(e) => setRegTimeout(Number(e.target.value))}
                className="number-input"
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={regRequireResidentKey}
                  onChange={(e) => setRegRequireResidentKey(e.target.checked)}
                />
                requireResidentKey（旧版）
              </label>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={generateRegistrationOptions}
            >
              生成选项 JSON
            </button>
            <button
              className="secondary-btn"
              onClick={loadPasskeyRegistrationTemplate}
            >
              Passkey 模板
            </button>
            {capability?.supported && capability?.isSecureContext && (
              <button
                className="success-btn"
                onClick={performRegistration}
                disabled={isLoading}
              >
                {isLoading ? '执行中...' : '执行注册 Ceremony'}
              </button>
            )}
          </div>

          {regOptionsJson && (
            <div className="result-box">
              <div className="result-header">
                <span className="result-label">navigator.credentials.create() 选项</span>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(regOptionsJson, '选项 JSON')}
                >
                  复制
                </button>
              </div>
              <pre className="json-preview">{regOptionsJson}</pre>
            </div>
          )}

          {regCredential && (
            <div className="result-box">
              <div className="result-header">
                <span className="result-label">注册凭证结果</span>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(JSON.stringify(regCredential, null, 2), '凭证结果')}
                >
                  复制
                </button>
              </div>
              <pre className="json-preview">{JSON.stringify(regCredential, null, 2)}</pre>
            </div>
          )}
        </section>
      )}

      {activeTab === 'authentication' && (
        <section className="tool-section">
          <h2>WebAuthn 断言流程</h2>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="auth-rp-id">RP ID</label>
              <input
                id="auth-rp-id"
                type="text"
                value={authRpId}
                onChange={(e) => setAuthRpId(e.target.value)}
                className="text-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="auth-challenge">Challenge (Base64URL)</label>
              <div className="input-with-btn">
                <input
                  id="auth-challenge"
                  type="text"
                  value={authChallenge}
                  onChange={(e) => setAuthChallenge(e.target.value)}
                  className="text-input"
                />
                <button
                  className="small-btn"
                  onClick={() => setAuthChallenge(generateChallenge(32))}
                  title="重新生成"
                >
                  🔄
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="auth-user-verification">用户验证要求</label>
              <select
                id="auth-user-verification"
                value={authUserVerification}
                onChange={(e) => setAuthUserVerification(e.target.value)}
                className="select-input"
              >
                {USER_VERIFICATION_REQUIREMENTS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="auth-timeout">超时时间 (ms)</label>
              <input
                id="auth-timeout"
                type="number"
                min="10000"
                max="300000"
                value={authTimeout}
                onChange={(e) => setAuthTimeout(Number(e.target.value))}
                className="number-input"
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="auth-credential-id">allowCredentials 凭证 ID (Base64URL，空表示 discoverable)</label>
              <input
                id="auth-credential-id"
                type="text"
                value={authCredentialId}
                onChange={(e) => setAuthCredentialId(e.target.value)}
                placeholder="留空进行无用户名登录（discoverable credential）"
                className="text-input"
              />
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={generateAuthenticationOptions}
            >
              生成选项 JSON
            </button>
            <button
              className="secondary-btn"
              onClick={loadPasskeyAuthenticationTemplate}
            >
              Passkey 模板
            </button>
            {capability?.supported && capability?.isSecureContext && (
              <button
                className="success-btn"
                onClick={performAuthentication}
                disabled={isLoading}
              >
                {isLoading ? '执行中...' : '执行认证 Ceremony'}
              </button>
            )}
          </div>

          {authOptionsJson && (
            <div className="result-box">
              <div className="result-header">
                <span className="result-label">navigator.credentials.get() 选项</span>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(authOptionsJson, '选项 JSON')}
                >
                  复制
                </button>
              </div>
              <pre className="json-preview">{authOptionsJson}</pre>
            </div>
          )}

          {authResult && (
            <div className="result-box">
              <div className="result-header">
                <span className="result-label">认证断言结果</span>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(JSON.stringify(authResult, null, 2), '断言结果')}
                >
                  复制
                </button>
              </div>
              <pre className="json-preview">{JSON.stringify(authResult, null, 2)}</pre>
            </div>
          )}
        </section>
      )}

      {activeTab === 'parser' && (
        <section className="tool-section">
          <h2>字段摘要解析</h2>

          <div className="parser-section">
            <h3>clientDataJSON 解析</h3>
            <div className="form-group full-width">
              <label htmlFor="parse-client-data">输入 clientDataJSON（Base64URL 或 JSON 字符串）</label>
              <textarea
                id="parse-client-data"
                className="code-textarea"
                value={parseClientDataInput}
                onChange={(e) => setParseClientDataInput(e.target.value)}
                placeholder="输入 Base64URL 编码的 clientDataJSON 或原始 JSON 字符串..."
                rows={4}
              />
            </div>
            <div className="action-row">
              <button className="primary-btn" onClick={handleParseClientData}>
                解析
              </button>
            </div>

            {parsedClientData && (
              <div className="result-box">
                <div className="result-header">
                  <span className="result-label">clientDataJSON 解析结果</span>
                </div>
                <div className="parse-result">
                  <div className="parse-item">
                    <span className="parse-label">type:</span>
                    <span className="parse-value">{parsedClientData.type}</span>
                    <span className="parse-desc">({getClientDataTypeDescription(parsedClientData.type)})</span>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">challenge:</span>
                    <code className="parse-value-code">{parsedClientData.challenge}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">origin:</span>
                    <span className="parse-value">{parsedClientData.origin}</span>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">crossOrigin:</span>
                    <span className="parse-value">{parsedClientData.crossOrigin ? '是' : '否'}</span>
                  </div>
                  {parsedClientData.tokenBinding && (
                    <div className="parse-item">
                      <span className="parse-label">tokenBinding:</span>
                      <code className="parse-value-code">{JSON.stringify(parsedClientData.tokenBinding)}</code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="parser-section">
            <h3>attestationObject / authData 解析</h3>
            <div className="form-group full-width">
              <label htmlFor="parse-attestation">输入 attestationObject（Base64URL）</label>
              <textarea
                id="parse-attestation"
                className="code-textarea"
                value={parseAttestationInput}
                onChange={(e) => setParseAttestationInput(e.target.value)}
                placeholder="输入 Base64URL 编码的 attestationObject..."
                rows={4}
              />
            </div>
            <div className="action-row">
              <button className="primary-btn" onClick={handleParseAttestation}>
                解析
              </button>
            </div>

            {parsedAttestation && (
              <div className="result-box">
                <div className="result-header">
                  <span className="result-label">attestationObject 解析摘要</span>
                </div>
                <div className="parse-result">
                  <div className="parse-item">
                    <span className="parse-label">fmt:</span>
                    <span className="parse-value">{parsedAttestation.fmt}</span>
                    <span className="parse-desc">({parsedAttestation.fmtDescription})</span>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">attStmt 字段:</span>
                    <span className="parse-value">{parsedAttestation.attStmtFields.join(', ') || '无'}</span>
                  </div>
                </div>

                <h4 className="sub-header">authData 摘要</h4>
                <div className="parse-result">
                  <div className="parse-item">
                    <span className="parse-label">rpIdHash:</span>
                    <code className="parse-value-code">{parsedAttestation.authData.rpIdHashHex}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">flags:</span>
                    <span className="parse-value">0x{parsedAttestation.authData.flags.raw.toString(16).padStart(2, '0')}</span>
                    <span className="parse-desc">({parsedAttestation.authData.flagDescriptions.join(', ')})</span>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">signCount:</span>
                    <span className="parse-value">{parsedAttestation.authData.signCount}</span>
                  </div>
                </div>

                {parsedAttestation.authData.attestedCredentialData && (
                  <>
                    <h4 className="sub-header">attestedCredentialData</h4>
                    <div className="parse-result">
                      <div className="parse-item">
                        <span className="parse-label">AAGUID:</span>
                        <code className="parse-value-code">{parsedAttestation.authData.attestedCredentialData.aaguidHex}</code>
                      </div>
                      <div className="parse-item">
                        <span className="parse-label">credentialId:</span>
                        <code className="parse-value-code">{parsedAttestation.authData.attestedCredentialData.credentialId}</code>
                      </div>
                      <div className="parse-item">
                        <span className="parse-label">credentialIdLength:</span>
                        <span className="parse-value">{parsedAttestation.authData.attestedCredentialData.credentialIdLength}</span>
                      </div>
                    </div>

                    <h4 className="sub-header">公钥 COSE 关键字段</h4>
                    <div className="parse-result">
                      <div className="parse-item">
                        <span className="parse-label">kty:</span>
                        <span className="parse-value">{parsedAttestation.authData.attestedCredentialData.credentialPublicKey.ktyName}</span>
                      </div>
                      <div className="parse-item">
                        <span className="parse-label">alg:</span>
                        <span className="parse-value">{parsedAttestation.authData.attestedCredentialData.credentialPublicKey.algName}</span>
                      </div>
                      {parsedAttestation.authData.attestedCredentialData.credentialPublicKey.crv && (
                        <div className="parse-item">
                          <span className="parse-label">crv:</span>
                          <span className="parse-value">{parsedAttestation.authData.attestedCredentialData.credentialPublicKey.crvName}</span>
                        </div>
                      )}
                      {parsedAttestation.authData.attestedCredentialData.credentialPublicKey.x && (
                        <div className="parse-item">
                          <span className="parse-label">x:</span>
                          <code className="parse-value-code">{parsedAttestation.authData.attestedCredentialData.credentialPublicKey.x?.slice(0, 20)}...</code>
                        </div>
                      )}
                      {parsedAttestation.authData.attestedCredentialData.credentialPublicKey.y && (
                        <div className="parse-item">
                          <span className="parse-label">y:</span>
                          <code className="parse-value-code">{parsedAttestation.authData.attestedCredentialData.credentialPublicKey.y?.slice(0, 20)}...</code>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'docs' && (
        <section className="tool-section">
          <h2>WebAuthn / FIDO2 说明文档</h2>

          <div className="doc-section">
            <h3>Capability 检测结果</h3>
            {capability && (
              <div className="capability-grid">
                <div className={`capability-item ${capability.supported ? 'success' : 'failure'}`}>
                  <span>WebAuthn 支持</span>
                  <strong>{capability.supported ? '✓ 支持' : '✗ 不支持'}</strong>
                </div>
                <div className={`capability-item ${capability.isSecureContext ? 'success' : 'failure'}`}>
                  <span>安全上下文</span>
                  <strong>{capability.isSecureContext ? '✓ 是' : '✗ 否'}</strong>
                </div>
                <div className={`capability-item ${capability.credentialsApi ? 'success' : 'failure'}`}>
                  <span>Credentials API</span>
                  <strong>{capability.credentialsApi ? '✓ 可用' : '✗ 不可用'}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="doc-section">
            <h3>RP ID 与 Effective Domain 关系</h3>
            <h4>规则</h4>
            <ul>
              {RP_ID_DOCUMENTATION.rules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
            <h4>示例</h4>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Origin</th>
                  <th>有效 RP ID</th>
                </tr>
              </thead>
              <tbody>
                {RP_ID_DOCUMENTATION.examples.map((ex, idx) => (
                  <tr key={idx}>
                    <td><code>{ex.origin}</code></td>
                    <td>{ex.validRpIds.map(id => <code key={id}>{id}</code>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr], [])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4>注意事项</h4>
            <ul>
              {RP_ID_DOCUMENTATION.notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="doc-section">
            <h3>常见错误对照表</h3>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>错误名称</th>
                  <th>描述</th>
                  <th>常见场景</th>
                </tr>
              </thead>
              <tbody>
                {WEBAUTHN_ERRORS.map((err, idx) => (
                  <tr key={idx}>
                    <td><code>{err.name}</code></td>
                    <td>{err.description}</td>
                    <td>{err.scenario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="doc-section">
            <h3>pubKeyCredParams 常用算法</h3>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>COSE alg</th>
                  <th>算法名称</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>-7</code></td>
                  <td>ES256 (ECDSA w/ SHA-256)</td>
                </tr>
                <tr>
                  <td><code>-8</code></td>
                  <td>EdDSA</td>
                </tr>
                <tr>
                  <td><code>-257</code></td>
                  <td>RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)</td>
                </tr>
                <tr>
                  <td><code>-37</code></td>
                  <td>PS256 (RSASSA-PSS w/ SHA-256)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
