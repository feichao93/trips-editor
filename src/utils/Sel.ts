import { List, OrderedSet, Record } from 'immutable'
import { getBoundingBoxOfPoints } from './common'
import { ItemId, State, Updater } from '../interfaces'

type SelMode = 'bbox' | 'vertices'

const SelRecord = Record({
  idSet: OrderedSet<ItemId>(),
  mode: 'bbox' as SelMode,
})

export type SelUpdater = Updater<Sel, State>

export default class Sel extends SelRecord {
  item(state: State) {
    return state.items.find(item => this.idSet.has(item.id)) || null
  }

  vertices(state: State) {
    const item = this.item(state)
    if (this.mode !== 'vertices' || item == null) {
      return List()
    } else {
      return item.getVertices()
    }
  }

  items(state: State) {
    return state.items.filter(item => this.idSet.has(item.id))
  }

  getBBox(state: State) {
    const selectedItems = this.items(state)
    const points = selectedItems.toList().flatMap(item => item.getVertices())
    return getBoundingBoxOfPoints(points)
  }

  isEmpty() {
    return this.idSet.isEmpty()
  }
}
