import axios from 'axios'
import { showToast } from 'vant'

const TOKEN_KEY = 'ayi_kaoqin_token'
export function getToken() { return localStorage.getItem(TOKEN_KEY) || '' }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

const api = axios.create({ baseURL: 'https://ayi-kaoqin-api.15822578519-9d2.workers.dev/api' })
api.interceptors.request.use((config) => { const t = getToken(); if (t) config.headers.Authorization = `Bearer ${t}`; return config })
api.interceptors.response.use((res) => res, (err) => {
  if (err.response?.status === 401 && !(err.config?.url || '').includes('/login')) { clearToken(); location.reload() }
  showToast((err.response?.data?.error) || '网络错误')
  return Promise.reject(err)
})

export const apiLogin = (code) => api.post('/login', { code }).then(r => r.data)
export const apiList = (month) => api.get('/records', { params: { month } }).then(r => r.data.list)
export const apiCreate = (body) => api.post('/records', body).then(r => r.data.record)
export const apiUpdate = (id, body) => api.put(`/records/${id}`, body).then(r => r.data.record)
export const apiRemove = (id) => api.delete(`/records/${id}`).then(r => r.data)
export const apiSummary = (month) => api.get('/summary', { params: { month } }).then(r => r.data)

export default api
