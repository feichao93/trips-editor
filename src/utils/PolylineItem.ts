import { h } from '@cycle/dom'
import { List } from 'immutable'
import { identity } from 'ramda'
import { distanceBetweenPointAndSegment, getCoordinateUpdater } from './common'
import { ItemRecord } from './Item'
import { Point, ResizeDirConfig } from '../interfaces'

const PolylineItem = ItemRecord(
  'PolylineItem',
  {
    id: -1,
    locked: false,
    points: List<Point>(),
    stroke: '#000000',
    strokeWidth: 5,
    opacity: 1,
    fill: 'none',
  },
  {
    lineFromPoints([p1, p2]: [Point, Point]) {
      return PolylineItem({ points: List([p1, p2]) })
    },
    fromPoints(points: Point[]) {
      return PolylineItem({ points: List(points) })
    },
  },
)

export const polylineItem = PolylineItem()
type PolylineItem = typeof polylineItem

PolylineItem.prototype.getPoints = function getPoints(this: PolylineItem) {
  return this.points
}

// TODO 和PolygonItem.prototype.resize
PolylineItem.prototype.resize = function resize(
  this: PolylineItem,
  anchor: Point,
  { h, v }: ResizeDirConfig,
  startPos: Point,
  endPos: Point,
) {
  if (this.locked) {
    return this
  }
  const xUpdater = h ? getCoordinateUpdater(anchor.x, startPos.x, endPos.x) : identity
  const yUpdater = v ? getCoordinateUpdater(anchor.y, startPos.y, endPos.y) : identity
  return this.update('points', ps => ps.map(p => ({ x: xUpdater(p.x), y: yUpdater(p.y) })))
}

PolylineItem.prototype.render = function render(this: PolylineItem) {
  return h('polyline', {
    key: this.id,
    attrs: {
      stroke: this.stroke,
      'stroke-linejoin': 'round',
      'stroke-width': this.strokeWidth,
      opacity: this.opacity,
      fill: this.fill,
      points: this.points.map(p => `${p.x},${p.y}`).join(' '),
    },
  })
}

// TODO 增加LineItem可点击的面积
// TODO Polyline#containsPoint可以用MBR来优化性能
// 如果点在MBR之外, 则可以直接返回false
PolylineItem.prototype.containsPoint = function(this: PolylineItem, point: Point) {
  const segments = this.points.butLast().zip(this.points.rest())
  return Boolean(
    segments.find(([start, end]) => {
      const distance = distanceBetweenPointAndSegment(point, start, end)
      return distance <= this.strokeWidth / 2
    }),
  )
}
PolylineItem.prototype.move = function(this: PolylineItem, dx: number, dy: number) {
  if (this.locked) {
    return this
  }
  return this.update('points', ps => ps.map(p => ({ x: p.x + dx, y: p.y + dy })))
}

export default PolylineItem
