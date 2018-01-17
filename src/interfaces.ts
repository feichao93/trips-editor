import { MemoryStream, Stream } from 'xstream'
import { Action, State } from './actions'
import { ShortcutSource } from './makeShortcutDriver'
import PolygonItem from './utils/PolygonItem'
import PolylineItem from './utils/PolylineItem'
import Selection from './utils/Selection'
import Mouse from './utils/Mouse'

export { PolygonItem, PolylineItem, Selection }

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
  shortcut: ShortcutSource
}

export interface InteractionFnSinks {
  action: Stream<Action>
  nextMode: Stream<string>
  nextTransform: Stream<d3.ZoomTransform>
  changeSelection: Stream<Updater<Selection>>
  drawingItem: Stream<Item>
  addons: { [key: string]: Stream<any> }
}

export interface InteractionFn {
  (sources: InterfaceFnSources): Partial<InteractionFnSinks>
}
