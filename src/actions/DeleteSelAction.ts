import { OrderedSet } from 'immutable'
import { Action, Sel, State } from '../interfaces'

export default class DeleteSelAction extends Action {
  nextState(state: State, sel: Sel) {
    if (sel.isEmpty()) {
      return state
    }
    return state
      .update('items', items => items.filterNot(item => sel.idSet.has(item.id)))
      .update('zlist', zlist => zlist.filterNot(itemId => sel.idSet.has(itemId)))
  }

  nextSel(state: State, sel: Sel) {
    return sel.set('idSet', OrderedSet())
  }
}
