import xs, { Stream } from 'xstream'
import { Mouse, Point } from '../interfaces'
import peekFilter from '../utils/peekFilter'
import * as R from 'ramda'
import { ShortcutSource } from '../makeShortcutDriver'
import { polylineItemFromPoints } from '../utils/common'
import sampleCombine from 'xstream/extra/sampleCombine'
import actions from '../actions'

export default function drawingLine(mouse: Mouse, mode$: Stream<string>, shortcut: ShortcutSource) {
  const { down$, move$, up$ } = mouse
  const start$ = shortcut.shortcut('l', 'line.ready')

  const startPos$: Stream<Point> = down$.compose(peekFilter(mode$, R.equals('line.ready')))

  const movingPos$ = startPos$
    .map(start => move$.compose(peekFilter(mode$, R.equals('line.drawing'))).startWith(start))
    .flatten()

  const drawingLine$ = xs
    .combine(startPos$, movingPos$, mode$)
    .map(([p1, p2, mode]) => (mode === 'line.drawing' ? polylineItemFromPoints([p1, p2]) : null))

  const addItem$ = up$
    .compose(peekFilter(mode$, R.equals('line.drawing')))
    .mapTo('idle')
    .compose(sampleCombine(drawingLine$))
    .map(([_, line]) => line)
    .map(actions.addItem)

  return {
    drawingItem$: drawingLine$,
    action$: addItem$,
    changeMode$: xs.merge(start$, startPos$.mapTo('line.drawing'), addItem$.mapTo('idle')),
  }
}
