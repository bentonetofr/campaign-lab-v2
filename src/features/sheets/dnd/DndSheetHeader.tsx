import type { DndCharacter } from './mockCharacter'

interface DndSheetHeaderProps {
  character: DndCharacter
}

export function DndSheetHeader({ character }: DndSheetHeaderProps) {
  return (
    <header className="dnd-header">
      <div className="dnd-header__left">
        {/* Avatar placeholder */}
        <div className="dnd-header__avatar" aria-hidden="true">⚔</div>

        <div className="dnd-header__info">
          <h2 className="dnd-header__name">{character.name}</h2>

          <div className="dnd-header__class-line">
            <span className="dnd-header__class">{character.class}</span>
            {character.subclass && (
              <>
                <span className="dnd-header__sep">·</span>
                <span className="dnd-header__subclass">{character.subclass}</span>
              </>
            )}
            <span className="dnd-level-badge">Nível {character.level}</span>
          </div>

          <div className="dnd-header__meta">
            <div className="dnd-header__meta-item">
              <span className="dnd-header__meta-label">Espécie</span>
              <span className="dnd-header__meta-value">{character.species}</span>
            </div>
            <div className="dnd-header__meta-item">
              <span className="dnd-header__meta-label">Antecedente</span>
              <span className="dnd-header__meta-value">{character.background}</span>
            </div>
            <div className="dnd-header__meta-item">
              <span className="dnd-header__meta-label">Alinhamento</span>
              <span className="dnd-header__meta-value">{character.alignment}</span>
            </div>
            <div className="dnd-header__meta-item">
              <span className="dnd-header__meta-label">Jogador</span>
              <span className="dnd-header__meta-value">{character.playerName}</span>
            </div>
            <div className="dnd-header__meta-item">
              <span className="dnd-header__meta-label">Experiência</span>
              <span className="dnd-header__meta-value">{character.experiencePoints.toLocaleString('pt-BR')} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dnd-header__actions">
        <button className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }} disabled>
          ✎ Editar
        </button>
      </div>
    </header>
  )
}
