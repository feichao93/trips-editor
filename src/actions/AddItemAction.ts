import { OrderedSet } from 'immutable'
import { identical } from 'ramda'
import Action from './index'
import { Item, State, AppHistory } from '../interfaces'
import { getNextItemId } from '../utils/common'

export default class AddItemAction extends Action {
  private itemId: number

  constructor(private item: Item) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    this.itemId = getNextItemId(h.state)
    return h
  }

  next(state: State) {
    return state
      .update('items', items => items.set(this.itemId, this.item.set('id', this.itemId)))
      .update('zlist', zlist => zlist.push(this.itemId))
      .set('selIdSet', OrderedSet([getNextItemId(state)]))
  }

  prev(state: State) {
    return state
      .deleteIn(['items', this.itemId])
      .update('zlist', zlist => zlist.filterNot(identical(this.itemId)))
      .update('selIdSet', idSet => idSet.remove(this.itemId))
  }
}
