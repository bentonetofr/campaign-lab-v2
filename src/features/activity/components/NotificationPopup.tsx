import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { getLiveNotifications, type LiveNotification } from '../services/activityService'
import './NotificationPopup.css'

// Mais rápido que o sino de propósito — é o mecanismo "ao vivo", quer parecer
// imediato. Ainda sem Realtime, só um polling mais frequente.
const POLL_INTERVAL_MS = 20_000
// Quanto tempo cada pop-up fica visível antes de sumir.
const POPUP_DURATION_MS = 5_000
// Duração da animação de saída — soma dentro do tempo total acima.
const POPUP_EXIT_MS = 320

export function NotificationPopup() {
  const { user } = useAuth()
  const [queue, setQueue]     = useState<LiveNotification[]>([])
  const [current, setCurrent] = useState<LiveNotification | null>(null)
  const [leaving, setLeaving] = useState(false)

  // IDs já mostrados — só em memória. null = ainda não fez a primeira
  // checagem. Na primeira checagem só registra o que já existe, sem
  // disparar pop-up (senão vira uma enxurrada de coisa antiga a cada F5);
  // dali pra frente, só o que for realmente novo entra na fila.
  const seenIdsRef = useRef<Set<string> | null>(null)

  const poll = useCallback(async () => {
    try {
      const events = await getLiveNotifications()

      if (seenIdsRef.current === null) {
        seenIdsRef.current = new Set(events.map((e) => e.id))
        return
      }

      const fresh = events.filter((e) => !seenIdsRef.current!.has(e.id))
      for (const e of fresh) seenIdsRef.current.add(e.id)
      if (fresh.length > 0) setQueue((q) => [...q, ...fresh])
    } catch (err) {
      // nunca quebra a tela por causa do pop-up, mas loga pra dar pra debugar
      console.error('Falha ao buscar notificações ao vivo:', err)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user, poll])

  // Consome a fila um item de cada vez.
  useEffect(() => {
    if (current || queue.length === 0) return
    const [next, ...rest] = queue
    setCurrent(next)
    setLeaving(false)
    setQueue(rest)
  }, [queue, current])

  useEffect(() => {
    if (!current) return
    const leaveTimer  = window.setTimeout(() => setLeaving(true), POPUP_DURATION_MS - POPUP_EXIT_MS)
    const removeTimer = window.setTimeout(() => setCurrent(null), POPUP_DURATION_MS)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(removeTimer)
    }
  }, [current])

  if (!user || !current) return null

  return (
    <div
      key={current.id}
      className={`notification-popup${leaving ? ' notification-popup--leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className="notification-popup__icon"
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <div className="notification-popup__body">
        <p className="notification-popup__message">{current.message}</p>
        <p className="notification-popup__campaign">{current.campaignName}</p>
      </div>
      <div
        className="notification-popup__progress"
        style={{ animationDuration: `${POPUP_DURATION_MS}ms` }}
      />
    </div>
  )
}
