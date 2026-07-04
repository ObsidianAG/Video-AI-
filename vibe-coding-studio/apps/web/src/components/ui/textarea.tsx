import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium">{label}</label>}
        <textarea
          ref={ref}
          className={`w-full px-4 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all resize-vertical min-h-[100px] ${className}`}
          {...props}
        />
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
