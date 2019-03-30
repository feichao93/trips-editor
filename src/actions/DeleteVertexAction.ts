import { Action, Item, ItemId, State, AppHistory } from '../interfaces'

export default class DeleteVertexAction extends Action {
  prevItem: Item

  constructor(readonly vertexIndex: number) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    this.prevItem = h.state.items.get(h.state.selIdSet.first() as number)
    return h
  }

  next(state: State) {
    return state.update('items', items =>
      items.update(
        state.selIdSet.first() as number,
        item => (item.supportEditVertex() ? item.deleteVertex(this.vertexIndex) : item),
      ),
    )
  }

  prev(state: State) {
    return state.update('items', items => items.set(this.prevItem.id, this.prevItem))
  }

  getMessage() {
    return `Delete vertex. item-id=${this.prevItem.id}, vertex-index=${this.vertexIndex}`
  }
}
