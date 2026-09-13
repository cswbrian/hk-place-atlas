import type { Relation, RelationType } from './types'

export function lineageChain(
  relations: Relation[],
  placeId: string,
  type: RelationType,
): string[] {
  const edges = relations.filter((relation) => relation.type === type)
  const chain = [placeId]
  const seen = new Set([placeId])

  let current = placeId
  while (true) {
    const child = edges.find((edge) => edge.fromId === current && !seen.has(edge.toId))
    if (!child) break
    chain.push(child.toId)
    seen.add(child.toId)
    current = child.toId
  }

  current = placeId
  while (true) {
    const parent = edges.find((edge) => edge.toId === current && !seen.has(edge.fromId))
    if (!parent) break
    chain.unshift(parent.fromId)
    seen.add(parent.fromId)
    current = parent.fromId
  }

  return chain
}
