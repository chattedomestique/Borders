/**
 * Central SVG registry. Each entry renders the exact markup that used to live
 * inline in App/Controls/Uploader, so output is byte-for-byte identical — just
 * defined once. Accessed through <Icon name="…" /> (src/ui/Icon).
 *
 * Each render fn accepts { size, className }: `size` overrides width+height,
 * `className` is forwarded to the root <svg>. All icons are decorative
 * (aria-hidden) — the interactive element that wraps them carries the label.
 */
export const ICONS = {
  // ── Toolbar tabs ──────────────────────────────────────────────────────────
  frame: ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="6" y="6" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" opacity="0.5"/>
    </svg>
  ),
  fill: ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M2 12 C6 7 9 13 12 9 C14 6.5 17 11 18 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  grain: ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="4.5" cy="4.5" r="1.3" fill="currentColor"/>
      <circle cx="10"  cy="3"   r="1"   fill="currentColor" opacity="0.5"/>
      <circle cx="15.5" cy="5" r="1.3"  fill="currentColor"/>
      <circle cx="3"   cy="10" r="1"    fill="currentColor" opacity="0.5"/>
      <circle cx="9"   cy="9.5" r="1.6" fill="currentColor"/>
      <circle cx="15"  cy="10" r="1.1"  fill="currentColor" opacity="0.7"/>
      <circle cx="5.5" cy="15.5" r="1.3" fill="currentColor"/>
      <circle cx="11"  cy="14.5" r="1"  fill="currentColor" opacity="0.5"/>
      <circle cx="16"  cy="15.5" r="1.3" fill="currentColor"/>
    </svg>
  ),
  text: ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M4 5h12"  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M10 5v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M7 15h6"  stroke="currentColor" strokeWidth="1.5"  strokeLinecap="round" opacity="0.55"/>
    </svg>
  ),

  // ── Header / brand ──────────────────────────────────────────────────────────
  logo: ({ size = 22, className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2.5"/>
      <rect x="6" y="6" width="10" height="10" rx="2.5" fill="currentColor"/>
    </svg>
  ),
  undo: ({ size = 19, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3 7v6h6"/>
      <path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>
    </svg>
  ),
  redo: ({ size = 19, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M21 7v6h-6"/>
      <path d="M21 13a9 9 0 1 1-3-7.7L21 8"/>
    </svg>
  ),
  viewFit: ({ size = 17, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  ),
  viewFill: ({ size = 17, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
      <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
    </svg>
  ),

  // ── Actions ──────────────────────────────────────────────────────────────
  save: ({ size = 18, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  plus: ({ size = 13, className }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true" className={className}>
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  flip: ({ size = 11, className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  eyedropper: ({ size = 15, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),

  // ── Uploader ──────────────────────────────────────────────────────────────
  frameLarge: ({ size = 44, className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="9" y="9" width="26" height="26" rx="4" stroke="currentColor" strokeWidth="1.25" opacity="0.45"/>
    </svg>
  ),
}
