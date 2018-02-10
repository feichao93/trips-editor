import { OrderedSet } from 'immutable'
import { Action, State, AppHistory } from '../interfaces'

export default class LoadAction extends Action {
  prevState: State

  constructor(readonly newState: State) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    this.prevState = h.state
    return h
  }

  next(state: State) {
    return state.merge(this.newState).set('selIdSet', OrderedSet())
  }

  prev(state: State) {
    return this.prevState
  }

  getMessage() {
    return `Load.`
  }
}
