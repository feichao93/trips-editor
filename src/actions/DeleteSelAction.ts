import { OrderedSet } from 'immutable'
import { Action, State } from '../interfaces'

export default class DeleteSelAction extends Action {
  next(state: State) {
    if (state.selIdSet.isEmpty()) {
      return state
    }
    return state
      .update('items', items => items.filterNot(item => state.selIdSet.has(item.id)))
      .update('zlist', zlist => zlist.filterNot(itemId => state.selIdSet.has(itemId)))
      .set('selIdSet', OrderedSet())
  }
}
