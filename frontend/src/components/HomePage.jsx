import {
  ArrowRight,
  Brain,
  ShieldCheck,
  Target
} from 'lucide-react'

import HeroSection from './HeroSection'

const previewItems = [
  {
    id: 'preview-math',
    name: 'Matematik 3',
    detail: 'Om 6 dagar • 12 apr.',
    tone: 'high'
  },
  {
    id: 'preview-db',
    name: 'Databaser',
    detail: 'Om 12 dagar • 18 apr.',
    tone: 'medium'
  },
  {
    id: 'preview-ux',
    name: 'UX Design',
    detail: 'Om 20 dagar • 26 apr.',
    tone: 'low'
  }
]

const offerCards = [
  {
    icon: ShieldCheck,
    title: 'Privat studentdashboard',
    text: 'Varje student får egen inloggning, egna kurser och egen planhistorik i stället för en delad datavy.'
  },
  {
    icon: Target,
    title: 'Fokus på rätt kurs först',
    text: 'SmartStudy väger in svårighetsgrad, tentodatum och tillgänglig tid för att prioritera rätt nästa steg.'
  },
  {
    icon: Brain,
    title: 'AI-stödd planering',
    text: 'Systemet hjälper studenten att gå från kurslista till konkret veckofokus utan att bygga allt manuellt.'
  }
]

const workflowSteps = [
  'Skapa konto eller logga in och öppna din privata dashboard.',
  'Lägg till kurser, svårighetsgrad och kommande tentadatum.',
  'Ange hur många timmar du faktiskt har per vecka.',
  'Generera en plan och följ veckofokus samt historik över tid.'
]

const credibilityPoints = [
  {
    label: 'For students',
    value: 'Mindre friktion',
    text: 'Studenten ser direkt vad som är viktigast i veckan i stället för att samla allt i huvudet.'
  },
  {
    label: 'For outcomes',
    value: 'Bättre prioritering',
    text: 'När tentor närmar sig fördelas tiden om så att det viktigaste får rätt tyngd.'
  },
  {
    label: 'For trust',
    value: 'Egen datayta',
    text: 'Inloggning och användarkopplad data gör att produkten känns som en riktig personlig tjänst.'
  }
]

export default function HomePage({ healthMessage, onLogin, onRegister }) {
  return (
    <main className="landing-page">
      <HeroSection
        backendMessage={healthMessage}
        onPrimaryAction={onLogin}
        primaryActionLabel="Logga in"
        secondaryActionLabel="Skapa konto"
        onSecondaryAction={onRegister}
        hoursPerWeek={12}
        nextExamLabel="Om 6 dagar"
        courseCount={4}
        previewItems={previewItems}
        previewFooterCopy="Förhandsvisningen visar hur SmartStudy kan presentera veckofokus, närmaste tenta och studiebudget på ett mer professionellt sätt."
      />

      <div className="container landing-sections">
        <section id="overview" className="landing-card glass-panel">
          <p className="landing-eyebrow">Main Idea</p>
          <h2>En studieplattform byggd för verkliga studentveckor.</h2>
          <p>
            SmartStudy hjälper studenten att samla kurser, tentor och tidsbudget i en tydlig
            arbetsyta där nästa prioritet alltid är synlig.
          </p>
        </section>

        <section id="workflow" className="landing-card glass-panel">
          <p className="landing-eyebrow">Workflow</p>
          <h2>Så börjar användaren.</h2>
          <ol className="landing-list">
            {workflowSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section id="features" className="landing-card glass-panel">
          <p className="landing-eyebrow">Why Use It</p>
          <h2>Vad som gör sidan värd att använda.</h2>
          <ul className="landing-list">
            <li>Privat konto med egna kurser, planer och studietimmar.</li>
            <li>Tydlig översikt över kommande tentor och brådskande fokus.</li>
            <li>Veckoplaner som känns genomförbara i stället för generiska.</li>
            <li>Planhistorik som gör det lätt att följa utvecklingen över tid.</li>
          </ul>
        </section>
      </div>

      <section className="container landing-story-grid">
        {offerCards.map(({ icon: Icon, title, text }) => (
          <article key={title} className="landing-story-card glass-panel">
            <span className="landing-story-icon">
              <Icon size={20} />
            </span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="container landing-proof-grid">
        {credibilityPoints.map(({ label, value, text }) => (
          <article key={label} className="landing-proof-card glass-panel">
            <p className="landing-eyebrow">{label}</p>
            <strong>{value}</strong>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="container landing-cta-strip glass-panel">
        <div>
          <p className="landing-eyebrow">Get Started</p>
          <h2>Visa studenten varför SmartStudy är bättre än att planera i kaos.</h2>
          <p>
            Börja med en tydlig hemsida, låt användaren skapa konto när den är redo och led
            sedan vidare till en privat dashboard med riktiga planeringsverktyg.
          </p>
        </div>

        <div className="landing-cta-actions">
          <button type="button" className="btn-primary hero-button" onClick={onLogin}>
            Logga in
            <ArrowRight size={18} />
          </button>
          <button type="button" className="btn-secondary hero-button" onClick={onRegister}>
            Skapa konto
          </button>
        </div>
      </section>
    </main>
  )
}
