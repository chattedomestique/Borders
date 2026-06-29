/** Content sub-tab: the text body editor. */
export default function ContentTab({ selectedLayer, ul }) {
  return (
    <>
      <textarea
        className="controls__textarea"
        placeholder="Type something…"
        value={selectedLayer.content}
        onChange={e => ul('content', e.target.value)}
        rows={3}
        spellCheck={false}
      />
      <p className="controls__hint" style={{ textAlign: 'center', marginTop: 0 }}>
        Tap text on canvas to reposition
      </p>
    </>
  )
}
