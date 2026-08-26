import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { getActivitySeenAt, getUnreadNotificationCount, markActivitySeen } from '../services/activityService'
import './NotificationBell.css'

// Cadência do polling — mesma da heartbeat de presença de campanha, sem Realtime.
const POLL_INTERVAL_MS = 75_000

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const seenAt = await getActivitySeenAt()
      const unread = await getUnreadNotificationCount(seenAt)
      setCount(unread)
    } catch {
      // silencioso — o selo só deixa de atualizar, não quebra a tela
    }
  }, [])

  useEffect(() => {
    if (!user) return
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user, refresh])

  async function handleClick() {
    setCount(0)
    navigate('/atividade')
    try { await markActivitySeen() } catch { /* silencioso */ }
  }

  if (!user) return null

  return (
    <button
      type="button"
      className="notification-bell"
      onClick={handleClick}
      aria-label={count > 0 ? `${count} notificações novas` : 'Notificações'}
    >
      <svg
        width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="notification-bell__badge">{count > 99 ? '99+' : count}</span>
      )}
    </button>
  )
}
