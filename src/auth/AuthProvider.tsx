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
        setStatus(currentUser ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setStatus('anonymous')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
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
    setStatus('authenticated')
    return authenticatedUser
  }

  const logout = async () => {
    try { await api.logout() } finally {
      setUser(null)
      setStatus('anonymous')
      navigate('/login', { replace: true })
    }
  }

  return <AuthContext.Provider value={{ status, user, login, logout }}>{children}</AuthContext.Provider>
}
