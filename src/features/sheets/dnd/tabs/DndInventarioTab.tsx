import type { DndCharacter } from '../mockCharacter'

interface Props { character: DndCharacter }

export function DndInventarioTab({ character: c }: Props) {
  const totalWeight = c.inventory.reduce((sum, item) => sum + item.weight * item.quantity, 0)
  const equipped    = c.inventory.filter((i) => i.equipped)
  const carried     = c.inventory.filter((i) => !i.equipped)

  return (
    <div className="dnd-tab-content">
      {/* Moedas */}
      <div>
        <p className="dnd-section-title">Moedas</p>
        <div className="dnd-currency-row">
          <div className="dnd-coin dnd-coin--cp">
            <span className="dnd-coin__value">{c.currency.cp}</span>
            <span className="dnd-coin__label">PC</span>
          </div>
          <div className="dnd-coin dnd-coin--pe">
            <span className="dnd-coin__value">{c.currency.pe}</span>
            <span className="dnd-coin__label">PE</span>
          </div>
          <div className="dnd-coin dnd-coin--pp">
            <span className="dnd-coin__value">{c.currency.pp}</span>
            <span className="dnd-coin__label">PP</span>
          </div>
          <div className="dnd-coin dnd-coin--po">
            <span className="dnd-coin__value">{c.currency.po}</span>
            <span className="dnd-coin__label">PO</span>
          </div>
          <div className="dnd-coin dnd-coin--pl">
            <span className="dnd-coin__value">{c.currency.pl}</span>
            <span className="dnd-coin__label">PL</span>
          </div>
        </div>
      </div>

      {/* Equipado */}
      {equipped.length > 0 && (
        <div>
          <p className="dnd-section-title">Equipado</p>
          <div className="dnd-inventory-list">
            {equipped.map((item) => (
              <div key={item.id} className="dnd-item-row">
                <span className="dnd-item-row__name dnd-item-row__name--equipped">
                  ◆ {item.name}
                </span>
                <span className="dnd-item-row__qty">×{item.quantity}</span>
                <span className="dnd-item-row__weight">{item.weight * item.quantity} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carregado */}
      {carried.length > 0 && (
        <div>
          <p className="dnd-section-title">Carregado</p>
          <div className="dnd-inventory-list">
            {carried.map((item) => (
              <div key={item.id} className="dnd-item-row">
                <span className="dnd-item-row__name">{item.name}</span>
                <span className="dnd-item-row__qty">×{item.quantity}</span>
                <span className="dnd-item-row__weight">{item.weight * item.quantity} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peso total */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        paddingTop: 'var(--space-1)',
        borderTop: '1px solid var(--border-dim)',
      }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Peso total: {totalWeight.toFixed(1)} kg / {c.carryingCapacity} kg
        </span>
      </div>
    </div>
  )
}
