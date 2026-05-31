import type { DndCharacter } from '../mockCharacter'
import { ABILITY_FULL_LABELS, formatModifier } from '../mockCharacter'

interface Props { character: DndCharacter }

export function DndMagiasTab({ character: c }: Props) {
  const hasSpells = c.spells.length > 0 || Object.keys(c.spellSlots).length > 0

  if (!hasSpells) {
    return (
      <div className="dnd-tab-content">
        <p className="dnd-no-spells">Este personagem não possui magias.</p>
      </div>
    )
  }

  return (
    <div className="dnd-tab-content">
      {/* Info de conjuração */}
      {c.spellcastingAbility && (
        <div>
          <p className="dnd-section-title">Conjuração</p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div className="dnd-stat-card" style={{ flex: '1', minWidth: '100px' }}>
              <div className="dnd-stat-card__label">Atributo</div>
              <div className="dnd-stat-card__value" style={{ fontSize: 'var(--text-sm)' }}>
                {ABILITY_FULL_LABELS[c.spellcastingAbility]}
              </div>
            </div>
            <div className="dnd-stat-card" style={{ flex: '1', minWidth: '80px' }}>
              <div className="dnd-stat-card__label">CD de Magia</div>
              <div className="dnd-stat-card__value">{c.spellSaveDC}</div>
            </div>
            <div className="dnd-stat-card" style={{ flex: '1', minWidth: '80px' }}>
              <div className="dnd-stat-card__label">Bônus de Ataque</div>
              <div className="dnd-stat-card__value">{formatModifier(c.spellAttackBonus)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Espaços de magia */}
      {Object.keys(c.spellSlots).length > 0 && (
        <div>
          <p className="dnd-section-title">Espaços de Magia</p>
          <div className="dnd-spell-slots-grid">
            {Object.entries(c.spellSlots).map(([lvl, slot]) => (
              <div key={lvl} className="dnd-spell-slot">
                <div className="dnd-spell-slot__level">Nível {lvl}</div>
                <div className="dnd-spell-slot__value">{slot.total - slot.used}</div>
                <div className="dnd-spell-slot__used">de {slot.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de magias */}
      {c.spells.length > 0 && (
        <div>
          <p className="dnd-section-title">Magias</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {c.spells.map((spell) => (
              <div
                key={spell.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {spell.name}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {spell.level === 0 ? 'Truque' : `Nível ${spell.level}`} · {spell.school}
                  </span>
                  {spell.concentration && (
                    <span className="dnd-tag">Concentração</span>
                  )}
                  {spell.ritual && (
                    <span className="dnd-tag">Ritual</span>
                  )}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                  {spell.castingTime} · Alcance: {spell.range} · Duração: {spell.duration}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
