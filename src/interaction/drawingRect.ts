import * as R from 'ramda'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import { Point, PolygonItem, Mouse } from '../interfaces'
import { List } from 'immutable'

export default function drawingRect(mouse: Mouse, mode$: Stream<string>) {
  const { down$, move$, up$ } = mouse

  const startPos$: Stream<Point> = down$
    .compose(sampleCombine(mode$))
    .filter(([e, mode]) => mode === 'rect.start')
    .map(([pos]) => pos)
    .startWith(null)

  const changeToRectDrawing$ = startPos$.filter(R.identity).mapTo('rect.drawing')

  const movingPos$ = startPos$
    .map(start =>
      move$
        .compose(sampleCombine(mode$))
        .filter(([_, mode]) => mode === 'rect.drawing')
        .map(([pos]) => pos)
        .startWith(start),
    )
    .flatten()

  const drawingRect$ = xs
    .combine(startPos$, movingPos$, mode$)
    .filter(([p1, p2, mode]) => p1 != null && p2 != null)
    .map(
      ([{ x: x1, y: y1 }, { x: x2, y: y2 }, mode]) =>
        mode === 'rect.drawing'
          ? PolygonItem({
              points: List([
                { x: x1, y: y1 },
                { x: x2, y: y1 },
                { x: x2, y: y2 },
                { x: x1, y: y2 },
              ]),
            })
          : null,
    )
    .startWith(null)

  const finishRectDrawing$ = up$
    .compose(sampleCombine(mode$))
    .filter(([_, mode]) => mode === 'rect.drawing')
    .mapTo('idle')

  return { drawingRect$, finishRectDrawing$, changeToRectDrawing$ }
}
