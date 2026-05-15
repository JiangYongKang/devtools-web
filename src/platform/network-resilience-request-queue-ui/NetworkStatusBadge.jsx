import React from 'react'
import { NETWORK_STATES } from './logic'

const NetworkStatusBadge = ({ networkState, confidence, confidenceBreakdown }) => {
  const statusConfig = {
    [NETWORK_STATES.ONLINE]: {
      label: '在线',
      className: 'status-online',
    },
    [NETWORK_STATES.OFFLINE]: {
      label: '离线',
      className: 'status-offline',
    },
    [NETWORK_STATES.DEGRADED]: {
      label: '降级',
      className: 'status-degraded',
    },
  }

  const config = statusConfig[networkState] || statusConfig[NETWORK_STATES.ONLINE]

  return (
    <div>
      <span className={`status-badge ${config.className}`}>
        <span className="status-icon" />
        {config.label}
        {confidence !== undefined && ` (置信度: ${confidence})`}
      </span>
      {confidenceBreakdown && (
        <div className="confidence-bar">
          {[1, 2, 3, 4, 5].map((level) => {
            const threshold = level * 20
            const isActive = confidence >= threshold
            return (
              <span
                key={level}
                className={`confidence-segment ${isActive ? 'active' : 'inactive'}`}
                style={{ background: isActive ? '#007bff' : '#ccc' }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NetworkStatusBadge
