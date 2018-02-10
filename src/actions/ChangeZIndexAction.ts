import { State, Action } from '../interfaces'

export type ZIndexOp = 'inc' | 'dec' | 'top' | 'bottom'

export default class ChangeZIndexAction extends Action {
  constructor(readonly op: ZIndexOp) {
    super()
  }

  next(state: State) {
    const idSet = state.selIdSet
    if (idSet.count() !== 1) {
      return state
    } else {
      const sid = idSet.first()
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
}
