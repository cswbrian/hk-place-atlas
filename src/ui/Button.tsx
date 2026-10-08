import type { ComponentPropsWithRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'primary',
  secondary: '',
  ghost: 'ghost',
  link: 'linkish',
}

type Props = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant
}

/**
 * primary: the one form submit per screen (Save, Done).
 * secondary: every other action.
 * ghost: borderless, for icon or low-emphasis actions.
 * link: inline text that behaves like a link.
 */
export function Button({ variant = 'secondary', type = 'button', className, ...rest }: Props) {
  const classes = [variantClass[variant], className].filter(Boolean).join(' ')
  return <button type={type} className={classes || undefined} {...rest} />
}
