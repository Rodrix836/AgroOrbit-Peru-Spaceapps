import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'outline' | 'amber' | 'cielo' | 'dark' | 'ghost'
type Size = 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-lima text-bg border border-lima hover:brightness-110',
  outline: 'bg-transparent text-ink border border-edge hover:border-lima',
  amber: 'bg-ambar text-bg border border-ambar hover:brightness-110',
  cielo: 'bg-transparent text-cielo border border-cielo hover:bg-panel',
  dark: 'bg-bg text-ink border border-bg hover:border-ink',
  ghost: 'bg-transparent text-lima border border-transparent font-mono text-[13px] uppercase tracking-[0.12em] hover:underline',
}
const SIZES: Record<Size, string> = {
  md: 'min-h-[44px] px-4',
  lg: 'min-h-[52px] px-6 text-lg',
}

function classes(variant: Variant, size: Size) {
  return `inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 no-underline ${VARIANTS[variant]} ${SIZES[size]}`
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
