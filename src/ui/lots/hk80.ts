import proj4 from 'proj4'

proj4.defs(
  'EPSG:2326',
  '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.243649,-1.158827,-1.094246 +units=m +no_defs',
)

export function hk80ToWgs(easting: number, northing: number): [number, number] {
  const [lng, lat] = proj4('EPSG:2326', 'EPSG:4326', [easting, northing])
  return [lng, lat]
}

export function wgsToHk80(lng: number, lat: number): [number, number] {
  return proj4('EPSG:4326', 'EPSG:2326', [lng, lat]) as [number, number]
}

export function clampLotBbox(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): [number, number, number, number] {
  const width = Math.min(maxX - minX, 750)
  const height = Math.min(maxY - minY, 600)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return [cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2]
}
