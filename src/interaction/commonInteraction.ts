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
    .when(mouse.vertexInsertIndex$, identical(-1))
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

  const deleteSelection$ = shortcut
    .keyup('d')
    .when(sel$, sel => !sel.isEmpty() && sel.mode === 'bbox')
    .peek(sel$)
    .map(actions.deleteSelection)

  return {
    action: deleteSelection$,
    nextMode: shortcut.shortcut('esc').mapTo('idle'),
    changeSelection: xs.merge(changeSids$),
  }
}

export default commonInteraction
