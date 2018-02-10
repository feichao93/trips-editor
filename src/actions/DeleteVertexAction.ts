import { Action, State } from '../interfaces'

export default class DeleteVertexAction extends Action {
  constructor(readonly vertexIndex: number) {
    super()
  }

  next(state: State) {
    return state.update('items', items =>
      items.update(
        state.selIdSet.first(),
        item => (item.supportEditVertex() ? item.deleteVertex(this.vertexIndex) : item),
      ),
    )
  }
}
