import { Action, AppHistory, State } from '../interfaces'

export default class SetTransformAction extends Action {
  constructor(readonly target: d3.ZoomTransform, readonly start: d3.ZoomTransform) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    const last = h.list.get(h.index)
    if (
      h.index !== -1 &&
      last != null &&
      last instanceof SetTransformAction &&
      this.start == last.start
    ) {
      return h.pop()
    } else {
      return h
    }
  }

  next(state: State) {
    return state.set('transform', this.target)
  }

  prev(state: State) {
    return state.set('transform', this.start)
  }

  getMessage() {
    const xPart = `x=${this.target.x.toFixed(1)}`
    const yPart = `y=${this.target.y.toFixed(1)}`
    const kPart = `k=${this.target.k.toFixed(1)}`
    return `Set transform. ${xPart}, ${yPart}, ${kPart}`
  }
}
