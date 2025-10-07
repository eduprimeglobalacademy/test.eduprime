import React from 'react'

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
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Component
        className={`
          block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
          focus:border-blue-500 transition-colors
          ${as === 'textarea' ? 'resize-vertical' : ''} 
          ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        rows={as === 'textarea' ? rows : undefined}
        style={preserveWhitespace ? { whiteSpace: 'pre-wrap' } : undefined}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  )
}