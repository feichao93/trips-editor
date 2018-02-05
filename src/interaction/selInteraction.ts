import { is, OrderedMap } from 'immutable'
import { identical } from 'ramda'
import xs from 'xstream'
import { InteractionFn, Item, ItemId, Sel, State, UIIntent } from '../interfaces'

const selInteraction: InteractionFn = ({
  mouse,
  keyboard,
  UI,
  mode: mode$,
  state: state$,
  sel: sel$,
  config: config$,
}) => {
  const changeSel$ = mouse.down$
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
      UI.intent('delete'),
      keyboard.shortcut('d').when(sel$, sel => !sel.isEmpty() && sel.mode === 'bbox'),
    )
    .peek(sel$)
    .map(State.deleteSel)

  const toggleLock$ = xs
    .merge(UI.intent('toggle-lock'), keyboard.shortcut('ctrl+b'))
    .whenNot(sel$, sel => sel.isEmpty())
    .peek(sel$)
    .map(State.toggleLock)

  const edit$ = UI.intent<UIIntent.Edit>('edit')
    .sampleCombine(sel$, state$)
    .map(([{ field, value }, sel, state]) => {
      const useNumberValue = ['strokeWidth', 'opacity'].includes(field)
      const val: any = useNumberValue ? Number(value) : value
      const updatedItems = sel.items(state).map(item => item.set(field as any, val))
      return State.updateItems(updatedItems)
    })

  const changeZIndex$ = UI.intent<UIIntent.ChangeZIndex>('change-z-index')
    .sampleCombine(sel$)
    .map(([{ op }, sel]) => State.updateZIndex(sel, op))

  const toggleSemanticTag$ = UI.intent<UIIntent.ToggleSemanticTag>('toggle-semantic-tag')
    .whenNot(sel$, sel => sel.isEmpty())
    .sampleCombine(sel$, state$, config$)
    .map(([{ tagName }, sel, state, config]) => {
      const tagConfig = config.semantics.tags.find(tag => tag.name === tagName)
      const item = sel.item(state)
      const updatedItem = item.tags.has(tagName)
        ? // Remove tag
          item.update('tags', tags => tags.remove(tagName))
        : // Add tag and apply the styles
          item.update('tags', tags => tags.add(tagName)).merge(tagConfig.styles)
      return State.updateItems(OrderedMap<ItemId, Item>().set(item.id, updatedItem))
    })

  const toIdle$ = keyboard.shortcut('esc').mapTo('idle')
  const updateSel$ = xs.merge(changeSel$, deleteSel$.mapTo(Sel.reset()))

  return {
    action: xs.merge(deleteSel$, toggleLock$, edit$, changeZIndex$, toggleSemanticTag$),
    nextMode: toIdle$,
    nextAdjustConfigs: toIdle$.mapTo([]),
    updateSel: updateSel$,
  }
}

export default selInteraction
