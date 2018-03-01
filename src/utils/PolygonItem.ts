import { h } from '@cycle/dom'
import { List, Record, Set } from 'immutable'
import { identity } from 'ramda'
import { containsPoint, getCoordinateUpdater } from './common'
import { ItemMethods, Point, ResizeDirConfig, AppConfig } from '../interfaces'
import Sem from './Sem'

const PolygonItemRecord = Record(
  {
    id: -1,
    locked: false,
    sem: new Sem(),
    points: List<Point>(),
    stroke: 'black',
    strokeWidth: 1,
    opacity: 1,
    fill: '#888888',
  },
  'PolygonItem',
)

export default class PolygonItem extends PolygonItemRecord implements ItemMethods {
  toJS() {
    const superJS: any = super.toJS()
    superJS.type = 'PolygonItem'
    return superJS
  }
  static fromJS(object: any) {
    return new PolygonItem(object).update('points', List).update('sem', Sem.fromJS)
  }

  static rectFromPoints(startPos: Point, endPos: Point) {
    const x1 = startPos.x
    const y1 = startPos.y
    const x2 = endPos.x
    const y2 = endPos.y
    return new PolygonItem({
      points: List([{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }]),
    })
  }

  static fromPoints(points: List<Point>) {
    return new PolygonItem({ points })
  }

  static isRect(item: any) {
    if (!(item instanceof PolygonItem) || item.points.count() !== 4) {
      return false
    }
    const [p1, p2, p3, p4] = item.points
    return (
      (p1.x === p2.x && p2.y === p3.y && p3.x === p4.x && p4.y === p1.y) ||
      (p1.y === p2.y && p2.x === p3.x && p3.y === p4.y && p4.x === p1.x)
    )
  }

  resize(anchor: Point, { h, v }: ResizeDirConfig, startPos: Point, endPos: Point) {
    if (this.locked) {
      return this
    }
    const xUpdater = h ? getCoordinateUpdater(anchor.x, startPos.x, endPos.x) : identity
    const yUpdater = v ? getCoordinateUpdater(anchor.y, startPos.y, endPos.y) : identity
    return this.update('points', ps => ps.map(p => ({ x: xUpdater(p.x), y: yUpdater(p.y) })))
  }

  move(dx: number, dy: number) {
    if (this.locked) {
      return this
    }
    return this.update('points', ps => ps.map(p => ({ x: p.x + dx, y: p.y + dy })))
  }

  render(config: AppConfig) {
    const vertices = this.getVertices()
    const x = vertices.map(v => v.x).min()
    const y = vertices.map(v => v.y).min()
    return h(
      'g',
      { key: this.id },
      [
        h('polygon', {
          key: 'shape',
          attrs: {
            stroke: this.stroke,
            'stroke-linejoin': 'round',
            'stroke-width': this.strokeWidth,
            opacity: this.opacity,
            fill: this.fill,
            points: this.points.map(p => `${p.x},${p.y}`).join(' '),
          },
        }),
        this.sem.renderLabel(x, y, config),
      ].filter(Boolean),
    )
  }

  getVertices() {
    return this.points
  }
  containsPoint(p: Point) {
    return containsPoint(this.points.toArray(), p)
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

  getShortDescription() {
    return 'PolygonItem'
  }
}
