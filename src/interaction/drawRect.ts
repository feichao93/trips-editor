import * as R from 'ramda'
import xs, { Stream } from 'xstream'
import actions from '../actions'
import { Mouse, Point } from '../interfaces'
import { ShortcutSource } from '../makeShortcutDriver'
import PolygonItem from '../utils/PolygonItem'

export default function drawingRect(mouse: Mouse, mode$: Stream<string>, shortcut: ShortcutSource) {
  const { down$, move$, up$ } = mouse
  const start$ = shortcut.shortcut('r', 'rect.ready')

  const startPos$: Stream<Point> = down$.peekFilter(mode$, R.equals('rect.ready'))

  const movingPos$ = startPos$
    .map(start => move$.peekFilter(mode$, R.equals('rect.drawing')).startWith(start))
    .flatten()

  const drawingRect$ = xs.combine(startPos$, movingPos$, mode$).map(([p1, p2, mode]) => {
    if (mode === 'rect.drawing') {
      return PolygonItem.rectFromPoints(p1, p2)
    } else {
      return null
    }
  })

  const addItem$ = up$
    .peekFilter(mode$, R.equals('rect.drawing'))
    .peek(drawingRect$)
    .map(actions.addItem)

  return {
    drawingItem$: drawingRect$,
    action$: addItem$,
    changeMode$: xs.merge(start$, addItem$.mapTo('idle'), startPos$.mapTo('rect.drawing')),
  }
}
