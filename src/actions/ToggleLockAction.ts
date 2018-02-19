import { Set } from 'immutable'
import { not } from 'ramda'
import { Action, AppHistory, ItemId, State } from '../interfaces'

export default class ToggleLockAction extends Action {
  lock: boolean
  itemIdSet: Set<ItemId>

  prepare(h: AppHistory): AppHistory {
    const sitems = h.state.sitems()
    this.lock = sitems.some(item => !item.locked)
    this.itemIdSet = sitems
      .filter(item => item.locked !== this.lock)
      .map(item => item.locked)
      .keySeq()
      .toSet()

    return h
  }

  next(state: State) {
    const nextItems = state.sitems().map(item => item.set('locked', this.lock))
    return state.update('items', items => items.merge(nextItems))
  }

  prev(state: State) {
    const prevItems = state.items
      .filter(item => this.itemIdSet.has(item.id))
      .map(item => item.update('locked', not))

    return state.update('items', items => items.merge(prevItems))
  }

  getMessage() {
    const itemIdStr = this.itemIdSet.keySeq().join(',')
    const actionStr = this.lock ? 'Lock' : 'Unlock'
    return `${actionStr} items. items={${itemIdStr}}`
  }
}
