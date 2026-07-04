const KEY = 'kd_user'

export interface KdUser {
  name: string
  email: string
}

export function getUser(): KdUser | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}

export function saveUser(user: KdUser) {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function logout() {
  localStorage.removeItem(KEY)
}

export function isLoggedIn() {
  return !!getUser()
}
