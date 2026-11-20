import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'outline-light' | 'white' | 'ghost'
export type ButtonSize = 'default' | 'sm'

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'default',
  className?: string,
) {
  return cn(
    variant === 'primary' && 'btn-primary',
    variant === 'dark' && 'btn-dark',
    variant === 'outline' && 'btn-outline',
    variant === 'outline-light' && 'btn-outline-light',
    variant === 'white' && 'btn-white',
    variant === 'ghost' && 'btn bg-transparent text-charcoal hover:bg-charcoal/5',
    size === 'sm' && 'btn-sm',
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />
  ),
)
Button.displayName = 'Button'
