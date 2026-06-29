import './Section.css'

/** A control panel body: padded, gap-stacked column with an aria-label. */
export function Section({ label, children }) {
  return (
    <section className="controls__section" aria-label={label}>
      {children}
    </section>
  )
}

/** Hairline rule between groups of controls. */
export function Divider({ inset = false }) {
  return <div className={`controls__divider${inset ? ' controls__divider--inset' : ''}`} />
}
