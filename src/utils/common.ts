const nextIdMap = new Map<string, number>()

export function getNextId(tag = '') {
  if (nextIdMap.has(tag)) {
    const nextId = nextIdMap.get(tag)
    nextIdMap.set(tag, nextId + 1)
    return nextId
  } else {
    nextIdMap.set(tag, 2)
    return 1
  }
}
