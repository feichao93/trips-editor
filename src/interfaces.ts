import { DOMSource, VNode } from '@cycle/dom'
import { List } from 'immutable'
import { MemoryStream, Stream } from 'xstream'
import { FileStat } from './makeFileDriver'
import { KeyboardSource } from './makeKeyboardDriver'
import AdjustedMouse from './utils/AdjustedMouse'
import ImgItem from './utils/ImgItem'
import PolygonItem from './utils/PolygonItem'
import PolylineItem from './utils/PolylineItem'
import Sel, { SelUpdater } from './utils/Sel'
import { Action, State } from './utils/State'
import UIClass, { UIIntent } from './utils/UI'

export { UIIntent, Action, State, PolygonItem, PolylineItem, ImgItem, Sel, SelUpdater }

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

export interface Updater<T, S = null> {
  (t: T, s?: S): T
}

export interface ItemMethods {
  render(): VNode
  getVertices(): List<Point>
  containsPoint(p: Point): boolean
  move(dx: number, dy: number): this
  resize(anchor: Point, config: ResizeDirConfig, startPos: Point, endPos: Point): this
  toJS(): any

  supportEditVertex(): boolean
  insertVertex?(insertIndex: number, p: Point): this
  deleteVertex?(vertexIndex: number): this
  moveVertex?(vertexIndex: number, dx: number, dy: number): this
}

export type CommonRecordSetter = RecordSetter<'id', number> &
  RecordSetter<'locked', boolean> &
  RecordSetter<'opacity', number>

export type Item = (PolygonItem | PolylineItem | ImgItem) & CommonRecordSetter & ItemMethods

export interface RecordSetter<K, V> {
  set(key: K, value: V): this
}

export type ItemId = number
export type NodeId = number

export interface ResizeDirConfig {
  h: boolean
  v: boolean
}

export interface InteractionFnSources {
  DOM: DOMSource
  UI: UIClass
  config: MemoryStream<AppConfig>
  mouse: AdjustedMouse
  mode: MemoryStream<string>
  state: MemoryStream<State>
  sel: MemoryStream<Sel>
  transform: MemoryStream<d3.ZoomTransform>
  keyboard: KeyboardSource
  FILE: Stream<FileStat>
}

export interface InteractionFnSinks {
  DOM: Stream<VNode>
  action: Stream<Action>
  nextMode: Stream<string>
  nextConfig: Stream<AppConfig>
  nextTransform: Stream<d3.ZoomTransform>
  updateSel: Stream<SelUpdater>
  drawingItem: Stream<Item>
  nextVertexIndex: Stream<any>
  nextVertexInsertIndex: Stream<any>
  nextAdjustConfigs: Stream<AdjustConfig[]>
  nextResizer: Stream<string>
  SAVE: Stream<SaveConfig>
  FILE: Stream<File | 'open-file-dialog'>
  addons: { [key: string]: Stream<any> }
}

export interface InteractionFn {
  (sources: InteractionFnSources): Partial<InteractionFnSinks>
}

export interface SaveConfig {
  blob: Blob
  filename?: string
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

export interface AppConfig {
  meta: {
    type: 'editor-config'
    vertion: 0.7
  }
  minScale: number
  maxScale: number
  senseRange: number
  stylePresets: StylePreset[]
}

export interface StylePreset {
  name: string
  styles: {
    fill?: string
    stroke?: string
    opacity?: number
  }
}
