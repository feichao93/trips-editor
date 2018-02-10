import { not } from 'ramda'
import { Action, State } from '../interfaces'

export default class ToggleLockAction extends Action {
  next(state: State) {
    const item = state.sitem()
    return state.update('items', items => items.set(item.id, item.update('locked', not)))
  }
}
