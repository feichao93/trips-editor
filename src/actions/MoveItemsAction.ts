import { Map } from 'immutable'
import { Action, Item, ItemId, Sel, State } from '../interfaces'

export default class MoveItemsAction extends Action {
  constructor(readonly movedItems: Map<ItemId, Item>) {
    super()
  }

  nextState(state: State, sel: Sel) {
    return state.mergeIn(['items'], this.movedItems)
  }
}
