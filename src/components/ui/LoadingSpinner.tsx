import React from 'react'

type LoadingSpinnerProps = {
  size?: number
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 32, className = '' }) => {
  const borderSize = Math.max(2, Math.round(size / 8))
  const spinnerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderWidth: borderSize,
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className="animate-spin rounded-full border-brand-blue border-t-transparent"
        style={spinnerStyle}
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

export default LoadingSpinner

