import React, { useEffect } from 'react'

const DirtyConfirmDialog = ({
    isOpen,
    onSaveAndLeave,
    onDiscardAndLeave,
    onStay,
    title = '未保存的更改',
    message = '您有未保存的更改，确定要离开吗？',
    saveButtonText = '保存并离开',
    discardButtonText = '放弃并离开',
    stayButtonText = '留在当前页',
}) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onStay()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onStay])

    if (!isOpen) return null

    return (
        <div
            className="confirm-dialog-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dirty-dialog-title"
            aria-describedby="dirty-dialog-description"
        >
            <div className="confirm-dialog">
                <div className="confirm-dialog-content">
                    <h2
                        id="dirty-dialog-title"
                        className="confirm-dialog-title"
                    >
                        {title}
                    </h2>
                    <p
                        id="dirty-dialog-description"
                        className="confirm-dialog-message"
                    >
                        {message}
                    </p>
                </div>

                <div className="confirm-dialog-actions">
                    <button
                        type="button"
                        onClick={onStay}
                        className="dialog-btn stay"
                    >
                        {stayButtonText}
                    </button>
                    <button
                        type="button"
                        onClick={onDiscardAndLeave}
                        className="dialog-btn discard"
                    >
                        {discardButtonText}
                    </button>
                    <button
                        type="button"
                        onClick={onSaveAndLeave}
                        className="dialog-btn save"
                    >
                        {saveButtonText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DirtyConfirmDialog
