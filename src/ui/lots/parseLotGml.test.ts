import { describe, expect, it } from 'vitest'
import { parseLotIndexGml } from './parseLotGml'

const sample = `<?xml version="1.0"?>
<wfs:FeatureCollection xmlns:gml="http://www.opengis.net/gml" xmlns:landsd="http://www.landsd.gov.hk">
  <gml:featureMember>
    <landsd:lot_lotindexapi>
      <landsd:cislotdisplayname>IL 8392</landsd:cislotdisplayname>
      <landsd:shape>
        <gml:Polygon>
          <gml:exterior>
            <gml:LinearRing>
              <gml:posList>836031.8 815815.8 836162.2 815826.5 836031.8 815815.8</gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>
      </landsd:shape>
    </landsd:lot_lotindexapi>
  </gml:featureMember>
</wfs:FeatureCollection>`

describe('parseLotIndexGml', () => {
  it('reads display name and HK80 ring', () => {
    const lots = parseLotIndexGml(sample)
    expect(lots).toHaveLength(1)
    expect(lots[0].number).toBe('IL 8392')
    expect(lots[0].hk80Ring).toEqual([
      [836031.8, 815815.8],
      [836162.2, 815826.5],
      [836031.8, 815815.8],
    ])
  })
})
