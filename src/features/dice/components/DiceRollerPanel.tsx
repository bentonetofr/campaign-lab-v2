import { useCallback, useEffect, useRef, useState } from 'react'
import {
  QUICK_FORMULAS,
  getCampaignRolls,
  parseDiceFormula,
  rollDice,
} from '../services/diceService'
import type { DiceRoll, DiceRollWithProfile } from '../../../shared/types'
import './DiceRollerPanel.css'

// ────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────

interface DiceRollerPanelProps {
  campaignId: string
  currentUserId: string
  /** Chamado com a rolagem assim que ela é registrada — o DiceFab exibe o resultado como notificação. */
  onRoll: (roll: DiceRoll) => void
}

// Quantas rolagens recentes aparecem no popover — histórico completo
// continua acessível pela aba Atividade da campanha.
const RECENT_ROLLS_LIMIT = 3

// ────────────────────────────────────────────────────────
// Utilitários de display
// ────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff    = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 5)   return 'agora'
  if (seconds < 60)  return `${seconds}s atrás`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)  return `${minutes}min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function signStr(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

// ────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────

const EXAMPLE_FORMULAS = ['2d6+3', '2#d20', '2~d20', '1#d3+4']

export function DiceRollerPanel({ campaignId, currentUserId, onRoll }: DiceRollerPanelProps) {
  // ── Rolagem ──
  const [rolling, setRolling]     = useState(false)
  const [rollError, setRollError] = useState<string | null>(null)

  // ── Campo personalizado ──
  const [customFormula, setCustomFormula] = useState('')
  const [formulaError, setFormulaError]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Histórico ──
  const [history, setHistory]           = useState<DiceRollWithProfile[]>([])
  const [histLoading, setHistLoading]   = useState(true)
  const [histRefreshing, setHistRefreshing] = useState(false)
  const [histError, setHistError]       = useState<string | null>(null)

  // ── Carregar histórico ──
  const loadHistory = useCallback(async (refresh = false) => {
    if (refresh) setHistRefreshing(true)
    else { setHistLoading(true); setHistError(null) }
    try {
      const data = await getCampaignRolls(campaignId, RECENT_ROLLS_LIMIT)
      setHistory(data)
      setHistError(null)
    } catch (err) {
      setHistError(err instanceof Error ? err.message : 'Erro ao carregar histórico.')
    } finally {
      setHistLoading(false)
      setHistRefreshing(false)
    }
  }, [campaignId])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ── Executar rolagem ──
  async function executeRoll(formula: string) {
    setRollError(null)
    setFormulaError(null)
    setRolling(true)
    try {
      const roll = await rollDice(campaignId, formula)
      onRoll(roll)
      await loadHistory(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível registrar a rolagem.'
      setRollError(msg)
    } finally {
      setRolling(false)
    }
  }

  // ── Rolagem rápida ──
  function handleQuickRoll(formula: string) {
    executeRoll(formula)
  }

  // ── Validação e rolagem personalizada ──
  function handleCustomRoll() {
    const trimmed = customFormula.trim()
    if (!trimmed) { setFormulaError('Insira uma fórmula.'); return }
    try {
      parseDiceFormula(trimmed)
    } catch (err) {
      setFormulaError(err instanceof Error ? err.message : 'Fórmula inválida.')
      return
    }
    setFormulaError(null)
    executeRoll(trimmed)
  }

  function handleFormulaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !rolling) handleCustomRoll()
  }

  function useExample(formula: string) {
    setCustomFormula(formula)
    setFormulaError(null)
    inputRef.current?.focus()
  }

  // ────────────────────────────────────────────────────
  return (
    <div className="dice-panel__body">

      {/* ── Rolagem rápida ── */}
      <div className="dice-section">
        <h4 className="dice-section__title">Rolagem rápida</h4>
        <div className="quick-roll-btns" role="group" aria-label="Rolagem rápida">
          {QUICK_FORMULAS.map((f) => (
            <button
              key={f}
              className="quick-roll-btn"
              onClick={() => handleQuickRoll(f)}
              disabled={rolling}
              aria-label={`Rolar ${f}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Rolagem personalizada ── */}
      <div className="dice-section">
        <h4 className="dice-section__title">Rolagem personalizada</h4>
        <div className="dice-custom">
          <div className="dice-custom__input-row">
            <input
              ref={inputRef}
              type="text"
              className={`input dice-custom__text-input ${formulaError ? 'dice-custom__text-input--error' : ''}`}
              placeholder="Digite uma fórmula"
              value={customFormula}
              onChange={(e) => { setCustomFormula(e.target.value); setFormulaError(null) }}
              onKeyDown={handleFormulaKeyDown}
              disabled={rolling}
              aria-label="Fórmula personalizada"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={80}
            />
            <button
              className="btn btn-primary dice-custom__roll-btn"
              onClick={handleCustomRoll}
              disabled={rolling}
            >
              {rolling
                ? <><span className="spinner spinner--sm" /> Rolando...</>
                : 'Rolar'
              }
            </button>
          </div>

          <div className="dice-custom__examples">
            <span className="dice-custom__examples-label">Exemplos:</span>
            {EXAMPLE_FORMULAS.map((f) => (
              <button
                key={f}
                type="button"
                className="dice-custom__example-chip"
                onClick={() => useExample(f)}
                disabled={rolling}
              >
                {f}
              </button>
            ))}
          </div>

          {formulaError && (
            <div className="dice-feedback dice-feedback--error" role="alert">
              {formulaError}
            </div>
          )}
        </div>
      </div>

      {/* ── Erro de rolagem ── */}
      {rollError && (
        <div className="dice-feedback dice-feedback--error" role="alert">
          {rollError}
        </div>
      )}

      {/* ── Histórico ── */}
      <div className="dice-section dice-history">
        <div className="dice-history__header">
          <h4
            className="dice-section__title"
            style={{ borderBottom: 'none', marginBottom: 0 }}
          >
            <span aria-hidden="true">◎</span> Recentes
          </h4>
          <button
            className="btn btn-ghost dice-history__refresh-btn"
            onClick={() => loadHistory(true)}
            disabled={histRefreshing || histLoading}
          >
            {histRefreshing
              ? <><span className="spinner spinner--sm" /> Atualizando...</>
              : 'Atualizar'
            }
          </button>
        </div>

        {histLoading && (
          <div className="dice-history__loading">
            <div className="spinner spinner--sm" />
            <span>Carregando...</span>
          </div>
        )}

        {!histLoading && histError && (
          <div className="dice-feedback dice-feedback--error">{histError}</div>
        )}

        {!histLoading && !histError && history.length === 0 && (
          <p className="dice-history__empty">Nenhuma rolagem registrada nesta campanha.</p>
        )}

        {!histLoading && history.length > 0 && (
          <>
            <ul className="dice-history__list" aria-label="Histórico de rolagens">
              {history.map((roll) => {
                const isOwn = roll.user_id === currentUserId
                const diceTerms = roll.roll_breakdown?.filter((b) => b.type !== 'modifier') ?? []
                const hasBreakdown = diceTerms.length > 0

                return (
                  <li key={roll.id} className={`dice-history__row ${isOwn ? 'dice-history__row--own' : ''}`}>
                    <div className="dice-history__row-main">
                      <span className="dice-history__avatar" aria-hidden="true">
                        {roll.profile.display_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="dice-history__player">
                        {isOwn ? 'Você' : roll.profile.display_name}
                      </span>
                      <span className="dice-history__formula">
                        {roll.formula ?? roll.die_type}
                      </span>
                      <span className="dice-history__result">{roll.result}</span>
                      <span className="dice-history__time">
                        {formatRelativeTime(roll.created_at)}
                      </span>
                    </div>

                    {hasBreakdown && (
                      <div className="dice-history__row-detail">
                        {diceTerms.map((t, idx) => {
                          if (t.type === 'sum') {
                            return (
                              <span key={idx}>
                                {t.notation}: {t.results.join(', ')}
                                {idx < diceTerms.length - 1 ? ' · ' : ''}
                              </span>
                            )
                          }
                          if (t.type === 'keep_highest' || t.type === 'keep_lowest') {
                            return (
                              <span key={idx}>
                                {t.notation}: {t.results.join(', ')} → {t.kept}
                                {idx < diceTerms.length - 1 ? ' · ' : ''}
                              </span>
                            )
                          }
                          return null
                        })}
                        {roll.roll_breakdown?.find((b) => b.type === 'modifier') && (
                          <span>
                            {' · '}mod{signStr((roll.roll_breakdown.find((b) => b.type === 'modifier') as Extract<typeof roll.roll_breakdown[0], { type: 'modifier' }>).value)}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="dice-history__full-log-hint">
              Histórico completo na aba Atividade.
            </p>
          </>
        )}
      </div>

    </div>
  )
}
