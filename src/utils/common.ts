import { Point, Item, PolygonItem, ItemId } from '../interfaces'
import { List, OrderedMap } from 'immutable'

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

export function getItemPoints(item: Item) {
  return item.points
}

export function round(number: number, n: number) {
  const t = 10 ** n
  return Math.round(number * t) / t
}

export const round3 = (number: number) => round(number, 3)

export function containsPoint(item: Item, p: Point) {
  if (item instanceof PolygonItem) {
    // copied from node packge point-in-polygon
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    const { x, y } = p
    const vs = item.points.toArray()
    let inside = false
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i, i += 1) {
      const xi = vs[i].x
      const yi = vs[i].y
      const xj = vs[j].x
      const yj = vs[j].y
      const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi
      if (intersect) inside = !inside
    }
    return inside
  }
  throw new Error('Unsupported type of item')
}

export function moveItems(items: OrderedMap<ItemId, Item>, dx: number, dy: number) {
  return items.map(item => moveItem(item, dx, dy))
}

export function moveItem(item: Item, dx: number, dy: number) {
  if (item instanceof PolygonItem) {
    return item.update('points', points => points.map(p => ({ x: p.x + dx, y: p.y + dy })))
  }
  throw new Error('NOT IMPLEMENTED')
}
