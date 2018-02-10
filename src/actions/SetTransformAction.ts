import { Action, State, AppHistory } from '../interfaces'

export default class SetTransformAction extends Action {
  startTransform: d3.ZoomTransform

  constructor(readonly transform: d3.ZoomTransform) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    const lastAction = h.list.get(h.index)
    if (h.index !== -1 && lastAction != null && lastAction instanceof SetTransformAction) {
      // TODO add start-transform as the filter-predicate
      // TODO add trigger(wheel or UI) as the filter-predicate
      this.startTransform = lastAction.startTransform
      return {
        list: h.list.splice(h.index, 1),
        index: h.index - 1,
        state: h.state,
      }
    } else {
      this.startTransform = h.state.transform
      return h
    }
  }

  next(state: State) {
    return state.set('transform', this.transform)
  }

  prev(state: State) {
    return state.set('transform', this.startTransform)
  }
}
