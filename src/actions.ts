import * as R from 'ramda'
import { Record, List, Map, OrderedSet, OrderedMap } from 'immutable'
import { ItemId, Item } from './interfaces'
import { getNextId, moveItem } from './utils/common'

export type Cursor = 'default' | 'cross' | 'pointer'

export const StateRecord = Record({
  items: Map<ItemId, Item>(),
  sids: OrderedSet<ItemId>(),
  zlist: List<ItemId>(),
  cursor: 'default' as Cursor,
})

export const initState = StateRecord()
export type State = typeof initState
export type Action = (s: State) => State
export type ZIndexOp = 'z-inc' | 'z-dec' | 'z-top' | 'z-bottom'

export default {
  moveItems(movedItems: OrderedMap<ItemId, Item>): Action {
    return state => state.mergeIn(['items'], movedItems)
  },
  updateSids(sids: Iterable<number>): Action {
    return state => state.set('sids', OrderedSet(sids))
  },
  clearSids(): Action {
    return state => state.set('sids', OrderedSet())
  },
  addItem(item: Item): Action {
    const id = getNextId('item')
    return state =>
      state
        .setIn(['items', id], item.set('id', id))
        .set('sids', OrderedSet([id]))
        .update('zlist', zlist => zlist.push(id))
  },
  updateItems(updateItems: OrderedMap<ItemId, Item>): Action {
    return state => state.mergeIn(['items'], updateItems)
  },
  updateZIndex(op: ZIndexOp): Action {
    return state => {
      const sids = state.sids
      if (sids.count() !== 1) {
        return state
      } else {
        const sid = sids.first()
        const zlist = state.zlist
        const oldZ = zlist.indexOf(sid)
        const zs = zlist.delete(oldZ)
        if (op === 'z-inc') {
          return state.set('zlist', zs.insert(oldZ + 1, sid))
        } else if (op === 'z-dec') {
          return oldZ === 0 ? state : state.set('zlist', zs.insert(oldZ - 1, sid))
        } else if (op === 'z-top') {
          return state.set('zlist', zs.push(sid))
        } else {
          // z-bottom
          return state.set('zlist', zs.unshift(sid))
        }
      }
    }
  },
}
