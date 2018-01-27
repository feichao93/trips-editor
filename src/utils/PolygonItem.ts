import { h } from '@cycle/dom'
import { List } from 'immutable'
import { identity } from 'ramda'
import { containsPoint, getCoordinateUpdater } from './common'
import { ItemRecord } from './Item'
import { Point, ResizeDirConfig } from '../interfaces'

const PolygonItem = ItemRecord(
  'PolygonItem',
  {
    id: -1,
    locked: false,
    points: List<Point>(),
    stroke: '#000000',
    strokeWidth: 3,
    opacity: 1,
    fill: '#888888',
  },
  {
    rectFromPoints(startPos: Point, endPos: Point) {
      const x1 = startPos.x
      const y1 = startPos.y
      const x2 = endPos.x
      const y2 = endPos.y
      return PolygonItem({
        points: List([{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }]),
      })
    },

    fromPoints(points: List<Point>) {
      return PolygonItem({ points })
    },

    isRect(item: any) {
      if (!(item instanceof PolygonItem) || item.points.count() !== 4) {
        return false
      }
      const [p1, p2, p3, p4] = item.points
      return (
        (p1.x === p2.x && p2.y === p3.y && p3.x === p4.x && p4.y === p1.y) ||
        (p1.y === p2.y && p2.x === p3.x && p3.y === p4.y && p4.x === p1.x)
      )
    },
  },
)

export const polygonItem = PolygonItem()
type PolygonItem = typeof polygonItem

PolygonItem.prototype.resize = function resize(
  this: PolygonItem,
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

PolygonItem.prototype.move = function move(this: PolygonItem, dx: number, dy: number) {
  if (this.locked) {
    return this
  }
  return this.update('points', ps => ps.map(p => ({ x: p.x + dx, y: p.y + dy })))
}

PolygonItem.prototype.render = function render(this: PolygonItem) {
  return h('polygon', {
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

PolygonItem.prototype.getVertices = function getVertices(this: PolygonItem) {
  return this.points
}

PolygonItem.prototype.containsPoint = function _containsPoint(this: PolygonItem, p: Point) {
  return containsPoint(this.points.toArray(), p)
}

PolygonItem.prototype.deleteVertex = function deleteVertex(this: PolygonItem, vertexIndex: number) {
  return this.update('points', points => points.delete(vertexIndex))
}
PolygonItem.prototype.moveVertex = function moveVertex(
  this: PolygonItem,
  vertexIndex: number,
  dx: number,
  dy: number,
) {
  return this.update('points', points =>
    points.update(vertexIndex, p => ({
      x: p.x + dx,
      y: p.y + dy,
    })),
  )
}

export default PolygonItem
