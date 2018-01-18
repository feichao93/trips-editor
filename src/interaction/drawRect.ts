import { identical } from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn } from '../interfaces'
import { injectItemId } from '../utils/common'
import PolygonItem from '../utils/PolygonItem'
import { selectionUtils } from '../utils/Selection'

const drawRect: InteractionFn = ({ mouse, mode: mode$, shortcut, selection: sel$ }) => {
  const startPos$ = mouse.down$.when(mode$, identical('rect.ready')).remember()
  const movingPos$ = startPos$
    .map(start => mouse.move$.when(mode$, identical('rect.drawing')).startWith(start))
    .flatten()

  const drawingRect$ = mode$
    .checkedFlatMap(identical('rect.drawing'), () =>
      xs.combine(startPos$, movingPos$).map(PolygonItem.rectFromPoints),
    )
    .filter(Boolean)

  const newItem$ = mouse.up$
    .when(mode$, identical('rect.drawing'))
    .peek(drawingRect$)
    .map(injectItemId)

  return {
    drawingItem: drawingRect$,
    action: newItem$.map(actions.addItem),
    nextMode: xs.merge(
      shortcut.shortcut('r').mapTo('rect.ready'),
      newItem$.mapTo('idle'),
      startPos$.mapTo('rect.drawing'),
    ),
    changeSelection: newItem$.map(selectionUtils.selectItem),
  }
}

export default drawRect
