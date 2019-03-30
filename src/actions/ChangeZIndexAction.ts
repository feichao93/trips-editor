import { List } from 'immutable'
import { Action, AppHistory, ItemId, State } from '../interfaces'

export type ZIndexOp = 'inc' | 'dec' | 'top' | 'bottom'

export default class ChangeZIndexAction extends Action {
  prevZList: List<ItemId>

  constructor(readonly op: ZIndexOp) {
    super()
  }

  prepare(h: AppHistory): AppHistory {
    this.prevZList = h.state.zlist
    return h
  }

  next(state: State) {
    const idSet = state.selIdSet
    if (idSet.count() !== 1) {
      return state
    } else {
      const sid = idSet.first() as number
      const zlist = state.zlist
      const oldZ = zlist.indexOf(sid)
      const zs = zlist.delete(oldZ)
      if (this.op === 'inc') {
        return state.set('zlist', zs.insert(oldZ + 1, sid))
      } else if (this.op === 'dec') {
        return oldZ === 0 ? state : state.set('zlist', zs.insert(oldZ - 1, sid))
      } else if (this.op === 'top') {
        return state.set('zlist', zs.push(sid))
      } else {
        // bottom
        return state.set('zlist', zs.unshift(sid))
      }
    }
  }

  prev(state: State) {
    return state.set('zlist', this.prevZList)
  }

  getMessage() {
    return `Change z-index. op=${this.op}`
  }
}
