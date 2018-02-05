import { is } from 'immutable'
import { identical } from 'ramda'
import xs from 'xstream'
import { InteractionFn, Sel, State, UIIntent } from '../interfaces'

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
    .merge(UI.intent('toggle-lock'), keyboard.shortcut('l'))
    .peek(sel$)
    .map(State.toggleLock)

  const edit$ = UI.intent<UIIntent.Edit>('edit')
    .sampleCombine(sel$, state$)
    .map(([{ field, value }, sel, state]) => {
      const useNumberValue = ['stroke', 'opacity'].includes(field)
      const val: any = useNumberValue ? Number(value) : value
      const updatedItems = sel.items(state).map(item => item.set(field as any, val))
      return State.updateItems(updatedItems)
    })

  const changeZIndex$ = UI.intent<UIIntent.ChangeZIndex>('change-z-index')
    .sampleCombine(sel$)
    .map(([{ op }, sel]) => State.updateZIndex(sel, op))

  const applyStylePreset$ = UI.intent<UIIntent.ApplyStylePreset>('apply-style-preset')
    .whenNot(sel$, sel => sel.isEmpty())
    .sampleCombine(sel$, config$)
    .map(([{ name }, sel, config]) => {
      const preset = config.stylePresets.find(preset => preset.name === name)
      return State.applyStyles(sel, preset.styles)
    })

  const toggleSemanticTag$ = UI.intent<UIIntent.ToggleSemanticTag>('toggle-semantic-tag')
    .sampleCombine(sel$)
    .map(([{ tag }, sel]) => State.toggleSemanticTag(sel, tag))

  const toIdle$ = keyboard.shortcut('esc').mapTo('idle')
  const updateSel$ = xs.merge(changeSel$, deleteSel$.mapTo(Sel.reset()))

  return {
    action: xs.merge(
      deleteSel$,
      toggleLock$,
      edit$,
      changeZIndex$,
      applyStylePreset$,
      toggleSemanticTag$,
    ),
    nextMode: toIdle$,
    nextAdjustConfigs: toIdle$.mapTo([]),
    updateSel: updateSel$,
  }
}

export default selInteraction
