import { h } from '@cycle/dom'
import { List, Record, Set } from 'immutable'
import { identity } from 'ramda'
import { distanceBetweenPointAndSegment, getCoordinateUpdater } from './common'
import { ItemMethods, Point, ResizeDirConfig } from '../interfaces'

const PolylineItemRecord = Record(
  {
    id: -1,
    locked: false,
    label: '',
    tags: Set<string>(),
    points: List<Point>(),
    stroke: '#000000',
    strokeWidth: 5,
    opacity: 1,
    fill: 'none',
  },
  'PolylineItem',
)

export default class PolylineItem extends PolylineItemRecord implements ItemMethods {
  toJS() {
    const superJS: any = super.toJS()
    superJS.type = 'PolylineItem'
    return superJS
  }
  static fromJS(object: any) {
    return new PolylineItem(object).update('points', List).update('tags', Set)
  }
  static lineFromPoints([p1, p2]: [Point, Point]) {
    return new PolylineItem({ points: List([p1, p2]) })
  }
  static fromPoints(points: Iterable<Point>) {
    return new PolylineItem({ points: List(points) })
  }
  getVertices() {
    return this.points
  }

  // TODO 和PolygonItem.prototype.resize
  resize(anchor: Point, { h, v }: ResizeDirConfig, startPos: Point, endPos: Point) {
    if (this.locked) {
      return this
    }
    const xUpdater = h ? getCoordinateUpdater(anchor.x, startPos.x, endPos.x) : identity
    const yUpdater = v ? getCoordinateUpdater(anchor.y, startPos.y, endPos.y) : identity
    return this.update('points', ps => ps.map(p => ({ x: xUpdater(p.x), y: yUpdater(p.y) })))
  }

  render() {
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
  containsPoint(point: Point) {
    const segments = this.points.butLast().zip(this.points.rest())
    return Boolean(
      segments.find(([start, end]) => {
        const distance = distanceBetweenPointAndSegment(point, start, end)
        return distance <= this.strokeWidth / 2
      }),
    )
  }

  move(dx: number, dy: number) {
    if (this.locked) {
      return this
    }
    return this.update('points', ps => ps.map(p => ({ x: p.x + dx, y: p.y + dy })))
  }

  supportEditVertex() {
    return true
  }
  insertVertex(insertIndex: number, p: Point) {
    return this.update('points', points => points.insert(insertIndex, p))
  }
  deleteVertex(vertexIndex: number) {
    return this.update('points', points => points.delete(vertexIndex))
  }
  moveVertex(vertexIndex: number, dx: number, dy: number) {
    return this.update('points', points =>
      points.update(vertexIndex, p => ({
        x: p.x + dx,
        y: p.y + dy,
      })),
    )
  }
}
