import { Action, Item, State, Point, AppHistory, emptyAction } from '../interfaces'

type MoveVertexConfig = {
  item: Item
  vertexIndex: number
  startPos: Point
  movingPos: Point
}

export default class MoveVertexAction extends Action {
  prevItem: Item

  constructor(readonly config: MoveVertexConfig) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    const lastAction = h.getLastAction()
    if (
      lastAction !== emptyAction &&
      lastAction instanceof MoveVertexAction &&
      lastAction.config.startPos == this.config.startPos
    ) {
      this.prevItem = lastAction.prevItem
      return h.pop()
    } else {
      this.prevItem = this.config.item
      return h
    }
  }

  next(state: State) {
    const { item, vertexIndex, startPos, movingPos } = this.config
    const dx = movingPos.x - startPos.x
    const dy = movingPos.y - startPos.y
    return state.update('items', items =>
      items.set(item.id, item.supportEditVertex() ? item.moveVertex(vertexIndex, dx, dy) : item),
    )
  }

  prev(state: State) {
    return state.set('items', state.items.set(this.prevItem.id, this.prevItem))
  }

  getMessage() {
    const { item, vertexIndex, startPos, movingPos } = this.config
    const dx = movingPos.x - startPos.x
    const dy = movingPos.y - startPos.y

    return (
      'Move vertex.' +
      `item=${item.id}, vertex-index=${vertexIndex}, dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`
    )
  }
}
