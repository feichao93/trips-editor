import { Action, SelMode, State, AppHistory } from '../interfaces'

export default class ToggleSelModeAction extends Action {
  nextMode: SelMode

  prepare(h: AppHistory): AppHistory {
    this.nextMode = h.state.selMode === 'bbox' ? 'vertices' : 'bbox'
    return h
  }

  next(state: State) {
    return state.set('selMode', state.selMode === 'bbox' ? 'vertices' : 'bbox')
  }

  prev(state: State) {
    return this.next(state)
  }

  getMessage() {
    return `Change selection mode to ${this.nextMode}`
  }
}
