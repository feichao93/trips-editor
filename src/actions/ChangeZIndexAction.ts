import { State, Sel, Action, ZIndexOp } from '../interfaces'

export default class ChangeZIndexAction extends Action {
  constructor(readonly op: ZIndexOp) {
    super()
  }

  nextState(state: State, sel: Sel) {
    const idSet = sel.idSet
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
