export function LoadingSpinner({ text = 'Đang tải dữ liệu...' }: { text?: string }) {
  return (
    <div className="fg-feedback" role="status" aria-live="polite">
      <span className="fg-spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="fg-feedback is-error" role="alert">
      <div style={{ fontSize: '0.9rem' }}>
        <strong>Lỗi:</strong> {message}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: '#ffffff',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
