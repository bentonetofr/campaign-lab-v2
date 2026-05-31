import type { DndCharacter } from '../mockCharacter'
import { formatModifier } from '../mockCharacter'

interface Props { character: DndCharacter }

export function DndCombateTab({ character: c }: Props) {
  return (
    <div className="dnd-tab-content">
      {/* Condições */}
      <div>
        <p className="dnd-section-title">Condições Ativas</p>
        {c.conditions.length === 0 ? (
          <p className="dnd-conditions--none">Nenhuma condição ativa.</p>
        ) : (
          <div className="dnd-conditions">
            {c.conditions.map((cond) => (
              <span key={cond} className="dnd-condition-badge">{cond}</span>
            ))}
          </div>
        )}
      </div>

      {/* Ataques */}
      <div>
        <p className="dnd-section-title">Ataques</p>
        <div className="dnd-attacks-list">
          {c.attacks.map((atk) => (
            <div key={atk.id} className="dnd-attack-card">
              <div>
                <p className="dnd-attack-card__name">{atk.name}</p>
                {atk.properties.length > 0 && (
                  <p className="dnd-attack-card__props">{atk.properties.join(', ')}</p>
                )}
              </div>
              <div>
                <div className="dnd-attack-card__bonus">{formatModifier(atk.bonus)}</div>
                <div className="dnd-attack-card__bonus-label">Ataque</div>
              </div>
              <div>
                <div className="dnd-attack-card__damage">{atk.damage}</div>
                <div className="dnd-attack-card__dmg-type">{atk.damageType}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
