import type { MultiPolygon, Polygon } from 'geojson'
import type { BuildingBlockType, BuildingSnapshot } from '../../domain/types'

type RawProps = {
  BuildingID?: number | string
  BuildingBlockType?: string
  Status?: string
  BuildingNameEN?: string | null
  BuildingNameTC?: string | null
}

type RawFeature = {
  type?: string
  geometry?: Polygon | MultiPolygon | null
  properties?: RawProps | null
}

function blockType(value: string | undefined): BuildingBlockType | null {
  if (value === 'Tower') return 'T'
  if (value === 'Podium') return 'P'
  return null
}

export function parseBuildingFeatureCollection(data: {
  features?: RawFeature[]
}): BuildingSnapshot[] {
  return (data.features ?? []).flatMap((feature) => {
    const props = feature.properties
    const geometry = feature.geometry
    if (!props || !geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
      return []
    }
    if ((props.Status ?? 'Active') !== 'Active') return []
    const mapped = blockType(props.BuildingBlockType)
    if (!mapped) return []
    if (props.BuildingID == null) return []
    const nameEn = props.BuildingNameEN?.trim() || undefined
    const nameZh = props.BuildingNameTC?.trim() || undefined
    return [
      {
        buildingId: String(props.BuildingID),
        blockType: mapped,
        nameEn,
        nameZh,
        geometry,
      },
    ]
  })
}
