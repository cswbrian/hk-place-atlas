export const CLOSE_RING_PX = 14

export function clickClosesRing(
  vertexCount: number,
  distancePx: number,
  thresholdPx: number = CLOSE_RING_PX,
): boolean {
  return vertexCount >= 3 && distancePx <= thresholdPx
}
