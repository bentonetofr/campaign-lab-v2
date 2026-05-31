import { SimpleSheetPanel }          from './SimpleSheetPanel'
import { DndCharacterSheetPreview }  from '../dnd/DndCharacterSheetPreview'
import { AltheriumSheetComingSoon }  from '../altherium/components/AltheriumSheetComingSoon'
import type { CampaignWithRole }     from '../../../shared/types'

// ────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────

interface CampaignSheetPanelProps {
  campaign:      CampaignWithRole
  currentUserId: string
}

// ────────────────────────────────────────────────────────
// Roteador de fichas por sistema
// ────────────────────────────────────────────────────────

export function CampaignSheetPanel({ campaign, currentUserId: _currentUserId }: CampaignSheetPanelProps) {
  switch (campaign.system) {
    case 'dnd5e':
      return <DndCharacterSheetPreview />

    case 'altherium':
      return <AltheriumSheetComingSoon />

    case 'generic':
    default:
      return (
        <SimpleSheetPanel
          campaignId={campaign.id}
          userRole={campaign.role}
        />
      )
  }
}
