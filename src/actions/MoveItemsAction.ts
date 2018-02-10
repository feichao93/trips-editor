import { Map } from 'immutable'
import { Action, AppHistory, emptyAction, Item, ItemId, Point, State } from '../interfaces'

export interface MoveItemsConfig {
  startPos: Point
  startItems: Map<ItemId, Item>
  movingPos: Point
}

export default class MoveItemsAction extends Action {
  prevItems: Map<ItemId, Item>

  constructor(readonly config: MoveItemsConfig) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    const lastAction = h.getLastAction()
    if (
      lastAction != emptyAction &&
      lastAction instanceof MoveItemsAction &&
      lastAction.config.startPos == this.config.startPos
    ) {
      this.prevItems = lastAction.prevItems
      return h.pop()
    } else {
      this.prevItems = this.config.startItems
      return h
    }
  }

  next(state: State) {
    const dx = this.config.movingPos.x - this.config.startPos.x
    const dy = this.config.movingPos.y - this.config.startPos.y
    const movedItems = this.config.startItems.map(item => item.move(dx, dy))
    return state.mergeIn(['items'], movedItems)
  }

  prev(state: State) {
    return state.mergeIn(['items'], this.prevItems)
  }

  getMessage() {
    const items = this.config.startItems.keySeq().join(',')
    const dx = this.config.movingPos.x - this.config.startPos.x
    const dy = this.config.movingPos.y - this.config.startPos.y
    return `Move items. items={${items}}, dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`
  }
}
