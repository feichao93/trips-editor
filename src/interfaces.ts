import { DOMSource, VNode } from '@cycle/dom'
import { List, Set } from 'immutable'
import { MemoryStream, Stream } from 'xstream'
import Action from './actions'
import { DialogRequest, FileStat } from './makeFileDriver'
import { KeyboardSource } from './makeKeyboardDriver'
import AdjustedMouse from './utils/AdjustedMouse'
import AppHistory, { emptyAction } from './utils/AppHistory'
import ImgItem from './utils/ImgItem'
import PolygonItem from './utils/PolygonItem'
import PolylineItem from './utils/PolylineItem'
import State, { SelMode } from './utils/State'
import UIClass, { UIIntent } from './utils/UI'

export {
  AppHistory,
  UIIntent,
  Action,
  emptyAction,
  SelMode,
  State,
  PolygonItem,
  PolylineItem,
  ImgItem,
}

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

  getShortDescription(): string
}

export type CommonRecordUpdaters = RecordUpdater<'id', number> &
  RecordUpdater<'locked', boolean> &
  RecordUpdater<'label', string> &
  RecordUpdater<'opacity', number> &
  RecordUpdater<'tags', Set<string>>

export type Item = (PolygonItem | PolylineItem | ImgItem) & CommonRecordUpdaters & ItemMethods

export interface RecordUpdater<K, V> {
  set(key: K, value: V): this
  update(key: K, fn: (old: V) => V): this
  merge(...args: any[]): this
}

export type ItemId = number
export type NodeId = number

export interface ResizeDirConfig {
  h: boolean
  v: boolean
}

export interface ComponentSources {
  DOM: DOMSource
  UI: UIClass
  svgDOMRect: MemoryStream<DOMRect>
  config: MemoryStream<AppConfig>
  clipboard: MemoryStream<Item>
  mouse: AdjustedMouse
  mode: MemoryStream<string>
  state: MemoryStream<State>
  keyboard: KeyboardSource
  FILE: Stream<FileStat>
  polygonCloseIndicator: MemoryStream<VNode>
  drawingItem: MemoryStream<Item> // TODO 可以将drawingItem合并到editingItemId中
  editingItemId: MemoryStream<ItemId>
}

export interface ComponentSinks {
  DOM: Stream<VNode>
  action: Stream<Action>
  nextMode: Stream<string>
  nextConfig: Stream<AppConfig>
  nextClipboard: Stream<Item>
  drawingItem: Stream<Item>
  nextEditingItemId: Stream<ItemId>
  nextVertexIndex: Stream<any>
  nextVertexInsertIndex: Stream<any>
  nextAdjustConfigs: Stream<AdjustConfig[]>
  nextResizer: Stream<string>
  nextPolygonCloseIndicator: Stream<VNode>
  SAVE: Stream<SaveConfig>
  FILE: Stream<File | DialogRequest>
}

export interface Component {
  (sources: ComponentSources): Partial<ComponentSinks>
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
  semantics: {
    tags: SemanticTagConfig[]
  }
}

export interface SemanticTagConfig {
  name: string
  styles: {
    fill?: string
    stroke?: string
    strokeWdith?: number
  }
}
