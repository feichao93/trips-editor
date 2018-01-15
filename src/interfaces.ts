import { OrderedMap } from 'immutable'
import { Stream } from 'xstream'
import PolylineItem from './utils/PolylineItem'
import PolygonItem from './utils/PolygonItem'

export { PolygonItem, PolylineItem }

export interface Point {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Updater<T> {
  (t: T): T
}

export type ItemId = number

export type Item = PolygonItem | PolylineItem

export type Selection = OrderedMap<ItemId, Item>

export interface Mouse {
  move$: Stream<Point>
  rawMove$: Stream<Point>
  down$: Stream<Point>
  rawDown$: Stream<Point>
  up$: Stream<Point>
  rawUp$: Stream<Point>
  click$: Stream<Point>
  rawClick$: Stream<Point>
  dblclick$: Stream<Point>
  rawDblclick$: Stream<Point>
  wheel$: Stream<{ pos: Point; deltaY: number }>
  rawWheel$: Stream<{ pos: Point; deltaY: number }>
}

export interface ResizeDirConfig {
  h: boolean
  v: boolean
}
