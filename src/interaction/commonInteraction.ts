import { is, OrderedSet } from 'immutable'
import { identical } from 'ramda'
import actions from '../actions'
import { InteractionFn } from '../interfaces'

const commonInteraction: InteractionFn = ({
  mouse,
  shortcut,
  mode: mode$,
  state: state$,
  selection: selection$,
}) => {
  const changeSids$ = mouse.down$
    .when(mode$, identical('idle'))
    .when(mouse.resizer$, identical(null))
    .when(mouse.vertexIndex$, i => i === -1)
    .sampleCombine(state$, selection$)
    .map(([pos, state, sel]) => {
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
      if (targetItemId != null) {
        return sel.set('sids', OrderedSet([targetItemId]))
      } else {
        return sel.set('sids', OrderedSet())
      }
    })
    .dropRepeats(is)

  const esc$ = shortcut.shortcut('esc', 'idle')
  const deleteSelection$ = shortcut
    .shortcut('d')
    .peek(selection$)
    .map(actions.deleteSelection)

  return {
    action: deleteSelection$,
    nextMode: esc$,
    nextSelection: changeSids$,
  }
}

export default commonInteraction
