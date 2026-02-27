import React from 'react'
import { motion } from 'framer-motion'

type CardProps = {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={`card ${className}`}>
      {children}
    </motion.div>
  )
}


