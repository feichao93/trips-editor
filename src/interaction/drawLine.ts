import { OrderedSet } from 'immutable'
import * as R from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn } from '../interfaces'
import { injectItemId } from '../utils/common'
import PolylineItem from '../utils/PolylineItem'

const drawLine: InteractionFn = ({ mouse, mode: mode$, shortcut, selection: sel$ }) => {
  const start$ = shortcut.shortcut('l', 'line.ready')
  const startPos$ = mouse.down$.when(mode$, R.equals('line.ready')).remember()

  const movingPos$ = startPos$
    .map(start => mouse.move$.when(mode$, R.equals('line.drawing')).startWith(start))
    .flatten()

  const drawingLine$ = mode$
    .checkedFlatMap(R.identical('line.drawing'), () =>
      xs.combine(startPos$, movingPos$).map(PolylineItem.lineFromPoints),
    )
    .filter(Boolean)

  const newItem$ = mouse.up$
    .when(mode$, R.equals('line.drawing'))
    .peek(drawingLine$)
    .map(injectItemId)

  const nextSelection$ = newItem$
    .sampleCombine(sel$)
    .map(([newItem, sel]) => sel.set('sids', OrderedSet([newItem.id])))

  return {
    drawingItem: drawingLine$,
    action: newItem$.map(actions.addItem),
    nextMode: xs.merge(start$, startPos$.mapTo('line.drawing'), newItem$.mapTo('idle')),
    nextSelection: nextSelection$,
  }
}

export default drawLine
