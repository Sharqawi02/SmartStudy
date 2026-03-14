const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body?.error) {
        errorMessage = body.error
      }
    } catch {
      // Ignore JSON parsing errors for non-JSON responses.
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const api = {
  getHealth: () => request('/api/health'),
  getCourses: () => request('/api/courses'),
  createCourse: (payload) =>
    request('/api/courses', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  deleteCourse: (id) =>
    request(`/api/courses/${id}`, {
      method: 'DELETE'
    }),
  getSettings: () => request('/api/settings'),
  updateSettings: (hoursPerWeek) =>
    request('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ hours_per_week: hoursPerWeek })
    }),
  generatePlan: (payload = {}) =>
    request('/api/plan/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
}

export { API_BASE_URL }
