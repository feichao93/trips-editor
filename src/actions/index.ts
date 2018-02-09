import { State, Sel } from '../interfaces'

export default abstract class Action {
  constructor() {}

  nextState(state: State, sel: Sel): State {
    return state
  }
  prevState(state: State, sel: Sel): State {
    return state
  }
  nextSel(state: State, sel: Sel): Sel {
    return sel
  }
  prevSel(state: State, sel: Sel): Sel {
    return sel
  }

  beforePush() {}
}
