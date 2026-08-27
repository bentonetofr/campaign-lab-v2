import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCampaignMessages,
  sendMessage,
  deleteMessage,
  subscribeToMessages,
  markChatRead,
  type ChatMessage,
  type TypingPayload,
} from '../services/chatService'
import { getCampaignMembers } from '../../members/services/memberService'
import './CampaignChatPanel.css'

// ────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────

interface CampaignChatPanelProps {
  campaignId:    string
  currentUserId: string
  userRole:      'master' | 'player'
}

const PAGE_SIZE = 30
const NEAR_BOTTOM_PX = 100
const NEAR_TOP_PX = 60
// Intervalo mínimo entre broadcasts de "digitando" enquanto o usuário
// escreve — evita mandar um evento por tecla.
const TYPING_BROADCAST_THROTTLE_MS = 2000
// Se não chegar outro aviso de "digitando" desse usuário nesse tempo, o
// indicador some sozinho — protege contra aba fechada/travada no meio.
const TYPING_EXPIRE_MS = 3500

function formatTypingUsers(names: string[]): string {
  if (names.length === 1) return `${names[0]} está digitando`
  if (names.length === 2) return `${names[0]} e ${names[1]} estão digitando`
  return `${names[0]} e mais ${names.length - 1} estão digitando`
}

// ────────────────────────────────────────────────────────
// Utilitários
// ────────────────────────────────────────────────────────

function formatMessageTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────

export function CampaignChatPanel({ campaignId, currentUserId, userRole }: CampaignChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,  setHasMore]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const [draft,   setDraft]   = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())

  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isNearBottomRef = useRef(true)
  const memberProfilesRef = useRef<Map<string, ChatMessage['profile']>>(new Map())
  const sendTypingRef = useRef<((payload: TypingPayload) => void) | null>(null)
  const lastTypingSentAtRef = useRef(0)
  const typingTimeoutsRef = useRef<Map<string, number>>(new Map())

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // ── Carga inicial: perfis dos membros (pra enriquecer eventos do Realtime,
  // que não trazem join) + primeira página de mensagens ──
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const members = await getCampaignMembers(campaignId)
        memberProfilesRef.current = new Map(members.map((m) => [m.user_id, m.profile]))

        const initial = await getCampaignMessages(campaignId)
        if (cancelled) return
        setMessages(initial)
        setHasMore(initial.length >= PAGE_SIZE)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível carregar o chat.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          requestAnimationFrame(scrollToBottom)
        }
      }
    }

    init()
    markChatRead(campaignId).catch(() => { /* silencioso */ })

    return () => { cancelled = true }
  }, [campaignId, scrollToBottom])

  // ── Realtime: assina ao montar, cancela ao desmontar ──
  useEffect(() => {
    const { sendTyping, unsubscribe } = subscribeToMessages(
      campaignId,
      (row) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev
          const profile = memberProfilesRef.current.get(row.user_id)
            ?? { id: row.user_id, display_name: 'Alguém', avatar_url: null }
          return [...prev, {
            id: row.id,
            campaign_id: row.campaign_id,
            user_id: row.user_id,
            content: row.content,
            created_at: row.created_at,
            profile,
          }]
        })
        if (isNearBottomRef.current) requestAnimationFrame(scrollToBottom)
      },
      (id) => {
        setMessages((prev) => prev.filter((m) => m.id !== id))
      },
      (payload) => {
        if (payload.user_id === currentUserId) return

        setTypingUsers((prev) => {
          const next = new Map(prev)
          next.set(payload.user_id, payload.display_name)
          return next
        })

        const existingTimeout = typingTimeoutsRef.current.get(payload.user_id)
        if (existingTimeout !== undefined) window.clearTimeout(existingTimeout)

        const timeoutId = window.setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev)
            next.delete(payload.user_id)
            return next
          })
          typingTimeoutsRef.current.delete(payload.user_id)
        }, TYPING_EXPIRE_MS)
        typingTimeoutsRef.current.set(payload.user_id, timeoutId)
      },
    )

    sendTypingRef.current = sendTyping

    return () => {
      sendTypingRef.current = null
      typingTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
      typingTimeoutsRef.current.clear()
      unsubscribe()
    }
  }, [campaignId, currentUserId, scrollToBottom])

  // ── Paginação: rolar até o topo carrega mensagens mais antigas ──
  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    setLoadingMore(true)
    const container = listRef.current
    const prevScrollHeight = container?.scrollHeight ?? 0
    try {
      const older = await getCampaignMessages(campaignId, messages[0].created_at)
      if (older.length < PAGE_SIZE) setHasMore(false)
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev])
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight - prevScrollHeight
        })
      }
    } catch {
      // falha ao paginar não deve quebrar o chat — só não carrega mais dessa vez
    } finally {
      setLoadingMore(false)
    }
  }, [campaignId, messages, loadingMore, hasMore])

  function handleScroll() {
    const container = listRef.current
    if (!container) return
    isNearBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < NEAR_BOTTOM_PX
    if (container.scrollTop < NEAR_TOP_PX) loadOlder()
  }

  // ── Avisa aos outros que está digitando, com throttle ──
  function handleDraftChange(value: string) {
    setDraft(value)
    setSendError(null)

    const now = Date.now()
    if (now - lastTypingSentAtRef.current < TYPING_BROADCAST_THROTTLE_MS) return
    lastTypingSentAtRef.current = now

    const myProfile = memberProfilesRef.current.get(currentUserId)
    sendTypingRef.current?.({
      user_id: currentUserId,
      display_name: myProfile?.display_name ?? 'Alguém',
    })
  }

  // ── Envio ──
  async function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || sending) return
    setSending(true)
    setSendError(null)
    try {
      await sendMessage(campaignId, trimmed)
      setDraft('')
      // sem otimismo local — a mensagem aparece quando o próprio Realtime ecoar
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.')
    } finally {
      setSending(false)
      // devolve o foco pro campo — clicar em "Enviar" não deve tirar o
      // usuário do fluxo de digitação. Adiado um frame porque o campo
      // ainda está `disabled` no DOM neste exato instante (só deixa de
      // estar depois que o re-render do setSending(false) for aplicado),
      // e um elemento desabilitado não aceita foco.
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMessage(id)
      // sem atualização local — o Realtime DELETE remove da lista
    } catch {
      // falha silenciosa — mensagem simplesmente continua visível
    }
  }

  // ────────────────────────────────────────────────────
  return (
    <section className="chat-panel">
      <div className="chat-panel__list" ref={listRef} onScroll={handleScroll}>
        {loadingMore && (
          <div className="chat-panel__loading-more">
            <div className="spinner spinner--sm" />
          </div>
        )}

        {loading && (
          <div className="chat-panel__state">
            <div className="spinner spinner--sm" />
            <span>Carregando mensagens...</span>
          </div>
        )}

        {!loading && error && (
          <div className="chat-feedback chat-feedback--error" role="alert">{error}</div>
        )}

        {!loading && !error && messages.length === 0 && (
          <p className="chat-panel__empty">Nenhuma mensagem ainda. Comece a conversa.</p>
        )}

        {!loading && messages.map((m) => {
          const isOwn = m.user_id === currentUserId
          const canDelete = isOwn || userRole === 'master'
          return (
            <div key={m.id} className={`chat-message${isOwn ? ' chat-message--own' : ''}`}>
              <span className="chat-message__avatar" aria-hidden="true">
                {m.profile.avatar_url
                  ? <img src={m.profile.avatar_url} alt="" />
                  : m.profile.display_name.charAt(0).toUpperCase()}
              </span>
              <div className="chat-message__body">
                <div className="chat-message__meta">
                  <span className="chat-message__name">{isOwn ? 'Você' : m.profile.display_name}</span>
                  <time className="chat-message__time" dateTime={m.created_at}>
                    {formatMessageTime(m.created_at)}
                  </time>
                </div>
                <p className="chat-message__content">{m.content}</p>
              </div>
              {canDelete && (
                <button
                  type="button"
                  className="chat-message__delete"
                  onClick={() => handleDelete(m.id)}
                  aria-label="Apagar mensagem"
                  title="Apagar mensagem"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      {typingUsers.size > 0 && (
        <div className="chat-typing-row" aria-live="polite">
          <svg
            className="chat-typing-bubble"
            width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="10" r="7" />
            <path d="M9 16.8 L7 20 L12.3 17.2" />
            <circle className="chat-typing-dot chat-typing-dot--1" cx="8.5"  cy="10" r="1.2" fill="currentColor" stroke="none" />
            <circle className="chat-typing-dot chat-typing-dot--2" cx="12"   cy="10" r="1.2" fill="currentColor" stroke="none" />
            <circle className="chat-typing-dot chat-typing-dot--3" cx="15.5" cy="10" r="1.2" fill="currentColor" stroke="none" />
          </svg>
          <span className="chat-typing-text">
            {formatTypingUsers(Array.from(typingUsers.values()))}
          </span>
        </div>
      )}

      <div className="chat-panel__composer">
        {sendError && (
          <div className="chat-feedback chat-feedback--error" role="alert">{sendError}</div>
        )}
        <div className="chat-composer__row">
          <textarea
            ref={textareaRef}
            className="input chat-composer__input"
            placeholder="Escreva uma mensagem..."
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            maxLength={2000}
            rows={1}
          />
          <button
            type="button"
            className="btn btn-primary chat-composer__send"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
          >
            {sending ? <span className="spinner spinner--sm" /> : 'Enviar'}
          </button>
        </div>
      </div>
    </section>
  )
}
