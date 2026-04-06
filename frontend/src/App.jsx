import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Clock3,
  LogOut,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  X
} from 'lucide-react'

import { API_BASE_URL, api } from './api/client'
import AuthScreen from './components/AuthScreen'
import HomePage from './components/HomePage'
const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  month: 'short',
  day: 'numeric'
})
const longDateFormatter = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
})

const initialCourseForm = {
  name: '',
  difficulty: 'med',
  exam_date: ''
}

const initialAuthForm = {
  full_name: '',
  email: '',
  password: ''
}

const difficultyMeta = {
  low: { label: 'Låg', tone: 'low' },
  med: { label: 'Medel', tone: 'medium' },
  high: { label: 'Hög', tone: 'high' }
}

function getPublicStateFromHash() {
  const hash = window.location.hash.toLowerCase()

  if (hash === '#register') {
    return { view: 'auth', mode: 'register' }
  }

  if (hash === '#login') {
    return { view: 'auth', mode: 'login' }
  }

  return { view: 'home', mode: 'login' }
}

function daysUntil(dateString) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const examDate = new Date(`${dateString}T00:00:00`)
  const diffMs = examDate.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function formatDate(dateString) {
  if (!dateString) {
    return 'Okänt datum'
  }

  const parsedDate = new Date(`${dateString}T00:00:00`)
  return Number.isNaN(parsedDate.getTime()) ? dateString : dateFormatter.format(parsedDate)
}

function formatLongDate(dateString) {
  if (!dateString) {
    return 'Okänt datum'
  }

  const parsedDate = new Date(`${dateString}T00:00:00`)
  return Number.isNaN(parsedDate.getTime()) ? dateString : longDateFormatter.format(parsedDate)
}

function formatExamCountdown(daysLeft) {
  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)} dagar sedan`
  }

  if (daysLeft === 0) {
    return 'Idag'
  }

  if (daysLeft === 1) {
    return 'Imorgon'
  }

  return `Om ${daysLeft} dagar`
}

function getItemDaysLeft(item) {
  if (typeof item?.days_to_exam === 'number') {
    return item.days_to_exam
  }

  if (typeof item?.weeks_to_exam === 'number') {
    return item.weeks_to_exam * 7
  }

  return Number.POSITIVE_INFINITY
}

function formatPlanCountdown(daysLeft) {
  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)} dagar sedan`
  }

  if (daysLeft === 0) {
    return 'Tenta idag'
  }

  if (daysLeft === 1) {
    return '1 dag kvar'
  }

  if (daysLeft < 14) {
    return `${daysLeft} dagar kvar`
  }

  const weeksLeft = Math.ceil(daysLeft / 7)
  return `${weeksLeft} ${weeksLeft === 1 ? 'vecka' : 'veckor'} kvar`
}

function formatAllocationValue(item) {
  const hours =
    typeof item?.display_hours === 'number'
      ? item.display_hours.toFixed(1)
      : (item?.hours_per_week ?? 0).toFixed(1)
  const unit = item?.display_unit || 'h / vecka'
  return `${hours} ${unit}`
}

function getAllocationLabel(item) {
  return item?.display_label || 'Veckofördelning'
}

function getAllocationDetail(item, priority) {
  if (item?.display_detail) {
    return item.display_detail
  }

  return priority.text
}

function getHealthTone(message) {
  if (message.includes('Could not')) {
    return 'warning'
  }

  if (message.includes('Loading')) {
    return 'pending'
  }

  return 'healthy'
}

function getExamTone(daysLeft) {
  if (daysLeft < 0) {
    return 'muted'
  }

  if (daysLeft <= 7) {
    return 'danger'
  }

  if (daysLeft <= 21) {
    return 'warning'
  }

  return 'safe'
}

function getDifficultyBadge(difficulty) {
  return difficultyMeta[difficulty] || { label: difficulty, tone: 'medium' }
}

function getPriorityMeta(item, index, totalHours) {
  const share = item.hours_per_week / Math.max(totalHours || 1, 1)
  const daysLeft = getItemDaysLeft(item)

  if (daysLeft <= 3 || index === 0 || share >= 0.45) {
    return {
      label: 'P1',
      title: 'Akut fokus',
      tone: 'danger',
      text: 'Lägg första passen här och håll annat på minimum tills tentan är avklarad.'
    }
  }

  if (daysLeft <= 14 || index === 1 || share >= 0.2) {
    return {
      label: 'P2',
      title: 'Nästa fokus',
      tone: 'warning',
      text: 'Håll kursen igång nu och öka trycket direkt efter närmaste tenta.'
    }
  }

  return {
    label: 'P3',
    title: 'Underhållsläge',
    tone: 'safe',
    text: 'Håll kursen varm med kortare repetitionspass.'
  }
}

function getCadenceMeta(item) {
  const daysLeft = getItemDaysLeft(item)
  const hoursPerWeek = item.hours_per_week

  if (daysLeft <= 3) {
    return {
      label: 'Examspurt',
      text: 'Prioritera aktiv repetition, gamla uppgifter och ett sista fokuserat pass före tentan.'
    }
  }

  if (daysLeft <= 7) {
    return {
      label: 'Slutrevision',
      text: 'Planera flera korta pass med återkallelse, begrepp och tidsatta övningar.'
    }
  }

  if (hoursPerWeek >= 4) {
    return {
      label: 'Djupfokus',
      text: 'Dela upp veckan i 3-4 längre pass med problemlösning och repetition.'
    }
  }

  if (hoursPerWeek >= 2) {
    return {
      label: 'Stabil rytm',
      text: 'Planera 2-3 jämna pass för att hålla tempot utan att tappa kontinuitet.'
    }
  }

  return {
    label: 'Lätt repetition',
    text: 'Ett till två kortare pass räcker för att hålla kursen aktiv just nu.'
  }
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="dashboard-stat glass-panel">
      <span className="dashboard-stat-icon">
        <Icon size={18} />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function App() {
  const initialPublicState = getPublicStateFromHash()
  const [authStatus, setAuthStatus] = useState('checking')
  const [publicView, setPublicView] = useState(initialPublicState.view)
  const [authMode, setAuthMode] = useState(initialPublicState.mode)
  const [currentUser, setCurrentUser] = useState(null)
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [healthMessage, setHealthMessage] = useState('Loading backend status...')
  const [courses, setCourses] = useState([])
  const [settings, setSettings] = useState(null)
  const [plan, setPlan] = useState(null)
  const [planHistory, setPlanHistory] = useState([])
  const [error, setError] = useState('')

  const [courseForm, setCourseForm] = useState(initialCourseForm)
  const [editingCourseId, setEditingCourseId] = useState(null)
  const [editingCourseForm, setEditingCourseForm] = useState(initialCourseForm)
  const [hoursInput, setHoursInput] = useState('8')
  const [busy, setBusy] = useState({
    createCourse: false,
    deleteCourseId: null,
    updateSettings: false,
    generatePlan: false,
    updateCourseId: null
  })

  const normalizedHoursInput = useMemo(() => Number.parseInt(hoursInput, 10), [hoursInput])

  const upcomingExams = useMemo(
    () =>
      [...courses]
        .map((course) => ({
          ...course,
          days_to_exam: daysUntil(course.exam_date)
        }))
        .sort((a, b) => a.days_to_exam - b.days_to_exam),
    [courses]
  )

  const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null
  const healthTone = getHealthTone(healthMessage)
  const urgentCourses = upcomingExams.filter(
    (course) => course.days_to_exam >= 0 && course.days_to_exam <= 14
  ).length
  const overdueCourses = upcomingExams.filter((course) => course.days_to_exam < 0).length
  const totalAllocatedHours = plan?.weekly_focus?.reduce(
    (sum, item) => sum + item.hours_per_week,
    0
  )
  const prioritizedWeeklyFocus = useMemo(() => {
    if (!plan?.weekly_focus) {
      return []
    }

    return [...plan.weekly_focus].sort(
      (a, b) => b.hours_per_week - a.hours_per_week || getItemDaysLeft(a) - getItemDaysLeft(b)
    )
  }, [plan])
  const studySummary = nextExam
    ? `${nextExam.name} är närmast med ${formatExamCountdown(nextExam.days_to_exam).toLowerCase()}.`
    : 'Lägg till din första kurs för att börja bygga ett veckofokus.'

  function setBusyFlag(key, value) {
    setBusy((current) => ({ ...current, [key]: value }))
  }

  function clearDashboardState() {
    setCourses([])
    setSettings(null)
    setPlan(null)
    setPlanHistory([])
    setError('')
  }

  function updateAuthField(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }

  function openHomeView() {
    setPublicView('home')
    setAuthError('')

    if (window.location.hash) {
      window.history.pushState('', document.title, window.location.pathname + window.location.search)
    }
  }

  function openAuthView(mode = 'login') {
    setPublicView('auth')
    setAuthMode(mode)
    setAuthError('')
    window.location.hash = mode === 'register' ? 'register' : 'login'
  }

  function switchAuthMode(nextMode) {
    setAuthForm(initialAuthForm)
    openAuthView(nextMode)
  }

  function handleProtectedError(err, fallbackMessage) {
    if (err?.status === 401) {
      setCurrentUser(null)
      setAuthStatus('unauthenticated')
      openAuthView('login')
      clearDashboardState()
      return
    }

    setError(err.message || fallbackMessage)
  }

  function startEditingCourse(course) {
    setEditingCourseId(course.id)
    setEditingCourseForm({
      name: course.name,
      difficulty: course.difficulty,
      exam_date: course.exam_date
    })
  }

  function cancelEditingCourse() {
    setEditingCourseId(null)
    setEditingCourseForm(initialCourseForm)
  }

  async function loadHealth() {
    try {
      const data = await api.getHealth()
      setHealthMessage(data.message)
    } catch {
      setHealthMessage('Could not connect to backend')
    }
  }

  async function checkSession() {
    setAuthStatus('checking')

    try {
      const data = await api.getSession()
      setCurrentUser(data.user || null)
      setAuthStatus('authenticated')
    } catch (err) {
      if (err.status !== 401) {
        setAuthError(err.message || 'Failed to verify session')
      }
      setCurrentUser(null)
      setAuthStatus('unauthenticated')
    }
  }

  async function loadCourses() {
    const data = await api.getCourses()
    setCourses(data.courses || [])
  }

  async function loadSettings() {
    const data = await api.getSettings()
    setSettings(data.settings || null)
    if (data.settings?.hours_per_week !== undefined) {
      setHoursInput(String(data.settings.hours_per_week))
    }
  }

  async function loadPlanHistory() {
    const data = await api.getPlanHistory()
    const plans = data.plans || []
    setPlanHistory(plans)
    setPlan(plans[0] || null)
  }

  async function refreshDashboard() {
    setError('')
    try {
      await Promise.all([loadCourses(), loadSettings(), loadPlanHistory()])
    } catch (err) {
      if (err.status === 401) {
        setCurrentUser(null)
        setAuthStatus('unauthenticated')
        openAuthView('login')
        clearDashboardState()
        return
      }
      setError(err.message || 'Failed to load dashboard data')
    }
  }

  useEffect(() => {
    loadHealth()
    checkSession()
  }, [])

  useEffect(() => {
    function syncPublicStateFromHash() {
      const nextState = getPublicStateFromHash()
      setPublicView(nextState.view)
      setAuthMode(nextState.mode)
      setAuthError('')
    }

    window.addEventListener('hashchange', syncPublicStateFromHash)
    return () => window.removeEventListener('hashchange', syncPublicStateFromHash)
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      refreshDashboard()
      return
    }

    if (authStatus === 'unauthenticated') {
      clearDashboardState()
    }
  }, [authStatus])

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')

    try {
      const action = authMode === 'register' ? api.register : api.login
      const payload =
        authMode === 'register'
          ? authForm
          : {
              email: authForm.email,
              password: authForm.password
            }
      const data = await action(payload)
      setCurrentUser(data.user || null)
      setAuthStatus('authenticated')
      setAuthForm(initialAuthForm)
      openHomeView()
    } catch (err) {
      setAuthError(err.message || 'Authentication failed')
    } finally {
      setAuthBusy(false)
    }
  }

  function handleSocialAuth(provider) {
    const providerLabel = provider === 'apple' ? 'Apple' : 'Google'
    setAuthError(
      `${providerLabel} sign-in visas nu i gränssnittet, men behöver fortfarande OAuth-nycklar och callback-konfiguration innan det kan fungera på riktigt.`
    )
  }

  async function handleLogout() {
    try {
      await api.logout()
    } catch {
      // Clear the local session state even if the backend session is already gone.
    }

    setCurrentUser(null)
    setAuthStatus('unauthenticated')
    setAuthError('')
    setAuthForm(initialAuthForm)
    clearDashboardState()
    openHomeView()
  }

  async function handleCreateCourse(event) {
    event.preventDefault()
    setError('')
    setBusyFlag('createCourse', true)

    try {
      await api.createCourse(courseForm)
      setCourseForm(initialCourseForm)
      await loadCourses()
    } catch (err) {
      handleProtectedError(err, 'Failed to create course')
    } finally {
      setBusyFlag('createCourse', false)
    }
  }

  async function handleDeleteCourse(id) {
    setError('')
    setBusyFlag('deleteCourseId', id)
    try {
      await api.deleteCourse(id)
      if (editingCourseId === id) {
        cancelEditingCourse()
      }
      await loadCourses()
    } catch (err) {
      handleProtectedError(err, 'Failed to delete course')
    } finally {
      setBusyFlag('deleteCourseId', null)
    }
  }

  async function handleUpdateCourse(event, id) {
    event.preventDefault()
    setError('')
    setBusyFlag('updateCourseId', id)

    try {
      await api.updateCourse(id, editingCourseForm)
      await loadCourses()
      cancelEditingCourse()
    } catch (err) {
      handleProtectedError(err, 'Failed to update course')
    } finally {
      setBusyFlag('updateCourseId', null)
    }
  }

  async function handleUpdateSettings(event) {
    event.preventDefault()
    setError('')
    setBusyFlag('updateSettings', true)

    try {
      if (!Number.isInteger(normalizedHoursInput) || normalizedHoursInput < 0) {
        throw new Error('hours_per_week must be an integer >= 0')
      }

      await api.updateSettings(normalizedHoursInput)
      await loadSettings()
    } catch (err) {
      handleProtectedError(err, 'Failed to update settings')
    } finally {
      setBusyFlag('updateSettings', false)
    }
  }

  async function handleGeneratePlan() {
    setError('')
    setBusyFlag('generatePlan', true)

    try {
      const data = await api.generatePlan()
      setPlan(data)
      setPlanHistory((current) => [
        data,
        ...current.filter((entry) => entry.id !== data.id)
      ])
    } catch (err) {
      handleProtectedError(err, 'Failed to generate plan')
    } finally {
      setBusyFlag('generatePlan', false)
    }
  }

  if (authStatus === 'checking') {
    return (
      <main className="auth-page auth-page-loading">
        <div className="container auth-loading-shell glass-panel">
          <p className="landing-eyebrow">Checking Session</p>
          <h1>SmartStudy förbereder din studentyta.</h1>
          <p>Vi verifierar om du redan har en aktiv inloggning.</p>
        </div>
      </main>
    )
  }

  if (authStatus !== 'authenticated') {
    if (publicView === 'home') {
      return (
        <HomePage
          healthMessage={healthMessage}
          onLogin={() => openAuthView('login')}
          onRegister={() => openAuthView('register')}
        />
      )
    }

    return (
      <AuthScreen
        mode={authMode}
        form={authForm}
        error={authError}
        busy={authBusy}
        healthMessage={healthMessage}
        onBackHome={openHomeView}
        onFieldChange={updateAuthField}
        onModeChange={switchAuthMode}
        onSocialAuth={handleSocialAuth}
        onSubmit={handleAuthSubmit}
      />
    )
  }

  return (
    <main className="dashboard-page">
      <div className="container dashboard-shell">
        <header className="dashboard-topbar">
          <div>
            <p className="landing-eyebrow">Study Cockpit</p>
            <h1>SmartStudy Dashboard</h1>
            <p className="dashboard-subtitle">
              {currentUser
                ? `${currentUser.full_name} har en privat vy för kurser, tentor och veckoplanering.`
                : 'En samlad vy för dina kurser, tentor och veckoplanering.'}
            </p>
          </div>

          <div className="dashboard-topbar-actions">
            {currentUser ? (
              <div className="dashboard-user-badge">
                <BookOpen size={15} />
                {currentUser.email}
              </div>
            ) : null}

            <div className={`hero-status hero-status-${healthTone}`}>
              <span className="hero-status-dot" />
              {healthMessage}
            </div>

            <button type="button" className="btn-secondary dashboard-logout" onClick={handleLogout}>
              <LogOut size={16} />
              Logga ut
            </button>
          </div>
        </header>

        {error ? (
          <div className="dashboard-alert glass-panel">
            <strong>Något gick fel.</strong>
            <p>{error}</p>
          </div>
        ) : null}

        <section className="dashboard-hero-panel glass-panel">
          <div className="dashboard-hero-copy">
            <p className="landing-eyebrow">Current Focus</p>
            <h2>{nextExam ? `${nextExam.name} är nästa fokus.` : 'Börja med att lägga till dina kurser.'}</h2>
            <p>{studySummary}</p>

            <div className="dashboard-hero-tags">
              <span className="dashboard-tag">
                <CalendarDays size={15} />
                {nextExam ? formatLongDate(nextExam.exam_date) : 'Ingen tenta ännu'}
              </span>
              <span className="dashboard-tag">
                <Clock3 size={15} />
                {settings ? `${settings.hours_per_week} timmar tillgängliga / vecka` : 'Laddar timmar'}
              </span>
              <span className="dashboard-tag">
                <Activity size={15} />
                API: {API_BASE_URL}
              </span>
            </div>
          </div>

          <div className="dashboard-hero-cta">
            <button
              type="button"
              className="btn-primary dashboard-primary-action"
              onClick={handleGeneratePlan}
              disabled={busy.generatePlan}
            >
              <Sparkles size={18} />
              {busy.generatePlan ? 'Genererar plan...' : 'Generera ny plan'}
            </button>
            <p>
              {courses.length > 0
                ? `Du har ${courses.length} kurs${courses.length === 1 ? '' : 'er'} redo för planering.`
                : 'Lägg till minst en kurs för att generera en första plan.'}
            </p>
          </div>
        </section>

        <section className="dashboard-stat-grid">
          <StatCard
            icon={BookOpen}
            label="Aktiva kurser"
            value={courses.length}
            detail={courses.length > 0 ? 'Kurser med tentadatum registrerade' : 'Inga kurser ännu'}
          />
          <StatCard
            icon={Clock3}
            label="Timmar per vecka"
            value={settings ? settings.hours_per_week : '...'}
            detail="Din nuvarande studiebudget"
          />
          <StatCard
            icon={Target}
            label="Brådskande kurser"
            value={urgentCourses}
            detail="Tentor inom de närmaste 14 dagarna"
          />
          <StatCard
            icon={Brain}
            label="Planhistorik"
            value={planHistory.length}
            detail={overdueCourses > 0 ? `${overdueCourses} passerade tentadatum i listan` : 'Alla tentor ligger framåt i tiden'}
          />
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel glass-panel">
            <div className="dashboard-panel-heading" id="create-course">
              <div>
                <p className="landing-eyebrow">Create Course</p>
                <h2>Lägg till kurs</h2>
              </div>
              <span className="dashboard-chip dashboard-chip-neutral">
                <Plus size={14} />
                Ny kurs
              </span>
            </div>

            <p className="dashboard-panel-copy">
              Börja med kursnamn, hur svår kursen känns och när examinationen sker. Du kan
              redigera allt i efterhand direkt i kurslistan.
            </p>

            <form className="dashboard-form" onSubmit={handleCreateCourse}>
              <label className="field">
                <span>Kursnamn</span>
                <input
                  className="modern-input"
                  type="text"
                  value={courseForm.name}
                  onChange={(event) =>
                    setCourseForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Till exempel Programmering 1"
                  required
                />
              </label>

              <p className="form-hint">
                Tips: håll kursnamnen korta och tydliga, till exempel “Matematik 3” eller
                “Databaser”.
              </p>

              <div className="dashboard-form-grid">
                <label className="field">
                  <span>Svårighetsgrad</span>
                  <select
                    className="modern-input"
                    value={courseForm.difficulty}
                    onChange={(event) =>
                      setCourseForm((current) => ({ ...current, difficulty: event.target.value }))
                    }
                  >
                    <option value="low">Låg</option>
                    <option value="med">Medel</option>
                    <option value="high">Hög</option>
                  </select>
                </label>

                <label className="field">
                  <span>Tentadatum</span>
                  <input
                    className="modern-input"
                    type="date"
                    value={courseForm.exam_date}
                    onChange={(event) =>
                      setCourseForm((current) => ({ ...current, exam_date: event.target.value }))
                    }
                    required
                  />
                </label>
              </div>

              <button type="submit" className="btn-primary dashboard-submit" disabled={busy.createCourse}>
                {busy.createCourse ? 'Skapar kurs...' : 'Spara kurs'}
              </button>
            </form>
          </article>

          <article className="dashboard-panel glass-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="landing-eyebrow">Study Settings</p>
                <h2>Veckobudget</h2>
              </div>
              <span className="dashboard-chip dashboard-chip-accent">
                <Clock3 size={14} />
                {settings ? `${settings.hours_per_week} h/vecka` : 'Laddar'}
              </span>
            </div>

            <p className="dashboard-panel-copy">
              Ange hur mycket tid du realistiskt kan lägga varje vecka. Det styr hur planen
              fördelar timmarna mellan kurserna.
            </p>

            <form className="dashboard-form-inline" onSubmit={handleUpdateSettings}>
              <label className="field field-compact">
                <span>Timmar per vecka</span>
                <input
                  className="modern-input"
                  type="number"
                  min="0"
                  step="1"
                  value={hoursInput}
                  onChange={(event) => setHoursInput(event.target.value)}
                />
              </label>

              <button type="submit" className="btn-secondary dashboard-submit" disabled={busy.updateSettings}>
                {busy.updateSettings ? 'Sparar...' : 'Uppdatera'}
              </button>
            </form>
          </article>

          <article className="dashboard-panel glass-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="landing-eyebrow">Upcoming Exams</p>
                <h2>Kommande examinationer</h2>
              </div>
            </div>

            {upcomingExams.length > 0 ? (
              <div className="dashboard-list">
                {upcomingExams.map((course) => {
                  const difficulty = getDifficultyBadge(course.difficulty)
                  const examTone = getExamTone(course.days_to_exam)

                  return (
                    <div key={`exam-${course.id}`} className="exam-row">
                      <div>
                        <strong>{course.name}</strong>
                        <p>{formatLongDate(course.exam_date)}</p>
                      </div>

                      <div className="exam-row-meta">
                        <span className={`dashboard-chip dashboard-chip-${difficulty.tone}`}>
                          {difficulty.label}
                        </span>
                        <span className={`dashboard-chip dashboard-chip-${examTone}`}>
                          {formatExamCountdown(course.days_to_exam)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="dashboard-empty">
                <CalendarDays size={18} />
                <p>Inga tentor att visa ännu. Lägg till en kurs för att få en tidslinje här.</p>
              </div>
            )}
          </article>

          <article className="dashboard-panel glass-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="landing-eyebrow">Course Library</p>
                <h2>Dina kurser</h2>
              </div>
              <span className="dashboard-chip dashboard-chip-neutral">{courses.length} st</span>
            </div>

            {courses.length > 0 ? (
              <div className="course-card-grid">
                {courses.map((course) => {
                  const difficulty = getDifficultyBadge(course.difficulty)
                  const daysLeft = daysUntil(course.exam_date)
                  const isEditing = editingCourseId === course.id
                  const isSaving = busy.updateCourseId === course.id
                  const isDeleting = busy.deleteCourseId === course.id

                  return (
                    <article key={course.id} className="course-card">
                      {isEditing ? (
                        <form className="course-card-form" onSubmit={(event) => handleUpdateCourse(event, course.id)}>
                          <div className="course-card-header">
                            <div>
                              <h3>Redigera kurs</h3>
                              <p>{formatLongDate(course.exam_date)}</p>
                            </div>
                            <span className={`dashboard-chip dashboard-chip-${difficulty.tone}`}>
                              {difficulty.label}
                            </span>
                          </div>

                          <label className="field">
                            <span>Kursnamn</span>
                            <input
                              className="modern-input"
                              type="text"
                              value={editingCourseForm.name}
                              onChange={(event) =>
                                setEditingCourseForm((current) => ({
                                  ...current,
                                  name: event.target.value
                                }))
                              }
                              required
                            />
                          </label>

                          <div className="course-card-form-grid">
                            <label className="field">
                              <span>Svårighetsgrad</span>
                              <select
                                className="modern-input"
                                value={editingCourseForm.difficulty}
                                onChange={(event) =>
                                  setEditingCourseForm((current) => ({
                                    ...current,
                                    difficulty: event.target.value
                                  }))
                                }
                              >
                                <option value="low">Låg</option>
                                <option value="med">Medel</option>
                                <option value="high">Hög</option>
                              </select>
                            </label>

                            <label className="field">
                              <span>Tentadatum</span>
                              <input
                                className="modern-input"
                                type="date"
                                value={editingCourseForm.exam_date}
                                onChange={(event) =>
                                  setEditingCourseForm((current) => ({
                                    ...current,
                                    exam_date: event.target.value
                                  }))
                                }
                                required
                              />
                            </label>
                          </div>

                          <div className="course-card-actions">
                            <button
                              type="submit"
                              className="btn-primary course-action-button"
                              disabled={isSaving}
                            >
                              <Save size={15} />
                              {isSaving ? 'Sparar...' : 'Spara ändringar'}
                            </button>

                            <button
                              type="button"
                              className="btn-secondary course-action-button"
                              onClick={cancelEditingCourse}
                              disabled={isSaving}
                            >
                              <X size={15} />
                              Avbryt
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="course-card-header">
                            <div>
                              <h3>{course.name}</h3>
                              <p>{formatDate(course.exam_date)}</p>
                            </div>
                            <span className={`dashboard-chip dashboard-chip-${difficulty.tone}`}>
                              {difficulty.label}
                            </span>
                          </div>

                          <p className="course-card-copy">{formatExamCountdown(daysLeft)}</p>

                          <div className="course-card-meta">
                            <span className={`dashboard-chip dashboard-chip-${getExamTone(daysLeft)}`}>
                              {formatLongDate(course.exam_date)}
                            </span>
                          </div>

                          <div className="course-card-actions">
                            <button
                              type="button"
                              className="btn-secondary course-action-button"
                              onClick={() => startEditingCourse(course)}
                              disabled={busy.deleteCourseId !== null || busy.updateCourseId !== null}
                            >
                              <Pencil size={15} />
                              Redigera
                            </button>

                            <button
                              type="button"
                              className="btn-danger course-action-button"
                              onClick={() => handleDeleteCourse(course.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 size={15} />
                              {isDeleting ? 'Tar bort...' : 'Ta bort'}
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="dashboard-empty">
                <BookOpen size={18} />
                <p>Kurslistan är tom. Börja med att skapa en kurs och använd sedan Redigera för att finjustera detaljerna.</p>
                <a href="#create-course" className="btn-secondary dashboard-empty-action">
                  <Plus size={15} />
                  Lägg till första kursen
                </a>
              </div>
            )}
          </article>
        </section>

        <section className="dashboard-plan-grid">
          <article className="dashboard-panel glass-panel dashboard-plan-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="landing-eyebrow">Generated Plan</p>
                <h2>Aktuell veckoplan</h2>
              </div>
              <button
                type="button"
                className="btn-primary dashboard-inline-action"
                onClick={handleGeneratePlan}
                disabled={busy.generatePlan}
              >
                <ArrowRight size={16} />
                {busy.generatePlan ? 'Uppdaterar...' : 'Generera igen'}
              </button>
            </div>

            {plan ? (
              <div className="plan-content">
                <div className="plan-summary">
                  <div className="plan-summary-card">
                    <span>Genererad</span>
                    <strong>{formatLongDate(plan.generated_at)}</strong>
                  </div>
                  <div className="plan-summary-card">
                    <span>Timmar använda</span>
                    <strong>{plan.hours_per_week} h</strong>
                  </div>
                  <div className="plan-summary-card">
                    <span>Allokerade timmar</span>
                    <strong>{totalAllocatedHours?.toFixed(1) ?? '0.0'} h</strong>
                  </div>
                </div>

                <div className="plan-callout">
                  <Sparkles size={18} />
                  <p>{plan.suggestion_text}</p>
                </div>

                <section className="plan-priority-panel">
                  <div className="plan-section-header">
                    <div>
                      <p className="landing-eyebrow">Priority Queue</p>
                      <h3>Prioritering per kurs</h3>
                    </div>
                    <span className="dashboard-chip dashboard-chip-neutral">
                      {prioritizedWeeklyFocus.length} kurser i ordning
                    </span>
                  </div>

                  <div className="priority-list">
                    {prioritizedWeeklyFocus.map((item, index) => {
                      const priority = getPriorityMeta(item, index, plan.hours_per_week)
                      const difficulty = getDifficultyBadge(item.difficulty)

                      return (
                        <article key={`priority-${item.course_id}`} className="priority-card">
                          <div className="priority-card-main">
                            <span className={`priority-rank priority-rank-${priority.tone}`}>
                              {priority.label}
                            </span>
                            <div>
                              <strong>{item.course_name}</strong>
                              <p>{priority.title}</p>
                            </div>
                          </div>

                          <div className="priority-card-meta">
                            <span className={`dashboard-chip dashboard-chip-${difficulty.tone}`}>
                              {difficulty.label}
                            </span>
                            <span className="dashboard-chip dashboard-chip-neutral">
                              {formatAllocationValue(item)}
                            </span>
                            <span className={`dashboard-chip dashboard-chip-${priority.tone}`}>
                              {formatPlanCountdown(getItemDaysLeft(item))}
                            </span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>

                <div className="focus-list">
                  {prioritizedWeeklyFocus.map((item, index) => {
                    const difficulty = getDifficultyBadge(item.difficulty)
                    const allocationPercent =
                      (item.hours_per_week / Math.max(plan.hours_per_week || 1, 1)) * 100
                    const allocationWidth = `${allocationPercent}%`
                    const priority = getPriorityMeta(item, index, plan.hours_per_week)
                    const cadence = getCadenceMeta(item)

                    return (
                      <article key={item.course_id} className="focus-card">
                        <div className="focus-card-header">
                          <div>
                            <h3>{item.course_name}</h3>
                            <p>
                              {formatPlanCountdown(getItemDaysLeft(item))} • {formatDate(item.exam_date)}
                            </p>
                          </div>
                          <div className="focus-card-badges">
                            <span className={`dashboard-chip dashboard-chip-${priority.tone}`}>
                              {priority.title}
                            </span>
                            <span className={`dashboard-chip dashboard-chip-${difficulty.tone}`}>
                              {difficulty.label}
                            </span>
                          </div>
                        </div>

                        <progress
                          className="focus-progress"
                          value={item.hours_per_week}
                          max={Math.max(plan.hours_per_week || 1, 1)}
                        >
                          {allocationWidth}
                        </progress>

                        <div className="focus-card-grid">
                          <div className="focus-card-detail">
                            <span>{getAllocationLabel(item)}</span>
                            <strong>{formatAllocationValue(item)}</strong>
                            <p>{getAllocationDetail(item, priority)}</p>
                          </div>
                          <div className="focus-card-detail">
                            <span>Studietakt</span>
                            <strong>{cadence.label}</strong>
                            <p>{cadence.text}</p>
                          </div>
                        </div>

                        <div className="focus-card-footer">
                          <strong>{formatAllocationValue(item)}</strong>
                          <span>{plan.hours_per_week > 0 ? allocationWidth : '0%'}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="dashboard-empty dashboard-empty-large">
                <Brain size={20} />
                <p>
                  Ingen plan har genererats ännu. När du är redo skapar SmartStudy ett
                  veckofokus baserat på dina kurser och timmar per vecka.
                </p>
              </div>
            )}
          </article>

          <article className="dashboard-panel glass-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="landing-eyebrow">History</p>
                <h2>Tidigare planer</h2>
              </div>
            </div>

            {planHistory.length > 0 ? (
              <div className="history-list">
                {planHistory.map((entry, index) => {
                  const topFocus = [...entry.weekly_focus]
                    .sort(
                      (a, b) =>
                        b.hours_per_week - a.hours_per_week ||
                        getItemDaysLeft(a) - getItemDaysLeft(b)
                    )
                    .slice(0, 3)

                  return (
                    <article key={`${entry.generated_at}-${index}`} className="history-card">
                      <div className="history-card-header">
                        <strong>{formatLongDate(entry.generated_at)}</strong>
                        <span>{entry.weekly_focus.length} fokusområden</span>
                      </div>

                      <div className="history-meta">
                        <span className="dashboard-chip dashboard-chip-neutral">
                          {entry.hours_per_week ?? 0} h / vecka
                        </span>
                        {topFocus.map((item, focusIndex) => (
                          <span key={`${entry.generated_at}-${item.course_id}-${focusIndex}`} className="dashboard-chip dashboard-chip-medium">
                            {focusIndex + 1}. {item.course_name}
                          </span>
                        ))}
                      </div>

                      <p>{entry.suggestion_text}</p>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="dashboard-empty">
                <Target size={18} />
                <p>När du genererar planer visas de här som en snabb historik.</p>
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  )
}

export default App
