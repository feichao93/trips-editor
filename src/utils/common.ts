import { Point } from '../interfaces'
import { List } from 'immutable'

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

export function getBoundingBoxOfPoints(points: List<Point>) {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const x = xs.min()
  const y = ys.min()
  const width = xs.max() - x
  const height = ys.max() - y
  return { x, y, width, height }
}
