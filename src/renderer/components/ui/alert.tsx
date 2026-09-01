import React from 'react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive'
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-blue-50 border border-blue-200 text-blue-900',
      destructive: 'bg-red-50 border border-red-200 text-red-900',
    }

    return (
      <div
        ref={ref}
        className={`p-4 rounded-lg flex gap-3 ${variantStyles[variant]} ${className || ''}`}
        {...props}
      />
    )
  }
)
Alert.displayName = 'Alert'

export const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`text-sm ${className || ''}`}
      {...props}
    />
  )
)
AlertDescription.displayName = 'AlertDescription'
