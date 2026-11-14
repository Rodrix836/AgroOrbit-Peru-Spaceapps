import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'nasa' | 'danger' | 'ghost'
type Size = 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 border-transparent',
  secondary: 'bg-white text-brand-800 border-brand-700 hover:bg-brand-50',
  nasa: 'bg-nasa-700 text-white hover:bg-nasa-800 border-transparent',
  danger: 'bg-danger-700 text-white hover:opacity-90 border-transparent',
  ghost: 'bg-transparent text-brand-800 border-transparent hover:bg-brand-50 underline',
}
const SIZES: Record<Size, string> = {
  md: 'px-4 py-2.5',
  lg: 'px-6 py-3.5 text-lg',
}

function classes(variant: Variant, size: Size) {
  return `inline-flex items-center justify-center gap-2 rounded-xl border-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return <button {...rest} className={`${classes(variant, size)} ${className}`} />
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
}

export function ButtonLink({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonLinkProps) {
  return <Link {...rest} className={`${classes(variant, size)} ${className}`} />
}
