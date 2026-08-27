import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCampaignMessages,
  sendMessage,
  deleteMessage,
  subscribeToMessages,
  markChatRead,
  type ChatMessage,
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

  const listRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const memberProfilesRef = useRef<Map<string, ChatMessage['profile']>>(new Map())

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
    const unsubscribe = subscribeToMessages(
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
    )
    return unsubscribe
  }, [campaignId, scrollToBottom])

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

      <div className="chat-panel__composer">
        {sendError && (
          <div className="chat-feedback chat-feedback--error" role="alert">{sendError}</div>
        )}
        <div className="chat-composer__row">
          <textarea
            className="input chat-composer__input"
            placeholder="Escreva uma mensagem..."
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setSendError(null) }}
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
