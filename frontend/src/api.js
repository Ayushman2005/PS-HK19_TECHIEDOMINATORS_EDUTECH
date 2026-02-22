/**
 * api.js — Centralized API client for StudyAI backend
 * All calls go through this module so base URL and error handling
 * are managed in one place.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s for RAG + LLM round-trips
  headers: { 'Content-Type': 'application/json' }
})

// Response interceptor — unwrap data, normalize errors
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

// ── Session ────────────────────────────────────────────────────────────────

export const createSession = (studentName, subject) =>
  client.post('/session/create', { student_name: studentName, subject })

// ── Q&A ────────────────────────────────────────────────────────────────────

export const askQuestion = (payload) =>
  client.post('/ask', payload)

// ── Documents ──────────────────────────────────────────────────────────────

export const uploadDocument = (file, subject) => {
  const form = new FormData()
  form.append('file', file)
  return client.post(`/upload?subject=${encodeURIComponent(subject)}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const listDocuments = () => client.get('/documents')

export const deleteDocument = (docId) => client.delete(`/documents/${docId}`)

// ── Insights ───────────────────────────────────────────────────────────────

export const getInsights = (sessionId) => client.get(`/insights/${sessionId}`)

export const reportConfusion = (sessionId, topic, confusionLevel) =>
  client.post('/confusion', {
    session_id: sessionId,
    topic,
    confusion_level: confusionLevel
  })

export const getGlobalInsights = () => client.get('/global-insights')

// ── Health ─────────────────────────────────────────────────────────────────

export const healthCheck = () => client.get('/health')

export default client

export const generateQuiz = (sessionId, topic, numQuestions = 5) =>
  client.post('/generate-quiz', {
    session_id: sessionId,
    topic,
    num_questions: numQuestions
  })