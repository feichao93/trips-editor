import { OrderedSet } from 'immutable'
import { Action, ItemId, State, AppHistory } from '../interfaces'

export default class ChangeSelAction extends Action {
  itemIds: number[]
  prevSelIdSet: OrderedSet<ItemId>

  constructor(...itemIds: number[]) {
    super()
    this.itemIds = itemIds
  }

  prepare(h: AppHistory): AppHistory {
    this.prevSelIdSet = h.state.selIdSet
    return h
  }

  next(state: State) {
    return state.set('selIdSet', OrderedSet(this.itemIds))
  }

  prev(state: State) {
    return state.set('selIdSet', this.prevSelIdSet)
  }
}
