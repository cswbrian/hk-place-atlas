import { describe, expect, it } from 'vitest'
import { formatLotSummary } from './lots'
import type { LotSnapshot } from './types'

const lot: LotSnapshot = {
  number: 'IL 8392',
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  metadata: {
    lotId: '1800317461',
    lotType: 'NNG',
    sectionCode: 'A',
    lastUpdated: '2023-12-12T00:00:00Z',
  },
}

describe('formatLotSummary', () => {
  it('lists display name and LandsD fields', () => {
    expect(formatLotSummary(lot)).toEqual([
      'IL 8392',
      'Section A',
      'Type NNG',
      'Lot ID 1800317461',
      'Updated 2023-12-12',
    ])
  })

  it('falls back to the lot number alone', () => {
    expect(formatLotSummary({ ...lot, metadata: undefined })).toEqual(['IL 8392'])
  })

  it('labels GLA and STT parcels', () => {
    expect(formatLotSummary({ ...lot, number: 'GLA-HK 910', kind: 'gla', metadata: undefined })).toEqual([
      'GLA · GLA-HK 910',
    ])
    expect(formatLotSummary({ ...lot, number: 'STTHWS0030', kind: 'stt', metadata: undefined })).toEqual([
      'STT · STTHWS0030',
    ])
  })
})
