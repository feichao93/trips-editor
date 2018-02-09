import { OrderedSet } from 'immutable'
import { Action, Sel, State } from '../interfaces'

export default class ChangeSelAction extends Action {
  itemIds: number[]
  constructor(...itemIds: number[]) {
    super()
    this.itemIds = itemIds
  }

  nextSel(state: State, sel: Sel) {
    return sel.set('idSet', OrderedSet(this.itemIds))
  }
}
