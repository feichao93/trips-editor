import xs from 'xstream'
import { InteractionFn, Sel, State, ImgItem } from '../interfaces'
import { DialogRequest, TextFileStat } from '../makeFileDriver'
import serializeUtils from '../utils/serializeUtils'

const file: InteractionFn = ({ FILE, UI, keyboard, state: state$ }) => {
  /* Menubar File -> Save as JSON */
  const save$ = xs
    .merge(UI.intent('save'), keyboard.shortcut('mod+s'))
    .peek(state$)
    .map(state => ({
      blob: new Blob([JSON.stringify(serializeUtils.toJS(state))], {
        type: 'text/plain;charset=utf-8',
      }),
      filename: 'data.json',
    }))

  /* Menubar File -> Load */
  const openDataFileDialog$ = UI.intent('load-data').mapTo<DialogRequest>({
    type: 'dialog',
    accept: '.json',
  })
  const dataFileStat$ = openDataFileDialog$.mapTo(FILE.take(1)).flatten()
  const loadedState$ = dataFileStat$.map((stat: TextFileStat) =>
    serializeUtils.fromJS(JSON.parse(stat.content)),
  )
  const resetState$ = loadedState$.map(State.setState)
  const resetSel$ = loadedState$.mapTo(Sel.reset())
  const toIdleMode$ = loadedState$.mapTo('idle')

  /* Menubar File -> Export as SVG */
  // TODO export as svg

  /* Menubar File -> Load Image */
  const openImageFileDialog$ = UI.intent('load-image').mapTo<DialogRequest>({
    type: 'dialog',
    accept: 'image/*',
  })
  const addImgeItem$ = openImageFileDialog$
    .mapTo(FILE.take(1))
    .flatten()
    .map(ImgItem.fromImgFileStat)
    .map(State.addItem)

  return {
    SAVE: save$,
    FILE: xs.merge(openDataFileDialog$, openImageFileDialog$),
    action: xs.merge(resetState$, addImgeItem$),
    updateSel: resetSel$,
    nextMode: toIdleMode$,
  }
}

export default file
