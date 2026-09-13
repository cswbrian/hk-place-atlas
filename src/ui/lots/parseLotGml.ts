export type ParsedLot = {
  number: string
  hk80Ring: [number, number][]
}

export function parseLotIndexGml(xml: string): ParsedLot[] {
  const members = xml.split(/<gml:featureMember[\s>]/i).slice(1)
  return members
    .map((member) => {
      const number = member.match(
        /<landsd:cislotdisplayname>\s*([^<]+)\s*<\/landsd:cislotdisplayname>/i,
      )?.[1]
      const posList = member.match(/<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/i)?.[1]
      if (!number || !posList) return null
      const nums = posList.trim().split(/\s+/).map(Number).filter((n) => !Number.isNaN(n))
      const hk80Ring: [number, number][] = []
      for (let i = 0; i + 1 < nums.length; i += 2) {
        hk80Ring.push([nums[i], nums[i + 1]])
      }
      if (hk80Ring.length < 3) return null
      return { number: number.trim(), hk80Ring }
    })
    .filter((lot): lot is ParsedLot => lot !== null)
}
