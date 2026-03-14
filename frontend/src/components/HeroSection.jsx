import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Sparkles
} from 'lucide-react'

const previewItems = [
  { name: 'Matematik', detail: '4 h den här veckan', tone: 'high' },
  { name: 'Databaser', detail: '3 h den här veckan', tone: 'medium' },
  { name: 'UX-design', detail: '2 h repetition', tone: 'low' }
]

const valuePoints = [
  {
    icon: CalendarDays,
    title: 'Prioritera nära tentor',
    text: 'Se direkt vilka kurser som kräver mest fokus utifrån datum och svårighetsgrad.'
  },
  {
    icon: Brain,
    title: 'Fördela din vecka smart',
    text: 'Låt systemet omvandla tillgängliga timmar till ett tydligt veckoupplägg.'
  },
  {
    icon: BarChart3,
    title: 'Behåll överblicken',
    text: 'Samla kurser, kommande examinationer och planhistorik i en vy.'
  }
]

function getStatusTone(backendMessage) {
  if (backendMessage.includes('Could not')) {
    return 'warning'
  }

  if (backendMessage.includes('Loading')) {
    return 'pending'
  }

  return 'healthy'
}

export default function HeroSection({ backendMessage, onPrimaryAction }) {
  const statusTone = getStatusTone(backendMessage)

  return (
    <section className="hero">
      <div className="hero-orb hero-orb-left" aria-hidden="true" />
      <div className="hero-orb hero-orb-right" aria-hidden="true" />

      <div className="container hero-grid">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-badge glass-panel">
            <Sparkles size={16} />
            AI-driven study planning for focused exam prep
          </div>

          <h1 className="hero-title">
            SmartStudy bygger en plan som faktiskt går att följa.
          </h1>

          <p className="hero-description">
            Lägg in dina kurser, välj hur många timmar du faktiskt har varje vecka och få
            ett konkret upplägg som prioriterar rätt ämnen i rätt tid.
          </p>

          <div className="hero-actions">
            <button type="button" className="btn-primary hero-button" onClick={onPrimaryAction}>
              Öppna dashboard
              <ArrowRight size={18} />
            </button>

            <a href="#workflow" className="btn-secondary hero-button hero-link-button">
              Så fungerar det
            </a>
          </div>

          <div className="hero-highlights">
            {valuePoints.map(({ icon: Icon, title, text }) => (
              <div key={title} className="hero-highlight glass-panel">
                <span className="hero-highlight-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.aside
          className="hero-preview glass-panel"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-preview-header">
            <div>
              <p className="hero-preview-label">Preview</p>
              <h2>Veckofokus</h2>
            </div>

            <div className={`hero-status hero-status-${statusTone}`}>
              <span className="hero-status-dot" />
              {backendMessage}
            </div>
          </div>

          <div className="hero-preview-summary">
            <div>
              <span>Timmar / vecka</span>
              <strong>9</strong>
            </div>
            <div>
              <span>Nästa tenta</span>
              <strong>12 dagar</strong>
            </div>
            <div>
              <span>Kurser i plan</span>
              <strong>3</strong>
            </div>
          </div>

          <div className="hero-preview-list">
            {previewItems.map((item) => (
              <div key={item.name} className="hero-preview-item">
                <div className={`hero-preview-pill hero-preview-pill-${item.tone}`}>
                  <BookOpen size={15} />
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-preview-footer">
            SmartStudy väger samman tentadatum, svårighetsgrad och dina tillgängliga timmar
            innan planen genereras.
          </div>
        </motion.aside>
      </div>
    </section>
  )
}
