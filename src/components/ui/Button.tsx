import React from 'react'
import { motion } from 'framer-motion'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

export default function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base = variant === 'primary' ? 'btn-primary' : 'px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800'
  return (
    <motion.button whileTap={{ scale: 0.98 }} whileHover={{ y: -1 }} className={`${base} ${className}`} {...props}>
      {children}
    </motion.button>
  )
}


