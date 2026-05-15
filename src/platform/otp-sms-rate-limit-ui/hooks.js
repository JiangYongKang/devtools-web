import { useEffect, useRef, useState, useCallback } from 'react'
import { createOtpSender, OTP_STATES } from './logic/index.js'

export function useOtpSender(config = {}) {
  const otpSenderRef = useRef(null)
  const [snapshot, setSnapshot] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    otpSenderRef.current = createOtpSender(config)
    setSnapshot(otpSenderRef.current.getSnapshot())

    const unsubscribe = otpSenderRef.current.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot)
    })

    return () => {
      unsubscribe()
      otpSenderRef.current?.destroy()
    }
  }, [])

  const send = useCallback(async (identifier, options = {}) => {
    if (!otpSenderRef.current) return
    setIsLoading(true)
    try {
      const result = await otpSenderRef.current.send(identifier, options)
      return result
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    otpSenderRef.current?.reset()
  }, [])

  const forceSuccess = useCallback(() => {
    otpSenderRef.current?.forceSuccess()
  }, [])

  const forceFailure = useCallback(() => {
    otpSenderRef.current?.forceFailure()
  }, [])

  const force429 = useCallback(() => {
    otpSenderRef.current?.force429()
  }, [])

  const canSend =
    snapshot &&
    (snapshot.state === OTP_STATES.IDLE ||
      snapshot.state === OTP_STATES.RESEND_READY) &&
    snapshot.rateLimiter.canSend

  return {
    canSend,
    force429,
    forceFailure,
    forceSuccess,
    isLoading,
    reset,
    send,
    snapshot,
  }
}

export function useCooldownTimer(remainingMs, cooldownMs) {
  const [progress, setProgress] = useState(0)
  const [remaining, setRemaining] = useState(remainingMs)

  useEffect(() => {
    if (!remainingMs || remainingMs <= 0 || !cooldownMs || cooldownMs <= 0) {
      setProgress(0)
      setRemaining(0)
      return
    }

    setRemaining(remainingMs)
    setProgress((cooldownMs - remainingMs) / cooldownMs)

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1000
        if (next <= 0) {
          clearInterval(interval)
          return 0
        }
        return next
      })
      setProgress((prev) => {
        const next = prev + 1000 / cooldownMs
        return Math.min(1, next)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [remainingMs, cooldownMs])

  return {
    progress,
    remainingSeconds: Math.ceil(remaining / 1000),
  }
}

export function useAriaAnnouncement() {
  const [announcement, setAnnouncement] = useState('')

  const announce = useCallback((message) => {
    setAnnouncement('')
    setTimeout(() => setAnnouncement(message), 50)
  }, [])

  return { announcement, announce }
}
