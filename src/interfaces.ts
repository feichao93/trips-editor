import { MemoryStream, Stream } from 'xstream'
import { Action, State } from './actions'
import { KeyboardSource } from './makeKeyboardDriver'
import AdjustedMouse from './utils/AdjustedMouse'
import ImgItem from './utils/ImgItem'
import Item from './utils/Item'
import PolygonItem from './utils/PolygonItem'
import PolylineItem from './utils/PolylineItem'
import Selection from './utils/Selection'

export { Item, PolygonItem, PolylineItem, ImgItem, Selection }

export interface Point {
  readonly x: number
  readonly y: number
}
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Updater<T> {
  (t: T): T
}

export type ItemId = number

export interface ResizeDirConfig {
  h: boolean
  v: boolean
}

export interface InteractionFnSources {
  mouse: AdjustedMouse
  mode: MemoryStream<string>
  state: MemoryStream<State>
  selection: MemoryStream<Selection>
  transform: MemoryStream<d3.ZoomTransform>
  keyboard: KeyboardSource
}

export interface InteractionFnSinks {
  action: Stream<Action>
  nextMode: Stream<string>
  nextTransform: Stream<d3.ZoomTransform>
  changeSelection: Stream<Updater<Selection>>
  drawingItem: Stream<Item>
  nextVertexIndex: Stream<any>
  nextAdjustConfigs: Stream<AdjustConfig[]>
  addons: { [key: string]: Stream<any> }
}

export interface InteractionFn {
  (sources: InteractionFnSources): Partial<InteractionFnSinks>
}

export type AdjustConfig = AdjustConfigCement | AdjustConfigAlign | AdjustConfigRestrict

export interface AdjustConfigCement {
  type: 'cement'
  include?: Point[]
  exclude?: Point[]
}
export interface AdjustConfigAlign {
  type: 'align'
  include?: Point[]
  exclude?: Point[]
}
export interface AdjustConfigRestrict {
  type: 'restrict'
  anchor: Point
}

export interface AdjustResult {
  point: Point
  applied: string[]
  ensure: (p: Point) => boolean
  info?: AdjustResultExtraInfo
}

export type AdjustResultExtraInfo = Partial<{
  horizontalPoint: Point
  verticalPoint: Point
}>
