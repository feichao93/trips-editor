import { List, OrderedMap } from 'immutable'
import { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import { Item, ItemId, Point, PolygonItem, PolylineItem, Rect } from '../interfaces'

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

export function getBoundingBoxOfPoints(points: List<Point>): Rect {
  if (points.isEmpty()) {
    return null
  }
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
  } else if (item instanceof PolylineItem) {
    return false
  }
  throw new Error('Unsupported type of item')
}

// TODO refactor
export function moveItems(items: OrderedMap<ItemId, Item>, dx: number, dy: number) {
  return items.map(item => moveItem(item, dx, dy))
}

// TODO refactor
export function moveItem(item: Item, dx: number, dy: number) {
  if (item instanceof PolygonItem) {
    return item.update('points', points => points.map(p => ({ x: p.x + dx, y: p.y + dy })))
  }
  throw new Error('NOT IMPLEMENTED')
}

// TODO refactor
export function invertPos(
  mouseEvent$: Stream<Point>,
  transform$: Stream<d3.ZoomTransform>,
): Stream<Point> {
  return mouseEvent$.compose(sampleCombine(transform$)).map(([event, transform]) => {
    const [x, y] = transform.invert([event.x, event.y])
    return { x, y }
  })
}

// TODO refactor
export function invert(p: Point, transform: d3.ZoomTransform): Point {
  const [x, y] = transform.invert([p.x, p.y])
  return { x, y }
}

// TODO refactor
export function polygonItemFromPoints([{ x: x1, y: y1 }, { x: x2, y: y2 }]: [Point, Point]) {
  return PolygonItem({
    points: List([{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }]),
  })
}

// TODO refactor
export function polylineItemFromPoints([p1, p2]: [Point, Point]) {
  return PolylineItem({ points: List([p1, p2]) })
}

// 在resize元素的时候, 该函数用来获取点坐标的更新函数
export function getCoordinateUpdater(anchor: number, start: number, end: number) {
  return (target: number) => anchor + (end - anchor) * (target - anchor) / (start - anchor)
}

const square = (x: number) => x * x
const dist2 = (a: Point, b: Point) => square(a.x - b.x) + square(a.y - b.y)

// 计算两个点之前的距离
export function distanceBetweenPointAndPoint(point1: Point, point2: Point) {
  const dx = point1.x - point2.x
  const dy = point1.y - point2.y
  return Math.sqrt(dx * dx + dy * dy)
}

// 计算点与线段之间的距离
// start, end分别为线段的起点和终点
export function distanceBetweenPointAndSegment(point: Point, start: Point, end: Point) {
  const length2 = dist2(start, end)
  if (length2 === 0) {
    throw new Error('Invalid segment')
  }
  const t =
    ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / length2
  if (t <= 0) {
    return distanceBetweenPointAndPoint(start, point)
  } else if (t >= 1) {
    return distanceBetweenPointAndPoint(end, point)
  }
  return Math.sqrt(
    dist2(point, {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    }),
  )
}
