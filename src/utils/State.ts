import { List, Map, OrderedMap, Record, Set } from 'immutable'
import { getNextItemId } from './common'
import { Item, ItemId, NodeId, Point, ResizeDirConfig, Sel, Updater } from '../interfaces'

export interface ResizingInfo {
  movingPos: Point
  startPos: Point
  startItems: Map<ItemId, Item>
  anchor: Point
  resizeDirConfig: ResizeDirConfig
}

const StateRecord = Record({
  items: Map<ItemId, Item>(),
  zlist: List<ItemId>(),
})

export type Action = Updater<State>
export type ZIndexOp = 'inc' | 'dec' | 'top' | 'bottom'

export class State extends StateRecord {
  static deleteVertex([sel, vertexIndex]: [Sel, number]): Action {
    return state =>
      state.update('items', items =>
        items.update(
          sel.idSet.first(),
          item => (item.supportEditVertex() ? item.deleteVertex(vertexIndex) : item),
        ),
      )
  }

  static deleteSel(sel: Sel): Action {
    return state => {
      if (sel.isEmpty()) {
        return state
      }
      return state
        .update('items', items => items.filterNot(item => sel.idSet.has(item.id)))
        .update('zlist', zlist => zlist.filterNot(itemId => sel.idSet.has(itemId)))
    }
  }

  static moveItems(movedItems: OrderedMap<ItemId, Item>): Action {
    return state => state.mergeIn(['items'], movedItems)
  }

  static resizeItems({
    startItems,
    startPos,
    anchor,
    movingPos,
    resizeDirConfig,
  }: ResizingInfo): Action {
    return state =>
      state.mergeIn(
        ['items'],
        startItems.map(item => item.resize(anchor, resizeDirConfig, startPos, movingPos)),
      )
  }

  static addItem(item: Item): Action {
    return state => {
      const itemId = getNextItemId(state)
      return state
        .setIn(['items', itemId], item.set('id', itemId))
        .update('zlist', zlist => zlist.push(itemId))
    }
  }

  static updateItems(updateItems: OrderedMap<ItemId, Item>): Action {
    return state => state.mergeIn(['items'], updateItems)
  }

  static updateZIndex(sel: Sel, op: ZIndexOp): Action {
    return state => {
      const idSet = sel.idSet
      if (idSet.count() !== 1) {
        return state
      } else {
        const sid = idSet.first()
        const zlist = state.zlist
        const oldZ = zlist.indexOf(sid)
        const zs = zlist.delete(oldZ)
        if (op === 'inc') {
          return state.set('zlist', zs.insert(oldZ + 1, sid))
        } else if (op === 'dec') {
          return oldZ === 0 ? state : state.set('zlist', zs.insert(oldZ - 1, sid))
        } else if (op === 'top') {
          return state.set('zlist', zs.push(sid))
        } else {
          // bottom
          return state.set('zlist', zs.unshift(sid))
        }
      }
    }
  }

  static lockItems(sel: Sel): Action {
    return state => {
      const lockedItems = state.items
        .filter(item => sel.idSet.has(item.id))
        .map(item => item.set('locked', true))
      return state.mergeIn(['items'], lockedItems)
    }
  }

  static unlockItems(sel: Sel): Action {
    return state => {
      const unlockedItems = state.items
        .filter(item => sel.idSet.has(item.id))
        .map(item => item.set('locked', false))
      return state.mergeIn(['items'], unlockedItems)
    }
  }

  static moveVertex([item, vertexIndex, dx, dy]: [Item, number, number, number]): Action {
    return state =>
      state.update('items', items =>
        items.set(item.id, item.supportEditVertex() ? item.moveVertex(vertexIndex, dx, dy) : item),
      )
  }

  static insertVertex([pos, sel, insertIndex]: [Point, Sel, number]): Action {
    return state =>
      state.updateIn(
        ['items', sel.idSet.first()],
        (item: Item) => (item.supportEditVertex() ? item.insertVertex(insertIndex, pos) : item),
      )
  }

  static setState(state: State): Action {
    return () => state
  }

  static applyStyles(sel: Sel, styles: any): Action {
    return state => {
      const item: any = sel.item(state)
      return state.mergeIn(['items', item.id], item.merge(styles))
    }
  }

  static toggleLock(sel: Sel): Action {
    return state => {
      const item = sel.item(state)
      return state.update('items', items => items.set(item.id, item.set('locked', !item.locked)))
    }
  }

  static toggleSemanticLabel(sel: Sel, label: string): Action {
    return state => {
      const item = sel.item(state)
      const updatedItem = item.set(
        'labels',
        item.labels.has(label) ? item.labels.remove(label) : item.labels.add(label),
      )
      return state.update('items', items => items.set(item.id, updatedItem))
    }
  }
}
