import { useEffect, useRef } from 'react'

export function Announcer({ message, ariaLive = 'polite' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && message) {
      ref.current.textContent = message
    }
  }, [message])

  return (
    <div
      ref={ref}
      aria-live={ariaLive}
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    />
  )
}

export function useAnnouncer() {
  const announcerRef = useRef(null)

  const announce = (message) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message
    }
  }

  const AnnouncerComponent = () => (
    <div
      ref={announcerRef}
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    />
  )

  return { announce, AnnouncerComponent }
}

export default Announcer
