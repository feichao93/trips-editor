import * as d3 from 'd3'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn } from '../interfaces'
import { openFileDialog, TextFileStat } from '../makeFileDriver'
import { selectionUtils } from '../utils/Selection'
import serializeUtils from '../utils/serializeUtils'

const menubarInteractions: InteractionFn = ({ FILE, menubar, keyboard, state: state$ }) => {
  /* File -> Save as JSON */
  const save$ = xs
    .merge(menubar.intent('save'), keyboard.shortcut('mod+s', { preventDefault: true }))
    .peek(state$)
    .map(state => ({
      blob: new Blob([JSON.stringify(serializeUtils.toJS(state))], {
        type: 'text/plain;charset=utf-8',
      }),
      filename: 'data.json',
    }))

  /* File -> Load */
  const openDialog$ = menubar.intent('load').mapTo<'open-file-dialog'>(openFileDialog)
  const fileStat$ = openDialog$.map(() => FILE.take(1)).flatten()
  const loadedState$ = fileStat$.map((stat: TextFileStat) =>
    serializeUtils.fromJS(JSON.parse(stat.content)),
  )
  const resetState$ = loadedState$.map(actions.setState)
  const resetSelection$ = loadedState$.map(selectionUtils.clearSids)
  const toIdleMode$ = loadedState$.mapTo('idle')

  return {
    SAVE: save$,
    FILE: openDialog$,
    action: resetState$,
    changeSelection: resetSelection$,
    nextMode: toIdleMode$,
  }
}

export default menubarInteractions
