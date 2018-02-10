import { Action, Item, ItemId, Point, ResizeDirConfig, State, AppHistory } from '../interfaces'
import { Map } from 'immutable'

// TODO refine interface
export interface ResizeItemConfig {
  movingPos: Point
  startPos: Point
  startItems: Map<ItemId, Item>
  anchor: Point
  resizeDirConfig: ResizeDirConfig
}

export default class ResizeItemAction extends Action {
  prevItems: Map<ItemId, Item>
  constructor(readonly config: ResizeItemConfig) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    const lastAction = h.list.get(h.index)
    if (
      lastAction != null &&
      lastAction instanceof ResizeItemAction &&
      this.config.startPos == lastAction.config.startPos
    ) {
      this.prevItems = lastAction.prevItems
      return {
        list: h.list.splice(h.index, 1),
        index: h.index - 1,
        state: h.state,
      }
    } else {
      this.prevItems = this.config.startItems
      return h
    }
  }

  next(state: State) {
    const { startItems, startPos, anchor, movingPos, resizeDirConfig } = this.config
    const afterItems = startItems.map(item =>
      item.resize(anchor, resizeDirConfig, startPos, movingPos),
    )
    return state.mergeIn(['items'], afterItems)
  }

  prev(state: State) {
    return state.mergeIn(['items'], this.prevItems)
  }
}
