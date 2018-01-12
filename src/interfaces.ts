import { List, Record } from 'immutable'

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

export type Item = PolygonItem

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
