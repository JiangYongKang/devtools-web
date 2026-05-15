import React, { useRef, useEffect } from 'react'

const EventLog = ({ events }) => {
  const logRef = useRef(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [events])

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour12: false })
  }

  return (
    <div className="event-log" ref={logRef}>
      {events.map((event, index) => (
        <div key={index} className="log-entry">
          <span className="log-time">{formatTime(event.timestamp)}</span>
          <span className="log-event">[{event.type}]</span>
          <span className="log-message">{event.message}</span>
        </div>
      ))}
    </div>
  )
}

export default EventLog
