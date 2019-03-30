import * as d3 from 'd3'
import { List, Map, OrderedSet, Record } from 'immutable'
import { getBoundingBoxOfPoints } from './common'
import { Item, ItemId, Point } from '../interfaces'

export type SelMode = 'bbox' | 'vertices'

const StateRecord = Record({
  transform: d3.zoomIdentity,
  items: Map<ItemId, Item>(),
  zlist: List<ItemId>(),
  selMode: 'bbox' as SelMode,
  selIdSet: OrderedSet<ItemId>(),
})

export default class State extends StateRecord {
  sitem() {
    return this.items.find(item => this.selIdSet.has(item.id)) || null
  }

  vertices() {
    const item = this.sitem()
    if (this.selMode !== 'vertices' || item == null) {
      return List<Point>()
    } else {
      return item.getVertices()
    }
  }

  sitems() {
    return this.items.filter(item => this.selIdSet.has(item.id))
  }

  getBBox() {
    const selectedItems = this.sitems()
    const points = selectedItems.toList().flatMap(item => item.getVertices())
    return getBoundingBoxOfPoints(points)
  }
}
