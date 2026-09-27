export const MIN_YEAR = 1841

export function maxYear(now = new Date()): number {
  return now.getFullYear()
}
