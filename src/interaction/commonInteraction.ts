import { is } from 'immutable'
import { identical } from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn } from '../interfaces'
import { selectionUtils } from '../utils/Selection'

const commonInteraction: InteractionFn = ({
  mouse,
  keyboard,
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

  const deleteSelection$ = keyboard
    .keyup('d')
    .when(sel$, sel => !sel.isEmpty() && sel.mode === 'bbox')
    .peek(sel$)
    .map(actions.deleteSelection)

  const toIdle$ = keyboard.shortcut('esc').mapTo('idle')

  return {
    action: deleteSelection$,
    nextMode: toIdle$,
    nextAdjustConfigs: toIdle$.mapTo([]),
    changeSelection: xs.merge(changeSids$),
  }
}

export default commonInteraction
