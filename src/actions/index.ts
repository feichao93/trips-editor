import { State, AppHistory } from '../interfaces'

export default abstract class Action {
  constructor() {}

  next(state: State): State {
    return state
  }
  prev(state: State): State {
    return state
  }

  prepare(appHistory: AppHistory): AppHistory {
    return appHistory
  }
}
