import { Action, AppHistory, emptyAction, Point, State } from '../interfaces'
import { distanceBetweenPointAndPoint } from '../utils/common'
import { MERGE_SET_TRANSFORM_ACTION_FACTOR } from '../constants'

export default class SetTransformAction extends Action {
  constructor(
    readonly target: d3.ZoomTransform,
    readonly start: d3.ZoomTransform,
    readonly mousePos: Point,
    readonly senseRange: number,
  ) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    const last = h.getLastAction()
    if (
      last !== emptyAction &&
      last instanceof SetTransformAction &&
      (this.start == last.start ||
        (this.mousePos != null &&
          last.mousePos != null &&
          distanceBetweenPointAndPoint(this.mousePos, last.mousePos) <
            this.senseRange * MERGE_SET_TRANSFORM_ACTION_FACTOR))
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
