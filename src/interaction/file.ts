import xs from 'xstream'
import AddItemAction from '../actions/AddItemAction'
import LoadAction from '../actions/LoadAction'
import { Component, ImgItem } from '../interfaces'
import { DialogRequest, TextFileStat } from '../makeFileDriver'
import serializeUtils from '../utils/serializeUtils'

const file: Component = ({ FILE, UI, keyboard, state: state$ }) => {
  /* Menubar File -> Save as JSON */
  const save$ = UI.intent('save')
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
  const loadState$ = loadedState$.map(newState => new LoadAction(newState))
  const toIdleMode$ = loadedState$.mapTo('idle')

  /* Menubar File -> Load Image */
  const openImageFileDialog$ = UI.intent('load-image').mapTo<DialogRequest>({
    type: 'dialog',
    accept: 'image/*',
  })
  const addImgeItem$ = openImageFileDialog$
    .mapTo(FILE.take(1))
    .flatten()
    .map(ImgItem.fromImgFileStat)
    .map(item => new AddItemAction(item))

  return {
    SAVE: save$,
    FILE: xs.merge(openDataFileDialog$, openImageFileDialog$),
    action: xs.merge(loadState$, addImgeItem$),
    nextMode: toIdleMode$,
  }
}

export default file
