import * as R from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn } from '../interfaces'

const commonInteraction: InteractionFn = ({
  mouse,
  shortcut,
  mode: mode$,
  resizer: resizer$,
  state: state$,
}) => {
  const changeSidsAction$ = mouse.down$
    .peekFilter(mode$, R.identical('idle'))
    .peekFilter(resizer$, R.identical(null))
    .sampleCombine(state$)
    .map(([pos, state]) => {
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      // 如果和目前选中的元素，则返回null
      if (state.sids == clickedItems.keySeq().toOrderedSet()) {
        return null
      }
      const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
      // const canMoveItem = !clickedItems.isEmpty() && !state.items.get(targetItemId).locked
      if (targetItemId != null) {
        return actions.updateSids([targetItemId])
      } else {
        return actions.clearSids()
      }
    })
    .filter(Boolean)

  const esc$ = shortcut.shortcut('esc', 'idle')
  const deleteSelection$ = shortcut.shortcut('d').mapTo(actions.deleteSelection())

  return {
    action: xs.merge(changeSidsAction$, deleteSelection$),
    nextMode: esc$,
  }
}

export default commonInteraction
