import { DEFAULT_SEND_SIMULATOR_CONFIG } from './constants.js'
import { createNetworkError, createTooManyRequestsError } from './errors.js'
import { sleep } from './utils.js'

function createSendSimulator(config = {}) {
  const { successDelayMs, failureDelayMs, failureRate, rate429Rate } = {
    ...DEFAULT_SEND_SIMULATOR_CONFIG,
    ...config,
  }

  let forceMode = null

  async function send(phoneNumber, options = {}) {
    const {
      forceSuccess = false,
      forceFailure = false,
      force429 = false,
    } = options

    if (forceSuccess || forceMode === 'success') {
      await sleep(successDelayMs)
      return {
        success: true,
        code: generateOtpCode(),
        expiresIn: 300,
      }
    }

    if (forceFailure || forceMode === 'failure') {
      await sleep(failureDelayMs)
      throw createNetworkError(new Error('Simulated network failure'), {
        phoneNumber,
      })
    }

    if (force429 || forceMode === 'rate429') {
      await sleep(failureDelayMs / 2)
      throw createTooManyRequestsError(60, {
        phoneNumber,
      })
    }

    const random = Math.random()

    if (random < rate429Rate) {
      await sleep(failureDelayMs / 2)
      throw createTooManyRequestsError(60, { phoneNumber })
    }

    if (random < rate429Rate + failureRate) {
      await sleep(failureDelayMs)
      throw createNetworkError(new Error('Network connection failed'), {
        phoneNumber,
      })
    }

    await sleep(successDelayMs)
    return {
      success: true,
      code: generateOtpCode(),
      expiresIn: 300,
    }
  }

  function generateOtpCode() {
    return String(Math.floor(100000 + Math.random() * 900000))
  }

  function setForceMode(mode) {
    forceMode = mode
  }

  function getForceMode() {
    return forceMode
  }

  function clearForceMode() {
    forceMode = null
  }

  return {
    clearForceMode,
    force429: () => setForceMode('rate429'),
    forceFailure: () => setForceMode('failure'),
    forceSuccess: () => setForceMode('success'),
    getForceMode,
    send,
    setForceMode,
  }
}

export { createSendSimulator }
