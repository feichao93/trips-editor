import { identical } from 'ramda'
import xs from 'xstream'
import { Component } from '../interfaces'
import MoveItemsAction from '../actions/MoveItemsAction'

const dragItems: Component = ({ mouse, mode: mode$, state: state$ }) => {
  const dragStart$ = mouse.down$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
    .sampleCombine(state$)
    .map(([pos, state]) => {
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
      const startItems = state.items.filter(item => item.id === targetItemId)
      return { startPos: pos, startItems }
    })
    .filter(({ startItems }) => !startItems.isEmpty() && startItems.every(item => !item.locked))

  const toDraggingMode$ = dragStart$
    .mapTo(
      mouse.move$
        .endWhen(mouse.up$)
        .mapTo('dragging')
        .take(1),
    )
    .flatten()

  const nextEditingItemId$ = toDraggingMode$
    .peek(dragStart$)
    .map(dragStart => dragStart.startItems.first().id)

  const dragItems$ = dragStart$
    .map(({ startItems, startPos }) =>
      mouse.move$
        .when(mode$, identical('dragging'))
        .map(movingPos => new MoveItemsAction({ startPos, movingPos, startItems }))
        .endWhen(mouse.up$),
    )
    .flatten()

  const toIdleMode$ = mouse.up$.when(mode$, identical('dragging')).mapTo('idle')

  return {
    action: dragItems$,
    nextMode: xs.merge(toDraggingMode$, toIdleMode$),
    nextEditingItemId: xs.merge(nextEditingItemId$, toIdleMode$.mapTo(-1)),
  }
}

export default dragItems
