import { List, Seq } from 'immutable'
import { Item, PolygonItem, PolylineItem, State } from '../interfaces'

const serializeUtils = {
  toJS(state: State) {
    const object = state
      .update('items', items =>
        items.map(item => {
          const object = item.toJS()
          if (item instanceof PolygonItem) {
            object.type = 'PolygonItem'
          } else if (item instanceof PolylineItem) {
            object.type = 'PolylineItem'
          } // other types of items cannot be serialized
          return object
        }),
      )
      .toJS()
    object.items = Object.values(object.items)
    return object
  },

  fromJS(object: any) {
    const items = Seq(object.items)
      .toIndexedSeq()
      .map((item: any) => {
        if (item.type === 'PolygonItem') {
          return PolygonItem.fromJS(item)
        } else if (item.type === 'PolylineItem') {
          return PolylineItem.fromJS(item)
        } else {
          throw new Error('This object cannot be converted to Item')
        }
      })
      .toMap()
      .mapKeys((_: any, item: Item) => item.id)
    const zlist: any = List(object.zlist)

    return new State({ items, zlist })
  },
}

export default serializeUtils
