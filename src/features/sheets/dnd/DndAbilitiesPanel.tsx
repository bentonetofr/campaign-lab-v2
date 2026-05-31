import type { DndCharacter, AbilityScores } from './mockCharacter'
import {
  getAbilityModifier,
  formatModifier,
  getSkillBonus,
  ABILITY_LABELS,
  ABILITY_FULL_LABELS,
} from './mockCharacter'

interface DndAbilitiesPanelProps {
  character: DndCharacter
}

const ABILITY_ORDER: (keyof AbilityScores)[] = ['for', 'des', 'con', 'int', 'sab', 'car']

export function DndAbilitiesPanel({ character: c }: DndAbilitiesPanelProps) {
  return (
    <div className="dnd-center-col">
      {/* Atributos base */}
      <div className="dnd-abilities-grid">
        {ABILITY_ORDER.map((key) => {
          const score = c.abilities[key]
          const mod   = getAbilityModifier(score)
          return (
            <div key={key} className="dnd-ability">
              <div className="dnd-ability__label">{ABILITY_LABELS[key]}</div>
              <div className="dnd-ability__mod">{formatModifier(mod)}</div>
              <div className="dnd-ability__score">{score}</div>
            </div>
          )
        })}
      </div>

      {/* Salvaguardas */}
      <div className="dnd-saves-block">
        <p className="dnd-saves-block__title">Salvaguardas</p>
        {ABILITY_ORDER.map((key) => {
          const mod  = getAbilityModifier(c.abilities[key])
          const prof = c.savingThrows[key]
          const bonus =
            prof === 'expertise'  ? mod + c.proficiencyBonus * 2 :
            prof === 'proficient' ? mod + c.proficiencyBonus :
            mod
          return (
            <div key={key} className="dnd-save-row">
              <div className={`dnd-prof-dot ${prof !== 'none' ? `dnd-prof-dot--${prof}` : ''}`} />
              <span className="dnd-save-row__bonus">{formatModifier(bonus)}</span>
              <span className="dnd-save-row__name">{ABILITY_FULL_LABELS[key]}</span>
            </div>
          )
        })}
      </div>

      {/* Perícias */}
      <div className="dnd-skills-block">
        <p className="dnd-skills-block__title">Perícias</p>
        {c.skills.map((skill) => {
          const bonus = getSkillBonus(skill, c.abilities, c.proficiencyBonus)
          return (
            <div key={skill.id} className="dnd-skill-row">
              <div className={`dnd-prof-dot ${skill.proficiency !== 'none' ? `dnd-prof-dot--${skill.proficiency}` : ''}`} />
              <span className="dnd-skill-row__bonus">{formatModifier(bonus)}</span>
              <span className="dnd-skill-row__name">{skill.name}</span>
              <span className="dnd-skill-row__ability">{ABILITY_LABELS[skill.ability]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
