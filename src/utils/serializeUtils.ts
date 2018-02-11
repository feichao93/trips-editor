import { Seq, Set } from 'immutable'
import { Item, ItemId, PolygonItem, PolylineItem, State } from '../interfaces'
import { isPolygonItem, isPolylineItem } from './common'

function getImgTypeString(item: Item) {
  if (isPolygonItem(item)) return 'PolygonItem'
  if (isPolylineItem(item)) return 'PolylineItem'
  throw new Error('Invalid item.')
}

function getImgTypeConstructor(name: string) {
  if (name === 'PolygonItem') return PolygonItem
  if (name === 'PolylineItem') return PolylineItem
  throw new Error('Invalid type name.')
}

const serializeUtils = {
  toJS(state: State) {
    const items = state.items
      .filter(item => isPolygonItem(item) || isPolylineItem(item))
      .map(item => ({
        type: getImgTypeString(item),
        ...item.toObject(),
      }))
      .valueSeq()
      .toArray()

    const validItemIdSet = Set(items.map((item: any) => item.id))
    const zlist = state.zlist.filter((itemId: ItemId) => validItemIdSet.has(itemId)).toArray()

    return { items, zlist }
  },

  fromJS(object: any) {
    const items = Seq(object.items)
      .toIndexedSeq()
      .map((item: any) => getImgTypeConstructor(item.type).fromJS(item))
      .toMap()
      .mapKeys((_: any, item: Item) => item.id)
    const zlist: any = Seq(object.zlist)
      .toIndexedSeq()
      .toList()

    return new State({ items, zlist /* use default selMode and selIdSet */ })
  },
}

export default serializeUtils
