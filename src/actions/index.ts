import { State, AppHistory } from '../interfaces'

export default abstract class Action {
  abstract next(state: State): State
  abstract prev(state: State): State

  prepare(appHistory: AppHistory): AppHistory {
    return appHistory
  }

  getMessage() {
    return this.constructor.name
  }
}
