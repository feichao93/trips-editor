import { is } from 'immutable'
import { identical } from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn, Sel } from '../interfaces'

const commonInteraction: InteractionFn = ({
  mouse,
  keyboard,
  menubar,
  mode: mode$,
  state: state$,
  sel: sel$,
}) => {
  const changeSids$ = mouse.down$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
    .sampleCombine(state$)
    .map(([pos, state]) => {
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
      if (targetItemId != null) {
        return Sel.select(targetItemId)
      } else {
        return Sel.reset()
      }
    })
    .dropRepeats(is)

  const deleteSel$ = xs
    .merge(
      menubar.intent('delete'),
      keyboard.shortcut('d').when(sel$, sel => !sel.isEmpty() && sel.mode === 'bbox'),
    )
    .peek(sel$)
    .map(actions.deleteSel)

  const toIdle$ = keyboard.shortcut('esc').mapTo('idle')
  const updateSel$ = xs.merge(changeSids$, deleteSel$.mapTo(Sel.reset()))

  return {
    action: deleteSel$,
    nextMode: toIdle$,
    nextAdjustConfigs: toIdle$.mapTo([]),
    updateSel: updateSel$,
  }
}

export default commonInteraction
