import { is, Map } from 'immutable'
import { Action, AppHistory, emptyAction, Item, ItemId, State } from '../interfaces'

export default class EditItemAction extends Action {
  prevItems: Map<ItemId, Item>

  constructor(readonly field: string, readonly val: any) {
    super()
  }

  prepare(h: AppHistory) {
    const last = h.getLastAction()
    this.prevItems = h.state.sitems()
    if (
      last !== emptyAction &&
      last instanceof EditItemAction &&
      is(this.prevItems.keySeq(), last.prevItems.keySeq()) &&
      this.field == last.field
    ) {
      this.prevItems = last.prevItems
      return h.pop()
    }
    return h
  }

  next(state: State) {
    const updatedItems = state.sitems().map(item => item.setIn(this.field.split('.'), this.val))
    return state.mergeIn(['items'], updatedItems)
  }

  prev(state: State) {
    return state.mergeIn(['items'], this.prevItems)
  }

  getMessage() {
    const itemsStr = this.prevItems.keySeq().join(',')
    const valueStr = JSON.stringify(this.val)
    return `Edit items. items={${itemsStr}}, field=${this.field}, value=${valueStr}`
  }
}
