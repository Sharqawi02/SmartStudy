import React from 'react'
import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-panel glass-card ${className}`}
    >
      {children}
    </motion.div>
  )
}
