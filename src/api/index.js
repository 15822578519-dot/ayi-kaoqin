import axios from 'axios'
import { showToast } from 'vant'

const TOKEN_KEY = 'ayi_kaoqin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

const api = axios.create({ baseURL: '/api' })

// 请求自动带令牌
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应统一处理 401（登录过期）。登录接口本身返回 401 不改写页面。
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginReq = err.config && err.config.url && err.config.url.includes('/login')
    if (err.response && err.response.status === 401 && !isLoginReq) {
      clearToken()
      location.reload()
    }
    const msg = (err.response && err.response.data && err.response.data.error) || '网络错误，请重试'
    showToast(msg)
    return Promise.reject(err)
  }
)

export const apiLogin = (code) => api.post('/login', { code }).then((r) => r.data)
export const apiList = (month) => api.get('/records', { params: { month } }).then((r) => r.data.list)
export const apiCreate = (body) => api.post('/records', body).then((r) => r.data.record)
export const apiUpdate = (id, body) => api.put(`/records/${id}`, body).then((r) => r.data.record)
export const apiRemove = (id) => api.delete(`/records/${id}`).then((r) => r.data)
export const apiSummary = (month) =>
  api.get('/summary', { params: { month } }).then((r) => r.data)

export default api
