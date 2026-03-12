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
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Component
        className={`block w-full px-3.5 py-2.5 border rounded-xl bg-white text-sm text-gray-900
          placeholder-gray-400 shadow-sm transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${as === 'textarea' ? 'resize-vertical' : ''}
          ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'}
          ${className}`}
        rows={as === 'textarea' ? rows : undefined}
        style={preserveWhitespace ? { whiteSpace: 'pre-wrap' } : undefined}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helper && !error && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  )
}
