import { List, Record } from 'immutable'
import { Stream } from 'xstream'

declare global {
  interface Event {
    ownerTarget: EventTarget
  }
}

export interface Point {
  x: number
  y: number
}

export type ItemId = number

export type Item = PolygonItem | PolylineItem

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
  down$: Stream<Point>
  up$: Stream<Point>
  dblclick$: Stream<Point>
  wheel$: Stream<{ pos: Point; deltaY: number }>
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
