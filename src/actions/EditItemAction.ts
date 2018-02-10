import { Map } from 'immutable'
import { Action, AppHistory, Item, ItemId, State } from '../interfaces'

export default class EditItemAction extends Action {
  prevItems: Map<ItemId, Item>

  constructor(readonly field: string, readonly val: any) {
    super()
  }

  prepare(h: AppHistory) {
    this.prevItems = h.state.sitems()
    return h
  }

  next(state: State) {
    const updatedItems = state.sitems().map(item => item.set(this.field as any, this.val))
    return state.mergeIn(['items'], updatedItems)
  }

  prev(state: State) {
    return state.mergeIn(['items'], this.prevItems)
  }

  getMessage() {
    return `Edit item. field=${this.field}, value=${JSON.stringify(this.val)}`
  }
}
