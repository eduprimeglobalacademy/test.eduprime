interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string
  error?: string
  helper?: string
  as?: 'input' | 'textarea'
  rows?: number
  preserveWhitespace?: boolean
}

export function Input({ label, error, helper, className = '', as = 'input', rows, preserveWhitespace = false, ...props }: InputProps) {
  const Component = as === 'textarea' ? 'textarea' : 'input'

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-[var(--ink-soft)]">
          {label}
        </label>
      )}
      <Component
        className={`block w-full px-3.5 py-2.5 border rounded-lg bg-[var(--surface)] text-sm text-[var(--ink)]
          placeholder-[var(--ink-muted)] shadow-sm transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]
          ${as === 'textarea' ? 'resize-vertical' : ''}
          ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-[var(--border)]'}
          ${className}`}
        rows={as === 'textarea' ? rows : undefined}
        style={preserveWhitespace ? { whiteSpace: 'pre-wrap' } : undefined}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helper && !error && <p className="text-xs text-[var(--ink-faint)]">{helper}</p>}
    </div>
  )
}
