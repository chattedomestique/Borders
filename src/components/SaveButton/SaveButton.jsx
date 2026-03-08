import './SaveButton.css'

export default function SaveButton({ onSave, saving, mediaType }) {
  return (
    <div className="save-wrap">
      <button
        className={`save-btn${saving ? ' save-btn--saving' : ''}`}
        onClick={onSave}
        disabled={saving}
        aria-busy={saving}
        aria-label={saving ? 'Saving…' : `Save ${mediaType === 'video' ? 'frame' : 'image'} to Photos`}
      >
        {saving ? (
          <>
            <span className="save-btn__spinner" aria-hidden="true"/>
            Saving…
          </>
        ) : (
          <>
            <svg className="save-btn__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 13v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Save to Photos
          </>
        )}
      </button>
      <p className="save-hint">
        {typeof navigator !== 'undefined' && navigator.share
          ? 'Share sheet will open — tap Save Image'
          : 'Image will download to your device'}
      </p>
    </div>
  )
}
