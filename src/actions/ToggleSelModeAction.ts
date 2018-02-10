import { Action, State } from '../interfaces'

export default class ToggleSelModeAction extends Action {
  next(state: State) {
    return state.set('selMode', state.selMode === 'bbox' ? 'vertices' : 'bbox')
  }
}
