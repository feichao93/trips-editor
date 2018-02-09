import { Action, State } from '../interfaces'
import { ResizingInfo } from '../utils/State'

export default class ResizeItemAction extends Action {
  constructor(readonly resizingInfo: ResizingInfo) {
    super()
  }

  nextState(state: State) {
    const { startItems, startPos, anchor, movingPos, resizeDirConfig } = this.resizingInfo
    return state.mergeIn(
      ['items'],
      startItems.map(item => item.resize(anchor, resizeDirConfig, startPos, movingPos)),
    )
  }
}
