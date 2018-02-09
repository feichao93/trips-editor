import { Action, Point, Sel, State, Item } from '../interfaces'

type InsertVertexConfig = [Point, Sel, number]

export default class InsertVertexAction extends Action {
  constructor(readonly config: InsertVertexConfig) {
    super()
  }

  nextState(state: State, sel: Sel) {
    const [pos, _, insertIndex] = this.config
    return state.updateIn(
      ['items', sel.idSet.first()],
      (item: Item) => (item.supportEditVertex() ? item.insertVertex(insertIndex, pos) : item),
    )
  }
}
