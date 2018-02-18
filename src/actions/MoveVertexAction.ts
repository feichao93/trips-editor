import { Action, Item, State, Point, AppHistory, emptyAction } from '../interfaces'

type MoveVertexConfig = {
  item: Item
  vertexIndex: number
  startPos: Point
  movingPos: Point
}

export default class MoveVertexAction extends Action {
  prevItem: Item
  nextItem: Item

  constructor(readonly config: MoveVertexConfig) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    const lastAction = h.getLastAction()

    const { item, vertexIndex, startPos, movingPos } = this.config
    const dx = movingPos.x - startPos.x
    const dy = movingPos.y - startPos.y
    this.nextItem = item.supportEditVertex() ? item.moveVertex(vertexIndex, dx, dy) : item

    if (
      lastAction !== emptyAction &&
      lastAction instanceof MoveVertexAction &&
      lastAction.config.startPos == this.config.startPos
    ) {
      this.prevItem = lastAction.prevItem
      return h.pop()
    } else {
      this.prevItem = h.state.items.get(this.config.item.id)
      return h
    }
  }

  next(state: State) {
    const { item, vertexIndex, startPos, movingPos } = this.config
    const dx = movingPos.x - startPos.x
    const dy = movingPos.y - startPos.y
    return state.set('items', state.items.set(item.id, this.nextItem))
  }

  prev(state: State) {
    return state.set('items', state.items.set(this.prevItem.id, this.prevItem))
  }

  getMessage() {
    const { vertexIndex } = this.config
    const prevVertex = this.prevItem.getVertices().get(vertexIndex)
    const nextVertex = this.nextItem.getVertices().get(vertexIndex)
    const dx = (nextVertex.x - prevVertex.x).toFixed(1)
    const dy = (nextVertex.y - prevVertex.y).toFixed(1)

    return `Move vertex. item=${this.prevItem.id}, vertex-index=${vertexIndex}, dx=${dx}, dy=${dy}`
  }
}
