import { Action, Point, State, Item, AppHistory } from '../interfaces'

type InsertVertexConfig = [Point, number]

export default class InsertVertexAction extends Action {
  prevItem: Item

  constructor(readonly config: InsertVertexConfig) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    this.prevItem = h.state.sitem()
    return h
  }

  next(state: State) {
    const [pos, insertIndex] = this.config
    return state.updateIn(
      ['items', state.selIdSet.first()],
      (item: Item) => (item.supportEditVertex() ? item.insertVertex(insertIndex, pos) : item),
    )
  }

  prev(state: State) {
    return state.set('items', state.items.set(this.prevItem.id, this.prevItem))
  }

  getMessage() {
    return `Insert vertex. item=${this.prevItem.id}, insert-index=${this.config['1']}`
  }
}
