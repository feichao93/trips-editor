import { not } from 'ramda'
import { Action, State, AppHistory } from '../interfaces'

export default class ToggleLockAction extends Action {
  message: string

  prepare(h: AppHistory): AppHistory {
    const itemIdStr = h.state
      .sitems()
      .keySeq()
      .join(',')
    this.message = `Toggle lock. items={${itemIdStr}}`
    return h
  }

  next(state: State) {
    const item = state.sitem()
    return state.update('items', items => items.set(item.id, item.update('locked', not)))
  }

  prev(state: State) {
    return this.next(state)
  }

  getMessage() {
    return this.message
  }
}
