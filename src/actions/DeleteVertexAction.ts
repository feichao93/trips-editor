import { Action, State, Sel } from '../interfaces'

export default class DeleteVertexAction extends Action {
  constructor(readonly vertexIndex: number) {
    super()
  }

  nextState(state: State, sel: Sel) {
    return state.update('items', items =>
      items.update(
        sel.idSet.first(),
        item => (item.supportEditVertex() ? item.deleteVertex(this.vertexIndex) : item),
      ),
    )
  }
}
