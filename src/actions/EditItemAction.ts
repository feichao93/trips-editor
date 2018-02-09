import { Sel, Action, State } from '../interfaces'
export default class EditItemAction extends Action {
  constructor(readonly field: string, readonly val: any) {
    super()
  }

  nextState(state: State, sel: Sel) {
    const updatedItems = sel.items(state).map(item => item.set(this.field as any, this.val))
    return state.mergeIn(['items'], updatedItems)
  }
}
