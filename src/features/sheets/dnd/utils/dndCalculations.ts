// ────────────────────────────────────────────────────────
// Cálculos D&D 5e — sem estado, sem efeitos colaterais
// ────────────────────────────────────────────────────────

/**
 * Calcula o modificador de atributo D&D 5e.
 * floor((score − 10) / 2)
 *
 * Exemplos: 8→-1  10→+0  12→+1  14→+2  18→+4
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Formata um modificador com sinal explícito.
 * formatModifier(4)  → "+4"
 * formatModifier(0)  → "+0"
 * formatModifier(-1) → "-1"
 */
export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

/**
 * Bônus final de uma salvaguarda.
 * = modificador do atributo + (proficiente ? bônus de proficiência : 0)
 */
export function getSavingThrowBonus(
  score:            number,
  proficient:       boolean,
  proficiencyBonus: number
): number {
  return getAbilityModifier(score) + (proficient ? proficiencyBonus : 0)
}

/**
 * Monta a fórmula de rolagem para um teste de atributo ou salvaguarda.
 * Exemplos: "1d20+4"  "1d20-1"  "1d20"
 */
export function buildRollFormula(bonus: number): string {
  if (bonus === 0) return '1d20'
  return bonus > 0 ? `1d20+${bonus}` : `1d20${bonus}`
}
