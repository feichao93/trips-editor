import { Set } from 'immutable'
import { identical } from 'ramda'
import xs from 'xstream'
import ChangeSelAction from '../actions/ChangeSelAction'
import MoveItemsAction from '../actions/MoveItemsAction'
import { Component } from '../interfaces'

function toggle<T>(set: Set<T>, t: T) {
  if (set.has(t)) {
    return set.remove(t)
  } else {
    return set.add(t)
  }
}

const dragItems: Component = ({ mouse, mode: mode$, state: state$, keyboard }) => {
  const posAndClickItemId$ = mouse.down$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
    .sampleCombine(state$)
    .map(([pos, state]) => {
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      const clickItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
      return { pos, clickItemId }
    })

  const selInfoAfterMouseDown$ = posAndClickItemId$
    .sampleCombine(state$)
    .map(([{ clickItemId, pos }, { selIdSet }]) => {
      const result = {
        shouldUpdate: false,
        idArray: [] as number[],
        pos,
      }
      if (clickItemId == null) {
        if (!selIdSet.isEmpty()) {
          result.shouldUpdate = true
        }
      } else {
        if (!selIdSet.has(clickItemId)) {
          result.shouldUpdate = true
          result.idArray = [clickItemId]
        } else {
          result.idArray = selIdSet.toArray()
        }
      }
      return result
    })

  const changeSel$ = selInfoAfterMouseDown$
    .filter(info => info.shouldUpdate)
    .map(info => info.idArray)
    .map(idArray => new ChangeSelAction(idArray))

  const dragStart$ = selInfoAfterMouseDown$
    .sampleCombine(state$)
    .map(([{ pos, idArray }, state]) => {
      const startItems = state.items.filter(item => idArray.includes(item.id))
      if (
        startItems.some(item => item.containsPoint(pos)) &&
        startItems.every(item => !item.locked)
      ) {
        return { startPos: pos, startItems }
      } else {
        return null
      }
    })
    .filter(Boolean)

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
    .map(dragStart => dragStart.startItems.keySeq().toSet())

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
    action: xs.merge(changeSel$, dragItems$),
    nextMode: xs.merge(toDraggingMode$, toIdleMode$),
    nextWorking: {
      editing: xs.merge(nextEditingItemId$, toIdleMode$.mapTo(Set())),
    },
  }
}

export default dragItems
