import type { BuildingSnapshot, LotSnapshot } from './types'

export function formatLotSummary(lot: LotSnapshot): string[] {
  const kind = lot.kind ?? 'lot'
  const title =
    kind === 'gla' ? `GLA · ${lot.number}` : kind === 'stt' ? `STT · ${lot.number}` : lot.number
  const lines = [title]
  const metadata = lot.metadata
  if (!metadata) return lines
  if (metadata.sectionCode) lines.push(`Section ${metadata.sectionCode}`)
  if (metadata.lotType) lines.push(`Type ${metadata.lotType}`)
  if (metadata.lotId) lines.push(`Lot ID ${metadata.lotId}`)
  if (metadata.lastUpdated) lines.push(`Updated ${metadata.lastUpdated.slice(0, 10)}`)
  return lines
}

export function formatBuildingSummary(building: BuildingSnapshot): string[] {
  const label =
    building.nameEn?.trim()
    || building.nameZh?.trim()
    || `Building ${building.buildingId}`
  const lines = [label]
  if (building.occupiedYear) lines.push(`Occupied ${building.occupiedYear}`)
  if (building.nameEn && building.nameZh) lines.push(building.nameZh)
  lines.push(`ID ${building.buildingId}`)
  return lines
}
