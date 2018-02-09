import { always, inc } from 'ramda'
import xs from 'xstream'
import { PASTE_OFFSET } from '../constants'
import { Component, Updater } from '../interfaces'
import AddItemAction from '../actions/AddItemAction'

const copyPaste: Component = ({ keyboard, sel: sel$, state: state$, clipboard: clipboard$ }) => {
  const copied$ = keyboard
    .shortcut('mod+c')
    .peek(xs.combine(state$, sel$))
    .map(([state, sel]) => sel.item(state))
    .filter(Boolean)

  const incPasteCountProxy$ = xs.create()

  /** Paste count since last copy */
  const pasteCount$ = xs
    .merge(incPasteCountProxy$.mapTo(inc), copied$.mapTo<Updater<number>>(always(0)))
    .fold((count, f) => f(count), 0)

  const pasteToAddItem$ = keyboard
    .shortcut('mod+v')
    .when(clipboard$)
    .peek(xs.combine(clipboard$, pasteCount$))
    .map(([item, count]) =>
      item
        .set('locked', false)
        .move(PASTE_OFFSET * (1 + count), PASTE_OFFSET * (1 + count))
        .set('locked', item.locked),
    )
    .map(item => new AddItemAction(item))

  incPasteCountProxy$.imitate(pasteToAddItem$)

  return {
    nextClipboard: copied$,
    action: pasteToAddItem$,
  }
}

export default copyPaste
