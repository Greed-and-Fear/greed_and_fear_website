import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, setUnauthorizedHandler, type User } from '../api/client'
import { AuthContext, type AuthStatus } from './auth-context'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let active = true
    void api.currentUser()
      .then((currentUser) => {
        if (!active) return
        setUser(currentUser)
        if (currentUser?.id) {
          sessionStorage.setItem('user_id', String(currentUser.id))
        } else {
          sessionStorage.removeItem('user_id')
        }
        setStatus(currentUser ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        sessionStorage.removeItem('user_id')
        setStatus('anonymous')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      sessionStorage.removeItem('user_id')
      setStatus('anonymous')
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { from: `${location.pathname}${location.search}${location.hash}` } })
      }
    })
    return () => setUnauthorizedHandler(null)
  }, [location.hash, location.pathname, location.search, navigate])

  const login = async (phone: string, password: string) => {
    const authenticatedUser = await api.login(phone, password)
    setUser(authenticatedUser)
    if (authenticatedUser?.id) {
      sessionStorage.setItem('user_id', String(authenticatedUser.id))
    }
    setStatus('authenticated')
    return authenticatedUser
  }

  const logout = async () => {
    try { await api.logout() } finally {
      setUser(null)
      sessionStorage.removeItem('user_id')
      setStatus('anonymous')
      navigate('/login', { replace: true })
    }
  }

  return <AuthContext.Provider value={{ status, user, login, logout }}>{children}</AuthContext.Provider>
}
