import { useEffect, useMemo, useState } from 'react'

import { API_BASE_URL, api } from './api/client'
import HeroSection from './components/HeroSection'

const SESSION_KEY = 'smartstudy_is_authenticated'

const initialCourseForm = {
  name: '',
  difficulty: 'med',
  exam_date: ''
}

function daysUntil(dateString) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const examDate = new Date(`${dateString}T00:00:00`)
  const diffMs = examDate.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => window.localStorage.getItem(SESSION_KEY) === 'true'
  )

  const [healthMessage, setHealthMessage] = useState('Loading backend status...')
  const [courses, setCourses] = useState([])
  const [settings, setSettings] = useState(null)
  const [plan, setPlan] = useState(null)
  const [planHistory, setPlanHistory] = useState([])
  const [error, setError] = useState('')

  const [courseForm, setCourseForm] = useState(initialCourseForm)
  const [hoursInput, setHoursInput] = useState('8')
  const [busy, setBusy] = useState({
    createCourse: false,
    updateSettings: false,
    generatePlan: false
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

  function setBusyFlag(key, value) {
    setBusy((current) => ({ ...current, [key]: value }))
  }

  async function loadHealth() {
    try {
      const data = await api.getHealth()
      setHealthMessage(data.message)
    } catch {
      setHealthMessage('Could not connect to backend')
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

  async function refreshDashboard() {
    setError('')
    try {
      await Promise.all([loadCourses(), loadSettings()])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    }
  }

  useEffect(() => {
    loadHealth()
    if (isAuthenticated) {
      refreshDashboard()
    }
  }, [isAuthenticated])

  function loginDemo() {
    window.localStorage.setItem(SESSION_KEY, 'true')
    setIsAuthenticated(true)
  }

  function logoutDemo() {
    window.localStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)

    setCourses([])
    setSettings(null)
    setPlan(null)
    setPlanHistory([])
    setError('')
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
      setError(err.message || 'Failed to create course')
    } finally {
      setBusyFlag('createCourse', false)
    }
  }

  async function handleDeleteCourse(id) {
    setError('')
    try {
      await api.deleteCourse(id)
      await loadCourses()
    } catch (err) {
      setError(err.message || 'Failed to delete course')
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
      setError(err.message || 'Failed to update settings')
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
        {
          generated_at: data.generated_at,
          suggestion_text: data.suggestion_text,
          weekly_focus: data.weekly_focus || []
        },
        ...current
      ])
    } catch (err) {
      setError(err.message || 'Failed to generate plan')
    } finally {
      setBusyFlag('generatePlan', false)
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="landing-page">
        <HeroSection backendMessage={healthMessage} onPrimaryAction={loginDemo} />

        <div className="container landing-sections">
          <section id="overview" className="landing-card glass-panel">
            <p className="landing-eyebrow">Overview</p>
            <h2>En studieplanerare för verkliga veckor.</h2>
            <p>
              SmartStudy hjälper dig gå från lösa kurslistor till ett konkret veckofokus med
              hänsyn till tentadatum, svårighetsgrad och faktisk tillgänglig tid.
            </p>
          </section>

          <section id="workflow" className="landing-card glass-panel">
            <p className="landing-eyebrow">Workflow</p>
            <h2>Så fungerar flödet.</h2>
            <ol className="landing-list">
              <li>Lägg till kurser med svårighetsgrad och examensdag.</li>
              <li>Välj hur många timmar du kan lägga varje vecka.</li>
              <li>Generera en plan som fördelar tiden mellan kurserna.</li>
              <li>Följ kommande examinationer och justera när veckan ändras.</li>
            </ol>
          </section>

          <section id="features" className="landing-card glass-panel">
            <p className="landing-eyebrow">MVP Features</p>
            <h2>Det viktigaste finns redan i produkten.</h2>
            <ul className="landing-list">
              <li>Kursöversikt med tentadatum och prioritering.</li>
              <li>Inställning för timmar per vecka.</li>
              <li>AI-stödd plantext och veckofokus per kurs.</li>
              <li>Historik över genererade studieplaner.</li>
            </ul>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <header>
        <h1>SmartStudy Dashboard</h1>
        <p>API base: {API_BASE_URL}</p>
        <p>Backend status: {healthMessage}</p>
        <button type="button" onClick={logoutDemo}>
          Log out
        </button>
      </header>

      {error ? <p style={{ color: '#ff6b6b' }}>Error: {error}</p> : null}

      <hr style={{ margin: '16px 0' }} />
      <section>
        <h2>Summary</h2>
        <p>Total courses: {courses.length}</p>
        <p>Hours/week: {settings ? settings.hours_per_week : 'Loading...'}</p>
        <p>
          Next exam:{' '}
          {nextExam
            ? `${nextExam.name} (${nextExam.exam_date}, ${nextExam.days_to_exam} days left)`
            : 'No courses added yet'}
        </p>
      </section>

      <hr style={{ margin: '16px 0' }} />
      <section>
        <h2>Upcoming examination days</h2>
        <ul>
          {upcomingExams.map((course) => (
            <li key={`exam-${course.id}`}>
              {course.name} | {course.exam_date} | {course.days_to_exam} days left
            </li>
          ))}
        </ul>
      </section>

      <hr style={{ margin: '16px 0' }} />
      <section>
        <h2>Courses</h2>
        <form onSubmit={handleCreateCourse}>
          <label>
            Name:
            <input
              type="text"
              value={courseForm.name}
              onChange={(event) =>
                setCourseForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
          </label>{' '}
          <label>
            Difficulty:
            <select
              value={courseForm.difficulty}
              onChange={(event) =>
                setCourseForm((current) => ({ ...current, difficulty: event.target.value }))
              }
            >
              <option value="low">low</option>
              <option value="med">med</option>
              <option value="high">high</option>
            </select>
          </label>{' '}
          <label>
            Exam date:
            <input
              type="date"
              value={courseForm.exam_date}
              onChange={(event) =>
                setCourseForm((current) => ({ ...current, exam_date: event.target.value }))
              }
              required
            />
          </label>{' '}
          <button type="submit" disabled={busy.createCourse}>
            {busy.createCourse ? 'Creating...' : 'Create Course'}
          </button>
        </form>

        <ul>
          {courses.map((course) => (
            <li key={course.id}>
              #{course.id} {course.name} | {course.difficulty} | {course.exam_date}{' '}
              <button type="button" onClick={() => handleDeleteCourse(course.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <hr style={{ margin: '16px 0' }} />
      <section>
        <h2>Study settings</h2>
        <p>Current hours/week: {settings ? settings.hours_per_week : 'Loading...'}</p>
        <form onSubmit={handleUpdateSettings}>
          <label>
            hours_per_week:
            <input
              type="number"
              min="0"
              step="1"
              value={hoursInput}
              onChange={(event) => setHoursInput(event.target.value)}
            />
          </label>{' '}
          <button type="submit" disabled={busy.updateSettings}>
            {busy.updateSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </section>

      <hr style={{ margin: '16px 0' }} />
      <section>
        <h2>Plan generator</h2>
        <button type="button" onClick={handleGeneratePlan} disabled={busy.generatePlan}>
          {busy.generatePlan ? 'Generating...' : 'Generate Plan'}
        </button>

        {plan ? (
          <div>
            <p>Generated at: {plan.generated_at}</p>
            <p>Hours/week used: {plan.hours_per_week}</p>
            <p>Suggestion: {plan.suggestion_text}</p>
            <h3>Weekly focus</h3>
            <ul>
              {plan.weekly_focus?.map((item) => (
                <li key={item.course_id}>
                  {item.course_name} | {item.difficulty} | {item.hours_per_week} h/week |{' '}
                  {item.weeks_to_exam} weeks to exam
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <hr style={{ margin: '16px 0' }} />
      <section>
        <h2>Generated study plans</h2>
        <ul>
          {planHistory.map((entry, index) => (
            <li key={`${entry.generated_at}-${index}`}>
              {entry.generated_at} | {entry.weekly_focus.length} course allocations |{' '}
              {entry.suggestion_text}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
