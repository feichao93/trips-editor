import xs from 'xstream'
import { InteractionFn, Sel, State } from '../interfaces'
import { openFileDialog, TextFileStat } from '../makeFileDriver'
import serializeUtils from '../utils/serializeUtils'

const file: InteractionFn = ({ FILE, UI, keyboard, state: state$ }) => {
  /* File -> Save as JSON */
  const save$ = xs
    .merge(UI.intent('save'), keyboard.shortcut('mod+s'))
    .peek(state$)
    .map(state => ({
      blob: new Blob([JSON.stringify(serializeUtils.toJS(state))], {
        type: 'text/plain;charset=utf-8',
      }),
      filename: 'data.json',
    }))

  /* File -> Load */
  const openDialog$ = UI.intent('load').mapTo<'open-file-dialog'>(openFileDialog)
  const fileStat$ = openDialog$.map(() => FILE.take(1)).flatten()
  const loadedState$ = fileStat$.map((stat: TextFileStat) =>
    serializeUtils.fromJS(JSON.parse(stat.content)),
  )
  const resetState$ = loadedState$.map(State.setState)
  const resetSel$ = loadedState$.mapTo(Sel.reset())
  const toIdleMode$ = loadedState$.mapTo('idle')

  return {
    SAVE: save$,
    FILE: openDialog$,
    action: resetState$,
    updateSel: resetSel$,
    nextMode: toIdleMode$,
  }
}

export default file
