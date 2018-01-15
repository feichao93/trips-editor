import * as R from 'ramda'
import xs, { Stream } from 'xstream'
import actions from '../actions'
import { InteractionFn, Point } from '../interfaces'
import PolylineItem from '../utils/PolylineItem'

const drawLine: InteractionFn = ({ mouse, mode: mode$, shortcut }) => {
  const { down$, move$, up$ } = mouse
  const start$ = shortcut.shortcut('l', 'line.ready')

  const startPos$: Stream<Point> = down$.peekFilter(mode$, R.equals('line.ready'))

  const movingPos$ = startPos$
    .map(start => move$.peekFilter(mode$, R.equals('line.drawing')).startWith(start))
    .flatten()

  const drawingLine$ = xs
    .combine(startPos$, movingPos$, mode$)
    .map(([p1, p2, mode]) => (mode === 'line.drawing' ? PolylineItem.fromPoints([p1, p2]) : null))

  const addItem$ = up$
    .peekFilter(mode$, R.equals('line.drawing'))
    .peek(drawingLine$)
    .map(actions.addItem)

  return {
    drawingItem: drawingLine$,
    action: addItem$,
    nextMode: xs.merge(start$, startPos$.mapTo('line.drawing'), addItem$.mapTo('idle')),
  }
}

export default drawLine
