import { List, OrderedMap, Record } from 'immutable'
import { Stream } from 'xstream'

// TODO 整理该文件

declare global {
  interface Event {
    ownerTarget: EventTarget
  }
}

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

export type ItemId = number

export type Item = PolygonItem | PolylineItem

export type Selection = OrderedMap<ItemId, Item>

export const PolygonItem = Record(
  {
    id: -1,
    locked: false,
    points: List<Point>(),
    stroke: '#000000',
    strokeWidth: 3,
    opacity: 1,
    fill: '#888888',
  },
  'PolygonItem',
)
export const polygonItem = PolygonItem()
export type PolygonItem = typeof polygonItem

export interface Mouse {
  move$: Stream<Point>
  rawMove$: Stream<Point>
  down$: Stream<Point>
  rawDown$: Stream<Point>
  up$: Stream<Point>
  rawUp$: Stream<Point>
  dblclick$: Stream<Point>
  rawDblclick$: Stream<Point>
  wheel$: Stream<{ pos: Point; deltaY: number }>
  rawWheel$: Stream<{ pos: Point; deltaY: number }>
}

export const PolylineItem = Record(
  {
    id: -1,
    locked: false,
    points: List<Point>(),
    stroke: '#000000',
    strokeWidth: 5,
    opacity: 1,
    fill: 'none',
  },
  'PolylineItem',
)
export const polylineItem = PolylineItem()
export type PolylineItem = typeof polylineItem

export interface ResizeDirConfig {
  h: boolean
  v: boolean
}
