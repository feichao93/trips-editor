import { Action, State, Sel } from '../interfaces'
import { OrderedSet } from 'immutable'
export default class LoadAction extends Action {
  constructor(readonly newState: State) {
    super()
  }

  nextState(state: State, sel: Sel) {
    return this.newState
  }

  nextSel(state: State, sel: Sel) {
    return sel.set('idSet', OrderedSet())
  }
}
