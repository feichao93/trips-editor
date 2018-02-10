import { Action, State } from '../interfaces'
export default class EditItemAction extends Action {
  constructor(readonly field: string, readonly val: any) {
    super()
  }

  next(state: State) {
    const updatedItems = state.sitems().map(item => item.set(this.field as any, this.val))
    return state.mergeIn(['items'], updatedItems)
  }
}
