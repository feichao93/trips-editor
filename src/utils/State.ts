import { List, Map, Record } from 'immutable'
import { Item, ItemId, Point, ResizeDirConfig, Updater } from '../interfaces'

export interface ResizingInfo {
  movingPos: Point
  startPos: Point
  startItems: Map<ItemId, Item>
  anchor: Point
  resizeDirConfig: ResizeDirConfig
}

const StateRecord = Record({
  items: Map<ItemId, Item>(),
  zlist: List<ItemId>(),
})

export type Action = Updater<State>
export type ZIndexOp = 'inc' | 'dec' | 'top' | 'bottom'

export class State extends StateRecord {}
