import { OrderedSet } from 'immutable'
import { Action, State } from '../interfaces'

export default class LoadAction extends Action {
  constructor(readonly newState: State) {
    super()
  }

  next(state: State) {
    return state.merge(this.newState).set('selIdSet', OrderedSet())
  }
}
