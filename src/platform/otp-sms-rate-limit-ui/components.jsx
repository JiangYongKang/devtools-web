import React from 'react'
import { CHANNEL_LABELS, CHANNEL_TYPES, OTP_STATES, UI_TEXT } from './logic/index.js'
import { useCooldownTimer } from './hooks.js'

const validateIdentifier = (identifier, channelType) => {
  if (!identifier || !identifier.trim()) {
    return { valid: false, message: '请输入必填信息' }
  }

  if (channelType === CHANNEL_TYPES.SMS) {
    const phoneRegex = /^(\+?86\s?)?1[3-9]\d{9}$/
    if (!phoneRegex.test(identifier.trim())) {
      return { valid: false, message: '请输入有效的手机号码（支持 +86 区号）' }
    }
  }

  if (channelType === CHANNEL_TYPES.EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(identifier.trim())) {
      return { valid: false, message: '请输入有效的邮箱地址' }
    }
  }

  return { valid: true }
}

export function CooldownProgressRing({ remainingMs, cooldownMs }) {
  const { progress, remainingSeconds } = useCooldownTimer(remainingMs, cooldownMs)
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  return (
    <div
      className="otp-cooldown-ring"
      role="progressbar"
      aria-valuenow={remainingSeconds}
      aria-valuemin={0}
      aria-valuemax={cooldownMs / 1000}
      aria-label={`剩余 ${remainingSeconds} 秒后可重新发送`}
    >
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle className="bg" cx="18" cy="18" r={radius} />
        <circle
          className="progress"
          cx="18"
          cy="18"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="otp-cooldown-count">{remainingSeconds}</span>
    </div>
  )
}

export function OtpStatusRow({ state }) {
  const statusConfig = {
    [OTP_STATES.IDLE]: { icon: '⏳', text: UI_TEXT.status.idle },
    [OTP_STATES.SENDING]: { icon: '🔄', text: UI_TEXT.status.sending },
    [OTP_STATES.COOLDOWN]: { icon: '⏱️', text: UI_TEXT.status.cooldown },
    [OTP_STATES.RESEND_READY]: { icon: '✅', text: UI_TEXT.status.resend_ready },
    [OTP_STATES.LOCKED]: { icon: '🔒', text: UI_TEXT.status.locked },
  }

  const config = statusConfig[state] || statusConfig[OTP_STATES.IDLE]

  return (
    <div className={`otp-status-row ${state}`}>
      <span className="otp-status-icon">{config.icon}</span>
      <span className="otp-status-text">{config.text}</span>
    </div>
  )
}

export function OtpLockedMessage() {
  return (
    <div className="otp-locked-message">
      <div className="otp-locked-title">发送次数已达上限</div>
      <div className="otp-locked-desc">请联系客服解锁或稍后再试</div>
    </div>
  )
}

export function SimControls({ onForceSuccess, onForceFailure, onForce429, currentMode }) {
  return (
    <div className="otp-sim-controls">
      <button
        type="button"
        className={`otp-sim-btn success ${currentMode === 'success' ? 'active' : ''}`}
        onClick={onForceSuccess}
        aria-label="模拟发送成功"
        aria-pressed={currentMode === 'success'}
      >
        {currentMode === 'success' ? '✓ ' : ''}模拟成功
      </button>
      <button
        type="button"
        className={`otp-sim-btn failure ${currentMode === 'failure' ? 'active' : ''}`}
        onClick={onForceFailure}
        aria-label="模拟网络失败"
        aria-pressed={currentMode === 'failure'}
      >
        {currentMode === 'failure' ? '✓ ' : ''}模拟失败
      </button>
      <button
        type="button"
        className={`otp-sim-btn rate429 ${currentMode === 'rate429' ? 'active' : ''}`}
        onClick={onForce429}
        aria-label="模拟请求过于频繁"
        aria-pressed={currentMode === 'rate429'}
      >
        {currentMode === 'rate429' ? '✓ ' : ''}模拟 429
      </button>
    </div>
  )
}

export function OtpStats({ snapshot }) {
  if (!snapshot) return null

  return (
    <div className="otp-stats-panel">
      <div className="otp-stats-title">发送统计</div>
      <div className="otp-stats-grid">
        <div className="otp-stat-item">
          <div className="otp-stat-value">{snapshot.context.sendSuccessCount || 0}</div>
          <div className="otp-stat-label">成功次数</div>
        </div>
        <div className="otp-stat-item">
          <div className="otp-stat-value">{snapshot.context.sendFailCount || 0}</div>
          <div className="otp-stat-label">失败次数</div>
        </div>
        <div className="otp-stat-item">
          <div className="otp-stat-value">{snapshot.rateLimiter.tokenBucket}</div>
          <div className="otp-stat-label">令牌桶余量</div>
        </div>
      </div>
    </div>
  )
}

export function OtpCard({ channelType, otpSender, ariaAnnounce }) {
  const { canSend, isLoading, snapshot, send, reset, forceSuccess, forceFailure, force429 } =
    otpSender
  const [identifier, setIdentifier] = React.useState('')
  const [otpCode, setOtpCode] = React.useState('')
  const [validationError, setValidationError] = React.useState('')
  const [simMode, setSimMode] = React.useState(null)

  const handleSend = async () => {
    const validation = validateIdentifier(identifier, channelType)
    if (!validation.valid) {
      setValidationError(validation.message)
      ariaAnnounce(validation.message)
      return
    }
    setValidationError('')

    try {
      ariaAnnounce('正在发送验证码')
      await send(identifier.trim())
      ariaAnnounce('验证码发送成功')
    } catch (error) {
      ariaAnnounce(`发送失败: ${error.message}`)
    }
  }

  const getButtonClass = () => {
    if (snapshot?.state === OTP_STATES.SENDING || isLoading) return 'loading'
    if (snapshot?.state === OTP_STATES.COOLDOWN) return 'cooldown'
    if (snapshot?.state === OTP_STATES.LOCKED) return 'locked'
    return ''
  }

  const getButtonText = () => {
    if (!snapshot) {
      return UI_TEXT.sendButton.idle
    }
    if (snapshot.state === OTP_STATES.SENDING || isLoading) {
      return UI_TEXT.sendButton.sending
    }
    if (snapshot.state === OTP_STATES.COOLDOWN) {
      return `${snapshot.remainingCooldownSeconds || 0} 秒后重发`
    }
    if (snapshot.state === OTP_STATES.LOCKED) {
      return UI_TEXT.sendButton.locked
    }
    return snapshot.state === OTP_STATES.RESEND_READY
      ? UI_TEXT.sendButton.resend_ready
      : UI_TEXT.sendButton.idle
  }

  const isLocked = snapshot?.state === OTP_STATES.LOCKED
  const isCooldown = snapshot?.state === OTP_STATES.COOLDOWN

  return (
    <div className="otp-card">
      <div className={`otp-card-header ${channelType}`}>
        <div className="otp-channel-type">{channelType}</div>
        <div className="otp-channel-label">{CHANNEL_LABELS[channelType]}</div>
      </div>
      <div className="otp-card-body">
        {snapshot && <OtpStatusRow state={snapshot.state} />}

        {snapshot?.lastError && (
          <div className="otp-error-message" role="alert">
            {snapshot.lastError}
          </div>
        )}

        {isLocked ? (
          <OtpLockedMessage />
        ) : (
          <>
            <div className="otp-input-group">
              <label className="otp-input-label" htmlFor={`${channelType}-identifier`}>
                {channelType === CHANNEL_TYPES.SMS
                  ? '手机号'
                  : channelType === CHANNEL_TYPES.EMAIL
                  ? '邮箱地址'
                  : '备用码标识'}
              </label>
              <input
                id={`${channelType}-identifier`}
                type="text"
                className={`otp-input ${validationError ? 'error' : ''}`}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  if (validationError) setValidationError('')
                }}
                disabled={!canSend || isCooldown}
                aria-label={`请输入${channelType === CHANNEL_TYPES.SMS ? '手机号' : '邮箱地址'}`}
                aria-invalid={!!validationError}
                placeholder={channelType === CHANNEL_TYPES.SMS ? '请输入手机号' : channelType === CHANNEL_TYPES.EMAIL ? '请输入邮箱地址' : '请输入标识'}
              />
              {validationError && (
                <div className="otp-validation-error" role="alert">
                  {validationError}
                </div>
              )}
            </div>

            <div className="otp-input-group">
              <label className="otp-input-label" htmlFor={`${channelType}-code`}>
                验证码
              </label>
              <div className="otp-code-inputs" aria-label="验证码输入框">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`${channelType}-code-${index}`}
                    type="text"
                    maxLength={1}
                    className="otp-code-input"
                    value={otpCode[index] || ''}
                    onChange={(e) => {
                      const newValue = e.target.value
                      if (newValue && index < 5) {
                        const nextInput = document.getElementById(`${channelType}-code-${index + 1}`)
                        nextInput?.focus()
                      }
                    }}
                    disabled={isCooldown || isLocked}
                    aria-label={`第${index + 1}位验证码`}
                  />
                ))}
              </div>
            </div>

            <div className="otp-send-row">
              <button
                type="button"
                className={`otp-send-button ${getButtonClass()}`}
                onClick={handleSend}
                disabled={!canSend || isCooldown || isLocked}
                aria-label={getButtonText()}
              >
                {getButtonText()}
              </button>
              {isCooldown && snapshot && (
                <CooldownProgressRing
                  remainingMs={snapshot.remainingCooldownMs}
                  cooldownMs={60000}
                />
              )}
            </div>
          </>
        )}

        <SimControls
          currentMode={simMode}
          onForceSuccess={() => {
            forceSuccess()
            setSimMode('success')
            ariaAnnounce('已设置强制成功模式，下次发送将强制成功')
          }}
          onForceFailure={() => {
            forceFailure()
            setSimMode('failure')
            ariaAnnounce('已设置强制失败模式，下次发送将强制失败')
          }}
          onForce429={() => {
            force429()
            setSimMode('rate429')
            ariaAnnounce('已设置强制限流模式，下次发送将返回 429 错误')
          }}
        />

        <OtpStats snapshot={snapshot} />
      </div>
    </div>
  )
}
