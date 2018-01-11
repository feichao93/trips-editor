import * as R from 'ramda'
import { List, Map, OrderedSet } from 'immutable'
import { ItemId, Item } from './interfaces'
import { getNextId } from './utils/common'

export type Cursor = 'default' | 'cross' | 'pointer'

export interface State {
  items: Map<ItemId, Item>
  sids: OrderedSet<ItemId>
  zlist: List<ItemId>
  cursor: Cursor
}

export const initState: State = {
  items: Map<ItemId, Item>(),
  sids: OrderedSet<ItemId>(), // selected item ids
  zlist: List<ItemId>(), // item id sorted by z-index
  cursor: 'default',
}

export type Updater = (s: State) => State

export default {
  addItem(item: Item): Updater {
    return state => {
      const itemId = getNextId('item')
      return R.assoc('items', state.items.set(itemId, item.set('id', itemId)), state)
    }
  },
}
