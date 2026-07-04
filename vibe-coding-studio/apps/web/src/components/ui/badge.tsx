import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'primary' | 'accent' | 'success'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--card-bg)] border border-[var(--border)]',
    primary: 'bg-[var(--primary)] text-white',
    accent: 'bg-[var(--accent)] text-white',
    success: 'bg-[var(--highlight)] text-black',
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
