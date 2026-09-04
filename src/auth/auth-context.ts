import { createContext, useContext } from 'react'
import type { User } from '../api/client'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (phone: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function getSessionUserId(): number | null {
  if (typeof window === 'undefined') return null
  const stored = sessionStorage.getItem('user_id')
  if (stored) {
    const parsed = Number(stored)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return null
}
