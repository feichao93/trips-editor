import { OrderedSet } from 'immutable'
import Action from './index'
import { Item, Sel, State } from '../interfaces'
import { getNextItemId } from '../utils/common'

export default class AddItemAction extends Action {
  constructor(private item: Item) {
    super()
  }

  nextState(state: State, sel: Sel) {
    const itemId = getNextItemId(state)
    return state
      .update('items', items => items.set(itemId, this.item.set('id', itemId)))
      .update('zlist', zlist => zlist.push(itemId))
  }

  nextSel(state: State, sel: Sel) {
    return sel.set('idSet', OrderedSet([getNextItemId(state)]))
  }
}
