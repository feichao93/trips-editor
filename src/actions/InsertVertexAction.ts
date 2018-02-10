import { Action, Point, State, Item } from '../interfaces'

type InsertVertexConfig = [Point, number]

export default class InsertVertexAction extends Action {
  constructor(readonly config: InsertVertexConfig) {
    super()
  }

  next(state: State) {
    const [pos, insertIndex] = this.config
    return state.updateIn(
      ['items', state.selIdSet.first()],
      (item: Item) => (item.supportEditVertex() ? item.insertVertex(insertIndex, pos) : item),
    )
  }
}
