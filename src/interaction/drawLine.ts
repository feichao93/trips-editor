import { identical } from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn, PolylineItem, Sel } from '../interfaces'

const drawLine: InteractionFn = ({ mouse, menubar, mode: mode$, keyboard }) => {
  const startPos$ = mouse.down$.when(mode$, identical('line.ready')).remember()

  const movingPos$ = startPos$
    .map(start => mouse.move$.when(mode$, identical('line.drawing')).startWith(start))
    .flatten()

  const drawingLine$ = mode$
    .checkedFlatMap(identical('line.drawing'), () =>
      xs.combine(startPos$, movingPos$).map(PolylineItem.lineFromPoints),
    )
    .filter(Boolean)

  const newItem$ = mouse.up$.when(mode$, identical('line.drawing')).peek(drawingLine$)

  return {
    drawingItem: drawingLine$,
    action: newItem$.map(actions.addItem),
    nextMode: xs.merge(
      menubar.intent('line').mapTo('line.ready'),
      keyboard.shortcut('l').mapTo('line.ready'),
      startPos$.mapTo('line.drawing'),
      newItem$.mapTo('idle'),
    ),
    updateSel: newItem$.mapTo(Sel.selectLast()),
  }
}

export default drawLine
