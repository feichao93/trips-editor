import { not } from 'ramda'
import { Action, Sel, State } from '../interfaces'

export default class ToggleLockAction extends Action {
  nextState(state: State, sel: Sel) {
    const item = sel.item(state)
    return state.update('items', items => items.set(item.id, item.update('locked', not)))
  }
}
