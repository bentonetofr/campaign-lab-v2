import './DndComingSoon.css'

interface DndComingSoonProps {
  compact?: boolean
  onClose?: () => void
}

export function DndComingSoon({ compact = false, onClose }: DndComingSoonProps) {
  return (
    <section
      className={`dnd-coming-soon${compact ? ' dnd-coming-soon--compact' : ''}`}
      aria-label="D&D em desenvolvimento"
    >
      <img
        className="dnd-coming-soon__image"
        src="/dnd-em-desenvolvimento.png"
        alt="Carinha avisando que o D&D ainda está em desenvolvimento"
      />
      <p className="dnd-coming-soon__message">em desenvolvimento ainda bb</p>
      {onClose && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Fechar
        </button>
      )}
    </section>
  )
}
