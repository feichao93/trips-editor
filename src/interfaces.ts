import { OrderedMap } from 'immutable'
import { MemoryStream, Stream } from 'xstream'
import { Action, State } from './actions'
import { ShortcutSource } from './makeShortcutDriver'
import PolygonItem from './utils/PolygonItem'
import PolylineItem from './utils/PolylineItem'

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

export interface InterfaceFnSources {
  mouse: Mouse
  mode: MemoryStream<string>
  state: MemoryStream<State>
  selection: MemoryStream<Selection>
  transform: MemoryStream<d3.ZoomTransform>
  resizer: MemoryStream<string>
  shortcut: ShortcutSource
}

export interface InteractionFnSinks {
  action: Stream<Action>
  nextMode: Stream<string>
  nextTransform: Stream<d3.ZoomTransform>
  drawingItem: Stream<Item>
  addons: { [key: string]: Stream<any> }
}

export interface InteractionFn {
  (sources: InterfaceFnSources): Partial<InteractionFnSinks>
}
