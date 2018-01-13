import { List } from 'immutable'
import * as R from 'ramda'
import { getCoordinateUpdater } from './common'
import { Item, Point, PolygonItem, ResizeDirConfig } from '../interfaces'

export default class PolygonItemHelper {
  static fromRectPoints(startPos: Point, endPos: Point) {
    const x1 = startPos.x
    const y1 = startPos.y
    const x2 = endPos.x
    const y2 = endPos.y
    return PolygonItem({
      points: List([{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }]),
    })
  }

  static isRect(item: Item) {
    if (!(item instanceof PolygonItem) || item.points.count() !== 4) {
      return false
    }
    const [p1, p2, p3, p4] = item.points
    return (
      (p1.x === p2.x && p2.y === p3.y && p3.x === p4.x && p4.y === p1.y) ||
      (p1.y === p2.y && p2.x === p3.x && p3.y === p4.y && p4.x === p1.x)
    )
  }

  static resize(
    item: PolygonItem,
    anchor: Point,
    { h, v }: ResizeDirConfig,
    startPos: Point,
    endPos: Point,
  ) {
    if (item.locked) {
      return item
    }
    const xUpdater = h ? getCoordinateUpdater(anchor.x, startPos.x, endPos.x) : R.identity
    const yUpdater = v ? getCoordinateUpdater(anchor.y, startPos.y, endPos.y) : R.identity
    return item.update('points', ps => ps.map(p => ({ x: xUpdater(p.x), y: yUpdater(p.y) })))
  }

  static move(item: PolygonItem, dx: number, dy: number) {
    if (item.locked) {
      return item
    }
    return item.update('points', ps => ps.map(p => ({ x: p.x + dx, y: p.y + dy })))
  }
}
