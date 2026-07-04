interface Props { onClose: () => void }

export default function ProModal({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🚀</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Coming Soon</h2>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
          This feature is part of the Klean Data Pro plan.<br />
          We're working hard to bring it to you soon.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 28px', background: '#F97316', color: '#fff', fontWeight: 600, fontSize: 14, borderRadius: 10, border: 'none', cursor: 'pointer' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
