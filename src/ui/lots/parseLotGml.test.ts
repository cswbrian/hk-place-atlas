import { describe, expect, it } from 'vitest'
import { parseLotIndexGml, parseParcelIndexGml } from './parseLotGml'

const lotSample = `<?xml version="1.0"?>
<wfs:FeatureCollection xmlns:gml="http://www.opengis.net/gml" xmlns:landsd="http://www.landsd.gov.hk">
  <gml:featureMember>
    <landsd:lot_lotindexapi>
      <landsd:lastupdatedate>2023-12-12T00:00:00Z</landsd:lastupdatedate>
      <landsd:lotid>1800317461</landsd:lotid>
      <landsd:lotcode>5490</landsd:lotcode>
      <landsd:lotnumber>8392</landsd:lotnumber>
      <landsd:sectioncode>A</landsd:sectioncode>
      <landsd:lottype>NNG</landsd:lottype>
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

const glaSample = `<?xml version="1.0"?>
<wfs:FeatureCollection xmlns:gml="http://www.opengis.net/gml" xmlns:landsd="http://www.landsd.gov.hk">
  <gml:featureMember>
    <landsd:gla_lotindexapi>
      <landsd:lastupdatedate>2023-09-03T00:00:00Z</landsd:lastupdatedate>
      <landsd:glaid>1800014717</landsd:glaid>
      <landsd:glacode>5050</landsd:glacode>
      <landsd:glanumber>910</landsd:glanumber>
      <landsd:glatype>P</landsd:glatype>
      <landsd:cislotdisplayname>GLA-HK 910</landsd:cislotdisplayname>
      <landsd:shape>
        <gml:Polygon>
          <gml:exterior>
            <gml:LinearRing>
              <gml:posList>835153.0 815663.1 835150.6 815662.9 835153.0 815663.1</gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>
      </landsd:shape>
    </landsd:gla_lotindexapi>
  </gml:featureMember>
</wfs:FeatureCollection>`

const sttSample = `<?xml version="1.0"?>
<wfs:FeatureCollection xmlns:gml="http://www.opengis.net/gml" xmlns:landsd="http://www.landsd.gov.hk">
  <gml:featureMember>
    <landsd:tenancypoly>
      <landsd:lastupdatedate>2025-09-02T00:00:00Z</landsd:lastupdatedate>
      <landsd:tenancypolyid>1810050065</landsd:tenancypolyid>
      <landsd:tenancynumber>STTHWS0030</landsd:tenancynumber>
      <landsd:featurecode>STT</landsd:featurecode>
      <landsd:shape>
        <gml:Polygon>
          <gml:exterior>
            <gml:LinearRing>
              <gml:posList>834787.6 816233.0 834789.9 816226.5 834787.6 816233.0</gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>
      </landsd:shape>
    </landsd:tenancypoly>
  </gml:featureMember>
</wfs:FeatureCollection>`

describe('parseLotIndexGml', () => {
  it('reads display name, HK80 ring, and LandsD metadata', () => {
    const lots = parseLotIndexGml(lotSample)
    expect(lots).toHaveLength(1)
    expect(lots[0].number).toBe('IL 8392')
    expect(lots[0].hk80Ring).toEqual([
      [836031.8, 815815.8],
      [836162.2, 815826.5],
      [836031.8, 815815.8],
    ])
    expect(lots[0].metadata).toEqual({
      lotId: '1800317461',
      lotCode: '5490',
      lotNumber: '8392',
      sectionCode: 'A',
      lotType: 'NNG',
      lastUpdated: '2023-12-12T00:00:00Z',
    })
  })
})

describe('parseParcelIndexGml', () => {
  it('parses GLA display names and ids', () => {
    const parcels = parseParcelIndexGml(glaSample, 'gla')
    expect(parcels).toHaveLength(1)
    expect(parcels[0].number).toBe('GLA-HK 910')
    expect(parcels[0].kind).toBe('gla')
    expect(parcels[0].metadata).toMatchObject({
      lotId: '1800014717',
      lotCode: '5050',
      lotNumber: '910',
      lotType: 'P',
      lastUpdated: '2023-09-03T00:00:00Z',
    })
  })

  it('uses tenancy number when STT has no display name', () => {
    const parcels = parseParcelIndexGml(sttSample, 'stt')
    expect(parcels).toHaveLength(1)
    expect(parcels[0].number).toBe('STTHWS0030')
    expect(parcels[0].kind).toBe('stt')
    expect(parcels[0].metadata).toMatchObject({
      lotId: '1810050065',
      lastUpdated: '2025-09-02T00:00:00Z',
    })
  })
})
