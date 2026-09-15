import type { LotMetadata, ParcelKind } from '../../domain/types'

export type ParsedLot = {
  number: string
  hk80Ring: [number, number][]
  kind?: ParcelKind
  metadata: LotMetadata
}

function tag(member: string, name: string): string | undefined {
  const match = member.match(new RegExp(`<landsd:${name}[^>]*>\\s*([^<]+)\\s*</landsd:${name}>`, 'i'))
  const value = match?.[1]?.trim()
  return value || undefined
}

function parseRing(member: string): [number, number][] | null {
  const posList = member.match(/<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/i)?.[1]
  if (!posList) return null
  const nums = posList.trim().split(/\s+/).map(Number).filter((n) => !Number.isNaN(n))
  const hk80Ring: [number, number][] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    hk80Ring.push([nums[i], nums[i + 1]])
  }
  if (hk80Ring.length < 3) return null
  return hk80Ring
}

function lotMetadata(member: string): LotMetadata {
  return {
    lotId: tag(member, 'lotid'),
    lotCode: tag(member, 'lotcode'),
    lotNumber: tag(member, 'lotnumber'),
    lotNumberAlpha: tag(member, 'lotnumberalpha'),
    sectionCode: tag(member, 'sectioncode'),
    lotType: tag(member, 'lottype'),
    lastUpdated: tag(member, 'lastupdatedate'),
  }
}

function glaMetadata(member: string): LotMetadata {
  return {
    lotId: tag(member, 'glaid'),
    lotCode: tag(member, 'glacode'),
    lotNumber: tag(member, 'glanumber'),
    lotType: tag(member, 'glatype'),
    lastUpdated: tag(member, 'lastupdatedate'),
  }
}

function sttMetadata(member: string): LotMetadata {
  return {
    lotId: tag(member, 'tenancypolyid'),
    lotNumber: tag(member, 'tenancynumber'),
    lotType: tag(member, 'featurecode'),
    lastUpdated: tag(member, 'lastupdatedate'),
  }
}

export function parseLotIndexGml(xml: string): ParsedLot[] {
  return parseParcelIndexGml(xml, 'lot').map(({ kind: _kind, ...lot }) => lot)
}

export function parseParcelIndexGml(xml: string, kind: ParcelKind): ParsedLot[] {
  const members = xml.split(/<gml:featureMember[\s>]/i).slice(1)
  const lots: ParsedLot[] = []
  for (const member of members) {
    const number =
      kind === 'stt'
        ? tag(member, 'cislotdisplayname') ?? tag(member, 'tenancynumber')
        : tag(member, 'cislotdisplayname')
    const hk80Ring = parseRing(member)
    if (!number || !hk80Ring) continue
    const metadata =
      kind === 'gla' ? glaMetadata(member) : kind === 'stt' ? sttMetadata(member) : lotMetadata(member)
    lots.push({ number, hk80Ring, kind, metadata })
  }
  return lots
}
