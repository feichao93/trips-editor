import { List, Map, Set, OrderedMap, Record } from 'immutable'
import { Item, ItemId, Point, ResizeDirConfig, Sel, Updater } from './interfaces'
import { getNextItemId } from './utils/common'

export interface ResizingInfo {
  movingPos: Point
  startPos: Point
  startItems: Map<ItemId, Item>
  anchor: Point
  resizeDirConfig: ResizeDirConfig
}

export const StateRecord = Record({
  items: Map<ItemId, Item>(),
  zlist: List<ItemId>(),
})

export const initState = StateRecord()
export type State = typeof initState
export type Action = Updater<State>
export type ZIndexOp = 'z-inc' | 'z-dec' | 'z-top' | 'z-bottom'

export default {
  deleteVertex([sel, vertexIndex]: [Sel, number]): Action {
    return state =>
      state.update('items', items =>
        items.update(
          sel.idSet.first(),
          item => (item.supportEditVertex() ? item.deleteVertex(vertexIndex) : item),
        ),
      )
  },
  deleteSel(sel: Sel): Action {
    return state => {
      if (sel.isEmpty()) {
        return state
      }
      return state
        .update('items', items => items.filterNot(item => sel.idSet.has(item.id)))
        .update('zlist', zlist => zlist.filterNot(itemId => sel.idSet.has(itemId)))
    }
  },
  moveItems(movedItems: OrderedMap<ItemId, Item>): Action {
    return state => state.mergeIn(['items'], movedItems)
  },
  resizeItems({ startItems, startPos, anchor, movingPos, resizeDirConfig }: ResizingInfo): Action {
    return state =>
      state.mergeIn(
        ['items'],
        startItems.map(item => item.resize(anchor, resizeDirConfig, startPos, movingPos)),
      )
  },
  addItem(item: Item): Action {
    return state => {
      const itemId = getNextItemId(state)
      return state
        .setIn(['items', itemId], item.set('id', itemId))
        .update('zlist', zlist => zlist.push(itemId))
    }
  },
  updateItems(updateItems: OrderedMap<ItemId, Item>): Action {
    return state => state.mergeIn(['items'], updateItems)
  },
  updateZIndex(sel: Sel, op: ZIndexOp): Action {
    return state => {
      const idSet = sel.idSet
      if (idSet.count() !== 1) {
        return state
      } else {
        const sid = idSet.first()
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
  lockItems(sel: Sel): Action {
    return state => {
      const lockedItems = state.items
        .filter(item => sel.idSet.has(item.id))
        .map(item => item.set('locked', true))
      return state.mergeIn(['items'], lockedItems)
    }
  },
  unlockItems(sel: Sel): Action {
    return state => {
      const unlockedItems = state.items
        .filter(item => sel.idSet.has(item.id))
        .map(item => item.set('locked', false))
      return state.mergeIn(['items'], unlockedItems)
    }
  },
  moveVertex([item, vertexIndex, dx, dy]: [Item, number, number, number]): Action {
    return state =>
      state.update('items', items =>
        items.set(item.id, item.supportEditVertex() ? item.moveVertex(vertexIndex, dx, dy) : item),
      )
  },
  insertVertex([pos, sel, insertIndex]: [Point, Sel, number]): Action {
    return state =>
      state.updateIn(
        ['items', sel.idSet.first()],
        (item: Item) => (item.supportEditVertex() ? item.insertVertex(insertIndex, pos) : item),
      )
  },
  setState(state: State): Action {
    return () => state
  },

  toggleTag([tag, sel]: [string, Sel]): Action {
    return state => {
      const item = sel.item(state)
      const updatedItem = item.updateIn(['semantics', 'tags'], (tags: Set<string>) => {
        if (tags.includes(tag)) {
          return tags.remove(tag)
        } else {
          return tags.add(tag)
        }
      })
      return state.update('items', items => items.set(updatedItem.id, updatedItem))
    }
  },

  applyStyles(sel: Sel, styles: any): Action {
    return state => {
      const item: any = sel.item(state)
      return state.mergeIn(['items', item.id], item.merge(styles))
    }
  },
  toggleLock(sel: Sel): Action {
    return state => {
      const item = sel.item(state)
      return state.update('items', items => items.set(item.id, item.set('locked', !item.locked)))
    }
  },
}
