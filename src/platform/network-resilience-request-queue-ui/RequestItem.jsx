import React from 'react'
import { REQUEST_STATES } from './logic'

const RequestItem = ({ request, onCancel, formatTimeUntil }) => {
  const stateLabels = {
    [REQUEST_STATES.QUEUED]: '排队中',
    [REQUEST_STATES.RUNNING]: '执行中',
    [REQUEST_STATES.RETRYING]: '重试中',
    [REQUEST_STATES.COMPLETED]: '已完成',
    [REQUEST_STATES.FAILED]: '失败',
    [REQUEST_STATES.CANCELLED]: '已取消',
  }

  const canCancel = [REQUEST_STATES.QUEUED, REQUEST_STATES.RUNNING, REQUEST_STATES.RETRYING]

  return (
    <div className={`request-item state-${request.state}`}>
      <span className="request-method">{request.method || 'GET'}</span>
      <span className="request-url" title={request.url}>{request.url}</span>
      <span className="request-priority">P{request.priority || 5}</span>
      <span className="request-state">{stateLabels[request.state] || request.state}</span>
      {request.retryCount > 0 && (
        <span className="request-retry">重试 {request.retryCount} 次</span>
      )}
      {request.nextRetryAt && request.state === REQUEST_STATES.QUEUED && (
        <span className="request-next-retry">
          下次重试: {formatTimeUntil(request.nextRetryAt)}</span>
      )}
      {canCancel.includes(request.state) && (
        <button
          className="cancel-btn"
          onClick={() => onCancel(request.id)}
        >
          取消
        </button>
      )}
    </div>
  )
}

export default RequestItem
