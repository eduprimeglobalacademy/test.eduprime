interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const p = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }
  return (
    <div className={`bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm ${p[padding]} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-b border-[var(--border)] pb-4 mb-5 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-[var(--ink)] ${className}`}>
      {children}
    </h3>
  )
}
