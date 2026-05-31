import type { DndCharacter } from './mockCharacter'
import { formatModifier, getPassivePerception } from './mockCharacter'

interface DndQuickStatsProps {
  character: DndCharacter
}

export function DndQuickStats({ character: c }: DndQuickStatsProps) {
  const { hitPoints: hp } = c
  const hpPct = hp.max > 0 ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 0
  const hpBarClass =
    hpPct > 50 ? 'dnd-hp-bar' :
    hpPct > 25 ? 'dnd-hp-bar dnd-hp-bar--warn' :
    'dnd-hp-bar dnd-hp-bar--crit'

  const passivePerception = getPassivePerception(c.skills, c.abilities, c.proficiencyBonus)

  return (
    <div className="dnd-quick-stats">
      {/* CA / Iniciativa / Deslocamento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
        <div className="dnd-stat-card">
          <div className="dnd-stat-card__label">CA</div>
          <div className="dnd-stat-card__value">{c.armorClass}</div>
        </div>
        <div className="dnd-stat-card">
          <div className="dnd-stat-card__label">Iniciativa</div>
          <div className="dnd-stat-card__value">{formatModifier(c.initiative)}</div>
        </div>
      </div>

      <div className="dnd-stat-card">
        <div className="dnd-stat-card__label">Deslocamento</div>
        <div className="dnd-stat-card__value">{c.speed}</div>
        <div className="dnd-stat-card__sub">metros</div>
      </div>

      <div className="dnd-stat-card">
        <div className="dnd-stat-card__label">Bônus de Proficiência</div>
        <div className="dnd-stat-card__value">{formatModifier(c.proficiencyBonus)}</div>
      </div>

      {/* HP */}
      <div className="dnd-hp-card">
        <div className="dnd-hp-card__label">Pontos de Vida</div>
        <div className="dnd-hp-bar-wrap">
          <div className={hpBarClass} style={{ width: `${hpPct}%` }} />
        </div>
        <div className="dnd-hp-numbers">
          <span className="dnd-hp-current">{hp.current}</span>
          <span className="dnd-hp-sep">/</span>
          <span className="dnd-hp-max">{hp.max}</span>
        </div>
        {hp.temp > 0 && (
          <div className="dnd-hp-temp">+{hp.temp} temp.</div>
        )}
      </div>

      {/* Dados de Vida */}
      <div className="dnd-stat-card">
        <div className="dnd-stat-card__label">Dados de Vida</div>
        <div className="dnd-stat-card__value" style={{ fontSize: 'var(--text-xl)' }}>{c.hitDice}</div>
      </div>

      {/* Percepção Passiva */}
      <div className="dnd-stat-card">
        <div className="dnd-stat-card__label">Percepção Passiva</div>
        <div className="dnd-stat-card__value">{passivePerception}</div>
      </div>

      {/* Salvaguardas da Morte */}
      <div className="dnd-death-saves">
        <div className="dnd-death-saves__label">Salvaguardas da Morte</div>
        <div className="dnd-death-saves__row">
          <span className="dnd-death-saves__row-label">Sucesso</span>
          <div className="dnd-death-saves__dots">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`dnd-dot ${i < c.deathSaves.successes ? 'dnd-dot--success' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="dnd-death-saves__row">
          <span className="dnd-death-saves__row-label">Falha</span>
          <div className="dnd-death-saves__dots">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`dnd-dot ${i < c.deathSaves.failures ? 'dnd-dot--failure' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Inspiração */}
      <div className="dnd-inspiration">
        <span className="dnd-inspiration__label">Inspiração</span>
        <div className={`dnd-inspiration__gem ${c.inspiration ? 'dnd-inspiration__gem--active' : ''}`} />
      </div>
    </div>
  )
}
