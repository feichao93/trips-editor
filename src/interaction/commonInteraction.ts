import { is } from 'immutable'
import { identical } from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn } from '../interfaces'
import { selectionUtils } from '../utils/Selection'

const commonInteraction: InteractionFn = ({
  mouse,
  keyboard,
  menubar,
  mode: mode$,
  state: state$,
  selection: sel$,
}) => {
  const changeSids$ = mouse.down$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
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

  const deleteSelection$ = xs
    .merge(
      menubar.intent('delete'),
      keyboard.shortcut('d').when(sel$, sel => !sel.isEmpty() && sel.mode === 'bbox'),
    )
    .peek(sel$)
    .map(actions.deleteSelection)

  const toIdle$ = keyboard.shortcut('esc').mapTo('idle')
  const changeSelection$ = xs.merge(changeSids$, deleteSelection$.mapTo(selectionUtils.clearSids()))

  return {
    action: deleteSelection$,
    nextMode: toIdle$,
    nextAdjustConfigs: toIdle$.mapTo([]),
    changeSelection: changeSelection$,
  }
}

export default commonInteraction
