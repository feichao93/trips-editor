import { OrderedSet } from 'immutable'
import { is } from 'immutable'
import { identical } from 'ramda'
import xs from 'xstream'
import ChangeSelAction from '../actions/ChangeSelAction'
import ChangeZIndexAction from '../actions/ChangeZIndexAction'
import DeleteSelAction from '../actions/DeleteSelAction'
import EditItemAction from '../actions/EditItemAction'
import ToggleLockAction from '../actions/ToggleLockAction'
import ToggleSemanticTagAction from '../actions/ToggleSemanticTagAction'
import { Component, UIIntent } from '../interfaces'

const selInteraction: Component = ({
  mouse,
  keyboard,
  UI,
  mode: mode$,
  state: state$,
  config: config$,
}) => {
  const changeSel$ = mouse.down$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
    .sampleCombine(state$)
    .map(([pos, state]) => {
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
      if (targetItemId != null && !is(state.selIdSet, OrderedSet([targetItemId]))) {
        return new ChangeSelAction(targetItemId)
      } else if (targetItemId == null && !state.selIdSet.isEmpty()) {
        return new ChangeSelAction /* empty item id */()
      } else {
        return null
      }
    })
    .filter(Boolean)

  const deleteSel$ = xs
    .merge(
      UI.intent('delete'),
      keyboard
        .shortcut('d')
        .when(
          state$,
          state => !state.selIdSet.isEmpty() && (state.selMode === 'bbox' || state.sitem().locked),
        ),
    )
    .map(() => new DeleteSelAction())

  const toggleLock$ = xs
    .merge(UI.intent('toggle-lock'), keyboard.shortcut('b'))
    .when(state$, state => !state.selIdSet.isEmpty())
    .map(() => new ToggleLockAction())

  const edit$ = UI.intent<UIIntent.Edit>('edit').map(({ field, value }) => {
    const useNumberValue = ['strokeWidth', 'opacity'].includes(field)
    const val: any = useNumberValue ? Number(value) : value
    return new EditItemAction(field, val)
  })

  const changeZIndex$ = UI.intent<UIIntent.ChangeZIndex>('change-z-index').map(
    ({ op }) => new ChangeZIndexAction(op),
  )

  const toggleSemanticTag$ = UI.intent<UIIntent.ToggleSemanticTag>('toggle-semantic-tag')
    .when(state$, state => !state.selIdSet.isEmpty())
    .sampleCombine(state$, config$)
    .map(([{ tagName }, state, config]) => {
      const tagConfig = config.semantics.tags.find(tag => tag.name === tagName)
      return new ToggleSemanticTagAction(tagConfig)
    })

  const toIdle$ = keyboard.shortcut('esc').mapTo('idle')

  return {
    action: xs.merge(changeSel$, deleteSel$, toggleLock$, edit$, changeZIndex$, toggleSemanticTag$),
    nextMode: toIdle$,
    nextAdjustConfigs: toIdle$.mapTo([]),
  }
}

export default selInteraction
