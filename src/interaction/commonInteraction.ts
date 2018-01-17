import { is } from 'immutable'
import { identical } from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn } from '../interfaces'
import { selectionUtils } from '../utils/Selection'

const commonInteraction: InteractionFn = ({
  mouse,
  shortcut,
  mode: mode$,
  state: state$,
  selection: sel$,
}) => {
  const changeSids$ = mouse.down$
    .when(mode$, identical('idle'))
    .when(mouse.resizer$, identical(null))
    .when(mouse.vertexIndex$, identical(-1))
    .sampleCombine(state$)
    .map(([pos, state]) => {
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
      if (targetItemId != null) {
        return selectionUtils.setSids(targetItemId)
      } else {
        return selectionUtils.clearSids()
      }
    })
    .dropRepeats(is)

  const esc$ = shortcut.shortcut('esc', 'idle')
  const deleteSelection$ = shortcut
    .shortcut('d')
    .when(sel$, sel => !sel.isEmpty() && sel.mode === 'bbox')
    .peek(sel$)
    .map(actions.deleteSelection)

  const deletePoint$ = shortcut
    .shortcut('d')
    .when(sel$, sel => !sel.isEmpty() && sel.mode === 'vertices' && sel.svi !== -1)
    .peek(sel$)
    .map(actions.deletePoint)

  return {
    action: xs.merge(deleteSelection$, deletePoint$),
    nextMode: esc$,
    changeSelection: xs.merge(changeSids$, deletePoint$.mapTo(selectionUtils.clearSVI())),
  }
}

export default commonInteraction
