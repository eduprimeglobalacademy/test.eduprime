import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './Input'

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helper?: string
}

/** Input with a show/hide toggle — every password field in the app should use this, not a raw type="password" input. */
export function PasswordInput({ label, error, helper, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      type={visible ? 'text' : 'password'}
      label={label}
      error={error}
      helper={helper}
      rightElement={
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="text-ink-muted hover:text-ink-soft transition-colors"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
      {...props}
    />
  )
}
