import React, { useRef } from 'react'
import { CHANNEL_TYPES } from './logic/index.js'
import { useAriaAnnouncement, useOtpSender } from './hooks.js'
import { OtpCard } from './components.jsx'
import './OtpSmsRateLimitDemo.css'

export default function OtpSmsRateLimitDemo() {
  const { announcement, announce } = useAriaAnnouncement()

  const smsOtp = useOtpSender({
    channelType: CHANNEL_TYPES.SMS,
    rateLimiterConfig: {
      cooldownSeconds: 10,
      maxSendAttempts: 5,
      slidingWindowSeconds: 3600,
      slidingWindowMaxAttempts: 10,
      tokenBucketCapacity: 5,
      tokenRefillRatePerSecond: 1 / 60,
    },
    sendSimulatorConfig: {
      successDelayMs: 1500,
      failureDelayMs: 1000,
    },
    cooldownSeconds: 10,
  })

  const emailOtp = useOtpSender({
    channelType: CHANNEL_TYPES.EMAIL,
    rateLimiterConfig: {
      cooldownSeconds: 15,
      maxSendAttempts: 5,
    },
    sendSimulatorConfig: {
      successDelayMs: 2000,
    },
    cooldownSeconds: 15,
  })

  const totpOtp = useOtpSender({
    channelType: CHANNEL_TYPES.TOTP,
    rateLimiterConfig: {
      cooldownSeconds: 30,
      maxSendAttempts: 3,
    },
    sendSimulatorConfig: {
      successDelayMs: 1000,
    },
    cooldownSeconds: 30,
  })

  const resetAll = () => {
    smsOtp.reset()
    emailOtp.reset()
    totpOtp.reset()
    announce('所有通道已重置')
  }

  return (
    <div className="otp-demo-container">
      <div aria-live="polite" className="otp-aria-live">
        {announcement}
      </div>

      <header className="otp-demo-header">
        <h1 className="otp-demo-title">OTP 验证码限流演示</h1>
        <p className="otp-demo-subtitle">
          状态机驱动 · 令牌桶限流 · 冷却计时 · 多通道并行
        </p>
      </header>

      <div className="otp-cards-grid">
        <OtpCard channelType={CHANNEL_TYPES.SMS} otpSender={smsOtp} ariaAnnounce={announce} />
        <OtpCard channelType={CHANNEL_TYPES.EMAIL} otpSender={emailOtp} ariaAnnounce={announce} />
        <OtpCard channelType={CHANNEL_TYPES.TOTP} otpSender={totpOtp} ariaAnnounce={announce} />
      </div>

      <div className="otp-demo-controls">
        <button
          type="button"
          className="otp-reset-all-btn"
          onClick={resetAll}
          aria-label="重置所有通道状态"
        >
          重置所有
        </button>
      </div>
    </div>
  )
}
