import { useEffect, useRef, useCallback } from 'react'
import { ERROR_SOURCES, ENVIRONMENTS } from './logic/constants.js'
import { mapToErrorCode } from './logic/errorCodeMap.js'
import { generateFingerprint, createThrottleStore, shouldReport, recordReport } from './logic/fingerprint.js'
import { assembleDiagnosticPackage } from './logic/index.js'
import { sendToCollector, getDefaultCollector } from './logic/reporter.js'
import { createGlobalErrorListener, isListenerActive, clearSingleton, markHandled } from './logic/listener.js'

function getEnvironment() {
    if (typeof process !== 'undefined' && process.env) {
        return process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT
    }
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.MODE || import.meta.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT
    }
    return ENVIRONMENTS.DEVELOPMENT
}

export function GlobalErrorListener({ onGlobalError, collector, enabled = true }) {
    const listenerRef = useRef(null)
    const throttleStoreRef = useRef(createThrottleStore())
    const collectorRef = useRef(collector || getDefaultCollector())
    const isDev = getEnvironment() === ENVIRONMENTS.DEVELOPMENT

    const handleEvents = useCallback((events) => {
        for (const event of events) {
            const error = event.isPromiseRejection
                ? (event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
                : (event.error || new Error(event.message || 'Unknown global error'))

            if (isDev) {
                console.groupCollapsed('GlobalErrorListener captured:')
                console.error('Event:', event)
                console.groupEnd()
            }

            const fingerprint = generateFingerprint(error)
            const throttleCheck = shouldReport(fingerprint, throttleStoreRef.current)

            if (!throttleCheck.shouldReport) {
                if (isDev) {
                    console.warn(
                        `Error throttled (fingerprint=${fingerprint}, count=${throttleCheck.count})`
                    )
                }
                continue
            }

            recordReport(fingerprint, throttleStoreRef.current)

            const errorCode = mapToErrorCode(error, event.eventType)

            const source = event.isPromiseRejection
                ? ERROR_SOURCES.GLOBAL_UNHANDLED_REJECTION
                : ERROR_SOURCES.GLOBAL_ERROR

            const diagnosticPackage = assembleDiagnosticPackage({
                error,
                source,
                errorCode,
                customContext: {
                    eventDetails: {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                        isPromiseRejection: event.isPromiseRejection,
                    },
                },
            })

            markHandled(error)

            sendToCollector(diagnosticPackage, collectorRef.current)

            if (onGlobalError) {
                onGlobalError(event, diagnosticPackage)
            }
        }
    }, [onGlobalError])

    useEffect(() => {
        if (!enabled) return

        if (isListenerActive()) {
            return
        }

        const listener = createGlobalErrorListener(handleEvents)
        if (!listener) {
            return
        }

        listener.start()
        listenerRef.current = listener

        return () => {
            if (listenerRef.current) {
                listenerRef.current.stop()
                listenerRef.current = null
                clearSingleton()
            }
        }
    }, [enabled, handleEvents])

    return null
}

export default GlobalErrorListener
