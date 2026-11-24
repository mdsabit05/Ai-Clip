import clsx from 'clsx'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ size = 'md', className }: Props) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }

  return (
    <div
      className={clsx(
        'rounded-full border-2 border-forge-border border-t-forge-accent animate-spin',
        sizeMap[size],
        className
      )}
    />
  )
}
