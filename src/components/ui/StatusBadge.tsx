export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

interface StatusBadgeProps {
  tone: BadgeTone
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

/**
 * Tone → color is fixed by CSS custom properties (--tone-*-bg/ink) defined
 * in index.css, redefined inside .theme-dark — this component never needs
 * to know which theme it's rendering in, the DOM position decides.
 */
export function StatusBadge({ tone, children, icon, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`badge gap-1 ${className}`}
      style={{ background: `var(--tone-${tone}-bg)`, color: `var(--tone-${tone}-ink)` }}
    >
      {icon}
      {children}
    </span>
  )
}
