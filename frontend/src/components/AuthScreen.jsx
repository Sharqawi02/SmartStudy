import { motion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  CalendarDays,
  Clock3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound
} from 'lucide-react'

const productSignals = [
  {
    icon: ShieldCheck,
    title: 'Privat studentyta',
    text: 'Kurser, veckoplaner och timmar sparas per studentkonto i stället för i ett gemensamt läge.'
  },
  {
    icon: CalendarDays,
    title: 'Planering nära tentan',
    text: 'Få ett veckofokus som justeras efter när tentor faktiskt ligger, inte efter generiska mallar.'
  },
  {
    icon: Brain,
    title: 'AI där det hjälper',
    text: 'Låt SmartStudy omvandla kurslista och tidsbudget till konkreta nästa steg för veckan.'
  }
]

const workflowPoints = [
  'Skapa konto med namn, e-post och lösenord',
  'Lägg till kurser och tentadatum i din privata dashboard',
  'Generera planer och följ historiken vecka för vecka'
]

function getStatusTone(message) {
  if (message.includes('Could not')) {
    return 'warning'
  }

  if (message.includes('Loading')) {
    return 'pending'
  }

  return 'healthy'
}

export default function AuthScreen({
  mode,
  form,
  error,
  busy,
  healthMessage,
  onBackHome,
  onFieldChange,
  onModeChange,
  onSocialAuth,
  onSubmit
}) {
  const statusTone = getStatusTone(healthMessage)
  const isRegister = mode === 'register'

  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-left" aria-hidden="true" />
      <div className="auth-orb auth-orb-right" aria-hidden="true" />

      <div className="container auth-shell">
        <motion.section
          className="auth-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-badge glass-panel">
            <Sparkles size={16} />
            Private planning for modern student workflows
          </div>

          <h1 className="auth-title">
            SmartStudy gör kursplanering tydlig, privat och redo för verkliga studieveckor.
          </h1>

          <p className="auth-description">
            Bygg en personlig study cockpit där varje student får egna kurser, egen
            veckobudget och egna AI-stödda planer utan att någon annan kommer åt dashboarden.
          </p>

          <div className="auth-signal-grid">
            {productSignals.map(({ icon: Icon, title, text }) => (
              <article key={title} className="auth-signal glass-panel">
                <span className="auth-signal-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="auth-proof glass-panel">
            <div className="auth-proof-header">
              <div>
                <p className="landing-eyebrow">Student Workflow</p>
                <h2>Vad den nya upplevelsen ska lösa</h2>
              </div>

              <div className={`hero-status hero-status-${statusTone}`}>
                <span className="hero-status-dot" />
                {healthMessage}
              </div>
            </div>

            <div className="auth-proof-grid">
              <div className="auth-proof-stat">
                <span>Access</span>
                <strong>Inloggad session</strong>
                <p>Dashboarden öppnas först när studenten är autentiserad.</p>
              </div>
              <div className="auth-proof-stat">
                <span>Storage</span>
                <strong>Per student</strong>
                <p>Kurser, planer och inställningar separeras per konto i databasen.</p>
              </div>
              <div className="auth-proof-stat">
                <span>Planning</span>
                <strong>Veckofokus</strong>
                <p>Systemet prioriterar närmaste examinationer och realistisk tid.</p>
              </div>
            </div>

            <ul className="auth-workflow-list">
              {workflowPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.aside
          className="auth-card glass-panel"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="auth-card-header">
            <div className="auth-brand-mark">S</div>
            <div>
              <p className="landing-eyebrow">SmartStudy</p>
              <h2>{isRegister ? 'Create Your Student Workspace' : 'Welcome Back'}</h2>
            </div>
          </div>

          <p className="auth-card-copy">
            {isRegister
              ? 'Skapa ett konto för att spara privata kurser, veckoplaner och studieinställningar.'
              : 'Logga in för att fortsätta till din personliga dashboard och planhistorik.'}
          </p>

          <button type="button" className="auth-back-button" onClick={onBackHome}>
            Till startsidan
          </button>

          <div className="auth-mode-switch">
            <button
              type="button"
              className={mode === 'login' ? 'auth-mode-button is-active' : 'auth-mode-button'}
              onClick={() => onModeChange('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={isRegister ? 'auth-mode-button is-active' : 'auth-mode-button'}
              onClick={() => onModeChange('register')}
            >
              Register
            </button>
          </div>

          {error ? (
            <div className="auth-error">
              <strong>Kan inte fortsätta ännu.</strong>
              <p>{error}</p>
            </div>
          ) : null}

          <form className="auth-form" onSubmit={onSubmit}>
            {isRegister ? (
              <label className="field">
                <span>Full name</span>
                <div className="auth-input-wrap">
                  <UserRound size={18} />
                  <input
                    className="modern-input auth-input"
                    type="text"
                    value={form.full_name}
                    onChange={(event) => onFieldChange('full_name', event.target.value)}
                    placeholder="Sara Andersson"
                    autoComplete="name"
                    required
                  />
                </div>
              </label>
            ) : null}

            <label className="field">
              <span>Email address</span>
              <div className="auth-input-wrap">
                <Mail size={18} />
                <input
                  className="modern-input auth-input"
                  type="email"
                  value={form.email}
                  onChange={(event) => onFieldChange('email', event.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Password</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={18} />
                <input
                  className="modern-input auth-input"
                  type="password"
                  value={form.password}
                  onChange={(event) => onFieldChange('password', event.target.value)}
                  placeholder="Minst 8 tecken"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                />
              </div>
            </label>

            {isRegister ? (
              <label className="field">
                <span>Study cadence</span>
                <div className="auth-mini-grid">
                  <div className="auth-mini-card">
                    <Clock3 size={16} />
                    <div>
                      <strong>Default setup</strong>
                      <p>8 h/vecka skapas automatiskt och kan ändras i dashboarden.</p>
                    </div>
                  </div>
                  <div className="auth-mini-card">
                    <ShieldCheck size={16} />
                    <div>
                      <strong>Private storage</strong>
                      <p>Varje ny student får egen datayta från start.</p>
                    </div>
                  </div>
                </div>
              </label>
            ) : null}

            <button type="submit" className="btn-primary auth-submit" disabled={busy}>
              {busy
                ? isRegister
                  ? 'Creating account...'
                  : 'Signing in...'
                : isRegister
                  ? 'Create account'
                  : 'Open dashboard'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-social-block">
            <p className="auth-social-label">Or continue with</p>
            <div className="auth-social-grid">
              <button
                type="button"
                className="auth-social-button"
                onClick={() => onSocialAuth('google')}
              >
                <span className="auth-social-mark">G</span>
                Google
              </button>
              <button
                type="button"
                className="auth-social-button"
                onClick={() => onSocialAuth('apple')}
              >
                <span className="auth-social-mark">A</span>
                Apple
              </button>
            </div>
          </div>

          <p className="auth-footer-note">
            {isRegister
              ? 'Har du redan ett konto? Växla tillbaka till Sign in.'
              : 'Behöver du ett konto? Växla till Register och skapa din studentyta.'}
          </p>
        </motion.aside>
      </div>
    </main>
  )
}
