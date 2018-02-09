import { Action, Item, State, Sel } from '../interfaces'

type VertexMovingInfo = {
  item: Item
  vertexIndex: number
  dx: number
  dy: number
}

export default class MoveVertexAction extends Action {
  constructor(readonly vertexMovingInfo: VertexMovingInfo) {
    super()
  }

  nextState(state: State, sel: Sel) {
    const { item, vertexIndex, dx, dy } = this.vertexMovingInfo
    return state.update('items', items =>
      items.set(item.id, item.supportEditVertex() ? item.moveVertex(vertexIndex, dx, dy) : item),
    )
  }
}
