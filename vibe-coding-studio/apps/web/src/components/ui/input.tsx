import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-4 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all ${className}`}
          {...props}
        />
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
